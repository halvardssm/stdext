import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type {
  SqlClientQueriable,
  SqlConnectableBase,
  SqlPreparedStatement,
  SqlQueryOptions,
  SqlTransaction,
  SqlTransactionOptions,
} from "./core.ts";
import type {
  DeferredStack,
  DeferredStackOptions,
} from "../collections/deferred_stack.ts";
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
export interface SqlClientPoolOptions
  extends SqlConnectionOptions, DeferredStackOptions<SqlConnection> {
  /**
   * Whether to lazily initialize connections.
   *
   * This means that connections will only be created
   * if there are no idle connections available when
   * acquiring a connection, and max pool size has not been reached.
   */
  lazyInitialization?: boolean;
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
    Connection,
    ParameterType,
    QueryOptions
  > = SqlPreparedStatement<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    TransactionOptions
  >,
  PoolClientOptions extends SqlPoolClientOptions = SqlPoolClientOptions,
> extends
  SqlConnectableBase<Connection>,
  SqlClientQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
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
    & TransactionOptions
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
    Connection,
    ParameterType,
    QueryOptions
  > = SqlPreparedStatement<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransaction<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    TransactionOptions
  > = SqlTransaction<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
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
  readonly options: ConnectionOptions & QueryOptions & TransactionOptions;

  /**
   * The deferred stack of connections
   */
  deferredStack: DeferredStack<Connection>;

  /**
   * Acquire a connection from the pool
   */
  acquire(): Promise<PoolClient>;
}
