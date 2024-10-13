import { unreachable } from "@std/assert";
import type { JsonValue } from "@std/json";
import {
  StringTokenizer,
  type StringTokenizerMatcher,
  type StringTokenizerToken,
} from "@stdext/lexer";
import type { FlipMap, ValueOf } from "@stdext/types";

export type JSONPathToken = StringTokenizerToken<TokenType, JsonValue>;

export const TokenType = {
  // Base tokens
  Eof: "Eof",
  Root: "Root",
  CurrentNode: "CurrentNode",
  Accessor: "Accessor",
  SelectorStart: "SelectorStart",
  SelectorEnd: "SelectorEnd",
  Wildcard: "Wildcard",
  LogicalExpression: "LogicalExpression",
  SliceSelector: "SliceSelector",
  SliceSeparator: "SliceSeparator",
  GroupStart: "GroupStart",
  GroupEnd: "GroupEnd",
  // Other tokens
  FilterSelectorStart: "FilterSelectorStart",
  NameSelector: "NameSelector",
  NumberSelector: "NumberSelector",
  QuotedNameSelector: "QuotedNameSelector",
  ComparisonEqualsSign: "ComparisonEqualsSign",
  ComparisonNot: "ComparisonNot",
  ComparisonGreater: "ComparisonGreater",
  ComparisonLess: "ComparisonLess",
  ComparisonGreaterOrEqual: "ComparisonGreaterOrEqual",
  ComparisonLessOrEqual: "ComparisonLessOrEqual",
  ComparisonEqual: "ComparisonEqual",
  ComparisonNotEqual: "ComparisonNotEqual",
  ComparisonOr: "ComparisonOr",
  ComparisonAnd: "ComparisonAnd",
} as const;

export type TokenType = ValueOf<typeof TokenType>;

export const TOKEN_TYPE = {
  Eof: "EOF",
  Root: "$",
  CurrentNode: "@",
  Accessor: ".",
  SelectorStart: "[",
  SelectorEnd: "]",
  Wildcard: "*",
  LogicalExpression: "?",
  SliceSelector: ":",
  SliceSeparator: ",",
  GroupStart: "(",
  GroupEnd: ")",
  FilterSelectorStart: "[?",
  ComparisonEqualsSign: "=",
  ComparisonNot: "!",
  ComparisonGreater: ">",
  ComparisonLess: "<",
  ComparisonGreaterOrEqual: ">=",
  ComparisonLessOrEqual: "<=",
  ComparisonEqual: "==",
  ComparisonNotEqual: "!=",
  ComparisonOr: "||",
  ComparisonAnd: "&&",
} as const;

export type TOKEN_TYPE = ValueOf<typeof TOKEN_TYPE>;

export const TOKEN_TYPE_MAP: FlipMap<typeof TOKEN_TYPE> = Object.entries(
  TOKEN_TYPE,
).reduce((prev, cur) => {
  // @ts-expect-error: ts cant deal with readonly props when we flip the object
  prev[cur[1]] = cur[0] as unknown as TokenType;
  return prev;
}, {} as FlipMap<typeof TOKEN_TYPE>);

