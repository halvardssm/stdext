// deno-lint-ignore-file
// @ts-nocheck - Generated types may have issues

import type { JsDocument, JsNode } from "./_wasm/dom_domparser.generated.mjs";
import {
  instantiate,
  type InstantiateResult,
  type JsDOMParser as WasmDOMParser,
} from "./_wasm/dom_domparser.generated.mjs";

const instance: InstantiateResult["exports"] = instantiate();

// ============================================================================
// Node Type Constants
// ============================================================================

export const ELEMENT_NODE = 1;
export const ATTRIBUTE_NODE = 2;
export const TEXT_NODE = 3;
export const CDATA_SECTION_NODE = 4;
export const ENTITY_REFERENCE_NODE = 5;
export const ENTITY_NODE = 6;
export const PROCESSING_INSTRUCTION_NODE = 7;
export const COMMENT_NODE = 8;
export const DOCUMENT_NODE = 9;
export const DOCUMENT_TYPE_NODE = 10;
export const DOCUMENT_FRAGMENT_NODE = 11;
export const NOTATION_NODE = 12;

// ============================================================================
// Type Definitions
// ============================================================================

/** Internal node data from WASM */
interface InternalNode {
  node_type: number;
  node_name: string;
  node_value: string | null;
  attributes: [string, string][];
  children: InternalNode[];
}

/** Internal document data from WASM */
interface InternalDocument {
  document_element: InternalNode | null;
  root: InternalNode;
}

// ============================================================================
// NodeList Implementation
// ============================================================================

export class NodeList {
  #nodes: Node[];

  constructor(nodes: Node[] = []) {
    this.#nodes = nodes;
  }

  get length(): number {
    return this.#nodes.length;
  }

  item(index: number): Node | null {
    if (index >= 0 && index < this.#nodes.length) {
      return this.#nodes[index];
    }
    return null;
  }

  forEach(callback: (node: Node, index: number) => void): void {
    this.#nodes.forEach(callback);
  }

  [Symbol.iterator](): IterableIterator<Node> {
    return this.#nodes.values();
  }
}

// ============================================================================
// HTMLCollection Implementation
// ============================================================================

export class HTMLCollection {
  #elements: Element[];

  constructor(elements: Element[] = []) {
    this.#elements = elements;
  }

  get length(): number {
    return this.#elements.length;
  }

  item(index: number): Element | null {
    if (index >= 0 && index < this.#elements.length) {
      return this.#elements[index];
    }
    return null;
  }

  namedItem(name: string): Element | null {
    for (const element of this.#elements) {
      if (element.id === name || element.getAttribute("name") === name) {
        return element;
      }
    }
    return null;
  }

  [Symbol.iterator](): IterableIterator<Element> {
    return this.#elements.values();
  }
}

// ============================================================================
// NamedNodeMap Implementation
// ============================================================================

export class NamedNodeMap {
  #attributes: Attr[];

  constructor(attributes: Attr[] = []) {
    this.#attributes = attributes;
  }

  get length(): number {
    return this.#attributes.length;
  }

  getNamedItem(name: string): Attr | null {
    for (const attr of this.#attributes) {
      if (attr.name === name) {
        return attr;
      }
    }
    return null;
  }

  setNamedItem(attr: Attr): Attr | null {
    for (let i = 0; i < this.#attributes.length; i++) {
      if (this.#attributes[i].name === attr.name) {
        const old = this.#attributes[i];
        this.#attributes[i] = attr;
        return old;
      }
    }
    this.#attributes.push(attr);
    return null;
  }

  removeNamedItem(name: string): Attr | null {
    for (let i = 0; i < this.#attributes.length; i++) {
      if (this.#attributes[i].name === name) {
        return this.#attributes.splice(i, 1)[0];
      }
    }
    return null;
  }

  item(index: number): Attr | null {
    if (index >= 0 && index < this.#attributes.length) {
      return this.#attributes[index];
    }
    return null;
  }

