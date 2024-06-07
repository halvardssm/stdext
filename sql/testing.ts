// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertFalse } from "@std/assert";
import {
  type ArrayRow,
  type Row,
  type SqlClientQueriable,
  type SqlPreparedStatement,
  type SqlQueriable,
  type SqlTransaction,
} from "./core.ts";
import type { SqlClient } from "./client.ts";
import type { SqlConnection, SqlConnectionOptions } from "./connection.ts";
import type {
  SqlClientPool,
  SqlClientPoolOptions,
  SqlPoolClient,
} from "./pool.ts";
import type { SqlQueryOptions } from "./core.ts";
import {
  assertIsSqlClient,
  assertIsSqlClientPool,
  assertIsSqlClientQueriable,
  assertIsSqlConnection,
  assertIsSqlPreparedStatement,
  assertIsSqlQueriable,
  assertIsSqlTransaction,
} from "./asserts.ts";

interface ConnectionConstructor {
  new (
    ...args: any[]
  ): SqlConnection;
}
interface ClientConstructor {
  new (
    ...args: any[]
  ): SqlClient;
}
interface ClientPoolConstructor {
  new (
    ...args: any[]
  ): SqlClientPool<any, any, any, any, any, any, any, any>;
}

export type TestQueries = {
  /**
   * Should create a table "sqlxtesttable" if not exist with a single column "testcol" of string type (min 10 characters)
   */
  createTable: string;
  /**
   * Should drop the table "sqlxtesttable" if exists
   */
  dropTable: string;
  /**
   * Should insert a single row into the table
   */
  insertOneToTable: string;
  /**
   * Should insert multiple rows into the table
   */
  insertManyToTable: string;
  /**
   * Should select a single row from the table
   */
  selectOneFromTable: string;
  /**
   * Should select a single row by matching the testcol value
   */
  selectByMatchFromTable: string;
  /**
   * Should select multiple rows from the table
   */
  selectManyFromTable: string;
  /**
   * Should return "1" as "result"
   */
  select1AsString: string;
  /**
   * Should return 1+1 as "result"
   */
  select1Plus1AsNumber: string;
  /**
   * Should delete a single row by matching the testcol value
   */
  deleteByMatchFromTable: string;
  /**
   * Should delete all rows from the table
   */
  deleteAllFromTable: string;
};

export type BaseQueriableTestOptions = {
  t: Deno.TestContext;
  queries: TestQueries;
};

export type TestConnectAndClosePoolClient = PoolTestOptions;

export type TestPreparedStatementOptions =
  & Omit<BaseQueriableTestOptions, "queries">
  & {
    db: SqlPreparedStatement;
    cases: {
      execute: {
        params?: any[];
        expected: number | undefined;
      };
      query: {
        params?: any[];
        expected: Row<any>[];
      };
      queryOne: {
        params?: any[];
        expected: Row<any> | undefined;
      };
      queryMany: {
        params?: any[];
        expected: Row<any>[];
      };
      queryArray: {
        params?: any[];
        expected: ArrayRow<any>[];
      };
      queryOneArray: {
        params?: any[];
        expected: ArrayRow<any>;
      };
      queryManyArray: {
        params?: any[];
        expected: ArrayRow<any>[];
      };
    };
  };

export type TestQueriableOptions = BaseQueriableTestOptions & {
  db: SqlQueriable;
};

export type TestClientQueriableOptions = BaseQueriableTestOptions & {
  db: SqlClientQueriable;
};
export type TestTransactionOptions = BaseQueriableTestOptions & {
  db: SqlTransaction;
};

export type ConnectionTestOptions = {
  t: Deno.TestContext;
  connection: SqlConnection;
};

export type ConnectionConstructorTestOptions = {
  t: Deno.TestContext;
  Connection: ConnectionConstructor;
  connectionUrl: string | URL;
  connectionOptions: SqlConnectionOptions & Record<any, any>;
};

