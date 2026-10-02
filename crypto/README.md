# @stdext/crypto

Extends [@std/crypto](https://jsr.io/@std/crypto)

The Crypto package contains utilities for encryption and decryption as well as
hashing.

## Entrypoints

### Hash

The hash module contains helpers and implementations for password hashing.

> The hash methods are written in Rust and compiled to WASM.

The following algorithms are provided:

- Argon2
- Bcrypt
- Scrypt

```ts
import { AlgorithmName, hash, verify } from "@stdext/crypto/hash";

// By name, using default options
const h = hash("argon2", "password");
verify("argon2", "password", h);

// With options
const hWithOptions = hash({ name: "argon2", algorithm: "argon2i" }, "password");
verify(
  { name: AlgorithmName.Argon2, algorithm: "argon2i" },
  "password",
  hWithOptions,
);
```

Hashes can also be imported individually, although this should not be needed if
tree shaking is available in your build process.

```ts
import { hash, verify } from "@stdext/crypto/hash/argon2";

const h = hash("password", {});
verify("password", h, {});
```

### HOTP (HMAC One-Time Password)

```ts
import { generateHotp, verifyHotp } from "@stdext/crypto/hotp";
import { generateSecret } from "@stdext/crypto/utils";

const secret = generateSecret(32);
const hotp = await generateHotp(secret, 42);
const isValid = await verifyHotp(hotp, secret, 42);
```

### TOTP (Time-based One-Time Password)

```ts
import { generateTotp, verifyTotp } from "@stdext/crypto/totp";
import { generateSecret } from "@stdext/crypto/utils";

const secret = generateSecret(32);
const totp = await generateTotp(secret);
const isValid = await verifyTotp(totp, secret);
```

### Utils

```ts
import { generateSecretBytes } from "@stdext/crypto/utils";
import { encodeBase64 } from "@std/encoding";

const secretBytes = generateSecretBytes();
// You can select your own encoding
const encodedSecret = encodeBase64(secretBytes);
```
