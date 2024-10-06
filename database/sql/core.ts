// deno-lint-ignore-file no-explicit-any
import type {
  Driver,
  DriverConnectable,
  DriverConnectionOptions,
  DriverInternalOptions,
  DriverParameterType,
  DriverQueryMeta,
  DriverQueryOptions,
  DriverQueryValues,
} from "./driver.ts";

/**
 * Row
 *
 * Row type for SQL queries, represented as an object entry.
 */
export type Row<T = unknown> = Record<string, T>;

/**
 * ArrayRow
 *
 * Row type for SQL queries, represented as an array entry.
 */
export type ArrayRow<T = unknown> = T[];

/**
 * TransactionOptions
 *
 * Core transaction options
 * Used to type the options for the transaction methods
 */
export type TransactionOptions = {
  beginTransactionOptions?: Record<string, unknown>;
  commitTransactionOptions?: Record<string, unknown>;
  rollbackTransactionOptions?: Record<string, unknown>;
};

/**
 * Internal Transaction options
 */
export interface TransactionInternalOptions<
  IConnectionOptions extends DriverConnectionOptions,
  IQueryOptions extends DriverQueryOptions,
  ITransactionOptions extends TransactionOptions,
> extends DriverInternalOptions<IConnectionOptions, IQueryOptions> {
  transactionOptions: ITransactionOptions;
}

/**
 * PreparedQueriable
 *
 * Represents a prepared statement to be executed separately from creation.
 */
