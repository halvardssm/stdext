import { DeferredStack, type DeferredStackElement } from "@stdext/collections";
import {
  type Client,
  ClientEvent,
  ClientEventTarget,
  type ClientOptions,
  ConnectionError,
  type DatabaseError,
  type ExecuteResult,
  type PoolClient,
  type PoolOptions,
  type QueryOptions,
  type QueryParameters,
  type ResultIterableContext,
  type Statement,
  type Transaction,
  type TransactionOptions,
} from "../../sql/mod.ts";
import {
  type BaseDriver,
  type BasePreparedStatement,
  type BaseTransaction,
  delegateResult,
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
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult> {
    this.#assertUsable();
    return await this.#driver.execute(sql, params, options);
  }

  query(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext {
    return delegateResult(() => {
      this.#assertUsable();
      return Promise.resolve({
        result: this.#driver.query(sql, params, options),
      });
    });
  }

  async executeScript(sql: string, options?: QueryOptions): Promise<void> {
    this.#assertUsable();
    await this.#driver.executeScript(sql, options);
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
  #closed = false;
  #connecting?: Promise<void>;
  readonly #openedAt = new Map<IDriver, number>();
  readonly #idleTimers = new Map<IDriver, ReturnType<typeof setTimeout>>();

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

  get #poolOptions(): PoolOptions {
    return this.#options.poolOptions ?? {};
  }

  /** Whether a connection can be opened without exceeding the pool size */
  get #canOpen(): boolean {
    const stack = this.#stack!;
    return stack.totalCount + this.#opening < stack.maxSize;
  }

  /** Whether a connection has reached its maximum lifetime */
  #expired(driver: IDriver): boolean {
    const { maxLifetime } = this.#poolOptions;
    return maxLifetime !== undefined &&
      Date.now() - (this.#openedAt.get(driver) ?? 0) >= maxLifetime;
  }

  #clearIdleTimer(driver: IDriver): void {
    clearTimeout(this.#idleTimers.get(driver));
    this.#idleTimers.delete(driver);
  }

  /** Close the connection once it has been idle for the idle timeout */
  #scheduleIdle(driver: IDriver): void {
    const { idleTimeout } = this.#poolOptions;
    const stack = this.#stack;
    if (idleTimeout === undefined || !stack) return;
    // The connection may have been handed to a waiting acquire instead.
    if (!stack.stack.some((element) => element._value === driver)) return;
    this.#clearIdleTimer(driver);
    this.#idleTimers.set(
      driver,
      setTimeout(() => {
        this.#idleTimers.delete(driver);
        const element = stack.stack.find((element) =>
          element._value === driver
        );
        // A failure to close is dispatched as an error event by the driver.
        element?.remove().catch(() => {});
      }, idleTimeout),
    );
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
      this.#openedAt.set(driver, Date.now());
      stack.add(driver);
      this.#scheduleIdle(driver);
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
    if (!driver.connected || this.#expired(driver)) {
      return await this.#remove(element);
    }
    await element.release();
    this.#scheduleIdle(driver);
  }

  async #remove(element: DeferredStackElement<IDriver>): Promise<void> {
    await element.remove();
    await this.#replenish();
  }

  /** Pop a connection, waiting at most until the deadline */
  async #pop(
    stack: DeferredStack<IDriver>,
    deadline: number | undefined,
  ): Promise<DeferredStackElement<IDriver>> {
    if (deadline === undefined) return await stack.pop();
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(0, deadline - Date.now()),
    );
    try {
      return await stack.pop({ signal: controller.signal });
    } catch (error) {
      if (!controller.signal.aborted) throw error;
      throw new ConnectionError(
        `Timed out after ${this.#poolOptions.acquireTimeout} ms waiting for a connection`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async connect(): Promise<void> {
    if (this.#connected) return;
    // Concurrent calls share the same attempt.
    this.#connecting ??= this.#start().finally(() => {
      this.#connecting = undefined;
    });
    await this.#connecting;
  }

  async #start(): Promise<void> {
    const { maxSize, acquireTimeout, idleTimeout, maxLifetime } =
      this.#poolOptions;
    const durations = { acquireTimeout, idleTimeout, maxLifetime };
    for (const [name, value] of Object.entries(durations)) {
      if (value !== undefined && !(value >= 0)) {
        throw new RangeError(
          `Cannot connect as '${name}' must be a non-negative number: received ${value}`,
        );
      }
    }
    this.#connected = true;
    this.#closed = false;
    this.#stack = new DeferredStack<IDriver>({
      maxSize: Math.max(1, maxSize ?? 1),
      removeFn: (driver) => {
        this.#clearIdleTimer(driver);
        this.#openedAt.delete(driver);
        this.#dispatch("close");
        return driver.close();
      },
    });
    if (this.#poolOptions.lazyInitialization) return;
    try {
      while (this.#canOpen) await this.#open();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    this.#closed = true;
    if (!this.#connected) return;
    this.#connected = false;
    // Closing is best effort: a connection failing to close is gone anyway.
    await this.#stack?.clear(new ConnectionError("Client is closed"))
      .catch(() => {});
  }

  async acquire(): Promise<BasePoolClient<IDriver>> {
    const { acquireTimeout } = this.#poolOptions;
    const deadline = acquireTimeout === undefined
      ? undefined
      : Date.now() + acquireTimeout;
    // Connect implicitly, unless the client was closed.
    if (!this.#connected && !this.#closed) await this.connect();
    while (true) {
      if (!this.#connected) {
        throw new ConnectionError("Client is closed");
      }
      const stack = this.#stack!;
      if (stack.availableCount === 0 && this.#canOpen) await this.#open();
      // Waits for a release when the pool is exhausted, and rejects when the
      // client closes or the acquire timeout passes.
      const element = await this.#pop(stack, deadline);
      const driver = element.value;
      this.#clearIdleTimer(driver);
      if (!driver.connected || this.#expired(driver)) {
        await this.#remove(element);
        continue;
      }
      this.#dispatch("acquire");
      return new BasePoolClient(
        driver,
        () => this.#release(element, driver),
        () => this.#remove(element),
      );
    }
  }

  async ping(): Promise<void> {
    await using poolClient = await this.acquire();
    await poolClient.ping();
  }

  async execute(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult> {
    await using poolClient = await this.acquire();
    return await poolClient.execute(sql, params, options);
  }

  query(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext {
    // The connection is acquired when the query runs, and held until the
    // result is fully read or disposed.
    return delegateResult(async () => {
      const poolClient = await this.acquire();
      return {
        result: poolClient.query(sql, params, options),
        done: () => poolClient.release(),
      };
    });
  }

  async executeScript(sql: string, options?: QueryOptions): Promise<void> {
    await using poolClient = await this.acquire();
    await poolClient.executeScript(sql, options);
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
