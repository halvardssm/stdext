import { DeferredStack } from "@stdext/collections";
import { writeAll } from "@std/io/write-all";
import { ConnectionError, QueryError } from "../../sql/mod.ts";
import { ScramClient } from "@stdext/crypto/scram";
import { md5Password } from "./_auth.ts";
import { type Message, MessageReader, MessageWriter } from "./_wire.ts";
import { createError } from "./errors.ts";

const decoder = new TextDecoder();

const PROTOCOL_VERSION = 196608; // 3.0
const STREAMING_MESSAGE =
  "Cannot run a command while a query result is being read: read the result to the end or dispose it first";
const SSL_REQUEST_CODE = 80877103;
const CANCEL_REQUEST_CODE = 80877102;

/** The settings needed to open a connection */
export interface ConnectionConfig {
  hostname: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  tls: "disable" | "prefer" | "require";
  caCerts?: string[];
  parameters: Record<string, string>;
}

/** A column of a result, as described by a RowDescription message */
export interface Field {
  name: string;
  tableOid: number;
  columnAttribute: number;
  typeOid: number;
  typeSize: number;
  typeModifier: number;
  format: number;
}

/** What to run: an unnamed statement, or a named prepared statement */
export type Target = { sql: string } | { name: string };

async function openSocket(config: ConnectionConfig): Promise<Deno.Conn> {
  const conn = await Deno.connect({
    hostname: config.hostname,
    port: config.port,
  });
  if (config.tls === "disable") return conn;
  try {
    const writer = new MessageWriter();
    await writeAll(conn, writer.begin().int32(SSL_REQUEST_CODE).end().flush());
    const reader = new MessageReader(conn);
    const response = String.fromCharCode(await reader.byte());
    if (reader.buffered) {
      // Data sent before the TLS handshake could be injected by an attacker.
      throw new ConnectionError("Unexpected data after the SSL response");
    }
    if (response === "S") {
      return await Deno.startTls(conn, {
        hostname: config.hostname,
        caCerts: config.caCerts,
      });
    }
    if (response === "N" && config.tls === "prefer") return conn;
    if (response === "N") {
      throw new ConnectionError("The server does not support TLS");
    }
    throw new ConnectionError(`Unexpected SSL response: ${response}`);
  } catch (error) {
    conn.close();
    throw error;
  }
}

function parseRowDescription(message: Message): Field[] {
  const { body } = message;
  const count = body.int16();
  const fields: Field[] = [];
  for (let i = 0; i < count; i++) {
    fields.push({
      name: body.cstring(),
      tableOid: body.int32(),
      columnAttribute: body.int16(),
      typeOid: body.int32(),
      typeSize: body.int16(),
      typeModifier: body.int32(),
      format: body.int16(),
    });
  }
  return fields;
}

function parseDataRow(message: Message): (string | null)[] {
  const { body } = message;
  const count = body.int16();
  const values: (string | null)[] = [];
  for (let i = 0; i < count; i++) values.push(body.value());
  return values;
}

/**
 * A single connection speaking the Postgres frontend/backend protocol.
 *
 * Commands are serialized: only one command uses the connection at a time.
 * A query result holds the connection until all rows are read or it is
 * disposed. Commands issued meanwhile are rejected, rather than buffering the
 * rest of the result, which may not fit in memory.
 */
export class Connection {
  readonly #config: ConnectionConfig;
  readonly #conn: Deno.Conn;
  readonly #reader: MessageReader;
  readonly #writer = new MessageWriter();
  readonly parameters: Map<string, string> = new Map();
  #processId = 0;
  #secretKey = new Uint8Array();
  #closed = false;
  // Commands use the connection one at a time.
  readonly #lock = new DeferredStack<true>({ maxSize: 1 });
  readonly #waiting = new Set<AbortController>();
  // The result being read by the caller, which holds the connection.
  #streaming?: Cursor;
  #cancelling?: Promise<void>;
  /** The transaction status of the last ReadyForQuery message */
  status = "I";

  private constructor(config: ConnectionConfig, conn: Deno.Conn) {
    this.#config = config;
    this.#conn = conn;
    this.#reader = new MessageReader(conn);
    this.#lock.add(true);
  }

