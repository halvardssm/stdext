import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import {
  ConnectionError,
  QueryError,
  sql as tag,
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
  emptyQuery: "SELECT 1 AS id, 'Alice' AS name WHERE 0",
  parameterTemplate: (value) => tag`SELECT ${value} AS value`,
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
      // Dates are not a standard parameter type, but are bound as ISO strings.
      [
        1,
        1.5,
        "s",
        new Uint8Array([1, 2]),
        undefined,
        true,
        date as never,
        null,
      ],
    );
    assertEquals(affected, { affectedRows: 1, lastInsertId: 1 });
    await driver.execute(
      "INSERT INTO t (i, s) VALUES (:i, :s)",
      { i: 2, s: "named" },
    );

    const ctx = driver.query("SELECT * FROM t ORDER BY i");
    assertEquals(await ctx.columns(), [
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
    const ctx = driver.query("SELECT ? AS a", ["x"], {
      transformInput: () => ({ a: 1 }),
    });
    assertEquals(await ctx.toValues(), [['{"a":1}']]);
  });

  await t.step("reads big integers", async () => {
    await using driver = new SqliteDriver(":memory:", {
      connectionOptions: { readBigInts: true },
    });
    await driver.connect();
    const ctx = driver.query("SELECT ? AS a", [2n ** 62n]);
    assertEquals(await ctx.toValues(), [[2n ** 62n]]);
  });

  await t.step("streams rows lazily", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    const ctx = driver.query(
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
    for (let i = 0; i < 3; i++) {
      assertEquals((await insert.execute([i])).affectedRows, 1);
    }
    const ctx = driver.query("SELECT count(*) AS n FROM t");
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
      await nested.rollback();
      const kept = await tx.beginTransaction();
      await kept.execute("INSERT INTO t VALUES (3)");
      await kept.commit();
      await tx.commit();

      await assertRejects(
        () =>
          driver.transaction(async (tx) => {
            await tx.execute("INSERT INTO t VALUES (4)");
            throw new Error("rollback");
          }),
        Error,
        "rollback",
      );
      const ctx = driver.query("SELECT a FROM t ORDER BY a");
      assertEquals(await ctx.toValues(), [[1], [3]]);
    },
  );

  await t.step("rejects multiple statements", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    const sql = "CREATE TABLE a (x); CREATE TABLE b (x)";
    await assertRejects(() => driver.execute(sql), QueryError, "multiple");
    await assertRejects(
      () => driver.query(sql).toValues(),
      QueryError,
      "multiple",
    );
    await assertRejects(() => driver.prepare(sql), QueryError, "multiple");
    // Nothing was run
    const ctx = driver.query("SELECT name FROM sqlite_master");
    assertEquals(await ctx.toValues(), []);

    // Trailing whitespace and comments are not statements
    await driver.execute("CREATE TABLE c (x); -- comment\n /* block */ \n");
    await driver.execute("CREATE TABLE d (x); /* unterminated");
  });

  await t.step("reports affected rows of the statement only", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    assertEquals((await driver.execute("CREATE TABLE t (a)")).affectedRows, 0);
    assertEquals(
      (await driver.execute("CREATE TABLE log (a)")).affectedRows,
      0,
    );
    assertEquals(
      await driver.execute(
        "CREATE TRIGGER logged AFTER INSERT ON t BEGIN INSERT INTO log VALUES (new.a); END",
      ),
      { affectedRows: 0 },
    );
    assertEquals(
      (await driver.execute("INSERT INTO t VALUES (1), (2)")).affectedRows,
      2,
    );
    // Statements that do not modify rows do not report the previous count
    assertEquals((await driver.execute("SELECT a FROM t")).affectedRows, 0);
    assertEquals((await driver.execute("CREATE TABLE u (a)")).affectedRows, 0);
    assertEquals(
      (await driver.execute("UPDATE t SET a = 3 WHERE a > 5")).affectedRows,
      0,
    );
    // Rows changed by triggers are not counted
    assertEquals(
      (await driver.execute("INSERT INTO t VALUES (3)")).affectedRows,
      1,
    );
    await using stmt = await driver.prepare("DELETE FROM t WHERE a = ?");
    assertEquals((await stmt.execute([1])).affectedRows, 1);
    assertEquals((await stmt.execute([1])).affectedRows, 0);
  });

  await t.step("prepared statements run while being iterated", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.connect();
    await driver.execute("CREATE TABLE t (a)");
    await driver.execute("INSERT INTO t VALUES (1), (2), (3)");
    await using stmt = await driver.prepare("SELECT a FROM t WHERE a >= ?");
    const first = stmt.query([1]);
    const second = stmt.query([2]);
    // Start both queries before reading them.
    await first.columns();
    await second.columns();
    assertEquals(await first.toValues(), [[1], [2], [3]]);
    assertEquals(await second.toValues(), [[2], [3]]);

    await using insert = await driver.prepare("INSERT INTO t VALUES (?)");
    await using select = await driver.prepare("SELECT a FROM t");
    const rows = select.query();
    await rows.columns();
    assertEquals((await insert.execute([4])).affectedRows, 1);
    assertEquals((await rows.toValues()).length, 4);
    // The statement is reused once the iteration is done
    assertEquals((await select.query().toValues()).length, 4);
  });

  await t.step("reports the last inserted id", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, a)");
    assertEquals(await driver.execute("INSERT INTO t (a) VALUES (1)"), {
      affectedRows: 1,
      lastInsertId: 1,
    });
    assertEquals(await driver.execute("INSERT INTO t VALUES (10, 2)"), {
      affectedRows: 1,
      lastInsertId: 10,
    });
    // Statements that modify no rows report no inserted id.
    assertEquals(await driver.execute("SELECT * FROM t"), { affectedRows: 0 });
  });

  await t.step("binds binary data from any buffer", async () => {
    await using driver = new SqliteDriver(":memory:");
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const result = driver.query("SELECT ?, ?, ?, ?", [
      bytes,
      bytes.buffer,
      new DataView(bytes.buffer, 1, 2),
      new Uint16Array([0x0201]),
    ]);
    assertEquals(await result.toValues(), [[
      bytes,
      bytes,
      new Uint8Array([2, 3]),
      new Uint8Array([1, 2]),
    ]]);
  });

  await t.step("executes scripts", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.executeScript(`
      CREATE TABLE t (a);
      -- Comments are allowed
      INSERT INTO t VALUES (1);
      INSERT INTO t VALUES (2);
    `);
    assertEquals(await driver.query("SELECT a FROM t").toValues(), [[1], [2]]);
  });

  await t.step("runs SQL templates", async () => {
    await using driver = new SqliteDriver(":memory:");
    await driver.execute("CREATE TABLE t (a, b)");
    const a = 1;
    const b = "x";
    assertEquals(
      (await driver.execute(tag`INSERT INTO t VALUES (${a}, ${b})`))
        .affectedRows,
      1,
    );
    assertEquals(
      await driver.query(tag`SELECT * FROM t WHERE b = ${b}`).toRecords(),
      [{ a: 1, b: "x" }],
    );
  });

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
  await t.step("emulates the pool with a single connection", async () => {
    await using client = new SqliteClient(":memory:", {
      poolOptions: { maxSize: 4, acquireTimeout: 10 },
    });
    assertEquals(client.options.poolOptions?.maxSize, 1);
    await client.connect();
    {
      await using poolClient = await client.acquire();
      await poolClient.execute("CREATE TABLE t (a)");
      // Acquiring waits for the single connection.
      await assertRejects(() => client.acquire(), ConnectionError);
    }
    // The in-memory database is shared by all pool clients.
    await using poolClient = await client.acquire();
    const ctx = poolClient.query("SELECT * FROM t");
    assertEquals(await ctx.columns(), ["a"]);
  });

  await t.step("waits for locks held by other connections", async () => {
    const dir = await Deno.makeTempDir();
    try {
      const path = `${dir}/test.db`;
      await using writer = new SqliteDriver(path);
      await writer.connect();
      await writer.execute("CREATE TABLE t (a)");
      const tx = await writer.beginTransaction({ behavior: "immediate" });
      await using other = new SqliteDriver(path, {
        connectionOptions: { timeout: 20 },
      });
      await other.connect();
      await assertRejects(
        () => other.execute("INSERT INTO t VALUES (1)"),
        QueryError,
        "locked",
      );
      await tx.commit();
      assertEquals(
        (await other.execute("INSERT INTO t VALUES (1)")).affectedRows,
        1,
      );
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  });

  await t.step("passes the options to the drivers", async () => {
    await using client = new SqliteClient(":memory:", {
      connectionOptions: { readBigInts: true },
    });
    await client.connect();
    const ctx = client.query("SELECT 1 AS a");
    assertEquals(await ctx.toValues(), [[1n]]);
  });
});
