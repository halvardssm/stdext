import { assert, assertEquals } from "@std/assert";
import { isStringFormat, matchesFormat, type StringFormat } from "./formats.ts";

const cases: Record<StringFormat, { valid: string[]; invalid: string[] }> = {
  "date": {
    valid: ["2024-02-29", "2023-12-31", "0001-01-01"],
    invalid: ["2023-02-29", "2024-13-01", "2024-00-10", "2024-04-31", "x", ""],
  },
  "time": {
    valid: ["23:59:59", "12:00:00Z", "12:00:00.5+01:00", "23:59:60Z"],
    invalid: [
      "24:00:00",
      "12:60:00",
      "12:00:00+24:00",
      "12:00:00+01:60",
      "noon",
    ],
  },
  "date-time": {
    valid: ["2024-02-29T12:00:00Z", "2024-02-29T12:00:00.123+02:00"],
    invalid: ["2024-02-30T12:00:00Z", "2024-02-29T25:00:00Z", "2024-02-29"],
  },
  "duration": {
    valid: ["P1Y2M3DT4H5M6S", "PT1H", "P2W", "P1D"],
    invalid: ["P", "PT", "1D", "P1DT"],
  },
  "hostname": {
    valid: ["localhost", "example.com", "a-b.example.com", "a1.b2", "a.com."],
    invalid: [
      "-a.com",
      "a-.com",
      "a..com",
      "a b.com",
      "a".repeat(64) + ".com",
      "",
    ],
  },
  "idn-hostname": {
    valid: ["localhost", "bücher.de", "例え.jp"],
    invalid: ["-a.com", "a..com", "a b.com"],
  },
  "ipv4": {
    valid: ["0.0.0.0", "192.168.1.1", "255.255.255.255"],
    invalid: ["256.1.1.1", "01.1.1.1", "1.1.1", "1.1.1.1.1", "a.b.c.d"],
  },
  "ipv6": {
    valid: [
      "::",
      "::1",
      "1::",
      "2001:db8::ff00:42:8329",
      "1:2:3:4:5:6:7:8",
      "::ffff:1.2.3.4",
      "64:ff9b::192.0.2.33",
      "1:2:3:4:5:6:1.2.3.4",
    ],
    invalid: ["1:2:3:4:5:6:7", ":::", "1::2::3", "12345::", "g::1", "::1.2.3"],
  },
  "uri": {
    valid: [
      "https://example.com/a?b=c#d",
      "mailto:a@b.com",
      "urn:isbn:0451450523",
      "http://[::1]:80/",
      "a:%20",
    ],
    invalid: [
      "example.com",
      "http://a b",
      "/relative",
      "http://a/%zz",
      "1a:b",
    ],
  },
  "uri-reference": {
    valid: [
      "https://example.com",
      "/path/x",
      "relative/path",
      "#frag",
      "",
      "?q=1",
    ],
    invalid: ["http://a.com bad value", "a\\b", "%zz", "<a>"],
  },
  "iri": {
    valid: ["https://例え.jp/パス", "mailto:ü@b.com"],
    invalid: ["例え.jp", "http://a b"],
  },
  "iri-reference": {
    valid: ["https://例え.jp", "/パス", "relative", ""],
    invalid: ["a b", "a\\b"],
  },
  "uri-template": {
    valid: ["https://x.com/{id}", "/users{?a,b}", "plain"],
    invalid: ["https://x.com/{a b}", "a b"],
  },
  "json-pointer": {
    valid: ["", "/", "/foo/0", "/a~0b/c~1d", "//"],
    invalid: ["foo", "/a~2", "/a~"],
  },
  "relative-json-pointer": {
    valid: ["0", "1/foo", "2#", "0/a~1b", "10"],
    invalid: ["/foo", "01", "0abc", "-1", ""],
  },
  "regex": { valid: ["^a+$", "[a-z]{2,}"], invalid: ["(", "[a-"] },
  "uuid": {
    valid: [
      "123e4567-e89b-12d3-a456-426614174000",
      "123E4567-E89B-12D3-A456-426614174000",
    ],
    invalid: ["123e4567e89b12d3a456426614174000", "x", ""],
  },
  "email": {
    valid: ["a@b.co", "a.b+c@d.example"],
    invalid: ["a@b", "@b.co", ""],
  },
  "idn-email": { valid: ["ü@bücher.de", "a@b.co"], invalid: ["ü@", ""] },
};

for (const [format, { valid, invalid }] of Object.entries(cases)) {
  Deno.test(`format ${format}`, () => {
    assert(isStringFormat(format));
    for (const value of valid) {
      assert(matchesFormat(value, format), `${format} should accept ${value}`);
    }
    for (const value of invalid) {
      assert(
        !matchesFormat(value, format),
        `${format} should reject ${value}`,
      );
    }
  });
}

Deno.test("isStringFormat", () => {
  for (const format of Object.keys(cases)) assert(isStringFormat(format));
  for (const format of ["nope", "", "Email", "toString", "constructor"]) {
    assertEquals(isStringFormat(format), false, format);
  }
});
