import type { StandardSchemaV1 } from "@standard-schema/spec";
import { assert, assertEquals } from "@std/assert";
import {
  allOf,
  anyOf,
  array,
  lazy,
  not,
  object,
  oneOf,
  record,
  shape,
  tuple,
} from "./composites.ts";
import { createSchema, type Schema } from "./core.ts";
import {
  boolean,
  enumerator,
  float,
  func,
  integer,
  literal,
  nullable,
  number,
  optional,
  string,
} from "./schemas.ts";
import { toJSONSchema, validate, validateAsync } from "./utils.ts";
import {
  assertType,
  asyncString,
  type Equals,
  type Input,
  issue,
  type Output,
  typeIssue,
  valid,
} from "./_testing.ts";

Deno.test("object", async (t) => {
  const user = object({
    name: string(),
    age: optional(integer()),
    tags: array(string()),
  });

  await t.step("accepts objects matching the properties", () => {
    assertEquals(validate(user, { name: "Alice", age: 30, tags: ["a"] }), {
      value: { name: "Alice", age: 30, tags: ["a"] },
    });
  });

  await t.step("lets properties that accept undefined be absent", () => {
    assertEquals(validate(user, { name: "Alice", tags: [] }), {
      value: { name: "Alice", tags: [] },
    });
    // an absent key stays absent, an explicit undefined stays present
    const absent = validate(user, { name: "Alice", tags: [] });
    assert(!("age" in (absent as { value: object }).value));
    const explicit = validate(user, {
      name: "Alice",
      tags: [],
      age: undefined,
    });
    assert("age" in (explicit as { value: object }).value);
  });

  await t.step("requires the other properties", () => {
    assertEquals(validate(user, { tags: [] }), {
      issues: [typeIssue("a string", undefined, "undefined", ["name"])],
    });
    assert(!valid(user, {}));
  });

  await t.step("removes unknown keys from the output", () => {
    assertEquals(validate(user, { name: "Alice", tags: [], extra: 1 }), {
      value: { name: "Alice", tags: [] },
    });
  });

  await t.step("reports every failing property with its path", () => {
    assertEquals(validate(user, { name: 1, age: "x", tags: ["a", 2] }), {
      issues: [
        typeIssue("a string", 1, "number", ["name"]),
        typeIssue("an integer", "x", "string", ["age"]),
        typeIssue("a string", 2, "number", ["tags", 1]),
      ],
    });
  });

  await t.step("accepts only plain objects", () => {
    for (const value of [[], null, undefined, "a", 1, new Date(), new Map()]) {
      assert(!valid(user, value), String(value));
    }
    assertEquals(
      validate(user, []).issues?.[0].message,
      "Expected an object, received array",
    );
    assert(valid(object({}), {}));
    assert(valid(object({}), Object.create(null)));
  });

  await t.step("is safe against prototype pollution", () => {
    const schema = object({ __proto__: string() });
    const input = JSON.parse('{"__proto__": "x"}');
    const result = validate(schema, input) as { value: object };
    assertEquals(Object.getPrototypeOf(result.value), Object.prototype);
    assertEquals(({} as Record<string, unknown>).x, undefined);
  });

  await t.step("exports its JSON Schema", () => {
    const expected = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "integer" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["name", "tags"],
    };
    assertEquals(toJSONSchema(user, { io: "input" }), expected);
    assertEquals(toJSONSchema(user), expected);
    assertEquals(toJSONSchema(object({})), { type: "object" });
    assertEquals(toJSONSchema(object({ a: optional(string()) })), {
      type: "object",
      properties: { a: { type: "string" } },
    });
  });

  await t.step("infers optional keys from the properties", () => {
    assertType<
      Equals<
        Output<typeof user>,
        { name: string; tags: string[]; age?: number | undefined }
      >
    >();
    assertType<
      Equals<
        Input<typeof user>,
        { name: string; tags: string[]; age?: number | undefined }
      >
    >();
    assertEquals(user.kind, "object");
  });

  await t.step("nests objects", () => {
    const schema = object({ owner: user });
    assertEquals(
      validate(schema, { owner: { name: 1, tags: [] } }).issues?.[0].path,
      ["owner", "name"],
    );
    assertType<
      Equals<
        Output<typeof schema>["owner"],
        { name: string; tags: string[]; age?: number | undefined }
      >
    >();
  });
});

