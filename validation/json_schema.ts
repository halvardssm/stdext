import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import type { JSONSchema, SchemaType } from "@stdext/json/json-schema/2020-12";
import {
  concatPathToIssues,
  failureResult,
  getMatchedName as getMatchedOutputString,
  getSchemaVersion,
  isEmptyObject,
  ISO8601_DATE,
  ISO8601_DATETIME,
  ISO8601_DURATION,
  ISO8601_TIME,
  isObject,
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
import type {
  InferCombinationOutput,
  InferMemberOutput,
  InferObjectOutput,
} from "./infer.ts";
import { validate as _validate } from "./validator.ts";

/**
 * Combined properties from both StandardSchemaV1 and StandardJSONSchemaV1.
 * This interface merges the props from both schema standards.
 *
 * @template Input - The input type for the schema
 * @template Output - The output type for the schema
 *
 * @example
 * ```typescript
 * type MyProps = CombinedProps<string, number>;
 * ```
 */
export interface CombinedProps<Input = unknown, Output = Input>
  extends
    StandardSchemaV1.Props<Input, Output>,
    StandardJSONSchemaV1.Props<Input, Output> {}

/**
 * An interface that combines StandardJSONSchema and StandardSchema.
 * This provides a comprehensive schema type that supports both standards.
 *
 * @template Input - The input type for the schema
 * @template Output - The output type for the schema
 *
 * @example
 * ```typescript
 * const schema: StandardSchemaWithJSONSchema<string, number> = {
 *   type: "string",
 *   "~standard": {
 *     version: 1,
 *     vendor: "@stdext/validation",
 *     validate: (value) => ({ value: parseInt(value) }),
 *     jsonSchema: {
 *       input: () => ({ type: "string" }),
 *       output: () => ({ type: "number" }),
 *     },
 *   },
 * };
 * ```
 */
export interface StandardSchemaWithJSONSchema<Input = unknown, Output = Input>
  extends
    StandardSchemaV1<Input, Output>,
    StandardJSONSchemaV1<Input, Output>,
    JSONSchema {
  "~standard": CombinedProps<Input, Output>;
  prefixItems?: StandardSchemaWithJSONSchemaInternal[];
  type: SchemaType;
  items?: StandardSchemaWithJSONSchemaInternal;
  contains?: StandardSchemaWithJSONSchemaInternal;
  additionalProperties?: StandardSchemaWithJSONSchemaInternal;
  properties?: Record<string, StandardSchemaWithJSONSchemaInternal>;
  patternProperties?: Record<string, StandardSchemaWithJSONSchemaInternal>;
  propertyNames?: StandardSchemaWithJSONSchema;
  allOf?: Exclude<StandardSchemaWithJSONSchema, boolean>[];
  anyOf?: Exclude<StandardSchemaWithJSONSchema, boolean>[];
  oneOf?: Exclude<StandardSchemaWithJSONSchema, boolean>[];
  not?: StandardSchemaWithJSONSchema;
  unevaluatedItems?: StandardSchemaWithJSONSchemaInternal;
  unevaluatedProperties?: StandardSchemaWithJSONSchemaInternal;
}

/**
 * Schema internal type that can be either a StandardSchemaWithJSONSchema or a boolean.
 * Used for nested schema definitions.
 *
 * @template Input - The input type for the schema
 * @template Output - The output type for the schema
 *
 * @see {@link JSONSchemaInternal}
 *
 * @example
 * ```typescript
 * type MySchemaInternal = StandardSchemaWithJSONSchemaInternal<string, number>;
 * ```
 */
export type StandardSchemaWithJSONSchemaInternal<
  Input = unknown,
  Output = Input,
> =
  | StandardSchemaWithJSONSchema<Input, Output>
  | boolean;

const msg = {
  /**
   * @param prefixExpected
   * @param expected
   * @param actual
   * @param actualPrefix
   * @returns The string
   * ```
   * Expected input to be ${prefixExpected}
   * ${JSON.stringify(expected)}, was ${actualPrefix}:
   * ${JSON.stringify(actual)}
   * ```
   */
  expected: (
    prefixExpected: string,
    expected: unknown,
    actual: unknown,
    actualPrefix?: string,
  ) =>
    `Expected input to be ${prefixExpected.length ? `${prefixExpected} ` : ""}${
      stringify(expected)
    }, was ${actualPrefix?.length ? `${actualPrefix}: ` : ""}${
      stringify(actual)
    }`,
  invalidValue: function (expected: unknown, actual: unknown) {
    return this.expected("", stringify(expected), stringify(actual));
  },
  invalidType: function (expected: unknown, actual: unknown) {
    return this.expected(
      "of type",
      stringify(expected),
      stringify(actual),
      typeof actual,
    );
  },
  /**
   * @param expected
   * @returns The string
   * ```
   * Expected input to contain ${expected}
   * ```
   */
  expectedContains: function (
    expected: unknown,
  ) {
    return `Expected input to contain ${expected}`;
  },
  /**
   * @param prefixExpected
   * @param expected
   * @param actual
   * @returns The string
   * ```
   * Expected input to contain ${prefixExpected}
   * element(s) matching ${JSON.stringify(expected)},
   * was ${actual}
   * ```
   */
  expectedContainsMatch: function (
    prefixExpected: string,
    expected: unknown,
    actual: number,
  ) {
    return this.expectedContains(
      `${prefixExpected} element(s) matching ${
        getMatchedOutputString(expected)
      }, was ${actual}`,
    );
  },
  expectedUniqueItems: function (actual: string) {
    return `Expected input to have unique items, following indexes were duplicates: ${actual}`;
  },
  propertyFalse: (actual: unknown) =>
    `Schema defines the property as false, this will always fail: ${
      JSON.stringify(actual)
    }`,
} as const;

/**
 * Schema properties for a specific type.
 * Combines StandardSchemaWithJSONSchema properties with a specific type.
 *
 * @template Type - The schema type (e.g., "string", "number", "object")
 * @template Input - The input type for the schema
 * @template Output - The output type for the schema
 *
 * @example
 * ```typescript
 * type StringSchemaProps = SchemaProps<"string", string, string>;
 * ```
 */
export type SchemaProps<
  Type extends SchemaType,
  Input = unknown,
  Output = Input,
> =
  & Omit<
    StandardSchemaWithJSONSchema<Input, Output>,
    "~standard"
  >
  & {
    "type": Type;
  };

/**
 * Internal function to create a schema object with standard properties.
 * Combines the provided props with the standard schema metadata.
 *
 * @template Type - The schema type (e.g., "string", "number", "object")
 * @template Input - The input type for the schema
 * @template Output - The output type for the schema
 * @template Props - The schema properties type
 * @param props - The schema properties to include
 * @param options - The standard schema options including validate, input, and output functions
 * @returns A complete schema object with standard metadata
 *
 * @example
 * ```typescript
 * const boolSchema = schema(
 *   { type: "boolean" },
 *   {
 *     validate: (value) => typeof value === "boolean" ? { value } : { issues: [{ message: "Not a boolean" }] },
 *     input: () => ({ type: "boolean" }),
 *     output: () => ({ type: "boolean" }),
 *   }
 * );
 * ```
 */
function schema<
  Type extends SchemaType = SchemaType,
  Input = unknown,
  Output = Input,
  Props extends SchemaProps<Type, Input, Output> = SchemaProps<
    Type,
    Input,
    Output
  >,
>(
  props: Props,
  options: {
    validate: StandardSchemaV1.Props<Input, Output>["validate"];
    input: StandardJSONSchemaV1.Converter["input"];
    output: StandardJSONSchemaV1.Converter["output"];
  },
): SchemaObject<Type, Input, Output, Props> {
  return {
    "~standard": {
      version: 1,
      vendor: "@stdext/validation",
      // Expose the inferred types so that `InferInput`/`InferOutput` (and the
      // spec's `StandardSchemaV1.InferInput`/`InferOutput`) resolve to the
      // schema's `Input`/`Output` rather than `unknown`.
      types: {
        input: undefined as unknown as Input,
        output: undefined as unknown as Output,
      },
      validate: options.validate,
      jsonSchema: {
        input: options.input,
        output: options.output,
      },
    },
    ...props,
  };
}

/**
 * Schema object type that combines StandardSchemaWithJSONSchema with specific props.
 * This is the return type for all schema creation functions.
 *
 * @template Type - The schema type (e.g., "string", "number", "object")
 * @template Input - The input type for the schema
 * @template Output - The output type for the schema
 * @template Props - The schema properties type
 *
 * @example
 * ```typescript
 * const boolSchema: SchemaObject<"boolean", boolean, boolean> = boolean();
 * ```
 */
export type SchemaObject<
  Type extends SchemaType,
  Input = unknown,
  Output = Input,
  Props extends SchemaProps<Type, Input, Output> = SchemaProps<
    Type,
    Input,
    Output
  >,
> = StandardSchemaWithJSONSchema<Input, Output> & Props;

/**
 * Options for boolean schema creation.
 * Currently a placeholder for future boolean-specific options.
 */
// deno-lint-ignore no-empty-interface
export interface BooleanOptions {
}

/**
 * Creates a boolean schema that validates boolean values.
 *
 * @param options - Optional boolean schema options
 * @returns A schema object for boolean validation
 *
 * @example
 * ```typescript
 * const boolSchema = boolean();
 * const result = validate(boolSchema, true);
 * // result: { value: true }
 * ```
 */
export function boolean(
  options?: BooleanOptions,
): SchemaObject<"boolean", boolean, boolean> {
  return schema(
    { type: "boolean", ...options },
    {
      validate: (value, _opts) => {
        if (typeof value !== "boolean") {
          return failureResult(msg.invalidType("boolean", value));
        }

        return { value };
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "boolean",
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "boolean",
        } satisfies JSONSchema;
      },
    },
  );
}

