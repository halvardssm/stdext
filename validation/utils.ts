import type { JSONSchema } from "@stdext/json/json-schema/2020-12";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type { Writeable } from "@stdext/types";

/**
 * Converts a value to a string representation.
 * Handles primitive types directly and uses JSON.stringify for objects.
 *
 * @param value - The value to stringify
 * @returns A string representation of the value
 *
 * @example
 * ```typescript
 * stringify("hello"); // "hello"
 * stringify(42); // "42"
 * stringify(true); // "true"
 * stringify({ key: "value" }); // '{"key":"value"}'
 * stringify(() => {}); // "[Function ]"
 * ```
 */
export function stringify(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "bigint":
    case "boolean":
    case "symbol":
      return value.toString();
    case "function":
      // deno-lint-ignore ban-types
      return `[Function ${(value as Function).name}]`;
    case "undefined":
    case "object":
    default:
      return JSON.stringify(value);
  }
}

/**
 * Checks if a value is a plain object (not null, not an array).
 *
 * @param value - The value to check
 * @returns `true` if the value is an object and not an array or null, `false` otherwise
 *
 * @example
 * ```typescript
 * isObject({}); // true
 * isObject({ key: "value" }); // true
 * isObject(null); // false
 * isObject([]); // false
 * isObject("string"); // false
 * ```
 */
export function isObject(value: unknown): value is object {
  return typeof value === "object" && !Array.isArray(value) && value !== null;
}

/**
 * Checks if a value is an empty object (no enumerable properties).
 * Returns false for non-objects, arrays, and null.
 *
 * @param value - The value to check
 * @returns `true` if the value is an object with no enumerable properties, `false` otherwise
 *
 * @example
 * ```typescript
 * isEmptyObject({}); // true
 * isEmptyObject({ key: "value" }); // false
 * isEmptyObject([]); // false
 * isEmptyObject(null); // false
 * ```
 */
export function isEmptyObject(
  value: unknown,
): value is Record<PropertyKey, never> {
  if (!isObject(value)) return false;

  for (const _i in value) {
    return false;
  }

  return true;
}

/**
 * Checks if a value is an empty plain object (no own properties).
 * Uses Reflect.ownKeys to check for any own properties including non-enumerable ones.
 * Returns false for non-objects, arrays, and null.
 *
 * @param value - The value to check
 * @returns `true` if the value is an object with no own properties, `false` otherwise
 *
 * @example
 * ```typescript
 * isEmptyPlainObject({}); // true
 * isEmptyPlainObject({ key: "value" }); // false
 * isEmptyPlainObject(Object.create(null)); // true
 * isEmptyPlainObject([]); // false
 * isEmptyPlainObject(null); // false
 * ```
 */
export function isEmptyPlainObject(
  value: unknown,
): value is Record<PropertyKey, never> {
  if (!isObject(value) || Reflect.ownKeys(value).length) return false;

  return true;
}

/**
 * Checks if a value is a valid Standard Schema v1.
 * Validates that the value has a `~standard` property with a validate function and version 1.
 *
 * @param value - The value to check
 * @returns `true` if the value is a Standard Schema v1, `false` otherwise
 *
 * @example
 * ```typescript
 * const schema = { "~standard": { version: 1, validate: () => ({ value: "test" }) } };
 * isStandardSchemaV1(schema); // true
 * isStandardSchemaV1({}); // false
 * isStandardSchemaV1({ "~standard": { version: 2 } }); // false
 * ```
 */
export function isStandardSchemaV1(value: unknown): value is StandardSchemaV1 {
  if (
    typeof (value as StandardSchemaV1)?.["~standard"]?.validate ===
      "function" && (value as StandardSchemaV1)?.["~standard"]?.version === 1
  ) {
    return true;
  }

  return false;
}
/**
 * Checks if a value is a valid Standard JSON Schema v1.
 * Validates that the value has a `~standard` property with both input and output
 * JSON Schema converters.
 *
 * @param value - The value to check
 * @returns `true` if the value is a Standard JSON Schema v1, `false` otherwise
 *
 * @example
 * ```typescript
 * const schema = {
 *   "~standard": {
 *     version: 1,
 *     jsonSchema: {
 *       input: () => ({ type: "string" }),
 *       output: () => ({ type: "string" })
 *     }
 *   }
 * };
 * isStandardJSONSchemaV1(schema); // true
 * isStandardJSONSchemaV1({}); // false
 * ```
 */
