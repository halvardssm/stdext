// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { XmlDocument } from "@std/xml";

/**
 * StandardSchemaV1 compatible result
 *
 * Result of `validate`: the Standard Schema `Result` union shape.
 *   - success: `{ value: XmlDocument }` (`issues` is undefined — falsy)
 *   - failure: `{ issues: StandardSchemaV1.Issue[] }` (no `value`)
 */
export type XmlValidationResult = StandardSchemaV1.Result<XmlDocument>;

/**
 * A compiled XSD schema. Compile once, then validate any number of
 * documents given as XML text or as JSON-encoded `XmlDocument` trees.
 */
export class XmlSchema {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Compile a schema from a JSON-encoded `XmlDocument`.
   *
   * @throws {Error} if the tree is invalid or not a valid XSD.
   */
  static fromTree(schema: string): XmlSchema;
  /**
   * Compile a schema from XML text.
   *
   * @throws {Error} if the schema is not well-formed or not a valid XSD.
   */
  constructor(schema: string);
  /**
   * Validate XML text. Returns a JSON-encoded Standard Schema result:
   * `{ value: XmlDocument }` on success, `{ issues }` on failure.
   *
   * @throws {Error} if the document is not well-formed.
   */
  validate(document: string): string;
  /**
   * Validate a JSON-encoded `XmlDocument`. Returns the JSON-encoded issues,
   * or `undefined` when the document is valid — the caller already holds
   * the tree, so it is not sent back.
   *
   * @throws {Error} if the tree is invalid or not well-formed.
   */
  validateTree(document: string): string | undefined;
}

/**
 * Check that a JSON-encoded @std/xml `XmlDocument` is well-formed XML.
 *
 * @throws {Error} if the tree is not a valid XmlDocument, or does not
 * serialize to well-formed XML.
 */
export function checkTree(doc: string): void;

/**
 * Parse XML text into a JSON-encoded @std/xml `XmlDocument`.
 *
 * `options` is a JSON-encoded @std/xml `ParseOptions`.
 *
 * @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
 * is not well-formed, or when maxDepth is exceeded.
 */
export function parse(input: string, options: string): string;

/**
 * Serialize a JSON-encoded @std/xml `XmlDocument` to XML text.
 *
 * `options` is a JSON-encoded @std/xml `StringifyOptions`.
 *
 * @throws {Error} if the input is not a valid XmlDocument, or contains a
 * comment that cannot be serialized.
 */
export function stringify(doc: string, options: string): string;
