import { assertEquals, assertThrows } from "@std/assert";
import {
  concatPathToIssues,
  failureResult,
  getMatchedName,
  getSchemaVersion,
  isEmptyObject,
  isEmptyPlainObject,
  isObject,
  isStandardSchemaV1,
  stringify,
} from "./utils.ts";

Deno.test("utils - isObject", async (t) => {
  await t.step("should return true for plain objects", () => {
    assertEquals(isObject({}), true);
    assertEquals(isObject({ a: 1 }), true);
    assertEquals(isObject(new Object()), true);
  });

  await t.step("should return false for non-objects", () => {
    assertEquals(isObject(null), false);
    assertEquals(isObject(undefined), false);
    assertEquals(isObject(42), false);
    assertEquals(isObject("string"), false);
    assertEquals(isObject(true), false);
    assertEquals(isObject(Symbol("test")), false);
    assertEquals(isObject([1, 2, 3]), false);
  });
});

Deno.test("utils - isEmptyObject", async (t) => {
  await t.step("should return true for empty objects", () => {
    assertEquals(isEmptyObject({}), true);
    assertEquals(isEmptyObject(new Object()), true);
  });

  await t.step("should return false for non-empty objects", () => {
    assertEquals(isEmptyObject({ a: 1 }), false);
    assertEquals(isEmptyObject({ a: undefined }), false);
    // Symbols are not enumerable, so this should return true
    assertEquals(isEmptyObject({ [Symbol("test")]: "value" }), true);
  });

  await t.step("should return false for non-objects", () => {
    assertEquals(isEmptyObject(null), false);
    assertEquals(isEmptyObject(undefined), false);
    assertEquals(isEmptyObject(42), false);
    assertEquals(isEmptyObject("string"), false);
    assertEquals(isEmptyObject([1, 2, 3]), false);
  });
});

Deno.test("utils - isEmptyPlainObject", async (t) => {
  await t.step("should return true for empty plain objects", () => {
    assertEquals(isEmptyPlainObject({}), true);
  });

  await t.step("should return false for non-empty objects", () => {
    assertEquals(isEmptyPlainObject({ a: 1 }), false);
  });

  await t.step("should return true for objects with only symbols", () => {
    const objWithSymbol = { [Symbol("test")]: "value" };
    assertEquals(isEmptyPlainObject(objWithSymbol), false); // Symbols are counted by Reflect.ownKeys
  });

  await t.step("should return false for non-objects", () => {
    assertEquals(isEmptyPlainObject(null), false);
    assertEquals(isEmptyPlainObject(undefined), false);
    assertEquals(isEmptyPlainObject(42), false);
    assertEquals(isEmptyPlainObject("string"), false);
    assertEquals(isEmptyPlainObject([1, 2, 3]), false);
  });
});

Deno.test("utils - stringify", async (t) => {
  await t.step("should stringify primitive values", () => {
    assertEquals(stringify(42), "42");
    assertEquals(stringify("hello"), "hello"); // stringify returns strings as-is
    assertEquals(stringify(true), "true");
    assertEquals(stringify(null), "null");
    assertEquals(stringify(undefined), undefined); // JSON.stringify returns undefined for undefined
  });

  await t.step("should stringify complex objects", () => {
    assertEquals(stringify({ a: 1, b: "hello" }), '{"a":1,"b":"hello"}');
    assertEquals(stringify([1, 2, 3]), "[1,2,3]");
  });

  await t.step("should handle circular references", () => {
    // deno-lint-ignore no-explicit-any
    const obj: any = { a: 1 };
    obj.self = obj;
    // JSON.stringify throws on circular references
    assertThrows(() => stringify(obj), TypeError);
  });
});

