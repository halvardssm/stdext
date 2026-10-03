/**
 * An in-memory driver implementing the driver level, used to test the
 * standard client and the conformance suites without a database.
 *
 * It only understands the statements of {@linkcode memorySql}; everything
 * else is a syntax error. Every operation is logged, for assertions.
 *
 * @module
 */
import type {
  Dialect,
  Driver,
  DriverConnection,
  DriverQueryOptions,
  DriverRows,
  DriverSavepoint,
  DriverStatement,
  DriverTransaction,
  ExecuteResult,
  QueryParameters,
} from "../../sql/core.ts";
import {
  ConnectionError,
  QueryError,
  TransactionError,
} from "../../sql/errors.ts";
import { sql } from "../../sql/template.ts";
import type { TestSql } from "../../sql/testing.ts";

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

/** The connection URL of a database that fails to connect */
export const FAILING_URL = "memory://fail";
/** The connection URL of a database that connects until aborted */
export const HANGING_URL = "memory://hang";

/** Options of the memory driver */
export interface MemoryDriverOptions {
  /** The maximum number of connections */
  maxConnections?: number;
  /** Whether connections support prepared statements. Defaults to `true`. */
  prepare?: boolean;
}

function run(
  statement: string,
  params: QueryParameters | undefined,
): { columns: string[]; rows: unknown[][] } {
  if (statement === memorySql.query) {
    return { columns: memorySql.columns, rows: USERS };
  }
  if (statement === memorySql.emptyQuery) {
    return { columns: memorySql.columns, rows: [] };
  }
  if (statement === memorySql.parameterQuery) {
    const values = Array.isArray(params) ? params : [];
    return { columns: ["value"], rows: [[values[0]]] };
  }
  if (statement === memorySql.execute) return { columns: [], rows: [] };
  throw new QueryError(`Syntax error: ${statement}`);
}

function rows(result: { columns: string[]; rows: unknown[][] }): DriverRows {
  let iterated = false;
  let disposed = false;
  return {
    columns: result.columns,
    async *[Symbol.asyncIterator]() {
      if (iterated || disposed) return;
      iterated = true;
      for (const row of result.rows) {
        if (disposed) return;
        yield row;
      }
    },
    [Symbol.asyncDispose]() {
      disposed = true;
      return Promise.resolve();
    },
  };
}

export class MemoryDriver implements Driver {
  readonly dialect: Dialect = {
    name: "memory",
    placeholder: () => "?",
    quoteIdentifier: (name) => `"${name.replaceAll('"', '""')}"`,
  };
  readonly maxConnections?: number;
  readonly #prepare: boolean;
  /** The connections opened, for assertions */
  readonly connections: MemoryConnection[] = [];

  constructor(options?: MemoryDriverOptions) {
    this.maxConnections = options?.maxConnections;
    this.#prepare = options?.prepare ?? true;
  }

  connect(
    url: string | URL,
    options?: { signal?: AbortSignal },
  ): Promise<MemoryConnection> {
    const signal = options?.signal;
    if (url.toString() === FAILING_URL) {
      return Promise.reject(new ConnectionError("Connection refused"));
    }
    if (url.toString() === HANGING_URL) {
      return new Promise((_, reject) =>
        signal?.addEventListener("abort", () => reject(signal.reason))
      );
    }
    const connection = new MemoryConnection(this.#prepare);
    this.connections.push(connection);
    return Promise.resolve(connection);
  }
}

export class MemoryConnection implements DriverConnection {
  #closed = false;
  /** The operations run, for assertions */
  readonly log: string[] = [];
  declare prepare?: (sql: string) => Promise<DriverStatement>;

  constructor(prepare: boolean) {
    if (prepare) {
      this.prepare = (statement) => {
        this.#assertOpen();
        // Validates the statement
        run(statement, []);
        this.log.push(`prepare ${statement}`);
        let deallocated = false;
        const assertUsable = () => {
          if (deallocated) throw new QueryError("Statement is deallocated");
        };
        return Promise.resolve({
          sql: statement,
          execute: async (params, options) => {
            assertUsable();
            return await this.execute(statement, params, options);
          },
          query: async (params, options) => {
            assertUsable();
            return await this.query(statement, params, options);
          },
          deallocate: () => {
            if (!deallocated) this.log.push(`deallocate ${statement}`);
            deallocated = true;
            return Promise.resolve();
          },
          [Symbol.asyncDispose]() {
            return this.deallocate();
          },
        });
      };
    }
  }

  get closed(): boolean {
    return this.#closed;
  }

  /** Simulate a connection lost without closing it */
  loseConnection(): void {
    this.#closed = true;
  }

  #assertOpen(options?: DriverQueryOptions): void {
    options?.signal?.throwIfAborted();
    if (this.#closed) throw new ConnectionError("Connection is closed");
  }

  close(): Promise<void> {
    this.#closed = true;
    return Promise.resolve();
  }

  execute(
    statement: string,
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<ExecuteResult> {
    try {
      this.#assertOpen(options);
      run(statement, params);
      this.log.push(`execute ${statement}`);
      return Promise.resolve({ affectedRows: 0 });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  query(
    statement: string,
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<DriverRows> {
    try {
      this.#assertOpen(options);
      const result = run(statement, params);
      this.log.push(`query ${statement}`);
      return Promise.resolve(rows(result));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  executeScript(
    script: string,
    options?: DriverQueryOptions,
  ): Promise<void> {
    try {
      this.#assertOpen(options);
      const statements = script.split(";").map((s) => s.trim()).filter(
        Boolean,
      );
      for (const statement of statements) run(statement, undefined);
      this.log.push(`script ${statements.length}`);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  begin(): Promise<DriverTransaction> {
    try {
      this.#assertOpen();
    } catch (error) {
      return Promise.reject(error);
    }
    this.log.push("begin");
    let active = true;
    const assertActive = () => {
      if (!active) throw new TransactionError("Transaction is not active");
      this.#assertOpen();
    };
    // deno-lint-ignore require-await
    const end = async (action: string) => {
      assertActive();
      active = false;
      this.log.push(action);
    };
    const transaction: DriverTransaction = {
      commit: () => end("commit"),
      rollback: () => end("rollback"),
      // deno-lint-ignore require-await
      savepoint: async (name) => {
        assertActive();
        this.log.push(`savepoint ${name}`);
        let savepointActive = true;
        // deno-lint-ignore require-await
        const endSavepoint = async (action: string) => {
          if (!savepointActive) {
            throw new TransactionError("Savepoint is not active");
          }
          assertActive();
          savepointActive = false;
          this.log.push(`${action} ${name}`);
        };
        const savepoint: DriverSavepoint = {
          release: () => endSavepoint("release"),
          rollback: () => endSavepoint("rollback to"),
          [Symbol.asyncDispose]: () =>
            savepointActive && active
              ? endSavepoint("rollback to")
              : Promise.resolve(),
        };
        return savepoint;
      },
      [Symbol.asyncDispose]: () => active ? end("rollback") : Promise.resolve(),
    };
    return Promise.resolve(transaction);
  }

  ping(): Promise<void> {
    try {
      this.#assertOpen();
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}
