import test from "node:test";
import assert from "node:assert/strict";

import {
  createAlphaCommandCatalogEntries,
} from "../../../src/application/alpha/AlphaCommandCatalog.js";
import {
  createCommandRegistry,
} from "../../../src/application/commands/CommandRegistry.js";
import {
  executeCommand,
} from "../../../src/application/commands/CommandExecutor.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../src/application/session/ApplicationSession.js";
import {
  createCharacter,
} from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T09:00:00.000Z";
const PROCESSED_AT = "2026-06-28T09:00:01.000Z";

const COMMAND_CASES = Object.freeze([
  Object.freeze({
    family: "Traits",
    type: "trait.add",
    payload: {
      trait: {
        id: "trait-alpha-roundtrip",
        name: "Alpha Roundtrip Trait",
        role: "custom-alpha-role",
        source: {
          kind: "imported",
          provider: "fixture",
          format: "json",
          reference: "alpha-roundtrip-trait",
          version: "1",
        },
        points: 7,
        selfControl: null,
        frequency: null,
        roundCostDown: false,
        choices: [],
        modifiers: [
          { id: "modifier-alpha-roundtrip", name: "Portable Modifier", value: -10 },
        ],
        pointValue: {
          mode: "total",
          importedPoints: 7,
          calculatedPoints: null,
        },
        raw: { imported: true, family: "Traits" },
      },
    },
    getItem(snapshot) {
      return snapshot.character.traits.find(entry => entry.id === "trait-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.role, "custom-alpha-role");
      assert.equal(item.source.reference, "alpha-roundtrip-trait");
      assert.equal(item.pointValue.importedPoints, 7);
      assert.deepEqual(item.raw, { imported: true, family: "Traits" });
    },
  }),
  Object.freeze({
    family: "Skills",
    type: "skill.add",
    payload: {
      skill: {
        id: "skill-alpha-roundtrip",
        name: "Alpha Roundtrip Skill",
        attribute: "IQ",
        difficulty: "hard",
        points: 2,
        defaults: [
          { type: "attribute", attribute: "IQ", modifier: -5 },
        ],
        reference: "B170",
        raw: { imported: true, family: "Skills" },
      },
    },
    getItem(snapshot) {
      return snapshot.character.skills.find(entry => entry.id === "skill-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.attribute, "IQ");
      assert.equal(item.difficulty, "hard");
      assert.equal(item.points, 2);
      assert.equal(item.reference, "B170");
    },
  }),
  Object.freeze({
    family: "Techniques",
    type: "technique.add",
    payload: {
      technique: {
        id: "technique-alpha-roundtrip",
        name: "Alpha Roundtrip Technique",
        skillName: "Alpha Roundtrip Skill",
        difficulty: "hard",
        points: 1,
        default: { type: "skill", name: "Alpha Roundtrip Skill", modifier: -2 },
        reference: "B229",
      },
    },
    getItem(snapshot) {
      return snapshot.character.techniques.find(entry => entry.id === "technique-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.skillName, "Alpha Roundtrip Skill");
      assert.equal(item.difficulty, "hard");
      assert.equal(item.points, 1);
      assert.equal(item.reference, "B229");
    },
  }),
  Object.freeze({
    family: "Languages",
    type: "language.add",
    payload: {
      language: {
        id: "language-alpha-roundtrip",
        name: "Alpha Roundtrip Language",
        spokenLevel: "accented",
        writtenLevel: "native",
        isNative: false,
        reference: "B23",
        notes: "Preserve language notes.",
      },
    },
    getItem(snapshot) {
      return snapshot.character.languages.find(entry => entry.id === "language-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.spokenLevel, "accented");
      assert.equal(item.writtenLevel, "native");
      assert.equal(item.isNative, false);
      assert.equal(item.reference, "B23");
    },
  }),
  Object.freeze({
    family: "Familiarities",
    type: "familiarity.add",
    payload: {
      familiarity: {
        id: "familiarity-alpha-roundtrip",
        name: "Alpha Roundtrip Culture",
        isNative: false,
        reference: "B23",
        notes: "Preserve familiarity notes.",
      },
    },
    getItem(snapshot) {
      return snapshot.character.familiarities.find(entry => entry.id === "familiarity-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.name, "Alpha Roundtrip Culture");
      assert.equal(item.isNative, false);
      assert.equal(item.reference, "B23");
    },
  }),
  Object.freeze({
    family: "Secondary",
    type: "secondary.base.set",
    payload: {
      characteristicKey: "Perception",
      base: 2,
    },
    getItem(snapshot) {
      return snapshot.character.secondary.characteristics.Perception;
    },
    assertItem(item) {
      assert.equal(item.base, 2);
    },
  }),
  Object.freeze({
    family: "Notes",
    type: "notes.structured.add",
    payload: {
      note: {
        id: "note-alpha-roundtrip",
        title: "Alpha Roundtrip Note",
        text: "Structured note survives JSON roundtrip.",
        category: "alpha",
      },
    },
    getItem(snapshot) {
      return snapshot.character.notes.structured.find(entry => entry.id === "note-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.title, "Alpha Roundtrip Note");
      assert.equal(item.category, "alpha");
    },
  }),
  Object.freeze({
    family: "Attacks",
    type: "attack.add",
    payload: {
      attack: {
        id: "attack-alpha-roundtrip",
        name: "Alpha Roundtrip Attack",
        category: "ranged",
        source: { kind: "manual", id: "source-alpha-roundtrip" },
        damage: { value: "1d+1", type: "burn" },
        reach: null,
        range: "10/100",
        notes: "Portable attack metadata.",
      },
    },
    getItem(snapshot) {
      return snapshot.character.attacks.find(entry => entry.id === "attack-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.category, "ranged");
      assert.equal(item.source.id, "source-alpha-roundtrip");
      assert.deepEqual(item.damage, { value: "1d+1", type: "burn" });
      assert.equal(item.range, "10/100");
    },
  }),
  Object.freeze({
    family: "Equipment",
    type: "equipment.add",
    payload: {
      item: {
        id: "equipment-alpha-roundtrip",
        kind: "item",
        name: "Alpha Roundtrip Equipment",
        quantity: 3,
        weightKg: 0.5,
        cost: 12,
        state: "carried",
        containerId: null,
        notes: "Portable equipment metadata.",
      },
    },
    getItem(snapshot) {
      return snapshot.character.equipment.items.find(entry => entry.id === "equipment-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.quantity, 3);
      assert.equal(item.weightKg, 0.5);
      assert.equal(item.cost, 12);
      assert.equal(item.state, "carried");
    },
  }),
  Object.freeze({
    family: "Spells",
    type: "spell.add",
    payload: {
      spell: {
        id: "spell-alpha-roundtrip",
        spellType: "standard",
        name: "Alpha Roundtrip Spell",
        attribute: "IQ",
        difficulty: "hard",
        points: 4,
        college: "Meta",
        castingCost: "2",
        maintenanceCost: "1",
        castingTime: "1 sec",
        duration: "1 min",
        imported: { provider: "fixture", reference: "M1" },
      },
    },
    getItem(snapshot) {
      return snapshot.character.spells.find(entry => entry.id === "spell-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.spellType, "standard");
      assert.equal(item.difficulty, "hard");
      assert.equal(item.points, 4);
      assert.equal(item.college, "Meta");
    },
  }),
  Object.freeze({
    family: "Powers",
    type: "power.add",
    payload: {
      power: {
        id: "power-alpha-roundtrip",
        name: "Alpha Roundtrip Power",
        source: "manual",
        memberTraitIds: ["trait-alpha-roundtrip"],
        tags: ["alpha", "roundtrip"],
        notes: "Portable power metadata.",
      },
    },
    getItem(snapshot) {
      return snapshot.character.powers.find(entry => entry.id === "power-alpha-roundtrip");
    },
    assertItem(item) {
      assert.equal(item.source, "manual");
      assert.deepEqual(item.memberTraitIds, ["trait-alpha-roundtrip"]);
      assert.deepEqual(item.tags, ["alpha", "roundtrip"]);
    },
  }),
]);

function createRuntime() {
  let next = 1;
  return {
    clock: {
      now() {
        return PROCESSED_AT;
      },
    },
    idGenerator: {
      next(prefix) {
        return `${prefix}_${next++}`;
      },
    },
  };
}

function createSession() {
  return createApplicationSession({
    id: "session-alpha-roundtrip-matrix",
    character: createCharacter({
      identity: {
        id: "character-alpha-roundtrip-matrix",
        name: "Alpha Roundtrip Matrix",
      },
    }),
  });
}

function createCommand({ type, payload, expectedRevision, id }) {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

function roundtripSession(session) {
  const serialized = serializeApplicationSession(session);
  const reparsed = JSON.parse(JSON.stringify(serialized));
  const restored = createApplicationSession(reparsed);
  return {
    serialized,
    reparsed,
    restoredSerialized: serializeApplicationSession(restored),
  };
}

test("Alpha structural command families preserve portable snapshots across JSON roundtrip", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());

  for (const commandCase of COMMAND_CASES) {
    const session = createSession();
    const result = executeCommand(
      session,
      createCommand({
        type: commandCase.type,
        payload: commandCase.payload,
        expectedRevision: session.revision,
        id: `command-alpha-roundtrip-${commandCase.type.replaceAll(".", "-")}`,
      }),
      registry,
      createRuntime(),
    );

    assert.equal(result.status, "applied", `${commandCase.family} command should apply`);

    const { serialized, reparsed, restoredSerialized } = roundtripSession(result.session);

    assert.deepEqual(restoredSerialized, reparsed, `${commandCase.family} session should survive JSON roundtrip`);
    assert.equal(restoredSerialized.id, serialized.id, `${commandCase.family} session id should stay stable`);
    assert.equal(restoredSerialized.character.identity.id, "character-alpha-roundtrip-matrix");
    assert.equal(restoredSerialized.history.length, 1, `${commandCase.family} history should survive roundtrip`);
    assert.equal(restoredSerialized.history[0].commandType, commandCase.type);
    assert.deepEqual(restoredSerialized.history[0].commandPayload, commandCase.payload);

    const item = commandCase.getItem(restoredSerialized);
    assert.ok(item, `${commandCase.family} item should survive roundtrip`);
    if (item.id) {
      assert.equal(item.id, Object.values(commandCase.payload)[0].id);
    }
    commandCase.assertItem(item);
  }
});