Deno.test("object with symbol keys", async (t) => {
  const id = Symbol("id");
  const tag = Symbol("tag");
  const schema = object({
    name: string(),
    [id]: string(),
    [tag]: optional(integer()),
  });

  await t.step("validates symbol properties and keeps them", () => {
    const result = validate(schema, { name: "Alice", [id]: "x", [tag]: 1 });
    assertEquals(result, { value: { name: "Alice", [id]: "x", [tag]: 1 } });
    const value = (result as { value: Record<PropertyKey, unknown> }).value;
    assertEquals(Reflect.ownKeys(value), ["name", id, tag]);
  });

  await t.step(
    "reports a failing symbol property with the key in the path",
    () => {
      assertEquals(validate(schema, { name: "Alice", [id]: 123 }), {
        issues: [typeIssue("a string", 123, "number", [id])],
      });
      assertEquals(validate(schema, { name: "Alice", [id]: "x", [tag]: "1" }), {
        issues: [typeIssue("an integer", "1", "string", [tag])],
      });
    },
  );

  await t.step(
    "requires symbol properties that do not accept undefined",
    () => {
      assertEquals(validate(schema, { name: "Alice" }), {
        issues: [typeIssue("a string", undefined, "undefined", [id])],
      });
    },
  );

  await t.step("lets optional symbol properties be absent", () => {
    const result = validate(schema, { name: "Alice", [id]: "x" }) as {
      value: Record<PropertyKey, unknown>;
    };
    assertEquals(Reflect.ownKeys(result.value), ["name", id]);
  });

  await t.step("removes unknown symbol keys like unknown string keys", () => {
    const other = Symbol("other");
    const result = validate(schema, {
      name: "Alice",
      [id]: "x",
      [other]: 1,
      extra: 1,
    }) as { value: Record<PropertyKey, unknown> };
    assertEquals(Reflect.ownKeys(result.value), ["name", id]);
  });

  await t.step("ignores symbol keys that are not enumerable", () => {
    const hidden = Symbol("hidden");
    const properties = { name: string() };
    Object.defineProperty(properties, hidden, {
      value: string(),
      enumerable: false,
    });
    assert(valid(object(properties), { name: "Alice" }));
  });

  await t.step("works with only symbol keys and with numeric keys", () => {
    assertEquals(validate(object({ [id]: string() }), { [id]: "x" }), {
      value: { [id]: "x" },
    });
    assert(!valid(object({ [id]: string() }), {}));
    assertEquals(validate(object({ 1: string() }), { 1: "a" }), {
      value: { 1: "a" },
    });
    assertEquals(validate(object({ 1: string() }), { 1: 2 }).issues?.[0].path, [
      "1",
    ]);
  });

  await t.step("leaves symbol keys out of the JSON Schema", () => {
    const expected = {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    };
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
    // nothing but symbol keys
    assertEquals(toJSONSchema(object({ [id]: string() })), { type: "object" });
  });

  await t.step("infers the symbol keys", () => {
    assertType<
      Equals<
        Output<typeof schema>,
        { name: string; [id]: string; [tag]?: number | undefined }
      >
    >();
    assertType<
      Equals<
        Input<typeof schema>,
        { name: string; [id]: string; [tag]?: number | undefined }
      >
    >();
  });

  await t.step("merges symbol keys in allOf and nests in other schemas", () => {
    const merged = allOf([
      object({ [id]: string() }),
      object({ name: string() }),
    ]);
    assertEquals(validate(merged, { [id]: "x", name: "Alice" }), {
      value: { [id]: "x", name: "Alice" },
    });
    const list = array(object({ [id]: string() }));
    assertEquals(
      validate(list, [{ [id]: "x" }, { [id]: 1 }]).issues?.[0].path,
      [
        1,
        id,
      ],
    );
  });
});

