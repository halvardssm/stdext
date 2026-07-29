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
import { hash, verify } from "@stdext/crypto/hash";
const h = hash("argon2", "password");
verify("argon2", "password", h);

// With options

const h = hash({ name: "argon2", algorithm: "argon2i" }, "password");
verify({ name: AlgorithmName.Argon2, algorithm: "argon2i" }, "password", h);
```

Hashes can also be imported individually, although this should not be needed if
tree shaking is available in your build process.

```ts
import { hash, verify } from "@stdext/crypto/hash/argon2";
const h = hash("password", options);
verify("password", h, options);
```

### HOTP (HMAC One-Time Password)

```ts
import { generateHotp, verifyHotp } from "@stdext/crypto/hotp";
import { generateSecret } from "@stdext/crypto/utils";

const secret = generateSecret();
const hotp = generateHotp(secret, 42);
verifyHotp(hotp, secret, 42);
```

### TOTP (Time-based One-Time Password)

```ts
import { generateTotp, verifyTotp } from "@stdext/crypto/totp";
import { generateSecret } from "@stdext/crypto/utils";

const secret = generateSecret();
const totp = generateTotp(secret, 42);
verifyTotp(totp, secret, 42);
```

### Utils

```ts
import { generateSecretBytes } from "@stdext/crypto/utils";
import { encodeBase64 } from "@std/encoding";

const secretBytes = generateSecretBytes();
// You can select your own encoding
const encodedSecret = encodeBase64(secretBytes);
```
