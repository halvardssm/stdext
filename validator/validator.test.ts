// deno-lint-ignore-file no-explicit-any

import { assert, assertEquals, assertThrows } from "@std/assert";
import { validator, createValidator, spec } from "./mod.ts";

// Test helper to check validation success
function assertValid<T>(result: spec.StandardSchemaV1.Result<T>): asserts result is spec.StandardSchemaV1.SuccessResult<T> {
  if (result.issues) {
    throw new Error(`Expected validation to succeed, but got issues: ${JSON.stringify(result.issues, null, 2)}`);
  }
}

// Test helper to check validation failure
function assertInvalid(result: spec.StandardSchemaV1.Result<unknown>): asserts result is spec.StandardSchemaV1.FailureResult {
  if (!result.issues) {
    throw new Error("Expected validation to fail, but it succeeded");
  }
}

Deno.test("validator package exports", () => {
  // Test that all expected exports are available
  assert(validator !== undefined);
  assert(createValidator !== undefined);
  assert(spec !== undefined);
});

Deno.test("Standard Schema compliance - string validator", () => {
  const stringValidator = validator.string();
  
  // Check Standard Schema properties
  assert(stringValidator["~standard"].version === 1);
  assert(stringValidator["~standard"].vendor === "@stdext/validator");
  assert(stringValidator["~standard"].validate !== undefined);
  
  // Test valid string
  const validResult = stringValidator.validate("hello");
  assertValid(validResult);
  assertEquals(validResult.value, "hello");
  
  // Test invalid string
  const invalidResult = stringValidator.validate(123);
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 1);
  assertEquals(invalidResult.issues[0].message, "Expected string, but got number");
});

Deno.test("Standard Schema compliance - number validator", () => {
  const numberValidator = validator.number();
  
  // Test valid number
  const validResult = numberValidator.validate(42);
  assertValid(validResult);
  assertEquals(validResult.value, 42);
  
  // Test invalid number
  const invalidResult = numberValidator.validate("not a number");
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues[0].message, "Expected number, but got string");
  
  // Test NaN
  const nanResult = numberValidator.validate(NaN);
  assertInvalid(nanResult);
});

Deno.test("Standard Schema compliance - boolean validator", () => {
  const booleanValidator = validator.boolean();
  
  // Test valid boolean
  const trueResult = booleanValidator.validate(true);
  assertValid(trueResult);
  assertEquals(trueResult.value, true);
  
  const falseResult = booleanValidator.validate(false);
  assertValid(falseResult);
  assertEquals(falseResult.value, false);
  
  // Test invalid boolean
  const invalidResult = booleanValidator.validate("true");
  assertInvalid(invalidResult);
});

Deno.test("Standard Schema compliance - null validator", () => {
  const nullValidator = validator.null();
  
  // Test valid null
  const validResult = nullValidator.validate(null);
  assertValid(validResult);
  assertEquals(validResult.value, null);
  
  // Test invalid null
  const invalidResult = nullValidator.validate(undefined);
  assertInvalid(invalidResult);
});

Deno.test("Standard Schema compliance - undefined validator", () => {
  const undefinedValidator = validator.undefined();
  
  // Test valid undefined
  const validResult = undefinedValidator.validate(undefined);
  assertValid(validResult);
  assertEquals(validResult.value, undefined);
  
  // Test invalid undefined
  const invalidResult = undefinedValidator.validate(null);
  assertInvalid(invalidResult);
});

Deno.test("Standard Schema compliance - bigint validator", () => {
  const bigintValidator = validator.bigint();
  
  // Test valid bigint
  const validResult = bigintValidator.validate(123n);
  assertValid(validResult);
  assertEquals(validResult.value, 123n);
  
  // Test invalid bigint
  const invalidResult = bigintValidator.validate(123);
  assertInvalid(invalidResult);
});

Deno.test("Standard Schema compliance - symbol validator", () => {
  const symbolValidator = validator.symbol();
  
  // Test valid symbol
  const sym = Symbol("test");
  const validResult = symbolValidator.validate(sym);
  assertValid(validResult);
  assertEquals(validResult.value, sym);
  
  // Test invalid symbol
  const invalidResult = symbolValidator.validate("symbol");
  assertInvalid(invalidResult);
});