Deno.test("shape", async (t) => {
  const closable = shape({
    closed: boolean(),
    close: func(),
    reset: optional(func()),
  });

  class Connection {
    #closed = false;
    get closed() {
      return this.#closed;
    }
    close() {
      this.#closed = true;
    }
  }

  await t.step("accepts objects that have the properties", () => {
    assert(valid(closable, { closed: false, close: () => {} }));
    assert(valid(closable, { closed: true, close() {}, reset() {} }));
  });

  await t.step("returns the very same value", () => {
    const connection = new Connection();
    const result = validate(closable, connection) as { value: unknown };
    assert(result.value === connection);
    assert(result.value instanceof Connection);

    // unknown keys are kept, unlike with object()
    const plain = { closed: false, close() {}, extra: 1 };
    assert((validate(closable, plain) as { value: unknown }).value === plain);
  });

  await t.step("reads inherited members, like methods and getters", () => {
    assert(valid(closable, new Connection()));
    // the prototype chain is walked
    assert(valid(closable, Object.create({ closed: false, close() {} })));
  });

  await t.step("accepts every non-null object", () => {
    class Tagged {
      closed = false;
      close() {}
      get [Symbol.toStringTag]() {
        return "Tagged";
      }
    }
    assert(valid(closable, new Tagged()));
    assert(valid(shape({ length: number() }), []));
    assert(valid(shape({ size: number() }), new Map()));
    assert(valid(shape({}), Object.create(null)));
    // object() is stricter
    assert(!valid(object({ closed: boolean(), close: func() }), new Tagged()));
    assert(!valid(object({ length: number() }), []));
  });

  await t.step("rejects everything that is not an object", () => {
    for (
      const value of [null, undefined, "a", 1, true, Symbol("s"), () => {}]
    ) {
      assert(!valid(closable, value), String(value));
    }
    assertEquals(validate(closable, null), {
      issues: [typeIssue("an object", null, "null")],
    });
    // a function is not an object, even with the properties
    const fn = Object.assign(() => {}, { closed: false, close() {} });
    assert(!valid(closable, fn));
  });

  await t.step("reports every failing property with its key", () => {
    assertEquals(validate(closable, { closed: "no", close: 1 }), {
      issues: [
        typeIssue("a boolean", "no", "string", ["closed"]),
        typeIssue("a function", 1, "number", ["close"]),
      ],
    });
    assertEquals(validate(closable, {}).issues?.length, 2);
    assert(!valid(closable, { closed: false, close() {}, reset: 1 }));
  });

  await t.step("checks symbol keys", () => {
    const schema = shape({ [Symbol.asyncDispose]: func() });
    assert(valid(schema, { async [Symbol.asyncDispose]() {} }));
    assertEquals(validate(schema, {}).issues?.[0].path, [Symbol.asyncDispose]);
  });

  await t.step("ignores what the property schemas output", () => {
    const upper = createSchema("upper", {
      validate: (value) =>
        typeof value === "string"
          ? { value: value.toUpperCase() }
          : { issues: [{ message: "Expected a string" }] },
      jsonSchema: { input: () => ({}), output: () => ({}) },
    });
    const input = { name: "alice" };
    assertEquals(validate(shape({ name: upper }), input), { value: input });
    assertEquals(input.name, "alice");
  });

  await t.step("any non-null object with shape({})", () => {
    assert(valid(shape({}), {}));
    assert(valid(shape({}), []));
    assert(valid(shape({}), new Date()));
    assert(!valid(shape({}), null));
    assert(!valid(shape({}), () => {}));
  });

  await t.step("exports the JSON Schema of an object", () => {
    const expected = {
      type: "object",
      properties: {
        closed: { type: "boolean" },
        close: {},
        reset: {},
      },
      required: ["closed", "close"],
    };
    assertEquals(toJSONSchema(closable, { io: "input" }), expected);
    assertEquals(toJSONSchema(closable), expected);
    assertEquals(
      toJSONSchema(closable),
      toJSONSchema(object({
        closed: boolean(),
        close: func(),
        reset: optional(func()),
      })),
    );
  });

  await t.step("infers the properties, with the input as the output", () => {
    assertType<Equals<Input<typeof closable>, Output<typeof closable>>>();
    assertType<Equals<typeof closable.kind, "shape">>();
    const user = shape({ name: string(), age: optional(integer()) });
    assertType<
      Equals<
        Output<typeof user>,
        { name: string; age?: number | undefined }
      >
    >();
  });

  await t.step("works with async schemas", async () => {
    const pending = shape({ name: asyncString });
    const input = { name: "a" };
    assertEquals(await validateAsync(pending, input), { value: input });
    assertEquals((await validateAsync(pending, { name: 1 })).issues?.[0].path, [
      "name",
    ]);
  });
});

