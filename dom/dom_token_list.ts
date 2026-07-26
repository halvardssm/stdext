/**
 * DOMTokenList implementation
 * Based on WHATWG DOM spec: https://dom.spec.whatwg.org/#interface-domtokenlist
 */

import type { Element } from "./element.ts";

export class DOMTokenList implements Iterable<string> {
  private _tokens: Set<string> = new Set();
  private _element: Element;
  private _attributeName: string;

  constructor(element: Element, attributeName: string) {
    this._element = element;
    this._attributeName = attributeName;
    
    // Initialize from element's attribute
    const attrValue = element.getAttribute(attributeName);
    if (attrValue) {
      this._updateFromString(attrValue);
    }
  }

  get length(): number {
    return this._tokens.size;
  }

  get value(): string {
    return Array.from(this._tokens).join(" ");
  }

  set value(tokens: string) {
    this._updateFromString(tokens);
    this._element.setAttribute(this._attributeName, tokens);
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this._tokens.values();
  }

  item(index: number): string | null {
    const tokens = Array.from(this._tokens);
    return tokens[index] || null;
  }

  contains(token: string): boolean {
    return this._tokens.has(token);
  }

  add(...tokens: string[]): void {
    for (const token of tokens) {
      this._tokens.add(token);
    }
    this._syncToElement();
  }

  remove(...tokens: string[]): void {
    for (const token of tokens) {
      this._tokens.delete(token);
    }
    this._syncToElement();
  }

  replace(oldToken: string, newToken: string): boolean {
    if (this._tokens.has(oldToken)) {
      this._tokens.delete(oldToken);
      this._tokens.add(newToken);
      this._syncToElement();
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
    } else {
      if (this._tokens.has(token)) {
        this.remove(token);
        return false;
      } else {
        this.add(token);
        return true;
      }
    }
  }

  forEach(callback: (value: string, index: number, list: DOMTokenList) => void): void {
    Array.from(this._tokens).forEach((token, index) => callback(token, index, this));
  }

  _updateFromString(tokens: string): void {
    this._tokens.clear();
    const trimmed = tokens.trim();
    if (trimmed) {
      for (const token of trimmed.split(/\s+/)) {
        if (token) {
          this._tokens.add(token);
        }
      }
    }
  }

  private _syncToElement(): void {
    this._element.setAttribute(this._attributeName, this.value);
  }
}
