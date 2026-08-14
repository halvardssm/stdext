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

  // prefixItems infers a fixed tuple
  const tuple = array({ prefixItems: [string(), number()] });
  const _e: IsExact<InferOutput<typeof tuple>, [string, number]> = ok;

  // prefixItems + items appends a variadic tail to the tuple
  const tupleRest = array({ prefixItems: [string()], items: number() });
  const _f: IsExact<InferOutput<typeof tupleRest>, [string, ...number[]]> = ok;

  // prefixItems + unevaluatedItems appends a variadic tail to the tuple
  const tupleUnevaluated = array({
    prefixItems: [string()],
    unevaluatedItems: number(),
  });
  const _g: IsExact<
    InferOutput<typeof tupleUnevaluated>,
    [string, ...number[]]
  > = ok;

  // prefixItems + contains appends a variadic tail to the tuple
  const tupleContains = array({
    prefixItems: [string(), number()],
    contains: boolean(),
  });
  const _h: IsExact<
    InferOutput<typeof tupleContains>,
    [string, number, ...boolean[]]
  > = ok;

  // contains (without prefixItems) infers a uniform array
  const contains = array({ contains: number() });
  const _i: IsExact<InferOutput<typeof contains>, number[]> = ok;

  // unevaluatedItems (without prefixItems) infers a uniform array
  const unevaluated = array({ unevaluatedItems: number() });
  const _j: IsExact<InferOutput<typeof unevaluated>, number[]> = ok;
});

Deno.test("type inference: object schema", () => {
  // required drives required vs optional keys
  const s = object({
    properties: {
      name: string(),
      age: number(),
    },
    required: ["name"],
  });
  // name is required, age is optional; extras allowed as unknown
  const vs = null as unknown as InferOutput<typeof s>;
  const _name: string = vs.name;
  const _age: number | undefined = vs.age;
  const _extra: unknown = (vs as Record<string, unknown>).whatever;

  // all required
  const all = object({
    properties: {
      a: string(),
      b: boolean(),
    },
    required: ["a", "b"],
    additionalProperties: false,
  });
  const va = null as unknown as InferOutput<typeof all>;
  const _a: string = va.a;
  const _b: boolean = va.b;

  // no required -> all optional
  const opt = object({ properties: { x: string(), y: number() } });
  const vo = null as unknown as InferOutput<typeof opt>;
  const _x: string | undefined = vo.x;
  const _y: number | undefined = vo.y;

  // additionalProperties: false disallows extras (no index signature)
  const strict = object({
    properties: { name: string() },
    required: ["name"],
    additionalProperties: false,
  });
  const vstrict = null as unknown as InferOutput<typeof strict>;
  const _sname: string = vstrict.name;

  // additionalProperties: <schema> allows extras (typed unknown to avoid
  // conflicts with declared properties of a different type)
  const extras = object({
    properties: { name: string() },
    required: ["name"],
    additionalProperties: number(),
  });
  const vextras = null as unknown as InferOutput<typeof extras>;
  const _ename: string = vextras.name;
  const _eextra: unknown = (vextras as Record<string, unknown>).whatever;
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

  // Object parse infers shape (required keys are required)
  const obj = object({
    properties: { id: number(), label: string() },
    required: ["id", "label"],
    additionalProperties: false,
  });
  const objParsed = parse(obj, { id: 1, label: "x" });
  const _c: IsExact<typeof objParsed, { id: number; label: string }> = ok;

  // validate result carries the output type
  const result = validate(s, "hello");
  if (!result.issues) {
    const _d: IsExact<typeof result.value, string> = ok;
  }

  // Sanity: the assertions above are all compile-time; keep deno test happy.
  assert(parsed === "hello");
});
