import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type {
  SqlPreparedStatement,
  SqlQueryOptions,
  SqlTransaction,
  SqlTransactionable,
  SqlTransactionOptions,
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

/**
 * SqlClientPoolOptions
 *
 * This represents the options for a connection pool.
 */
export interface SqlClientPoolOptions extends SqlConnectionOptions {
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

/**
 * SqlPoolClient
 *
 * This represents a connection to a database from a pool.
 * When a user wants to use a connection from a pool,
 * they should use a class implementing this interface.
 */
export interface SqlPoolClient<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  Connection extends SqlConnection<ConnectionOptions> = SqlConnection<
    ConnectionOptions
  >,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
  Prepared extends SqlPreparedStatement<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection
  > = SqlPreparedStatement<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    Prepared,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    Prepared,
    TransactionOptions
  >,
  PoolClientOptions extends SqlPoolClientOptions = SqlPoolClientOptions,
> extends
  SqlTransactionable<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    Prepared,
    TransactionOptions,
    Transaction
  > {
  /**
   * The options used to create the pool client
   */
  readonly options:
    & ConnectionOptions
    & QueryOptions
    & PoolClientOptions;
  /**
   * Whether the pool client is disposed and should not be available anymore
   */
  disposed: boolean;
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
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
  Connection extends SqlConnection<
    ConnectionOptions,
    ParameterType,
    QueryOptions
  > = SqlConnection<
    ConnectionOptions,
    ParameterType,
    QueryOptions
  >,
  Prepared extends SqlPreparedStatement<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection
  > = SqlPreparedStatement<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    Prepared,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    Prepared,
    TransactionOptions
  >,
  PoolClient extends SqlPoolClient<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    Prepared,
    TransactionOptions,
    Transaction
  > = SqlPoolClient<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    Prepared,
    TransactionOptions,
    Transaction
  >,
  EventTarget extends SqlEventTarget = SqlEventTarget,
> extends
  SqlEventable<EventTarget>,
  Omit<
    SqlConnection<
      ConnectionOptions
    >,
    "execute" | "queryMany" | "queryManyArray"
  > {
  readonly options:
    & ConnectionOptions
    & QueryOptions
    & SqlClientPoolOptions;

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
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
  Connection extends SqlConnection<
    ConnectionOptions,
    ParameterType,
    QueryOptions
  > = SqlConnection<
    ConnectionOptions,
    ParameterType,
    QueryOptions
  >,
  PreparedStatement extends SqlPreparedStatement<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection
  > = SqlPreparedStatement<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    PreparedStatement,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    PreparedStatement,
    TransactionOptions
  >,
  PoolClient extends SqlPoolClient<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    PreparedStatement,
    TransactionOptions,
    Transaction
  > = SqlPoolClient<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    PreparedStatement,
    TransactionOptions,
    Transaction
  >,
  EventTarget extends SqlEventTarget = SqlEventTarget,
> {
  new (
    connectionUrl: string | URL,
    options?: ConnectionOptions & QueryOptions,
  ): SqlClientPool<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction,
    PoolClient,
    EventTarget
  >;
}