export function isStandardJSONSchemaV1(
  value: unknown,
): value is StandardJSONSchemaV1 {
  if (
    typeof (value as StandardJSONSchemaV1)?.["~standard"]?.jsonSchema.input ===
      "function" &&
    typeof (value as StandardJSONSchemaV1)?.["~standard"]?.jsonSchema.output ===
      "function"
  ) {
    return true;
  }

  return false;
}

/**
 * Gets the JSON Schema URI for a given target version.
 *
 * @param target - The JSON Schema target version (currently only `draft-2020-12` is supported)
 * @returns The corresponding JSON Schema URI
 * @throws TypeError if the target is not supported
 *
 * @example
 * ```typescript
 * getSchemaVersion("draft-2020-12"); // "https://json-schema.org/draft/2020-12/schema"
 * ```
 */
export function getSchemaVersion(
  target: StandardJSONSchemaV1.Target,
): NonNullable<JSONSchema["$schema"]> {
  if (target === "draft-2020-12") {
    return "https://json-schema.org/draft/2020-12/schema";
  }
  throw new TypeError(`Unsupported target: ${target}`);
}

/**
 * Creates a failure result for schema validation.
 *
 * @param message - The error message for the validation issue
 * @param path - Optional path to the invalid value in the input
 * @returns A failure result object with the issue
 *
 * @example
 * ```typescript
 * const result = failureResult("Expected a string", ["name"]);
 * // { issues: [{ message: "Expected a string", path: ["name"] }] }
 * ```
 */
export function failureResult(
  message: StandardSchemaV1.Issue["message"],
  path?: StandardSchemaV1.Issue["path"],
): StandardSchemaV1.FailureResult {
  return { issues: [{ message: message, path }] };
}

/**
 * Concatenates a path prefix to all issues in an array.
 * Used to build nested error paths during schema validation.
 *
 * @param path - The path prefix to prepend to each issue's path
 * @param issues - The array of issues to process
 * @returns A new array of issues with concatenated paths
 *
 * @example
 * ```typescript
 * const issues = [{ message: "Invalid", path: ["email"] }];
 * const prefixed = concatPathToIssues(["user"], issues);
 * // [{ message: "Invalid", path: ["user", "email"] }]
 * ```
 */
export function concatPathToIssues(
  path: Writeable<NonNullable<StandardSchemaV1.Issue["path"]>>,
  issues: ReadonlyArray<StandardSchemaV1.Issue>,
) {
  return issues.map((iss) => ({
    ...iss,
    path: [...path, ...(iss.path || [])],
  }));
}

/**
 * Gets a descriptive string representation of a JSON Schema value.
 * If the value has type, pattern, or format properties, returns a JSON string
 * with those properties. Otherwise, returns the JSON stringified value.
 *
 * @param value - The value to get a matched name for
 * @returns A string representation of the value's schema characteristics
 *
 * @example
 * ```typescript
 * getMatchedName({ type: "string", format: "email" }); // '{"type":"string","format":"email"}'
 * getMatchedName({ pattern: "^\\d+$" }); // '{"pattern":"^\\d+$"}'
 * getMatchedName("test"); // '"test"'
 * ```
 */
export function getMatchedName(value: unknown): string {
  if (
    (value as JSONSchema).type || (value as JSONSchema).pattern ||
    (value as JSONSchema).format
  ) {
    return JSON.stringify({
      type: (value as JSONSchema).type,
      pattern: (value as JSONSchema).pattern,
      format: (value as JSONSchema).format,
    });
  }

  return JSON.stringify(value);
}

