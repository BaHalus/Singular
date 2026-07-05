import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const MOBILE_HTML_PATH = "mobile.html";
const COMPOSITION_ROOT_PATH = "src/ui/mobile/CharacterMobileCompositionRoot.js";
const APP_PATH = "src/ui/mobile/CharacterMobileApp.js";
const PERSISTENCE_UI_PATH = "src/ui/mobile/AlphaMobilePersistenceUi.js";
const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_EXPORT_IMPORT_ENTRYPOINT_GATE.md";

test("Alpha export/import guard follows the real mobile.html entrypoint wiring", () => {
  const mobileHtml = readFileSync(MOBILE_HTML_PATH, "utf8");
  const compositionRoot = readFileSync(COMPOSITION_ROOT_PATH, "utf8");
  const app = readFileSync(APP_PATH, "utf8");
  const persistenceUi = readFileSync(PERSISTENCE_UI_PATH, "utf8");

  assert.match(mobileHtml, /data-singular-mobile-root/);
  assert.match(
    mobileHtml,
    /import\s*\{\s*bootstrapCharacterMobileCompositionRoot\s*\}\s*from\s*["']\.\/src\/ui\/mobile\/CharacterMobileCompositionRoot\.js["']/,
  );
  assert.match(mobileHtml, /await\s+bootstrapCharacterMobileApp\s*\(\s*\)/);
  assert.doesNotMatch(mobileHtml, /AlphaMobilePersistenceUi|createAlphaMobilePersistenceBootstrap/);

  assert.match(
    compositionRoot,
    /import\s*\{\s*bootstrapCharacterMobileApp,\s*getCharacterMobileRootSelector\s*\}\s*from\s*["']\.\/CharacterMobileApp\.js["']/,
  );
  assert.match(compositionRoot, /bootstrapCharacterMobileCompositionRoot/);
  assert.match(compositionRoot, /mountCharacterMobileCompositionRoot/);
  assert.doesNotMatch(compositionRoot, /createAlphaMobilePersistenceBootstrap|localStorage|sessionStorage/);

  assert.match(
    app,
    /import\s*\{\s*mountAlphaMobilePersistenceUi\s*\}\s*from\s*["']\.\/AlphaMobilePersistenceUi\.js["']/,
  );
  assert.match(app, /createAlphaMobilePersistenceBootstrap/);
  assert.match(app, /await\s+mountAlphaMobilePersistenceUi\s*\(/);
  assert.match(app, /render\s*\(\s*\{\s*ui:\s*mountedUi,\s*mode:\s*renderMode\s*\}\s*\)/);

  assert.match(persistenceUi, /aria-label="Persistência local"/);
  assert.match(persistenceUi, /actionButton\("persistence-export",\s*"Exportar"/);
  assert.match(persistenceUi, /data-role="persistence-import-json"/);
  assert.match(persistenceUi, /actionButton\("persistence-import",\s*"Importar"/);
  assert.match(persistenceUi, /exportActiveCharacter/);
  assert.match(persistenceUi, /importCharacter/);
});

test("Alpha export/import entrypoint checklist keeps scope and architecture boundaries explicit", () => {
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "`mobile.html`",
    "[data-singular-mobile-root]",
    "`./src/ui/mobile/CharacterMobileCompositionRoot.js`",
    "`CharacterMobileCompositionRoot.js`",
    "`bootstrapCharacterMobileApp()`",
    "`CharacterMobileApp.js`",
    "`mountAlphaMobilePersistenceUi()`",
    "`AlphaMobilePersistenceUi.js`",
    "`Exportar`",
    "`persistence-export`",
    "`persistence-import-json`",
    "`Importar`",
    "`persistence-import`",
    "Criação/Mesa",
    "Mesa continua modo de transitórios",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(required)));
  }

  for (const forbidden of [
    "cálculo ou regra de domínio na UI",
    "mutação direta do personagem fora dos comandos/coordenadores existentes",
    "formato novo de exportação/importação não suportado",
    "domínio paralelo",
    "sessão paralela",
    "executor paralelo",
    "registry paralelo",
    "persistence layer paralela",
    "pipeline paralelo",
    "composition root paralelo",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(forbidden)));
  }

  assert.doesNotMatch(checklist, /formato\s+universal/i);
  assert.doesNotMatch(checklist, /sincronização\s+remota/i);
  assert.doesNotMatch(checklist, /storage\s+novo/i);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
