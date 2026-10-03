import { type ClientOptions, SqlClient } from "../../sql/mod.ts";
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
export interface PostgresClientOptions
  extends
    ClientOptions<PostgresConnectionOptions, PostgresTransactionOptions> {}

/**
 * PostgresClient
 *
 * The standard client with the {@linkcode PostgresDriver}. See
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
  extends SqlClient<PostgresDriver, PostgresClientOptions> {
  /**
   * Create a Postgres client.
   *
   * @param connectionUrl the libpq connection URI
   * @param options the client options
   */
  constructor(connectionUrl: string | URL, options?: PostgresClientOptions) {
    super(new PostgresDriver(), connectionUrl, options);
  }
}
