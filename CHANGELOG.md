# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- feat(crypto): added TOTP and HOTP
- deprecated(http/header): Deprecated @stdext/http/header as it is added to
  @std/http/header
- deprecated(http/method): Deprecated @stdext/http/method as it is added to
  @std/http/method

## [0.0.5] - 2024-05-06

### Changed

- feat(crypto/hash): added scrypt hashing algorithm

## [0.0.4] - 2024-05-06

### Changed

- refactor(crypto/hash): crypto hash to allign with the signature of WebCrypto

## [0.0.3] - 2024-04-29

### Added

- feat(http): added package
- feat(http/header): added IANA HTTP headers
- feat(http/method): added IANA HTTP methods
- feat(crypto): added package
- feat(http/hash): added argon2 hash
- feat(http/hash): added bcrypt hash

## [0.0.2] - 2024-04-28

### Added

- chore(core): added documentation

## [0.0.1] - 2024-04-28

### Added

- feat(core): implemented initial codebase
- feat(encoding): added package
- feat(encoding/hex): added hexdump