Deno.test("array", async (t) => {
  await t.step("accepts arrays of matching items", () => {
    assertEquals(validate(array(string()), ["a", "b"]), {
      value: ["a", "b"],
    });
    assertEquals(validate(array(string()), []), { value: [] });
  });

  await t.step("reports every failing item with its index", () => {
    assertEquals(validate(array(string()), ["a", 1, null]), {
      issues: [
        typeIssue("a string", 1, "number", [1]),
        typeIssue("a string", null, "null", [2]),
      ],
    });
  });

  await t.step("rejects everything that is not an array", () => {
    for (const value of [{}, "a", null, undefined, 1, { length: 0 }]) {
      assert(!valid(array(string()), value), String(value));
    }
    assertEquals(
      validate(array(string()), {}).issues?.[0].message,
      "Expected an array, received object",
    );
  });

  await t.step("validates holes as undefined", () => {
    // deno-lint-ignore no-sparse-arrays
    assert(!valid(array(string()), ["a", , "b"]));
    // deno-lint-ignore no-sparse-arrays
    assert(valid(array(optional(string())), ["a", , "b"]));
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    const expected = { type: "array", items: { type: "string" } };
    assertEquals(toJSONSchema(array(string()), { io: "input" }), expected);
    assertEquals(toJSONSchema(array(string())), expected);
    const schema = array(string());
    assertType<Equals<typeof schema, Schema<string[], string[], "array">>>();
  });

  await t.step("nests arrays", () => {
    const schema = array(array(integer()));
    assertEquals(validate(schema, [[1], [2, "x"]]).issues?.[0].path, [1, 1]);
    assertType<Equals<Output<typeof schema>, number[][]>>();
  });
});

Deno.test("record", async (t) => {
  const schema = record(integer());

  await t.step("accepts objects with matching values", () => {
    assertEquals(validate(schema, { a: 1, b: 2 }), { value: { a: 1, b: 2 } });
    assertEquals(validate(schema, {}), { value: {} });
  });

  await t.step("reports every failing value with its key", () => {
    assertEquals(validate(schema, { a: 1, b: "2", c: null }), {
      issues: [
        typeIssue("an integer", "2", "string", ["b"]),
        typeIssue("an integer", null, "null", ["c"]),
      ],
    });
  });

  await t.step("accepts only plain objects", () => {
    for (const value of [[], null, undefined, "a", 1, new Date()]) {
      assert(!valid(schema, value), String(value));
    }
  });

  await t.step("is safe against prototype pollution", () => {
    const result = validate(schema, JSON.parse('{"__proto__": 1}')) as {
      value: object;
    };
    assertEquals(Object.getPrototypeOf(result.value), Object.prototype);
    assertEquals(Object.keys(result.value), ["__proto__"]);
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    const expected = {
      type: "object",
      additionalProperties: { type: "integer" },
    };
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
    assertType<
      Equals<
        typeof schema,
        Schema<Record<string, number>, Record<string, number>, "record">
      >
    >();
  });
});

Deno.test("tuple", async (t) => {
  const schema = tuple([string(), float()]);

  await t.step("accepts arrays with an item per schema", () => {
    assertEquals(validate(schema, ["a", 1.5]), { value: ["a", 1.5] });
  });

  await t.step("rejects other lengths", () => {
    assertEquals(validate(schema, ["a"]), {
      issues: [
        issue("length", "Expected an array of 2 items, received 1", 2, 1),
      ],
    });
    assert(!valid(schema, ["a", 1, 2]));
    assert(!valid(schema, []));
    assert(valid(tuple([]), []));
  });

  await t.step("reports every failing item with its index", () => {
    assertEquals(validate(schema, [1, "x"]), {
      issues: [
        typeIssue("a string", 1, "number", [0]),
        typeIssue("a finite number", "x", "string", [1]),
      ],
    });
  });

  await t.step("rejects everything that is not an array", () => {
    for (const value of [{}, "ab", null, undefined]) {
      assert(!valid(schema, value), String(value));
    }
  });

  await t.step("exports its JSON Schema", () => {
    const expected = {
      type: "array",
      prefixItems: [{ type: "string" }, { type: "number" }],
      minItems: 2,
      maxItems: 2,
    };
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
  });

  await t.step("infers a tuple type", () => {
    assertType<
      Equals<
        typeof schema,
        Schema<[string, number], [string, number], "tuple">
      >
    >();
  });
});

