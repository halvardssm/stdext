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
