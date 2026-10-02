import {
  assert,
  assertEquals,
  assertFalse,
  assertMatch,
  assertThrows,
} from "@std/assert";
import { type Argon2Options, hash, verify } from "./argon2.ts";

/** Splits a PHC string into its `$`-separated fields. */
function phcFields(hash: string): string[] {
  return hash.split("$");
}

/** Cheap parameters, to keep the additional tests fast. */
const cheap = { memoryCost: 8192, timeCost: 1 } satisfies Argon2Options;

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
  // deno-lint-ignore ban-ts-comment
  // @ts-ignore
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

Deno.test("hash() produces a different hash each call (random salt)", () => {
  const h1 = hash("password", cheap);
  const h2 = hash("password", cheap);
  assert(h1 !== h2);
  // Both still verify against the same password.
  assert(verify("password", h1, cheap));
  assert(verify("password", h2, cheap));
});

Deno.test("verify() rejects a wrong password", () => {
  const h = hash("password", cheap);
  assertFalse(verify("wrong password", h, cheap));
  // Also reject prefixes of the password.
  assertFalse(verify("pass", h, cheap));
});

Deno.test("outputLength changes the length of the hash output", () => {
  const defaultHash = hash("password", cheap);
  // 32 bytes of PHC base64 are 43 characters.
  assertEquals(phcFields(defaultHash)[5].length, 43);

  const shortHash = hash(
    "password",
    { ...cheap, outputLength: 16 } satisfies Argon2Options,
  );
  // 16 bytes of PHC base64 are 22 characters.
  assertEquals(phcFields(shortHash)[5].length, 22);

  assert(verify("password", defaultHash, {}));
  assert(verify("password", shortHash, {}));
});

Deno.test("verify() uses the parameters embedded in the hash", () => {
  const hashOptions = {
    algorithm: "argon2i",
    memoryCost: 8192,
    timeCost: 1,
    parallelism: 2,
    outputLength: 16,
  } satisfies Argon2Options;
  const h = hash("password", hashOptions);

  // Verifying without options (or with different ones, even a different
  // algorithm) still succeeds: the parameters come from the hash itself.
  assert(verify("password", h, {}));
  assert(
    verify(
      "password",
      h,
      { algorithm: "argon2d", memoryCost: 10000 } satisfies Argon2Options,
    ),
  );
});

Deno.test("hash() throws for invalid parameters", () => {
  // memoryCost must be at least 8 * parallelism.
  assertThrows(
    () => hash("password", { memoryCost: 1 } as Argon2Options),
    Error,
    "Failed to parse parameters",
  );
  // parallelism must be at least 1.
  assertThrows(
    () => hash("password", { parallelism: 0 } as Argon2Options),
    Error,
    "Failed to parse parameters",
  );
  // timeCost must be at least 1.
  assertThrows(
    () => hash("password", { timeCost: 0 } as Argon2Options),
    Error,
    "Failed to parse parameters",
  );
  // outputLength must be at least 4.
  assertThrows(
    () => hash("password", { outputLength: 3 } as Argon2Options),
    Error,
    "Failed to parse parameters",
  );
});

Deno.test("hash() and verify() with a non-ASCII password", () => {
  const password = "pässwörd-🔐";
  const h = hash(password, cheap);
  assert(verify(password, h, cheap));
  assertFalse(verify("pässwörd-", h, cheap));
});

Deno.test("verify with invalid hash", () => {
  assertThrows(
    () => verify("password", "foo", {}),
    Error,
    "Failed to parse hash, invalid hash provided",
  );
});

Deno.test("verify with invalid hash", () => {
  assertFalse(
    verify(
      "password",
      "$argon2id$v=19$m=4096,t=3,p=1$saRQ61U1SwiUeZRzDEUbcQ$t3LzT0gU5UKQKzZmPUv1XK/BTnOfvSpWyoZ4Fh/GHKg",
      {},
    ),
  );
});