Deno.test("anyOf", async (t) => {
  const schema = anyOf([integer(), literal("none")]);

  await t.step("accepts what any schema accepts", () => {
    assertEquals(validate(schema, 1), { value: 1 });
    assertEquals(validate(schema, "none"), { value: "none" });
  });

  await t.step("uses the first schema that accepts the value", () => {
    const order: string[] = [];
    const tracking = (name: string, accepts: boolean) =>
      createSchema(name, {
        validate: (value) => {
          order.push(name);
          return accepts
            ? { value }
            : { issues: [{ message: `${name} rejected` }] };
        },
        jsonSchema: { input: () => ({}), output: () => ({}) },
      });
    const result = validate(
      anyOf([tracking("a", false), tracking("b", true), tracking("c", true)]),
      1,
    );
    assertEquals(result, { value: 1 });
    assertEquals(order, ["a", "b"]);
  });

  await t.step("merges the issues of all schemas when none accepts", () => {
    const result = validate(schema, "other");
    assertEquals(result.issues?.length, 2);
    assertEquals(
      result.issues?.[0].message,
      "Expected an integer, received string",
    );
    assertEquals(
      result.issues?.[1].message,
      'Expected "none", received "other"',
    );
  });

  await t.step("rejects everything when there are no schemas", () => {
    assertEquals<unknown>(validate(anyOf([]), 1), {
      issues: [{
        kind: "anyOf",
        message:
          "Expected input to match one of the schemas, but there are none",
      }],
    });
  });

  await t.step("exports its JSON Schema", () => {
    const expected = {
      anyOf: [{ type: "integer" }, { const: "none" }],
    };
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
  });

  await t.step("infers the union of the schemas", () => {
    assertType<
      Equals<typeof schema, Schema<number | "none", number | "none", "anyOf">>
    >();
    const objects = anyOf([
      object({ type: literal("a"), a: string() }),
      object({ type: literal("b"), b: integer() }),
    ]);
    assertType<
      Equals<
        Output<typeof objects>,
        { type: "a"; a: string } | { type: "b"; b: number }
      >
    >();
  });

  await t.step("works with async schemas", async () => {
    const pending = anyOf([integer(), asyncString]);
    // the sync schema accepts first, so the async one is never reached
    assertEquals(validate(pending, 1), { value: 1 });
    assertEquals(await validateAsync(pending, "a"), { value: "a" });
    assertEquals((await validateAsync(pending, null)).issues?.length, 2);
  });
});

Deno.test("oneOf", async (t) => {
  // a number that is not an integer
  const schema = oneOf([float(), integer()]);

  await t.step("accepts a value that exactly one schema accepts", () => {
    assertEquals(validate(schema, 1.5), { value: 1.5 });
  });

  await t.step("rejects a value that several schemas accept", () => {
    assertEquals(validate(schema, 1), {
      issues: [
        issue(
          "oneOf",
          "Expected input to match exactly one schema, matched 2",
          1,
          2,
        ),
      ],
    });
  });

  await t.step("merges the issues of all schemas when none accepts", () => {
    const result = validate(schema, "x");
    assertEquals(result.issues?.length, 2);
    assertEquals<unknown>(validate(oneOf([]), 1), {
      issues: [{
        kind: "oneOf",
        message: "Expected input to match exactly one schema, matched 0",
      }],
    });
  });

  await t.step("exports its JSON Schema", () => {
    const expected = { oneOf: [{ type: "number" }, { type: "integer" }] };
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
  });

  await t.step("infers the union of the schemas", () => {
    const mixed = oneOf([string(), integer()]);
    assertType<
      Equals<typeof mixed, Schema<string | number, string | number, "oneOf">>
    >();
  });

  await t.step("works with async schemas", async () => {
    const pending = oneOf([asyncString, integer()]);
    assertEquals(await validateAsync(pending, "a"), { value: "a" });
    assertEquals(await validateAsync(pending, 1), { value: 1 });
    assertEquals((await validateAsync(pending, null)).issues?.length, 2);
  });
});

