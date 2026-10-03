import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  isStandardJSONSchemaV1,
  isStandardSchemaV1,
  parse,
  parseAsync,
  stringify,
  toJSONSchema,
  validate,
  validateAsync,
} from "./utils.ts";
import { z } from "@zod/zod";
import { createSchema } from "./core.ts";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertNotInstanceOf,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { SchemaError } from "@standard-schema/utils";

const TestSchemaSync: StandardSchemaV1<boolean, boolean> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: (value: unknown) =>
      value ? ({ value: !!value }) : { issues: [{ message: "test" }] },
  },
};

const TestSchemaAsync: StandardSchemaV1<boolean, boolean> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: (
      value: unknown,
    ) => (Promise.resolve(
      value ? ({ value: !!value }) : { issues: [{ message: "test" }] },
    )),
  },
};

Deno.test("validateAsync", async (t) => {
  await t.step("can validate sync", () => {
    const result = validateAsync(TestSchemaSync, true);
    assertNotInstanceOf(result, Promise);
    assertEquals(result, { value: true });
  });

  await t.step("can validate async", async () => {
    let result = validateAsync(TestSchemaAsync, true);
    assertInstanceOf(result, Promise);
    result = await result;
    assertEquals(result, { value: true });
  });

  await t.step("validate with issues", async () => {
    const result = await validateAsync(TestSchemaAsync, false);
    assertEquals(result, { issues: [{ message: "test" }] });
  });
});

Deno.test("validate", async (t) => {
  await t.step("can validate sync", () => {
    const result = validate(TestSchemaSync, true);
    assertNotInstanceOf(result, Promise);
    assertEquals(result, { value: true });
  });

  await t.step("can not validate async", () => {
    assertThrows(
      () => {
        validate(TestSchemaAsync, true);
      },
      TypeError,
      "Schema validation must be synchronous",
    );
  });

  await t.step("validate with issues", () => {
    const result = validate(TestSchemaSync, false);
    assertEquals(result, { issues: [{ message: "test" }] });
  });
});

Deno.test("parseAsync", async (t) => {
  await t.step("can parse sync", async () => {
    const result = parseAsync(TestSchemaSync, true);
    assertInstanceOf(result, Promise);
    const awaitedResult = await result;
    assert(awaitedResult);
  });

  await t.step("can parse async", async () => {
    const result = parseAsync(TestSchemaAsync, true);
    assertInstanceOf(result, Promise);
    const awaitedResult = await result;
    assert(awaitedResult);
  });

  await t.step("parse with issues", async () => {
    await assertRejects(
      async () => {
        await parseAsync(TestSchemaAsync, false);
      },
      SchemaError,
      "test",
    );
  });
});

Deno.test("parse", async (t) => {
  await t.step("can parse sync", () => {
    const result = parse(TestSchemaSync, true);
    assertNotInstanceOf(result, Promise);
    assertEquals(result, true);
  });

  await t.step("can not parse async", () => {
    assertThrows(
      () => {
        parse(TestSchemaAsync, true);
      },
      TypeError,
      "Schema validation must be synchronous",
    );
  });

  await t.step("parse with issues", () => {
    assertThrows(
      () => {
        parse(TestSchemaSync, false);
      },
      SchemaError,
      "test",
    );
  });
});

Deno.test("toJSONSchema", async (t) => {
  // accepts a string, produces its length
  const length = createSchema("length", {
    validate: (value) =>
      typeof value === "string"
        ? { value: value.length }
        : { issues: [{ message: "Expected a string" }] },
    jsonSchema: {
      input: (options) => ({ type: "string", options }),
      output: (options) => ({ type: "integer", options }),
    },
  });

  // a Standard Schema without Standard JSON Schema support
  const plain: StandardSchemaV1<number, number> = {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => ({ value: value as number }),
    },
  };

  await t.step("defaults to the output and draft 2020-12", () => {
    assertEquals(toJSONSchema(length), {
      type: "integer",
      options: { target: "draft-2020-12", libraryOptions: undefined },
    });
  });

  await t.step("gets the input with `io: input`", () => {
    assertEquals(toJSONSchema(length, { io: "input" }), {
      type: "string",
      options: { target: "draft-2020-12", libraryOptions: undefined },
    });
    assertEquals(toJSONSchema(length, { io: "output" }).type, "integer");
  });

  await t.step("passes the target and the library options on", () => {
    assertEquals(
      toJSONSchema(length, {
        io: "input",
        target: "draft-07",
        libraryOptions: { strict: true },
      }),
      {
        type: "string",
        options: { target: "draft-07", libraryOptions: { strict: true } },
      },
    );
  });

  await t.step("throws for a schema without JSON Schema support", () => {
    assertThrows(
      // deno-lint-ignore no-explicit-any
      () => toJSONSchema(plain as any),
      TypeError,
      "Schema does not implement Standard JSON Schema",
    );
    assertThrows(
      // deno-lint-ignore no-explicit-any
      () => toJSONSchema(undefined as any),
      TypeError,
      "Schema does not implement Standard JSON Schema",
    );
    assertThrows(
      // deno-lint-ignore no-explicit-any
      () => toJSONSchema({ "~standard": { jsonSchema: {} } } as any),
      TypeError,
    );
    // silent: false is the default
    assertThrows(
      // deno-lint-ignore no-explicit-any
      () => toJSONSchema(plain as any, { silent: false }),
      TypeError,
    );
  });

  await t.step("returns undefined when silent", () => {
    assertEquals(toJSONSchema(plain, { silent: true }), undefined);
    assertEquals(toJSONSchema(undefined, { silent: true }), undefined);
    assertEquals(
      toJSONSchema("string", { silent: true, io: "input" }),
      undefined,
    );
    // schemas with support still convert
    assertEquals(toJSONSchema(length, { silent: true })?.type, "integer");
  });

  await t.step("does not silence errors of the schema's own converter", () => {
    const failing = createSchema("failing", {
      validate: (value) => ({ value }),
      jsonSchema: {
        input: () => {
          throw new TypeError("Unsupported target");
        },
        output: () => {
          throw new TypeError("Unsupported target");
        },
      },
    });
    assertThrows(
      () => toJSONSchema(failing, { silent: true }),
      TypeError,
      "Unsupported target",
    );
  });
});

