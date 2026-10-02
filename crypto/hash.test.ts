import { assert, assertFalse, assertMatch, assertThrows } from "@std/assert";
import { AlgorithmName, hash, verify } from "./hash.ts";

Deno.test("hash() and verify() with unsupported", () => {
  // @ts-expect-error: ts-inference
  assertThrows(() => hash("unsupported", "password"));
  // @ts-expect-error: ts-inference
  assertThrows(() => verify("unsupported", "password", ""));
});

Deno.test("hash() and verify() with argon2", () => {
  const h1 = hash("argon2", "password");
  assertMatch(h1, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify("argon2", "password", h1));
  const h2 = hash({ name: "argon2" }, "password");
  assertMatch(h2, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert(verify({ name: "argon2" }, "password", h2));
});

Deno.test("hash() and verify() with bcrypt", () => {
  const h1 = hash("bcrypt", "password");
  assertMatch(h1, /^\$2b\$12\$/);
  assert(verify("bcrypt", "password", h1));
  const h2 = hash({ name: "bcrypt" }, "password");
  assertMatch(h2, /^\$2b\$12\$/);
  assert(verify({ name: "bcrypt" }, "password", h2));
});

Deno.test("hash() and verify() with scrypt", () => {
  const h1 = hash("scrypt", "password");
  assertMatch(h1, /^\$scrypt\$ln=17,r=8,p=1\$/);
  assert(verify("scrypt", "password", h1));
  const h2 = hash({ name: "scrypt" }, "password");
  assertMatch(h2, /^\$scrypt\$ln=17,r=8,p=1\$/);
  assert(verify({ name: "scrypt" }, "password", h2));
});

Deno.test("verify() rejects a wrong password for every algorithm", () => {
  const hArgon2 = hash(
    { name: AlgorithmName.Argon2, memoryCost: 8192, timeCost: 1 },
    "password",
  );
  assert(verify("argon2", "password", hArgon2));
  assertFalse(verify("argon2", "wrong password", hArgon2));

  const hBcrypt = hash({ name: AlgorithmName.Bcrypt, cost: 4 }, "password");
  assert(verify("bcrypt", "password", hBcrypt));
  assertFalse(verify("bcrypt", "wrong password", hBcrypt));

  const hScrypt = hash({ name: AlgorithmName.Scrypt, logN: 1 }, "password");
  assert(verify("scrypt", "password", hScrypt));
  assertFalse(verify("scrypt", "wrong password", hScrypt));
});

Deno.test("algorithm options are forwarded to the underlying implementation", () => {
  // argon2: the algorithm variant and costs are embedded in the hash.
  assertMatch(
    hash(
      { name: AlgorithmName.Argon2, algorithm: "argon2i", memoryCost: 8192 },
      "password",
    ),
    /^\$argon2i\$v=19\$m=8192,t=2,p=1\$/,
  );
  // bcrypt: the cost is embedded in the hash.
  assertMatch(
    hash({ name: AlgorithmName.Bcrypt, cost: 4 }, "password"),
    /^\$2b\$04\$/,
  );
  // scrypt: the work factors are embedded in the hash.
  assertMatch(
    hash(
      { name: AlgorithmName.Scrypt, logN: 10, blockSize: 8, parallelism: 1 },
      "password",
    ),
    /^\$scrypt\$ln=10,r=8,p=1\$/,
  );
});

Deno.test("hash() produces a different hash each call for every algorithm", () => {
  const argon2A = hash(
    { name: AlgorithmName.Argon2, memoryCost: 8192, timeCost: 1 },
    "password",
  );
  const argon2B = hash(
    { name: AlgorithmName.Argon2, memoryCost: 8192, timeCost: 1 },
    "password",
  );
  assert(argon2A !== argon2B);

  const bcryptA = hash({ name: AlgorithmName.Bcrypt, cost: 4 }, "password");
  const bcryptB = hash({ name: AlgorithmName.Bcrypt, cost: 4 }, "password");
  assert(bcryptA !== bcryptB);

  const scryptA = hash({ name: AlgorithmName.Scrypt, logN: 1 }, "password");
  const scryptB = hash({ name: AlgorithmName.Scrypt, logN: 1 }, "password");
  assert(scryptA !== scryptB);
});

Deno.test("AlgorithmName values are valid algorithm identifiers", () => {
  for (
    const name of [
      AlgorithmName.Argon2,
      AlgorithmName.Bcrypt,
      AlgorithmName.Scrypt,
    ]
  ) {
    assert(verify(name, "password", hash(name, "password")), name);
  }
});
