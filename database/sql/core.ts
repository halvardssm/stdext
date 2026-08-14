import { ClientEventTarget, Eventable } from "./events.ts";

/**
 * ContextMetadata
 *
 * @template C the column array
 *
 * @example
 * ```ts
 * ContextMetadata<["id","name"]>
 * ```
 */
export type ContextMetadata<C extends string[] = string[]> = {
  columns: C;
};

/** */
export type ResultObject<
  V = Array<unknown>,
  R = Record<string, V[keyof V]>,
> = {
  values: V;
  toRecord: () => R;
};

export interface ResultIterableContext<
  V extends unknown[] = unknown[],
  M extends ContextMetadata = ContextMetadata,
  // @todo Figure out this type
  R = Record<M["columns"][number], V[number]>,
> extends AsyncIterable<ResultObject<V, R>> {
  toValues: () => Promise<V[]>;
  toRecords: () => Promise<R[]>;
  toRecord: (value: V) => R;
  metadata: M;
}

export interface Optionable<IOptions> {
  /**
   * Options for the object
   */
  get options(): IOptions;
}

/**
 * TransactionOptions
 *
 * Core transaction options
 * Used to type the options for the transaction methods
 */
export interface TransactionOptions {
  beginTransactionOptions?: Record<string, unknown>;
  commitTransactionOptions?: Record<string, unknown>;
  rollbackTransactionOptions?: Record<string, unknown>;
}

export interface TransactionOptionsWrapper<
  ITransactionOptions extends TransactionOptions = TransactionOptions,
> {
  transactionOptions: ITransactionOptions;
}

/**
 * ConnectionOptions
 *
 * The options that will be used when connecting to the database.
 */
export interface ConnectionOptions {
  /**
   * The connection URL
   */
  connectionUrl: URL;
}

export interface ConnectionOptionsWrapper<
  IConnectionOptions extends ConnectionOptions = ConnectionOptions,
> {
  connectionOptions: IConnectionOptions;
}

/**
 * Connectable
 *
 * Represents a connectable object
 */
export interface Connectable<
  IConnectionOptions extends ConnectionOptions = ConnectionOptions,
> extends
  AsyncDisposable,
  Optionable<ConnectionOptionsWrapper<IConnectionOptions>> {
  /**
   * Whether the connection is connected to the database
   */
  get connected(): boolean;

  /**
   * Create a connection to the database
   */
  connect(): Promise<void>;

  /**
   * Close the connection to the database
   */
  close(): Promise<void>;
}

/**
 * Pingable
 *
 * Represents an object able to ping a connection
 */
export interface Pingable {
  /**
   * Pings the database connection to check that it's alive
   *
   * Throws an error if connection is not alive
   */
  ping(): Promise<void>;
}

/**
 * QueryOptions
 *
 * Options to pass to the query methods.
 */
export interface QueryOptions {
  /**
   * A signal to abort the query.
   */
  signal?: AbortSignal;
  /**
   * Transforms the value that will be sent to the database
   */
  transformInput?: (value: unknown) => unknown;
  /**
   * Transforms the value received from the database
   */
  transformOutput?: (value: unknown) => unknown;
}

export interface QueryOptionsW<
  IQueryOptions extends QueryOptions = QueryOptions,
> {
  queryOptions: IQueryOptions;
}

/**
 * PreparedStatement
 *
 * Represents a prepared statement to be executed separately from creation.
 *
 * @template ConnectionOptions {@link ConnectionOptions}
 * @template QueryOptions {@link QueryOptions}
 */
export interface PreparedStatement<
  IQueryOptions extends QueryOptions = QueryOptions,
> extends AsyncDisposable, Optionable<QueryOptionsW<IQueryOptions>> {
  /**
   * The SQL statement
   */
  get sql(): string;

  /**
   * Whether the prepared statement has been deallocated or not.
   */
  get deallocated(): boolean;

  /**
   * Deallocate the prepared statement
   */
  deallocate(): Promise<void>;

  /**
   * Query the database with the prepared statement
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as object entries
   */
  query(
    params?: unknown,
    options?: IQueryOptions,
  ): Promise<ResultIterableContext>;
}

