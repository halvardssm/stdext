import { assertEquals } from "@std/assert";
import type {} from "./jsonpath.ts";
import { JSONPath, type JSONPathToken } from "./jsonpath.ts";

Deno.test("JSONPath > lexer has correct matchers", async (t) => {
  await t.step("simple expression", () => {
    const expected: JSONPathToken[] = [
      {
        index: 0,
        type: "Root",
        value: "$",
      },
      {
        index: 1,
        type: "Accessor",
        value: ".",
      },
      {
        index: 2,
        type: "NameSelector",
        value: "foo",
      },
      {
        index: 5,
        type: "SelectorStart",
        value: "[",
      },
      {
        index: 6,
        type: "QuotedNameSelector",
        value: "bar",
      },
      {
        index: 11,
        type: "SelectorEnd",
        value: "]",
      },
      {
        index: 12,
        type: "Accessor",
        value: ".",
      },
      {
        index: 13,
        type: "NameSelector",
        value: "baz",
      },
      {
        index: 16,
        type: "SelectorStart",
        value: "[",
      },
      {
        index: 17,
        type: "NumberSelector",
        value: 1,
      },
      {
        index: 18,
        type: "SelectorEnd",
        value: "]",
      },
      {
        index: 19,
        type: "SelectorStart",
        value: "[",
      },
      {
        index: 20,
        type: "NumberSelector",
        value: 1,
      },
      {
        index: 21,
        type: "SliceSeparator",
        value: ",",
      },
      {
        index: 22,
        type: "NumberSelector",
        value: 2,
      },
      {
        index: 23,
        type: "SelectorEnd",
        value: "]",
      },
      {
        index: 24,
        type: "SelectorStart",
        value: "[",
      },
      {
        index: 25,
        type: "NumberSelector",
        value: 1,
      },
      {
        index: 26,
        type: "SliceSelector",
        value: ":",
      },
      {
        index: 27,
        type: "NumberSelector",
        value: 2,
      },
      {
        index: 28,
        type: "SliceSelector",
        value: ":",
      },
      {
        index: 29,
        type: "NumberSelector",
        value: 3,
      },
      {
        index: 30,
        type: "SelectorEnd",
        value: "]",
      },
      {
        index: 31,
        type: "SelectorStart",
        value: "[",
      },
      {
        index: 32,
        type: "Wildcard",
        value: "*",
      },
      {
        index: 33,
        type: "SelectorEnd",
        value: "]",
      },
      {
        index: 34,
        type: "FilterSelectorStart",
        value: "[?",
      },
      {
        index: 36,
        type: "CurrentNode",
        value: "@",
      },
      {
        index: 37,
        type: "Accessor",
        value: ".",
      },
      {
        index: 38,
        type: "NameSelector",
        value: "a",
      },
      {
        index: 40,
        type: "ComparisonEqual",
        value: "==",
      },
      {
        index: 43,
        type: "QuotedNameSelector",
        value: "a",
      },
      {
        index: 46,
        type: "SelectorEnd",
        value: "]",
      },
      {
        index: 47,
        type: "FilterSelectorStart",
        value: "[?",
      },
      {
        index: 49,
        type: "GroupStart",
        value: "(",
      },
      {
        index: 50,
        type: "CurrentNode",
        value: "@",
      },
      {
        index: 51,
        type: "Accessor",
        value: ".",
      },
      {
        index: 52,
        type: "NameSelector",
        value: "a",
      },
      {
        index: 54,
        type: "ComparisonEqual",
        value: "==",
      },
      {
        index: 57,
        type: "QuotedNameSelector",
        value: "a",
      },
      {
        index: 60,
        type: "GroupEnd",
        value: ")",
      },
      {
        index: 61,
        type: "SelectorEnd",
        value: "]",
      },
      {
        index: 62,
        type: "FilterSelectorStart",
        value: "[?",
      },
      {
        index: 64,
        type: "NameSelector",
        value: "search",
      },
      {
        index: 70,
        type: "GroupStart",
        value: "(",
      },
      {
        index: 71,
        type: "CurrentNode",
        value: "@",
      },
      {
        index: 72,
        type: "Accessor",
        value: ".",
      },
      {
        index: 73,
        type: "NameSelector",
        value: "a",
      },
      {
        index: 74,
        type: "SliceSeparator",
        value: ",",
      },
      {
        index: 76,
        type: "QuotedNameSelector",
        value: "[bc]",
      },
      {
        index: 82,
        type: "GroupEnd",
        value: ")",
      },
      {
        index: 83,
        type: "SelectorEnd",
        value: "]",
      },
    ];
    const l = new JSONPath({});
    assertEquals(
      l._getLexer(
        `$.foo['bar'].baz[1][1,2][1:2:3][*][?@.a == 'a'][?(@.a == 'a')][?search(@.a, "[bc]")]`,
      ).tokenize(),
      expected,
    );
  });
});
