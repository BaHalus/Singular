import { test, expect } from "@playwright/test";

test("Alpha mobile usable path stays reachable across creation, persistence, and table mode", async ({ page }) => {
  await page.goto("/mobile.html");

  const root = page.locator("[data-singular-mobile-root]");
  await expect(root).toHaveAttribute("data-singular-mounted", "true");
  await expect(root).toHaveAttribute("data-mode", "creation");
  await expect(page.locator('link[href="./src/ui/mobile/CharacterMobileTextOverflowGuards.css"]')).toHaveCount(1);

  await expect(page.locator('[data-role="character-summary-editor"]')).toBeVisible();
  await expect(page.locator('[data-card="traits"] .singular-mobile-sheet__empty')).toBeVisible();
  await expect(page.locator('[data-card="skills-techniques"] .singular-mobile-sheet__empty')).toBeVisible();
  await expect(page.locator('[data-action="section-collapse-toggle"]').first()).toBeVisible();

  await page.locator('[data-role="character-name"]').fill("Alpha usable gate");
  await page.locator('[data-role="character-concept"]').fill("Fluxo mínimo versionado");
  await page.locator('[data-action="character-summary-save"]').click();
  await expect(root).toHaveAttribute("data-last-command-status", /applied|no-op/);
  await expect(page.locator('[data-card="identity"]')).toContainText("Alpha usable gate");

  await expect(page.locator('[data-action="persistence-save"]')).toBeVisible();
  await expect(page.locator('[data-action="persistence-refresh"]')).toBeVisible();
  await expect(page.locator('[data-role="persistence-import-json"]')).toBeVisible();

  await page.locator('[data-action="mode-table"]').click();
  await expect(root).toHaveAttribute("data-mode", "table");
  await expect(page.locator('[data-role="character-summary-editor"]')).toHaveCount(0);
  await expect(page.locator('[data-role="trait-editor"]')).toHaveCount(0);
  await expect(page.locator('[data-role="skill-editor"]')).toHaveCount(0);
  await expect(page.locator('[data-action="trait-add"]')).toHaveCount(0);
  await expect(page.locator('[data-action="skill-add"]')).toHaveCount(0);

  const hpDecrease = page.locator('[data-pool-key="HP"][data-pool-adjust="-1"]');
  await expect(hpDecrease).toBeVisible();
  await hpDecrease.click();
  await expect(root).toHaveAttribute("data-last-command-status", /applied|no-op/);

  const firstCollapse = page.locator('[data-action="section-collapse-toggle"]').first();
  await firstCollapse.click();
  await expect(root).toHaveAttribute("data-last-command-status", "applied");
  await expect(page.locator('[data-section-collapsible="true"][data-collapsed="true"]').first()).toBeVisible();
});
