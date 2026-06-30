import test from "node:test";
import assert from "node:assert/strict";

import {
  injectMobilePowerEditControls,
  readPowerPatchFromValues,
} from "./CharacterMobilePowerEditApp.js";

function character() {
  return {
    powers: [
      {
        id: "power:psi",
        name: "Psiquismo",
        source: "manual",
        powerModifier: {
          name: "Poder psíquico",
          valuePercent: -10,
          notes: "antipsi afeta",
        },
        talentTraitId: "trait:talent",
        memberTraitIds: ["trait:telepathy", "trait:tk"],
        tags: ["psionics", "alpha"],
        notes: "\nlinha de poderes psíquicos\ncom nota longa",
      },
    ],
  };
}

test("injects mobile power inline controls only in creation mode", () => {
  const html = '<section data-card="powers"><h2>Poderes</h2><dl><div data-power-id="power:psi"><dt>Poder</dt><dd>Psiquismo</dd></div></dl></section>';

  const creation = injectMobilePowerEditControls(html, character(), "creation");
  assert.match(creation, /data-role="power-inline-editor"/);
  assert.match(creation, /data-action="power-update"/);
  assert.match(creation, /power-edit-source-power:psi/);
  assert.match(creation, /trait:telepathy, trait:tk/);
  assert.match(creation, /<textarea data-role="power-edit-notes-power:psi"/);
  assert.match(creation, /<textarea data-role="power-edit-notes-power:psi" autocomplete="off" disabled>\n\nlinha de poderes psíquicos\ncom nota longa<\/textarea>/);

  const table = injectMobilePowerEditControls(html, character(), "table");
  assert.doesNotMatch(table, /data-role="power-inline-editor"/);
  assert.doesNotMatch(table, /data-action="power-update"/);
});

test("normalizes power edit values for canonical command payloads", () => {
  const patch = readPowerPatchFromValues({
    name: "Telepatia",
    source: "Powers",
    powerModifierName: "Psíquico",
    powerModifierValuePercent: -10,
    powerModifierNotes: "bloqueável",
    talentTraitId: "",
    memberTraitIds: "trait:a, trait:b",
    tags: "psi, mental",
    notes: "núcleo psíquico",
  });

  assert.deepEqual(patch, {
    name: "Telepatia",
    source: "Powers",
    powerModifierName: "Psíquico",
    powerModifierValuePercent: -10,
    powerModifierNotes: "bloqueável",
    talentTraitId: null,
    memberTraitIds: ["trait:a", "trait:b"],
    tags: ["psi", "mental"],
    notes: "núcleo psíquico",
  });
});
