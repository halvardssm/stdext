import { assert, assertEquals, assertThrows } from "@std/assert";
import { parse } from "./xml.ts";

Deno.test("parse() accepts well-formed XML and stringify() round-trips", () => {
  const xml = "<note><to>Alice</to><to>Bob</to></note>";
  const doc = parse(xml);
  assertEquals(doc.stringify(), xml);
});

Deno.test("parse() throws on non-well-formed XML", () => {
  assertThrows(() => parse("<note><to>Alice</note>"), Error);
});

Deno.test("validate() returns valid for a conforming document", () => {
  const xsd = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="note">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="to" type="xs:string" maxOccurs="unbounded"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
  const doc = parse("<note><to>Alice</to></note>");
  const result = doc.validate(xsd);
  assert(result.valid);
  assertEquals(result.errors.length, 0);
});

Deno.test("validate() reports errors for a non-conforming document", () => {
  const xsd = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="note">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="to" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
  const doc = parse("<note><body>hi</body></note>");
  const result = doc.validate(xsd);
  assert(!result.valid);
  assert(result.errors.length > 0);
});

Deno.test("validate() throws on a broken schema", () => {
  // references an undefined type => fails schema compilation
  const xsd = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="note" type="xs:doesNotExist"/>
</xs:schema>`;
  const doc = parse("<note/>");
  assertThrows(() => doc.validate(xsd), Error);
});
