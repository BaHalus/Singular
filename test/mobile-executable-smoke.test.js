import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const MOBILE_HTML_URL = new URL("../mobile.html", import.meta.url);
const mobileHtml = await readFile(MOBILE_HTML_URL, "utf8");

function collectAttributeValues(tagName, attributeName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}=["']([^"']+)["'][^>]*>`, "g");
  return [...mobileHtml.matchAll(pattern)].map((match) => match[1]);
}

function resolveLocalAsset(specifier) {
  assert.match(specifier, /^\.\//, `asset deve ser local e relativo: ${specifier}`);
  return new URL(`../${specifier.slice(2)}`, import.meta.url);
}

test("mobile.html references only existing local executable assets", async () => {
  const stylesheetReferences = collectAttributeValues("link", "href");
  const moduleReferences = collectAttributeValues("script", "src");
  const inlineModuleImports = [...mobileHtml.matchAll(/import\s+[^;]+?from\s+["']([^"']+)["']/g)]
    .map((match) => match[1]);

  const referencedAssets = [
    ...stylesheetReferences,
    ...moduleReferences,
    ...inlineModuleImports,
  ];

  assert.ok(referencedAssets.length > 0, "mobile.html deve referenciar assets executáveis locais");

  for (const asset of referencedAssets) {
    await access(resolveLocalAsset(asset));
  }
});

test("mobile composition root entrypoint is importable without browser side effects", async () => {
  const module = await import("../src/ui/mobile/CharacterMobileCompositionRoot.js");

  assert.equal(typeof module.bootstrapCharacterMobileCompositionRoot, "function");
  assert.equal(typeof module.mountCharacterMobileCompositionRoot, "function");
  assert.ok(Array.isArray(module.CHARACTER_MOBILE_COMPOSITION_MODULES));
  assert.ok(module.CHARACTER_MOBILE_COMPOSITION_MODULES.length > 0);
});

test("browser viewport smoke remains explicit until CI provides a browser", () => {
  assert.match(mobileHtml, /<meta\s+name=["']viewport["']/);
  assert.match(mobileHtml, /data-singular-mobile-root/);
  assert.doesNotMatch(mobileHtml, /<script(?![^>]*type=["']module["'])[^>]*>/);
});
