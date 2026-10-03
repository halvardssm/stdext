/**
 * Keyword checks shared by the JSON Schema builders (`./json_schema.ts`) and
 * the fluent pipe system (`./fluent/`).
 *
 * Every function is a pure check named after the JSON Schema draft 2020-12
 * keyword it implements. It returns `undefined` when the value satisfies the
 * keyword, or a {@linkcode KeywordIssue} describing the failure. Both systems
 * build on these so a keyword has exactly one set of semantics and messages.
 *
 * @example
 * ```ts
 * import { checkMinLength } from "@stdext/validation/keywords";
 * import { assert, assertEquals } from "@std/assert";
 *
 * assertEquals(checkMinLength("abc", 2), undefined);
 * assert(checkMinLength("a", 2)?.kind === "minLength");
 * ```
 *
 * @module
 */

import {
  getMatchedName,
  ISO8601_DATE,
  ISO8601_DATETIME,
  ISO8601_DURATION,
  ISO8601_TIME,
  RFC1123_HOSTNAME,
  RFC2373_IPv6,
  RFC2673_IPv4,
  RFC3986_URI,
  RFC3986_URI_REFERENCE,
  RFC3987_IRI,
  RFC4122_UUID,
  RFC5321_EMAIL,
  RFC5890_IDN_HOSTNAME,
  RFC6531_IDN_EMAIL,
  RFC6570_URI_TEMPLATE,
  RFC6901_JSON_POINTER,
  RFC6901_RELATIVE_JSON_POINTER,
  stringify,
} from "./utils.ts";

/**
 * The result of a failed keyword check.
 */
export interface KeywordIssue {
  /** The JSON Schema keyword that failed, e.g. `"minLength"`. */
  kind: string;
  /** Human readable message. */
  message: string;
  /** What the keyword expected, when meaningful. */
  expected?: unknown;
  /** What was received, when meaningful. */
  actual?: unknown;
}

/**
 * Message builders. Exported so the builders in `./json_schema.ts` keep
 * producing the exact messages they always have.
 */
export const msg: {
  expected(
    prefixExpected: string,
    expected: unknown,
    actual: unknown,
    actualPrefix?: string,
  ): string;
  invalidValue(expected: unknown, actual: unknown): string;
  invalidType(expected: unknown, actual: unknown): string;
  expectedContains(expected: unknown): string;
  expectedContainsMatch(
    prefixExpected: string,
    expected: unknown,
    actual: number,
  ): string;
  expectedUniqueItems(actual: string): string;
  propertyFalse(actual: unknown): string;
} = {
  /**
   * `Expected input to be ${prefixExpected} ${expected}, was ${actualPrefix}: ${actual}`
   */
  expected: (
    prefixExpected: string,
    expected: unknown,
    actual: unknown,
    actualPrefix?: string,
  ): string =>
    `Expected input to be ${prefixExpected.length ? `${prefixExpected} ` : ""}${
      stringify(expected)
    }, was ${actualPrefix?.length ? `${actualPrefix}: ` : ""}${
      stringify(actual)
    }`,
  invalidValue(expected: unknown, actual: unknown): string {
    return this.expected("", stringify(expected), stringify(actual));
  },
  invalidType(expected: unknown, actual: unknown): string {
    return this.expected(
      "of type",
      stringify(expected),
      stringify(actual),
      typeof actual,
    );
  },
  expectedContains(expected: unknown): string {
    return `Expected input to contain ${expected}`;
  },
  expectedContainsMatch(
    prefixExpected: string,
    expected: unknown,
    actual: number,
  ): string {
    return this.expectedContains(
      `${prefixExpected} element(s) matching ${
        getMatchedName(expected)
      }, was ${actual}`,
    );
  },
  expectedUniqueItems(actual: string): string {
    return `Expected input to have unique items, following indexes were duplicates: ${actual}`;
  },
  propertyFalse: (actual: unknown): string =>
    `Schema defines the property as false, this will always fail: ${
      JSON.stringify(actual)
    }`,
};

