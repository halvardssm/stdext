import type { StandardSchemaV1 } from "@standard-schema/spec";
import { assert, assertEquals } from "@std/assert";
import { createSchema, type Schema } from "./core.ts";
import {
  boolean,
  float,
  integer,
  nullable,
  number,
  optional,
  string,
} from "./schemas.ts";
import { toJSONSchema, validate, validateAsync } from "./utils.ts";

// Type level assertions: these fail to compile, not at runtime.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
function assertType<_T extends true>() {}

type Output<S extends StandardSchemaV1> = StandardSchemaV1.InferOutput<S>;
type Input<S extends StandardSchemaV1> = StandardSchemaV1.InferInput<S>;

const valid = (schema: StandardSchemaV1, value: unknown) =>
  !validate(schema, value).issues;

/** The issue of a value that is not of the expected type. */
function typeIssue(expected: string, actual: unknown, received: string) {
  return {
    kind: "type",
    message: `Expected ${expected}, received ${received}`,
    expected,
    actual,
  };
}

Deno.test("string", async (t) => {
  await t.step("accepts strings", () => {
    assertEquals(validate(string(), "a"), { value: "a" });
    assertEquals(validate(string(), ""), { value: "" });
  });

  await t.step("rejects everything else", () => {
    for (const value of [1, true, null, undefined, [], {}, Symbol("s")]) {
      assert(!valid(string(), value), String(value));
    }
  });

  await t.step("reports a typed issue", () => {
    assertEquals(validate(string(), 1), {
      issues: [typeIssue("a string", 1, "number")],
    });
    assertEquals(
      validate(string(), null).issues?.[0].message,
      "Expected a string, received null",
    );
    assertEquals(
      validate(string(), []).issues?.[0].message,
      "Expected a string, received array",
    );
  });

  await t.step("exports its JSON Schema", () => {
    assertEquals(toJSONSchema(string(), { io: "input" }), { type: "string" });
    assertEquals(toJSONSchema(string()), { type: "string" });
  });

  await t.step("infers its types", () => {
    const schema = string();
    assertType<Equals<typeof schema, Schema<string, string, "string">>>();
    assertEquals(schema.kind, "string");
  });
});

Deno.test("integer", async (t) => {
  await t.step("accepts integers", () => {
    for (const value of [0, 1, -1, 1.0, 1e20, Number.MAX_SAFE_INTEGER]) {
      assert(valid(integer(), value), String(value));
    }
  });

  await t.step("rejects everything else", () => {
    for (
      const value of [
        1.5,
        NaN,
        Infinity,
        -Infinity,
        "1",
        true,
        null,
        undefined,
      ]
    ) {
      assert(!valid(integer(), value), String(value));
    }
    assertEquals(
      validate(integer(), 1.5).issues?.[0].message,
      "Expected an integer, received number",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(integer(), { io: "input" }), { type: "integer" });
    assertEquals(toJSONSchema(integer()), { type: "integer" });
    const schema = integer();
    assertType<Equals<typeof schema, Schema<number, number, "integer">>>();
  });
});

Deno.test("float", async (t) => {
  await t.step("accepts finite numbers, integers included", () => {
    for (const value of [0, 1, -1.5, 3.14, 1e-9, Number.MAX_VALUE]) {
      assert(valid(float(), value), String(value));
    }
  });

  await t.step("rejects everything else", () => {
    for (
      const value of [NaN, Infinity, -Infinity, "1.5", true, null, undefined]
    ) {
      assert(!valid(float(), value), String(value));
    }
    assertEquals(
      validate(float(), NaN).issues?.[0].message,
      "Expected a finite number, received number",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(float(), { io: "input" }), { type: "number" });
    assertEquals(toJSONSchema(float()), { type: "number" });
    const schema = float();
    assertType<Equals<typeof schema, Schema<number, number, "float">>>();
  });
});

Deno.test("number", async (t) => {
  await t.step("accepts every JavaScript number", () => {
    for (const value of [0, -0, 1, 1.5, NaN, Infinity, -Infinity]) {
      assert(valid(number(), value), String(value));
    }
  });

  await t.step("rejects everything else", () => {
    for (const value of ["1", 1n, true, null, undefined, {}]) {
      assert(!valid(number(), value), String(value));
    }
    assertEquals(
      validate(number(), "1").issues?.[0].message,
      "Expected a number, received string",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(number(), { io: "input" }), { type: "number" });
    assertEquals(toJSONSchema(number()), { type: "number" });
    const schema = number();
    assertType<Equals<typeof schema, Schema<number, number, "number">>>();
  });
});

Deno.test("boolean", async (t) => {
  await t.step("accepts booleans", () => {
    assertEquals(validate(boolean(), true), { value: true });
    assertEquals(validate(boolean(), false), { value: false });
  });

  await t.step("rejects everything else", () => {
    for (const value of [0, 1, "true", "", null, undefined]) {
      assert(!valid(boolean(), value), String(value));
    }
    assertEquals(
      validate(boolean(), 0).issues?.[0].message,
      "Expected a boolean, received number",
    );
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    assertEquals(toJSONSchema(boolean(), { io: "input" }), { type: "boolean" });
    assertEquals(toJSONSchema(boolean()), { type: "boolean" });
    const schema = boolean();
    assertType<Equals<typeof schema, Schema<boolean, boolean, "boolean">>>();
  });
});

Deno.test("options are placeholders", () => {
  // accepted, and without effect for now
  assertEquals(validate(string({}), "a"), { value: "a" });
  assertEquals(validate(integer({}), 1), { value: 1 });
  assertEquals(validate(float({}), 1.5), { value: 1.5 });
  assertEquals(validate(number({}), 1.5), { value: 1.5 });
  assertEquals(validate(boolean({}), true), { value: true });
  assertEquals(validate(nullable(string(), {}), null), { value: null });
  assertEquals(validate(optional(string(), {}), undefined), {
    value: undefined,
  });
});