/**
 * Options for number schema creation.
 * Includes constraints like minimum, maximum, and multiples.
 *
 * @example
 * ```typescript
 * const numberOptions: NumberOptions = {
 *   minimum: 0,
 *   maximum: 100,
 *   multipleOf: 5,
 * };
 * ```
 */
export interface NumberOptions extends
  Pick<
    JSONSchema,
    | "multipleOf"
    | "minimum"
    | "maximum"
    | "exclusiveMinimum"
    | "exclusiveMaximum"
  > {
}

/**
 * Creates a number schema that validates numeric values.
 * Supports constraints like minimum, maximum, and multiples.
 *
 * @param options - Optional number schema options
 * @returns A schema object for number validation
 *
 * @example
 * ```typescript
 * const numberSchema = number({ minimum: 0, maximum: 100 });
 * const result = validate(numberSchema, 42);
 * // result: { value: 42 }
 * ```
 */
export function number(
  options?: NumberOptions,
): SchemaObject<"number", number, number> {
  return schema(
    { type: "number", ...options },
    {
      validate: (value, _opts) => {
        if (typeof value !== "number") {
          return failureResult(msg.invalidType("number", value));
        }

        if (!Number.isFinite(value)) {
          return failureResult(msg.invalidType("number", value));
        }

        if (
          typeof options?.multipleOf === "number" &&
          value % options.multipleOf !== 0
        ) {
          return failureResult(
            msg.expected(
              "a multiple of",
              options.multipleOf,
              value,
            ),
          );
        }

        if (typeof options?.minimum === "number" && options.minimum > value) {
          return failureResult(
            msg.expected(
              "a minimum (inclusive) value of",
              options.minimum,
              value,
            ),
          );
        }

        if (typeof options?.maximum === "number" && options.maximum < value) {
          return failureResult(
            msg.expected(
              "a maximum (inclusive) value of",
              options.maximum,
              value,
            ),
          );
        }

        if (
          typeof options?.exclusiveMinimum === "number" &&
          options.exclusiveMinimum >= value
        ) {
          return failureResult(
            msg.expected(
              "a minimum (exclusive) value of",
              options.exclusiveMinimum,
              value,
            ),
          );
        }

        if (
          typeof options?.exclusiveMaximum === "number" &&
          options.exclusiveMaximum <= value
        ) {
          return failureResult(
            msg.expected(
              "a maximum (exclusive) value of",
              options.exclusiveMaximum,
              value,
            ),
          );
        }

        return { value };
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "number",
          multipleOf: options?.multipleOf,
          minimum: options?.minimum,
          maximum: options?.maximum,
          exclusiveMinimum: options?.exclusiveMinimum,
          exclusiveMaximum: options?.exclusiveMaximum,
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "number",
          multipleOf: options?.multipleOf,
          minimum: options?.minimum,
          maximum: options?.maximum,
          exclusiveMinimum: options?.exclusiveMinimum,
          exclusiveMaximum: options?.exclusiveMaximum,
        } satisfies JSONSchema;
      },
    },
  );
}

