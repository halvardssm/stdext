import {
  testDriverConnectable,
  testDriverConstructorIntegration,
} from "@stdext/database/sql/testing";
import { assert, assertEquals } from "@std/assert";
import {
  SQLiteDriver,
  SQLiteDriverConnectable,
  SQLiteDriverInternalOptions,
  SQLiteDriverOptions,
} from "./driver.ts";
import { DriverQueryNext } from "@stdext/database/sql";
import { assertFalse } from "@std/assert/false";

Deno.test(`Driver`, async (t) => {
  const connectionUrl = ":memory:";
  const options: SQLiteDriverInternalOptions = {
    connectionOptions: {},
    queryOptions: {},
  };

  await t.step("integration test suite", async (t) => {
    await testDriverConstructorIntegration(t, SQLiteDriver, [
      connectionUrl,
      options,
    ]);
  });

  await t.step("sanity test", async () => {
    await using driver = new SQLiteDriver(connectionUrl, options);

    assertFalse(driver.connected);
    driver.connect();
    assert(driver.connect);
    const createRes = await Array.fromAsync(
      driver.query(
        "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)",
      ),
    );
    assertEquals(createRes, []);
    const insertRes = await Array.fromAsync(
      driver.query(
        `INSERT INTO test (name, value) VALUES ('Alice', 100);
         INSERT INTO test (name, value) VALUES ('Bob', 200);
         INSERT INTO test (name, value) VALUES ('Charlie', 300);`,
      ),
    );
    assertEquals(insertRes, []);
    const queryRes = await Array.fromAsync(
      driver.query(
        "SELECT id, name, value FROM test ORDER BY id",
      ),
    );
    assertEquals(queryRes, [
      // { id: 1, name: "Alice", value: 100 },
      // { id: 2, name: "Bob", value: 200 },
      // { id: 3, name: "Charlie", value: 300 },
    ]);
  });
});

Deno.test(`DriverConnectable suite`, async (t) => {
  const connectionUrl = ":memory:";
  const options: SQLiteDriverInternalOptions = {
    connectionOptions: {},
    queryOptions: {},
  };

  const connection = new SQLiteDriver(connectionUrl, options);
  const connectable = new SQLiteDriverConnectable(
    connection,
    connection.options,
  );

  await t.step("test suite", () => {
    testDriverConnectable(connectable, { connectionUrl, options });
  });
});
