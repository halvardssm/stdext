import {
  ConnectionError,
  type ConnectionOptions,
  DatabaseError,
  type Dialect,
  type Driver,
  type DriverConnection,
  type DriverQueryOptions,
  type DriverRows,
  type DriverSavepoint,
  type DriverStatement,
  type DriverTransaction,
  type ExecuteResult,
  QueryError,
  type QueryParameters,
  TransactionError,
  type TransactionOptions,
} from "../../sql/mod.ts";
import {
  Connection,
  type ConnectionConfig,
  type Cursor,
  type Target,
} from "./_connection.ts";
import { defaultParsers, encodeParameter, type Parser } from "./_types.ts";

/**
 * PostgresTlsOptions
 */
export interface PostgresTlsOptions {
  /**
   * Whether to connect with TLS. Defaults to the `sslmode` of the connection
   * URL, or `"prefer"`.
   *
   * - `"disable"`: never use TLS
   * - `"prefer"`: use TLS when the server supports it
   * - `"require"`: fail when the server does not support TLS
   *
   * When TLS is used, the server certificate is always verified.
   */
  mode?: "disable" | "prefer" | "require";
  /**
   * Additional PEM encoded CA certificates to trust, such as the certificate
   * of a self-signed server.
   */
  caCerts?: string[];
}

/**
 * PostgresConnectionOptions
 *
 * Options used when connecting to the database. The host, port, user,
 * password and database, and the `sslmode` and `application_name`
 * parameters, are read from the connection URL; these options take
 * precedence.
 */
export interface PostgresConnectionOptions extends ConnectionOptions {
  /**
   * The password, if it is not given in the connection URL
   */
  password?: string;
  /**
   * TLS settings
   */
  tls?: PostgresTlsOptions;
  /**
   * The `application_name` reported to the server
   */
  applicationName?: string;
  /**
   * Run-time parameters sent to the server on connect, such as
   * `{ search_path: "app", TimeZone: "UTC" }`
   */
  runtimeParameters?: Record<string, string>;
  /**
   * Parsers for result values in text format by type OID, overriding the
   * defaults. Values of types without a parser are returned as strings.
   *
   * By default, `bool` is parsed as `boolean`, `int2`, `int4`, `oid`,
   * `float4` and `float8` as `number`, `int8` as `bigint`, `json` and
   * `jsonb` with `JSON.parse`, `bytea` as `Uint8Array`, `timestamp` and
   * `timestamptz` as `Date` (`timestamp` in UTC), and arrays of these
   * types as arrays. `numeric` and `date` are returned as strings to not lose
   * precision.
   */
  parsers?: Record<number, Parser>;
}

/**
 * PostgresTransactionOptions
 *
 * @see https://www.postgresql.org/docs/current/sql-set-transaction.html
 */
export interface PostgresTransactionOptions extends TransactionOptions {
  /** The isolation level of the transaction */
  isolationLevel?:
    | "serializable"
    | "repeatable read"
    | "read committed"
    | "read uncommitted";
  /** Whether the transaction is read only */
  readOnly?: boolean;
  /** Whether a serializable, read only transaction is deferrable */
  deferrable?: boolean;
}

// libpq `sslmode` values. Deno can not encrypt without verifying the server
// certificate, so the certificate is verified in every mode with TLS.
const SSL_MODES: Record<string, ConnectionConfig["tls"]> = {
  disable: "disable",
  allow: "prefer",
  prefer: "prefer",
  require: "require",
  "verify-ca": "require",
  "verify-full": "require",
};

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const ISOLATION_LEVELS = new Set([
  "serializable",
  "repeatable read",
  "read committed",
  "read uncommitted",
]);

