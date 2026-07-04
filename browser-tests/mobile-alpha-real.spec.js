import { test, expect } from "@playwright/test";

const creationEditors = [
  "language-editor",
  "familiarity-editor",
  "trait-editor",
  "skill-editor",
  "technique-editor",
  "attack-editor",
  "equipment-editor",
  "spell-editor",
  "power-editor",
  "general-notes-editor",
  "structured-note-editor",
];

async function readHarnessState(page) {
  return page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.state());
}

async function expectCreationSurface(page) {
  for (const role of creationEditors) {
    await expect(page.locator(`[data-role="${role}"]`)).toHaveCount(1);
  }
}

async function expectCharacterName(page, name) {
  await expect(page.locator('.singular-mobile-sheet__identity-summary')).toContainText(name);
}

test("real mobile composition edits, persists, changes mode and remounts without duplication", async ({ page }) => {
  const browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto("/test/browser/mobile-alpha-harness.html?reset=1");
  await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS_READY__);

  const root = page.locator("[data-singular-mobile-root]");
  await expect(root).toHaveAttribute("data-singular-mounted", "true");
  await expectCreationSurface(page);

  const initialState = await readHarnessState(page);
  expect(initialState.mounted).toBe(true);
  expect(initialState.clickListeners).toBeGreaterThan(0);
  expect(initialState.lifecycleSize).toBeGreaterThan(0);

  await page.locator('[data-role="character-name"]').fill("Alda Navegante");
  await page.locator('[data-role="character-concept"]').fill("Exploradora da Alpha");
  await page.locator('[data-action="character-summary-save"]').click();
  await expect(root).toHaveAttribute("data-last-command-status", "applied");
  await expectCharacterName(page, "Alda Navegante");
  await expect(page.locator('[data-role="character-name"]')).toHaveValue("Alda Navegante");

  await page.locator('[data-role="trait-name"]').fill("Destemida");
  await page.locator('[data-role="trait-points"]').fill("5");
  await page.locator('[data-action="trait-add"]').click();
  await expect(page.getByText("Destemida", { exact: true })).toHaveCount(1);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]')).toHaveCount(1);

  await page.locator('[data-role="attack-name"]').fill("Machado de teste");
  await page.locator('[data-role="attack-damage-value"]').fill("1d+2");
  await page.locator('[data-role="attack-damage-type"]').fill("cut");
  await page.locator('[data-action="attack-add"]').click();
  await expect(page.getByText("Machado de teste", { exact: true })).toHaveCount(1);
  await expect(page.locator('.singular-mobile-sheet__attack-list > div[data-attack-id]')).toHaveCount(1);

  await page.locator('[data-role="equipment-name"]').fill("Mochila de teste");
  await page.locator('[data-role="equipment-weight-kg"]').fill("1.5");
  await page.locator('[data-role="equipment-cost"]').fill("60");
  await page.locator('[data-action="equipment-add"]').click();
  await expect(page.getByText("Mochila de teste", { exact: true })).toHaveCount(1);
  await expect(page.locator('.singular-mobile-sheet__equipment-list > div[data-equipment-id]')).toHaveCount(1);

  const beforeSave = await readHarnessState(page);
  expect(beforeSave.revision).toBeGreaterThanOrEqual(4);

  await page.locator('[data-action="persistence-save"]').click();
  await expect(page.locator('.singular-alpha-mobile__feedback')).toContainText("Sessão salva");
  await expect(page.locator('.singular-alpha-mobile__save-list li')).toHaveCount(1);

  await page.locator('[data-action="mode-table"]').click();
  await expect(root).toHaveAttribute("data-mode", "table");
  for (const role of creationEditors) {
    await expect(page.locator(`[data-role="${role}"]`)).toHaveCount(0);
  }
  await expectCharacterName(page, "Alda Navegante");

  await page.locator('[data-action="mode-creation"]').click();
  await expect(root).toHaveAttribute("data-mode", "creation");
  await expectCreationSurface(page);

  const beforeDestroy = await readHarnessState(page);
  expect(beforeDestroy.clickListeners).toBe(initialState.clickListeners);

  const destroyedState = await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.destroy());
  expect(destroyedState.mounted).toBe(false);
  expect(destroyedState.clickListeners).toBe(0);
  expect(destroyedState.lifecycleSize).toBe(0);

  const remountedState = await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS__.mount());
  expect(remountedState.mounted).toBe(true);
  expect(remountedState.clickListeners).toBe(initialState.clickListeners);
  expect(remountedState.revision).toBe(beforeSave.revision);

  await expectCreationSurface(page);
  await expectCharacterName(page, "Alda Navegante");
  await expect(page.locator('[data-role="character-name"]')).toHaveValue("Alda Navegante");
  await expect(page.getByText("Destemida", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Machado de teste", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Mochila de teste", { exact: true })).toHaveCount(1);

  await page.locator('[data-role="trait-name"]').fill("Segundo traço");
  await page.locator('[data-role="trait-points"]').fill("1");
  await page.locator('[data-action="trait-add"]').click();
  await expect(page.getByText("Segundo traço", { exact: true })).toHaveCount(1);
  await expect(page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]')).toHaveCount(2);

  const afterSingleAction = await readHarnessState(page);
  expect(afterSingleAction.revision).toBe(remountedState.revision + 1);
  expect(afterSingleAction.clickListeners).toBe(initialState.clickListeners);

  expect(browserErrors).toEqual([]);
});

test("production mobile entrypoint boots at a phone viewport", async ({ page }) => {
  const browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto("/mobile.html");
  const root = page.locator("[data-singular-mobile-root]");
  await expect(root).toHaveAttribute("data-singular-mounted", "true");
  await expect(page.locator(".singular-mobile-sheet__toolbar")).toHaveCount(1);
  await expect(page.locator(".singular-mobile-sheet__boot-error")).toHaveCount(0);
  await expect(page.locator('[data-action="mode-creation"]')).toHaveCount(1);
  await expect(page.locator('[data-action="mode-table"]')).toHaveCount(1);
  expect(browserErrors).toEqual([]);
});
