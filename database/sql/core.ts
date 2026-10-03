import type { ClientEventTarget, Eventable } from "./events.ts";

// =============================================================================
// Common types
// =============================================================================

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
 * SqlTemplate
 *
 * A SQL statement written as a tagged template, created with the `sql` tag.
 * The statement is kept as the text between the interpolated values, and the
 * values, so that it is independent of the placeholder style of the database:
 * the client renders the placeholders of the driver's {@linkcode Dialect} and
 * binds the values as parameters. Values are never inserted into the SQL
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
 * DriverQueryOptions
 *
 * The options of the query methods of the driver level.
 */
export interface DriverQueryOptions {
  /**
   * A signal to abort the query. When aborted, the query must stop as soon as
   * the database allows (for synchronous databases, before the statement runs
   * and between rows), and reject with the abort reason.
   */
  signal?: AbortSignal;
}

/**
 * QueryOptions
 *
 * Options to pass to the query methods of the client level. Merged with the
 * query options given to the client.
 */
export interface QueryOptions extends DriverQueryOptions {
  /**
   * Transforms every parameter before it is sent to the database
   */
  transformInput?: (value: unknown) => unknown;
  /**
   * Transforms every value received from the database
   */
  transformOutput?: (value: unknown) => unknown;
  /**
   * The size of the prepared statement cache of each connection. Statements
   * run with `execute` and `query` are prepared once and cached by their SQL
   * text, when the driver supports prepared statements. `0` disables the
   * cache. Defaults to `100`.
   */
  statementCacheSize?: number;
}

/**
 * TransactionOptions
 *
 * Options for beginning a transaction. There are no standard transaction
 * options; drivers extend this with the options they support, such as
 * isolation levels.
 */
export interface TransactionOptions {
  [key: string]: unknown;
}

/**
 * PoolOptions
 *
 * Options for the connection pool of a {@linkcode Client}.
 */
