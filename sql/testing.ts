import {
  assert,
  assertEquals,
  assertFalse,
  assertInstanceOf,
} from "@std/assert";
import {
  assertIsSqlClient,
  assertIsSqlClientPool,
  assertIsSqlConnectable,
  assertIsSqlConnection,
  assertIsSqlEventable,
  assertIsSqlPoolClient,
  assertIsSqlPreparable,
  assertIsSqlPreparedStatement,
  assertIsSqlQueriable,
  assertIsSqlTransaction,
  assertIsSqlTransactionable,
  type SqlClient,
  type SqlClientPool,
  type SqlConnectable,
  type SqlPoolClient,
  type SqlPreparedStatement,
  type SqlQueriable,
  type SqlTransaction,
  type SqlTransactionable,
} from "./mod.ts";

// deno-lint-ignore no-explicit-any
export type AnyConstructor<T, A extends any[] = any[]> = new (...args: A) => T;
export type ClientConstructorArguments<Client extends SqlClient = SqlClient> = [
  string,
  Client["options"],
];
export type ClientPoolConstructorArguments<
  Client extends SqlClientPool = SqlClientPool,
> = [string, Client["options"]];
export type ClientConstructor<Client extends SqlClient = SqlClient> =
  AnyConstructor<Client, ClientConstructorArguments<Client>>;
export type ClientPoolConstructor<
  Client extends SqlClientPool = SqlClientPool,
> = AnyConstructor<Client, ClientPoolConstructorArguments<Client>>;

/**
 * Test the SqlConnection class
 * @param value The SqlClient
 * @param expects The values to test against
 */
export function testSqlConnection(
  value: unknown,
  expects: {
    connectionUrl: string;
  },
) {
  assertIsSqlConnection(value);
  assertEquals(value.connectionUrl, expects.connectionUrl);
}

/**
 * Test the SqlConnectable class
 * @param value The SqlConnectable
 * @param expects The values to test against
 */
export function _testSqlConnectable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlConnectable["options"];
  },
) {
  assertIsSqlConnectable(value);
  assertEquals(value.options, expects.options);
  testSqlConnection(value.connection, expects);
}

/**
 * Test the SqlPreparedStatement class
 * @param value The SqlPreparedStatement
 * @param expects The values to test against
 */
export function testSqlPreparedStatement(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlPreparedStatement["options"];
    sql: string;
  },
) {
  assertIsSqlPreparedStatement(value);
  _testSqlConnectable(value, expects);
  assertEquals(value.sql, expects.sql);
}

/**
 * Test the SqlQueriable class
 * @param value The SqlQueriable
 * @param expects The values to test against
 */
export function _testSqlQueriable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlQueriable["options"];
  },
) {
  assertIsSqlQueriable(value);
  _testSqlConnectable(value, expects);
}

/**
 * Test the SqlPreparable class
 * @param value The SqlPreparable
 * @param expects The values to test against
 */
export function _testSqlPreparable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlQueriable["options"];
  },
) {
  assertIsSqlPreparable(value);
  _testSqlQueriable(value, expects);
}

/**
 * Test the SqlTransaction class
 * @param value The SqlTransaction
 * @param expects The values to test against
 */
export function testSqlTransaction(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlTransaction["options"];
  },
) {
  assertIsSqlTransaction(value);
  _testSqlPreparable(value, expects);
}

/**
 * Test the SqlTransactionable class
 * @param value The SqlTransactionable
 * @param expects The values to test against
 */
export function _testSqlTransactionable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlTransactionable["options"];
  },
) {
  assertIsSqlTransactionable(value);
  _testSqlPreparable(value, expects);
}

/**
 * Test the SqlEventTarget class
 * @param value The SqlEventTarget
 */
export function testSqlEventTarget(
  value: unknown,
) {
  assertInstanceOf(value, EventTarget);
}

/**
 * Test the SqlEventable class
 * @param value The SqlEventable
 */
export function _testSqlEventable(
  value: unknown,
) {
  assertIsSqlEventable(value);
  testSqlEventTarget(value.eventTarget);
}

/**
 * Test the SqlClient class
 * @param value The SqlClient
 * @param expects The values to test against
 */
export function testSqlClient(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlClient["options"];
  },
) {
  assertIsSqlClient(value);
  _testSqlTransactionable(value, expects);
  _testSqlEventable(value);
}

/**
 * Test the SqlPoolClient class
 * @param value The SqlPoolClient
 * @param expects The values to test against
 */
export function testSqlPoolClient(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlPoolClient["options"];
  },
) {
  assertIsSqlPoolClient(value);
  _testSqlTransactionable(value, expects);
}

/**
 * Test the SqlClientPool class
 * @param value The SqlClientPool
 * @param expects The values to test against
 */
export function testSqlClientPool(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: SqlClientPool["options"];
  },
) {
  assertIsSqlClientPool(value);
  _testSqlEventable(value);
  assertEquals(value.connectionUrl, expects.connectionUrl);
}

/**
 * Tests the connection of a SqlClient
 */
export async function testClientConnection<
  Client extends SqlClient = SqlClient,
>(
  t: Deno.TestContext,
  Client: ClientConstructor<Client>,
  clientArguments: ClientConstructorArguments<Client>,
): Promise<void> {
  await t.step("testConnectAndClose", async (t) => {
    await t.step("should connect and close with using", async () => {
      await using db = new Client(...clientArguments);

      await db.connect();
    });

    await t.step("should connect and close", async () => {
      const db = new Client(...clientArguments);

      await db.connect();

      await db.close();
    });

    await t.step("should connect and close with events", async () => {
      const db = new Client(...clientArguments);

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

/**
 * Tests the connection of a SqlClientPool
 */
export async function testClientPoolConnection<
  Client extends SqlClientPool = SqlClientPool,
>(
  t: Deno.TestContext,
  Client: ClientPoolConstructor<Client>,
  clientArguments: ClientPoolConstructorArguments<Client>,
): Promise<void> {
  await t.step("testConnectAndClose", async (t) => {
    await t.step("should connect and close", async () => {
      const db = new Client(...clientArguments);

      assertEquals(db.connected, false);

      await db.connect();

      await db.close();
    });
    await t.step("should connect and close with using", async () => {
      await using db = new Client(clientArguments[0], {
        ...clientArguments[1],
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
      const db = new Client(clientArguments[0], {
        ...clientArguments[1],
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
