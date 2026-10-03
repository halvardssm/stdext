import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { JSONSchema } from "@stdext/json/json-schema/2020-12";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { SchemaError } from "@standard-schema/utils";
import {
  allOf,
  anyOf,
  array,
  asSchema,
  boolean,
  const_,
  contains,
  createSchema,
  date,
  discriminatedOneOf,
  enum_,
  exclusiveMaximum,
  exclusiveMinimum,
  fail,
  format,
  fromJsonSchema,
  integer,
  lazy,
  maximum,
  maxItems,
  maxLength,
  maxProperties,
  minimum,
  minItems,
  minLength,
  minProperties,
  multipleOf,
  never,
  not,
  null_,
  nullable,
  number,
  object,
  oneOf,
  optional,
  parse,
  parseAsync,
  pattern,
  pipe,
  record,
  refine,
  refineAsync,
  type Schema,
  string,
  toJSONSchema,
  transform,
  transformAsync,
  typeCheck,
  uniqueItems,
  unknown,
  validate,
} from "./mod.ts";
import { string as jsonString } from "../json_schema.ts";
import { RFC4122_UUID } from "../utils.ts";

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
function assertType<_T extends true>() {}

/** A minimal third-party Standard Schema (stand-in for Zod/Valibot). */
function foreignNumber(): StandardSchemaV1<number, number> {
  return {
    "~standard": {
      version: 1,
      vendor: "foreign",
      validate: (v: unknown) =>
        typeof v === "number"
          ? { value: v }
          : { issues: [{ message: "foreign: not a number" }] },
    },
  };
}

function foreignWithJSON(): StandardSchemaV1<string, string> {
  return {
    "~standard": {
      version: 1,
      vendor: "foreign",
      validate: (v: unknown) =>
        typeof v === "string" ? { value: v } : { issues: [{ message: "no" }] },
      jsonSchema: {
        input: () => ({ type: "string", $schema: "x", maxLength: 3 }),
        output: () => ({ type: "string" }),
      },
    },
  } as unknown as StandardSchemaV1<string, string>;
}

// deno-lint-ignore no-explicit-any
const ok = (value: unknown): any => ({ value });

Deno.test("primitives and keyword actions", () => {
  assertEquals(validate(string(), "a"), ok("a"));
  assert(validate(string(), 1).issues);
  assertEquals(validate(number(), 1), ok(1));
  assert(validate(number(), NaN).issues);
  assert(validate(integer(), 1.5).issues);
  assertEquals(validate(boolean(), true), ok(true));
  assertEquals(validate(null_(), null), ok(null));
  assert(validate(date(), new Date("x")).issues);
  assertEquals(validate(unknown(), 1), ok(1));
  assert(validate(never(), 1).issues);
  assertEquals(validate(const_("a"), "a"), ok("a"));
  assert(validate(const_("a"), "b").issues);
  assertEquals(validate(enum_(["a", 1]), 1), ok(1));
  assert(validate(enum_(["a", 1]), 2).issues);

  const n = pipe(
    number(),
    minimum(1),
    maximum(10),
    exclusiveMinimum(0),
    exclusiveMaximum(11),
    multipleOf(1),
  );
  assertEquals(validate(n, 5), ok(5));
  assertEquals(validate(n, 0).issues?.[0].message.includes("minimum"), true);
  const s = pipe(
    string(),
    minLength(2),
    maxLength(3),
    pattern("^a"),
    format("email"),
  );
  assert(validate(s, "ab").issues); // not an email
  assert(validate(s, "a@b.co").issues); // too long
  assertEquals(validate(pipe(string(), pattern(/^A/i)), "abc"), ok("abc"));
  assert(validate(pipe(string(), pattern(/^A/i)), "xbc").issues);
  assertEquals(validate(pipe(string(), pattern(/^a/)), "abc"), ok("abc"));
});

Deno.test("issues are standard and carry kind", () => {
  const r = validate(
    object({ a: pipe(string(), minLength(3)) }),
    { a: "x" },
  );
  assertEquals(r.issues?.length, 1);
  const issue = r.issues![0] as unknown as { kind: string; path: unknown };
  assertEquals(issue.kind, "minLength");
  assertEquals(issue.path, ["a"]);
  assertEquals(
    validate(string({ message: "custom" }), 1).issues?.[0].message,
    "custom",
  );
});

