import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const MOBILE_HTML_PATH = new URL("../mobile.html", import.meta.url);

function extractModuleScript(html) {
  const matches = [...html.matchAll(/<script\s+type="module">([\s\S]*?)<\/script>/g)];
  assert.equal(matches.length, 1, "mobile.html deve declarar exatamente um script module executável");
  return matches[0][1];
}

function collectImportSpecifiers(script) {
  return [...script.matchAll(/import\s+\{\s*([^}]+?)\s*\}\s+from\s+["']([^"']+)["'];/g)]
    .flatMap(([, names, source]) =>
      names
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name, source })),
    );
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates].sort();
}

test("mobile.html não duplica imports module nem bootstraps executados", async () => {
  const html = await readFile(MOBILE_HTML_PATH, "utf8");
  const script = extractModuleScript(html);
  const imports = collectImportSpecifiers(script);

  const duplicateSources = findDuplicates(imports.map(({ source }) => source));
  assert.deepEqual(duplicateSources, [], "mobile.html não deve importar o mesmo módulo mais de uma vez");

  const duplicateImportedNames = findDuplicates(imports.map(({ name }) => name));
  assert.deepEqual(duplicateImportedNames, [], "mobile.html não deve importar o mesmo bootstrap mais de uma vez");

  const invokedBootstraps = [...script.matchAll(/(?:await\s+)?(bootstrapCharacterMobile[A-Za-z0-9_]+)\s*\(/g)].map(([, name]) => name);
  const duplicateInvokedBootstraps = findDuplicates(invokedBootstraps);
  assert.deepEqual(
    duplicateInvokedBootstraps,
    [],
    "mobile.html não deve executar o mesmo bootstrap mais de uma vez",
  );
});
