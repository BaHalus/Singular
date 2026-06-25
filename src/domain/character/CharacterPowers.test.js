import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
  validateCharacter,
} from "./Character.js";
import {
  evaluateCharacterPointLedger,
} from "../points/CharacterPointLedger.js";
import {
  serializePointLedger,
} from "../points/PointLedger.js";

function identity() {
  return {
    id: "character-powers",
    name: "Personagem com poderes",
  };
}

function advantages() {
  return [
    {
      id: "trait-fire-talent",
      name: "Talento do Fogo",
      points: 5,
    },
    {
      id: "trait-burning-attack",
      name: "Ataque Ardente",
      points: 20,
      modifiers: [
        {
          id: "modifier-fire-power",
          name: "Poder do Fogo",
          value: -10,
        },
      ],
    },
  ];
}

function powers() {
  return [
    {
      id: "power-fire",
      externalIds: { source: "campaign" },
      name: "Poder do Fogo",
      source: "Fogo",
      powerModifier: {
        name: "Poder do Fogo",
        valuePercent: -10,
        notes: "Declaração do agrupamento.",
      },
      talentTraitId: "trait-fire-talent",
      memberTraitIds: ["trait-burning-attack"],
      tags: ["elemental"],
      importMeta: { source: "manual" },
      raw: { original: true },
    },
  ];
}

test("Character creates and validates canonical Powers references", () => {
  const character = createCharacter({
    identity: identity(),
    advantages: advantages(),
    powers: powers(),
  });

  assert.equal(validateCharacter(character), true);
  assert.equal(character.powers.length, 1);
  assert.equal(character.powers[0].talentTraitId, "trait-fire-talent");
  assert.deepEqual(
    character.powers[0].memberTraitIds,
    ["trait-burning-attack"],
  );
  assert.equal("traits" in character.powers[0], false);
  assert.equal("points" in character.powers[0], false);
});

test("Character serializes Powers as detached canonical snapshots", () => {
  const character = createCharacter({
    identity: identity(),
    advantages: advantages(),
    powers: powers(),
  });

  const serialized = serializeCharacter(character);
  serialized.powers[0].memberTraitIds.push("copy-only");
  serialized.powers[0].powerModifier.valuePercent = -20;
  serialized.powers[0].raw.original = false;

  assert.deepEqual(
    character.powers[0].memberTraitIds,
    ["trait-burning-attack"],
  );
  assert.equal(character.powers[0].powerModifier.valuePercent, -10);
  assert.deepEqual(character.powers[0].raw, { original: true });
});

test("Character rejects Powers that reference missing Traits", () => {
  assert.throws(
    () => createCharacter({
      identity: identity(),
      advantages: advantages(),
      powers: [{
        id: "power-missing-talent",
        talentTraitId: "trait-missing",
      }],
    }),
    /references missing talent Trait: trait-missing/,
  );

  assert.throws(
    () => createCharacter({
      identity: identity(),
      advantages: advantages(),
      powers: [{
        id: "power-missing-member",
        memberTraitIds: ["trait-missing"],
      }],
    }),
    /references missing member Trait: trait-missing/,
  );
});

test("Powers does not add a parallel Point Ledger contribution", () => {
  const withoutPower = createCharacter({
    identity: identity(),
    advantages: advantages(),
  });
  const withPower = createCharacter({
    identity: identity(),
    advantages: advantages(),
    powers: powers(),
  });

  assert.deepEqual(
    serializePointLedger(evaluateCharacterPointLedger(withPower)),
    serializePointLedger(evaluateCharacterPointLedger(withoutPower)),
  );
});

test("Character rejects the former raw Powers collection shape", () => {
  assert.throws(
    () => createCharacter({
      identity: identity(),
      powers: [{
        id: "power-legacy",
        name: "Formato antigo",
        traits: [{ id: "duplicated-trait" }],
        memberTraitIds: ["duplicated-trait"],
      }],
    }),
    /references missing member Trait: duplicated-trait/,
  );
});
