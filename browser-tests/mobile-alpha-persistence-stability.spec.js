import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

async function createCharacterExport(page, { id, name, concept }) {
  return page.evaluate(async input => {
    const [{ createCharacter }, { createSingularCharacterExport }] = await Promise.all([
      import("../../src/domain/character/Character.js"),
      import("../../src/infrastructure/persistence/browser/BrowserLocalPersistence.js"),
    ]);
    return JSON.stringify(createSingularCharacterExport(createCharacter({
      identity: { id: input.id, name: input.name, concept: input.concept },
      metadata: {
        createdAt: "2026-07-10T18:00:00.000Z",
        updatedAt: "2026-07-10T18:00:00.000Z",
        source: "a9-persistence-stability",
      },
    }), { exportedAt: "2026-07-10T18:00:00.000Z" }));
  }, { id, name, concept });
}

async function importCharacter(page, character) {
  await page.locator('[data-role="persistence-import-json"]').fill(
    await createCharacterExport(page, character),
  );
  await page.locator('[data-action="persistence-import"]').click();
  await expect(page.locator(".singular-alpha-mobile__feedback")).toContainText("Personagem importado");
}

async function saveActiveSession(page) {
  await page.locator('[data-action="persistence-save"]').click();
  await expect(page.locator(".singular-alpha-mobile__feedback")).toContainText("Sessão salva");
}

test("persistence survives local corruption and import replaces the active snapshot", async ({ page }) => {
  const browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto("/test/browser/mobile-alpha-harness.html?reset=1");
  await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS_READY__);

  const original = {
    id: "character:a9-persistence-original",
    name: "Original Persistente",
    concept: "Exploradora",
  };
  await importCharacter(page, original);
  await page.locator('[data-role="trait-name"]').fill("Traço que deve sumir");
  await page.locator('[data-role="trait-points"]').fill("3");
  await page.locator('[data-action="trait-add"]').click();
  await saveActiveSession(page);

  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="persistence-export"]').click();
  const download = await downloadPromise;
  const exportedJson = await readFile(await download.path(), "utf8");
  const exported = JSON.parse(exportedJson);
  expect(exported.format).toBe("singular-character-export");
  expect(exported.version).toBe(1);
  expect(exported.character.identity.name).toBe(original.name);
  expect(exported.character.traits).toHaveLength(1);

  const validSessionId = await page.locator("[data-singular-mobile-root]").getAttribute("data-session-id");
  await page.evaluate(() => {
    const namespace = "singular.alpha.browser-smoke";
    const indexKey = `${namespace}:v1:session:index`;
    const ids = JSON.parse(localStorage.getItem(indexKey) ?? "[]");
    const corruptId = "session:a9-corrupt";
    localStorage.setItem(indexKey, JSON.stringify([...ids, corruptId]));
    localStorage.setItem(
      `${namespace}:v1:session:record:${encodeURIComponent(corruptId)}`,
      "{not-json",
    );
  });

  await page.locator('[data-action="persistence-refresh"]').click();
  await expect(page.locator('.singular-alpha-mobile__save-list li[data-save-status="available"]')).toContainText(original.name);
  await expect(page.locator('.singular-alpha-mobile__save-list li[data-save-status="unreadable"]')).toHaveCount(1);

  const replacement = {
    id: "character:a9-persistence-replacement",
    name: "Substituta Importada",
    concept: "Guardião",
  };
  await importCharacter(page, replacement);
  await expect(page.locator(".singular-mobile-sheet__identity-summary")).toContainText(replacement.name);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Traço que deve sumir" })).toHaveCount(0);

  const replacementSessionId = await page.locator("[data-singular-mobile-root]").getAttribute("data-session-id");
  expect(replacementSessionId).not.toBe(validSessionId);
  await saveActiveSession(page);

  const replacementSave = page.locator(".singular-alpha-mobile__save-list li").filter({ hasText: replacement.name });
  await expect(replacementSave).toHaveCount(1);
  await replacementSave.locator('[data-action="persistence-remove"]').click();
  await expect(page.locator(".singular-alpha-mobile__feedback")).toContainText("Salvamento excluído");
  await expect(page.locator(".singular-alpha-mobile__save-list li").filter({ hasText: replacement.name })).toHaveCount(0);
  await expect(page.locator(".singular-alpha-mobile__save-list li").filter({ hasText: original.name })).toHaveCount(1);

  expect(browserErrors).toEqual([]);
});