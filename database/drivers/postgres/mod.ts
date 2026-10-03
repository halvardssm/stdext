/**
 * A Postgres driver implementing the
 * {@link https://jsr.io/@stdext/database/doc/sql | @stdext/database/sql}
 * interfaces, written in TypeScript on top of the Postgres frontend/backend
 * protocol. Requires the `net` permission.
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
