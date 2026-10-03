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
  PoolClient,
  Preparable,
  Queryable,
  Transactionable,
} from "./core.ts";
import {
  ConnectionError,
  DatabaseError,
  QueryError,
  TransactionError,
} from "./errors.ts";
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
  /**
   * A SQL query selecting the single string parameter it is given, as a
   * column named `value`, for example `SELECT ? AS value` or
   * `SELECT $1::text AS value`
   */
  parameterQuery: string;
}

/**
 * A statement that is invalid in every SQL dialect
 */
const INVALID_SQL = "THIS IS NOT VALID SQL";

/**
 * Whether the promise is still pending after the pending work has run
 */
async function isPending(promise: Promise<unknown>): Promise<boolean> {
  let pending = true;
  promise.then(() => (pending = false), () => (pending = false));
  await new Promise((resolve) => setTimeout(resolve, 10));
  return pending;
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
    }, ConnectionError);
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

  await t.step("query and execute throw when not connected", async () => {
    const queryable = await create();
    await assertRejects(async () => {
      await queryable.query(sql.query);
    }, ConnectionError);
    await assertRejects(async () => {
      await queryable.execute(sql.execute);
    }, ConnectionError);
  });

  await t.step("binds parameters", async () => {
    const queryable = await create();
    await queryable.connect();
    const ctx = await queryable.query(sql.parameterQuery, ["a"]);
    assertEquals(ctx.metadata.columns, ["value"]);
    assertEquals(await ctx.toValues(), [["a"]]);
    await queryable.close();
  });

  await t.step("invalid statements throw a QueryError", async () => {
    const queryable = await create();
    await queryable.connect();
    await assertRejects(async () => {
      await queryable.query(INVALID_SQL);
    }, QueryError);
    await assertRejects(async () => {
      await queryable.execute(INVALID_SQL);
    }, QueryError);
    // The connection is still usable after an error.
    await queryable.execute(sql.execute);
    await queryable.close();
  });

  await t.step("transforms input and output values", async () => {
    const queryable = await create();
    await queryable.connect();
    const ctx = await queryable.query(sql.parameterQuery, ["a"], {
      transformInput: (value) => `${value}b`,
      transformOutput: (value) =>
        typeof value === "string" ? value.toUpperCase() : value,
    });
    assertEquals(await ctx.toValues(), [["AB"]]);
    await queryable.close();
  });

  await t.step("rejects with the reason of an aborted signal", async () => {
    const queryable = await create();
    await queryable.connect();
    const reason = new Error("aborted");
    const signal = AbortSignal.abort(reason);
    assertEquals(
      await assertRejects(() => queryable.query(sql.query, [], { signal })),
      reason,
    );
    assertEquals(
      await assertRejects(() => queryable.execute(sql.execute, [], { signal })),
      reason,
    );
    await queryable.close();
  });

  if (sql.count > 1) {
    await t.step("stops iterating when the signal aborts", async () => {
      const queryable = await create();
      await queryable.connect();
      const controller = new AbortController();
      const ctx = await queryable.query(sql.query, [], {
        signal: controller.signal,
      });
      controller.abort(new Error("aborted"));
      assertEquals(
        await assertRejects(() => ctx.toValues()),
        controller.signal.reason,
      );
      // The connection is still usable after an abort.
      await queryable.execute(sql.execute);
      await queryable.close();
    });
  }

  await t.step("disposing a result stops fetching", async () => {
    const queryable = await create();
    await queryable.connect();
    const ctx = await queryable.query(sql.query);
    await ctx[Symbol.asyncDispose]();
    await queryable.execute(sql.execute);
    await queryable.close();
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
    await stmt.deallocate();
    await assertRejects(async () => {
      await stmt.query();
    }, QueryError);
    await assertRejects(async () => {
      await stmt.execute();
    }, QueryError);
    await preparable.close();
  });

  await t.step("prepared statements are reusable with parameters", async () => {
    const preparable = await create();
    await preparable.connect();
    const stmt = await preparable.prepare(sql.parameterQuery);
    assertEquals(await (await stmt.query(["a"])).toValues(), [["a"]]);
    assertEquals(await (await stmt.query(["b"])).toValues(), [["b"]]);
    await stmt.deallocate();
    await preparable.close();
  });

  await t.step("invalid statements throw a QueryError", async () => {
    const preparable = await create();
    await preparable.connect();
    // Databases without native prepared statements fail on execution.
    await assertRejects(async () => {
      const stmt = await preparable.prepare(INVALID_SQL);
      await stmt.query();
    }, QueryError);
    await preparable.close();
  });

  await t.step("prepare throws when not connected", async () => {
    const preparable = await create();
    await assertRejects(async () => {
      await preparable.prepare(sql.query);
    }, ConnectionError);
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
    }, TransactionError);
    await assertRejects(async () => {
      await tx.commitTransaction();
    }, TransactionError);
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
    }, TransactionError);
    await assertRejects(async () => {
      await tx.rollbackTransaction();
    }, TransactionError);
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

  await t.step("savepoints with generated names", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const tx = await transactionable.beginTransaction();
    await tx.createSavepoint();
    await tx.execute(sql.execute);
    await tx.releaseSavepoint();
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

  await t.step("ending a transaction invalidates nested ones", async () => {
    const transactionable = await create();
    await transactionable.connect();
    const outer = await transactionable.beginTransaction();
    const nested = await outer.beginTransaction();
    const deeper = await nested.beginTransaction();
    await nested.rollbackTransaction();
    assertFalse(deeper.inTransaction);
    await assertRejects(async () => {
      await deeper.query(sql.query);
    }, TransactionError);
    assert(outer.inTransaction);

    const other = await outer.beginTransaction();
    await outer.commitTransaction();
    assertFalse(other.inTransaction);
    await assertRejects(async () => {
      await other.commitTransaction();
    }, TransactionError);
    await transactionable.close();
  });

  await t.step("beginTransaction throws when not connected", async () => {
    const transactionable = await create();
    await assertRejects(async () => {
      await transactionable.beginTransaction();
    }, DatabaseError);
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
 * Test the pooling behavior of a {@linkcode Client}: the pool size, and the
 * connections held by the query, prepare and transaction methods.
 *
 * @param t the test context
 * @param create a factory creating a fresh client
 * @param sql the SQL statements to test with
 */
export async function testPool(
  t: Deno.TestContext,
  create: Factory<Client>,
  sql: TestSql,
): Promise<void> {
  /** Acquire all connections but one, and return a release function */
  async function exhaust(
    client: Client,
    keep = 1,
  ): Promise<() => Promise<void>> {
    const maxSize = client.options.poolOptions?.maxSize ?? 1;
    const held: PoolClient[] = [];
    for (let i = 0; i < maxSize - keep; i++) held.push(await client.acquire());
    return async () => {
      for (const poolClient of held) await poolClient.release();
    };
  }

  await t.step("acquire waits when the pool is exhausted", async () => {
    const client = await create();
    await client.connect();
    const releaseAll = await exhaust(client);
    const last = await client.acquire();
    const pending = client.acquire();
    assert(await isPending(pending), "acquire must wait for a release");
    await last.release();
    const next = await pending;
    assert(next.connected);
    await next.release();
    await releaseAll();
    await client.close();
  });

  await t.step("acquire waits for a removed connection", async () => {
    const client = await create();
    await client.connect();
    const releaseAll = await exhaust(client);
    const last = await client.acquire();
    const pending = client.acquire();
    assert(await isPending(pending), "acquire must wait for a removal");
    await last.remove();
    const next = await pending;
    assert(next.connected);
    await next.release();
    await releaseAll();
    await client.close();
  });

  await t.step("query holds the connection until fetched", async () => {
    const client = await create();
    await client.connect();
    const releaseAll = await exhaust(client);
    const ctx = await client.query(sql.query);
    if (sql.count > 1) {
      // The first row is fetched, so the result is not complete yet.
      const pending = client.acquire();
      assert(await isPending(pending), "query must hold the connection");
      await ctx[Symbol.asyncDispose]();
      await (await pending).release();
    } else {
      await ctx.toValues();
    }
    await (await client.acquire()).release();
    await releaseAll();
    await client.close();
  });

  await t.step("prepare holds the connection until deallocated", async () => {
    const client = await create();
    await client.connect();
    const releaseAll = await exhaust(client);
    const stmt = await client.prepare(sql.query);
    const pending = client.acquire();
    assert(await isPending(pending), "prepare must hold the connection");
    await stmt.deallocate();
    await (await pending).release();
    await releaseAll();
    await client.close();
  });

  await t.step(
    "beginTransaction holds the connection until finished",
    async () => {
      const client = await create();
      await client.connect();
      const releaseAll = await exhaust(client);
      const tx = await client.beginTransaction();
      const pending = client.acquire();
      assert(
        await isPending(pending),
        "beginTransaction must hold the connection",
      );
      await tx.commitTransaction();
      await (await pending).release();
      await releaseAll();
      await client.close();
    },
  );
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

  await t.step("pool", (t) => testPool(t, create, sql));

  await t.step("connection initialization", async (t) => {
    const [connectionUrl, options] = args;

    await t.step("connects all connections up front", async () => {
      const client = new ClientC(connectionUrl, {
        ...options,
        poolOptions: { ...options?.poolOptions, lazyInitialization: false },
      });
      let connects = 0;
      client.eventTarget.addEventListener("connect", () => connects++);
      await client.connect();
      assertEquals(connects, client.options.poolOptions?.maxSize ?? 1);
      await client.close();
    });

    await t.step("lazily connects on acquire", async () => {
      const client = new ClientC(connectionUrl, {
        ...options,
        poolOptions: { ...options?.poolOptions, lazyInitialization: true },
      });
      let connects = 0;
      client.eventTarget.addEventListener("connect", () => connects++);
      await client.connect();
      assertEquals(connects, 0);
      const poolClient = await client.acquire();
      assertEquals(connects, 1);
      assert(poolClient.connected);
      await poolClient.release();
      await client.close();
    });
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
