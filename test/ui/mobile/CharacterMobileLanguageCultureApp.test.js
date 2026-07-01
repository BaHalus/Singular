import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moduleSource = readFileSync(
  new URL("../../../src/ui/mobile/CharacterMobileLanguageCultureApp.js", import.meta.url),
  "utf8",
);
const compositionRootSource = readFileSync(
  new URL("../../../src/ui/mobile/CharacterMobileCompositionRoot.js", import.meta.url),
  "utf8",
);

test("language/culture mobile mount is wired by the composition root", () => {
  assert.ok(compositionRootSource.includes("CharacterMobileLanguageCultureApp.js"));
  assert.ok(compositionRootSource.includes("mountCharacterMobileLanguageCultureApp"));
  assert.ok(!compositionRootSource.includes("bootstrapCharacterMobileLanguageCultureApp"));
});

test("language/culture mobile bootstrap exposes creation controls and blocks table mode", () => {
  for (const fragment of [
    "data-role=\"language-editor\"",
    "data-action=\"language-add\"",
    "data-action=\"language-remove\"",
    "data-action=\"language-reorder\"",
    "data-role=\"familiarity-editor\"",
    "data-action=\"familiarity-add\"",
    "data-action=\"familiarity-remove\"",
    "data-action=\"familiarity-reorder\"",
    "blocked-by-mode",
  ]) {
    assert.ok(moduleSource.includes(fragment), fragment);
  }
});

test("language/culture rerender delegates to the base mobile render pipeline", () => {
  assert.ok(moduleSource.includes("root.innerHTML = renderCharacterMobileApp(session.character, { mode: app.mode });"));
  assert.ok(!moduleSource.includes("root.innerHTML = app.ui.render("));
  assert.ok(!moduleSource.includes("root.innerHTML = ui.render("));
});
