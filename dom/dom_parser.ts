/**
 * DOMParser implementation
 * Based on WHATWG DOM spec: https://dom.spec.whatwg.org/#interface-domparser
 */

import { Document } from "./document.ts";
import { Element } from "./element.ts";
import { DOMException } from "./dom_exception.ts";

export class DOMParser {
  parseFromString(input: string, contentType: string): Document {
    // Validate contentType
    const validContentTypes = [
      "text/html",
      "text/xml",
      "application/xml",
      "application/xhtml+xml",
      "image/svg+xml",
    ];

    if (!validContentTypes.includes(contentType)) {
      throw new DOMException(
        `Failed to execute 'parseFromString' on 'DOMParser': The provided content type '${contentType}' is not supported.`,
        "NotSupportedError",
      );
    }

    const document = new Document();

    // Parse the input based on content type
    if (contentType === "text/html") {
      this._parseHTML(input, document);
    } else {
      // For XML content types, use XML parsing
      this._parseXML(input, document);
    }

    return document;
  }

  private _parseHTML(input: string, document: Document): void {
    // Simple HTML parser - this is a basic implementation
    // A full HTML parser would be much more complex
    
    const html = input.trim();
    if (!html) {
      return;
    }

    // Check if the input starts with <html>
    const startsWithHtml = html.toLowerCase().startsWith("<html");
    
    // Create document element
    const htmlElement = document.createElement("html");
    document.documentElement = htmlElement;
    document.appendChild(htmlElement);

    // Parse the content
    if (startsWithHtml) {
      // Skip the opening <html> tag and parse its content
      let i = html.indexOf(">");
      if (i !== -1) {
        i++; // Skip past the >
        const content = html.slice(i);
        this._parseHTMLContent(content, htmlElement, document, "html");
      }
    } else {
      // If the input doesn't have an html tag, we'll parse it as the content of the html element
      this._parseHTMLContent(html, htmlElement, document);
    }

    // Set document ready state
    document.readyState = "complete";
  }

  private _parseHTMLContent(html: string, parent: Element, document: Document, skipClosingTag?: string): void {
    let i = 0;
    let currentElement = parent;
    let inTag = false;
    let tagName = "";
    let inClosingTag = false;
    let textContent = "";

    while (i < html.length) {
      if (html[i] === "<") {
        // Save any accumulated text
        if (textContent.trim()) {
          currentElement.appendChild(document.createTextNode(textContent));
          textContent = "";
        }

        i++;
        if (html[i] === "/") {
          // Closing tag
          inClosingTag = true;
          i++;
        } else {
          inClosingTag = false;
        }

        inTag = true;
        tagName = "";

        // Extract tag name
        while (i < html.length && html[i] !== ">" && !/\s/.test(html[i])) {
          tagName += html[i];
          i++;
        }

        // Parse attributes
        const attributes: { name: string; value: string }[] = [];
        let attrName = "";
        let attrValue = "";
        let inAttrValue = false;
        let quoteChar = "";

        while (i < html.length && html[i] !== ">") {
          if (html[i] === "=") {
            i++;
            // Skip whitespace after =
            while (i < html.length && /\s/.test(html[i])) i++;
            
            if (i < html.length && (html[i] === '"' || html[i] === "'")) {
              quoteChar = html[i];
              i++;
              inAttrValue = true;
              attrValue = "";
              while (i < html.length && html[i] !== quoteChar) {
                attrValue += html[i];
                i++;
              }
              i++; // Skip closing quote
              inAttrValue = false;
            } else {
              // Unquoted attribute value
              while (i < html.length && !/\s>/.test(html[i])) {
                attrValue += html[i];
                i++;
              }
            }
            
            if (attrName) {
              attributes.push({ name: attrName, value: attrValue });
              attrName = "";
              attrValue = "";
            }
          } else if (/\s/.test(html[i])) {
            // Skip whitespace
            i++;
          } else {
            // Attribute name
            attrName = "";
            while (i < html.length && html[i] !== " " && html[i] !== "=" && html[i] !== ">") {
              attrName += html[i];
              i++;
            }
          }
        }

        if (inClosingTag) {
          // Close current element
          if (currentElement.parentNode) {
            currentElement = currentElement.parentNode as Element;
          }
          
          // If this is the skipClosingTag, we're done
          if (skipClosingTag && tagName.toLowerCase() === skipClosingTag.toLowerCase()) {
            break;
          }
        } else if (tagName) {
          // Create new element
          const newElement = document.createElement(tagName);
          
          // Set attributes
          for (const attr of attributes) {
            newElement.setAttribute(attr.name, attr.value);
          }
          
          currentElement.appendChild(newElement);
          currentElement = newElement;
        }

        inTag = false;
        i++;
      } else if (html[i] === ">") {
        i++;
      } else {
        textContent += html[i];
        i++;
      }
    }

    // Add any remaining text
    if (textContent.trim()) {
      currentElement.appendChild(document.createTextNode(textContent));
    }
  }

  private _parseXML(input: string, document: Document): void {
    // Simple XML parser - this is a basic implementation
    // A full XML parser would handle namespaces, CDATA, comments, etc.
    
    const xml = input.trim();
    if (!xml) {
      return;
    }

    // For XML, we'll create a simple document structure
    // This is a placeholder - a real implementation would parse XML properly
    
    // Try to detect the root element
    const rootMatch = xml.match(/^<([^\s>]+)/);
    if (rootMatch) {
      const rootTagName = rootMatch[1];
      const rootElement = document.createElement(rootTagName);
      document.documentElement = rootElement;
      document.appendChild(rootElement);

      // Parse child elements (simplified)
      this._parseXMLElement(xml, rootElement, document);
    }

    // Set document ready state
    document.readyState = "complete";
  }

  private _parseXMLElement(xml: string, parent: Element, document: Document): void {
    // This is a very simplified XML parser
    // It doesn't handle all XML features but provides basic functionality
    
    let i = 0;
    let depth = 0;
    let currentTag = "";
    let inTag = false;
    let inClosingTag = false;
    let textContent = "";

    while (i < xml.length) {
      if (xml[i] === "<") {
        // Save any accumulated text
        if (textContent.trim()) {
          parent.appendChild(document.createTextNode(textContent));
          textContent = "";
        }

        i++;
        if (xml[i] === "/") {
          inClosingTag = true;
          i++;
        } else {
          inClosingTag = false;
        }

        inTag = true;
        currentTag = "";

        // Extract tag name
        while (i < xml.length && xml[i] !== ">" && !/\s/.test(xml[i])) {
          currentTag += xml[i];
          i++;
        }

        // Skip attributes
        while (i < xml.length && xml[i] !== ">") {
          i++;
        }

        if (inClosingTag) {
          depth--;
          if (depth < 0) {
            break; // We've closed the root element
          }
        } else if (currentTag) {
          // Create new element
          const newElement = document.createElement(currentTag);
          parent.appendChild(newElement);
          depth++;
          
          // Recursively parse child elements
          // Find the content between the opening and closing tags
          const startPos = i + 1;
          const tagName = currentTag;
          let endPos = xml.indexOf(`</${tagName}>`, startPos);
          
          if (endPos === -1) {
            // Self-closing tag or malformed XML
            endPos = xml.indexOf(">", startPos);
          }
          
          if (endPos !== -1) {
            const content = xml.slice(startPos, endPos);
            this._parseXMLElement(content, newElement, document);
            i = endPos + tagName.length + 3; // Skip past closing tag
            continue;
          }
        }

        inTag = false;
        i++;
      } else {
        textContent += xml[i];
        i++;
      }
    }
  }
}
