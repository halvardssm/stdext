import { DeferredStack } from "@stdext/collections";
import { deepMerge } from "@std/collections";
import {
  testClient,
  testClientConnection,
  testClientConstructorIntegration,
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
interface TestPoolOptions extends Sql.PoolOptions {
}
class TestDriver implements
  Sql.Driver<
    TestDriverConnectionOptions,
    TestDriverQueryOptions
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
      TestParameterType
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
    TestParameterType
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

interface TestPoolOptions extends Sql.PoolOptions {
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

class TestClient implements
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
    TestPoolClientOptions,
    TestPoolClient,
    TestPoolOptions,
    TestSqlEventTarget
  > {
  declare readonly options: Sql.ClientInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestTransactionOptions,
    TestPoolClientOptions,
    TestPoolOptions
  >;
  _connected: boolean = false;
  deferredStack: DeferredStack<TestDriver>;
  eventTarget: TestSqlEventTarget;
  connectionUrl: string;
  constructor(
    connectionUrl: string | URL,
    options: TestClient["options"],
  ) {
    this.connectionUrl = connectionUrl.toString();
    this.options = options;
    this.deferredStack = new DeferredStack<TestDriver>({
      maxSize: options.poolOptions.maxSize ?? 3,
      removeFn: async (element) => {
        await element._value.close();
      },
    });
    this.eventTarget = new TestSqlEventTarget();
  }
  get connected(): boolean {
    return this._connected;
  }
  async beginTransaction(
    options?: Record<string, unknown> | undefined,
  ): Promise<TestTransaction> {
    const conn = await this.acquire();
    return conn.beginTransaction(options);
  }
  async transaction<T>(fn: (t: TestTransaction) => Promise<T>): Promise<T> {
    const conn = await this.acquire();
    return conn.transaction(fn);
  }
  async prepare(
    sql: string,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<TestPreparedStatement> {
    const conn = await this.acquire();
    return conn.prepare(sql, options);
  }
  async execute(
    sql: string,
    params?: string[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<number | undefined> {
    const conn = await this.acquire();
    return conn.execute(sql, params, options);
  }
  async query<T extends TestRow = TestRow>(
    sql: string,
    params?: string[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T[]> {
    const conn = await this.acquire();
    return conn.query(sql, params, options);
  }
  async queryOne<T extends TestRow = TestRow>(
    sql: string,
    params?: string[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T | undefined> {
    const conn = await this.acquire();
    return conn.queryOne(sql, params, options);
  }
  async *queryMany<T extends TestRow = TestRow>(
    sql: string,
    params?: string[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const conn = await this.acquire();
    yield* conn.queryMany(sql, params, options);
  }
  async queryArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: string[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T[]> {
    const conn = await this.acquire();
    return conn.queryArray(sql, params, options);
  }
  async queryOneArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: string[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): Promise<T | undefined> {
    const conn = await this.acquire();
    return conn.queryOneArray(sql, params, options);
  }
  async *queryManyArray<T extends TestArrayRow = TestArrayRow>(
    sql: string,
    params?: string[] | undefined,
    options?: TestDriverQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const conn = await this.acquire();
    yield* conn.queryManyArray(sql, params, options);
  }
  async sql<T extends TestRow = TestRow>(
    strings: TemplateStringsArray,
    ...parameters: string[]
  ): Promise<T[]> {
    const conn = await this.acquire();
    return conn.sql(strings, ...parameters);
  }
  async sqlArray<T extends TestArrayRow = TestArrayRow>(
    strings: TemplateStringsArray,
    ...parameters: string[]
  ): Promise<T[]> {
    const conn = await this.acquire();
    return conn.sqlArray(strings, ...parameters);
  }
  [Symbol.asyncDispose](): PromiseLike<void> {
    return this.close();
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
      deepMerge<TestClient["options"]>(
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
}

const connectionUrl = "test";
const options: TestClient["options"] = {
  poolOptions: {},
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

const expects = {
  connectionUrl,
  options,
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
});

Deno.test(`sql connection test`, async (t) => {
  await t.step("Client", async (t) => {
    await testClientConnection(
      t,
      TestClient,
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