Deno.test("Object validator - basic", () => {
  const objectValidator = validator.object({
    name: validator.string(),
    age: validator.number(),
  });
  
  // Test valid object
  const validResult = objectValidator.validate({
    name: "John",
    age: 30,
  });
  assertValid(validResult);
  assertEquals(validResult.value.name, "John");
  assertEquals(validResult.value.age, 30);
  
  // Test invalid object (wrong type)
  const invalidResult1 = objectValidator.validate("not an object");
  assertInvalid(invalidResult1);
  
  // Test invalid object (missing property)
  const invalidResult2 = objectValidator.validate({
    name: "John",
    // age is missing
  });
  assertInvalid(invalidResult2);
  assertEquals(invalidResult2.issues.length, 1);
  assertEquals(invalidResult2.issues[0].message, "Missing required property: age");
  
  // Test invalid object (wrong property type)
  const invalidResult3 = objectValidator.validate({
    name: "John",
    age: "thirty",
  });
  assertInvalid(invalidResult3);
  assertEquals(invalidResult3.issues.length, 1);
  assertEquals(invalidResult3.issues[0].message, "Expected number, but got string");
  assertEquals(invalidResult3.issues[0].path, ["age"]);
});

Deno.test("Object validator - extra properties", () => {
  const objectValidator = validator.object({
    name: validator.string(),
  });
  
  // Test object with extra properties
  const invalidResult = objectValidator.validate({
    name: "John",
    extra: "property",
  });
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 1);
  assertEquals(invalidResult.issues[0].message, "Unexpected property: extra");
});

Deno.test("Object validator - nested objects", () => {
  const addressValidator = validator.object({
    street: validator.string(),
    city: validator.string(),
  });
  
  const personValidator = validator.object({
    name: validator.string(),
    address: addressValidator,
  });
  
  // Test valid nested object
  const validResult = personValidator.validate({
    name: "John",
    address: {
      street: "123 Main St",
      city: "New York",
    },
  });
  assertValid(validResult);
  assertEquals(validResult.value.name, "John");
  assertEquals(validResult.value.address.street, "123 Main St");
  
  // Test invalid nested object
  const invalidResult = personValidator.validate({
    name: "John",
    address: {
      street: "123 Main St",
      city: 123, // wrong type
    },
  });
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 1);
  assertEquals(invalidResult.issues[0].message, "Expected string, but got number");
  assertEquals(invalidResult.issues[0].path, ["address", "city"]);
});

Deno.test("Array validator - basic", () => {
  const arrayValidator = validator.array(validator.string());
  
  // Test valid array
  const validResult = arrayValidator.validate(["a", "b", "c"]);
  assertValid(validResult);
  assertEquals(validResult.value, ["a", "b", "c"]);
  
  // Test invalid array (not an array)
  const invalidResult1 = arrayValidator.validate("not an array");
  assertInvalid(invalidResult1);
  
  // Test invalid array (wrong item type)
  const invalidResult2 = arrayValidator.validate(["a", 1, "c"]);
  assertInvalid(invalidResult2);
  assertEquals(invalidResult2.issues.length, 1);
  assertEquals(invalidResult2.issues[0].message, "Expected string, but got number");
  assertEquals(invalidResult2.issues[0].path, [1]);
});

Deno.test("Array validator - nested arrays", () => {
  const nestedArrayValidator = validator.array(
    validator.array(validator.number())
  );
  
  // Test valid nested array
  const validResult = nestedArrayValidator.validate([
    [1, 2, 3],
    [4, 5, 6],
  ]);
  assertValid(validResult);
  assertEquals(validResult.value, [[1, 2, 3], [4, 5, 6]]);
  
  // Test invalid nested array
  const invalidResult = nestedArrayValidator.validate([
    [1, 2, 3],
    [4, "5", 6], // invalid item
  ]);
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 1);
  assertEquals(invalidResult.issues[0].path, [1, 1]);
});

