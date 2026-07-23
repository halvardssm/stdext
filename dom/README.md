# @stdext/dom

The dom package provides DOM-related utilities, including the DOMParser API for parsing HTML and XML strings into Document objects.

## DOMParser

The DOMParser interface provides the ability to parse XML or HTML source code from a string into a DOM Document.

### Usage

```ts
import { DOMParser } from "@stdext/dom";

const parser = new DOMParser();
const doc = parser.parseFromString("<html><body>Hello</body></html>", "text/html");
console.log(doc.documentElement.tagName); // "HTML"
```

### API

#### `new DOMParser()`
Creates a new DOMParser instance.

#### `parseFromString(string, contentType)`
Parses a string into a Document.

- `string`: The string to parse
- `contentType`: The content type (e.g., "text/html", "text/xml", "application/xml")
- Returns: A `Document` object

### Supported Content Types

- `text/html` - HTML parsing
- `text/xml` - XML parsing
- `application/xml` - XML parsing
- `application/xhtml+xml` - XHTML parsing
- `image/svg+xml` - SVG parsing