function parseConfig(
  connectionUrl: string | URL,
  options: PostgresConnectionOptions,
): ConnectionConfig {
  let url: URL;
  try {
    url = new URL(connectionUrl);
  } catch {
    throw new ConnectionError("Invalid connection URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new ConnectionError(
      `Unsupported connection URL protocol: ${url.protocol}`,
    );
  }
  const user = decodeURIComponent(url.username) || "postgres";
  // The libpq connection URI parameters, which the options take precedence
  // over.
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode !== null && !(sslmode in SSL_MODES)) {
    throw new ConnectionError(`Invalid sslmode: ${sslmode}`);
  }
  const applicationName = options.applicationName ??
    url.searchParams.get("application_name");
  const parameters: Record<string, string> = {
    ...options.runtimeParameters,
  };
  if (applicationName) parameters.application_name = applicationName;
  return {
    hostname: url.hostname.replace(/^\[(.*)\]$/, "$1") || "localhost",
    port: url.port ? Number(url.port) : 5432,
    user,
    password: options.password ??
      (url.password ? decodeURIComponent(url.password) : undefined),
    database: decodeURIComponent(url.pathname.slice(1)) || user,
    tls: options.tls?.mode ?? (sslmode ? SSL_MODES[sslmode] : "prefer"),
    caCerts: options.tls?.caCerts,
    parameters,
  };
}

function encodeParameters(
  params: QueryParameters | undefined,
): (string | null)[] {
  if (params === undefined) return [];
  if (!Array.isArray(params)) {
    throw new QueryError(
      "Postgres does not support named parameters, use positional parameters ($1, $2, ...) with an array",
    );
  }
  return params.map(encodeParameter);
}

// Commands that report the rows they modified in their tag
const MODIFYING_COMMANDS = new Set(["INSERT", "UPDATE", "DELETE", "MERGE"]);

/**
 * Parse the rows inserted, updated or deleted from a command tag, such as
 * `INSERT 0 3` or `UPDATE 2`. Other commands, such as `SELECT 2` or
 * `CREATE TABLE`, modify no rows.
 */
function parseCommandTag(tag: string | undefined): ExecuteResult {
  const parts = tag?.split(" ") ?? [];
  if (!MODIFYING_COMMANDS.has(parts[0])) return { affectedRows: 0 };
  // Postgres has no insert ids: they are returned with RETURNING instead.
  return { affectedRows: Number(parts.at(-1)) };
}

/**
 * The SQL dialect of Postgres: `$1`, `$2`, ... placeholders and double quoted
 * identifiers.
 */
export const postgresDialect: Dialect = {
  name: "postgres",
  placeholder: (index) => `$${index + 1}`,
  quoteIdentifier: (name) => `"${name.replaceAll('"', '""')}"`,
};

function beginStatement(options: PostgresTransactionOptions = {}): string {
  const modes: string[] = [];
  if (options.isolationLevel !== undefined) {
    if (!ISOLATION_LEVELS.has(options.isolationLevel)) {
      throw new TransactionError(
        `Invalid isolation level: ${options.isolationLevel}`,
      );
    }
    modes.push(`ISOLATION LEVEL ${options.isolationLevel.toUpperCase()}`);
  }
  if (options.readOnly !== undefined) {
    modes.push(options.readOnly ? "READ ONLY" : "READ WRITE");
  }
  if (options.deferrable !== undefined) {
    modes.push(options.deferrable ? "DEFERRABLE" : "NOT DEFERRABLE");
  }
  return ["BEGIN", modes.join(", ")].filter(Boolean).join(" ");
}

function wrapError(
  error: unknown,
  ErrorClass: new (message: string) => DatabaseError,
): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const wrapped = new ErrorClass(
    error instanceof Error ? error.message : String(error),
  );
  wrapped.cause = error;
  return wrapped;
}

