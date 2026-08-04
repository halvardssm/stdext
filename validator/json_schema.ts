// deno-lint-ignore-file no-explicit-any

import * as spec from "jsr:@standard-schema/spec";
import type {
  SchemaDefinition,
  StandardValidator,
  ValidatorFunction,
} from "./types.ts";
import { createStandardValidator, createIssue, createSuccess, createFailure } from "./validator.ts";

/**
 * JSON Schema types and interfaces
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number | boolean;
  minimum?: number;
  exclusiveMinimum?: number | boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  patternProperties?: Record<string, JsonSchema>;
  additionalProperties?: JsonSchema | boolean;
  items?: JsonSchema | JsonSchema[];
  prefixItems?: JsonSchema[];
  contains?: JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  not?: JsonSchema;
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  dependentRequired?: Record<string, string[]>;
  dependentSchemas?: Record<string, JsonSchema>;
  propertyNames?: JsonSchema;
  unevaluatedProperties?: JsonSchema | boolean;
  unevaluatedItems?: JsonSchema | boolean;
  contentEncoding?: string;
  contentMediaType?: string;
  definitions?: Record<string, JsonSchema>;
  [key: string]: unknown;
}

export interface JsonSchemaToValidatorOptions {
  /**
   * Whether to use strict type checking
   */
  strict?: boolean;
  
  /**
   * Custom type mappings from JSON Schema format to validator
   */
  formatValidators?: Record<string, ValidatorFunction<any>>;
  
  /**
   * Whether to validate additional properties by default
   */
  validateAdditionalProperties?: boolean;
}

export interface ValidatorToJsonSchemaOptions {
  /**
   * The target JSON Schema draft version
   */
  target?: "draft-2020-12" | "draft-07" | "draft-04" | "openapi-3.0";
  
  /**
   * Whether to include metadata
   */
  includeMetadata?: boolean;
  
  /**
   * Custom type mappings from validator to JSON Schema format
   */
  customFormats?: Record<string, string>;
}

/**
 * Convert JSON Schema type to our internal schema type
 */
function jsonSchemaTypeToValidatorType(type: string): string {
  const typeMap: Record<string, string> = {
    "string": "string",
    "number": "number",
    "integer": "number",
    "boolean": "boolean",
    "null": "null",
    "array": "array",
    "object": "object",
  };
  return typeMap[type] || type;
}

/**
 * Convert our internal schema type to JSON Schema type
 */
function validatorTypeToJsonSchemaType(type: string): string | string[] {
  const typeMap: Record<string, string | string[]> = {
    "string": "string",
    "number": "number",
    "boolean": "boolean",
    "null": "null",
    "undefined": "null", // JSON Schema doesn't have undefined, map to null
    "bigint": "integer",
    "symbol": "string", // JSON Schema doesn't have symbol, map to string
    "array": "array",
    "object": "object",
    "record": "object",
    "union": ["any"], // Union types become any in basic JSON Schema
  };
  return typeMap[type] || "any";
}

/**
 * Create a validator from a JSON Schema
 */
export function fromJsonSchema(
  schema: JsonSchema,
  options: JsonSchemaToValidatorOptions = {},
): StandardValidator<unknown> {
  const {
    strict = false,
    formatValidators = {},
    validateAdditionalProperties = true,
  } = options;

  return createStandardValidator(
    jsonSchemaToSchemaDefinition(schema, { strict, formatValidators, validateAdditionalProperties }),
  );
}

/**
 * Convert JSON Schema to our internal SchemaDefinition
 */
