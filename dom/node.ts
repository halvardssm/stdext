/**
 * Node interface implementation
 * Based on WHATWG DOM spec: https://dom.spec.whatwg.org/#interface-node
 */

import type { Document } from "./document.ts";
import { DOMException } from "./dom_exception.ts";

// Node type constants
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

// NodeList class moved here to avoid circular dependency
export class NodeList<T extends Node> implements Iterable<T> {
  _nodes: T[] = [];
  private _parent: Node | null = null;

  constructor(parent: Node | null = null) {
    this._parent = parent;
  }

  get length(): number {
    return this._nodes.length;
  }

  item(index: number): T | null {
    if (index >= 0 && index < this._nodes.length) {
      return this._nodes[index];
    }
    return null;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this._nodes.values();
  }

  forEach(callback: (value: T, index: number, list: NodeList<T>) => void): void {
    this._nodes.forEach((node, index) => callback(node, index, this));
  }

  // Internal method to add a node
  _add(node: T): void {
    this._nodes.push(node);
  }

  // Internal method to remove a node
  _remove(node: T): void {
    const index = this._nodes.indexOf(node);
    if (index !== -1) {
      this._nodes.splice(index, 1);
    }
  }

  // Internal method to replace a node
  _replace(oldNode: T, newNode: T): void {
    const index = this._nodes.indexOf(oldNode);
    if (index !== -1) {
      this._nodes[index] = newNode;
    }
  }
}

export class Node {
  public nodeType: number;
  public nodeName: string;
  public parentNode: Node | null = null;
  public childNodes: NodeList<Node>;
  public firstChild: Node | null = null;
  public lastChild: Node | null = null;
  public previousSibling: Node | null = null;
  public nextSibling: Node | null = null;
  public ownerDocument: Document | null = null;
  public nodeValue: string | null = null;
  public textContent: string | null = null;

  constructor(nodeType: number, nodeName: string) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.childNodes = new NodeList<Node>(this);
  }

  appendChild<T extends Node>(node: T): T {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
    node.parentNode = this;
    
    if (!this.firstChild) {
      this.firstChild = node;
      this.lastChild = node;
    } else {
      if (this.lastChild) {
        this.lastChild.nextSibling = node;
        node.previousSibling = this.lastChild;
      }
      this.lastChild = node;
    }
    
    this.childNodes._add(node);
    return node;
  }

  removeChild<T extends Node>(node: T): T {
    if (node.parentNode !== this) {
      throw new DOMException(
        "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
        "NotFoundError",
      );
    }

    if (node.previousSibling) {
      node.previousSibling.nextSibling = node.nextSibling;
    } else {
      this.firstChild = node.nextSibling;
    }

    if (node.nextSibling) {
      node.nextSibling.previousSibling = node.previousSibling;
    } else {
      this.lastChild = node.previousSibling;
    }

    node.parentNode = null;
    node.previousSibling = null;
    node.nextSibling = null;
    this.childNodes._remove(node);
    
    return node;
  }

  insertBefore<T extends Node>(node: T, child: Node | null): T {
    if (child && child.parentNode !== this) {
      throw new DOMException(
        "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
        "NotFoundError",
      );
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    node.parentNode = this;

    if (!child) {
      if (this.lastChild) {
        this.lastChild.nextSibling = node;
        node.previousSibling = this.lastChild;
      } else {
        this.firstChild = node;
      }
      this.lastChild = node;
    } else {
      if (child.previousSibling) {
        child.previousSibling.nextSibling = node;
        node.previousSibling = child.previousSibling;
      } else {
        this.firstChild = node;
      }
      node.nextSibling = child;
      child.previousSibling = node;
    }

    this.childNodes._add(node);
    return node;
  }

  replaceChild<T extends Node>(node: Node, child: T): T {
    if (child.parentNode !== this) {
      throw new DOMException(
        "Failed to execute 'replaceChild' on 'Node': The node to be replaced is not a child of this node.",
        "NotFoundError",
      );
    }

    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }

    node.parentNode = this;
    node.previousSibling = child.previousSibling;
    node.nextSibling = child.nextSibling;

    if (child.previousSibling) {
      child.previousSibling.nextSibling = node;
    } else {
      this.firstChild = node;
    }

    if (child.nextSibling) {
      child.nextSibling.previousSibling = node;
    } else {
      this.lastChild = node;
    }

    this.childNodes._replace(child, node);
    child.parentNode = null;
    child.previousSibling = null;
    child.nextSibling = null;

    return child;
  }

  hasChildNodes(): boolean {
    return this.firstChild !== null;
  }

  cloneNode(deep: boolean = false): Node {
    const clone = new Node(this.nodeType, this.nodeName);
    clone.nodeValue = this.nodeValue;
    clone.textContent = this.textContent;

    if (deep) {
      let child = this.firstChild;
      while (child) {
        clone.appendChild(child.cloneNode(true));
        child = child.nextSibling;
      }
    }

    return clone;
  }

  isEqualNode(otherNode: Node | null): boolean {
    if (!otherNode) return false;
    if (this.nodeType !== otherNode.nodeType) return false;
    if (this.nodeName !== otherNode.nodeName) return false;
    if (this.nodeValue !== otherNode.nodeValue) return false;
    
    if (this.childNodes.length !== otherNode.childNodes.length) return false;
    
    for (let i = 0; i < this.childNodes.length; i++) {
      if (!this.childNodes.item(i)!.isEqualNode(otherNode.childNodes.item(i))) {
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
    if (this === other) {
      return 0;
    }

    if (
      this.ownerDocument !== other.ownerDocument &&
      this.ownerDocument !== null &&
      other.ownerDocument !== null
    ) {
      return 0x20; // DOCUMENT_POSITION_DISCONNECTED
    }

    // Check if this is an ancestor of other
    let current: Node | null = other;
    while (current) {
      if (current === this) {
        return 0x04 | 0x08; // DOCUMENT_POSITION_CONTAINS | DOCUMENT_POSITION_IS_ANCESTOR
      }
      current = current.parentNode;
    }

    // Check if other is an ancestor of this
    current = this;
    while (current) {
      if (current === other) {
        return 0x10 | 0x02; // DOCUMENT_POSITION_IS_CONTAINED_BY | DOCUMENT_POSITION_IS_DESCENDANT
      }
      current = current.parentNode;
    }

    // Check if they are siblings
    if (this.parentNode === other.parentNode) {
      if (this.previousSibling === other) {
        return 0x02; // DOCUMENT_POSITION_IS_PRECEDING
      }
      if (this.nextSibling === other) {
        return 0x04; // DOCUMENT_POSITION_IS_FOLLOWING
      }
    }

    return 0;
  }

  contains(other: Node | null): boolean {
    if (!other) return false;
    
    let current: Node | null = other;
    while (current) {
      if (current === this) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  lookupPrefix(namespace: string | null): string | null {
    // Simplified implementation
    return null;
  }

  lookupNamespaceURI(prefix: string | null): string | null {
    // Simplified implementation
    return null;
  }

  normalize() {
    // Simplified implementation
    // Merge adjacent text nodes
    let child = this.firstChild;
    while (child) {
      const next = child.nextSibling;
      if (
        child.nodeType === TEXT_NODE &&
        next &&
        next.nodeType === TEXT_NODE
      ) {
        child.nodeValue = (child.nodeValue || "") + (next.nodeValue || "");
        this.removeChild(next);
      } else {
        child = next;
      }
    }
  }
}
