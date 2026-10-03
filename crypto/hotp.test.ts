import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { decodeBase32 } from "@std/encoding/base32";
import {
  counterToBuffer,
  decodeKey,
  generateHmacSha1,
  generateHotp,
  truncate,
  verifyHotp,
} from "./hotp.ts";

const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";
const secretBytes = decodeBase32(secret);

Deno.test("counterToBuffer()", () => {
  assertEquals(
    counterToBuffer(0),
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
  );
  assertEquals(
    counterToBuffer(100),
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 100]),
  );
  assertEquals(
    counterToBuffer(1000),
    new Uint8Array([0, 0, 0, 0, 0, 0, 3, 232]),
  );
  assertEquals(
    counterToBuffer(1000000000000),
    new Uint8Array([0, 0, 0, 232, 212, 165, 16, 0]),
  );
});

Deno.test("generateHmacSha1() should generate hashes", async () => {
  const data = new Uint8Array([0, 0, 0, 0, 0, 0, 3, 232]);
  const hmac = await generateHmacSha1(secretBytes, data);
  assertEquals(hmac.toHex(), "a5a0ee362d45dcb90fba5efb57ac90c2903b2c59");
});

Deno.test("truncate() should output a numbered string", () => {
  const data = new Uint8Array([0, 0, 0, 232, 212, 165, 16, 0]);
  assertEquals(truncate(data, 0), "0");
  assertEquals(truncate(data, 1), "2");
  assertEquals(truncate(data, 6), "000232");
  assertEquals(truncate(data, 10), "0000000232");
});

Deno.test("decodeKey()", () => {
  assertEquals(decodeKey(secret), secretBytes);
  // Case insensitive, with whitespace and without padding
  assertEquals(
    decodeKey("ocom blgu reyu xfqj il75 fqfc kyfc klqp"),
    secretBytes,
  );
  assertEquals(decodeKey("MZXW6"), new TextEncoder().encode("foo"));
  // Bytes are used as is
  assertEquals(decodeKey(secretBytes), secretBytes);
});

Deno.test("generateHotp()", async () => {
  assertEquals(await generateHotp(secret, 0), "187492");
  assertEquals(await generateHotp(secret, 100), "907306");
  assertEquals(await generateHotp(secret, 1000), "303255");
  assertEquals(await generateHotp(secret, 1000000000000), "270103");
  assertEquals(await generateHotp(secretBytes, 0), "187492");
});

Deno.test("generateHotp() RFC 4226 test vectors", async () => {
  const key = new TextEncoder().encode("12345678901234567890");
  const expected = [
    "755224",
    "287082",
    "359152",
    "969429",
    "338314",
    "254676",
    "287922",
    "162583",
    "399871",
    "520489",
  ];
  for (const [counter, otp] of expected.entries()) {
    assertEquals(await generateHotp(key, counter), otp);
  }
});

Deno.test("generateHotp() options", async () => {
  assertEquals(await generateHotp(secret, 0, { digits: 8 }), "63187492");
  assertEquals(
    (await generateHotp(secret, 0, { hash: "SHA-256" })).length,
    6,
  );
  for (const digits of [0, 11, 1.5]) {
    await assertRejects(
      () => generateHotp(secret, 0, { digits }),
      RangeError,
      "'digits'",
    );
  }
});

Deno.test("verifyHotp()", async () => {
  assert(await verifyHotp("187492", secret, 0));
  assert(await verifyHotp("907306", secret, 100));
  assert(await verifyHotp("303255", secret, 1000));
  assert(await verifyHotp("270103", secret, 1000000000000));
  assert(await verifyHotp("63187492", secret, 0, { digits: 8 }));
  assertFalse(await verifyHotp("187493", secret, 0));
  assertFalse(await verifyHotp("18749", secret, 0));
  assertFalse(await verifyHotp("187492", secret, 0, { digits: 8 }));
});
