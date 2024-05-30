# Deno Standard Library Extended

[![JSR @stdext](https://jsr.io/badges/@stdext)](https://jsr.io/@stdext)
[![codecov](https://codecov.io/gh/halvardssm/deno_stdext/graph/badge.svg?token=T1JEMGF8VW)](https://codecov.io/gh/halvardssm/deno_stdext)
[![ci](https://github.com/halvardssm/deno_stdext/actions/workflows/ci.yml/badge.svg)](https://github.com/halvardssm/deno_stdext/actions/workflows/ci.yml)

An extension of the
[Deno Standard Library](https://github.com/denoland/deno_std).

Multiple languages such as Rust, Go and PHP offer a standard library, which
allows the reduction of third-party libraries. This project is used to extend
the Deno STD, with functions that are not accepted in the main library, but
which are provided in the standard library of other languages.

## Installation

Add the JSR package.

```
deno add @stdext/[package]
```

Example:

```
deno add @stdext/encoding
```

## Usage

Import the module or sub-module.

```ts
import { dump } from "@stdext/encoding/hex";

const buffer = new TextEncoder().encode(
  "The quick brown fox jumps over the lazy dog.",
);
console.log(dump(buffer));
// 00000000  54 68 65 20 71 75 69 63  6b 20 62 72 6f 77 6e 20  |The quick brown |
// 00000010  66 6f 78 20 6a 75 6d 70  73 20 6f 76 65 72 20 74  |fox jumps over t|
// 00000020  68 65 20 6c 61 7a 79 20  64 6f 67 2e              |he lazy dog.|
```

## Packages

- [collections](https://jsr.io/@stdext/collections): The collections package
  contains commonly used utilities and structures
- [crypto](https://jsr.io/@stdext/crypto): The crypto package contains utility
  for crypto and hashing
- [encoding](https://jsr.io/@stdext/encoding): The encoding package contains
  utility for text encoding.
- [http](https://jsr.io/@stdext/http): The http package contains utility for
  fetching and http servers
- [sql](https://jsr.io/@stdext/sql): The SQL package contains a standard
  interface for SQL based databases

## Versioning

We follow the semantic versioning scheme. We will share major versions with Deno
STD, but minor and patch versions will be separated.

## Dependencies

We allow the following dependencies for JS:

- [Deno Standard Library](https://github.com/denoland/deno_std)

We allow no additional third-party dependencies for JS, thus all code must be
implemented.

For modules that use Rust to compile to WASM, we allow the usage of third-party
crates if necessary, but this will be considered on a case-by-case basis.

## Deprecation Policy

We follow the
[Deno STD Deprecation Policy](https://github.com/denoland/deno_std?tab=readme-ov-file#deprecation-policy).

When functionalities are adopted either by JavaScript language APIs, new Web
Standard APIs or Deno STD, we mark the functions as deprecated, and will remove
these earliest after 3 minor iterations (sometimes can take longer).

For deprecated functions and modules, and their replacement, see the
[deprecation document](./DEPRECATIONS.md).

## Contributing

To contribute, first open an issue to describe the addition. After getting
feedback and approval, open a PR linking to the issue.

Code that is copied from other places, must be credited and is only allowed if
the license allows for it.

## Acknowledgments

This repo is an extension of the Deno STD and is therefore heavily based on it.
Code tools and setup are based on work done by the Deno Team.
