import {
  DatabaseSync,
  type SQLInputValue,
  type StatementSync,
} from "node:sqlite";
import {
  type ConnectionOptions,
  type ExecuteResult,
  type Options,
  QueryError,
  type QueryOptions,
  TransactionError,
  type TransactionOptions,
} from "../../sql/mod.ts";
import {
  BaseDriver,
  type DriverParameters,
  type DriverResult,
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
   * another connection. Defaults to `5000`.
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

// Whitespace and comments, which may follow the statement
const TRAILING = /^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?(?:\*\/|$))*$/;

type SqliteValue = null | number | bigint | string | Uint8Array;

function toSqliteValue(value: unknown): SqliteValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  // Binary data is stored as a BLOB of its bytes, without copying.
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (
    typeof value === "number" || typeof value === "bigint" ||
    typeof value === "string"
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
 * await driver.execute("CREATE TABLE users (id INTEGER, name TEXT)");
 * await driver.execute("INSERT INTO users VALUES (?, ?)", [1, "Alice"]);
 * console.log(await driver.query("SELECT * FROM users").toRecords());
 * ```
 */
export class SqliteDriver extends BaseDriver<SqliteOptions> {
  #db?: DatabaseSync;
  #totalChanges?: StatementSync;
  // Running a statement resets its running iteration, so while a prepared
  // statement is iterated, it is prepared again for other runs.
  readonly #iterating = new WeakSet<StatementSync>();

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
    // SQLite only prepares the first statement and ignores the rest.
    const index = sql.indexOf(stmt.sourceSQL);
    if (
      index !== -1 &&
      !TRAILING.test(sql.slice(index + stmt.sourceSQL.length))
    ) {
      throw new QueryError(
        "Cannot run multiple statements at once, run them one by one",
      );
    }
    // `setReturnArrays` is missing from the `node:sqlite` typings.
    (stmt as StatementSync & { setReturnArrays(enabled: boolean): void })
      .setReturnArrays(true);
    stmt.setReadBigInts(
      this.options.connectionOptions?.readBigInts ?? false,
    );
    return stmt;
  }

  /**
   * Run a statement, and return the affected rows and the last inserted id.
   * The `changes` and `lastInsertRowid` of SQLite are only updated by
   * INSERT, UPDATE and DELETE statements, so they are stale after other
   * statements: those affect no rows, and report no inserted id.
   */
  #run(
    stmt: StatementSync,
    params: DriverParameters | undefined,
  ): ExecuteResult {
    this.#totalChanges ??= this.#db!.prepare("SELECT total_changes() AS n");
    const before = this.#totalChanges.get()!.n;
    const { changes, lastInsertRowid } = stmt.run(...toSqliteArgs(params));
    if (this.#totalChanges.get()!.n === before) return { affectedRows: 0 };
    return { affectedRows: Number(changes), lastInsertId: lastInsertRowid };
  }

  async *#rows(
    stmt: StatementSync,
    params: DriverParameters | undefined,
    done?: () => void,
  ): AsyncGenerator<unknown[]> {
    try {
      for (const values of stmt.iterate(...toSqliteArgs(params))) {
        yield values as unknown as unknown[];
      }
    } finally {
      done?.();
    }
  }

  #result(
    stmt: StatementSync,
    params: DriverParameters | undefined,
    done?: () => void,
  ): DriverResult {
    return {
      columns: stmt.columns().map((column) => column.name),
      rows: this.#rows(stmt, params, done),
    };
  }

  protected override connectDriver(): Promise<void> {
    const { readOnly, enableForeignKeyConstraints, timeout = 5000 } =
      this.options.connectionOptions ?? {};
    const url = this.connectionUrl;
    this.#db = new DatabaseSync(
      url instanceof URL ? url : url.toString(),
      {
        ...(readOnly !== undefined && { readOnly }),
        ...(enableForeignKeyConstraints !== undefined &&
          { enableForeignKeyConstraints }),
        timeout,
      },
    );
    return Promise.resolve();
  }

  protected override closeDriver(): Promise<void> {
    const db = this.#db;
    this.#db = undefined;
    this.#totalChanges = undefined;
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
  ): Promise<ExecuteResult> {
    return Promise.resolve(this.#run(this.#statement(sql), params));
  }

  protected override executeScriptDriver(
    sql: string,
    _options: QueryOptions,
  ): Promise<void> {
    this.#db!.exec(sql);
    return Promise.resolve();
  }

  protected override queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    _options: QueryOptions,
  ): Promise<DriverResult> {
    return Promise.resolve(this.#result(this.#statement(sql), params));
  }

  protected override prepareDriver(
    sql: string,
    _options: QueryOptions,
  ): Promise<StatementHandle> {
    const stmt = this.#statement(sql);
    return Promise.resolve({
      execute: (params) =>
        Promise.resolve(
          this.#run(
            this.#iterating.has(stmt) ? this.#statement(sql) : stmt,
            params,
          ),
        ),
      query: (params) => {
        if (this.#iterating.has(stmt)) {
          return Promise.resolve(this.#result(this.#statement(sql), params));
        }
        this.#iterating.add(stmt);
        return Promise.resolve(
          this.#result(stmt, params, () => this.#iterating.delete(stmt)),
        );
      },
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
