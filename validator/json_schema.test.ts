// deno-lint-ignore-file no-explicit-any

import { assert, assertEquals, assertThrows } from "@std/assert";
import { validator, fromJsonSchema, toJsonSchema, commonFormatValidators } from "./mod.ts";

// Test helper to check validation success
function assertValid<T>(result: { success: boolean; value?: T; issues?: unknown[] }): asserts result is { success: true; value: T } {
  if (!result.success) {
    throw new Error(`Expected validation to succeed, but got issues: ${JSON.stringify(result.issues, null, 2)}`);
  }
}

// Test helper to check validation failure
function assertInvalid(result: { success: boolean; value?: unknown; issues?: unknown[] }): asserts result is { success: false; issues: unknown[] } {
  if (result.success) {
    throw new Error("Expected validation to fail, but it succeeded");
  }
}

Deno.test("fromJsonSchema - basic string schema", () => {
  const jsonSchema = {
    type: "string",
    title: "String Schema",
    description: "A simple string schema",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid string
  const validResult = validator.validate("hello");
  assertValid(validResult);
  assertEquals(validResult.value, "hello");
  
  // Test invalid string
  const invalidResult = validator.validate(123);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - number schema", () => {
  const jsonSchema = {
    type: "number",
    description: "A number schema",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid number
  const validResult = validator.validate(42);
  assertValid(validResult);
  assertEquals(validResult.value, 42);
  
  // Test invalid number
  const invalidResult = validator.validate("42");
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - boolean schema", () => {
  const jsonSchema = {
    type: "boolean",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid boolean
  const validResult = validator.validate(true);
  assertValid(validResult);
  assertEquals(validResult.value, true);
  
  // Test invalid boolean
  const invalidResult = validator.validate("true");
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - null schema", () => {
  const jsonSchema = {
    type: "null",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid null
  const validResult = validator.validate(null);
  assertValid(validResult);
  assertEquals(validResult.value, null);
  
  // Test invalid null
  const invalidResult = validator.validate(undefined);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - array schema", () => {
  const jsonSchema = {
    type: "array",
    items: {
      type: "string",
    },
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid array
  const validResult = validator.validate(["a", "b", "c"]);
  assertValid(validResult);
  assertEquals(validResult.value, ["a", "b", "c"]);
  
  // Test invalid array (wrong item type)
  const invalidResult = validator.validate(["a", 1, "c"]);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - object schema", () => {
  const jsonSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name", "age"],
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid object
  const validResult = validator.validate({
    name: "John",
    age: 30,
  });
  assertValid(validResult);
  assertEquals(validResult.value.name, "John");
  assertEquals(validResult.value.age, 30);
  
  // Test invalid object (missing required property)
  const invalidResult1 = validator.validate({
    name: "John",
    // age is missing
  });
  assertInvalid(invalidResult1);
  
  // Test invalid object (wrong property type)
  const invalidResult2 = validator.validate({
    name: "John",
    age: "thirty",
  });
  assertInvalid(invalidResult2);
});

Deno.test("fromJsonSchema - object schema with additionalProperties", () => {
  const jsonSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
    },
    additionalProperties: false,
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid object
  const validResult = validator.validate({
    name: "John",
  });
  assertValid(validResult);
  
  // Test invalid object (extra property)
  const invalidResult = validator.validate({
    name: "John",
    extra: "property",
  });
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - const schema", () => {
  const jsonSchema = {
    const: "fixed-value",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid const
  const validResult = validator.validate("fixed-value");
  assertValid(validResult);
  assertEquals(validResult.value, "fixed-value");
  
  // Test invalid const
  const invalidResult = validator.validate("other-value");
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - enum schema", () => {
  const jsonSchema = {
    enum: ["red", "green", "blue"],
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid enum values
  const validResult1 = validator.validate("red");
  assertValid(validResult1);
  assertEquals(validResult1.value, "red");
  
  const validResult2 = validator.validate("green");
  assertValid(validResult2);
  assertEquals(validResult2.value, "green");
  
  // Test invalid enum value
  const invalidResult = validator.validate("yellow");
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - oneOf schema", () => {
  const jsonSchema = {
    oneOf: [
      { type: "string" },
      { type: "number" },
    ],
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid oneOf (string)
  const validStringResult = validator.validate("hello");
  assertValid(validStringResult);
  assertEquals(validStringResult.value, "hello");
  
  // Test valid oneOf (number)
  const validNumberResult = validator.validate(42);
  assertValid(validNumberResult);
  assertEquals(validNumberResult.value, 42);
  
  // Test invalid oneOf
  const invalidResult = validator.validate(true);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - anyOf schema", () => {
  const jsonSchema = {
    anyOf: [
      { type: "string" },
      { type: "number" },
    ],
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid anyOf (string)
  const validStringResult = validator.validate("hello");
  assertValid(validStringResult);
  assertEquals(validStringResult.value, "hello");
  
  // Test valid anyOf (number)
  const validNumberResult = validator.validate(42);
  assertValid(validNumberResult);
  assertEquals(validNumberResult.value, 42);
  
  // Test invalid anyOf
  const invalidResult = validator.validate(true);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - allOf schema", () => {
  const jsonSchema = {
    allOf: [
      { type: "object", properties: { name: { type: "string" } } },
      { type: "object", properties: { age: { type: "number" } } },
    ],
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid allOf
  const validResult = validator.validate({
    name: "John",
    age: 30,
  });
  assertValid(validResult);
  assertEquals(validResult.value.name, "John");
  assertEquals(validResult.value.age, 30);
  
  // Test invalid allOf (missing property from first schema)
  const invalidResult1 = validator.validate({
    age: 30,
  });
  assertInvalid(invalidResult1);
});

Deno.test("fromJsonSchema - nested object schema", () => {
  const jsonSchema = {
    type: "object",
    properties: {
      user: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string", format: "email" },
        },
        required: ["name", "email"],
      },
    },
    required: ["user"],
  };
  
  const validator = fromJsonSchema(jsonSchema, {
    formatValidators: commonFormatValidators,
  });
  
  // Test valid nested object
  const validResult = validator.validate({
    user: {
      name: "John",
      email: "john@example.com",
    },
  });
  assertValid(validResult);
  assertEquals(validResult.value.user.name, "John");
  assertEquals(validResult.value.user.email, "john@example.com");
  
  // Test invalid nested object (invalid email format)
  const invalidResult = validator.validate({
    user: {
      name: "John",
      email: "invalid-email",
    },
  });
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - array of objects schema", () => {
  const jsonSchema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
      },
      required: ["id", "name"],
    },
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid array of objects
  const validResult = validator.validate([
    { id: 1, name: "first" },
    { id: 2, name: "second" },
  ]);
  assertValid(validResult);
  assertEquals(validResult.value.length, 2);
  assertEquals(validResult.value[0].id, 1);
  assertEquals(validResult.value[1].name, "second");
  
  // Test invalid array of objects
  const invalidResult = validator.validate([
    { id: 1, name: "first" },
    { id: "two", name: "second" }, // invalid id
  ]);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - multiple types (union)", () => {
  const jsonSchema = {
    type: ["string", "number"],
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid string
  const validStringResult = validator.validate("hello");
  assertValid(validStringResult);
  assertEquals(validStringResult.value, "hello");
  
  // Test valid number
  const validNumberResult = validator.validate(42);
  assertValid(validNumberResult);
  assertEquals(validNumberResult.value, 42);
  
  // Test invalid (neither string nor number)
  const invalidResult = validator.validate(true);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - integer type", () => {
  const jsonSchema = {
    type: "integer",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Test valid integer
  const validResult = validator.validate(42);
  assertValid(validResult);
  assertEquals(validResult.value, 42);
  
  // Test invalid integer (float)
  const invalidResult = validator.validate(42.5);
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - with format validators", () => {
  const jsonSchema = {
    type: "string",
    format: "email",
  };
  
  const validator = fromJsonSchema(jsonSchema, {
    formatValidators: commonFormatValidators,
  });
  
  // Test valid email
  const validResult = validator.validate("test@example.com");
  assertValid(validResult);
  assertEquals(validResult.value, "test@example.com");
  
  // Test invalid email
  const invalidResult = validator.validate("invalid-email");
  assertInvalid(invalidResult);
});

Deno.test("fromJsonSchema - with custom format validators", () => {
  const jsonSchema = {
    type: "string",
    format: "custom-format",
  };
  
  const validator = fromJsonSchema(jsonSchema, {
    formatValidators: {
      "custom-format": (value: unknown, path) => {
        if (typeof value !== "string" || !value.startsWith("custom-")) {
          return {
            success: false,
            issues: [{ message: "String must start with 'custom-'", path }],
          };
        }
        return { success: true, value };
      },
    },
  });
  
  // Test valid custom format
  const validResult = validator.validate("custom-value");
  assertValid(validResult);
  assertEquals(validResult.value, "custom-value");
  
  // Test invalid custom format
  const invalidResult = validator.validate("invalid-value");
  assertInvalid(invalidResult);
});

Deno.test("toJsonSchema - string validator", () => {
  const stringValidator = validator.string();
  const jsonSchema = toJsonSchema(stringValidator);
  
  assertEquals(jsonSchema.type, "string");
  assert(jsonSchema.$schema !== undefined);
});

Deno.test("toJsonSchema - number validator", () => {
  const numberValidator = validator.number();
  const jsonSchema = toJsonSchema(numberValidator);
  
  assertEquals(jsonSchema.type, "number");
});

Deno.test("toJsonSchema - boolean validator", () => {
  const booleanValidator = validator.boolean();
  const jsonSchema = toJsonSchema(booleanValidator);
  
  assertEquals(jsonSchema.type, "boolean");
});

Deno.test("toJsonSchema - null validator", () => {
  const nullValidator = validator.null();
  const jsonSchema = toJsonSchema(nullValidator);
  
  assertEquals(jsonSchema.type, "null");
});

Deno.test("toJsonSchema - array validator", () => {
  const arrayValidator = validator.array(validator.string());
  const jsonSchema = toJsonSchema(arrayValidator);
  
  assertEquals(jsonSchema.type, "array");
  assert(jsonSchema.items !== undefined);
  assertEquals((jsonSchema.items as { type: string }).type, "string");
});

Deno.test("toJsonSchema - object validator", () => {
  const objectValidator = validator.object({
    name: validator.string(),
    age: validator.number(),
  });
  const jsonSchema = toJsonSchema(objectValidator);
  
  assertEquals(jsonSchema.type, "object");
  assert(jsonSchema.properties !== undefined);
  assertEquals((jsonSchema.properties as Record<string, { type: string }>).name.type, "string");
  assertEquals((jsonSchema.properties as Record<string, { type: string }>).age.type, "number");
  assert(jsonSchema.required !== undefined);
  assert(jsonSchema.required.includes("name"));
  assert(jsonSchema.required.includes("age"));
});

Deno.test("toJsonSchema - without metadata", () => {
  const stringValidator = validator.string();
  const jsonSchema = toJsonSchema(stringValidator, {
    includeMetadata: false,
  });
  
  assertEquals(jsonSchema.type, "string");
  assert(jsonSchema.$schema === undefined);
  assert(jsonSchema.description === undefined);
});

Deno.test("toJsonSchema - with custom target", () => {
  const stringValidator = validator.string();
  const jsonSchema = toJsonSchema(stringValidator, {
    target: "draft-07",
  });
  
  assertEquals(jsonSchema.$schema, "http://json-schema.org/draft-07/schema#");
});

Deno.test("toJsonSchema - bigint validator", () => {
  const bigintValidator = validator.bigint();
  const jsonSchema = toJsonSchema(bigintValidator);
  
  assertEquals(jsonSchema.type, "integer");
});

Deno.test("toJsonSchema - symbol validator", () => {
  const symbolValidator = validator.symbol();
  const jsonSchema = toJsonSchema(symbolValidator);
  
  assertEquals(jsonSchema.type, "string");
});

Deno.test("toJsonSchema - record validator", () => {
  const recordValidator = validator.record(validator.string());
  const jsonSchema = toJsonSchema(recordValidator);
  
  assertEquals(jsonSchema.type, "object");
  assert(jsonSchema.additionalProperties !== undefined);
});

Deno.test("Round-trip test: JSON Schema -> Validator -> JSON Schema", () => {
  const originalJsonSchema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["name", "age"],
  };
  
  // Convert JSON Schema to validator
  const validator = fromJsonSchema(originalJsonSchema);
  
  // Test validation
  const validResult = validator.validate({
    name: "John",
    age: 30,
    tags: ["developer", "typescript"],
  });
  assertValid(validResult);
  
  // Convert validator back to JSON Schema
  const convertedJsonSchema = toJsonSchema(validator);
  
  // Check that the converted schema has the expected structure
  assertEquals(convertedJsonSchema.type, "object");
  assert(convertedJsonSchema.properties !== undefined);
  assertEquals((convertedJsonSchema.properties as Record<string, { type: string }>).name.type, "string");
  assertEquals((convertedJsonSchema.properties as Record<string, { type: string }>).age.type, "number");
});

Deno.test("fromJsonSchema - handles missing type gracefully", () => {
  const jsonSchema = {
    // No type specified
    description: "A schema without type",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Should accept any value
  const validResult1 = validator.validate("string");
  assertValid(validResult1);
  
  const validResult2 = validator.validate(123);
  assertValid(validResult2);
  
  const validResult3 = validator.validate({});
  assertValid(validResult3);
});

Deno.test("fromJsonSchema - handles unknown format gracefully", () => {
  const jsonSchema = {
    type: "string",
    format: "unknown-format",
  };
  
  const validator = fromJsonSchema(jsonSchema);
  
  // Should still validate the type, just ignore the unknown format
  const validResult = validator.validate("hello");
  assertValid(validResult);
  assertEquals(validResult.value, "hello");
});

Deno.test("commonFormatValidators - all validators are functions", () => {
  const formatNames = Object.keys(commonFormatValidators);
  
  for (const formatName of formatNames) {
    const validator = commonFormatValidators[formatName];
    assert(typeof validator === "function", `Format validator for ${formatName} should be a function`);
  }
});

Deno.test("commonFormatMappings - all mappings are strings", () => {
  const formatNames = Object.keys(commonFormatMappings);
  
  for (const formatName of formatNames) {
    const mapping = commonFormatMappings[formatName];
    assert(typeof mapping === "string", `Format mapping for ${formatName} should be a string`);
  }
});