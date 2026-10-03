# @stdext/database/sql

The SQL package contains a standard interface for SQL based databases.

Inspired by [rust sqlx](https://docs.rs/sqlx/latest/sqlx/index.html) and
[go sql](https://pkg.go.dev/database/sql). The full specification is available
in [RFC_SQL.md](../RFC_SQL.md).

The goal for this package is to have a standard interface for SQL-like database
clients that can be used in Deno, Node and other JS runtimes. The entrypoint is
not intended to be directly used in applications, but is meant to be implemented
by database drivers.

## Design

The package defines three layers, see
[the specification](../RFC_SQL.md#specification) for the details:

- **Core types**: `QueryParameters`, `Row` and the `ResultIterableContext`
  result model
- **Capability interfaces**: small, independent interfaces such as
  `Connectable`, `Queryable`, `Preparable`, `Transactionable` and `Poolable`
  (see [core.ts](./core.ts))
- **Profiles**: the classes users interact with, composed from the capabilities:
  `Driver` (a single connection), `Client` (a pooled client), `PoolClient`,
  `Transaction` and `PreparedStatement`

Key properties of the design:

- All methods are async
- Pooling is implicit: a `Client` always manages a connection pool, tuned with
  the `poolOptions` in its constructor options. It defaults to a single
  connection (`maxSize` of `1`) and becomes a connection pool when `maxSize` is
  raised
- The query surface is minimal: `execute` for statements and `query` for queries
  returning a `ResultIterableContext`
- Everything holding a resource (`Client`, `PoolClient`, `Transaction`,
  `PreparedStatement`, and the query result context) is `AsyncDisposable` and
  works with `await using`

## Usage

The examples use the SQLite driver, but every driver implementing the interfaces
is used the same way:

```ts
import { SqliteClient } from "@stdext/database/drivers/sqlite";

await using client = new SqliteClient(":memory:");
await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
await client.execute("INSERT INTO users VALUES (1, 'Alice')");

console.log(await client.query("SELECT * FROM users").toRecords());
// [{ id: 1, name: "Alice" }]
```

The connection is opened by the first operation; calling `connect()` connects
eagerly, for example to report connection errors early. The connection is closed
by calling `close()`, or automatically at the end of the scope when using
[AsyncDispose](https://github.com/tc39/proposal-explicit-resource-management).

### Queries

The query methods are defined in [core.ts](./core.ts) (`Queryable`):

- `execute(sql, params?, options?)`: Executes a single SQL statement, and
  resolves to the `affectedRows` (rows inserted, updated or deleted, `0` for
  other statements) and the `lastInsertId`, if the database reports it
- `query(sql, params?, options?)`: Returns a lazy `ResultIterableContext` for a
  single SQL statement, which is both an async iterable of rows and provides
  `columns()`, `toValues()` and `toRecords()`. The query runs when the result is
  consumed, and holds its connection until it is fully read or disposed
- `executeScript(sql, options?)`: Executes a script of one or more statements
  without parameters, such as a migration

The placeholder style of the parameters (`?`, `$1`, `:name`, ...) and the
mapping of values depend on the driver.

```ts
import { sql } from "@stdext/database/sql";
import { SqliteClient } from "@stdext/database/drivers/sqlite";

await using client = new SqliteClient(":memory:");
await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");

// Iterate lazily
for await (const row of client.query("SELECT * FROM users")) {
  console.log(row.toRecord());
}

// Or collect
console.log(await client.query("SELECT * FROM users").toRecords());

// SQL templates render the placeholders of the database
const name = "Alice";
await client.execute(sql`INSERT INTO users VALUES (${1}, ${name})`);
```

The rows are streamed and not kept in memory, so a result can be consumed once:
iterated or collected. The result is `AsyncDisposable`: disposing stops fetching
and releases the underlying connection.

### Prepared statements

Prepared statements are created with `prepare` (`Preparable`):

```ts
import { SqliteClient } from "@stdext/database/drivers/sqlite";

await using client = new SqliteClient(":memory:");
await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
await using stmt = await client.prepare("SELECT * FROM users WHERE id = ?");
console.log(await stmt.query([1]).toRecords());
// disposed (deallocated) at the end of the scope
```

### Transactions

Transactions are created with `beginTransaction` or the `transaction` wrapper
(`Transactionable`):

```ts
import { SqliteClient } from "@stdext/database/drivers/sqlite";

await using client = new SqliteClient(":memory:");
await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
await using tx = await client.beginTransaction();
await tx.execute("INSERT INTO users VALUES (1, 'Alice')");
await tx.commit();
// if the scope ends without a commit, the transaction is rolled back
```

```ts
import { SqliteClient } from "@stdext/database/drivers/sqlite";

await using client = new SqliteClient(":memory:");
await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
const result = await client.transaction(async (tx) => {
  await tx.execute("INSERT INTO users VALUES (1, 'Alice')");
  return await tx.query("SELECT * FROM users").toRecords();
});
```

Transactions can be nested: calling `beginTransaction` or `transaction` on an
active transaction creates a savepoint. Committing a nested transaction releases
the savepoint, and rolling it back rolls back to the savepoint, leaving the
enclosing transaction active. Nesting only applies on the same connection —
`client.transaction()` inside a transaction acquires a separate connection and
starts an independent transaction.

### Pooling

A `Client` always manages a pool of connections, tuned with `poolOptions`:

- `lazyInitialization` (default `false`): connections are only created when
  acquired and no idle connection is available
- `maxSize` (default `1`): the maximum amount of connections. With the default,
  the client behaves like a single connection; it becomes a connection pool when
  raised
- `acquireTimeout`: how long `acquire` waits for a connection, in milliseconds
- `idleTimeout`: how long a connection may be idle before it is closed, in
  milliseconds
- `maxLifetime`: the maximum age of a connection, in milliseconds

Query methods automatically acquire a pool client and release it when the
operation completes. A `query` result acquires its connection when the query
runs, and holds it until the result is fully read or disposed.
`beginTransaction` and `prepare` hold a pooled connection until the transaction
is finished or the prepared statement is deallocated. A pool client can also be
held manually:

```ts
import { SqliteClient } from "@stdext/database/drivers/sqlite";

await using client = new SqliteClient(":memory:");
await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
await using poolClient = await client.acquire();
await poolClient.execute("INSERT INTO users VALUES (2, 'Bob')");
// released back to the pool at the end of the scope
```

### Events

The following events can be subscribed to (see [events.ts](./events.ts)):

- `connect`: dispatched when a connection is established
- `close`: dispatched when a connection is about to be closed
- `error`: dispatched when an error is triggered
- `acquire` / `release` (client only): dispatched when a connection is acquired
  from or released back to the pool

All events carry a `client` detail with the object that dispatched the event;
`error` events additionally carry the `error`.

## Implementation

> This section is for implementing the interface for database drivers.

To be fully compliant with the specs, you will need to implement the following
classes for your database driver, see the
[compliance matrix](../RFC_SQL.md#profiles-and-compliance-matrix):

- `Driver` ([core.ts](./core.ts)): a single connection to the database
- `PreparedStatement` ([core.ts](./core.ts))
- `Transaction` ([core.ts](./core.ts))
- `Client` ([core.ts](./core.ts)): the pooled client
- `PoolClient` ([core.ts](./core.ts))

The constructors follow the standard signature
`(connectionUrl: string | URL, options?: Options)`.

Helper utilities for driver authors are available in [utils.ts](./utils.ts):

- `createResultIterableContext(start)`: builds a lazy, single-pass
  `ResultIterableContext` from a function starting the query
- `renderStatement(statement, params, placeholder)`: renders SQL text or a
  `SqlTemplate` with the placeholders of the database
- `getObjectFromRow(row)`: maps a row to a record

The base classes in [`@stdext/database/drivers/core`](../drivers/core/mod.ts)
implement the interfaces on top of the database specific primitives.

### Testing

The `@stdext/database/sql/testing` entrypoint contains a conformance test suite.
A driver that passes the suite is compliant with the specification:

```ts ignore
import { testClientIntegration } from "@stdext/database/sql/testing";

Deno.test("MyClient conformance", async (t) => {
  await testClientIntegration(t, MyClient, [connectionUrl, options], {
    execute: "CREATE TABLE IF NOT EXISTS users (id INTEGER, name TEXT)",
    query: "SELECT 1 AS id, 'Alice' AS name UNION ALL SELECT 2, 'Bob'",
    columns: ["id", "name"],
    count: 2,
    parameterQuery: "SELECT ? AS value",
    emptyQuery: "SELECT 1 AS id, 'Alice' AS name WHERE 1 = 0",
  });
});
```

The suite also checks parameter binding, value transforms, aborting with an
`AbortSignal`, error types, nested transactions and the pooling behavior.

Drivers can be built on the base classes in
[`@stdext/database/drivers/core`](../drivers/core/mod.ts), which implement
everything except the database specific primitives.
