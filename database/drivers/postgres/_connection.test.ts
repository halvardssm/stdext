import { assertEquals, assertRejects } from "@std/assert";
import { ConnectionError } from "../../sql/mod.ts";
import { md5Password } from "./_auth.ts";
import { Connection, type ConnectionConfig } from "./_connection.ts";
import { writeAll } from "@std/io/write-all";
import { BodyReader, MessageReader, MessageWriter } from "./_wire.ts";
import { PostgresConnectionError } from "./errors.ts";

type Handler = (
  conn: Deno.Conn,
  reader: MessageReader,
  startup: BodyReader,
) => Promise<void>;

/**
 * A fake Postgres server handling a single connection, to test protocol paths
 * that a regular server does not take.
 */
async function withServer(
  handler: Handler,
  fn: (config: ConnectionConfig) => Promise<void>,
  options: { ssl?: string } = {},
): Promise<void> {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const served = (async () => {
    const conn = await listener.accept();
    try {
      const reader = new MessageReader(conn);
      let startup: BodyReader;
      while (true) {
        // Startup packets have no type byte: read the length first.
        const length = new DataView(
          new Uint8Array([
            await reader.byte(),
            await reader.byte(),
            await reader.byte(),
            await reader.byte(),
          ]).buffer,
        ).getInt32(0);
        const body = new Uint8Array(length - 4);
        for (let i = 0; i < body.length; i++) body[i] = await reader.byte();
        startup = new BodyReader(body);
        if (startup.int32() !== 80877103) break;
        await writeAll(
          conn,
          new TextEncoder().encode(options.ssl ?? "N"),
        );
        if (options.ssl !== undefined && options.ssl !== "N") return;
      }
      await handler(conn, reader, startup);
    } catch {
      // The client may close the connection at any time.
    } finally {
      conn.close();
    }
  })();
  try {
    await fn({
      hostname: "127.0.0.1",
      port: (listener.addr as Deno.NetAddr).port,
      user: "user",
      password: "password",
      database: "db",
      tls: "prefer",
      parameters: {},
    });
  } finally {
    await served;
    listener.close();
  }
}

function ready(writer: MessageWriter): MessageWriter {
  return writer
    .begin("R").int32(0).end()
    .begin("S").cstring("server_version").cstring("17").end()
    .begin("K").int32(1).int32(2).end()
    .begin("Z").int8("I".charCodeAt(0)).end();
}

Deno.test("Connection authentication", async (t) => {
  await t.step("cleartext password", async () => {
    let password = "";
    await withServer(async (conn, reader) => {
      await writeAll(
        conn,
        new MessageWriter().begin("R").int32(3).end().flush(),
      );
      password = (await reader.message()).body.cstring();
      await writeAll(conn, ready(new MessageWriter()).flush());
      await reader.message(); // Terminate
    }, async (config) => {
      const connection = await Connection.connect(config);
      assertEquals(connection.parameters.get("server_version"), "17");
      await connection.close();
      await connection.close();
    });
    assertEquals(password, "password");
  });

  await t.step("md5 password", async () => {
    let password = "";
    const salt = new Uint8Array([1, 2, 3, 4]);
    await withServer(async (conn, reader) => {
      await writeAll(
        conn,
        new MessageWriter().begin("R").int32(5).bytes(salt).end().flush(),
      );
      password = (await reader.message()).body.cstring();
      await writeAll(conn, ready(new MessageWriter()).flush());
      await reader.message();
    }, async (config) => {
      const connection = await Connection.connect(config);
      await connection.close();
    });
    assertEquals(password, await md5Password("user", "password", salt));
  });

  await t.step("missing password", async () => {
    await withServer(async (conn) => {
      await writeAll(
        conn,
        new MessageWriter().begin("R").int32(3).end().flush(),
      );
    }, async (config) => {
      await assertRejects(
        () => Connection.connect({ ...config, password: undefined }),
        ConnectionError,
        "requires a password",
      );
    });
  });

  await t.step("unsupported methods", async () => {
    await withServer(async (conn) => {
      await writeAll(
        conn,
        new MessageWriter().begin("R").int32(7).end().flush(),
      );
    }, async (config) => {
      await assertRejects(
        () => Connection.connect(config),
        ConnectionError,
        "Unsupported authentication method: 7",
      );
    });

    await withServer(async (conn) => {
      await writeAll(
        conn,
        new MessageWriter().begin("R").int32(10)
          .cstring("SCRAM-SHA-256-PLUS").int8(0).end().flush(),
      );
    }, async (config) => {
      await assertRejects(
        () => Connection.connect(config),
        ConnectionError,
        "Unsupported SASL mechanisms: SCRAM-SHA-256-PLUS",
      );
    });
  });

  await t.step("server errors", async () => {
    await withServer(async (conn) => {
      await writeAll(
        conn,
        new MessageWriter().begin("E")
          .int8("S".charCodeAt(0)).cstring("FATAL")
          .int8("C".charCodeAt(0)).cstring("28000")
          .int8("M".charCodeAt(0)).cstring("no access")
          .int8(0).end().flush(),
      );
    }, async (config) => {
      const error = await assertRejects(
        () => Connection.connect(config),
        PostgresConnectionError,
        "no access",
      );
      assertEquals(error.fields.severity, "FATAL");
      assertEquals(error.code, "28000");
    });
  });

  await t.step("unexpected messages", async () => {
    await withServer(async (conn) => {
      await writeAll(conn, new MessageWriter().begin("?").end().flush());
    }, async (config) => {
      await assertRejects(
        () => Connection.connect(config),
        ConnectionError,
        "Unexpected message during startup",
      );
    });
  });

  await t.step("closed connections", async () => {
    await withServer(async () => {}, async (config) => {
      await assertRejects(
        () => Connection.connect(config),
        ConnectionError,
        "closed",
      );
    });
  });
});

Deno.test("Connection TLS negotiation", async (t) => {
  await t.step("disabled TLS skips the SSL request", async () => {
    await withServer(async (conn, reader, startup) => {
      // The startup message follows directly, without an SSL request.
      assertEquals(startup.cstring(), "user");
      await writeAll(conn, ready(new MessageWriter()).flush());
      await reader.message();
    }, async (config) => {
      const connection = await Connection.connect({
        ...config,
        tls: "disable",
      });
      await connection.close();
    });
  });

  await t.step("rejects invalid SSL responses", async () => {
    await withServer(() => Promise.resolve(), async (config) => {
      await assertRejects(
        () => Connection.connect(config),
        ConnectionError,
        "Unexpected SSL response: X",
      );
    }, { ssl: "X" });
  });

  await t.step("rejects data sent before the TLS handshake", async () => {
    await withServer(() => Promise.resolve(), async (config) => {
      await assertRejects(
        () => Connection.connect(config),
        ConnectionError,
        "Unexpected data",
      );
    }, { ssl: "SX" });
  });
});
