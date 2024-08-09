import { assertEquals } from "@std/assert";
import { generateSecret, generateSecretBytes } from "./utils.ts";

Deno.test("generateSecretBytes - default", () => {
  const secretBytes = generateSecretBytes();
  assertEquals(secretBytes.length, 20);
});

Deno.test("generateSecret - default", () => {
  const secret = generateSecret();
  assertEquals(secret.length, 20);
});
