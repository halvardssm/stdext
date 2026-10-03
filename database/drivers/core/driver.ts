import {
  ConnectionError,
  createResultIterableContext,
  DatabaseError,
  type Driver,
  DriverEvent,
  DriverEventTarget,
  type Options,
  type PreparedStatement,
  QueryError,
  type QueryOptions,
  type QueryParameters,
  type ResultIterableContext,
  type Row,
  type Transaction,
  TransactionError,
  type TransactionOptions,
} from "../../sql/mod.ts";

/**
 * Parameters as handed to a driver implementation, after
 * {@linkcode QueryOptions.transformInput} has been applied.
 */
export type DriverParameters = unknown[] | Record<string, unknown>;

/**
 * A database specific prepared statement, as created by
 * {@linkcode BaseDriver.prepareDriver}.
 */
export interface StatementHandle {
  /** Execute the statement, resolving to the affected rows if known */
  execute(
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<number | undefined>;
  /** Query the statement, streaming the rows */
  query(
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): AsyncIterable<Row>;
  /** Release the statement in the database */
  deallocate(): Promise<void>;
}

/** A callback run when a resource ends */
export type Callback = () => void | Promise<void>;

// Accessors to private members, assigned in static blocks of the classes, so
// that the hooks for clients are not part of the public class surface. See
// the exported functions at the end of the module.
let addDeallocateCallback: (
  stmt: BasePreparedStatement,
  callback: Callback,
) => void;
let addEndCallback: (tx: BaseTransaction, callback: Callback) => void;
let invalidate: (tx: BaseTransaction) => void;
let reset: (driver: BaseDriver) => Promise<void>;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function wrapError(
  error: unknown,
  ErrorClass: new (message: string) => DatabaseError,
): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const wrapped = new ErrorClass(
    error instanceof Error ? error.message : String(error),
  );
  wrapped.cause = error;
  return wrapped;
}

function transformParams(
  params: QueryParameters | undefined,
  transform: ((value: unknown) => unknown) | undefined,
): DriverParameters | undefined {
  if (params === undefined || transform === undefined) return params;
  if (Array.isArray(params)) return params.map(transform);
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, transform(value)]),
  );
}

async function runTransaction<T>(
  tx: Transaction,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  try {
    const result = await fn(tx);
    if (tx.inTransaction) await tx.commitTransaction();
    return result;
  } catch (error) {
    if (tx.inTransaction) {
      // The original error is more relevant than a failing rollback.
      await tx.rollbackTransaction().catch(() => {});
    }
    throw error;
  }
}

/**
 * The calls a {@linkcode BasePreparedStatement} delegates to, with the
 * statement already prepared.
 */
