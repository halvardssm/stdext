import { DeferredStack } from "@stdext/collections";
import { deepMerge } from "@std/collections";
import {
  testClientConnection,
  testClientPoolConnection,
  testDriverConnection,
  testSqlClient,
  testSqlClientPool,
  testSqlEventTarget,
  testSqlPoolClient,
  testSqlPreparedStatement,
  testSqlTransaction,
} from "./testing.ts";
import * as Sql from "./mod.ts";

const testDbQueryParser = (sql: string) => {
  return JSON.parse(sql);
};

type TestQueryValues = Sql.DriverQueryValues<string[]>;
interface TestQueryMeta extends Sql.DriverQueryMeta {
  test?: string;
}

type TestRow = Sql.Row<string>;
type TestArrayRow = Sql.ArrayRow<string>;
type TestParameterType = string;
type TestSqlTransactionOptions = Sql.SqlTransactionOptions;

interface TestSqlQueryOptions extends Sql.DriverQueryOptions {
  test?: string;
}
interface TestSqlConnectionOptions extends Sql.DriverConnectionOptions {
  test?: string;
}
interface TestSqlClientPoolOptions
  extends Sql.SqlClientPoolOptions, TestSqlConnectionOptions {
}
class TestDriver implements
  Sql.Driver<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta
  > {
  readonly connectionUrl: string;
  readonly options: Sql.DriverInternalOptions<
    TestSqlConnectionOptions,
    TestSqlQueryOptions
  >;
  _connected: boolean = false;
  constructor(
    connectionUrl: string,
    options: TestDriver["options"],
  ) {
    this.connectionUrl = connectionUrl;
    this.options = options;
  }
  get connected(): boolean {
    return this._connected;
  }
  ping(): Promise<void> {
    if (!this.connected) throw new Sql.SqlError("not connected");
    return Promise.resolve();
  }
  connect(): Promise<void> {
    this._connected = true;
    return Promise.resolve();
  }
  close(): Promise<void> {
    this._connected = false;
    return Promise.resolve();
  }

  async *query<
    Values extends TestQueryValues = TestQueryValues,
    Meta extends Sql.DriverQueryMeta = Sql.DriverQueryMeta,
  >(
    sql: string,
    _params?: unknown[] | undefined,
    _options?: Sql.DriverQueryOptions | undefined,
  ): AsyncGenerator<Sql.DriverQueryNext<Values, Meta>> {
    const queryRes = testDbQueryParser(sql);
    for (const row of queryRes) {
      const res: Sql.DriverQueryNext<Values, Meta> = {
        columns: Object.keys(row),
        values: Object.values(row) as Values,
        meta: {} as Meta,
      };

      yield res;
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

class TestSqlConnectable implements
  Sql.DriverConnectable<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver
  > {
  readonly options: Sql.DriverInternalOptions<
    TestSqlConnectionOptions,
    TestSqlQueryOptions
  >;
  readonly connection: TestDriver;
  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(
    connection: TestSqlConnectable["connection"],
    options: TestSqlConnectable["options"],
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
      TestSqlQueryOptions,
      TestParameterType,
      TestQueryValues,
      TestQueryMeta,
      TestDriver
    > {
  sql: string;
  constructor(
    connection: TestSqlPreparedStatement["connection"],
    sql: string,
    options: TestSqlPreparedStatement["options"],
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
    _params?: TestParameterType[] | undefined,
    _options?: TestSqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return Promise.resolve(testDbQueryParser(this.sql));
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
    return Sql.mapObjectIterable(
      this.connection.query(this.sql, params, options),
    );
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
    return Sql.mapArrayIterable(
      this.connection.query(this.sql, params, options),
    );
  }
}

class TestSqlQueriable extends TestSqlConnectable implements
  Sql.SqlQueriable<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver
  > {
  constructor(
    connection: TestSqlQueriable["connection"],
    options: TestSqlQueriable["options"],
  ) {
    super(connection, options);
  }
  execute(
    sql: string,
    _params?: TestParameterType[] | undefined,
    _options?: TestSqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return Promise.resolve(testDbQueryParser(sql));
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
    return Sql.mapObjectIterable(
      this.connection.query(sql, params, options),
    );
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
    return Sql.mapArrayIterable(
      this.connection.query(sql, params, options),
    );
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
    TestSqlQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestSqlPreparedStatement
  > {
  constructor(
    connection: TestSqlPreparable["connection"],
    options: TestSqlPreparable["options"],
  ) {
    super(connection, options);
  }
  prepare(
    sql: string,
    options?: TestSqlQueryOptions | undefined,
  ): Promise<TestSqlPreparedStatement> {
    return Promise.resolve(
      new TestSqlPreparedStatement(
        this.connection,
        sql,
        deepMerge<TestSqlPreparable["options"]>(this.options, {
          queryOptions: options,
        }),
      ),
    );
  }
}

class TestSqlTransaction extends TestSqlPreparable
  implements
    Sql.SqlTransaction<
      TestSqlConnectionOptions,
      TestSqlQueryOptions,
      TestParameterType,
      TestQueryValues,
      TestQueryMeta,
      TestDriver,
      TestSqlPreparedStatement,
      TestSqlTransactionOptions
    > {
  declare readonly options: Sql.TransactionInternalOptions<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestSqlTransactionOptions
  >;
  _inTransaction: boolean = false;
  get inTransaction(): boolean {
    return this._inTransaction;
  }

  constructor(
    connection: TestSqlTransaction["connection"],
    options: TestSqlTransaction["options"],
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
      TestSqlQueryOptions,
      TestParameterType,
      TestQueryValues,
      TestQueryMeta,
      TestDriver,
      TestSqlPreparedStatement
    > {
  declare readonly options: Sql.TransactionInternalOptions<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestSqlTransactionOptions
  >;

  constructor(
    connection: TestSqlTransactionable["connection"],
    options: TestSqlTransactionable["options"],
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

type TestSqlConnectionEventInit = Sql.SqlConnectionEventInit<TestDriver>;

class TestSqlEventTarget extends Sql.SqlEventTarget<
  TestSqlConnectionOptions,
  TestSqlQueryOptions,
  TestParameterType,
  TestQueryValues,
  TestQueryMeta,
  TestDriver,
  Sql.SqlPoolConnectionEventType,
  TestSqlConnectionEventInit,
  Sql.SqlEvent,
  EventListenerOrEventListenerObject,
  AddEventListenerOptions,
  EventListenerOptions
> {
}

class TestSqlClient extends TestSqlTransactionable implements
  Sql.SqlClient<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestSqlPreparedStatement,
    TestSqlTransactionOptions,
    TestSqlTransaction,
    TestSqlEventTarget
  > {
  eventTarget: TestSqlEventTarget;
  constructor(
    connectionUrl: string | URL,
    options: TestSqlTransactionable["options"],
  ) {
    const driver = new TestDriver(connectionUrl.toString(), options);
    super(driver, options);
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
}

interface TestSqlPoolClientOptions extends Sql.SqlPoolClientOptions {
}

class TestSqlPoolClient extends TestSqlTransactionable
  implements
    Sql.SqlPoolClient<
      TestSqlConnectionOptions,
      TestSqlQueryOptions,
      TestParameterType,
      TestQueryValues,
      TestQueryMeta,
      TestDriver,
      TestSqlPreparedStatement,
      TestSqlTransactionOptions,
      TestSqlTransaction,
      TestSqlPoolClientOptions
    > {
  declare readonly options: Sql.PoolClientInternalOptions<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestSqlTransactionOptions,
    TestSqlPoolClientOptions
  >;

  #releaseFn?: () => Promise<void>;

  #disposed: boolean = false;
  get disposed(): boolean {
    return this.#disposed;
  }

  constructor(
    connection: TestSqlPoolClient["connection"],
    options: TestSqlPoolClient["options"],
  ) {
    super(connection, options);
    if (this.options?.poolClientOptions.releaseFn) {
      this.#releaseFn = this.options?.poolClientOptions.releaseFn;
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
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestSqlPreparedStatement,
    TestSqlTransactionOptions,
    TestSqlTransaction,
    TestSqlPoolClientOptions,
    TestSqlPoolClient
  > {
  declare readonly options: Sql.ClientPoolInternalOptions<
    TestSqlConnectionOptions,
    TestSqlQueryOptions,
    TestSqlTransactionOptions,
    TestSqlPoolClientOptions,
    TestSqlClientPoolOptions
  >;

  deferredStack: DeferredStack<TestDriver>;
  eventTarget: TestSqlEventTarget;
  connectionUrl: string;
  _connected: boolean = false;
  get connected(): boolean {
    return this._connected;
  }
  constructor(
    connectionUrl: string | URL,
    options: TestSqlClientPool["options"],
  ) {
    this.connectionUrl = connectionUrl.toString();
    this.options = options;
    this.deferredStack = new DeferredStack<TestDriver>({
      maxSize: 3,
      removeFn: async (element) => {
        await element._value.close();
      },
    });
    this.eventTarget = new TestSqlEventTarget();
  }
  async connect(): Promise<void> {
    for (let i = 0; i < this.deferredStack.maxSize; i++) {
      const conn = new TestDriver(
        this.connectionUrl,
        this.options,
      );
      if (!this.options.clientPoolOptions.lazyInitialization) {
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
    const c = new TestSqlPoolClient(
      el.value,
      deepMerge<TestSqlClientPool["options"]>(
        this.options,
        {
          poolClientOptions: {
            releaseFn: async () => {
              this.eventTarget.dispatchEvent(
                new Sql.SqlReleaseEvent({ connection: el._value }),
              );
              await el.release();
            },
          },
        },
      ),
    );
    return c;
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

const connectionUrl = "test";
const options: TestSqlClientPool["options"] = {
  clientPoolOptions: {},
  connectionOptions: {},
  poolClientOptions: {},
  queryOptions: {},
  transactionOptions: {},
};
const sql = "test";

const connection = new TestDriver(connectionUrl, options);
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
    testDriverConnection(connection, expects);
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
