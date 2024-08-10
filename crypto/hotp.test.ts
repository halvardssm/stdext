import { assert, assertEquals } from "@std/assert";
import {
  counterToBuffer,
  generateHmacSha1,
  generateHotp,
  truncate,
  verifyHotp,
} from "./hotp.ts";
import { decodeBase32, encodeHex } from "@std/encoding";

const secret = "OCOMBLGUREYUXFQJIL75FQFCKYFCKLQP";
const secretBytes = decodeBase32(secret);

Deno.test("counterToBuffer()", () => {
  assertEquals(
    new Uint8Array(counterToBuffer(0).buffer),
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]),
  );
  assertEquals(
    new Uint8Array(counterToBuffer(100).buffer),
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 100]),
  );
  assertEquals(
    new Uint8Array(counterToBuffer(1000).buffer),
    new Uint8Array([0, 0, 0, 0, 0, 0, 3, 232]),
  );
  assertEquals(
    new Uint8Array(counterToBuffer(1000000000000).buffer),
    new Uint8Array([0, 0, 0, 232, 212, 165, 16, 0]),
  );
});

Deno.test("generateHmacSha1() should generate hashes", async () => {
  const data = new Uint8Array([0, 0, 0, 0, 0, 0, 3, 232]);
  const hmac = await generateHmacSha1(secretBytes, data);
  assertEquals(encodeHex(hmac), "a5a0ee362d45dcb90fba5efb57ac90c2903b2c59");
});

Deno.test("truncate() should output a numbered string", () => {
  const data = new Uint8Array([0, 0, 0, 232, 212, 165, 16, 0]);
  const numberedString0 = truncate(data, 0);
  assertEquals(numberedString0, "0");
  const numberedString1 = truncate(data, 1);
  assertEquals(numberedString1, "2");
  const numberedString6 = truncate(data, 6);
  assertEquals(numberedString6, "000232");
  const numberedString10 = truncate(data, 10);
  assertEquals(numberedString10, "0000000232");
});

Deno.test("generateHotp()", async () => {
  assertEquals(await generateHotp(secret, 0), "187492");
  assertEquals(await generateHotp(secret, 100), "907306");
  assertEquals(await generateHotp(secret, 1000), "303255");
  assertEquals(await generateHotp(secret, 1000000000000), "270103");
});

Deno.test("verifyHotp()", async () => {
  assert(await verifyHotp("187492", secret, 0));
  assert(await verifyHotp("907306", secret, 100));
  assert(await verifyHotp("303255", secret, 1000));
  assert(await verifyHotp("270103", secret, 1000000000000));
});
