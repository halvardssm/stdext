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
} from "./core.ts";
import type { SqlEventable, SqlEventTarget } from "./events.ts";

/**
 * SqlClient
 *
 * This represents a database client. When you need a single connection
 * to the database, you will in most cases use this interface.
 */
export interface SqlClient<
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
  EventTarget extends SqlEventTarget = SqlEventTarget,
> extends
  Pick<
    Driver<
      ConnectionOptions,
      QueryOptions,
      ParameterType,
      QueryValues,
      QueryMeta
    >,
    "close" | "connect" | "connected"
  >,
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
  Client extends SqlClient<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction
  > = SqlClient<
    ConnectionOptions,
    QueryOptions,
    ParameterType,
    QueryValues,
    QueryMeta,
    Connection,
    PreparedStatement,
    TransactionOptions,
    Transaction
  >,
> {
  new (
    connectionUrl: string | URL,
    options?: Client["options"],
  ): Client;
}