/**
 * Options for integer schema creation.
 * Extends NumberOptions and validates that values are safe integers.
 *
 * @example
 * ```typescript
 * const integerOptions: IntegerOptions = {
 *   minimum: 0,
 *   maximum: 100,
 * };
 * ```
 */
export interface IntegerOptions extends NumberOptions {
}

/**
 * Creates an integer schema that validates integer values.
 * Values must be numbers that are safe integers (Number.isSafeInteger).
 *
 * @param options - Optional integer schema options
 * @returns A schema object for integer validation
 *
 * @example
 * ```typescript
 * const integerSchema = integer({ minimum: 0, maximum: 100 });
 * const result = validate(integerSchema, 42);
 * // result: { value: 42 }
 * ```
 */
export function integer(
  options?: IntegerOptions,
): SchemaObject<"integer", number, number> {
  return schema(
    { type: "integer", ...options },
    {
      validate: (value, _opts) => {
        if (!Number.isSafeInteger(value)) {
          return failureResult(msg.invalidType("integer", value));
        }

        return _validate(number(options), value);
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "integer",
          multipleOf: options?.multipleOf,
          minimum: options?.minimum,
          maximum: options?.maximum,
          exclusiveMinimum: options?.exclusiveMinimum,
          exclusiveMaximum: options?.exclusiveMaximum,
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "integer",
          multipleOf: options?.multipleOf,
          minimum: options?.minimum,
          maximum: options?.maximum,
          exclusiveMinimum: options?.exclusiveMinimum,
          exclusiveMaximum: options?.exclusiveMaximum,
        } satisfies JSONSchema;
      },
    },
  );
}

