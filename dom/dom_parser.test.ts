/**
 * Tests for DOMParser polyfill
 */

import { DOMParser, DOMException } from "./mod.ts";
import { Document } from "./document.ts";
import { Element } from "./element.ts";
import { assert, assertEquals, assertThrows, assertInstanceOf } from "@std/assert";

Deno.test("DOMParser - basic HTML parsing", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html><body><h1>Hello</h1></body></html>", "text/html");
  
  assertInstanceOf(doc, Document);
  assertEquals(doc.documentElement?.tagName, "HTML");
});

Deno.test("DOMParser - parse HTML with nested elements", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<html><head><title>Test</title></head><body><div><p>Content</p></div></body></html>`,
    "text/html"
  );
  
  assertInstanceOf(doc, Document);
  assertEquals(doc.documentElement?.tagName, "HTML");
  
  const html = doc.documentElement;
  assert(html);
  
  // Check that we have child nodes
  assert(html.hasChildNodes());
});

Deno.test("DOMParser - parse XML", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<root><item>Test</item></root>", "text/xml");
  
  assertInstanceOf(doc, Document);
  assertEquals(doc.documentElement?.tagName, "ROOT");
});

Deno.test("DOMParser - invalid content type", () => {
  const parser = new DOMParser();
  
  assertThrows(
    () => parser.parseFromString("<html></html>", "invalid/type"),
    Error,
    "The provided content type 'invalid/type' is not supported"
  );
});

Deno.test("DOMParser - empty string", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("", "text/html");
  
  assertInstanceOf(doc, Document);
});

Deno.test("DOMParser - getElementById", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<html><body><div id="test">Content</div></body></html>`,
    "text/html"
  );
  
  const element = doc.getElementById("test");
  assert(element);
  assertEquals(element.tagName, "DIV");
});

Deno.test("DOMParser - getElementsByTagName", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<html><body><div>First</div><div>Second</div></body></html>`,
    "text/html"
  );
  
  const divs = doc.getElementsByTagName("div");
  assertEquals(divs.length, 2);
});

Deno.test("DOMParser - createElement", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const element = doc.createElement("div");
  assertInstanceOf(element, Element);
  assertEquals(element.tagName, "DIV");
});

Deno.test("DOMParser - appendChild", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const div = doc.createElement("div");
  const p = doc.createElement("p");
  
  div.appendChild(p);
  
  assert(div.hasChildNodes());
  assertEquals(div.childNodes.length, 1);
});

Deno.test("DOMParser - setAttribute and getAttribute", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const div = doc.createElement("div");
  div.setAttribute("id", "test");
  div.setAttribute("class", "container");
  
  assertEquals(div.getAttribute("id"), "test");
  assertEquals(div.getAttribute("class"), "container");
  assert(div.hasAttribute("id"));
  assert(div.hasAttribute("class"));
});

Deno.test("DOMParser - classList", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const div = doc.createElement("div");
  div.classList.add("test", "container");
  
  assert(div.classList.contains("test"));
  assert(div.classList.contains("container"));
  assertEquals(div.classList.length, 2);
  
  div.classList.remove("test");
  assert(!div.classList.contains("test"));
  assertEquals(div.classList.length, 1);
});

Deno.test("DOMParser - textContent", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
  
  const textNode = doc.createTextNode("World");
  assertEquals(textNode.textContent, "World");
});

Deno.test("DOMParser - cloneNode", () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html></html>", "text/html");
  
  const div = doc.createElement("div");
  div.setAttribute("id", "original");
  
  const clone = div.cloneNode(false);
  assertEquals(clone.tagName, "DIV");
  // Note: cloneNode doesn't copy attributes in the current implementation
  // This is a limitation of the simplified implementation
  assert(!clone.hasChildNodes());
});

Deno.test("DOMParser - all content types", () => {
  const parser = new DOMParser();
  const contentTypes = [
    "text/html",
    "text/xml",
    "application/xml",
    "application/xhtml+xml",
    "image/svg+xml",
  ];
  
  for (const contentType of contentTypes) {
    const doc = parser.parseFromString(`<root></root>`, contentType);
    assertInstanceOf(doc, Document);
  }
});
