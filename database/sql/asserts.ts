// deno-lint-ignore-file no-explicit-any

import { assertInstanceOf, AssertionError } from "@std/assert";
import {
  assertObjectHasProperties,
  assertObjectHasPropertiesNested,
  isString,
  objectHasProperties,
  objectHasPropertiesNested,
} from "@stdext/assert";
import type { JSONSchema } from "@stdext/json";
import type {
  ContextMetadata,
  Optionable,
  PreparedStatement,
  Queriable,
  ResultIterableContext,
  ResultObject,
  Transaction,
  Transactionable,
  TransactionOptions,
  TransactionOptionsWrapper as TransactionOptionsWrapper,
} from "./core.ts";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import { getDotPath, SchemaError } from "@standard-schema/utils";

export type ParserFn<S = unknown> = (s: S) => StandardSchemaV1;

/**
 * ContextMetadataJSONSchema
 *
 * @see {@link ContextMetadata}
 */
export const ContextMetadataJSONSchema = {
  type: "object",
  properties: { columns: { type: "array", items: { type: "string" } } },
  required: ["columns"],
  additionalProperties: true,
} satisfies JSONSchema;

/**
 * Validate ContextMetadata and return validation results
 */
export function validateContextMetadata(
  value: unknown,
  parser: ParserFn<typeof ContextMetadataJSONSchema>,
): StandardSchemaV1.Result<ContextMetadata> {
  return parser(ContextMetadataJSONSchema)["~standard"].validate(
    value,
  ) as StandardSchemaV1.Result<ContextMetadata>;
}

/**
 * Check if a value is ContextMetadata
 */
export function isContextMetadata(
  value: unknown,
  parser: ParserFn<typeof ContextMetadataJSONSchema>,
): value is ContextMetadata {
  return !validateContextMetadata(value, parser).issues?.length;
}

/**
 * Assert that a value is ContextMetadata
 */
export function assertIsContextMetadata(
  value: unknown,
  parser: ParserFn<typeof ContextMetadataJSONSchema>,
): asserts value is ContextMetadata {
  const result = validateContextMetadata(value, parser);

  if (result.issues) {
    throw new SchemaError(result.issues);
  }
}

/**
 * ResultObjectJSONSchema
 *
 * @see {@link ResultObject}
 */
export const ResultObjectJSONSchema = {
  type: "object",
  properties: { values: { type: "array", items: {} } },
  required: ["values"],
  additionalProperties: true,
} satisfies JSONSchema;

/**
 * Validate ResultObject and return validation results
 */
export function validateResultObject(
  value: unknown,
  parser: ParserFn<typeof ResultObjectJSONSchema>,
): StandardSchemaV1.Result<ResultObject> {
  return parser(ResultObjectJSONSchema)["~standard"].validate(
    value,
  ) as StandardSchemaV1.Result<ResultObject>;
}

/**
 * Check if a value is ResultObject
 */
export function isResultObject(
  value: unknown,
  parser: ParserFn<typeof ResultObjectJSONSchema>,
): value is ResultObject {
  return !validateResultObject(value, parser).issues?.length;
}

/**
 * Assert that a value is ResultObject
 */
export function assertIsResultObject(
  value: unknown,
  parser: ParserFn<typeof ResultObjectJSONSchema>,
): asserts value is ResultObject {
  const result = validateResultObject(value, parser);

  if (result.issues) {
    throw new SchemaError(result.issues);
  }
}
