// deno-lint-ignore-file no-explicit-any

import * as spec from "jsr:@standard-schema/spec";
import type {
  SchemaDefinition,
  StandardValidator,
  ValidationResult,
  ValidatorFunction,
  ValidatorOptions,
  CustomType,
} from "./types.ts";

const VENDOR = "@stdext/validator";

/**
 * Create a Standard Schema V1 compliant validator
 */
function createStandardValidator<T>(
  schema: SchemaDefinition<T>,
): StandardValidator<T> {
  const validator: StandardValidator<T> = {
    "~standard": {
      version: 1,
      vendor: VENDOR,
      types: {
        input: schema.type as any,
        output: schema.type as any,
      },
      validate: (value: unknown, options?: spec.StandardSchemaV1.Options) => {
        const result = schema.validate(value, []);
        if (result.success) {
          return { value: result.value } as spec.StandardSchemaV1.SuccessResult<T>;
        } else {
          return { issues: result.issues } as spec.StandardSchemaV1.FailureResult;
        }
      },
    },
    schema,
    withValidator<U extends T>(validatorFn: ValidatorFunction<U>): StandardValidator<U> {
      const newSchema: SchemaDefinition<U> = {
        ...schema,
        validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
          const result = schema.validate(value, path);
          if (!result.success) {
            return result as ValidationResult<U>;
          }
          return validatorFn(result.value, path);
        },
      };
      return createStandardValidator(newSchema);
    },
    withValidators<U extends T>(...validatorFns: ValidatorFunction<U>[]): StandardValidator<U> {
      let currentValidator = validator as StandardValidator<U>;
      for (const validatorFn of validatorFns) {
        currentValidator = currentValidator.withValidator(validatorFn);
      }
      return currentValidator;
    },
  };

  return validator;
}

/**
 * Create a validation result
 */
function createSuccess<T>(value: T): ValidationResult<T> {
  return { success: true, value };
}

function createFailure<T>(issues: spec.StandardSchemaV1.Issue[]): ValidationResult<T> {
  return { success: false, issues };
}

/**
 * Create an issue with proper path
 */
function createIssue(
  message: string,
  path?: spec.StandardSchemaV1.PathSegment[],
): spec.StandardSchemaV1.Issue {
  return {
    message,
    path: path?.length ? path : undefined,
  };
}

/**
 * Validate a value against a type guard
 */
function validateType<T>(
  value: unknown,
  typeGuard: (value: unknown) => value is T,
  typeName: string,
  path: spec.StandardSchemaV1.PathSegment[] = [],
): ValidationResult<T> {
  if (typeGuard(value)) {
    return createSuccess(value);
  }
  return createFailure([
    createIssue(`Expected ${typeName}, but got ${typeof value}`, path),
  ]);
}

/**
 * Primitive validators
 */

function createStringValidator(): SchemaDefinition<string> {
  return {
    type: "string",
    description: "String validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validateType(value, (v): v is string => typeof v === "string", "string", path);
    },
  };
}

function createNumberValidator(): SchemaDefinition<number> {
  return {
    type: "number",
    description: "Number validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validateType(value, (v): v is number => typeof v === "number" && !isNaN(v), "number", path);
    },
  };
}

function createBooleanValidator(): SchemaDefinition<boolean> {
  return {
    type: "boolean",
    description: "Boolean validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validateType(value, (v): v is boolean => typeof v === "boolean", "boolean", path);
    },
  };
}

function createNullValidator(): SchemaDefinition<null> {
  return {
    type: "null",
    description: "Null validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validateType(value, (v): v is null => v === null, "null", path);
    },
  };
}

function createUndefinedValidator(): SchemaDefinition<undefined> {
  return {
    type: "undefined",
    description: "Undefined validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validateType(value, (v): v is undefined => v === undefined, "undefined", path);
    },
  };
}

function createBigIntValidator(): SchemaDefinition<bigint> {
  return {
    type: "bigint",
    description: "BigInt validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validateType(value, (v): v is bigint => typeof v === "bigint", "bigint", path);
    },
  };
}

function createSymbolValidator(): SchemaDefinition<symbol> {
  return {
    type: "symbol",
    description: "Symbol validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validateType(value, (v): v is symbol => typeof v === "symbol", "symbol", path);
    },
  };
}

/**
 * Object validator
 */
