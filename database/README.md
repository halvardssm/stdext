# @stdext/database

The database package contains interfaces and helpers for interacting with
databases. It draws inspiration from
[go std/database](https://pkg.go.dev/database).

## Entrypoints

### Sql

The SQL package contains a standard interface for SQL based databases

> The SQL entrypoint is not intended to be directly used in applications, but is
> meant to be implemented by database drivers. This is mainly for library
> authors.

Databases implementing these interfaces can be used as following (see
[database/sql](./sql/README.md) for more details):

```ts
await using client = new Client(connectionUrl, connectionOptions);
await client.connect();
await client.execute("SOME INSERT QUERY");
const ctx = await client.query("SELECT * FROM table");
const res = await ctx.toRecords();
```

### Drivers

Drivers implementing the [database/sql](./sql/README.md) interfaces. Each driver
exports a `Driver` (a single connection) and a `Client` (a connection pool).

#### Core

`@stdext/database/drivers/core` contains the base classes the drivers are built
on, for implementing new drivers. `BaseDriver` implements option merging, value
transforms, abort checks, error wrapping, events, prepared statements and
savepoint based nested transactions, and `BaseClient` implements the connection
pool. A driver only implements the database specific primitives:

```ts ignore
import {
  BaseClient,
  BaseDriver,
  type DriverParameters,
  type StatementHandle,
} from "@stdext/database/drivers/core";
import type { QueryOptions, Row } from "@stdext/database/sql";

class MyDriver extends BaseDriver {
  get connected(): boolean {/* ... */}
  protected connectDriver(): Promise<void> {/* ... */}
  protected closeDriver(): Promise<void> {/* ... */}
  protected pingDriver(): Promise<void> {/* ... */}
  protected executeDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): Promise<number | undefined> {/* ... */}
  protected queryDriver(
    sql: string,
    params: DriverParameters | undefined,
    options: QueryOptions,
  ): AsyncIterable<Row> {/* ... */}
  protected prepareDriver(
    sql: string,
    options: QueryOptions,
  ): Promise<StatementHandle> {/* ... */}
}

class MyClient extends BaseClient<MyDriver> {
  protected createDriver(): MyDriver {
    return new MyDriver(this.connectionUrl, this.options);
  }
}
```

#### SQLite

`@stdext/database/drivers/sqlite`, backed by the built-in `node:sqlite` module.
The connection URL is a file path, a `file:` URL, or `:memory:`. Parameters use
`?` placeholders, or `:name`, `@name` and `$name` placeholders with a record.

```ts
import { SqliteClient } from "@stdext/database/drivers/sqlite";

await using client = new SqliteClient(":memory:");
await client.connect();
await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
await client.execute("INSERT INTO users VALUES (?, ?)", [1, "Alice"]);
const ctx = await client.query("SELECT * FROM users");
console.log(await ctx.toRecords());
```