function jsonSchemaToSchemaDefinition(
  jsonSchema: JsonSchema,
  options: JsonSchemaToValidatorOptions,
): SchemaDefinition<unknown> {
  const { strict, formatValidators, validateAdditionalProperties } = options;

  // Handle const
  if (jsonSchema.const !== undefined) {
    return {
      type: "literal",
      description: jsonSchema.title || jsonSchema.description || `Literal: ${JSON.stringify(jsonSchema.const)}`,
      validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
        if (value === jsonSchema.const) {
          return createSuccess(value);
        }
        return createFailure([
          createIssue(`Expected const value ${JSON.stringify(jsonSchema.const)}, but got ${JSON.stringify(value)}`, path),
        ]);
      },
    };
  }

  // Handle enum
  if (jsonSchema.enum !== undefined) {
    return {
      type: "enum",
      description: jsonSchema.title || jsonSchema.description || "Enum validator",
      validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
        if (jsonSchema.enum!.includes(value)) {
          return createSuccess(value);
        }
        return createFailure([
          createIssue(`Value ${JSON.stringify(value)} is not in enum [${jsonSchema.enum!.map(v => JSON.stringify(v)).join(", ")}]`, path),
        ]);
      },
    };
  }

  // Handle oneOf
  if (jsonSchema.oneOf !== undefined) {
    const schemas = jsonSchema.oneOf.map(subSchema => 
      jsonSchemaToSchemaDefinition(subSchema, options)
    );
    return {
      type: "oneOf",
      description: jsonSchema.title || jsonSchema.description || "OneOf validator",
      validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
        const issues: spec.StandardSchemaV1.Issue[] = [];
        
        for (const schema of schemas) {
          const result = schema.validate(value, path);
          if (result.success) {
            return result;
          }
          issues.push(...result.issues);
        }
        
        return createFailure([
          createIssue(`Value does not match any oneOf schema`, path),
          ...issues,
        ]);
      },
    };
  }

  // Handle anyOf
  if (jsonSchema.anyOf !== undefined) {
    const schemas = jsonSchema.anyOf.map(subSchema => 
      jsonSchemaToSchemaDefinition(subSchema, options)
    );
    return {
      type: "anyOf",
      description: jsonSchema.title || jsonSchema.description || "AnyOf validator",
      validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
        const issues: spec.StandardSchemaV1.Issue[] = [];
        
        for (const schema of schemas) {
          const result = schema.validate(value, path);
          if (result.success) {
            return result;
          }
          issues.push(...result.issues);
        }
        
        return createFailure([
          createIssue(`Value does not match any anyOf schema`, path),
          ...issues,
        ]);
      },
    };
  }

  // Handle allOf
  if (jsonSchema.allOf !== undefined) {
    const schemas = jsonSchema.allOf.map(subSchema => 
      jsonSchemaToSchemaDefinition(subSchema, options)
    );
    return {
      type: "allOf",
      description: jsonSchema.title || jsonSchema.description || "AllOf validator",
      validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
        const issues: spec.StandardSchemaV1.Issue[] = [];
        let currentValue = value;
        
        for (const schema of schemas) {
          const result = schema.validate(currentValue, path);
          if (!result.success) {
            issues.push(...result.issues);
          } else {
            currentValue = result.value;
          }
        }
        
        if (issues.length > 0) {
          return createFailure(issues);
        }
        
        return createSuccess(currentValue);
      },
    };
  }

  // Handle type
  if (jsonSchema.type !== undefined) {
    const types = Array.isArray(jsonSchema.type) ? jsonSchema.type : [jsonSchema.type];
    
    // Handle array type
    if (types.includes("array")) {
      if (jsonSchema.items) {
        const itemSchema = Array.isArray(jsonSchema.items) 
          ? fromJsonSchema(jsonSchema.items[0] || { type: "any" }, options)
          : fromJsonSchema(jsonSchema.items, options);
        
        return {
          type: "array",
          description: jsonSchema.title || jsonSchema.description || "Array validator",
          itemSchema: (itemSchema as unknown as StandardValidator<unknown>).schema,
          validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
            if (!Array.isArray(value)) {
              return createFailure([
                createIssue(`Expected array, but got ${typeof value}`, path),
              ]);
            }
            
            const issues: spec.StandardSchemaV1.Issue[] = [];
            const result: unknown[] = [];
            
            for (let i = 0; i < value.length; i++) {
              const itemPath = [...path, { key: i }];
              const validationResult = (itemSchema as unknown as StandardValidator<unknown>).validate(value[i], itemPath);
              
              if (validationResult.issues) {
                issues.push(...validationResult.issues);
              } else {
                result.push(validationResult.value);
              }
            }
            
            if (issues.length > 0) {
              return createFailure(issues);
            }
            
            return createSuccess(result);
          },
        };
      }
      
      return {
        type: "array",
        description: jsonSchema.title || jsonSchema.description || "Array validator",
        validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
          if (!Array.isArray(value)) {
            return createFailure([
              createIssue(`Expected array, but got ${typeof value}`, path),
            ]);
          }
          return createSuccess(value);
        },
      };
    }
    
    // Handle object type
    if (types.includes("object")) {
      const properties: Record<string, SchemaDefinition> = {};
      const required = new Set(jsonSchema.required || []);
      
      if (jsonSchema.properties) {
        for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
          properties[key] = jsonSchemaToSchemaDefinition(propSchema, options);
        }
      }
      
      return {
        type: "object",
        description: jsonSchema.title || jsonSchema.description || "Object validator",
        shape: properties,
        validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
          if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return createFailure([
              createIssue(`Expected object, but got ${typeof value}`, path),
            ]);
          }
          
          const issues: spec.StandardSchemaV1.Issue[] = [];
          const result: Record<string, unknown> = {};
          const valueObj = value as Record<string, unknown>;
          
          // Validate required properties
          for (const key of required) {
            if (valueObj[key] === undefined) {
              issues.push(createIssue(`Missing required property: ${key}`, [...path, { key }]));
            }
          }
          
          // Validate each property
          for (const [key, schema] of Object.entries(properties)) {
            const propertyPath = [...path, { key }];
            const propertyValue = valueObj[key];
            
            if (propertyValue !== undefined) {
              const validationResult = schema.validate(propertyValue, propertyPath);
              if (validationResult.success) {
                result[key] = validationResult.value;
              } else {
                issues.push(...validationResult.issues);
              }
            }
          }
          
          // Check for additional properties
          if (validateAdditionalProperties && jsonSchema.additionalProperties === false) {
            const shapeKeys = new Set(Object.keys(properties));
            for (const key of Object.keys(valueObj)) {
              if (!shapeKeys.has(key)) {
                issues.push(createIssue(`Unexpected property: ${key}`, [...path, { key }]));
              }
            }
          }
          
          if (issues.length > 0) {
            return createFailure(issues);
          }
          
          return createSuccess(result);
        },
      };
    }
    
    // Handle primitive types
    if (types.length === 1) {
      const type = types[0];
      const validatorType = jsonSchemaTypeToValidatorType(type);
      
      // Handle format
      if (jsonSchema.format && formatValidators[jsonSchema.format]) {
        const formatValidator = formatValidators[jsonSchema.format];
        return {
          type: validatorType,
          description: jsonSchema.title || jsonSchema.description || `${type} validator`,
          validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
            // First validate the type
            const typeResult = validatePrimitiveType(value, type, path);
            if (!typeResult.success) {
              return typeResult;
            }
            
            // Then validate the format
            const formatResult = formatValidator(value, path);
            if (!formatResult.success) {
              return formatResult;
            }
            
            return createSuccess(formatResult.value);
          },
        };
      }
      
      return {
        type: validatorType,
        description: jsonSchema.title || jsonSchema.description || `${type} validator`,
        validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
          return validatePrimitiveType(value, type, path);
        },
      };
    }
    
    // Handle multiple types (union)
    const schemas = types.map(type => jsonSchemaToSchemaDefinition({ type }, options));
    return {
      type: "union",
      description: jsonSchema.title || jsonSchema.description || "Union validator",
      validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
        const issues: spec.StandardSchemaV1.Issue[] = [];
        
        for (const schema of schemas) {
          const result = schema.validate(value, path);
          if (result.success) {
            return result;
          }
          issues.push(...result.issues);
        }
        
        return createFailure([
          createIssue(`Value does not match any type: ${types.join(", ")}`, path),
          ...issues,
        ]);
      },
    };
  }
  
  // Default to any
  return {
    type: "any",
    description: jsonSchema.title || jsonSchema.description || "Any validator",
    validate: (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
      return createSuccess(value);
    },
  };
}

