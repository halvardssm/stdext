import { DOMParser, Node, Element, Document, Text, Comment } from "./domparser.ts";
import { assertEquals, assert, assertExists, assertFalse, assertStrictEquals } from "@std/assert";

Deno.test("DOMParser - basic HTML parsing", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.tagName, "HTML");
  assertEquals(doc.documentElement?.nodeType, Node.ELEMENT_NODE);
});

Deno.test("DOMParser - nested elements", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.tagName, "DIV");
  assertEquals(doc.documentElement?.children.length, 1);
  assertEquals(doc.documentElement?.children.item(0)?.tagName, "P");
});

Deno.test("DOMParser - text content", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<p>Hello World</p>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.childNodes.length, 1);
  assertEquals(doc.documentElement?.childNodes.item(0)?.nodeName, "#text");
  assertEquals(doc.documentElement?.childNodes.item(0)?.nodeValue, "Hello World");
});

Deno.test("DOMParser - attributes", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test" id="main"></div>', "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  assertEquals(element.attributes.length, 2);
  
  assertEquals(element.getAttribute("class"), "test");
  assertEquals(element.getAttribute("id"), "main");
});

Deno.test("DOMParser - XML parsing with text/xml", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<root><item>test</item></root>", "text/xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.tagName, "ROOT");
  assertEquals(doc.documentElement?.children.length, 1);
  assertEquals(doc.documentElement?.children.item(0)?.tagName, "ITEM");
});

Deno.test("DOMParser - XML parsing with application/xml", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<root><item>test</item></root>", "application/xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.tagName, "ROOT");
});

Deno.test("DOMParser - SVG parsing with image/svg+xml", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<svg><circle cx="50" cy="50" r="40"/></svg>', "image/svg+xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.tagName, "SVG");
  assertEquals(doc.documentElement?.children.length, 1);
  
  const circle = doc.documentElement?.children.item(0) as Element;
  assertExists(circle);
  assertEquals(circle.tagName, "CIRCLE");
  assertEquals(circle.attributes.length, 3);
});

// Node Interface Tests

Deno.test("Node - nodeType property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div>Test</div>", "text/html");
  
  assertEquals(doc.nodeType, Node.DOCUMENT_NODE);
  assertEquals(doc.documentElement?.nodeType, Node.ELEMENT_NODE);
  assertEquals(doc.documentElement?.childNodes.item(0)?.nodeType, Node.TEXT_NODE);
});

Deno.test("Node - nodeName property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div>Test</div>", "text/html");
  
  assertEquals(doc.nodeName, "#document");
  assertEquals(doc.documentElement?.nodeName, "div");
  assertEquals(doc.documentElement?.childNodes.item(0)?.nodeName, "#text");
});

Deno.test("Node - nodeValue property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div>Hello</div>", "text/html");
  
  assertEquals(doc.nodeValue, null);
  assertEquals(doc.documentElement?.nodeValue, null);
  assertEquals(doc.documentElement?.childNodes.item(0)?.nodeValue, "Hello");
});

Deno.test("Node - parentNode property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  const p = doc.documentElement?.children.item(0);
  assertExists(p);
  assertStrictEquals(p.parentNode, doc.documentElement);
});

Deno.test("Node - parentElement property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  const p = doc.documentElement?.children.item(0);
  assertExists(p);
  assertStrictEquals(p.parentElement, doc.documentElement);
});

Deno.test("Node - childNodes property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.childNodes.length, 1);
  assertEquals(doc.documentElement?.childNodes.item(0)?.nodeName, "p");
});

Deno.test("Node - firstChild property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.firstChild?.nodeName, "p");
});

Deno.test("Node - lastChild property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>First</p><p>Last</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.lastChild?.nodeName, "p");
});

Deno.test("Node - hasChildNodes method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assert(doc.documentElement?.hasChildNodes());
  
  const text = doc.createTextNode("test");
  assertFalse(text.hasChildNodes());
});

Deno.test("Node - appendChild method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div></div>", "text/html");
  
  assertExists(doc.documentElement);
  const p = doc.createElement("p");
  const text = doc.createTextNode("Hello");
  
  doc.documentElement.appendChild(p);
  assertEquals(doc.documentElement.children.length, 1);
  
  p.appendChild(text);
  assertEquals(p.childNodes.length, 1);
  assertEquals(p.childNodes.item(0)?.nodeValue, "Hello");
});

Deno.test("Node - removeChild method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  const p = doc.documentElement.firstChild;
  assertExists(p);
  
  const removed = doc.documentElement.removeChild(p);
  assertStrictEquals(removed, p);
  assertEquals(doc.documentElement.children.length, 0);
});

Deno.test("Node - cloneNode method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  const cloned = doc.documentElement.cloneNode(true);
  
  assertEquals(cloned.tagName, "DIV");
  assertEquals(cloned.children.length, 1);
  assertEquals(cloned.children.item(0)?.tagName, "P");
});

Deno.test("Node - textContent property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Hello</p><p>World</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement.textContent, "HelloWorld");
});

// Element Interface Tests

Deno.test("Element - getAttribute method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test" id="main"></div>', "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  assertEquals(element.getAttribute("class"), "test");
  assertEquals(element.getAttribute("id"), "main");
  assertEquals(element.getAttribute("nonexistent"), null);
});

