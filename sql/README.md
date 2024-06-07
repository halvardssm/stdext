# @stdext/sql

The SQL package contains a standard interface for SQL based databases

Inspired by [rust sqlx](https://docs.rs/sqlx/latest/sqlx/index.html) and
[go sql](https://pkg.go.dev/database/sql).

The goal for this package is to have a standard interface for SQL like database
clients that can be used in Deno, Node and other JS runtimes.

## Usage

Minimal usage example:

```ts
await using db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const res = await db.query("SELECT * FROM table");
```

`@stdext/std` provides a standard for interacting with a database.

### Client

Full compliance with `@stdext/std` provides a database client with the following
methods (see [SqlClient](./client.ts)):

- `connect` (See [SqlConnection](./connection.ts)): Creates a connection to the
  database
- `close` (See [SqlConnection](./connection.ts)): Closes the connection to the
  database
- `execute` (See [SqlQueriable](./core.ts)): Executes a SQL statement
- `query` (See [SqlQueriable](./core.ts)): Queries the database and returns an
  array of object
- `queryOne` (See [SqlQueriable](./core.ts)): Queries the database and returns
  at most one entry as an object
- `queryMany` (See [SqlQueriable](./core.ts)): Queries the database with an
  async generator and yields each entry as an object
- `queryArray` (See [SqlQueriable](./core.ts)): Queries the database and returns
  an array of arrays
- `queryOneArray` (See [SqlQueriable](./core.ts)): Queries the database and
  returns at most one entry as an array
- `queryManyArray` (See [SqlQueriable](./core.ts)): Queries the database with an
  async generator and yields each entry as an array
- `sql` (See [SqlQueriable](./core.ts)): Allows you to create a query using
  template literals, and returns the entries as an array of objects. This is a
  wrapper around `query`
- `sqlArray` (See [SqlQueriable](./core.ts)): Allows you to create a query using
  template literals, and returns the entries as an array of arrays. This is a
  wrapper around `queryArray`
- `prepare` (See [SqlPreparable](./core.ts)): Returns a prepared statement class
  that contains a subset of the Queriable functions (see
  [SqlPreparedQueriable](./core.ts))
- `beginTransaction` (See [SqlTransactionable](./core.ts)): Returns a
  transaction class that contains implements the queriable functions, as well as
  transaction related functions (see [SqlTransactionQueriable](./core.ts))
- `transaction` (See [SqlTransactionable](./core.ts)): A wrapper function for
  transactions, handles the logic of beginning, committing and rollback a
  transaction.

#### Events

The following events can be subscribed to according to the specs (see
[events.ts](./events.ts)):

- `connect`: Gets dispatched when a connection is established
- `close`: Gets dispatched when a connection is about to be closed
- `error`: Gets dispatched when an error is triggered

### ClientPool

Full compliance with `@stdext/std` provides a database client pool (a pool of
clients) with the following methods (see [SqlClientPool](./pool.ts)):

- `connect` (See [SqlConnection](./core.ts)): Creates the connection classes and
  adds them to a connection pool, and optionally connects them to the database
- `close` (See [SqlConnection](./core.ts)): Closes all connections in the pool
- `acquire` (See [SqlPoolable](./core.ts)): Retrieves a
  [SqlPoolClient](./pool.ts) (a subset of [Client](#client)), and connects it if
  not already connected

#### Events

The following events can be subscribed to according to the specs (see
[events.ts](./events.ts)):

- `connect`: Gets dispatched when a connection is established for a pool client
  (with lazy initialization, it will only get triggered once a connection is
  popped and activated)
- `close`: Gets dispatched when a connection is about to be closed
- `error`: Gets dispatched when an error is triggered
- `acquire`: Gets dispatched when a connection is acquired from the pool
- `release`: Gets dispatched when a connection is released back to the pool

### Examples

Using const (requires manual close at the end)

```ts
const db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const res = await db.query("SELECT * FROM table");
await db.close();
```

Query object

```ts
await using db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const res = await db.query("SELECT * FROM table");
console.log(res);
// [{ col1: "some value" }]
```

Query array

```ts
await using db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const res = await db.queryArray("SELECT * FROM table");
console.log(res);
// [[ "some value" ]]
```

Query with template literals

```ts
await using db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const res = await db.sqlArray`SELECT * FROM table where id = ${id}`;
console.log(res);
// [[ "some value" ]]
```

Transaction

```ts
await using db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const transaction = await db.beginTransaction();
await transaction.execute("SOME INSERT QUERY");
await transaction.commitTransaction();
// transaction can no longer be used
```

Transaction wrapper

```ts
await using db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const res = await db.transaction(async (t) => {
  await t.execute("SOME INSERT QUERY");
  return t.query("SOME SELECT QUERY");
});
console.log(res);
// [{ col1: "some value" }]
```

Prepared statement

```ts
await using db = new Client(connectionUrl, connectionOptions);
await db.connect();
await db.execute("SOME INSERT QUERY");
const prepared = db.prepare("SOME PREPARED STATEMENT");
await prepared.query([...params]);
console.log(res);
// [{ col1: "some value" }]
```

## Implementation

To be fully compliant with `@stdext/std`, you will need to implement the
following classes for your database driver:

- `Connection` ([SqlConnection](./connection.ts)): This represents the
  connection to the database. This should preferably only contain the
  functionality of containing a connection, and provide a minimum set of query
  methods to be used to query the database
- `PreparedStatement` ([SqlPreparedStatement](./core.ts)): This represents a
  prepared statement. All queriable methods must be implemented
- `Transaction` ([SqlTransaction](./core.ts)): This represents a transaction.
  All queriable methods must be implemented
- `Client` ([SqlClient](./client.ts)): This represents a database client
- `ClientPool` ([SqlClientPool](./pool.ts)): This represents a pool of clients
- `PoolClient` ([SqlPoolClient](./pool.ts)): This represents a client to be
  provided by a pool

It is also however advisable to create additional helper classes for easier
inheritance. See [test.ts](./test.ts) for a minimum but functional example of
how to implement these interfaces.

### Inheritance graph

Here is an overview of the inheritance and flow of the different interfaces. In
most cases, these are the classes and the inheritance graph that should be
implemented.

![inheritance flow](./_assets/inheritance_flowchart.jpg)
