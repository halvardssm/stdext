import {
  assert,
  assertEquals,
  assertFalse,
  assertMatch,
  assertThrows,
} from "@std/assert";
import { hash, type ScryptOptions, verify } from "./scrypt.ts";

/** Splits a PHC string into its `$`-separated fields. */
function phcFields(hash: string): string[] {
  return hash.split("$");
}

Deno.test("hash() and verify() with defaults", () => {
  const o = {} as ScryptOptions;
  const h = hash("password", o);
  assertMatch(h, /^\$scrypt\$ln=17,r=8,p=1\$/);
  assert(verify("password", h, o));
});

Deno.test("hash() and verify() with all options", () => {
  const o = {
    logN: 1,
    blockSize: 1,
    parallelism: 2,
    keyLength: 16,
  } as ScryptOptions;
  const h = hash("password", o);
  assertMatch(h, /^\$scrypt\$ln=1,r=1,p=2\$/);
  assert(verify("password", h, o));
});

Deno.test("hash() produces a different hash each call (random salt)", () => {
  const o = { logN: 1 } as ScryptOptions;
  const h1 = hash("password", o);
  const h2 = hash("password", o);
  assert(h1 !== h2);
  // Both still verify against the same password.
  assert(verify("password", h1, o));
  assert(verify("password", h2, o));
});

Deno.test("verify() rejects a wrong password", () => {
  const o = { logN: 1 } as ScryptOptions;
  const h = hash("password", o);
  assertFalse(verify("wrong password", h, o));
  // Also reject prefixes of the password.
  assertFalse(verify("pass", h, o));
});

Deno.test("keyLength changes the length of the hash output", () => {
  const defaultHash = hash("password", { logN: 1 } as ScryptOptions);
  // 32 bytes of PHC base64 are 43 characters.
  assertEquals(phcFields(defaultHash)[4].length, 43);

  const shortHash = hash(
    "password",
    { logN: 1, keyLength: 16 } as ScryptOptions,
  );
  // 16 bytes of PHC base64 are 22 characters.
  assertEquals(phcFields(shortHash)[4].length, 22);

  assert(verify("password", defaultHash, {}));
  assert(verify("password", shortHash, {}));
});

Deno.test("verify() uses the parameters embedded in the hash", () => {
  const hashOptions = {
    logN: 1,
    blockSize: 1,
    parallelism: 2,
    keyLength: 16,
  } as ScryptOptions;
  const h = hash("password", hashOptions);

  // Verifying without options (or with different ones) still succeeds:
  // the parameters come from the hash itself.
  assert(verify("password", h, {}));
  assert(verify("password", h, { logN: 17, keyLength: 32 } as ScryptOptions));
});

Deno.test("hash() throws for invalid parameters", () => {
  // logN must be less than 64.
  assertThrows(
    () => hash("password", { logN: 64 } as ScryptOptions),
    Error,
    "Failed to parse parameters",
  );
  // keyLength must be between 10 and 64.
  assertThrows(
    () => hash("password", { keyLength: 9 } as ScryptOptions),
    Error,
    "Failed to parse parameters",
  );
  assertThrows(
    () => hash("password", { keyLength: 65 } as ScryptOptions),
    Error,
    "Failed to parse parameters",
  );
  // blockSize and parallelism must be positive.
  assertThrows(
    () => hash("password", { blockSize: 0 } as ScryptOptions),
    Error,
    "Failed to parse parameters",
  );
  assertThrows(
    () => hash("password", { parallelism: 0 } as ScryptOptions),
    Error,
    "Failed to parse parameters",
  );
});

Deno.test("hash() and verify() with a non-ASCII password", () => {
  const o = { logN: 1 } as ScryptOptions;
  const password = "pässwörd-🔐";
  const h = hash(password, o);
  assert(verify(password, h, o));
  assertFalse(verify("pässwörd-", h, o));
});

Deno.test("verify with invalid hash", () => {
  assertThrows(
    () => verify("password", "foo", {}),
    Error,
    "Failed to parse hash, invalid hash provided",
  );
});

Deno.test("verify with wrong hash", () => {
  assertFalse(
    verify(
      "password",
      "$scrypt$ln4uug1yD1zJGXEN9pWpWg$uEKXzi3Ar3PoXEzA23PDdyN6RphzWGBhnXtEdnQyArs",
      {},
    ),
  );
});
