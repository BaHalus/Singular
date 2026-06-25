import test from "node:test";
import assert from "node:assert/strict";

import { createLibraryRegistry } from "./LibraryRegistry.js";
import {
  createLibraryPackage,
  exportLibraryPackage,
  getLibraryPackageKind,
  getLibraryPackageSchemaVersion,
  importLibraryPackage,
  serializeLibraryPackage,
  validateLibraryPackage,
} from "./LibraryPackage.js";

function createSpellRegistry() {
  return createLibraryRegistry({
    definitions: [
      {
        id: "spell-light",
        domain: "spell",
        name: "Luz",
        payload: {
          cost: 1,
        },
        tags: ["magic"],
      },
    ],
  });
}

test("exports a Library registry as a portable package", () => {
  const registry = createSpellRegistry();
  const libraryPackage = exportLibraryPackage(registry, {
    metadata: {
      title: "Magias básicas",
      exportedAt: "2026-06-25T23:30:00.000Z",
    },
  });

  assert.equal(libraryPackage.kind, getLibraryPackageKind());
  assert.equal(libraryPackage.schemaVersion, getLibraryPackageSchemaVersion());
  assert.equal(libraryPackage.metadata.title, "Magias básicas");
  assert.equal(libraryPackage.registry.definitions[0].id, "spell-light");
  assert.equal(Object.isFrozen(libraryPackage), true);
  assert.equal(Object.isFrozen(libraryPackage.registry.definitions[0]), true);
});

test("imports a serialized Library package back into a validated registry", () => {
  const registry = createSpellRegistry();
  const exported = exportLibraryPackage(registry, {
    metadata: {
      title: "Roundtrip",
    },
  });
  const serialized = serializeLibraryPackage(exported);
  const importedRegistry = importLibraryPackage(serialized);

  assert.notEqual(importedRegistry, registry);
  assert.deepEqual(
    importedRegistry.definitions.map(definition => definition.id),
    ["spell-light"],
  );
  assert.equal(importedRegistry.definitions[0].payload.cost, 1);
});

test("normalizes package input through the canonical registry contract", () => {
  const libraryPackage = createLibraryPackage({
    registry: {
      definitions: [
        {
          id: "trait-combat-reflexes",
          domain: "trait",
          name: "Reflexos em Combate",
        },
      ],
    },
  });

  validateLibraryPackage(libraryPackage);
  assert.equal(libraryPackage.metadata !== null, true);
  assert.deepEqual(libraryPackage.registry.definitions[0].payload, {});
});

test("rejects unsupported package versions and non-portable metadata", () => {
  assert.throws(
    () => createLibraryPackage({ schemaVersion: 2, registry: {} }),
    /schemaVersion is unsupported/,
  );

  assert.throws(
    () => createLibraryPackage({
      metadata: {
        invalid: () => true,
      },
      registry: {},
    }),
    /portable JSON values/,
  );
});

test("preserves Library registry conflict rules during import", () => {
  assert.throws(
    () => importLibraryPackage({
      registry: {
        definitions: [
          {
            id: "spell-light-1",
            domain: "spell",
            name: "Luz",
            externalIds: {
              gcs: "spell-light",
            },
          },
          {
            id: "spell-light-2",
            domain: "spell",
            name: "Luz duplicada",
            externalIds: {
              gcs: "spell-light",
            },
          },
        ],
      },
    }),
    /external identity conflict/,
  );
});
