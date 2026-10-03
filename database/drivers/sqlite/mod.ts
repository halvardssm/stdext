/**
 * A SQLite driver implementing the
 * {@link https://jsr.io/@stdext/database/doc/sql | @stdext/database/sql}
 * interfaces, backed by the built-in `node:sqlite` module.
 *
 * @example
 * ```ts
 * import { SqliteClient } from "@stdext/database/drivers/sqlite";
 *
 * await using client = new SqliteClient(":memory:");
 * await client.connect();
 * const ctx = await client.query("SELECT 1 + 1 AS solution");
 * console.log(await ctx.toRecords());
 * ```
 *
 * @module
 */
export * from "./client.ts";
export * from "./driver.ts";
