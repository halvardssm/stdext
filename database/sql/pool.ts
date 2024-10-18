import type {
  Driver,
  DriverConnectionOptions,
  DriverParameterType,
  DriverQueryMeta,
  DriverQueryOptions,
  DriverQueryValues,
} from "./driver.ts";
import type {
  PreparedStatement,
  Transaction,
  Transactionable,
  TransactionInternalOptions,
  TransactionOptions,
} from "./core.ts";
import type { Eventable, SqlEventTarget } from "./events.ts";

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

export interface PoolClientInternalOptions<
  IConnectionOptions extends DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions,
  ITransactionOptions extends TransactionOptions,
  IPoolClientOptions extends PoolClientOptions,
> extends
  TransactionInternalOptions<
    IConnectionOptions,
    IQueryOptions,
    ITransactionOptions
  > {
  poolClientOptions: IPoolClientOptions;
}

/**
 * ClientPoolOptions
 *
 * This represents the options for a connection pool.
 */
export interface ClientPoolOptions {
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

export interface ClientPoolInternalOptions<
  IConnectionOptions extends DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions,
  ITransactionOptions extends TransactionOptions,
  IPoolClientOptions extends PoolClientOptions,
  IClientPoolOptions extends ClientPoolOptions,
> extends
  PoolClientInternalOptions<
    IConnectionOptions,
    IQueryOptions,
    ITransactionOptions,
    IPoolClientOptions
  > {
  clientPoolOptions: IClientPoolOptions;
}

/**
 * PoolClient
 *
 * This represents a connection to a database from a pool.
 * When a user wants to use a connection from a pool,
 * they should use a class implementing this interface.
 */
export interface PoolClient<
  IConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  IParameterType extends DriverParameterType = DriverParameterType,
  IQueryValues extends DriverQueryValues = DriverQueryValues,
  IQueryMeta extends DriverQueryMeta = DriverQueryMeta,
  IDriver extends Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  > = Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  >,
  IPreparedStatement extends PreparedStatement<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  > = PreparedStatement<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  >,
  ITransactionOptions extends TransactionOptions = TransactionOptions,
  ITransaction extends Transaction<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions
  > = Transaction<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions
  >,
  IPoolClientOptions extends PoolClientOptions = PoolClientOptions,
> extends
  Transactionable<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions,
    ITransaction
  > {
  /**
   * The options used to create the pool client
   */
  readonly options: PoolClientInternalOptions<
    IConnectionOptions,
    IQueryOptions,
    ITransactionOptions,
    IPoolClientOptions
  >;

  /**
   * Whether the pool client is disposed and should not be available anymore
   */
  readonly disposed: boolean;
  /**
   * Release the connection to the pool
   */
  release(): Promise<void>;
}

/**
 * ClientPool
 *
 * This represents a pool of connections to a database.
 * When a user wants to use a pool of connections to the database,
 * they should use a class implementing this interface.
 */
export interface ClientPool<
  IConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  IParameterType extends DriverParameterType = DriverParameterType,
  IQueryValues extends DriverQueryValues = DriverQueryValues,
  IQueryMeta extends DriverQueryMeta = DriverQueryMeta,
  IDriver extends Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  > = Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  >,
  IPreparedStatement extends PreparedStatement<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  > = PreparedStatement<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  >,
  ITransactionOptions extends TransactionOptions = TransactionOptions,
  ITransaction extends Transaction<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions
  > = Transaction<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions
  >,
  IPoolClientOptions extends PoolClientOptions = PoolClientOptions,
  IPoolClient extends PoolClient<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions,
    ITransaction,
    IPoolClientOptions
  > = PoolClient<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions,
    ITransaction,
    IPoolClientOptions
  >,
  IClientPoolOptions extends ClientPoolOptions = ClientPoolOptions,
  IEventTarget extends SqlEventTarget = SqlEventTarget,
> extends
  Eventable<IEventTarget>,
  Omit<
    Driver<
      IConnectionOptions
    >,
    "query" | "ping"
  > {
  readonly options: ClientPoolInternalOptions<
    IConnectionOptions,
    IQueryOptions,
    ITransactionOptions,
    IPoolClientOptions,
    IClientPoolOptions
  >;

  /**
   * Acquire a connection from the pool
   */
  acquire(): Promise<IPoolClient>;
}

/**
 * ClientPoolConstructor
 *
 * The constructor for the ClientPool interface.
 */
export interface ClientPoolConstructor<
  IConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  IParameterType extends DriverParameterType = DriverParameterType,
  IQueryValues extends DriverQueryValues = DriverQueryValues,
  IQueryMeta extends DriverQueryMeta = DriverQueryMeta,
  IDriver extends Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  > = Driver<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta
  >,
  IPreparedStatement extends PreparedStatement<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  > = PreparedStatement<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  >,
  ITransactionOptions extends TransactionOptions = TransactionOptions,
  ITransaction extends Transaction<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions
  > = Transaction<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions
  >,
  IPoolClientOptions extends PoolClientOptions = PoolClientOptions,
  IPoolClient extends PoolClient<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions,
    ITransaction,
    IPoolClientOptions
  > = PoolClient<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions,
    ITransaction,
    IPoolClientOptions
  >,
  IClientPoolOptions extends ClientPoolOptions = ClientPoolOptions,
  IEventTarget extends SqlEventTarget = SqlEventTarget,
> {
  new (
    connectionUrl: string | URL,
    options?: IConnectionOptions & IQueryOptions,
  ): ClientPool<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement,
    ITransactionOptions,
    ITransaction,
    IPoolClientOptions,
    IPoolClient,
    IClientPoolOptions,
    IEventTarget
  >;
}
