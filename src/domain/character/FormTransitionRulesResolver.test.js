import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  analyzeFormTransitionRules,
  applyResolvedFormTransitionRules,
  applyResolvedFormTransitionRulesToAll,
} from "./FormTransitionRulesResolver.js";

function createTransitionCharacter({
  wolfModifiers = [],
  batModifiers = [],
  wolfFeatures = [],
  setTransitionRules,
  wolfTransitionRules,
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
        id: "adv-wolf",
        name: "Forma Alternativa",
        modifiers: wolfModifiers,
        features: wolfFeatures,
      },
      {
        id: "adv-bat",
        name: "Forma Alternativa",
        modifiers: batModifiers,
      },
    ],
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Forma de Lobo",
      },
      {
        id: "template-bat",
        templateType: "form",
        name: "Forma de Morcego",
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
        baseFormId: "form-base",
        activeFormId: "form-base",
        transitionRules: setTransitionRules,
        forms: [
          {
            id: "form-base",
            name: "Humanoide",
          },
          {
            id: "form-wolf",
            name: "Lobo",
            templateId: "template-wolf",
            sourceTraitId: "adv-wolf",
            transitionRules: wolfTransitionRules,
          },
          {
            id: "form-bat",
            name: "Morcego",
            templateId: "template-bat",
            sourceTraitId: "adv-bat",
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

test("keeps conservative rules when target form has no evidence", () => {
  const report = analyzeFormTransitionRules(
    createTransitionCharacter(),
    "set-body",
    "form-wolf",
  );

  assert.equal(report.formId, "form-wolf");
  assert.equal(report.transitionRules.activation.baseTimeSeconds, null);
  assert.equal(report.transitionRules.activation.timeStepsDelta, 0);
  assert.equal(report.transitionRules.activation.involuntary, false);
  assert.deepEqual(report.transitionRules.activation.costs, []);
  assert.equal(
    report.decisions.scalars.activation.timeStepsDelta.source,
    "existing",
  );
});

test("derives transition conditions from the target form trait", () => {
  const character = createTransitionCharacter({
    wolfModifiers: [
      { id: "mod-fatigue", name: "Custa Fadiga", levels: 2 },
      { id: "mod-extra-time", name: "Gasto Adicional de Tempo", levels: 2 },
      { id: "mod-reduced-time", name: "Tempo Reduzido", levels: 1 },
      { id: "mod-trigger", name: "Gatilho", notes: "@Lua cheia@" },
      { id: "mod-preparation", name: "Preparação Necessária", notes: "Ritual de 10 minutos" },
      { id: "mod-hindrance", name: "Impedimento", notes: "Prata consagrada" },
      { id: "mod-uncontrollable", name: "Incontrolável" },
    ],
  });

  const report = analyzeFormTransitionRules(
    character,
    "set-body",
    "form-wolf",
  );
  const rules = report.transitionRules;

  assert.equal(rules.activation.timeStepsDelta, 1);
  assert.equal(rules.activation.costs[0].resource, "FP");
  assert.equal(rules.activation.costs[0].amount, 2);
  assert.equal(rules.activation.triggers[0].description, "Lua cheia");
  assert.equal(rules.activation.requirements[0].description, "Ritual de 10 minutos");
  assert.equal(rules.impediments[0].description, "Prata consagrada");
  assert.equal(rules.activation.involuntary, true);
  assert.equal(
    report.decisions.collections.activation.costs.derivedFrom[0].ruleId,
    "gurps.costs-fatigue",
  );
});

test("does not leak modifiers from one form into another", () => {
  const character = createTransitionCharacter({
    wolfModifiers: [
      { id: "mod-fatigue", name: "Custa Fadiga", levels: 3 },
    ],
    batModifiers: [
      { id: "mod-trigger", name: "Gatilho", notes: "Escuridão total" },
    ],
  });

  const wolf = analyzeFormTransitionRules(
    character,
    "set-body",
    "form-wolf",
  );
  const bat = analyzeFormTransitionRules(
    character,
    "set-body",
    "form-bat",
  );

  assert.equal(wolf.transitionRules.activation.costs[0].amount, 3);
  assert.deepEqual(wolf.transitionRules.activation.triggers, []);
  assert.deepEqual(bat.transitionRules.activation.costs, []);
  assert.equal(bat.transitionRules.activation.triggers[0].description, "Escuridão total");
});

test("ignores disabled modifiers", () => {
  const character = createTransitionCharacter({
    wolfModifiers: [
      { id: "mod-fatigue", name: "Custa Fadiga", levels: 3, disabled: true },
      { id: "mod-uncontrollable", name: "Incontrolável", disabled: true },
    ],
  });

  const report = analyzeFormTransitionRules(
    character,
    "set-body",
    "form-wolf",
  );

  assert.deepEqual(report.transitionRules.activation.costs, []);
  assert.equal(report.transitionRules.activation.involuntary, false);
  assert.equal(
    report.evidence.find(item => item.id === "mod-fatigue").enabled,
    false,
  );
});

test("uses explicit structured transition features", () => {
  const character = createTransitionCharacter({
    wolfFeatures: [
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
          duration: { maximumSeconds: 600 },
          return: {
            mode: "automatic",
            targetFormId: "form-base",
          },
        },
      },
    ],
  });

  const report = analyzeFormTransitionRules(
    character,
    "set-body",
    "form-wolf",
  );

  assert.equal(report.transitionRules.activation.baseTimeSeconds, 3);
  assert.equal(report.transitionRules.activation.maneuver, "Concentrate");
  assert.equal(report.transitionRules.activation.tests[0].modifier, -2);
  assert.equal(report.transitionRules.duration.maximumSeconds, 600);
  assert.equal(report.transitionRules.return.mode, "automatic");
  assert.equal(report.transitionRules.return.targetFormId, "form-base");
  assert.equal(report.decisions.scalars.activation.maneuver.source, "explicit");
});

test("applies campaign rules and manual collection replacement", () => {
  const character = createTransitionCharacter({
    wolfModifiers: [
      { id: "mod-trigger", name: "Gatilho", notes: "Lua cheia" },
    ],
  });

  const report = analyzeFormTransitionRules(
    character,
    "set-body",
    "form-wolf",
    {
      campaignRules: [
        {
          id: "campaign-will-test",
          when: {
            formIds: ["form-wolf"],
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
    },
  );

  assert.equal(report.transitionRules.activation.maneuver, "Ready");
  assert.deepEqual(report.transitionRules.activation.triggers, []);
  assert.equal(report.transitionRules.activation.tests[0].target, "Will");
  assert.equal(report.decisions.scalars.activation.maneuver.source, "manual");
  assert.equal(report.decisions.collections.activation.triggers.source, "manual");
  assert.equal(report.decisions.collections.activation.tests.source, "campaign");
});

test("reports equal-priority scalar conflicts", () => {
  const report = analyzeFormTransitionRules(
    createTransitionCharacter(),
    "set-body",
    "form-wolf",
    {
      campaignRules: [
        {
          id: "rule-a",
          priority: 250,
          transitionRules: { return: { mode: "automatic" } },
        },
        {
          id: "rule-b",
          priority: 250,
          transitionRules: { return: { mode: "locked" } },
        },
      ],
    },
  );

  assert.equal(report.transitionRules.return.mode, "automatic");
  assert.equal(report.decisions.scalars.return.mode.conflict, true);
  assert.equal(report.diagnostics[0].path, "return.mode");
  assert.equal(report.diagnostics[0].rejectedValue, "locked");
});

test("persists resolution and override on the target form", () => {
  const character = createTransitionCharacter({
    wolfModifiers: [
      { id: "mod-fatigue", name: "Costs Fatigue", levels: 2 },
    ],
  });

  const result = applyResolvedFormTransitionRules(
    character,
    "set-body",
    "form-wolf",
    {
      now: "2026-06-19T12:00:00.000Z",
      manualOverride: {
        activation: { maneuver: "Concentrate" },
      },
      overrideId: "master-ruling-001",
    },
  );
  const form = result.character.alternateFormSets[0].forms[1];

  assert.equal(form.transitionRules.activation.costs[0].amount, 2);
  assert.equal(form.transitionRules.activation.maneuver, "Concentrate");
  assert.equal(form.transitionRulesOverride.activation.maneuver, "Concentrate");
  assert.equal(form.transitionRulesResolution.formId, "form-wolf");
  assert.equal(
    form.transitionRulesResolution.decisions.collections.activation.costs.source,
    "builtin",
  );
  assert.equal(result.character.metadata.updatedAt, "2026-06-19T12:00:00.000Z");
  assert.equal(result.character.alternateFormSets[0].forms[2].transitionRules, null);
});

test("recomputes from form or set base rules after modifier removal", () => {
  const original = createTransitionCharacter({
    wolfModifiers: [
      { id: "mod-extra-time", name: "Gasto Adicional de Tempo", levels: 2 },
    ],
    setTransitionRules: {
      activation: { timeStepsDelta: 1 },
    },
  });
  const first = applyResolvedFormTransitionRules(
    original,
    "set-body",
    "form-wolf",
  ).character;

  assert.equal(first.alternateFormSets[0].forms[1].transitionRules.activation.timeStepsDelta, 3);
  assert.equal(
    first.alternateFormSets[0].forms[1].transitionRulesResolution.baseRules.activation.timeStepsDelta,
    1,
  );

  const changed = createCharacter({
    ...first,
    advantages: [
      { id: "adv-wolf", name: "Forma Alternativa", modifiers: [] },
      first.advantages[1],
    ],
  });
  const second = applyResolvedFormTransitionRules(
    changed,
    "set-body",
    "form-wolf",
  ).character;

  assert.equal(second.alternateFormSets[0].forms[1].transitionRules.activation.timeStepsDelta, 1);
  assert.equal(
    second.alternateFormSets[0].forms[1].transitionRulesResolution.decisions.scalars.activation.timeStepsDelta.source,
    "existing",
  );
});

test("resolves every form with nested per-form overrides", () => {
  const character = createTransitionCharacter({ secondSet: true });

  const result = applyResolvedFormTransitionRulesToAll(character, {
    manualOverrides: {
      "set-body": {
        "form-wolf": {
          activation: { involuntary: true },
        },
        "form-bat": {
          activation: { maneuver: "Concentrate" },
        },
      },
      "armor-active": {
        activation: { maneuver: "Ready" },
      },
    },
  });

  assert.equal(result.resolutions.length, 5);
  assert.equal(
    result.character.alternateFormSets[0].forms[1].transitionRules.activation.involuntary,
    true,
  );
  assert.equal(
    result.character.alternateFormSets[0].forms[2].transitionRules.activation.maneuver,
    "Concentrate",
  );
  assert.equal(
    result.character.alternateFormSets[1].forms[1].transitionRules.activation.maneuver,
    "Ready",
  );
});

test("rejects invalid identifiers directives and timestamps", () => {
  const character = createTransitionCharacter();

  assert.throws(() => {
    analyzeFormTransitionRules(character, "missing", "form-wolf");
  });
  assert.throws(() => {
    analyzeFormTransitionRules(character, "set-body", "missing");
  });
  assert.throws(() => {
    analyzeFormTransitionRules(character, "set-body", "form-wolf", {
      campaignRules: "rules",
    });
  });
  assert.throws(() => {
    analyzeFormTransitionRules(character, "set-body", "form-wolf", {
      manualOverride: { return: { mode: "random" } },
    });
  });
  assert.throws(() => {
    applyResolvedFormTransitionRules(
      character,
      "set-body",
      "form-wolf",
      { now: 123 },
    );
  });
});
