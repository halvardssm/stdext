import { DeferredStack } from "@stdext/collections";
import { deepMerge } from "@std/collections";
import {
  testClient,
  testClientConnection,
  testClientConstructorIntegration,
  testClientPool,
  testClientPoolConnection,
  testClientSanity,
  testDriver,
  testEventTarget,
  testPoolClient,
  testPreparedStatement,
  testTransaction,
} from "./testing.ts";
import * as Sql from "./mod.ts";

const testDbQueryParser = (sql: string) => {
  try {
    return JSON.parse(sql);
  } catch {
    return "";
  }
};

type TestQueryValues = Sql.DriverQueryValues<string[]>;
interface TestQueryMeta extends Sql.DriverQueryMeta {
  test?: string;
}

type TestRow = Sql.Row<string>;
type TestArrayRow = Sql.ArrayRow<string>;
type TestParameterType = string;
type TestTransactionOptions = Sql.TransactionOptions;

interface TestDriverQueryOptions extends Sql.DriverQueryOptions {
  test?: string;
}
interface TestDriverConnectionOptions extends Sql.DriverConnectionOptions {
  test?: string;
}
interface TestClientPoolOptions extends Sql.ClientPoolOptions {
}
class TestDriver implements
  Sql.Driver<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta
  > {
  readonly connectionUrl: string;
  readonly options: Sql.DriverInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions
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
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver
  > {
  readonly options: Sql.DriverInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions
  >;
  readonly _connection: TestDriver;
  get connected(): boolean {
    return this.connection.connected;
  }

  get connection(): TestDriver {
    return this._connection;
  }

  constructor(
    connection: TestSqlConnectable["connection"],
    options: TestSqlConnectable["options"],
  ) {
    this._connection = connection;
    this.options = options;
  }
  [Symbol.asyncDispose](): Promise<void> {
    return this.connection.close();
  }
}

class TestPreparedStatement extends TestSqlConnectable
  implements
    Sql.PreparedStatement<
      TestDriverConnectionOptions,
      TestDriverQueryOptions,
      TestParameterType,
      TestQueryValues,
      TestQueryMeta,
      TestDriver
    > {
  sql: string;
  constructor(
    connection: TestPreparedStatement["connection"],
    sql: string,
    options: TestPreparedStatement["options"],
  ) {
    super(connection, options);
    this.sql = sql;
  }
  deallocated = false;

  override get connection(): TestDriver {
    if (this.deallocated) throw new Sql.SqlError("deallocated");
    return this._connection;
  }

  deallocate(): Promise<void> {
    this.deallocated = true;
    return Promise.resolve();
  }
  execute(
    _params?: TestParameterType[] | undefined,
    _options?: TestDriverQueryOptions | undefined,
  ): Promise<number | undefined> {
    this.connection;
    return Promise.resolve(testDbQueryParser(this.sql));
  }
  query<T extends TestRow = TestRow>(
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryMany(params, options));
  }
  queryOne<T extends TestRow = TestRow>(
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.query(params, options).then((res) => res[0]) as Promise<
      T | undefined
    >;
  }
  queryMany<T extends TestRow = TestRow>(
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return Sql.mapObjectIterable(
      this.connection.query(this.sql, params, options),
    );
  }
  queryArray<T extends TestArrayRow = TestArrayRow>(
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryManyArray(params, options));
  }
  queryOneArray<T extends TestArrayRow = TestArrayRow>(
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.queryArray(params, options).then((res) => res[0]) as Promise<
      T | undefined
    >;
  }
  queryManyArray<T extends TestArrayRow = TestArrayRow>(
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return Sql.mapArrayIterable(
      this.connection.query(this.sql, params, options),
    );
  }
  override [Symbol.asyncDispose](): Promise<void> {
    return this.deallocate();
  }
}