export interface PoolOptions {
  /**
   * Whether to lazily initialize connections. Defaults to `false`.
   *
   * When enabled, connections are only opened when a connection is acquired
   * and no idle connection is available. Otherwise, connecting opens
   * {@linkcode PoolOptions.maxSize} connections up front.
   */
  lazyInitialization?: boolean;
  /**
   * The maximum number of connections in the pool. Defaults to `1`, which
   * makes the client behave like a single connection. It is capped at the
   * {@linkcode Driver.maxConnections} of the driver.
   */
  maxSize?: number;
  /**
   * How long {@linkcode Poolable.acquire} waits for a connection when the
   * pool is exhausted, in milliseconds. When it passes, `acquire` rejects
   * with a {@linkcode ConnectionError}. Defaults to waiting indefinitely.
   */
  acquireTimeout?: number;
  /**
   * How long a connection may be idle in the pool before it is closed, in
   * milliseconds. Defaults to keeping idle connections open.
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
 * ClientOptions
 *
 * The options that a {@linkcode Client} is constructed with.
 *
 * @template IConnectionOptions driver specific connection options
 * @template ITransactionOptions driver specific transaction options
 */
export interface ClientOptions<
  IConnectionOptions extends ConnectionOptions = ConnectionOptions,
  ITransactionOptions extends TransactionOptions = TransactionOptions,
> {
  /**
   * Options passed to the driver when connecting
   */
  connectionOptions?: IConnectionOptions;
  /**
   * Options merged into every query
   */
  queryOptions?: QueryOptions;
  /**
   * Options merged into every transaction
   */
  transactionOptions?: ITransactionOptions;
  /**
   * Options for the connection pool
   */
  poolOptions?: PoolOptions;
}

// =============================================================================
// Driver level
// =============================================================================

/**
 * Dialect
 *
 * Describes the SQL syntax of a database, which tools such as query builders
 * can not discover otherwise.
 */
export interface Dialect {
  /**
   * The name of the dialect, such as `"sqlite"` or `"postgres"`, for tools
   * that generate dialect specific SQL
   */
  readonly name: string;
  /**
   * Render the placeholder of the parameter at the zero-based index, such as
   * `?` in SQLite or `$1` in Postgres
   */
  placeholder(index: number): string;
  /**
   * Quote and escape an identifier, such as a table or column name
   */
  quoteIdentifier(name: string): string;
}

/**
 * Driver
 *
 * A database driver, the entry point of the driver level. Drivers implement
 * the driver level; the client level is implemented on top of it by the
 * standard `SqlClient`.
 *
 * @template IConnectionOptions driver specific connection options
 * @template ITransactionOptions driver specific transaction options
 */
export interface Driver<
  IConnectionOptions extends ConnectionOptions = ConnectionOptions,
  ITransactionOptions extends TransactionOptions = TransactionOptions,
> {
  /**
   * The SQL dialect of the database
   */
  readonly dialect: Dialect;
  /**
   * The maximum number of connections the driver supports at the same time,
   * such as `1` for SQLite. Defaults to no maximum.
   */
  readonly maxConnections?: number;
  /**
   * Open a connection to the database. The URL is interpreted according to
   * the connection URI format of the database; options take precedence over
   * parameters in the URL. When the signal aborts, connecting stops and
   * rejects with the abort reason. A failed connect rejects with a
   * {@linkcode ConnectionError}.
   */
  connect(
    url: string | URL,
    options?: IConnectionOptions & { signal?: AbortSignal },
  ): Promise<DriverConnection<ITransactionOptions>>;
}

/**
 * DriverConnection
 *
 * A single connection of a driver. It runs one operation at a time: while
 * rows are being read, the connection is busy, and drivers may reject other
 * operations with a {@linkcode QueryError} rather than buffering the rows.
 *
 * @template ITransactionOptions driver specific transaction options
 */
export interface DriverConnection<
  ITransactionOptions extends TransactionOptions = TransactionOptions,
> extends AsyncDisposable {
  /**
   * Whether the connection is closed, by `close()` or because it was lost
   */
  readonly closed: boolean;
  /**
   * Close the connection. Calling it on a closed connection is a no-op.
   * Disposing the connection closes it.
   */
  close(): Promise<void>;
  /**
   * Execute exactly one statement.
   */
  execute(
    sql: string,
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<ExecuteResult>;
  /**
   * Query exactly one statement, resolving to its rows once the statement
   * runs, so that errors, such as invalid SQL, reject the promise.
   */
  query(
    sql: string,
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<DriverRows>;
  /**
   * Execute a script of one or more statements without parameters, resolving
   * when all have run.
   */
  executeScript(sql: string, options?: DriverQueryOptions): Promise<void>;
  /**
   * Begin a transaction, with database specific options such as the
   * isolation level.
   */
  begin(options?: ITransactionOptions): Promise<DriverTransaction>;
  /**
   * Check that the connection is alive, rejecting with a
   * {@linkcode ConnectionError} if not.
   */
  ping(): Promise<void>;
  /**
   * Create a native prepared statement. Optional: without it, the client
   * level runs the SQL of a prepared statement each time.
   */
  prepare?(sql: string): Promise<DriverStatement>;
}

/**
 * DriverRows
 *
 * The rows of a query of the driver level. The rows are streamed and can be
 * iterated once; disposing them, or ending the iteration early, stops
 * fetching and frees the connection.
 */
export interface DriverRows extends AsyncIterable<unknown[]>, AsyncDisposable {
  /**
   * The column names, known also when there are no rows, unless the
   * database does not report them without rows
   */
  readonly columns: string[];
}

/**
 * DriverStatement
 *
 * A native prepared statement of a {@linkcode DriverConnection}.
 */
export interface DriverStatement extends AsyncDisposable {
  /**
   * The SQL of the statement
   */
  readonly sql: string;
  /**
   * Execute the statement
   */
  execute(
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<ExecuteResult>;
  /**
   * Query the statement
   */
  query(
    params?: QueryParameters,
    options?: DriverQueryOptions,
  ): Promise<DriverRows>;
  /**
   * Release the statement. Idempotent; disposing deallocates. Using a
   * deallocated statement rejects with a {@linkcode QueryError}.
   */
  deallocate(): Promise<void>;
}

/**
 * DriverTransaction
 *
 * A transaction begun with {@linkcode DriverConnection.begin}. Its
 * statements run on the connection. Disposing an active transaction rolls it
 * back.
 */
export interface DriverTransaction extends AsyncDisposable {
  /**
   * Commit the transaction. Rejects with a {@linkcode TransactionError} if
   * the transaction ended.
   */
  commit(): Promise<void>;
  /**
   * Roll back the transaction. Rejects with a {@linkcode TransactionError} if
   * the transaction ended.
   */
  rollback(): Promise<void>;
  /**
   * Create a savepoint, in the syntax of the database.
   *
   * @param name a plain unquoted identifier
   */
  savepoint(name: string): Promise<DriverSavepoint>;
}

/**
 * DriverSavepoint
 *
 * A savepoint created with {@linkcode DriverTransaction.savepoint}. Disposing
 * an active savepoint rolls back to it.
 */
export interface DriverSavepoint extends AsyncDisposable {
  /**
   * Release the savepoint, keeping its changes. Rejects with a
   * {@linkcode TransactionError} if the savepoint or its transaction ended.
   */
  release(): Promise<void>;
  /**
   * Roll back to the savepoint, and release it. Rejects with a
   * {@linkcode TransactionError} if the savepoint or its transaction ended.
   */
  rollback(): Promise<void>;
}

// =============================================================================
// Client level
// =============================================================================

/**
 * ResultObject
 *
 * A single row of a query result.
 *
 * @template V the row values
 * @template R the record representation of the row
 */
export interface ResultObject<
  V = Array<unknown>,
  R = Record<string, V[keyof V]>,
> {
  /**
   * The values of the row, in the order of the columns
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
 * The result of a query of the client level. It is both an async iterable of
 * rows and provides convenience methods for collecting the rows.
 *
 * The result is lazy: the query runs when the result is first consumed, so
 * errors, such as invalid SQL, are thrown by the consuming methods. Rows are
 * streamed and not kept in memory, so the result can be consumed once:
 * either iterated, or collected. Consuming it again rejects with a
 * {@linkcode QueryError}.
 *
 * A started result holds its connection until all rows are read or the
 * result is disposed. Disposing a result that was never started does not
 * run the query.
 *
 * @template V the row values
 * @template R the record representation of a row
 *
 * @example
 * ```ts
 * import { SqliteClient } from "@stdext/database/drivers/sqlite";
 *
 * await using client = new SqliteClient(":memory:");
 * await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
 *
 * for await (const row of client.query("SELECT id, name FROM users")) {
 *   console.log(row.toRecord());
 * }
 * console.log(await client.query("SELECT id, name FROM users").toRecords());
 * ```
 */
export interface ResultIterableContext<
  V extends unknown[] = unknown[],
  R = Record<string, V[number]>,
> extends AsyncDisposable, AsyncIterable<ResultObject<V, R>> {
  /**
   * The column names of the result. Runs the query if it has not run yet,
   * without consuming the rows.
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
 * Connectable
 *
 * Represents an object with a connection lifecycle. The connection is opened
 * implicitly by the first operation, so calling `connect` is optional: it
 * connects eagerly, for example to report connection errors early. Once
 * closed, operations reject with a {@linkcode ConnectionError} until it is
 * connected again. Disposing closes it.
 */
export interface Connectable extends AsyncDisposable {
  /**
   * The connection URL
   */
  get connectionUrl(): string | URL;
  /**
   * Whether it is connected
   */
  get connected(): boolean;
  /**
   * Connect. Calling it when connected is a no-op, and concurrent calls share
   * one attempt. If connecting fails, it rejects with a
   * {@linkcode ConnectionError} and may be called again to retry.
   */
  connect(): Promise<void>;
  /**
   * Close. Calling it when closed is a no-op.
   */
  close(): Promise<void>;
}

/**
 * Pingable
 *
 * Represents an object that can check that its connection is alive.
 */
export interface Pingable {
  /**
   * Check that the connection is alive. Rejects with a
   * {@linkcode ConnectionError} if not.
   */
  ping(): Promise<void>;
}

/**
 * Dialectable
 *
 * Represents an object that exposes the SQL dialect of its database, for
 * tools such as query builders.
 */
export interface Dialectable {
  /**
   * The SQL dialect of the database
   */
  get dialect(): Dialect;
}

/**
 * Queryable
 *
 * Represents an object that runs SQL statements, queries and scripts. This is
 * the capability that query builders and migration tools depend on.
 */
export interface Queryable {
  /**
   * Execute exactly one SQL statement.
   *
   * @param sql the SQL statement, as text or a {@linkcode SqlTemplate}
   * @param params the parameters to bind. Not allowed with a
   * {@linkcode SqlTemplate}, which carries its own values.
   * @param options the query options, merged with the client's
   * @returns the number of affected rows and the last inserted id
   */
  execute(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult>;
  /**
   * Query exactly one SQL statement, returning a lazy
   * {@linkcode ResultIterableContext}. The query runs when the result is
   * consumed.
   *
   * @param sql the SQL statement, as text or a {@linkcode SqlTemplate}
   * @param params the parameters to bind. Not allowed with a
   * {@linkcode SqlTemplate}, which carries its own values.
   * @param options the query options, merged with the client's
   * @returns the result of the query
   */
  query(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext;
  /**
   * Execute a script of one or more SQL statements without parameters, such
   * as a migration.
   *
   * @param sql the SQL statements
   * @param options the query options, merged with the client's
   */
  executeScript(sql: string, options?: QueryOptions): Promise<void>;
}

/**
 * Preparable
 *
 * Represents an object that creates prepared statements.
 */
export interface Preparable {
  /**
   * Create a prepared statement, executed with new parameters each time. It
   * uses the native prepared statement of the driver when available, and
   * otherwise runs the SQL each time.
   *
   * @example
   * ```ts
   * import { SqliteClient } from "@stdext/database/drivers/sqlite";
   *
   * await using client = new SqliteClient(":memory:");
   * await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
   * await using stmt = await client.prepare("SELECT * FROM users WHERE id = ?");
   * console.log(await stmt.query([1]).toRecords());
   * ```
   */
  prepare(sql: string, options?: QueryOptions): Promise<PreparedStatement>;
}

/**
 * PreparedStatement
 *
 * A prepared statement of the client level. Disposing deallocates it.
 */
export interface PreparedStatement extends AsyncDisposable {
  /**
   * The SQL of the statement
   */
  get sql(): string;
  /**
   * Whether the statement is deallocated
   */
  get deallocated(): boolean;
  /**
   * Deallocate the statement. Idempotent. Using a deallocated statement
   * rejects with a {@linkcode QueryError}.
   */
  deallocate(): Promise<void>;
  /**
   * Execute the statement
   */
  execute(
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult>;
  /**
   * Query the statement, returning a lazy result
   */
  query(
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext;
}

/**
 * Transactionable
 *
 * Represents an object that creates transactions.
 */
export interface Transactionable {
  /**
   * Begin a transaction. On an active transaction, a savepoint is created
   * instead, and the returned transaction commits by releasing it and rolls
   * back by rolling back to it.
   */
  beginTransaction(options?: TransactionOptions): Promise<Transaction>;
  /**
   * Run the callback in a transaction, committing on success, and rolling
   * back and rethrowing on errors.
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
 * A transaction of the client level. Disposing an active transaction rolls it
 * back. Calling `beginTransaction` or `transaction` on it creates a nested
 * transaction, as a savepoint.
 */
export interface Transaction
  extends AsyncDisposable, Queryable, Preparable, Transactionable {
  /**
   * Whether the transaction is active
   */
  get inTransaction(): boolean;
  /**
   * Commit the transaction. It can no longer be used afterwards.
   */
  commit(options?: TransactionOptions): Promise<void>;
  /**
   * Roll back the transaction. It can no longer be used afterwards.
   */
  rollback(options?: TransactionOptions): Promise<void>;
  /**
   * Create a savepoint within the transaction.
   *
   * @param name a plain identifier; generated when omitted
   */
  createSavepoint(name?: string, options?: TransactionOptions): Promise<void>;
  /**
   * Release a savepoint, and the savepoints created after it.
   *
   * @param name the savepoint; the last one when omitted
   */
  releaseSavepoint(name?: string, options?: TransactionOptions): Promise<void>;
}

/**
 * Poolable
 *
 * Represents an object with a pool of connections.
 */
export interface Poolable {
  /**
   * Acquire a connection from the pool, waiting when the pool is exhausted.
   * The connection must be released, which disposing it does.
   */
  acquire(): Promise<Connection>;
}

/**
 * Connection
 *
 * A connection acquired from the pool of a {@linkcode Client}, held until it
 * is released. Disposing releases it. Operations run one at a time; an
 * operation started while a result of the connection is being read rejects
 * with a {@linkcode QueryError}.
 */
export interface Connection
  extends
    AsyncDisposable,
    Pingable,
    Queryable,
    Preparable,
    Transactionable,
    Dialectable {
  /**
   * Whether the underlying driver connection is open
   */
  get connected(): boolean;
  /**
   * Whether the connection is released or removed, and can no longer be used
   */
  get released(): boolean;
  /**
   * The driver connection, for driver specific features, while the
   * connection is acquired. Throws a {@linkcode ConnectionError} once
   * released.
   */
  get driverConnection(): DriverConnection;
  /**
   * Release the connection back to the pool, rolling back a transaction left
   * open. Idempotent.
   */
  release(): Promise<void>;
  /**
   * Close the connection and remove it from the pool, for a broken
   * connection. Idempotent.
   */
  remove(): Promise<void>;
}

/**
 * Client
 *
 * The user facing client: a pool of driver connections. Its query methods
 * acquire a connection for the duration of the operation. The standard
 * implementation is `SqlClient`.
 *
 * @template IOptions the client options
 */
export interface Client<IOptions extends ClientOptions = ClientOptions>
  extends
    Connectable,
    Pingable,
    Queryable,
    Preparable,
    Transactionable,
    Poolable,
    Dialectable,
    Eventable<ClientEventTarget> {
  /**
   * The options, reflecting the actual pool size
   */
  get options(): IOptions;
}
