/**
 * JSON Schema Draft 2020-12
 *
 * As specified in {@link https://json-schema.org/draft/2020-12}
 */
export interface JSONSchema
  extends
    CoreVocabulary,
    ApplicatorVocabulary,
    ValidationVocabulary,
    UnevaluatedVocabulary,
    FormatVocabulary,
    ContentVocabulary,
    MetaDataVocabulary {
}

/**
 * Internal schema type, allows boolean as defined in the specs
 *
 * @see {@link https://json-schema.org/understanding-json-schema/basics}
 */
export type JSONSchemaInternal = JSONSchema | boolean;

/**
 * All schema data types
 */
export type SchemaTypes =
  | ArraySchema
  | BooleanSchema
  | IntegerSchema
  | NullSchema
  | NumberSchema
  | ObjectSchema
  | StringSchema;

/**
 * Data type array
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array}
 */
export interface ArraySchema extends JSONSchema {
  /** .
   * @inheritdoc
   */
  type: "array";
}
/**
 * Data type boolean
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array}
 */
export interface BooleanSchema extends JSONSchema {
  /** .
   * @inheritdoc
   */
  type: "boolean";
}
/**
 * Data type integer
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array}
 */
export interface IntegerSchema extends JSONSchema {
  /** .
   * @inheritdoc
   */
  type: "integer";
}
/**
 * Data type null
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array}
 */
export interface NullSchema extends JSONSchema {
  /** .
   * @inheritdoc
   */
  type: "null";
}
/**
 * Data type number
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array}
 */
export interface NumberSchema extends JSONSchema {
  /** .
   * @inheritdoc
   */
  type: "number";
}
/**
 * Data type object
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array}
 */
export interface ObjectSchema extends JSONSchema {
  /** .
   * @inheritdoc
   */
  type: "object";
}
/**
 * Data type string
 *
 * @see {@link https://json-schema.org/understanding-json-schema/reference/array}
 */
export interface StringSchema extends JSONSchema {
  /** .
   * @inheritdoc
   */
  type: "string";
}

/**
 * CoreVocabulary
 *
 * @see {@link https://json-schema.org/draft/2020-12/meta/core}
 */
interface CoreVocabulary {
  $id?: string;
  $schema?: "https://json-schema.org/draft/2020-12/schema";
  $ref?: string;
  $anchor?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $vocabulary?: Record<string, boolean>;
  $comment?: string;
  $defs?: Record<string, JSONSchema>;
}

/**
 * ApplicatorVocabulary
 *
 * @see {@link https://json-schema.org/draft/2020-12/meta/applicator}
 */
interface ApplicatorVocabulary {
  prefixItems?: JSONSchemaInternal[];
  items?: JSONSchemaInternal | JSONSchemaInternal[];
  contains?: JSONSchemaInternal;
  additionalProperties?: JSONSchemaInternal;
  properties?: Record<string, JSONSchemaInternal>;
  patternProperties?: Record<string, JSONSchemaInternal>;
  dependentSchemas?: Record<string, JSONSchemaInternal>;
  propertyNames?: JSONSchemaInternal;
  if?: JSONSchemaInternal;
  then?: JSONSchemaInternal;
  else?: JSONSchemaInternal;
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchemaInternal;
}

/**
 * ValidationVocabulary
 *
 * @see {@link https://json-schema.org/draft/2020-12/meta/validation}
 */
interface ValidationVocabulary {
  /**
   * The type of the object
   */
  type?:
    | "array"
    | "boolean"
    | "integer"
    | "null"
    | "number"
    | "object"
    | "string";
  const?: unknown;
  enum?: unknown[];
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxContains?: number;
  minContains?: number;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  dependentRequired?: Record<string, string[]>;
}

/**
 * UnevaluatedVocabulary
 *
 * @see {@link https://json-schema.org/draft/2020-12/meta/unevaluated}
 */
interface UnevaluatedVocabulary {
  unevaluatedItems?: JSONSchemaInternal;
  unevaluatedProperties?: JSONSchemaInternal;
}

/**
 * FormatVocabulary
 *
 * @see {@link https://json-schema.org/draft/2020-12/meta/format-annotation}
 * @see {@link https://json-schema.org/draft/2020-12/meta/format-assertion}
 */
interface FormatVocabulary {
  format?: string;
}

/**
 * ContentVocabulary
 *
 * @see {@link https://json-schema.org/draft/2020-12/meta/content}
 */
interface ContentVocabulary {
  contentEncoding?: string;
  contentMediaType?: string;
  contentSchema?: JSONSchema;
}
/**
 * MetaDataVocabulary
 *
 * @see {@link https://json-schema.org/draft/2020-12/meta/meta-data}
 */
interface MetaDataVocabulary {
  title?: string;
  description?: string;
  default?: unknown;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: unknown[];
}