export interface PreparedStatement<
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
> extends
  DriverConnectable<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  > {
  readonly options: DriverInternalOptions<IConnectionOptions, IQueryOptions>;

  /**
   * The SQL statement
   */
  readonly sql: string;

  /**
   * Whether the prepared statement has been deallocated or not.
   */
  readonly deallocated: boolean;

  /**
   * Deallocate the prepared statement
   */
  deallocate(): Promise<void>;

  /**
   * Executes the prepared statement
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the number of affected rows if any
   */
  execute(
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<number | undefined>;
  /**
   * Query the database with the prepared statement
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as object entries
   */
  query<T extends Row<any> = Row<any>>(
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T[]>;
  /**
   * Query the database with the prepared statement, and return at most one row
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the row returned by the query as an object entry, or undefined if no row is returned
   */
  queryOne<T extends Row<any> = Row<any>>(
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T | undefined>;
  /**
   * Query the database with the prepared statement, and return an iterator.
   * Usefull when querying large datasets, as this should take advantage of data streams.
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as object entries
   */
  queryMany<T extends Row<any> = Row<any>>(
    params?: IParameterType[],
    options?: IQueryOptions,
  ): AsyncGenerator<T>;
  /**
   * Query the database with the prepared statement
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as array entries
   */
  queryArray<T extends ArrayRow<any> = ArrayRow<any>>(
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T[]>;
  /**
   * Query the database with the prepared statement, and return at most one row
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the row returned by the query as an array entry, or undefined if no row is returned
   */
  queryOneArray<T extends ArrayRow<any> = ArrayRow<any>>(
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T | undefined>;

  /**
   * Query the database with the prepared statement, and return an iterator.
   * Usefull when querying large datasets, as this should take advantage of data streams.
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as array entries
   */
  queryManyArray<T extends ArrayRow<any> = ArrayRow<any>>(
    params?: IParameterType[],
    options?: IQueryOptions,
  ): AsyncGenerator<T>;
}

/**
 * Queriable
 *
 * Represents an object that can execute SQL queries.
 */
export interface Queriable<
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
> extends
  DriverConnectable<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  > {
  readonly options: DriverInternalOptions<IConnectionOptions, IQueryOptions>;

  /**
   * Execute a SQL statement
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the number of affected rows if any
   */
  execute(
    sql: string,
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<number | undefined>;
  /**
   * Query the database
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as object entries
   */
  query<T extends Row<any> = Row<any>>(
    sql: string,
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T[]>;
  /**
   * Query the database and return at most one row
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the row returned by the query as an object entry, or undefined if no row is returned
   */
  queryOne<T extends Row<any> = Row<any>>(
    sql: string,
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T | undefined>;
  /**
   * Query the database and return an iterator.
   * Usefull when querying large datasets, as this should take advantage of data streams.
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as object entries
   */
  queryMany<T extends Row<any> = Row<any>>(
    sql: string,
    params?: IParameterType[],
    options?: IQueryOptions,
  ): AsyncGenerator<T>;
  /**
   * Query the database
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as array entries
   */
  queryArray<T extends ArrayRow<any> = ArrayRow<any>>(
    sql: string,
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T[]>;
  /**
   * Query the database and return at most one row
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the row returned by the query as an array entry, or undefined if no row is returned
   */
  queryOneArray<T extends ArrayRow<any> = ArrayRow<any>>(
    sql: string,
    params?: IParameterType[],
    options?: IQueryOptions,
  ): Promise<T | undefined>;

  /**
   * Query the database and return an iterator.
   * Usefull when querying large datasets, as this should take advantage of data streams.
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as array entries
   */
  queryManyArray<T extends ArrayRow<any> = ArrayRow<any>>(
    sql: string,
    params?: IParameterType[],
    options?: IQueryOptions,
  ): AsyncGenerator<T>;

  /**
   * Query the database using tagged template
   *
   * @returns the rows returned by the query as object entries
   */
  sql<T extends Row<any> = Row<any>>(
    strings: TemplateStringsArray,
    ...parameters: IParameterType[]
  ): Promise<T[]>;

  /**
   * Query the database using tagged template
   *
   * @returns the rows returned by the query as array entries
   */
  sqlArray<T extends ArrayRow<any> = ArrayRow<any>>(
    strings: TemplateStringsArray,
    ...parameters: IParameterType[]
  ): Promise<T[]>;
}

/**
 * Preparable
 *
 * Represents an object that can create a prepared statement.
 */
export interface Preparable<
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
> extends
  Queriable<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver
  > {
  /**
   * Create a prepared statement that can be executed multiple times.
   * This is useful when you want to execute the same SQL statement multiple times with different parameters.
   *
   * @param sql the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns a prepared statement
   *
   * @example
   * ```ts
   * const stmt = db.prepare("SELECT * FROM table WHERE id = ?");
   *
   * for (let i = 0; i < 10; i++) {
   *   const row of stmt.query([i])
   *   console.log(row);
   * }
   * ```
   */
  prepare(
    sql: string,
    options?: IQueryOptions,
  ): Promise<IPreparedStatement>;
}

/**
 * Transaction
 *
 * Represents a transaction.
 */
export interface Transaction<
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
> extends
  Preparable<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement
  > {
  readonly options: TransactionInternalOptions<
    IConnectionOptions,
    IQueryOptions,
    ITransactionOptions
  >;
  /**
   * Whether the connection is in an active transaction or not.
   */
  inTransaction: boolean;

  /**
   * Commit the transaction
   */
  commitTransaction(
    options?: ITransactionOptions["commitTransactionOptions"],
  ): Promise<void>;
  /**
   * Rollback the transaction
   */
  rollbackTransaction(
    options?: ITransactionOptions["rollbackTransactionOptions"],
  ): Promise<void>;
  /**
   * Create a save point
   *
   * @param name the name of the save point
   */
  createSavepoint(name?: string): Promise<void>;
  /**
   * Release a save point
   *
   * @param name the name of the save point
   */
  releaseSavepoint(name?: string): Promise<void>;
}

/**
 * Transactionable
 *
 * Represents an object that can create a transaction and a prepared statement.
 *
 * This interface is to be implemented by any class that supports creating a prepared statement.
 * A prepared statement should in most cases be unique to a connection,
 * and should not live after the related connection is closed.
 */
export interface Transactionable<
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
> extends
  Preparable<
    IConnectionOptions,
    IQueryOptions,
    IParameterType,
    IQueryValues,
    IQueryMeta,
    IDriver,
    IPreparedStatement
  > {
  readonly options: TransactionInternalOptions<
    IConnectionOptions,
    IQueryOptions,
    ITransactionOptions
  >;
  /**
   * Starts a transaction
   */
  beginTransaction(
    options?: ITransactionOptions["beginTransactionOptions"],
  ): Promise<ITransaction>;

  /**
   * Transaction wrapper
   *
   * Automatically begins a transaction, executes the callback function, and commits the transaction.
   *
   * If the callback function throws an error, the transaction will be rolled back and the error will be rethrown.
   * If the callback function returns successfully, the transaction will be committed.
   *
   * @param fn callback function to be executed within a transaction
   * @returns the result of the callback function
   */
  transaction<T>(
    fn: (t: ITransaction) => Promise<T>,
  ): Promise<T>;
}
