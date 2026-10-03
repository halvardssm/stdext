import { assertEquals, assertThrows } from "@std/assert";
import { BinaryReader, BinaryWriter } from "./binary.ts";

Deno.test("BinaryWriter and BinaryReader round trip", async (t) => {
  for (const endian of ["big", "little"] as const) {
    await t.step(endian, () => {
      const writer = new BinaryWriter({ endian, capacity: 1 });
      writer
        .int8(-1)
        .uint8(255)
        .int16(-2)
        .uint16(65535)
        .int32(-3)
        .uint32(4294967295)
        .bigInt64(-(2n ** 63n))
        .bigUint64(2n ** 64n - 1n)
        .float32(1.5)
        .float64(-0.1)
        .bytes(new Uint8Array([1, 2]))
        .string("æ")
        .cstring("hi");
      assertEquals(
        writer.length,
        1 + 1 + 2 + 2 + 4 + 4 + 8 + 8 + 4 + 8 + 2 + 2 + 3,
      );

      const reader = new BinaryReader(writer.toBytes(), { endian });
      assertEquals(reader.int8(), -1);
      assertEquals(reader.uint8(), 255);
      assertEquals(reader.int16(), -2);
      assertEquals(reader.uint16(), 65535);
      assertEquals(reader.int32(), -3);
      assertEquals(reader.uint32(), 4294967295);
      assertEquals(reader.bigInt64(), -(2n ** 63n));
      assertEquals(reader.bigUint64(), 2n ** 64n - 1n);
      assertEquals(reader.float32(), 1.5);
      assertEquals(reader.float64(), -0.1);
      assertEquals(reader.bytes(2), new Uint8Array([1, 2]));
      assertEquals(reader.string(2), "æ");
      assertEquals(reader.cstring(), "hi");
      assertEquals(reader.remaining, 0);
    });
  }
});

Deno.test("BinaryWriter", async (t) => {
  await t.step("defaults to big endian", () => {
    const writer = new BinaryWriter().uint16(1).uint32(2);
    assertEquals(writer.toBytes(), new Uint8Array([0, 1, 0, 0, 0, 2]));
  });

  await t.step("overrides the byte order per value", () => {
    const writer = new BinaryWriter({ endian: "little" })
      .uint16(1)
      .uint16(1, "big")
      .int16(1, "big")
      .int32(1, "big")
      .uint32(1, "little")
      .bigInt64(1n, "big")
      .bigUint64(1n, "little")
      .float32(1, "big")
      .float64(1, "little");
    const reader = new BinaryReader(writer.toBytes());
    assertEquals(reader.uint16("little"), 1);
    assertEquals(reader.uint16(), 1);
    assertEquals(reader.int16(), 1);
    assertEquals(reader.int32(), 1);
    assertEquals(reader.uint32("little"), 1);
    assertEquals(reader.bigInt64(), 1n);
    assertEquals(reader.bigUint64("little"), 1n);
    assertEquals(reader.float32(), 1);
    assertEquals(reader.float64("little"), 1);
  });

  await t.step("overwrites values by moving the position", () => {
    const writer = new BinaryWriter();
    writer.uint32(0).string("abc");
    const end = writer.position;
    writer.position = 0;
    writer.uint32(end);
    assertEquals(writer.position, 4);
    assertEquals(writer.length, 7);
    writer.position = end;
    assertEquals(
      writer.toBytes(),
      new Uint8Array([0, 0, 0, 7, 97, 98, 99]),
    );
    assertThrows(() => (writer.position = 8), RangeError);
    assertThrows(() => (writer.position = -1), RangeError);
    assertThrows(() => (writer.position = 0.5), RangeError);
  });

  await t.step("resets and grows", () => {
    const writer = new BinaryWriter({ capacity: 2 });
    writer.bytes(new Uint8Array(100));
    assertEquals(writer.length, 100);
    writer.reset();
    assertEquals(writer.length, 0);
    assertEquals(writer.position, 0);
    assertEquals(writer.uint8(1).toBytes(), new Uint8Array([1]));
  });

  await t.step("returns a copy", () => {
    const writer = new BinaryWriter().uint8(1);
    const bytes = writer.toBytes();
    writer.reset().uint8(2);
    assertEquals(bytes, new Uint8Array([1]));
  });
});

Deno.test("BinaryReader", async (t) => {
  await t.step("reads from a view with an offset", () => {
    const bytes = new Uint8Array([9, 9, 0, 1, 9]).subarray(2, 4);
    const reader = new BinaryReader(bytes);
    assertEquals(reader.uint16(), 1);
  });

  await t.step("reads the rest", () => {
    const reader = new BinaryReader(new Uint8Array([1, 2, 3]));
    reader.uint8();
    assertEquals(reader.rest(), new Uint8Array([2, 3]));
    assertEquals(reader.rest(), new Uint8Array());
  });

  await t.step("moves the position", () => {
    const reader = new BinaryReader(new Uint8Array([1, 2]));
    reader.position = 1;
    assertEquals(reader.uint8(), 2);
    reader.position = 0;
    assertEquals(reader.uint8(), 1);
    assertThrows(() => (reader.position = 3), RangeError);
  });

  await t.step("throws when reading beyond the end", () => {
    const reader = new BinaryReader(new Uint8Array([1, 2, 3]));
    assertThrows(() => reader.uint32(), RangeError, "only 3 bytes remaining");
    assertThrows(() => reader.bytes(4), RangeError);
    assertEquals(reader.position, 0);
    assertThrows(() => reader.cstring(), RangeError, "no null terminator");
  });
});
