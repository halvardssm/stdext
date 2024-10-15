import {
  assert,
  assertEquals,
  assertFalse,
  assertInstanceOf,
  assertRejects,
} from "@std/assert";
import {
  assertIsClient,
  assertIsClientPool,
  assertIsDriver,
  assertIsDriverConnectable,
  assertIsEventable,
  assertIsPoolClient,
  assertIsPreparable,
  assertIsPreparedStatement,
  assertIsQueriable,
  assertIsTransaction,
  assertIsTransactionable,
  type Client,
  type ClientPool,
  type DriverConnectable,
  type PoolClient,
  type PreparedStatement,
  type Queriable,
  type Transaction,
  type Transactionable,
} from "./mod.ts";
import { deepMerge } from "@std/collections";

// deno-lint-ignore no-explicit-any
export type AnyConstructor<T, A extends any[] = any[]> = new (...args: A) => T;
export type ClientConstructorArguments<
  IClient extends DriverConnectable = DriverConnectable,
> = [
  string,
  IClient["options"],
];
export type ClientPoolConstructorArguments<
  IClient extends ClientPool = ClientPool,
> = [string, IClient["options"]];
export type ClientConstructor<
  IClient extends DriverConnectable = DriverConnectable,
> = AnyConstructor<IClient, ClientConstructorArguments<IClient>>;
export type ClientPoolConstructor<
  IClient extends ClientPool = ClientPool,
> = AnyConstructor<IClient, ClientPoolConstructorArguments<IClient>>;

/**
 * Test the Driver class
 * @param value The Client
 * @param expects The values to test against
 */
export function testDriver(
  value: unknown,
  expects: {
    connectionUrl: string;
  },
) {
  assertIsDriver(value);
  assertEquals(value.connectionUrl, expects.connectionUrl);
}

/**
 * Tests the connection of a Client
 */
export async function testDriverConstructor<
  IClient extends Client = Client,
>(
  t: Deno.TestContext,
  Client: ClientConstructor<IClient>,
  clientArguments: ClientConstructorArguments<IClient>,
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
        error = e as Error;
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
 * Test the DriverConnectable class
 * @param value The DriverConnectable
 * @param expects The values to test against
 */
export function testDriverConnectable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: DriverConnectable["options"];
  },
) {
  assertIsDriverConnectable(value);
  assertEquals(value.options, expects.options);
  testDriver(value.connection, expects);
}

/**
 * Test the PreparedStatement class
 * @param value The PreparedStatement
 * @param expects The values to test against
 */
export function testPreparedStatement(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: PreparedStatement["options"];
    sql: string;
  },
) {
  assertIsPreparedStatement(value);
  testDriverConnectable(value, expects);
  assertEquals(value.sql, expects.sql);
}

/**
 * Test the Queriable class
 * @param value The Queriable
 * @param expects The values to test against
 */
export function testQueriable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: Queriable["options"];
  },
) {
  assertIsQueriable(value);
  testDriverConnectable(value, expects);
}

/**
 * Test the Preparable class
 * @param value The Preparable
 * @param expects The values to test against
 */
export function testPreparable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: Queriable["options"];
  },
) {
  assertIsPreparable(value);
  testQueriable(value, expects);
}

/**
 * Test the Transaction class
 * @param value The Transaction
 * @param expects The values to test against
 */
export function testTransaction(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: Transaction["options"];
  },
) {
  assertIsTransaction(value);
  testPreparable(value, expects);
}

/**
 * Test the Transactionable class
 * @param value The Transactionable
 * @param expects The values to test against
 */
export function testTransactionable(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: Transactionable["options"];
  },
) {
  assertIsTransactionable(value);
  testPreparable(value, expects);
}

/**
 * Test the EventTarget class
 * @param value The EventTarget
 */
export function testEventTarget(
  value: unknown,
) {
  assertInstanceOf(value, EventTarget);
}

/**
 * Test the Eventable class
 * @param value The Eventable
 */
export function testEventable(
  value: unknown,
) {
  assertIsEventable(value);
  testEventTarget(value.eventTarget);
}

/**
 * Test the Client class
 * @param value The Client
 * @param expects The values to test against
 */
export function testClient(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: Client["options"];
  },
) {
  assertIsClient(value);
  testTransactionable(value, expects);
  testEventable(value);
}

/**
 * Test the PoolClient class
 * @param value The PoolClient
 * @param expects The values to test against
 */
export function testPoolClient(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: PoolClient["options"];
  },
) {
  assertIsPoolClient(value);
  testTransactionable(value, expects);
}

/**
 * Test the ClientPool class
 * @param value The ClientPool
 * @param expects The values to test against
 */
export function testClientPool(
  value: unknown,
  expects: {
    connectionUrl: string;
    options: ClientPool["options"];
  },
) {
  assertIsClientPool(value);
  testEventable(value);
  assertEquals(value.connectionUrl, expects.connectionUrl);
}

/**
 * Tests the connection of a Client
 */
export async function testClientConnection<
  IClient extends Client = Client,
>(
  t: Deno.TestContext,
  Client: ClientConstructor<IClient>,
  clientArguments: ClientConstructorArguments<IClient>,
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
        error = e as Error;
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
 * Tests the connection of a ClientPool
 */
export async function testClientPoolConnection<
  IClient extends ClientPool = ClientPool,
>(
  t: Deno.TestContext,
  Client: ClientPoolConstructor<IClient>,
  clientArguments: ClientPoolConstructorArguments<IClient>,
): Promise<void> {
  await t.step("testConnectAndClose", async (t) => {
    await t.step("should connect and close", async () => {
      const db = new Client(...clientArguments);

      assertEquals(db.connected, false);

      await db.connect();

      await db.close();
    });
    await t.step("should connect and close with using", async () => {
      const opts = deepMerge<IClient["options"]>(
        clientArguments[1],
        // deno-lint-ignore ban-ts-comment
        // @ts-ignore
        {
          clientPoolOptions: {
            lazyInitialization: true,
          },
        },
      );
      await using db = new Client(
        clientArguments[0],
        opts,
      );
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
        error = e as Error;
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

export async function testClientSanity<
  IClient extends Client = Client,
>(
  t: Deno.TestContext,
  Client: ClientConstructor<IClient>,
  clientArguments: ClientConstructorArguments<IClient>,
): Promise<void> {
  await testClientConnection(t, Client, clientArguments);

  const client = new Client(...clientArguments);

  await client.connect();

  // Testing prepared statements

  const stmt1 = await client.prepare("select 1 as one;");

  assertIsPreparedStatement(stmt1);
  assertFalse(stmt1.deallocated);

  const stmt2 = await client.prepare("select 1 as one;");

  assertIsPreparedStatement(stmt2);
  assertFalse(stmt2.deallocated);

  await stmt1.execute();
  await stmt1.deallocate();

  assert(stmt1.deallocated);

  await assertRejects(async () => {
    await stmt1.execute();
  });

  await stmt2.execute();
  await stmt2.deallocate();

  assert(stmt2.deallocated);

  await assertRejects(async () => {
    await stmt2.execute();
  });

  // Testing transactions

  const transaction = await client.beginTransaction();

  assert(transaction.inTransaction, "Transaction is not in transaction");

  await transaction.execute("select 1 as one;");

  await transaction.commitTransaction();

  assertFalse(transaction.inTransaction);

  await assertRejects(async () => {
    await transaction.execute("select 1 as one;");
  });
}