  /**
   * Open and authenticate a connection. When the signal aborts while
   * authenticating, the socket is closed and connecting rejects.
   */
  static async connect(
    config: ConnectionConfig,
    signal?: AbortSignal,
  ): Promise<Connection> {
    const connection = new Connection(config, await openSocket(config));
    const onAbort = () => connection.#terminate();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      signal?.throwIfAborted();
      await connection.#startup();
      signal?.throwIfAborted();
    } catch (error) {
      connection.#terminate();
      throw signal?.aborted ? signal.reason : error;
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    return connection;
  }

  get connected(): boolean {
    return !this.#closed;
  }

  async #write(bytes: Uint8Array): Promise<void> {
    try {
      await writeAll(this.#conn, bytes);
    } catch (error) {
      this.#terminate();
      throw new ConnectionError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Read the next message, handling the asynchronous messages that can
   * arrive at any time.
   */
  async next(): Promise<Message> {
    while (true) {
      let message: Message;
      try {
        message = await this.#reader.message();
      } catch (error) {
        this.#terminate();
        if (error instanceof ConnectionError) throw error;
        throw new ConnectionError(
          error instanceof Error ? error.message : String(error),
        );
      }
      switch (message.type) {
        case "S": // ParameterStatus
          this.parameters.set(message.body.cstring(), message.body.cstring());
          break;
        case "N": // NoticeResponse
        case "A": // NotificationResponse
          break;
        default:
          return message;
      }
    }
  }

  async #startup(): Promise<void> {
    const { user, database, password, parameters } = this.#config;
    const writer = this.#writer.begin().int32(PROTOCOL_VERSION);
    for (
      const [key, value] of Object.entries({
        user,
        database,
        client_encoding: "UTF8",
        ...parameters,
      })
    ) {
      writer.cstring(key).cstring(value);
    }
    await this.#write(writer.int8(0).end().flush());

    const requirePassword = (): string => {
      if (password === undefined) {
        throw new ConnectionError("The server requires a password");
      }
      return password;
    };

    let scram: ScramClient | undefined;
    while (true) {
      const message = await this.next();
      const { body } = message;
      switch (message.type) {
        case "R": {
          const code = body.int32();
          switch (code) {
            case 0: // AuthenticationOk
              break;
            case 3: // AuthenticationCleartextPassword
              await this.#write(
                this.#writer.begin("p").cstring(requirePassword()).end()
                  .flush(),
              );
              break;
            case 5: // AuthenticationMD5Password
              await this.#write(
                this.#writer.begin("p").cstring(
                  await md5Password(user, requirePassword(), body.bytes(4)),
                ).end().flush(),
              );
              break;
            case 10: { // AuthenticationSASL
              const mechanisms: string[] = [];
              for (let m = body.cstring(); m; m = body.cstring()) {
                mechanisms.push(m);
              }
              // Postgres takes the user name from the startup message.
              scram = new ScramClient({
                hash: "SHA-256",
                password: requirePassword(),
              });
              if (!mechanisms.includes(scram.mechanism)) {
                throw new ConnectionError(
                  `Unsupported SASL mechanisms: ${mechanisms.join(", ")}`,
                );
              }
              const first = new TextEncoder().encode(scram.clientFirst());
              await this.#write(
                this.#writer.begin("p").cstring(scram.mechanism)
                  .int32(first.length).bytes(first).end().flush(),
              );
              break;
            }
            case 11: { // AuthenticationSASLContinue
              const final = await scram!.clientFinal(
                decoder.decode(body.rest()),
              );
              await this.#write(
                this.#writer.begin("p").string(final).end().flush(),
              );
              break;
            }
            case 12: // AuthenticationSASLFinal
              await scram!.verify(decoder.decode(body.rest()));
              break;
            default:
              throw new ConnectionError(
                `Unsupported authentication method: ${code}`,
              );
          }
          break;
        }
        case "K": // BackendKeyData
          this.#processId = body.int32();
          this.#secretKey = body.rest().slice();
          break;
        case "Z": // ReadyForQuery
          this.status = String.fromCharCode(body.int8());
          return;
        case "E":
          throw createError(body);
        case "v": // NegotiateProtocolVersion
          break;
        default:
          throw new ConnectionError(
            `Unexpected message during startup: ${message.type}`,
          );
      }
    }
  }

  /** Read and discard messages until ReadyForQuery */
  async readyForQuery(): Promise<void> {
    while (true) {
      const message = await this.next();
      if (message.type === "Z") {
        this.status = String.fromCharCode(message.body.int8());
        return;
      }
    }
  }

  /**
   * Run a command that reads its full response. Errors are thrown after the
   * connection is ready for the next command.
   */
  async #command(
    bytes: Uint8Array,
    handle: (message: Message) => void = () => {},
  ): Promise<void> {
    const release = await this.#acquire();
    try {
      await this.#write(bytes);
      let error: unknown;
      while (true) {
        const message = await this.next();
        if (message.type === "Z") {
          this.status = String.fromCharCode(message.body.int8());
          break;
        }
        if (message.type === "E") error ??= createError(message.body);
        else handle(message);
      }
      if (error) throw error;
    } finally {
      release();
    }
  }

  async #acquire(): Promise<() => void> {
    if (this.#closed) throw new ConnectionError("Connection is closed");
    // A result that is being read is not buffered, as it may not fit in
    // memory, so commands are rejected until it is read or disposed.
    if (this.#streaming) throw new QueryError(STREAMING_MESSAGE);
    const controller = new AbortController();
    this.#waiting.add(controller);
    let element;
    try {
      element = await this.#lock.pop({ signal: controller.signal });
    } finally {
      this.#waiting.delete(controller);
    }
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      void element.release();
    };
    try {
      // A pending cancel request must not cancel this command.
      await this.#cancelling;
      if (this.#closed) throw new ConnectionError("Connection is closed");
    } catch (error) {
      release();
      throw error;
    }
    return release;
  }

  /** Run a statement with the simple query protocol, discarding results */
  async simpleQuery(sql: string): Promise<void> {
    await this.#command(this.#writer.begin("Q").cstring(sql).end().flush());
  }

  /** Create a named prepared statement */
  async prepare(name: string, sql: string): Promise<void> {
    this.#writer.begin("P").cstring(name).cstring(sql).int16(0).end();
    this.#writer.begin("S").end();
    await this.#command(this.#writer.flush());
  }

  /** Close a named prepared statement */
  async closeStatement(name: string): Promise<void> {
    this.#writer.begin("C").int8("S".charCodeAt(0)).cstring(name).end();
    this.#writer.begin("S").end();
    await this.#command(this.#writer.flush());
  }

  /**
   * Run a statement with the extended query protocol. Parameters are sent,
   * and results received, in text format.
   *
   * When the signal is aborted while the statement runs, a cancel request is
   * sent to the server.
   *
   * A streaming result is read by the caller, and holds the connection until
   * it is read or disposed: other commands are rejected meanwhile.
   */
  async execute(
    target: Target,
    params: (string | null)[],
    signal?: AbortSignal,
    streaming = false,
  ): Promise<Cursor> {
    const release = await this.#acquire();
    let cursor: Cursor | undefined;
    const onAbort = () => {
      if (!cursor?.done) this.#cancel();
    };
    const done = () => {
      signal?.removeEventListener("abort", onAbort);
      if (this.#streaming === cursor) this.#streaming = undefined;
      release();
    };
    try {
      signal?.throwIfAborted();
      signal?.addEventListener("abort", onAbort, { once: true });

      const writer = this.#writer;
      const statement = "sql" in target ? "" : target.name;
      if ("sql" in target) {
        writer.begin("P").cstring("").cstring(target.sql).int16(0).end();
      }
      writer.begin("B").cstring("").cstring(statement).int16(0)
        .int16(params.length);
      for (const param of params) writer.value(param);
      writer.int16(0).end();
      writer.begin("D").int8("P".charCodeAt(0)).cstring("").end();
      writer.begin("E").cstring("").int32(0).end();
      writer.begin("S").end();
      await this.#write(writer.flush());

      while (true) {
        const message = await this.next();
        switch (message.type) {
          case "1": // ParseComplete
          case "2": // BindComplete
            continue;
          case "T": // RowDescription
          case "n": // NoData
            cursor = new Cursor(
              this,
              message.type === "T" ? parseRowDescription(message) : [],
              done,
            );
            if (streaming && !cursor.done) {
              this.#streaming = cursor;
              // Commands that wait for the connection would wait until the
              // result is read, which may only happen after they finish.
              for (const waiting of this.#waiting) {
                waiting.abort(new QueryError(STREAMING_MESSAGE));
              }
            }
            return cursor;
          case "E": {
            const error = createError(message.body);
            await this.readyForQuery();
            throw error;
          }
          default:
            throw new ConnectionError(
              `Unexpected message: ${message.type}`,
            );
        }
      }
    } catch (error) {
      done();
      throw error;
    }
  }

  #cancel(): void {
    const cancelling = (async () => {
      const conn = await openSocket(this.#config);
      try {
        const writer = new MessageWriter();
        await writeAll(
          conn,
          writer.begin().int32(CANCEL_REQUEST_CODE).int32(this.#processId)
            .bytes(this.#secretKey).end().flush(),
        );
        // The server closes the connection once the request is processed.
        await conn.read(new Uint8Array(1));
      } finally {
        conn.close();
      }
    })().catch(() => {});
    this.#cancelling = cancelling;
  }

  #terminate(): void {
    if (this.#closed) return;
    this.#closed = true;
    try {
      this.#conn.close();
    } catch {
      // Already closed
    }
  }

  /** Close the connection */
  async close(): Promise<void> {
    if (this.#closed) return;
    await this.#cancelling;
    try {
      await writeAll(this.#conn, this.#writer.begin("X").end().flush());
    } catch {
      // The connection is closed below either way.
    }
    this.#terminate();
  }
}

/**
 * The rows of a running statement. Rows are read from the connection as they
 * are requested.
 */
export class Cursor {
  readonly fields: Field[];
  readonly #connection: Connection;
  readonly #done: () => void;
  #chain: Promise<unknown> = Promise.resolve();
  #finished = false;
  #command?: string;

  constructor(connection: Connection, fields: Field[], done: () => void) {
    this.#connection = connection;
    this.fields = fields;
    this.#done = done;
  }

  /** Whether all rows have been read from the connection */
  get done(): boolean {
    return this.#finished;
  }

  #serial<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.#chain.then(fn);
    this.#chain = result.catch(() => {});
    return result;
  }

  #finish(): void {
    if (this.#finished) return;
    this.#finished = true;
    this.#done();
  }

  async #read(): Promise<(string | null)[] | null> {
    let error: unknown;
    while (true) {
      let message: Message;
      try {
        message = await this.#connection.next();
      } catch (error) {
        // The connection is closed after a socket error.
        this.#finish();
        throw error;
      }
      switch (message.type) {
        case "D": // DataRow
          return parseDataRow(message);
        case "C": // CommandComplete
          this.#command = message.body.cstring();
          break;
        case "I": // EmptyQueryResponse
        case "s": // PortalSuspended
          break;
        case "E":
          error ??= createError(message.body);
          break;
        case "Z":
          this.#connection.status = String.fromCharCode(message.body.int8());
          this.#finish();
          if (error) throw error;
          return null;
        default:
          // The connection can not be reused after a protocol error.
          this.#finish();
          await this.#connection.close();
          throw new ConnectionError(`Unexpected message: ${message.type}`);
      }
    }
  }

  /** Read the next row, or `null` when there are no more rows */
  next(): Promise<(string | null)[] | null> {
    return this.#serial(async () => {
      if (this.#finished) return null;
      return await this.#read();
    });
  }

  /**
   * Read all remaining rows, discarding them, and resolve to the command
   * tag, such as `INSERT 0 1`.
   */
  complete(): Promise<string | undefined> {
    return this.#serial(async () => {
      while (!this.#finished) await this.#read();
      return this.#command;
    });
  }

  /** Discard the remaining rows, ignoring errors */
  async discard(): Promise<void> {
    await this.complete().catch(() => {});
  }
}
