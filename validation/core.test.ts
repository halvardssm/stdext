import type { StandardSchemaV1 } from "@standard-schema/spec";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { createSchema, type Schema } from "./core.ts";

// Type level assertions: these fail to compile, not at runtime.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
function assertType<_T extends true>() {}

type Output<S extends StandardSchemaV1> = StandardSchemaV1.InferOutput<S>;
type Input<S extends StandardSchemaV1> = StandardSchemaV1.InferInput<S>;

const jsonSchema = {
  input: () => ({ type: "string" }),
  output: () => ({ type: "string" }),
};

const expectedString = { issues: [{ message: "Expected a string" }] };

/** A sync schema accepting strings. */
const string = createSchema("string", {
  validate: (value) => typeof value === "string" ? { value } : expectedString,
  jsonSchema,
});

/** An async schema accepting strings. */
const asyncString = createSchema("asyncString", {
  validate: (value) =>
    Promise.resolve(
      typeof value === "string" ? { value } : expectedString,
    ),
  jsonSchema,
});

/** An array schema validating every item with `item`, sync or async. */
function list<TItem extends StandardSchemaV1>(item: TItem) {
  type Item = Output<TItem>;
  type ItemResult = StandardSchemaV1.Result<Item>;

  const finish = (results: ItemResult[]) => {
    const issues = results.flatMap((result, index) =>
      result.issues?.map((issue) => ({
        ...issue,
        path: [index, ...(issue.path ?? [])],
      })) ?? []
    );
    return issues.length
      ? { issues }
      : { value: results.map((r) => (r as { value: Item }).value) };
  };

  return createSchema("list", {
    validate: (value) => {
      if (!Array.isArray(value)) {
        return { issues: [{ message: "Expected an array" }] };
      }
      const results = value.map((v) => item["~standard"].validate(v));
      return results.some((r) => r instanceof Promise)
        ? Promise.all(results).then((r) => finish(r as ItemResult[]))
        : finish(results as ItemResult[]);
    },
    jsonSchema,
  });
}

Deno.test("createSchema", async (t) => {
  await t.step("builds a Standard Schema and a Standard JSON Schema", () => {
    assertEquals(string.kind, "string");
    assertEquals(string["~standard"].version, 1);
    assertEquals(string["~standard"].vendor, "@stdext/validation");
    assertEquals(string["~standard"].validate("a"), { value: "a" });
    assertEquals(string["~standard"].validate(1), expectedString);
    assertEquals(
      string["~standard"].jsonSchema.input({ target: "draft-2020-12" }),
      { type: "string" },
    );
    assertEquals(
      string["~standard"].jsonSchema.output({ target: "draft-2020-12" }),
      { type: "string" },
    );

    const standard: StandardSchemaV1<string, string> = string;
    assertEquals(standard["~standard"].validate("a"), { value: "a" });
  });

  await t.step("returns an immutable schema", () => {
    assert(Object.isFrozen(string));
    assertThrows(() => {
      (string as { kind: string }).kind = "other";
    }, TypeError);
  });

  await t.step("infers output, input and kind", () => {
    assertType<Equals<typeof string, Schema<string, string, "string">>>();
    assertType<Equals<Input<typeof string>, string>>();
    assertType<Equals<Output<typeof string>, string>>();
  });

  await t.step("infers a narrowed output", () => {
    const port = createSchema("port", {
      validate: (value) =>
        Number.isInteger(value)
          ? { value: value as number }
          : { issues: [{ message: "Expected an integer" }] },
      jsonSchema,
    });
    assertType<Equals<typeof port, Schema<number, number, "port">>>();
  });

  await t.step("keeps literal types", () => {
    const mode = createSchema("mode", {
      validate: (value) =>
        value === "on" || value === "off"
          ? { value }
          : { issues: [{ message: "Expected on or off" }] },
      jsonSchema,
    });
    assertType<Equals<Output<typeof mode>, "on" | "off">>();
    assertType<Equals<typeof mode.kind, "mode">>();
  });

  await t.step("keeps undefined when the value may be undefined", () => {
    const maybe = createSchema("maybe", {
      validate: (value) => ({ value: value as string | undefined }),
      jsonSchema,
    });
    assertType<Equals<Output<typeof maybe>, string | undefined>>();
  });

  await t.step("infers from an explicitly typed result", () => {
    const count = createSchema("count", {
      validate: (value): StandardSchemaV1.Result<number> =>
        typeof value === "number"
          ? { value }
          : { issues: [{ message: "Expected a number" }] },
      jsonSchema,
    });
    assertType<Equals<typeof count, Schema<number, number, "count">>>();
  });

  await t.step("infers never when validate always fails", () => {
    const nothing = createSchema("nothing", {
      validate: () => ({ issues: [{ message: "Never valid" }] }),
      jsonSchema,
    });
    assertType<Equals<Output<typeof nothing>, never>>();
  });

  await t.step("takes an input type from `types`", () => {
    const length = createSchema("length", {
      validate: (value) =>
        typeof value === "string" ? { value: value.length } : expectedString,
      jsonSchema,
      types: undefined as unknown as StandardSchemaV1.Types<string, number>,
    });
    assertType<Equals<typeof length, Schema<string, number, "length">>>();
    assertType<Equals<Input<typeof length>, string>>();
    assertType<Equals<Output<typeof length>, number>>();
    assertEquals(length["~standard"].validate("abc"), { value: 3 });
  });

  await t.step("infers through async validation", async () => {
    assertType<
      Equals<typeof asyncString, Schema<string, string, "asyncString">>
    >();
    assertEquals(await asyncString["~standard"].validate("a"), { value: "a" });
    assertEquals(await asyncString["~standard"].validate(1), expectedString);
  });
});

