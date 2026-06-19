import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  analyzeFormStatePolicy,
  resolveFormStatePolicy,
  applyResolvedFormStatePolicy,
  applyResolvedFormStatePolicies,
} from "./FormStatePolicyResolver.js";

function createPolicyCharacter({
  modifier,
  feature,
  statePolicy,
  secondSet = false,
} = {}) {
  const modifiers = modifier ? [modifier] : [];
  const features = feature ? [feature] : [];

  return createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa",
        points: 15,
        modifiers,
        features,
      },
    ],
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
      },
      ...(secondSet
        ? [{
          id: "template-armor",
          templateType: "form",
          name: "Forma Blindada",
        }]
        : []),
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        sourceTraitId: "adv-form",
        baseFormId: "form-base",
        activeFormId: "form-base",
        statePolicy,
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: "template-wolf",
            sourceTraitId: "adv-form",
          },
        ],
      },
      ...(secondSet
        ? [{
          id: "set-armor",
          name: "Revestimento",
          baseFormId: "armor-base",
          activeFormId: "armor-base",
          forms: [
            {
              id: "armor-base",
              name: "Sem revestimento",
            },
            {
              id: "armor-active",
              name: "Blindado",
              templateId: "template-armor",
            },
          ],
        }]
        : []),
    ],
    metadata: {
      createdAt: "2026-06-19T08:00:00.000Z",
      updatedAt: "2026-06-19T08:00:00.000Z",
      source: "singular",
    },
  });
}

test("keeps existing policy when no rule produces evidence", () => {
  const report = analyzeFormStatePolicy(createPolicyCharacter(), "set-body");

  assert.equal(report.policy.pools.HP, "shared");
  assert.equal(report.policy.injuries, "shared");
  assert.equal(report.decisions.pools.HP.source, "existing");
  assert.equal(report.decisions.injuries.source, "existing");
  assert.deepEqual(report.diagnostics, []);
});

test("derives separate damage state from enabled non-reciprocal damage", () => {
  const character = createPolicyCharacter({
    modifier: {
      type: "modifier",
      id: "mod-damage",
      name: "Dano Não-Recíproco",
      disabled: false,
    },
  });

  const report = analyzeFormStatePolicy(character, "set-body");

  assert.equal(report.policy.pools.HP, "perForm");
  assert.equal(report.policy.injuries, "perForm");
  assert.equal(report.policy.pools.FP, "shared");
  assert.equal(report.decisions.pools.HP.source, "builtin");
  assert.equal(
    report.decisions.pools.HP.derivedFrom[0].ruleId,
    "gurps.non-reciprocal-damage",
  );
  assert.equal(report.decisions.injuries.source, "builtin");
});

test("ignores disabled modifiers", () => {
  const character = createPolicyCharacter({
    modifier: {
      type: "modifier",
      id: "mod-damage",
      name: "Dano Não-Recíproco",
      disabled: true,
    },
  });

  const report = analyzeFormStatePolicy(character, "set-body");

  assert.equal(report.policy.pools.HP, "shared");
  assert.equal(report.policy.injuries, "shared");
  assert.equal(
    report.evidence.find(item => item.id === "mod-damage").enabled,
    false,
  );
});

test("uses explicit policy directives from features", () => {
  const character = createPolicyCharacter({
    feature: {
      type: "form_state_policy",
      id: "feature-equipment",
      target: "equipment",
      mode: "perForm",
    },
  });

  const report = analyzeFormStatePolicy(character, "set-body");

  assert.equal(report.policy.equipment, "perForm");
  assert.equal(report.decisions.equipment.source, "explicit");
  assert.equal(
    report.decisions.equipment.derivedFrom[0].id,
    "feature-equipment",
  );
});

test("applies campaign rules by exact modifier name", () => {
  const character = createPolicyCharacter({
    modifier: {
      type: "modifier",
      id: "mod-absorption",
      name: "Mudança com Absorção",
      disabled: false,
    },
  });

  const report = analyzeFormStatePolicy(character, "set-body", {
    campaignRules: [
      {
        id: "campaign.absorptive-equipment",
        name: "Equipamento próprio em mudança com absorção",
        when: {
          modifierNames: ["Mudança com Absorção"],
        },
        policy: {
          equipment: "perForm",
        },
      },
    ],
  });

  assert.equal(report.policy.equipment, "perForm");
  assert.equal(report.decisions.equipment.source, "campaign");
  assert.equal(
    report.decisions.equipment.derivedFrom[0].ruleId,
    "campaign.absorptive-equipment",
  );
});

