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
  type DriverConstructor,
  type PoolClient,
  type PreparedStatement,
  type Queriable,
  type Transaction,
  type Transactionable,
} from "./mod.ts";
import { deepMerge } from "@std/collections";
import type { AnyConstructor } from "@stdext/types";
import { assertIsConnectionUrl, assertIsDriverOptions } from "./asserts.ts";

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
    connectionUrl: string | URL;
  },
) {
  assertIsDriver(value);
  assertEquals(value.connectionUrl, expects.connectionUrl);
}

/**
 * Test the Driver class
 * @param value The Client
 * @param expects The values to test against
 */
export function testDriverConstructor<
  IDriverConstructor extends DriverConstructor = DriverConstructor,
>(
  DriverC: IDriverConstructor,
  args: ConstructorParameters<IDriverConstructor>,
) {
  assert(
    args.length < 3,
    "Number of arguments for the driver constructor has to be max 2.",
  );
  assertIsConnectionUrl(args[0]);
  assertIsDriverOptions(args[1]);
  // @ts-expect-error: ts inference
  const d = new DriverC(...args);
  testDriver(d, { connectionUrl: args[0] });
}

/**
 * Test the Driver class
 * @param value The Client
 * @param expects The values to test against
 */
export async function testDriverConstructorIntegration<
  IDriverConstructor extends DriverConstructor = DriverConstructor,
>(
  t: Deno.TestContext,
  D: IDriverConstructor,
  args: ConstructorParameters<IDriverConstructor>,
) {
  testDriverConstructor(D, args);

  await t.step("testConnectAndClose", async (t) => {
    await t.step("should connect and close with using", async () => {
      // @ts-expect-error: ts-inference
      await using d = new D(...args);

      await d.connect();
    });

    await t.step("should connect and close", async () => {
      // @ts-expect-error: ts-inference
      const d = new D(...args);

      await d.connect();
      await d.close();
    });

    await t.step("ping should work while connected", async () => {
      // @ts-expect-error: ts-inference
      await using d = new D(...args);

      await d.connect();
      assert(d.connected);

      await d.ping();

      await d.close();

      assertFalse(d.connected);

      await assertRejects(async () => {
        await d.ping();
      });
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
 * Tests the connection of a Client
 */
export function testClientConstructor<
  IClient extends Client = Client,
>(
  ClientC: ClientConstructor<IClient>,
  args: ClientConstructorArguments<IClient>,
): void {
  assert(
    args.length < 3,
    "Number of arguments for the client constructor has to be max 2.",
  );
  assertIsConnectionUrl(args[0]);
  assertEquals(typeof args[1], "object");
  const d = new ClientC(...args);
  testClient(d, { connectionUrl: args[0], options: args[1] });
}
/**
 * Tests the connection of a Client
 */
export async function testClientConstructorIntegration<
  IClient extends Client = Client,
>(
  t: Deno.TestContext,
  Client: ClientConstructor<IClient>,
  args: ClientConstructorArguments<IClient>,
): Promise<void> {
  testClientConstructor(Client, args);

  await t.step("testConnectAndClose", async (t) => {
    await t.step("should connect and close with using", async () => {
      await using db = new Client(...args);

      await db.connect();
    });

    await t.step("should connect and close", async () => {
      const db = new Client(...args);

      await db.connect();

      await db.close();
    });

    await t.step("should connect and close with events", async () => {
      const db = new Client(...args);

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
        // @ts-expect-error: ts-inference
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

  await using stmt2 = await client.prepare("select 1 as one;");

  assertIsPreparedStatement(stmt2);
  assertFalse(stmt2.deallocated);

  await stmt1.execute();
  await stmt1.deallocate();

  assert(stmt1.deallocated);

  await assertRejects(async () => {
    await stmt1.execute();
  });

  await stmt2.execute();

  // Testing transactions

  const transaction1 = await client.beginTransaction();

  assert(transaction1.inTransaction, "Transaction is not in transaction");

  await transaction1.execute("select 1 as one;");

  await transaction1.commitTransaction();

  await assertRejects(async () => {
    await transaction2.execute("select 1 as one;");
  });

  assertFalse(transaction1.inTransaction);

  await using transaction2 = await client.beginTransaction();

  assert(transaction2.inTransaction, "Transaction is not in transaction");

  await transaction2.execute("select 1 as one;");
}
