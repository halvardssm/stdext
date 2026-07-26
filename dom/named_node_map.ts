/**
 * NamedNodeMap implementation
 * Based on WHATWG DOM spec: https://dom.spec.whatwg.org/#interface-namednodemap
 */

import { Attr } from "./element.ts";
import { DOMException } from "./dom_exception.ts";
import type { Element } from "./element.ts";

export class NamedNodeMap implements Iterable<Attr> {
  private _attrs: Attr[] = [];
  private _element: Element;

  constructor(element: Element) {
    this._element = element;
  }

  get length(): number {
    return this._attrs.length;
  }

  getNamedItem(name: string): Attr | null {
    for (const attr of this._attrs) {
      if (attr.name === name) {
        return attr;
      }
    }
    return null;
  }

  setNamedItem(attr: Attr): Attr | null {
    const existing = this.getNamedItem(attr.name);
    if (existing) {
      this._attrs[this._attrs.indexOf(existing)] = attr;
      attr.ownerElement = this._element;
      return existing;
    }
    
    this._attrs.push(attr);
    attr.ownerElement = this._element;
    return null;
  }

  removeNamedItem(name: string): Attr {
    const attr = this.getNamedItem(name);
    if (!attr) {
      throw new DOMException(
        `Failed to execute 'removeNamedItem' on 'NamedNodeMap': No attribute with the name '${name}' exists on the specified element.`,
        "NotFoundError",
      );
    }
    
    const index = this._attrs.indexOf(attr);
    this._attrs.splice(index, 1);
    attr.ownerElement = null;
    return attr;
  }

  getNamedItemNS(namespace: string | null, localName: string): Attr | null {
    // Simplified implementation - ignore namespace for now
    return this.getNamedItem(localName);
  }

  setNamedItemNS(attr: Attr): Attr | null {
    // Simplified implementation - ignore namespace for now
    return this.setNamedItem(attr);
  }

  removeNamedItemNS(namespace: string | null, localName: string): Attr {
    // Simplified implementation - ignore namespace for now
    return this.removeNamedItem(localName);
  }

  item(index: number): Attr | null {
    return this._attrs[index] || null;
  }

  [Symbol.iterator](): IterableIterator<Attr> {
    return this._attrs.values();
  }
}
