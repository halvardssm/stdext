import {
  DatabaseSync,
  type SQLInputValue,
  type StatementSync,
} from "node:sqlite";
import {
  type ConnectionOptions,
  type Options,
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

/**
 * SqliteConnectionOptions
 *
 * Options used when opening the database.
 */
export interface SqliteConnectionOptions extends ConnectionOptions {
  /**
   * Open the database in read-only mode. Defaults to `false`.
   */
  readOnly?: boolean;
  /**
   * Enforce foreign key constraints. Defaults to `true`.
   */
  enableForeignKeyConstraints?: boolean;
  /**
   * The busy timeout in milliseconds, used when the database is locked by
   * another connection. Defaults to `0`.
   */
  timeout?: number;
  /**
   * Return integers as `bigint` instead of `number`. Defaults to `false`, in
   * which case reading an integer outside of the safe integer range throws.
   */
  readBigInts?: boolean;
}

/**
 * SqliteTransactionOptions
 */
export interface SqliteTransactionOptions extends TransactionOptions {
  /**
   * The locking behavior of the transaction. Defaults to `"deferred"`.
   *
   * @see https://www.sqlite.org/lang_transaction.html
   */
  behavior?: "deferred" | "immediate" | "exclusive";
}

/**
 * SqliteOptions
 *
 * The options that a {@linkcode SqliteDriver} is constructed with.
 */
export interface SqliteOptions
  extends
    Options<SqliteConnectionOptions, QueryOptions, SqliteTransactionOptions> {}

const BEHAVIORS = new Set(["deferred", "immediate", "exclusive"]);

type SqliteValue = null | number | bigint | string | Uint8Array;

function toSqliteValue(value: unknown): SqliteValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "number" || typeof value === "bigint" ||
    typeof value === "string" || value instanceof Uint8Array
  ) {
    return value;
  }
  return JSON.stringify(value);
}

// `node:sqlite` takes named parameters as the first argument, which the typings
// only express through overloads.
function toSqliteArgs(params: DriverParameters | undefined): SQLInputValue[] {
  if (params === undefined) return [];
  if (Array.isArray(params)) return params.map(toSqliteValue);
  return [
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, toSqliteValue(value)]),
    ),
  ] as unknown as SQLInputValue[];
}

/**
 * SqliteDriver
 *
 * A single connection to a SQLite database, backed by the built-in
 * `node:sqlite` module.
 *
 * The connection URL is a file path, a `file:` URL, or `:memory:` for an
 * in-memory database. Positional parameters use `?` placeholders, and named
 * parameters use `:name`, `@name` or `$name` placeholders.
 *
 * Applications should in most cases use a {@linkcode SqliteClient}.
 *
 * @example
 * ```ts
 * import { SqliteDriver } from "@stdext/database/drivers/sqlite";
 *
 * await using driver = new SqliteDriver(":memory:");
 * await driver.connect();
 * await driver.execute("CREATE TABLE users (id INTEGER, name TEXT)");
 * await driver.execute("INSERT INTO users VALUES (?, ?)", [1, "Alice"]);
 * const ctx = await driver.query("SELECT * FROM users");
 * console.log(await ctx.toRecords());
 * ```
 */
export class SqliteDriver extends BaseDriver<SqliteOptions> {
  #db?: DatabaseSync;

  get connected(): boolean {
    return this.#db?.isOpen ?? false;
  }

  /**
   * The underlying `node:sqlite` database, for functionality outside of the
   * standard interface. Only available while connected.
   */
  get database(): DatabaseSync | undefined {
    return this.#db;
  }

  #statement(sql: string): StatementSync {
    const stmt = this.#db!.prepare(sql);
    // `setReturnArrays` is missing from the `node:sqlite` typings.
    (stmt as StatementSync & { setReturnArrays(enabled: boolean): void })
      .setReturnArrays(true);
    stmt.setReadBigInts(
      this.options.connectionOptions?.readBigInts ?? false,
    );
    return stmt;
  }

  async *#rows(
    stmt: StatementSync,
    params: DriverParameters | undefined,
  ): AsyncGenerator<Row> {
    const columns = stmt.columns().map((column) => column.name);
    for (const values of stmt.iterate(...toSqliteArgs(params))) {
      yield { columns, values: values as unknown as unknown[] };
    }
  }

  protected override connectDriver(): Promise<void> {
    const { readOnly, enableForeignKeyConstraints, timeout } =
      this.options.connectionOptions ?? {};
    const url = this.connectionUrl;
    this.#db = new DatabaseSync(
      url instanceof URL ? url : url.toString(),
      {
        ...(readOnly !== undefined && { readOnly }),
        ...(enableForeignKeyConstraints !== undefined &&
          { enableForeignKeyConstraints }),
        ...(timeout !== undefined && { timeout }),
      },
    );
    return Promise.resolve();
  }

  protected override closeDriver(): Promise<void> {
    const db = this.#db;
    this.#db = undefined;
    db?.close();
    return Promise.resolve();
  }

  protected override pingDriver(): Promise<void> {
    this.#db!.prepare("SELECT 1").get();
    return Promise.resolve();
  }

  protected override executeDriver(
    sql: string,
    params: DriverParameters | undefined,
    _options: QueryOptions,
  ): Promise<number | undefined> {
    const { changes } = this.#statement(sql).run(...toSqliteArgs(params));
    return Promise.resolve(Number(changes));
  }

  protected override async *queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    _options: QueryOptions,
  ): AsyncGenerator<Row> {
    yield* this.#rows(this.#statement(sql), params);
  }

  protected override prepareDriver(
    sql: string,
    _options: QueryOptions,
  ): Promise<StatementHandle> {
    const stmt = this.#statement(sql);
    return Promise.resolve({
      execute: (params) => {
        const { changes } = stmt.run(...toSqliteArgs(params));
        return Promise.resolve(Number(changes));
      },
      query: (params) => this.#rows(stmt, params),
      // Statements are finalized by `node:sqlite` when garbage collected or
      // when the database is closed.
      deallocate: () => Promise.resolve(),
    });
  }

  protected override beginStatement(options: SqliteTransactionOptions): string {
    const behavior = options.behavior ?? "deferred";
    if (!BEHAVIORS.has(behavior)) {
      throw new TransactionError(`Invalid transaction behavior: ${behavior}`);
    }
    return `BEGIN ${behavior.toUpperCase()}`;
  }
}
