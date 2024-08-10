import { hash, verify } from "./hash.ts";

Deno.bench("hash() with argon2", () => {
  hash("argon2", "password");
});

Deno.bench("hash() with bcrypt", () => {
  hash("bcrypt", "password");
});

Deno.bench("hash() with scrypt", () => {
  hash("scrypt", "password");
});

Deno.bench("verify() with argon2", () => {
  verify(
    "argon2",
    "password",
    "$argon2id$v=19$m=19456,t=2,p=1$sgg3gflK2pkatSfTYkQTtA$UvKPnIcKDBfK9d4v4ItjRYra//s9uuFJgMisTNC+Wcw",
  );
});

Deno.bench("verify() with bcrypt", () => {
  verify(
    "bcrypt",
    "password",
    "$2b$12$GUvwcP3VbNvmKDzl114sW.DVt.1xX9N7OmWk80OWLjigWIW/3n66G",
  );
});

Deno.bench("verify() with scrypt", () => {
  verify(
    "scrypt",
    "password",
    "$scrypt$ln=17,r=8,p=1$y8d9gN0rKwW7z+hJb/vQAA$w+VLelvZVpZ0zt/+svlPbZFHDTl+jL5Xvp+YKrZEyKE",
  );
});
