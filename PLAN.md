# DOMParser Implementation Plan

## Overview
Add DOMParser API implementation in a new `./dom` namespace with Rust/WASM, following the pattern used by the `json` namespace.

## Checklist

### Phase 1: Setup & Planning
- [x] Explore existing repository structure (json namespace, wasm build system)
- [x] Understand the pattern: Rust crate in _wasm/ -> generates WASM -> TypeScript wrapper
- [x] Create PLAN.md with all steps
- [x] Create and checkout branch `vibe/domparser`
- [x] Push initial PLAN.md commit

### Phase 2: Repository Structure
- [x] Create `dom/` directory
- [x] Create `dom/deno.json` package configuration
- [x] Create `dom/mod.ts` exports
- [x] Create `dom/README.md` documentation
- [x] Add `dom` to root `deno.json` workspace
- [x] Add `@stdext/dom` to root `deno.json` imports

### Phase 3: Rust Implementation
- [x] Create `_wasm/dom_domparser/` directory
- [x] Create `_wasm/dom_domparser/Cargo.toml`
- [x] Create `_wasm/dom_domparser/src/lib.rs` with DOMParser implementation
- [x] Add `dom_domparser` to `_wasm/Cargo.toml` workspace members
- [x] Add required dependencies to `_wasm/Cargo.toml` (html5ever, markup5ever_rcdom, tendril)

### Phase 4: TypeScript Wrapper
- [x] Create `dom/domparser.ts` TypeScript wrapper
- [x] Import and re-export from generated WASM bindings
- [x] Add proper TypeScript types for DOMParser API

### Phase 5: Testing
- [x] Create `dom/domparser.test.ts` with tests
- [x] Test basic parseFromString functionality
- [x] Test error handling

### Phase 6: Build & Verify
- [x] Build WASM using cargo
- [x] Generate bindings using wasm-bindgen
- [x] Verify generated files appear in `dom/_wasm/`
- [ ] Run `deno task check` to verify TypeScript (requires deno)
- [ ] Run `deno task test` for dom package (requires deno)

### Phase 7: Commits
- [x] Commit initial setup (PLAN.md, branch, directory structure)
- [x] Commit Rust implementation & TypeScript wrapper
- [ ] Commit tests and WASM build
- [ ] Commit build verification

## DOMParser API Spec (from MDN)

The DOMParser interface provides the ability to parse XML or HTML source code from a string into a DOM Document.

### Constructor
```
new DOMParser()
```

### Methods
```
Document parseFromString(string, contentType)
```
- string: The DOMString to be parsed
- contentType: The type of content (e.g., "text/html", "text/xml", "application/xml", "application/xhtml+xml", "image/svg+xml")
- Returns: A Document

### Notes
- For HTML parsing, we need to use the browser's DOM implementation or a HTML parser crate
- For XML parsing, we can use a Rust XML parser crate
- The implementation should return a Document object that can be queried

## Rust Crate Considerations

Using html5ever and markup5ever_rcdom crates for HTML parsing. The implementation parses HTML/XML strings into a custom serializable Document structure that can be used across all runtimes (Node, Deno, Browser).

## Implementation Strategy

The Rust implementation uses html5ever to parse HTML content into an RcDom, then converts it to a custom JsDocument/JsNode structure that can be serialized to JSON and returned to JavaScript. This approach is portable across all supported runtimes.

## Current Status

- Rust implementation complete with html5ever parser
- TypeScript wrapper complete
- WASM generated and bindings created
- Tests written but not yet run (deno not available in build environment)
- Need to verify with actual deno runtime