Deno.test("pipe: nested pipes, json_schema builders and foreign schemas", () => {
  const trimmed = pipe(string(), transform((s) => s.trim()));
  const lower = pipe(trimmed, transform((s) => s.toLowerCase()));
  assertEquals(validate(lower, "  AB "), ok("ab"));

  // symmetric + asymmetric nested pipe as a step
  const len = pipe(string(), trimmed, transform((s) => s.length));
  assertType<Equals<typeof len, Schema<string, number>>>();
  assertEquals(validate(len, " abc "), ok(3));

  // json_schema.ts builder as a step
  const builder = pipe(string(), jsonString({ minLength: 3 }));
  assertEquals(validate(builder, "abc"), ok("abc"));
  assert(validate(builder, "ab").issues);

  // foreign schema as a step
  const foreign = pipe(number(), foreignNumber());
  assertEquals(validate(foreign, 2), ok(2));

  // tuple shorthand
  const tuple = pipe(string(), [(s: string) => s.length > 1, "too short"]);
  assertEquals(validate(tuple, "a").issues?.[0].message, "too short");
  assertEquals(validate(tuple, "ab"), ok("ab"));

  // method form
  assertEquals(validate(string().pipe(minLength(1)), "a"), ok("a"));
  // wrapping a foreign schema as the first argument
  assertEquals(validate(pipe(foreignNumber(), minimum(1)), 2), ok(2));
  assert(validate(pipe(foreignNumber(), minimum(1)), 0).issues);
  assertEquals(asSchema(foreignNumber()).kind, "standard");
  const s = string();
  assert(asSchema(s) === s);
});

Deno.test("pipe: short-circuits and failure results are not value lookalikes", () => {
  let calls = 0;
  const s = pipe(
    string(),
    minLength(5),
    transform((v) => {
      calls++;
      return v;
    }),
  );
  assert(validate(s, "a").issues);
  assertEquals(calls, 0);

  // a value shaped like a failure result is just a value
  const o = object({ issues: unknown() }, {});
  const lookalike = { issues: [{ message: "x" }] };
  assertEquals(validate(o, lookalike), ok(lookalike));
  const t = pipe(string(), transform(() => ({ issues: [{ message: "x" }] })));
  assertEquals(validate(t, "a").issues, undefined);
});

Deno.test("custom actions: typeCheck, refine, fail", () => {
  const s = createSchema<unknown, number>("n", [
    typeCheck((v): v is number => typeof v === "number", "number"),
    refine((n: number) => n > 0, "positive", "must be positive"),
    { kind: "x", run: (n: number) => n > 100 ? fail("too big") : n },
  ]);
  assertEquals(validate(s, 1), ok(1));
  assertEquals(validate(s, -1).issues?.[0].message, "must be positive");
  assertEquals(validate(s, 101).issues?.[0].message, "too big");
  assertEquals(
    validate(pipe(number(), refine((n) => n > 5)), 1).issues?.[0].message,
    "Input failed the custom check",
  );
});

