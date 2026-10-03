import type {
  ClientOptions,
  PoolOptions,
  QueryOptions,
} from "../../sql/mod.ts";
import { BaseClient } from "../core/client.ts";
import {
  type PostgresConnectionOptions,
  PostgresDriver,
  type PostgresTransactionOptions,
} from "./driver.ts";

/**
 * PostgresClientOptions
 *
 * The options that a {@linkcode PostgresClient} is constructed with.
 */
export interface PostgresClientOptions extends
  ClientOptions<
    PostgresConnectionOptions,
    QueryOptions,
    PostgresTransactionOptions,
    PoolOptions
  > {}

/**
 * PostgresClient
 *
 * A Postgres client with an implicit connection pool. See
 * {@linkcode PostgresDriver} for the connection URL, authentication and
 * placeholder formats. Requires the `net` permission.
 *
 * @example
 * ```ts ignore
 * import { PostgresClient } from "@stdext/database/drivers/postgres";
 *
 * await using client = new PostgresClient("postgres://user@localhost/db", {
 *   connectionOptions: { password: "secret" },
 *   poolOptions: { maxSize: 4 },
 * });
 * await client.transaction(async (tx) => {
 *   await tx.execute("INSERT INTO users (name) VALUES ($1)", ["Alice"]);
 * });
 * console.log(await client.query("SELECT * FROM users").toRecords());
 * ```
 */
export class PostgresClient
  extends BaseClient<PostgresDriver, PostgresClientOptions> {
  protected override createDriver(): PostgresDriver {
    const { connectionOptions, queryOptions, transactionOptions } =
      this.options;
    return new PostgresDriver(this.connectionUrl, {
      connectionOptions,
      queryOptions,
      transactionOptions,
    });
  }
}
