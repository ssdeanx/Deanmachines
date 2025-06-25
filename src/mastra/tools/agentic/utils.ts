export function hasProp<T>(
  target: T | undefined,
  key: keyof T
): key is keyof T {
  return Boolean(target) && Object.prototype.hasOwnProperty.call(target, key);
}

// Add a helper function to check if value is an object
function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getProp<T = unknown>(
  target: unknown,
  paths: readonly PropertyKey[],
  defaultValue: T | undefined = undefined
): T | undefined {
  let value: unknown = target;
  if (!value) {
    return undefined;
  }

  for (const key of paths) {
    if (!isObject(value) || !(key in value)) {
      return defaultValue;
    }
    value = value[key];
  }
  return value as T;
}

export function castArray<T>(arr: T) {
  const result = Array.isArray(arr) ? arr : [arr];
  return result as T extends unknown[] ? T : [T];
}