Deno.test("Element - setAttribute method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div></div>", "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  
  element.setAttribute("class", "test");
  assertEquals(element.getAttribute("class"), "test");
  
  element.setAttribute("id", "main");
  assertEquals(element.getAttribute("id"), "main");
});

Deno.test("Element - removeAttribute method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test"></div>', "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  
  element.removeAttribute("class");
  assertEquals(element.getAttribute("class"), null);
});

Deno.test("Element - hasAttribute method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test"></div>', "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  
  assert(element.hasAttribute("class"));
  assertFalse(element.hasAttribute("id"));
});

Deno.test("Element - getElementsByClassName method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p class='test'>First</p><p class='test'>Second</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  const elements = doc.documentElement.getElementsByClassName("test");
  assertEquals(elements.length, 2);
});

Deno.test("Element - getElementsByTagName method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>First</p><p>Second</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  const elements = doc.documentElement.getElementsByTagName("p");
  assertEquals(elements.length, 2);
});

Deno.test("Element - querySelector method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p class='test'>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  
  const byTag = doc.documentElement.querySelector("p");
  assertExists(byTag);
  assertEquals(byTag.tagName, "P");
  
  const byClass = doc.documentElement.querySelector(".test");
  assertExists(byClass);
  assertEquals(byClass.tagName, "P");
});

Deno.test("Element - querySelectorAll method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>First</p><p>Second</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  const elements = doc.documentElement.querySelectorAll("p");
  assertEquals(elements.length, 2);
});

Deno.test("Element - innerHTML property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Hello</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  assertEquals(element.innerHTML, "<p>Hello</p>");
});

Deno.test("Element - textContent property", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Hello</p><p>World</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  assertEquals(element.textContent, "HelloWorld");
});

// Document Interface Tests

Deno.test("Document - createElement method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const div = doc.createElement("div");
  assertEquals(div.tagName, "DIV");
  assertEquals(div.nodeType, Node.ELEMENT_NODE);
});

Deno.test("Document - createTextNode method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const text = doc.createTextNode("Hello");
  assertEquals(text.nodeType, Node.TEXT_NODE);
  assertEquals(text.nodeValue, "Hello");
});

Deno.test("Document - createComment method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const comment = doc.createComment("test");
  assertEquals(comment.nodeType, Node.COMMENT_NODE);
  assertEquals(comment.nodeValue, "test");
});

Deno.test("Document - createDocumentFragment method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const fragment = doc.createDocumentFragment();
  assertEquals(fragment.nodeType, Node.DOCUMENT_FRAGMENT_NODE);
});

Deno.test("Document - getElementById method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p id='test'>Test</p></div>", "text/html");
  
  const element = doc.getElementById("test");
  assertExists(element);
  assertEquals(element.tagName, "P");
});

Deno.test("Document - getElementsByClassName method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p class='test'>First</p><p class='test'>Second</p></div>", "text/html");
  
  const elements = doc.getElementsByClassName("test");
  assertEquals(elements.length, 2);
});

Deno.test("Document - getElementsByTagName method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>First</p><p>Second</p></div>", "text/html");
  
  const elements = doc.getElementsByTagName("p");
  assertEquals(elements.length, 2);
});

Deno.test("Document - querySelector method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p id='test' class='item'>Test</p></div>", "text/html");
  
  const byId = doc.querySelector("#test");
  assertExists(byId);
  assertEquals(byId.tagName, "P");
  
  const byClass = doc.querySelector(".item");
  assertExists(byClass);
  assertEquals(byClass.tagName, "P");
  
  const byTag = doc.querySelector("p");
  assertExists(byTag);
  assertEquals(byTag.tagName, "P");
});

Deno.test("Document - querySelectorAll method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>First</p><p>Second</p></div>", "text/html");
  
  const elements = doc.querySelectorAll("p");
  assertEquals(elements.length, 2);
});

// DOMTokenList Tests

Deno.test("DOMTokenList - contains method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test foo bar"></div>', "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  
  assert(element.classList.contains("test"));
  assert(element.classList.contains("foo"));
  assert(element.classList.contains("bar"));
  assertFalse(element.classList.contains("baz"));
});

Deno.test("DOMTokenList - add method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div class='test'></div>", "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  
  element.classList.add("foo");
  assert(element.classList.contains("foo"));
  assert(element.classList.contains("test"));
  
  element.classList.add("bar", "baz");
  assert(element.classList.contains("bar"));
  assert(element.classList.contains("baz"));
});

Deno.test("DOMTokenList - remove method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test foo bar"></div>', "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  
  element.classList.remove("foo");
  assertFalse(element.classList.contains("foo"));
  assert(element.classList.contains("test"));
  assert(element.classList.contains("bar"));
});

Deno.test("DOMTokenList - toggle method", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test"></div>', "text/html");
  
  assertExists(doc.documentElement);
  const element = doc.documentElement as Element;
  
  // Toggle on
  const result1 = element.classList.toggle("foo");
  assert(result1);
  assert(element.classList.contains("foo"));
  
  // Toggle off
  const result2 = element.classList.toggle("foo");
  assertFalse(result2);
  assertFalse(element.classList.contains("foo"));
});