Deno.test("object", () => {
  const user = object({
    name: string(),
    age: optional(number()),
    tag: optional(string(), "none"),
    nick: nullable(string()),
  });
  assertType<
    Equals<
      StandardSchemaV1.InferOutput<typeof user>,
      {
        name: string;
        age?: number | undefined;
        tag: string;
        nick: string | null;
      }
    >
  >();
  assertEquals(
    validate(user, { name: "a", nick: null, extra: 1 }),
    ok({ name: "a", tag: "none", nick: null }),
  );
  assertEquals(
    validate(user, { name: "a", age: 1, nick: "n" }),
    ok({ name: "a", age: 1, tag: "none", nick: "n" }),
  );
  assertEquals(validate(user, { nick: null }).issues?.[0].path, ["name"]);
  assert(validate(user, null).issues);
  assert(validate(user, []).issues);

  const strict = object({ a: string() }).additionalProperties(false);
  assert(validate(strict, { a: "x", b: 1 }).issues);
  assertEquals(validate(strict, { a: "x" }), ok({ a: "x" }));

  const rest = object({ a: string() }).additionalProperties(number());
  assertEquals(validate(rest, { a: "x", b: 1 }), ok({ a: "x", b: 1 }));
  assertEquals(validate(rest, { a: "x", b: "y" }).issues?.[0].path, ["b"]);
  const keep = object({ a: string() }).additionalProperties(true);
  assertEquals(validate(keep, { a: "x", b: 1 }), ok({ a: "x", b: 1 }));

  const checked = object({ a: number(), b: number() }, {
    check: (v) => v.a < v.b,
    checkMessage: "a < b",
    message: "not an object",
  });
  assertEquals(validate(checked, { a: 2, b: 1 }).issues?.[0].message, "a < b");
  assertEquals(validate(checked, 1).issues?.[0].message, "not an object");

  const required = object({ a: unknown() }, { required: ["a"] });
  assert(validate(required, {}).issues);
  assertEquals(validate(required, { a: 1 }), ok({ a: 1 }));

  assertEquals(
    validate(pipe(object({}), minProperties(1)), {}).issues?.length,
    1,
  );
  assertEquals(validate(pipe(object({}), maxProperties(1)), {}), ok({}));

  // prototype pollution safe
  const out = validate(
    object({}).additionalProperties(unknown()),
    JSON.parse('{"__proto__": {"x": 1}}'),
  );
  assertEquals(
    ({} as Record<string, unknown>).x,
    undefined,
  );
  assert(!out.issues);
});

Deno.test("array, record", () => {
  const a = pipe(array(number()), minItems(1), maxItems(2), uniqueItems());
  assertType<Equals<StandardSchemaV1.InferOutput<typeof a>, number[]>>();
  assertEquals(validate(a, [1, 2]), ok([1, 2]));
  assertEquals(validate(a, ["x"]).issues?.[0].path, [0]);
  assert(validate(a, []).issues);
  assert(validate(a, [1, 1]).issues);
  assert(validate(a, [1, 2, 3]).issues);
  assert(validate(a, "x").issues);

  const c = pipe(
    array(unknown()),
    contains(number(), { minContains: 2, maxContains: 3 }),
  );
  assertEquals(validate(c, [1, 2, "a"]), ok([1, 2, "a"]));
  assert(validate(c, [1, "a"]).issues);
  assert(validate(c, [1, 2, 3, 4]).issues);
  assertThrows(
    () =>
      validate(
        pipe(
          array(unknown()),
          contains(pipe(string(), transformAsync((s) => Promise.resolve(s)))),
        ),
        ["a"],
      ),
    TypeError,
  );

  const r = record(number());
  assertEquals(validate(r, { a: 1 }), ok({ a: 1 }));
  assertEquals(validate(r, { a: "x" }).issues?.[0].path, ["a"]);
});

Deno.test("anyOf, oneOf, allOf, not, discriminatedOneOf", () => {
  const u = anyOf([number(), const_("none")]);
  assertType<Equals<StandardSchemaV1.InferOutput<typeof u>, number | "none">>();
  assertEquals(validate(u, "none"), ok("none"));
  assertEquals(validate(u, "x").issues?.length, 2);
  assert(validate(anyOf([]), 1).issues);

  const one = oneOf([minimumNumber(0), minimumNumber(5)]);
  assertEquals(validate(one, 1), ok(1));
  assert(validate(one, 6).issues); // matches both
  assert(validate(one, -1).issues); // matches none

  const both = allOf([
    object({ a: string() }),
    object({ b: number() }),
  ]);
  assertEquals(validate(both, { a: "x", b: 1 }), ok({ a: "x", b: 1 }));
  assert(validate(both, { a: "x" }).issues);
  assertEquals(validate(allOf([pipe(string(), minLength(1))]), "a"), ok("a"));
  assertEquals(validate(allOf([]), 1), ok(1));

  const n = not(string());
  assertEquals(validate(n, 1), ok(1));
  assert(validate(n, "a").issues);

  const shape = discriminatedOneOf("type", [
    object({ type: const_("c"), r: number() }),
    object({ type: enum_(["l", "m"]), text: string() }),
  ]);
  assertEquals(validate(shape, { type: "c", r: 1 }), ok({ type: "c", r: 1 }));
  assertEquals(validate(shape, { type: "m", text: "t" }).issues, undefined);
  assertEquals(validate(shape, { type: "z" }).issues?.[0].path, ["type"]);
  assert(validate(shape, { r: 1 }).issues); // fallback to anyOf behaviour
  assert(validate(shape, 1).issues);
  assertEquals(validate(shape, { r: 1, type: "c" }).issues, undefined);
  assertThrows(
    () => discriminatedOneOf("type", [object({ type: string() })]),
    TypeError,
  );
});

