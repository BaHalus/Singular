import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  analyzeFormTransitionRules,
  applyResolvedFormTransitionRules,
  applyResolvedFormTransitionRulesToAll,
} from "./FormTransitionRulesResolver.js";

function createTransitionCharacter({
  modifiers = [],
  features = [],
  transitionRules,
  secondSet = false,
} = {}) {
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
        transitionRules,
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

test("keeps conservative rules when no evidence exists", () => {
  const report = analyzeFormTransitionRules(
    createTransitionCharacter(),
    "set-body",
  );

  assert.equal(report.transitionRules.activation.baseTimeSeconds, null);
  assert.equal(report.transitionRules.activation.timeStepsDelta, 0);
  assert.equal(report.transitionRules.activation.involuntary, false);
  assert.deepEqual(report.transitionRules.activation.costs, []);
  assert.equal(
    report.decisions.scalars.activation.timeStepsDelta.source,
    "existing",
  );
  assert.deepEqual(report.diagnostics, []);
});

test("derives costs time steps trigger preparation hindrance and involuntary activation", () => {
  const character = createTransitionCharacter({
    modifiers: [
      {
        id: "mod-fatigue",
        name: "Custa Fadiga",
        levels: 2,
        disabled: false,
      },
      {
        id: "mod-extra-time",
        name: "Gasto Adicional de Tempo",
        levels: 2,
        disabled: false,
      },
      {
        id: "mod-reduced-time",
        name: "Tempo Reduzido",
        levels: 1,
        disabled: false,
      },
      {
        id: "mod-trigger",
        name: "Gatilho",
        notes: "@Lua cheia@",
        disabled: false,
      },
      {
        id: "mod-preparation",
        name: "Preparação Necessária",
        notes: "Ritual de 10 minutos",
        disabled: false,
      },
      {
        id: "mod-hindrance",
        name: "Impedimento",
        notes: "Prata consagrada",
        disabled: false,
      },
      {
        id: "mod-uncontrollable",
        name: "Incontrolável",
        disabled: false,
      },
    ],
  });

  const report = analyzeFormTransitionRules(character, "set-body");
  const rules = report.transitionRules;

  assert.equal(rules.activation.timeStepsDelta, 1);
  assert.equal(rules.activation.costs.length, 1);
  assert.equal(rules.activation.costs[0].resource, "FP");
  assert.equal(rules.activation.costs[0].amount, 2);
  assert.equal(rules.activation.triggers[0].description, "Lua cheia");
  assert.equal(
    rules.activation.requirements[0].description,
    "Ritual de 10 minutos",
  );
  assert.equal(rules.impediments[0].description, "Prata consagrada");
  assert.equal(rules.activation.involuntary, true);

  assert.equal(
    report.decisions.scalars.activation.timeStepsDelta.source,
    "builtin",
  );
  assert.equal(
    report.decisions.collections.activation.costs.derivedFrom[0].ruleId,
    "gurps.costs-fatigue",
  );
  assert.equal(
    report.decisions.scalars.activation.involuntary.derivedFrom[0].ruleId,
    "gurps.uncontrollable",
  );
});

test("ignores disabled transition modifiers", () => {
  const character = createTransitionCharacter({
    modifiers: [
      {
        id: "mod-fatigue",
        name: "Custa Fadiga",
        levels: 3,
        disabled: true,
      },
      {
        id: "mod-uncontrollable",
        name: "Incontrolável",
        disabled: true,
      },
    ],
  });

  const report = analyzeFormTransitionRules(character, "set-body");

  assert.deepEqual(report.transitionRules.activation.costs, []);
  assert.equal(report.transitionRules.activation.involuntary, false);
  assert.equal(
    report.evidence.find(item => item.id === "mod-fatigue").enabled,
    false,
  );
});

test("uses explicit structured transition features", () => {
  const character = createTransitionCharacter({
    features: [
      {
        id: "feature-transition",
        type: "form_transition_rule",
        rules: {
          activation: {
            baseTimeSeconds: 3,
            maneuver: "Concentrate",
            tests: [
              {
                id: "test-will",
                kind: "attribute",
                target: "Will",
                modifier: -2,
              },
            ],
          },
          duration: {
            maximumSeconds: 600,
          },
          return: {
            mode: "automatic",
            targetFormId: "form-base",
          },
        },
      },
    ],
  });

  const report = analyzeFormTransitionRules(character, "set-body");

  assert.equal(report.transitionRules.activation.baseTimeSeconds, 3);
  assert.equal(report.transitionRules.activation.maneuver, "Concentrate");
  assert.equal(report.transitionRules.activation.tests[0].modifier, -2);
  assert.equal(report.transitionRules.duration.maximumSeconds, 600);
  assert.equal(report.transitionRules.return.mode, "automatic");
  assert.equal(report.transitionRules.return.targetFormId, "form-base");
  assert.equal(
    report.decisions.scalars.activation.maneuver.source,
    "explicit",
  );
});

test("applies campaign rules and manual replacement", () => {
  const character = createTransitionCharacter({
    modifiers: [
      {
        id: "mod-trigger",
        name: "Gatilho",
        notes: "Lua cheia",
      },
    ],
  });

  const report = analyzeFormTransitionRules(character, "set-body", {
    campaignRules: [
      {
        id: "campaign-will-test",
        when: {
          modifierNames: ["Gatilho"],
        },
        transitionRules: {
          activation: {
            maneuver: "Concentrate",
            tests: [
              {
                id: "test-will",
                kind: "attribute",
                target: "Will",
                modifier: -1,
              },
            ],
          },
        },
      },
    ],
    manualOverride: {
      activation: {
        maneuver: "Ready",
        triggers: [],
      },
    },
    overrideId: "master-ruling-001",
  });

  assert.equal(report.transitionRules.activation.maneuver, "Ready");
  assert.deepEqual(report.transitionRules.activation.triggers, []);
  assert.equal(report.transitionRules.activation.tests.length, 1);
  assert.equal(
    report.decisions.scalars.activation.maneuver.source,
    "manual",
  );
  assert.equal(
    report.decisions.collections.activation.triggers.source,
    "manual",
  );
  assert.equal(
    report.decisions.collections.activation.tests.source,
    "campaign",
  );
});

test("reports equal-priority scalar conflicts deterministically", () => {
  const report = analyzeFormTransitionRules(
    createTransitionCharacter(),
    "set-body",
    {
      campaignRules: [
        {
          id: "rule-a",
          priority: 250,
          transitionRules: {
            return: {
              mode: "automatic",
            },
          },
        },
        {
          id: "rule-b",
          priority: 250,
          transitionRules: {
            return: {
              mode: "locked",
            },
          },
        },
      ],
    },
  );

  assert.equal(report.transitionRules.return.mode, "automatic");
  assert.equal(report.decisions.scalars.return.mode.conflict, true);
  assert.equal(report.diagnostics.length, 1);
  assert.equal(report.diagnostics[0].path, "return.mode");
  assert.equal(report.diagnostics[0].rejectedValue, "locked");
});

test("applies and persists explainable transition resolution", () => {
  const character = createTransitionCharacter({
    modifiers: [
      {
        id: "mod-fatigue",
        name: "Costs Fatigue",
        levels: 2,
      },
    ],
  });

  const result = applyResolvedFormTransitionRules(
    character,
    "set-body",
    {
      now: "2026-06-19T12:00:00.000Z",
      manualOverride: {
        activation: {
          maneuver: "Concentrate",
        },
      },
      overrideId: "master-ruling-001",
    },
  );
  const set = result.character.alternateFormSets[0];

  assert.equal(set.transitionRules.activation.costs[0].amount, 2);
  assert.equal(set.transitionRules.activation.maneuver, "Concentrate");
  assert.equal(set.transitionRulesOverride.activation.maneuver, "Concentrate");
  assert.equal(set.transitionRulesResolution.setId, "set-body");
  assert.equal(
    set.transitionRulesResolution.decisions.collections.activation.costs.source,
    "builtin",
  );
  assert.equal(
    set.transitionRulesResolution.decisions.scalars.activation.maneuver.source,
    "manual",
  );
  assert.equal(
    result.character.metadata.updatedAt,
    "2026-06-19T12:00:00.000Z",
  );
});

test("recomputes from base rules after a modifier is removed", () => {
  const original = createTransitionCharacter({
    modifiers: [
      {
        id: "mod-extra-time",
        name: "Gasto Adicional de Tempo",
        levels: 2,
      },
    ],
    transitionRules: {
      activation: {
        timeStepsDelta: 1,
      },
    },
  });
  const first = applyResolvedFormTransitionRules(
    original,
    "set-body",
  ).character;

  assert.equal(first.alternateFormSets[0].transitionRules.activation.timeStepsDelta, 3);
  assert.equal(
    first.alternateFormSets[0].transitionRulesResolution.baseRules.activation.timeStepsDelta,
    1,
  );

  const changed = createCharacter({
    ...first,
    advantages: [
      {
        id: "adv-form",
        name: "Forma Alternativa",
        modifiers: [],
      },
    ],
  });
  const second = applyResolvedFormTransitionRules(
    changed,
    "set-body",
  ).character;

  assert.equal(second.alternateFormSets[0].transitionRules.activation.timeStepsDelta, 1);
  assert.equal(
    second.alternateFormSets[0].transitionRulesResolution.decisions.scalars.activation.timeStepsDelta.source,
    "existing",
  );
});

test("resolves all form sets with per-set overrides", () => {
  const character = createTransitionCharacter({ secondSet: true });

  const result = applyResolvedFormTransitionRulesToAll(character, {
    manualOverrides: {
      "set-body": {
        activation: {
          involuntary: true,
        },
      },
      "set-armor": {
        activation: {
          maneuver: "Ready",
        },
      },
    },
  });

  assert.equal(result.resolutions.length, 2);
  assert.equal(
    result.character.alternateFormSets[0].transitionRules.activation.involuntary,
    true,
  );
  assert.equal(
    result.character.alternateFormSets[1].transitionRules.activation.maneuver,
    "Ready",
  );
});

test("rejects invalid rules and timestamps", () => {
  const character = createTransitionCharacter();

  assert.throws(() => {
    analyzeFormTransitionRules(character, "missing");
  });

  assert.throws(() => {
    analyzeFormTransitionRules(character, "set-body", {
      campaignRules: "rules",
    });
  });

  assert.throws(() => {
    analyzeFormTransitionRules(character, "set-body", {
      manualOverride: {
        return: {
          mode: "random",
        },
      },
    });
  });

  assert.throws(() => {
    applyResolvedFormTransitionRules(character, "set-body", {
      now: 123,
    });
  });
});