function issue(
  kind: string,
  message: string,
  expected?: unknown,
  actual?: unknown,
): KeywordIssue {
  return { kind, message, expected, actual };
}

/**
 * Builds the issue for a failed type check, e.g. `invalidTypeIssue("string", 1)`.
 *
 * @param expected The expected type name.
 * @param actual The received value.
 * @returns The issue, with kind `"type"`.
 */
export function invalidTypeIssue(
  expected: string,
  actual: unknown,
): KeywordIssue {
  return issue("type", msg.invalidType(expected, actual), expected, actual);
}

// ---------------------------------------------------------------------------
// Number keywords
// ---------------------------------------------------------------------------

/**
 * `multipleOf` keyword.
 *
 * @param value The number to check.
 * @param multipleOf The divisor.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMultipleOf(
  value: number,
  multipleOf: number,
): KeywordIssue | undefined {
  if (value % multipleOf !== 0) {
    return issue(
      "multipleOf",
      msg.expected("a multiple of", multipleOf, value),
      multipleOf,
      value,
    );
  }
}

/**
 * `minimum` keyword (inclusive).
 *
 * @param value The number to check.
 * @param minimum The inclusive lower bound.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMinimum(
  value: number,
  minimum: number,
): KeywordIssue | undefined {
  if (minimum > value) {
    return issue(
      "minimum",
      msg.expected("a minimum (inclusive) value of", minimum, value),
      minimum,
      value,
    );
  }
}

/**
 * `maximum` keyword (inclusive).
 *
 * @param value The number to check.
 * @param maximum The inclusive upper bound.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMaximum(
  value: number,
  maximum: number,
): KeywordIssue | undefined {
  if (maximum < value) {
    return issue(
      "maximum",
      msg.expected("a maximum (inclusive) value of", maximum, value),
      maximum,
      value,
    );
  }
}

/**
 * `exclusiveMinimum` keyword.
 *
 * @param value The number to check.
 * @param exclusiveMinimum The exclusive lower bound.
 * @returns An issue, or `undefined` when valid.
 */
export function checkExclusiveMinimum(
  value: number,
  exclusiveMinimum: number,
): KeywordIssue | undefined {
  if (exclusiveMinimum >= value) {
    return issue(
      "exclusiveMinimum",
      msg.expected("a minimum (exclusive) value of", exclusiveMinimum, value),
      exclusiveMinimum,
      value,
    );
  }
}

/**
 * `exclusiveMaximum` keyword.
 *
 * @param value The number to check.
 * @param exclusiveMaximum The exclusive upper bound.
 * @returns An issue, or `undefined` when valid.
 */
export function checkExclusiveMaximum(
  value: number,
  exclusiveMaximum: number,
): KeywordIssue | undefined {
  if (exclusiveMaximum <= value) {
    return issue(
      "exclusiveMaximum",
      msg.expected("a maximum (exclusive) value of", exclusiveMaximum, value),
      exclusiveMaximum,
      value,
    );
  }
}

// ---------------------------------------------------------------------------
// String keywords
// ---------------------------------------------------------------------------

/**
 * `minLength` keyword.
 *
 * @param value The string to check.
 * @param minLength The minimum length.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMinLength(
  value: string,
  minLength: number,
): KeywordIssue | undefined {
  if (minLength > value.length) {
    return issue(
      "minLength",
      msg.expected(
        "of minimum length",
        minLength,
        value,
        value.length.toString(),
      ),
      minLength,
      value,
    );
  }
}

/**
 * `maxLength` keyword.
 *
 * @param value The string to check.
 * @param maxLength The maximum length.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMaxLength(
  value: string,
  maxLength: number,
): KeywordIssue | undefined {
  if (maxLength < value.length) {
    return issue(
      "maxLength",
      msg.expected(
        "of maximum length",
        maxLength,
        value,
        value.length.toString(),
      ),
      maxLength,
      value,
    );
  }
}

/**
 * `pattern` keyword. A pattern equal to the value always matches.
 *
 * @param value The string to check.
 * @param pattern The regular expression source.
 * @returns An issue, or `undefined` when valid.
 */
