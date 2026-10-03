import {
  ConnectionError,
  createResultIterableContext,
  DatabaseError,
  type Driver,
  DriverEvent,
  DriverEventTarget,
  type ExecuteResult,
  type Options,
  type PreparedStatement,
  QueryError,
  type QueryOptions,
  type QueryParameters,
  renderStatement,
  type ResultIterableContext,
  type ResultSource,
  type Statement,
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
 * The result of a query, as returned by a driver implementation: the columns,
 * known before the first row, and the lazily read rows.
 */
export type DriverResult = ResultSource;

/**
 * A database specific prepared statement, as created by
 * {@linkcode BaseDriver.prepareDriver}.
 */
export interface StatementHandle {
  /** Execute the statement */
  execute(
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<ExecuteResult>;
  /** Query the statement */
  query(
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<DriverResult>;
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
    if (tx.inTransaction) await tx.commit();
    return result;
  } catch (error) {
    if (tx.inTransaction) {
      // The original error is more relevant than a failing rollback.
      await tx.rollback().catch(() => {});
    }
    throw error;
  }
}

/**
 * Create a lazy result that delegates to the result of another object, such
 * as the driver of a transaction or a pool client. The delegate is only
 * created when the result is started, so that checks, such as whether a
 * transaction is still active, run when the query runs. The `done` callback
 * runs once the delegated result is read or disposed.
 *
 * @param start creates the delegated result, and optionally a callback that
 * runs when it is done
 * @returns the result
 */
export function delegateResult(
  start: () => Promise<{ result: ResultIterableContext; done?: Callback }>,
): ResultIterableContext {
  return createResultIterableContext(async () => {
    const { result, done } = await start();
    const finish = async () => {
      await result[Symbol.asyncDispose]();
      await done?.();
    };
    let columns: string[];
    try {
      columns = await result.columns();
    } catch (error) {
      await finish();
      throw error;
    }
    async function* rows(): AsyncGenerator<unknown[]> {
      try {
        for await (const row of result) yield row.values;
      } finally {
        await finish();
      }
    }
    return { columns, rows: rows() };
  });
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
  ): Promise<ExecuteResult>;
  /** Query the statement */
  query(
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext;
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
  ): Promise<ExecuteResult> {
    this.#assertUsable();
    return await this.#calls.execute(params, options);
  }

  query(
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext {
    return delegateResult(() => {
      this.#assertUsable();
      return Promise.resolve({ result: this.#calls.query(params, options) });
    });
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
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult> {
    this.#assertActive();
    return await this.#context.driver.execute(sql, params, options);
  }

  query(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext {
    return delegateResult(() => {
      this.#assertActive();
      return Promise.resolve({
        result: this.#context.driver.query(sql, params, options),
      });
    });
  }

  async executeScript(sql: string, options?: QueryOptions): Promise<void> {
    this.#assertActive();
    await this.#context.driver.executeScript(sql, options);
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

  async commit(_options?: TransactionOptions): Promise<void> {
    this.#assertActive();
    await this.#context.control(
      this.#savepoint ? `RELEASE SAVEPOINT ${this.#savepoint}` : "COMMIT",
    );
    await this.#end();
  }

  async rollback(_options?: TransactionOptions): Promise<void> {
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
    if (this.#active) await this.rollback();
  }
}

interface Call {
  sql: string;
  params: DriverParameters | undefined;
  options: QueryOptions;
}

/**
 * The base of the SQL drivers. It implements the parts of the
 * {@linkcode Driver} specification that are the same for every database:
 * implicit connecting, connect timeouts, option merging, SQL templates, value
 * transforms, abort checks, error wrapping, events, lazy results, prepared
 * statement and transaction (savepoint) bookkeeping.
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
  #connecting?: Promise<void>;
  #closed = false;
  // Incremented on every connect, to detect prepared statements of a
  // previous connection.
  #generation = 0;

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

  /**
   * Open the database connection. When the signal aborts, because the
   * connect timeout passed, connecting should stop and reject.
   */
  protected abstract connectDriver(signal: AbortSignal): Promise<void>;
  /** Close the database connection */
  protected abstract closeDriver(): Promise<void>;
  /** Check that the database connection is alive */
  protected abstract pingDriver(): Promise<void>;
  /**
   * Execute a single statement. The affected rows are the rows inserted,
   * updated or deleted, `0` for other statements, or `undefined` if the
   * database does not report them.
   */
  protected abstract executeDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<ExecuteResult>;
  /** Query a single statement */
  protected abstract queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<DriverResult>;
  /** Execute a script of one or more statements, without parameters */
  protected abstract executeScriptDriver(
    sql: string,
    options: QueryOptions,
  ): Promise<void>;
  /** Prepare a statement */
  protected abstract prepareDriver(
    sql: string,
    options: QueryOptions,
  ): Promise<StatementHandle>;

  /**
   * The placeholder of the parameter at the zero-based index, used to render
   * SQL templates. Defaults to `?`.
   */
  protected placeholder(_index: number): string {
    return "?";
  }

  /** The statement that begins a transaction */
  protected beginStatement(_options: TransactionOptions): string {
    return "BEGIN";
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

  /**
   * Connect implicitly, unless the driver was closed. A transaction whose
   * connection was lost is rolled back by the database, so it is ended,
   * instead of running its statements on a new connection.
   */
  async #ensureConnected(): Promise<void> {
    if (this.connected) return;
    if (this.#transaction?.inTransaction) {
      invalidate(this.#transaction);
      this.#transaction = undefined;
      throw new ConnectionError(
        "The connection was lost, and the transaction was rolled back",
      );
    }
    if (this.#closed) throw new ConnectionError("Driver is closed");
    await this.connect();
  }

  #merge(options: QueryOptions | undefined): QueryOptions {
    return { ...this.#options.queryOptions, ...options };
  }

  async #call(
    statement: Statement,
    params: QueryParameters | undefined,
    merged: QueryOptions,
  ): Promise<Call> {
    merged.signal?.throwIfAborted();
    await this.#ensureConnected();
    const rendered = renderStatement(
      statement,
      params,
      (index) => this.placeholder(index),
    );
    return {
      sql: rendered.sql,
      params: transformParams(rendered.params, merged.transformInput),
      options: merged,
    };
  }

  async *#rows(
    result: DriverResult,
    options: QueryOptions,
  ): AsyncGenerator<unknown[]> {
    const transform = options.transformOutput;
    try {
      for await (const values of result.rows) {
        options.signal?.throwIfAborted();
        yield transform ? values.map(transform) : values;
      }
    } catch (error) {
      throw this.#error(error, QueryError, options.signal);
    }
  }

  #result(
    options: QueryOptions,
    call: () => Promise<Call>,
    fn: (call: Call) => Promise<DriverResult>,
  ): ResultIterableContext {
    return createResultIterableContext(() =>
      this.#guard(options, async () => {
        const resolved = await call();
        const result = await fn(resolved);
        return {
          columns: result.columns,
          rows: this.#rows(result, resolved.options),
        };
      })
    );
  }

  async #control(sql: string): Promise<void> {
    try {
      await this.#ensureConnected();
      await this.executeDriver(sql, undefined, {});
    } catch (error) {
      throw this.#error(error, TransactionError);
    }
  }

  async #open(): Promise<void> {
    const timeout = this.#options.connectionOptions?.connectTimeout;
    if (timeout !== undefined && !(timeout >= 0)) {
      throw new RangeError(
        `Cannot connect as 'connectTimeout' must be a non-negative number: received ${timeout}`,
      );
    }
    const controller = new AbortController();
    const timer = timeout === undefined ? undefined : setTimeout(
      () =>
        controller.abort(
          new ConnectionError(`Timed out after ${timeout} ms connecting`),
        ),
      timeout,
    );
    try {
      const connecting = this.connectDriver(controller.signal);
      const aborted = new Promise<never>((_, reject) =>
        controller.signal.addEventListener(
          "abort",
          () => reject(controller.signal.reason),
          { once: true },
        )
      );
      try {
        await Promise.race([connecting, aborted]);
      } catch (error) {
        // A connection that is established after the timeout is closed.
        connecting.then(() => this.closeDriver()).catch(() => {});
        throw error;
      }
    } catch (error) {
      throw this.#error(error, ConnectionError);
    } finally {
      clearTimeout(timer);
    }
    this.#closed = false;
    this.#generation++;
    this.eventTarget.dispatchEvent(
      new DriverEvent("connect", { detail: { client: this } }),
    );
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    // Concurrent calls share the same attempt.
    this.#connecting ??= this.#open().finally(() => {
      this.#connecting = undefined;
    });
    await this.#connecting;
  }

  async close(): Promise<void> {
    this.#closed = true;
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
    try {
      await this.#ensureConnected();
      await this.pingDriver();
    } catch (error) {
      throw this.#error(error, ConnectionError);
    }
  }

  async execute(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult> {
    const merged = this.#merge(options);
    return await this.#guard(merged, async () => {
      const call = await this.#call(sql, params, merged);
      return await this.executeDriver(call.sql, call.params, call.options);
    });
  }

  query(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext {
    const merged = this.#merge(options);
    return this.#result(
      merged,
      () => this.#call(sql, params, merged),
      (call) => this.queryDriver(call.sql, call.params, call.options),
    );
  }

  async executeScript(sql: string, options?: QueryOptions): Promise<void> {
    const merged = this.#merge(options);
    await this.#guard(merged, async () => {
      merged.signal?.throwIfAborted();
      await this.#ensureConnected();
      await this.executeScriptDriver(sql, merged);
    });
  }

  async prepare(
    sql: string,
    options?: QueryOptions,
  ): Promise<BasePreparedStatement> {
    const base = this.#merge(options);
    const handle = await this.#guard(base, async () => {
      await this.#ensureConnected();
      return await this.prepareDriver(sql, base);
    });
    const generation = this.#generation;
    // A prepared statement only exists on the connection it was prepared on.
    const call = async (
      params: QueryParameters | undefined,
      options: QueryOptions | undefined,
    ): Promise<Call> => {
      if (!this.connected || this.#generation !== generation) {
        throw new QueryError(
          "The prepared statement belongs to a closed connection",
        );
      }
      const merged = { ...base, ...options };
      merged.signal?.throwIfAborted();
      return {
        sql,
        params: transformParams(params, merged.transformInput),
        options: merged,
      };
    };
    return new BasePreparedStatement(sql, {
      execute: (params, options) =>
        this.#guard({ ...base, ...options }, async () => {
          const resolved = await call(params, options);
          return await handle.execute(resolved.params, resolved.options);
        }),
      query: (params, options) =>
        this.#result(
          { ...base, ...options },
          () => call(params, options),
          (resolved) => handle.query(resolved.params, resolved.options),
        ),
      deallocate: () =>
        this.connected && this.#generation === generation
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
      await this.#transaction.rollback();
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
