import test from "node:test";
import assert from "node:assert/strict";

import {
  createLibraryDefinition,
  createLibraryDefinitions,
  serializeLibraryDefinition,
  serializeLibraryDefinitions,
  validateLibraryDefinition,
  validateLibraryDefinitions,
} from "./LibraryDefinition.js";

test("creates a canonical Library definition with safe defaults", () => {
  const definition = createLibraryDefinition({
    id: "library-spell-fireball",
    domain: "spell",
    name: "Bola de Fogo",
  });

  assert.deepEqual(definition, {
    id: "library-spell-fireball",
    externalIds: {},
    domain: "spell",
    schemaVersion: 1,
    name: "Bola de Fogo",
    version: null,
    source: {
      kind: "singular",
      provider: null,
      format: "singular-json",
      reference: null,
    },
    payload: {},
    tags: [],
    dependencies: [],
    importMeta: null,
    raw: null,
  });
  assert.equal(validateLibraryDefinition(definition), true);
  assert.equal(Object.isFrozen(definition), true);
  assert.equal(Object.isFrozen(definition.source), true);
  assert.equal(Object.isFrozen(definition.payload), true);
});

test("preserves a rich portable definition without sharing input state", () => {
  const input = {
    id: "library-template-wolf",
    externalIds: {
      gcs: "template-wolf",
    },
    domain: "template",
    schemaVersion: 2,
    name: "Lobo",
    version: "1.2.0",
    source: {
      kind: "imported",
      provider: "gcs",
      format: "gct",
      reference: "Bestiary.gct",
    },
    payload: {
      id: "template-wolf",
      entries: [
        {
          domain: "trait",
          payload: { name: "Dentes" },
        },
      ],
    },
    tags: ["animal", "form"],
    dependencies: [
      {
        libraryItemId: "library-trait-fur",
        versionRange: ">=1.0.0 <2.0.0",
        required: true,
      },
    ],
    importMeta: {
      fingerprint: "abc123",
    },
    raw: {
      type: "template",
    },
  };

  const definition = createLibraryDefinition(input);

  input.externalIds.gcs = "mutated";
  input.payload.entries[0].payload.name = "Mutado";
  input.tags.push("mutated");
  input.dependencies[0].required = false;
  input.importMeta.fingerprint = "mutated";
  input.raw.type = "mutated";

  assert.deepEqual(definition.externalIds, { gcs: "template-wolf" });
  assert.equal(definition.payload.entries[0].payload.name, "Dentes");
  assert.deepEqual(definition.tags, ["animal", "form"]);
  assert.equal(definition.dependencies[0].required, true);
  assert.deepEqual(definition.importMeta, { fingerprint: "abc123" });
  assert.deepEqual(definition.raw, { type: "template" });
  assert.equal(Object.isFrozen(definition.payload.entries), true);
  assert.equal(Object.isFrozen(definition.dependencies[0]), true);
});

test("keeps the payload opaque to the Library core", () => {
  const definition = createLibraryDefinition({
    id: "library-custom-definition",
    domain: "campaign-extension",
    name: "Extensão de Campanha",
    payload: {
      calculatedPoints: 999,
      arbitraryRule: {
        enabled: true,
      },
    },
  });

  assert.equal(definition.domain, "campaign-extension");
  assert.deepEqual(definition.payload, {
    calculatedPoints: 999,
    arbitraryRule: {
      enabled: true,
    },
  });
  assert.equal("calculatedPoints" in definition, false);
});

test("normalizes declared dependencies without resolving them", () => {
  const definition = createLibraryDefinition({
    id: "library-spell-lightning",
    domain: "spell",
    name: "Relâmpago",
    dependencies: [
      {
        libraryItemId: "library-trait-magery",
      },
      {
        libraryItemId: "library-spell-air",
        versionRange: "2.x",
        required: false,
      },
    ],
  });

  assert.deepEqual(definition.dependencies, [
    {
      libraryItemId: "library-trait-magery",
      versionRange: null,
      required: true,
    },
    {
      libraryItemId: "library-spell-air",
      versionRange: "2.x",
      required: false,
    },
  ]);
});