Deno.test("Array validator - objects in array", () => {
  const objectInArrayValidator = validator.array(
    validator.object({
      id: validator.number(),
      name: validator.string(),
    })
  );
  
  // Test valid array of objects
  const validResult = objectInArrayValidator.validate([
    { id: 1, name: "first" },
    { id: 2, name: "second" },
  ]);
  assertValid(validResult);
  assertEquals(validResult.value.length, 2);
  
  // Test invalid array of objects
  const invalidResult = objectInArrayValidator.validate([
    { id: 1, name: "first" },
    { id: "two", name: "second" }, // invalid id
  ]);
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 1);
  assertEquals(invalidResult.issues[0].path, [1, "id"]);
});

Deno.test("Union validator", () => {
  const unionValidator = validator.union(
    validator.string(),
    validator.number(),
  );
  
  // Test valid string
  const validStringResult = unionValidator.validate("hello");
  assertValid(validStringResult);
  assertEquals(validStringResult.value, "hello");
  
  // Test valid number
  const validNumberResult = unionValidator.validate(42);
  assertValid(validNumberResult);
  assertEquals(validNumberResult.value, 42);
  
  // Test invalid (neither string nor number)
  const invalidResult = unionValidator.validate(true);
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 3); // 1 for each union member + 1 for union itself
});

Deno.test("Optional validator", () => {
  const optionalValidator = validator.optional(validator.string());
  
  // Test valid string
  const validStringResult = optionalValidator.validate("hello");
  assertValid(validStringResult);
  assertEquals(validStringResult.value, "hello");
  
  // Test valid undefined
  const validUndefinedResult = optionalValidator.validate(undefined);
  assertValid(validUndefinedResult);
  assertEquals(validUndefinedResult.value, undefined);
  
  // Test invalid (not string or undefined)
  const invalidResult = optionalValidator.validate(123);
  assertInvalid(invalidResult);
});

Deno.test("Nullable validator", () => {
  const nullableValidator = validator.nullable(validator.string());
  
  // Test valid string
  const validStringResult = nullableValidator.validate("hello");
  assertValid(validStringResult);
  assertEquals(validStringResult.value, "hello");
  
  // Test valid null
  const validNullResult = nullableValidator.validate(null);
  assertValid(validNullResult);
  assertEquals(validNullResult.value, null);
  
  // Test invalid (not string or null)
  const invalidResult = nullableValidator.validate(123);
  assertInvalid(invalidResult);
});

Deno.test("Literal validator", () => {
  const literalValidator = validator.literal("active");
  
  // Test valid literal
  const validResult = literalValidator.validate("active");
  assertValid(validResult);
  assertEquals(validResult.value, "active");
  
  // Test invalid literal
  const invalidResult = literalValidator.validate("inactive");
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues[0].message, 'Expected "active", but got "inactive"');
});

Deno.test("Record validator", () => {
  const recordValidator = validator.record(validator.number());
  
  // Test valid record
  const validResult = recordValidator.validate({
    a: 1,
    b: 2,
    c: 3,
  });
  assertValid(validResult);
  assertEquals(validResult.value, { a: 1, b: 2, c: 3 });
  
  // Test invalid record (wrong value type)
  const invalidResult = recordValidator.validate({
    a: 1,
    b: "two",
    c: 3,
  });
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 1);
  assertEquals(invalidResult.issues[0].path, ["b"]);
});

Deno.test("Custom validator", () => {
  const positiveNumberValidator = validator.custom(
    (value: unknown, path) => {
      if (typeof value !== "number") {
        return {
          success: false,
          issues: [{ message: "Expected a number", path }],
        };
      }
      if (value <= 0) {
        return {
          success: false,
          issues: [{ message: "Number must be positive", path }],
        };
      }
      return { success: true, value };
    },
    "positiveNumber"
  );
  
  // Test valid positive number
  const validResult = positiveNumberValidator.validate(42);
  assertValid(validResult);
  assertEquals(validResult.value, 42);
  
  // Test invalid (not a number)
  const invalidResult1 = positiveNumberValidator.validate("42");
  assertInvalid(invalidResult1);
  assertEquals(invalidResult1.issues[0].message, "Expected a number");
  
  // Test invalid (not positive)
  const invalidResult2 = positiveNumberValidator.validate(-5);
  assertInvalid(invalidResult2);
  assertEquals(invalidResult2.issues[0].message, "Number must be positive");
});

