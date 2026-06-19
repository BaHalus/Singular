import test from "node:test";
import assert from "node:assert/strict";

import {
  createMorphProfile,
  createMorphKnownForm,
  serializeMorphProfile,
  getMorphProfileEnums,
} from "./MorphProfile.js";

test("creates an undeclared Morfose profile by default", () => {
  const profile = createMorphProfile();

  assert.equal(profile.pointLimitMode, "undeclared");
  assert.equal(profile.pointLimit, null);
  assert.equal(profile.pointLimitSource, "undeclared");
  assert.deepEqual(profile.catalog, {
    mode: "unknown",
    capacity: null,
  });
  assert.deepEqual(profile.memorization, {
    mode: "unknown",
    capacity: null,
  });
  assert.deepEqual(profile.improvisation, {
    mode: "unknown",
    pointLimit: null,
  });
  assert.deepEqual(profile.knownForms, []);
});

test("infers limited mode when a point limit is declared", () => {
  const profile = createMorphProfile({
    pointLimit: 75,
    pointLimitSource: "modifier",
  });

  assert.equal(profile.pointLimitMode, "limited");
  assert.equal(profile.pointLimit, 75);
  assert.equal(profile.pointLimitSource, "modifier");
});

test("represents unlimited Morfose without overloading null", () => {
  const profile = createMorphProfile({
    pointLimitMode: "unlimited",
    pointLimit: null,
    pointLimitSource: "modifier",
  });

  assert.equal(profile.pointLimitMode, "unlimited");
  assert.equal(profile.pointLimit, null);
  assert.equal(profile.pointLimitSource, "modifier");
});

test("preserves known forms and declarative policies", () => {
  const profile = createMorphProfile({
    pointLimit: 75,
    pointLimitSource: "modifier",
    catalog: {
      mode: "knownOnly",
      capacity: 12,
    },
    memorization: {
      mode: "limited",
      capacity: 5,
    },
    improvisation: {
      mode: "conditional",
      pointLimit: 25,
    },
    knownForms: [
      {
        id: "known-wolf",
        templateId: "template-wolf",
        name: "Lobo",
        acquisitionMethod: "memorized",
        acquiredAt: "2026-06-19T12:00:00.000Z",
        tags: ["animal"],
      },
    ],
  });

  assert.equal(profile.pointLimitMode, "limited");
  assert.equal(profile.pointLimit, 75);
  assert.equal(profile.catalog.capacity, 12);
  assert.equal(profile.memorization.capacity, 5);
  assert.equal(profile.improvisation.pointLimit, 25);
  assert.equal(profile.knownForms[0].state, "available");
  assert.equal(profile.knownForms[0].acquisitionMethod, "memorized");

  const json = serializeMorphProfile(profile);
  assert.deepEqual(json, profile);
  assert.notEqual(json, profile);
  assert.notEqual(json.knownForms, profile.knownForms);
});

test("known form preserves unresolved external identity without inventing template", () => {
  const form = createMorphKnownForm({
    id: "known-imported",
    templateId: null,
    externalIds: {
      gcs: "gcs-form-001",
    },
    name: "Forma importada não resolvida",
    acquisitionMethod: "imported",
    importMeta: {
      source: "gcs",
    },
  });

  assert.equal(form.templateId, null);
  assert.equal(form.externalIds.gcs, "gcs-form-001");
  assert.equal(form.acquisitionMethod, "imported");
});

test("rejects duplicate ids and duplicate template references", () => {
  assert.throws(() => createMorphProfile({
    knownForms: [
      { id: "same", name: "Lobo" },
      { id: "same", name: "Morcego" },
    ],
  }));

  assert.throws(() => createMorphProfile({
    knownForms: [
      { id: "wolf", templateId: "template-animal", name: "Lobo" },
      { id: "bat", templateId: "template-animal", name: "Morcego" },
    ],
  }));
});

test("rejects invalid policies and incoherent point limits", () => {
  assert.throws(() => createMorphProfile({ pointLimit: -1 }));
  assert.throws(() => createMorphProfile({ pointLimitMode: "approximate" }));
  assert.throws(() => createMorphProfile({
    pointLimitMode: "limited",
    pointLimit: null,
  }));
  assert.throws(() => createMorphProfile({
    pointLimitMode: "unlimited",
    pointLimit: 50,
  }));
  assert.throws(() => createMorphProfile({ pointLimitSource: "calculated-locally" }));
  assert.throws(() => createMorphProfile({ catalog: { mode: "approximate" } }));
  assert.throws(() => createMorphProfile({ memorization: { capacity: -1 } }));
  assert.throws(() => createMorphProfile({ improvisation: { pointLimit: -10 } }));
});

test("exports stable enum vocabulary", () => {
  const enums = getMorphProfileEnums();

  assert.equal(enums.pointLimitModes.includes("unlimited"), true);
  assert.equal(enums.catalogModes.includes("knownOnly"), true);
  assert.equal(enums.improvisationModes.includes("conditional"), true);
  assert.equal(enums.acquisitionMethods.includes("observed"), true);
  assert.equal(enums.knownFormStates.includes("forgotten"), true);
});
