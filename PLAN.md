# DOMParser Implementation Plan

## Overview
Add DOMParser API implementation in a new `./dom` namespace with Rust/WASM, following the pattern used by the `json` namespace.

## Checklist

### Phase 1: Setup & Planning
- [x] Explore existing repository structure (json namespace, wasm build system)
- [x] Understand the pattern: Rust crate in _wasm/ -> generates WASM -> TypeScript wrapper
- [x] Create PLAN.md with all steps
- [ ] Create and checkout branch `vibe/domparser`

### Phase 2: Repository Structure
- [ ] Create `dom/` directory
- [ ] Create `dom/deno.json` package configuration
- [ ] Create `dom/mod.ts` exports
- [ ] Create `dom/README.md` documentation
- [ ] Add `dom` to root `deno.json` workspace
- [ ] Add `@stdext/dom` to root `deno.json` imports

### Phase 3: Rust Implementation
- [ ] Create `_wasm/dom_domparser/` directory
- [ ] Create `_wasm/dom_domparser/Cargo.toml`
- [ ] Create `_wasm/dom_domparser/src/lib.rs` with DOMParser implementation
- [ ] Add `dom_domparser` to `_wasm/Cargo.toml` workspace members
- [ ] Add required dependencies to `_wasm/Cargo.toml` (e.g., wasm-bindgen, js-sys for DOM types)

### Phase 4: TypeScript Wrapper
- [ ] Create `dom/domparser.ts` TypeScript wrapper
- [ ] Import and re-export from generated WASM bindings
- [ ] Add proper TypeScript types for DOMParser API

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
- [ ] Commit initial setup (PLAN.md, branch, directory structure)
- [ ] Commit Rust implementation
- [ ] Commit TypeScript wrapper
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

Potential crates for parsing:
- `html5ever` - HTML parser
- `xml-rs` or `quick-xml` - XML parsers
- `wasm-bindgen` - for JS interop
- `js-sys` - for DOM types (Document, Node, etc.)

However, since we're in WASM and need to return a Document that works in JS, we have two approaches:
1. Use `js-sys` to create actual browser DOM Document objects (only works in browser)
2. Create a custom Document-like structure that can be serialized to JS

Given the project supports Node, Deno, Edge runtimes and Browser, approach #2 is more portable.

## Implementation Strategy

We'll create a minimal Document-like structure in Rust that can be serialized to JS objects, representing the parsed DOM tree.