Deno.test("Chaining validators with withValidator", () => {
  const baseValidator = validator.number();
  
  const positiveValidator = baseValidator.withValidator(
    (value: unknown, path) => {
      if (typeof value === "number" && value <= 0) {
        return {
          success: false,
          issues: [{ message: "Number must be positive", path }],
        };
      }
      return { success: true, value };
    }
  );
  
  // Test valid positive number
  const validResult = positiveValidator.validate(42);
  assertValid(validResult);
  assertEquals(validResult.value, 42);
  
  // Test invalid (not positive)
  const invalidResult = positiveValidator.validate(-5);
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues[0].message, "Number must be positive");
});

Deno.test("Chaining validators with withValidators", () => {
  const baseValidator = validator.number();
  
  const positiveEvenValidator = baseValidator.withValidators(
    (value: unknown, path) => {
      if (typeof value === "number" && value <= 0) {
        return {
          success: false,
          issues: [{ message: "Number must be positive", path }],
        };
      }
      return { success: true, value };
    },
    (value: unknown, path) => {
      if (typeof value === "number" && value % 2 !== 0) {
        return {
          success: false,
          issues: [{ message: "Number must be even", path }],
        };
      }
      return { success: true, value };
    }
  );
  
  // Test valid positive even number
  const validResult = positiveEvenValidator.validate(4);
  assertValid(validResult);
  assertEquals(validResult.value, 4);
  
  // Test invalid (not even)
  const invalidResult1 = positiveEvenValidator.validate(3);
  assertInvalid(invalidResult1);
  assertEquals(invalidResult1.issues[0].message, "Number must be even");
  
  // Test invalid (not positive)
  const invalidResult2 = positiveEvenValidator.validate(-2);
  assertInvalid(invalidResult2);
  assertEquals(invalidResult2.issues[0].message, "Number must be positive");
});

Deno.test("createValidator with custom validators", () => {
  const myValidator = createValidator({
    validators: {
      positiveNumber: (value: unknown, path) => {
        if (typeof value !== "number" || value <= 0) {
          return {
            success: false,
            issues: [{ message: "Must be a positive number", path }],
          };
        }
        return { success: true, value };
      },
    },
  });
  
  // Test getting a registered validator
  const positiveValidator = myValidator.getValidator("positiveNumber");
  const validResult = positiveValidator.validate(42);
  assertValid(validResult);
  assertEquals(validResult.value, 42);
  
  // Test getting a non-existent validator
  assertThrows(() => {
    myValidator.getValidator("nonExistent");
  }, Error, "Validator 'nonExistent' not found");
});

Deno.test("createValidator with custom types", () => {
  const myValidator = createValidator({
    types: {
      positiveNumber: {
        type: "positiveNumber",
        description: "A positive number",
        validate: (value: unknown, path) => {
          if (typeof value !== "number" || value <= 0) {
            return {
              success: false,
              issues: [{ message: "Must be a positive number", path }],
            };
          }
          return { success: true, value };
        },
      },
    },
  });
  
  // Test getting a registered type
  const positiveType = myValidator.getType("positiveNumber");
  const validResult = positiveType.validate(42);
  assertValid(validResult);
  assertEquals(validResult.value, 42);
  
  // Test getting a non-existent type
  assertThrows(() => {
    myValidator.getType("nonExistent");
  }, Error, "Type 'nonExistent' not found");
});

Deno.test("fromSchema - create validator from schema definition", () => {
  const schema = {
    type: "custom",
    description: "A custom schema",
    validate: (value: unknown, path) => {
      if (typeof value === "string" && value.length > 5) {
        return { success: true, value };
      }
      return {
        success: false,
        issues: [{ message: "String must be longer than 5 characters", path }],
      };
    },
  };
  
  const customValidator = validator.fromSchema(schema);
  
  // Test valid
  const validResult = customValidator.validate("hello world");
  assertValid(validResult);
  assertEquals(validResult.value, "hello world");
  
  // Test invalid
  const invalidResult = customValidator.validate("hi");
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues[0].message, "String must be longer than 5 characters");
});

