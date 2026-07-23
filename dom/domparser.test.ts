import { DOMParser } from "./domparser.ts";
import { assertEquals, assert, assertExists } from "@std/assert";

Deno.test("DOMParser - basic HTML parsing", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "html");
  assertEquals(doc.documentElement?.nodeType, "ELEMENT_NODE");
});

Deno.test("DOMParser - nested elements", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>Test</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "div");
  assertEquals(doc.documentElement?.children.length, 1);
  assertEquals(doc.documentElement?.children[0].nodeName, "p");
});

Deno.test("DOMParser - text content", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<p>Hello World</p>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.children.length, 1);
  assertEquals(doc.documentElement?.children[0].nodeName, "#text");
  assertEquals(doc.documentElement?.children[0].nodeValue, "Hello World");
});

Deno.test("DOMParser - attributes", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<div class="test" id="main"></div>', "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.attributes.length, 2);
  
  const attrs = doc.documentElement?.attributes;
  const classAttr = attrs?.find(([name]) => name === "class");
  const idAttr = attrs?.find(([name]) => name === "id");
  
  assertExists(classAttr);
  assertEquals(classAttr[1], "test");
  assertExists(idAttr);
  assertEquals(idAttr[1], "main");
});

Deno.test("DOMParser - multiple children", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div><p>First</p><p>Second</p></div>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.children.length, 2);
  assertEquals(doc.documentElement?.children[0].nodeName, "p");
  assertEquals(doc.documentElement?.children[1].nodeName, "p");
});

Deno.test("DOMParser - document structure", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<html><head><title>Test</title></head><body>Content</body></html>", "text/html");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "html");
  assertEquals(doc.documentElement?.children.length, 2);
  
  const head = doc.documentElement?.children.find(c => c.nodeName === "head");
  const body = doc.documentElement?.children.find(c => c.nodeName === "body");
  
  assertExists(head);
  assertExists(body);
  
  const title = head.children.find(c => c.nodeName === "title");
  assertExists(title);
  assertEquals(title.children[0].nodeValue, "Test");
});

// XML parsing tests

Deno.test("DOMParser - basic XML parsing with text/xml", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<root><item>test</item></root>", "text/xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "root");
  assertEquals(doc.documentElement?.children.length, 1);
  assertEquals(doc.documentElement?.children[0].nodeName, "item");
});

Deno.test("DOMParser - XML parsing with application/xml", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<root><item>test</item></root>", "application/xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "root");
});

Deno.test("DOMParser - XML with attributes", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<root><item id="123" name="test"/></root>', "text/xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.children.length, 1);
  const item = doc.documentElement?.children[0];
  assertEquals(item.nodeName, "item");
  assertEquals(item.attributes.length, 2);
  
  const idAttr = item.attributes.find(([name]) => name === "id");
  const nameAttr = item.attributes.find(([name]) => name === "name");
  
  assertExists(idAttr);
  assertEquals(idAttr[1], "123");
  assertExists(nameAttr);
  assertEquals(nameAttr[1], "test");
});

Deno.test("DOMParser - XML with nested elements", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<root><parent><child>value</child></parent></root>", "text/xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "root");
  assertEquals(doc.documentElement?.children.length, 1);
  
  const parent = doc.documentElement?.children[0];
  assertEquals(parent.nodeName, "parent");
  assertEquals(parent.children.length, 1);
  
  const child = parent.children[0];
  assertEquals(child.nodeName, "child");
  assertEquals(child.children[0].nodeValue, "value");
});

Deno.test("DOMParser - SVG parsing with image/svg+xml", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString('<svg><circle cx="50" cy="50" r="40"/></svg>', "image/svg+xml");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "svg");
  assertEquals(doc.documentElement?.children.length, 1);
  
  const circle = doc.documentElement?.children[0];
  assertEquals(circle.nodeName, "circle");
  assertEquals(circle.attributes.length, 3);
});

Deno.test("DOMParser - default to HTML for unknown content type", async () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString("<div>Test</div>", "unknown/type");
  
  assertExists(doc.documentElement);
  assertEquals(doc.documentElement?.nodeName, "div");
});