Deno.test("nullable", async (t) => {
  await t.step("accepts null and what the schema accepts", () => {
    assertEquals(validate(nullable(string()), null), { value: null });
    assertEquals(validate(nullable(string()), "a"), { value: "a" });
    assertEquals(validate(nullable(integer()), 1), { value: 1 });
  });

  await t.step("rejects undefined and what the schema rejects", () => {
    assert(!valid(nullable(string()), undefined));
    assert(!valid(nullable(string()), 1));
    assertEquals(validate(nullable(string()), 1), {
      issues: [typeIssue("a string", 1, "number")],
    });
  });

  await t.step("infers its types", () => {
    const schema = nullable(string());
    assertType<
      Equals<typeof schema, Schema<string | null, string | null, "nullable">>
    >();
    assertType<Equals<Output<typeof schema>, string | null>>();
    assertType<Equals<Input<typeof schema>, string | null>>();
  });

  await t.step("exports a JSON Schema with null", () => {
    const expected = { anyOf: [{ type: "string" }, { type: "null" }] };
    assertEquals(toJSONSchema(nullable(string()), { io: "input" }), expected);
    assertEquals(toJSONSchema(nullable(string())), expected);
  });

  await t.step("keeps an input type that differs from the output", () => {
    const length = createSchema("length", {
      validate: (value) =>
        typeof value === "string"
          ? { value: value.length }
          : { issues: [{ message: "Expected a string" }] },
      jsonSchema: {
        input: () => ({ type: "string" }),
        output: () => ({ type: "integer" }),
      },
      types: undefined as unknown as StandardSchemaV1.Types<string, number>,
    });
    const schema = nullable(length);
    assertType<Equals<Input<typeof schema>, string | null>>();
    assertType<Equals<Output<typeof schema>, number | null>>();
    assertEquals(validate(schema, "abc"), { value: 3 });
    assertEquals(toJSONSchema(schema, { io: "input" }), {
      anyOf: [{ type: "string" }, { type: "null" }],
    });
    assertEquals(toJSONSchema(schema, { io: "output" }), {
      anyOf: [{ type: "integer" }, { type: "null" }],
    });
  });

  await t.step("passes the validate options on", () => {
    let received: unknown;
    const inner = createSchema("inner", {
      validate: (value, validateOptions) => {
        received = validateOptions;
        return { value };
      },
      jsonSchema: { input: () => ({}), output: () => ({}) },
    });
    validate(nullable(inner), 1, { libraryOptions: { a: 1 } });
    assertEquals(received, { libraryOptions: { a: 1 } });
  });
});

Deno.test("optional", async (t) => {
  await t.step("accepts undefined and what the schema accepts", () => {
    assertEquals(validate(optional(string()), undefined), { value: undefined });
    assertEquals(validate(optional(string()), "a"), { value: "a" });
    assertEquals(validate(optional(integer()), 1), { value: 1 });
  });

  await t.step("rejects null and what the schema rejects", () => {
    assert(!valid(optional(string()), null));
    assert(!valid(optional(string()), 1));
    assertEquals(
      validate(optional(string()), null).issues?.[0].message,
      "Expected a string, received null",
    );
  });

  await t.step("infers its types", () => {
    const schema = optional(string());
    assertType<
      Equals<
        typeof schema,
        Schema<string | undefined, string | undefined, "optional">
      >
    >();
    assertType<Equals<Output<typeof schema>, string | undefined>>();
  });

  await t.step("exports the JSON Schema of the nested schema", () => {
    assertEquals(toJSONSchema(optional(string()), { io: "input" }), {
      type: "string",
    });
    assertEquals(toJSONSchema(optional(string())), { type: "string" });
  });
});

Deno.test("nullable and optional compose and nest async schemas", async (t) => {
  await t.step("nullable(optional(x)) and optional(nullable(x))", () => {
    for (
      const schema of [
        nullable(optional(string())),
        optional(nullable(string())),
      ]
    ) {
      assertEquals(validate(schema, null), { value: null });
      assertEquals(validate(schema, undefined), { value: undefined });
      assertEquals(validate(schema, "a"), { value: "a" });
      assert(!valid(schema, 1));
    }

    const schema = optional(nullable(string()));
    assertType<Equals<Output<typeof schema>, string | null | undefined>>();
    assertEquals(schema.kind, "optional");
    assertEquals(toJSONSchema(schema), {
      anyOf: [{ type: "string" }, { type: "null" }],
    });
  });

  await t.step("stays sync for sync schemas", () => {
    assert(!(validateAsync(nullable(string()), "a") instanceof Promise));
    assert(!(validateAsync(optional(string()), "a") instanceof Promise));
  });

  await t.step("passes the result of an async schema through", async () => {
    const asyncString = createSchema("asyncString", {
      validate: (value) =>
        Promise.resolve(
          typeof value === "string"
            ? { value }
            : { issues: [{ message: "Expected a string" }] },
        ),
      jsonSchema: {
        input: () => ({ type: "string" }),
        output: () => ({ type: "string" }),
      },
    });

    const nullableAsync = nullable(asyncString);
    // null never reaches the async schema, so it stays sync
    assertEquals(validate(nullableAsync, null), { value: null });
    assertEquals(await validateAsync(nullableAsync, "a"), { value: "a" });
    assertEquals(await validateAsync(nullableAsync, 1), {
      issues: [{ message: "Expected a string" }],
    });

    const optionalAsync = optional(asyncString);
    assertEquals(validate(optionalAsync, undefined), { value: undefined });
    assertEquals(await validateAsync(optionalAsync, "a"), { value: "a" });
  });
});
