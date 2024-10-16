import { assert, assertMatch, assertThrows } from "@std/assert";
import { hash, verify } from "./hash.ts";

Deno.test("hash() and verify() with unsupported", () => {
  // @ts-expect-error: ts-inference
  assertThrows(() => hash("unsupported", "password"));
  // @ts-expect-error: ts-inference
  assertThrows(() => verify("unsupported", "password", ""));
});

Deno.test("hash() and verify() with argon2", () => {
  const h1 = hash("argon2", "password");
  assertMatch(h1, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify("argon2", "password", h1));
  const h2 = hash({ name: "argon2" }, "password");
  assertMatch(h2, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify({ name: "argon2" }, "password", h2));
});

Deno.test("hash() and verify() with bcrypt", () => {
  const h1 = hash("bcrypt", "password");
  assertMatch(h1, /^\$2b\$12\$/);
  assert(verify("bcrypt", "password", h1));
  const h2 = hash({ name: "bcrypt" }, "password");
  assertMatch(h2, /^\$2b\$12\$/);
  assert(verify({ name: "bcrypt" }, "password", h2));
});

Deno.test("hash() and verify() with scrypt", () => {
  const h1 = hash("scrypt", "password");
  assertMatch(h1, /^\$scrypt\$ln=17,r=8,p=1\$/);
  assert(verify("scrypt", "password", h1));
  const h2 = hash({ name: "scrypt" }, "password");
  assertMatch(h2, /^\$scrypt\$ln=17,r=8,p=1\$/);
  assert(verify({ name: "scrypt" }, "password", h2));
});