export type ClientTestOptions = BaseQueriableTestOptions & {
  Client: ClientConstructor;
  connectionUrl: string | URL;
  connectionOptions: SqlConnectionOptions & SqlQueryOptions & Record<any, any>;
};

export type PoolTestOptions = BaseQueriableTestOptions & {
  Client: ClientPoolConstructor;
  connectionUrl: string | URL;
  connectionOptions:
    & SqlConnectionOptions
    & SqlQueryOptions
    & SqlClientPoolOptions
    & Record<any, any>;
};

async function _testConnectAndCloseClient(
  { t, Client, connectionUrl, connectionOptions }: ClientTestOptions,
): Promise<void> {
  await t.step("testConnectAndClose", async (t) => {
    await t.step("should connect and close with using", async () => {
      await using db = new Client(connectionUrl, connectionOptions);

      await db.connect();
    });

    await t.step("should connect and close", async () => {
      const db = new Client(connectionUrl, connectionOptions);

      await db.connect();

      await db.close();
    });

    await t.step("should connect and close with events", async () => {
      const db = new Client(connectionUrl, connectionOptions);

      let connectListenerCalled = false;
      let closeListenerCalled = false;
      let error: Error | undefined = undefined;

      try {
        db.eventTarget.addEventListener("connect", () => {
          connectListenerCalled = true;
        });

        db.eventTarget.addEventListener("close", () => {
          closeListenerCalled = true;
        });

        await db.connect();
        await db.close();
      } catch (e) {
        error = e;
      }

      assert(
        connectListenerCalled,
        "Connect listener not called: " + error?.message,
      );
      assert(
        closeListenerCalled,
        "Close listener not called: " + error?.message,
      );
    });
  });
}

async function _testConnectAndClosePoolClient(
  { t, Client, connectionUrl, connectionOptions }:
    TestConnectAndClosePoolClient,
): Promise<void> {
  await t.step("testConnectAndClose", async (t) => {
    await t.step("should connect and close", async () => {
      const db = new Client(connectionUrl, connectionOptions);

      assertEquals(db.connected, false);

      await db.connect();

      await db.close();
    });
    await t.step("should connect and close with using", async () => {
      await using db = new Client(connectionUrl, {
        ...connectionOptions,
        lazyInitialization: true,
      });
      let connectListenerCalled = false;

      db.eventTarget.addEventListener("connect", () => {
        connectListenerCalled = true;
      });

      await db.connect();

      assertFalse(
        connectListenerCalled,
        "Connect listener called, but should not have been due to lazyInitialization",
      );
    });
    await t.step("should connect and close with events", async () => {
      const db = new Client(connectionUrl, {
        ...connectionOptions,
        lazyInitialization: false,
      });

      let connectListenerCalled = false;
      let closeListenerCalled = false;
      let error: Error | undefined = undefined;

      try {
        db.eventTarget.addEventListener("connect", () => {
          connectListenerCalled = true;
        });

        db.eventTarget.addEventListener("close", () => {
          closeListenerCalled = true;
        });

        await db.connect();
        await db.close();
      } catch (e) {
        error = e;
      }

      assertEquals(
        connectListenerCalled,
        true,
        "Connect listener not called: " + error?.message,
      );
      assertEquals(
        closeListenerCalled,
        true,
        "Close listener not called: " + error?.message,
      );
    });
  });
}

