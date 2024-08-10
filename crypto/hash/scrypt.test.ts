import { assert, assertMatch } from "@std/assert";
import { hash, type ScryptOptions, verify } from "./scrypt.ts";

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
    keyLenght: 16,
  } as ScryptOptions;
  const h = hash("password", o);
  assertMatch(h, /^\$scrypt\$ln=1,r=1,p=2\$/);
  assert(verify("password", h, o));
});
