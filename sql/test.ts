// deno-lint-ignore-file no-unused-vars no-explicit-any
import { DeferredStack } from "../collections/deferred_stack.ts";
import {
  SqlConnectionEventInit,
  SqlEvent,
  SqlEventable,
  SqlEventTarget,
  SqlPoolConnectionEventType,
} from "./events.ts";
import * as Sql from "./mod.ts";
import {
  clientPoolTest,
  clientTest,
  connectionConstructorTest,
  TestQueries,
} from "./testing.ts";

/**
 * Represents a database table for a test database
 */
type TestDbTable = Array<Record<string, unknown>>;
/**
 * Represents a database for testing
 */
type TestDb = Record<string, TestDbTable>;

const testDb: TestDb = {};

const testDbQueryParser = (sql: string, parameters: string[] = []) => {
  const replaceWildcards = (query: string, values: string[]) => {
    for (const v of values) {
      query = query.replace("?", v);
    }

    return query;
  };

  const querySegments = sql.toLowerCase().split(" ");
  if (querySegments[0] === "create") {
    if (querySegments[1] === "table") {
      const tableName = querySegments[2];
      testDb[tableName] = [];
      return;
    }
  } else if (querySegments[0] === "drop") {
    if (querySegments[1] === "table") {
      const tableName = querySegments[2];
      delete testDb[tableName];
      return;
    }
  } else if (querySegments[0] === "insert") {
    if (querySegments[1] === "into") {
      const tableName = querySegments[2];
      const values = querySegments[4];
      const parsedValues = replaceWildcards(values, parameters);
      const jsonValues = JSON.parse(parsedValues);
      for (const v of jsonValues) {
        testDb[tableName].push(v);
      }
      return jsonValues.length;
    }
  } else if (querySegments[0] === "select") {
    if (querySegments[1] === "*") {
      if (querySegments[2] === "from") {
        const tableName = querySegments[3];
        if (querySegments[4]) {
          if (querySegments[4] === "where") {
            const columnName = querySegments[5];
            const value = parameters[0];
            return testDb[tableName].filter((row) => row[columnName] === value);
          }
        } else {
          return testDb[tableName];
        }
      }
    }
  } else if (querySegments[0] === "return") {
    if (querySegments[1].startsWith("'")) {
      return [{ result: querySegments[1].replace(/'/g, "") }];
    } else {
      return [{ result: JSON.parse(querySegments[1]) }];
    }
  } else if (querySegments[0] === "delete") {
    if (querySegments[1] === "from") {
      const tableName = querySegments[2];
      if (querySegments[3] === "where") {
        const columnName = querySegments[4];
        const value = parameters[0];
        testDb[tableName] = testDb[tableName].filter((row) =>
          row[columnName] !== value
        );
      } else {
        testDb[tableName] = [];
      }
      return;
    }
  }
};

type TestRow = Sql.Row<string>;
type TestArrayRow = Sql.ArrayRow<string>;
type TestParameterType = string;
type TestSqlTransactionOptions = Sql.SqlTransactionOptions;
interface TestSqlQueryOptions extends Sql.SqlQueryOptions {
  test?: string;
}
interface TestSqlConnectionOptions extends Sql.SqlConnectionOptions {
  test?: string;
}
interface TestSqlClientPoolOptions
  extends Sql.SqlClientPoolOptions, TestSqlConnectionOptions {
}
class TestSqlConnection implements Sql.SqlConnection<TestSqlConnectionOptions> {
  connectionUrl: string;
  options: TestSqlConnectionOptions;
  _connected: boolean = false;
  constructor(
    connectionUrl: string,
    options: TestSqlConnectionOptions = {},
  ) {
    this.connectionUrl = connectionUrl;
    this.options = options;
  }
  get connected(): boolean {
    return this._connected;
  }
  connect(): Promise<void> {
    this._connected = true;
    return Promise.resolve();
  }
  close(): Promise<void> {
    this._connected = false;
    return Promise.resolve();
  }
  execute(
    sql: string,
    params?: unknown[] | undefined,
    options?: Sql.SqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    const queryRes = testDbQueryParser(sql, params as string[]);
    return Promise.resolve(queryRes);
  }
  async *queryMany<T extends Sql.Row<any> = Sql.Row<any>>(
    sql: string,
    params?: unknown[] | undefined,
    options?: Sql.SqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const queryRes = testDbQueryParser(sql, params as string[]);
    for (const row of queryRes) {
      yield row;
    }
  }
  async *queryManyArray<T extends Sql.ArrayRow<any> = Sql.ArrayRow<any>>(
    sql: string,
    params?: unknown[] | undefined,
    options?: Sql.SqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const queryRes = testDbQueryParser(sql, params as string[]);
    for (const row of queryRes) {
      const values = Object.values(row);
      yield values as T;
    }
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

class TestSqlConnectableBase
  implements Sql.SqlConnectableBase<TestSqlConnection> {
  connection: TestSqlConnection;
  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(connection: TestSqlConnection) {
    this.connection = connection;
  }
}

class TestSqlPreparedStatement extends TestSqlConnectableBase
  implements
    Sql.SqlPreparedStatement<
      TestSqlConnectionOptions,
      TestSqlConnection,
      TestParameterType,
      TestSqlQueryOptions
    > {
  sql: string;
  options: TestSqlConnectionOptions & TestSqlQueryOptions;
  constructor(
    connection: TestSqlConnection,
    sql: string,
    options: TestSqlConnectionOptions & TestSqlQueryOptions = {},
  ) {
    super(connection);
    this.sql = sql;
    this.options = options;
  }
  execute(
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return this.connection.execute(this.sql, params, options);
  }
  query<T extends TestRow = TestRow>(
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryMany(params, options));
  }
  queryOne<T extends TestRow = TestRow>(
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.query(params, options).then((res) => res[0]) as Promise<
      T | undefined
    >;
  }
  queryMany<T extends TestRow = TestRow>(
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryMany(this.sql, params, options);
  }
  queryArray<T extends TestArrayRow = TestArrayRow>(
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryManyArray(params, options));
  }
  queryOneArray<T extends TestArrayRow = TestArrayRow>(
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.queryArray(params, options).then((res) => res[0]) as Promise<
      T | undefined
    >;
  }
  queryManyArray<T extends TestArrayRow = TestArrayRow>(
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryManyArray(this.sql, params, options);
  }
}

class TestSqlQueriable extends TestSqlConnectableBase
  implements
    Sql.SqlQueriable<
      TestSqlConnectionOptions,
      TestSqlConnection,
      TestParameterType,
      TestSqlQueryOptions
    > {
  options: TestSqlConnectionOptions & TestSqlQueryOptions;
  constructor(
    connection: TestSqlConnection,
    options: TestSqlConnectionOptions & TestSqlQueryOptions = {},
  ) {
    super(connection);
    this.options = options;
  }
  execute(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return Promise.resolve(testDbQueryParser(sql, params));
  }
  query<T extends TestRow = TestRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryMany(sql, params, options));
  }
  queryOne<T extends TestRow = TestRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.query(sql, params, options).then((res) => res[0]) as Promise<
      T | undefined
    >;
  }
  queryMany<T extends TestRow = TestRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryMany(sql, params, options);
  }
  queryArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryManyArray(sql, params, options));
  }
  queryOneArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.queryArray(sql, params, options).then((res) =>
      res[0]
    ) as Promise<T | undefined>;
  }
  queryManyArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestSqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryManyArray(sql, params, options);
  }
  sql<T extends Sql.Row<any> = Sql.Row<any>>(
    strings: TemplateStringsArray,
    ...parameters: string[]
  ): Promise<T[]> {
    return this.query(strings.join("?"), parameters);
  }
  sqlArray<T extends Sql.ArrayRow<any> = Sql.ArrayRow<any>>(
    strings: TemplateStringsArray,
    ...parameters: string[]
  ): Promise<T[]> {
    return this.queryArray(strings.join("?"), parameters);
  }
}

