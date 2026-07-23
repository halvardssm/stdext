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
- [x] Add required dependencies to `_wasm/Cargo.toml` (web-sys, js-sys)

### Phase 4: TypeScript Wrapper
- [x] Create `dom/domparser.ts` TypeScript wrapper
- [x] Import and re-export from generated WASM bindings
- [x] Add proper TypeScript types for DOMParser API

### Phase 5: Testing
- [ ] Create `dom/domparser.test.ts` with tests
- [ ] Test basic parseFromString functionality
- [ ] Test error handling

### Phase 6: Build & Verify
- [ ] Run `deno task build:wasm` to generate WASM files
- [ ] Verify generated files appear in `dom/_wasm/`
- [ ] Run `deno task check` to verify TypeScript
- [ ] Run `deno task test` for dom package

### Phase 7: Commits
- [x] Commit initial setup (PLAN.md, branch, directory structure)
- [ ] Commit Rust implementation & TypeScript wrapper
- [ ] Commit tests
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

Using web-sys crate which provides bindings to the browser's native DOMParser. This works in browser environments and provides direct access to the DOM API.

## Implementation Strategy

The Rust implementation uses web-sys to wrap the browser's native DOMParser. The TypeScript wrapper provides a clean API that matches the web standard.