function minimumNumber(n: number) {
  return pipe(number(), minimum(n));
}

Deno.test("mixing foreign schemas in structure with inference", () => {
  const mixed = object({
    a: pipe(string(), pattern(RFC4122_UUID)),
    b: foreignNumber(),
    c: jsonString({ minLength: 1 }),
    d: optional(foreignNumber()),
    e: array(foreignNumber()),
    f: anyOf([foreignNumber(), string()]),
  });
  assertType<
    Equals<
      StandardSchemaV1.InferOutput<typeof mixed>,
      {
        a: string;
        b: number;
        c: string;
        d?: number | undefined;
        e: number[];
        f: string | number;
      }
    >
  >();
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  assertEquals(
    validate(mixed, { a: uuid, b: 1, c: "x", e: [1], f: "s" }).issues,
    undefined,
  );
  assertEquals(
    validate(mixed, { a: uuid, b: "no", c: "x", e: [], f: 1 }).issues?.[0]
      .message,
    "foreign: not a number",
  );
});

Deno.test("async", async () => {
  const slow = pipe(
    string(),
    refineAsync((s: string) => Promise.resolve(s !== "bad"), "slow", "bad!"),
    transformAsync((s: string) => Promise.resolve(s.length)),
  );
  assertThrows(() => validate(slow, "x"), TypeError);
  assertThrows(() => parse(slow, "x"), TypeError);
  assertEquals(await parseAsync(slow, "xyz"), 3);
  await assertRejects(() => parseAsync(slow, "bad"), SchemaError);

  const nested = object({
    list: array(slow),
    one: optional(slow),
    r: record(slow),
  }).additionalProperties(slow);
  const result = await nested["~standard"].validate({
    list: ["a", "bad"],
    one: "ab",
    r: { k: "x" },
    z: "zz",
  });
  assertEquals(result.issues?.length, 1);
  assertEquals(result.issues?.[0].path, ["list", 1]);
  const good = await nested["~standard"].validate({
    list: ["a"],
    one: "ab",
    r: { k: "x" },
    z: "zz",
  });
  assertEquals(good, ok({ list: [1], one: 2, r: { k: 1 }, z: 2 }));

  // async inside unions, intersections, oneOf, not, discriminated, lazy
  const u = await anyOf([slow, number()])["~standard"].validate(5);
  assertEquals(u, ok(5));
  assertEquals(
    await allOf([slow, slow])["~standard"].validate("ab"),
    ok(2),
  );
  assertEquals(
    await oneOf([slow, number()])["~standard"].validate("ab"),
    ok(2),
  );
  assertEquals(await not(slow)["~standard"].validate(1), ok(1));
  assertEquals(await lazy(() => slow)["~standard"].validate("ab"), ok(2));
  assertEquals(
    await nullable(slow)["~standard"].validate("ab"),
    ok(2),
  );
});

Deno.test("transforms change the output type", () => {
  const s = pipe(string(), transform((v) => v.length));
  assertType<Equals<StandardSchemaV1.InferInput<typeof s>, string>>();
  assertType<Equals<StandardSchemaV1.InferOutput<typeof s>, number>>();
  const d = pipe(date(), transform((v) => v.toISOString()));
  assertType<Equals<StandardSchemaV1.InferOutput<typeof d>, string>>();
  assertEquals(validate(d, new Date(0)), ok("1970-01-01T00:00:00.000Z"));
  const long = pipe(
    string(),
    minLength(1),
    transform((v) => v.length),
    minimum(1),
    transform((n) => n > 1),
    [(b: boolean) => b],
    transform((b) => String(b)),
  );
  assertEquals(validate(long, "ab"), ok("true"));
});

