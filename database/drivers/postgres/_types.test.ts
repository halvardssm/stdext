import { assertEquals } from "@std/assert";
import {
  defaultParsers,
  encodeParameter,
  Oid,
  parseArray,
  parseBytea,
  parseTimestamp,
  parseTimestamptz,
} from "./_types.ts";

Deno.test("parseTimestamptz", () => {
  assertEquals(
    parseTimestamptz("2024-01-02 03:04:05.123456+00"),
    new Date("2024-01-02T03:04:05.123Z"),
  );
  assertEquals(
    parseTimestamptz("2024-01-02 03:04:05+05:30"),
    new Date("2024-01-01T21:34:05Z"),
  );
  assertEquals(
    parseTimestamptz("2024-01-02 03:04:05-01:00:30"),
    new Date("2024-01-02T04:04:35Z"),
  );
  assertEquals(
    (parseTimestamptz("0044-03-15 12:00:00+00 BC") as Date).getUTCFullYear(),
    -43,
  );
  assertEquals(
    (parseTimestamptz("10000-01-01 00:00:00+00") as Date).getUTCFullYear(),
    10000,
  );
  assertEquals(parseTimestamptz("infinity"), "infinity");
});

Deno.test("parseTimestamp", () => {
  assertEquals(
    parseTimestamp("2024-01-02 03:04:05.5"),
    new Date(2024, 0, 2, 3, 4, 5, 500),
  );
  assertEquals(
    (parseTimestamp("0099-01-01 00:00:00") as Date).getFullYear(),
    99,
  );
  assertEquals(
    (parseTimestamp("0001-01-01 00:00:00 BC") as Date).getFullYear(),
    0,
  );
  assertEquals(parseTimestamp("-infinity"), "-infinity");
});

Deno.test("parseBytea", () => {
  assertEquals(parseBytea("\\x00ff10"), new Uint8Array([0, 255, 16]));
  assertEquals(parseBytea("a\\\\b\\001"), new Uint8Array([97, 92, 98, 1]));
});

Deno.test("parseArray", () => {
  assertEquals(parseArray("{}", Number), []);
  assertEquals(parseArray("{1,2,NULL}", Number), [1, 2, null]);
  assertEquals(parseArray("{{1,2},{3,4}}", Number), [[1, 2], [3, 4]]);
  assertEquals(
    parseArray('{"a b","c\\"d","NULL","e\\\\f",g}', String),
    ["a b", 'c"d', "NULL", "e\\f", "g"],
  );
  assertEquals(parseArray("[0:1]={1,2}", Number), [1, 2]);
});

Deno.test("defaultParsers", () => {
  assertEquals(defaultParsers[Oid.bool]("t"), true);
  assertEquals(defaultParsers[Oid.bool]("f"), false);
  assertEquals(defaultParsers[Oid.int8]("9007199254740993"), 9007199254740993n);
  assertEquals(defaultParsers[Oid.float8]("NaN"), NaN);
  assertEquals(defaultParsers[Oid.numeric]("1.10"), "1.10");
  assertEquals(defaultParsers[Oid.jsonb]('{"a":[1]}'), { a: [1] });
  assertEquals(defaultParsers[1016]("{1,NULL}"), [1n, null]);
  assertEquals(defaultParsers[1009]('{a,"b,c"}'), ["a", "b,c"]);
  assertEquals(defaultParsers[1000]("{t,f}"), [true, false]);
});

Deno.test("encodeParameter", () => {
  assertEquals(encodeParameter(undefined), null);
  assertEquals(encodeParameter(null), null);
  assertEquals(encodeParameter("a"), "a");
  assertEquals(encodeParameter(1.5), "1.5");
  assertEquals(encodeParameter(2n ** 64n), "18446744073709551616");
  assertEquals(encodeParameter(true), "true");
  assertEquals(encodeParameter(false), "false");
  assertEquals(
    encodeParameter(new Date("2024-01-02T03:04:05.000Z")),
    "2024-01-02T03:04:05.000Z",
  );
  assertEquals(encodeParameter(new Uint8Array([0, 255])), "\\x00ff");
  assertEquals(
    encodeParameter([1, null, ['a"b', "c\\d"]]),
    '{"1",NULL,{"a\\"b","c\\\\d"}}',
  );
  assertEquals(encodeParameter({ a: 1 }), '{"a":1}');
});
