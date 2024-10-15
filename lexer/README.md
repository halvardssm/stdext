# @stdext/lexer

The lexer package contains general purpose lexers/tokenizers.

## Example

```ts
const t = new StringTokenizer({
  data: "testa",
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
      handler: (v, i) => ([
        {
          index: i,
          type: "string",
          value: v,
        },
        2
      ]),
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
  defualtHandler:(v, i) => ({
    index: i,
    type: "default",
    value: v,
  }),
});
 *
const tokens = t.tokenize();
```