class TestSqlTransaction extends TestSqlQueriable implements
  Sql.SqlTransaction<
    TestSqlConnectionOptions,
    TestSqlConnection,
    TestParameterType,
    TestSqlQueryOptions,
    TestSqlTransactionOptions
  > {
  _inTransaction: boolean = false;
  get inTransaction(): boolean {
    return this._inTransaction;
  }
  options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions
    & TestSqlTransactionOptions;
  constructor(
    connection: TestSqlConnection,
    options:
      & TestSqlConnectionOptions
      & TestSqlQueryOptions
      & TestSqlTransactionOptions = {},
  ) {
    super(connection, options);
    this.options = options;
  }
  commitTransaction(
    options?: Record<string, unknown> | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  rollbackTransaction(
    options?: Record<string, unknown> | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  createSavepoint(name?: string | undefined): Promise<void> {
    return Promise.resolve();
  }
  releaseSavepoint(name?: string | undefined): Promise<void> {
    return Promise.resolve();
  }
}

class TestSqlClientQueriable extends TestSqlQueriable
  implements
    Sql.SqlClientQueriable<
      TestSqlConnectionOptions,
      TestSqlConnection,
      TestParameterType,
      TestSqlQueryOptions,
      TestSqlPreparedStatement,
      TestSqlTransactionOptions
    > {
  options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions
    & TestSqlTransactionOptions;
  constructor(
    connection: TestSqlConnection,
    options:
      & TestSqlConnectionOptions
      & TestSqlQueryOptions
      & TestSqlTransactionOptions = {},
  ) {
    super(connection, options);
    this.options = options;
  }
  prepare(
    sql: string,
    options?: TestSqlQueryOptions | undefined,
  ): TestSqlPreparedStatement {
    return new TestSqlPreparedStatement(this.connection, sql, options);
  }
  beginTransaction(
    options?: Record<string, unknown> | undefined,
  ): Promise<TestSqlTransaction> {
    return Promise.resolve(
      new TestSqlTransaction(this.connection, this.options),
    );
  }
  transaction<T>(
    fn: (
      t: TestSqlTransaction,
    ) => Promise<T>,
  ): Promise<T> {
    return fn(new TestSqlTransaction(this.connection, this.options));
  }
}

type TestSqlConnectionEventInit = SqlConnectionEventInit<TestSqlConnection>;

class TestSqlEventTarget extends SqlEventTarget<
  TestSqlConnectionOptions,
  TestSqlConnection,
  SqlPoolConnectionEventType,
  TestSqlConnectionEventInit,
  SqlEvent,
  EventListenerOrEventListenerObject,
  AddEventListenerOptions,
  EventListenerOptions
> {
}

class TestSqlEventable implements
  SqlEventable<
    TestSqlEventTarget
  > {
  eventTarget: TestSqlEventTarget;
  constructor(eventTarget: TestSqlEventTarget) {
    this.eventTarget = eventTarget;
  }
}

class TestSqlClient extends TestSqlClientQueriable implements
  Sql.SqlClient<
    TestSqlEventTarget,
    TestSqlConnectionOptions,
    TestParameterType,
    TestSqlQueryOptions,
    TestSqlConnection,
    TestSqlPreparedStatement,
    TestSqlTransactionOptions,
    TestSqlTransaction
  > {
  connectionUrl: string;
  options: TestSqlConnectionOptions;
  eventTarget: TestSqlEventTarget;
  constructor(
    connectionUrl: string,
    connectionOptions?: TestSqlConnectionOptions,
  ) {
    super(new TestSqlConnection(connectionUrl, connectionOptions), {
      test: "test",
    });
    this.connectionUrl = connectionUrl;
    this.options = connectionOptions ?? { test: "test" };
    this.eventTarget = new TestSqlEventTarget();
  }
  async connect(): Promise<void> {
    await this.connection.connect();
    this.eventTarget.dispatchEvent(
      new Sql.SqlConnectEvent({ connection: this.connection }),
    );
  }
  async close(): Promise<void> {
    this.eventTarget.dispatchEvent(
      new Sql.SqlCloseEvent({ connection: this.connection }),
    );
    await this.connection.close();
  }
  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

type TestSqlPoolClientOptions =
  & TestSqlConnectionOptions
  & TestSqlQueryOptions
  & TestSqlTransactionOptions
  & Sql.SqlPoolClientOptions;

class TestSqlPoolClient extends TestSqlClientQueriable
  implements
    Sql.SqlPoolClient<
      TestSqlConnectionOptions,
      TestSqlConnection,
      TestParameterType,
      TestSqlQueryOptions,
      TestSqlPreparedStatement,
      TestSqlTransactionOptions,
      TestSqlTransaction
    > {
  readonly options: TestSqlPoolClientOptions;

  #releaseFn?: () => Promise<void>;

  #disposed: boolean = false;
  get disposed(): boolean {
    return this.#disposed;
  }

  constructor(
    connection: TestSqlConnection,
    options: TestSqlPoolClientOptions,
  ) {
    super(connection, options);
    this.options = options;
    if (this.options.releaseFn) {
      this.#releaseFn = this.options.releaseFn;
    }
  }
  async release() {
    this.#disposed = true;
    await this.#releaseFn?.();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.release();
  }
}

class TestSqlClientPool implements
  Sql.SqlClientPool<
    TestSqlClientPoolOptions,
    TestParameterType,
    TestSqlQueryOptions,
    TestSqlConnection,
    TestSqlPreparedStatement,
    TestSqlTransactionOptions,
    TestSqlTransaction,
    TestSqlPoolClient,
    TestSqlEventTarget
  > {
  deferredStack: DeferredStack<TestSqlConnection>;
  eventTarget: TestSqlEventTarget;
  connectionUrl: string;
  options: TestSqlClientPoolOptions;
  _connected: boolean = false;
  get connected(): boolean {
    return this._connected;
  }
  constructor(
    connectionUrl: string,
    options?: TestSqlClientPoolOptions,
  ) {
    this.connectionUrl = connectionUrl;
    this.options = options ?? { test: "test" };
    this.deferredStack = new DeferredStack<TestSqlConnection>({
      maxSize: 3,
      removeFn: async (element) => {
        await element._value.close();
      },
    });
    this.eventTarget = new TestSqlEventTarget();
  }
  async connect(): Promise<void> {
    for (let i = 0; i < this.deferredStack.maxSize; i++) {
      const conn = new TestSqlConnection(
        this.connectionUrl,
        this.options,
      );
      if (!this.options.lazyInitialization) {
        await conn.connect();
        this.eventTarget.dispatchEvent(
          new Sql.SqlConnectEvent({ connection: conn }),
        );
      }
      this.deferredStack.add(conn);
    }
  }
  async close(): Promise<void> {
    for (const el of this.deferredStack.elements) {
      this.eventTarget.dispatchEvent(
        new Sql.SqlCloseEvent({ connection: el._value }),
      );
      await el.remove();
    }
  }
  async acquire(): Promise<TestSqlPoolClient> {
    const el = await this.deferredStack.pop();
    this.eventTarget.dispatchEvent(
      new Sql.SqlAcquireEvent({ connection: el.value }),
    );
    const c = new TestSqlPoolClient(el.value, {
      ...this.options,
      releaseFn: async () => {
        this.eventTarget.dispatchEvent(
          new Sql.SqlReleaseEvent({ connection: el._value }),
        );
        await el.release();
      },
    });
    return c;
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

const queries: TestQueries = {
  createTable: "CREATE TABLE sqlxtesttable",
  dropTable: "DROP TABLE sqlxtesttable",
  insertOneToTable: 'INSERT INTO sqlxtesttable VALUES [{"testcol":"?"}]',
  insertManyToTable:
    'INSERT INTO sqlxtesttable VALUES [{"testcol":"?"},{"testcol":"?"},{"testcol":"?"}]',
  selectOneFromTable: "SELECT * FROM sqlxtesttable WHERE testcol = ? LIMIT 1",
  selectByMatchFromTable: "SELECT * FROM sqlxtesttable WHERE testcol = ?",
  selectManyFromTable: "SELECT * FROM sqlxtesttable",
  select1AsString: "RETURN '1'",
  select1Plus1AsNumber: "RETURN 2",
  deleteByMatchFromTable: "DELETE FROM sqlxtesttable WHERE testcol = ?",
  deleteAllFromTable: "DELETE FROM sqlxtesttable",
};

Deno.test("sql connection test", async (t) => {
  await connectionConstructorTest({
    t,
    Connection: TestSqlConnection,
    connectionOptions: { test: "test" },
    connectionUrl: "test",
  });
});

Deno.test("sql client test", async (t) => {
  await clientTest({
    t,
    Client: TestSqlClient,
    connectionUrl: "test",
    connectionOptions: { test: "test" },
    queries,
  });
});

Deno.test("sql client pool test", async (t) => {
  await clientPoolTest({
    t,
    Client: TestSqlClientPool,
    connectionUrl: "test",
    connectionOptions: { test: "test", test2: "test2" },
    queries,
  });
});