  [Symbol.iterator](): IterableIterator<Attr> {
    return this.#attributes.values();
  }
}

// ============================================================================
// Attr Implementation
// ============================================================================

export class Attr {
  #name: string;
  #value: string;
  #ownerElement: Element | null;

  constructor(name: string, value: string, ownerElement: Element | null = null) {
    this.#name = name;
    this.#value = value;
    this.#ownerElement = ownerElement;
  }

  get name(): string {
    return this.#name;
  }

  get value(): string {
    return this.#value;
  }

  set value(newValue: string) {
    this.#value = newValue;
  }

  get ownerElement(): Element | null {
    return this.#ownerElement;
  }

  get specified(): boolean {
    return true;
  }
}

// ============================================================================
// Node Implementation
// ============================================================================

export class Node {
  #internal: InternalNode;
  #parent: Node | null;
  #ownerDocument: Document | null;

  constructor(internal: InternalNode, parent: Node | null = null, ownerDocument: Document | null = null) {
    this.#internal = internal;
    this.#parent = parent;
    this.#ownerDocument = ownerDocument;
    
    // Set parent and ownerDocument on children
    for (const childInternal of internal.children) {
      const child = new Node(childInternal, this, ownerDocument);
      (child as any).#parent = this;
      (child as any).#ownerDocument = ownerDocument;
    }
  }

  get nodeType(): number {
    return this.#internal.node_type;
  }

  get nodeName(): string {
    return this.#internal.node_name;
  }

  get nodeValue(): string | null {
    return this.#internal.node_value;
  }

  set nodeValue(value: string | null) {
    // For now, just update the internal value
    // In a full implementation, this would need to handle different node types
    (this.#internal as any).node_value = value;
  }

  get parentNode(): Node | null {
    return this.#parent;
  }

  get parentElement(): Element | null {
    const parent = this.#parent;
    if (parent && parent.nodeType === ELEMENT_NODE) {
      return parent as Element;
    }
    return null;
  }

  get childNodes(): NodeList {
    const children = this.#internal.children.map((childInternal) => {
      return new Node(childInternal, this, this.#ownerDocument);
    });
    return new NodeList(children);
  }

  get firstChild(): Node | null {
    if (this.#internal.children.length > 0) {
      return new Node(this.#internal.children[0], this, this.#ownerDocument);
    }
    return null;
  }

  get lastChild(): Node | null {
    if (this.#internal.children.length > 0) {
      const last = this.#internal.children[this.#internal.children.length - 1];
      return new Node(last, this, this.#ownerDocument);
    }
    return null;
  }

  get previousSibling(): Node | null {
    if (this.#parent) {
      const siblings = this.#parent.childNodes;
      for (let i = 1; i < siblings.length; i++) {
        if (siblings.item(i) === this) {
          return siblings.item(i - 1);
        }
      }
    }
    return null;
  }

  get nextSibling(): Node | null {
    if (this.#parent) {
      const siblings = this.#parent.childNodes;
      for (let i = 0; i < siblings.length - 1; i++) {
        if (siblings.item(i) === this) {
          return siblings.item(i + 1);
        }
      }
    }
    return null;
  }

  get ownerDocument(): Document | null {
    return this.#ownerDocument;
  }

  get isConnected(): boolean {
    // Check if this node is connected to a document
    let current: Node | null = this;
    while (current) {
      if (current.nodeType === DOCUMENT_NODE) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  appendChild<T extends Node>(newChild: T): T {
    this.#internal.children.push(newChild.#internal);
    (newChild as any).#parent = this;
    (newChild as any).#ownerDocument = this.#ownerDocument;
    return newChild;
  }

  removeChild<T extends Node>(oldChild: T): T {
    const index = this.#internal.children.findIndex((child) => {
      // Compare by reference - this is a simplification
      return child === oldChild.#internal;
    });
    
    if (index !== -1) {
      this.#internal.children.splice(index, 1);
      (oldChild as any).#parent = null;
    }
    
    return oldChild;
  }

  replaceChild<T extends Node>(newChild: Node, oldChild: T): T {
    const index = this.#internal.children.findIndex((child) => {
      return child === oldChild.#internal;
    });
    
    if (index !== -1) {
      this.#internal.children[index] = newChild.#internal;
      (newChild as any).#parent = this;
      (newChild as any).#ownerDocument = this.#ownerDocument;
      (oldChild as any).#parent = null;
    }
    
    return oldChild;
  }

