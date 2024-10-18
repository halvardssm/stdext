# RFC: @std/sql - Standardized SQL Database Interface Specification

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

Although the spec is shown using TypeScript, there is no requirement to import
any types, or classes as long as the specs are followed. With the release, or
shortly after, a repo will be specified/available on GitHub which will contain
types, helper utilities, and a test suite. This will be published on
[JSR](https://jsr.io/), and potentially also on [NPM](https://www.npmjs.com/).

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
extended) that can be implemented across database drivers.

Below there is a comparison of how to execute a query in the different drivers
taken from the respective readmes.

**Node: mysql** ([link](https://github.com/mysqljs/mysql))

```ts
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

```ts
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

```ts
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

```ts
import Database from "better-sqlite3";
const db = new Database("foobar.db", options);

const row = db.prepare("SELECT 1 + 1 AS solution").get(userId);
console.log(row.solution);
```

**Node: pg** ([link](https://github.com/brianc/node-postgres))

```ts
import pg from "pg";
const { Client } = pg;
const client = new Client();
await client.connect();

const res = await client.query("SELECT 1 + 1 AS solution");
console.log(res.rows[0].solution);
await client.end();
```

**Node: postgres** ([link](https://github.com/porsager/postgres))

```ts
import postgres from "postgres";

const sql = postgres({
  /* options */
});
const res = await sql`SELECT 1 + 1 AS solution`;
console.log(res[0].solution);
```

**Deno: mysql** ([link](https://github.com/denodrivers/mysql/))

```ts
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

```ts
import { Database } from "jsr:@db/sqlite@0.11";

const db = new Database("test.db");

const [solution] = db.prepare("SELECT 1 + 1 AS solution").value<[string]>()!;
console.log(solution);
db.close();
```

**Deno: postgres** ([link](https://github.com/denodrivers/postgres))

```ts
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
- Query execution
- Transaction handling
- Error handling and reporting
- Data type mappings
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

## Specification

The following section contains the main interfaces introduced in this RFC.

This spec defines two main APIs, the low level API provides the bare minimum of
connecting and querying the database, while the high level API provides high
level methods for querying, prepared statements and transactions.

- The low level interface will be named as `Driver`.
- The high level interface will be named `Client`.

The separation between `Driver` and `Client` is so that they can be implemented
in separation and also be exchangeable. A `Driver` can have many `Clients`
supporting it, and a `Client` can have many supported `Drivers`.

A `Client` will use the `Driver` for querying the database, and provide higher
level and more specified methods.

> All methods per spec can be either async or sync. The respective
> implementations decide which to implement. The following examples shows async.

### Driver API

The `Driver` provides the low level connection to a database.

The constructor have the following signature:

```ts
interface DriverConstructor {
  new (
    // Can be either/or a string/URL depending on the implementation
    connectionUrl: string | URL,
    // Can be required depending on the implementation
    options?: DriverOptions,
  ): Driver;
}
```

- The `connectionUrl` can be either/or a string/URL. This is left up to the
  database implementations. It can not be a Record, and if aditional connection
  options have to be passed, it can be done passing it as URL Parameters or
  using `options.connectionOptions`.
- The `options` is an object that can be extended by the database
  implementations. This is where all aditional configuration options are placed.
  See below for signature.

```ts
type DriverOptions = {
  connectionOptions?: {};
  queryOptions?: {};
};
```

- The `connectionOptions` is by spec an empty placeholder that can be extended
  by the respective implementations. It contains additional configuration for
  connecting to the database.
- The `queryOptions` is by spec an empty placeholder that can be extended by the
  respective implementations. It contains base configurations that will be
  passed to the queries, and merged with the method level query options. It is
  up to the database implementations how this should be done. An example of
  possible configuration is query hooks to transform the query before execution
  or transform a result such as mapping of types depending on a column.
- The `DriverOptions` can also be extended to fit the needs of the database
  implementation.

#### Initialization & Explicit Resource Management

The `Driver` can be initialized normally and also by using explicit resource
management.

```ts
const driver = new Driver(connectionUrl, connectionOptions);
await driver.connect();
// When a connection is no longer needed, it must be closed by the `close` method.
await driver.close();
```

The driver interface also utilizes the proposed
[Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)
to automatically dispose of the connection.

```ts
await using driver = new Driver(connectionUrl, connectionOptions);
await driver.connect();
// no need to close the connection at the end
```

#### Properties

The `Driver` implements the following properties:

```ts
interface Driver {
  readonly connectionUrl: string | URL;
  readonly options: DriverOptions;
  readonly connected: boolean;
  connect(): Promise<void> | void;
  close(): Promise<void> | void;
  ping(): Promise<void> | void;
  query(
    sql: string,
    params?: ParameterType[] | Record<string, ParameterType>,
    options?: QueryOptions,
  ): AsyncGenerator<DriverQueryNext> | Generator<DriverQueryNext>;
}
```

- `connected`: Indicates if the connection has been started with the database.
- `connect`: Initializes the connection to the database.
- `close`: Close the connection to the database
- `ping`: Pings the database connection to check that it's alive, otherwise
  throws (See [errors](#errors) for more information).
- `query`: Queries the database. It takes three arguments and returns a
  Generator
  - `sql` is the sql string
  - `params` is the parameters to pass if using variables in the sql string.
    Depending on the implementation, it can take an array or a record.
  - `options` is the query options, it will be combined with the query options
    given to the driver options (if given).

The `ParameterType` depends on the implementation and must at least include
`string`, but it is recommended that it should cover all primitives as well as
common objects such as Date.

```ts
// At minimum
type ParameterType = string;

// Example of well implemented
type ParameterType =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | Date
  | Uint8Array;
```

Going forward, we will use the following type as a shorthand for the parameter
argument and the return type.

```ts
type Parameters = ParameterType[] | Record<string, ParameterType>;
type ReturnValue = unknown;
```

The `DriverQueryNext` is the result object from the database, it represents a
returned row.

```ts
export type DriverQueryNext = {
  columns: string[];
  values: ReturnValue[];
  meta: {};
};
```

- `columns` is the column headers in the same order as the values.
- `values` is the values in the same order as the columns, the type should be
  defined by the database.
- `meta` contains additional information regarding the query, such as execution
  time etc. The content depends on the implementation and the database.

### Client API

The `Client` provides the high level connection to a database.

It follows the same constructor signature as defined for the
[Driver](#driver-api). However, it is not required to have the same signature
for the `Driver` and the `Client`, this is left up to the implementations.

The `Client` also shares its use of
[Explicit Resource Management](#initialization--explicit-resource-management)
with the `Driver`, and also implements all of the properties from the `Driver`,
except for `query`.

The `query` property is the only exception as this is a low level method and can
be accessed using the `driver` property.

#### Properties

```ts
interface Client extends Queriable, Preparable, Transactionable {
  ... // other properties defined by the Driver
  readonly driver: Driver;
  ... // other properties defined further down
}
```

- The `driver` property, contains an instance of the low level driver. The
  average developer would not need to access this, but it can be useful for
  advanced usecases.

The driver also contains aditional properties for different usecases

##### Queriable

The client provides the following methods for querying.

```ts
interface Queriable {
  execute(
    sql: string,
    params?: Parameters,
    options?: IQueryOptions,
  ): Promise<number | undefined> | number | undefined;
  query(
    sql: string,
    params?: Parameters,
    options?: IQueryOptions,
  ): Promise<ReturnValue[]> | ReturnValue[];
  queryOne(
    sql: string,
    params?: Parameters,
    options?: IQueryOptions,
  ): Promise<ReturnValue | undefined> | ReturnValue | undefined;
  queryMany(
    sql: string,
    params?: Parameters,
    options?: IQueryOptions,
  ): AsyncGenerator<ReturnValue> | Generator<ReturnValue>;
  queryArray(
    sql: string,
    params?: Parameters,
    options?: IQueryOptions,
  ): Promise<ReturnValue[]> | ReturnValue[];
  queryOneArray(
    sql: string,
    params?: Parameters,
    options?: IQueryOptions,
  ): Promise<ReturnValue | undefined> | ReturnValue | undefined;
  queryManyArray(
    sql: string,
    params?: Parameters,
    options?: IQueryOptions,
  ): AsyncGenerator<ReturnValue> | Generator<ReturnValue>;
  sql(
    strings: TemplateStringsArray,
    ...parameters: ParameterType[] | Record<string, ParameterType>
  ): Promise<ReturnValue[]> | ReturnValue[];
  sqlArray(
    strings: TemplateStringsArray,
    ...parameters: ParameterType[] | Record<string, ParameterType>
  ): Promise<ReturnValue[]> | ReturnValue[];
}
```

See [Driver Properties](#properties) for the argument descriptions.

- `execute`: Executes a SQL statement
- `query`: Queries the database and returns an array of object
- `queryOne`: Queries the database and returns at most one entry as an object
- `queryMany`: Queries the database with an async generator and yields each
  entry as an object. This is good for when you want to iterate over a massive
  amount of rows.
- `queryArray`: Queries the database and returns an array of arrays
- `queryOneArray`: Queries the database and returns at most one entry as an
  array
- `queryManyArray`: Queries the database with an async generator and yields each
  entry as an array. This is good for when you want to iterate over a massive
  amount of rows.
- `sql`: Allows you to create a query using template literals, and returns the
  entries as an array of objects. This is a wrapper around `query`
- `sqlArray`: Allows you to create a query using template literals, and returns
  the entries as an array of arrays. This is a wrapper around `queryArray`

See the [examples](#examples) section for sample usage.

##### Prepared statement

Transactions implement
[Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management).
A prepared statement can be created with the provided method.

```ts
interface Preparable extends Queriable {
  prepare(
    sql: string,
    options?: QueryOptions,
  ): Promise<PreparedStatement> | PreparedStatement;
}
```

- `prepare`: Returns a `PreparedStatement` class

The `PreparedStatement` class provides a subset of the client methods for
querying.

```ts
interface PreparedStatement {
  readonly sql: string;
  readonly deallocated: boolean;
  deallocate(): Promise<void>;
  execute(
    params?: Parameters,
    options?: QueryOptions,
  ): Promise<number | undefined> | number | undefined;
  query(
    params?: Parameters,
    options?: QueryOptions,
  ): Promise<ReturnValue[]> | ReturnValue[];
  queryOne(
    params?: Parameters,
    options?: QueryOptions,
  ): Promise<ReturnValue | undefined> | ReturnValue | undefined;
  queryMany(
    params?: Parameters,
    options?: QueryOptions,
  ): AsyncGenerator<ReturnValue> | Generator<ReturnValue>;
  queryArray(
    params?: Parameters,
    options?: QueryOptions,
  ): Promise<ReturnValue[]> | ReturnValue[];
  queryOneArray(
    params?: Parameters,
    options?: QueryOptions,
  ): Promise<ReturnValue | undefined> | ReturnValue | undefined;
  queryManyArray(
    params?: Parameters,
    options?: QueryOptions,
  ): AsyncGenerator<ReturnValue> | Generator<ReturnValue>;
}
```

See [Queriable](#queriable) for the query descriptions.

- `sql` is the sql string for the prepared statement
- `deallocated` signifies if the prepared statement was dealocated
- `dealocate` dealocates a prepared statement, once a prepared statement is
  dealocated, it can no longer be used, and be removed from scope to be GCd.

See the [examples](#examples) section for sample usage.

##### Transaction

Transactions implement
[Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management).
A transaction can be created with the provided methods.

```ts
interface Transactionable {
  beginTransaction(
    options?: TransactionOption,
  ): Promise<Transaction> | Transaction;
  transaction(
    fn: (t: Transaction) => Promise<ReturnValue> | ReturnValue,
    options?: TransactionOption,
  ): Promise<ReturnValue> | ReturnValue;
}
```

- `beginTransaction` Returns a `Transaction` class
- `transaction` A wrapper function for transactions, handles the logic of
  beginning, committing and rollback a transaction.

The `TransactionOptions` is defined here as an empty placeholder, and
implementation depends on the database.

The `Transaction` class provides the client methods for `querying`, and also
provides the `prepare` method.

```ts
interface Transaction extends Queriable, Preparable {
  ... // other Queriable and Preparable properties
  readonly inTransaction: boolean;
  commitTransaction(options?: TransactionOptions): Promise<void> | void;
  rollbackTransaction(options?: TransactionOptions): Promise<void> | void;
  createSavepoint(name?: string, options?: TransactionOptions): Promise<void> | void;
  releaseSavepoint(name?: string, options?: TransactionOptions): Promise<void> | void;
}
```

See the [examples](#examples) section for sample usage.

#### Pool Client

There are two types of clients, a `Client` used for a single connection, and a
`ClientPool` for when a pool of clients (`PoolClient`, a subset of `Client`) is
needed. Both the `Client` and the `ClientPool` provide the same base signature,
although the `options` argument differs slightly (see
[Properties](#properties-2)).

The `PoolClients` in a `ClientPool` can either be eagerly or lazily connected
when calling the `connect` method. The `PoolClient`s can then be acquired when
needed.

```ts
const pool = new ClientPool(connectionUrl, connectionOptions);
await pool.connect();
const client = await pool.acquire(); // returns a PoolClient class
```

After a `PoolClient` is no longer needed, it must be released back to the pool
using the `release` method.

```ts
await client.release();
```

> A `PoolClient` can also be destroyed (disconnected and removed) by using the
> `remove` method.

When the pool is no longer needed, it must be closed by the `close` method. The
`close` method will close all the connections in the pool.

```ts
await client.close();
```

Using
[Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management),
no manual release or close is needed.

```ts
await using pool = new ClientPool(connectionUrl, connectionOptions);
await pool.connect();
await using client = await pool.acquire();
// no need to release the client at the end
// no need to close the pool at the end
```

##### Properties

The `ClientPool` follows the same constructor signature as defined for the
[Client](#client-api) and [Driver](#driver-api), although the `options` argument
is extended. The same options object that is used for a `ClientPool` should be
possible to use with a `Client`, the reverse is not required, but would allow
for better develoment experience.

```ts
export interface Options {
  ...  // client options defined above
  poolOptions: {
    lazyInitialization?: boolean;
    maxSize?: number;
  };
}
```

- `lazyInitialization` will enable lazily initialization of connections. This
  means that connections will only be created if there are no idle connections
  available when acquiring a connection, and max pool size has not been reached.
- `maxSize` sets the maximum amount of pool clients.

```ts
interface ClientPool extends Queriable, Preparable, Transactionable {
  ... // other Queriable, Preparable and Transactionable properties that will automatically allocate a PoolClient
  /**
   * Create a connection to the database
   */
  connect(): Promise<void>|void;

  /**
   * Close the connection to the database
   */
  close(force?: boolean | number): Promise<void>|void;

  /**
   * Acquire a connection from the pool
   */
  acquire(): Promise<PoolClient>|PoolClient;
  remove(client:PoolClient):Promise<void>|void
}
```

> The `PoolClient` should extend the query methods of the `Client` and
> facilitate `aquire` and `release` behind the scenes when calling them.

- `connect` establishes a connection to the database for the PoolClients. If
  `lazyInitialization` is set to true, no connections will be established until
  aquired.
- `close` waits for all clients to be released (will not allow for new ones to
  be created) and closes all connections to the database. If the `force`
  argument is passed as true, the connections will imediately be closed without
  waiting. If the `force` argument is passed as a number, it will wait up to the
  number in milliseconds for it to be released or force close the connections.

```ts
interface PoolClient extends Queriable, Preparable, Transactionable {
  ... // other Queriable, Preparable and Transactionable properties
  readonly disposed: boolean;
  release(): Promise<void> | void;
  remove(): Promise<void> | void
}
```

- `disposed` indicates if the pool client is released or removed
- `release` releases the connection back to the pool
- `remove` closes the connection and removes the client from the pool

## Implementation

> This section is for implementing the interface for database drivers. For
> general usage, read the [specification](#specification) section or look at the
> [examples](#examples).

To be fully compliant with the specs, you will need to implement the following
classes for your database driver:

- `Connection`: This represents the connection to the database. This should
  preferably only contain the functionality of containing a connection, and
  provide a minimum set of query methods to be used to query the database
- `PreparedStatement`: This represents a prepared statement.
- `Transaction`: This represents a transaction.
- `Client`: This represents a database client
- `ClientPool`: This represents a pool of clients
- `PoolClient`: This represents a client to be provided by a pool

It is also however advisable to create additional helper classes for easier
inheritance (see the [inheritance graph](#inheritance-graph)).

### Inheritance graph

Here is an overview of the inheritance and flow of the different interfaces. In
most cases, these are the classes and the inheritance graph that should be
implemented.

![inheritance flow](./_assets/inheritance_flowchart.jpg)

## Examples

> All methods per spec can be either async or sync. The respective
> implementations decide which to implement. The following examples shows async.

Async dispose

```ts
await using client = new Client(connectionUrl, connectionOptions);
await client.connect();
await client.execute("SOME INSERT QUERY");
const res = await client.query("SELECT * FROM table");
```

Using const (requires manual close at the end)

```ts
const client = new Client(connectionUrl, connectionOptions);
await client.connect();
await client.execute("SOME INSERT QUERY");
const res = await client.query("SELECT * FROM table");
await client.close();
```

Query objects

```ts
const res = await client.query("SELECT * FROM table");
console.log(res);
// [{ col1: "some value" }]
```

Query one object

```ts
const res = await client.queryOne("SELECT * FROM table");
console.log(res);
// { col1: "some value" }
```

Query many objects with an iterator

```ts
const res = Array.fromAsync(client.queryMany("SELECT * FROM table"));
console.log(res);
// [{ col1: "some value" }]

// OR

for await (const iterator of client.queryMany("SELECT * FROM table")) {
  console.log(res);
  // { col1: "some value" }
}
```

Query as an array

```ts
const res = await client.queryArray("SELECT * FROM table");
console.log(res);
// [[ "some value" ]]
```

Query one as an array

```ts
const res = await client.queryOneArray("SELECT * FROM table");
console.log(res);
// [[ "some value" ]]
```

Query many as array with an iterator

```ts
const res = Array.fromAsync(client.queryManyArray("SELECT * FROM table"));
console.log(res);
// [[ "some value" ]]

// OR

for await (const iterator of client.queryManyArray("SELECT * FROM table")) {
  console.log(res);
  // [ "some value" ]
}
```

Query with template literals as an object

```ts
const res = await client.sql`SELECT * FROM table where id = ${id}`;
console.log(res);
// [{ col1: "some value" }]
```

Query with template literals as an array

```ts
const res = await client.sqlArray`SELECT * FROM table where id = ${id}`;
console.log(res);
// [[ "some value" ]]
```

Transaction

```ts
const transaction = await client.beginTransaction();
await transaction.execute("SOME INSERT QUERY");
await transaction.commitTransaction();
// `transaction` can no longer be used, and a new transaction needs to be created
```

Transaction wrapper

```ts
const res = await client.transaction(async (t) => {
  await t.execute("SOME INSERT QUERY");
  return t.query("SOME SELECT QUERY");
});
console.log(res);
// [{ col1: "some value" }]
```

Prepared statement

```ts
const prepared = db.prepare("SOME PREPARED STATEMENT");
await prepared.query([...params]);
console.log(res);
// [{ col1: "some value" }]
```

## Acknowledgment

Thanks to [kt3k](https://github.com/kt3k) and
[iuioiua](https://github.com/iuioiua) from the Deno team for support
