import type { JSONSchema } from "@stdext/json/json-schema/2020-12";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type { Writeable } from "@stdext/types";

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

export function isObject(value: unknown): value is object {
  return typeof value === "object" && !Array.isArray(value) && value !== null;
}

export function isEmptyObject(
  value: unknown,
): value is Record<PropertyKey, never> {
  if (!isObject(value)) return false;

  for (const _i in value) {
    return false;
  }

  return true;
}

export function isEmptyPlainObject(
  value: unknown,
): value is Record<PropertyKey, never> {
  if (!isObject(value) || Reflect.ownKeys(value).length) return false;

  return true;
}

export function isStandardSchemaV1(value: unknown): value is StandardSchemaV1 {
  if (
    typeof (value as StandardSchemaV1)?.["~standard"]?.validate ===
      "function" && (value as StandardSchemaV1)?.["~standard"]?.version === 1
  ) {
    return true;
  }

  return false;
}
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

export function getSchemaVersion(
  target: StandardJSONSchemaV1.Target,
): NonNullable<JSONSchema["$schema"]> {
  if (target === "draft-2020-12") {
    return "https://json-schema.org/draft/2020-12/schema";
  }
  throw new TypeError(`Unsupported target: ${target}`);
}

export function failureResult(
  message: StandardSchemaV1.Issue["message"],
  path?: StandardSchemaV1.Issue["path"],
): StandardSchemaV1.FailureResult {
  return { issues: [{ message: message, path }] };
}

export function concatPathToIssues(
  path: Writeable<NonNullable<StandardSchemaV1.Issue["path"]>>,
  issues: ReadonlyArray<StandardSchemaV1.Issue>,
) {
  return issues.map((iss) => ({
    ...iss,
    path: [...path, ...(iss.path || [])],
  }));
}

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

export function getStandardJSONSchemaV1Input(
  schema: unknown,
  options: StandardJSONSchemaV1.Options,
): ReturnType<StandardJSONSchemaV1.Converter["input"]> {
  if (!isStandardJSONSchemaV1(schema)) {
    throw new TypeError(`Schema is not a valid StandardJSONSchemaV1`);
  }

  return schema["~standard"].jsonSchema.input(options);
}

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
