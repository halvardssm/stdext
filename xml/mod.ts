import {
  parse as wasmParse,
  stringify as wasmStringify,
} from "./_wasm/xml_xml.mjs";
import type {
  ParseOptions,
  StringifyOptions,
  XmlDeclaration,
  XmlDocument,
  XmlElement,
} from "@std/xml";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";

export class XML implements XmlDocument {
  #document: XmlDocument;

  get document(): XmlDocument {
    return this.#document;
  }

  get declaration(): XmlDeclaration | undefined {
    return this.document.declaration;
  }
  get root(): XmlElement {
    return this.document.root;
  }

  constructor(document: XmlDocument) {
    this.#document = document;
  }

  static safeParse(
    document: string | XmlDocument,
    options?: ParseOptions,
  ): StandardSchemaV1.Result<XML> {
    const res = typeof document === "string"
      ? wasmParse(document, options)
      : document;

    return {
      value: res.value ? new XML(res.value) : undefined,
      issues: res.issues?.map((i) => ({ message: i.message, path: i.path })),
    };
  }

  static parse(
    document: string | XmlDocument,
    options?: ParseOptions,
  ): XML {
    const res = this.safeParse(document, options);

    if (res.issues) {
      throw new SchemaError(res.issues);
    }

    return new XML(res.value);
  }

  stringify(options?: StringifyOptions): string {
    return wasmStringify(this.#document, options);
  }

  validate(
    schema: XMLValidator | XmlDocument | string,
  ): StandardSchemaV1.Result<XmlDocument> {
    if (schema instanceof XMLValidator) {
      return schema.validate(this.#document);
    }

    return new XMLValidator(schema).validate(this.#document);
  }
}

/**
 * A compiled XSD schema, reusable for validating many documents.
 *
 * The schema is compiled once, in the constructor. The compiled schema
 * lives in wasm memory: it is released when the validator is garbage
 * collected, or immediately with `using` / `[Symbol.dispose]()`.
 *
 * @example Usage
 * ```ts
 * import { XmlValidator } from "@stdext/xml";
 * import { assert, assertThrows } from "@std/assert";
 *
 * using validator = new XmlValidator(`<xs:schema
 *   xmlns:xs="http://www.w3.org/2001/XMLSchema">
 *   <xs:element name="age" type="xs:positiveInteger"/>
 * </xs:schema>`);
 *
 * assert(validator.validate("<age>25</age>").issues === undefined);
 * assert(validator.validate("<age>-5</age>").issues !== undefined);
 * assertThrows(() => validator.parse("<age>-5</age>"));
 * ```
 */
export class XMLValidator {
  #schema: XML;

  /**
   * Compiles the schema.
   *
   * @param schema The XSD schema (XML string or document tree).
   * @throws {XmlSyntaxError} If the schema is not well-formed XML or is an
   * invalid XSD.
   */
  constructor(schema: string | XmlDocument) {
    this.#schema = XML.parse(schema);
  }

  /**
   * Validates a document against the schema.
   *
   * @param doc The document (XML string or document tree).
   * @returns The Standard Schema result: `{ value }` or `{ issues }`.
   * @throws {XmlSyntaxError} If the document is not well-formed XML.
   */
  validate(
    doc: string | XmlDocument | XML,
  ): StandardSchemaV1.Result<XmlDocument> {
    if (doc instanceof XML) {
      return doc.validate(this.#schema);
    }

    const parsedDoc = XML.safeParse(doc);

    if (parsedDoc.issues) {
      return { issues: parsedDoc.issues };
    }

    return parsedDoc.value.validate(this.#schema);
  }

  /**
   * Validates a document against the schema, and returns it as a tree.
   *
   * @param doc The document (XML string or document tree).
   * @returns The document tree.
   * @throws {SchemaError} If the document does not conform to the schema.
   * @throws {XmlSyntaxError} If the document is not well-formed XML.
   */
  parse(doc: string | XmlDocument | XML): XmlDocument {
    const result = this.validate(doc);
    if (result.issues) throw new SchemaError(result.issues);
    return result.value;
  }
}

// ---------------------------------------------------------------------------
// Standard Schema facade
// ---------------------------------------------------------------------------

/**
 * Create a Standard Schema v1 entity (https://standardschema.dev) for XML,
 * so it can be consumed by any Standard Schema-aware tool.
 *
 * The returned object's `~standard.validate(value)` accepts an XML string
 * or an XmlDocument and never throws for bad input — every problem is an
 * issue:
 *   - not a string or XmlDocument → issue
 *   - not well-formed XML → issue (with `line`/`column` when known)
 *   - with a schema: not conforming → the validator's issues, carrying
 *     best-effort `path`s (element names + sibling indices)
 *
 * On success it returns `{ value: XmlDocument }` (for a tree input, that
 * same tree). The schema is compiled once, when `xml()` is called; an
 * invalid schema throws there.
 *
 * @example Usage
 * ```ts
 * import { xml } from "@stdext/xml";
 * import { assert } from "@std/assert";
 *
 * const schema = xml(`<xs:schema
 *   xmlns:xs="http://www.w3.org/2001/XMLSchema">
 *   <xs:element name="age" type="xs:positiveInteger"/>
 * </xs:schema>`);
 *
 * const result = schema["~standard"].validate("<age>25</age>");
 * assert(!("issues" in result)); // success: result.value is the tree
 *
 * // Without a schema, only well-formedness is checked.
 * assert("issues" in xml()["~standard"].validate("<age>"));
 * ```
 *
 * @param schema The XSD schema (XML string or document tree). When omitted,
 * values are only checked for well-formedness.
 * @returns A Standard Schema v1 entity.
 * @throws {XmlSyntaxError} If the schema is not well-formed XML or is an
 * invalid XSD.
 */
export function xml(
  schema?: string | XmlDocument,
): StandardSchemaV1<string | XmlDocument, XmlDocument> {
  const validator = schema === undefined ? undefined : new XMLValidator(schema);

  return {
    "~standard": {
      version: 1,
      vendor: "@stdext/xml",
      validate: (value: unknown): StandardSchemaV1.Result<XmlDocument> => {
        try {
          // @ts-expect-error We expect this type error but it's fine since we handle it
          if (validator) return validator.validate(value);

          // @ts-expect-error We expect this type error but it's fine since we handle it
          return XML.parse(value);
        } catch (error) {
          if (error instanceof SchemaError) {
            return { issues: error.issues };
          }

          if (error instanceof Error) {
            return { issues: [{ message: error.message }] };
          }

          return { issues: [{ message: `Unknown error: ${error}` }] };
        }
      },
    },
  };
}
