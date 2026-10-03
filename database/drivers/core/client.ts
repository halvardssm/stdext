import { DeferredStack, type DeferredStackElement } from "@stdext/collections";
import {
  type Client,
  ClientEvent,
  ClientEventTarget,
  type ClientOptions,
  ConnectionError,
  createResultIterableContext,
  type DatabaseError,
  type PoolClient,
  type QueryOptions,
  type QueryParameters,
  type ResultIterableContext,
  type Row,
  type Transaction,
  type TransactionOptions,
} from "../../sql/mod.ts";
import {
  type BaseDriver,
  type BasePreparedStatement,
  type BaseTransaction,
  onStatementDeallocate,
  onTransactionEnd,
  resetDriver,
} from "./driver.ts";

/**
 * A single connection acquired from a {@linkcode BaseClient}.
 *
 * @template IDriver the driver type
 */
export class BasePoolClient<IDriver extends BaseDriver = BaseDriver>
  implements PoolClient {
  readonly #driver: IDriver;
  readonly #release: () => Promise<void>;
  readonly #remove: () => Promise<void>;
  #disposed = false;

  constructor(
    driver: IDriver,
    release: () => Promise<void>,
    remove: () => Promise<void>,
  ) {
    this.#driver = driver;
    this.#release = release;
    this.#remove = remove;
  }

  get driver(): IDriver {
    return this.#driver;
  }

  get connected(): boolean {
    return this.#driver.connected;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  #assertUsable(): void {
    if (this.#disposed) {
      throw new ConnectionError("Pool client is released");
    }
  }

  async release(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.#release();
  }

  async remove(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.#remove();
  }

  async ping(): Promise<void> {
    this.#assertUsable();
    await this.#driver.ping();
  }

  async execute(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<number | undefined> {
    this.#assertUsable();
    return await this.#driver.execute(sql, params, options);
  }

  async query(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ResultIterableContext> {
    this.#assertUsable();
    return await this.#driver.query(sql, params, options);
  }

  async prepare(
    sql: string,
    options?: QueryOptions,
  ): Promise<BasePreparedStatement> {
    this.#assertUsable();
    return await this.#driver.prepare(sql, options);
  }

  async beginTransaction(
    options?: TransactionOptions,
  ): Promise<BaseTransaction> {
    this.#assertUsable();
    return await this.#driver.beginTransaction(options);
  }

  async transaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    this.#assertUsable();
    return await this.#driver.transaction(fn, options);
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.release();
  }
}

/**
 * The base of the SQL clients: a connection pool over a
 * {@linkcode BaseDriver}. Implementations only provide the driver.
 *
 * @template IDriver the driver type
 * @template IOptions the client options
 */
export abstract class BaseClient<
  IDriver extends BaseDriver = BaseDriver,
  IOptions extends ClientOptions = ClientOptions,
> implements Client<IOptions> {
  readonly #connectionUrl: string | URL;
  readonly #options: IOptions;
  readonly eventTarget: ClientEventTarget = new ClientEventTarget();
  #stack?: DeferredStack<IDriver>;
  #opening = 0;
  #connected = false;

  constructor(connectionUrl: string | URL, options?: IOptions) {
    this.#connectionUrl = connectionUrl;
    this.#options = options ?? ({} as IOptions);
  }

  get connectionUrl(): string | URL {
    return this.#connectionUrl;
  }

  get options(): IOptions {
    return this.#options;
  }

  get connected(): boolean {
    return this.#connected;
  }

  /** Create a new, unconnected driver for the pool */
  protected abstract createDriver(): IDriver;

  #dispatch(type: "connect" | "close" | "acquire" | "release"): void {
    this.eventTarget.dispatchEvent(
      new ClientEvent(type, { detail: { client: this } }),
    );
  }

  /** Whether a connection can be opened without exceeding the pool size */
  get #canOpen(): boolean {
    const stack = this.#stack!;
    return stack.totalCount + this.#opening < stack.maxSize;
  }

  /** Open a connection and add it to the pool */
  async #open(): Promise<void> {
    const stack = this.#stack!;
    this.#opening++;
    try {
      const driver = this.createDriver();
      driver.eventTarget.addEventListener("error", (event) => {
        const error = (event as CustomEvent<{ error: DatabaseError }>).detail
          .error;
        this.eventTarget.dispatchEvent(
          new ClientEvent("error", { detail: { client: this, error } }),
        );
      });
      await driver.connect();
      if (!this.#connected || this.#stack !== stack) {
        await driver.close();
        throw new ConnectionError("Client is closed");
      }
      this.#dispatch("connect");
      stack.add(driver);
    } finally {
      this.#opening--;
    }
  }

  /**
   * Open a connection for queued acquires after a connection was removed, as
   * no release will serve them otherwise.
   */
  async #replenish(): Promise<void> {
    if (this.#connected && this.#stack!.queuedCount > 0 && this.#canOpen) {
      // A failure is dispatched as an error event by the driver.
      await this.#open().catch(() => {});
    }
  }

  async #release(
    element: DeferredStackElement<IDriver>,
    driver: IDriver,
  ): Promise<void> {
    this.#dispatch("release");
    try {
      await resetDriver(driver);
    } catch {
      // A connection that can not be reset is broken, and is not reused.
      return await this.#remove(element);
    }
    if (!driver.connected) return await this.#remove(element);
    await element.release();
  }

  async #remove(element: DeferredStackElement<IDriver>): Promise<void> {
    await element.remove();
    await this.#replenish();
  }

  async connect(): Promise<void> {
    if (this.#connected) return;
    this.#connected = true;
    this.#stack = new DeferredStack<IDriver>({
      maxSize: Math.max(1, this.#options.poolOptions?.maxSize ?? 1),
      removeFn: (driver) => {
        this.#dispatch("close");
        return driver.close();
      },
    });
    if (this.#options.poolOptions?.lazyInitialization) return;
    try {
      while (this.#canOpen) await this.#open();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.#connected) return;
    this.#connected = false;
    // Closing is best effort: a connection failing to close is gone anyway.
    await this.#stack?.clear(new ConnectionError("Client is closed"))
      .catch(() => {});
  }

  async acquire(): Promise<BasePoolClient<IDriver>> {
    if (!this.#connected) {
      throw new ConnectionError("Client is not connected");
    }
    const stack = this.#stack!;
    if (stack.availableCount === 0 && this.#canOpen) await this.#open();
    // Waits for a release when the pool is exhausted, and rejects when the
    // client closes.
    const element = await stack.pop();
    const driver = element.value;
    if (!driver.connected) {
      await this.#remove(element);
      return await this.acquire();
    }
    this.#dispatch("acquire");
    return new BasePoolClient(
      driver,
      () => this.#release(element, driver),
      () => this.#remove(element),
    );
  }

  async ping(): Promise<void> {
    await using poolClient = await this.acquire();
    await poolClient.ping();
  }

  async execute(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<number | undefined> {
    await using poolClient = await this.acquire();
    return await poolClient.execute(sql, params, options);
  }

  async query(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ResultIterableContext> {
    const poolClient = await this.acquire();
    let ctx: ResultIterableContext;
    try {
      ctx = await poolClient.query(sql, params, options);
    } catch (error) {
      await poolClient.release();
      throw error;
    }
    // The connection is held until the result is fully fetched or the
    // context is disposed.
    const columns = ctx.metadata.columns;
    async function* rows(): AsyncGenerator<Row> {
      try {
        for await (const row of ctx) yield { columns, values: row.values };
      } finally {
        await ctx[Symbol.asyncDispose]();
        await poolClient.release();
      }
    }
    return await createResultIterableContext(rows());
  }

  async prepare(
    sql: string,
    options?: QueryOptions,
  ): Promise<BasePreparedStatement> {
    // The connection is held until the statement is deallocated.
    const poolClient = await this.acquire();
    try {
      const stmt = await poolClient.prepare(sql, options);
      onStatementDeallocate(stmt, () => poolClient.release());
      return stmt;
    } catch (error) {
      await poolClient.release();
      throw error;
    }
  }

  async beginTransaction(
    options?: TransactionOptions,
  ): Promise<BaseTransaction> {
    // The connection is held until the transaction has ended.
    const poolClient = await this.acquire();
    try {
      const tx = await poolClient.beginTransaction(options);
      onTransactionEnd(tx, () => poolClient.release());
      return tx;
    } catch (error) {
      await poolClient.release();
      throw error;
    }
  }

  async transaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    await using poolClient = await this.acquire();
    return await poolClient.transaction(fn, options);
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}
