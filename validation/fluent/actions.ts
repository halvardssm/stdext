/**
 * Actions: the small functions appended to a schema with `pipe()`.
 *
 * - {@linkcode typeCheck}, {@linkcode refine}, {@linkcode transform} and their
 *   async variants are the core primitives.
 * - Keyword actions (`minLength`, `minimum`, `match`, ...) are built on the
 *   shared checks in `../keywords.ts` and carry the JSON Schema keyword they
 *   represent, so `toJSONSchema` can export them losslessly.
 *
 * @module
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
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
  type KeywordIssue,
  msg,
} from "../keywords.ts";
import { fail, isPromise } from "./schema.ts";
import type { Action, AsyncAction, KeywordAction } from "./types.ts";

export { fail };

/**
 * Base type-check action: step 0 of every primitive.
 *
 * @param fn A type guard.
 * @param kind A label for the expected type, used in the message.
 * @returns An action failing with a `"type"` issue.
 *
 * @example
 * ```ts
 * import { typeCheck } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * const isString = typeCheck((v): v is string => typeof v === "string", "string");
 * assertEquals(isString.run("a"), "a");
 * ```
 */
export function typeCheck<T>(
  fn: (value: unknown) => value is T,
  kind = "value",
): Action<unknown, T> {
  return {
    kind: "type",
    run: (value) => {
      if (fn(value)) return value;
      const issue = invalidTypeIssue(kind, value);
      return fail(issue.message, issue);
    },
  };
}

/**
 * Failing refinement (input and output are the same type).
 *
 * @param fn Returns `true` when the value is valid.
 * @param kind The issue kind. Defaults to `"custom"`.
 * @param message The issue message.
 * @returns A check action.
 *
 * @example
 * ```ts
 * import { refine } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * const even = refine((n: number) => n % 2 === 0, "even");
 * assertEquals(even.run(2), 2);
 * ```
 */
export function refine<T>(
  fn: (value: T) => boolean,
  kind = "custom",
  message?: string,
): Action<T, NoInfer<T>> {
  return {
    kind,
    run: (value) =>
      fn(value) ? value : fail(message ?? `Input failed the ${kind} check`, {
        kind,
        actual: value,
      }),
  };
}

/**
 * Async {@linkcode refine}. Makes the schema it is used in async.
 *
 * @param fn Resolves `true` when the value is valid.
 * @param kind The issue kind. Defaults to `"custom"`.
 * @param message The issue message.
 * @returns An async check action.
 */
export function refineAsync<T>(
  fn: (value: T) => Promise<boolean>,
  kind = "custom",
  message?: string,
): AsyncAction<T, NoInfer<T>> {
  return {
    kind,
    async: true,
    run: async (value) =>
      (await fn(value)) ? value : fail(
        message ?? `Input failed the ${kind} check`,
        { kind, actual: value },
      ),
  };
}

/**
 * Transform the value; the output type may differ from the input type.
 * Beyond what JSON Schema can express.
 *
 * @param fn The transformation.
 * @returns A transform action.
 *
 * @example
 * ```ts
 * import { transform } from "@stdext/validation/fluent";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(transform((s: string) => s.length).run("abc"), 3);
 * ```
 */
export function transform<A, B>(fn: (value: A) => B): Action<A, B> {
  return { kind: "transform", run: (value) => fn(value) };
}

/**
 * Async {@linkcode transform}. Makes the schema it is used in async.
 *
 * @param fn The async transformation.
 * @returns An async transform action.
 */
export function transformAsync<A, B>(
  fn: (value: A) => Promise<B>,
): AsyncAction<A, B> {
  return { kind: "transform", async: true, run: (value) => fn(value) };
}

/**
 * Build a {@linkcode KeywordAction} from a shared keyword check.
 *
 * @param keyword The JSON Schema keyword, e.g. `"minLength"`.
 * @param value The serializable keyword value.
 * @param check The check, returning an issue or `undefined`.
 * @param extra Extra sibling keywords for the export.
 * @returns A keyword action.
 */
export function keywordAction<T>(
  keyword: string,
  value: unknown,
  check: (value: T) => KeywordIssue | undefined,
  extra?: Record<string, unknown>,
): KeywordAction<T> {
  return {
    kind: keyword,
    jsonSchemaKeyword: keyword,
    jsonSchemaValue: value,
    ...(extra ? { jsonSchemaExtra: extra } : {}),
    run: (input) => {
      const issue = check(input);
      return issue ? fail(issue.message, issue) : input;
    },
  };
}

// ---------------------------------------------------------------------------
// String keywords
// ---------------------------------------------------------------------------

/**
 * `minLength` keyword.
 *
 * @param length The minimum length.
 * @returns A keyword action for strings.
 */
export function minLength(length: number): KeywordAction<string> {
  return keywordAction("minLength", length, (s) => checkMinLength(s, length));
}

/**
 * `maxLength` keyword.
 *
 * @param length The maximum length.
 * @returns A keyword action for strings.
 */
export function maxLength(length: number): KeywordAction<string> {
  return keywordAction("maxLength", length, (s) => checkMaxLength(s, length));
}

/**
 * `pattern` keyword from a regular expression source.
 *
 * @param source The regular expression source (unanchored).
 * @returns A keyword action for strings.
 */
export function pattern(source: string): KeywordAction<string>;
export function pattern(regex: RegExp): Action<string>;
export function pattern(
  source: string | RegExp,
): Action<string> | KeywordAction<string> {
  if (typeof source === "string") {
    return keywordAction("pattern", source, (s) => checkPattern(s, source));
  }
  return match(source);
}

