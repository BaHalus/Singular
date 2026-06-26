export function cloneEquipmentPortableValue(value, label) {
  assertEquipmentPortableValue(value, label, new WeakSet());
  return JSON.parse(JSON.stringify(value));
}

export function assertEquipmentPortableValue(
  value,
  label,
  ancestors = new WeakSet(),
) {
  if (value === null) return true;

  const type = typeof value;
  if (type === "string" || type === "boolean") return true;
  if (type === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error(`${label} must be JSON portable`);
    }
    return true;
  }
  if (type !== "object") {
    throw new Error(`${label} must be JSON portable`);
  }

  if (ancestors.has(value)) {
    throw new Error(`${label} must be JSON portable`);
  }
  ancestors.add(value);

  if (Array.isArray(value)) {
    validateEquipmentDenseArray(value, label);
    value.forEach((item, index) =>
      assertEquipmentPortableValue(item, `${label}[${index}]`, ancestors),
    );
    ancestors.delete(value);
    return true;
  }

  if (!isEquipmentPlainObject(value)) {
    throw new Error(`${label} must be JSON portable`);
  }
  validatePlainObjectOwnKeys(value, label);
  for (const [key, item] of Object.entries(value)) {
    assertEquipmentPortableValue(item, `${label}.${key}`, ancestors);
  }
  ancestors.delete(value);
  return true;
}

export function validateEquipmentDenseArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new Error(`${label} must not contain sparse entries`);
    }
  }

  const expectedKeys = new Set([
    "length",
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !expectedKeys.has(key)) {
      throw new Error(`${label} must not contain non-index properties`);
    }
  }

  return true;
}

export function requireEquipmentPlainObject(value, label) {
  if (!isEquipmentPlainObject(value)) {
    throw new Error(`${label} must be an object`);
  }
  return true;
}

export function isEquipmentPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validatePlainObjectOwnKeys(value, label) {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new Error(`${label} must be JSON portable`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) {
      throw new Error(`${label} must be JSON portable`);
    }
  }
}
