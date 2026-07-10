import test from "node:test";
import assert from "node:assert/strict";

import { injectMobilePowerEditControls } from "./CharacterMobilePowerEditApp.js";

test("preserves a leading newline in power notes through textarea parsing", () => {
  const html = '<section data-card="powers"><dl><div data-power-id="power:psi"><dt>Poder</dt><dd>Psiquismo</dd></div></dl></section>';
  const character = {
    powers: [{
      id: "power:psi",
      name: "Psiquismo",
      source: "manual",
      powerModifier: null,
      talentTraitId: null,
      memberTraitIds: [],
      tags: [],
      notes: "\nlinha preservada",
    }],
  };

  const rendered = injectMobilePowerEditControls(html, character, "creation");

  assert.match(
    rendered,
    /<textarea data-role="power-edit-notes-power:psi" autocomplete="off">\n\nlinha preservada<\/textarea>/,
  );
});