/**
 * Options for string schema creation.
 * Includes constraints like minLength, maxLength, pattern, and format.
 *
 * @example
 * ```typescript
 * const stringOptions: StringOptions = {
 *   minLength: 5,
 *   maxLength: 100,
 *   format: "email",
 * };
 * ```
 */
export interface StringOptions
  extends Pick<JSONSchema, "minLength" | "maxLength" | "pattern" | "format"> {
}

/**
 * Creates a string schema that validates string values.
 * Supports constraints like minLength, maxLength, pattern, and various formats.
 *
 * @param options - Optional string schema options
 * @returns A schema object for string validation
 *
 * @example
 * ```typescript
 * const emailSchema = string({ format: "email" });
 * const result = validate(emailSchema, "user@example.com");
 * // result: { value: "user@example.com" }
 * ```
 */
export function string(
  options?: StringOptions,
): SchemaObject<"string", string, string> {
  if (
    options?.format && ![
      "date-time",
      "date",
      "time",
      "duration",
      "email",
      "idn-email",
      "hostname",
      "idn-hostname",
      "ipv4",
      "ipv6",
      "uri",
      "uri-reference",
      "iri",
      "iri-reference",
      "uuid",
      "json-pointer",
      "relative-json-pointer",
    ].includes(options?.format)
  ) {
    throw new TypeError(
      `Format option of ${options.format} is not a supported format`,
    );
  }

  return schema(
    { type: "string", ...options },
    {
      validate: (value, _opts) => {
        if (typeof value !== "string") {
          return failureResult(msg.invalidType("string", value));
        }

        if (
          typeof options?.minLength === "number" &&
          options.minLength > value.length
        ) {
          return failureResult(
            msg.expected(
              "of minimum length",
              options.minLength,
              value,
              value.length.toString(),
            ),
          );
        }

        if (
          typeof options?.maxLength === "number" &&
          options.maxLength < value.length
        ) {
          return failureResult(
            msg.expected(
              "of maximum length",
              options.maxLength,
              value,
              value.length.toString(),
            ),
          );
        }

        if (options?.format) {
          let format: RegExp | undefined;
          switch (options.format) {
            case "date-time":
              format = ISO8601_DATETIME;
              break;
            case "date":
              format = ISO8601_DATE;
              break;
            case "time":
              format = ISO8601_TIME;
              break;
            case "duration":
              format = ISO8601_DURATION;
              break;
            case "email":
              format = RFC5321_EMAIL;
              break;
            case "idn-email":
              format = RFC6531_IDN_EMAIL;
              break;
            case "hostname":
              format = RFC1123_HOSTNAME;
              break;
            case "idn-hostname":
              format = RFC5890_IDN_HOSTNAME;
              break;
            case "ipv4":
              format = RFC2673_IPv4;
              break;
            case "ipv6":
              format = RFC2373_IPv6;
              break;
            case "uri":
              format = RFC3986_URI;
              break;
            case "uri-reference":
              format = RFC3986_URI_REFERENCE;
              break;
            case "iri":
              format = RFC3987_IRI;
              break;
            case "iri-reference":
              format = RFC6570_URI_TEMPLATE;
              break;
            case "uuid":
              format = RFC4122_UUID;
              break;
            case "json-pointer":
              format = RFC6901_JSON_POINTER;
              break;
            case "relative-json-pointer":
              format = RFC6901_RELATIVE_JSON_POINTER;
              break;
          }

          if (!format?.test(value)) {
            return failureResult(
              msg.expected("of format", options.format, value),
            );
          }
        }
        if (options?.pattern && !new RegExp(options.pattern).test(value)) {
          return failureResult(
            msg.expected("matching the pattern", options.pattern, value),
          );
        }

        return { value };
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "string",
          minLength: options?.minLength,
          maxLength: options?.maxLength,
          format: options?.format,
          pattern: options?.pattern,
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "string",
          minLength: options?.minLength,
          maxLength: options?.maxLength,
          format: options?.format,
          pattern: options?.pattern,
        } satisfies JSONSchema;
      },
    },
  );
}

