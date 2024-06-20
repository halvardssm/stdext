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
  SqlClient,
  SqlClientPool,
  SqlConnectable,
  SqlPoolClient,
  SqlPreparedStatement,
  SqlQueriable,
  SqlTransaction,
  SqlTransactionable,
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

export function testSqlConnection(
  value: unknown,
  checks: {
    connectionUrl: string;
  },
) {
  assertIsSqlConnection(value);
  assertEquals(value.connectionUrl, checks.connectionUrl);
}

export function _testSqlConnectable(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlConnectable["options"];
  },
) {
  assertIsSqlConnectable(value);
  assertEquals(value.options, checks.options);
  testSqlConnection(value.connection, checks);
}
export function testSqlPreparedStatement(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlPreparedStatement["options"];
    sql: string;
  },
) {
  assertIsSqlPreparedStatement(value);
  _testSqlConnectable(value, checks);
  assertEquals(value.sql, checks.sql);
}
export function _testSqlQueriable(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlQueriable["options"];
  },
) {
  assertIsSqlQueriable(value);
  _testSqlConnectable(value, checks);
}
export function _testSqlPreparable(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlQueriable["options"];
  },
) {
  assertIsSqlPreparable(value);
  _testSqlQueriable(value, checks);
}
export function testSqlTransaction(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlTransaction["options"];
  },
) {
  assertIsSqlTransaction(value);
  _testSqlPreparable(value, checks);
}
export function _testSqlTransactionable(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlTransactionable["options"];
  },
) {
  assertIsSqlTransactionable(value);
  _testSqlPreparable(value, checks);
}
export function testSqlEventTarget(
  value: unknown,
) {
  assertInstanceOf(value, EventTarget);
}

export function _testSqlEventable(
  value: unknown,
) {
  assertIsSqlEventable(value);
  testSqlEventTarget(value.eventTarget);
}

export function testSqlClient(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlClient["options"];
  },
) {
  assertIsSqlClient(value);
  _testSqlTransactionable(value, checks);
  _testSqlEventable(value);
}

export function testSqlPoolClient(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlPoolClient["options"];
  },
) {
  assertIsSqlPoolClient(value);
  _testSqlTransactionable(value, checks);
}

export function testSqlClientPool(
  value: unknown,
  checks: {
    connectionUrl: string;
    options: SqlClientPool["options"];
  },
) {
  assertIsSqlClientPool(value);
  _testSqlEventable(value);
  assertEquals(value.connectionUrl, checks.connectionUrl);
}

async function _testClientConnection<Client extends SqlClient = SqlClient>(
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

async function _testClientPoolConnection<
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

export function sqlUnitTestSuite(options: {
  testPrefix?: string;
  connectionClass: unknown;
  preparedStatementClass: unknown;
  transactionClass: unknown;
  eventTargetClass: unknown;
  clientClass: unknown;
  poolClientClass: unknown;
  clientPoolClass: unknown;
  checks: {
    connectionUrl: string;
    options: SqlTransaction["options"];
    clientPoolOptions: SqlClientPool["options"];
    sql: string;
  };
}) {
  const prefix = options.testPrefix ? options.testPrefix : "sql";

  Deno.test(`${prefix}/SqlConnection`, () => {
    testSqlConnection(options.connectionClass, options.checks);
  });

  Deno.test(`${prefix}/PreparedStatement`, () => {
    testSqlPreparedStatement(options.preparedStatementClass, options.checks);
  });

  Deno.test(`${prefix}/SqlTransaction`, () => {
    testSqlTransaction(options.transactionClass, options.checks);
  });

  Deno.test(`${prefix}/SqlEventTarget`, () => {
    testSqlEventTarget(options.eventTargetClass);
  });

  Deno.test(`${prefix}/SqlClient`, () => {
    testSqlClient(options.clientClass, options.checks);
  });

  Deno.test(`${prefix}/SqlPoolClient`, () => {
    testSqlPoolClient(options.poolClientClass, options.checks);
  });

  Deno.test(`${prefix}/SqlClientPool`, () => {
    testSqlClientPool(options.clientPoolClass, options.checks);
  });
}
export function sqlIntegrationTestSuite<
  Client extends SqlClient = SqlClient,
  ClientPool extends SqlClientPool = SqlClientPool,
>(options: {
  testPrefix?: string;
  Client: ClientConstructor<Client>;
  ClientPool: ClientPoolConstructor<ClientPool>;
  clientArguments: ClientConstructorArguments<Client>;
  clientPoolArguments: ClientPoolConstructorArguments<ClientPool>;
}) {
  const prefix = options.testPrefix ? options.testPrefix : "sql";

  Deno.test(`${prefix}/SqlClient connection`, async (t) => {
    await _testClientConnection<Client>(
      t,
      options.Client,
      options.clientArguments,
    );
  });

  Deno.test(`${prefix}/SqlClientPool connection`, async (t) => {
    await _testClientPoolConnection<ClientPool>(
      t,
      options.ClientPool,
      options.clientPoolArguments,
    );
  });
}
