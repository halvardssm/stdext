# DOMParser Implementation Plan

## Overview
Add DOMParser API implementation in a new `./dom` namespace with Rust/WASM, following the pattern used by the `json` namespace. This implementation will be fully compliant with the Web DOM API specification.

## Web DOM API Specification

### DOMParser Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/DOMParser)

#### Constructor
- `new DOMParser()` - Creates a new DOMParser instance

#### Methods
- `parseFromString(string, contentType)` - Parses a string into a Document
  - Parameters:
    - `string`: The DOMString to be parsed
    - `contentType`: The type of content (e.g., "text/html", "text/xml", "application/xml", "application/xhtml+xml", "image/svg+xml")
  - Returns: A `Document`

### Document Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Document)

#### Properties (Read-only)
- `doctype`: Returns the DocumentType for the document
- `documentElement`: Returns the Element that is the root element of the document
- `body`: Returns the <body> or <frameset> node of the current document
- `head`: Returns the <head> element of the current document
- `title`: Gets/sets the title of the document
- `URL`: Returns the document location as a string
- `referrer`: Returns the referrer of the document
- `lastModified`: Returns the date the page was last modified
- `characterSet`: Returns the character encoding of the document
- `contentType`: Returns the Content-Type from the MIME header of the current document

#### Methods
- `createElement(tagName)`: Creates an HTML element
- `createElementNS(namespaceURI, qualifiedName)`: Creates an element with a namespace
- `createTextNode(data)`: Creates a text node
- `createComment(data)`: Creates a comment node
- `createDocumentFragment()`: Creates a document fragment
- `getElementById(id)`: Returns the element with the specified ID
- `getElementsByClassName(className)`: Returns a live HTMLCollection of elements with the class name
- `getElementsByTagName(tagName)`: Returns a live HTMLCollection of elements with the tag name
- `getElementsByName(name)`: Returns a live NodeList of elements with the name attribute
- `querySelector(selectors)`: Returns the first element matching the selector
- `querySelectorAll(selectors)`: Returns a static NodeList of all elements matching the selector
- `importNode(externalNode, deep)`: Imports a node from another document
- `adoptNode(externalNode)`: Adopts a node from another document

### Node Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Node)

#### Properties (Read-only)
- `nodeType`: Returns the type of node
- `nodeName`: Returns the name of the node
- `nodeValue`: Gets/sets the value of the node
- `parentNode`: Returns the parent node
- `parentElement`: Returns the parent element
- `childNodes`: Returns a live NodeList of child nodes
- `firstChild`: Returns the first child node
- `lastChild`: Returns the last child node
- `previousSibling`: Returns the previous sibling node
- `nextSibling`: Returns the next sibling node
- `ownerDocument`: Returns the document object associated with the node
- `isConnected`: Returns a boolean indicating if the node is connected to the DOM

#### Methods
- `appendChild(node)`: Adds a child node
- `removeChild(node)`: Removes a child node
- `replaceChild(newNode, oldNode)`: Replaces a child node
- `insertBefore(newNode, referenceNode)`: Inserts a node before another
- `hasChildNodes()`: Returns a boolean indicating if the node has child nodes
- `cloneNode(deep)`: Clones a node
- `normalize()`: Normalizes the node (merges adjacent text nodes)
- `isEqualNode(otherNode)`: Returns a boolean indicating if two nodes are equal
- `isSameNode(otherNode)`: Returns a boolean indicating if two nodes are the same
- `compareDocumentPosition(otherNode)`: Compares the document position of two nodes
- `contains(otherNode)`: Returns a boolean indicating if a node contains another
- `lookupPrefix(namespaceURI)`: Returns the prefix for a namespace URI
- `lookupNamespaceURI(prefix)`: Returns the namespace URI for a prefix

### Element Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Element)

#### Properties
- `tagName`: Returns the tag name of the element
- `id`: Gets/sets the ID of the element
- `className`: Gets/sets the class of the element
- `classList`: Returns the class list of the element
- `attributes`: Returns a live NamedNodeMap of attributes
- `shadowRoot`: Returns the shadow root of the element
- `slot`: Gets/sets the slot of the element

