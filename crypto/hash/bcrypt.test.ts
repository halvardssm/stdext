import { assert, assertFalse, assertMatch, assertThrows } from "@std/assert";
import { type BcryptOptions, hash, verify } from "./bcrypt.ts";

/** Cheap parameters, to keep the additional tests fast. */
const cheap = { cost: 4 } as BcryptOptions;

Deno.test("hash() and verify() with defaults", () => {
  const o = {} as BcryptOptions;
  const h = hash("password", o);
  assertMatch(h, /^\$2b\$12\$/);
  assert(verify("password", h, o));
});

Deno.test("hash() and verify() with all options", () => {
  const o = { cost: 4 } as BcryptOptions;
  const h = hash("password", o);
  assertMatch(h, /^\$2b\$04\$/);
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

Deno.test("cost is reflected in the hash and used on verify", () => {
  const h = hash("password", { cost: 5 } as BcryptOptions);
  // $2b$<cost>$ is embedded in the hash.
  assertMatch(h, /^\$2b\$05\$/);
  // Verifying without options still succeeds: the cost comes from the hash.
  assert(verify("password", h, {}));
});

Deno.test("verify() ignores the options and uses the embedded cost", () => {
  const h = hash("password", { cost: 4 } as BcryptOptions);
  // A different cost in the options does not change the outcome.
  assert(verify("password", h, { cost: 10 } as BcryptOptions));
});

Deno.test("hash() throws for a cost outside the 4-31 range", () => {
  assertThrows(
    () => hash("password", { cost: 3 } as BcryptOptions),
    Error,
    "Failed to generate hash",
  );
  assertThrows(
    () => hash("password", { cost: 32 } as BcryptOptions),
    Error,
    "Failed to generate hash",
  );
});

Deno.test("hash() and verify() with a non-ASCII password", () => {
  const password = "pässwörd-🔐";
  const h = hash(password, cheap);
  assert(verify(password, h, cheap));
  assertFalse(verify("pässwörd-", h, cheap));
});

Deno.test("hash() truncates passwords longer than 72 bytes", () => {
  // bcrypt only considers the first 72 bytes: a password that shares the
  // first 72 bytes verifies as the same password.
  const long = "a".repeat(100);
  const samePrefix = "a".repeat(80);
  const h = hash(long, cheap);
  assert(verify(samePrefix, h, cheap));
});

Deno.test("verify with invalid hash", () => {
  assertFalse(
    verify(
      "password",
      "foo",
      {},
    ),
  );
});

Deno.test("verify with wrong password", () => {
  const o = {} as BcryptOptions;
  const h = hash("password", o);
  assertFalse(verify("wrong password", h, o));
});