async function _testPreparedStatement(
  { t, db, cases }: TestPreparedStatementOptions,
): Promise<void> {
  await t.step("testPreparedStatement", async (t) => {
    assertIsSqlPreparedStatement(db);

    await t.step("should execute", async () => {
      if (cases.execute.expected) {
        const res = await db.execute(cases.execute.params);
        assertEquals(res, cases.execute.expected);
      }
    });

    await t.step("should query", async () => {
      const res = await db.query(cases.query.params);
      assertEquals(res, cases.query.expected);
    });

    await t.step("should queryOne", async () => {
      const res = await db.queryOne(cases.queryOne.params);
      assertEquals(res, cases.queryOne.expected);
    });

    await t.step("should queryMany", async () => {
      const actual = [];
      for await (const res of db.queryMany(cases.queryMany.params)) {
        actual.push(res);
      }
      assertEquals(actual, cases.queryMany.expected);
    });

    await t.step("should queryArray", async () => {
      const res = await db.queryArray(cases.queryArray.params);
      assertEquals(res, cases.queryArray.expected);
    });

    await t.step("should queryOneArray", async () => {
      const res = await db.queryOneArray(cases.queryOneArray.params);
      assertEquals(res, cases.queryOneArray.expected);
    });

    await t.step("should queryManyArray", async () => {
      const actual = [];
      for await (const res of db.queryManyArray(cases.queryManyArray.params)) {
        actual.push(res);
      }
      assertEquals(actual, cases.queryManyArray.expected);
    });
  });
}

async function _testQueriable(
  { t, db, queries }: TestQueriableOptions,
): Promise<void> {
  await t.step("testQueriable", async (t) => {
    assertIsSqlQueriable(db);

    await t.step("should execute", async () => {
      await db.execute(queries.selectManyFromTable);
    });

    await t.step("should query", async () => {
      const res = await db.query(queries.selectManyFromTable);
      assertEquals(res, [{ testcol: "test" }, { testcol: "test1" }, {
        testcol: "test2",
      }, { testcol: "test3" }]);
    });

    await t.step("should queryOne", async () => {
      const res = await db.queryOne(queries.selectManyFromTable);
      assertEquals(res, { testcol: "test" });
    });

    await t.step("should queryMany", async () => {
      const actual = [];
      for await (const res of db.queryMany(queries.selectManyFromTable)) {
        actual.push(res);
      }
      assertEquals(actual, [{ testcol: "test" }, { testcol: "test1" }, {
        testcol: "test2",
      }, { testcol: "test3" }]);
    });

    await t.step("should queryArray", async () => {
      const res = await db.queryArray(queries.selectManyFromTable);
      assertEquals(res, [["test"], ["test1"], ["test2"], ["test3"]]);
    });

    await t.step("should queryOneArray", async () => {
      const res = await db.queryOneArray(queries.selectManyFromTable);
      assertEquals(res, ["test"]);
    });

    await t.step("should queryManyArray", async () => {
      const actual = [];
      for await (const res of db.queryManyArray(queries.selectManyFromTable)) {
        actual.push(res);
      }
      assertEquals(actual, [["test"], ["test1"], ["test2"], ["test3"]]);
    });
  });
}