/**
 * `pattern` keyword from a `RegExp`. Regular expressions with flags cannot be
 * exported to JSON Schema, so they become a plain (non keyword) action.
 *
 * @param regex The regular expression.
 * @returns A keyword action for strings, or a plain check when flags are set.
 *
 * @example
 * ```ts
 * import { match } from "@stdext/validation/fluent";
 * import { RFC5321_EMAIL } from "@stdext/validation/utils";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(match(RFC5321_EMAIL).run("a@b.co"), "a@b.co");
 * ```
 */
export function match(regex: RegExp): Action<string> {
  if (!regex.flags) return pattern(regex.source);
  return {
    kind: "pattern",
    run: (value) => {
      regex.lastIndex = 0;
      return regex.test(value) ? value : fail(
        msg.expected("matching the pattern", regex.source, value),
        { kind: "pattern", expected: regex.source, actual: value },
      );
    },
  };
}

/**
 * `format` keyword (see `FORMAT_REGEXES` in `../keywords.ts`).
 *
 * @param name The format name, e.g. `"email"`.
 * @returns A keyword action for strings.
 */
export function format(name: string): KeywordAction<string> {
  return keywordAction("format", name, (s) => checkFormat(s, name));
}

// ---------------------------------------------------------------------------
// Number keywords
// ---------------------------------------------------------------------------

/**
 * `minimum` keyword (inclusive).
 *
 * @param n The inclusive lower bound.
 * @returns A keyword action for numbers.
 */
export function minimum(n: number): KeywordAction<number> {
  return keywordAction("minimum", n, (v) => checkMinimum(v, n));
}

/**
 * `maximum` keyword (inclusive).
 *
 * @param n The inclusive upper bound.
 * @returns A keyword action for numbers.
 */
export function maximum(n: number): KeywordAction<number> {
  return keywordAction("maximum", n, (v) => checkMaximum(v, n));
}

/**
 * `exclusiveMinimum` keyword.
 *
 * @param n The exclusive lower bound.
 * @returns A keyword action for numbers.
 */
export function exclusiveMinimum(n: number): KeywordAction<number> {
  return keywordAction(
    "exclusiveMinimum",
    n,
    (v) => checkExclusiveMinimum(v, n),
  );
}

/**
 * `exclusiveMaximum` keyword.
 *
 * @param n The exclusive upper bound.
 * @returns A keyword action for numbers.
 */
export function exclusiveMaximum(n: number): KeywordAction<number> {
  return keywordAction(
    "exclusiveMaximum",
    n,
    (v) => checkExclusiveMaximum(v, n),
  );
}

/**
 * `multipleOf` keyword.
 *
 * @param n The divisor.
 * @returns A keyword action for numbers.
 */
export function multipleOf(n: number): KeywordAction<number> {
  return keywordAction("multipleOf", n, (v) => checkMultipleOf(v, n));
}

// ---------------------------------------------------------------------------
// Array keywords
// ---------------------------------------------------------------------------

/**
 * `minItems` keyword.
 *
 * @param n The minimum number of items.
 * @returns A keyword action for arrays.
 */
export function minItems<T extends readonly unknown[]>(
  n: number,
): KeywordAction<T> {
  return keywordAction("minItems", n, (v: T) => checkMinItems(v.length, n));
}

/**
 * `maxItems` keyword.
 *
 * @param n The maximum number of items.
 * @returns A keyword action for arrays.
 */
export function maxItems<T extends readonly unknown[]>(
  n: number,
): KeywordAction<T> {
  return keywordAction("maxItems", n, (v: T) => checkMaxItems(v.length, n));
}

/**
 * `uniqueItems` keyword (items are compared by their JSON serialization).
 *
 * @returns A keyword action for arrays.
 */
export function uniqueItems<T extends readonly unknown[]>(): KeywordAction<T> {
  return keywordAction("uniqueItems", true, (v: T) => {
    const [first] = checkUniqueItems(v);
    return first;
  });
}

/**
 * `contains` keyword with optional `minContains` / `maxContains`. The nested
 * schema must be synchronous.
 *
 * @param schema The schema at least `minContains` (default 1) items must match.
 * @param options `minContains` and `maxContains`.
 * @returns A keyword action for arrays.
 */
export function contains<T extends readonly unknown[]>(
  // deno-lint-ignore no-explicit-any
  schema: StandardSchemaV1<any, unknown>,
  options: { minContains?: number; maxContains?: number } = {},
): KeywordAction<T> {
  const extra: Record<string, unknown> = {};
  if (options.minContains !== undefined) {
    extra.minContains = options.minContains;
  }
  if (options.maxContains !== undefined) {
    extra.maxContains = options.maxContains;
  }

  return keywordAction("contains", schema, (items: T) => {
    let matches = 0;
    for (const item of items) {
      const result = schema["~standard"].validate(item);
      if (isPromise(result)) {
        throw new TypeError("contains() requires a synchronous schema");
      }
      if (!result.issues) matches++;
    }
    return checkMinContains(matches, options.minContains, schema) ??
      (options.maxContains !== undefined
        ? checkMaxContains(matches, options.maxContains, schema)
        : undefined);
  }, extra);
}

// ---------------------------------------------------------------------------
// Object keywords
// ---------------------------------------------------------------------------

/**
 * `minProperties` keyword.
 *
 * @param n The minimum number of properties.
 * @returns A keyword action for objects.
 */
export function minProperties<T extends object>(n: number): KeywordAction<T> {
  return keywordAction(
    "minProperties",
    n,
    (v: T) => checkMinProperties(Object.keys(v).length, n),
  );
}

/**
 * `maxProperties` keyword.
 *
 * @param n The maximum number of properties.
 * @returns A keyword action for objects.
 */
export function maxProperties<T extends object>(n: number): KeywordAction<T> {
  return keywordAction(
    "maxProperties",
    n,
    (v: T) => checkMaxProperties(Object.keys(v).length, n),
  );
}