  insertBefore<T extends Node>(newChild: T, referenceNode: Node | null): T {
    if (referenceNode === null) {
      return this.appendChild(newChild);
    }
    
    const index = this.#internal.children.findIndex((child) => {
      return child === referenceNode.#internal;
    });
    
    if (index !== -1) {
      this.#internal.children.splice(index, 0, newChild.#internal);
      (newChild as any).#parent = this;
      (newChild as any).#ownerDocument = this.#ownerDocument;
    } else {
      return this.appendChild(newChild);
    }
    
    return newChild;
  }

  hasChildNodes(): boolean {
    return this.#internal.children.length > 0;
  }

  cloneNode(deep: boolean = false): Node {
    const clonedInternal: InternalNode = {
      node_type: this.#internal.node_type,
      node_name: this.#internal.node_name,
      node_value: this.#internal.node_value,
      attributes: [...this.#internal.attributes],
      children: [],
    };
    
    const cloned = new Node(clonedInternal);
    
    if (deep) {
      for (const childInternal of this.#internal.children) {
        const child = new Node(childInternal, this, this.#ownerDocument);
        cloned.appendChild(child.cloneNode(true));
      }
    }
    
    return cloned;
  }

  normalize(): void {
    // Merge adjacent text nodes
    const children = this.#internal.children;
    const newChildren: InternalNode[] = [];
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.node_type === TEXT_NODE) {
        // Merge with previous text node if it exists
        const last = newChildren[newChildren.length - 1];
        if (last && last.node_type === TEXT_NODE) {
          last.node_value = (last.node_value || "") + (child.node_value || "");
        } else {
          newChildren.push(child);
        }
      } else {
        newChildren.push(child);
      }
    }
    
    this.#internal.children = newChildren;
  }

  isEqualNode(otherNode: Node | null): boolean {
    if (!otherNode) return false;
    
    if (this.nodeType !== otherNode.nodeType) return false;
    if (this.nodeName !== otherNode.nodeName) return false;
    if (this.nodeValue !== otherNode.nodeValue) return false;
    
    if (this.attributes.length !== otherNode.attributes.length) return false;
    
    for (let i = 0; i < this.attributes.length; i++) {
      if (this.attributes[i].name !== otherNode.attributes[i].name ||
          this.attributes[i].value !== otherNode.attributes[i].value) {
        return false;
      }
    }
    
    if (this.childNodes.length !== otherNode.childNodes.length) return false;
    
    for (let i = 0; i < this.childNodes.length; i++) {
      if (!this.childNodes.item(i)?.isEqualNode(otherNode.childNodes.item(i))) {
        return false;
      }
    }
    
    return true;
  }

  isSameNode(otherNode: Node | null): boolean {
    return this === otherNode;
  }

  compareDocumentPosition(other: Node): number {
    // Simplified implementation
    // Returns 0 if nodes are the same
    if (this.isSameNode(other)) {
      return 0;
    }
    
    // Check if other is an ancestor of this
    let current: Node | null = this;
    while (current) {
      if (current.isSameNode(other)) {
        return 0b0001; // DOCUMENT_POSITION_CONTAINED_BY
      }
      current = current.parentNode;
    }
    
    // Check if this is an ancestor of other
    current = other;
    while (current) {
      if (current.isSameNode(this)) {
        return 0b0010; // DOCUMENT_POSITION_CONTAINS
      }
      current = current.parentNode;
    }
    
    // Check if they have the same parent
    if (this.parentNode?.isSameNode(other.parentNode)) {
      // Check order
      const siblings = this.parentNode!.childNodes;
      let thisIndex = -1;
      let otherIndex = -1;
      
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings.item(i);
        if (sibling?.isSameNode(this)) thisIndex = i;
        if (sibling?.isSameNode(other)) otherIndex = i;
      }
      
      if (thisIndex < otherIndex) {
        return 0b0100; // DOCUMENT_POSITION_FOLLOWING
      } else if (thisIndex > otherIndex) {
        return 0b1000; // DOCUMENT_POSITION_PRECEDING
      }
    }
    
    return 0;
  }

  contains(other: Node | null): boolean {
    if (!other) return false;
    
    let current: Node | null = other;
    while (current) {
      if (current.isSameNode(this)) {
        return true;
      }
      current = current.parentNode;
    }
    
    return false;
  }

  lookupPrefix(namespaceURI: string | null): string | null {
    // Not implemented for now
    return null;
  }

  lookupNamespaceURI(prefix: string | null): string | null {
    // Not implemented for now
    return null;
  }

  // Helper to get attributes (for Element compatibility)
  get attributes(): NamedNodeMap {
    const attrs = this.#internal.attributes.map(([name, value]) => {
      return new Attr(name, value, this as any as Element);
    });
    return new NamedNodeMap(attrs);
  }

  // Helper to get children as Elements
  get children(): HTMLCollection {
    const elements = this.#internal.children
      .filter((child) => child.node_type === ELEMENT_NODE)
      .map((child) => new Element(child, this, this.#ownerDocument));
    return new HTMLCollection(elements);
  }

  // Helper to get text content
  get textContent(): string | null {
    if (this.nodeType === TEXT_NODE || this.nodeType === COMMENT_NODE) {
      return this.nodeValue;
    }
    
    let result = "";
    for (const child of this.childNodes) {
      const content = child.textContent;
      if (content) {
        result += content;
      }
    }
    
    return result || null;
  }

  set textContent(value: string | null) {
    // Remove all children
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
    
    // Add new text node if value is not null/empty
    if (value) {
      const textNode = this.ownerDocument?.createTextNode(value) || new Text(value);
      this.appendChild(textNode);
    }
  }
}

// ============================================================================
// Element Implementation
// ============================================================================

export class Element extends Node {
  #tagName: string;

  constructor(internal: InternalNode, parent: Node | null = null, ownerDocument: Document | null = null) {
    super(internal, parent, ownerDocument);
    this.#tagName = internal.node_name;
  }

  get tagName(): string {
    return this.#tagName.toUpperCase();
  }

  get id(): string {
    const attr = this.getAttribute("id");
    return attr || "";
  }

  set id(value: string) {
    this.setAttribute("id", value);
  }

  get className(): string {
    const attr = this.getAttribute("class");
    return attr || "";
  }

  set className(value: string) {
    this.setAttribute("class", value);
  }

  get classList(): DOMTokenList {
    return new DOMTokenList(this);
  }

  get attributes(): NamedNodeMap {
    const attrs = this.#internal.attributes.map(([name, value]) => {
      return new Attr(name, value, this);
    });
    return new NamedNodeMap(attrs);
  }

  getAttribute(name: string): string | null {
    for (const [attrName, value] of this.#internal.attributes) {
      if (attrName === name) {
        return value;
      }
    }
    return null;
  }

  setAttribute(name: string, value: string): void {
    // Check if attribute exists
    for (let i = 0; i < this.#internal.attributes.length; i++) {
      if (this.#internal.attributes[i][0] === name) {
        this.#internal.attributes[i][1] = value;
        return;
      }
    }
    
    // Add new attribute
    this.#internal.attributes.push([name, value]);
  }

  removeAttribute(name: string): void {
    this.#internal.attributes = this.#internal.attributes.filter(([attrName]) => {
      return attrName !== name;
    });
  }

  hasAttribute(name: string): boolean {
    return this.#internal.attributes.some(([attrName]) => attrName === name);
  }

  hasAttributes(): boolean {
    return this.#internal.attributes.length > 0;
  }

  getAttributeNS(namespaceURI: string | null, localName: string): string | null {
    // Simplified - just look for the local name
    return this.getAttribute(localName);
  }

  setAttributeNS(namespaceURI: string | null, qualifiedName: string, value: string): void {
    this.setAttribute(qualifiedName, value);
  }

  removeAttributeNS(namespaceURI: string | null, localName: string): void {
    this.removeAttribute(localName);
  }

  hasAttributeNS(namespaceURI: string | null, localName: string): boolean {
    return this.hasAttribute(localName);
  }

  getElementsByClassName(className: string): HTMLCollection {
    const elements: Element[] = [];
    this.traverse((node) => {
      if (node.nodeType === ELEMENT_NODE) {
        const element = node as Element;
        if (element.className.split(/\s+/).includes(className)) {
          elements.push(element);
        }
      }
    });
    return new HTMLCollection(elements);
  }

  getElementsByTagName(tagName: string): HTMLCollection {
    const elements: Element[] = [];
    this.traverse((node) => {
      if (node.nodeType === ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === tagName.toUpperCase()) {
          elements.push(element);
        }
      }
    });
    return new HTMLCollection(elements);
  }

  getElementsByTagNameNS(namespaceURI: string | null, localName: string): HTMLCollection {
    return this.getElementsByTagName(localName);
  }

  querySelector(selectors: string): Element | null {
    // Simple selector implementation
    if (selectors.startsWith('#')) {
      // ID selector
      const id = selectors.slice(1);
      const doc = this.ownerDocument;
      if (doc) {
        const element = doc.getElementById(id);
        if (element && this.contains(element)) {
          return element as Element;
        }
      }
      return null;
    } else if (selectors.startsWith('.')) {
      // Class selector
      const className = selectors.slice(1);
      const elements = this.getElementsByClassName(className);
      return elements.item(0) as Element | null;
    } else {
      // Tag selector
      const elements = this.getElementsByTagName(selectors);
      return elements.item(0) as Element | null;
    }
  }

  querySelectorAll(selectors: string): NodeList {
    if (selectors.startsWith('#')) {
      // ID selector - return single element or empty
      const element = this.querySelector(selectors);
      return new NodeList(element ? [element] : []);
    } else if (selectors.startsWith('.')) {
      // Class selector
      const className = selectors.slice(1);
      const elements = this.getElementsByClassName(className);
      const nodes: Node[] = [];
      for (let i = 0; i < elements.length; i++) {
        const el = elements.item(i);
        if (el) nodes.push(el);
      }
      return new NodeList(nodes);
    } else {
      // Tag selector
      const elements = this.getElementsByTagName(selectors);
      const nodes: Node[] = [];
      for (let i = 0; i < elements.length; i++) {
        const el = elements.item(i);
        if (el) nodes.push(el);
      }
      return new NodeList(nodes);
    }
  }

  matches(selectors: string): boolean {
    const result = this.querySelector(selectors);
    return result !== null && this.isSameNode(result);
  }

  closest(selectors: string): Element | null {
    let current: Element | null = this;
    while (current) {
      if (current.matches(selectors)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  // Helper to traverse the tree
  private traverse(callback: (node: Node) => void): void {
    callback(this);
    for (const child of this.childNodes) {
      if (child.nodeType === ELEMENT_NODE) {
        (child as Element).traverse(callback);
      } else {
        callback(child);
      }
    }
  }

  // HTMLElement-specific properties
  get innerHTML(): string {
    let result = "";
    for (const child of this.childNodes) {
      if (child.nodeType === ELEMENT_NODE) {
        result += (child as Element).outerHTML;
      } else if (child.nodeType === TEXT_NODE || child.nodeType === COMMENT_NODE) {
        result += child.nodeValue || "";
      }
    }
    return result;
  }

  set innerHTML(value: string) {
    // Remove all children
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
    
    // Parse the HTML and append children
    if (value.trim()) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(value, "text/html");
      if (doc.documentElement) {
        // Move all children from the parsed document to this element
        for (const child of doc.documentElement.children) {
          this.appendChild(child);
        }
      }
    }
  }

  get outerHTML(): string {
    let result = `<${this.tagName}`;
    for (const [name, value] of this.#internal.attributes) {
      result += ` ${name}="${value}"`;
    }
    result += ">";
    result += this.innerHTML;
    result += `</${this.tagName}>`;
    return result;
  }

  set outerHTML(value: string) {
    // This is a simplified implementation
    // In a real DOM, this would replace the element in its parent
    this.innerHTML = value;
  }

  get innerText(): string {
    return this.textContent || "";
  }

  set innerText(value: string) {
    this.textContent = value;
  }
}

// ============================================================================
// HTMLElement Implementation
// ============================================================================

export class HTMLElement extends Element {
  constructor(internal: InternalNode, parent: Node | null = null, ownerDocument: Document | null = null) {
    super(internal, parent, ownerDocument);
  }
}

// ============================================================================
// Text Implementation
// ============================================================================

export class Text extends Node {
  constructor(data: string) {
    const internal: InternalNode = {
      node_type: TEXT_NODE,
      node_name: "#text",
      node_value: data,
      attributes: [],
      children: [],
    };
    super(internal);
  }

  get wholeText(): string {
    return this.nodeValue || "";
  }

  splitText(offset: number): Text {
    const value = this.nodeValue || "";
    const before = value.slice(0, offset);
    const after = value.slice(offset);
    
    this.nodeValue = before;
    
    const newText = new Text(after);
    if (this.parentNode) {
      this.parentNode.insertBefore(newText, this.nextSibling);
    }
    
    return newText;
  }
}

// ============================================================================
// Comment Implementation
// ============================================================================

export class Comment extends Node {
  constructor(data: string) {
    const internal: InternalNode = {
      node_type: COMMENT_NODE,
      node_name: "#comment",
      node_value: data,
      attributes: [],
      children: [],
    };
    super(internal);
  }
}

// ============================================================================
// DocumentType Implementation
// ============================================================================

export class DocumentType extends Node {
  constructor() {
    const internal: InternalNode = {
      node_type: DOCUMENT_TYPE_NODE,
      node_name: "#doctype",
      node_value: null,
      attributes: [],
      children: [],
    };
    super(internal);
  }

  get name(): string {
    return this.nodeName;
  }

  get publicId(): string {
    return "";
  }

  get systemId(): string {
    return "";
  }
}

// ============================================================================
// DocumentFragment Implementation
// ============================================================================

export class DocumentFragment extends Node {
  constructor() {
    const internal: InternalNode = {
      node_type: DOCUMENT_FRAGMENT_NODE,
      node_name: "#document-fragment",
      node_value: null,
      attributes: [],
      children: [],
    };
    super(internal);
  }

  querySelector(selectors: string): Element | null {
    return super.querySelector(selectors) as Element | null;
  }

  querySelectorAll(selectors: string): NodeList {
    return super.querySelectorAll(selectors);
  }
}

// ============================================================================
// Document Implementation
// ============================================================================

export class Document extends Node {
  #parser: WasmDOMParser;

  constructor(internal: InternalNode) {
    super(internal, null, null);
    this.#parser = new instance.JsDOMParser();
    (this as any).#ownerDocument = this;
  }

  get doctype(): DocumentType | null {
    for (const child of this.childNodes) {
      if (child.nodeType === DOCUMENT_TYPE_NODE) {
        return child as DocumentType;
      }
    }
    return null;
  }

  get documentElement(): Element | null {
    for (const child of this.childNodes) {
      if (child.nodeType === ELEMENT_NODE) {
        return child as Element;
      }
    }
    return null;
  }

  get body(): HTMLElement | null {
    const html = this.documentElement;
    if (html) {
      for (const child of html.children) {
        if (child.tagName === "BODY") {
          return child as HTMLElement;
        }
      }
    }
    return null;
  }

  get head(): HTMLElement | null {
    const html = this.documentElement;
    if (html) {
      for (const child of html.children) {
        if (child.tagName === "HEAD") {
          return child as HTMLElement;
        }
      }
    }
    return null;
  }

  get title(): string {
    const head = this.head;
    if (head) {
      for (const child of head.children) {
        if (child.tagName === "TITLE") {
          return child.textContent || "";
        }
      }
    }
    return "";
  }

  set title(value: string) {
    let titleEl = this.head?.querySelector("title");
    if (!titleEl) {
      titleEl = this.createElement("title");
      if (this.head) {
        this.head.appendChild(titleEl);
      }
    }
    titleEl.textContent = value;
  }

  get URL(): string {
    // Not implemented - would need access to location
    return "";
  }

  get referrer(): string {
    // Not implemented
    return "";
  }

  get lastModified(): string {
    // Not implemented
    return new Date().toISOString();
  }

  get characterSet(): string {
    // Not implemented
    return "UTF-8";
  }

  get contentType(): string {
    // Not implemented
    return "text/html";
  }

  createElement(tagName: string): HTMLElement {
    const internal: InternalNode = {
      node_type: ELEMENT_NODE,
      node_name: tagName.toLowerCase(),
      node_value: null,
      attributes: [],
      children: [],
    };
    return new HTMLElement(internal, this, this);
  }

  createElementNS(namespaceURI: string | null, qualifiedName: string): Element {
    return this.createElement(qualifiedName);
  }

  createTextNode(data: string): Text {
    return new Text(data);
  }

  createComment(data: string): Comment {
    return new Comment(data);
  }

  createDocumentFragment(): DocumentFragment {
    return new DocumentFragment();
  }

  getElementById(id: string): Element | null {
    // Search the entire document
    const search = (node: Node): Element | null => {
      if (node.nodeType === ELEMENT_NODE) {
        const element = node as Element;
        if (element.id === id) {
          return element;
        }
      }
      
      for (const child of node.childNodes) {
        const result = search(child);
        if (result) return result;
      }
      
      return null;
    };
    
    return search(this);
  }

  getElementsByClassName(className: string): HTMLCollection {
    const elements: Element[] = [];
    const search = (node: Node) => {
      if (node.nodeType === ELEMENT_NODE) {
        const element = node as Element;
        if (element.className.split(/\s+/).includes(className)) {
          elements.push(element);
        }
      }
      
      for (const child of node.childNodes) {
        search(child);
      }
    };
    
    search(this);
    return new HTMLCollection(elements);
  }

  getElementsByTagName(tagName: string): HTMLCollection {
    const elements: Element[] = [];
    const search = (node: Node) => {
      if (node.nodeType === ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === tagName.toUpperCase()) {
          elements.push(element);
        }
      }
      
      for (const child of node.childNodes) {
        search(child);
      }
    };
    
    search(this);
    return new HTMLCollection(elements);
  }

  getElementsByName(name: string): NodeList {
    const nodes: Node[] = [];
    const search = (node: Node) => {
      if (node.nodeType === ELEMENT_NODE) {
        const element = node as Element;
        if (element.getAttribute("name") === name) {
          nodes.push(element);
        }
      }
      
      for (const child of node.childNodes) {
        search(child);
      }
    };
    
    search(this);
    return new NodeList(nodes);
  }

  querySelector(selectors: string): Element | null {
    // Simple selector implementation
    if (selectors.startsWith('#')) {
      // ID selector
      const id = selectors.slice(1);
      return this.getElementById(id);
    } else if (selectors.startsWith('.')) {
      // Class selector
      const className = selectors.slice(1);
      const elements = this.getElementsByClassName(className);
      return elements.item(0) as Element | null;
    } else {
      // Tag selector
      const elements = this.getElementsByTagName(selectors);
      return elements.item(0) as Element | null;
    }
  }

  querySelectorAll(selectors: string): NodeList {
    if (selectors.startsWith('#')) {
      // ID selector - return single element or empty
      const element = this.querySelector(selectors);
      return new NodeList(element ? [element] : []);
    } else if (selectors.startsWith('.')) {
      // Class selector
      const className = selectors.slice(1);
      const elements = this.getElementsByClassName(className);
      const nodes: Node[] = [];
      for (let i = 0; i < elements.length; i++) {
        const el = elements.item(i);
        if (el) nodes.push(el);
      }
      return new NodeList(nodes);
    } else {
      // Tag selector
      const elements = this.getElementsByTagName(selectors);
      const nodes: Node[] = [];
      for (let i = 0; i < elements.length; i++) {
        const el = elements.item(i);
        if (el) nodes.push(el);
      }
      return new NodeList(nodes);
    }
  }

  importNode(externalNode: Node, deep: boolean = false): Node {
    return externalNode.cloneNode(deep);
  }

  adoptNode(externalNode: Node): Node {
    return externalNode;
  }
}