async function _testClientQueriable(
  { t, db, queries }: TestClientQueriableOptions,
): Promise<void> {
  await t.step("testClientQueriable", async (t) => {
    assertIsSqlClientQueriable(db);

    await t.step("test prepared statements", async (t) => {
      await t.step("prepare select1AsString", async (t) => {
        const statement = db.prepare(queries.select1AsString);
        await _testPreparedStatement({
          t,
          db: statement,
          cases: {
            execute: { expected: undefined },
            query: { expected: [{ result: "1" }] },
            queryOne: { expected: { result: "1" } },
            queryMany: { expected: [{ result: "1" }] },
            queryArray: { expected: [["1"]] },
            queryOneArray: { expected: ["1"] },
            queryManyArray: { expected: [["1"]] },
          },
        });
      });
      await t.step("prepare select1Plus1AsNumber", async (t) => {
        const statement = db.prepare(queries.select1Plus1AsNumber);
        await _testPreparedStatement({
          t,
          db: statement,
          cases: {
            execute: { expected: undefined },
            query: { expected: [{ result: 2 }] },
            queryOne: { expected: { result: 2 } },
            queryMany: { expected: [{ result: 2 }] },
            queryArray: { expected: [[2]] },
            queryOneArray: { expected: [2] },
            queryManyArray: { expected: [[2]] },
          },
        });
      });
      await t.step("prepare selectByMatchFromTable", async (t) => {
        const statement = db.prepare(queries.selectOneFromTable);
        await _testPreparedStatement({
          t,
          db: statement,
          cases: {
            execute: { params: ["test"], expected: undefined },
            query: { params: ["test"], expected: [{ testcol: "test" }] },
            queryOne: { params: ["test"], expected: { testcol: "test" } },
            queryMany: { params: ["test"], expected: [{ testcol: "test" }] },
            queryArray: { params: ["test"], expected: [["test"]] },
            queryOneArray: { params: ["test"], expected: ["test"] },
            queryManyArray: { params: ["test"], expected: [["test"]] },
          },
        });
      });
      await t.step("prepare selectByMatchFromTable", async (t) => {
        const statement = db.prepare(queries.selectByMatchFromTable);
        await _testPreparedStatement({
          t,
          db: statement,
          cases: {
            execute: { params: ["test"], expected: undefined },
            query: { params: ["test"], expected: [{ testcol: "test" }] },
            queryOne: { params: ["test"], expected: { testcol: "test" } },
            queryMany: { params: ["test"], expected: [{ testcol: "test" }] },
            queryArray: { params: ["test"], expected: [["test"]] },
            queryOneArray: { params: ["test"], expected: ["test"] },
            queryManyArray: { params: ["test"], expected: [["test"]] },
          },
        });
      });
      await t.step("prepare selectManyFromTable", async (t) => {
        const statement = db.prepare(queries.selectManyFromTable);
        await _testPreparedStatement({
          t,
          db: statement,
          cases: {
            execute: { expected: undefined },
            query: {
              expected: [{ testcol: "test" }, { testcol: "test1" }, {
                testcol: "test2",
              }, { testcol: "test3" }],
            },
            queryOne: { expected: { testcol: "test" } },
            queryMany: {
              expected: [{ testcol: "test" }, { testcol: "test1" }, {
                testcol: "test2",
              }, { testcol: "test3" }],
            },
            queryArray: {
              expected: [["test"], ["test1"], ["test2"], ["test3"]],
            },
            queryOneArray: { expected: ["test"] },
            queryManyArray: {
              expected: [["test"], ["test1"], ["test2"], ["test3"]],
            },
          },
        });
      });
    });

    await t.step("test transactions", async (t) => {
      await _testQueriable({ t, db, queries });

      await t.step("transaction wrapper", async (t) => {
        await db.transaction(async (c) => {
          await _testTransaction({ t, db: c, queries });
        });
      });

      await t.step("get a transaction instance", async (t) => {
        const res = await db.beginTransaction();

        await _testTransaction({ t, db: res, queries });
      });
    });
  });
}

async function _testTransaction(
  { t, db, queries }: TestTransactionOptions,
): Promise<void> {
  await t.step("testTransaction", async (t) => {
    assertIsSqlTransaction(db);

    await _testQueriable({ t, db, queries });

    await t.step(
      "createSavepoint, releaseSavepoint",
      async () => {
        await db.createSavepoint("savepoint1");
        await db.releaseSavepoint("savepoint1");
      },
    );
  });
}