class TestSqlQueriable extends TestSqlConnectable implements
  Sql.Queriable<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
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
    _options?: TestDriverQueryOptions | undefined,
  ): Promise<number | undefined> {
    this.connection;
    return Promise.resolve(testDbQueryParser(sql));
  }
  query<T extends TestRow = TestRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryMany(sql, params, options));
  }
  queryOne<T extends TestRow = TestRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.query(sql, params, options).then((res) => res[0]) as Promise<
      T | undefined
    >;
  }
  queryMany<T extends TestRow = TestRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return Sql.mapObjectIterable(
      this.connection.query(sql, params, options),
    );
  }
  queryArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryManyArray(sql, params, options));
  }
  queryOneArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.queryArray(sql, params, options).then((res) =>
      res[0]
    ) as Promise<T | undefined>;
  }
  queryManyArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: TestParameterType[] | undefined,
    options?: TestDriverQueryOptions | undefined,
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
  Sql.Preparable<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestPreparedStatement
  > {
  constructor(
    connection: TestSqlPreparable["connection"],
    options: TestSqlPreparable["options"],
  ) {
    super(connection, options);
  }
  prepare(
    sql: string,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<TestPreparedStatement> {
    return Promise.resolve(
      new TestPreparedStatement(
        this.connection,
        sql,
        deepMerge<TestSqlPreparable["options"]>(this.options, {
          queryOptions: options,
        }),
      ),
    );
  }
}

class TestTransaction extends TestSqlPreparable implements
  Sql.Transaction<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestPreparedStatement,
    TestTransactionOptions
  > {
  declare readonly options: Sql.TransactionInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestTransactionOptions
  >;
  _inTransaction: boolean = false;
  get inTransaction(): boolean {
    return this._inTransaction;
  }

  override get connection(): TestDriver {
    if (!this.inTransaction) {
      throw new Sql.SqlError("not in transaction");
    }
    return super.connection;
  }

  constructor(
    connection: TestTransaction["connection"],
    options: TestTransaction["options"],
  ) {
    super(connection, options);
    this._inTransaction = true;
  }
  commitTransaction(
    _options?: Record<string, unknown> | undefined,
  ): Promise<void> {
    this._inTransaction = false;
    return Promise.resolve();
  }
  rollbackTransaction(
    _options?: Record<string, unknown> | undefined,
  ): Promise<void> {
    this._inTransaction = false;
    return Promise.resolve();
  }
  createSavepoint(_name?: string | undefined): Promise<void> {
    return Promise.resolve();
  }
  releaseSavepoint(_name?: string | undefined): Promise<void> {
    return Promise.resolve();
  }
}

class TestTransactionable extends TestSqlPreparable implements
  Sql.Preparable<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestPreparedStatement
  > {
  declare readonly options: Sql.TransactionInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestTransactionOptions
  >;

  constructor(
    connection: TestTransactionable["connection"],
    options: TestTransactionable["options"],
  ) {
    super(connection, options);
  }
  beginTransaction(
    _options?: Record<string, unknown> | undefined,
  ): Promise<TestTransaction> {
    return Promise.resolve(
      new TestTransaction(this.connection, this.options),
    );
  }
  transaction<T>(
    fn: (
      t: TestTransaction,
    ) => Promise<T>,
  ): Promise<T> {
    return fn(new TestTransaction(this.connection, this.options));
  }
}

type TestConnectionEventInit = Sql.DriverEventInit<TestDriver>;

class TestSqlEventTarget extends Sql.SqlEventTarget<
  TestDriverConnectionOptions,
  TestDriverQueryOptions,
  TestParameterType,
  TestQueryValues,
  TestQueryMeta,
  TestDriver,
  Sql.PoolConnectionEventType,
  TestConnectionEventInit,
  Sql.SqlEvent,
  EventListenerOrEventListenerObject,
  AddEventListenerOptions,
  EventListenerOptions
> {
}

class TestClient extends TestTransactionable implements
  Sql.Client<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestPreparedStatement,
    TestTransactionOptions,
    TestTransaction,
    TestSqlEventTarget
  > {
  eventTarget: TestSqlEventTarget;
  constructor(
    connectionUrl: string | URL,
    options: TestTransactionable["options"],
  ) {
    const driver = new TestDriver(connectionUrl.toString(), options);
    super(driver, options);
    this.eventTarget = new TestSqlEventTarget();
  }
  async connect(): Promise<void> {
    await this.connection.connect();
    this.eventTarget.dispatchEvent(
      new Sql.ConnectEvent({ connection: this.connection }),
    );
  }
  async close(): Promise<void> {
    this.eventTarget.dispatchEvent(
      new Sql.CloseEvent({ connection: this.connection }),
    );
    await this.connection.close();
  }
}

interface TestPoolClientOptions extends Sql.PoolClientOptions {
}

class TestPoolClient extends TestTransactionable implements
  Sql.PoolClient<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestPreparedStatement,
    TestTransactionOptions,
    TestTransaction,
    TestPoolClientOptions
  > {
  declare readonly options: Sql.PoolClientInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestTransactionOptions,
    TestPoolClientOptions
  >;

  #releaseFn?: () => Promise<void>;

  #disposed: boolean = false;
  get disposed(): boolean {
    return this.#disposed;
  }

  constructor(
    connection: TestPoolClient["connection"],
    options: TestPoolClient["options"],
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

  override [Symbol.asyncDispose](): Promise<void> {
    return this.release();
  }
}

class TestClientPool implements
  Sql.ClientPool<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestParameterType,
    TestQueryValues,
    TestQueryMeta,
    TestDriver,
    TestPreparedStatement,
    TestTransactionOptions,
    TestTransaction,
    TestPoolClientOptions,
    TestPoolClient
  > {
  declare readonly options: Sql.ClientPoolInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestTransactionOptions,
    TestPoolClientOptions,
    TestClientPoolOptions
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
    options: TestClientPool["options"],
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
          new Sql.ConnectEvent({ connection: conn }),
        );
      }
      this.deferredStack.add(conn);
    }
  }
  async close(): Promise<void> {
    for (const el of this.deferredStack.elements) {
      this.eventTarget.dispatchEvent(
        new Sql.CloseEvent({ connection: el._value }),
      );
      await el.remove();
    }
  }
  async acquire(): Promise<TestPoolClient> {
    const el = await this.deferredStack.pop();
    this.eventTarget.dispatchEvent(
      new Sql.AcquireEvent({ connection: el.value }),
    );
    const c = new TestPoolClient(
      el.value,
      deepMerge<TestClientPool["options"]>(
        this.options,
        {
          poolClientOptions: {
            releaseFn: async () => {
              this.eventTarget.dispatchEvent(
                new Sql.ReleaseEvent({ connection: el._value }),
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
const options: TestClientPool["options"] = {
  clientPoolOptions: {},
  connectionOptions: {},
  poolClientOptions: {},
  queryOptions: {},
  transactionOptions: {},
};
const sql = "test";

const connection = new TestDriver(connectionUrl, options);
const preparedStatement = new TestPreparedStatement(
  connection,
  sql,
  options,
);
const transaction = new TestTransaction(connection, options);
const eventTarget = new TestSqlEventTarget();
const client = new TestClient(connectionUrl, options);
const poolClient = new TestPoolClient(connection, options);
const clientPool = new TestClientPool(connectionUrl, options);

const expects = {
  connectionUrl,
  options,
  clientPoolOptions: options,
  sql,
};

Deno.test(`sql static test`, async (t) => {
  await t.step("Driver", () => {
    testDriver(connection, expects);
  });

  await t.step(`sql/PreparedStatement`, () => {
    testPreparedStatement(preparedStatement, expects);
  });

  await t.step(`sql/Transaction`, () => {
    testTransaction(transaction, expects);
  });

  await t.step(`sql/SqlEventTarget`, () => {
    testEventTarget(eventTarget);
  });

  await t.step(`sql/Client`, () => {
    testClient(client, expects);
  });

  await t.step(`sql/PoolClient`, () => {
    testPoolClient(poolClient, expects);
  });

  await t.step(`sql/ClientPool`, () => {
    testClientPool(clientPool, expects);
  });
});

Deno.test(`sql connection test`, async (t) => {
  await t.step("Client", async (t) => {
    await testClientConnection(
      t,
      TestClient,
      [connectionUrl, options],
    );
  });
  await t.step("Client", async (t) => {
    await testClientPoolConnection(
      t,
      TestClientPool,
      [connectionUrl, options],
    );
  });
});

Deno.test(`sql sanity test`, async (t) => {
  await t.step("Client", async (t) => {
    await t.step("test suite", async (t) => {
      await testClientConstructorIntegration(t, TestClient, [
        connectionUrl,
        options,
      ]);
    });
    await testClientSanity(
      t,
      TestClient,
      [connectionUrl, options],
    );
  });
});
