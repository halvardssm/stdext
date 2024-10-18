import { AssertionError } from "@std/assert";
import { assertIsObject, isObject } from "./is_object.ts";

/**
 * Check if an object has a property
 */
function hasProperty<T>(
  obj: T,
  property: PropertyKey,
  deep: boolean,
): boolean {
  let currentProto = obj;

  while (currentProto !== null && currentProto !== undefined) {
    if (Object.hasOwn(currentProto, property)) {
      return true;
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      currentProto,
      property,
    );
    if (descriptor !== undefined) {
      return true;
    }
    if (!deep) {
      return false;
    }
    currentProto = Object.getPrototypeOf(currentProto);
  }

  return false;
}

export function getKeyDiff(
  value: object,
  keys: Array<PropertyKey>,
  deep: boolean,
): Array<PropertyKey> {
  const diff: PropertyKey[] = [];

  for (const key of keys) {
    if (!hasProperty(value, key, deep)) {
      diff.push(key);
    }
  }

  return diff;
}

/**
 * Checks if an object has given property keys
 */
export function objectHasProperties<T extends PropertyKey = PropertyKey>(
  value: unknown,
  keys: Array<T>,
): value is Record<T, unknown> {
  if (!isObject(value)) {
    return false;
  }

  const diff = getKeyDiff(value, keys, false);

  return diff.length < 1;
}

/**
 * Asserts that an object has given property keys
 */
export function assertObjectHasProperties<T extends PropertyKey = PropertyKey>(
  value: unknown,
  keys: Array<T>,
  msg?: string,
): asserts value is Record<T, unknown> {
  assertIsObject(value);

  const diff = getKeyDiff(value, keys, false);

  if (diff.length > 0) {
    const msgSuffix = msg ? `: ${msg}` : ".";
    const message = `The object is missing the following keys: [${
      keys.map(String).join(",")
    }]${msgSuffix}`;
    throw new AssertionError(message);
  }
}

/**
 * Checks deeply if an object has given property keys
 *
 * Use when wanting to check for getters and other prototype
 * properties on multilevel inheritance
 */
export function objectHasPropertiesDeep<T extends PropertyKey = PropertyKey>(
  value: unknown,
  keys: Array<T>,
): value is Record<T, unknown> {
  if (!isObject(value)) {
    return false;
  }

  const diff = getKeyDiff(value, keys, true);

  return diff.length < 1;
}

/**
 * Asserts that an object has given property keys
 *
 * Use when wanting to check for getters and other prototype
 * properties on multilevel inheritance
 */
export function assertObjectHasPropertiesDeep<
  T extends PropertyKey = PropertyKey,
>(
  value: unknown,
  keys: Array<T>,
  msg?: string,
): asserts value is Record<T, unknown> {
  assertIsObject(value);

  const diff = getKeyDiff(value, keys, true);

  if (diff.length > 0) {
    const msgSuffix = msg ? `: ${msg}` : ".";
    const message = `The object is missing the following keys: [${
      keys.map(String).join(",")
    }]${msgSuffix}`;
    throw new AssertionError(message);
  }
}
