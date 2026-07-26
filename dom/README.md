# @stdext/dom

A DOM polyfill for Deno that implements the WHATWG DOM specification for APIs that are not available in Deno's runtime by default.

## Features

- **DOMParser**: Parse HTML and XML strings into Document objects
- **Document**: The root of the DOM tree
- **Element**: Base class for all HTML/XML elements
- **Node**: Base class for all DOM nodes
- **NodeList**: Collection of nodes
- **HTMLCollection**: Collection of elements
- **DOMTokenList**: Manages space-separated tokens (like classList)
- **NamedNodeMap**: Collection of attributes

## Usage

```typescript
import { DOMParser } from "@stdext/dom";

// Parse HTML
const parser = new DOMParser();
const doc = parser.parseFromString(`
  <html>
    <head><title>Test</title></head>
    <body>
      <h1 id="header">Hello World</h1>
      <p class="content">This is a test.</p>
    </body>
  </html>
`, "text/html");

// Access document properties
console.log(doc.documentElement?.tagName); // "HTML"
console.log(doc.getElementById("header")?.textContent); // "Hello World"

// Parse XML
const xmlDoc = parser.parseFromString(`
  <root>
    <item>First</item>
    <item>Second</item>
  </root>
`, "text/xml");

console.log(xmlDoc.documentElement?.tagName); // "ROOT"
```

## Supported Content Types

The `DOMParser.parseFromString()` method supports the following content types:

- `text/html` - HTML documents
- `text/xml` - XML documents
- `application/xml` - XML documents
- `application/xhtml+xml` - XHTML documents
- `image/svg+xml` - SVG documents

## Implemented Interfaces

### Core DOM
- [x] Node
- [x] Document
- [x] Element
- [x] Attr
- [x] Text
- [x] CDATASection
- [x] Comment
- [x] ProcessingInstruction
- [x] DocumentFragment
- [x] DocumentType

### Collections
- [x] NodeList
- [x] HTMLCollection
- [x] NamedNodeMap
- [x] DOMTokenList

### Parsing
- [x] DOMParser

### Other
- [x] DOMException
- [x] DOMRect
- [x] DOMRectList

## Limitations

This is a server-side DOM implementation and has the following limitations:

1. **No Layout Information**: Properties like `clientWidth`, `offsetWidth`, etc. return 0
2. **No CSS Support**: Style-related properties are not fully implemented
3. **Simplified Parsing**: The HTML/XML parsers are basic implementations and may not handle all edge cases
4. **No Event System**: DOM events are not implemented
5. **No Browser APIs**: APIs like `Window`, `Location`, etc. are not available

## Browser Compatibility

This package is designed for Deno but should work in other JavaScript environments that don't have DOM APIs.

## License

MIT
