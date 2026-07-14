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

function modifiedEquipmentCharacter(id = "character-modified-equipment") {
  return createCharacter({
    identity: { id, name: "Personagem com equipamento modificado" },
    equipment: [{
      id: "eq-backpack",
      kind: "container",
      containerKind: "physical",
      name: "Mochila",
      state: "carried",
      children: [{
        id: "eq-sword",
        externalIds: { gcs: "eq-sword", library: "gurps-basic-set" },
        name: "Espada larga",
        cost: 500,
        weightKg: 1.5,
        state: "carried",
        categories: ["Armas", "Espadas"],
        features: [{ type: "equipment_bonus", amount: 1 }],
        weapons: [{ type: "melee_weapon", usage: "Balanço" }],
        importMeta: { source: "gcs", path: ["Equipamento", "Espada"] },
        raw: { type: "equipment", description: "Espada larga" },
        modifierList: {
          type: "eqp_modifier_list",
          id: "eq-sword:modifier-list",
          version: 4,
          raw: { type: "eqp_modifier_list", imported: true },
          rows: [{
            type: "eqp_modifier_container",
            id: "eq-sword:quality",
            name: "Qualidade",
            open: true,
            raw: { type: "eqp_modifier_container", imported: true },
            children: [{
              type: "eqp_modifier",
              id: "eq-sword:superior",
              name: "Qualidade superior",
              reference: "B274",
              cost_type: "to_base_cost",
              cost: "x4",
              weight_type: "to_base_weight",
              weight: "x0.5",
              features: [{
                type: "weapon_bonus",
                amount: 1,
                selection_type: "this_weapon",
              }],
              raw: { type: "eqp_modifier", imported: true },
            }],
          }, {
            type: "eqp_modifier",
            id: "eq-sword:silver",
            name: "Prata",
            reference: "B275",
            cost_type: "to_base_cost",
            cost: "x19",
            disabled: true,
          }],
        },
      }],
    }],
    metadata: {
      createdAt: "2026-07-14T22:20:00.000Z",
      updatedAt: "2026-07-14T22:20:00.000Z",
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

function serializedSword(character) {
  return serializeCharacter(character).equipment[0].children[0];
}

function assertModifiedEquipmentPreserved(actual, expected) {
  const actualSword = serializedSword(actual);
  const expectedSword = serializedSword(expected);

  assert.deepEqual(actualSword, expectedSword);
  assert.deepEqual(actualSword.modifierList, expectedSword.modifierList);
  assert.deepEqual(actualSword.modifiers, actualSword.modifierList.rows);
  assert.deepEqual(
    actualSword.modifierList.rows[0].children[0].features,
    expectedSword.modifierList.rows[0].children[0].features,
  );
  assert.deepEqual(
    actualSword.modifierList.rows[0].children[0].applicability,
    { selectionType: "this_weapon", notes: null },
  );
}

test("roundtrips canonical Equipment modifier trees through portable Character snapshots", () => {
  const original = modifiedEquipmentCharacter();
  const snapshot = serializeCharacter(original);
  const restored = createCharacter(JSON.parse(JSON.stringify(snapshot)));
  const snapshotSword = snapshot.equipment[0].children[0];
  const originalSword = original.equipment[0].children[0];

  assertModifiedEquipmentPreserved(restored, original);
  assert.notEqual(snapshot.equipment, original.equipment);
  assert.notEqual(snapshotSword.modifierList, originalSword.modifierList);
  assert.notEqual(snapshotSword.modifierList.rows, originalSword.modifierList.rows);
  assert.notEqual(snapshotSword.raw, originalSword.raw);

  snapshotSword.modifierList.raw.raw.imported = false;
  snapshotSword.modifierList.rows[0].children[0].features[0].amount = 99;
  assert.equal(originalSword.modifierList.raw.raw.imported, true);
  assert.equal(
    originalSword.modifierList.rows[0].children[0].features[0].amount,
    1,
  );
});

test("saves and loads modified Equipment through existing Character and Session repositories", async () => {
  const original = modifiedEquipmentCharacter();
  const storage = createMemoryStorage();
  const characterRepository = createBrowserLocalCharacterRepository({
    storage,
    namespace: "equipment-roundtrip.character",
  });
  const sessionRepository = createBrowserLocalSessionRepository({
    storage,
    namespace: "equipment-roundtrip.session",
  });
  const session = createApplicationSession({
    id: "session-modified-equipment",
    character: original,
  });

  await characterRepository.save(original);
  await sessionRepository.save(session);
  const loadedCharacter = await characterRepository.load(original.identity.id);
  const loadedSession = await sessionRepository.loadLastSession();

  assertModifiedEquipmentPreserved(loadedCharacter, original);
  assertModifiedEquipmentPreserved(loadedSession.character, original);
  assert.deepEqual(
    serializeApplicationSession(loadedSession).character.equipment,
    serializeApplicationSession(session).character.equipment,
  );
});

test("exports and imports Equipment modifier hierarchy, metadata and applicability", () => {
  const original = modifiedEquipmentCharacter();
  const document = createSingularCharacterExport(original, {
    exportedAt: "2026-07-14T22:25:00.000Z",
  });
  const parsed = parseSingularCharacterExport(JSON.stringify(document));

  assert.equal(parsed.status, "accepted");
  assert.deepEqual(parsed.diagnostics, []);
  assertModifiedEquipmentPreserved(parsed.character, original);
});

test("imports legacy Characters whose Equipment has no modifier fields", () => {
  const original = modifiedEquipmentCharacter("character-legacy-equipment");
  const legacySnapshot = serializeCharacter(original);
  const legacySword = legacySnapshot.equipment[0].children[0];
  delete legacySword.modifierList;
  delete legacySword.modifiers;
  const document = {
    format: "singular-character-export",
    version: 1,
    exportedAt: "2026-07-14T22:26:00.000Z",
    character: legacySnapshot,
  };

  const parsed = parseSingularCharacterExport(JSON.stringify(document));
  const parsedSword = parsed.character.equipment[0].children[0];

  assert.equal(parsed.status, "accepted");
  assert.equal(parsedSword.modifierList, null);
  assert.deepEqual(parsedSword.modifiers, []);
  assert.deepEqual(parsedSword.externalIds, {
    gcs: "eq-sword",
    library: "gurps-basic-set",
  });
  assert.deepEqual(parsedSword.raw, original.equipment[0].children[0].raw);
});

test("isolates a corrupt Equipment modifier tree at the import boundary", () => {
  const document = createSingularCharacterExport(modifiedEquipmentCharacter(), {
    exportedAt: "2026-07-14T22:27:00.000Z",
  });
  const corrupt = JSON.parse(JSON.stringify(document));
  const corruptSword = corrupt.character.equipment[0].children[0];
  corruptSword.modifierList.rows[0].children[0].id =
    corruptSword.modifierList.rows[0].id;
  corruptSword.modifiers = corruptSword.modifierList.rows;

  const parsed = parseSingularCharacterExport(JSON.stringify(corrupt));

  assert.equal(parsed.status, "rejected");
  assert.equal(parsed.character, null);
  assert.equal(
    parsed.diagnostics.some(diagnostic =>
      diagnostic.code === "invalid-character" &&
      diagnostic.message.includes("modifier ids must be unique")),
    true,
  );
});
