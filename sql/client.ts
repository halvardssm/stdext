import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type {
  SqlPreparable,
  SqlPreparedQueriable,
  SqlQueriable,
  SqlQueryOptions,
  SqlTransactionable,
  SqlTransactionOptions,
  SqlTransactionQueriable,
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
  SqlConnection<ConnectionOptions>,
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
  >,
  SqlEventable<EventTarget> {
}
