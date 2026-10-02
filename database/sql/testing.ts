import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import {
  assertConstructorSignature,
  assertIsPoolClient,
  assertIsPreparedStatement,
  assertIsTransaction,
  isClient,
  isDriver,
} from "./asserts.ts";
import type {
  Client,
  ClientConstructor,
  Connectable,
  Driver,
  DriverConstructor,
  Pingable,
  Poolable,
  Preparable,
  Queryable,
  Transactionable,
} from "./core.ts";
import type {
  ClientEventTarget,
  DriverEventTarget,
  Eventable,
} from "./events.ts";

/**
 * A factory creating a fresh instance for each test step. Test steps mutate
 * the instances they are given, so a fresh instance must be created per step.
 *
 * @template T the instance type
 */
export type Factory<T> = () => T | Promise<T>;

/**
 * TestSql
 *
 * The SQL statements used by the conformance test suite. The statements are
 * dialect specific and must be provided by the driver author.
 */
export interface TestSql {
  /**
   * A SQL statement that can be executed without returning rows, for example
   * a `CREATE TABLE` statement
   */
  execute: string;
  /**
   * A SQL query returning the rows described by
   * {@linkcode TestSql.columns} and {@linkcode TestSql.count}
   */
  query: string;
  /**
   * The expected column names of {@linkcode TestSql.query}
   */
  columns: string[];
  /**
   * The expected number of rows of {@linkcode TestSql.query}
   */
  count: number;
}

/**
 * Test the {@linkcode Connectable} capability.
 *
 * @param t the test context
 * @param create a factory creating a fresh instance
 */
export async function testConnectable(
  t: Deno.TestContext,
  create: Factory<Connectable>,
): Promise<void> {
  await t.step("connects and closes", async () => {
    const connectable = await create();
    assertFalse(connectable.connected);
    await connectable.connect();
    assert(connectable.connected);
    await connectable.close();
    assertFalse(connectable.connected);
  });

  await t.step("connect is idempotent", async () => {
    const connectable = await create();
    await connectable.connect();
    await connectable.connect();
    assert(connectable.connected);
    await connectable.close();
  });

  await t.step("close is idempotent", async () => {
    const connectable = await create();
    await connectable.connect();
    await connectable.close();
    await connectable.close();
    assertFalse(connectable.connected);
  });

  await t.step("async dispose closes", async () => {
    const connectable = await create();
    await connectable.connect();
    await connectable[Symbol.asyncDispose]();
    assertFalse(connectable.connected);
  });
}

/**
 * Test the {@linkcode Pingable} capability.
 *
 * @param t the test context
 * @param create a factory creating a fresh, connectable instance
 */
export async function testPingable(
  t: Deno.TestContext,
  create: Factory<Pingable & Connectable>,
): Promise<void> {
  await t.step("ping while connected", async () => {
    const pingable = await create();
    await pingable.connect();
    await pingable.ping();
    await pingable.close();
  });

  await t.step("ping throws when not connected", async () => {
    const pingable = await create();
    await pingable.connect();
    await pingable.close();
    await assertRejects(async () => {
      await pingable.ping();
    });
  });
}

/**
 * Test the {@linkcode Queryable} capability.
 *
 * @param t the test context
 * @param create a factory creating a fresh, connectable instance
 * @param sql the SQL statements to test with
 */
export async function testQueryable(
  t: Deno.TestContext,
  create: Factory<Connectable & Queryable>,
  sql: TestSql,
): Promise<void> {
  await t.step("execute", async () => {
    const queryable = await create();
    await queryable.connect();
    const affected = await queryable.execute(sql.execute);
    assert(
      affected === undefined || typeof affected === "number",
      "execute must resolve to a number or undefined",
    );
    await queryable.close();
  });

  await t.step("query returns a result context", async () => {
    const queryable = await create();
    await queryable.connect();
    const ctx = await queryable.query(sql.query);
    assertEquals(ctx.metadata.columns, sql.columns);
    assertEquals((await ctx.toValues()).length, sql.count);
    await queryable.close();
  });

  await t.step("query can be iterated", async () => {
    const queryable = await create();
    await queryable.connect();
    const ctx = await queryable.query(sql.query);
    let count = 0;
    for await (const _row of ctx) {
      count++;
    }
    assertEquals(count, sql.count);
    await queryable.close();
  });

  await t.step("query throws when not connected", async () => {
    const queryable = await create();
    await assertRejects(async () => {
      await queryable.query(sql.query);
    });
  });
}