export async function _testSetupTable(
  { t, db, queries }: TestQueriableOptions,
): Promise<void> {
  await t.step("drop table", async () => {
    const res = await db.execute(queries.dropTable);
    assertFalse(res);
  });

  await t.step("setup table", async () => {
    const res = await db.execute(queries.createTable);
    assertFalse(res);
  });

  await t.step("insert one", async () => {
    const res = await db.execute(queries.insertOneToTable, ["test"]);
    assertEquals(res, 1);
  });

  await t.step("insert many", async () => {
    const res = await db.execute(queries.insertManyToTable, [
      "test1",
      "test2",
      "test3",
    ]);
    assertEquals(res, 3);
  });

  await t.step("select one", async () => {
    const res = await db.queryOne(queries.selectOneFromTable, ["test"]);
    assertEquals(res, { testcol: "test" });
  });

  await t.step("select by match", async () => {
    const res = await db.query(queries.selectByMatchFromTable, ["test"]);
    assertEquals(res, [{ testcol: "test" }]);
  });

  await t.step("select many", async () => {
    const res = await db.query(queries.selectManyFromTable);
    assertEquals(res, [{ testcol: "test" }, { testcol: "test1" }, {
      testcol: "test2",
    }, { testcol: "test3" }]);
  });
}

export async function _connectionTest(
  { t, connection }: ConnectionTestOptions,
): Promise<void> {
  await t.step("Connection Test", async (t) => {
    assertIsSqlConnection(connection);

    await t.step("can connect and close", async () => {
      assertEquals(connection.connected, false);
      await connection.connect();
      assertEquals(connection.connected, true);
      await connection.close();
      assertEquals(connection.connected, false);
    });

    await t.step("can reconnect", async () => {
      assertEquals(connection.connected, false);
      await connection.connect();
      assertEquals(connection.connected, true);
      await connection.close();
      assertEquals(connection.connected, false);
    });
  });
}

/**
 * connectionConstructorTest
 *
 * Test the connection constructor. This is the test you want to include in your test suite.
 *
 * @example
 * ```
 * Deno.test("Connection", async (t) => {
 *  ...other tests
 *  await connectionConstructorTest({ t, Connection, connectionOptions, connectionUrl })
 *  ...other tests
 * })
 * ```
 */
export async function connectionConstructorTest(
  { t, Connection, connectionOptions, connectionUrl }:
    ConnectionConstructorTestOptions,
): Promise<void> {
  await t.step("SQLx Connection Constructor Test", async (t) => {
    assertEquals(typeof Connection, "function");

    const connection = new Connection(connectionUrl, connectionOptions);
    await _connectionTest({ t, connection });

    await t.step("can connect with using and dispose", async () => {
      await using connection = new Connection(connectionUrl, connectionOptions);
      assertEquals(connection.connected, false);
      await connection.connect();
      assertEquals(connection.connected, true);
    });
  });
}

/**
 * clientTest
 *
 * Test the client constructor. This is the test you want to include in your test suite.
 *
 * @example
 * ```
 * Deno.test("Client", async (t) => {
 *  ...other tests
 *  await clientTest({ t, Client, connectionOptions, connectionUrl, queries })
 *  ...other tests
 * })
 * ```
 */
export async function clientTest(
  { t, Client, connectionUrl, connectionOptions, queries }: ClientTestOptions,
): Promise<void> {
  await t.step("SQLx Client Tests", async (t) => {
    await t.step("is constructor", () => {
      assertEquals(typeof Client, "function");
    });

    await t.step("can construct", async (t) => {
      const client = new Client(connectionUrl, connectionOptions);

      assertIsSqlClient(client);

      await _connectionTest({ t, connection: client.connection });

      await _testConnectAndCloseClient({
        t,
        Client,
        connectionUrl,
        connectionOptions,
        queries,
      });
    });

    await t.step("can connect with using and dispose", async () => {
      await using connection = new Client(connectionUrl, connectionOptions);
      assertEquals(connection.connected, false);
      await connection.connect();
      assertEquals(connection.connected, true);
    });

    await using db = new Client(connectionUrl, connectionOptions);

    await db.connect();

    await _testSetupTable({ t, db, queries });

    // await testClientQueriable({ t, db, queries });

    await t.step("drop table", async () => {
      await db.execute(queries.dropTable);
    });
  });
}