Deno.test("lazy recursion", () => {
  interface Node {
    name: string;
    children?: Node[] | undefined;
  }
  const node: Schema<Node> = object({
    name: string(),
    children: optional(array(lazy(() => node))),
  });
  const tree = { name: "a", children: [{ name: "b", children: [] }] };
  assertEquals(validate(node, tree), ok(tree));
  assertEquals(
    validate(node, { name: "a", children: [{ name: 1 }] }).issues?.[0].path,
    ["children", 0, "name"],
  );
});

Deno.test("S4 immutability", () => {
  const base = string();
  const derived = pipe(base, minLength(3));
  assertEquals(validate(base, "a"), ok("a"));
  assert(validate(derived, "a").issues);
  assert(Object.isFrozen(base.steps));
  const optionalMsg = pipe(string({ message: "m" }), minLength(1));
  assertEquals(validate(optionalMsg, 1).issues?.[0].message, "m");
});

Deno.test("toJSONSchema: core types", () => {
  const User = object({
    id: pipe(string(), pattern(RFC4122_UUID)),
    email: pipe(string(), format("email"), minLength(3)),
    age: optional(pipe(integer(), minimum(0))),
    role: anyOf([const_("a"), enum_(["b", "c"])]),
    tags: pipe(array(string()), minItems(1), uniqueItems()),
    meta: record(number()),
    n: nullable(string()),
    f: pipe(unknown(), minLength(1)),
  }, { required: ["f"] }).additionalProperties(false);
  const json = toJSONSchema(User);
  assertEquals(json, {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      id: { type: "string", pattern: RFC4122_UUID.source },
      email: { type: "string", format: "email", minLength: 3 },
      age: { type: "integer", minimum: 0 },
      role: { anyOf: [{ const: "a" }, { enum: ["b", "c"] }] },
      tags: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        uniqueItems: true,
      },
      meta: { type: "object", additionalProperties: { type: "number" } },
      n: { anyOf: [{ type: "string" }, { type: "null" }] },
      f: { minLength: 1 },
    },
    required: ["f", "id", "email", "role", "tags", "meta", "n"],
    additionalProperties: false,
  });

  assertEquals(toJSONSchema(unknown()), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
  });
  assertEquals(toJSONSchema(never()).not, true);
  assertEquals(toJSONSchema(not(string())).not, { type: "string" });
  assertEquals(toJSONSchema(allOf([string()])).allOf, [{ type: "string" }]);
  assertEquals(toJSONSchema(oneOf([string()])).oneOf, [{ type: "string" }]);
  assertEquals(
    toJSONSchema(
      pipe(object({}).additionalProperties(number()), maxProperties(1)),
    ),
    {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: { type: "number" },
      maxProperties: 1,
    },
  );
  assertEquals(
    toJSONSchema(
      pipe(
        array(unknown()),
        contains(number(), { minContains: 1, maxContains: 2 }),
      ),
    ),
    {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "array",
      contains: { type: "number" },
      minContains: 1,
      maxContains: 2,
    },
  );
  // repeated keyword is conjunctive
  assertEquals(
    toJSONSchema(pipe(string(), minLength(1), minLength(3))).allOf,
    [{ minLength: 3 }],
  );
  // nested schema steps
  assertEquals(
    toJSONSchema(pipe(string(), pipe(string(), maxLength(2)))).allOf,
    [{ type: "string", maxLength: 2 }],
  );
  // number keywords
  assertEquals(
    toJSONSchema(
      pipe(
        number(),
        exclusiveMinimum(0),
        exclusiveMaximum(5),
        multipleOf(2),
        maximum(4),
      ),
    ),
    {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number",
      exclusiveMinimum: 0,
      exclusiveMaximum: 5,
      multipleOf: 2,
      maximum: 4,
    },
  );
  assertEquals(
    toJSONSchema(discriminatedOneOf("t", [object({ t: const_("a") })])).oneOf
      ?.length,
    1,
  );
});