function createObjectValidator<T extends Record<string, SchemaDefinition>>(
  shape: T,
): SchemaDefinition<{ [K in keyof T]: spec.StandardSchemaV1.InferOutput<T[K]> }> {
  return {
    type: "object",
    description: "Object validator",
    shape,
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return createFailure([
          createIssue(`Expected object, but got ${typeof value}`, path),
        ]);
      }

      const issues: spec.StandardSchemaV1.Issue[] = [];
      const result: Record<string, unknown> = {};

      // Validate each property
      for (const [key, schema] of Object.entries(shape)) {
        const propertyPath = [...path, { key }];
        const propertyValue = (value as Record<string, unknown>)[key];
        
        if (propertyValue === undefined) {
          // Check if the property is required (all properties in shape are required by default)
          issues.push(createIssue(`Missing required property: ${key}`, propertyPath));
          continue;
        }

        const validationResult = schema.validate(propertyValue, propertyPath);
        if (validationResult.success) {
          result[key] = validationResult.value;
        } else {
          issues.push(...validationResult.issues);
        }
      }

      // Check for extra properties
      const valueObj = value as Record<string, unknown>;
      const shapeKeys = new Set(Object.keys(shape));
      for (const key of Object.keys(valueObj)) {
        if (!shapeKeys.has(key)) {
          issues.push(createIssue(`Unexpected property: ${key}`, [...path, { key }]));
        }
      }

      if (issues.length > 0) {
        return createFailure(issues);
      }

      return createSuccess(result as { [K in keyof T]: spec.StandardSchemaV1.InferOutput<T[K]> });
    },
  };
}

/**
 * Array validator
 */
function createArrayValidator<T>(
  itemSchema: SchemaDefinition<T>,
): SchemaDefinition<T[]> {
  return {
    type: "array",
    description: "Array validator",
    itemSchema,
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      if (!Array.isArray(value)) {
        return createFailure([
          createIssue(`Expected array, but got ${typeof value}`, path),
        ]);
      }

      const issues: spec.StandardSchemaV1.Issue[] = [];
      const result: T[] = [];

      for (let i = 0; i < value.length; i++) {
        const itemPath = [...path, { key: i }];
        const validationResult = itemSchema.validate(value[i], itemPath);
        
        if (validationResult.success) {
          result.push(validationResult.value);
        } else {
          issues.push(...validationResult.issues);
        }
      }

      if (issues.length > 0) {
        return createFailure(issues);
      }

      return createSuccess(result);
    },
  };
}

/**
 * Custom validator
 */
function createCustomValidator<T>(
  validator: ValidatorFunction<T>,
  typeName: string = "custom",
): SchemaDefinition<T> {
  return {
    type: typeName,
    description: `Custom validator: ${typeName}`,
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return validator(value, path);
    },
  };
}

/**
 * Union validator
 */
function createUnionValidator<T extends SchemaDefinition[]>(
  ...schemas: T
): SchemaDefinition<{ [K in keyof T]: T[K] extends SchemaDefinition<infer U> ? U : never }[keyof T]> {
  return {
    type: "union",
    description: "Union validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      const issues: spec.StandardSchemaV1.Issue[] = [];
      
      for (const schema of schemas) {
        const result = schema.validate(value, path);
        if (result.success) {
          return result as ValidationResult<{ [K in keyof T]: T[K] extends SchemaDefinition<infer U> ? U : never }[keyof T]>;
        }
        issues.push(...result.issues);
      }

      return createFailure([
        createIssue(`Value does not match any union type`, path),
        ...issues,
      ]);
    },
  };
}

/**
 * Optional validator (wraps another validator to accept undefined)
 */
function createOptionalValidator<T>(
  schema: SchemaDefinition<T>,
): SchemaDefinition<T | undefined> {
  return {
    type: `optional<${schema.type}>`,
    description: `Optional ${schema.description || schema.type}`,
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      if (value === undefined) {
        return createSuccess(undefined);
      }
      return schema.validate(value, path) as ValidationResult<T | undefined>;
    },
  };
}

/**
 * Nullable validator (wraps another validator to accept null)
 */
function createNullableValidator<T>(
  schema: SchemaDefinition<T>,
): SchemaDefinition<T | null> {
  return {
    type: `nullable<${schema.type}>`,
    description: `Nullable ${schema.description || schema.type}`,
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      if (value === null) {
        return createSuccess(null);
      }
      return schema.validate(value, path) as ValidationResult<T | null>;
    },
  };
}

/**
 * Literal validator
 */
function createLiteralValidator<T extends string | number | boolean>(
  value: T,
): SchemaDefinition<T> {
  return {
    type: "literal",
    description: `Literal validator for ${JSON.stringify(value)}`,
    validate: (input: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      if (input === value) {
        return createSuccess(value);
      }
      return createFailure([
        createIssue(`Expected ${JSON.stringify(value)}, but got ${JSON.stringify(input)}`, path),
      ]);
    },
  };
}

