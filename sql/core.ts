// deno-lint-ignore-file no-explicit-any
import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type { DeferredStack as SqlDeferredStack } from "../collections/deferred_stack.ts";
import { VERSION } from "./meta.ts";

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
 * SqlTransactionOptions
 *
 * Core transaction options
 * Used to type the options for the transaction methods
 */
export type SqlTransactionOptions = {
  beginTransactionOptions?: Record<string, unknown>;
  commitTransactionOptions?: Record<string, unknown>;
  rollbackTransactionOptions?: Record<string, unknown>;
};

/**
 * SqlQueryOptions
 *
 * Options to pass to the query methods.
 */
export interface SqlQueryOptions extends SqlConnectionOptions {
  /**
   * A signal to abort the query.
   */
  signal?: AbortSignal;
}

/**
 * SqlConnectableBase
 *
 * The base interface for everything that interracts with the connection like querying.
 */
export interface SqlConnectableBase<
  Connection extends SqlConnection = SqlConnection,
> extends SqlBase {
  /**
   * The connection to the database
   */
  connection: Connection;

  /**
   * Whether the connection is connected or not
   */
  get connected(): boolean;
}

/**
 * SqlConnectablePoolBase
 *
 * The base interface for pool clients that interracts with the connection like querying.
 */
export interface SqlConnectablePoolBase<
  Connection extends SqlConnection = SqlConnection,
> extends SqlConnectableBase<Connection>, AsyncDisposable {
}

/**
 * SqlPreparedQueriable
 *
 * Represents a prepared statement to be executed separately from creation.
 */
export interface SqlPreparedQueriable<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  Connection extends SqlConnection<ConnectionOptions> = SqlConnection<
    ConnectionOptions
  >,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
> extends SqlConnectableBase<Connection> {
  /**
   * The SQL statement
   */
  readonly sql: string;
  /**
   * The (global) options to pass to the query method.
   */
  readonly queryOptions: QueryOptions;

  /**
   * Executes the prepared statement
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the number of affected rows if any
   */
  execute(
    params?: ParameterType[],
    options?: QueryOptions,
  ): Promise<number | undefined>;
  /**
   * Query the database with the prepared statement
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as object entries
   */
  query<T extends Row<any> = Row<any>>(
    params?: ParameterType[],
    options?: QueryOptions,
  ): Promise<T[]>;
  /**
   * Query the database with the prepared statement, and return at most one row
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the row returned by the query as an object entry, or undefined if no row is returned
   */
  queryOne<T extends Row<any> = Row<any>>(
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
  ): AsyncGenerator<T>;
  /**
   * Query the database with the prepared statement
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as array entries
   */
  queryArray<T extends ArrayRow<any> = ArrayRow<any>>(
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
  ): AsyncGenerator<T>;
}

/**
 * SqlQueriable
 *
 * Represents an object that can execute SQL queries.
 */
export interface SqlQueriable<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  Connection extends SqlConnection<ConnectionOptions> = SqlConnection<
    ConnectionOptions
  >,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
> extends SqlConnectableBase<Connection> {
  /**
   * The (global) options to pass to the query method.
   */
  readonly queryOptions: QueryOptions;

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
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
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
    params?: ParameterType[],
    options?: QueryOptions,
  ): AsyncGenerator<T>;

  /**
   * Query the database using tagged template
   *
   * @returns the rows returned by the query as object entries
   */
  sql<T extends Row<any> = Row<any>>(
    strings: TemplateStringsArray,
    ...parameters: ParameterType[]
  ): Promise<T[]>;

  /**
   * Query the database using tagged template
   *
   * @returns the rows returned by the query as array entries
   */
  sqlArray<T extends ArrayRow<any> = ArrayRow<any>>(
    strings: TemplateStringsArray,
    ...parameters: ParameterType[]
  ): Promise<T[]>;
}

/**
 * SqlPreparable
 *
 * This interface is to be implemented by any class that supports creating a prepared statement.
 * A prepared statement should in most cases be unique to a connection,
 * and should not live after the related connection is closed.
 */
export interface SqlPreparable<
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
> extends SqlConnectableBase<Connection> {
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
    options?: QueryOptions,
  ): Prepared;
}

/**
 * SqlTransactionQueriable
 *
 * Represents a transaction.
 */
export interface SqlTransactionQueriable<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  Connection extends SqlConnection<ConnectionOptions> = SqlConnection<
    ConnectionOptions
  >,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
  TransactionOptions extends SqlTransactionOptions = SqlTransactionOptions,
> extends
  SqlQueriable<
    ConnectionOptions,
    Connection,
    ParameterType,
    QueryOptions
  > {
  /**
   * Whether the connection is in an active transaction or not.
   */
  get inTransaction(): boolean;

  /**
   * Commit the transaction
   */
  commitTransaction(
    options?: TransactionOptions["commitTransactionOptions"],
  ): Promise<void>;
  /**
   * Rollback the transaction
   */
  rollbackTransaction(
    options?: TransactionOptions["rollbackTransactionOptions"],
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
 * SqlTransactionable
 *
 * Represents an object that can create a transaction.
 */
export interface SqlTransactionable<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  Connection extends SqlConnection<ConnectionOptions> = SqlConnection<
    ConnectionOptions
  >,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
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
> extends SqlConnectableBase<Connection> {
  /**
   * Starts a transaction
   */
  beginTransaction(
    options?: TransactionOptions["beginTransactionOptions"],
  ): Promise<Transaction>;

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
    fn: (t: Transaction) => Promise<T>,
  ): Promise<T>;
}

/**
 * SqlPoolable
 *
 * Represents an object that can acquire a connection from a pool.
 */
export interface SqlPoolable<
  Connectable extends SqlConnectablePoolBase = SqlConnectablePoolBase,
  DeferredStack extends SqlDeferredStack<Connectable> = SqlDeferredStack<
    Connectable
  >,
> extends SqlBase {
  /**
   * The deferred stack of connections
   */
  deferredStack: DeferredStack;

  /**
   * Acquire a connection from the pool
   */
  acquire(): Promise<Connectable>;

  /**
   * Releases the connection to the pool
   */
  release(connectable: Connectable): Promise<void>;
}

/**
 * Base class for all SQLx classes
 *
 * All SQLx implemented classes should have this class as its base class for inheritance,
 * or at the least imlement it as an interface and manually include the static and dynamic properties
 */
export class SqlBase {
  /**
   * The version of SQLx
   * @example
   * ```ts
   * import { VERSION } from "@halvardm/sqlx";
   * ```
   */
  readonly sqlxVersion: string = VERSION;
  /**
   * The version of SQLx
   * @example
   * ```ts
   * import { VERSION } from "@halvardm/sqlx";
   * ```
   */
  static readonly sqlxVersion: string = VERSION;
}