#### Methods
- `getAttribute(name)`: Gets the value of an attribute
- `setAttribute(name, value)`: Sets the value of an attribute
- `removeAttribute(name)`: Removes an attribute
- `hasAttribute(name)`: Returns a boolean indicating if the element has an attribute
- `hasAttributes()`: Returns a boolean indicating if the element has attributes
- `getAttributeNS(namespaceURI, localName)`: Gets the value of a namespaced attribute
- `setAttributeNS(namespaceURI, qualifiedName, value)`: Sets the value of a namespaced attribute
- `removeAttributeNS(namespaceURI, localName)`: Removes a namespaced attribute
- `hasAttributeNS(namespaceURI, localName)`: Returns a boolean indicating if the element has a namespaced attribute
- `getElementsByClassName(className)`: Returns a live HTMLCollection of elements with the class name
- `getElementsByTagName(tagName)`: Returns a live HTMLCollection of elements with the tag name
- `getElementsByTagNameNS(namespaceURI, localName)`: Returns a live HTMLCollection of elements with the tag name and namespace
- `querySelector(selectors)`: Returns the first element matching the selector
- `querySelectorAll(selectors)`: Returns a static NodeList of all elements matching the selector
- `matches(selectors)`: Returns a boolean indicating if the element matches the selector
- `closest(selectors)`: Returns the closest ancestor matching the selector
- `insertAdjacentElement(position, element)`: Inserts an element at a specified position
- `insertAdjacentText(position, text)`: Inserts text at a specified position
- `insertAdjacentHTML(position, html)`: Inserts HTML at a specified position
- `getBoundingClientRect()`: Returns the bounding rectangle of the element
- `scrollIntoView(arg)`: Scrolls the element into view
- `focus()`: Focuses the element
- `blur()`: Removes focus from the element
- `click()`: Simulates a click on the element

### HTMLElement Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)

Extends Element with HTML-specific properties and methods.

#### Properties
- `innerHTML`: Gets/sets the HTML content of the element
- `outerHTML`: Gets/sets the HTML content of the element including itself
- `innerText`: Gets/sets the text content of the element
- `outerText`: Gets/sets the text content of the element including itself
- `textContent`: Gets/sets the text content of the node and its descendants

### Text Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Text)

Extends CharacterData with text-specific properties.

#### Properties
- `wholeText`: Gets/sets the text of the node and its descendants

### Comment Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Comment)

Extends CharacterData with comment-specific properties.

### DocumentFragment Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment)

Extends Node with fragment-specific properties.

### NamedNodeMap Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap)

Represents a collection of attributes.

#### Properties
- `length`: Returns the number of attributes

#### Methods
- `getNamedItem(name)`: Returns the attribute with the specified name
- `setNamedItem(attr)`: Sets the attribute with the specified name
- `removeNamedItem(name)`: Removes the attribute with the specified name
- `item(index)`: Returns the attribute at the specified index
- `getNamedItemNS(namespaceURI, localName)`: Returns the namespaced attribute
- `setNamedItemNS(attr)`: Sets the namespaced attribute
- `removeNamedItemNS(namespaceURI, localName)`: Removes the namespaced attribute

### NodeList Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/NodeList)

Represents a collection of nodes.

#### Properties
- `length`: Returns the number of nodes

#### Methods
- `item(index)`: Returns the node at the specified index
- `forEach(callback)`: Executes a callback for each node

### HTMLCollection Interface (MDN: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection)

Represents a collection of elements.

#### Properties
- `length`: Returns the number of elements

#### Methods
- `item(index)`: Returns the element at the specified index
- `namedItem(name)`: Returns the element with the specified name or ID

## Implementation Checklist

### Phase 1: Core Infrastructure (COMPLETED)
- [x] Repository structure
- [x] Rust crate setup
- [x] WASM build pipeline
- [x] Basic DOMParser with parseFromString
- [x] HTML parsing (html5ever)
- [x] XML parsing (quick-xml)
- [x] Content type handling

### Phase 2: Node Interface
- [ ] Add parentNode property
- [ ] Add parentElement property
- [ ] Add childNodes property (live NodeList)
- [ ] Add firstChild property
- [ ] Add lastChild property
- [ ] Add previousSibling property
- [ ] Add nextSibling property
- [ ] Add ownerDocument property
- [ ] Add isConnected property
- [ ] Add appendChild method
- [ ] Add removeChild method
- [ ] Add replaceChild method
- [ ] Add insertBefore method
- [ ] Add hasChildNodes method
- [ ] Add cloneNode method
- [ ] Add normalize method
- [ ] Add isEqualNode method
- [ ] Add isSameNode method
- [ ] Add compareDocumentPosition method
- [ ] Add contains method