Deno.test("createSchema - nesting", async (t) => {
  await t.step("reuses the validate function of another schema", () => {
    const alias = createSchema("alias", {
      validate: string["~standard"].validate,
      jsonSchema,
    });
    assertType<Equals<typeof alias, Schema<string, string, "alias">>>();
    assertEquals(alias["~standard"].validate("a"), { value: "a" });
    assertEquals(alias["~standard"].validate(1), expectedString);
  });

  await t.step("calls another schema from inside validate", () => {
    const trimmed = createSchema("trimmed", {
      validate: (value) => {
        const result = string["~standard"].validate(value);
        if (result instanceof Promise) throw new TypeError("Sync only");
        return result.issues ? result : { value: result.value.trim() };
      },
      jsonSchema,
    });
    assertType<Equals<typeof trimmed, Schema<string, string, "trimmed">>>();
    assertEquals(trimmed["~standard"].validate("  a "), { value: "a" });
    assertEquals(trimmed["~standard"].validate(1), expectedString);
  });

  await t.step("validates items and prefixes the issue paths", () => {
    const strings = list(string);
    assertType<Equals<Output<typeof strings>, string[]>>();
    assertEquals(strings["~standard"].validate(["a", "b"]), {
      value: ["a", "b"],
    });
    assertEquals(strings["~standard"].validate(["a", 1, 2]), {
      issues: [
        { message: "Expected a string", path: [1] },
        { message: "Expected a string", path: [2] },
      ],
    });
    assertEquals(strings["~standard"].validate("a"), {
      issues: [{ message: "Expected an array" }],
    });
  });

  await t.step(
    "stays synchronous unless a nested schema is async",
    async () => {
      const sync = list(string)["~standard"].validate(["a"]);
      assert(!(sync instanceof Promise));

      const pending = list(asyncString)["~standard"].validate(["a"]);
      assert(pending instanceof Promise);
      assertEquals(await pending, { value: ["a"] });
    },
  );

  await t.step(
    "nests lists in lists, with an async schema inside",
    async () => {
      const nested = list(list(asyncString));
      assertType<Equals<Output<typeof nested>, string[][]>>();
      assertEquals(await nested["~standard"].validate([["a"], ["b", "c"]]), {
        value: [["a"], ["b", "c"]],
      });
      assertEquals(await nested["~standard"].validate([["a"], ["b", 2]]), {
        issues: [{ message: "Expected a string", path: [1, 1] }],
      });
    },
  );
});
