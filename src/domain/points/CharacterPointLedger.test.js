import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../character/Character.js";
import {
  executeTraitCostAuthorityPlan,
} from "../character/TraitCostAuthorityExecutor.js";
import {
  planTraitCostAuthority,
} from "../character/TraitCostAuthorityPlan.js";
import {
  evaluateCharacterPointLedger,
} from "./CharacterPointLedger.js";

function promoteTraits(character) {
  return executeTraitCostAuthorityPlan(
    character,
    planTraitCostAuthority(character, {
      now: "2026-06-21T18:10:00.000Z",
      operationId: "operation-character-ledger",
      planId: "plan-character-ledger",
    }),
    { now: "2026-06-21T18:11:00.000Z" },
  ).character;
}

test("default Character exposes explicit partial coverage instead of a false total", () => {
  const character = createCharacter({
    identity: {
      id: "character-ledger-default",
      name: "Default",
    },
  });
  const ledger = evaluateCharacterPointLedger(character);
  const domains = new Map(ledger.domainReports.map(item => [item.domain, item]));

  assert.equal(ledger.status, "partial");
  assert.equal(ledger.complete, false);
  assert.equal(ledger.totals.knownSpentPoints, 0);
  assert.equal(ledger.totals.totalSpentPoints, null);
  assert.equal(domains.get("attribute").status, "pending");
  assert.equal(domains.get("secondary-characteristic").status, "pending");
  assert.equal(domains.get("trait").status, "ready");
  assert.equal(domains.get("skill").status, "ready");
  assert.equal(domains.get("technique").status, "ready");
  assert.equal(domains.get("magic").status, "ready");
  assert.equal(domains.get("template").status, "excluded");
  assert.equal(domains.get("equipment").status, "excluded");
});

test("authorized Traits contribute to known spending while incomplete domains keep total null", () => {
  const character = promoteTraits(createCharacter({
    identity: {
      id: "character-ledger-traits",
      name: "Traits",
    },
    pointBudget: {
      declaredPoints: 100,
    },
    traits: [
      {
        id: "advantage-a",
        role: "advantage",
        name: "Advantage",
        pointValue: { mode: "total", basePoints: 20 },
      },
      {
        id: "disadvantage-a",
        role: "disadvantage",
        name: "Disadvantage",
        pointValue: { mode: "total", basePoints: -10 },
      },
    ],
  }));
  const ledger = evaluateCharacterPointLedger(character);
  const trait = ledger.domainReports.find(item => item.domain === "trait");

  assert.equal(trait.status, "ready");
  assert.equal(trait.totalPoints, 10);
  assert.equal(ledger.totals.knownSpentPoints, 10);
  assert.equal(ledger.totals.totalSpentPoints, null);
  assert.equal(ledger.budget.calculatedUnspentPoints, null);
  assert.equal(
    ledger.totals.byCategory.find(item => item.category === "advantages").knownPoints,
    20,
  );
  assert.equal(
    ledger.totals.byCategory.find(item => item.category === "disadvantages").knownPoints,
    -10,
  );
});

test("raw Skill, Technique and Magic points remain pending and are not summed", () => {
  const character = createCharacter({
    identity: {
      id: "character-ledger-open-domains",
      name: "Open Domains",
    },
    skills: [{
      id: "skill-a",
      name: "Skill",
      points: 8,
    }],
    techniques: [{
      id: "technique-a",
      name: "Technique",
      points: 3,
      defaultSkillId: "skill-a",
    }],
    spells: [{
      id: "spell-a",
      name: "Spell",
      points: 4,
    }],
  });
  const ledger = evaluateCharacterPointLedger(character);
  const domains = new Map(ledger.domainReports.map(item => [item.domain, item]));

  assert.equal(domains.get("skill").status, "pending");
  assert.equal(domains.get("technique").status, "pending");
  assert.equal(domains.get("magic").status, "pending");
  assert.equal(domains.get("skill").knownPoints, 0);
  assert.equal(domains.get("technique").knownPoints, 0);
  assert.equal(domains.get("magic").knownPoints, 0);
  assert.equal(ledger.totals.knownSpentPoints, 0);
  assert.ok(ledger.contributions.every(item => item.points === null));
});

test("Template catalog cost is reconciled but excluded from direct spending", () => {
  const character = createCharacter({
    identity: {
      id: "character-ledger-template",
      name: "Template",
    },
    templates: [{
      id: "template-a",
      name: "Template A",
      templateType: "template",
      importedPoints: 25,
      calculatedPoints: 20,
    }],
  });
  const ledger = evaluateCharacterPointLedger(character);
  const template = ledger.domainReports.find(item => item.domain === "template");
  const discrepancy = ledger.discrepancies.find(item => (
    item.id === "template:template-a:catalog-reconciliation"
  ));

  assert.equal(template.status, "excluded");
  assert.equal(template.totalPoints, 0);
  assert.equal(ledger.totals.knownSpentPoints, 0);
  assert.equal(discrepancy.status, "divergent");
  assert.equal(discrepancy.difference, -5);
  assert.equal(discrepancy.provenance.countedInSpentTotal, false);
});

test("point budget survives Character save/load while ledger remains derived", () => {
  const original = createCharacter({
    identity: {
      id: "character-ledger-roundtrip",
      name: "Roundtrip",
    },
    pointBudget: {
      declaredPoints: 250,
      importedPoints: 250,
      importedUnspentPoints: 25,
      source: {
        kind: "imported",
        provider: "gcs",
        format: "gcs",
      },
    },
  });
  const serialized = serializeCharacter(original);
  const restored = createCharacter(structuredClone(serialized));
  const ledger = evaluateCharacterPointLedger(restored);

  assert.deepEqual(serializeCharacter(restored), serialized);
  assert.equal(restored.pointBudget.importedPoints, 250);
  assert.equal(Object.hasOwn(serialized, "pointLedger"), false);
  assert.equal(ledger.status, "partial");
  assert.equal(ledger.budget.importedUnspentPoints, 25);
  assert.equal(ledger.budget.calculatedUnspentPoints, null);
});

test("ledger projection is deterministic and does not mutate the Character", () => {
  const character = createCharacter({
    identity: {
      id: "character-ledger-deterministic",
      name: "Deterministic",
    },
    pointBudget: { declaredPoints: 100 },
  });
  const before = serializeCharacter(character);
  const first = evaluateCharacterPointLedger(character);
  const second = evaluateCharacterPointLedger(character);

  assert.deepEqual(first, second);
  assert.deepEqual(serializeCharacter(character), before);
  assert.notEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
});
