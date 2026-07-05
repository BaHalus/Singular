import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("ships an executable browser page wired to persistence and responsive styles", () => {
  const page = readFileSync(
    new URL("../../../mobile.html", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("./CharacterMobileApp.css", import.meta.url),
    "utf8",
  );

  assert.match(page, /<meta name="viewport"/);
  assert.match(page, /data-singular-mobile-root/);
  assert.match(page, /CharacterMobileApp\.css/);
  assert.match(page, /await bootstrapCharacterMobileApp\(\)/);
  assert.match(page, /type="module"/);

  assert.match(css, /min-width: 320px/);
  assert.match(css, /grid-template-columns: repeat\(4/);
  assert.match(css, /singular-alpha-mobile__persistence/);
  assert.match(css, /singular-mobile-sheet__pool-adjust/);
  assert.match(css, /singular-mobile-sheet__summary-editor/);
  assert.match(css, /\[data-mode="table"\] \.singular-mobile-sheet__summary-editor/);
  assert.match(css, /@media \(max-width: 25rem\)/);
  assert.match(css, /min-height: 2\.75rem/);
});
