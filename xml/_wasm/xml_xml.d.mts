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
 * Parse an XML string into a plain document tree, identical in shape to
 * @std/xml's `parse` output.
 *
 * Options follow @std/xml's `ParseOptions` (camelCase): `ignoreWhitespace`,
 * `ignoreComments`, `disallowDoctype` (default true), `maxDepth` (root
 * element counts as depth 1, as in @std/xml), `trackPosition` (default
 * true — controls the declaration's position fields).
 * `maxAttributes` and `xmlVersion` are accepted but ignored (see the
 * crate-level notes above).
 *
 * @example
 * ```ts
 * const doc = parse('<root id="1"><child/></root>');
 * doc.root.name.local;          // "root"
 * doc.root.attributes["id"];    // "1"
 * ```
 *
 * @throws {Error} formatted like @std/xml's XmlSyntaxError when the input
 * is not well-formed, or when maxDepth is exceeded.
 */
export function parse(input: string, options?: any | null): any;

/**
 * Serialize a document tree back to an XML string, with @std/xml's
 * `StringifyOptions` semantics (`indent` for pretty-printing, `declaration`
 * defaulting to true when the document has one). Attributes are emitted in
 * the input object's key order, which for parse output is document order.
 *
 * @example
 * ```ts
 * stringify(doc);                         // declaration kept if present
 * stringify(doc, { indent: "  " });        // pretty-printed
 * stringify(doc, { declaration: false }); // never emit <?xml ...?>
 * ```
 *
 * @throws {Error} if the input is not a valid XmlDocument object.
 */
export function stringify(doc: any, options?: any | null): string;

/**
 * Validate a document against an XSD schema.
 *
 * Both `document` and `schema` accept either an XML string or the plain
 * document/schema object (the same shape `parse` produces).
 *
 * Returns the Standard Schema `Result` union (https://standardschema.dev):
 *   - success: `{ value: XmlDocument }` — `issues` is undefined (falsy)
 *   - failure: `{ issues: XmlValidationIssue[] }` — no `value`
 *
 * Each issue carries `message` and, best-effort, `path` (the chain of
 * enclosing element names with 0-based indices for repeated siblings —
 * derived on the Rust side from uppsala's line/column position) plus
 * `line`/`column` themselves.
 *
 * Error layering:
 *   - a schema that is not well-formed XML *throws*
 *   - an invalid XSD may *throw* (schema compilation error) — uppsala
 *     compiles leniently, so some authoring mistakes surface as validation
 *     issues on the document instead. Both behaviors are supported by the
 *     TS wrapper's callers.
 *   - a document that does not conform returns issues (does not throw)
 *
 * @example
 * ```ts
 * const result = validate("<age>25</age>", xsdString);
 * result.value.root.name.local;   // "age" (success: issues is undefined)
 * ```
 */
export function validate(document: any, schema: any): any;