Deno.test("allOf", async (t) => {
  const schema = allOf([
    object({ name: string() }),
    object({ age: integer() }),
  ]);

  await t.step("accepts a value that every schema accepts", () => {
    assertEquals(validate(schema, { name: "Alice", age: 30 }), {
      value: { name: "Alice", age: 30 },
    });
  });

  await t.step("merges the outputs of objects", () => {
    // each object strips the keys of the other, the merge brings them back
    const result = validate(schema, { name: "Alice", age: 30, extra: 1 });
    assertEquals(result, { value: { name: "Alice", age: 30 } });
  });

  await t.step("uses the last output when they are not all objects", () => {
    const upper = createSchema("upper", {
      validate: (value) =>
        typeof value === "string"
          ? { value: value.toUpperCase() }
          : { issues: [{ message: "Expected a string" }] },
      jsonSchema: { input: () => ({}), output: () => ({}) },
    });
    assertEquals(validate(allOf([string(), upper]), "a"), { value: "A" });
    assertEquals(validate(allOf([upper, string()]), "a"), { value: "a" });
  });

  await t.step("passes the value on when there are no schemas", () => {
    assertEquals(validate(allOf([]), 1), { value: 1 });
  });

  await t.step("merges the issues of every failing schema", () => {
    assertEquals(validate(schema, {}), {
      issues: [
        typeIssue("a string", undefined, "undefined", ["name"]),
        typeIssue("an integer", undefined, "undefined", ["age"]),
      ],
    });
  });

  await t.step("exports its JSON Schema", () => {
    const expected = {
      allOf: [
        {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
        },
        {
          type: "object",
          properties: { age: { type: "integer" } },
          required: ["age"],
        },
      ],
    };
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
  });

  await t.step("infers the intersection of the schemas", () => {
    assertType<
      Equals<
        Output<typeof schema>,
        { name: string } & { age: number }
      >
    >();
  });

  await t.step("works with async schemas", async () => {
    const pending = allOf([asyncString, string()]);
    assertEquals(await validateAsync(pending, "a"), { value: "a" });
    assertEquals((await validateAsync(pending, 1)).issues?.length, 2);
  });
});

Deno.test("not", async (t) => {
  const schema = not(string());

  await t.step("accepts what the schema rejects, unchanged", () => {
    assertEquals(validate(schema, 1), { value: 1 });
    const value = { a: 1 };
    assertEquals(validate(schema, value), { value });
  });

  await t.step("rejects what the schema accepts", () => {
    assertEquals<unknown>(validate(schema, "a"), {
      issues: [{
        kind: "not",
        message: "Expected input not to match the schema",
        actual: "a",
      }],
    });
  });

  await t.step("exports its JSON Schema and infers its types", () => {
    const expected = { not: { type: "string" } };
    assertEquals(toJSONSchema(schema, { io: "input" }), expected);
    assertEquals(toJSONSchema(schema), expected);
    assertType<Equals<typeof schema, Schema<unknown, unknown, "not">>>();
  });

  await t.step("works with async schemas", async () => {
    const pending = not(asyncString);
    assertEquals(await validateAsync(pending, 1), { value: 1 });
    assertEquals((await validateAsync(pending, "a")).issues?.length, 1);
  });
});

Deno.test("lazy", async (t) => {
  interface Category {
    name: string;
    children: Category[];
  }

  const category: Schema<Category> = object({
    name: string(),
    children: array(lazy(() => category)),
  });

  await t.step("validates recursive structures", () => {
    const tree = {
      name: "a",
      children: [{ name: "b", children: [{ name: "c", children: [] }] }],
    };
    assertEquals(validate(category, tree), { value: tree });
  });

  await t.step("reports issues deep in the structure", () => {
    assertEquals(
      validate(category, {
        name: "a",
        children: [{ name: "b", children: [{ name: 1, children: [] }] }],
      }).issues?.[0].path,
      ["children", 0, "children", 0, "name"],
    );
  });

  await t.step("resolves the schema once, on first use", () => {
    let calls = 0;
    const schema = lazy(() => {
      calls++;
      return string();
    });
    assertEquals(calls, 0);
    validate(schema, "a");
    validate(schema, "b");
    assertEquals(calls, 1);
  });

  await t.step("exports a recursive schema with an anchor and a ref", () => {
    const expected = {
      type: "object",
      properties: {
        name: { type: "string" },
        children: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              children: {
                type: "array",
                items: { $ref: "#lazy1" },
              },
            },
            required: ["name", "children"],
            $anchor: "lazy1",
          },
        },
      },
      required: ["name", "children"],
    };
    const json = toJSONSchema(category, { io: "input" });
    // the anchor is named after the lazy schema, whatever its number is
    const anchor = (json as unknown as {
      properties: { children: { items: { $anchor: string } } };
    }).properties.children.items.$anchor;
    assert(/^lazy\d+$/.test(anchor));
    assertEquals(
      JSON.parse(JSON.stringify(json).replaceAll(anchor, "lazy1")),
      expected,
    );
    assertEquals(toJSONSchema(category), json);
  });

  await t.step("only adds an anchor where the schema is referenced", () => {
    const flat = lazy(() => string());
    assertEquals(toJSONSchema(flat), { type: "string" });
    assertEquals(toJSONSchema(object({ a: flat, b: flat })), {
      type: "object",
      properties: { a: { type: "string" }, b: { type: "string" } },
      required: ["a", "b"],
    });
  });

  await t.step("can convert again with the same options", () => {
    const options = { target: "draft-2020-12" } as const;
    const first = category["~standard"].jsonSchema.input(options);
    const second = category["~standard"].jsonSchema.input(options);
    assertEquals(first, second);
  });

  await t.step("infers the types of the schema", () => {
    const schema = lazy(() => string());
    assertType<Equals<typeof schema, Schema<string, string, "lazy">>>();
  });

  await t.step("works with async schemas", async () => {
    const pending = lazy(() => asyncString);
    assertEquals(await validateAsync(pending, "a"), { value: "a" });
  });
});

