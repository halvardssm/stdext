# @stdext/crypto

The Crypto package contains utilities for encryption and decryption as well as
hashing.

## Entrypoints

### Hash

The hash module contains helpers and implementations for password hashing.

The following algorithms are provided:

- Argon2
- Bcrypt

```ts
import { hash, verify } from "@stdext/crypto/hash";
const h = hash("argon2", "password");
verify("argon2", "password", h);
```
