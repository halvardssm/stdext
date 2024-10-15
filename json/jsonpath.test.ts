import { assertEquals } from "@std/assert";
import type { JSONPathResult } from "./jsonpath.ts";
import { JSONPath } from "./jsonpath.ts";
import type { JsonValue } from "@std/json";

type TestJsonPathQuery = {
  expression: string;
  results: JSONPathResult<JsonValue>[];
};

function testJsonPath(
  data: JsonValue,
  queries: TestJsonPathQuery[],
) {
  const jp = new JSONPath(data);
  for (const q of queries) {
    const res = jp.queryWithLocation(q.expression);

    assertEquals(res, q.results, `Failed with expression ${q.expression}`);
  }
}

Deno.test("JSONPath > spec test", async (t) => {
  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.2.3
  await t.step("Root identifier", () => {
    const data = { "k": "v" };

    const queries: TestJsonPathQuery[] = [
      { expression: `$`, results: [{ path: `$`, result: { "k": "v" } }] },
    ];
    testJsonPath(data, queries);
  });

  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.3.1.3
  await t.step("Name Selector", () => {
    const data = {
      "o": { "j j": { "k.k": 3 } },
      "'": { "@": 2 },
    };

    const queries: TestJsonPathQuery[] = [
      {
        expression: `$.o['j j']`,
        results: [{ path: `$['o']['j j']`, result: { "k.k": 3 } }],
      },
      {
        expression: `$.o['j j']['k.k']`,
        results: [{ path: `$['o']['j j']['k.k']`, result: 3 }],
      },
      {
        expression: `$.o["j j"]["k.k"]`,
        results: [{ path: `$['o']['j j']['k.k']`, result: 3 }],
      },
      {
        expression: `$["'"]["@"]`,
        results: [{ path: `$['\'']['@']`, result: 2 }],
      },
    ];
    testJsonPath(data, queries);
  });

  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.3.3.3
  await t.step("Index Selector", () => {
    const data = ["a", "b"];

    const queries: TestJsonPathQuery[] = [
      {
        expression: `$[1]`,
        results: [
          { path: `$[1]`, result: "b" },
        ],
      },
      {
        expression: `$[-2]`,
        results: [
          { path: `$[0]`, result: "a" },
        ],
      },
    ];
    testJsonPath(data, queries);
  });

  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.3.4.3
  await t.step("Array Slice Selector", () => {
    const data = ["a", "b", "c", "d", "e", "f", "g"];

    const queries: TestJsonPathQuery[] = [
      {
        expression: `$[1:3]`,
        results: [
          { path: `$[1]`, result: "b" },
          { path: `$[2]`, result: "c" },
        ],
      },
      {
        expression: `$[5:]`,
        results: [
          { path: `$[5]`, result: "f" },
          { path: `$[6]`, result: "g" },
        ],
      },
      {
        expression: `$[1:5:2]`,
        results: [
          { path: `$[1]`, result: "b" },
          { path: `$[3]`, result: "d" },
        ],
      },
      {
        expression: `$[5:1:-2]`,
        results: [
          { path: `$[5]`, result: "f" },
          { path: `$[3]`, result: "d" },
        ],
      },
      {
        expression: `$[::-1]`,
        results: [
          { path: `$[6]`, result: "g" },
          { path: `$[5]`, result: "f" },
          { path: `$[4]`, result: "e" },
          { path: `$[3]`, result: "d" },
          { path: `$[2]`, result: "c" },
          { path: `$[1]`, result: "b" },
          { path: `$[0]`, result: "a" },
        ],
      },
    ];
    testJsonPath(data, queries);
  });

  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.3.5.3
  await t.step("Filter Selector", () => {
    const data = {
      "a": [3, 5, 1, 2, 4, 6, { "b": "j" }, { "b": "k" }, { "b": {} }, {
        "b": "kilo",
      }],
      "o": { "p": 1, "q": 2, "r": 3, "s": 5, "t": { "u": 6 } },
      "e": "f",
    };

    const queries: TestJsonPathQuery[] = [
      {
        expression: `$.a[?@.b == 'kilo']`,
        results: [
          { path: `$['a'][9]`, result: { "b": "kilo" } },
        ],
      },
      {
        expression: `$.a[?(@.b == 'kilo')]`,
        results: [
          { path: `$['a'][9]`, result: { "b": "kilo" } },
        ],
      },
      {
        expression: `$.a[?@>3.5]`,
        results: [
          { path: `$['a'][1]`, result: 5 },
          { path: `$['a'][4]`, result: 4 },
          { path: `$['a'][5]`, result: 6 },
        ],
      },
      {
        expression: `$.a[?@.b]`,
        results: [
          { path: `$['a'][6]`, result: { "b": "j" } },
          { path: `$['a'][7]`, result: { "b": "k" } },
          { path: `$['a'][8]`, result: { "b": {} } },
          { path: `$['a'][9]`, result: { "b": "kilo" } },
        ],
      },
      {
        expression: `$[?@.*]`,
        results: [
          {
            path: `$['a']`,
            result: [
              3,
              5,
              1,
              2,
              4,
              6,
              { "b": "j" },
              { "b": "k" },
              { "b": {} },
              { "b": "kilo" },
            ],
          },
          {
            path: `$['o']`,
            result: { "p": 1, "q": 2, "r": 3, "s": 5, "t": { "u": 6 } },
          },
        ],
      },
      {
        expression: `$[?@[?@.b]]`,
        results: [
          {
            path: `$['a']`,
            result: [
              3,
              5,
              1,
              2,
              4,
              6,
              { "b": "j" },
              { "b": "k" },
              { "b": {} },
              { "b": "kilo" },
            ],
          },
        ],
      },
      {
        expression: `$.o[?@<3, ?@<3]`,
        results: [
          { path: `$['o']['p']`, result: 1 },
          { path: `$['o']['q']`, result: 2 },
          { path: `$['o']['p']`, result: 1 },
          { path: `$['o']['q']`, result: 2 },
        ],
      },
      {
        expression: `$.a[?@<2 || @.b == "k"]`,
        results: [
          { path: `$['a'][2]`, result: 1 },
          { path: `$['a'][7]`, result: { "b": "k" } },
        ],
      },
      {
        expression: `$.a[?match(@.b, "[jk]")]`,
        results: [
          { path: `$['a'][6]`, result: { "b": "j" } },
          { path: `$['a'][7]`, result: { "b": "k" } },
        ],
      },
      {
        expression: `$.a[?search(@.b, "[jk]")]`,
        results: [
          { path: `$['a'][6]`, result: { "b": "j" } },
          { path: `$['a'][7]`, result: { "b": "k" } },
          { path: `$['a'][9]`, result: { "b": "kilo" } },
        ],
      },
      {
        expression: `$.o[?@>1 && @<4]`,
        results: [
          { path: `$['o']['q']`, result: 2 },
          { path: `$['o']['r']`, result: 3 },
        ],
      },
      {
        expression: `$.o[?@.u || @.x]`,
        results: [
          { path: `$['o']['t']`, result: { "u": 6 } },
        ],
      },
      {
        expression: `$.a[?@.b == $.x]`,
        results: [
          { path: `$['a'][0]`, result: 3 },
          { path: `$['a'][1]`, result: 5 },
          { path: `$['a'][2]`, result: 1 },
          { path: `$['a'][3]`, result: 2 },
          { path: `$['a'][4]`, result: 4 },
          { path: `$['a'][5]`, result: 6 },
        ],
      },
      {
        expression: `$.a[?@ == @]`,
        results: [
          { path: `$['a'][0]`, result: 3 },
          { path: `$['a'][1]`, result: 5 },
          { path: `$['a'][2]`, result: 1 },
          { path: `$['a'][3]`, result: 2 },
          { path: `$['a'][4]`, result: 4 },
          { path: `$['a'][5]`, result: 6 },
          { path: `$['a'][6]`, result: { "b": "j" } },
          { path: `$['a'][7]`, result: { "b": "k" } },
          { path: `$['a'][8]`, result: { "b": {} } },
          { path: `$['a'][9]`, result: { "b": "kilo" } },
        ],
      },
    ];
    testJsonPath(data, queries);
  });

  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.5.1.3
  await t.step("Child Segment", () => {
    const data = ["a", "b", "c", "d", "e", "f", "g"];

    const queries: TestJsonPathQuery[] = [
      {
        expression: `$[0, 3]`,
        results: [
          { path: `$[0]`, result: "a" },
          { path: `$[3]`, result: "d" },
        ],
      },
      {
        expression: `$[0:2, 5]`,
        results: [
          { path: `$[0]`, result: "a" },
          { path: `$[1]`, result: "b" },
          { path: `$[5]`, result: "f" },
        ],
      },
      {
        expression: `$[0, 0]`,
        results: [
          { path: `$[0]`, result: "a" },
          { path: `$[0]`, result: "a" },
        ],
      },
    ];
    testJsonPath(data, queries);
  });

  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.5.2.3
  await t.step("Descendant Segment", () => {
    const data = {
      "o": { "j": 1, "k": 2 },
      "a": [5, 3, [{ "j": 4 }, { "k": 6 }]],
    };

    const queries: TestJsonPathQuery[] = [
      {
        expression: `$..j`,
        results: [
          { path: `$['a'][2][0]['j']`, result: 4 },
          { path: `$['o']['j']`, result: 1 },
        ],
      },
      {
        expression: `$..[0]`,
        results: [
          { path: `$['a'][0]`, result: 5 },
          { path: `$['a'][2][0]`, result: { "j": 4 } },
        ],
      },
      {
        expression: `$..[*]`,
        results: [
          {
            path: "$['a']",
            result: [
              5,
              3,
              [
                {
                  j: 4,
                },
                {
                  k: 6,
                },
              ],
            ],
          },
          {
            path: "$['o']",
            result: {
              j: 1,
              k: 2,
            },
          },
          {
            path: "$['a'][0]",
            result: 5,
          },
          {
            path: "$['a'][1]",
            result: 3,
          },
          {
            path: "$['a'][2]",
            result: [
              {
                j: 4,
              },
              {
                k: 6,
              },
            ],
          },
          {
            path: "$['a'][2][0]",
            result: {
              j: 4,
            },
          },
          {
            path: "$['a'][2][1]",
            result: {
              k: 6,
            },
          },
          {
            path: "$['a'][2][0]['j']",
            result: 4,
          },
          {
            path: "$['a'][2][1]['k']",
            result: 6,
          },
          {
            path: "$['o']['j']",
            result: 1,
          },
          {
            path: "$['o']['k']",
            result: 2,
          },
        ],
      },
      {
        expression: `$..o`,
        results: [
          {
            path: "$['o']",
            result: {
              j: 1,
              k: 2,
            },
          },
        ],
      },
      {
        expression: `$.o..[*, *]`,
        results: [
          {
            path: "$['o']['j']",
            result: 1,
          },
          {
            path: "$['o']['k']",
            result: 2,
          },
          {
            path: "$['o']['j']",
            result: 1,
          },
          {
            path: "$['o']['k']",
            result: 2,
          },
        ],
      },
      {
        expression: `$.a..[0, 1]`,
        results: [
          {
            path: "$['a'][0]",
            result: 5,
          },
          {
            path: "$['a'][1]",
            result: 3,
          },
          {
            path: "$['a'][2][0]",
            result: {
              j: 4,
            },
          },
          {
            path: "$['a'][2][1]",
            result: {
              k: 6,
            },
          },
        ],
      },
    ];
    testJsonPath(data, queries);
  });

  // https://datatracker.ietf.org/doc/html/rfc9535#section-2.6.1
  await t.step("Semantics of null", () => {
    const data = { "a": null, "b": [null], "c": [{}], "null": 1 };

    const queries: TestJsonPathQuery[] = [
      {
        expression: `$.a`,
        results: [
          {
            path: "$['a']",
            result: null,
          },
        ],
      },
      {
        expression: `$.a[0]`,
        results: [],
      },
      {
        expression: `$.a.d`,
        results: [],
      },
      {
        expression: `$.b[0]`,
        results: [
          {
            path: "$['b'][0]",
            result: null,
          },
        ],
      },
      {
        expression: `$.b[*]`,
        results: [
          {
            path: "$['b'][0]",
            result: null,
          },
        ],
      },
      {
        expression: `$.b[?@]`,
        results: [
          {
            path: "$['b'][0]",
            result: null,
          },
        ],
      },
      {
        expression: `$.b[?@==null]`,
        results: [
          {
            path: "$['b'][0]",
            result: null,
          },
        ],
      },
      {
        expression: `$.b[?@.d==null]`,
        results: [],
      },
      {
        expression: `$.null`,
        results: [
          {
            path: "$['null']",
            result: 1,
          },
        ],
      },
    ];
    testJsonPath(data, queries);
  });
});
