/**
 * DOMException implementation
 * Based on WHATWG DOM spec: https://dom.spec.whatwg.org/#interface-domexception
 */

export class DOMException extends Error {
  public code: number;

  constructor(message: string, name: string = "Error") {
    super(message);
    this.name = name;
    
    // Map name to code
    const codeMap: Record<string, number> = {
      "IndexSizeError": 1,
      "DOMStringSizeError": 2,
      "HierarchyRequestError": 3,
      "WrongDocumentError": 4,
      "InvalidCharacterError": 5,
      "NoDataAllowedError": 6,
      "NoModificationAllowedError": 7,
      "NotFoundError": 8,
      "NotSupportedError": 9,
      "InUseAttributeError": 10,
      "InvalidStateError": 11,
      "SyntaxError": 12,
      "InvalidModificationError": 13,
      "NamespaceError": 14,
      "InvalidAccessError": 15,
      "TypeMismatchError": 17,
      "SecurityError": 18,
      "NetworkError": 19,
      "AbortError": 20,
      "URLMismatchError": 21,
      "QuotaExceededError": 22,
      "TimeoutError": 23,
      "InvalidNodeTypeError": 24,
      "DataCloneError": 25,
    };
    
    this.code = codeMap[name] || 0;
  }
}
