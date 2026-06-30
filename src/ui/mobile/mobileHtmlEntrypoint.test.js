import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const mobileHtmlPath = path.resolve("mobile.html");

async function readMobileHtml() {
  return readFile(mobileHtmlPath, "utf8");
}

function findDuplicateValues(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

test("mobile entrypoint imports each module path once", async () => {
  const html = await readMobileHtml();
  const importPaths = [...html.matchAll(/import\s+\{[^}]+\}\s+from\s+"([^"]+)";/g)]
    .map(match => match[1]);

  assert.ok(importPaths.length > 0, "expected module imports in mobile.html");
  assert.deepEqual(findDuplicateValues(importPaths), []);
});

test("mobile entrypoint keeps bootstrap anchors unique", async () => {
  const html = await readMobileHtml();
  const bootstrapAnchors = [...html.matchAll(/await\s+(bootstrapCharacterMobile[A-Za-z0-9]+App)\(\)/g)]
    .map(match => match[1]);
  const bootstrapReferences = [...html.matchAll(/void\s+(bootstrapCharacterMobile[A-Za-z0-9]+App)\s*;/g)]
    .map(match => match[1]);

  assert.ok(
    bootstrapAnchors.includes("bootstrapCharacterMobileApp"),
    "expected executable mobile app smoke anchor",
  );
  assert.deepEqual(findDuplicateValues(bootstrapAnchors), []);
  assert.deepEqual(findDuplicateValues(bootstrapReferences), []);
});

test("mobile entrypoint references each imported bootstrap exactly once as a preservation anchor", async () => {
  const html = await readMobileHtml();
  const importedBootstraps = [...html.matchAll(/import\s+\{\s*(bootstrapCharacterMobile[A-Za-z0-9]+App)\s*\}\s+from\s+"[^"]+";/g)]
    .map(match => match[1]);
  const preservedBootstraps = [...html.matchAll(/void\s+(bootstrapCharacterMobile[A-Za-z0-9]+App)\s*;/g)]
    .map(match => match[1]);

  assert.deepEqual(
    preservedBootstraps.toSorted(),
    importedBootstraps
      .filter(name => name !== "bootstrapCharacterMobilePowerEditApp")
      .toSorted(),
  );
});
