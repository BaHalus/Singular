import { readFile } from "node:fs/promises";

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

async function expectCanonicalItem(page, selector, text, count = 1) {
  const items = page.locator(selector);
  await expect(items).toHaveCount(count);
  await expect(items.filter({ hasText: text })).toHaveCount(1);
}

async function expectNoCriticalHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function createBrowserCharacterExport(page) {
  return page.evaluate(async () => {
    const [{ createCharacter }, { createSingularCharacterExport }] = await Promise.all([
      import("../../src/domain/character/Character.js"),
      import("../../src/infrastructure/persistence/browser/BrowserLocalPersistence.js"),
    ]);
    return JSON.stringify(createSingularCharacterExport(createCharacter({
      identity: {
        id: "character:browser-smoke-pools",
        name: "Personagem com PV/PF",
        concept: "Seed de teste real",
      },
      pools: {
        HP: { current: 10, maximum: 10 },
        FP: { current: 10, maximum: 10 },
      },
      metadata: {
        createdAt: "2026-07-08T12:00:00.000Z",
        updatedAt: "2026-07-08T12:00:00.000Z",
        source: "browser-smoke",
      },
    }), {
      exportedAt: "2026-07-08T12:00:00.000Z",
    }));
  });
}

function parsePoolText(text) {
  const match = String(text).match(/(-?\d+)\s*\/\s*(-?\d+)/);
  expect(match).not.toBeNull();
  return {
    current: Number(match[1]),
    maximum: Number(match[2]),
  };
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

  await page.locator('[data-role="persistence-import-json"]').fill(
    await createBrowserCharacterExport(page),
  );
  await page.locator('[data-action="persistence-import"]').click();
  await expect(page.locator('.singular-alpha-mobile__feedback')).toContainText("Personagem importado");
  await expectCreationSurface(page);
  await expect(page.locator('[data-empty-context="creation"]').filter({ hasText: "Use o formul" })).not.toHaveCount(0);

  await page.locator('[data-role="character-name"]').fill("Alda Navegante");
  await page.locator('[data-role="character-concept"]').fill("Exploradora da Alpha");
  await page.locator('[data-action="character-summary-save"]').click();
  await expect(root).toHaveAttribute("data-last-command-status", "applied");
  await expectCharacterName(page, "Alda Navegante");
  await expect(page.locator('[data-role="character-name"]')).toHaveValue("Alda Navegante");

  await page.locator('[data-role="trait-name"]').fill("Destemida");
  await page.locator('[data-role="trait-points"]').fill("5");
  await page.locator('[data-action="trait-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__trait-list > div[data-trait-id]',
    "Destemida",
  );

  const traitCard = page
    .locator('.singular-mobile-sheet__trait-list > div[data-trait-id]')
    .filter({ hasText: "Destemida" });
  const traitId = await traitCard.getAttribute("data-trait-id");
  expect(traitId).not.toBeNull();
  const addModifier = async ({ name, kind, value, notes }) => {
    await traitCard.locator(`[data-role="trait-modifier-add-name-${traitId}"]`).fill(name);
    await traitCard.locator(`[data-role="trait-modifier-add-kind-${traitId}"]`).selectOption(kind);
    await traitCard.locator(`[data-role="trait-modifier-add-value-${traitId}"]`).fill(String(value));
    await traitCard.locator(`[data-role="trait-modifier-add-notes-${traitId}"]`).fill(notes);
    await traitCard.locator('[data-action="trait-modifier-add"]').click();
  };

  await addModifier({ name: "Área", kind: "enhancement", value: 50, notes: "Cone amplo" });
  await addModifier({ name: "Uso limitado", kind: "limitation", value: 20, notes: "Três vezes" });
  await expect(traitCard.locator('[data-action="trait-modifier-update"]')).toHaveCount(2);

  const firstModifierEditor = traitCard
    .locator('.singular-mobile-sheet__trait-modifier-form')
    .filter({ has: page.locator('[data-action="trait-modifier-update"]') })
    .first();
  await firstModifierEditor.locator('[data-role^="trait-modifier-edit-name-"]').fill("Área ampliada");
  await firstModifierEditor.locator('[data-role^="trait-modifier-edit-value-"]').fill("60");
  await firstModifierEditor.locator('[data-action="trait-modifier-update"]').click();
  await expect(traitCard.locator('.singular-mobile-sheet__trait-modifiers')).toContainText("Área ampliada");

  await traitCard.locator('[data-action="trait-modifier-enabled-set"]').first().click();
  await expect(traitCard.locator('.singular-mobile-sheet__trait-modifiers li[data-enabled="false"]')).toHaveCount(1);
  await traitCard.getByRole("button", { name: "Mover Uso limitado para cima" }).click();
  await expect(traitCard.locator('.singular-mobile-sheet__trait-modifiers li').first()).toContainText("Uso limitado");
  await traitCard.locator('[data-action="trait-modifier-remove"]').filter({ hasText: "Excluir" }).last().click();
  await expect(traitCard.locator('[data-action="trait-modifier-update"]')).toHaveCount(1);

  await page.locator('[data-role="skill-name"]').fill("Navegacao");
  await page.locator('[data-role="skill-specialization"]').fill("Costeira");
  await page.locator('[data-role="skill-attribute"]').selectOption("IQ");
  await page.locator('[data-role="skill-difficulty"]').selectOption("A");
  await page.locator('[data-role="skill-points"]').fill("2");
  await page.locator('[data-action="skill-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__skill-technique-list > div[data-skill-id]',
    "Navegacao",
  );

  await page.locator('[data-role="technique-name"]').fill("Rota Segura");
  await page.locator('[data-role="technique-skill-name"]').fill("Navegacao");
  await page.locator('[data-role="technique-difficulty"]').selectOption("H");
  await page.locator('[data-role="technique-points"]').fill("1");
  await page.locator('[data-role="technique-default-penalty"]').fill("-2");
  await page.locator('[data-role="technique-maximum-relative-level"]').fill("0");
  await page.locator('[data-action="technique-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__skill-technique-list > div[data-technique-id]',
    "Rota Segura",
  );

  await page.locator('[data-role="attack-name"]').fill("Machado de teste");
  await page.locator('[data-role="attack-damage-value"]').fill("1d+2");
  await page.locator('[data-role="attack-damage-type"]').fill("cut");
  await page.locator('[data-action="attack-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__attack-list > div[data-attack-id]',
    "Machado de teste",
  );

  await page.locator('[data-role="spell-name"]').fill("Luz de Teste");
  await page.locator('[data-role="spell-attribute"]').fill("IQ");
  await page.locator('[data-role="spell-difficulty"]').fill("H");
  await page.locator('[data-role="spell-points"]').fill("1");
  await page.locator('[data-role="spell-class"]').fill("Regular");
  await page.locator('[data-role="spell-casting-cost"]').fill("1");
  await page.locator('[data-action="spell-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__spell-list > div[data-spell-id]',
    "Luz de Teste",
  );

  await page.locator('[data-role="power-name"]').fill("Sorte Alpha");
  await page.locator('[data-role="power-source"]').fill("Teste");
  await page.locator('[data-role="power-modifier-name"]').fill("Alpha");
  await page.locator('[data-role="power-modifier-value-percent"]').fill("-10");
  await page.locator('[data-role="power-tags"]').fill("alpha");
  await page.locator('[data-action="power-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__power-list > div[data-power-id]',
    "Sorte Alpha",
  );

  await page.locator('[data-role="equipment-name"]').fill("Mochila de teste");
  await page.locator('[data-role="equipment-weight-kg"]').fill("1.5");
  await page.locator('[data-role="equipment-cost"]').fill("60");
  await page.locator('[data-action="equipment-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__equipment-list > div[data-equipment-id]',
    "Mochila de teste",
  );
  await expectNoCriticalHorizontalOverflow(page);

  const beforeSave = await readHarnessState(page);
  expect(beforeSave.revision).toBeGreaterThanOrEqual(4);

  await page.locator('[data-action="persistence-save"]').click();
  await expect(page.locator('.singular-alpha-mobile__feedback')).toContainText("Sessão salva");
  await expect(page.locator('.singular-alpha-mobile__save-list li')).toHaveCount(1);

  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="persistence-export"]').click();
  const exportedDownload = await downloadPromise;
  const exportedPath = await exportedDownload.path();
  expect(exportedPath).not.toBeNull();
  const exportedJson = await readFile(exportedPath, "utf8");
  expect(exportedJson).toContain("Alda Navegante");
  expect(exportedJson).toContain("Sorte Alpha");

  await page.locator('[data-action="mode-table"]').click();
  await expect(root).toHaveAttribute("data-mode", "table");
  await expect(page.locator('[data-role="mode-status"]')).toContainText("Modo Mesa");
  await expect(page.locator('[data-role="table-mode-guidance"]')).toContainText("estrutura da ficha está bloqueada");
  await expect(page.locator('[data-empty-context="table"]').filter({ hasText: "Volte ao modo" })).not.toHaveCount(0);
  await expect(page.locator('[data-role="character-name"]')).toHaveCount(0);
  await expect(page.locator('[data-attribute-adjust]')).toHaveCount(0);
  for (const role of creationEditors) {
    await expect(page.locator(`[data-role="${role}"]`)).toHaveCount(0);
  }
  await expect(page.locator('[data-role="trait-modifier-editor"]')).toHaveCount(0);
  await expectCharacterName(page, "Alda Navegante");

  const tablePoolAdjusters = page.locator('[data-pool-adjust]');
  expect(await tablePoolAdjusters.count()).toBeGreaterThan(0);
  const transientPool = page
    .locator('.singular-mobile-sheet__pool')
    .filter({ hasText: /PV|PF/ })
    .filter({ has: page.locator('[data-pool-adjust="-1"]') })
    .first();
  await expect(transientPool).toHaveCount(1);
  const decrement = transientPool.locator('[data-pool-adjust="-1"]');
  await expect(decrement).toBeEnabled();
  const beforePool = parsePoolText(await transientPool.locator("dd").textContent());
  expect(beforePool.current).toBeGreaterThan(0);
  const beforePoolState = await readHarnessState(page);
  await decrement.click();
  await expect.poll(async () => {
    const pool = parsePoolText(await transientPool.locator("dd").textContent());
    const state = await readHarnessState(page);
    return `${pool.current}/${pool.maximum}/${state.revision}`;
  }).toBe(`${beforePool.current - 1}/${beforePool.maximum}/${beforePoolState.revision + 1}`);

  await page.locator('[data-action="mode-creation"]').click();
  await expect(root).toHaveAttribute("data-mode", "creation");
  await expect(page.locator('[data-role="mode-status"]')).toContainText("Modo Criação");
  await expect(page.locator('[data-role="table-mode-guidance"]')).toHaveCount(0);
  await expectCreationSurface(page);
  await expect(page.locator('[data-role="character-name"]')).toHaveValue("Alda Navegante");
  expect(await page.locator('[data-attribute-adjust]').count()).toBeGreaterThan(0);

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
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__trait-list > div[data-trait-id]',
    "Destemida",
  );
  await expect(page.locator('[data-role="trait-modifier-editor"]')).toContainText("Uso limitado");
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__attack-list > div[data-attack-id]',
    "Machado de teste",
  );
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__equipment-list > div[data-equipment-id]',
    "Mochila de teste",
  );

  await page.locator('[data-role="trait-name"]').fill("Segundo traço");
  await page.locator('[data-role="trait-points"]').fill("1");
  await page.locator('[data-action="trait-add"]').click();
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__trait-list > div[data-trait-id]',
    "Segundo traço",
    2,
  );

  const afterSingleAction = await readHarnessState(page);
  expect(afterSingleAction.revision).toBe(remountedState.revision + 1);
  expect(afterSingleAction.clickListeners).toBe(initialState.clickListeners);

  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__skill-technique-list > div[data-skill-id]',
    "Navegacao",
  );
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__skill-technique-list > div[data-technique-id]',
    "Rota Segura",
  );
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__spell-list > div[data-spell-id]',
    "Luz de Teste",
  );
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__power-list > div[data-power-id]',
    "Sorte Alpha",
  );

  await page.locator('[data-role="persistence-import-json"]').fill(exportedJson);
  await page.locator('[data-action="persistence-import"]').click();
  await expect(page.locator('.singular-alpha-mobile__feedback')).toContainText("Personagem importado");
  await expectCreationSurface(page);
  await expectCharacterName(page, "Alda Navegante");
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__trait-list > div[data-trait-id]',
    "Destemida",
  );
  await expect(
    page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({ hasText: "Segundo traço" }),
  ).toHaveCount(0);
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__skill-technique-list > div[data-skill-id]',
    "Navegacao",
  );
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__skill-technique-list > div[data-technique-id]',
    "Rota Segura",
  );
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__spell-list > div[data-spell-id]',
    "Luz de Teste",
  );
  await expectCanonicalItem(
    page,
    '.singular-mobile-sheet__power-list > div[data-power-id]',
    "Sorte Alpha",
  );

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
  await expectNoCriticalHorizontalOverflow(page);

  const firstCollapse = page.locator('[data-action="section-collapse-toggle"]').first();
  await expect(firstCollapse).toBeVisible();
  await expect(firstCollapse).toHaveAttribute("aria-expanded", "true");
  await firstCollapse.click();
  await expect(firstCollapse).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".singular-mobile-sheet__toolbar")).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
  expect(browserErrors).toEqual([]);
});