/**
 * Validate a primitive type according to JSON Schema
 */
function validatePrimitiveType(
  value: unknown,
  type: string,
  path: spec.StandardSchemaV1.PathSegment[] = [],
): spec.StandardSchemaV1.Result<unknown> {
  switch (type) {
    case "string":
      if (typeof value === "string") {
        return createSuccess(value);
      }
      return createFailure([createIssue(`Expected string, but got ${typeof value}`, path)]);
    
    case "number":
    case "integer":
      if (typeof value === "number" && !isNaN(value)) {
        if (type === "integer" && !Number.isInteger(value)) {
          return createFailure([createIssue(`Expected integer, but got float`, path)]);
        }
        return createSuccess(value);
      }
      return createFailure([createIssue(`Expected ${type}, but got ${typeof value}`, path)]);
    
    case "boolean":
      if (typeof value === "boolean") {
        return createSuccess(value);
      }
      return createFailure([createIssue(`Expected boolean, but got ${typeof value}`, path)]);
    
    case "null":
      if (value === null) {
        return createSuccess(value);
      }
      return createFailure([createIssue(`Expected null, but got ${typeof value}`, path)]);
    
    case "array":
      if (Array.isArray(value)) {
        return createSuccess(value);
      }
      return createFailure([createIssue(`Expected array, but got ${typeof value}`, path)]);
    
    case "object":
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return createSuccess(value);
      }
      return createFailure([createIssue(`Expected object, but got ${typeof value}`, path)]);
    
    default:
      return createSuccess(value);
  }
}