/**
 * Record validator (object with string keys and value schema)
 */
function createRecordValidator<T>(
  valueSchema: SchemaDefinition<T>,
): SchemaDefinition<Record<string, T>> {
  return {
    type: "record",
    description: "Record validator",
    itemSchema: valueSchema,
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return createFailure([
          createIssue(`Expected record (object), but got ${typeof value}`, path),
        ]);
      }

      const issues: spec.StandardSchemaV1.Issue[] = [];
      const result: Record<string, T> = {};

      const valueObj = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(valueObj)) {
        const propertyPath = [...path, { key }];
        const validationResult = valueSchema.validate(val, propertyPath);
        
        if (validationResult.success) {
          result[key] = validationResult.value;
        } else {
          issues.push(...validationResult.issues);
        }
      }

      if (issues.length > 0) {
        return createFailure(issues);
      }

      return createSuccess(result);
    },
  };
}

/**
 * Main validator factory with options
 */
export function createValidator(options?: ValidatorOptions) {
  const customValidators: Map<string, ValidatorFunction<any>> = new Map();
  const customTypes: Map<string, SchemaDefinition> = new Map();

  // Register custom validators from options
  if (options?.validators) {
    for (const [name, validator] of Object.entries(options.validators)) {
      customValidators.set(name, validator);
    }
  }

  // Register custom types from options
  if (options?.types) {
    for (const [name, schema] of Object.entries(options.types)) {
      customTypes.set(name, schema);
    }
  }

  return {
    // Primitive validators
    string: () => createStandardValidator(createStringValidator()),
    number: () => createStandardValidator(createNumberValidator()),
    boolean: () => createStandardValidator(createBooleanValidator()),
    null: () => createStandardValidator(createNullValidator()),
    undefined: () => createStandardValidator(createUndefinedValidator()),
    bigint: () => createStandardValidator(createBigIntValidator()),
    symbol: () => createStandardValidator(createSymbolValidator()),

    // Object validator
    object: <T extends Record<string, SchemaDefinition>>(
      shape: T,
    ) => createStandardValidator(createObjectValidator(shape)),

    // Array validator
    array: <T>(itemSchema: SchemaDefinition<T>) => 
      createStandardValidator(createArrayValidator(itemSchema)),

    // Custom validator
    custom: <T>(validator: ValidatorFunction<T>, typeName?: string) => 
      createStandardValidator(createCustomValidator(validator, typeName || "custom")),

    // Type alias for custom
    type: <T>(validator: ValidatorFunction<T>, typeName?: string) => 
      createStandardValidator(createCustomValidator(validator, typeName || "type")),

    // Union validator
    union: <T extends SchemaDefinition[]>(
      ...schemas: T
    ) => createStandardValidator(createUnionValidator(...schemas)),

    // Optional validator
    optional: <T>(schema: SchemaDefinition<T>) => 
      createStandardValidator(createOptionalValidator(schema)),

    // Nullable validator
    nullable: <T>(schema: SchemaDefinition<T>) => 
      createStandardValidator(createNullableValidator(schema)),

    // Literal validator
    literal: <T extends string | number | boolean>(value: T) => 
      createStandardValidator(createLiteralValidator(value)),

    // Record validator
    record: <T>(valueSchema: SchemaDefinition<T>) => 
      createStandardValidator(createRecordValidator(valueSchema)),

    // Add custom validator to the registry
    addValidator: <T>(name: string, validator: ValidatorFunction<T>) => {
      customValidators.set(name, validator);
    },

    // Add custom type to the registry
    addType: <T>(name: string, schema: SchemaDefinition<T>) => {
      customTypes.set(name, schema);
    },

    // Get a custom validator by name
    getValidator: <T>(name: string) => {
      const validator = customValidators.get(name);
      if (!validator) {
        throw new Error(`Validator '${name}' not found`);
      }
      return createStandardValidator(createCustomValidator(validator, name));
    },

    // Get a custom type by name
    getType: <T>(name: string) => {
      const schema = customTypes.get(name);
      if (!schema) {
        throw new Error(`Type '${name}' not found`);
      }
      return createStandardValidator(schema);
    },

    // Create a validator from a schema definition
    fromSchema: <T>(schema: SchemaDefinition<T>) => 
      createStandardValidator(schema),

    // Access the spec directly
    spec,
  };
}

/**
 * Default validator instance
 */
export const validator = createValidator();

/**
 * Re-export types
 */
export type {
  SchemaDefinition,
  StandardValidator,
  ValidationResult,
  ValidatorFunction,
  ValidatorOptions,
  CustomType,
};

export { spec };