export interface PreparedStatementCalls {
  /** Execute the statement */
  execute(
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<number | undefined>;
  /** Query the statement */
  query(
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ResultIterableContext>;
  /** Deallocate the statement */
  deallocate(): Promise<void>;
}

/**
 * A prepared statement, created by {@linkcode BaseDriver.prepare}.
 */
export class BasePreparedStatement implements PreparedStatement {
  readonly #sql: string;
  readonly #calls: PreparedStatementCalls;
  readonly #onDeallocate: Callback[] = [];
  #deallocated = false;

  constructor(sql: string, calls: PreparedStatementCalls) {
    this.#sql = sql;
    this.#calls = calls;
  }

  get sql(): string {
    return this.#sql;
  }

  get deallocated(): boolean {
    return this.#deallocated;
  }

  #assertUsable(): void {
    if (this.#deallocated) {
      throw new QueryError("Prepared statement is deallocated");
    }
  }

  async deallocate(): Promise<void> {
    if (this.#deallocated) return;
    this.#deallocated = true;
    try {
      await this.#calls.deallocate();
    } finally {
      for (const callback of this.#onDeallocate) await callback();
    }
  }

  async execute(
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<number | undefined> {
    this.#assertUsable();
    return await this.#calls.execute(params, options);
  }

  async query(
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ResultIterableContext> {
    this.#assertUsable();
    return await this.#calls.query(params, options);
  }

  static {
    addDeallocateCallback = (stmt, callback) =>
      stmt.#onDeallocate.push(callback);
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.deallocate();
  }
}

/**
 * The connection a {@linkcode BaseTransaction} runs on.
 */
export interface TransactionContext {
  /** The driver to run statements on */
  driver: BaseDriver;
  /** Run a transaction control statement, such as `COMMIT` */
  control(sql: string): Promise<void>;
  /** Generate a unique savepoint name */
  savepointName(): string;
}

/**
 * A transaction, created by {@linkcode BaseDriver.beginTransaction}.
 *
 * Nested transactions are savepoints: committing releases the savepoint and
 * rolling back rolls back to it.
 */
export class BaseTransaction implements Transaction {
  readonly #context: TransactionContext;
  readonly #savepoint?: string;
  readonly #children: BaseTransaction[] = [];
  readonly #savepoints: string[] = [];
  readonly #onEnd: Callback[] = [];
  #active = true;

  constructor(context: TransactionContext, savepoint?: string) {
    this.#context = context;
    this.#savepoint = savepoint;
  }

  get inTransaction(): boolean {
    return this.#active;
  }

  #assertActive(): void {
    if (!this.#active) {
      throw new TransactionError("Transaction is not active");
    }
  }

  async #end(): Promise<void> {
    this.#invalidate();
    for (const callback of this.#onEnd) await callback();
  }

  async execute(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<number | undefined> {
    this.#assertActive();
    return await this.#context.driver.execute(sql, params, options);
  }

  async query(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ResultIterableContext> {
    this.#assertActive();
    return await this.#context.driver.query(sql, params, options);
  }

  async prepare(
    sql: string,
    options?: QueryOptions,
  ): Promise<BasePreparedStatement> {
    this.#assertActive();
    return await this.#context.driver.prepare(sql, options);
  }

  async beginTransaction(
    _options?: TransactionOptions,
  ): Promise<BaseTransaction> {
    this.#assertActive();
    const name = this.#context.savepointName();
    await this.#context.control(`SAVEPOINT ${name}`);
    const child = new BaseTransaction(this.#context, name);
    this.#children.push(child);
    return child;
  }

  async transaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return await runTransaction(await this.beginTransaction(options), fn);
  }

  async commitTransaction(_options?: TransactionOptions): Promise<void> {
    this.#assertActive();
    await this.#context.control(
      this.#savepoint ? `RELEASE SAVEPOINT ${this.#savepoint}` : "COMMIT",
    );
    await this.#end();
  }

  async rollbackTransaction(_options?: TransactionOptions): Promise<void> {
    this.#assertActive();
    try {
      if (this.#savepoint) {
        await this.#context.control(`ROLLBACK TO SAVEPOINT ${this.#savepoint}`);
        await this.#context.control(`RELEASE SAVEPOINT ${this.#savepoint}`);
      } else {
        await this.#context.control("ROLLBACK");
      }
    } finally {
      await this.#end();
    }
  }

  async createSavepoint(
    name?: string,
    _options?: TransactionOptions,
  ): Promise<void> {
    this.#assertActive();
    name ??= this.#context.savepointName();
    if (!IDENTIFIER.test(name)) {
      throw new TransactionError(`Invalid savepoint name: ${name}`);
    }
    await this.#context.control(`SAVEPOINT ${name}`);
    this.#savepoints.push(name);
  }

  async releaseSavepoint(
    name?: string,
    _options?: TransactionOptions,
  ): Promise<void> {
    this.#assertActive();
    name ??= this.#savepoints.at(-1);
    if (name === undefined) {
      throw new TransactionError("There is no savepoint to release");
    }
    if (!IDENTIFIER.test(name)) {
      throw new TransactionError(`Invalid savepoint name: ${name}`);
    }
    await this.#context.control(`RELEASE SAVEPOINT ${name}`);
    // Releasing a savepoint also releases the savepoints created after it.
    const index = this.#savepoints.lastIndexOf(name);
    if (index !== -1) this.#savepoints.splice(index);
  }

  #invalidate(): void {
    this.#active = false;
    for (const child of this.#children) child.#invalidate();
  }

  static {
    addEndCallback = (tx, callback) => tx.#onEnd.push(callback);
    invalidate = (tx) => tx.#invalidate();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.#active) await this.rollbackTransaction();
  }
}

/**
 * The base of the SQL drivers. It implements the parts of the
 * {@linkcode Driver} specification that are the same for every database:
 * option merging, value transforms, abort checks, error wrapping, events,
 * prepared statement and transaction (savepoint) bookkeeping.
 *
 * Implementations provide the database specific primitives.
 *
 * @template IOptions the driver options
 */
export abstract class BaseDriver<IOptions extends Options = Options>
  implements Driver<IOptions> {
  readonly #connectionUrl: string | URL;
  readonly #options: IOptions;
  readonly eventTarget: DriverEventTarget = new DriverEventTarget();
  readonly #dispatched = new WeakSet<DatabaseError>();
  #transaction?: BaseTransaction;
  #savepointId = 0;

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

  /** Whether the driver is in an active transaction */
  get inTransaction(): boolean {
    return this.#transaction?.inTransaction ?? false;
  }

  abstract get connected(): boolean;

  /** Open the database connection */
  protected abstract connectDriver(): Promise<void>;
  /** Close the database connection */
  protected abstract closeDriver(): Promise<void>;
  /** Check that the database connection is alive */
  protected abstract pingDriver(): Promise<void>;
  /** Execute a single statement */
  protected abstract executeDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<number | undefined>;
  /** Query a single statement, streaming the rows */
  protected abstract queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): AsyncIterable<Row>;
  /** Prepare a statement */
  protected abstract prepareDriver(
    sql: string,
    options: QueryOptions,
  ): Promise<StatementHandle>;

  /** The statement that begins a transaction */
  protected beginStatement(_options: TransactionOptions): string {
    return "BEGIN";
  }

  #assertConnected(): void {
    if (!this.connected) {
      throw new ConnectionError("Driver is not connected");
    }
  }

  #error(
    error: unknown,
    ErrorClass: new (message: string) => DatabaseError,
    signal?: AbortSignal,
  ): unknown {
    if (signal?.aborted && error === signal.reason) return error;
    const wrapped = wrapError(error, ErrorClass);
    if (!this.#dispatched.has(wrapped)) {
      this.#dispatched.add(wrapped);
      this.eventTarget.dispatchEvent(
        new DriverEvent("error", { detail: { client: this, error: wrapped } }),
      );
    }
    return wrapped;
  }

  async #guard<T>(
    options: QueryOptions,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw this.#error(error, QueryError, options.signal);
    }
  }

