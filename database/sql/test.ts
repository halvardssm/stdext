import { DeferredStack } from "../collections/deferred_stack.ts";
import {
  type SqlConnectionEventInit,
  type SqlEvent,
  SqlEventTarget,
  type SqlPoolConnectionEventType,
} from "./events.ts";
import {
  testClientConnection,
  testClientPoolConnection,
  testSqlClient,
  testSqlClientPool,
  testSqlConnection,
  testSqlEventTarget,
  testSqlPoolClient,
  testSqlPreparedStatement,
  testSqlTransaction,
} from "./testing.ts";
import * as Sql from "./mod.ts";

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
    _options?: Sql.SqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    const queryRes = testDbQueryParser(sql, params as string[]);
    return Promise.resolve(queryRes);
  }
  async *queryMany<T extends TestRow = TestRow>(
    sql: string,
    params?: unknown[] | undefined,
    _options?: Sql.SqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const queryRes = testDbQueryParser(sql, params as string[]);
    for (const row of queryRes) {
      yield row;
    }
  }
  async *queryManyArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: unknown[] | undefined,
    _options?: Sql.SqlQueryOptions | undefined,
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

class TestSqlConnectable
  implements Sql.SqlConnectable<TestSqlConnectionOptions, TestSqlConnection> {
  options: TestSqlConnectionOptions;
  connection: TestSqlConnection;
  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(
    connection: TestSqlConnectable["connection"],
    options: TestSqlConnectable["options"] = {},
  ) {
    this.connection = connection;
    this.options = options;
  }
  [Symbol.asyncDispose](): Promise<void> {
    return this.connection.close();
  }
}

