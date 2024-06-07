import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type {
  SqlClientQueriable,
  SqlPreparedStatement,
  SqlQueriable,
  SqlQueryOptions,
  SqlTransaction,
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
> extends
  SqlConnection<ConnectionOptions, ParameterType, QueryOptions>,
  SqlQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  >,
  SqlClientQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions,
    Prepared,
    TransactionOptions,
    Transaction
  >,
  SqlEventable<EventTarget> {
  options: ConnectionOptions & QueryOptions & TransactionOptions;
}
