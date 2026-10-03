import { assertEquals } from "@std/assert";
import { generateSecret, generateSecretBytes } from "./utils.ts";
import { generateTotp } from "./totp.ts";

Deno.test("generateSecretBytes - default", () => {
  const secretBytes = generateSecretBytes();
  assertEquals(secretBytes.length, 20);
});

Deno.test("generateSecret - default", () => {
  const secret = generateSecret();
  assertEquals(secret.length, 20);
});

Deno.test("generateSecret - can be used as a one-time password key", async () => {
  for (const length of [16, 20, 32]) {
    const secret = generateSecret(length);
    assertEquals(secret.length, length);
    assertEquals((await generateTotp(secret)).length, 6);
  }
});
