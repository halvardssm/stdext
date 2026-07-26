/**
 * Document interface implementation
 * Based on WHATWG DOM spec: https://dom.spec.whatwg.org/#interface-document
 */

import { Node, DOCUMENT_NODE, NodeList } from "./node.ts";
import { Element, Attr, HTMLCollection } from "./element.ts";
import { DOMException } from "./dom_exception.ts";

export type DocumentReadyState = "loading" | "interactive" | "complete";
export type VisibilityState = "visible" | "hidden" | "prerender" | "unloaded";

export interface NodeFilter {
  acceptNode(node: Node): number;
}

export class Document extends Node {
  public doctype: DocumentType | null = null;
  public documentElement: Element | null = null;
  public body: HTMLElement | null = null;
  public head: HTMLHeadElement | null = null;
  public characterSet: string = "UTF-8";
  public charset: string = "UTF-8";
  public contentType: string = "text/html";
  public defaultView: Window | null = null;
  public designMode: string = "off";
  public dir: string = "";
  public fullscreenEnabled: boolean = false;
  public hidden: boolean = false;
  public lastModified: string = new Date().toISOString();
  public readyState: DocumentReadyState = "loading";
  public referrer: string = "";
  public title: string = "";
  public URL: string = "";
  public visibilityState: VisibilityState = "visible";
  public compatMode: string = "CSS1Compat";

  constructor() {
    super(DOCUMENT_NODE, "#document");
    this.nodeName = "#document";
    this.ownerDocument = null; // Document has no owner document
  }

  get elements(): HTMLCollection<Element> {
    return new HTMLCollection<Element>();
  }

  get forms(): HTMLCollection<HTMLFormElement> {
    return new HTMLCollection<HTMLFormElement>();
  }

  get images(): HTMLCollection<HTMLImageElement> {
    return new HTMLCollection<HTMLImageElement>();
  }

  get links(): HTMLCollection<HTMLAnchorElement | HTMLAreaElement> {
    return new HTMLCollection<HTMLAnchorElement | HTMLAreaElement>();
  }

  get scripts(): HTMLCollection<HTMLScriptElement> {
    return new HTMLCollection<HTMLScriptElement>();
  }

  get styleSheets(): StyleSheetList {
    return new StyleSheetList();
  }

  get all(): HTMLAllCollection {
    return new HTMLAllCollection();
  }

  get anchors(): HTMLCollection<HTMLAnchorElement> {
    return new HTMLCollection<HTMLAnchorElement>();
  }

  get applets(): HTMLCollection<HTMLElement> {
    return new HTMLCollection<HTMLElement>();
  }

  get embeds(): HTMLCollection<HTMLEmbedElement> {
    return new HTMLCollection<HTMLEmbedElement>();
  }

  get plugins(): HTMLCollection<HTMLElement> {
    return new HTMLCollection<HTMLElement>();
  }

  get cookies(): string {
    return "";
  }

  set cookies(value: string) {
    // Not implemented for server-side
  }

  get currentScript(): HTMLScriptElement | null {
    return null;
  }

  get domain(): string {
    return "";
  }

  set domain(value: string) {
    // Not implemented for server-side
  }

  get lastStyleSheetSet(): string | null {
    return null;
  }

  get preferredStylesheetSet(): string | null {
    return null;
  }

  get selectedStylesheetSet(): string | null {
    return null;
  }

  get timeline(): PerformanceTimeline | null {
    return null;
  }

  get fullscreenElement(): Element | null {
    return null;
  }

  get pointerLockElement(): Element | null {
    return null;
  }

  get activeElement(): Element | null {
    return null;
  }

  get adoptionAgent(): AdoptionAgent | null {
    return null;
  }

  get fontsets(): FontFaceSet {
    return new FontFaceSet();
  }

  get picturesInPictureEnabled(): boolean {
    return false;
  }

  get undoManager(): UndoManager | null {
    return null;
  }

  createElement(tagName: string): Element {
    const element = new Element(tagName);
    element.ownerDocument = this;
    return element;
  }

