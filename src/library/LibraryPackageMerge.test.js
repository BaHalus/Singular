import test from "node:test";
import assert from "node:assert/strict";

import { exportLibraryPackage } from "./LibraryPackage.js";
import {
  getLibraryPackageMergeSchemaVersion,
  mergeLibraryPackageIntoRegistry,
  validateLibraryPackageMergeResult,
} from "./LibraryPackageMerge.js";
import {
  createLibraryRegistry,
  serializeLibraryRegistry,
} from "./LibraryRegistry.js";

function spellDefinition(overrides = {}) {
  return {
    id: "spell-light",
    domain: "spell",
    name: "Luz",
    externalIds: {
      gcs: "spell-light",
    },
    payload: {
      cost: 1,
    },
    ...overrides,
  };
}

function traitDefinition(overrides = {}) {
  return {
    id: "trait-magery",
    domain: "trait",
    name: "Aptidão Mágica",
    payload: {
      levels: 1,
    },
    ...overrides,
  };
}

test("merges new package definitions additively without mutating the target", () => {
  const target = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const incoming = createLibraryRegistry({
    definitions: [traitDefinition()],
  });
  const libraryPackage = exportLibraryPackage(incoming, {
    metadata: {
      title: "Traits mágicos",
    },
  });

  const result = mergeLibraryPackageIntoRegistry(target, libraryPackage);

  assert.equal(result.schemaVersion, getLibraryPackageMergeSchemaVersion());
  assert.equal(result.status, "merged");
  assert.deepEqual(result.addedDefinitionIds, ["trait-magery"]);
  assert.deepEqual(result.unchangedDefinitionIds, []);
  assert.deepEqual(
    result.registry.definitions.map(definition => definition.id),
    ["spell-light", "trait-magery"],
  );
  assert.deepEqual(
    target.definitions.map(definition => definition.id),
    ["spell-light"],
  );
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.addedDefinitionIds), true);
  assert.equal(validateLibraryPackageMergeResult(result), true);
});

test("treats equivalent definitions as an idempotent no-op", () => {
  const target = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const libraryPackage = exportLibraryPackage(createLibraryRegistry({
    definitions: [spellDefinition({
      payload: {
        cost: 1,
      },
      externalIds: {
        gcs: "spell-light",
      },
    })],
  }));

  const result = mergeLibraryPackageIntoRegistry(target, libraryPackage);

  assert.equal(result.status, "no-op");
  assert.notEqual(result.registry, target);
  assert.deepEqual(
    serializeLibraryRegistry(result.registry),
    serializeLibraryRegistry(target),
  );
  assert.deepEqual(result.addedDefinitionIds, []);
  assert.deepEqual(result.unchangedDefinitionIds, ["spell-light"]);
});

test("does not freeze caller-owned serialized registries on no-op merges", () => {
  const target = serializeLibraryRegistry(createLibraryRegistry({
    definitions: [spellDefinition()],
  }));
  const libraryPackage = exportLibraryPackage(createLibraryRegistry({
    definitions: [spellDefinition()],
  }));

  const result = mergeLibraryPackageIntoRegistry(target, libraryPackage);

  assert.equal(result.status, "no-op");
  assert.notEqual(result.registry, target);
  assert.equal(Object.isFrozen(target), false);
  assert.equal(Object.isFrozen(target.definitions), false);
  assert.equal(Object.isFrozen(target.definitions[0]), false);
  assert.equal(Object.isFrozen(result.registry), true);

  target.definitions[0].name = "Luz alterada";
  assert.equal(result.registry.definitions[0].name, "Luz");
});

test("rejects divergent sovereign ids without exposing a partial merge", () => {
  const target = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const libraryPackage = exportLibraryPackage(createLibraryRegistry({
    definitions: [
      traitDefinition(),
      spellDefinition({
        name: "Luz Maior",
      }),
    ],
  }));

  assert.throws(
    () => mergeLibraryPackageIntoRegistry(target, libraryPackage),
    /Library definition id conflict: spell-light/,
  );

  assert.deepEqual(
    target.definitions.map(definition => definition.id),
    ["spell-light"],
  );
  assert.equal(target.definitions[0].name, "Luz");
});

test("rejects external identity conflicts atomically", () => {
  const target = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const libraryPackage = exportLibraryPackage(createLibraryRegistry({
    definitions: [
      traitDefinition(),
      {
        id: "spell-light-copy",
        domain: "spell",
        name: "Luz duplicada",
        externalIds: {
          gcs: "spell-light",
        },
      },
    ],
  }));

  assert.throws(
    () => mergeLibraryPackageIntoRegistry(target, libraryPackage),
    /Library external identity conflict: spell:gcs/,
  );

  assert.deepEqual(
    target.definitions.map(definition => definition.id),
    ["spell-light"],
  );
});

test("validates package input before attempting a merge", () => {
  const target = createLibraryRegistry();

  assert.throws(
    () => mergeLibraryPackageIntoRegistry(target, {
      kind: "other-package",
      registry: {},
    }),
    /Library package kind is unsupported/,
  );
});

test("rejects inconsistent merge result contracts", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition()],
  });

  assert.throws(
    () => validateLibraryPackageMergeResult({
      schemaVersion: 1,
      status: "no-op",
      registry,
      addedDefinitionIds: ["spell-light"],
      unchangedDefinitionIds: [],
    }),
    /status is inconsistent/,
  );

  assert.throws(
    () => validateLibraryPackageMergeResult({
      schemaVersion: 1,
      status: "merged",
      registry,
      addedDefinitionIds: ["missing-definition"],
      unchangedDefinitionIds: [],
    }),
    /references missing definition/,
  );
});