/**
 * Options for nullable schema creation.
 * Currently a placeholder for future nullable-specific options.
 */
// deno-lint-ignore no-empty-interface
export interface NullableOptions {
}

/**
 * Creates a null schema that validates null values.
 *
 * @param options - Optional nullable schema options
 * @returns A schema object for null validation
 *
 * @example
 * ```typescript
 * const nullSchema = nullable();
 * const result = validate(nullSchema, null);
 * // result: { value: null }
 * ```
 */
export function nullable(
  options?: NullableOptions,
): SchemaObject<"null", null, null> {
  return schema(
    { type: "null", ...options },
    {
      validate: (value, _opts) => {
        if (value !== null) {
          return failureResult(msg.invalidType("null", value));
        }

        return { value };
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "null",
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "null",
        } satisfies JSONSchema;
      },
    },
  );
}

/**
 * Options for array schema creation.
 * Includes constraints for array items, length, and uniqueness.
 *
 * @example
 * ```typescript
 * const arrayOptions: ArrayOptions = {
 *   items: string(),
 *   minItems: 1,
 *   maxItems: 10,
 *   uniqueItems: true,
 * };
 * ```
 */
export interface ArrayOptions extends
  Pick<
    StandardSchemaWithJSONSchema,
    | "items"
    | "prefixItems"
    | "unevaluatedItems"
    | "contains"
    | "minContains"
    | "maxContains"
    | "minItems"
    | "maxItems"
    | "uniqueItems"
  > {
}

/**
 * The inferred output type for an array schema's element. When `items` is a
 * schema, this is its inferred output type; when it is a boolean or absent it
 * falls back to `unknown`.
 *
 * @template Options - The {@link ArrayOptions} passed to the builder
 */
export type ArrayElementOutput<Options extends ArrayOptions | undefined> =
  Options extends { items: infer Items } ? InferMemberOutput<Items>[]
    : unknown[];

/**
 * Creates an array schema that validates array values.
 * Supports constraints for items, length, and uniqueness.
 *
 * When `items` is provided, the schema's input and output types are inferred
 * from the item schema (e.g. `array({ items: string() })` infers `string[]`).
 *
 * @template O - The array options, used to infer the element type
 * @param options - Optional array schema options
 * @returns A schema object for array validation
 *
 * @example
 * ```typescript
 * const stringArraySchema = array({ items: string(), minItems: 1 });
 * const result = validate(stringArraySchema, ["hello", "world"]);
 * // result: { value: ["hello", "world"] }
 * const parsed: string[] = parse(stringArraySchema, ["hello", "world"]);
 * ```
 */
