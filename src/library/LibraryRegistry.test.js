import test from "node:test";
import assert from "node:assert/strict";

import {
  createLibraryRegistry,
  findLibraryDefinition,
  hasLibraryDefinition,
  listLibraryDefinitions,
  listLibraryDefinitionsByDomain,
  listLibraryDefinitionsByTag,
  registerLibraryDefinition,
  removeLibraryDefinition,
  serializeLibraryRegistry,
  validateLibraryRegistry,
} from "./LibraryRegistry.js";

function spellDefinition(overrides = {}) {
  return {
    id: "library-spell-fireball",
    externalIds: {
      gcs: "spell-fireball",
    },
    domain: "spell",
    name: "Bola de Fogo",
    version: "1.0.0",
    payload: {
      id: "spell-fireball",
      castingCost: "1",
    },
    tags: ["fire", "combat"],
    ...overrides,
  };
}

test("creates an empty immutable Library registry", () => {
  const registry = createLibraryRegistry();

  assert.deepEqual(registry, {
    schemaVersion: 1,
    definitions: [],
  });
  assert.equal(validateLibraryRegistry(registry), true);
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.definitions), true);
});

test("registers a definition without mutating the registry", () => {
  const original = createLibraryRegistry();
  const updated = registerLibraryDefinition(original, spellDefinition());

  assert.equal(original.definitions.length, 0);
  assert.equal(updated.definitions.length, 1);
  assert.equal(updated.definitions[0].id, "library-spell-fireball");
  assert.equal(Object.isFrozen(updated), true);
  assert.equal(Object.isFrozen(updated.definitions[0]), true);
});

test("registering an equivalent definition is idempotent", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const equivalent = {
    ...spellDefinition(),
    payload: {
      castingCost: "1",
      id: "spell-fireball",
    },
  };

  const updated = registerLibraryDefinition(registry, equivalent);

  assert.equal(updated, registry);
});

test("rejects a divergent definition with the same sovereign id", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition()],
  });

  assert.throws(
    () => registerLibraryDefinition(registry, spellDefinition({
      name: "Bola de Fogo Maior",
    })),
    /Library definition id conflict: library-spell-fireball/,
  );
});

test("rejects external identity conflicts inside the same domain", () => {
  assert.throws(
    () => createLibraryRegistry({
      definitions: [
        spellDefinition(),
        spellDefinition({
          id: "library-spell-fireball-copy",
          name: "Cópia",
        }),
      ],
    }),
    /Library external identity conflict: spell:gcs/,
  );
});

test("allows equal external ids in different owner domains", () => {
  const registry = createLibraryRegistry({
    definitions: [
      spellDefinition(),
      {
        id: "library-trait-fireball",
        externalIds: {
          gcs: "spell-fireball",
        },
        domain: "trait",
        name: "Trait homônimo",
      },
    ],
  });

  assert.equal(registry.definitions.length, 2);
});

test("removes a definition immutably and is idempotent when absent", () => {
  const original = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const removed = removeLibraryDefinition(
    original,
    "library-spell-fireball",
  );
  const unchanged = removeLibraryDefinition(removed, "library-spell-fireball");

  assert.equal(original.definitions.length, 1);
  assert.equal(removed.definitions.length, 0);
  assert.equal(unchanged, removed);
});

test("finds definitions only by exact sovereign id", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition()],
  });

  assert.equal(
    findLibraryDefinition(registry, "library-spell-fireball")?.name,
    "Bola de Fogo",
  );
  assert.equal(findLibraryDefinition(registry, "Bola de Fogo"), null);
  assert.equal(hasLibraryDefinition(registry, "library-spell-fireball"), true);
  assert.equal(hasLibraryDefinition(registry, "bola de fogo"), false);
});

test("derives exact domain and tag projections without persisting indexes", () => {
  const registry = createLibraryRegistry({
    definitions: [
      spellDefinition(),
      {
        id: "library-spell-ice",
        domain: "spell",
        name: "Gelo",
        tags: ["ice"],
      },
      {
        id: "library-trait-fire-resistance",
        domain: "trait",
        name: "Resistência ao Fogo",
        tags: ["fire"],
      },
    ],
  });

  const spells = listLibraryDefinitionsByDomain(registry, "spell");
  const fire = listLibraryDefinitionsByTag(registry, "fire");

  assert.deepEqual(
    spells.map(definition => definition.id),
    ["library-spell-fireball", "library-spell-ice"],
  );
  assert.deepEqual(
    fire.map(definition => definition.id),
    ["library-spell-fireball", "library-trait-fire-resistance"],
  );
  assert.equal("domainIndex" in registry, false);
  assert.equal("tagIndex" in registry, false);
  assert.equal(Object.isFrozen(spells), true);
  assert.equal(Object.isFrozen(fire), true);
});

test("lists definitions without exposing a mutable registry collection", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const definitions = listLibraryDefinitions(registry);

  assert.throws(() => definitions.push(spellDefinition({ id: "other" })));
  assert.equal(registry.definitions.length, 1);
});

test("serializes a detached registry snapshot", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition()],
  });
  const serialized = serializeLibraryRegistry(registry);

  serialized.definitions[0].payload.castingCost = "99";
  serialized.definitions.push(spellDefinition({ id: "copy-only" }));

  assert.equal(registry.definitions.length, 1);
  assert.equal(registry.definitions[0].payload.castingCost, "1");
});

test("allows unresolved declared dependencies without resolving them", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition({
      dependencies: [
        {
          libraryItemId: "library-missing-magery",
          versionRange: ">=1.0.0",
        },
      ],
    })],
  });

  assert.deepEqual(registry.definitions[0].dependencies, [
    {
      libraryItemId: "library-missing-magery",
      versionRange: ">=1.0.0",
      required: true,
    },
  ]);
  assert.equal("dependencyResolution" in registry, false);
});

test("does not interpret payloads or create Character state", () => {
  const registry = createLibraryRegistry({
    definitions: [spellDefinition({
      payload: {
        id: "spell-fireball",
        calculatedLevel: 18,
        calculatedCost: 0,
      },
    })],
  });

  assert.deepEqual(registry.definitions[0].payload, {
    id: "spell-fireball",
    calculatedLevel: 18,
    calculatedCost: 0,
  });
  assert.equal("character" in registry, false);
  assert.equal("applicationReceipt" in registry, false);
});

test("rejects invalid registry shape and unsupported schema versions", () => {
  assert.throws(
    () => createLibraryRegistry([]),
    /Library registry must be an object/,
  );
  assert.throws(
    () => createLibraryRegistry({ schemaVersion: 2 }),
    /schemaVersion is unsupported/,
  );
  assert.throws(
    () => validateLibraryRegistry({
      schemaVersion: 1,
      definitions: "definitions",
    }),
    /Library definitions must be an array/,
  );
  assert.throws(
    () => findLibraryDefinition(createLibraryRegistry(), ""),
    /Library definition id must be a non-empty string/,
  );
});
