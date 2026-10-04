import { assert, assertEquals } from "@std/assert";
import * as validation from "./mod.ts";
import {
  allOf,
  anyOf,
  array,
  boolean,
  enumerator,
  float,
  func,
  instanceOf,
  integer,
  isStandardJSONSchemaV1,
  isStandardSchemaV1,
  lazy,
  literal,
  never,
  not,
  null_,
  nullable,
  nullish,
  number,
  object,
  oneOf,
  optional,
  record,
  shape,
  string,
  symbol,
  tuple,
  unknown,
  validate,
} from "./mod.ts";
import type { Schema } from "./core.ts";

Deno.test("the package exports the whole public API", () => {
  const functions = [
    // core
    "createSchema",
    "collect",
    "chain",
    "prefixIssues",
    "typeOf",
    "typeIssue",
    "failure",
    "isRecord",
    "setOwn",
    "acceptsUndefined",
    "jsonSchemaOf",
    // schemas
    "string",
    "integer",
    "float",
    "number",
    "boolean",
    "symbol",
    "func",
    "null_",
    "literal",
    "enumerator",
    "instanceOf",
    "unknown",
    "never",
    "nullable",
    "optional",
    "nullish",
    // composites
    "object",
    "array",
    "record",
    "shape",
    "tuple",
    "anyOf",
    "oneOf",
    "allOf",
    "not",
    "lazy",
    // utils
    "validate",
    "validateAsync",
    "parse",
    "parseAsync",
    "isValid",
    "assertValid",
    "toJSONSchema",
    "stringify",
    "isStandardSchemaV1",
    "isStandardJSONSchemaV1",
  ];

  assertEquals(Object.keys(validation).sort(), [...functions].sort());
  for (const name of functions) {
    assertEquals(
      typeof validation[name as keyof typeof validation],
      "function",
      name,
    );
  }
});

/** Every ready-made schema, with the kind it must report. */
const schemas: Record<string, Schema> = {
  string: string(),
  integer: integer(),
  float: float(),
  number: number(),
  boolean: boolean(),
  symbol: symbol(),
  "function": func(),
  "null": null_(),
  literal: literal("a"),
  enumerator: enumerator(["a", "b"]),
  instanceOf: instanceOf(Date),
  unknown: unknown(),
  never: never(),
  nullable: nullable(string()),
  optional: optional(string()),
  nullish: nullish(string()),
  object: object({ a: string() }),
  shape: shape({ a: string() }),
  array: array(string()),
  record: record(string()),
  tuple: tuple([string()]),
  anyOf: anyOf([string()]),
  oneOf: oneOf([string()]),
  allOf: allOf([string()]),
  not: not(string()),
  lazy: lazy(() => string()),
};

Deno.test("every ready-made schema is a Standard Schema and a Standard JSON Schema", async (t) => {
  for (const [kind, schema] of Object.entries(schemas)) {
    await t.step(kind, () => {
      assertEquals(schema.kind, kind);
      assert(Object.isFrozen(schema));
      assert(isStandardSchemaV1(schema));
      assert(isStandardJSONSchemaV1(schema));
      assertEquals(schema["~standard"].version, 1);
      assertEquals(schema["~standard"].vendor, "@stdext/validation");

      // both directions give a JSON Schema object, without throwing
      for (const io of ["input", "output"] as const) {
        const json = schema["~standard"].jsonSchema[io]({
          target: "draft-2020-12",
        });
        assertEquals(typeof json, "object");
        assert(json !== null);
      }
    });
  }
});

Deno.test("every ready-made schema validates without throwing", async (t) => {
  const inputs = [
    undefined,
    null,
    true,
    0,
    "a",
    Symbol("s"),
    [],
    {},
    new Date(),
    () => {},
  ];

  for (const [kind, schema] of Object.entries(schemas)) {
    await t.step(kind, () => {
      for (const input of inputs) {
        // a result either way: values and issues, never an exception
        const result = validate(schema, input);
        assert("value" in result || "issues" in result);
      }
    });
  }
});
