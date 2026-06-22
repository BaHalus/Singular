const REPOSITORY_METHODS = ["load", "save", "remove", "listIds"];

export function validateCharacterRepository(repository) {
  return validateRepositoryPort(repository, "Character repository");
}

export function validateSessionRepository(repository) {
  return validateRepositoryPort(repository, "Session repository");
}

export function validateRepositoryPort(repository, label = "Repository") {
  if (!isPlainObject(repository)) {
    throw new Error(`${label} must be a plain object`);
  }

  for (const method of REPOSITORY_METHODS) {
    if (typeof repository[method] !== "function") {
      throw new Error(`${label} ${method} must be a function`);
    }
  }

  return true;
}

export function getRepositoryPortMethods() {
  return Object.freeze([...REPOSITORY_METHODS]);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
