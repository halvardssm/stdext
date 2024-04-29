import { assert, assertMatch } from "@std/assert";
import { Argon2 } from "./argon2.ts";

Deno.test("Argon2", async (t) => {
  await t.step("defaults", () => {
    const r = new Argon2();
    const h = r.hash("password");
    assertMatch(h, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert(r.verify("password", h));
  });

  await t.step("Argon2i", () => {
    const r = new Argon2({ algorithm: "argon2i" });
    const h = r.hash("password");
    assertMatch(h, /^\$argon2i\$v=19\$m=19456,t=2,p=1\$/);
    assert(r.verify("password", h));
  });
  await t.step("Argon2d", () => {
    const r = new Argon2({ algorithm: "argon2d" });
    const h = r.hash("password");
    assertMatch(h, /^\$argon2d\$v=19\$m=19456,t=2,p=1\$/);
    assert(r.verify("password", h));
  });
  await t.step("wrong algoritm", () => {
    // deno-lint-ignore ban-ts-comment
    // @ts-ignore
    const r = new Argon2({ algorithm: "asdfasdf" });
    const h = r.hash("password");
    assertMatch(h, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert(r.verify("password", h));
  });
  await t.step("all options", () => {
    const r = new Argon2({
      algorithm: "argon2id",
      memoryCost: 10000,
      timeCost: 3,
      parallelism: 2,
      outputLength: 32,
    });
    const h = r.hash("password");
    assertMatch(h, /^\$argon2id\$v=19\$m=10000,t=3,p=2\$/);
    assert(r.verify("password", h));
  });
});
