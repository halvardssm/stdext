import { assert, assertMatch } from "@std/assert";
import { Bcrypt } from "./bcrypt.ts";

Deno.test("Bcrypt", async (t) => {
  await t.step("defaults", () => {
    const r = new Bcrypt();
    const h = r.hash("password");
    assertMatch(h, /^\$2b\$12/);
    assert(r.verify("password", h));
  });

  await t.step("cost 4", () => {
    const r = new Bcrypt({
      cost: 4,
    });
    const h = r.hash("password");
    assertMatch(h, /^\$2b\$04/);
    assert(r.verify("password", h));
  });
});