/**
 * Test the {@linkcode Preparable} capability.
 *
 * @param t the test context
 * @param create a factory creating a fresh, connectable instance
 * @param sql the SQL statements to test with
 */
export async function testPreparable(
  t: Deno.TestContext,
  create: Factory<Connectable & Preparable>,
  sql: TestSql,
): Promise<void> {
  await t.step("prepare, query, execute and deallocate", async () => {
    const preparable = await create();
    await preparable.connect();
    const stmt = await preparable.prepare(sql.query);
    assertIsPreparedStatement(stmt);
    assertEquals(stmt.sql, sql.query);
    assertFalse(stmt.deallocated);

    const ctx = await stmt.query();
    assertEquals((await ctx.toValues()).length, sql.count);

    const affected = await stmt.execute();
    assert(
      affected === undefined || typeof affected === "number",
      "execute must resolve to a number or undefined",
    );

    await stmt.deallocate();
    assert(stmt.deallocated);
    await assertRejects(async () => {
      await stmt.query();
    });
    await preparable.close();
  });

  await t.step("async dispose deallocates", async () => {
    const preparable = await create();
    await preparable.connect();
    const stmt = await preparable.prepare(sql.query);
    await stmt[Symbol.asyncDispose]();
    assert(stmt.deallocated);
    await preparable.close();
  });
}

/**
 * Test the {@linkcode Transactionable} capability.
 *
 * @param t the test context
 * @param create a factory creating a fresh, connectable instance
 * @param sql the SQL statements to test with
 */
export async function testTransactionable(
  t: Deno.TestContext,
  create: Factory<Connectable & Transactionable>,
  sql: TestSql,
): Promise<void> {
  await t.step("begin and commit", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const tx = await transactionable.beginTransaction();
    assertIsTransaction(tx);
    assert(tx.inTransaction);
    await tx.execute(sql.execute);
    const ctx = await tx.query(sql.query);
    assertEquals((await ctx.toValues()).length, sql.count);
    await tx.commitTransaction();
    assertFalse(tx.inTransaction);
    await assertRejects(async () => {
      await tx.execute(sql.execute);
    });
    await transactionable.close();
  });

  await t.step("rollback", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const tx = await transactionable.beginTransaction();
    await tx.execute(sql.execute);
    await tx.rollbackTransaction();
    assertFalse(tx.inTransaction);
    await assertRejects(async () => {
      await tx.query(sql.query);
    });
    await transactionable.close();
  });

  await t.step("savepoints", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const tx = await transactionable.beginTransaction();
    await tx.createSavepoint("sp");
    await tx.execute(sql.execute);
    await tx.releaseSavepoint("sp");
    await tx.commitTransaction();
    await transactionable.close();
  });

  await t.step("nested transactions create savepoints", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const outer = await transactionable.beginTransaction();
    await outer.execute(sql.execute);

    const inner = await outer.beginTransaction();
    assertIsTransaction(inner);
    assert(inner.inTransaction);
    await inner.execute(sql.execute);
    await inner.rollbackTransaction();
    assertFalse(inner.inTransaction);

    assert(
      outer.inTransaction,
      "The outer transaction must still be active after a nested rollback",
    );
    const ctx = await outer.query(sql.query);
    assertEquals((await ctx.toValues()).length, sql.count);
    await outer.commitTransaction();
    assertFalse(outer.inTransaction);
    await transactionable.close();
  });

  await t.step("nested transaction wrapper commits the savepoint", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const outer = await transactionable.beginTransaction();
    const result = await outer.transaction(async (inner) => {
      assertIsTransaction(inner);
      assert(inner.inTransaction);
      await inner.execute(sql.execute);
      return "nested";
    });
    assertEquals(result, "nested");
    assert(
      outer.inTransaction,
      "The outer transaction must still be active after a nested commit",
    );
    await outer.commitTransaction();
    await transactionable.close();
  });

  await t.step("transaction wrapper commits on success", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const result = await transactionable.transaction(async (tx) => {
      assert(tx.inTransaction);
      await tx.execute(sql.execute);
      return "done";
    });
    assertEquals(result, "done");
    await transactionable.close();
  });

  await t.step("transaction wrapper rolls back on error", async () => {
    const transactionable = await create();
    await transactionable.connect();
    await assertRejects(async () => {
      await transactionable.transaction(async (tx) => {
        await tx.execute(sql.execute);
        throw new Error("expected error");
      });
    });
    await transactionable.close();
  });

  await t.step("async dispose rolls back an active transaction", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const tx = await transactionable.beginTransaction();
    await tx[Symbol.asyncDispose]();
    assertFalse(tx.inTransaction);
    await transactionable.close();
  });
}

