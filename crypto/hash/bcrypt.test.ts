import { assert, assertMatch } from "@std/assert";
import { type BcryptOptions, hash, verify } from "./bcrypt.ts";

Deno.test("crypto/hash/Bcrypt", async (t) => {
  await t.step("defaults", () => {
    const o = {} as BcryptOptions;
    const h = hash("password", o);
    assertMatch(h, /^\$2b\$12\$/);
    assert(verify("password", h, o));
  });

  await t.step("cost 4", () => {
    const o = { cost: 4 } as BcryptOptions;
    const h = hash("password", o);
    assertMatch(h, /^\$2b\$04\$/);
    assert(verify("password", h, o));
  });
});