Deno.test("stringify", async (t) => {
  await t.step("converts primitives", () => {
    assertEquals(stringify("hello"), "hello");
    assertEquals(stringify(42), "42");
    assertEquals(stringify(10n), "10");
    assertEquals(stringify(true), "true");
    assertEquals(stringify(Symbol("s")), "Symbol(s)");
    assertEquals(stringify(null), "null");
  });

  await t.step("always returns a string for undefined", () => {
    assertEquals(stringify(undefined), "undefined");
    assertEquals(typeof stringify(undefined), "string");
  });

  await t.step("converts functions and objects", () => {
    function named() {}
    assertEquals(stringify(named), "[Function named]");
    assertEquals(stringify(() => {}), "[Function ]");
    assertEquals(stringify({ key: "value" }), '{"key":"value"}');
    assertEquals(stringify([1, "a"]), '[1,"a"]');
  });

  await t.step("does not throw for values that cannot be serialized", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assertEquals(stringify(circular), "[object Object]");
    assertEquals(stringify({ n: 1n }), "[object Object]");
    // `toJSON()` results without a JSON form
    assertEquals(stringify({ toJSON: () => undefined }), "[object Object]");
  });
});

Deno.test("isStandardSchemaV1", async (t) => {
  await t.step("accepts version 1 schemas with a validate function", () => {
    assert(isStandardSchemaV1(TestSchemaSync));
    assert(isStandardSchemaV1(z.string()));
  });

  await t.step("rejects everything else", () => {
    assert(!isStandardSchemaV1(undefined));
    assert(!isStandardSchemaV1(null));
    assert(!isStandardSchemaV1("string"));
    assert(!isStandardSchemaV1({}));
    assert(!isStandardSchemaV1({ "~standard": {} }));
    assert(!isStandardSchemaV1({ "~standard": { version: 1 } }));
    assert(
      !isStandardSchemaV1({ "~standard": { version: 2, validate() {} } }),
    );
    assert(
      !isStandardSchemaV1({
        "~standard": { version: 1, validate: "not a function" },
      }),
    );
  });
});

Deno.test("isStandardJSONSchemaV1", async (t) => {
  const converters = { input: () => ({}), output: () => ({}) };

  await t.step("accepts version 1 schemas with both converters", () => {
    assert(
      isStandardJSONSchemaV1({
        "~standard": { version: 1, jsonSchema: converters },
      }),
    );
  });

  await t.step("rejects everything else", () => {
    assert(!isStandardJSONSchemaV1(undefined));
    assert(!isStandardJSONSchemaV1({}));
    assert(!isStandardJSONSchemaV1(TestSchemaSync));
    assert(!isStandardJSONSchemaV1({ "~standard": { version: 1 } }));
    assert(
      !isStandardJSONSchemaV1({
        "~standard": { version: 1, jsonSchema: { input: converters.input } },
      }),
    );
    assert(
      !isStandardJSONSchemaV1({
        "~standard": { version: 2, jsonSchema: converters },
      }),
    );
  });
});

Deno.test("validate with an invalid schema", async (t) => {
  const message = "The input is not a valid StandardSchema";

  await t.step("reports an issue instead of throwing", () => {
    for (const schema of [undefined, null, {}, "string", 1]) {
      // deno-lint-ignore no-explicit-any
      assertEquals(validate(schema as any, true), { issues: [{ message }] });
    }
  });

  await t.step("rejects a schema with an unsupported version", () => {
    const v2 = { "~standard": { version: 2, validate: () => ({ value: 1 }) } };
    // deno-lint-ignore no-explicit-any
    assertEquals(validate(v2 as any, true), { issues: [{ message }] });
  });

  await t.step("handles boolean schemas", () => {
    assertEquals(validate(true, "any"), { value: "any" });
    assertEquals(validate(false, undefined), {
      issues: [{
        message:
          "Schema defines the property as false, this will always fail: undefined",
      }],
    });
    // circular input must not break the message
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    assertEquals(validate(false, circular).issues?.length, 1);
  });
});

Deno.test("works with other Standard Schema libraries (zod)", async (t) => {
  const schema = z.object({ name: z.string() });

  await t.step("validate", () => {
    assertEquals(validate(schema, { name: "Alice" }), {
      value: { name: "Alice" },
    });
    assertEquals(validate(schema, { name: 1 }).issues?.[0].path, ["name"]);
  });

  await t.step("validateAsync and parseAsync", async () => {
    assertEquals(await validateAsync(schema, { name: "Alice" }), {
      value: { name: "Alice" },
    });
    assertEquals(await parseAsync(schema, { name: "Alice" }), {
      name: "Alice",
    });
    await assertRejects(() => parseAsync(schema, { name: 1 }), SchemaError);
  });

  await t.step("parse", () => {
    assertEquals(parse(schema, { name: "Alice" }), { name: "Alice" });
    assertThrows(() => parse(schema, { name: 1 }), SchemaError);
  });
});
