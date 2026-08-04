// deno-lint-ignore-file no-explicit-any

/**
 * Standard Schema specification types
 * Imported from jsr:@standard-schema/spec
 */
import * as spec from "jsr:@standard-schema/spec";

// Re-export the spec types for convenience
export * as spec from "jsr:@standard-schema/spec";

/**
 * Result type for validation operations
 */
export type ValidationResult<T> = 
  | { success: true; value: T; issues?: undefined }
  | { success: false; value?: undefined; issues: spec.StandardSchemaV1.Issue[] };

/**
 * Validator function type
 */
export type ValidatorFunction<T> = (value: unknown, path?: spec.StandardSchemaV1.PathSegment[]) => ValidationResult<T>;

/**
 * Schema definition for the validator
 */
export interface SchemaDefinition<T = unknown> {
  /**
   * The type name for this schema
   */
  readonly type: string;
  
  /**
   * Optional description of the schema
   */
  readonly description?: string;
  
  /**
   * The validation function
   */
  readonly validate: ValidatorFunction<T>;
  
  /**
   * For object schemas, the shape definition
   */
  readonly shape?: Record<string, SchemaDefinition>;
  
  /**
   * For array schemas, the item schema
   */
  readonly itemSchema?: SchemaDefinition;
  
  /**
   * Custom validators to apply
   */
  readonly customValidators?: ValidatorFunction<T>[];
}

/**
 * Schema builder interface for fluent API
 */
export interface SchemaBuilder<T> {
  /**
   * Add a custom validator to the schema
   */
  withValidator<U extends T>(validator: ValidatorFunction<U>): SchemaBuilder<U>;
  
  /**
   * Add multiple custom validators
   */
  withValidators<U extends T>(...validators: ValidatorFunction<U>[]): SchemaBuilder<U>;
  
  /**
   * Set a description for the schema
   */
  describe(description: string): SchemaBuilder<T>;
  
  /**
   * Build the final schema
   */
  build(): SchemaDefinition<T>;
}

/**
 * Standard Schema V1 implementation type
 */
export interface StandardValidator<T> extends spec.StandardSchemaV1<T, T> {
  /**
   * The underlying schema definition
   */
  readonly schema: SchemaDefinition<T>;
  
  /**
   * Add custom validators to create a new validator
   */
  withValidator<U extends T>(validator: ValidatorFunction<U>): StandardValidator<U>;
  
  /**
   * Add multiple custom validators to create a new validator
   */
  withValidators<U extends T>(...validators: ValidatorFunction<U>[]): StandardValidator<U>;
}

/**
 * Options for creating validators
 */
export interface ValidatorOptions {
  /**
   * Custom validators to include
   */
  validators?: Record<string, ValidatorFunction<any>>;
  
  /**
   * Custom types to include
   */
  types?: Record<string, SchemaDefinition>;
}

/**
 * Type for custom type definitions
 */
export interface CustomType<T> {
  /**
   * The validation function
   */
  validate: ValidatorFunction<T>;
  
  /**
   * Optional description
   */
  description?: string;
}

/**
 * Validation context for custom validators
 */
export interface ValidationContext {
  /**
   * The current path in the validation
   */
  readonly path: spec.StandardSchemaV1.PathSegment[];
  
  /**
   * The original value being validated
   */
  readonly originalValue: unknown;
  
  /**
   * The current value after any transformations
   */
  readonly currentValue: unknown;
}

/**
 * Helper type to extract the output type from a StandardValidator
 */
export type InferValidatorOutput<T extends StandardValidator<any>> = 
  spec.StandardSchemaV1.InferOutput<T>;

/**
 * Helper type to extract the input type from a StandardValidator
 */
export type InferValidatorInput<T extends StandardValidator<any>> = 
  spec.StandardSchemaV1.InferInput<T>;