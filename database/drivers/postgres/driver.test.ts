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
import {
  Oid,
  PostgresClient,
  PostgresConnectionError,
  PostgresDriver,
  PostgresQueryError,
} from "./mod.ts";

/**
 * The tests against a live server run when `STDEXT_POSTGRES_URL` is set, for
 * example:
 *
 * ```sh
 * docker run -d -p 54329:5432 -e POSTGRES_PASSWORD=postgres postgres:17
 * STDEXT_POSTGRES_URL=postgres://postgres:postgres@localhost:54329/postgres deno task test
 * ```
 */
const url = Deno.env.get("STDEXT_POSTGRES_URL");
const ignore = url === undefined;

const sql: TestSql = {
  execute: "CREATE TEMP TABLE IF NOT EXISTS users (id INTEGER, name TEXT)",
  query:
    "SELECT 1 AS id, 'Alice' AS name UNION ALL SELECT 2, 'Bob' UNION ALL SELECT 3, 'Charlie'",
  columns: ["id", "name"],
  count: 3,
  parameterQuery: "SELECT $1::text AS value",
};

function connect(
  options?: ConstructorParameters<typeof PostgresDriver>[1],
): Promise<PostgresDriver> {
  const driver = new PostgresDriver(url!, options);
  return driver.connect().then(() => driver);
}

Deno.test({
  name: "PostgresDriver conformance",
  ignore,
  async fn(t) {
    await testDriverIntegration(t, PostgresDriver, [url!], sql);
  },
});

Deno.test({
  name: "PostgresClient conformance",
  ignore,
  async fn(t) {
    await testClientIntegration(
      t,
      PostgresClient,
      [url!, { poolOptions: { maxSize: 2 } }],
      sql,
    );
  },
});

