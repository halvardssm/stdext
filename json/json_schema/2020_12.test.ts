import { JSONSchema, JSONSchemaInternal } from "./2020_12.ts";

Deno.test("JSONSchema_2020_12 types", () => {
  // Test basic string schema
  const stringSchema: JSONSchema = { type: "string" };

  // Test array schema with items
  const arraySchema: JSONSchema = {
    type: "array",
    items: stringSchema,
  };

  // Test object schema with properties
  const _validSchema: JSONSchema = {
    type: "object",
    properties: {
      columns: arraySchema,
    },
    required: ["columns"],
    additionalProperties: false,
  };

  // Test with boolean schema (allowed in internal positions)
  const _booleanSchema: JSONSchemaInternal = true;

  // Test complex schema with multiple vocabularies
  const _complexSchema: JSONSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Person",
    description: "A person",
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "integer", minimum: 0 },
      email: { type: "string", format: "email" },
    },
    required: ["name", "age"],
    additionalProperties: false,
  };

  // Invalid type tests - these should fail type checking
  // @ts-expect-error - invalid type value (not in the union type)
  const _invalidTypeSchema: JSONSchema = { type: "invalid-type" };

  // @ts-expect-error - invalid $schema value (must be the specific URL)
  const _invalidSchemaUrl: JSONSchema = { $schema: "invalid-url" };

  // @ts-expect-error - invalid format value (must be string)
  const _invalidFormat: JSONSchema = { type: "string", format: 123 };

  const _invalidMultipleOf: JSONSchema = {
    type: "number",
    // @ts-expect-error - invalid multipleOf value (must be number)
    multipleOf: "string",
  };

  const _invalidExclusiveMaximum: JSONSchema = {
    type: "number",
    // @ts-expect-error - invalid exclusiveMaximum value (must be number)
    exclusiveMaximum: "string",
  };

  const _invalidExclusiveMinimum: JSONSchema = {
    type: "number",
    // @ts-expect-error - invalid exclusiveMinimum value (must be number)
    exclusiveMinimum: "string",
  };

  // @ts-expect-error - invalid pattern value (must be string)
  const _invalidPattern: JSONSchema = { type: "string", pattern: 123 };

  const _invalidUniqueItems: JSONSchema = {
    type: "array",
    // @ts-expect-error - invalid uniqueItems value (must be boolean)
    uniqueItems: "yes",
  };

  // @ts-expect-error - boolean not allowed in top-level JSONSchema_2020_12
  const _invalidBooleanSchema: JSONSchema = false;

  // @ts-expect-error - invalid enum format (must be array)
  const _invalidEnum: JSONSchema = { enum: "not-an-array" };

  const _invalidDependentRequired: JSONSchema = {
    type: "object",
    // @ts-expect-error - invalid dependentRequired format (must be object)
    dependentRequired: "not-an-object",
  };
});