/**
 * Test the events of an `Eventable` connectable object. The `connect` and
 * `close` events must be dispatched with the dispatching object available as
 * the `client` in the event detail.
 *
 * @param t the test context
 * @param create a factory creating a fresh, connectable instance
 */
export async function testEventable(
  t: Deno.TestContext,
  create: Factory<
    Connectable & Eventable<DriverEventTarget | ClientEventTarget>
  >,
): Promise<void> {
  await t.step(
    "dispatches connect and close events with the client",
    async () => {
      const source = await create();
      const eventTarget: EventTarget = source.eventTarget;
      let connectClient: unknown;
      let closeClient: unknown;
      eventTarget.addEventListener("connect", (event) => {
        connectClient = (event as CustomEvent<{ client?: unknown }>).detail
          ?.client;
      });
      eventTarget.addEventListener("close", (event) => {
        closeClient = (event as CustomEvent<{ client?: unknown }>).detail
          ?.client;
      });
      await source.connect();
      await source.close();
      assertEquals(connectClient, source);
      assertEquals(closeClient, source);
    },
  );
}

/**
 * Test the {@linkcode Poolable} capability.
 *
 * @param t the test context
 * @param create a factory creating a fresh, connectable instance
 */
export async function testPoolable(
  t: Deno.TestContext,
  create: Factory<Connectable & Poolable>,
): Promise<void> {
  await t.step("acquire returns a connected pool client", async () => {
    const poolable = await create();
    await poolable.connect();
    const poolClient = await poolable.acquire();
    assertIsPoolClient(poolClient);
    assert(poolClient.connected);
    assertFalse(poolClient.disposed);
    await poolClient.release();
    assert(poolClient.disposed);
    await poolable.close();
  });

  await t.step("acquire throws when not connected", async () => {
    const poolable = await create();
    await assertRejects(async () => {
      await poolable.acquire();
    });
  });

  await t.step("release is idempotent", async () => {
    const poolable = await create();
    await poolable.connect();
    const poolClient = await poolable.acquire();
    await poolClient.release();
    await poolClient.release();
    assert(poolClient.disposed);
    await poolable.close();
  });

  await t.step("remove disposes and closes the connection", async () => {
    const poolable = await create();
    await poolable.connect();
    const poolClient = await poolable.acquire();
    await poolClient.remove();
    assert(poolClient.disposed);
    assertFalse(poolClient.connected);
    await poolable.close();
  });

  await t.step("async dispose releases", async () => {
    const poolable = await create();
    await poolable.connect();
    const poolClient = await poolable.acquire();
    await poolClient[Symbol.asyncDispose]();
    assert(poolClient.disposed);
    await poolable.close();
  });
}

/**
 * Test that a value structurally satisfies the {@linkcode Driver} profile.
 *
 * @param value the value to test
 */
export function testDriverProfile(value: unknown): void {
  assert(isDriver(value), "Value does not satisfy the Driver profile");
}

/**
 * Test that a value structurally satisfies the {@linkcode Client} profile.
 *
 * @param value the value to test
 */