Deno.test({
  name: "PostgresDriver",
  ignore,
  async fn(t) {
    await t.step("parses result types", async () => {
      await using driver = await connect();
      const ctx = await driver.query(
        `SELECT
          true AS bool, 1::int2 AS int2, 2::int4 AS int4, 3::int8 AS int8,
          1.5::float8 AS float8, 1.10::numeric AS numeric, 'a'::text AS text,
          '\\x00ff'::bytea AS bytea, '{"a":1}'::json AS json,
          '{"b":2}'::jsonb AS jsonb, '2024-01-02'::date AS date,
          '2024-01-02 03:04:05+00'::timestamptz AS timestamptz,
          '{1,NULL,3}'::int4[] AS int4s, '{"a b",c}'::text[] AS texts,
          NULL::int AS "null", '00000000-0000-0000-0000-000000000000'::uuid AS uuid`,
      );
      assertEquals(await ctx.toRecords(), [{
        bool: true,
        int2: 1,
        int4: 2,
        int8: 3n,
        float8: 1.5,
        numeric: "1.10",
        text: "a",
        bytea: new Uint8Array([0, 255]),
        json: { a: 1 },
        jsonb: { b: 2 },
        date: "2024-01-02",
        timestamptz: new Date("2024-01-02T03:04:05Z"),
        int4s: [1, null, 3],
        texts: ["a b", "c"],
        null: null,
        uuid: "00000000-0000-0000-0000-000000000000",
      }]);
    });

    await t.step("binds parameters", async () => {
      await using driver = await connect();
      const date = new Date("2024-01-02T03:04:05.678Z");
      const ctx = await driver.query(
        "SELECT $1::int AS a, $2::text AS b, $3::bool AS c, $4::timestamptz AS d, $5::bytea AS e, $6::int8 AS f, $7::jsonb AS g, $8::int[] AS h, $9::text AS i",
        [
          1,
          "b",
          true,
          date,
          new Uint8Array([1, 2]),
          2n ** 60n,
          // Objects and arrays are encoded as JSON and array literals.
          ...([{ g: 1 }, [1, 2]] as unknown as string[]),
          undefined,
        ],
      );
      assertEquals(await ctx.toValues(), [
        [1, "b", true, date, new Uint8Array([1, 2]), 2n ** 60n, { g: 1 }, [
          1,
          2,
        ], null],
      ]);
      await assertRejects(
        () => driver.query("SELECT $1", { a: 1 }),
        QueryError,
        "named parameters",
      );
    });

    await t.step("uses custom parsers", async () => {
      await using driver = await connect({
        connectionOptions: {
          parsers: { [Oid.int8]: Number, [Oid.numeric]: Number },
        },
      });
      const ctx = await driver.query("SELECT 1::int8 AS a, 1.5::numeric AS b");
      assertEquals(await ctx.toValues(), [[1, 1.5]]);
    });

    await t.step("reports affected rows", async () => {
      await using driver = await connect();
      assertEquals(
        await driver.execute("CREATE TEMP TABLE t (a int)"),
        undefined,
      );
      assertEquals(
        await driver.execute("INSERT INTO t SELECT generate_series(1, 5)"),
        5,
      );
      assertEquals(await driver.execute("UPDATE t SET a = a WHERE a > 3"), 2);
      assertEquals(await driver.execute("DELETE FROM t"), 5);
      assertEquals(await driver.execute(""), undefined);
    });

    await t.step("reports server errors", async () => {
      await using driver = await connect();
      const error = await assertRejects(
        () => driver.query("SELEC 1"),
        PostgresQueryError,
      );
      assertEquals(error.code, "42601");
      assertEquals(error.fields.severity, "ERROR");
      assert(error.fields.position);

      // The connection is still usable after an error.
      await driver.ping();

      // Errors after the first rows are thrown while iterating.
      const ctx = await driver.query(
        "SELECT 10 / (3 - x) AS a FROM generate_series(1, 5) x",
      );
      const rows: unknown[] = [];
      const iterationError = await assertRejects(async () => {
        for await (const row of ctx) rows.push(row.values[0]);
      }, PostgresQueryError);
      assertEquals(iterationError.code, "22012");
      assertEquals(rows, [5, 10]);
      await driver.ping();
    });

    await t.step("buffers a result when another command runs", async () => {
      await using driver = await connect();
      const ctx = await driver.query("SELECT generate_series(1, 1000) AS a");
      // The first result is not read yet, so it is buffered to run this.
      const other = await driver.query("SELECT 'other' AS b");
      assertEquals(await other.toValues(), [["other"]]);
      assertEquals((await ctx.toValues()).length, 1000);

      // Concurrent commands are serialized.
      const results = await Promise.all(
        Array.from(
          { length: 10 },
          (_, i) =>
            driver.query("SELECT $1::int AS i", [i]).then((ctx) =>
              ctx.toValues()
            ),
        ),
      );
      assertEquals(results, Array.from({ length: 10 }, (_, i) => [[i]]));
    });

    await t.step("disposing a result discards the remaining rows", async () => {
      await using driver = await connect();
      const ctx = await driver.query("SELECT generate_series(1, 10000) AS a");
      for await (const _row of ctx) break;
      await ctx[Symbol.asyncDispose]();
      await driver.ping();
    });

    await t.step("prepared statements", async () => {
      await using driver = await connect();
      await driver.execute("CREATE TEMP TABLE p (a int)");
      const insert = await driver.prepare("INSERT INTO p VALUES ($1)");
      for (let i = 0; i < 3; i++) assertEquals(await insert.execute([i]), 1);
      await insert.deallocate();
      await using select = await driver.prepare("SELECT a FROM p WHERE a > $1");
      assertEquals(await (await select.query([0])).toValues(), [[1], [2]]);
      assertEquals(await (await select.query([1])).toValues(), [[2]]);
      await assertRejects(() => driver.prepare("SELEC"), PostgresQueryError);
      await assertRejects(() => insert.execute([1]), QueryError);
    });

    await t.step("aborts a running query", async () => {
      await using driver = await connect();
      const controller = new AbortController();
      const reason = new Error("aborted");
      setTimeout(() => controller.abort(reason), 100);
      const start = Date.now();
      const error = await assertRejects(() =>
        driver.execute("SELECT pg_sleep(10)", [], {
          signal: controller.signal,
        })
      );
      assertEquals(error, reason);
      assert(Date.now() - start < 5000);
      await driver.ping();
    });

    await t.step("aborts a streaming query", async () => {
      await using driver = await connect();
      const controller = new AbortController();
      const ctx = await driver.query(
        "SELECT x, pg_sleep(0.01) FROM generate_series(1, 1000) x",
        [],
        { signal: controller.signal },
      );
      const error = await assertRejects(async () => {
        let count = 0;
        for await (const _row of ctx) {
          if (++count === 2) controller.abort(new Error("stop"));
        }
      });
      assertEquals(error, controller.signal.reason);
      await driver.ping();
    });

    await t.step("transactions", async () => {
      await using driver = await connect();
      await driver.execute("CREATE TEMP TABLE tx (a int)");
      await driver.transaction(async (tx) => {
        await tx.execute("INSERT INTO tx VALUES (1)");
        await assertRejects(() =>
          tx.transaction(async (nested) => {
            await nested.execute("INSERT INTO tx VALUES (2)");
            throw new Error("rollback nested");
          })
        );
      }, { isolationLevel: "serializable" });
      assertEquals(await (await driver.query("SELECT a FROM tx")).toValues(), [
        [1],
      ]);

      // Statements fail in an aborted transaction until it is rolled back.
      const tx = await driver.beginTransaction();
      await assertRejects(() => tx.execute("SELEC"), PostgresQueryError);
      const error = await assertRejects(
        () => tx.execute("SELECT 1"),
        PostgresQueryError,
      );
      assertEquals(error.code, "25P02");
      await tx.rollbackTransaction();

      const readOnly = await driver.beginTransaction({
        readOnly: true,
        deferrable: false,
        isolationLevel: "read committed",
      });
      await assertRejects(
        // Temporary tables are writable in read only transactions.
        () => readOnly.execute("CREATE TABLE stdext_read_only (a int)"),
        PostgresQueryError,
      );
      await readOnly.rollbackTransaction();

      const readWrite = await driver.beginTransaction({
        readOnly: false,
        deferrable: true,
      });
      await readWrite.commitTransaction();

      await assertRejects(
        // deno-lint-ignore no-explicit-any
        () => driver.beginTransaction({ isolationLevel: "bogus" as any }),
        TransactionError,
      );
    });

    await t.step("sends run-time parameters", async () => {
      await using driver = await connect({
        connectionOptions: {
          applicationName: "stdext",
          runtimeParameters: { TimeZone: "Asia/Tokyo" },
          tls: { mode: "prefer" },
        },
      });
      assertEquals(driver.serverParameters?.get("application_name"), "stdext");
      const ctx = await driver.query("SHOW TimeZone");
      assertEquals(await ctx.toValues(), [["Asia/Tokyo"]]);
    });

    await t.step("detects a terminated connection", async () => {
      await using driver = await connect();
      await using killer = await connect();
      const pid = await (await driver.query("SELECT pg_backend_pid()"))
        .toValues();
      await killer.execute("SELECT pg_terminate_backend($1)", [
        pid[0][0] as number,
      ]);
      await assertRejects(() => driver.query("SELECT 1"), ConnectionError);
      assertFalse(driver.connected);
      await driver.connect();
      await driver.ping();
    });

    await t.step("rejects invalid credentials", async () => {
      const wrong = new URL(url!);
      wrong.password = "wrong";
      const driver = new PostgresDriver(wrong);
      const error = await assertRejects(
        () => driver.connect(),
        PostgresConnectionError,
      );
      assertEquals(error.code, "28P01");
      assertFalse(driver.connected);

      wrong.password = "";
      await assertRejects(
        () => new PostgresDriver(wrong).connect(),
        ConnectionError,
        "requires a password",
      );

      // The password can be given as an option.
      await using driver2 = new PostgresDriver(wrong, {
        connectionOptions: { password: new URL(url!).password },
      });
      await driver2.connect();
    });

    await t.step("requires TLS when configured", async () => {
      // The test server does not support TLS.
      const driver = new PostgresDriver(url!, {
        connectionOptions: { tls: { mode: "require" } },
      });
      await assertRejects(() => driver.connect(), ConnectionError, "TLS");
    });
  },
});

Deno.test({
  name: "PostgresClient",
  ignore,
  async fn(t) {
    await t.step("runs queries concurrently on the pool", async () => {
      await using client = new PostgresClient(url!, {
        poolOptions: { maxSize: 3 },
      });
      await client.connect();
      const start = Date.now();
      await Promise.all(
        Array.from({ length: 3 }, () => client.execute("SELECT pg_sleep(0.3)")),
      );
      assert(Date.now() - start < 800, "queries did not run concurrently");
    });
  },
});

Deno.test("PostgresDriver rejects invalid connection URLs", async () => {
  await assertRejects(
    () => new PostgresDriver("not a url").connect(),
    ConnectionError,
    "Invalid connection URL",
  );
  await assertRejects(
    () => new PostgresDriver("mysql://localhost").connect(),
    ConnectionError,
    "protocol",
  );
});
