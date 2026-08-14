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
import { validate as _validate } from "./validator.ts";

export interface CombinedProps<Input = unknown, Output = Input>
  extends
    StandardSchemaV1.Props<Input, Output>,
    StandardJSONSchemaV1.Props<Input, Output> {}

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
      validate: options.validate,
      jsonSchema: {
        input: options.input,
        output: options.output,
      },
    },
    ...props,
  };
}

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

// deno-lint-ignore no-empty-interface
export interface BooleanOptions {
}

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

export interface IntegerOptions extends NumberOptions {
}

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

export interface StringOptions
  extends Pick<JSONSchema, "minLength" | "maxLength" | "pattern" | "format"> {
}

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

// deno-lint-ignore no-empty-interface
export interface NullableOptions {
}

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

export function array(
  options?: ArrayOptions,
): SchemaObject<"array", unknown[], unknown[]> {
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

        return issues.length ? { issues } : { value };
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

export function object(
  options?: ObjectOptions,
): SchemaObject<"object", object, object> {
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

        return issues.length ? { issues } : { value };
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

export interface CombinationOptions extends
  Pick<
    StandardSchemaWithJSONSchema,
    "allOf" | "anyOf" | "oneOf" | "not"
  > {
}

export function combination(
  options?: CombinationOptions,
): SchemaObject<"combination", unknown, unknown> {
  return schema(
    { type: "combination", ...options },
    {
      validate: (value, _opts) => {
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
        return { value };
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