### Phase 3: Document Interface
- [ ] Add doctype property
- [ ] Add body property
- [ ] Add head property
- [ ] Add title property (getter/setter)
- [ ] Add URL property
- [ ] Add referrer property
- [ ] Add lastModified property
- [ ] Add characterSet property
- [ ] Add contentType property
- [ ] Add createElement method
- [ ] Add createElementNS method
- [ ] Add createTextNode method
- [ ] Add createComment method
- [ ] Add createDocumentFragment method
- [ ] Add getElementById method
- [ ] Add getElementsByClassName method
- [ ] Add getElementsByTagName method
- [ ] Add getElementsByName method
- [ ] Add querySelector method
- [ ] Add querySelectorAll method
- [ ] Add importNode method
- [ ] Add adoptNode method

### Phase 4: Element Interface
- [ ] Add tagName property
- [ ] Add id property (getter/setter)
- [ ] Add className property (getter/setter)
- [ ] Add classList property
- [ ] Add attributes property (NamedNodeMap)
- [ ] Add getAttribute method
- [ ] Add setAttribute method
- [ ] Add removeAttribute method
- [ ] Add hasAttribute method
- [ ] Add hasAttributes method
- [ ] Add getAttributeNS method
- [ ] Add setAttributeNS method
- [ ] Add removeAttributeNS method
- [ ] Add hasAttributeNS method
- [ ] Add getElementsByClassName method
- [ ] Add getElementsByTagName method
- [ ] Add getElementsByTagNameNS method
- [ ] Add querySelector method
- [ ] Add querySelectorAll method
- [ ] Add matches method
- [ ] Add closest method

### Phase 5: HTMLElement Interface
- [ ] Add innerHTML property (getter/setter)
- [ ] Add outerHTML property (getter/setter)
- [ ] Add innerText property (getter/setter)
- [ ] Add textContent property (getter/setter)

### Phase 6: Collection Types
- [ ] Implement NodeList interface
- [ ] Implement HTMLCollection interface
- [ ] Implement NamedNodeMap interface

### Phase 7: Additional Node Types
- [ ] DocumentType implementation
- [ ] DocumentFragment implementation
- [ ] Attr implementation
- [ ] CharacterData implementation (base for Text, Comment)

### Phase 8: Testing
- [ ] Tests for Node interface methods
- [ ] Tests for Document interface methods
- [ ] Tests for Element interface methods
- [ ] Tests for HTMLElement interface properties
- [ ] Tests for collection types
- [ ] Tests for all node types

### Phase 9: Build & Verify
- [ ] Rebuild WASM with full implementation
- [ ] Regenerate bindings
- [ ] Run deno task check
- [ ] Run deno task test
- [ ] Verify all tests pass

## Implementation Order (Optimal)

1. **Node Interface** - Foundation for all DOM nodes
   - Properties: parentNode, parentElement, childNodes, firstChild, lastChild, previousSibling, nextSibling, ownerDocument, isConnected
   - Methods: appendChild, removeChild, replaceChild, insertBefore, hasChildNodes, cloneNode, normalize, isEqualNode, isSameNode, compareDocumentPosition, contains

2. **Document Interface** - Document-specific functionality
   - Properties: doctype, body, head, title, URL, referrer, lastModified, characterSet, contentType
   - Methods: createElement, createElementNS, createTextNode, createComment, createDocumentFragment, getElementById, getElementsByClassName, getElementsByTagName, getElementsByName, querySelector, querySelectorAll, importNode, adoptNode

3. **Element Interface** - Element-specific functionality
   - Properties: tagName, id, className, classList, attributes
   - Methods: getAttribute, setAttribute, removeAttribute, hasAttribute, hasAttributes, getAttributeNS, setAttributeNS, removeAttributeNS, hasAttributeNS, getElementsByClassName, getElementsByTagName, getElementsByTagNameNS, querySelector, querySelectorAll, matches, closest

4. **HTMLElement Interface** - HTML element extensions
   - Properties: innerHTML, outerHTML, innerText, textContent

5. **Collection Types** - NodeList, HTMLCollection, NamedNodeMap

6. **Additional Node Types** - DocumentType, DocumentFragment, Attr, CharacterData

## Current Status

✅ **Phase 1: Core Infrastructure - COMPLETE**
⏳ **Phase 2-9: Full DOM API Implementation - IN PROGRESS**

## Notes

- The implementation will use a custom Rust data structure that mirrors the DOM tree
- All methods will be implemented to work on this custom structure
- The WASM boundary will serialize/deserialize as needed
- TypeScript wrappers will provide the full DOM API surface
