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
- [x] Commit all changes to branch
- [ ] Run `deno task check` to verify TypeScript (requires deno runtime)
- [ ] Run `deno task test` for dom package (requires deno runtime)

### Phase 7: Commits
- [x] Commit initial setup (PLAN.md, branch, directory structure)
- [x] Commit Rust implementation & TypeScript wrapper
- [x] Commit tests and WASM build
- [x] Push all commits to remote branch

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

Using html5ever and markup5ever_rcdom crates for HTML parsing. The implementation parses HTML/XML strings into a custom serializable Document structure that can be used across all runtimes (Node, Deno, Edge, Browser).

## Implementation Strategy

The Rust implementation uses html5ever to parse HTML content into an RcDom, then converts it to a custom JsDocument/JsNode structure that can be serialized to JSON and returned to JavaScript. This approach is portable across all supported runtimes.

## Current Status

✅ **Implementation Complete**

All major components are in place:
- Rust crate with DOMParser implementation using html5ever
- WASM module generated and bindings created
- TypeScript wrapper with proper types
- Test suite written
- All changes committed and pushed to `vibe/domparser` branch

**Note**: Full verification (running tests with deno) requires the deno runtime, which is not available in the current build environment. The implementation should be tested locally with:
```bash
deno task build:wasm
deno task check
deno task test
```

## Files Created/Modified

### New Files
- `dom/deno.json` - Package configuration
- `dom/mod.ts` - Package exports
- `dom/README.md` - Documentation
- `dom/domparser.ts` - TypeScript wrapper
- `dom/domparser.test.ts` - Test suite
- `_wasm/dom_domparser/Cargo.toml` - Rust crate configuration
- `_wasm/dom_domparser/src/lib.rs` - Rust implementation
- `dom/_wasm/dom_domparser.generated.*` - Generated WASM bindings

### Modified Files
- `deno.json` - Added dom to workspace and imports
- `_wasm/Cargo.toml` - Added dom_domparser to workspace and dependencies
- `_wasm/Cargo.lock` - Updated with new dependencies