/**
 * Gets the JSON Schema input representation from a Standard JSON Schema v1.
 * Calls the schema's jsonSchema.input converter with the provided options.
 *
 * @param schema - The schema to get input from
 * @param options - Options to pass to the input converter
 * @returns The JSON Schema input representation
 * @throws TypeError if the schema is not a valid StandardJSONSchemaV1
 *
 * @example
 * ```typescript
 * const schema = string({ format: "email" });
 * const inputSchema = getStandardJSONSchemaV1Input(schema, { target: "draft-2020-12" });
 * // Returns: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "string", format: "email" }
 * ```
 */
export function getStandardJSONSchemaV1Input(
  schema: unknown,
  options: StandardJSONSchemaV1.Options,
): ReturnType<StandardJSONSchemaV1.Converter["input"]> {
  if (!isStandardJSONSchemaV1(schema)) {
    throw new TypeError(`Schema is not a valid StandardJSONSchemaV1`);
  }

  return schema["~standard"].jsonSchema.input(options);
}

/**
 * Gets the JSON Schema output representation from a Standard JSON Schema v1.
 * Calls the schema's jsonSchema.output converter with the provided options.
 *
 * @param schema - The schema to get output from
 * @param options - Options to pass to the output converter
 * @returns The JSON Schema output representation
 * @throws TypeError if the schema is not a valid StandardJSONSchemaV1
 *
 * @example
 * ```typescript
 * const schema = string({ format: "email" });
 * const outputSchema = getStandardJSONSchemaV1Output(schema, { target: "draft-2020-12" });
 * // Returns: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "string", format: "email" }
 * ```
 */
export function getStandardJSONSchemaV1Output(
  schema: unknown,
  options: StandardJSONSchemaV1.Options,
): ReturnType<StandardJSONSchemaV1.Converter["output"]> {
  if (!isStandardJSONSchemaV1(schema)) {
    throw new TypeError(`Schema is not a valid StandardJSONSchemaV1`);
  }

  return schema["~standard"].jsonSchema.output(options);
}

/**
 * REGEXP
 */

export const ISO8601_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
export const ISO8601_TIME =
  /^\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
export const ISO8601_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const ISO8601_DURATION =
  /^P(?!$)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/;

// Email
export const RFC5321_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const RFC6531_IDN_EMAIL =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$|^[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}$/u;

// Hostname
export const RFC1123_HOSTNAME = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
export const RFC5890_IDN_HOSTNAME = /^(?:[\p{L}0-9-]+\.)+[\p{L}]{2,}$/u;

// IP Addresses
export const RFC2673_IPv4 =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
export const RFC2373_IPv6 =
  /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?::(([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})?$/;

// UUID
export const RFC4122_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// URIs and IRIs
export const RFC3986_URI =
  /^(?:[a-zA-Z][a-zA-Z0-9.+\-]*):\/\/[a-zA-Z0-9.\-]+(?::\d+)?(?:\/[^\s]*)?$/;
export const RFC3986_URI_REFERENCE =
  /^(?:[a-zA-Z][a-zA-Z0-9.+\-]*):\/\/[a-zA-Z0-9.\-]+(?::\d+)?(?:\/[^\s]*)?|^\/[^\s]*$/;
export const RFC3987_IRI =
  /^(?:[a-zA-Z][a-zA-Z0-9.+\-]*):\/\/[a-zA-Z0-9.\-%]+(?::\d+)?(?:\/[^\s]*)?$/u;
export const RFC3987_IRI_REFERENCE =
  /^(?:[a-zA-Z][a-zA-Z0-9.+\-]*):\/\/[a-zA-Z0-9.\-%]+(?::\d+)?(?:\/[^\s]*)?|^\/[^\s]*$/u;
export const RFC6570_URI_TEMPLATE =
  /^(?:[a-zA-Z][a-zA-Z0-9.+\-]*):\/\/[a-zA-Z0-9.\-%]+(?::\d+)?(?:\/[^\s]*)?|^\/[^\s]*$/u;

// JSON Pointers
export const RFC6901_JSON_POINTER = /^(?:\/+)\S*$/;
export const RFC6901_RELATIVE_JSON_POINTER = /^(?:\/|#|\d+)\S*$/;
