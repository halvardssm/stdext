import { assertEquals } from "@std/assert";
import {
  createResultIterableContext,
  getObjectFromRow,
  type Row,
} from "./utils.ts";

function rows(...rows: Row[]): AsyncGenerator<Row> {
  return (async function* () {
    for (const row of rows) {
      yield row;
    }
  })();
}

Deno.test("getObjectFromRow", async (t) => {
  await t.step("empty row", () => {
    assertEquals(getObjectFromRow({ columns: [], values: [] }), {});
  });

  await t.step("filled row", () => {
    assertEquals(
      getObjectFromRow({ columns: ["a", "b"], values: ["c", 1] }),
      { a: "c", b: 1 },
    );
  });

  await t.step("more columns than values", () => {
    assertEquals(
      getObjectFromRow({ columns: ["a", "b"], values: ["c"] }),
      { a: "c", b: undefined },
    );
  });

  await t.step("more values than columns", () => {
    assertEquals(
      getObjectFromRow({ columns: ["a"], values: ["c", 1] }),
      { a: "c" },
    );
  });
});

Deno.test("createResultIterableContext", async (t) => {
  await t.step("empty", async () => {
    const ctx = await createResultIterableContext(rows());

    assertEquals(ctx.metadata.columns, []);
    assertEquals(await ctx.toValues(), []);
  });

  await t.step("metadata and toValues", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["id", "name"], values: [1, "Alice"] },
      { columns: ["id", "name"], values: [2, "Bob"] },
    ));

    assertEquals(ctx.metadata.columns, ["id", "name"]);
    assertEquals(await ctx.toValues(), [[1, "Alice"], [2, "Bob"]]);
  });

  await t.step("toRecords", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["id", "name"], values: [1, "Alice"] },
      { columns: ["id", "name"], values: [2, "Bob"] },
    ));

    assertEquals(
      await ctx.toRecords(),
      [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }],
    );
  });

  await t.step("iteration", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["a"], values: ["b"] },
    ));

    const collected = [];
    for await (const row of ctx) {
      collected.push(row.toRecord());
    }

    assertEquals(collected, [{ a: "b" }]);
  });

  await t.step("toRecord", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["a"], values: ["b"] },
    ));

    assertEquals(ctx.toRecord(["c"]), { a: "c" });
  });

  await t.step("re-iteration replays buffered rows", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["a"], values: ["b"] },
      { columns: ["a"], values: ["c"] },
    ));

    const first = [];
    for await (const row of ctx) {
      first.push(row.toRecord());
    }

    const second = [];
    for await (const row of ctx) {
      second.push(row.toRecord());
    }

    assertEquals(first, [{ a: "b" }, { a: "c" }]);
    assertEquals(second, [{ a: "b" }, { a: "c" }]);
  });

  await t.step("collect after partial iteration drains the rest", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["a"], values: ["b"] },
      { columns: ["a"], values: ["c"] },
    ));

    for await (const row of ctx) {
      assertEquals(row.toRecord(), { a: "b" });
      break;
    }

    assertEquals(await ctx.toValues(), [["b"], ["c"]]);
  });

  await t.step("collect twice returns the same rows", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["a"], values: ["b"] },
    ));

    assertEquals(await ctx.toValues(), [["b"]]);
    assertEquals(await ctx.toValues(), [["b"]]);
  });

  await t.step("async dispose stops fetching", async () => {
    const ctx = await createResultIterableContext(rows(
      { columns: ["a"], values: ["b"] },
      { columns: ["a"], values: ["c"] },
    ));

    for await (const row of ctx) {
      assertEquals(row.toRecord(), { a: "b" });
      break;
    }

    await ctx[Symbol.asyncDispose]();

    // Fetching has stopped, but the buffered row can still be replayed.
    assertEquals(await ctx.toValues(), [["b"]]);
  });
});
