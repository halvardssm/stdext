import type { ClientEventTarget, Eventable } from "./events.ts";

/**
 * ParameterType
 *
 * The recommended set of primitive parameter types that a driver should
 * support when binding query parameters: the types that JavaScript runtimes
 * bind natively. Binary data is bound from any `ArrayBufferView` or
 * `ArrayBuffer`. Drivers may extend this with database specific types, such
 * as `Date`.
 */
export type ParameterType =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ArrayBufferView
  | ArrayBuffer;

/**
 * QueryParameters
 *
 * The parameters to bind to a SQL statement. Depending on the placeholder
 * style supported by the database, parameters are passed either as an ordered
 * array or as a record of named parameters.
 */
export type QueryParameters =
  | ParameterType[]
  | Record<string, ParameterType>;

/**
 * SqlTemplate
 *
 * A SQL statement written as a tagged template, created with the `sql` tag. The statement is kept as the text between the
 * interpolated values, and the values, so that it is independent of the
 * placeholder style of the database: the driver renders its own placeholders
 * and binds the values as parameters. Values are never inserted into the SQL
 * text.
 *
 * @example
 * ```ts
 * import { sql } from "@stdext/database/sql";
 * import { assertEquals } from "@std/assert";
 *
 * const id = 1;
 * const template = sql`SELECT * FROM users WHERE id = ${id}`;
 * assertEquals(template.strings, ["SELECT * FROM users WHERE id = ", ""]);
 * assertEquals(template.values, [1]);
 * ```
 */
export interface SqlTemplate {
  /**
   * The SQL text before, between and after the values. There is always one
   * more string than there are values.
   */
  readonly strings: readonly string[];
  /**
   * The values to bind as parameters
   */
  readonly values: readonly ParameterType[];
}

/**
 * Statement
 *
 * A SQL statement: either SQL text with placeholders in the style of the
 * database, or a {@linkcode SqlTemplate}.
 */
export type Statement = string | SqlTemplate;

/**
 * ExecuteResult
 *
 * The result of executing a statement.
 */
export interface ExecuteResult {
  /**
   * The number of rows inserted, updated or deleted by the statement. It is
   * `0` for statements that modify no rows, such as `SELECT` or
   * `CREATE TABLE`, and `undefined` only if the database does not report it.
   */
  affectedRows: number | undefined;
  /**
   * The id of the last inserted row, if the database reports it, such as the
   * `rowid` in SQLite or the auto increment id in MySQL. Databases without
   * insert ids, such as Postgres, return the ids with `RETURNING` instead.
   */
  lastInsertId?: number | bigint | string;
}

/**
 * ResultObject
 *
 * A single row of a query result, as returned when iterating a
 * {@linkcode ResultIterableContext}.
 *
 * @template V the row values
 * @template R the record representation of the row
 */
export interface ResultObject<
  V = Array<unknown>,
  R = Record<string, V[keyof V]>,
> {
  /**
   * The values of the row, in the same order as the columns of the
   * {@linkcode ResultIterableContext}
   */
  values: V;
  /**
   * Returns the row as a record mapping column names to values
   */
  toRecord: () => R;
}

/**
 * ResultIterableContext
 *
 * The result of a query. It is both an async iterable of rows and provides
 * convenience methods for collecting the rows as values or records.
 *
 * The result is lazy: the query runs when the result is first consumed, so
 * errors, such as invalid SQL, are thrown by the iteration or collect
 * methods. Rows are streamed and not kept in memory, so the result can be
 * consumed once: either iterated, or collected with
 * {@linkcode ResultIterableContext.toValues} or
 * {@linkcode ResultIterableContext.toRecords}. Consuming it again rejects
 * with a {@linkcode QueryError}.
 *
 * The result holds its connection from when the query runs until all rows
 * are read or the result is disposed. Disposing stops fetching and releases
 * the connection; disposing a result that was never consumed does not run
 * the query.
 *
 * @template V the row values
 * @template R the record representation of a row
 *
 * @example
 * FENCEts
 * import { SqliteClient } from "@stdext/database/drivers/sqlite";
 *
 * await using client = new SqliteClient(":memory:");
 * await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
 *
 * for await (const row of client.query("SELECT id, name FROM users")) {
 *   console.log(row.toRecord());
 * }
 * console.log(await client.query("SELECT id, name FROM users").toRecords());
 * FENCE
 */
