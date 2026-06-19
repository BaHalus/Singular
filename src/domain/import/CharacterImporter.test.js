import test from "node:test";
import assert from "node:assert/strict";

import {
  createSnapshotFromGcs,
  importCharacter,
} from "./CharacterImporter.js";

test("creates import snapshot from basic GCS-like source", () => {
  const source = {
    id: "char-001",
    profile: {
      name: "Aragorn",
      player: "Leonardo",
      campaign: "Yrth",
    },
    attributes: {
      ST: 12,
      DX: 13,
      IQ: 11,
      HT: 12,
    },
    secondaryCharacteristics: {
      HP: 13,
      FP: 12,
      Will: 12,
      Per: 11,
      BasicSpeed: 6.25,
      BasicMove: 6,
    },
  };

  const snapshot = createSnapshotFromGcs(source);

  assert.equal(snapshot.identity.id, "char-001");
  assert.equal(snapshot.identity.name, "Aragorn");
  assert.equal(snapshot.identity.playerId, "Leonardo");
  assert.equal(snapshot.identity.campaignId, "Yrth");
  assert.equal(snapshot.attributes.ST.base, 12);
  assert.equal(snapshot.attributes.DX.base, 13);
  assert.equal(snapshot.secondaryCharacteristics.HP.base, 13);
  assert.equal(snapshot.secondaryCharacteristics.BasicMove.base, 6);
  assert.deepEqual(snapshot.traits.advantages, []);
  assert.deepEqual(snapshot.traits.containers, []);
  assert.equal(snapshot.raw, source);
});

test("imports character from basic GCS-like source", () => {
  const character = importCharacter({
    id: "char-001",
    profile: {
      name: "Aragorn",
      player: "Leonardo",
      campaign: "Yrth",
    },
    attributes: {
      ST: 12,
      DX: 13,
      IQ: 11,
      HT: 12,
    },
    secondaryCharacteristics: {
      HP: 13,
      FP: 12,
      Will: 12,
      Per: 11,
      BasicSpeed: 6.25,
      BasicMove: 6,
    },
  });

  assert.equal(character.identity.id, "char-001");
  assert.equal(character.identity.name, "Aragorn");
  assert.equal(character.attributes.ST.base, 12);
  assert.equal(character.attributes.DX.base, 13);
  assert.equal(character.attributes.IQ.base, 11);
  assert.equal(character.attributes.HT.base, 12);
  assert.equal(character.secondaryCharacteristics.HP.base, 13);
  assert.equal(character.secondaryCharacteristics.BasicMove.base, 6);
});

test("imports default unnamed character from empty source", () => {
  const character = importCharacter({});

  assert.equal(character.identity.name, "Unnamed");
  assert.equal(character.attributes.ST.base, 10);
  assert.equal(character.attributes.DX.base, 10);
  assert.equal(character.attributes.IQ.base, 10);
  assert.equal(character.attributes.HT.base, 10);
});

test("imports numeric strings", () => {
  const character = importCharacter({
    profile: {
      name: "String Hero",
    },
    attributes: {
      ST: "14",
      DX: "12",
      IQ: "10",
      HT: "11",
    },
  });

  assert.equal(character.attributes.ST.base, 14);
  assert.equal(character.attributes.DX.base, 12);
  assert.equal(character.attributes.IQ.base, 10);
  assert.equal(character.attributes.HT.base, 11);
});

test("creates snapshot with imported trait buckets and preserved containers", () => {
  const snapshot = createSnapshotFromGcs({
    rows: [
      {
        id: "race-001",
        type: "trait_container",
        name: "Raça",
        children: [
          {
            id: "adv-001",
            name: "Visão Noturna",
            base_points: 1,
            tags: ["Vantagem"],
          },
          {
            id: "quirk-001",
            name: "Hábito Menor",
            base_points: -1,
            tags: ["Peculiaridade"],
          },
        ],
      },
      {
        id: "unknown-001",
        name: "Sem classificação",
      },
    ],
  });

  assert.equal(snapshot.traits.containers.length, 1);
  assert.equal(snapshot.traits.containers[0].containerType, "race");
  assert.equal(snapshot.traits.advantages.length, 1);
  assert.equal(snapshot.traits.advantages[0].name, "Visão Noturna");
  assert.deepEqual(snapshot.traits.advantages[0].importMeta.containerIds, ["race-001"]);
  assert.equal(snapshot.traits.quirks.length, 1);
  assert.equal(snapshot.traits.unknownNodes.length, 1);
});

test("imports traits into character rich trait buckets", () => {
  const character = importCharacter({
    id: "char-001",
    profile: {
      name: "Trait Hero",
    },
    rows: [
      {
        id: "adv-001",
        name: "Ataque Inato",
        base_points: 20,
        tags: ["Vantagem"],
        modifiers: [{ name: "Poder", cost: -10 }],
        features: [{ type: "skill_bonus", amount: 1 }],
        weapons: [{ type: "ranged_weapon" }],
        prereqs: { type: "trait_prereq" },
      },
      {
        id: "perk-001",
        name: "Acessório",
        base_points: 1,
        tags: ["Qualidade"],
      },
      {
        id: "disadv-001",
        name: "Mau Humor",
        base_points: -10,
        tags: ["Desvantagem"],
      },
      {
        id: "quirk-001",
        name: "Hábito Menor",
        base_points: -1,
        tags: ["Peculiaridade"],
      },
    ],
  });

  assert.equal(character.advantages.length, 1);
  assert.equal(character.perks.length, 1);
  assert.equal(character.disadvantages.length, 1);
  assert.equal(character.quirks.length, 1);

  assert.equal(character.advantages[0].name, "Ataque Inato");
  assert.equal(character.advantages[0].points, 20);
  assert.deepEqual(character.advantages[0].modifiers, [{ name: "Poder", cost: -10 }]);
  assert.deepEqual(character.advantages[0].features, [{ type: "skill_bonus", amount: 1 }]);
  assert.deepEqual(character.advantages[0].weapons, [{ type: "ranged_weapon" }]);
  assert.deepEqual(character.advantages[0].prereqs, { type: "trait_prereq" });
});