// ============================================================================
// DOMTokenList Implementation
// ============================================================================

export class DOMTokenList {
  #element: Element;

  constructor(element: Element) {
    this.#element = element;
  }

  get length(): number {
    return this.#element.className.split(/\s+/).filter(Boolean).length;
  }

  item(index: number): string | null {
    const tokens = this.#element.className.split(/\s+/).filter(Boolean);
    if (index >= 0 && index < tokens.length) {
      return tokens[index];
    }
    return null;
  }

  contains(token: string): boolean {
    return this.#element.className.split(/\s+/).includes(token);
  }

  add(...tokens: string[]): void {
    const current = this.#element.className.split(/\s+/).filter(Boolean);
    const newTokens = [...new Set([...current, ...tokens])];
    this.#element.className = newTokens.join(" ");
  }

  remove(...tokens: string[]): void {
    const current = this.#element.className.split(/\s+/).filter(Boolean);
    const newTokens = current.filter((t) => !tokens.includes(t));
    this.#element.className = newTokens.join(" ");
  }

  replace(oldToken: string, newToken: string): boolean {
    if (this.contains(oldToken)) {
      this.remove(oldToken);
      this.add(newToken);
      return true;
    }
    return false;
  }

  toggle(token: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) {
        this.add(token);
        return true;
      } else {
        this.remove(token);
        return false;
      }
    }
    
    if (this.contains(token)) {
      this.remove(token);
      return false;
    } else {
      this.add(token);
      return true;
    }
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this.#element.className.split(/\s+/).filter(Boolean).values();
  }
}

