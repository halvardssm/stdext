import type {
  PreparedStatement,
  Transaction,
  Transactionable,
  TransactionOptions,
} from "./core.ts";
import type {
  Driver,
  DriverConnectionOptions,
  DriverParameterType,
  DriverQueryMeta,
  DriverQueryOptions,
  DriverQueryValues,
} from "./driver.ts";
import type { Eventable, SqlEventTarget } from "./events.ts";

/**
 * Client
 *
 * This represents a database client. When you need a single connection
 * to the database, you will in most cases use this interface.
 */
export interface Client<
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
  IEventTarget extends SqlEventTarget = SqlEventTarget,
> extends
  Pick<
    Driver<
      IConnectionOptions,
      IQueryOptions,
      IParameterType,
      IQueryValues,
      IQueryMeta
    >,
    "close" | "connect" | "connected"
  >,
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
  >,
  Eventable<IEventTarget>,
  AsyncDisposable {
}
