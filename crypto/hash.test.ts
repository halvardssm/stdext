import { assert, assertMatch, assertThrows } from "@std/assert";
import { hash, verify } from "./hash.ts";

Deno.test("hash", async (t) => {
  await t.step("unsupported", () => {
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    assertThrows(() => hash("unsupported", "password"));
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    assertThrows(() => verify("unsupported", "password", ""));
  });

  await t.step("argon2", () => {
    const h1 = hash("argon2", "password");
    assertMatch(h1, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert(verify("argon2", "password", h1));
    const h2 = hash({ name: "argon2" }, "password");
    assertMatch(h2, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert(verify({ name: "argon2" }, "password", h2));
  });

  await t.step("bcrypt", () => {
    const h1 = hash("bcrypt", "password");
    assertMatch(h1, /^\$2b\$12\$/);
    assert(verify("bcrypt", "password", h1));
    const h2 = hash({ name: "bcrypt" }, "password");
    assertMatch(h2, /^\$2b\$12\$/);
    assert(verify({ name: "bcrypt" }, "password", h2));
  });
});