export function array<O extends ArrayOptions | undefined = undefined>(
  options?: O,
): SchemaObject<"array", ArrayElementOutput<O>, ArrayElementOutput<O>> {
  return schema(
    { type: "array", ...options },
    {
      validate: (value, _opts) => {
        if (!Array.isArray(value)) {
          return failureResult(msg.invalidType("array", value));
        }

        if (
          typeof options?.minItems === "number" &&
          options.minItems > value.length
        ) {
          return failureResult(
            msg.expected(
              "minimum length",
              options.minItems,
              value.length,
            ),
          );
        }

        if (
          typeof options?.maxItems === "number" &&
          options.maxItems < value.length
        ) {
          return failureResult(
            msg.expected(
              "maximum length",
              options.maxItems,
              value.length,
            ),
          );
        }

        const issues: StandardSchemaV1.Issue[] = [];

        let currentIndex: number = 0;
        const containsIndexes = new Set<number>();
        const valueMap = new Map<string, Set<number>>();

        const checkContains = (value: unknown, index: number) => {
          if (!options?.contains) {
            return;
          }
          const res = _validate(options.contains, value);
          if (!res.issues?.length) {
            containsIndexes.add(index);
          }
        };

        const checkDuplicates = (value: unknown, index: number) => {
          if (!options?.uniqueItems) {
            return;
          }

          const key = JSON.stringify(value);
          const duplicateSet = valueMap.getOrInsert(key, new Set());
          duplicateSet.add(index);
        };

        if (options?.prefixItems) {
          while (currentIndex < options.prefixItems.length) {
            const item = options.prefixItems[currentIndex];
            const val = value[currentIndex];
            const res = _validate(item, val);

            if (res.issues?.length) {
              issues.push(...concatPathToIssues([currentIndex], res.issues));
            }

            checkContains(val, currentIndex);
            checkDuplicates(val, currentIndex);

            currentIndex++;
          }
        }

        if (options?.items !== undefined) {
          if (!isEmptyObject(options.items)) {
            while (currentIndex < value.length) {
              const item = value[currentIndex];

              const res = _validate(options.items, item);

              if (res.issues?.length) {
                issues.push(...concatPathToIssues([currentIndex], res.issues));
              }

              checkContains(item, currentIndex);
              checkDuplicates(item, currentIndex);

              currentIndex++;
            }
          }
        }

        while (currentIndex < value.length) {
          const item = value[currentIndex];

          checkContains(item, currentIndex);

          if (
            options?.unevaluatedItems && !containsIndexes.has(currentIndex)
          ) {
            const res = _validate(options.unevaluatedItems, item);

            if (res.issues?.length) {
              issues.push(...concatPathToIssues([currentIndex], res.issues));
            }
          }

          checkDuplicates(item, currentIndex);

          currentIndex++;
        }

        if (options?.contains) {
          const minContains = options.minContains ?? 1;
          if (minContains > containsIndexes.size) {
            issues.push({
              message: msg.expectedContainsMatch(
                `a minimum of ${options.minContains}`,
                options.contains,
                containsIndexes.size,
              ),
            });
          }

          if (
            typeof options?.maxContains === "number" &&
            options.maxContains < containsIndexes.size
          ) {
            issues.push({
              message: msg.expectedContainsMatch(
                `a maximum of ${options.maxContains}`,
                options.contains,
                containsIndexes.size,
              ),
            });
          }
        }

        if (options?.uniqueItems) {
          for (const duplicateIndexes of valueMap.values()) {
            if (duplicateIndexes.size > 1) {
              issues.push({
                message: msg.expectedUniqueItems(
                  JSON.stringify([...duplicateIndexes]),
                ),
              });
            }
          }
        }

        return issues.length
          ? { issues }
          : { value: value as ArrayElementOutput<O> };
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "array",
          items: options?.items,
          prefixItems: options?.prefixItems,
          unevaluatedItems: options?.unevaluatedItems,
          contains: options?.contains,
          minContains: options?.minContains,
          maxContains: options?.maxContains,
          minItems: options?.minItems,
          maxItems: options?.maxItems,
          uniqueItems: options?.uniqueItems,
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "array",
          items: options?.items,
          prefixItems: options?.prefixItems,
          unevaluatedItems: options?.unevaluatedItems,
          contains: options?.contains,
          minContains: options?.minContains,
          maxContains: options?.maxContains,
          minItems: options?.minItems,
          maxItems: options?.maxItems,
          uniqueItems: options?.uniqueItems,
        } satisfies JSONSchema;
      },
    },
  );
}

/**
 * Options for object schema creation.
 * Includes constraints for properties, patterns, and additional properties.
 *
 * @example
 * ```typescript
 * const objectOptions: ObjectOptions = {
 *   properties: {
 *     name: string(),
 *     age: number(),
 *   },
 *   required: ["name"],
 *   additionalProperties: false,
 * };
 * ```
 */
export interface ObjectOptions extends
  Pick<
    StandardSchemaWithJSONSchema,
    | "properties"
    | "patternProperties"
    | "additionalProperties"
    | "unevaluatedProperties"
    | "required"
    | "propertyNames"
    | "minProperties"
    | "maxProperties"
  > {
}

/**
 * The inferred output type for an object schema, derived from its `properties`.
 *
 * All inferred properties are marked optional. JSON Schema's `required` field
 * is typed as `string[]`, which widens array literals and therefore cannot be
 * used to reliably distinguish required from optional keys at the type level.
 *
 * @template O - The {@link ObjectOptions} passed to the builder
 */
export type ObjectElementOutput<O extends ObjectOptions | undefined> = O extends
  { properties?: infer P } ? InferObjectOutput<P> : object;

