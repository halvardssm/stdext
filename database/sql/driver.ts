/**
 * Represents the supported value types the driver can handle
 */
// deno-lint-ignore no-explicit-any
export type DriverParameterType<T = any> = T;

/**
 * Represents the values returned from the query
 */
// deno-lint-ignore no-explicit-any
export type DriverQueryValues<T extends Array<any> = Array<any>> = T;

/**
 * Represents the meta data returned from the query
 */
// deno-lint-ignore no-explicit-any
export type DriverQueryMeta = Record<string, any>;

/**
 * DriverConnectionOptions
 *
 * The options that will be used when connecting to the database.
 *
 * This is a placeholder for future options.
 */
// deno-lint-ignore no-empty-interface
export interface DriverConnectionOptions {}

/**
 * DriverQueryOptions
 *
 * Options to pass to the query methods.
 */
export interface DriverQueryOptions {
  /**
   * A signal to abort the query.
   */
  signal?: AbortSignal;
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
 * DriverQueryNext
 *
 * The representation of a query row.
 */
export type DriverQueryNext<
  Values extends DriverQueryValues = DriverQueryValues,
  Meta extends DriverQueryMeta = DriverQueryMeta,
> = {
  /**
   * The column headers in the same order as the values
   */
  columns: string[];
  /**
   * The values
   */
  values: Values;
  /**
   * Aditional information from the query
   */
  meta: Meta;
};

export interface DriverInternalOptions<
  ConnectionOptions extends DriverConnectionOptions,
  QueryOptions extends DriverQueryOptions,
> {
  connectionOptions: ConnectionOptions;
  queryOptions: QueryOptions;
  // deno-lint-ignore no-explicit-any
  [key: string | symbol | number]: any;
}

/**
 * DriverConnection
 *
 * This represents a connection to a database.
 * When a user wants a single connection to the database,
 * they should use a class implementing or using this interface.
 *
 * The class implementing this interface should be able to connect to the database,
 * and have the following constructor arguments (if more options are needed, extend the DriverConnectionOptions):
 *  - connectionUrl: string|URL
 *  - connectionOptions?: DriverConnectionOptions;
 */
export interface Driver<
  DConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  DQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  DParameterType extends DriverParameterType = DriverParameterType,
  DQueryValues extends DriverQueryValues = DriverQueryValues,
  DQueryMeta extends DriverQueryMeta = DriverQueryMeta,
> extends AsyncDisposable {
  /**
   * Connection URL
   */
  readonly connectionUrl: string;

  /**
   * Connection options
   */
  readonly options: DriverInternalOptions<DConnectionOptions, DQueryOptions>;

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
   * Pings the database connection to check that it's alive
   *
   * Throws an error if connection is not alive
   */
  ping(): Promise<void>;

  /**
   * Query the database and return an iterator.
   *
   * @param sql the SQL statement
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the query method, will be merged with the global options
   * @returns the rows returned by the query
   */
  query<
    Values extends DQueryValues = DQueryValues,
    Meta extends DQueryMeta = DQueryMeta,
  >(
    sql: string,
    params?: DParameterType[],
    options?: DQueryOptions,
  ): AsyncGenerator<DriverQueryNext<Values, Meta>>;
}

/**
 * DriverConnectable
 *
 * The base interface for everything that interracts with the connection like querying.
 */
export interface DriverConnectable<
  DConnectionOptions extends DriverConnectionOptions = DriverConnectionOptions,
  DQueryOptions extends DriverQueryOptions = DriverQueryOptions,
  DParameterType extends DriverParameterType = DriverParameterType,
  DQueryValues extends DriverQueryValues = DriverQueryValues,
  DQueryMeta extends DriverQueryMeta = DriverQueryMeta,
  DConnection extends Driver<
    DConnectionOptions,
    DQueryOptions,
    DParameterType,
    DQueryValues,
    DQueryMeta
  > = Driver<
    DConnectionOptions,
    DQueryOptions,
    DParameterType,
    DQueryValues,
    DQueryMeta
  >,
> extends AsyncDisposable, Pick<DConnection, "options"> {
  /**
   * The connection to the database
   */
  readonly connection: DConnection;
}
