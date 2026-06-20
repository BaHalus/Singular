import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import { resolveMorphProfile } from "./MorphProfileResolver.js";

function characterWithModifiers(modifiers) {
  return createCharacter({
    identity: {
      id: "char-morph-improvisation-resolver",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    advantages: [{ id: "adv-morph", name: "Morfose", modifiers }],
    alternateFormSets: [{
      id: "set-morph",
      name: "Morfose",
      mechanism: "morph",
      sourceTraitId: "adv-morph",
      baseFormId: "form-base",
      activeFormId: "form-base",
      forms: [{ id: "form-base", name: "Forma natural" }],
    }],
    metadata: {
      createdAt: "2026-06-20T08:00:00.000Z",
      updatedAt: "2026-06-20T08:00:00.000Z",
      source: "singular",
    },
  });
}

function resolve(modifiers) {
  return resolveMorphProfile(
    characterWithModifiers(modifiers),
    "set-morph",
    { now: "2026-06-20T20:00:00.000Z" },
  );
}

test("Formas Improvisadas resolves the official baseline restrictions", () => {
  const resolution = resolve([
    { id: "mod-improvised", name: "Formas Improvisadas" },
  ]);

  assert.deepEqual(resolution.morphProfile.improvisation, {
    mode: "allowed",
    pointLimit: null,
    traitScope: "physicalNatural",
    availabilityScope: "settingOnly",
    compositionScope: "sameComposition",
  });
  assert.equal(
    resolution.recognizedModifiers.some(item => (
      item.ruleId === "gurps.morph.improvised-forms"
    )),
    true,
  );
});

test("Cosmic refines availability but does not grant improvisation alone", () => {
  const resolution = resolve([
    { id: "mod-cosmic", name: "Cósmica (Para Formas Improvisadas)" },
  ]);

  assert.equal(resolution.morphProfile.improvisation.mode, "unknown");
  assert.equal(
    resolution.morphProfile.improvisation.availabilityScope,
    "unrestricted",
  );
  assert.equal(
    resolution.diagnostics.some(item => (
      item.type === "modifier-dependency" &&
      item.ruleId === "gurps.morph.cosmic-improvised-forms"
    )),
    true,
  );
});

test("Formas Improvisadas plus Cosmic removes only the setting restriction", () => {
  const resolution = resolve([
    { id: "mod-improvised", name: "Formas Improvisadas" },
    { id: "mod-cosmic", name: "Cósmica (Para Formas Improvisadas)" },
  ]);

  assert.equal(resolution.morphProfile.improvisation.mode, "allowed");
  assert.equal(resolution.morphProfile.improvisation.traitScope, "physicalNatural");
  assert.equal(
    resolution.morphProfile.improvisation.availabilityScope,
    "unrestricted",
  );
  assert.equal(
    resolution.morphProfile.improvisation.compositionScope,
    "sameComposition",
  );
  assert.equal(
    resolution.diagnostics.some(item => item.type === "conflict"),
    false,
  );
});

test("Ilimitada removes the composition restriction without relaxing trait scope", () => {
  const resolution = resolve([
    { id: "mod-improvised", name: "Formas Improvisadas" },
    { id: "mod-unlimited", name: "Ilimitada" },
  ]);

  assert.equal(resolution.morphProfile.pointLimitMode, "unlimited");
  assert.equal(resolution.morphProfile.improvisation.mode, "allowed");
  assert.equal(resolution.morphProfile.improvisation.traitScope, "physicalNatural");
  assert.equal(
    resolution.morphProfile.improvisation.availabilityScope,
    "settingOnly",
  );
  assert.equal(
    resolution.morphProfile.improvisation.compositionScope,
    "unrestricted",
  );
  assert.equal(
    resolution.diagnostics.some(item => item.type === "conflict"),
    false,
  );
});

test("disabled refinements do not alter the improvisation policy", () => {
  const resolution = resolve([
    { id: "mod-improvised", name: "Formas Improvisadas" },
    {
      id: "mod-cosmic",
      name: "Cósmica (Para Formas Improvisadas)",
      disabled: true,
    },
    { id: "mod-unlimited", name: "Ilimitada", disabled: true },
  ]);

  assert.equal(
    resolution.morphProfile.improvisation.availabilityScope,
    "settingOnly",
  );
  assert.equal(
    resolution.morphProfile.improvisation.compositionScope,
    "sameComposition",
  );
  assert.equal(resolution.ignoredModifiers.length, 2);
});