/**
 * Creates an object schema that validates object values.
 * Supports constraints for properties, patterns, and additional properties.
 *
 * When `properties` is provided, the schema's input and output types are inferred
 * from the property schemas. All inferred properties are marked optional (see
 * {@link ObjectElementOutput}).
 *
 * @template O - The object options, used to infer the output shape
 * @param options - Optional object schema options
 * @returns A schema object for object validation
 *
 * @example
 * ```typescript
 * const personSchema = object({
 *   properties: {
 *     name: string(),
 *     age: number(),
 *   },
 *   required: ["name"],
 * });
 * const result = validate(personSchema, { name: "Alice", age: 30 });
 * // result: { value: { name: "Alice", age: 30 } }
 * const parsed: { name?: string; age?: number } = parse(personSchema, { name: "Alice" });
 * ```
 */
export function object<O extends ObjectOptions | undefined = undefined>(
  options?: O,
): SchemaObject<"object", ObjectElementOutput<O>, ObjectElementOutput<O>> {
  return schema(
    { type: "object", ...options },
    {
      validate: (value, _opts) => {
        if (!isObject(value)) {
          return failureResult(msg.invalidType("object", value));
        }

        const issues: StandardSchemaV1.Issue[] = [];

        if (options?.required) {
          for (const propertyKey of options.required) {
            const item = Reflect.get(value, propertyKey);

            if (!item) {
              issues.push({
                message: msg.expectedContains(
                  `the property ${propertyKey}, but it was missing`,
                ),
                path: [propertyKey],
              });
            }
          }

          if (issues.length) {
            return { issues };
          }
        }

        const valueKeys = Object.keys(value);

        if (
          typeof options?.minProperties === "number" &&
          options.minProperties > valueKeys.length
        ) {
          return failureResult(
            msg.expected(
              "containing a minimum amount of properties of",
              options.minProperties,
              valueKeys.length,
            ),
          );
        }

        if (
          typeof options?.maxProperties === "number" &&
          options.maxProperties < valueKeys.length
        ) {
          return failureResult(
            msg.expected(
              "containing a maximum amount of properties of",
              options.maxProperties,
              valueKeys.length,
            ),
          );
        }

        if (options?.propertyNames) {
          for (const k of valueKeys) {
            const res = _validate(options.propertyNames, k);

            if (res.issues?.length) {
              issues.push(...concatPathToIssues([k], res.issues));
            }
          }

          if (issues.length) {
            return { issues };
          }
        }

        const evaluatedProperties = new Set<string>();

        if (options?.properties) {
          for (
            const [propertyKey, propertySchema] of Object.entries(
              options.properties,
            )
          ) {
            evaluatedProperties.add(propertyKey);

            const item = Reflect.get(value, propertyKey);

            if (item) {
              const res = _validate(propertySchema, item);

              if (res.issues?.length) {
                issues.push(...concatPathToIssues([propertyKey], res.issues));
              }
            }
          }
        }

        if (options?.patternProperties) {
          for (
            const [propertyKey, propertySchema] of Object.entries(
              options.patternProperties,
            )
          ) {
            const matchedKeys = valueKeys.filter((k) => k.match(propertyKey));

            for (const matchedKey of matchedKeys) {
              const item = Reflect.get(value, matchedKey);

              const res = _validate(propertySchema, item);

              if (res.issues?.length) {
                issues.push(...concatPathToIssues([matchedKey], res.issues));
              } else {
                evaluatedProperties.add(matchedKey);
              }
            }
          }
        }

        if (
          options?.additionalProperties &&
          typeof options?.additionalProperties !== "boolean"
        ) {
          const unevaluatedProperties = new Set(valueKeys).difference(
            evaluatedProperties,
          );

          for (const k of unevaluatedProperties) {
            const item = Reflect.get(value, k);

            const res = _validate(options.additionalProperties, item);

            if (res.issues?.length) {
              issues.push(...concatPathToIssues([k], res.issues));
            }
          }
        }

        if (
          options?.unevaluatedProperties &&
          typeof options?.unevaluatedProperties !== "boolean"
        ) {
          const unevaluatedProperties = new Set(valueKeys).difference(
            evaluatedProperties,
          );

          for (const k of unevaluatedProperties) {
            const item = Reflect.get(value, k);

            const res = _validate(options.unevaluatedProperties, item);

            if (res.issues?.length) {
              issues.push(...concatPathToIssues([k], res.issues));
            }
          }
        }

        return issues.length
          ? { issues }
          : { value: value as ObjectElementOutput<O> };
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "object",
          properties: options?.properties,
          patternProperties: options?.patternProperties,
          additionalProperties: options?.additionalProperties,
          unevaluatedProperties: options?.unevaluatedProperties,
          required: options?.required,
          propertyNames: options?.propertyNames,
          minProperties: options?.minProperties,
          maxProperties: options?.maxProperties,
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "object",
          properties: options?.properties,
          patternProperties: options?.patternProperties,
          additionalProperties: options?.additionalProperties,
          unevaluatedProperties: options?.unevaluatedProperties,
          required: options?.required,
          propertyNames: options?.propertyNames,
          minProperties: options?.minProperties,
          maxProperties: options?.maxProperties,
        } satisfies JSONSchema;
      },
    },
  );
}

