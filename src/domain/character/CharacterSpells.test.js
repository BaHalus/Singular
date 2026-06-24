import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "./Character.js";

test("Character preserves imported spell structure", () => {
  const character = createCharacter({
    spells: [
      {
        id: "spell-001",
        externalIds: { gcs: "gcs-spell-001" },
        spellType: "standard",
        name: "Bola de Ácido",
        techLevel: null,
        attribute: "IQ",
        difficulty: "H",
        points: 1,
        importedLevel: 14,
        importedRelativeLevel: 1,
        importedRelativeLevelText: "IQ+1",
        colleges: ["Água"],
        powerSource: "Arcana",
        spellClass: "Projétil",
        resistance: "",
        castingCost: "1-Aptidão Mágica",
        maintenanceCost: "-",
        castingTime: "1-3 seg",
        duration: "Instantânea",
        item: "",
        baseSkill: "",
        prereqCount: 2,
        reference: "M191",
        notes: "Importada do GCS.",
        tags: ["combat"],
        categories: ["Água"],
        weapons: [{ type: "ranged_weapon" }],
        features: [{ type: "note", value: "Imported feature" }],
        modifiers: [],
        prereqs: { all: [] },
        study: [],
        thirdParty: { source: "translated" },
        calc: { level: 14, rsl: "IQ+1" },
        importMeta: { source: "gcs", containerIds: [] },
        raw: { original: true },
      },
    ],
  });

  assert.equal(character.spells[0].name, "Bola de Ácido");
  assert.equal(character.spells[0].importedLevel, 14);
  assert.deepEqual(character.spells[0].colleges, ["Água"]);
  assert.deepEqual(character.spells[0].weapons, [{ type: "ranged_weapon" }]);
  assert.deepEqual(character.spells[0].calc, { level: 14, rsl: "IQ+1" });
  assert.deepEqual(character.spells[0].raw, { original: true });
});

test("Character serializes spells without calculating levels or costs", () => {
  const character = createCharacter({
    spells: [
      {
        id: "spell-001",
        name: "Acelerar Tempo",
        attribute: "IQ",
        difficulty: "VH",
        points: 1,
        importedLevel: 15,
        importedRelativeLevelText: "IQ+2",
        castingCost: "Varia",
        maintenanceCost: "Varia",
        castingTime: "2 seg",
        duration: "1 min",
      },
    ],
  });

  const json = serializeCharacter(character);

  assert.equal(json.spells[0].importedLevel, 15);
  assert.equal(json.spells[0].importedRelativeLevelText, "IQ+2");
  assert.equal(json.spells[0].castingCost, "Varia");
  assert.equal(json.spells[0].maintenanceCost, "Varia");
  assert.equal(json.spells[0].castingTime, "2 seg");
  assert.equal(json.spells[0].duration, "1 min");
  assert.equal(json.spells[0].calc, null);
});