export function checkPattern(
  value: string,
  pattern: string,
): KeywordIssue | undefined {
  if (!pattern) return;
  if (!(pattern === value || new RegExp(pattern).test(value))) {
    return issue(
      "pattern",
      msg.expected("matching the pattern", pattern, value),
      pattern,
      value,
    );
  }
}

/**
 * The regular expression that implements each supported `format`.
 */
export const FORMAT_REGEXES = {
  "date-time": ISO8601_DATETIME,
  "date": ISO8601_DATE,
  "time": ISO8601_TIME,
  "duration": ISO8601_DURATION,
  "email": RFC5321_EMAIL,
  "idn-email": RFC6531_IDN_EMAIL,
  "hostname": RFC1123_HOSTNAME,
  "idn-hostname": RFC5890_IDN_HOSTNAME,
  "ipv4": RFC2673_IPv4,
  "ipv6": RFC2373_IPv6,
  "uri": RFC3986_URI,
  "uri-reference": RFC3986_URI_REFERENCE,
  "iri": RFC3987_IRI,
  "iri-reference": RFC6570_URI_TEMPLATE,
  "uuid": RFC4122_UUID,
  "json-pointer": RFC6901_JSON_POINTER,
  "relative-json-pointer": RFC6901_RELATIVE_JSON_POINTER,
} as const satisfies Record<string, RegExp>;

/** A `format` supported by {@linkcode checkFormat}. */
export type KeywordFormat = keyof typeof FORMAT_REGEXES;

/**
 * Whether the format is supported by {@linkcode checkFormat}.
 *
 * @param format The format name.
 * @returns `true` if the format has a validator.
 */
export function isSupportedFormat(format: string): format is KeywordFormat {
  return Object.hasOwn(FORMAT_REGEXES, format);
}

/**
 * `format` keyword. Unsupported formats always fail.
 *
 * @param value The string to check.
 * @param format The format name.
 * @returns An issue, or `undefined` when valid.
 */
export function checkFormat(
  value: string,
  format: string,
): KeywordIssue | undefined {
  const regex = isSupportedFormat(format) ? FORMAT_REGEXES[format] : undefined;
  if (!regex?.test(value)) {
    return issue(
      "format",
      msg.expected("of format", format, value),
      format,
      value,
    );
  }
}

// ---------------------------------------------------------------------------
// Array keywords
// ---------------------------------------------------------------------------

/**
 * `minItems` keyword.
 *
 * @param length The array length.
 * @param minItems The minimum number of items.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMinItems(
  length: number,
  minItems: number,
): KeywordIssue | undefined {
  if (minItems > length) {
    return issue(
      "minItems",
      msg.expected("minimum length", minItems, length),
      minItems,
      length,
    );
  }
}

/**
 * `maxItems` keyword.
 *
 * @param length The array length.
 * @param maxItems The maximum number of items.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMaxItems(
  length: number,
  maxItems: number,
): KeywordIssue | undefined {
  if (maxItems < length) {
    return issue(
      "maxItems",
      msg.expected("maximum length", maxItems, length),
      maxItems,
      length,
    );
  }
}

/**
 * Groups the indexes of items that serialize to the same JSON.
 *
 * @param values The items to compare.
 * @returns One index list per group of duplicates (groups of one are omitted).
 */
export function findDuplicateIndexes(values: readonly unknown[]): number[][] {
  const map = new Map<string, number[]>();
  values.forEach((v, i) => {
    const key = JSON.stringify(v);
    const list = map.get(key);
    if (list) list.push(i);
    else map.set(key, [i]);
  });
  return [...map.values()].filter((l) => l.length > 1);
}

/**
 * Issue for one group of duplicate indexes (see {@linkcode findDuplicateIndexes}).
 *
 * @param indexes The indexes of the duplicated items.
 * @returns The issue.
 */
