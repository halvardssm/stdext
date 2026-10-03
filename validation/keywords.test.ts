import { assert, assertEquals } from "@std/assert";
import {
  checkConst,
  checkEnum,
  checkExclusiveMaximum,
  checkExclusiveMinimum,
  checkFormat,
  checkMaxContains,
  checkMaximum,
  checkMaxItems,
  checkMaxLength,
  checkMaxProperties,
  checkMinContains,
  checkMinimum,
  checkMinItems,
  checkMinLength,
  checkMinProperties,
  checkMultipleOf,
  checkPattern,
  checkUniqueItems,
  invalidTypeIssue,
  isSupportedFormat,
  missingPropertyIssue,
  msg,
} from "./keywords.ts";

Deno.test("keyword checks return undefined when valid and a typed issue otherwise", () => {
  const cases: Array<[string, () => unknown, () => unknown]> = [
    ["multipleOf", () => checkMultipleOf(4, 2), () => checkMultipleOf(3, 2)],
    ["minimum", () => checkMinimum(2, 2), () => checkMinimum(1, 2)],
    ["maximum", () => checkMaximum(2, 2), () => checkMaximum(3, 2)],
    [
      "exclusiveMinimum",
      () => checkExclusiveMinimum(3, 2),
      () => checkExclusiveMinimum(2, 2),
    ],
    [
      "exclusiveMaximum",
      () => checkExclusiveMaximum(1, 2),
      () => checkExclusiveMaximum(2, 2),
    ],
    ["minLength", () => checkMinLength("ab", 2), () => checkMinLength("a", 2)],
    [
      "maxLength",
      () => checkMaxLength("ab", 2),
      () => checkMaxLength("abc", 2),
    ],
    [
      "pattern",
      () => checkPattern("abc", "^a"),
      () => checkPattern("xbc", "^a"),
    ],
    [
      "format",
      () => checkFormat("a@b.co", "email"),
      () => checkFormat("x", "email"),
    ],
    ["minItems", () => checkMinItems(2, 2), () => checkMinItems(1, 2)],
    ["maxItems", () => checkMaxItems(2, 2), () => checkMaxItems(3, 2)],
    [
      "minContains",
      () => checkMinContains(1, undefined, {}),
      () => checkMinContains(0, undefined, {}),
    ],
    [
      "maxContains",
      () => checkMaxContains(1, 1, {}),
      () => checkMaxContains(2, 1, {}),
    ],
    [
      "minProperties",
      () => checkMinProperties(1, 1),
      () => checkMinProperties(0, 1),
    ],
    [
      "maxProperties",
      () => checkMaxProperties(1, 1),
      () => checkMaxProperties(2, 1),
    ],
    ["const", () => checkConst({ a: 1 }, { a: 1 }), () => checkConst(1, 2)],
    ["enum", () => checkEnum(1, [1, 2]), () => checkEnum(3, [1, 2])],
  ];
  for (const [kind, valid, invalid] of cases) {
    assertEquals(valid(), undefined, kind);
    const issue = invalid() as { kind: string; message: string };
    assertEquals(issue.kind, kind);
    assert(issue.message.startsWith("Expected input"), kind);
  }
});

Deno.test("pattern shortcuts and formats", () => {
  assertEquals(checkPattern("x", ""), undefined);
  assertEquals(checkPattern("(", "("), undefined);
  assert(isSupportedFormat("uuid"));
  assert(!isSupportedFormat("toString"));
  assert(checkFormat("x", "nope"));
});

Deno.test("duplicates, type and missing property issues", () => {
  assertEquals(checkUniqueItems([1, 2, 1, 1, "a", "a"]).length, 2);
  assertEquals(checkUniqueItems([1, 2]), []);
  assertEquals(invalidTypeIssue("string", 1).kind, "type");
  assertEquals(missingPropertyIssue("a").kind, "required");
  assertEquals(msg.invalidValue("a", "b"), "Expected input to be a, was b");
  assert(msg.propertyFalse(1).includes("always fail"));
});
