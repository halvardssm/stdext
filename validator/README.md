# @stdext/validator

A simple validator implementing the [Standard Schema V1](https://standardschema.dev) specification.

This package provides a type-safe validation library that supports primitives, nested objects, arrays, and custom validators. It fully implements the Standard Schema V1 interface, making it interoperable with other libraries that support the standard.

## Features

- **Standard Schema V1 Compliant**: Full implementation of the Standard Schema specification
- **Primitive Support**: Validate strings, numbers, booleans, null, undefined, bigint, and symbols
- **Nested Objects**: Validate complex object structures with shape definitions
- **Arrays**: Validate arrays with item schemas
- **Custom Validators**: Add your own validation functions
- **Custom Types**: Define and reuse custom type definitions
- **Union Types**: Support for union type validation
- **Optional/Nullable**: Built-in support for optional and nullable types
- **Literal Types**: Validate specific literal values
- **Record Types**: Validate objects with dynamic keys

## Installation

```bash
deno add @stdext/validator
```

## Usage

### Basic Usage

```typescript
import { validator } from "@stdext/validator";

// Create a simple string validator
const stringValidator = validator.string();

// Validate a value
const result = stringValidator.validate("hello");
if (result.issues) {
  console.error("Validation failed:", result.issues);
} else {
  console.log("Valid:", result.value); // "hello"
}
```

### Object Validation

```typescript
import { validator } from "@stdext/validator";

// Define an object schema
const userSchema = validator.object({
  name: validator.string(),
  age: validator.number(),
  email: validator.string(),
});

// Validate an object
const result = userSchema.validate({
  name: "John Doe",
  age: 30,
  email: "john@example.com",
});

if (result.issues) {
  console.error("Validation failed:", result.issues);
} else {
  console.log("Valid user:", result.value);
}
```

### Array Validation

```typescript
import { validator } from "@stdext/validator";

// Validate an array of numbers
const numbersValidator = validator.array(validator.number());

const result = numbersValidator.validate([1, 2, 3, 4, 5]);
if (result.issues) {
  console.error("Validation failed:", result.issues);
} else {
  console.log("Valid numbers:", result.value); // [1, 2, 3, 4, 5]
}
```

### Nested Structures

```typescript
import { validator } from "@stdext/validator";

// Define nested object schemas
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

const result = personSchema.validate({
  name: "Jane Doe",
  age: 28,
  addresses: [
    { street: "123 Main St", city: "New York", zipCode: "10001" },
    { street: "456 Oak Ave", city: "Los Angeles", zipCode: "90001" },
  ],
});
```

### Custom Validators

```typescript
import { validator } from "@stdext/validator";

// Create a custom validator function
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

// Use the custom validator
const result = positiveNumberValidator.validate(42);
console.log(result); // { success: true, value: 42 }

const invalidResult = positiveNumberValidator.validate(-5);
console.log(invalidResult); // { success: false, issues: [...] }
```

### Adding Custom Validators to Registry

```typescript
import { createValidator } from "@stdext/validator";

// Create a custom validator instance
const myValidator = createValidator();

// Add a custom validator to the registry
myValidator.addValidator("positiveNumber", (value: unknown, path) => {
  if (typeof value !== "number" || value <= 0) {
    return {
      success: false,
      issues: [{ message: "Must be a positive number", path }],
    };
  }
  return { success: true, value };
});

// Use the registered validator
const positiveValidator = myValidator.getValidator("positiveNumber");
const result = positiveValidator.validate(10);
```

### Union Types

```typescript
import { validator } from "@stdext/validator";

// Create a union validator (string or number)
const stringOrNumber = validator.union(
  validator.string(),
  validator.number(),
);

const result1 = stringOrNumber.validate("hello"); // valid
const result2 = stringOrNumber.validate(42);     // valid
const result3 = stringOrNumber.validate(true);   // invalid
```

### Optional and Nullable Types

```typescript
import { validator } from "@stdext/validator";

// Optional string (accepts string or undefined)
const optionalString = validator.optional(validator.string());

// Nullable string (accepts string or null)
const nullableString = validator.nullable(validator.string());

// Optional and nullable string
const optionalNullableString = validator.optional(validator.nullable(validator.string()));
```

### Literal Types

```typescript
import { validator } from "@stdext/validator";

// Validate specific literal values
const statusValidator = validator.literal("active");
const result = statusValidator.validate("active"); // valid
const invalidResult = statusValidator.validate("inactive"); // invalid
```

### Record Types

```typescript
import { validator } from "@stdext/validator";

// Validate objects with string keys and number values
const stringNumberRecord = validator.record(validator.number());

const result = stringNumberRecord.validate({
  a: 1,
  b: 2,
  c: 3,
});
```

### Chaining Validators

```typescript
import { validator } from "@stdext/validator";

// Create a base validator and add custom validators
const positiveEvenNumber = validator
  .number()
  .withValidator((value: unknown, path) => {
    if (typeof value === "number" && value % 2 !== 0) {
      return {
        success: false,
        issues: [{ message: "Number must be even", path }],
      };
    }
    return { success: true, value };
  })
  .withValidator((value: unknown, path) => {
    if (typeof value === "number" && value <= 0) {
      return {
        success: false,
        issues: [{ message: "Number must be positive", path }],
      };
    }
    return { success: true, value };
  });

const result = positiveEvenNumber.validate(4);  // valid
const invalidResult = positiveEvenNumber.validate(3); // invalid (not even)
```

### Standard Schema Compliance

All validators implement the Standard Schema V1 interface:

```typescript
import { validator, spec } from "@stdext/validator";

const stringValidator = validator.string();

// Access Standard Schema properties
console.log(stringValidator["~standard"].version); // 1
console.log(stringValidator["~standard"].vendor); // "@stdext/validator"

// Type inference
const result = stringValidator.validate("hello");
if (!result.issues) {
  // result.value is inferred as string
  const str: string = result.value;
}
```

## API Reference

### Primitive Validators

- `validator.string()`: Validates strings
- `validator.number()`: Validates numbers (excluding NaN)
- `validator.boolean()`: Validates booleans
- `validator.null()`: Validates null
- `validator.undefined()`: Validates undefined
- `validator.bigint()`: Validates bigint
- `validator.symbol()`: Validates symbols

### Complex Validators

- `validator.object(shape)`: Validates objects with the given shape
- `validator.array(itemSchema)`: Validates arrays with items matching the schema
- `validator.record(valueSchema)`: Validates objects with string keys and values matching the schema

### Utility Validators

- `validator.union(...schemas)`: Validates against any of the provided schemas
- `validator.optional(schema)`: Makes a schema accept undefined
- `validator.nullable(schema)`: Makes a schema accept null
- `validator.literal(value)`: Validates against a specific literal value

### Custom Validators

- `validator.custom(validatorFn, typeName?)`: Creates a custom validator
- `validator.type(validatorFn, typeName?)`: Alias for custom
- `createValidator(options?)`: Creates a new validator instance with custom validators and types
- `validator.addValidator(name, validatorFn)`: Adds a custom validator to the registry
- `validator.addType(name, schema)`: Adds a custom type to the registry
- `validator.getValidator(name)`: Gets a registered validator by name
- `validator.getType(name)`: Gets a registered type by name
- `validator.fromSchema(schema)`: Creates a validator from a schema definition

### Types

The package exports the following types:

- `StandardValidator<T>`: The main validator type implementing Standard Schema V1
- `SchemaDefinition<T>`: The internal schema definition type
- `ValidationResult<T>`: The result type for validation operations
- `ValidatorFunction<T>`: The function type for custom validators
- `ValidatorOptions`: Options for creating validator instances
- `CustomType<T>`: Type for custom type definitions

## Error Handling

Validation errors are returned as Standard Schema V1 issues:

```typescript
import { validator } from "@stdext/validator";

const userSchema = validator.object({
  name: validator.string(),
  age: validator.number(),
});

const result = userSchema.validate({
  name: "John",
  age: "not a number", // This will fail
});

if (result.issues) {
  for (const issue of result.issues) {
    console.error(`Path: ${issue.path?.join(".") || "root"}, Message: ${issue.message}`);
    // Output: Path: age, Message: Expected number, but got string
  }
}
```

## Contributing

Contributions are welcome! Please open an issue or pull request on the [GitHub repository](https://github.com/halvardssm/stdext).

## License

MIT