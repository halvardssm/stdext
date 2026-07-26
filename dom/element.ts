/**
 * Element interface implementation
 * Based on WHATWG DOM spec: https://dom.spec.whatwg.org/#interface-element
 */

import { Node, ELEMENT_NODE, NodeList, ATTRIBUTE_NODE } from "./node.ts";
import { DOMTokenList } from "./dom_token_list.ts";
import { NamedNodeMap } from "./named_node_map.ts";

export interface ScrollIntoViewOptions {
  behavior?: "auto" | "smooth";
  block?: "start" | "center" | "end" | "nearest";
  inline?: "start" | "center" | "end" | "nearest";
}

export class Element extends Node {
  public tagName: string;
  public attributes: NamedNodeMap;
  public classList: DOMTokenList;
  public id: string = "";
  private _className: string = "";
  public style: CSSStyleDeclaration;

  constructor(tagName: string) {
    super(ELEMENT_NODE, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
    this.attributes = new NamedNodeMap(this);
    this.classList = new DOMTokenList(this, "class");
    this.style = new CSSStyleDeclaration();
  }

  get className(): string {
    return this._className;
  }

  set className(value: string) {
    this._className = value;
    // Update classList without triggering setAttribute
    this.classList._updateFromString(value);
  }

  get clientWidth(): number {
    return 0; // Not implemented for server-side
  }

  get clientHeight(): number {
    return 0; // Not implemented for server-side
  }

  get clientLeft(): number {
    return 0; // Not implemented for server-side
  }

  get clientTop(): number {
    return 0; // Not implemented for server-side
  }

  get offsetWidth(): number {
    return 0; // Not implemented for server-side
  }

  get offsetHeight(): number {
    return 0; // Not implemented for server-side
  }

  get offsetLeft(): number {
    return 0; // Not implemented for server-side
  }

  get offsetTop(): number {
    return 0; // Not implemented for server-side
  }

  get offsetParent(): Element | null {
    return null; // Not implemented for server-side
  }

  get scrollWidth(): number {
    return 0; // Not implemented for server-side
  }

  get scrollHeight(): number {
    return 0; // Not implemented for server-side
  }

  get scrollLeft(): number {
    return 0; // Not implemented for server-side
  }

  set scrollLeft(value: number) {
    // Not implemented for server-side
  }

  get scrollTop(): number {
    return 0; // Not implemented for server-side
  }

  set scrollTop(value: number) {
    // Not implemented for server-side
  }

  getElementById(id: string): Element | null {
    if (this.id === id) {
      return this;
    }

    for (const child of this.childNodes) {
      if (child.nodeType === ELEMENT_NODE) {
        const element = child as Element;
        if (element.id === id) {
          return element;
        }
        const result = element.getElementById(id);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  getElementsByTagName(tagName: string): HTMLCollection<Element> {
    const result = new HTMLCollection<Element>();
    this._getElementsByTagName(tagName.toUpperCase(), result);
    return result;
  }

  private _getElementsByTagName(tagName: string, collection: HTMLCollection<Element>): void {
    if (this.tagName === tagName) {
      collection._add(this);
    }

    for (const child of this.childNodes) {
      if (child.nodeType === ELEMENT_NODE) {
        (child as Element)._getElementsByTagName(tagName, collection);
      }
    }
  }

  getElementsByClassName(classNames: string): HTMLCollection<Element> {
    const result = new HTMLCollection<Element>();
    const classes = classNames.split(/\s+/).filter(c => c);
    this._getElementsByClassName(classes, result);
    return result;
  }

  private _getElementsByClassName(classes: string[], collection: HTMLCollection<Element>): void {
    const classList = this.classList;
    const hasAllClasses = classes.every(c => classList.contains(c));
    
    if (hasAllClasses) {
      collection._add(this);
    }

    for (const child of this.childNodes) {
      if (child.nodeType === ELEMENT_NODE) {
        (child as Element)._getElementsByClassName(classes, collection);
      }
    }
  }

  getElementsByTagNameNS(namespace: string | null, localName: string): HTMLCollection<Element> {
    // Simplified implementation - ignore namespace for now
    return this.getElementsByTagName(localName);
  }

  getAttribute(name: string): string | null {
    const attr = this.attributes.getNamedItem(name);
    return attr ? attr.value : null;
  }

  setAttribute(name: string, value: string): void {
    const attr = this.ownerDocument?.createAttribute(name);
    if (attr) {
      attr.value = value;
      this.attributes.setNamedItem(attr);
    }
    
    // Update special properties
    if (name === "id") {
      this.id = value;
    } else if (name === "class") {
      this._className = value;
      // Update classList without triggering setAttribute
      this.classList._updateFromString(value);
    }
  }

  removeAttribute(name: string): void {
    const attr = this.attributes.getNamedItem(name);
    if (attr) {
      this.attributes.removeNamedItem(name);
    }
    
    // Update special properties
    if (name === "id") {
      this.id = "";
    } else if (name === "class") {
      this._className = "";
      // Update classList without triggering setAttribute
      this.classList._updateFromString("");
    }
  }

  toggleAttribute(name: string, force?: boolean): boolean {
    const hasAttr = this.hasAttribute(name);
    
    if (force !== undefined) {
      if (force) {
        this.setAttribute(name, "");
      } else {
        this.removeAttribute(name);
      }
      return force;
    } else {
      if (hasAttr) {
        this.removeAttribute(name);
        return false;
      } else {
        this.setAttribute(name, "");
        return true;
      }
    }
  }

  hasAttribute(name: string): boolean {
    return this.attributes.getNamedItem(name) !== null;
  }

  hasAttributes(): boolean {
    return this.attributes.length > 0;
  }

  getAttributeNode(name: string): Attr | null {
    return this.attributes.getNamedItem(name);
  }

  setAttributeNode(attr: Attr): Attr | null {
    return this.attributes.setNamedItem(attr);
  }

  removeAttributeNode(attr: Attr): Attr {
    return this.attributes.removeNamedItem(attr.name);
  }

  getAttributeNS(namespace: string | null, localName: string): string | null {
    // Simplified implementation - ignore namespace for now
    return this.getAttribute(localName);
  }

  setAttributeNS(namespace: string | null, qualifiedName: string, value: string): void {
    // Simplified implementation - ignore namespace for now
    this.setAttribute(qualifiedName, value);
  }

  removeAttributeNS(namespace: string | null, localName: string): void {
    // Simplified implementation - ignore namespace for now
    this.removeAttribute(localName);
  }

  hasAttributeNS(namespace: string | null, localName: string): boolean {
    // Simplified implementation - ignore namespace for now
    return this.hasAttribute(localName);
  }

  getBoundingClientRect(): DOMRect {
    return new DOMRect(0, 0, 0, 0);
  }

  getClientRects(): DOMRectList {
    return new DOMRectList();
  }

  scrollIntoView(arg?: boolean | ScrollIntoViewOptions): void {
    // Not implemented for server-side
  }

  scrollTo(x: number, y: number): void {
    // Not implemented for server-side
  }

  scrollBy(x: number, y: number): void {
    // Not implemented for server-side
  }

  before(...nodes: (Node | string)[]): void {
    const parent = this.parentNode;
    if (parent) {
      const index = parent.childNodes._nodes.indexOf(this);
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = this._convertToNode(nodes[i]);
        if (node && node !== this) {
          parent.insertBefore(node, this);
        }
      }
    }
  }

  after(...nodes: (Node | string)[]): void {
    const parent = this.parentNode;
    if (parent) {
      for (const node of nodes) {
        const converted = this._convertToNode(node);
        if (converted && converted !== this) {
          parent.insertBefore(converted, this.nextSibling);
        }
      }
    }
  }

  replaceWith(...nodes: (Node | string)[]): void {
    const parent = this.parentNode;
    if (parent) {
      for (const node of nodes) {
        const converted = this._convertToNode(node);
        if (converted && converted !== this) {
          parent.insertBefore(converted, this);
        }
      }
      parent.removeChild(this);
    }
  }

  remove(): void {
    const parent = this.parentNode;
    if (parent) {
      parent.removeChild(this);
    }
  }

  prepend(...nodes: (Node | string)[]): void {
    for (const node of nodes) {
      const converted = this._convertToNode(node);
      if (converted && converted !== this) {
        this.insertBefore(converted, this.firstChild);
      }
    }
  }

  append(...nodes: (Node | string)[]): void {
    for (const node of nodes) {
      const converted = this._convertToNode(node);
      if (converted && converted !== this) {
        this.appendChild(converted);
      }
    }
  }

  private _convertToNode(node: Node | string): Node | null {
    if (typeof node === "string") {
      return this.ownerDocument?.createTextNode(node) ?? null;
    }
    return node;
  }

  override cloneNode(deep: boolean = false): Element {
    const clone = new Element(this.tagName);
    
    // Copy attributes
    for (let i = 0; i < this.attributes.length; i++) {
      const attr = this.attributes.item(i);
      if (attr) {
        clone.setAttribute(attr.name, attr.value);
      }
    }
    
    // Copy id and className
    clone.id = this.id;
    clone._className = this._className;
    
    if (deep) {
      for (const child of this.childNodes) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    
    return clone;
  }
}

// Supporting classes

export class Attr extends Node {
  public name: string;
  public value: string = "";
  public ownerElement: Element | null = null;
  public specified: boolean = true;

  constructor(name: string) {
    super(ATTRIBUTE_NODE, name);
    this.name = name;
  }
}

export class CSSStyleDeclaration {
  private _styles: Map<string, string> = new Map();

  get cssText(): string {
    return Array.from(this._styles.entries())
      .map(([prop, value]) => `${prop}: ${value}`)
      .join("; ");
  }

  set cssText(value: string) {
    this._styles.clear();
    const declarations = value.split(";");
    for (const decl of declarations) {
      const [prop, val] = decl.split(":").map(s => s.trim());
      if (prop && val) {
        this._styles.set(prop, val);
      }
    }
  }

  get length(): number {
    return this._styles.size;
  }

  getPropertyValue(property: string): string {
    return this._styles.get(property) || "";
  }

  getPropertyPriority(property: string): string {
    return "";
  }

  setProperty(property: string, value: string, priority?: string): void {
    this._styles.set(property, value);
  }

  removeProperty(property: string): string {
    const oldValue = this._styles.get(property) || "";
    this._styles.delete(property);
    return oldValue;
  }

  item(index: number): string {
    const keys = Array.from(this._styles.keys());
    return keys[index] || "";
  }
}

export class DOMRect {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public width: number = 0,
    public height: number = 0,
  ) {}

  get left(): number {
    return this.x;
  }

  get top(): number {
    return this.y;
  }

  get right(): number {
    return this.x + this.width;
  }

  get bottom(): number {
    return this.y + this.height;
  }
}

export class DOMRectList implements Iterable<DOMRect> {
  private _rects: DOMRect[] = [];

  get length(): number {
    return this._rects.length;
  }

  item(index: number): DOMRect | null {
    return this._rects[index] || null;
  }

  [Symbol.iterator](): IterableIterator<DOMRect> {
    return this._rects.values();
  }
}

export class HTMLCollection<T extends Element> implements Iterable<T> {
  private _elements: T[] = [];

  get length(): number {
    return this._elements.length;
  }

  item(index: number): T | null {
    return this._elements[index] || null;
  }

  namedItem(name: string): T | null {
    for (const element of this._elements) {
      if (element.id === name) {
        return element;
      }
    }
    return null;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this._elements.values();
  }

  _add(element: T): void {
    this._elements.push(element);
  }
}