/**
 * Options for combination schema creation.
 * Includes allOf, anyOf, oneOf, and not for combining multiple schemas.
 *
 * @example
 * ```typescript
 * const combinationOptions: CombinationOptions = {
 *   allOf: [string(), { minLength: 5 }],
 * };
 * ```
 */
export interface CombinationOptions extends
  Pick<
    StandardSchemaWithJSONSchema,
    "allOf" | "anyOf" | "oneOf" | "not"
  > {
}

/**
 * The inferred output type for a combination schema, derived as the union of
 * the inferred output types of its `allOf`, `anyOf` and `oneOf` members. When
 * no members are present the result is `unknown`.
 *
 * @template O - The {@link CombinationOptions} passed to the builder
 */
export type CombinationElementOutput<O extends CombinationOptions | undefined> =
  O extends {
    allOf?: infer A;
    anyOf?: infer B;
    oneOf?: infer C;
  } ? InferCombinationOutput<
      A extends ReadonlyArray<unknown> ? A : [],
      B extends ReadonlyArray<unknown> ? B : [],
      C extends ReadonlyArray<unknown> ? C : []
    >
    : unknown;

/**
 * Creates a combination schema that combines multiple schemas.
 * Supports allOf, anyOf, oneOf, and not for complex validation logic.
 *
 * When `allOf`, `anyOf` or `oneOf` are provided, the schema's input and output
 * types are inferred as the union of the member schemas' output types.
 *
 * @template O - The combination options, used to infer the output union
 * @param options - Optional combination schema options
 * @returns A schema object for combination validation
 *
 * @example
 * ```typescript
 * const combinedSchema = combination({
 *   allOf: [string(), { minLength: 5 }],
 * });
 * const result = validate(combinedSchema, "hello world");
 * // result: { value: "hello world" }
 * const parsed: string = parse(combinedSchema, "hello world");
 * ```
 */
export function combination<
  O extends CombinationOptions | undefined = undefined,
>(
  options?: O,
): SchemaObject<
  "combination",
  CombinationElementOutput<O>,
  CombinationElementOutput<O>
> {
  return schema(
    { type: "combination", ...options },
    {
      validate: (
        value,
        _opts,
      ): StandardSchemaV1.Result<CombinationElementOutput<O>> => {
        const validateAndCount = (
          schemas: StandardSchemaV1 | StandardSchemaV1[],
        ) => {
          schemas = Array.isArray(schemas) ? schemas : [schemas];

          const issues: StandardSchemaV1.Issue[] = [];
          let countValid = 0;

          for (const s of schemas) {
            const res = _validate(s, value);
            if (res.issues?.length) {
              issues.push(...res.issues);
            } else {
              countValid++;
            }
          }

          return { issues, countValid };
        };

        if (options?.allOf) {
          const { issues } = validateAndCount(options.allOf);

          if (issues.length) {
            return { issues };
          }
        }

        if (options?.anyOf) {
          const { issues, countValid } = validateAndCount(options.anyOf);

          if (!countValid) {
            return { issues };
          }
        }

        if (options?.oneOf) {
          const { issues, countValid } = validateAndCount(options.oneOf);

          if (countValid !== 1) {
            return { issues };
          }
        }

        if (options?.not) {
          const { issues, countValid } = validateAndCount(options.not);

          if (countValid === 1) {
            return { issues };
          }
        }
        return { value: value as CombinationElementOutput<O> };
      },
      input: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "combination",
        } satisfies JSONSchema;
      },
      output: (params) => {
        return {
          $schema: getSchemaVersion(params.target),
          type: "combination",
        } satisfies JSONSchema;
      },
    },
  );
}
