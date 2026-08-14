import {
  array,
  boolean,
  combination,
  integer,
  nullable,
  number,
  object,
  string,
} from "./json_schema.ts";
import { type InferInput, type InferOutput, parse, validate } from "./mod.ts";
import { assert } from "@std/assert";

/**
 * Compile-time type assertion helper.
 *
 * Asserts that the type `Actual` is assignable to `Expected` (i.e. `Expected`
 * is a supertype of `Actual`). If `Actual` is not assignable to `Expected`,
 * `deno check` fails with an error.
 */
type IsSubtype<Actual, Expected> = Actual extends Expected ? true : never;

/**
 * Compile-time type assertion helper.
 *
 * Asserts that `Actual` and `Expected` are exactly the same type by requiring
 * mutual assignability. Use `IsExact` when the types must match precisely.
 */
type IsExact<Actual, Expected> = IsSubtype<Actual, Expected> extends true
  ? IsSubtype<Expected, Actual> extends true ? true : never
  : never;

/** Marker const used to force evaluation of a type-level assertion. */
const ok: true = true;

Deno.test("type inference: scalar schemas", () => {
  const s = string();
  const _a: IsExact<InferOutput<typeof s>, string> = ok;
  const _b: IsExact<InferInput<typeof s>, string> = ok;

  const n = number();
  const _c: IsExact<InferOutput<typeof n>, number> = ok;

  const i = integer();
  const _d: IsExact<InferOutput<typeof i>, number> = ok;

  const b = boolean();
  const _e: IsExact<InferOutput<typeof b>, boolean> = ok;

  const nu = nullable();
  const _f: IsExact<InferOutput<typeof nu>, null> = ok;
});

Deno.test("type inference: array schema", () => {
  const s = array({ items: string() });
  const _a: IsExact<InferOutput<typeof s>, string[]> = ok;
  const _b: IsExact<InferInput<typeof s>, string[]> = ok;

  const n = array({ items: number() });
  const _c: IsExact<InferOutput<typeof n>, number[]> = ok;

  // Array without items falls back to unknown[]
  const u = array();
  const _d: IsExact<InferOutput<typeof u>, unknown[]> = ok;
});

Deno.test("type inference: object schema", () => {
  const s = object({
    properties: {
      name: string(),
      age: number(),
    },
    required: ["name"],
  });
  // All inferred properties are optional: see ObjectElementOutput.
  const _a: IsExact<
    InferOutput<typeof s>,
    { name?: string; age?: number }
  > = ok;
  const _b: IsExact<
    InferInput<typeof s>,
    { name?: string; age?: number }
  > = ok;

  // Multiple properties
  const all = object({
    properties: {
      a: string(),
      b: boolean(),
    },
    required: ["a", "b"],
  });
  const _c: IsExact<
    InferOutput<typeof all>,
    { a?: string; b?: boolean }
  > = ok;
});

Deno.test("type inference: combination schema", () => {
  const s = combination({ anyOf: [string(), number()] });
  const _a: IsExact<InferOutput<typeof s>, string | number> = ok;

  const one = combination({ oneOf: [string(), boolean()] });
  const _b: IsExact<InferOutput<typeof one>, string | boolean> = ok;
});

Deno.test("type inference: parse and validate signatures", () => {
  const s = string();
  const parsed = parse(s, "hello");
  const _a: IsExact<typeof parsed, string> = ok;

  // Array parse infers element type
  const arr = array({ items: string() });
  const arrParsed = parse(arr, ["a", "b"]);
  const _b: IsExact<typeof arrParsed, string[]> = ok;

  // Object parse infers shape
  const obj = object({
    properties: { id: number(), label: string() },
    required: ["id", "label"],
  });
  const objParsed = parse(obj, { id: 1, label: "x" });
  const _c: IsExact<typeof objParsed, { id?: number; label?: string }> = ok;

  // validate result carries the output type
  const result = validate(s, "hello");
  if (!result.issues) {
    const _d: IsExact<typeof result.value, string> = ok;
  }

  // Sanity: the assertions above are all compile-time; keep deno test happy.
  assert(parsed === "hello");
});
