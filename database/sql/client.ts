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
 * SqlClient
 *
 * This represents a database client. When you need a single connection
 * to the database, you will in most cases use this interface.
 */
export interface SqlClient<
  EventTarget extends SqlEventTarget = SqlEventTarget,
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
  Connection extends SqlConnection<
    ConnectionOptions,
    ParameterType,
    QueryOptions
  > = SqlConnection<ConnectionOptions, ParameterType, QueryOptions>,
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
> extends
  Pick<
    SqlConnection<ConnectionOptions, ParameterType, QueryOptions>,
    "close" | "connect" | "connected"
  >,
  SqlTransactionable<
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction
  >,
  SqlEventable<EventTarget>,
  AsyncDisposable {
}

/**
 * SqlClientConstructor
 *
 * The constructor for the SqlClient interface.
 */
export interface SqlClientConstructor<
  EventTarget extends SqlEventTarget = SqlEventTarget,
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
  Connection extends SqlConnection<
    ConnectionOptions,
    ParameterType,
    QueryOptions
  > = SqlConnection<ConnectionOptions, ParameterType, QueryOptions>,
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
> {
  new (
    connectionUrl: string | URL,
    options?: ConnectionOptions & QueryOptions,
  ): SqlClient<
    EventTarget,
    ConnectionOptions,
    ParameterType,
    QueryOptions,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction
  >;
}