  #call(
    params: QueryParameters | undefined,
    options: QueryOptions | undefined,
  ): { params: DriverParameters | undefined; options: QueryOptions } {
    this.#assertConnected();
    const merged = { ...this.#options.queryOptions, ...options };
    merged.signal?.throwIfAborted();
    return {
      params: transformParams(params, merged.transformInput),
      options: merged,
    };
  }

  async *#rows(
    source: AsyncIterable<Row>,
    options: QueryOptions,
  ): AsyncGenerator<Row> {
    const transform = options.transformOutput;
    try {
      for await (const row of source) {
        options.signal?.throwIfAborted();
        yield transform ? { ...row, values: row.values.map(transform) } : row;
      }
    } catch (error) {
      throw this.#error(error, QueryError, options.signal);
    }
  }

  async #execute(
    params: QueryParameters | undefined,
    options: QueryOptions | undefined,
    fn: (
      params: DriverParameters | undefined,
      options: QueryOptions,
    ) => Promise<number | undefined>,
  ): Promise<number | undefined> {
    const call = this.#call(params, options);
    return await this.#guard(call.options, () => fn(call.params, call.options));
  }

  async #query(
    params: QueryParameters | undefined,
    options: QueryOptions | undefined,
    fn: (
      params: DriverParameters | undefined,
      options: QueryOptions,
    ) => AsyncIterable<Row>,
  ): Promise<ResultIterableContext> {
    const call = this.#call(params, options);
    return await this.#guard(
      call.options,
      () =>
        createResultIterableContext(
          this.#rows(fn(call.params, call.options), call.options),
        ),
    );
  }

  async #control(sql: string): Promise<void> {
    this.#assertConnected();
    try {
      await this.executeDriver(sql, undefined, {});
    } catch (error) {
      throw this.#error(error, TransactionError);
    }
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    try {
      await this.connectDriver();
    } catch (error) {
      throw this.#error(error, ConnectionError);
    }
    this.eventTarget.dispatchEvent(
      new DriverEvent("connect", { detail: { client: this } }),
    );
  }

  async close(): Promise<void> {
    if (!this.connected) return;
    this.eventTarget.dispatchEvent(
      new DriverEvent("close", { detail: { client: this } }),
    );
    if (this.#transaction) invalidate(this.#transaction);
    this.#transaction = undefined;
    try {
      await this.closeDriver();
    } catch (error) {
      throw this.#error(error, ConnectionError);
    }
  }

  async ping(): Promise<void> {
    this.#assertConnected();
    try {
      await this.pingDriver();
    } catch (error) {
      throw this.#error(error, ConnectionError);
    }
  }

  execute(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<number | undefined> {
    return this.#execute(
      params,
      options,
      (params, options) => this.executeDriver(sql, params, options),
    );
  }

  query(
    sql: string,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ResultIterableContext> {
    return this.#query(
      params,
      options,
      (params, options) => this.queryDriver(sql, params, options),
    );
  }

  async prepare(
    sql: string,
    options?: QueryOptions,
  ): Promise<BasePreparedStatement> {
    this.#assertConnected();
    const base = { ...this.#options.queryOptions, ...options };
    const handle = await this.#guard(base, () => this.prepareDriver(sql, base));
    return new BasePreparedStatement(sql, {
      execute: (params, options) =>
        this.#execute(
          params,
          { ...base, ...options },
          (params, options) => handle.execute(params, options),
        ),
      query: (params, options) =>
        this.#query(
          params,
          { ...base, ...options },
          (params, options) => handle.query(params, options),
        ),
      deallocate: () =>
        this.connected
          ? this.#guard(base, () => handle.deallocate())
          : Promise.resolve(),
    });
  }

  async beginTransaction(
    options?: TransactionOptions,
  ): Promise<BaseTransaction> {
    if (this.#transaction?.inTransaction) {
      return await this.#transaction.beginTransaction(options);
    }
    this.#assertConnected();
    let statement: string;
    try {
      statement = this.beginStatement({
        ...this.#options.transactionOptions,
        ...options,
      });
    } catch (error) {
      throw this.#error(error, TransactionError);
    }
    await this.#control(statement);
    const tx = new BaseTransaction({
      driver: this,
      control: (sql) => this.#control(sql),
      savepointName: () => `sp_${++this.#savepointId}`,
    });
    addEndCallback(tx, () => {
      if (this.#transaction === tx) this.#transaction = undefined;
    });
    this.#transaction = tx;
    return tx;
  }

  async transaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return await runTransaction(await this.beginTransaction(options), fn);
  }

  async #reset(): Promise<void> {
    if (this.#transaction?.inTransaction) {
      await this.#transaction.rollbackTransaction();
    }
  }

  static {
    reset = (driver) => driver.#reset();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.close();
  }
}

/**
 * Register a callback that runs once the transaction has ended, after it is
 * committed or rolled back. Callbacks run in the order they are registered,
 * and the commit or rollback resolves after they have run.
 *
 * Clients use this to release the pooled connection held by a transaction.
 *
 * @param tx the transaction
 * @param callback the callback
 */
export function onTransactionEnd(
  tx: BaseTransaction,
  callback: Callback,
): void {
  addEndCallback(tx, callback);
}

/**
 * Register a callback that runs once the prepared statement is deallocated.
 * Callbacks run in the order they are registered, and the deallocation
 * resolves after they have run.
 *
 * Clients use this to release the pooled connection held by a prepared
 * statement.
 *
 * @param stmt the prepared statement
 * @param callback the callback
 */
export function onStatementDeallocate(
  stmt: BasePreparedStatement,
  callback: Callback,
): void {
  addDeallocateCallback(stmt, callback);
}

/**
 * Reset a driver so that its connection can be reused, by rolling back its
 * active transaction, if any.
 *
 * Clients use this when a connection is released back to the pool.
 *
 * @param driver the driver
 */
export function resetDriver(driver: BaseDriver): Promise<void> {
  return reset(driver);
}
