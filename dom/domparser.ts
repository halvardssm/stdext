import type { JsDocument, JsNode } from "./_wasm/dom_domparser.generated.mjs";
import {
  instantiate,
  type InstantiateResult,
  type JsDOMParser as WasmDOMParser,
} from "./_wasm/dom_domparser.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

/**
 * A DOM Node representation
 */
export interface Node {
  /** The type of node (e.g., "ELEMENT_NODE", "TEXT_NODE", "COMMENT_NODE", "DOCUMENT_NODE") */
  nodeType: string;
  /** The name of the node */
  nodeName: string;
  /** The value of the node (for text/comment nodes) */
  nodeValue: string | null;
  /** Attributes of the node (for element nodes) */
  attributes: [string, string][];
  /** Child nodes */
  children: Node[];
}

/**
 * A DOM Document representation
 */
export interface Document {
  /** The document element (root element) */
  documentElement: Node | null;
  /** The root node of the document */
  root: Node;
}

/**
 * DOMParser provides the ability to parse XML or HTML source code from a string into a DOM Document.
 *
 * @example parsing HTML
 * ```ts
 * import { DOMParser } from "@stdext/dom";
 * const parser = new DOMParser();
 * const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
 * console.log(doc.documentElement?.nodeName); // "HTML"
 * ```
 *
 * @example parsing with nested elements
 * ```ts
 * import { DOMParser } from "@stdext/dom";
 * const parser = new DOMParser();
 * const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
 * console.log(doc.documentElement?.children[0].nodeName); // "P"
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
 */
export class DOMParser {
  #wasmParser: WasmDOMParser;

  constructor() {
    this.#wasmParser = new instance.JsDOMParser();
  }

  /**
   * Parses a string into a Document.
   *
   * @param string - The string to parse
   * @param contentType - The content type (e.g., "text/html", "text/xml", "application/xml")
   * @returns A Document object
   */
  parseFromString(string: string, contentType: string): Document {
    const result = this.#wasmParser.parse_from_string(string, contentType);
    return result as Document;
  }
}

// Re-export types
export type { JsDocument, JsNode };