/**
 * Queriable
 *
 * Represents an object that can execute SQL queries.
 *
 * @template ConnectionOptions {@link ConnectionOptions}
 * @template QueryOptions {@link QueryOptions}
 */
export interface Queriable<
  IQueryOptions extends QueryOptions = QueryOptions,
> extends Optionable<QueryOptionsW<IQueryOptions>> {
  /**
   * Query the database
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query
   */
  query(
    sql: string,
    params?: unknown,
    options?: IQueryOptions,
  ): Promise<ResultIterableContext>;

  /**
   * Query the database using tagged template
   *
   * @returns the rows returned by the query
   */
  sql(
    strings: TemplateStringsArray,
    ...parameters: unknown[]
  ): Promise<ResultIterableContext>;
}

/**
 * Preparable
 *
 * Represents an object that can create a prepared statement.
 *
 * @template QueryOptions {@link QueryOptions}
 * @template PreparedStatement {@link PreparedStatement}
 */
export interface Preparable<
  IQueryOptions extends QueryOptions = QueryOptions,
  IPreparedStatement extends PreparedStatement = PreparedStatement,
> extends Optionable<QueryOptionsW<IQueryOptions>> {
  /**
   * Create a prepared statement that can be executed multiple times.
   * This is useful when you want to execute the same SQL statement multiple times with different parameters.
   *
   * @param sql the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns a prepared statement
   *
   * @example
   * ```ts
   * const stmt = db.prepare("SELECT * FROM table WHERE id = ?");
   *
   * for (let i = 0; i < 10; i++) {
   *   const row of stmt.query([i])
   *   console.log(row);
   * }
   * ```
   */
  prepare(sql: string, options?: IQueryOptions): Promise<IPreparedStatement>;
}

/**
 * Transaction
 *
 * Represents a transaction.
 *
 * @template ConnectionOptions {@link ConnectionOptions}
 * @template QueryOptions {@link QueryOptions}
 * @template TransactionOptions {@link TransactionOptions}
 */
export interface Transaction<
  ITransactionOptions extends TransactionOptions = TransactionOptions,
> extends Optionable<TransactionOptionsWrapper<ITransactionOptions>> {
  /**
   * Whether the connection is in an active transaction or not.
   */
  inTransaction: boolean;

  /**
   * Commit the transaction
   */
  commitTransaction(
    options?: ITransactionOptions["commitTransactionOptions"],
  ): Promise<void>;
  /**
   * Rollback the transaction
   */
  rollbackTransaction(
    options?: ITransactionOptions["rollbackTransactionOptions"],
  ): Promise<void>;
  /**
   * Create a save point
   *
   * @param name the name of the save point
   */
  createSavepoint(name?: string): Promise<void>;
  /**
   * Release a save point
   *
   * @param name the name of the save point
   */
  releaseSavepoint(name?: string): Promise<void>;
}

/**
 * Transactionable
 *
 * Represents an object that can create a transaction and a prepared statement.
 *
 * This interface is to be implemented by any class that supports creating a prepared statement.
 * A prepared statement should in most cases be unique to a connection,
 * and should not live after the related connection is closed.
 *
 * @template TransactionOptions {@link TransactionOptions}
 * @template Transaction {@link Transaction}
 */
export interface Transactionable<
  ITransactionOptions extends TransactionOptions = TransactionOptions,
  ITransaction extends Transaction = Transaction,
> extends Optionable<TransactionOptionsWrapper<ITransactionOptions>> {
  /**
   * Starts a transaction
   */
  beginTransaction(
    options?: ITransactionOptions["beginTransactionOptions"],
  ): Promise<ITransaction>;

  /**
   * Transaction wrapper
   *
   * Automatically begins a transaction, executes the callback function, and commits the transaction.
   *
   * If the callback function throws an error, the transaction will be rolled back and the error will be rethrown.
   * If the callback function returns successfully, the transaction will be committed.
   *
   * @param fn callback function to be executed within a transaction
   * @returns the result of the callback function
   */
  transaction<T>(fn: (t: ITransaction) => Promise<T>): Promise<T>;
}