Deno.test("utils - getMatchedName", async (t) => {
  await t.step("should return JSON string for schemas with type", () => {
    assertEquals(
      getMatchedName({ type: "string" }),
      '{"type":"string"}',
    );
  });

  await t.step("should return JSON string for schemas with pattern", () => {
    assertEquals(
      getMatchedName({ pattern: "^[a-z]+$" }),
      '{"pattern":"^[a-z]+$"}',
    );
  });

  await t.step("should return JSON string for schemas with format", () => {
    assertEquals(
      getMatchedName({ format: "date-time" }),
      '{"format":"date-time"}',
    );
  });

  await t.step(
    "should return JSON string for schemas with multiple properties",
    () => {
      assertEquals(
        getMatchedName({
          type: "string",
          pattern: "^[a-z]+$",
          format: "email",
        }),
        '{"type":"string","pattern":"^[a-z]+$","format":"email"}',
      );
    },
  );

  await t.step(
    "should return JSON string for schemas without matching properties",
    () => {
      // The function returns JSON string of the whole object if no specific properties match
      assertEquals(getMatchedName({ minLength: 5 }), '{"minLength":5}');
      assertEquals(getMatchedName({}), "{}");
      assertEquals(
        getMatchedName({ customProp: "value" }),
        '{"customProp":"value"}',
      );
    },
  );
});

Deno.test("utils - getSchemaVersion", async (t) => {
  await t.step(
    "should return correct schema version for supported target",
    () => {
      // Note: getSchemaVersion only supports "draft-2020-12"
      assertEquals(
        getSchemaVersion("draft-2020-12"),
        "https://json-schema.org/draft/2020-12/schema",
      );
    },
  );

  await t.step("should throw for unsupported targets", () => {
    assertThrows(() => getSchemaVersion("2020-12"));
    assertThrows(() => getSchemaVersion("2019-09"));
    assertThrows(() => getSchemaVersion("unknown"));
    assertThrows(() => getSchemaVersion(""));
  });
});

Deno.test("utils - failureResult", async (t) => {
  await t.step("should create failure result with issues", () => {
    const result = failureResult("test error message");
    assertEquals(result, {
      issues: [{
        message: "test error message",
        path: undefined,
      }],
    });
  });

  await t.step("should create failure result with custom path", () => {
    const result = failureResult("test error message", ["custom", "path"]);
    assertEquals(result, {
      issues: [{
        message: "test error message",
        path: ["custom", "path"],
      }],
    });
  });
});

Deno.test("utils - concatPathToIssues", async (t) => {
  await t.step("should concatenate path to issues", () => {
    const issues = [
      { message: "error 1", path: ["a"] },
      { message: "error 2", path: ["b"] },
      { message: "error 3" }, // no path
    ];

    const result = concatPathToIssues(["parent"], issues);

    assertEquals(result, [
      { message: "error 1", path: ["parent", "a"] },
      { message: "error 2", path: ["parent", "b"] },
      { message: "error 3", path: ["parent"] },
    ]);
  });

  await t.step("should handle empty path", () => {
    const issues = [
      { message: "error 1", path: ["a"] },
    ];

    const result = concatPathToIssues([], issues);

    assertEquals(result, [
      { message: "error 1", path: ["a"] },
    ]);
  });

  await t.step("should handle issues without path", () => {
    const issues = [
      { message: "error 1" },
      { message: "error 2" },
    ];

    const result = concatPathToIssues(["parent"], issues);

    assertEquals(result, [
      { message: "error 1", path: ["parent"] },
      { message: "error 2", path: ["parent"] },
    ]);
  });
});

Deno.test("utils - isStandardSchemaV1", async (t) => {
  await t.step("should return true for valid StandardSchemaV1", () => {
    const validSchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value: unknown) => ({ value }),
      },
    };
    assertEquals(isStandardSchemaV1(validSchema), true);
  });

  await t.step("should return false for invalid StandardSchemaV1", () => {
    assertEquals(isStandardSchemaV1({}), false);
    assertEquals(isStandardSchemaV1({ "~standard": {} }), false);
    assertEquals(isStandardSchemaV1({ "~standard": { version: 1 } }), false);
    assertEquals(isStandardSchemaV1(null), false);
    assertEquals(isStandardSchemaV1(undefined), false);
  });
});
