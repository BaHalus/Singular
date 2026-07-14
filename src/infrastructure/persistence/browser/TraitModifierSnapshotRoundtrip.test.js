import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../../../domain/character/Character.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../application/session/ApplicationSession.js";
import {
  createBrowserLocalCharacterRepository,
  createBrowserLocalSessionRepository,
  createSingularCharacterExport,
  parseSingularCharacterExport,
} from "./BrowserLocalPersistence.js";

function modifiedCharacter(id = "character-modified-trait") {
  return createCharacter({
    identity: { id, name: "Personagem com modificadores" },
    traits: [{
      id: "trait-flight",
      externalIds: { gcs: "adv-flight", library: "gurps-basic-set" },
      role: "advantage",
      name: "Voo",
      points: 20,
      levels: 2,
      source: {
        kind: "imported",
        provider: "gcs",
        format: "gcs",
        reference: "B56",
        version: 5,
      },
      pointValue: {
        mode: "base-plus-levels",
        basePoints: 10,
        pointsPerLevel: 5,
        levels: 2,
        legacyPoints: 20,
        importedPoints: 20,
        calculatedPoints: 20,
      },
      modifiers: [{
        id: "modifier-reliable",
        name: "Confiável",
        kind: "enhancement",
        valueType: "percentage",
        value: 50,
        source: { book: "Powers", page: 109 },
        notes: "Preservar origem e notas",
        enabled: true,
        affects: "total",
      }, {
        id: "modifier-exclusive",
        name: "Modificador exclusivo",
        type: "advantage_modifier",
        cost_type: "multiplier",
        cost: "x2",
        raw: { type: "advantage_modifier", expression: "x2" },
      }],
      features: [{ type: "bonus", amount: 1 }],
      weapons: [{ type: "melee_weapon", usage: "Asa" }],
      prereqs: { all: [{ type: "trait", id: "trait-wings" }] },
      importMeta: { source: "gcs", nested: { path: ["Vantagens", "Voo"] } },
      raw: {
        type: "advantage",
        modifiers: [{ id: "raw-modifier", cost: "+50%" }],
      },
    }],
    metadata: {
      createdAt: "2026-07-14T22:00:00.000Z",
      updatedAt: "2026-07-14T22:00:00.000Z",
      source: "test",
    },
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
}

function assertModifiedTraitPreserved(character, expected) {
  const actualTrait = serializeCharacter(character).traits[0];
  const expectedTrait = serializeCharacter(expected).traits[0];
  assert.deepEqual(actualTrait, expectedTrait);
  assert.deepEqual(actualTrait.externalIds, expectedTrait.externalIds);
  assert.deepEqual(actualTrait.modifiers, expectedTrait.modifiers);
  assert.deepEqual(actualTrait.pointValue, expectedTrait.pointValue);
  assert.deepEqual(actualTrait.source, expectedTrait.source);
  assert.deepEqual(actualTrait.raw, expectedTrait.raw);
}

test("roundtrips modified Traits through portable Character snapshots", () => {
  const original = modifiedCharacter();
  const snapshot = serializeCharacter(original);
  const restored = createCharacter(JSON.parse(JSON.stringify(snapshot)));

  assertModifiedTraitPreserved(restored, original);
  assert.notEqual(snapshot.traits[0].externalIds, original.traits[0].externalIds);
  assert.notEqual(snapshot.traits[0].modifiers, original.traits[0].modifiers);
  assert.notEqual(snapshot.traits[0].pointValue, original.traits[0].pointValue);
  assert.notEqual(snapshot.traits[0].source, original.traits[0].source);
  assert.notEqual(snapshot.traits[0].raw, original.traits[0].raw);

  snapshot.traits[0].raw.modifiers[0].cost = "changed";
  snapshot.traits[0].features[0].amount = 99;
  assert.equal(original.traits[0].raw.modifiers[0].cost, "+50%");
  assert.equal(original.traits[0].features[0].amount, 1);
});

test("saves and loads modified Traits through existing Character and Session repositories", async () => {
  const original = modifiedCharacter();
  const storage = createMemoryStorage();
  const characterRepository = createBrowserLocalCharacterRepository({
    storage,
    namespace: "trait-roundtrip.character",
  });
  const sessionRepository = createBrowserLocalSessionRepository({
    storage,
    namespace: "trait-roundtrip.session",
  });
  const session = createApplicationSession({
    id: "session-modified-trait",
    character: original,
  });

  await characterRepository.save(original);
  await sessionRepository.save(session);
  const loadedCharacter = await characterRepository.load(original.identity.id);
  const loadedSession = await sessionRepository.loadLastSession();

  assertModifiedTraitPreserved(loadedCharacter, original);
  assertModifiedTraitPreserved(loadedSession.character, original);
  assert.deepEqual(
    serializeApplicationSession(loadedSession).character.traits,
    serializeApplicationSession(session).character.traits,
  );
});

test("exports and imports every canonical modified Trait field", () => {
  const original = modifiedCharacter();
  const document = createSingularCharacterExport(original, {
    exportedAt: "2026-07-14T22:05:00.000Z",
  });
  const parsed = parseSingularCharacterExport(JSON.stringify(document));

  assert.equal(parsed.status, "accepted");
  assert.deepEqual(parsed.diagnostics, []);
  assertModifiedTraitPreserved(parsed.character, original);
});

test("imports legacy Characters whose projected Traits have no modifiers", () => {
  const original = modifiedCharacter("character-legacy-trait");
  const legacySnapshot = serializeCharacter(original);
  delete legacySnapshot.traits;
  legacySnapshot.advantages.forEach(trait => {
    delete trait.modifiers;
  });
  const document = {
    format: "singular-character-export",
    version: 1,
    exportedAt: "2026-07-14T22:06:00.000Z",
    character: legacySnapshot,
  };

  const parsed = parseSingularCharacterExport(JSON.stringify(document));

  assert.equal(parsed.status, "accepted");
  assert.deepEqual(parsed.character.traits[0].modifiers, []);
  assert.deepEqual(parsed.character.traits[0].externalIds, {
    gcs: "adv-flight",
    library: "gurps-basic-set",
  });
  assert.deepEqual(parsed.character.traits[0].raw, original.traits[0].raw);
});

test("isolates a corrupt modified Trait at the import boundary", () => {
  const document = createSingularCharacterExport(modifiedCharacter(), {
    exportedAt: "2026-07-14T22:07:00.000Z",
  });
  const corrupt = JSON.parse(JSON.stringify(document));
  corrupt.character.traits[0].modifiers[0].id = "";

  const parsed = parseSingularCharacterExport(JSON.stringify(corrupt));

  assert.equal(parsed.status, "rejected");
  assert.equal(parsed.character, null);
  assert.equal(
    parsed.diagnostics.some(diagnostic =>
      diagnostic.code === "invalid-character" &&
      diagnostic.message.includes("Trait modifier id")),
    true,
  );
});