Deno.test("toJSONSchema: degradation and strict", () => {
  const s = pipe(
    string(),
    refine((v) => v !== "x"),
    minLength(2),
    transform((v) => v.length),
    minimum(1), // constrains the OUTPUT: must not be emitted
  );
  assertEquals(toJSONSchema(s), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "string",
    minLength: 2,
  });
  assertThrows(() => toJSONSchema(s, { strict: true }), TypeError);
  assertThrows(
    () => toJSONSchema(pipe(string(), [(v: string) => !!v]), { strict: true }),
    TypeError,
  );
  assertThrows(() => toJSONSchema(date(), { strict: true }), TypeError);
  assertEquals(toJSONSchema(date()).type, undefined);
  assertEquals(
    toJSONSchema(date(), { fallback: () => ({ type: "string" }) }).type,
    "string",
  );
  // foreign without converter
  assertEquals(toJSONSchema(foreignNumber()), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
  });
  assertThrows(
    () => toJSONSchema(foreignNumber(), { strict: true }),
    TypeError,
  );
  // foreign with converter, standalone and nested
  assertEquals(toJSONSchema(foreignWithJSON()).maxLength, 3);
  assertEquals(
    toJSONSchema(object({ a: asSchema(foreignWithJSON()) })).properties,
    { a: { type: "string", maxLength: 3 } },
  );
  // json_schema.ts builder in structure
  assertEquals(
    toJSONSchema(object({ c: jsonString({ minLength: 1 }) })).properties,
    { c: { type: "string", minLength: 1 } },
  );
  // foreign entries probe optionality
  const probe = toJSONSchema(object({ a: foreignNumber() }));
  assertEquals(probe.required, ["a"]);
  // steps after foreign or transforming schema steps are not emitted
  assertEquals(
    toJSONSchema(pipe(string(), foreignNumber(), minimum(1))).allOf,
    undefined,
  );
  assertThrows(
    () =>
      toJSONSchema(pipe(string(), foreignNumber(), minimum(1)), {
        strict: true,
      }),
    TypeError,
  );
  assertThrows(
    () => toJSONSchema({} as StandardSchemaV1, { strict: true }),
    TypeError,
  );
});

Deno.test("toJSONSchema: lazy uses $ref/$defs", () => {
  interface Node {
    children?: Node[] | undefined;
  }
  const node: Schema<Node> = object({
    children: optional(array(lazy(() => node))),
  });
  const json = toJSONSchema(node);
  assertEquals(json.$ref, "#/$defs/ref0");
  assertEquals(json.$defs?.ref0, {
    type: "object",
    properties: {
      children: { type: "array", items: { $ref: "#/$defs/ref0" } },
    },
  });
  const back = fromJsonSchema(json);
  assert(!validate(back, { children: [{ children: [] }] }).issues);
  assert(validate(back, { children: [{ children: 1 }] }).issues);
});

/** Same accept/reject behaviour on every sample. */
function assertSameSpace(
  a: StandardSchemaV1,
  b: StandardSchemaV1,
  samples: unknown[],
) {
  for (const sample of samples) {
    assertEquals(
      !validate(a, sample).issues,
      !validate(b, sample).issues,
      `diverged on ${JSON.stringify(sample)}`,
    );
  }
}

// JSON values only: `undefined` has no JSON Schema representation.
const SAMPLES: unknown[] = [
  null,
  true,
  0,
  1,
  2,
  -1,
  5.5,
  "",
  "a",
  "abc",
  "ab",
  "a@b.co",
  "none",
  "b",
  [],
  [1],
  [1, 1],
  [1, 2, 3],
  ["a"],
  {},
  { a: "x" },
  { a: 1 },
  { a: "x", b: 1 },
  { a: "x", b: "y" },
  { type: "a", x: 1 },
  { type: "b", y: "s" },
  { type: "c" },
  { n: null },
];

