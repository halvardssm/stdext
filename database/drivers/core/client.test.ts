import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { ConnectionError, QueryError } from "../../sql/mod.ts";
import { testClientIntegration } from "../../sql/testing.ts";
import { FAILING_URL, MemoryClient, memorySql } from "./_memory_driver.ts";

Deno.test("BaseClient conformance", async (t) => {
  await testClientIntegration(
    t,
    MemoryClient,
    ["memory://", { poolOptions: { maxSize: 3 } }],
    memorySql,
  );
});

Deno.test("BaseClient", async (t) => {
  await t.step("rolls back a transaction left open on release", async () => {
    await using client = new MemoryClient("memory://");
    await client.connect();
    {
      await using poolClient = await client.acquire();
      await poolClient.beginTransaction();
      assert(poolClient.driver.inTransaction);
    }
    await using poolClient = await client.acquire();
    assertFalse(poolClient.driver.inTransaction);
    assertEquals(poolClient.driver.statements.at(-1), "ROLLBACK");
  });

  await t.step("forwards driver errors", async () => {
    await using client = new MemoryClient("memory://");
    const errors: unknown[] = [];
    client.eventTarget.addEventListener(
      "error",
      (event) =>
        errors.push((event as CustomEvent<{ error: unknown }>).detail.error),
    );
    await client.connect();
    const error = await assertRejects(
      () => client.query("SELEC").toValues(),
      QueryError,
    );
    const stmt = await client.prepare("SELEC");
    await assertRejects(() => stmt.query().toValues(), QueryError);
    await stmt.deallocate();
    assertEquals(errors.length, 2);
    assertEquals(errors[0], error);
    // The connection is released after errors.
    await client.ping();
  });

  await t.step("pool clients reject after release", async () => {
    await using client = new MemoryClient("memory://");
    await client.connect();
    const poolClient = await client.acquire();
    await poolClient.release();
    await assertRejects(() => poolClient.ping(), ConnectionError);
    await assertRejects(() => poolClient.execute("SELECT"), ConnectionError);
    await assertRejects(
      () => poolClient.query("SELECT").toValues(),
      ConnectionError,
    );
    await assertRejects(() => poolClient.prepare("SELECT"), ConnectionError);
    await assertRejects(() => poolClient.beginTransaction(), ConnectionError);
    await assertRejects(
      () => poolClient.transaction(() => Promise.resolve()),
      ConnectionError,
    );
  });

  await t.step("rejects pending acquires when closing", async () => {
    const client = new MemoryClient("memory://");
    await client.connect();
    const poolClient = await client.acquire();
    const pending = client.acquire();
    await client.close();
    await assertRejects(() => pending, ConnectionError, "closed");
    // Connections in use are closed too.
    assertFalse(poolClient.connected);
    await poolClient.release();
  });

  await t.step("replaces connections that closed while idle", async () => {
    await using client = new MemoryClient("memory://");
    await client.connect();
    const first = await client.acquire();
    const driver = first.driver;
    await first.release();
    await driver.close();
    const second = await client.acquire();
    assert(second.connected);
    assert(second.driver !== driver);
    await second.release();
  });

  await t.step("does not reuse connections closed while in use", async () => {
    await using client = new MemoryClient("memory://");
    await client.connect();
    const first = await client.acquire();
    const driver = first.driver;
    await driver.close();
    await first.release();
    const second = await client.acquire();
    assert(second.driver !== driver);
    await second.release();
  });

  await t.step("transaction wrapper releases the connection", async () => {
    await using client = new MemoryClient("memory://");
    await client.connect();
    const result = await client.transaction((tx) =>
      tx.query(memorySql.query).toValues()
    );
    assertEquals(result.length, memorySql.count);
    await (await client.acquire()).release();
  });

  await t.step("connects implicitly once", async () => {
    await using client = new MemoryClient("memory://", {
      poolOptions: { maxSize: 2 },
    });
    let connects = 0;
    client.eventTarget.addEventListener("connect", () => connects++);
    await Promise.all([
      client.execute(memorySql.execute),
      client.query(memorySql.query).toValues(),
    ]);
    assertEquals(connects, 2);
    assert(client.connected);
    await client.close();
    await assertRejects(() => client.acquire(), ConnectionError, "closed");
  });

  await t.step("fails to connect and can be retried", async () => {
    const client = new MemoryClient(FAILING_URL);
    await assertRejects(() => client.connect(), ConnectionError);
    assertFalse(client.connected);
    await assertRejects(() => client.connect(), ConnectionError);
    assertFalse(client.connected);
  });

  await t.step("fails to acquire when a lazy connect fails", async () => {
    await using client = new MemoryClient(FAILING_URL, {
      poolOptions: { lazyInitialization: true },
    });
    await client.connect();
    await assertRejects(() => client.acquire(), ConnectionError);
  });
});

Deno.test("BaseClient pool options", async (t) => {
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  await t.step("acquireTimeout rejects a waiting acquire", async () => {
    await using client = new MemoryClient("memory://", {
      poolOptions: { acquireTimeout: 20 },
    });
    await client.connect();
    const poolClient = await client.acquire();
    await assertRejects(() => client.acquire(), ConnectionError, "20 ms");
    // A leaked query result makes acquire fail instead of hang.
    await poolClient.release();
    // Running the query acquires the connection, which it holds.
    await client.query(memorySql.query).columns();
    await assertRejects(
      () => client.execute(memorySql.execute),
      ConnectionError,
    );
  });

  await t.step("acquireTimeout does not apply when available", async () => {
    await using client = new MemoryClient("memory://", {
      poolOptions: { acquireTimeout: 0 },
    });
    await client.connect();
    await (await client.acquire()).release();
  });

  await t.step("idleTimeout closes idle connections", async () => {
    await using client = new MemoryClient("memory://", {
      poolOptions: { maxSize: 2, idleTimeout: 10 },
    });
    let closes = 0;
    client.eventTarget.addEventListener("close", () => closes++);
    await client.connect();
    const inUse = await client.acquire();
    await wait(50);
    // Only the idle connection is closed.
    assertEquals(closes, 1);
    assert(inUse.connected);
    const driver = inUse.driver;
    await inUse.release();
    // Reacquiring before the timeout keeps the connection.
    await (await client.acquire()).release();
    await wait(50);
    assertEquals(closes, 2);
    assertFalse(driver.connected);
    // New connections are opened when needed again.
    const next = await client.acquire();
    assert(next.connected);
    await next.release();
  });

  await t.step("maxLifetime replaces old connections", async () => {
    await using client = new MemoryClient("memory://", {
      poolOptions: { maxLifetime: 10 },
    });
    await client.connect();
    const first = await client.acquire();
    const driver = first.driver;
    await first.release();
    // Still young: reused.
    const young = await client.acquire();
    assertEquals(young.driver, driver);
    await wait(30);
    // Expired while in use: closed on release.
    await young.release();
    assertFalse(driver.connected);
    const next = await client.acquire();
    assert(next.driver !== driver);
    await wait(30);
    await next.release();
    // Expired while idle would be replaced on acquire.
    const last = await client.acquire();
    assert(last.connected);
    await last.release();
  });

  await t.step("rejects invalid options", async () => {
    for (
      const poolOptions of [
        { acquireTimeout: -1 },
        { idleTimeout: Number.NaN },
        { maxLifetime: -5 },
      ]
    ) {
      const client = new MemoryClient("memory://", { poolOptions });
      await assertRejects(() => client.connect(), RangeError);
      assertFalse(client.connected);
    }
  });
});