export interface ResultIterableContext<
  V extends unknown[] = unknown[],
  R = Record<string, V[number]>,
> extends AsyncDisposable, AsyncIterable<ResultObject<V, R>> {
  /**
   * The column names of the result. Runs the query if it has not run yet,
   * without consuming the rows. The columns are also known when there are no
   * rows, unless the database does not report them without rows.
   */
  columns(): Promise<string[]>;
  /**
   * Collect all rows as an array of values
   */
  toValues(): Promise<V[]>;
  /**
   * Collect all rows as an array of records
   */
  toRecords(): Promise<R[]>;
}

/**
 * ConnectionOptions
 *
 * Options used when connecting to the database. Drivers extend this with
 * database specific options.
 */
export interface ConnectionOptions {
  /**
   * How long establishing a connection may take, in milliseconds. When it
   * passes, connecting rejects with a {@linkcode ConnectionError}. Defaults to
   * no timeout.
   */
  connectTimeout?: number;
  [key: string]: unknown;
}

/**
 * QueryOptions
 *
 * Options to pass to the query methods. Merged with the global query options
 * given in the constructor options.
 */
export interface QueryOptions {
  /**
   * A signal to abort the query. When aborted, the implementation must stop
   * the current query as soon as the database allows (for synchronous
   * databases, before the statement runs and between rows), release the
   * connection, and reject with the abort reason.
   */
  signal?: AbortSignal;
  /**
   * Transforms a value before it is sent to the database
   */
  transformInput?: (value: unknown) => unknown;
  /**
   * Transforms a value received from the database
   */
  transformOutput?: (value: unknown) => unknown;
}

/**
 * TransactionOptions
 *
 * Placeholder for driver specific transaction options. There are no standard
 * transaction options; drivers extend this with the options they support.
 */
export interface TransactionOptions {
  [key: string]: unknown;
}

/**
 * PoolOptions
 *
 * Options for the connection pool of a {@linkcode Client}. The pool is always
 * enabled; these options only tune its behavior.
 */
export interface PoolOptions {
  /**
   * Whether to lazily initialize connections. Defaults to `false`.
   *
   * When enabled, connections are only created when a connection is acquired
   * and no idle connection is available while the pool is below
   * {@linkcode PoolOptions.maxSize}.
   */
  lazyInitialization?: boolean;
  /**
   * The maximum amount of connections in the pool. Defaults to `1`, which
   * makes the client behave like a single connection. The client becomes a
   * connection pool when this is raised.
   */
  maxSize?: number;
  /**
   * How long {@linkcode Poolable.acquire} waits for a connection when the
   * pool is exhausted, in milliseconds. When it passes, `acquire` rejects
   * with a {@linkcode ConnectionError}. Defaults to waiting indefinitely.
   *
   * Because query results hold their connection until they are fully read
   * or disposed, this also turns a leaked result into an error instead of a
   * hang.
   */
  acquireTimeout?: number;
  /**
   * How long a connection may be idle in the pool before it is closed, in
   * milliseconds. A new connection is opened when one is needed again.
   * Defaults to keeping idle connections open.
   */
  idleTimeout?: number;
  /**
   * The maximum age of a connection, in milliseconds. A connection that
   * reached this age is closed instead of reused, once it is no longer in
   * use. Defaults to no maximum.
   */
  maxLifetime?: number;
}

/**
 * Optionable
 *
 * Represents an object that carries its configuration.
 *
 * @template IOptions the options type
 */
export interface Optionable<IOptions> {
  /**
   * The options the object was constructed with
   */
  get options(): IOptions;
}

/**
 * Options
 *
 * The options that a {@linkcode Driver} is constructed with.
 *
 * @template IConnectionOptions driver specific connection options
 * @template IQueryOptions driver specific query options
 * @template ITransactionOptions driver specific transaction options
 */
export interface Options<
  IConnectionOptions extends ConnectionOptions = ConnectionOptions,
  IQueryOptions extends QueryOptions = QueryOptions,
  ITransactionOptions extends TransactionOptions = TransactionOptions,
