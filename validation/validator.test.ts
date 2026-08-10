import type { StandardSchemaV1 } from "@standard-schema/spec";
import { parse, parseAsync, validate, validateAsync } from "./validator.ts";
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