export function testClientProfile(value: unknown): void {
  assert(isClient(value), "Value does not satisfy the Client profile");
}

/**
 * Run the full conformance suite against a {@linkcode Driver}
 * implementation.
 *
 * @param t the test context
 * @param DriverC the driver constructor
 * @param args the constructor arguments, `(connectionUrl, options?)`
 * @param sql the SQL statements to test with
 */
export async function testDriverIntegration<
  IDriver extends Driver,
>(
  t: Deno.TestContext,
  DriverC: DriverConstructor<IDriver>,
  args: ConstructorParameters<DriverConstructor<IDriver>>,
  sql: TestSql,
): Promise<void> {
  assertConstructorSignature(args);
  const driver = new DriverC(...args);
  testDriverProfile(driver);
  assertEquals(
    driver.connectionUrl.toString(),
    args[0].toString(),
    "The connectionUrl property must match the constructor argument",
  );

  const create = () => new DriverC(...args);

  await t.step("connectable", (t) => testConnectable(t, create));
  await t.step("pingable", (t) => testPingable(t, create));
  await t.step("queryable", (t) => testQueryable(t, create, sql));
  await t.step("preparable", (t) => testPreparable(t, create, sql));
  await t.step("transactionable", (t) => testTransactionable(t, create, sql));
  await t.step("eventable", (t) => testEventable(t, create));
}

/**
 * Run the full conformance suite against a {@linkcode Client}
 * implementation.
 *
 * @param t the test context
 * @param ClientC the client constructor
 * @param args the constructor arguments, `(connectionUrl, options?)`
 * @param sql the SQL statements to test with
 */
export async function testClientIntegration<
  IClient extends Client,
>(
  t: Deno.TestContext,
  ClientC: ClientConstructor<IClient>,
  args: ConstructorParameters<ClientConstructor<IClient>>,
  sql: TestSql,
): Promise<void> {
  assertConstructorSignature(args);
  const client = new ClientC(...args);
  testClientProfile(client);
  assertEquals(
    client.connectionUrl.toString(),
    args[0].toString(),
    "The connectionUrl property must match the constructor argument",
  );

  const create = () => new ClientC(...args);

  await t.step("connectable", (t) => testConnectable(t, create));
  await t.step("pingable", (t) => testPingable(t, create));
  await t.step("queryable", (t) => testQueryable(t, create, sql));
  await t.step("preparable", (t) => testPreparable(t, create, sql));
  await t.step("transactionable", (t) => testTransactionable(t, create, sql));
  await t.step("poolable", (t) => testPoolable(t, create));
  await t.step("eventable", (t) => testEventable(t, create));

  await t.step("pool events", async (t) => {
    await t.step(
      "dispatches acquire and release events with the client",
      async () => {
        const poolable = await create();
        await poolable.connect();
        const eventTarget: EventTarget = poolable.eventTarget;
        let acquireClient: unknown;
        let releaseClient: unknown;
        eventTarget.addEventListener("acquire", (event) => {
          acquireClient = (event as CustomEvent<{ client?: unknown }>).detail
            ?.client;
        });
        eventTarget.addEventListener("release", (event) => {
          releaseClient = (event as CustomEvent<{ client?: unknown }>).detail
            ?.client;
        });
        const poolClient = await poolable.acquire();
        await poolClient.release();
        assertEquals(acquireClient, poolable);
        assertEquals(releaseClient, poolable);
        await poolable.close();
      },
    );
  });

  await t.step("query methods release the pooled connection", async (t) => {
    await t.step("query", async () => {
      const poolable = await create();
      await poolable.connect();
      const ctx = await poolable.query(sql.query);
      await ctx.toValues();
      // The connection is idle again, so it can be acquired manually.
      const poolClient = await poolable.acquire();
      assert(poolClient.connected);
      await poolClient.release();
      await poolable.close();
    });

    await t.step("execute", async () => {
      const poolable = await create();
      await poolable.connect();
      await poolable.execute(sql.execute);
      const poolClient = await poolable.acquire();
      assert(poolClient.connected);
      await poolClient.release();
      await poolable.close();
    });
  });
}
