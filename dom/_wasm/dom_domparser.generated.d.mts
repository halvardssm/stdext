/* tslint:disable */
/* eslint-disable */

/**
 * A DOM Node
 */
export interface JsNode {
    node_type: string;
    node_name: string;
    node_value: string | null;
    attributes: [string, string][];
    children: JsNode[];
}

/**
 * A DOM Document
 */
export interface JsDocument {
    document_element: JsNode | null;
    root: JsNode;
}


/**
* DOMParser provides the ability to parse XML or HTML source code from a string into a DOM Document.
*
* @example
* ```ts
* const parser = new DOMParser();
* const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
* ```
*/
export class JsDOMParser {
  free(): void;
/**
* Parses a string into a Document.
*
* @param string - The string to parse
* @param content_type - The content type (e.g., "text/html", "text/xml")
* @returns A Document object serialized as JSON
* @param {string} string
* @param {string} _content_type
* @returns {any}
*/
  parse_from_string(string: string, _content_type: string): any;
/**
* Creates a new DOMParser instance.
*/
  constructor();
}
