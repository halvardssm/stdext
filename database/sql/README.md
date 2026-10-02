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

```ts
await using client = new Client(connectionUrl);
await client.connect();
await client.execute("SOME INSERT QUERY");

const ctx = await client.query("SELECT * FROM table");
console.log(await ctx.toRecords());
// [{ col1: "some value" }]
```

Both the `Client` and the `Driver` need to be connected using `connect()` before
the database can be queried. The connection is cleaned up by calling `close()`,
or automatically at the end of the scope when using
[AsyncDispose](https://github.com/tc39/proposal-explicit-resource-management).

### Queries

The query methods are defined in [core.ts](./core.ts) (`Queryable`):

- `execute(sql, params?, options?)`: Executes a SQL statement, returns the
  number of affected rows if known
- `query(sql, params?, options?)`: Queries the database and returns a
  `ResultIterableContext`, which is both an async iterable of rows and provides
  `toValues()` and `toRecords()` for collecting the rows

```ts
const ctx = await client.query("SELECT * FROM table");

// Iterate lazily
for await (const row of ctx) {
  console.log(row.toRecord());
}

// Or collect
console.log(await ctx.toValues());
console.log(await ctx.toRecords());
```

The context buffers rows as they are lazily fetched, so it can be iterated and
collected in any combination. Note that the buffered rows are kept in memory, so
for a massive amount of rows, iterate the context once instead of collecting it.
The context is `AsyncDisposable`: disposing stops fetching and releases the
underlying connection, while rows already fetched remain replayable.

### Prepared statements

Prepared statements are created with `prepare` (`Preparable`):

```ts
await using stmt = await client.prepare("SELECT * FROM table WHERE id = ?");
const ctx = await stmt.query([id]);
console.log(await ctx.toRecords());
// disposed (deallocated) at the end of the scope
```

### Transactions

Transactions are created with `beginTransaction` or the `transaction` wrapper
(`Transactionable`):

```ts
await using tx = await client.beginTransaction();
await tx.execute("SOME INSERT QUERY");
await tx.commitTransaction();
// if the scope ends without a commit, the transaction is rolled back
```

```ts
const result = await client.transaction(async (tx) => {
  await tx.execute("SOME INSERT QUERY");
  return (await tx.query("SOME SELECT QUERY")).toRecords();
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

Query methods automatically acquire a pool client and release it when the
operation completes. Because the `query` result context is lazy, its pooled
connection is held until the buffered result is complete or the context is
disposed. `beginTransaction` and `prepare` hold a pooled connection until the
transaction is finished or the prepared statement is deallocated. A pool client
can also be held manually:

```ts
await using poolClient = await client.acquire();
await poolClient.execute("SOME INSERT QUERY");
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

- `Row`: the low-level row protocol
- `getObjectFromRow(row)`: maps a row to a record
- `createResultIterableContext(rows)`: builds a `ResultIterableContext` from a
  stream of rows

### Testing

The `@stdext/database/sql/testing` entrypoint contains a conformance test suite.
A driver that passes the suite is compliant with the specification:

```ts
import { testClientIntegration } from "@stdext/database/sql/testing";

Deno.test("MyClient conformance", async (t) => {
  await testClientIntegration(t, MyClient, [connectionUrl, options], {
    execute: "CREATE TABLE users (id INTEGER, name TEXT)",
    query: "SELECT id, name FROM users",
    columns: ["id", "name"],
    count: 3,
  });
});
```

See [conformance.test.ts](./conformance.test.ts) for a complete example
implementation of all the interfaces.