// ============================================================================
// DOMParser Implementation
// ============================================================================

/**
 * DOMParser provides the ability to parse XML or HTML source code from a string into a DOM Document.
 *
 * @example parsing HTML
 * ```ts
 * import { DOMParser } from "@stdext/dom";
 * const parser = new DOMParser();
 * const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
 * console.log(doc.documentElement?.tagName); // "HTML"
 * ```
 *
 * @example parsing XML
 * ```ts
 * import { DOMParser } from "@stdext/dom";
 * const parser = new DOMParser();
 * const doc = parser.parseFromString("<root><item>test</item></root>", "text/xml");
 * console.log(doc.documentElement?.tagName); // "ROOT"
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
    const data: InternalDocument = result as InternalDocument;
    return new Document(data.root);
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  Node,
  Element,
  HTMLElement,
  Text,
  Comment,
  Document,
  DocumentType,
  DocumentFragment,
  Attr,
  NodeList,
  HTMLCollection,
  NamedNodeMap,
  DOMTokenList,
  ELEMENT_NODE,
  ATTRIBUTE_NODE,
  TEXT_NODE,
  CDATA_SECTION_NODE,
  ENTITY_REFERENCE_NODE,
  ENTITY_NODE,
  PROCESSING_INSTRUCTION_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_TYPE_NODE,
  DOCUMENT_FRAGMENT_NODE,
  NOTATION_NODE,
};
