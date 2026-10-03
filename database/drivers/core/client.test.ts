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
    const error = await assertRejects(() => client.query("SELEC"), QueryError);
    const stmt = await client.prepare("SELEC");
    await assertRejects(() => stmt.query(), QueryError);
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
    await assertRejects(() => poolClient.query("SELECT"), ConnectionError);
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
      tx.query(memorySql.query).then((ctx) => ctx.toValues())
    );
    assertEquals(result.length, memorySql.count);
    await (await client.acquire()).release();
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
