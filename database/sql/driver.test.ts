import { testDriver, testDriverConnectable } from "./testing.ts";
import type {
  Driver,
  DriverConnectable,
  DriverConnectionOptions,
  DriverInternalOptions,
  DriverParameterType,
  DriverQueryMeta,
  DriverQueryNext,
  DriverQueryOptions,
  DriverQueryValues,
} from "./driver.ts";
import { SqlError } from "./errors.ts";
import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";

const testDbQueryParser = (sql: string) => {
  return JSON.parse(sql);
};
type TestDriverParameterType = DriverParameterType<string>;
type TestDriverQueryValues = DriverQueryValues<Array<string>>;
interface TestDriverQueryMeta extends DriverQueryMeta {
  test?: string;
}
interface TestDriverConnectionOptions extends DriverConnectionOptions {
  test?: string;
}
interface TestDriverQueryOptions extends DriverQueryOptions {
  test?: string;
}

class TestDriver implements
  Driver<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestDriverParameterType,
    TestDriverQueryValues,
    TestDriverQueryMeta
  > {
  connectionUrl: string;
  options: DriverInternalOptions<
    TestDriverConnectionOptions,
    TestDriverQueryOptions
  >;
  _connected: boolean = false;
  constructor(
    connectionUrl: string,
    options: TestDriver["options"],
  ) {
    this.connectionUrl = connectionUrl;
    this.options = options;
  }
  ping(): Promise<void> {
    if (!this._connected) {
      throw new SqlError("not connected");
    }
    return Promise.resolve();
  }
  get connected(): boolean {
    return this._connected;
  }
  connect(): Promise<void> {
    this._connected = true;
    return Promise.resolve();
  }
  close(): Promise<void> {
    this._connected = false;
    return Promise.resolve();
  }

  async *query<
    Values extends TestDriverQueryValues = TestDriverQueryValues,
    Meta extends TestDriverQueryMeta = TestDriverQueryMeta,
  >(
    sql: string,
    _params?: TestDriverParameterType[],
    _options?: TestDriverQueryOptions,
  ): AsyncGenerator<DriverQueryNext<Values, Meta>> {
    if (!this._connected) throw new SqlError("not connected");

    const queryRes = testDbQueryParser(sql);
    for (const row of queryRes) {
      const res: DriverQueryNext<Values, Meta> = {
        columns: Object.keys(row),
        values: Object.values(row) as Values,
        meta: {} as Meta,
      };

      yield res;
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}

class TestDriverConnectable implements
  DriverConnectable<
    TestDriverConnectionOptions,
    TestDriverQueryOptions,
    TestDriverParameterType,
    TestDriverQueryValues,
    TestDriverQueryMeta,
    TestDriver
  > {
  options: TestDriver["options"];
  connection: TestDriver;
  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(
    connection: TestDriverConnectable["connection"],
    options: TestDriverConnectable["options"],
  ) {
    this.connection = connection;
    this.options = options;
  }
  [Symbol.asyncDispose](): Promise<void> {
    return this.connection.close();
  }
}

const connectionUrl = "test";
const options: TestDriver["options"] = {
  connectionOptions: {},
  queryOptions: {},
};
const sql = "test";

const connection = new TestDriver(connectionUrl, options);
const connectable = new TestDriverConnectable(
  connection,
  connection.options,
);

const expects = {
  connectionUrl,
  options,
  clientPoolOptions: options,
  sql,
};

// Type tester
// @ts-expect-error: qwer is not allowed
const _testingDriverQueryValues: DriverQueryValues<["asdf"]> = ["asdf", "qwer"];

Deno.test(`DriverConnection`, async (t) => {
  await t.step("test suite", () => {
    testDriver(connection, expects);
  });

  await t.step("ping will throw if not connected", async () => {
    await using conn = new TestDriver(connectionUrl, options);

    await conn.connect();
    assert(conn.connected);
    await conn.ping();

    await conn.close();
    assertFalse(connection.connected);
    await assertRejects(async () => {
      await conn.ping();
    });
  });

  await t.step("can query using loop", async () => {
    await using conn = new TestDriver(connectionUrl, options);
    await conn.connect();
    assert(conn.connected);
    const rows: DriverQueryNext[] = [];
    for await (const row of conn.query(JSON.stringify([{ a: "b" }]))) {
      rows.push(row);
    }
    assertEquals(rows, [{ columns: ["a"], values: ["b"], meta: {} }]);
  });

  await t.step("can query using collect", async () => {
    await using conn = new TestDriver(connectionUrl, options);
    await conn.connect();
    assert(conn.connected);
    const rows: DriverQueryNext[] = await Array.fromAsync(
      conn.query(JSON.stringify([{ a: "b" }])),
    );
    assertEquals(rows, [{ columns: ["a"], values: ["b"], meta: {} }]);
  });
});

Deno.test(`DriverConnectable`, async (t) => {
  await t.step("test suite", () => {
    testDriverConnectable(connectable, expects);
  });
});
