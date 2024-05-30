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
methods (see [SqlClient](./lib/client.ts)):

- `connect` (See [SqlConnection](./lib/connection.ts)): Creates a connection to
  the database
- `close` (See [SqlConnection](./lib/connection.ts)): Closes the connection to
  the database
- `execute` (See [SqlQueriable](./lib/core.ts)): Executes a SQL statement
- `query` (See [SqlQueriable](./lib/core.ts)): Queries the database and returns
  an array of object
- `queryOne` (See [SqlQueriable](./lib/core.ts)): Queries the database and
  returns at most one entry as an object
- `queryMany` (See [SqlQueriable](./lib/core.ts)): Queries the database with an
  async generator and yields each entry as an object
- `queryArray` (See [SqlQueriable](./lib/core.ts)): Queries the database and
  returns an array of arrays
- `queryOneArray` (See [SqlQueriable](./lib/core.ts)): Queries the database and
  returns at most one entry as an array
- `queryManyArray` (See [SqlQueriable](./lib/core.ts)): Queries the database
  with an async generator and yields each entry as an array
- `sql` (See [SqlQueriable](./lib/core.ts)): Allows you to create a query using
  template literals, and returns the entries as an array of objects. This is a
  wrapper around `query`
- `sqlArray` (See [SqlQueriable](./lib/core.ts)): Allows you to create a query
  using template literals, and returns the entries as an array of arrays. This
  is a wrapper around `queryArray`
- `prepare` (See [SqlPreparable](./lib/core.ts)): Returns a prepared statement
  class that contains a subset of the Queriable functions (see
  [SqlPreparedQueriable](./lib/core.ts))
- `beginTransaction` (See [SqlTransactionable](./lib/core.ts)): Returns a
  transaction class that contains implements the queriable functions, as well as
  transaction related functions (see [SqlTransactionQueriable](./lib/core.ts))
- `transaction` (See [SqlTransactionable](./lib/core.ts)): A wrapper function
  for transactions, handles the logic of beginning, committing and rollback a
  transaction.

### ClientPool

Full compliance with `@stdext/std` provides a database client pool (a pool of
clients) with the following methods (see [SqlClientPool](./lib/pool.ts)):

- `connect` (See [SqlConnection](./lib/core.ts)): Creates the connection classes
  and adds them to a connection pool, and optionally connects them to the
  database
- `close` (See [SqlConnection](./lib/core.ts)): Closes all connections in the
  pool
- `acquire` (See [SqlPoolable](./lib/core.ts)): Retrieves a
  [SqlPoolClient](./lib/pool.ts) (a subset of [Client](#client)), and connects
  it if not already connected
- `release` (See [SqlPoolable](./lib/core.ts)): Releases a connection back to
  the pool

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

- `Connection` ([SqlConnection](./lib/connection.ts)): This represents the
  connection to the database. This should preferably only contain the
  functionality of containing a connection, and provide a minimum query method
  to be used to query the database. The query method does not need to follow any
  specific spec, but must be consumable by all query functions as well as
  execute functions (see `SqlQueriable`)
- `Prepared` ([SqlPreparedQueriable](./lib/core.ts)): This represents a prepared
  statement. All queriable methods must be implemented
- `Transaction` ([SqlTransactionQueriable](./lib/core.ts)): This represents a
  transaction. All queriable methods must be implemented
- `Client` ([SqlClient](./lib/client.ts)): This represents a database client
- `ClientPool` ([SqlClientPool](./lib/pool.ts)): This represents a pool of
  clients
- `PoolClient` ([SqlPoolClient](./lib/pool.ts)): This represents a client to be
  provided by a pool

It is also however advisable to create the following sub classes to use in other
classes:

- [SqlQueriable](./lib/core.ts): This represents a queriable base class that
  contains the standard `@stdext/std` query methods. In most cases, this serves
  as a base class for all other queriable classes
- [SqlEventTarget](./lib/events.ts): A typed event target class
- [SqlError](./lib/errors.ts): A typed error class

### Inheritance graph

In most cases, these are the classes and the inheritance graph that should be
implemented. Notice how almost everything extends `SqlBase` at the base.

- SqlConnection
  - SqlBase
- SqlPreparedQueriable
  - SqlBase
- SqlTransactionQueriable
  - SqlPreparable
    - SqlQueriable
      - SqlBase
- SqlClient
  - SqlTransactionable
    - SqlPreparable
      - SqlQueriable
        - SqlBase
- SqlPoolClient
  - SqlTransactionable
    - SqlPreparable
      - SqlQueriable
        - SqlBase
- SqlClientPool
  - SqlBase

### Other

There is also a [SqlDeferredStack](./lib//deferred.ts) that is used by the pool
as a helper for queuing and stacking the pool clients.

### Base class

`@stdext/std` uses implementable interfaces as well as base classes that needs
to be inherited for desired functionality.

At the base layer, you will have to extend the `SqlBase` class for all
`@stdext/std` derived classes. Alternatively, if this is not possible, you can
implement SqlBase, and ensure that the dynamic and static properties are
accessible.
