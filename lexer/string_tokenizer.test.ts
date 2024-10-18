import { StringTokenizer } from "./string_tokenizer.ts";
import { assertEquals } from "@std/assert";

Deno.test("StringTokenizer > can tokenize empty stiring and matcher", () => {
  const data = "";
  const t = new StringTokenizer({
    data: data,
    matchers: [],
  });

  const tokens = t.tokenize();

  assertEquals(tokens, []);
});

Deno.test("StringTokenizer > can tokenize", () => {
  const data = "test";
  const t = new StringTokenizer({
    data: data,
    matchers: [
      {
        key: (v, i) => v === "t" && i === 3,
        handler: (v, i) => ({
          index: i,
          type: "function",
          value: v,
        }),
      },
      {
        key: "t",
        handler: (v, i) => ({
          index: i,
          type: "string",
          value: v,
        }),
      },
      {
        key: /[es]/,
        handler: (v, i) => ({
          index: i,
          type: "regex",
          value: v,
        }),
      },
    ],
  });

  const tokens = t.tokenize();

  assertEquals(tokens, [
    {
      index: 0,
      type: "string",
      value: "t",
    },
    {
      index: 1,
      type: "regex",
      value: "e",
    },
    {
      index: 2,
      type: "regex",
      value: "s",
    },
    {
      index: 3,
      type: "function",
      value: "t",
    },
  ]);
});

Deno.test("StringTokenizer > can tokenize with default handler", () => {
  const data = "test";
  const t = new StringTokenizer({
    data: data,
    matchers: [],
    defaultHandler: (v, i) => ({
      index: i,
      type: "default",
      value: v,
    }),
  });

  const tokens = t.tokenize();

  assertEquals(tokens, [
    {
      index: 0,
      type: "default",
      value: "t",
    },
    {
      index: 1,
      type: "default",
      value: "e",
    },
    {
      index: 2,
      type: "default",
      value: "s",
    },
    {
      index: 3,
      type: "default",
      value: "t",
    },
  ]);
});

Deno.test("StringTokenizer > can tokenize with custom index increase", () => {
  const data = "test";
  const t = new StringTokenizer({
    data: data,
    matchers: [],
    defaultHandler: (v, i) => [{
      index: i,
      type: "default",
      value: v,
    }, 2],
  });

  const tokens = t.tokenize();

  assertEquals(tokens, [
    {
      index: 0,
      type: "default",
      value: "t",
    },
    {
      index: 2,
      type: "default",
      value: "s",
    },
  ]);
});
