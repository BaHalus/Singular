import { test, expect } from "@playwright/test";

function parsePoolText(text) {
  const match = String(text).match(/(-?\d+)\s*\/\s*(-?\d+)/);
  expect(match).not.toBeNull();
  return {
    current: Number(match[1]),
    maximum: Number(match[2]),
  };
}

async function expectNoCriticalHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1);
}

async function runFinalMobileGate(page, iteration) {
  const browserErrors = [];
  const onPageError = error => browserErrors.push(error.message);
  const onConsole = message => {
    if (message.type() === "error") browserErrors.push(message.text());
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);

  await page.goto(`/test/browser/mobile-alpha-harness.html?reset=1&iteration=${iteration}`);
  await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS_READY__);

  const root = page.locator("[data-singular-mobile-root]");
  await expect(root).toHaveAttribute("data-singular-mounted", "true");
  await expect(root).toHaveAttribute("data-mode", "creation");
  await expect(page.locator('[data-role="mode-status"]')).toContainText("Modo Criação");

  await page.locator('[data-role="character-name"]').fill(`Personagem A9.3 ${iteration}`);
  await page.locator('[data-role="character-concept"]').fill("Gate mobile repetível");
  await page.locator('[data-action="character-summary-save"]').click();
  await expect(root).toHaveAttribute("data-last-command-status", "applied");

  await page.locator('[data-role="trait-name"]').fill(`Traço de biblioteca ${iteration}`);
  await page.locator('[data-role="trait-points"]').fill("1");
  await page.locator('[data-action="trait-add"]').click();
  await expect(
    page.locator('.singular-mobile-sheet__trait-list > div[data-trait-id]').filter({
      hasText: `Traço de biblioteca ${iteration}`,
    }),
  ).toHaveCount(1);

  await page.locator('[data-action="persistence-save"]').click();
  await expect(page.locator(".singular-alpha-mobile__feedback")).toContainText("Sessão salva");
  const savedCharacter = page.locator(".singular-alpha-mobile__save-list li").filter({
    hasText: `Personagem A9.3 ${iteration}`,
  });
  await expect(savedCharacter).toHaveCount(1);
  await expect(savedCharacter.locator('[data-action="persistence-load"]')).toBeVisible();

  await expectNoCriticalHorizontalOverflow(page);

  await page.locator('[data-action="mode-table"]').click();
  await expect(root).toHaveAttribute("data-mode", "table");
  await expect(page.locator('[data-role="mode-status"]')).toContainText("Modo Mesa");
  await expect(page.locator('[data-role="character-name"]')).toHaveCount(0);
  await expect(page.locator('[data-role="trait-editor"]')).toHaveCount(0);

  const transientPool = page
    .locator(".singular-mobile-sheet__pool")
    .filter({ hasText: /PV|PF/ })
    .filter({ has: page.locator('[data-pool-adjust="-1"]') })
    .first();
  await expect(transientPool).toHaveCount(1);
  const beforePool = parsePoolText(await transientPool.locator("dd").textContent());
  const decrement = transientPool.locator('[data-pool-adjust="-1"]');
  await expect(decrement).toBeEnabled();
  await decrement.click();
  await expect.poll(async () => parsePoolText(await transientPool.locator("dd").textContent()).current)
    .toBe(beforePool.current - 1);

  await expectNoCriticalHorizontalOverflow(page);
  expect(browserErrors).toEqual([]);

  page.off("pageerror", onPageError);
  page.off("console", onConsole);
}

test("A9.3 final mobile gate passes three consecutive runs on the same head", async ({ page }) => {
  for (let iteration = 1; iteration <= 3; iteration += 1) {
    await test.step(`mobile stability run ${iteration}/3`, async () => {
      await runFinalMobileGate(page, iteration);
    });
  }
});