Deno.test("composites nest sync and async schemas", async (t) => {
  await t.step("stay synchronous when every nested schema is", () => {
    const schema = object({
      list: array(anyOf([string(), integer()])),
      map: record(tuple([string()])),
      tag: nullable(enumerator(["a", "b"])),
    });
    assert(
      !(validateAsync(schema, { list: [], map: {}, tag: null }) instanceof
        Promise),
    );
  });

  await t.step("export JSON Schema without running async validation", () => {
    const expected = { type: "array", items: { type: "string" } };
    assertEquals(toJSONSchema(array(asyncString), { io: "input" }), expected);
    assertEquals(toJSONSchema(array(asyncString)), expected);
  });

  await t.step("become async when a nested schema is", async () => {
    const schema = object({
      names: array(asyncString),
      tuple: tuple([asyncString, integer()]),
      map: record(asyncString),
    });
    const input = {
      names: ["a"],
      tuple: ["b", 1] as [string, number],
      map: { k: "c" },
    };
    const pending = validateAsync(schema, input);
    assert(pending instanceof Promise);
    assertEquals(await pending, { value: input });
    assertEquals(
      (await validateAsync(schema, { names: [1], tuple: ["b", 1], map: {} }))
        .issues?.[0].path,
      ["names", 0],
    );
  });
});

Deno.test("composites pass the validate options on to nested schemas", async (t) => {
  const options = { libraryOptions: { strict: true } };

  /** A schema that records the options it is validated with. */
  function recording(received: unknown[]) {
    return createSchema("recording", {
      validate: (value, validateOptions) => {
        received.push(validateOptions);
        return { value };
      },
      jsonSchema: { input: () => ({}), output: () => ({}) },
    });
  }

  const cases: Record<
    string,
    (inner: ReturnType<typeof recording>) => {
      schema: StandardSchemaV1;
      input: unknown;
      calls: number;
    }
  > = {
    object: (inner) => ({
      schema: object({ a: inner, b: inner }),
      input: { a: 1, b: 2 },
      calls: 2,
    }),
    array: (inner) => ({ schema: array(inner), input: [1, 2], calls: 2 }),
    record: (inner) => ({
      schema: record(inner),
      input: { a: 1, b: 2 },
      calls: 2,
    }),
    tuple: (inner) => ({
      schema: tuple([inner, inner]),
      input: [1, 2],
      calls: 2,
    }),
    anyOf: (inner) => ({ schema: anyOf([inner]), input: 1, calls: 1 }),
    oneOf: (inner) => ({ schema: oneOf([inner]), input: 1, calls: 1 }),
    allOf: (inner) => ({ schema: allOf([inner, inner]), input: 1, calls: 2 }),
    not: (inner) => ({ schema: not(inner), input: 1, calls: 1 }),
    lazy: (inner) => ({ schema: lazy(() => inner), input: 1, calls: 1 }),
  };

  for (const [name, build] of Object.entries(cases)) {
    await t.step(name, () => {
      const received: unknown[] = [];
      const { schema, input, calls } = build(recording(received));
      validate(schema, input, options);
      assertEquals(received.length, calls);
      for (const seen of received) assertEquals(seen, options);
    });
  }
});