/**
 * DriverConnection
 *
 * This represents a connection to a database.
 * When a user wants a single connection to the database,
 * they should use a class implementing or using this interface.
 *
 * The class implementing this interface should be able to connect to the database,
 * and have the following constructor arguments (if more options are needed, extend the ConnectionOptions):
 *  - connectionUrl: string|URL
 *  - connectionOptions?: ConnectionOptions;
 *
 * @template ConnectionOptions {@link ConnectionOptions}
 * @template DriverQueryOptions {@link DriverQueryOptions}
 */
export interface Driver<
  IOptions extends
    & ConnectionOptionsWrapper
    & QueryOptionsW
    & TransactionOptionsWrapper =
      & ConnectionOptionsWrapper
      & QueryOptionsW
      & TransactionOptionsWrapper,
> extends
  Connectable,
  Pingable,
  Queriable,
  Transactionable,
  Preparable,
  Eventable {
  /**
   * @inheritdoc
   */
  get options(): IOptions;
}

/**
 * The driver constructor
 */
export interface DriverConstructor {
  new (connectionUrl: string, options: object): Driver;
}

/**
 * DriverConnectable
 *
 * The base interface for everything that interracts with the connection like querying.
 *
 * @template Driver {@link Driver}
 */
export interface Driverable<IDriver extends Driver = Driver> {
  /**
   * The the database driver
   */
  get driver(): IDriver;
}

/**
 * PoolClientOptions
 *
 * This represents the options for a pool client.
 */
export interface PoolClientOptions {
  /**
   * The function to call when releasing the connection.
   */
  releaseFn?: () => Promise<void>;
}

export interface PoolClientOptionsW<
  IPoolClientOptions extends PoolClientOptions = PoolClientOptions,
> {
  poolClientOptions: IPoolClientOptions;
}

/**
 * PoolClient
 *
 * This represents a connection to a database from a pool.
 * When a user wants to use a connection from a pool,
 * they should use a class implementing this interface.
 */
export interface PoolClient<
  IOptions extends
    & ConnectionOptionsWrapper
    & QueryOptionsW
    & TransactionOptionsWrapper
    & PoolClientOptionsW =
      & ConnectionOptionsWrapper
      & QueryOptionsW
      & TransactionOptionsWrapper
      & PoolClientOptionsW,
> extends
  AsyncDisposable,
  Pick<Connectable, "connected">,
  Pingable,
  Queriable,
  Transactionable,
  Preparable,
  Driverable {
  /**
   * @inheritdoc
   */
  get options(): IOptions;

  /**
   * Whether the pool client is disposed and should not be available anymore
   */
  get disposed(): boolean;

  /**
   * Release the connection to the pool
   */
  release(): Promise<void>;
}

/**
 * ClientPoolOptions
 *
 * This represents the options for a connection pool.
 */
export interface PoolOptions {
  /**
   * Whether to lazily initialize connections.
   *
   * This means that connections will only be created
   * if there are no idle connections available when
   * acquiring a connection, and max pool size has not been reached.
   */
  lazyInitialization?: boolean;
  /**
   * The maximum stack size to be allowed.
   */
  maxSize?: number;
}

export interface PoolOptionsW<IPoolOptions extends PoolOptions = PoolOptions> {
  poolOptions: IPoolOptions;
}

export interface Poolable<
  IPoolOptions extends PoolOptions = PoolOptions,
  IPoolClient extends PoolClient = PoolClient,
> extends Optionable<PoolOptionsW<IPoolOptions>> {
  /**
   * Acquire a connection from the pool
   */
  acquire(): Promise<IPoolClient>;
}

/**
 * Client
 *
 * This represents a database client. When you need a single connection
 * to the database, you will in most cases use this interface.
 */
export interface Client<
  IOptions extends
    & ConnectionOptionsWrapper
    & QueryOptionsW
    & TransactionOptionsWrapper
    & PoolClientOptionsW
    & PoolOptionsW =
      & ConnectionOptionsWrapper
      & QueryOptionsW
      & TransactionOptionsWrapper
      & PoolClientOptionsW
      & PoolOptionsW,
> extends
  AsyncDisposable,
  Connectable,
  Pingable,
  Queriable,
  Transactionable,
  Preparable,
  Poolable,
  Eventable<ClientEventTarget> {
  /**
   * @inheritdoc
   */
  get options(): IOptions;
}