/**
 * PostgresDriver
 *
 * The Postgres driver, implemented in TypeScript on top of the Postgres
 * frontend/backend protocol. Requires the `net` permission.
 *
 * The connection URL has the format
 * `postgres://user:password@host:port/database`, following the libpq
 * connection URI format, with the `sslmode` and `application_name`
 * parameters; other options are passed through the
 * {@linkcode PostgresConnectionOptions}, which take precedence. Supported
 * authentication methods are SCRAM-SHA-256, MD5 and cleartext passwords.
 *
 * Parameters use the positional `$1`, `$2`, ... placeholders and are sent in
 * text format, with the types inferred by the server.
 *
 * Applications should in most cases use a {@linkcode PostgresClient}.
 *
 * @example
 * ```ts ignore
 * import { PostgresDriver } from "@stdext/database/drivers/postgres";
 *
 * const driver = new PostgresDriver();
 * await using connection = await driver.connect("postgres://user@localhost/db", {
 *   password: "secret",
 * });
 * await using rows = await connection.query("SELECT $1::int + 1 AS a", [1]);
 * for await (const values of rows) console.log(values);
 * ```
 */
export class PostgresDriver
  implements Driver<PostgresConnectionOptions, PostgresTransactionOptions> {
  readonly dialect: Dialect = postgresDialect;

  async connect(
    url: string | URL,
    options?: PostgresConnectionOptions & { signal?: AbortSignal },
  ): Promise<PostgresConnection> {
    const signal = options?.signal;
    try {
      signal?.throwIfAborted();
      const connection = await Connection.connect(
        parseConfig(url, options ?? {}),
        signal,
      );
      const parsers = options?.parsers
        ? { ...defaultParsers, ...options.parsers }
        : defaultParsers;
      return new PostgresConnection(connection, parsers);
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      throw wrapError(error, ConnectionError);
    }
  }
}

/**
 * PostgresConnection
 *
 * A connection of the {@linkcode PostgresDriver}. While a query result is
 * being read, other operations are rejected with a `QueryError`, rather than
 * buffering the rest of the result in memory.
 */