export function uniqueItemsIssue(indexes: readonly number[]): KeywordIssue {
  return issue(
    "uniqueItems",
    msg.expectedUniqueItems(JSON.stringify(indexes)),
    undefined,
    indexes,
  );
}

/**
 * `uniqueItems` keyword. Returns one issue per group of duplicates.
 *
 * @param values The items to check.
 * @returns The issues, empty when all items are unique.
 */
export function checkUniqueItems(values: readonly unknown[]): KeywordIssue[] {
  return findDuplicateIndexes(values).map(uniqueItemsIssue);
}

/**
 * `minContains` keyword.
 *
 * @param matches How many items matched the `contains` schema.
 * @param minContains The minimum number of matches (`undefined` means 1).
 * @param contains The `contains` schema, used in the message.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMinContains(
  matches: number,
  minContains: number | undefined,
  contains: unknown,
): KeywordIssue | undefined {
  if ((minContains ?? 1) > matches) {
    return issue(
      "minContains",
      msg.expectedContainsMatch(
        `a minimum of ${minContains}`,
        contains,
        matches,
      ),
      minContains ?? 1,
      matches,
    );
  }
}

/**
 * `maxContains` keyword.
 *
 * @param matches How many items matched the `contains` schema.
 * @param maxContains The maximum number of matches.
 * @param contains The `contains` schema, used in the message.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMaxContains(
  matches: number,
  maxContains: number,
  contains: unknown,
): KeywordIssue | undefined {
  if (maxContains < matches) {
    return issue(
      "maxContains",
      msg.expectedContainsMatch(
        `a maximum of ${maxContains}`,
        contains,
        matches,
      ),
      maxContains,
      matches,
    );
  }
}

// ---------------------------------------------------------------------------
// Object keywords
// ---------------------------------------------------------------------------

/**
 * `minProperties` keyword.
 *
 * @param count The number of properties.
 * @param minProperties The minimum number of properties.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMinProperties(
  count: number,
  minProperties: number,
): KeywordIssue | undefined {
  if (minProperties > count) {
    return issue(
      "minProperties",
      msg.expected(
        "containing a minimum amount of properties of",
        minProperties,
        count,
      ),
      minProperties,
      count,
    );
  }
}

/**
 * `maxProperties` keyword.
 *
 * @param count The number of properties.
 * @param maxProperties The maximum number of properties.
 * @returns An issue, or `undefined` when valid.
 */
export function checkMaxProperties(
  count: number,
  maxProperties: number,
): KeywordIssue | undefined {
  if (maxProperties < count) {
    return issue(
      "maxProperties",
      msg.expected(
        "containing a maximum amount of properties of",
        maxProperties,
        count,
      ),
      maxProperties,
      count,
    );
  }
}

/**
 * `required` keyword for a single property.
 *
 * @param key The property that must be present.
 * @returns The issue to report for a missing property.
 */
export function missingPropertyIssue(key: string): KeywordIssue {
  return issue(
    "required",
    msg.expectedContains(`the property ${key}, but it was missing`),
    key,
  );
}

// ---------------------------------------------------------------------------
// Instance keywords
// ---------------------------------------------------------------------------

/**
 * `const` keyword (strict equality for primitives, JSON equality otherwise).
 *
 * @param value The value to check.
 * @param expected The constant.
 * @returns An issue, or `undefined` when valid.
 */
export function checkConst(
  value: unknown,
  expected: unknown,
): KeywordIssue | undefined {
  if (!jsonEquals(value, expected)) {
    return issue(
      "const",
      msg.expected("", expected, value),
      expected,
      value,
    );
  }
}

/**
 * `enum` keyword.
 *
 * @param value The value to check.
 * @param values The allowed values.
 * @returns An issue, or `undefined` when valid.
 */
export function checkEnum(
  value: unknown,
  values: readonly unknown[],
): KeywordIssue | undefined {
  if (!values.some((v) => jsonEquals(value, v))) {
    return issue(
      "enum",
      msg.expected("one of", JSON.stringify(values), value),
      values,
      value,
    );
  }
}

function jsonEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