/**
 * Convert a validator to JSON Schema
 */
export function toJsonSchema(
  validator: StandardValidator<unknown>,
  options: ValidatorToJsonSchemaOptions = {},
): JsonSchema {
  const {
    target = "draft-2020-12",
    includeMetadata = true,
    customFormats = {},
  } = options;

  const schema = validator.schema;
  return schemaDefinitionToJsonSchema(schema, { target, includeMetadata, customFormats });
}

/**
 * Convert our internal SchemaDefinition to JSON Schema
 */
function schemaDefinitionToJsonSchema(
  schema: SchemaDefinition,
  options: ValidatorToJsonSchemaOptions,
): JsonSchema {
  const { target, includeMetadata, customFormats } = options;
  
  const jsonSchema: JsonSchema = {};
  
  // Add metadata
  if (includeMetadata) {
    if (schema.description) {
      jsonSchema.description = schema.description;
    }
    jsonSchema.$schema = getSchemaUrl(target);
  }
  
  // Handle different schema types
  switch (schema.type) {
    case "string":
      jsonSchema.type = "string";
      break;
      
    case "number":
      jsonSchema.type = "number";
      break;
      
    case "boolean":
      jsonSchema.type = "boolean";
      break;
      
    case "null":
      jsonSchema.type = "null";
      break;
      
    case "undefined":
      // JSON Schema doesn't have undefined, so we use null or omit
      jsonSchema.type = "null";
      break;
      
    case "bigint":
      jsonSchema.type = "integer";
      if (customFormats.bigint) {
        jsonSchema.format = customFormats.bigint;
      }
      break;
      
    case "symbol":
      jsonSchema.type = "string";
      if (customFormats.symbol) {
        jsonSchema.format = customFormats.symbol;
      }
      break;
      
    case "array":
      jsonSchema.type = "array";
      if (schema.itemSchema) {
        jsonSchema.items = schemaDefinitionToJsonSchema(schema.itemSchema, options);
      }
      break;
      
    case "object":
      jsonSchema.type = "object";
      if (schema.shape) {
        jsonSchema.properties = {};
        for (const [key, propSchema] of Object.entries(schema.shape)) {
          jsonSchema.properties[key] = schemaDefinitionToJsonSchema(propSchema, options);
        }
        // All properties in shape are required by default
        jsonSchema.required = Object.keys(schema.shape);
      }
      // JSON Schema doesn't have additionalProperties by default, but we can set it
      jsonSchema.additionalProperties = false;
      break;
      
    case "record":
      jsonSchema.type = "object";
      if (schema.itemSchema) {
        jsonSchema.additionalProperties = schemaDefinitionToJsonSchema(schema.itemSchema, options);
      } else {
        jsonSchema.additionalProperties = true;
      }
      break;
      
    case "literal":
      // For literal schemas, we use const or enum
      // Since we don't have the literal value stored, we'll use any
      jsonSchema.type = "any";
      break;
      
    case "union":
      // For union types, we use anyOf
      jsonSchema.anyOf = [];
      // This is a simplified approach - in a real implementation,
      // we would need to track the original schemas in the union
      break;
      
    case "optional":
      // Optional schemas become union with undefined (which we map to null)
      jsonSchema.anyOf = [
        schemaDefinitionToJsonSchema(
          // This is a simplified approach - we need to extract the inner schema
          { type: "any" } as SchemaDefinition,
          options,
        ),
        { type: "null" },
      ];
      break;
      
    case "nullable":
      // Nullable schemas become union with null
      jsonSchema.anyOf = [
        schemaDefinitionToJsonSchema(
          // This is a simplified approach - we need to extract the inner schema
          { type: "any" } as SchemaDefinition,
          options,
        ),
        { type: "null" },
      ];
      break;
      
    case "enum":
      // We don't have the enum values stored, so we use any
      jsonSchema.type = "any";
      break;
      
    case "oneOf":
    case "anyOf":
    case "allOf":
      // These map directly to JSON Schema
      jsonSchema[schema.type] = []; // This would need the original schemas
      break;
      
    default:
      // Custom types or unknown types
      jsonSchema.type = "any";
      if (customFormats[schema.type]) {
        jsonSchema.format = customFormats[schema.type];
      } else if (schema.type !== "custom" && schema.type !== "type") {
        jsonSchema.format = schema.type;
      }
      break;
  }
  
  return jsonSchema;
}

