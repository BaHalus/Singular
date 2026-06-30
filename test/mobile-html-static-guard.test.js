import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileHtml = await readFile(new URL("../mobile.html", import.meta.url), "utf8");

function collectAll(pattern) {
  return [...mobileHtml.matchAll(pattern)].map((match) => match[1]);
}

test("mobile.html keeps module imports unique", () => {
  const moduleImports = collectAll(/import\s+[^;]+?from\s+["']([^"']+)["']/g);
  const duplicateImports = moduleImports.filter(
    (path, index) => moduleImports.indexOf(path) !== index,
  );

  assert.deepEqual(duplicateImports, []);
});

test("mobile.html keeps stylesheet references unique", () => {
  const stylesheetReferences = collectAll(
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/g,
  );
  const duplicateStylesheets = stylesheetReferences.filter(
    (path, index) => stylesheetReferences.indexOf(path) !== index,
  );

  assert.deepEqual(duplicateStylesheets, []);
});

test("mobile.html starts from a single composition root bootstrap", () => {
  const bootstrapCalls = collectAll(/await\s+(bootstrap\w+)\s*\(/g);
  const duplicateBootstrapCalls = bootstrapCalls.filter(
    (name, index) => bootstrapCalls.indexOf(name) !== index,
  );

  assert.deepEqual(duplicateBootstrapCalls, []);
  assert.deepEqual(bootstrapCalls, ["bootstrapCharacterMobileApp"]);
  assert.match(mobileHtml, /bootstrapCharacterMobileCompositionRoot/);
});
