import { assert, assertFalse, assertMatch } from "@std/assert";
import { type BcryptOptions, hash, verify } from "./bcrypt.ts";

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

Deno.test("verify with invalid hash", () => {
  assertFalse(
    verify(
      "password",
      "foo",
      {},
    ),
  );
});