  createElementNS(namespace: string | null, qualifiedName: string): Element {
    // Simplified implementation - ignore namespace for now
    return this.createElement(qualifiedName);
  }

  createDocumentFragment(): DocumentFragment {
    const fragment = new DocumentFragment();
    fragment.ownerDocument = this;
    return fragment;
  }

  createTextNode(data: string): Text {
    const text = new Text(data);
    text.ownerDocument = this;
    return text;
  }

  createCDATASection(data: string): CDATASection {
    const cdata = new CDATASection(data);
    cdata.ownerDocument = this;
    return cdata;
  }

  createComment(data: string): Comment {
    const comment = new Comment(data);
    comment.ownerDocument = this;
    return comment;
  }

  createProcessingInstruction(target: string, data: string): ProcessingInstruction {
    const pi = new ProcessingInstruction(target, data);
    pi.ownerDocument = this;
    return pi;
  }

  createAttribute(name: string): Attr {
    const attr = new Attr(name);
    attr.ownerDocument = this;
    return attr;
  }

  createAttributeNS(namespace: string | null, qualifiedName: string): Attr {
    // Simplified implementation - ignore namespace for now
    return this.createAttribute(qualifiedName);
  }

  createEntityReference(name: string): EntityReference {
    const ref = new EntityReference(name);
    ref.ownerDocument = this;
    return ref;
  }

  createEvent(eventInterface: string): Event {
    return new Event(eventInterface);
  }

  createRange(): Range {
    return new Range();
  }

  createNodeIterator(root: Node, whatToShow?: number, filter?: NodeFilter | null): NodeIterator {
    return new NodeIterator(root, whatToShow, filter);
  }

  createTreeWalker(root: Node, whatToShow?: number, filter?: NodeFilter | null): TreeWalker {
    return new TreeWalker(root, whatToShow, filter);
  }

  getElementById<T extends Element>(id: string): T | null {
    if (this.documentElement) {
      return this.documentElement.getElementById(id) as T | null;
    }
    return null;
  }

  getElementsByTagName(tagName: string): HTMLCollection<Element> {
    if (this.documentElement) {
      return this.documentElement.getElementsByTagName(tagName);
    }
    return new HTMLCollection<Element>();
  }

  getElementsByClassName(classNames: string): HTMLCollection<Element> {
    if (this.documentElement) {
      return this.documentElement.getElementsByClassName(classNames);
    }
    return new HTMLCollection<Element>();
  }

  getElementsByName(name: string): NodeList<HTMLElement> {
    return new NodeList<HTMLElement>();
  }

  querySelector(selectors: string): Element | null {
    // Simplified implementation - not fully implemented
    return null;
  }

  querySelectorAll(selectors: string): NodeList<Element> {
    // Simplified implementation - not fully implemented
    return new NodeList<Element>();
  }

  adoptNode<T extends Node>(node: T): T {
    if (node.ownerDocument) {
      node.ownerDocument.removeChild(node);
    }
    node.ownerDocument = this;
    return node;
  }

  importNode<T extends Node>(node: T, deep: boolean = false): T {
    if (node.ownerDocument === this) {
      return node.cloneNode(deep) as T;
    }
    
    const imported = node.cloneNode(false) as T;
    if (deep) {
      for (const child of node.childNodes) {
        imported.appendChild(this.importNode(child, true));
      }
    }
    return imported;
  }

  createEventObject(): Event | null {
    return null;
  }

  execCommand(commandId: string, showUI?: boolean, value?: string): boolean {
    return false;
  }

  queryCommandEnabled(commandId: string): boolean {
    return false;
  }

  queryCommandIndeterm(commandId: string): boolean {
    return false;
  }

  queryCommandState(commandId: string): boolean {
    return false;
  }

  queryCommandSupported(commandId: string): boolean {
    return false;
  }

  queryCommandValue(commandId: string): string {
    return "";
  }

  hasFocus(): boolean {
    return false;
  }

  hasStorageAccess(): Promise<boolean> {
    return Promise.resolve(false);
  }

  requestStorageAccess(): Promise<void> {
    return Promise.resolve();
  }

