import { assertEquals } from "@std/assert";
import {
  getObjectFromRow,
  mapArrayIterable,
  mapObjectIterable,
} from "./utils.ts";
import type { DriverQueryNext } from "./driver.ts";

Deno.test("getObjectFromRow", async (t) => {
  await t.step("empty row", () => {
    assertEquals(getObjectFromRow({ columns: [], values: [], meta: {} }), {});
  });

  await t.step("filled row", () => {
    assertEquals(
      getObjectFromRow({ columns: ["a", "b"], values: ["c", 1], meta: {} }),
      { a: "c", b: 1 },
    );
  });

  await t.step("more columns row", () => {
    assertEquals(
      getObjectFromRow({ columns: ["a", "b"], values: ["c"], meta: {} }),
      { a: "c", b: undefined },
    );
  });

  await t.step("more values row", () => {
    assertEquals(
      getObjectFromRow({ columns: ["a"], values: ["c", 1], meta: {} }),
      { a: "c" },
    );
  });
});

Deno.test("mapArrayIterable", async (t) => {
  await t.step("empty row", async () => {
    const itt = async function* () {
      yield { columns: [], values: [], meta: {} } as DriverQueryNext;
    };

    const actual = await Array.fromAsync(mapArrayIterable(itt()));
    assertEquals(actual, [[]]);
  });

  await t.step("filled row", async () => {
    const itt = async function* () {
      yield {
        columns: ["a", "b"],
        values: ["c", 1],
        meta: {},
      } as DriverQueryNext;
    };

    const actual = await Array.fromAsync(mapArrayIterable(itt()));
    assertEquals(actual, [["c", 1]]);
  });
});

Deno.test("mapObjectIterable", async (t) => {
  await t.step("empty row", async () => {
    const itt = async function* () {
      yield { columns: [], values: [], meta: {} } as DriverQueryNext;
    };

    const actual = await Array.fromAsync(mapObjectIterable(itt()));
    assertEquals(actual, [{}]);
  });

  await t.step("filled row", async () => {
    const itt = async function* () {
      yield {
        columns: ["a", "b"],
        values: ["c", 1],
        meta: {},
      } as DriverQueryNext;
    };

    const actual = await Array.fromAsync(mapObjectIterable(itt()));
    assertEquals(actual, [{ a: "c", b: 1 }]);
  });
});
