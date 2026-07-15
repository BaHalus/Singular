import { test, expect } from "@playwright/test";

async function createModifiedTraitExport(page) {
  return page.evaluate(async () => {
    const [{ createCharacter }, { createSingularCharacterExport }] = await Promise.all([
      import("../../src/domain/character/Character.js"),
      import("../../src/infrastructure/persistence/browser/BrowserLocalPersistence.js"),
    ]);
    const character = createCharacter({
      identity: {
        id: "character:trait-modifier-readonly",
        name: "Alda dos Ventos",
        concept: "Teste mobile de modificadores",
      },
      traits: [{
        id: "trait-flight",
        name: "Voo com nome deliberadamente longo para testar o fluxo mobile real",
        role: "advantage",
        pointValue: { basePoints: 40 },
        modifiers: [
          {
            id: "enhanced-speed",
            name: "Velocidade Ampliada e Controle em Espaços Muito Estreitos",
            kind: "enhancement",
            valueType: "percentage",
            value: 20,
            source: null,
            notes: "",
          },
          {
            id: "winged",
            name: "Alado",
            kind: "limitation",
            valueType: "percentage",
            value: 25,
            source: null,
            notes: "",
          },
        ],
      }],
    });
    return JSON.stringify(createSingularCharacterExport(character, {
      exportedAt: "2026-07-15T00:00:00.000Z",
    }));
  });
}

test("modified Trait costs remain readable and readonly across mobile modes", async ({ page }) => {
  await page.goto("/test/browser/mobile-alpha-harness.html?reset=1");
  await page.evaluate(() => globalThis.__SINGULAR_ALPHA_HARNESS_READY__);

  await page.locator('[data-role="persistence-import-json"]').fill(
    await createModifiedTraitExport(page),
  );
  await page.locator('[data-action="persistence-import"]').click();

  const trait = page.locator('[data-trait-id="trait-flight"]');
  const breakdown = trait.locator('[data-role="trait-cost-breakdown"]');
  await expect(breakdown).toHaveAttribute("data-status", "ready");
  await expect(breakdown).toContainText("Custo base40 pts");
  await expect(breakdown).toContainText("Custo final38 pts");
  await expect(breakdown).toContainText("Velocidade Ampliada");
  await expect(breakdown).toContainText("-25%");

  await page.locator('[data-action="mode-table"]').click();
  await expect(page.locator('[data-trait-id="trait-flight"] [data-role="trait-cost-breakdown"]')).toContainText("Custo final38 pts");
  await expect(page.locator('[data-trait-id="trait-flight"] [data-action^="trait-"]')).toHaveCount(0);
  await expect(page.locator('[data-trait-id="trait-flight"] [data-action^="modifier-"]')).toHaveCount(0);

  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport + 1);
});
