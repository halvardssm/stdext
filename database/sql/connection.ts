import type { ArrayRow, Row, SqlQueryOptions } from "./core.ts";

/**
 * SqlConnectionOptions
 *
 * The options that will be used when connecting to the database.
 */
export interface SqlConnectionOptions {
  /**
   * Transforms the value that will be sent to the database
   */
  transformInput?: (value: unknown) => unknown;
  /**
   * Transforms the value received from the database
   */
  transformOutput?: (value: unknown) => unknown;
}

/**
 * SqlConnection
 *
 * This represents a connection to a database.
 * When a user wants a single connection to the database,
 * they should use a class implementing or using this interface.
 *
 * The class implementing this interface should be able to connect to the database,
 * and have the following constructor arguments (if more options are needed, extend the SqlConnectionOptions):
 *  - connectionUrl: string|URL
 *  - connectionOptions?: SqlConnectionOptions;
 */
export interface SqlConnection<
  ConnectionOptions extends SqlConnectionOptions = SqlConnectionOptions,
  ParameterType extends unknown = unknown,
  QueryOptions extends SqlQueryOptions = SqlQueryOptions,
> extends AsyncDisposable {
  /**
   * Connection URL
   */
  readonly connectionUrl: string;

  /**
   * Connection options
   */
  readonly options: ConnectionOptions;

  /**
   * Whether the connection is connected to the database
   */
  get connected(): boolean;

  /**
   * Create a connection to the database
   */
  connect(): Promise<void>;

  /**
   * Close the connection to the database
   */
  close(): Promise<void>;

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
   * Query the database and return an iterator.
   * Usefull when querying large datasets, as this should take advantage of data streams.
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as object entries
   */
  // deno-lint-ignore no-explicit-any
  queryMany<T extends Row<any> = Row<any>>(
    sql: string,
    params?: ParameterType[],
    options?: QueryOptions,
  ): AsyncGenerator<T>;

  /**
   * Query the database and return an iterator.
   * Usefull when querying large datasets, as this should take advantage of data streams.
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query as array entries
   */
  // deno-lint-ignore no-explicit-any
  queryManyArray<T extends ArrayRow<any> = ArrayRow<any>>(
    sql: string,
    params?: ParameterType[],
    options?: QueryOptions,
  ): AsyncGenerator<T>;
}

/**
 * SqlConnectable
 *
 * The base interface for everything that interracts with the connection like querying.
 */
export interface SqlConnectable<
  Options extends SqlConnectionOptions = SqlConnectionOptions,
  Connection extends SqlConnection = SqlConnection,
> extends AsyncDisposable {
  /**
   * The (global) options.
   */
  readonly options: Options;

  /**
   * The connection to the database
   */
  readonly connection: Connection;

  /**
   * Whether the connection is connected or not
   */
  get connected(): boolean;
}
