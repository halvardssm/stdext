import type {
  ClientOptions,
  PoolOptions,
  QueryOptions,
} from "../../sql/mod.ts";
import { BaseClient } from "../core/client.ts";
import {
  type SqliteConnectionOptions,
  SqliteDriver,
  type SqliteTransactionOptions,
} from "./driver.ts";

/**
 * SqliteClientOptions
 *
 * The options that a {@linkcode SqliteClient} is constructed with.
 */
export interface SqliteClientOptions extends
  ClientOptions<
    SqliteConnectionOptions,
    QueryOptions,
    SqliteTransactionOptions,
    PoolOptions
  > {}

/**
 * SqliteClient
 *
 * A SQLite client with an implicit connection pool, backed by the built-in
 * `node:sqlite` module. See {@linkcode SqliteDriver} for the connection URL
 * and placeholder formats.
 *
 * Note that every pooled connection to `:memory:` opens its own, separate
 * in-memory database.
 *
 * @example
 * ```ts
 * import { SqliteClient } from "@stdext/database/drivers/sqlite";
 *
 * await using client = new SqliteClient(":memory:");
 * await client.connect();
 * await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
 * await client.transaction(async (tx) => {
 *   await tx.execute("INSERT INTO users VALUES (?, ?)", [1, "Alice"]);
 * });
 * const ctx = await client.query("SELECT * FROM users");
 * console.log(await ctx.toRecords());
 * ```
 */
export class SqliteClient
  extends BaseClient<SqliteDriver, SqliteClientOptions> {
  protected override createDriver(): SqliteDriver {
    const { connectionOptions, queryOptions, transactionOptions } =
      this.options;
    return new SqliteDriver(this.connectionUrl, {
      connectionOptions,
      queryOptions,
      transactionOptions,
    });
  }
}
