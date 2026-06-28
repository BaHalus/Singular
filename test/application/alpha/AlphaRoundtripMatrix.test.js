import test from "node:test";
import assert from "node:assert/strict";

import { createAlphaCommandCatalogEntries } from "../../../src/application/alpha/AlphaCommandCatalog.js";
import { createCommandRegistry } from "../../../src/application/commands/CommandRegistry.js";
import { executeCommand } from "../../../src/application/commands/CommandExecutor.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../src/application/session/ApplicationSession.js";
import { createCharacter } from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T09:00:00.000Z";
const PROCESSED_AT = "2026-06-28T09:00:01.000Z";

const CASES = Object.freeze([
  {
    family: "Traits",
    type: "trait.add",
    payload: { trait: { id: "trait-alpha-roundtrip", name: "Trait", role: "custom", source: { kind: "imported", provider: "fixture", format: "json", reference: "trait-ref", version: "1" }, points: 7, selfControl: { roll: 12, adjustment: "none" }, frequency: { roll: 9 }, roundCostDown: true, choices: [{ key: "specialization", value: "control", required: false, label: "Control" }], modifiers: [{ id: "modifier-alpha-roundtrip", name: "Modifier", value: -10 }], pointValue: { mode: "total", importedPoints: 7, calculatedPoints: null }, raw: { family: "Traits" } } },
    path: snapshot => snapshot.character.traits.find(item => item.id === "trait-alpha-roundtrip"),
    check: item => {
      assert.equal(item.source.reference, "trait-ref");
      assert.equal(item.selfControl.roll, 12);
      assert.equal(item.frequency.roll, 9);
      assert.equal(item.roundCostDown, true);
      assert.equal(item.pointValue.importedPoints, 7);
      assert.deepEqual(item.raw, { family: "Traits" });
    },
  },
  {
    family: "Skills",
    type: "skill.add",
    payload: { skill: { id: "skill-alpha-roundtrip", name: "Skill", attribute: "IQ", difficulty: "hard", points: 2, defaults: [{ type: "attribute", attribute: "IQ", modifier: -5 }], externalIds: { basicSet: "B170" }, importMeta: { provider: "fixture", reference: "B170" }, raw: { family: "Skills" } } },
    path: snapshot => snapshot.character.skills.find(item => item.id === "skill-alpha-roundtrip"),
    check: item => {
      assert.deepEqual(item.defaults, [{ type: "attribute", attribute: "IQ", modifier: -5 }]);
      assert.deepEqual(item.externalIds, { basicSet: "B170" });
      assert.deepEqual(item.importMeta, { provider: "fixture", reference: "B170" });
      assert.deepEqual(item.raw, { family: "Skills" });
    },
  },
  {
    family: "Techniques",
    type: "technique.add",
    payload: { technique: { id: "technique-alpha-roundtrip", name: "Technique", skillName: "Skill", difficulty: "hard", points: 1, defaults: [{ type: "skill", name: "Skill", modifier: -2 }], externalIds: { basicSet: "B229" }, importMeta: { provider: "fixture", reference: "B229" }, raw: { family: "Techniques" } } },
    path: snapshot => snapshot.character.techniques.find(item => item.id === "technique-alpha-roundtrip"),
    check: item => {
      assert.equal(item.skillName, "Skill");
      assert.deepEqual(item.defaults, [{ type: "skill", name: "Skill", modifier: -2 }]);
      assert.deepEqual(item.importMeta, { provider: "fixture", reference: "B229" });
    },
  },
  {
    family: "Languages",
    type: "language.add",
    payload: { language: { id: "language-alpha-roundtrip", name: "Language", spokenLevel: "accented", writtenLevel: "native", isNative: false, reference: "B23", notes: "notes" } },
    path: snapshot => snapshot.character.languages.find(item => item.id === "language-alpha-roundtrip"),
    check: item => assert.equal(item.reference, "B23"),
  },
  {
    family: "Familiarities",
    type: "familiarity.add",
    payload: { familiarity: { id: "familiarity-alpha-roundtrip", name: "Culture", isNative: false, reference: "B23", notes: "notes" } },
    path: snapshot => snapshot.character.familiarities.find(item => item.id === "familiarity-alpha-roundtrip"),
    check: item => assert.equal(item.reference, "B23"),
  },
  {
    family: "Secondary",
    type: "secondary.base.set",
    payload: { characteristicKey: "Per", base: 2 },
    path: snapshot => snapshot.character.secondaryCharacteristics.Per,
    check: item => assert.equal(item.base, 2),
  },
  {
    family: "Notes",
    type: "notes.structured.add",
    payload: { note: { id: "note-alpha-roundtrip", title: "Note", text: "text", category: "alpha" } },
    path: snapshot => snapshot.character.notes.structured.find(item => item.id === "note-alpha-roundtrip"),
    check: item => assert.equal(item.category, "alpha"),
  },
  {
    family: "Attacks",
    type: "attack.add",
    payload: { attack: { id: "attack-alpha-roundtrip", name: "Attack", category: "ranged", source: { kind: "manual", id: "source-alpha-roundtrip" }, damage: { value: "1d+1", type: "burn" }, reach: null, range: "10/100", notes: "notes" } },
    path: snapshot => snapshot.character.attacks.find(item => item.id === "attack-alpha-roundtrip"),
    check: item => assert.deepEqual(item.damage, { value: "1d+1", type: "burn", authority: "declared" }),
  },
  {
    family: "Equipment",
    type: "equipment.add",
    payload: { item: { id: "equipment-alpha-roundtrip", kind: "item", name: "Equipment", quantity: 3, weightKg: 0.5, cost: 12, state: "carried", containerId: null, notes: "notes" } },
    path: snapshot => snapshot.character.equipment.find(item => item.id === "equipment-alpha-roundtrip"),
    check: item => assert.equal(item.quantity, 3),
  },
  {
    family: "Spells",
    type: "spell.add",
    payload: { spell: { id: "spell-alpha-roundtrip", spellType: "standard", name: "Spell", attribute: "IQ", difficulty: "hard", points: 4, colleges: ["Meta"], castingCost: "2", maintenanceCost: "1", castingTime: "1 sec", duration: "1 min", importMeta: { provider: "fixture", reference: "M1" } } },
    path: snapshot => snapshot.character.spells.find(item => item.id === "spell-alpha-roundtrip"),
    check: item => {
      assert.deepEqual(item.colleges, ["Meta"]);
      assert.deepEqual(item.importMeta, { provider: "fixture", reference: "M1" });
    },
  },
  {
    family: "Powers",
    type: "power.add",
    payload: { power: { id: "power-alpha-roundtrip", name: "Power", source: "manual", memberTraitIds: [], tags: ["alpha", "roundtrip"], notes: "notes" } },
    path: snapshot => snapshot.character.powers.find(item => item.id === "power-alpha-roundtrip"),
    check: item => assert.deepEqual(item.tags, ["alpha", "roundtrip"]),
  },
]);