Deno.test("round trip: fromJsonSchema(toJSONSchema(s)) accepts the same inputs", () => {
  const schemas: Schema<never, unknown>[] = [
    string(),
    pipe(string(), minLength(2), maxLength(3), pattern("^a")),
    pipe(string(), format("email")),
    pipe(number(), minimum(1), exclusiveMaximum(5)),
    pipe(integer(), multipleOf(2)),
    boolean(),
    null_(),
    unknown(),
    never(),
    const_("a"),
    enum_(["a", 1, null]),
    pipe(array(number()), minItems(1), maxItems(2), uniqueItems()),
    array(unknown()),
    pipe(
      array(unknown()),
      contains(string(), { minContains: 1, maxContains: 1 }),
    ),
    object({ a: string() }),
    object({ a: optional(string()), b: optional(number()) }),
    object({ a: string() }).additionalProperties(false),
    object({ a: string() }).additionalProperties(number()),
    pipe(
      object({}).additionalProperties(unknown()),
      minProperties(1),
      maxProperties(2),
    ),
    record(number()),
    anyOf([number(), const_("none")]),
    nullable(string()),
    allOf([pipe(string(), minLength(2)), pipe(string(), maxLength(2))]),
    oneOf([pipe(number(), minimum(0)), pipe(number(), minimum(5))]),
    not(string()),
    discriminatedOneOf("type", [
      object({ type: const_("a"), x: number() }),
      object({ type: enum_(["b", "c"]), y: string() }),
    ]),
    optional(string()),
    pipe(string(), refine((s) => s !== "a"), minLength(1)), // refine degrades
    pipe(string(), pipe(string(), maxLength(2))),
  ].map((s) => s as unknown as Schema<never, unknown>);

  for (const schema of schemas) {
    const json = toJSONSchema(schema);
    const compiled = fromJsonSchema(json);
    // `refine` degrades to `true` by design, so compare with the degraded form
    const reference = schema.steps.some((s) =>
        (s as { kind?: string }).kind === "custom"
      )
      ? fromJsonSchema(json)
      : schema;
    assertSameSpace(reference, compiled, SAMPLES);
    // re-exporting the compiled schema keeps the same input space
    assertSameSpace(compiled, fromJsonSchema(toJSONSchema(compiled)), SAMPLES);
  }
});