test("manual override wins over derived rules and records provenance", () => {
  const character = createPolicyCharacter({
    modifier: {
      type: "modifier",
      id: "mod-damage",
      name: "Dano Não-Recíproco",
      disabled: false,
    },
  });

  const report = analyzeFormStatePolicy(character, "set-body", {
    manualOverride: {
      pools: {
        HP: "shared",
      },
      injuries: "shared",
    },
    overrideId: "master-ruling-001",
    overrideName: "Decisão do mestre",
  });

  assert.equal(report.policy.pools.HP, "shared");
  assert.equal(report.policy.injuries, "shared");
  assert.equal(report.decisions.pools.HP.source, "manual");
  assert.equal(report.decisions.pools.HP.overridden, true);
  assert.equal(
    report.decisions.pools.HP.derivedFrom[0].id,
    "master-ruling-001",
  );
});

test("reports equal-priority campaign conflicts without arbitrary replacement", () => {
  const character = createPolicyCharacter();

  const report = analyzeFormStatePolicy(character, "set-body", {
    campaignRules: [
      {
        id: "rule-a",
        priority: 250,
        policy: {
          effects: "perForm",
        },
      },
      {
        id: "rule-b",
        priority: 250,
        policy: {
          effects: "shared",
        },
      },
    ],
  });

  assert.equal(report.policy.effects, "perForm");
  assert.equal(report.decisions.effects.conflict, true);
  assert.equal(report.diagnostics.length, 1);
  assert.equal(report.diagnostics[0].path, "effects");
  assert.equal(report.diagnostics[0].keptMode, "perForm");
  assert.equal(report.diagnostics[0].rejectedMode, "shared");
});

test("collects evidence from linked templates", () => {
  const character = createCharacter({
    identity: {
      id: "char-001",
      name: "Eldrin",
      concept: "Metamorfo",
      playerId: null,
      campaignId: null,
    },
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
        traits: {
          advantages: [
            {
              id: "adv-template",
              name: "Corpo Lupino",
              points: 10,
              features: [
                {
                  type: "form_state_policy",
                  id: "feature-injuries",
                  target: "injuries",
                  mode: "perForm",
                },
              ],
            },
          ],
        },
      },
    ],
    alternateFormSets: [
      {
        id: "set-body",
        name: "Corpo",
        baseFormId: "form-base",
        activeFormId: "form-base",
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: "template-wolf",
          },
        ],
      },
    ],
  });

  const report = analyzeFormStatePolicy(character, "set-body");

  assert.equal(report.policy.injuries, "perForm");
  assert.equal(report.decisions.injuries.source, "explicit");
  assert.equal(
    report.decisions.injuries.derivedFrom[0].templateId,
    "template-wolf",
  );
});

test("applies and serializes explainable resolution on the form set", () => {
  const character = createPolicyCharacter({
    modifier: {
      type: "modifier",
      id: "mod-damage",
      name: "Non-Reciprocal Damage",
      disabled: false,
    },
  });

  const result = applyResolvedFormStatePolicy(character, "set-body", {
    now: "2026-06-19T12:00:00.000Z",
  });
  const set = result.character.alternateFormSets[0];

  assert.equal(set.statePolicy.pools.HP, "perForm");
  assert.equal(set.statePolicyResolution.setId, "set-body");
  assert.equal(
    set.statePolicyResolution.decisions.pools.HP.source,
    "builtin",
  );
  assert.equal(
    set.statePolicyResolution.resolvedAt,
    "2026-06-19T12:00:00.000Z",
  );
  assert.equal(
    result.character.metadata.updatedAt,
    "2026-06-19T12:00:00.000Z",
  );
});

test("resolves all sets with per-set manual overrides", () => {
  const character = createPolicyCharacter({ secondSet: true });

  const result = applyResolvedFormStatePolicies(character, {
    now: "2026-06-19T12:00:00.000Z",
    manualOverrides: {
      "set-body": {
        injuries: "perForm",
      },
      "set-armor": {
        equipment: "perForm",
      },
    },
  });

  assert.equal(result.resolutions.length, 2);
  assert.equal(
    result.character.alternateFormSets[0].statePolicy.injuries,
    "perForm",
  );
  assert.equal(
    result.character.alternateFormSets[1].statePolicy.equipment,
    "perForm",
  );
});

test("rejects invalid inputs and directives", () => {
  const character = createPolicyCharacter();

  assert.throws(() => {
    resolveFormStatePolicy(character, "missing");
  });

  assert.throws(() => {
    analyzeFormStatePolicy(character, "set-body", {
      campaignRules: "rules",
    });
  });

  assert.throws(() => {
    analyzeFormStatePolicy(character, "set-body", {
      manualOverride: {
        injuries: "reset",
      },
    });
  });

  assert.throws(() => {
    resolveFormStatePolicy(character, "set-body", {
      now: 123,
    });
  });
});
