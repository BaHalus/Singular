import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moduleSource = readFileSync(
  new URL("../../../src/ui/mobile/CharacterMobileLanguageCultureApp.js", import.meta.url),
  "utf8",
);
const mobileHtml = readFileSync(
  new URL("../../../mobile.html", import.meta.url),
  "utf8",
);

test("language/culture mobile bootstrap is wired by mobile.html", () => {
  assert.match(mobileHtml, /CharacterMobileLanguageCultureApp\.js/);
  assert.match(mobileHtml, /bootstrapCharacterMobileLanguageCultureApp/);
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
  assert.match(
    moduleSource,
    /root\.innerHTML = renderCharacterMobileApp\(session\.character, \{ mode: app\.mode \}\);/,
  );
  assert.doesNotMatch(
    moduleSource,
    /root\.innerHTML = app\.ui\.render\(/,
  );
  assert.doesNotMatch(
    moduleSource,
    /root\.innerHTML = ui\.render\(/,
  );
});
