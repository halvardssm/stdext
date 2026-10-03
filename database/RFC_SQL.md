# RFC: @stdext/database/sql - Standardized SQL Database Interface Specification

This RFC proposes a standardized interface for SQL-like database drivers.

## Overview

In the ever-evolving landscape of web development, the need for robust,
efficient, and standardized database connectivity is paramount. SQL-based
databases remain a cornerstone of data storage and retrieval in countless
applications, ranging from small-scale personal projects to large-scale
enterprise systems. However, the current ecosystem of JavaScript database
drivers for SQL-based databases is highly fragmented, leading to inconsistent
and often incompatible interfaces across different drivers.

Similar effort has been made in the
[Go ecosystem](https://pkg.go.dev/database/sql), and can therefore be used for
guidance.

The specification is shown using TypeScript. The interfaces, helper utilities
and a conformance test suite are implemented in the
[`@stdext/database`](https://jsr.io/@stdext/database) package, published on
[JSR](https://jsr.io/). Drivers do not need to import the types to be compliant,
as long as they follow the specification, but are encouraged to.

## Purpose

The primary purpose of this specification is to define a universal interface
that allows developers to interact with SQL-based databases in a consistent
manner, regardless of the underlying database management system (DBMS). By
providing a standardized interface, this specification aims to:

- Simplify Development: Reduce the complexity for developers who need to
  interact with multiple SQL databases, enabling them to switch between
  different databases with minimal code changes.
- Enhance Interoperability: Foster greater compatibility between applications
  and database drivers, promoting a more seamless integration process.
- Improve Maintainability: Provide a clear and consistent framework that
  simplifies the maintenance and updating of database interaction code.

### Motivation

The motivation for this RFC comes from creating applications and scripts using
the database drivers available. Comparing the signatures of the different
database drivers, we see that they vary greatly and have little to no coherent
usage. Thus the motivation is to create a coherent base interface (that can be
extended, see [here](#extending-the-interfaces)) that can be implemented across
database drivers.

Below there is a comparison of how to execute a query in the different drivers
taken from the respective readmes.

**Node: mysql** ([link](https://github.com/mysqljs/mysql))

```ts ignore
var mysql = require("mysql");

var connection = mysql.createConnection({
  host: "localhost",
  user: "me",
  password: "secret",
  database: "my_db",
});
connection.connect();
connection.query("SELECT 1 + 1 AS solution", function (error, results, fields) {
  if (error) throw error;
  console.log("The solution is: ", results[0].solution);
});
connection.end();
```

**Node: mysql2** ([link](https://github.com/sidorares/node-mysql2))

```ts ignore
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "test",
});
const [results, fields] = await connection.query("SELECT 1 + 1 AS solution");
console.log(results[0]);
connection.end();
```

**Node: sqlite3** ([link](https://github.com/TryGhost/node-sqlite3))

```ts ignore
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");

db.serialize(() => {
  db.get("SELECT 1 + 1 AS solution", (err, row) => {
    console.log(row);
  });
});

db.close();
```

**Node: better-sqlite3** ([link](https://github.com/WiseLibs/better-sqlite3))

```ts ignore
import Database from "better-sqlite3";
const db = new Database("foobar.db", options);

const row = db.prepare("SELECT 1 + 1 AS solution").get(userId);
console.log(row.solution);
```

**Node: pg** ([link](https://github.com/brianc/node-postgres))

```ts ignore
import pg from "pg";
const { Client } = pg;
const client = new Client();
await client.connect();

const res = await client.query("SELECT 1 + 1 AS solution");
console.log(res.rows[0].solution);
await client.end();
```

**Node: postgres** ([link](https://github.com/porsager/postgres))

```ts ignore
import postgres from "postgres";

const sql = postgres({
  /* options */
});
const res = await sql`SELECT 1 + 1 AS solution`;
console.log(res[0].solution);
```

**Deno: mysql** ([link](https://github.com/denodrivers/mysql/))

```ts ignore
import { Client } from "https://deno.land/x/mysql/mod.ts";
const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "dbname",
  password: "password",
});
const res = await client.query(`SELECT 1 + 1 AS solution`);
console.log(res.rows[0].solution);
```

**Deno: sqlite** ([link](https://github.com/denodrivers/sqlite3))

```ts ignore
import { Database } from "jsr:@db/sqlite@0.11";

const db = new Database("test.db");

const [solution] = db.prepare("SELECT 1 + 1 AS solution").value<[string]>()!;
console.log(solution);
db.close();
```

**Deno: postgres** ([link](https://github.com/denodrivers/postgres))

```ts ignore
import { Client } from "https://deno.land/x/postgres/mod.ts";
const client = new Client({
  user: "user",
  database: "test",
  hostname: "localhost",
  port: 5432,
});
await client.connect();
const result = await client.queryObject`SELECT 1 + 1 AS solution`;
console.log(result.rows[0].solution);
await client.end();
```

## Scope

This specification covers the essential components and functionalities required
for interacting with SQL-based databases through a standardized interface. It
includes, but is not limited to:

- Connection management
- Connection pooling
- Query execution
- Transaction handling
- Error handling and reporting
- Prepared statements and parameterized queries

> Other functionalities such as subscriptions would be out of scope for the
> first version, but would be considered for upcoming spec releases.

## Goals and Non-Goals

- Define a clear and comprehensive API for database drivers that can be
  universally applied to all SQL-based databases.
- Ensure that the interface is flexible enough to support both basic and
  advanced SQL database functionalities, and that the interfaces can be extended
  for functionality that is not included in the specs.
- Promote the adoption of the standardized interface within the developer
  community and across database vendors.
- This specification does not aim to replace existing database drivers but
  rather to provide a layer of standardization that can be implemented by them.
- It does not cover non-SQL databases or seek to address database-specific
  optimizations and extensions that fall outside the scope of standard SQL
  operations. This should be handled by the respective drivers.

## Audience

This RFC is intended for database driver developers, application developers,
database administrators, and other stakeholders involved in the development and
maintenance of applications that interact with SQL-based databases. It provides
a framework for creating compatible and standardized database drivers,
facilitating smoother development and integration processes.

## Design Principles

1. **Async only.** All methods resolve to a `Promise`, except `query`, which
   returns a lazy result whose consuming methods resolve to promises.
   Synchronous databases may implement the interface by wrapping their
   operations in resolved promises. This keeps the call sites uniform and allows
   the same code to be written for all databases.
2. **Small, independent capability interfaces.** Each capability ("able") is its
   own interface: `Connectable`, `Pingable`, `Queryable`, `Preparable`,
   `Transactionable`, `Poolable`, `Driverable` and `Eventable`. Drivers
   implement the capabilities their database supports. The
   [profiles](#profiles-and-compliance-matrix) define which capabilities are
   mandatory for a compliant implementation.
3. **Implicit pooling.** There is no separate pool class. A `Client` always
   manages a connection pool, tuned through its constructor options. It defaults
   to a single connection (`maxSize` of `1`) and becomes a connection pool when
   `maxSize` is raised. This mirrors `database/sql` in Go, where `*sql.DB` is
   always a pool.
4. **Minimal query surface.** The standard query surface is three methods:
   `execute` for statements, `query` for queries returning rows, and
   `executeScript` for scripts. Both `execute` and `query` accept SQL text or a
   portable SQL template. All other result shapes (`queryOne`, ...) are
   derivable and left to extensions. Every method added to the standard is a
   permanent compatibility requirement for every compliant driver, so the
   surface is kept as small as possible.
5. **Explicit Resource Management.** Every object holding a resource
   (connection, pool client, transaction, prepared statement, result context) is
   asynchronously disposable and works with `await using`. Disposing performs
   the safe cleanup action: close, release, rollback, deallocate or stop
   fetching respectively.

## Specification

The specification defines three layers:

- [Core types](#core-types): parameters, rows and the result context
- [Capability interfaces](#capability-interfaces): the independent "ables"
- [Profiles](#profiles-and-compliance-matrix): the classes users and library
  authors interact with, composed from the capabilities

### Core Types

#### Parameters

The parameters to bind to a SQL statement are passed as an ordered array or as a
record of named parameters, depending on the placeholder style supported by the
database. The recommended parameter types are:

```ts ignore
type ParameterType =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ArrayBufferView
  | ArrayBuffer;

type QueryParameters = ParameterType[] | Record<string, ParameterType>;
```

Drivers must at minimum support `string`, and should support the full
recommended set, which are the types JavaScript runtimes bind natively (Node and
Bun bind binary data from any `ArrayBufferView` or `ArrayBuffer`). The parameter
type may be extended with database specific types, such as `Date`.

The placeholder style (for example `?`, `$1` or `:name`) and the mapping of
values to and from database types are database specific, and are not
standardized. Drivers must document both. Applications that need the same values
across databases can use the `transformInput` and `transformOutput`
[query options](#options).

#### Result Context

Queries return a result context. It is both an async iterable of rows and
provides convenience methods for collecting the rows as values or records:

```ts ignore
interface ResultObject<V = unknown[], R = Record<string, unknown>> {
  values: V;
  toRecord: () => R;
}

interface ResultIterableContext<
  V extends unknown[] = unknown[],
  R = Record<string, V[number]>,
> extends AsyncIterable<ResultObject<V, R>>, AsyncDisposable {
  columns(): Promise<string[]>;
  toValues(): Promise<V[]>;
  toRecords(): Promise<R[]>;
}
```

- The result is lazy: `query` returns it synchronously, and the query runs when
  the result is first consumed, or when its columns are requested. Errors, such
  as invalid SQL or a lost connection, are thrown by the consuming methods.
- `columns()` resolves to the column names of the result, without consuming the
  rows. The columns must be known also when there are no rows. Only when the
  database does not report the columns without rows may they be empty for an
  empty result, which the driver must document.
- Iterating the result streams the rows lazily, and `toValues` and `toRecords`
  collect them as arrays of values or records.
- The rows are not kept in memory, so a result can be consumed once: either
  iterated or collected. Consuming it again rejects with a `QueryError`. This
  keeps the memory use of streaming a massive result constant.
- A result holds its connection from when the query runs until all rows are read
  or the result is disposed. A started result that is not needed must therefore
  be read or disposed. Implementations should not buffer the rest of a result
  that is still being read in order to run other commands on the same
  connection, as it may not fit in memory; they may reject such commands
  instead.
- The result is asynchronously disposable: disposing stops fetching and releases
  the connection. Disposing a result that was never started does not run the
  query.
- The result is deliberately not awaitable (it has no `then` method), as
  thenables are unwrapped implicitly by `await` and by async functions that
  return them.

The `@stdext/database` package provides `createResultIterableContext` as a
helper for driver authors, which creates a result from a function starting the
query:

```ts ignore
interface ResultSource {
  columns: string[]; // known before the first row
  rows: AsyncIterable<unknown[]>;
}

function createResultIterableContext(
  start: () => Promise<ResultSource>,
): ResultIterableContext;
```

#### SQL Templates

Statements can also be written as tagged templates with the `sql` tag provided
by the `@stdext/database` package. The tag creates a `SqlTemplate`, which keeps
the SQL text and the interpolated values apart, independent of the placeholder
style of the database:

```ts ignore
interface SqlTemplate {
  readonly strings: readonly string[];
  readonly values: readonly ParameterType[];
}

type Statement = string | SqlTemplate;

await client.query(sql`SELECT * FROM users WHERE id = ${id}`).toRecords();
```

- `execute` and `query` accept a `SqlTemplate` in place of SQL text. The driver
  renders its own placeholders, and binds the values as parameters. Values must
  never be inserted into the SQL text.
- A template carries its values, so passing parameters with a template must
  reject with a `QueryError`.
- `prepare` only accepts SQL text, as a prepared statement is executed with new
  values each time.
- Further template features, such as escaping identifiers or composing
  fragments, are left to implementations.

The columns can be passed up front with
`createResultIterableContext(rows, { columns })`, so they are known when there
are no rows.

#### Options

Options are grouped and passed as the second constructor argument:

```ts ignore
interface Options {
  connectionOptions?: ConnectionOptions;
  queryOptions?: QueryOptions;
  transactionOptions?: TransactionOptions;
}
```

- `connectionOptions` and `transactionOptions` are empty placeholders in the
  spec, extended by the driver implementations with database specific options.
- `queryOptions` are merged into every query, and contain the standard query
  options:

```ts ignore
interface QueryOptions {
  signal?: AbortSignal;
  transformInput?: (value: unknown) => unknown;
  transformOutput?: (value: unknown) => unknown;
}
```

- Method level options are merged with the constructor level options, with the
  method level options taking precedence.
- When the `signal` is aborted, the implementation must stop the current query
  as soon as the database allows, release the connection, and reject with the
  abort reason. Databases with a synchronous API can only stop before a
  statement runs and between rows, while databases with a cancel mechanism
  should cancel the running statement.

### Capability Interfaces

Each capability is an independent interface. All methods resolve to a promise.

| Interface         | Methods                                              | Description                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connectable`     | `connectionUrl`, `connected`, `connect()`, `close()` | Connection lifecycle. Also `AsyncDisposable`. `connect` and `close` are idempotent. A failed `connect` rejects with a `ConnectionError`, leaves `connected` as `false`, and may be retried. See [Connecting](#connecting). |
| `Pingable`        | `ping()`                                             | Checks that the connection is alive. Throws a `ConnectionError` if not.                                                                                                                                                    |
| `Queryable`       | `execute()`, `query()`, `executeScript()`            | Executes statements and queries. See below.                                                                                                                                                                                |
| `Preparable`      | `prepare()`                                          | Creates a prepared statement.                                                                                                                                                                                              |
| `Transactionable` | `beginTransaction()`, `transaction()`                | Creates transactions.                                                                                                                                                                                                      |
| `Poolable`        | `acquire()`                                          | Acquires a pool client from a pool.                                                                                                                                                                                        |
| `Driverable`      | `driver`                                             | Wraps and exposes a `Driver`.                                                                                                                                                                                              |
| `Eventable`       | `eventTarget`                                        | Dispatches events.                                                                                                                                                                                                         |

#### Queryable

The minimal query surface:

```ts ignore
interface Queryable {
  execute(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): Promise<ExecuteResult>;
  query(
    sql: Statement,
    params?: QueryParameters,
    options?: QueryOptions,
  ): ResultIterableContext;
  executeScript(sql: string, options?: QueryOptions): Promise<void>;
}

interface ExecuteResult {
  affectedRows: number | undefined;
  lastInsertId?: number | bigint | string;
}
```

- `execute` executes a statement. `affectedRows` is the number of rows inserted,
  updated or deleted by it. Statements that modify no rows, such as `SELECT` or
  `CREATE TABLE`, report `0`; it is `undefined` only if the database does not
  report the number. `lastInsertId` is the id of the last inserted row, when the
  database reports it (such as the SQLite `rowid` or the MySQL auto increment
  id); databases without insert ids, such as Postgres, use `RETURNING` instead.
- `query` returns a lazy [result context](#result-context) for a query.
- `execute` and `query` run exactly one statement. Running several statements in
  one call is not portable (most databases only allow it without parameters, if
  at all), so drivers may reject it, and must not silently ignore statements.
- `executeScript` runs a script of one or more statements without parameters,
  such as a migration, and resolves when all have run. Databases without native
  support for running several statements must emulate it.
- After the object is closed, all three must reject with a `ConnectionError`.

#### Preparable

```ts ignore
interface Preparable {
  prepare(sql: string, options?: QueryOptions): Promise<PreparedStatement>;
}
```

The `PreparedStatement` provides `execute` and `query` without the `sql`
argument, plus its own lifecycle:

```ts ignore
interface PreparedStatement extends AsyncDisposable {
  readonly sql: string;
  readonly deallocated: boolean;
  deallocate(): Promise<void>;
  execute(params?, options?): Promise<ExecuteResult>;
  query(params?, options?): ResultIterableContext;
}
```

- `deallocate` is idempotent. Using a deallocated statement must reject with a
  `QueryError`.
- Disposing a prepared statement deallocates it.
- Databases without native prepared statements should fall back to preparing the
  statement on each execution, so that they remain compliant.

#### Transactionable

```ts ignore
interface Transactionable {
  beginTransaction(options?: TransactionOptions): Promise<Transaction>;
  transaction<T>(
    fn: (tx: Transaction) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T>;
}
```

- `transaction` begins a transaction, runs the callback, and commits on success.
  If the callback throws, the transaction is rolled back and the error is
  rethrown.

The `Transaction` provides the query and prepare methods, plus transaction
specific methods:

```ts ignore
interface Transaction
  extends AsyncDisposable, Queryable, Preparable, Transactionable {
  readonly inTransaction: boolean;
  commit(options?): Promise<void>;
  rollback(options?): Promise<void>;
  createSavepoint(name?: string, options?): Promise<void>;
  releaseSavepoint(name?: string, options?): Promise<void>;
}
```

- `inTransaction` indicates whether the transaction is active.
- Using a committed, rolled back or otherwise inactive transaction must reject
  with a `TransactionError`.
- Disposing an active transaction rolls it back.

#### Nested Transactions

Calling `beginTransaction()` or `transaction()` on an object that is already in
an active transaction creates a savepoint instead of a new transaction:

- The nested transaction's `commit()` releases the savepoint, and its
  `rollback()` rolls back to it. The enclosing transaction stays active and can
  still commit.
- Savepoint based nesting is the only portable mechanism across SQL databases:
  SQLite, Postgres, MySQL/MariaDB and MSSQL all support savepoints with these
  semantics, and none support true nested transactions.
- Implementations must always `BEGIN` before creating a savepoint, as engines
  differ on savepoints outside transactions (Postgres rejects them, SQLite
  treats the outermost savepoint as a transaction).
- Generated savepoint names must be plain unquoted identifiers (for example
  `sp_1`): identifier quoting differs per dialect, and Postgres truncates
  identifiers to 63 bytes.
- Rolling back to an outer savepoint invalidates nested transactions created
  after it; implementations must mark them as inactive so that they reject with
  a `TransactionError`.
- Nesting only applies on the same connection. Calling `Client.transaction()`
  inside a transaction acquires a separate pooled connection and starts an
  independent transaction; nest with `Transaction.transaction()` instead. With a
  `maxSize` of `1`, this waits for the transaction to end, which never happens;
  an `acquireTimeout` turns this into an error.

### Profiles and Compliance Matrix

The profiles are the classes users interact with. Each profile is a composition
of the mandatory capabilities:

| Class               | Extends                                                                                                        | Additional members                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Driver`            | `Optionable`, `Connectable`, `Pingable`, `Queryable`, `Preparable`, `Transactionable`, `Eventable`             |                                                                              |
| `Transaction`       | `AsyncDisposable`, `Queryable`, `Preparable`, `Transactionable`                                                | `inTransaction`, `commit`, `rollback`, `createSavepoint`, `releaseSavepoint` |
| `PreparedStatement` | `AsyncDisposable`                                                                                              | `sql`, `deallocated`, `deallocate`, `execute`, `query`                       |
| `PoolClient`        | `AsyncDisposable`, `Driverable`, `Pingable`, `Queryable`, `Preparable`, `Transactionable`                      | `connected`, `disposed`, `release`, `remove`                                 |
| `Client`            | `Optionable`, `Connectable`, `Pingable`, `Queryable`, `Preparable`, `Transactionable`, `Poolable`, `Eventable` |                                                                              |

- The `Driver` represents a single connection and is implemented by driver
  authors. Applications should use a `Client`.
- The `Client` manages a pool of drivers. Its query methods automatically
  acquire a pool client for the duration of the operation and release it after.
  See [Pooling](#pooling).
- The `PoolClient` wraps a single driver acquired from a pool.
- The interfaces are intentionally free of inheritance between capabilities. The
  semantic dependencies are encoded in the profiles instead: a `Transaction` and
  a `PreparedStatement` must always be queryable and disposable.

#### Constructor Signature

All profiles follow the same constructor signature:

```ts ignore
new Driver(connectionUrl: string | URL, options?: Options);
new Client(connectionUrl: string | URL, options?: ClientOptions);
```

- The `connectionUrl` can be either a string or a URL, interpreted according to
  the connection URI format of the database, such as the libpq connection URI
  for Postgres. Drivers should support the parameters of that format where they
  apply, and document the ones they support.
- The options object is the only `Record` argument, and can be extended by the
  implementations. Options take precedence over parameters in the URL, and
  connection options that are not part of the database's URI format must be
  passed through the options.
- The `ClientOptions` extends `Options` with the pool options (see
  [Pooling](#pooling)).

#### Connecting

- The connection is opened implicitly by the first operation, like the SQLite
  APIs of Node and Bun open the database on construction. Calling `connect()` is
  optional, and connects eagerly, for example to report connection errors early.
  Concurrent connects, implicit or explicit, share one attempt.
- Closing is explicit: once `close()` is called, operations reject with a
  `ConnectionError` until `connect()` is called again.
- When a connection is lost while a transaction is active, the database rolls
  the transaction back, so the transaction must be ended, and its operations
  must reject with a `ConnectionError`, instead of implicitly running on a new
  connection. Prepared statements of a lost connection must reject with a
  `QueryError`.
- `connectionOptions.connectTimeout` is the standard timeout for establishing a
  connection, in milliseconds. When it passes, connecting rejects with a
  `ConnectionError`.

### Pooling

Pooling is implicit and always enabled. A `Client` manages a pool of
connections:

```ts ignore
interface PoolOptions {
  lazyInitialization?: boolean; // default: false
  maxSize?: number; // default: 1
  acquireTimeout?: number; // ms, default: wait indefinitely
  idleTimeout?: number; // ms, default: keep idle connections
  maxLifetime?: number; // ms, default: no maximum
}
```

- `lazyInitialization`: when enabled, connections are only created when a
  connection is acquired and no idle connection is available while the pool is
  below `maxSize`. Otherwise, `connect()` creates and connects the connections
  up front.
- `maxSize`: the maximum amount of connections in the pool. It defaults to `1`,
  which makes the client behave like a single connection. The client becomes a
  connection pool when `maxSize` is raised. Databases without connection pools
  may emulate the pool with fewer connections than `maxSize`, and must reflect
  the actual size in the options.
- `acquireTimeout`: how long `acquire()` waits for a connection when the pool is
  exhausted, after which it rejects with a `ConnectionError`.
- `idleTimeout`: how long a connection may be idle in the pool before it is
  closed. A new connection is opened when one is needed again.
- `maxLifetime`: the maximum age of a connection. A connection that reached it
  is closed instead of reused, once it is no longer in use.

Implementations should support `acquireTimeout`, `idleTimeout` and
`maxLifetime`, and document it if they do not.

Lifecycle and rules:

- The client connects implicitly on the first operation, see
  [Connecting](#connecting). `acquire()` on a closed client must reject with a
  `ConnectionError`.
- `acquire()` resolves to a connected `PoolClient`. If the pool is at `maxSize`
  with no idle connections, `acquire()` waits until a connection is released or
  removed.
- A pool client must be released back to the pool with `release()`, or destroyed
  with `remove()` when the connection is in a broken state so it is not reused.
  Both are idempotent, and both mark the pool client as disposed. Disposing a
  pool client releases it.
- The query methods (`execute`, `query`, `executeScript`) automatically acquire
  a pool client and release it when the operation completes. A `query` result
  acquires its connection when the query runs, and holds it until the result is
  fully read or disposed. A started result that is neither read nor disposed
  holds its connection, so an `acquireTimeout` is recommended to turn such a
  leak into an error.
- `beginTransaction` and `prepare` acquire a pool client that is held until the
  transaction is finished or the prepared statement is deallocated.
- `Client.close()` closes all connections in the pool and is idempotent.
  Disposing a client closes it.

### Errors

All errors thrown by a compliant driver extend `DatabaseError`:

| Error              | Thrown when                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `DatabaseError`    | Base class for all database errors                                                       |
| `ConnectionError`  | The connection could not be established, was closed, or is not alive                     |
| `QueryError`       | A query or statement could not be executed, or a deallocated prepared statement was used |
| `TransactionError` | A transaction operation failed, or an inactive transaction was used                      |

### Events

`Driver` and `Client` are `Eventable` and dispatch events on their
`eventTarget`:

| Event     | Dispatched when                                                             |
| --------- | --------------------------------------------------------------------------- |
| `connect` | A connection is established (for a pool: when a pooled connection connects) |
| `close`   | A connection is about to be closed                                          |
| `error`   | An error is triggered                                                       |
| `acquire` | A connection is acquired from the pool (client only)                        |
| `release` | A connection is released back to the pool (client only)                     |

All events carry a detail with a `client` property containing the object that
dispatched the event: a `Driver` for driver events and a `Client` for client
events. `error` events additionally carry the `error`.

### Extending the Interfaces

The interfaces are meant to be extended with database specific methods. As these
methods are not defined in the specs, the specs provide the following guidance
for the method signatures.

In general we follow
[Deno's Style Guide for methods](https://docs.deno.com/runtime/contributing/style_guide/#exported-functions%3A-max-2-args%2C-put-the-rest-into-an-options-object)

> 1. A function takes 0-2 required arguments, plus (if necessary) an options
>    object (so max 3 total).
>    - A function could for example also take only one argument which is an
>      options object.
> 2. Optional parameters should generally go into the options object.
> 3. The 'options' argument is the only argument that is a `Record` type
>    `Object`.

Extension examples: SQL template features such as identifiers and fragments,
`queryOne` / `queryMany` convenience wrappers, batch operations, subscriptions,
and database specific features such as SQLite blob I/O or Postgres
`LISTEN`/`NOTIFY`.

## Implementation

> This section is for implementing the interface for database drivers. For
> general usage, read the [specification](#specification) section or look at the
> [examples](#examples).

To be fully compliant with the specs, you will need to implement the following
classes for your database driver:

- `Driver`: a single connection to the database.
- `PreparedStatement`: see [Preparable](#preparable).
- `Transaction`: see [Transactionable](#transactionable).
- `Client`: the pooled client, see [Pooling](#pooling).
- `PoolClient`: the pool client, see
  [Profiles and Compliance Matrix](#profiles-and-compliance-matrix).

The `@stdext/database/sql` package contains the TypeScript interfaces and helper
utilities to implement against, and `@stdext/database/sql/testing` contains a
conformance test suite:

```ts ignore
import { testClientIntegration } from "@stdext/database/sql/testing";

Deno.test("MyClient conformance", async (t) => {
  await testClientIntegration(t, MyClient, [connectionUrl, options], {
    execute: "CREATE TABLE users (id INTEGER, name TEXT)",
    query: "SELECT id, name FROM users",
    columns: ["id", "name"],
    count: 3,
    parameterQuery: "SELECT ? AS value",
  });
});
```

A driver that passes the conformance suite is compliant with this specification.

The `@stdext/database/drivers/core` package contains base classes that implement
the specification on top of a few database specific primitives (connecting,
closing, pinging, and executing, querying or preparing a single statement),
including the connection pool and savepoint based nested transactions.

## Examples

Connect and query (the connection is opened by the first operation):

FENCEts ignore await using client = new Client(connectionUrl);

await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");

const result = client.query("SELECT id, name FROM users"); console.log(await
result.columns()); // ["id", "name"] console.log(await result.toRecords()); //
[{ id: 1, name: "Alice" }] FENCE

Streaming a large result, with constant memory use:

FENCEts ignore for await (const row of client.query("SELECT * FROM events")) {
console.log(row.toRecord()); } FENCE

SQL templates, with placeholders rendered by the driver:

FENCEts ignore const { affectedRows, lastInsertId } = await client.execute(
sql`INSERT INTO users (name) VALUES (${name})`, ); const users = await
client.query(sql`SELECT * FROM users WHERE name = ${name}`) .toRecords(); FENCE

Prepared statement, with the placeholder style of the database (`?` in SQLite,
`$1` in Postgres):

FENCEts ignore await using stmt = await client.prepare("SELECT * FROM users
WHERE id = ?"); console.log(await stmt.query([1]).toRecords()); // disposed
(deallocated) at the end of the scope FENCE

Transaction:

FENCEts ignore await using tx = await client.beginTransaction(); await
tx.execute("INSERT INTO users (name) VALUES ('Alice')"); await tx.commit(); //
if the scope ends without a commit, the transaction is rolled back FENCE

Transaction wrapper:

FENCEts ignore const users = await client.transaction(async (tx) => { await
tx.execute("INSERT INTO users (name) VALUES ('Alice')"); return await
tx.query("SELECT * FROM users").toRecords(); }); FENCE

Script:

FENCEts ignore await
client.executeScript(`CREATE TABLE users (id INTEGER, name TEXT);
  CREATE INDEX users_name ON users (name);`);
FENCE

Manual pool usage:

FENCEts ignore await using poolClient = await client.acquire(); await
poolClient.execute("INSERT INTO users (name) VALUES ('Bob')"); // released back
to the pool at the end of the scope FENCE

## Acknowledgment

Thanks to [kt3k](https://github.com/kt3k) and
[iuioiua](https://github.com/iuioiua) from the Deno team for support