/**
 * Get the schema URL for the target JSON Schema draft
 */
function getSchemaUrl(target: string): string {
  const urls: Record<string, string> = {
    "draft-2020-12": "https://json-schema.org/draft/2020-12/schema",
    "draft-07": "http://json-schema.org/draft-07/schema#",
    "draft-04": "http://json-schema.org/draft-04/schema#",
    "openapi-3.0": "https://swagger.io/specification",
  };
  return urls[target] || urls["draft-2020-12"];
}

/**
 * Common JSON Schema formats
 */
export const commonFormatValidators: Record<string, ValidatorFunction<any>> = {
  "date-time": (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
    if (typeof value !== "string") {
      return createFailure([createIssue("Expected string for date-time format", path)]);
    }
    // Simple date-time validation (ISO 8601)
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    if (!dateRegex.test(value)) {
      return createFailure([createIssue("Invalid date-time format (ISO 8601 expected)", path)]);
    }
    return createSuccess(value);
  },
  
  "date": (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
    if (typeof value !== "string") {
      return createFailure([createIssue("Expected string for date format", path)]);
    }
    // Simple date validation (ISO 8601 date)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return createFailure([createIssue("Invalid date format (YYYY-MM-DD expected)", path)]);
    }
    return createSuccess(value);
  },
  
  "time": (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
    if (typeof value !== "string") {
      return createFailure([createIssue("Expected string for time format", path)]);
    }
    // Simple time validation (ISO 8601 time)
    const timeRegex = /^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
    if (!timeRegex.test(value)) {
      return createFailure([createIssue("Invalid time format (HH:MM:SS expected)", path)]);
    }
    return createSuccess(value);
  },
  
  "email": (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
    if (typeof value !== "string") {
      return createFailure([createIssue("Expected string for email format", path)]);
    }
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return createFailure([createIssue("Invalid email format", path)]);
    }
    return createSuccess(value);
  },
  
  "uri": (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
    if (typeof value !== "string") {
      return createFailure([createIssue("Expected string for URI format", path)]);
    }
    try {
      new URL(value);
      return createSuccess(value);
    } catch {
      return createFailure([createIssue("Invalid URI format", path)]);
    }
  },
  
  "uuid": (value: unknown, path: spec.StandardSchemaV1.PathSegment[] = []) => {
    if (typeof value !== "string") {
      return createFailure([createIssue("Expected string for UUID format", path)]);
    }
    // UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return createFailure([createIssue("Invalid UUID format", path)]);
    }
    return createSuccess(value);
  },
};

/**
 * Common JSON Schema format to JSON Schema format mappings
 */
export const commonFormatMappings: Record<string, string> = {
  "date-time": "date-time",
  "date": "date",
  "time": "time",
  "email": "email",
  "uri": "uri",
  "uuid": "uuid",
  "ipv4": "ipv4",
  "ipv6": "ipv6",
  "hostname": "hostname",
  "regex": "regex",
  "json-pointer": "json-pointer",
  "relative-json-pointer": "relative-json-pointer",
};

// Re-export types
export type { JsonSchemaToValidatorOptions, ValidatorToJsonSchemaOptions };

export { spec };