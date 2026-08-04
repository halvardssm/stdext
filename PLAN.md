# Validator Package Implementation Plan

## Overview
Add a new «validator» namespace that offers a simple validator implementing the Standard Schema specification.

## Tasks

- [ ] Create validator package directory structure
- [ ] Create validator/mod.ts with main exports
- [ ] Create validator/types.ts with type definitions and spec imports
- [ ] Create validator/validator.ts with core validator implementation
- [ ] Create validator/deno.json package configuration
- [ ] Create validator/README.md documentation
- [ ] Add validator to workspace in deno.json
- [ ] Create comprehensive tests for validator (validator.test.ts)
- [ ] Run tests to verify implementation
- [ ] Create branch and commit changes

## Implementation Details

### Package Structure
```
validator/
├── mod.ts              # Main exports
├── deno.json          # Package configuration
├── README.md          # Documentation
├── types.ts           # Type definitions and spec imports
├── validator.ts       # Core validator implementation
└── validator.test.ts  # Comprehensive tests
```

### Core Features
1. **Standard Schema Implementation**: Import and use `jsr:@standard-schema/spec`
2. **Primitive Support**: string, number, boolean, null, undefined, bigint, symbol
3. **Object Support**: Nested objects with shape validation
4. **Array Support**: Arrays with item validation
5. **Custom Validators**: Allow users to add custom validation functions
6. **Custom Types**: Allow users to define custom types with validation
7. **Error Reporting**: Proper issue reporting with paths

### API Design
```typescript
import * as spec from "jsr:@standard-schema/spec";

// Core validator factory
function createValidator<T>(schema: Schema<T>): spec.StandardSchemaV1<T, T>

// Schema definition types
interface Schema<T> {
  type: string;
  validator?: (value: unknown) => Result<T>;
  // ... other schema properties
}

// Result type
interface Result<T> {
  success: boolean;
  value?: T;
  issues?: spec.StandardSchemaV1.Issue[];
}

// Primitive validators
function string(): Schema<string>
function number(): Schema<number>
function boolean(): Schema<boolean>
function null_(): Schema<null>
function undefined_(): Schema<undefined>
function bigint(): Schema<bigint>
function symbol(): Schema<symbol>

// Object validator
function object<T extends Record<string, Schema<any>>>(shape: T): Schema<{ [K in keyof T]: spec.StandardSchemaV1.InferOutput<T[K]> }>

// Array validator
function array<T>(itemSchema: Schema<T>): Schema<T[]>

// Custom validator support
function custom<T>(validator: (value: unknown) => Result<T>): Schema<T>

// Type alias for easier usage
function type<T>(validator: (value: unknown) => Result<T>): Schema<T>
```

## Standard Schema Compliance
- Implement `StandardSchemaV1` interface
- Support `validate` function with proper return types
- Proper `~standard` property with vendor info
- Type inference support via `InferInput` and `InferOutput`