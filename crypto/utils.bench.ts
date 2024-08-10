import { assertEquals } from "@std/assert";
import { generateSecret, generateSecretBytes } from "./utils.ts";

for (const l of [1, 8, 20, 100, 1000]) {
  Deno.bench(`generateSecretBytes - ${l}`, () => {
    const secretBytes = generateSecretBytes(l);
    assertEquals(secretBytes.length, l);
  });

  Deno.bench(`generateSecret - ${l}`, () => {
    const secret = generateSecret(l);
    assertEquals(secret.length, l);
  });
}
