/**
 * An in-memory driver on top of the core classes, used to test the core
 * classes and the conformance suite without a database.
 *
 * It only understands the statements of {@linkcode memorySql} and transaction
 * control statements; everything else is a syntax error.
 *
 * @module
 */
import type { QueryOptions, Row } from "../../sql/mod.ts";
import type { TestSql } from "../../sql/testing.ts";
import { BaseClient } from "./client.ts";
import {
  BaseDriver,
  type DriverParameters,
  type StatementHandle,
} from "./driver.ts";

export const memorySql: TestSql = {
  execute: "CREATE TABLE IF NOT EXISTS users (id INTEGER, name TEXT)",
  query: "SELECT id, name FROM users",
  columns: ["id", "name"],
  count: 3,
  parameterQuery: "SELECT ? AS value",
};

const USERS = [[1, "Alice"], [2, "Bob"], [3, "Charlie"]];
const CONTROL = /^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/;

/** The connection URL of a database that fails to connect */
export const FAILING_URL = "memory://fail";

export class MemoryDriver extends BaseDriver {
  #connected = false;
  /** The statements run, for assertions */
  readonly statements: string[] = [];

  get connected(): boolean {
    return this.#connected;
  }

  #run(sql: string, params: DriverParameters | undefined): Row[] | number {
    this.statements.push(sql);
    if (sql === memorySql.query) {
      return USERS.map((values) => ({ columns: memorySql.columns, values }));
    }
    if (sql === memorySql.parameterQuery) {
      const values = Array.isArray(params) ? params : [];
      return [{ columns: ["value"], values: [values[0]] }];
    }
    if (sql === memorySql.execute || CONTROL.test(sql)) return 0;
    throw new Error(`Syntax error: ${sql}`);
  }

  protected override connectDriver(): Promise<void> {
    if (this.connectionUrl.toString() === FAILING_URL) {
      return Promise.reject(new Error("Connection refused"));
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
  ): Promise<number | undefined> {
    const result = this.#run(sql, params);
    return Promise.resolve(typeof result === "number" ? result : 0);
  }

  protected override async *queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    _options: QueryOptions,
  ): AsyncGenerator<Row> {
    const result = this.#run(sql, params);
    if (typeof result !== "number") yield* result;
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
