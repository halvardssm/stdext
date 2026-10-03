/**
 * An in-memory driver on top of the core classes, used to test the core
 * classes and the conformance suite without a database.
 *
 * It only understands the statements of {@linkcode memorySql} and transaction
 * control statements; everything else is a syntax error.
 *
 * @module
 */
import { type ExecuteResult, type QueryOptions, sql } from "../../sql/mod.ts";
import type { TestSql } from "../../sql/testing.ts";
import { BaseClient } from "./client.ts";
import {
  BaseDriver,
  type DriverParameters,
  type DriverResult,
  type StatementHandle,
} from "./driver.ts";

export const memorySql: TestSql = {
  execute: "CREATE TABLE IF NOT EXISTS users (id INTEGER, name TEXT)",
  query: "SELECT id, name FROM users",
  columns: ["id", "name"],
  count: 3,
  parameterQuery: "SELECT ? AS value",
  emptyQuery: "SELECT id, name FROM users WHERE 1 = 0",
  parameterTemplate: (value) => sql`SELECT ${value} AS value`,
};

const USERS = [[1, "Alice"], [2, "Bob"], [3, "Charlie"]];
const CONTROL = /^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/;

/** The connection URL of a database that fails to connect */
export const FAILING_URL = "memory://fail";
/** The connection URL of a database that connects until aborted */
export const HANGING_URL = "memory://hang";

export class MemoryDriver extends BaseDriver {
  #connected = false;
  /** The statements run, for assertions */
  readonly statements: string[] = [];

  get connected(): boolean {
    return this.#connected;
  }

  /** Simulate a connection lost without closing the driver */
  loseConnection(): void {
    this.#connected = false;
  }

  #run(
    sql: string,
    params: DriverParameters | undefined,
  ): { columns: string[]; rows: unknown[][] } {
    this.statements.push(sql);
    if (sql === memorySql.query) {
      return { columns: memorySql.columns, rows: USERS };
    }
    if (sql === memorySql.emptyQuery) {
      return { columns: memorySql.columns, rows: [] };
    }
    if (sql === memorySql.parameterQuery) {
      const values = Array.isArray(params) ? params : [];
      return { columns: ["value"], rows: [[values[0]]] };
    }
    if (sql === memorySql.execute || CONTROL.test(sql)) {
      return { columns: [], rows: [] };
    }
    throw new Error(`Syntax error: ${sql}`);
  }

  protected override connectDriver(signal: AbortSignal): Promise<void> {
    if (this.connectionUrl.toString() === FAILING_URL) {
      return Promise.reject(new Error("Connection refused"));
    }
    if (this.connectionUrl.toString() === HANGING_URL) {
      return new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason))
      );
    }
    this.#connected = true;
    return Promise.resolve();
  }

  protected override closeDriver(): Promise<void> {
    this.#connected = false;
    return Promise.resolve();
  }

  protected override pingDriver(): Promise<void> {
    return Promise.resolve();
  }

  protected override executeDriver(
    sql: string,
    params: DriverParameters | undefined,
    _options: QueryOptions,
  ): Promise<ExecuteResult> {
    // Only the statements that do not modify rows are supported.
    this.#run(sql, params);
    return Promise.resolve({ affectedRows: 0 });
  }

  protected override executeScriptDriver(
    sql: string,
    _options: QueryOptions,
  ): Promise<void> {
    for (const statement of sql.split(";")) {
      if (statement.trim()) this.#run(statement.trim(), undefined);
    }
    return Promise.resolve();
  }

  protected override queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    _options: QueryOptions,
  ): Promise<DriverResult> {
    const { columns, rows } = this.#run(sql, params);
    async function* iterate(): AsyncGenerator<unknown[]> {
      yield* rows;
    }
    return Promise.resolve({ columns, rows: iterate() });
  }

  protected override prepareDriver(
    sql: string,
    _options: QueryOptions,
  ): Promise<StatementHandle> {
    // Without native prepared statements, the statement is prepared on each
    // execution.
    return Promise.resolve({
      execute: (params, options) => this.executeDriver(sql, params, options),
      query: (params, options) => this.queryDriver(sql, params, options),
      deallocate: () => Promise.resolve(),
    });
  }
}

export class MemoryClient extends BaseClient<MemoryDriver> {
  protected override createDriver(): MemoryDriver {
    const { connectionOptions, queryOptions, transactionOptions } =
      this.options;
    return new MemoryDriver(this.connectionUrl, {
      connectionOptions,
      queryOptions,
      transactionOptions,
    });
  }
}