class TestSqlPreparedStatement extends TestSqlConnectable
  implements
    Sql.SqlPreparedStatement<
      TestSqlConnectionOptions,
      TestParameterType,
      TestSqlQueryOptions,
      TestSqlConnection
    > {
  declare readonly options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions;
  sql: string;
  constructor(
    connection: TestSqlPreparedStatement["connection"],
    sql: string,
    options: TestSqlPreparedStatement["options"] = {},
  ) {
    super(connection, options);
    this.sql = sql;
  }
  deallocated = false;
  deallocate(): Promise<void> {
    this.deallocated = true;
    return Promise.resolve();
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

class TestSqlQueriable extends TestSqlConnectable implements
  Sql.SqlQueriable<
    TestSqlConnectionOptions,
    TestParameterType,
    TestSqlQueryOptions,
    TestSqlConnection
  > {
  declare readonly options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions;
  constructor(
    connection: TestSqlQueriable["connection"],
    options: TestSqlQueriable["options"] = {},
  ) {
    super(connection, options);
  }
  execute(
    sql: string,
    params?: TestParameterType[] | undefined,
    _options?: TestSqlQueryOptions | undefined,
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
  sql<T extends TestRow = TestRow>(
    strings: TemplateStringsArray,
    ...parameters: string[]
  ): Promise<T[]> {
    return this.query<T>(strings.join("?"), parameters);
  }
  sqlArray<T extends TestArrayRow = TestArrayRow>(
    strings: TemplateStringsArray,
    ...parameters: string[]
  ): Promise<T[]> {
    return this.queryArray<T>(strings.join("?"), parameters);
  }
}

class TestSqlPreparable extends TestSqlQueriable implements
  Sql.SqlPreparable<
    TestSqlConnectionOptions,
    TestParameterType,
    TestSqlQueryOptions,
    TestSqlConnection,
    TestSqlPreparedStatement
  > {
  constructor(
    connection: TestSqlPreparable["connection"],
    options: TestSqlPreparable["options"] = {},
  ) {
    super(connection, options);
  }
  prepare(
    sql: string,
    options?: TestSqlQueryOptions | undefined,
  ): TestSqlPreparedStatement {
    return new TestSqlPreparedStatement(this.connection, sql, options);
  }
}

class TestSqlTransaction extends TestSqlPreparable
  implements
    Sql.SqlTransaction<
      TestSqlConnectionOptions,
      TestParameterType,
      TestSqlQueryOptions,
      TestSqlConnection,
      TestSqlPreparedStatement,
      TestSqlTransactionOptions
    > {
  declare readonly options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions
    & TestSqlTransactionOptions;
  _inTransaction: boolean = false;
  get inTransaction(): boolean {
    return this._inTransaction;
  }

  constructor(
    connection: TestSqlTransaction["connection"],
    options: TestSqlTransaction["options"] = {},
  ) {
    super(connection, options);
  }
  commitTransaction(
    _options?: Record<string, unknown> | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  rollbackTransaction(
    _options?: Record<string, unknown> | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  createSavepoint(_name?: string | undefined): Promise<void> {
    return Promise.resolve();
  }
  releaseSavepoint(_name?: string | undefined): Promise<void> {
    return Promise.resolve();
  }
}

class TestSqlTransactionable extends TestSqlPreparable
  implements
    Sql.SqlPreparable<
      TestSqlConnectionOptions,
      TestParameterType,
      TestSqlQueryOptions,
      TestSqlConnection,
      TestSqlPreparedStatement
    > {
  declare readonly options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions
    & TestSqlTransactionOptions;
  constructor(
    connection: TestSqlTransactionable["connection"],
    options: TestSqlTransactionable["options"] = {},
  ) {
    super(connection, options);
  }
  beginTransaction(
    _options?: Record<string, unknown> | undefined,
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

const TestSqlClient = class extends TestSqlTransactionable
  implements
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
  declare readonly options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions;
  eventTarget: TestSqlEventTarget;
  constructor(
    connectionUrl: string | URL,
    options: TestSqlConnectionOptions & TestSqlQueryOptions = {},
  ) {
    super(new TestSqlConnection(connectionUrl.toString(), options), options);
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
} satisfies Sql.SqlClientConstructor<
  TestSqlEventTarget,
  TestSqlConnectionOptions,
  TestParameterType,
  TestSqlQueryOptions,
  TestSqlConnection,
  TestSqlPreparedStatement,
  TestSqlTransactionOptions,
  TestSqlTransaction
>;

type TestSqlClient = InstanceType<typeof TestSqlClient>;

interface TestSqlPoolClientOptions extends Sql.SqlPoolClientOptions {
}

class TestSqlPoolClient extends TestSqlTransactionable
  implements
    Sql.SqlPoolClient<
      TestSqlConnectionOptions,
      TestSqlConnection,
      TestParameterType,
      TestSqlQueryOptions,
      TestSqlPreparedStatement,
      TestSqlTransactionOptions,
      TestSqlTransaction,
      TestSqlPoolClientOptions
    > {
  declare readonly options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions
    & TestSqlTransactionOptions
    & TestSqlPoolClientOptions;
  #releaseFn?: () => Promise<void>;

  #disposed: boolean = false;
  get disposed(): boolean {
    return this.#disposed;
  }

  constructor(
    connection: TestSqlPoolClient["connection"],
    options: TestSqlPoolClient["options"] = {},
  ) {
    super(connection, options);
    if (this.options?.releaseFn) {
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

const TestSqlClientPool = class implements
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
  declare readonly options:
    & TestSqlConnectionOptions
    & TestSqlQueryOptions
    & TestSqlTransactionOptions
    & TestSqlClientPoolOptions;
  deferredStack: DeferredStack<TestSqlConnection>;
  eventTarget: TestSqlEventTarget;
  connectionUrl: string;
  _connected: boolean = false;
  get connected(): boolean {
    return this._connected;
  }
  constructor(
    connectionUrl: string | URL,
    options: TestSqlClientPoolOptions = {},
  ) {
    this.connectionUrl = connectionUrl.toString();
    this.options = options;
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
} satisfies Sql.SqlClientPoolConstructor<
  TestSqlClientPoolOptions,
  TestParameterType,
  TestSqlQueryOptions,
  TestSqlConnection,
  TestSqlPreparedStatement,
  TestSqlTransactionOptions,
  TestSqlTransaction,
  TestSqlPoolClient,
  TestSqlEventTarget
>;

type TestSqlClientPool = InstanceType<typeof TestSqlClientPool>;

const connectionUrl = "test";
const options: TestSqlTransaction["options"] = { test: "test" };
const sql = "test";

const connection = new TestSqlConnection(connectionUrl, options);
const preparedStatement = new TestSqlPreparedStatement(
  connection,
  sql,
  options,
);
const transaction = new TestSqlTransaction(connection, options);
const eventTarget = new TestSqlEventTarget();
const client = new TestSqlClient(connectionUrl, options);
const poolClient = new TestSqlPoolClient(connection, options);
const clientPool = new TestSqlClientPool(connectionUrl, options);

const expects = {
  connectionUrl,
  options,
  clientPoolOptions: options,
  sql,
};

Deno.test(`sql/type test`, async (t) => {
  await t.step("SqlConnection", () => {
    testSqlConnection(connection, expects);
  });

  await t.step(`sql/PreparedStatement`, () => {
    testSqlPreparedStatement(preparedStatement, expects);
  });

  await t.step(`sql/SqlTransaction`, () => {
    testSqlTransaction(transaction, expects);
  });

  await t.step(`sql/SqlEventTarget`, () => {
    testSqlEventTarget(eventTarget);
  });

  await t.step(`sql/SqlClient`, () => {
    testSqlClient(client, expects);
  });

  await t.step(`sql/SqlPoolClient`, () => {
    testSqlPoolClient(poolClient, expects);
  });

  await t.step(`sql/SqlClientPool`, () => {
    testSqlClientPool(clientPool, expects);
  });
});

Deno.test(`sql/connection test`, async (t) => {
  await t.step("SqlClient", async (t) => {
    await testClientConnection<TestSqlClient>(
      t,
      TestSqlClient,
      [connectionUrl, options],
    );
  });
  await t.step("SqlPoolClient", async (t) => {
    await testClientPoolConnection<TestSqlClientPool>(
      t,
      TestSqlClientPool,
      [connectionUrl, options],
    );
  });
});
