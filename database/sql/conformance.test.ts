import { assertEquals } from "@std/assert";
import * as Sql from "./mod.ts";
import {
  type Factory,
  testClientIntegration,
  testDriverIntegration,
  type TestSql,
} from "./testing.ts";
import { createResultIterableContext, type Row } from "./utils.ts";

const table = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

const sql: TestSql = {
  execute: "CREATE TABLE users (id INTEGER, name TEXT)",
  query: "SELECT id, name FROM users",
  columns: ["id", "name"],
  count: 3,
};

class TestPreparedStatement implements Sql.PreparedStatement {
  #deallocated = false;

  constructor(
    readonly driver: TestDriver,
    readonly sql: string,
    readonly onDeallocate?: () => Promise<void>,
  ) {}

  get deallocated(): boolean {
    return this.#deallocated;
  }

  async deallocate(): Promise<void> {
    if (this.#deallocated) return;
    this.#deallocated = true;
    await this.onDeallocate?.();
  }

  #assertUsable(): void {
    if (this.#deallocated) {
      throw new Sql.QueryError("Prepared statement is deallocated");
    }
  }

  execute(
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<number | undefined> {
    this.#assertUsable();
    return this.driver.execute(this.sql, params, options);
  }

  query(
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<Sql.ResultIterableContext> {
    this.#assertUsable();
    return this.driver.query(this.sql, params, options);
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.deallocate();
  }
}

class TestTransaction implements Sql.Transaction {
  #inTransaction = true;
  // Savepoint based nesting: a nested transaction shares the driver of its
  // parent, and only the outermost transaction ends the underlying
  // connection hold (if any).
  readonly #parent?: TestTransaction;

  constructor(
    readonly driver: TestDriver,
    readonly onEnd?: () => Promise<void>,
    parent?: TestTransaction,
  ) {
    this.#parent = parent;
  }

  get inTransaction(): boolean {
    return this.#inTransaction;
  }

  #assertActive(): void {
    if (!this.#inTransaction) {
      throw new Sql.TransactionError("Transaction is not active");
    }
  }

  async commitTransaction(): Promise<void> {
    this.#assertActive();
    this.#inTransaction = false;
    if (!this.#parent) {
      await this.onEnd?.();
    }
  }

  async rollbackTransaction(): Promise<void> {
    this.#assertActive();
    this.#inTransaction = false;
    if (!this.#parent) {
      await this.onEnd?.();
    }
  }

  createSavepoint(_name?: string): Promise<void> {
    this.#assertActive();
    return Promise.resolve();
  }

  releaseSavepoint(_name?: string): Promise<void> {
    this.#assertActive();
    return Promise.resolve();
  }

  beginTransaction(_options?: Sql.TransactionOptions) {
    this.#assertActive();
    return Promise.resolve(
      new TestTransaction(this.driver, undefined, this),
    );
  }

  async transaction<T>(
    fn: (tx: TestTransaction) => Promise<T>,
    options?: Sql.TransactionOptions,
  ): Promise<T> {
    const tx = await this.beginTransaction(options);
    try {
      const result = await fn(tx);
      if (tx.inTransaction) {
        await tx.commitTransaction();
      }
      return result;
    } catch (error) {
      if (tx.inTransaction) {
        await tx.rollbackTransaction();
      }
      throw error;
    }
  }

  execute(
    sql: string,
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<number | undefined> {
    this.#assertActive();
    return this.driver.execute(sql, params, options);
  }

  query(
    sql: string,
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<Sql.ResultIterableContext> {
    this.#assertActive();
    return this.driver.query(sql, params, options);
  }

  prepare(statement: string, options?: Sql.QueryOptions) {
    this.#assertActive();
    return this.driver.prepare(statement, options);
  }

  [Symbol.asyncDispose](): Promise<void> {
    if (this.#inTransaction) {
      return this.rollbackTransaction();
    }
    return Promise.resolve();
  }
}

class TestDriver implements Sql.Driver {
  readonly connectionUrl: string;
  readonly options: Sql.Options;
  readonly eventTarget = new Sql.DriverEventTarget();
  #connected = false;

  constructor(connectionUrl: string | URL, options: Sql.Options = {}) {
    this.connectionUrl = connectionUrl.toString();
    this.options = options;
  }

  get connected(): boolean {
    return this.#connected;
  }

  #assertConnected(): void {
    if (!this.#connected) {
      throw new Sql.ConnectionError("Driver is not connected");
    }
  }

  connect(): Promise<void> {
    if (this.#connected) return Promise.resolve();
    this.#connected = true;
    this.eventTarget.dispatchEvent(
      new Sql.DriverEvent("connect", { detail: { client: this } }),
    );
    return Promise.resolve();
  }

  close(): Promise<void> {
    if (!this.#connected) return Promise.resolve();
    this.#connected = false;
    this.eventTarget.dispatchEvent(
      new Sql.DriverEvent("close", { detail: { client: this } }),
    );
    return Promise.resolve();
  }

  ping(): Promise<void> {
    this.#assertConnected();
    return Promise.resolve();
  }

  async *#rows(): AsyncGenerator<Row> {
    for (const row of table) {
      yield { columns: ["id", "name"], values: Object.values(row) };
    }
  }

  execute(
    statement: string,
    _params?: Sql.QueryParameters,
    _options?: Sql.QueryOptions,
  ): Promise<number | undefined> {
    this.#assertConnected();
    return Promise.resolve(statement.startsWith("INSERT") ? 1 : 0);
  }

  query(
    statement: string,
    _params?: Sql.QueryParameters,
    _options?: Sql.QueryOptions,
  ): Promise<Sql.ResultIterableContext> {
    this.#assertConnected();
    if (!statement.startsWith("SELECT")) {
      throw new Sql.QueryError("Unsupported statement");
    }
    return createResultIterableContext(this.#rows());
  }

  prepare(
    statement: string,
    _options?: Sql.QueryOptions,
  ): Promise<TestPreparedStatement> {
    this.#assertConnected();
    return Promise.resolve(new TestPreparedStatement(this, statement));
  }

  beginTransaction(): Promise<TestTransaction> {
    this.#assertConnected();
    return Promise.resolve(new TestTransaction(this));
  }

  async transaction<T>(
    fn: (tx: TestTransaction) => Promise<T>,
  ): Promise<T> {
    const tx = await this.beginTransaction();
    try {
      const result = await fn(tx);
      await tx.commitTransaction();
      return result;
    } catch (error) {
      if (tx.inTransaction) {
        await tx.rollbackTransaction();
      }
      throw error;
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

class TestPoolClient implements Sql.PoolClient {
  #disposed = false;

  constructor(
    readonly driver: TestDriver,
    readonly releaseFn: () => Promise<void>,
    readonly removeFn: () => Promise<void>,
  ) {}

  get connected(): boolean {
    return this.driver.connected;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  async release(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.releaseFn();
  }

  async remove(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.removeFn();
  }

  ping(): Promise<void> {
    return this.driver.ping();
  }

  execute(
    sql: string,
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<number | undefined> {
    return this.driver.execute(sql, params, options);
  }

  query(
    sql: string,
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<Sql.ResultIterableContext> {
    return this.driver.query(sql, params, options);
  }

  prepare(
    sql: string,
    _options?: Sql.QueryOptions,
  ): Promise<TestPreparedStatement> {
    return Promise.resolve(
      new TestPreparedStatement(this.driver, sql, () => this.release()),
    );
  }

  beginTransaction(
    _options?: Sql.TransactionOptions,
  ): Promise<TestTransaction> {
    return Promise.resolve(
      new TestTransaction(this.driver, () => this.release()),
    );
  }

  async transaction<T>(
    fn: (tx: TestTransaction) => Promise<T>,
    options?: Sql.TransactionOptions,
  ): Promise<T> {
    const tx = await this.beginTransaction(options);
    try {
      const result = await fn(tx);
      if (tx.inTransaction) {
        await tx.commitTransaction();
      }
      return result;
    } catch (error) {
      if (tx.inTransaction) {
        await tx.rollbackTransaction();
      }
      throw error;
    } finally {
      await this.release();
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.release();
  }
}

class TestClient implements Sql.Client {
  readonly connectionUrl: string;
  readonly options: Sql.ClientOptions;
  readonly eventTarget = new Sql.ClientEventTarget();
  #connected = false;
  #idle: TestDriver[] = [];
  #size = 0;
  #waiters: (() => void)[] = [];

  constructor(connectionUrl: string | URL, options: Sql.ClientOptions = {}) {
    this.connectionUrl = connectionUrl.toString();
    this.options = options;
  }

  get connected(): boolean {
    return this.#connected;
  }

  get #maxSize(): number {
    return this.options.poolOptions?.maxSize ?? 1;
  }

  get #lazy(): boolean {
    return this.options.poolOptions?.lazyInitialization ?? false;
  }

  async #createDriver(): Promise<TestDriver> {
    const driver = new TestDriver(this.connectionUrl, {
      connectionOptions: this.options.connectionOptions ?? {},
      queryOptions: this.options.queryOptions ?? {},
      transactionOptions: this.options.transactionOptions ?? {},
    });
    await driver.connect();
    this.eventTarget.dispatchEvent(
      new Sql.ClientEvent("connect", { detail: { client: this } }),
    );
    this.#size++;
    return driver;
  }

  async connect(): Promise<void> {
    if (this.#connected) return;
    this.#connected = true;
    if (!this.#lazy) {
      while (this.#size < this.#maxSize) {
        this.#idle.push(await this.#createDriver());
      }
    }
  }

  async close(): Promise<void> {
    if (!this.#connected) return;
    this.#connected = false;
    for (const driver of this.#idle) {
      this.eventTarget.dispatchEvent(
        new Sql.ClientEvent("close", { detail: { client: this } }),
      );
      await driver.close();
    }
    this.#idle = [];
    this.#size = 0;
  }

  async acquire(): Promise<TestPoolClient> {
    if (!this.#connected) {
      throw new Sql.ConnectionError("Client is not connected");
    }
    let driver: TestDriver;
    if (this.#idle.length > 0) {
      driver = this.#idle.pop()!;
    } else if (this.#size < this.#maxSize) {
      driver = await this.#createDriver();
    } else {
      driver = await new Promise<TestDriver>((resolve) => {
        this.#waiters.push(() => resolve(this.#idle.pop()!));
      });
    }
    const poolClient = new TestPoolClient(
      driver,
      async () => {
        if (!this.#connected) {
          await driver.close();
          this.#size--;
          return;
        }
        this.eventTarget.dispatchEvent(
          new Sql.ClientEvent("release", { detail: { client: this } }),
        );
        this.#idle.push(driver);
        this.#waiters.shift()?.();
      },
      async () => {
        await driver.close();
        this.#size--;
      },
    );
    this.eventTarget.dispatchEvent(
      new Sql.ClientEvent("acquire", { detail: { client: this } }),
    );
    return poolClient;
  }

  ping(): Promise<void> {
    if (!this.#connected) {
      throw new Sql.ConnectionError("Client is not connected");
    }
    return Promise.resolve();
  }

  async execute(
    sql: string,
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<number | undefined> {
    const poolClient = await this.acquire();
    try {
      return await poolClient.execute(sql, params, options);
    } finally {
      await poolClient.release();
    }
  }

  async query(
    sql: string,
    params?: Sql.QueryParameters,
    options?: Sql.QueryOptions,
  ): Promise<Sql.ResultIterableContext> {
    const poolClient = await this.acquire();
    const ctx = await poolClient.query(sql, params, options);
    // The connection is held until the result is fully fetched, then
    // released. Disposing the returned context stops fetching and releases
    // the connection early.
    const columns = ctx.metadata.columns;
    const rows = async function* (): AsyncGenerator<Row> {
      try {
        for await (const row of ctx) {
          yield { columns, values: row.values };
        }
      } finally {
        await poolClient.release();
      }
    };
    return await createResultIterableContext(rows());
  }

  async prepare(
    sql: string,
    _options?: Sql.QueryOptions,
  ): Promise<TestPreparedStatement> {
    // The pool client is held until the prepared statement is deallocated.
    const poolClient = await this.acquire();
    return await poolClient.prepare(sql, _options);
  }

  async beginTransaction(
    _options?: Sql.TransactionOptions,
  ): Promise<TestTransaction> {
    // The pool client is held until the transaction is finished.
    const poolClient = await this.acquire();
    return await poolClient.beginTransaction();
  }

  async transaction<T>(
    fn: (tx: TestTransaction) => Promise<T>,
    options?: Sql.TransactionOptions,
  ): Promise<T> {
    const poolClient = await this.acquire();
    try {
      return await poolClient.transaction<T>(fn, options);
    } finally {
      await poolClient.release();
    }
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

Deno.test("Driver conformance", async (t) => {
  await testDriverIntegration(t, TestDriver, [":memory:"], sql);
});

Deno.test("Client conformance", async (t) => {
  await testClientIntegration(
    t,
    TestClient,
    [":memory:", { poolOptions: { maxSize: 2 } }],
    sql,
  );
});

Deno.test("Client pool behavior", async (t) => {
  const create: Factory<TestClient> = () =>
    new TestClient(":memory:", { poolOptions: { maxSize: 2 } });

  await t.step("acquire waits when the pool is exhausted", async () => {
    const client = await create();
    await client.connect();
    const first = await client.acquire();
    const second = await client.acquire();

    let acquired = false;
    const thirdPromise = client.acquire().then((pc) => {
      acquired = true;
      return pc;
    });

    await first.release();
    const third = await thirdPromise;
    assertEquals(acquired, true);

    await second.release();
    await third.release();
    await client.close();
  });

  await t.step("lazy initialization connects on acquire", async () => {
    const client = new TestClient(":memory:", {
      poolOptions: { lazyInitialization: true, maxSize: 2 },
    });
    let connectCalled = false;
    client.eventTarget.addEventListener("connect", () => {
      connectCalled = true;
    });
    await client.connect();
    assertEquals(connectCalled, false);

    const poolClient = await client.acquire();
    assertEquals(connectCalled, true);
    assertEquals(poolClient.connected, true);

    await poolClient.release();
    await client.close();
  });
});
