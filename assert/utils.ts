/**
 * Compares the Object.prototype.toString of the value against the given name
 */
export function objectToStringEquals(name: string, value: unknown): boolean {
  const objectTag = `[object ${name}]`;
  return Object.prototype.toString.call(value) === objectTag;
}