> {
  /**
   * Options used when connecting to the database
   */
  connectionOptions?: IConnectionOptions;
  /**
   * Base options merged into every query
   */
  queryOptions?: IQueryOptions;
  /**
   * Base options merged into every transaction method
   */
  transactionOptions?: ITransactionOptions;
}

/**
 * ClientOptions
 *
 * The options that a {@linkcode Client} is constructed with.
 *
 * @template IConnectionOptions driver specific connection options
 * @template IQueryOptions driver specific query options
 * @template ITransactionOptions driver specific transaction options
 * @template IPoolOptions driver specific pool options
 */
export interface ClientOptions<
  IConnectionOptions extends ConnectionOptions = ConnectionOptions,
  IQueryOptions extends QueryOptions = QueryOptions,
  ITransactionOptions extends TransactionOptions = TransactionOptions,
  IPoolOptions extends PoolOptions = PoolOptions,
> extends Options<IConnectionOptions, IQueryOptions, ITransactionOptions> {
  /**
   * Options for the connection pool. The pool is always enabled; this only
   * tunes its behavior.
   */
  poolOptions?: IPoolOptions;
}

/**
 * Connectable
 *
 * Represents an object with a connection lifecycle to a database. A connectable
 * is also asynchronously disposable; disposing closes the connection.
 *
 * The connection is opened implicitly by the first operation, so calling
 * {@linkcode Connectable.connect} is optional: it connects eagerly, for
 * example to report connection errors early. Once closed, operations reject
 * with a {@linkcode ConnectionError} until it is connected again.
 */
export interface Connectable extends AsyncDisposable {
  /**
   * The connection URL the object connects to
   */
  get connectionUrl(): string | URL;
  /**
   * Whether the object is connected to the database
   */
  get connected(): boolean;
  /**
   * Create the connection to the database. Calling this method on an already
   * connected object is a no-op.
   *
   * If the connection can not be established, the method must reject with a
   * {@linkcode ConnectionError}, leave `connected` as `false`, and may be
   * called again to retry.
   */
  connect(): Promise<void>;
  /**
   * Close the connection to the database. Calling this method on an already
   * closed object is a no-op.
   */
  close(): Promise<void>;
}

/**
 * Pingable
 *
 * Represents an object that can ping its connection to check that it is alive.
 */
export interface Pingable {
  /**
   * Pings the database connection to check that it is alive.
   *
   * Throws a {@linkcode ConnectionError} if the connection is not alive.
   */
  ping(): Promise<void>;
}

/**
 * Queryable
 *
 * Represents an object that can execute SQL statements and queries. This is
 * the minimal query surface: `execute` for statements, `query` for queries
 * returning rows.
 */