export class PostgresConnection
  implements DriverConnection<PostgresTransactionOptions> {
  readonly #connection: Connection;
  readonly #parsers: Record<number, Parser>;
  #statementId = 0;

  /**
   * Connections are opened with {@linkcode PostgresDriver.connect}.
   *
   * @ignore
   */
  constructor(connection: Connection, parsers: Record<number, Parser>) {
    this.#connection = connection;
    this.#parsers = parsers;
  }

  get closed(): boolean {
    return !this.#connection.connected;
  }

  /**
   * The run-time parameters reported by the server, such as
   * `server_version`.
   */
  get serverParameters(): ReadonlyMap<string, string> {
    return this.#connection.parameters;
  }

  #assertOpen(signal?: AbortSignal): void {
    signal?.throwIfAborted();
    if (this.closed) throw new ConnectionError("Connection is closed");
  }

  async #execute(
    target: Target,
    params: QueryParameters | undefined,
    signal: AbortSignal | undefined,
  ): Promise<ExecuteResult> {
    try {
      this.#assertOpen(signal);
      const cursor = await this.#connection.execute(
        target,
        encodeParameters(params),
        signal,
      );
      return parseCommandTag(await cursor.complete());
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      throw wrapError(error, QueryError);
    }
  }

  async #query(
    target: Target,
    params: QueryParameters | undefined,
    signal: AbortSignal | undefined,
  ): Promise<DriverRows> {
    let cursor: Cursor;
    try {
      this.#assertOpen(signal);
      cursor = await this.#connection.execute(
        target,
        encodeParameters(params),
        signal,
        true,
      );
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      throw wrapError(error, QueryError);
    }
    const parse = cursor.fields.map((field) => this.#parsers[field.typeOid]);
    let consumed = false;
    return {
      columns: cursor.fields.map((field) => field.name),
      async *[Symbol.asyncIterator]() {
        if (consumed) return;
        consumed = true;
        try {
          while (true) {
            const raw = await cursor.next();
            if (raw === null) return;
            yield raw.map((value, i) =>
              value === null || parse[i] === undefined ? value : parse[i](value)
            );
          }
        } catch (error) {
          if (signal?.aborted) throw signal.reason;
          throw wrapError(error, QueryError);
        } finally {
          await cursor.discard();
        }
      },
      [Symbol.asyncDispose]: () => cursor.discard(),
    };
  }

  close(): Promise<void> {
    return this.#connection.close();
  }

  execute(
    sql: string,
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<ExecuteResult> {
    return this.#execute({ sql }, params, options?.signal);
  }

  query(
    sql: string,
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<DriverRows> {
    return this.#query({ sql }, params, options?.signal);
  }

  async executeScript(
    sql: string,
    options?: DriverQueryOptions,
  ): Promise<void> {
    try {
      this.#assertOpen(options?.signal);
      // The simple query protocol runs several statements without parameters.
      await this.#connection.simpleQuery(sql);
    } catch (error) {
      if (options?.signal?.aborted) throw options.signal.reason;
      throw wrapError(error, QueryError);
    }
  }

  async ping(): Promise<void> {
    try {
      this.#assertOpen();
      await this.#connection.simpleQuery("SELECT 1");
    } catch (error) {
      throw wrapError(error, ConnectionError);
    }
  }

  /** Run a transaction control statement */
  async #control(sql: string): Promise<void> {
    try {
      await this.#execute({ sql }, undefined, undefined);
    } catch (error) {
      throw wrapError(error, TransactionError);
    }
  }

  async begin(
    options?: PostgresTransactionOptions,
  ): Promise<DriverTransaction> {
    this.#assertOpen();
    await this.#control(beginStatement(options));
    let active = true;
    const end = async (sql: string) => {
      if (!active) throw new TransactionError("Transaction is not active");
      await this.#control(sql);
      active = false;
    };
    return {
      commit: () => end("COMMIT"),
      rollback: () => end("ROLLBACK"),
      savepoint: async (name: string): Promise<DriverSavepoint> => {
        if (!active) throw new TransactionError("Transaction is not active");
        if (!IDENTIFIER.test(name)) {
          throw new TransactionError(`Invalid savepoint name: ${name}`);
        }
        await this.#control(`SAVEPOINT ${name}`);
        return this.#savepoint(name, () => active);
      },
      [Symbol.asyncDispose]: async (): Promise<void> => {
        if (active && !this.closed) await end("ROLLBACK");
      },
    };
  }

  #savepoint(name: string, transactionActive: () => boolean): DriverSavepoint {
    let active = true;
    const end = async (...statements: string[]) => {
      if (!active || !transactionActive()) {
        throw new TransactionError("Savepoint is not active");
      }
      for (const sql of statements) await this.#control(sql);
      active = false;
    };
    const rollback = () =>
      end(`ROLLBACK TO SAVEPOINT ${name}`, `RELEASE SAVEPOINT ${name}`);
    return {
      release: () => end(`RELEASE SAVEPOINT ${name}`),
      rollback,
      async [Symbol.asyncDispose]() {
        if (active && transactionActive()) await rollback();
      },
    };
  }

  async prepare(sql: string): Promise<DriverStatement> {
    const name = `stdext_${++this.#statementId}`;
    try {
      this.#assertOpen();
      await this.#connection.prepare(name, sql);
    } catch (error) {
      throw wrapError(error, QueryError);
    }
    let deallocated = false;
    const assertUsable = () => {
      if (deallocated) {
        throw new QueryError("Prepared statement is deallocated");
      }
    };
    const statement: DriverStatement = {
      sql,
      execute: async (params, options): Promise<ExecuteResult> => {
        assertUsable();
        return await this.#execute({ name }, params, options?.signal);
      },
      query: async (params, options): Promise<DriverRows> => {
        assertUsable();
        return await this.#query({ name }, params, options?.signal);
      },
      deallocate: async (): Promise<void> => {
        if (deallocated) return;
        deallocated = true;
        if (!this.closed) {
          await this.#connection.closeStatement(name);
        }
      },
      [Symbol.asyncDispose]: () => statement.deallocate(),
    };
    return statement;
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}
