import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  analyzeMorphProfile,
  resolveMorphProfile,
  applyResolvedMorphProfile,
  applyResolvedMorphProfiles,
} from "./MorphProfileResolver.js";

function createMorphCharacter({
  advantages = [],
  sourceTraitId = null,
  morphProfile = undefined,
  morphProfileOverride = undefined,
  secondSet = false,
} = {}) {
  const sets = [
    {
      id: "set-morph",
      name: "Morfose",
      mechanism: "morph",
      sourceTraitId,
      baseFormId: "form-base",
      activeFormId: "form-base",
      forms: [{ id: "form-base", name: "Forma natural" }],
      morphProfile,
      morphProfileOverride,
    },
  ];

  if (secondSet) {
    sets.push({
      id: "set-morph-second",
      name: "Morfose secundária",
      mechanism: "morph",
      sourceTraitId: "adv-morph-second",
      baseFormId: "form-second-base",
      activeFormId: "form-second-base",
      forms: [{ id: "form-second-base", name: "Forma natural secundária" }],
    });
  }

  return createCharacter({
    identity: {
      id: "char-morph-resolver",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    advantages,
    alternateFormSets: sets,
    metadata: {
      createdAt: "2026-06-19T08:00:00.000Z",
      updatedAt: "2026-06-19T08:00:00.000Z",
      source: "singular",
    },
  });
}

function morphAdvantage({
  id = "adv-morph",
  modifiers = [],
  features = [],
  raw = null,
} = {}) {
  return {
    id,
    name: "Morfose",
    modifiers,
    features,
    raw,
  };
}

test("links the unique Morfose advantage and resolves active modifiers", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({
        modifiers: [
          { id: "mod-unlimited", name: "Ilimitada" },
          { id: "mod-improvised", name: "Formas Improvisadas" },
          {
            id: "mod-disabled",
            name: "Não Exige Memorização",
            disabled: true,
          },
          {
            id: "mod-unknown",
            name: "Modificador futuro",
            notes: "Preservar sem interpretar.",
          },
        ],
      }),
    ],
  });

  const resolution = resolveMorphProfile(character, "set-morph", {
    now: "2026-06-19T12:00:00.000Z",
  });

  assert.equal(resolution.sourceTraitId, "adv-morph");
  assert.equal(resolution.sourceTraitResolution, "unique-name-match");
  assert.equal(resolution.morphProfile.pointLimitMode, "unlimited");
  assert.equal(resolution.morphProfile.pointLimit, null);
  assert.equal(resolution.morphProfile.pointLimitSource, "modifier");
  assert.equal(resolution.morphProfile.improvisation.mode, "allowed");
  assert.equal(resolution.morphProfile.memorization.mode, "unknown");
  assert.equal(
    resolution.recognizedModifiers.some(item => (
      item.ruleId === "gurps.morph.unlimited"
    )),
    true,
  );
  assert.equal(
    resolution.recognizedModifiers.some(item => (
      item.ruleId === "gurps.morph.improvised-forms"
    )),
    true,
  );
  assert.equal(
    resolution.ignoredModifiers.some(item => item.id === "mod-disabled"),
    true,
  );
  assert.equal(
    resolution.unresolvedModifiers.some(item => item.id === "mod-unknown"),
    true,
  );
  assert.equal(resolution.resolvedAt, "2026-06-19T12:00:00.000Z");
});

test("uses an explicit source trait link before name matching", () => {
  const character = createMorphCharacter({
    sourceTraitId: "adv-morph-second",
    advantages: [
      morphAdvantage({ id: "adv-morph-first" }),
      morphAdvantage({
        id: "adv-morph-second",
        modifiers: [
          { id: "mod-improvised", name: "Formas Improvisadas" },
        ],
      }),
    ],
  });

  const resolution = analyzeMorphProfile(character, "set-morph");

  assert.equal(resolution.sourceTraitId, "adv-morph-second");
  assert.equal(resolution.sourceTraitResolution, "existing-link");
  assert.equal(resolution.morphProfile.improvisation.mode, "allowed");
});

