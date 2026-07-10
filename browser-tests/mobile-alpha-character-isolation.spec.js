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
        createdAt: "2026-07-10T17:00:00.000Z",
        updatedAt: "2026-07-10T17:00:00.000Z",
        source: "a9-character-isolation",
      },
    }), { exportedAt: "2026-07-10T17:00:00.000Z" }));
  }, { id, name, concept });
}

async function importCharacter(page, character) {
  await page.locator('[data-role="persistence-import-json"]').fill(
    await createCharacterExport(page, character),
  );
  await page.locator('[data-action="persistence-import"]').click();
  await expect(page.locator(".singular-alpha-mobile__feedback")).toContainText("Personagem importado");
  await expect(page.locator(".singular-mobile-sheet__identity-summary")).toContainText(character.name);
  return page.locator("[data-singular-mobile-root]").getAttribute("data-session-id");
}

async function saveActiveSession(page) {
  await page.locator('[data-action="persistence-save"]').click();
  await expect(page.locator(".singular-alpha-mobile__feedback")).toContainText("Sessão salva");
}

async function openSavedCharacter(page, name) {
  const save = page.locator(".singular-alpha-mobile__save-list li").filter({ hasText: name });
  await expect(save).toHaveCount(1);
  await save.locator('[data-action="persistence-open"]').click();
  await expect(page.locator(".singular-alpha-mobile__feedback")).toContainText("Sessão aberta");
  await expect(page.locator(".singular-mobile-sheet__identity-summary")).toContainText(name);
}

test("two saved characters remain isolated through switching and remount", async ({ page }) => {
  const browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto("/test/browser/mobile-alpha-harness.html?reset=1");
  await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS_READY__);

  const alda = { id: "character:a9-alda", name: "Alda Isolada", concept: "Navegadora" };
  const breno = { id: "character:a9-breno", name: "Breno Isolado", concept: "Guardião" };

  const aldaSessionId = await importCharacter(page, alda);
  await page.locator('[data-role="trait-name"]').fill("Traço de Alda");
  await page.locator('[data-role="trait-points"]').fill("1");
  await page.locator('[data-action="trait-add"]').click();
  await saveActiveSession(page);

  const brenoSessionId = await importCharacter(page, breno);
  expect(brenoSessionId).not.toBe(aldaSessionId);
  await page.locator('[data-role="trait-name"]').fill("Traço de Breno");
  await page.locator('[data-role="trait-points"]').fill("2");
  await page.locator('[data-action="trait-add"]').click();
  await saveActiveSession(page);

  await openSavedCharacter(page, alda.name);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Traço de Alda" })).toHaveCount(1);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Traço de Breno" })).toHaveCount(0);

  await openSavedCharacter(page, breno.name);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Traço de Breno" })).toHaveCount(1);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Traço de Alda" })).toHaveCount(0);

  const beforeDestroy = await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.state());
  await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.destroy());
  const remounted = await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.mount());

  expect(remounted.sessionId).toBe(brenoSessionId);
  expect(remounted.clickListeners).toBe(beforeDestroy.clickListeners);
  await expect(page.locator(".singular-mobile-sheet__identity-summary")).toContainText(breno.name);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Traço de Breno" })).toHaveCount(1);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Traço de Alda" })).toHaveCount(0);

  const beforeSingleAction = await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.state());
  await page.locator('[data-role="trait-name"]').fill("Ação única pós-remount");
  await page.locator('[data-role="trait-points"]').fill("1");
  await page.locator('[data-action="trait-add"]').click();
  const afterSingleAction = await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.state());

  expect(afterSingleAction.revision).toBe(beforeSingleAction.revision + 1);
  expect(afterSingleAction.clickListeners).toBe(beforeDestroy.clickListeners);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Ação única pós-remount" })).toHaveCount(1);
  expect(browserErrors).toEqual([]);
});
