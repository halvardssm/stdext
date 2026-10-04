import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  arrayIssues,
  canonicalJSON,
  checkCounts,
  checkNumberConstraints,
  codePointLength,
  compileStringConstraints,
  containsIssues,
  isMultipleOf,
  numberIssues,
  patternSource,
  pick,
  propertyCountIssues,
  stringIssues,
} from "./constraints.ts";

Deno.test("codePointLength", () => {
  assertEquals(codePointLength(""), 0);
  assertEquals(codePointLength("abc"), 3);
  assertEquals(codePointLength("🙂"), 1);
  assertEquals(codePointLength("a🙂b"), 3);
  assertEquals("🙂".length, 2);
});

Deno.test("isMultipleOf", () => {
  assert(isMultipleOf(10, 5));
  assert(isMultipleOf(0, 5));
  assert(isMultipleOf(-15, 5));
  assert(!isMultipleOf(7, 5));
  // binary floating point error is tolerated
  assert(isMultipleOf(0.3, 0.1));
  assert(isMultipleOf(1.37, 0.01));
  assert(isMultipleOf(1e20, 7) === isMultipleOf(1e20, 7));
  assert(!isMultipleOf(0.35, 0.1));
  assert(!isMultipleOf(1, 0));
  assert(!isMultipleOf(Infinity, 1));
});

Deno.test("canonicalJSON", () => {
  assertEquals(
    canonicalJSON({ b: [1, { d: 1, c: 2 }], a: 1 }),
    canonicalJSON({ a: 1, b: [1, { c: 2, d: 1 }] }),
  );
  assertEquals(canonicalJSON([1, "1", null, true]), '[1,"1",null,true]');
  assertEquals(canonicalJSON(undefined), "undefined");
  assertEquals(canonicalJSON(-0), "0");
  assertEquals(canonicalJSON(1), canonicalJSON(1.0));
  assert(canonicalJSON(1) !== canonicalJSON("1"));
  assertEquals(canonicalJSON(Symbol.for("a")), "Symbol(a)");
  assertEquals(canonicalJSON([1n, 1]), "[1n,1]");
  const cyclic: Record<string, unknown> = { a: 1 };
  cyclic.self = cyclic;
  assertEquals(canonicalJSON(cyclic), '{"a":1,"self":[Circular]}');
  // the same object twice is not a cycle
  const shared = { a: 1 };
  assertEquals(canonicalJSON([shared, shared]), '[{"a":1},{"a":1}]');
});

Deno.test("pick", () => {
  assertEquals(pick({ a: 1, b: undefined, c: 3 }, ["a", "b"]), { a: 1 });
  assertEquals(pick({ a: 0, b: false, c: "" }, ["a", "b", "c"]), {
    a: 0,
    b: false,
    c: "",
  });
  assertEquals(pick({}, []), {});
});

Deno.test("checkCounts", () => {
  checkCounts("min", undefined, "max", undefined);
  checkCounts("min", 0, "max", 0);
  checkCounts("min", 1, "max", undefined);
  assertThrows(() => checkCounts("min", -1, "max", 2), TypeError, "min");
  assertThrows(() => checkCounts("min", 1, "max", 1.5), TypeError, "max");
  assertThrows(() => checkCounts("min", NaN, "max", 1), TypeError, "min");
  assertThrows(
    () => checkCounts("min", 3, "max", 2),
    TypeError,
    "min (3) must not be greater than max (2)",
  );
});

Deno.test("compileStringConstraints and patternSource", () => {
  assertEquals(compileStringConstraints({}), undefined);
  assertEquals(compileStringConstraints({ pattern: "^a" })?.test("ab"), true);
  assertEquals(compileStringConstraints({ pattern: /^a/ })?.test("ba"), false);
  assertEquals(patternSource("^a"), "^a");
  assertEquals(patternSource(/a\/b/), "a\\/b");
  assertThrows(
    () => compileStringConstraints({ pattern: /a/g }),
    TypeError,
    "flags (g)",
  );
});

Deno.test("stringIssues", () => {
  assertEquals(stringIssues("ab", { minLength: 1 }, undefined), []);
  const issues = stringIssues("x", { minLength: 2, maxLength: 0 }, /^a/, "m");
  assertEquals(issues.map((issue) => issue.kind), [
    "minLength",
    "maxLength",
    "pattern",
  ]);
  // the message replaces every message
  assertEquals(issues.map((issue) => issue.message), ["m", "m", "m"]);
});

Deno.test("checkNumberConstraints and numberIssues", () => {
  checkNumberConstraints({});
  checkNumberConstraints({ minimum: 1, maximum: 1 });
  assertEquals(numberIssues(5, { minimum: 1, maximum: 9 }), []);
  assertEquals(
    numberIssues(0, { minimum: 1, exclusiveMaximum: 0 }, "m").map((i) =>
      i.message
    ),
    ["m", "m"],
  );
  assertThrows(() => checkNumberConstraints({ minimum: -Infinity }), TypeError);
  // only the number constraints are looked at, whatever else the options hold
  checkNumberConstraints(
    { minimum: 1, title: "A title", message: "A message" } as never,
  );
});

Deno.test("arrayIssues", () => {
  assertEquals(arrayIssues([1, 2], { minItems: 1, maxItems: 2 }), []);
  assertEquals(
    arrayIssues([1], { minItems: 2 }).map((issue) => issue.kind),
    ["minItems"],
  );
  assertEquals(
    arrayIssues([1, 2, 3], { maxItems: 2 }).map((issue) => issue.kind),
    ["maxItems"],
  );

  // uniqueItems compares by JSON value, ignoring the order of keys
  assertEquals(arrayIssues([1, 2, 3], { uniqueItems: true }), []);
  const duplicates = arrayIssues(
    [{ a: 1, b: 2 }, 5, { b: 2, a: 1 }, 5, 5],
    { uniqueItems: true },
  );
  assertEquals(duplicates.map((issue) => issue.actual), [[0, 2], [1, 3, 4]]);
  assertEquals(
    duplicates[0].message,
    "Expected unique items, found duplicates at indexes 0, 2",
  );
  assertEquals(arrayIssues([1, "1", true], { uniqueItems: true }), []);
  assertEquals(arrayIssues([1, 1.0], { uniqueItems: true }).length, 1);
  assertEquals(arrayIssues([1, 1], {}), []);
});

Deno.test("containsIssues", () => {
  assertEquals(containsIssues(1, undefined, undefined), []);
  assertEquals(containsIssues(0, undefined, undefined)[0].kind, "minContains");
  assertEquals(containsIssues(0, 0, undefined), []);
  assertEquals(containsIssues(1, 2, undefined)[0].expected, 2);
  assertEquals(containsIssues(3, 1, 2)[0].kind, "maxContains");
  assertEquals(
    containsIssues(0, 1, undefined, "m")[0].message,
    "m",
  );
});

Deno.test("propertyCountIssues", () => {
  assertEquals(
    propertyCountIssues(1, { minProperties: 1, maxProperties: 1 }),
    [],
  );
  assertEquals(
    propertyCountIssues(0, { minProperties: 1 })[0].message,
    "Expected an object with at least 1 property, received 0",
  );
  assertEquals(
    propertyCountIssues(3, { maxProperties: 2 })[0].message,
    "Expected an object with at most 2 properties, received 3",
  );
  assertEquals(
    propertyCountIssues(1, { minProperties: 2 })[0].message,
    "Expected an object with at least 2 properties, received 1",
  );
  assertEquals(
    propertyCountIssues(2, { maxProperties: 1 }, "m")[0].message,
    "m",
  );
});
