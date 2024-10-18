import { assert, assertMatch } from "@std/assert";
import { type Argon2Options, hash, verify } from "./argon2.ts";

Deno.test("hash() and verify() with default arguments", () => {
  const h = hash("password", {});
  assertMatch(h, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify("password", h, {}));
});

Deno.test("hash() and verify() with argon2i", () => {
  const o = { algorithm: "argon2i" } satisfies Argon2Options;
  const h = hash("password", o);
  assertMatch(h, /^\$argon2i\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify("password", h, o));
});

Deno.test("hash() and verify() with argon2d", () => {
  const o = { algorithm: "argon2d" } satisfies Argon2Options;
  const h = hash("password", o);
  assertMatch(h, /^\$argon2d\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify("password", h, o));
});

Deno.test("hash() and verify() with wrong algorithm", () => {
  // @ts-expect-error: ts-inference
  const o = { algorithm: "asdfasdf" } as Argon2Options;
  const h = hash("password", o);
  assertMatch(h, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify("password", h, o));
});

Deno.test("hash() and verify() with all options", () => {
  const o = {
    algorithm: "argon2id",
    memoryCost: 10000,
    timeCost: 3,
    parallelism: 2,
    outputLength: 16,
  } satisfies Argon2Options;
  const h = hash("password", o);
  assertMatch(h, /^\$argon2id\$v=19\$m=10000,t=3,p=2\$/);
  assert(verify("password", h, o));
});
