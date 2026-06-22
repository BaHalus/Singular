import test from "node:test";
import assert from "node:assert/strict";

import {
  getRepositoryPortMethods,
  validateCharacterRepository,
  validateRepositoryPort,
  validateSessionRepository,
} from "./RepositoryPorts.js";

function repository() {
  return {
    async load() {
      return null;
    },
    async save(value) {
      return value;
    },
    async remove() {
      return false;
    },
    async listIds() {
      return [];
    },
  };
}

test("validates the common repository contract", () => {
  const port = repository();

  assert.equal(validateRepositoryPort(port), true);
  assert.equal(validateCharacterRepository(port), true);
  assert.equal(validateSessionRepository(port), true);
  assert.deepEqual(getRepositoryPortMethods(), [
    "load",
    "save",
    "remove",
    "listIds",
  ]);
  assert.equal(Object.isFrozen(getRepositoryPortMethods()), true);
});

test("rejects missing or non-callable repository methods", () => {
  for (const method of getRepositoryPortMethods()) {
    const missing = repository();
    delete missing[method];
    assert.throws(
      () => validateRepositoryPort(missing, "Test repository"),
      new RegExp(`Test repository ${method} must be a function`),
    );

    const invalid = repository();
    invalid[method] = null;
    assert.throws(
      () => validateRepositoryPort(invalid, "Test repository"),
      new RegExp(`Test repository ${method} must be a function`),
    );
  }
});

test("rejects non-object repository ports", () => {
  for (const value of [null, undefined, [], "repository", () => {}]) {
    assert.throws(
      () => validateRepositoryPort(value),
      /Repository must be a plain object/,
    );
  }
});
