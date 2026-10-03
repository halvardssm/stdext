import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import {
  ConnectionError,
  QueryError,
  TransactionError,
} from "../../sql/mod.ts";
import {
  testClientIntegration,
  testDriverIntegration,
  type TestSql,
} from "../../sql/testing.ts";
import { SqliteClient, SqliteDriver } from "./mod.ts";

const sql: TestSql = {
  execute: "CREATE TABLE IF NOT EXISTS users (id INTEGER, name TEXT)",
  query:
    "SELECT 1 AS id, 'Alice' AS name UNION ALL SELECT 2, 'Bob' UNION ALL SELECT 3, 'Charlie'",
  columns: ["id", "name"],
  count: 3,
  parameterQuery: "SELECT ? AS value",
};

Deno.test("SqliteDriver conformance", async (t) => {
  await testDriverIntegration(t, SqliteDriver, [":memory:"], sql);
});

Deno.test("SqliteClient conformance", async (t) => {
  await testClientIntegration(
    t,
    SqliteClient,
    [":memory:", { poolOptions: { maxSize: 2 } }],
    sql,
  );
});

Deno.test("SqliteDriver", async (t) => {
  await t.step("binds parameters and maps values", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    await driver.execute(
      "CREATE TABLE t (i INTEGER, r REAL, s TEXT, b BLOB, n, bool, d, j)",
    );
    const date = new Date("2024-01-02T03:04:05.000Z");
    const affected = await driver.execute(
      "INSERT INTO t VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [1, 1.5, "s", new Uint8Array([1, 2]), undefined, true, date, null],
    );
    assertEquals(affected, 1);
    await driver.execute(
      "INSERT INTO t (i, s) VALUES (:i, :s)",
      { i: 2, s: "named" },
    );

    const ctx = await driver.query("SELECT * FROM t ORDER BY i");
    assertEquals(ctx.metadata.columns, [
      "i",
      "r",
      "s",
      "b",
      "n",
      "bool",
      "d",
      "j",
    ]);
    assertEquals(await ctx.toValues(), [
      [1, 1.5, "s", new Uint8Array([1, 2]), null, 1, date.toISOString(), null],
      [2, null, "named", null, null, null, null, null],
    ]);
  });

  await t.step("encodes other values as JSON", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    const ctx = await driver.query("SELECT ? AS a", ["x"], {
      transformInput: () => ({ a: 1 }),
    });
    assertEquals(await ctx.toValues(), [['{"a":1}']]);
  });

  await t.step("reads big integers", async () => {
    await using driver = new SqliteDriver(":memory:", {
      connectionOptions: { readBigInts: true },
    });
    await driver.connect();
    const ctx = await driver.query("SELECT ? AS a", [2n ** 62n]);
    assertEquals(await ctx.toValues(), [[2n ** 62n]]);
  });

  await t.step("streams rows lazily", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    const ctx = await driver.query(
      "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c LIMIT 1000) SELECT x FROM c",
    );
    let count = 0;
    for await (const _row of ctx) {
      if (++count === 10) break;
    }
    assertEquals(count, 10);
    await ctx[Symbol.asyncDispose]();
  });

  await t.step("prepared statements execute repeatedly", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    await driver.execute("CREATE TABLE t (a INTEGER)");
    await using insert = await driver.prepare("INSERT INTO t VALUES (?)");
    for (let i = 0; i < 3; i++) assertEquals(await insert.execute([i]), 1);
    const ctx = await driver.query("SELECT count(*) AS n FROM t");
    assertEquals(await ctx.toValues(), [[3]]);
  });

  await t.step(
    "transactions persist commits and discard rollbacks",
    async () => {
      await using driver = new SqliteDriver(":memory:");
      await driver.connect();
      await driver.execute("CREATE TABLE t (a INTEGER)");

      const tx = await driver.beginTransaction({ behavior: "immediate" });
      await tx.execute("INSERT INTO t VALUES (1)");
      const nested = await tx.beginTransaction();
      await nested.execute("INSERT INTO t VALUES (2)");
      await nested.rollbackTransaction();
      const kept = await tx.beginTransaction();
      await kept.execute("INSERT INTO t VALUES (3)");
      await kept.commitTransaction();
      await tx.commitTransaction();

      await assertRejects(
        () =>
          driver.transaction(async (tx) => {
            await tx.execute("INSERT INTO t VALUES (4)");
            throw new Error("rollback");
          }),
        Error,
        "rollback",
      );
      const ctx = await driver.query("SELECT a FROM t ORDER BY a");
      assertEquals(await ctx.toValues(), [[1], [3]]);
    },
  );

  await t.step("rejects an invalid transaction behavior", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    await assertRejects(
      // deno-lint-ignore no-explicit-any
      () => driver.beginTransaction({ behavior: "bogus" as any }),
      TransactionError,
    );
  });

  await t.step("opens files and read-only databases", async () => {
    const dir = await Deno.makeTempDir();
    try {
      const url = new URL(`file://${dir}/test.db`);
      {
        await using driver = new SqliteDriver(url);
        await driver.connect();
        assert(driver.database);
        await driver.execute("CREATE TABLE t (a)");
      }
      await using driver = new SqliteDriver(url, {
        connectionOptions: {
          readOnly: true,
          timeout: 10,
          enableForeignKeyConstraints: false,
        },
      });
      await driver.connect();
      await assertRejects(
        () => driver.execute("INSERT INTO t VALUES (1)"),
        QueryError,
      );
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });

  await t.step("rejects connecting to an invalid path", async () => {
    const driver = new SqliteDriver("/nonexistent/dir/test.db");
    await assertRejects(() => driver.connect(), ConnectionError);
    assertFalse(driver.connected);
  });
});

Deno.test("SqliteClient", async (t) => {
  await t.step(
    "every in-memory connection is a separate database",
    async () => {
      await using client = new SqliteClient(":memory:", {
        poolOptions: { maxSize: 2 },
      });
      await client.connect();
      await using first = await client.acquire();
      await using second = await client.acquire();
      await first.execute("CREATE TABLE t (a)");
      await assertRejects(() => second.query("SELECT * FROM t"), QueryError);
    },
  );

  await t.step("passes the options to the drivers", async () => {
    await using client = new SqliteClient(":memory:", {
      connectionOptions: { readBigInts: true },
    });
    await client.connect();
    const ctx = await client.query("SELECT 1 AS a");
    assertEquals(await ctx.toValues(), [[1n]]);
  });
});