export interface Queryable {
  /**
   * Execute a single SQL statement.
   *
   * @param sql the SQL statement, as text or a {@linkcode SqlTemplate}
   * @param params the parameters to bind to the SQL statement. Not allowed
   * with a {@linkcode SqlTemplate}, which carries its own values.
   * @param options the options to pass to the method, will be merged with the
   * global options
   * @returns the number of affected rows and the last inserted id
   */
  execute(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult>;
  /**
   * Query the database with a single SQL statement, and return the rows as a
   * {@linkcode ResultIterableContext}.
   *
   * The result is lazy: the query runs when the result is consumed. It holds
   * its connection until all rows are read or the result is disposed.
   *
   * @param sql the SQL statement, as text or a {@linkcode SqlTemplate}
   * @param params the parameters to bind to the SQL statement. Not allowed
   * with a {@linkcode SqlTemplate}, which carries its own values.
   * @param options the options to pass to the method, will be merged with the
   * global options
   * @returns the result of the query
   */
  query(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext;
  /**
   * Execute a script of one or more SQL statements, such as a migration. The
   * statements run in order, and the method resolves once all have run.
   * Scripts take no parameters.
   *
   * @param sql the SQL statements
   * @param options the options to pass to the method, will be merged with the
   * global options
   */
  executeScript(sql: string, options?: QueryOptions): Promise<void>;
}

/**
 * Preparable
 *
 * Represents an object that can create prepared statements. Databases without
 * native prepared statements should fall back to preparing the statement on
 * each execution, so that they remain compliant.
 */
export interface Preparable {
  /**
   * Create a prepared statement that can be executed multiple times with
   * different parameters.
   *
   * @param sql the SQL statement
   * @param options the options to pass to the method, will be merged with the
   * global options
   * @returns a prepared statement
   *
   * @example
   * ```ts
   * import { SqliteClient } from "@stdext/database/drivers/sqlite";
   *
   * await using client = new SqliteClient(":memory:");
   * await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
   * const stmt = await client.prepare("SELECT * FROM users WHERE id = ?");
   * console.log(await stmt.query([1]).toRecords());
   * await stmt.deallocate();
   * ```
   */
  prepare(sql: string, options?: QueryOptions): Promise<PreparedStatement>;
}

/**
 * PreparedStatement
 *
 * Represents a prepared statement, created with
 * {@linkcode Preparable.prepare}. A prepared statement is asynchronously
 * disposable; disposing deallocates the statement.
 */
export interface PreparedStatement extends AsyncDisposable {
  /**
   * The SQL statement of the prepared statement
   */
  get sql(): string;
  /**
   * Whether the prepared statement has been deallocated
   */
  get deallocated(): boolean;
  /**
   * Deallocate the prepared statement. Calling this method on an already
   * deallocated statement is a no-op. A deallocated statement can no longer
   * be used.
   */
  deallocate(): Promise<void>;
  /**
   * Execute the prepared statement.
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the method, will be merged with the
   * global options
   * @returns the number of affected rows and the last inserted id
   */
  execute(
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult>;
  /**
   * Query the database and return the rows as a lazy
   * {@linkcode ResultIterableContext}.
   *
   * @param params the parameters to bind to the SQL statement
   * @param options the options to pass to the method, will be merged with the
   * global options
   * @returns the result of the query
   */
  query(
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext;
}

/**
 * Transactionable
 *
 * Represents an object that can create transactions.
 */
export interface Transactionable {
  /**
   * Start a transaction. When called while a transaction is already active
   * on the same connection, a savepoint is created instead of a new
   * transaction, and the returned transaction commits by releasing the
   * savepoint and rolls back by rolling back to it.
   *
   * @param options the options to pass to the method, will be merged with the
   * global options
   * @returns a transaction
   */
  beginTransaction(options?: TransactionOptions): Promise<Transaction>;
  /**
   * Transaction wrapper.
   *
   * Automatically begins a transaction, executes the callback function and
   * commits the transaction. If the callback function throws an error, the
   * transaction is rolled back and the error is rethrown.
   *
   * @param fn callback function to be executed within a transaction
   * @param options the options to pass to the method, will be merged with the
   * global options
   * @returns the result of the callback function
   *
   * @example
   * ```ts
   * import { SqliteClient } from "@stdext/database/drivers/sqlite";
   *
   * await using client = new SqliteClient(":memory:");
   * await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
   * const result = await client.transaction(async (tx) => {
   *   await tx.execute("INSERT INTO users (name) VALUES ('Alice')");
   *   return await tx.query("SELECT * FROM users").toRecords();
   * });
   * ```
   */
  transaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
}

/**
 * Transaction
 *
 * Represents a transaction, created with
 * {@linkcode Transactionable.beginTransaction} or
 * {@linkcode Transactionable.transaction}. A transaction is asynchronously
 * disposable; disposing rolls back the transaction if it is still active.
 *
 * A transaction is itself transactionable: calling `beginTransaction` or
 * `transaction` while it is active creates a savepoint instead of a new
 * transaction, which is the portable way to nest transactions across SQL
 * databases.
 */
export interface Transaction
  extends AsyncDisposable, Queryable, Preparable, Transactionable {
  /**
   * Whether the object is in an active transaction
   */
  get inTransaction(): boolean;
  /**
   * Commit the transaction. After committing, the transaction can no longer
   * be used.
   *
   * @param options the options to pass to the method, will be merged with the
   * global options
   */
  commit(options?: TransactionOptions): Promise<void>;
  /**
   * Rollback the transaction. After rolling back, the transaction can no
   * longer be used.
   *
   * @param options the options to pass to the method, will be merged with the
   * global options
   */
  rollback(options?: TransactionOptions): Promise<void>;
  /**
   * Create a savepoint within the transaction.
   *
   * @param name the name of the savepoint. Implementations generate a name if
   * omitted.
   * @param options the options to pass to the method, will be merged with the
   * global options
   */
  createSavepoint(name?: string, options?: TransactionOptions): Promise<void>;
  /**
   * Release a savepoint within the transaction.
   *
   * @param name the name of the savepoint
   * @param options the options to pass to the method, will be merged with the
   * global options
   */
  releaseSavepoint(name?: string, options?: TransactionOptions): Promise<void>;
}

/**
 * Driverable
 *
 * Represents an object that wraps a {@linkcode Driver}.
 *
 * @template IDriver the driver type
 */
export interface Driverable<IDriver extends Driver = Driver> {
  /**
   * The wrapped driver
   */
  get driver(): IDriver;
}

/**
 * Poolable
 *
 * Represents an object with a pool of connections that can be acquired, such
 * as a {@linkcode Client}.
 */
export interface Poolable {
  /**
   * Acquire a {@linkcode PoolClient} from the pool.
   *
   * The returned pool client is connected. It must be released back to the
   * pool with {@linkcode PoolClient.release} when no longer needed, either
   * manually or by disposing it. Failing to release a pool client will leak
   * the connection.
   */
  acquire(): Promise<PoolClient>;
}

/**
 * PoolClient
 *
 * Represents a single connection acquired from a pool, created with
 * {@linkcode Poolable.acquire}. A pool client is asynchronously disposable;
 * disposing releases the connection back to the pool.
 */
export interface PoolClient
  extends
    AsyncDisposable,
    Driverable,
    Pingable,
    Queryable,
    Preparable,
    Transactionable {
  /**
   * Whether the underlying driver is connected to the database
   */
  get connected(): boolean;
  /**
   * Whether the pool client is released or removed, and can no longer be used
   */
  get disposed(): boolean;
  /**
   * Release the connection back to the pool. Calling this method on an
   * already disposed pool client is a no-op.
   */
  release(): Promise<void>;
  /**
   * Close the connection and remove it from the pool. Use this instead of
   * {@linkcode PoolClient.release} when the connection is in a broken state,
   * so it is not reused. Calling this method on an already disposed pool
   * client is a no-op.
   */
  remove(): Promise<void>;
}

/**
 * Driver
 *
 * Represents a single connection to a database, implementing all standard
 * capabilities. Users should in most cases use a {@linkcode Client}, which
 * pools and hands out drivers.
 *
 * Drivers are written by database driver authors; applications should use a
 * client or pool client.
 *
 * @template IOptions the driver options
 */
export interface Driver<IOptions extends Options = Options>
  extends
    Optionable<IOptions>,
    Connectable,
    Pingable,
    Queryable,
    Preparable,
    Transactionable,
    Eventable {
}

/**
 * The signature of a {@linkcode Driver} constructor.
 *
 * @template IDriver the driver type
 */
export interface DriverConstructor<IDriver extends Driver = Driver> {
  new (
    connectionUrl: string | URL,
    options?: IDriver["options"],
  ): IDriver;
}

/**
 * Client
 *
 * Represents a database client with an implicit connection pool. The pool is
 * always enabled and is tuned with the `poolOptions` in the constructor
 * options. It defaults to a single connection (`maxSize` of `1`) and becomes
 * a connection pool when `maxSize` is raised.
 *
 * Query methods automatically acquire a pool client for the duration of the
 * operation and release it after. Connections acquired through
 * {@linkcode Client.acquire} are held until released or disposed.
 *
 * @template IOptions the client options
 */
export interface Client<IOptions extends ClientOptions = ClientOptions>
  extends
    Optionable<IOptions>,
    Connectable,
    Pingable,
    Queryable,
    Preparable,
    Transactionable,
    Poolable,
    Eventable<ClientEventTarget> {
}

/**
 * The signature of a {@linkcode Client} constructor.
 *
 * @template IClient the client type
 */
export interface ClientConstructor<IClient extends Client = Client> {
  new (
    connectionUrl: string | URL,
    options?: IClient["options"],
  ): IClient;
}