  requestStorageAccessFor(): Promise<void> {
    return Promise.resolve();
  }

  enableStyleSheetsForSet(name: string): void {
    // Not implemented
  }

  exitFullscreen(): Promise<void> {
    return Promise.resolve();
  }

  exitPictureInPicture(): Promise<void> {
    return Promise.resolve();
  }

  exitPointerLock(): void {
    // Not implemented
  }

  getAnimations(): Animation[] {
    return [];
  }
}

// Supporting types and classes

export class DocumentType extends Node {
  public name: string;
  public publicId: string = "";
  public systemId: string = "";

  constructor(name: string) {
    super(10, name); // DOCUMENT_TYPE_NODE
    this.name = name;
  }
}

export class DocumentFragment extends Node {
  constructor() {
    super(11, "#document-fragment"); // DOCUMENT_FRAGMENT_NODE
  }
}

export class Text extends Node {
  constructor(data: string = "") {
    super(3, "#text"); // TEXT_NODE
    this.nodeValue = data;
    this.textContent = data;
  }
}

export class CDATASection extends Text {
  constructor(data: string) {
    super(data);
    this.nodeName = "#cdata-section";
  }
}

export class Comment extends Node {
  constructor(data: string = "") {
    super(8, "#comment"); // COMMENT_NODE
    this.nodeValue = data;
    this.textContent = data;
  }
}

export class ProcessingInstruction extends Node {
  public target: string;
  public data: string;

  constructor(target: string, data: string) {
    super(7, target); // PROCESSING_INSTRUCTION_NODE
    this.target = target;
    this.data = data;
    this.nodeValue = data;
    this.textContent = data;
  }
}

export class EntityReference extends Node {
  constructor(name: string) {
    super(5, name); // ENTITY_REFERENCE_NODE
  }
}

export class Event {
  constructor(type: string) {
    // Simplified implementation
  }
}

export class Range {
  // Simplified implementation
}

export class NodeIterator {
  constructor(root: Node, whatToShow?: number, filter?: NodeFilter | null) {
    // Simplified implementation
  }
}

export class TreeWalker {
  constructor(root: Node, whatToShow?: number, filter?: NodeFilter | null) {
    // Simplified implementation
  }
}

export class StyleSheetList implements Iterable<CSSStyleSheet> {
  get length(): number {
    return 0;
  }

  item(index: number): CSSStyleSheet | null {
    return null;
  }

  [Symbol.iterator](): IterableIterator<CSSStyleSheet> {
    return [][Symbol.iterator]();
  }
}

export class HTMLAllCollection implements Iterable<Element> {
  get length(): number {
    return 0;
  }

  item(index: number): Element | null {
    return null;
  }

  namedItem(name: string): Element | null {
    return null;
  }

  [Symbol.iterator](): IterableIterator<Element> {
    return [][Symbol.iterator]();
  }
}

export class FontFaceSet {
  // Simplified implementation
}

export class PerformanceTimeline {
  // Simplified implementation
}

export class AdoptionAgent {
  // Simplified implementation
}

// HTML Element types (simplified)
export class HTMLElement extends Element {
  constructor(tagName: string) {
    super(tagName);
  }
}

export class HTMLHeadElement extends HTMLElement {
  constructor() {
    super("head");
  }
}

export class HTMLScriptElement extends HTMLElement {
  constructor() {
    super("script");
  }
}

export class HTMLAnchorElement extends HTMLElement {
  constructor() {
    super("a");
  }
}

export class HTMLAreaElement extends HTMLElement {
  constructor() {
    super("area");
  }
}

export class HTMLImageElement extends HTMLElement {
  constructor() {
    super("img");
  }
}

export class HTMLFormElement extends HTMLElement {
  constructor() {
    super("form");
  }
}

export class HTMLEmbedElement extends HTMLElement {
  constructor() {
    super("embed");
  }
}

export class CSSStyleSheet {
  // Simplified implementation
}

export class Animation {
  // Simplified implementation
}

export class UndoManager {
  // Simplified implementation
}

export interface Window {
  // Simplified interface
}