Deno.test("fromJsonSchema", () => {
  assertEquals(validate(fromJsonSchema(true), 1), ok(1));
  assert(validate(fromJsonSchema(false), 1).issues);
  assert(
    validate(fromJsonSchema({}), "any") &&
      !validate(fromJsonSchema({}), 1).issues,
  );

  const s = fromJsonSchema({
    type: "object",
    properties: { a: { $ref: "#/$defs/s" }, b: { $ref: "#/definitions/s" } },
    required: ["a"],
    $defs: { s: { type: "string", minLength: 2 } },
    definitions: { s: { type: "string", minLength: 2 } },
  } as JSONSchema);
  assert(!validate(s, { a: "ab" }).issues);
  assert(validate(s, { a: "a" }).issues);
  assert(validate(s, {}).issues);
  assertEquals(validate(s, { a: "ab", z: 1 }), ok({ a: "ab", z: 1 }));

  // definitions param, untyped keywords, type arrays
  const fromParam = fromJsonSchema({ $ref: "#/$defs/n" }, {}, {
    n: { type: "number" },
  });
  assert(!validate(fromParam, 1).issues);
  assert(validate(fromParam, "x").issues);
  const untyped = fromJsonSchema({ minLength: 2 });
  assert(!validate(untyped, 1).issues);
  assert(!validate(untyped, "ab").issues);
  assert(validate(untyped, "a").issues);
  const types = fromJsonSchema(
    { type: ["string", "null"], maxLength: 1 } as unknown as JSONSchema,
  );
  assert(!validate(types, null).issues);
  assert(!validate(types, "a").issues);
  assert(validate(types, "ab").issues);
  // const/enum combined with type
  const combo = fromJsonSchema({ type: "string", const: "a" });
  assert(!validate(combo, "a").issues);
  assert(validate(combo, "b").issues);
  assert(!validate(fromJsonSchema({ enum: [{ a: 1 }] }), { a: 1 }).issues);
  // recursion through $ref "#"
  const rec = fromJsonSchema({
    type: "object",
    properties: { next: { $ref: "#" } },
  });
  assert(!validate(rec, { next: { next: {} } }).issues);
  assert(validate(rec, { next: { next: 1 } }).issues);
  // oneOf: discriminated and generic
  const d = fromJsonSchema({
    oneOf: [
      { type: "object", properties: { t: { const: "a" } }, required: ["t"] },
      { type: "object", properties: { t: { const: "b" } }, required: ["t"] },
    ],
  });
  assertEquals(d.steps.length >= 1, true);
  assert(!validate(d, { t: "a" }).issues);
  assert(validate(d, { t: "z" }).issues);
  const generic = fromJsonSchema({
    oneOf: [{ type: "number" }, { type: "integer" }],
  });
  assert(!validate(generic, 1.5).issues);
  assert(validate(generic, 1).issues);
  // not and allOf alongside type
  const mixed = fromJsonSchema({
    type: "string",
    not: { const: "x" },
    allOf: [{ minLength: 1 }],
  });
  assert(!validate(mixed, "a").issues);
  assert(validate(mixed, "x").issues);
  assert(validate(mixed, "").issues);
  // contains / minContains / uniqueItems / items
  const arr = fromJsonSchema({
    type: "array",
    items: { type: "number" },
    uniqueItems: true,
    contains: { minimum: 5 },
    minContains: 1,
  });
  assert(!validate(arr, [1, 5]).issues);
  assert(validate(arr, [1, 2]).issues);
  assert(validate(arr, [5, 5]).issues);
  // additionalProperties
  assert(
    validate(
      fromJsonSchema({
        type: "object",
        additionalProperties: false,
        properties: { a: true },
      }),
      { b: 1 },
    ).issues,
  );
  assert(
    validate(
      fromJsonSchema({
        type: "object",
        additionalProperties: { type: "number" },
      }),
      { b: "x" },
    ).issues,
  );
  // integer, number and boolean/null types
  assert(validate(fromJsonSchema({ type: "integer" }), 1.5).issues);
  assert(!validate(fromJsonSchema({ type: "boolean" }), false).issues);
  assert(!validate(fromJsonSchema({ type: "null" }), null).issues);
});

Deno.test("fromJsonSchema: unsupported features follow params", () => {
  const warnings: Array<[string, string | undefined]> = [];
  const s = fromJsonSchema(
    {
      type: "object",
      patternProperties: { "^a": { type: "string" } },
      prefixItems: [],
      title: "ignored silently",
      properties: {
        f: { type: "string", format: "regex" },
        r: { $ref: "https://x/y" },
      },
    },
    { onWarning: (m, k) => warnings.push([m, k]) },
  );
  assert(!validate(s, { a: 1 }).issues);
  assertEquals(warnings.map((w) => w[1]), [
    "patternProperties",
    "prefixItems",
    "format",
    "$ref",
  ]);
  // array type warns for prefixItems
  const arrWarnings: string[] = [];
  fromJsonSchema({ type: "array", prefixItems: [{}] }, {
    onWarning: (_m, k) => arrWarnings.push(k!),
  });
  assert(arrWarnings.includes("prefixItems"));
  assertThrows(
    () => fromJsonSchema({ if: {} }, { unsupported: "throw" }),
    TypeError,
  );
  assertThrows(
    () => fromJsonSchema({ $ref: "#/$defs/missing" }, { unsupported: "throw" }),
    TypeError,
  );
  assertThrows(
    () => fromJsonSchema({ type: "weird" } as never, { unsupported: "throw" }),
    TypeError,
  );
  assert(!validate(fromJsonSchema({ type: "weird" } as never), 1).issues);
});

Deno.test("fluent core never imports json_schema.ts", async () => {
  for await (const entry of Deno.readDir(new URL(".", import.meta.url))) {
    if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) {
      continue;
    }
    const source = await Deno.readTextFile(
      new URL(entry.name, import.meta.url),
    );
    assert(!/from "\.\.\/json_schema\.ts"/.test(source), entry.name);
  }
});
