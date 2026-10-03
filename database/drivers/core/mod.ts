/**
 * Base classes for implementing the
 * {@link https://jsr.io/@stdext/database/doc/sql | @stdext/database/sql}
 * interfaces.
 *
 * The base classes implement everything that is the same for every database:
 *
 * - {@linkcode BaseDriver}: option merging, value transforms, abort checks,
 *   error wrapping, events, prepared statements, and transactions with
 *   savepoint based nesting
 * - {@linkcode BaseClient}: the connection pool, built on
 *   {@link https://jsr.io/@stdext/collections | DeferredStack}
 *
 * A driver only implements the database specific primitives: connecting,
 * closing, pinging, executing, querying and preparing a single statement.
 *
 * @example A minimal driver
 * ```ts
 * import {
 *   BaseClient,
 *   BaseDriver,
 *   type DriverParameters,
 *   type DriverResult,
 *   type StatementHandle,
 * } from "@stdext/database/drivers/core";
 * import type { ExecuteResult } from "@stdext/database/sql";
 *
 * class EchoDriver extends BaseDriver {
 *   #connected = false;
 *
 *   get connected(): boolean {
 *     return this.#connected;
 *   }
 *
 *   protected override connectDriver(): Promise<void> {
 *     this.#connected = true;
 *     return Promise.resolve();
 *   }
 *
 *   protected override closeDriver(): Promise<void> {
 *     this.#connected = false;
 *     return Promise.resolve();
 *   }
 *
 *   protected override pingDriver(): Promise<void> {
 *     return Promise.resolve();
 *   }
 *
 *   protected override executeDriver(): Promise<ExecuteResult> {
 *     return Promise.resolve({ affectedRows: 0 });
 *   }
 *
 *   protected override executeScriptDriver(): Promise<void> {
 *     return Promise.resolve();
 *   }
 *
 *   // Every query returns its parameters as a single row
 *   protected override queryDriver(
 *     _sql: string,
 *     params: DriverParameters | undefined,
 *   ): Promise<DriverResult> {
 *     const values = Array.isArray(params) ? params : [];
 *     async function* rows() {
 *       yield values;
 *     }
 *     return Promise.resolve({
 *       columns: values.map((_, i) => `p${i}`),
 *       rows: rows(),
 *     });
 *   }
 *
 *   protected override prepareDriver(sql: string): Promise<StatementHandle> {
 *     return Promise.resolve({
 *       execute: () => this.executeDriver(),
 *       query: (params) => this.queryDriver(sql, params),
 *       deallocate: () => Promise.resolve(),
 *     });
 *   }
 * }
 *
 * class EchoClient extends BaseClient<EchoDriver> {
 *   protected override createDriver(): EchoDriver {
 *     return new EchoDriver(this.connectionUrl, this.options);
 *   }
 * }
 *
 * await using client = new EchoClient("echo://");
 * console.log(await client.query("SELECT", [1, "a"]).toRecords()); // [{ p0: 1, p1: "a" }]
 * ```
 *
 * @module
 */
export * from "./client.ts";
export * from "./driver.ts";
