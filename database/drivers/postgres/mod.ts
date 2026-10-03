/**
 * A Postgres driver implementing the
 * {@link https://jsr.io/@stdext/database/doc/sql | @stdext/database/sql}
 * specification, written in TypeScript on top of the Postgres frontend/backend
 * protocol. Requires the `net` permission.
 *
 * The {@linkcode PostgresDriver} implements the driver level: a `Dialect` and
 * statements run on a single connection. The {@linkcode PostgresClient} is the
 * standard client level bound to the driver: pooling, nested transactions,
 * SQL templates, lazy results and events, behaving the same for every
 * database.
 *
 * @example
 * ```ts ignore
 * import { PostgresClient } from "@stdext/database/drivers/postgres";
 *
 * await using client = new PostgresClient("postgres://user@localhost/db", {
 *   connectionOptions: { password: "secret" },
 * });
 * console.log(await client.query("SELECT 1 + 1 AS solution").toRecords());
 * ```
 *
 * @module
 */
export * from "./client.ts";
export * from "./driver.ts";
export {
  PostgresConnectionError,
  type PostgresErrorFields,
  PostgresQueryError,
} from "./errors.ts";
export { Oid, type Parser } from "./_types.ts";