test("does not guess when multiple Morfose advantages are candidates", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({ id: "adv-morph-first" }),
      morphAdvantage({ id: "adv-morph-second" }),
    ],
  });

  const resolution = analyzeMorphProfile(character, "set-morph");

  assert.equal(resolution.sourceTraitId, null);
  assert.equal(resolution.sourceTraitResolution, "ambiguous");
  assert.deepEqual(
    resolution.diagnostics.find(item => item.type === "source-trait-ambiguous")
      .candidateIds,
    ["adv-morph-first", "adv-morph-second"],
  );
});

test("reports an explicit source link that points to another advantage", () => {
  const character = createMorphCharacter({
    sourceTraitId: "adv-flight",
    advantages: [{ id: "adv-flight", name: "Voo" }],
  });

  const resolution = analyzeMorphProfile(character, "set-morph");

  assert.equal(resolution.sourceTraitId, null);
  assert.equal(resolution.sourceTraitResolution, "mismatched-explicit");
  assert.equal(
    resolution.diagnostics.some(item => item.type === "source-trait-mismatch"),
    true,
  );
});

test("explicit morphProfile directives override builtin modifier mappings", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({
        modifiers: [
          { id: "mod-improvised", name: "Formas Improvisadas" },
          {
            id: "mod-explicit",
            name: "Regra importada",
            raw: {
              morphProfile: {
                improvisation: {
                  mode: "conditional",
                  pointLimit: 30,
                },
                catalog: {
                  mode: "knownOnly",
                  capacity: 8,
                },
              },
            },
          },
        ],
      }),
    ],
  });

  const resolution = analyzeMorphProfile(character, "set-morph");

  assert.equal(resolution.morphProfile.improvisation.mode, "conditional");
  assert.equal(resolution.morphProfile.improvisation.pointLimit, 30);
  assert.equal(resolution.morphProfile.catalog.mode, "knownOnly");
  assert.equal(resolution.morphProfile.catalog.capacity, 8);
  assert.equal(resolution.decisions.improvisation.mode.source, "explicit");
});

test("manual override has final precedence and is persisted", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({
        modifiers: [
          { id: "mod-unlimited", name: "Ilimitada" },
          { id: "mod-improvised", name: "Formas Improvisadas" },
        ],
      }),
    ],
  });

  const applied = applyResolvedMorphProfile(character, "set-morph", {
    now: "2026-06-19T13:00:00.000Z",
    manualOverride: {
      pointLimit: 60,
      improvisation: { mode: "forbidden" },
    },
  });
  const set = applied.character.alternateFormSets[0];

  assert.equal(set.sourceTraitId, "adv-morph");
  assert.equal(set.morphProfile.pointLimitMode, "limited");
  assert.equal(set.morphProfile.pointLimit, 60);
  assert.equal(set.morphProfile.pointLimitSource, "manual");
  assert.equal(set.morphProfile.improvisation.mode, "forbidden");
  assert.deepEqual(set.morphProfileOverride, {
    pointLimit: 60,
    improvisation: { mode: "forbidden" },
  });
  assert.equal(set.morphProfileResolution.resolvedAt, "2026-06-19T13:00:00.000Z");
  assert.equal(set.morphProfileResolution.decisions.pointLimit.overridden, true);
});

