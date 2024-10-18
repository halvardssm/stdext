# @stdext/database

The database package contains interfaces and helpers for interracting with
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
const res = await client.query("SELECT * FROM table");
```
