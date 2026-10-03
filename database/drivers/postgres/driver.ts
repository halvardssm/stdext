import {
  ConnectionError,
  type ConnectionOptions,
  type Options,
  QueryError,
  type QueryOptions,
  type Row,
  TransactionError,
  type TransactionOptions,
} from "../../sql/mod.ts";
import {
  BaseDriver,
  type DriverParameters,
  type StatementHandle,
} from "../core/driver.ts";
import {
  Connection,
  type ConnectionConfig,
  type Target,
} from "./_connection.ts";
import { defaultParsers, encodeParameter, type Parser } from "./_types.ts";

/**
 * PostgresTlsOptions
 */
export interface PostgresTlsOptions {
  /**
   * Whether to connect with TLS. Defaults to `"prefer"`.
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
 * password and database are read from the connection URL.
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
   * `timestamptz` as `Date` (`timestamp` in local time), and arrays of these
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

/**
 * PostgresOptions
 *
 * The options that a {@linkcode PostgresDriver} is constructed with.
 */
export interface PostgresOptions extends
  Options<
    PostgresConnectionOptions,
    QueryOptions,
    PostgresTransactionOptions
  > {}

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
  const parameters: Record<string, string> = {
    ...options.runtimeParameters,
  };
  if (options.applicationName) {
    parameters.application_name = options.applicationName;
  }
  return {
    hostname: url.hostname.replace(/^\[(.*)\]$/, "$1") || "localhost",
    port: url.port ? Number(url.port) : 5432,
    user,
    password: options.password ??
      (url.password ? decodeURIComponent(url.password) : undefined),
    database: decodeURIComponent(url.pathname.slice(1)) || user,
    tls: options.tls?.mode ?? "prefer",
    caCerts: options.tls?.caCerts,
    parameters,
  };
}

function encodeParameters(
  params: DriverParameters | undefined,
): (string | null)[] {
  if (params === undefined) return [];
  if (!Array.isArray(params)) {
    throw new QueryError(
      "Postgres does not support named parameters, use positional parameters ($1, $2, ...) with an array",
    );
  }
  return params.map(encodeParameter);
}

/**
 * Parse the affected rows from a command tag, such as `INSERT 0 3` or
 * `UPDATE 2`. Commands without a row count, such as `CREATE TABLE`, resolve
 * to `undefined`.
 */
function parseCommandTag(tag: string | undefined): number | undefined {
  const parts = tag?.split(" ") ?? [];
  const count = Number(parts.at(-1));
  return parts.length > 1 && Number.isInteger(count) ? count : undefined;
}

/**
 * PostgresDriver
 *
 * A single connection to a Postgres database, implemented in TypeScript on
 * top of the Postgres frontend/backend protocol. Requires the `net`
 * permission.
 *
 * The connection URL has the format
 * `postgres://user:password@host:port/database`; other options are passed
 * through the {@linkcode PostgresConnectionOptions}. Supported authentication
 * methods are SCRAM-SHA-256, MD5 and cleartext passwords.
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
 * await using driver = new PostgresDriver("postgres://user@localhost/db", {
 *   connectionOptions: { password: "secret" },
 * });
 * await driver.connect();
 * const ctx = await driver.query("SELECT $1::int + 1 AS solution", [1]);
 * console.log(await ctx.toRecords());
 * ```
 */
export class PostgresDriver extends BaseDriver<PostgresOptions> {
  #connection?: Connection;
  #statementId = 0;

  get connected(): boolean {
    return this.#connection?.connected ?? false;
  }

  /**
   * The run-time parameters reported by the server, such as
   * `server_version`. Only available while connected.
   */
  get serverParameters(): ReadonlyMap<string, string> | undefined {
    return this.#connection?.parameters;
  }

  #parsers(): Record<number, Parser> {
    const parsers = this.options.connectionOptions?.parsers;
    return parsers ? { ...defaultParsers, ...parsers } : defaultParsers;
  }

  async #execute(
    connection: Connection,
    target: Target,
    params: DriverParameters | undefined,
    signal: AbortSignal | undefined,
  ): Promise<number | undefined> {
    try {
      const cursor = await connection.execute(
        target,
        encodeParameters(params),
        signal,
      );
      return parseCommandTag(await cursor.complete());
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      throw error;
    }
  }

  async *#query(
    connection: Connection,
    target: Target,
    params: DriverParameters | undefined,
    signal: AbortSignal | undefined,
  ): AsyncGenerator<Row> {
    const parsers = this.#parsers();
    let cursor;
    try {
      cursor = await connection.execute(
        target,
        encodeParameters(params),
        signal,
      );
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      throw error;
    }
    try {
      const columns = cursor.fields.map((field) => field.name);
      const parse = cursor.fields.map((field) => parsers[field.typeOid]);
      while (true) {
        const raw = await cursor.next();
        if (raw === null) return;
        const values = raw.map((value, i) =>
          value === null || parse[i] === undefined ? value : parse[i](value)
        );
        yield { columns, values };
      }
    } catch (error) {
      if (signal?.aborted) throw signal.reason;
      throw error;
    } finally {
      await cursor.discard();
    }
  }

  get #active(): Connection {
    if (!this.#connection?.connected) {
      throw new ConnectionError("Driver is not connected");
    }
    return this.#connection;
  }

  protected override async connectDriver(): Promise<void> {
    this.#connection = await Connection.connect(
      parseConfig(this.connectionUrl, this.options.connectionOptions ?? {}),
    );
  }

  protected override async closeDriver(): Promise<void> {
    const connection = this.#connection;
    this.#connection = undefined;
    await connection?.close();
  }

  protected override async pingDriver(): Promise<void> {
    await this.#active.simpleQuery("SELECT 1");
  }

  protected override executeDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<number | undefined> {
    return this.#execute(this.#active, { sql }, params, options.signal);
  }

  protected override queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): AsyncIterable<Row> {
    return this.#query(this.#active, { sql }, params, options.signal);
  }

  protected override async prepareDriver(
    sql: string,
    _options: QueryOptions,
  ): Promise<StatementHandle> {
    const connection = this.#active;
    const name = `stdext_${++this.#statementId}`;
    await connection.prepare(name, sql);
    return {
      execute: (params, options) =>
        this.#execute(connection, { name }, params, options.signal),
      query: (params, options) =>
        this.#query(connection, { name }, params, options.signal),
      deallocate: async () => {
        if (connection.connected) await connection.closeStatement(name);
      },
    };
  }

  protected override beginStatement(
    options: PostgresTransactionOptions,
  ): string {
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
}
