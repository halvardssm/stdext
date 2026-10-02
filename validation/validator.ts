import type { StandardSchemaV1 } from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import { stringify } from "./utils.ts";

/**
 * Validates input against a StandardSchema
 *
 * Support both sync and async validate methods according to spec
 *
 * @template S - The schema type extending StandardSchemaV1
 * @param schema - The schema to validate against
 * @param input - The input data to validate
 * @param options - Optional validation options specific to the schema
 * @returns A validation result or a Promise of a validation result
 *
 * @example
 * ```ts
 * import { object, string, validateAsync } from "@stdext/validation";
 *
 * const mySchema = object({
 *   properties: { name: string() },
 *   required: ["name"],
 * });
 *
 * const result = await validateAsync(mySchema, { name: "Alice" });
 * if (result.issues) {
 *   console.error("Validation failed:", result.issues);
 * } else {
 *   console.log("Valid:", result.value);
 * }
 * ```
 */
export function validateAsync<S extends StandardSchemaV1>(
  schema: S | boolean,
  input: StandardSchemaV1.InferInput<S> | unknown,
  options?: Parameters<S["~standard"]["validate"]>[1],
):
  | StandardSchemaV1.Result<StandardSchemaV1.InferOutput<S>>
  | Promise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<S>>> {
  if (schema === true) return { value: input };
  if (schema === false) {
    return {
      issues: [{
        message:
          `Schema defines the property as false, this will always fail: ${
            stringify(input)
          }`,
      }],
    };
  }

  if (!schema?.["~standard"]?.validate) {
    return { issues: [{ message: "The input is not a valid StandardSchema" }] };
  }
  return schema["~standard"].validate(input, options);
}

/**
 * Validates input against a StandardSchema synchronously.
 *
 * @template S - The schema type extending StandardSchemaV1
 * @param schema - The schema to validate against
 * @param input - The input data to validate
 * @param options - Optional validation options specific to the schema
 * @returns A validation result
 * @throws TypeError if the schema validation is asynchronous
 *
 * @example
 * ```ts
 * import { object, string, validate } from "@stdext/validation";
 *
 * const mySchema = object({
 *   properties: { name: string() },
 *   required: ["name"],
 * });
 *
 * const result = validate(mySchema, { name: "Alice" });
 * if (result.issues) {
 *   console.error("Validation failed:", result.issues);
 * } else {
 *   console.log("Valid:", result.value);
 * }
 * ```
 */
export function validate<S extends StandardSchemaV1>(
  schema: S | boolean,
  input: StandardSchemaV1.InferInput<S> | unknown,
  options?: Parameters<S["~standard"]["validate"]>[1],
): StandardSchemaV1.Result<StandardSchemaV1.InferOutput<S>> {
  const result = validateAsync(schema, input, options);
  if (result instanceof Promise) {
    throw new TypeError("Schema validation must be synchronous");
  }
  return result;
}

/**
 * Validates and parses input against a StandardSchema asynchronously.
 *
 * @template S - The schema type extending StandardSchemaV1
 * @param schema - The schema to validate against
 * @param input - The input data to validate and parse
 * @param options - Optional validation options specific to the schema
 * @returns A Promise resolving to the parsed output value
 * @throws SchemaError if validation fails
 *
 * @example
 * ```ts
 * import { object, parseAsync, string } from "@stdext/validation";
 * import { SchemaError } from "@standard-schema/utils";
 *
 * const mySchema = object({
 *   properties: { name: string() },
 *   required: ["name"],
 * });
 *
 * try {
 *   const parsed = await parseAsync(mySchema, { name: "Alice" });
 *   console.log("Parsed value:", parsed);
 * } catch (error) {
 *   if (error instanceof SchemaError) {
 *     console.error("Validation errors:", error.issues);
 *   }
 * }
 * ```
 */
export async function parseAsync<S extends StandardSchemaV1>(
  schema: S | boolean,
  input: StandardSchemaV1.InferInput<S> | unknown,
  options?: Parameters<S["~standard"]["validate"]>[1],
): Promise<StandardSchemaV1.InferOutput<S>> {
  let result = validateAsync(schema, input, options);
  if (result instanceof Promise) result = await result;

  if (result.issues) {
    throw new SchemaError(result.issues);
  }

  return result.value;
}

/**
 * Validates and parses input against a StandardSchema synchronously.
 *
 * @template S - The schema type extending StandardSchemaV1
 * @param schema - The schema to validate against
 * @param input - The input data to validate and parse
 * @param options - Optional validation options specific to the schema
 * @returns The parsed output value
 * @throws SchemaError if validation fails
 * @throws TypeError if the schema validation is asynchronous
 *
 * @example
 * ```ts
 * import { object, parse, string } from "@stdext/validation";
 * import { SchemaError } from "@standard-schema/utils";
 *
 * const mySchema = object({
 *   properties: { name: string() },
 *   required: ["name"],
 * });
 *
 * try {
 *   const parsed = parse(mySchema, { name: "Alice" });
 *   console.log("Parsed value:", parsed);
 * } catch (error) {
 *   if (error instanceof SchemaError) {
 *     console.error("Validation errors:", error.issues);
 *   } else if (error instanceof TypeError) {
 *     console.error("Async validation not supported in sync mode");
 *   }
 * }
 * ```
 */
export function parse<S extends StandardSchemaV1>(
  schema: S | boolean,
  input: StandardSchemaV1.InferInput<S> | unknown,
  options?: Parameters<S["~standard"]["validate"]>[1],
): StandardSchemaV1.InferOutput<S> {
  const result = validate(schema, input, options);

  if (result.issues) {
    throw new SchemaError(result.issues);
  }

  return result.value;
}