export const REGEXP_JSONPATH_START = /^\$[\.\[]?/;
export const REGEXP_QUOTES = /[\"\']/;

export const BASIC_TOKEN = [
  TOKEN_TYPE.CurrentNode,
  TOKEN_TYPE.Accessor,
  TOKEN_TYPE.SelectorStart,
  TOKEN_TYPE.SelectorEnd,
  TOKEN_TYPE.Wildcard,
  TOKEN_TYPE.LogicalExpression,
  TOKEN_TYPE.SliceSelector,
  TOKEN_TYPE.SliceSeparator,
  TOKEN_TYPE.GroupStart,
  TOKEN_TYPE.GroupEnd,
];

export const COMPARISON_TOKEN = [
  TOKEN_TYPE.ComparisonNot,
  TOKEN_TYPE.ComparisonGreater,
  TOKEN_TYPE.ComparisonLess,
  TOKEN_TYPE.ComparisonGreaterOrEqual,
  TOKEN_TYPE.ComparisonLessOrEqual,
  TOKEN_TYPE.ComparisonEqual,
  TOKEN_TYPE.ComparisonNotEqual,
];

export function isBasicToken(value: unknown): boolean {
  // deno-lint-ignore no-explicit-any
  return BASIC_TOKEN.includes(value as any);
}

export function isComparisonToken(
  value: unknown,
): value is typeof COMPARISON_TOKEN {
  // deno-lint-ignore no-explicit-any
  return COMPARISON_TOKEN.includes(value as any);
}

export function isShorthandNameSelector(ch: string): boolean {
  return (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    ch === "_";
}

export function isNumberChar(ch: string): boolean {
  return (ch >= "0" && ch <= "9");
}

const JSONPATH_MATCHERS: StringTokenizerMatcher<TokenType, JsonValue>[] = [
  {
    key: (_v, i, d) => d.slice(i, i + 2) === TOKEN_TYPE.FilterSelectorStart,
    handler: (_v, i) => [
      {
        type: TokenType.FilterSelectorStart,
        value: TOKEN_TYPE.FilterSelectorStart,
        index: i,
      },
      2,
    ],
  },
  {
    key: (v, i) => isBasicToken(v) || (v === TOKEN_TYPE.Root && i === 0),
    handler: (v, i) => ({
      // @ts-expect-error: ts is having an issue with inference
      type: TOKEN_TYPE_MAP[v],
      value: v,
      index: i,
    }),
  },
  {
    key: (v) => isShorthandNameSelector(v),
    handler: (_v, i, d) => {
      let index = i + 1;

      while (
        index < d.length &&
        isShorthandNameSelector(d[index])
      ) {
        index++;
      }

      const value = d.slice(i, index);
      const consumedIndexes = index - i;

      return [
        {
          type: TokenType.NameSelector,
          value: value,
          index: i,
        },
        consumedIndexes,
      ];
    },
  },
  {
    key: (v, i, d) => isNumberChar(v) || v === "-" && isNumberChar(d[i + 1]),
    handler: (_v, i, d) => {
      let index = i + 1;

      while (
        index < d.length &&
        isNumberChar(d[index])
      ) {
        index++;
      }

      const value = parseInt(d.slice(i, index));
      const consumedIndexes = index - i;

      return [
        {
          type: TokenType.NumberSelector,
          value: value,
          index: i,
        },
        consumedIndexes,
      ];
    },
  },
  {
    key: REGEXP_QUOTES,
    handler: (v, i, d) => {
      let index = i + 1;

      while (v !== d[index] && index < d.length) {
        // You can escape a double quote and you can escape an escape.
        if (
          d[index] === "\\" &&
          (d[index + 1] === "\\" ||
            v === d[index + 1])
        ) {
          index += 2;
        } else {
          index++;
        }
      }
      index++;

      const value = JSON.parse(`"${d.slice(i + 1, index - 1)}"`);
      const consumedIndexes = index - i;

      return [
        {
          type: TokenType.QuotedNameSelector,
          value: value,
          index: i,
        },
        consumedIndexes,
      ];
    },
  },
  {
    key: " ",
    handler: () => 1,
  },
  {
    key: (_v, i, d) => isComparisonToken(d.slice(i, i + 2).trim()),
    handler: (v, i, d) => {
      const twoChar = d.slice(i, i + 2).trim();

      if (isComparisonToken(twoChar)) {
        return [
          {
            // @ts-expect-error: ts inference
            type: TOKEN_TYPE_MAP[twoChar],
            value: twoChar,
            index: i,
          },
          twoChar.length,
        ];
      }

      if (isComparisonToken(v)) {
        return {
          // @ts-expect-error: ts inference
          type: TOKEN_TYPE_MAP[v],
          value: v,
          index: i,
        };
      }

      unreachable(
        "This should never throw, if it does, open an issue on GitHub",
      );
    },
  },
  {
    key: (_v, i, d) =>
      [TOKEN_TYPE.ComparisonOr, TOKEN_TYPE.ComparisonAnd].includes(
        // deno-lint-ignore no-explicit-any
        d.slice(i, i + 2) as any,
      ),
    handler: (_v, i, d) => {
      const twoChar = d.slice(i, i + 2);
      return [
        {
          // @ts-expect-error: ts inference
          type: TOKEN_TYPE_MAP[twoChar],
          value: twoChar,
          index: i,
        },
        twoChar.length,
      ];
    },
  },
];

export class JSONPath {
  constructor(data: JsonValue) {
  }

  _getLexer(expression: string): StringTokenizer<TokenType, JsonValue> {
    return new StringTokenizer<TokenType, JsonValue>({
      data: expression,
      matchers: JSONPATH_MATCHERS,
    });
  }

  query(expression: string) {
    const lexer = this._getLexer(expression);
  }
}