test("removing a modifier removes its previous resolved contribution", () => {
  const original = createMorphCharacter({
    advantages: [
      morphAdvantage({
        modifiers: [{ id: "mod-unlimited", name: "Ilimitada" }],
      }),
    ],
  });
  const first = applyResolvedMorphProfile(original, "set-morph", {
    now: "2026-06-19T12:00:00.000Z",
  }).character;

  assert.equal(first.alternateFormSets[0].morphProfile.pointLimitMode, "unlimited");

  const withoutModifier = createCharacter({
    ...first,
    advantages: first.advantages.map(advantage => (
      advantage.id === "adv-morph"
        ? { ...advantage, modifiers: [] }
        : advantage
    )),
  });
  const second = applyResolvedMorphProfile(withoutModifier, "set-morph", {
    now: "2026-06-19T12:05:00.000Z",
  }).character;
  const profile = second.alternateFormSets[0].morphProfile;

  assert.equal(profile.pointLimitMode, "undeclared");
  assert.equal(profile.pointLimit, null);
  assert.equal(profile.pointLimitSource, "undeclared");
});

test("same-priority explicit conflicts are diagnosed", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({
        modifiers: [
          {
            id: "mod-explicit-first",
            name: "Primeira diretiva",
            raw: {
              morphProfile: { catalog: { mode: "knownOnly" } },
            },
          },
          {
            id: "mod-explicit-second",
            name: "Segunda diretiva",
            raw: {
              morphProfile: { catalog: { mode: "open" } },
            },
          },
        ],
      }),
    ],
  });

  const resolution = analyzeMorphProfile(character, "set-morph");
  const conflict = resolution.diagnostics.find(item => (
    item.type === "conflict" && item.path === "catalog.mode"
  ));

  assert.equal(resolution.morphProfile.catalog.mode, "knownOnly");
  assert.equal(conflict.keptValue, "knownOnly");
  assert.equal(conflict.rejectedValue, "open");
  assert.equal(resolution.decisions.catalog.mode.conflict, true);
});

test("campaign rule overrides builtin mappings", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({
        modifiers: [
          { id: "mod-improvised", name: "Formas Improvisadas" },
        ],
      }),
    ],
  });
  const resolution = analyzeMorphProfile(character, "set-morph", {
    campaignRules: [
      {
        id: "campaign-morph",
        name: "Morfose restrita da campanha",
        match: { traitName: "Morfose" },
        morphProfile: {
          improvisation: {
            mode: "conditional",
            pointLimit: 20,
          },
          memorization: {
            mode: "limited",
            capacity: 4,
          },
        },
      },
    ],
  });

  assert.equal(resolution.morphProfile.improvisation.mode, "conditional");
  assert.equal(resolution.morphProfile.improvisation.pointLimit, 20);
  assert.equal(resolution.morphProfile.memorization.mode, "limited");
  assert.equal(resolution.morphProfile.memorization.capacity, 4);
  assert.equal(resolution.decisions.improvisation.mode.source, "campaign");
});

test("incompatible Cosmetic and Imperfect modifiers produce a diagnostic", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({
        modifiers: [
          { id: "mod-cosmetic", name: "Cosmética" },
          { id: "mod-imperfect", name: "Imperfeita" },
        ],
      }),
    ],
  });

  const resolution = analyzeMorphProfile(character, "set-morph");

  assert.equal(resolution.recognizedModifiers.length, 2);
  assert.equal(
    resolution.diagnostics.some(item => item.type === "incompatible-modifiers"),
    true,
  );
});

test("applies per-set overrides to all Morfose sets", () => {
  const character = createMorphCharacter({
    advantages: [
      morphAdvantage({ id: "adv-morph" }),
      morphAdvantage({
        id: "adv-morph-second",
        modifiers: [
          { id: "mod-unlimited-second", name: "Ilimitada" },
        ],
      }),
    ],
    sourceTraitId: "adv-morph",
    secondSet: true,
  });

  const applied = applyResolvedMorphProfiles(character, {
    now: "2026-06-19T14:00:00.000Z",
    manualOverrides: {
      "set-morph": { pointLimit: 40 },
    },
  });

  assert.equal(applied.resolutions.length, 2);
  assert.equal(applied.character.alternateFormSets[0].morphProfile.pointLimit, 40);
  assert.equal(
    applied.character.alternateFormSets[1].morphProfile.pointLimitMode,
    "unlimited",
  );
});