test("serializes detached snapshots", () => {
  const definitions = createLibraryDefinitions([
    {
      id: "library-equipment-rope",
      domain: "equipment",
      name: "Corda",
      payload: {
        id: "equipment-rope",
        weightKg: 1.5,
      },
    },
  ]);

  const serializedCollection = serializeLibraryDefinitions(definitions);
  const serializedDefinition = serializeLibraryDefinition(definitions[0]);

  serializedCollection[0].payload.weightKg = 9;
  serializedDefinition.source.kind = "unknown";

  assert.equal(definitions[0].payload.weightKg, 1.5);
  assert.equal(definitions[0].source.kind, "singular");
  assert.equal(validateLibraryDefinitions(definitions), true);
});

test("rejects duplicate definition ids", () => {
  assert.throws(
    () => createLibraryDefinitions([
      {
        id: "library-duplicate",
        domain: "trait",
        name: "Primeira",
      },
      {
        id: "library-duplicate",
        domain: "skill",
        name: "Segunda",
      },
    ]),
    /Duplicate Library definition id: library-duplicate/,
  );
});

test("rejects invalid envelope fields", () => {
  assert.throws(
    () => createLibraryDefinitions("definitions"),
    /Library definitions must be an array/,
  );
  assert.throws(
    () => createLibraryDefinition([]),
    /Library definition must be an object/,
  );
  assert.throws(
    () => createLibraryDefinition({ id: "item", name: "Sem domínio" }),
    /Library definition domain must be a non-empty string/,
  );
  assert.throws(
    () => createLibraryDefinition({ id: "item", domain: "trait" }),
    /Library definition name must be a non-empty string/,
  );
  assert.throws(
    () => createLibraryDefinition({
      id: "item",
      domain: "trait",
      name: "Trait",
      schemaVersion: 0,
    }),
    /schemaVersion must be a positive integer/,
  );
  assert.throws(
    () => createLibraryDefinition({
      id: "item",
      domain: "trait",
      name: "Trait",
      source: { kind: "invalid" },
    }),
    /source kind is invalid/,
  );
});

test("rejects duplicate tags and dependency ids", () => {
  assert.throws(
    () => createLibraryDefinition({
      id: "item",
      domain: "trait",
      name: "Trait",
      tags: ["combat", "combat"],
    }),
    /tags must not contain duplicates/,
  );

  assert.throws(
    () => createLibraryDefinition({
      id: "item",
      domain: "trait",
      name: "Trait",
      dependencies: [
        { libraryItemId: "dependency" },
        { libraryItemId: "dependency" },
      ],
    }),
    /Duplicate Library dependency: dependency/,
  );
});

test("rejects self-dependency", () => {
  assert.throws(
    () => createLibraryDefinition({
      id: "library-self",
      domain: "trait",
      name: "Autorreferência",
      dependencies: [
        { libraryItemId: "library-self" },
      ],
    }),
    /must not depend on itself/,
  );
});

test("rejects non-portable payload and metadata values", () => {
  assert.throws(
    () => createLibraryDefinition({
      id: "library-date",
      domain: "trait",
      name: "Data",
      payload: { createdAt: new Date() },
    }),
    /plain objects and arrays/,
  );

  assert.throws(
    () => createLibraryDefinition({
      id: "library-nan",
      domain: "trait",
      name: "NaN",
      payload: { points: Number.NaN },
    }),
    /finite numbers/,
  );

  assert.throws(
    () => createLibraryDefinition({
      id: "library-undefined",
      domain: "trait",
      name: "Undefined",
      payload: { value: undefined },
    }),
    /portable JSON values/,
  );

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => createLibraryDefinition({
      id: "library-cycle",
      domain: "trait",
      name: "Cycle",
      raw: cyclic,
    }),
    /must not contain cycles/,
  );
});
