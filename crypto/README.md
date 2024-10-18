# @stdext/crypto

Extends [@std/crypto](https://jsr.io/@std/crypto)

The Crypto package contains utilities for encryption and decryption as well as
hashing.

## Entrypoints

### Hash

The hash module contains helpers and implementations for password hashing.

The following algorithms are provided:

- Argon2
- Bcrypt
- Scrypt

```ts
import { hash, verify } from "@stdext/crypto/hash";
const h = hash("argon2", "password");
verify("argon2", "password", h);
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
