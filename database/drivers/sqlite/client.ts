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
 * A SQLite client, backed by the built-in `node:sqlite` module. See
 * {@linkcode SqliteDriver} for the connection URL and placeholder formats.
 *
 * SQLite has no connection pool, so the pool is emulated with a single
 * connection: {@linkcode PoolOptions.maxSize} is always `1`, and acquiring
 * waits until the connection is released. This keeps transactions isolated,
 * and makes `:memory:` databases behave like a single database.
 *
 * @example
 * ```ts
 * import { SqliteClient } from "@stdext/database/drivers/sqlite";
 *
 * await using client = new SqliteClient(":memory:");
 * await client.execute("CREATE TABLE users (id INTEGER, name TEXT)");
 * await client.transaction(async (tx) => {
 *   await tx.execute("INSERT INTO users VALUES (?, ?)", [1, "Alice"]);
 * });
 * console.log(await client.query("SELECT * FROM users").toRecords());
 * ```
 */
export class SqliteClient
  extends BaseClient<SqliteDriver, SqliteClientOptions> {
  constructor(connectionUrl: string | URL, options?: SqliteClientOptions) {
    super(connectionUrl, {
      ...options,
      poolOptions: { ...options?.poolOptions, maxSize: 1 },
    });
  }

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
