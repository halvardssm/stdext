import { assertEquals } from "@std/assert";
import { hmac } from "./hmac.ts";

// RFC 4231 test case 2 and RFC 2202 test case 2
const key = "Jefe";
const data = "what do ya want for nothing?";

Deno.test("hmac", async (t) => {
  await t.step("SHA-1", async () => {
    assertEquals(
      (await hmac("SHA-1", key, data)).toHex(),
      "effcdf6ae5eb2fa2d27416d5f184df9c259a7c79",
    );
  });

  await t.step("SHA-256", async () => {
    assertEquals(
      (await hmac("SHA-256", key, data)).toHex(),
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  await t.step("SHA-384", async () => {
    assertEquals(
      (await hmac("SHA-384", key, data)).toHex(),
      "af45d2e376484031617f78d2b58a6b1b9c7ef464f5a01b47e42ec3736322445e8e2240ca5e69e2c78b3239ecfab21649",
    );
  });

  await t.step("SHA-512", async () => {
    assertEquals(
      (await hmac("SHA-512", key, data)).toHex(),
      "164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
    );
  });

  await t.step("accepts bytes", async () => {
    const encoder = new TextEncoder();
    assertEquals(
      await hmac("SHA-256", encoder.encode(key), encoder.encode(data)),
      await hmac("SHA-256", key, data),
    );
  });
});