Deno.test("Complex nested validation", () => {
  const addressSchema = validator.object({
    street: validator.string(),
    city: validator.string(),
    zipCode: validator.string(),
  });
  
  const personSchema = validator.object({
    name: validator.string(),
    age: validator.number(),
    email: validator.optional(validator.string()),
    addresses: validator.array(addressSchema),
    metadata: validator.record(validator.string()),
  });
  
  // Test valid complex object
  const validResult = personSchema.validate({
    name: "John Doe",
    age: 30,
    email: "john@example.com",
    addresses: [
      { street: "123 Main St", city: "New York", zipCode: "10001" },
      { street: "456 Oak Ave", city: "Los Angeles", zipCode: "90001" },
    ],
    metadata: {
      role: "admin",
      department: "engineering",
    },
  });
  
  assertValid(validResult);
  assertEquals(validResult.value.name, "John Doe");
  assertEquals(validResult.value.age, 30);
  assertEquals(validResult.value.email, "john@example.com");
  assertEquals(validResult.value.addresses.length, 2);
  assertEquals(validResult.value.metadata.role, "admin");
});

Deno.test("Complex nested validation with errors", () => {
  const addressSchema = validator.object({
    street: validator.string(),
    city: validator.string(),
    zipCode: validator.string(),
  });
  
  const personSchema = validator.object({
    name: validator.string(),
    age: validator.number(),
    addresses: validator.array(addressSchema),
  });
  
  // Test invalid complex object
  const invalidResult = personSchema.validate({
    name: "John Doe",
    age: "thirty", // invalid age
    addresses: [
      { street: "123 Main St", city: "New York", zipCode: "10001" },
      { street: 123, city: "Los Angeles", zipCode: "90001" }, // invalid street
    ],
  });
  
  assertInvalid(invalidResult);
  assertEquals(invalidResult.issues.length, 2);
  
  // Check that we have errors for both age and street
  const messages = invalidResult.issues.map(issue => issue.message);
  assert(messages.some(msg => msg.includes("number")));
  assert(messages.some(msg => msg.includes("string")));
});

Deno.test("Type inference with Standard Schema", () => {
  const stringValidator = validator.string();
  
  // Test type inference
  const result = stringValidator.validate("hello");
  if (!result.issues) {
    // This should compile and value should be inferred as string
    const str: string = result.value;
    assertEquals(str, "hello");
  }
  
  // Test with object validator
  const objectValidator = validator.object({
    name: validator.string(),
    age: validator.number(),
  });
  
  const objResult = objectValidator.validate({
    name: "John",
    age: 30,
  });
  
  if (!objResult.issues) {
    // This should compile and value should be inferred as { name: string, age: number }
    const obj: { name: string; age: number } = objResult.value;
    assertEquals(obj.name, "John");
    assertEquals(obj.age, 30);
  }
});

Deno.test("addValidator and addType methods", () => {
  const myValidator = createValidator();
  
  // Test addValidator
  myValidator.addValidator("email", (value: unknown, path) => {
    if (typeof value !== "string" || !value.includes("@")) {
      return {
        success: false,
        issues: [{ message: "Invalid email format", path }],
      };
    }
    return { success: true, value };
  });
  
  const emailValidator = myValidator.getValidator("email");
  const validEmailResult = emailValidator.validate("test@example.com");
  assertValid(validEmailResult);
  assertEquals(validEmailResult.value, "test@example.com");
  
  const invalidEmailResult = emailValidator.validate("not-an-email");
  assertInvalid(invalidEmailResult);
  
  // Test addType
  myValidator.addType("emailType", {
    type: "email",
    description: "Email type",
    validate: (value: unknown, path) => {
      if (typeof value !== "string" || !value.includes("@")) {
        return {
          success: false,
          issues: [{ message: "Invalid email format", path }],
        };
      }
      return { success: true, value };
    },
  });
  
  const emailType = myValidator.getType("emailType");
  const validTypeResult = emailType.validate("test@example.com");
  assertValid(validTypeResult);
});

Deno.test("spec export", () => {
  // Test that spec is properly exported
  assert(spec.StandardSchemaV1 !== undefined);
  assert(spec.StandardTypedV1 !== undefined);
  assert(spec.StandardJSONSchemaV1 !== undefined);
});