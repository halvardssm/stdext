import type {
  Driver,
  DriverConnectionOptions,
  DriverParameterType,
  DriverQueryMeta,
  DriverQueryOptions,
  DriverQueryValues,
} from "./driver.ts";
import type {
  SqlPreparedStatement,
  SqlTransaction,
  SqlTransactionable,
  SqlTransactionOptions,
  TransactionInternalOptions,
} from "./core.ts";
import type { SqlEventable, SqlEventTarget } from "./events.ts";

/**
 * SqlPoolClientOptions
 *
 * This represents the options for a pool client.
 */
export interface SqlPoolClientOptions {
  /**
   * The function to call when releasing the connection.
   */
  releaseFn?: () => Promise<void>;
}

export interface PoolClientInternalOptions<
  ConnectionOptions extends DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions,
  TransactionOptions extends SqlTransactionOptions,
  PoolClientOptions extends SqlPoolClientOptions,
> extends
  TransactionInternalOptions<
    ConnectionOptions,
    QueryOptions,
    TransactionOptions
  > {
  poolClientOptions: PoolClientOptions;
}

/**
 * SqlClientPoolOptions
 *
 * This represents the options for a connection pool.
 */
export interface SqlClientPoolOptions {
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
  ConnectionOptions extends DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions,
  TransactionOptions extends SqlTransactionOptions,
  PoolClientOptions extends SqlPoolClientOptions,
  ClientPoolOptions extends SqlClientPoolOptions,
> extends
  PoolClientInternalOptions<
    ConnectionOptions,
    QueryOptions,
    TransactionOptions,
    PoolClientOptions
  > {
  clientPoolOptions: ClientPoolOptions;
}

/**
 * SqlPoolClient
 *
 * This represents a connection to a database from a pool.
 * When a user wants to use a connection from a pool,
 * they should use a class implementing this interface.
 */
export interface SqlPoolClient<
  ConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions = DriverQueryOptions,
  ParameterType extends DriverParameterType = DriverParameterType,
  QueryValues extends DriverQueryValues = DriverQueryValues,
  QueryMeta extends DriverQueryMeta = DriverQueryMeta,
  Connection extends Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  > = Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  >,
  PreparedStatement extends SqlPreparedStatement<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  > = SqlPreparedStatement<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions
  >,
  PoolClientOptions extends SqlPoolClientOptions = SqlPoolClientOptions,
> extends
  SqlTransactionable<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction
  > {
  /**
   * The options used to create the pool client
   */
  readonly options: PoolClientInternalOptions<
    ConnectionOptions,
    QueryOptions,
    TransactionOptions,
    PoolClientOptions
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
 * SqlClientPool
 *
 * This represents a pool of connections to a database.
 * When a user wants to use a pool of connections to the database,
 * they should use a class implementing this interface.
 */
export interface SqlClientPool<
  ConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions = DriverQueryOptions,
  ParameterType extends DriverParameterType = DriverParameterType,
  QueryValues extends DriverQueryValues = DriverQueryValues,
  QueryMeta extends DriverQueryMeta = DriverQueryMeta,
  Connection extends Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  > = Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  >,
  PreparedStatement extends SqlPreparedStatement<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  > = SqlPreparedStatement<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions
  >,
  PoolClientOptions extends SqlPoolClientOptions = SqlPoolClientOptions,
  PoolClient extends SqlPoolClient<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction,
    PoolClientOptions
  > = SqlPoolClient<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction,
    PoolClientOptions
  >,
  ClientPoolOptions extends SqlClientPoolOptions = SqlClientPoolOptions,
  EventTarget extends SqlEventTarget = SqlEventTarget,
> extends
  SqlEventable<EventTarget>,
  Omit<
    Driver<
      ConnectionOptions
    >,
    "query" | "ping"
  > {
  readonly options: ClientPoolInternalOptions<
    ConnectionOptions,
    QueryOptions,
    TransactionOptions,
    PoolClientOptions,
    ClientPoolOptions
  >;

  /**
   * Acquire a connection from the pool
   */
  acquire(): Promise<PoolClient>;
}

/**
 * SqlClientPoolConstructor
 *
 * The constructor for the SqlClientPool interface.
 */
export interface SqlClientPoolConstructor<
  ConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions = DriverQueryOptions,
  ParameterType extends DriverParameterType = DriverParameterType,
  QueryValues extends DriverQueryValues = DriverQueryValues,
  QueryMeta extends DriverQueryMeta = DriverQueryMeta,
  Connection extends Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  > = Driver<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta
  >,
  PreparedStatement extends SqlPreparedStatement<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  > = SqlPreparedStatement<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions
  >,
  PoolClientOptions extends SqlPoolClientOptions = SqlPoolClientOptions,
  PoolClient extends SqlPoolClient<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction,
    PoolClientOptions
  > = SqlPoolClient<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction,
    PoolClientOptions
  >,
  ClientPoolOptions extends SqlClientPoolOptions = SqlClientPoolOptions,
  EventTarget extends SqlEventTarget = SqlEventTarget,
> {
  new (
    connectionUrl: string | URL,
    options?: ConnectionOptions & QueryOptions,
  ): SqlClientPool<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction,
    PoolClientOptions,
    PoolClient,
    ClientPoolOptions,
    EventTarget
  >;
}