function createSession() {
  return createApplicationSession({
    id: "session-alpha-roundtrip-matrix",
    character: createCharacter({
      identity: { id: "character-alpha-roundtrip-matrix", name: "Alpha Roundtrip Matrix" },
    }),
  });
}

function createCommand({ type, payload, expectedRevision, id }) {
  return { id, type, expectedRevision, issuedAt: ISSUED_AT, payload };
}

function createRuntime() {
  let next = 1;
  return {
    clock: { now: () => PROCESSED_AT },
    idGenerator: { next: prefix => `${prefix}_${next++}` },
  };
}

function roundtripSession(session) {
  const serialized = serializeApplicationSession(session);
  const reparsed = JSON.parse(JSON.stringify(serialized));
  const restored = createApplicationSession(reparsed);
  return { serialized, reparsed, restoredSerialized: serializeApplicationSession(restored) };
}

test("Alpha structural command families preserve portable snapshots across JSON roundtrip", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());

  for (const commandCase of CASES) {
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
    assert.deepEqual(restoredSerialized, reparsed, `${commandCase.family} should survive JSON roundtrip`);
    assert.equal(restoredSerialized.id, serialized.id, `${commandCase.family} session id should stay stable`);
    assert.equal(restoredSerialized.character.identity.id, "character-alpha-roundtrip-matrix");
    assert.equal(restoredSerialized.history.length, 1, `${commandCase.family} history should survive roundtrip`);
    assert.equal(restoredSerialized.history[0].commandType, commandCase.type);
    assert.deepEqual(restoredSerialized.history[0].commandPayload, commandCase.payload);

    const item = commandCase.path(restoredSerialized);
    assert.ok(item, `${commandCase.family} item should survive roundtrip`);
    if (item.id) assert.equal(item.id, Object.values(commandCase.payload)[0].id);
    commandCase.check(item);
  }
});
