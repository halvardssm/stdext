import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type {
  SqlConnectablePoolBase,
  SqlPoolable,
  SqlPreparable,
  SqlPreparedQueriable,
  SqlQueriable,
  SqlQueryOptions,
  SqlTransactionable,
  SqlTransactionOptions,
  SqlTransactionQueriable,
} from "./core.ts";
import type {
  DeferredStack as SqlDeferredStack,
  DeferredStackOptions,
} from "../collections/deferred_stack.ts";
import type { SqlEventable, SqlEventTarget } from "./events.ts";

/**
 * SqlClientPoolOptions
 *
 * This represents the options for a connection pool.
 */
export interface SqlClientPoolOptions
  extends SqlConnectionOptions, DeferredStackOptions {
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
  Prepared extends SqlPreparedQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  > = SqlPreparedQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransactionQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    TransactionOptions
  > = SqlTransactionQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    TransactionOptions
  >,
> extends
  SqlConnectablePoolBase<Connection>,
  SqlQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  >,
  SqlPreparable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    Prepared
  >,
  SqlTransactionable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    TransactionOptions,
    Transaction
  > {
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
  Connection extends SqlConnection<ConnectionOptions> = SqlConnection<
    ConnectionOptions
  >,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
  Prepared extends SqlPreparedQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  > = SqlPreparedQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  >,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
  Transaction extends SqlTransactionQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    TransactionOptions
  > = SqlTransactionQueriable<
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
  DeferredStack extends SqlDeferredStack<PoolClient> = SqlDeferredStack<
    PoolClient
  >,
  EventTarget extends SqlEventTarget = SqlEventTarget,
> extends
  SqlConnection<ConnectionOptions>,
  SqlPoolable<
    PoolClient,
    DeferredStack
  >,
  SqlEventable<EventTarget> {
}