/**
 * clientPoolTest
 *
 * Test the client pool constructor. This is the test you want to include in your test suite.
 *
 * @example
 * ```
 * Deno.test("Client", async (t) => {
 *  ...other tests
 *  await clientPoolTest({ t, Client, connectionOptions, connectionUrl, queries })
 *  ...other tests
 * })
 * ```
 */
export async function clientPoolTest(
  { t, Client, connectionUrl, connectionOptions, queries }: PoolTestOptions,
): Promise<void> {
  await t.step("SQLx Pool Tests", async (t) => {
    const parsedConnectionOptions = {
      ...connectionOptions,
      maxSize: 3,
      lazyInitialization: true,
    };
    await t.step("is constructor", () => {
      assertEquals(typeof Client, "function");
    });

    await t.step("can construct", () => {
      const client = new Client(connectionUrl, parsedConnectionOptions);
      assertIsSqlClientPool(client);
    });

    await _testConnectAndClosePoolClient({
      t: t,
      Client,
      connectionUrl,
      connectionOptions: parsedConnectionOptions,
      queries,
    });

    await t.step("acquire and release", async () => {
      await using db = new Client(connectionUrl, parsedConnectionOptions);

      let aquireCalledCount = 0;
      let releaseCalledCount = 0;

      db.eventTarget.addEventListener("acquire", () => {
        aquireCalledCount++;
      });
      db.eventTarget.addEventListener("release", () => {
        releaseCalledCount++;
      });

      await db.connect();
      assertEquals(
        db.deferredStack.maxSize,
        parsedConnectionOptions.maxSize,
      );
      assertEquals(db.deferredStack.availableCount, 3);
      assertEquals(db.deferredStack.queuedCount, 0);
      assertEquals(aquireCalledCount, 0);
      assertEquals(releaseCalledCount, 0);

      const poolConnections: SqlPoolClient[] = [];

      let i = db.deferredStack.maxSize;
      while (db.deferredStack.availableCount) {
        const p = await db.acquire();
        assertEquals(db.deferredStack.availableCount, --i);
        assertEquals(db.deferredStack.queuedCount, 0);
        poolConnections.push(p);
      }

      assertEquals(aquireCalledCount, 3);
      assertEquals(releaseCalledCount, 0);

      let p1Resolved = false;
      let p2Resolved = false;
      const p1 = db.acquire().then((r) => {
        p1Resolved = true;
        return r;
      });
      assertEquals(db.deferredStack.queuedCount, 1);
      const p2 = db.acquire().then((r) => {
        p2Resolved = true;
        return r;
      });
      assertEquals(db.deferredStack.queuedCount, 2);

      assertFalse(p1Resolved);
      await poolConnections.pop()?.release();
      await p1;
      assert(p1Resolved);
      assertEquals(db.deferredStack.queuedCount, 1);
      assertFalse(p2Resolved);
      assertEquals(aquireCalledCount, 4);
      assertEquals(releaseCalledCount, 1);
      await poolConnections.pop()?.release();
      await p2;
      assert(p2Resolved);
      assertEquals(db.deferredStack.queuedCount, 0);
      assertEquals(aquireCalledCount, 5);
      assertEquals(releaseCalledCount, 2);

      poolConnections.push(await p1);
      poolConnections.push(await p2);

      for (const [i, p] of poolConnections.entries()) {
        await p.release();
        assertEquals(db.deferredStack.availableCount, i + 1);
        assertEquals(db.deferredStack.queuedCount, 0);
      }
      assertEquals(aquireCalledCount, 5);
      assertEquals(releaseCalledCount, 5);

      await db.close();
    });

    await using db = new Client(connectionUrl, parsedConnectionOptions);
    await db.connect();

    const p = await db.acquire();
    await _testSetupTable({ t, db: p, queries });
    await p.release();

    await t.step("acquire and release with query", async (t) => {
      for (let i = 0; i < db.deferredStack.maxSize; i++) {
        const p = await db.acquire();
        await _testClientQueriable({ t, db: p, queries });
        p.release();
      }
    });
  });
}
