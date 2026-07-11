import { test, expect } from "@playwright/test";

const browserErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  browserErrors.set(page, errors);

  page.on("pageerror", error => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", message => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`);
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], "public deployment emitted browser errors").toEqual([]);
});

test("public artifact opens the mobile app with relative PWA assets", async ({ page }) => {
  const response = await page.goto("/Singular/mobile.html", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBe(true);
  expect(new URL(page.url()).pathname).toBe("/Singular/mobile.html");
  await expect(page.locator("[data-singular-mobile-root]")).toHaveAttribute("data-singular-mounted", "true");

  const urls = await page.evaluate(() => ({
    manifest: new URL(document.querySelector('link[rel="manifest"]').getAttribute("href"), location.href).href,
    icon: new URL(document.querySelector('link[rel="icon"]').getAttribute("href"), location.href).href,
    script: new URL("./src/ui/mobile/CharacterMobileCompositionRoot.js", location.href).href,
    worker: new URL("./sw.js", location.href).href,
  }));

  for (const url of Object.values(urls)) {
    expect(new URL(url).pathname.startsWith("/Singular/"), `${url} should remain inside /Singular/`).toBe(true);
    const asset = await page.request.get(url);
    expect(asset.ok(), `${url} should be available`).toBe(true);
  }

  const manifest = await page.evaluate(async () => (await fetch("./manifest.webmanifest")).json());
  expect(manifest.start_url).toBe("./mobile.html");
  expect(manifest.scope).toBe("./");
  expect(manifest.display).toBe("standalone");
});

test("public artifact preserves local data and reopens offline", async ({ page, context }) => {
  await page.goto("/Singular/mobile.html");
  await expect(page.locator("[data-singular-mobile-root]")).toHaveAttribute("data-singular-mounted", "true");

  await page.evaluate(async () => {
    localStorage.setItem("singular:public-deployment-smoke", "preserved");
    await navigator.serviceWorker.ready;
  });

  await expect.poll(() => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active);
  })).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(new URL(page.url()).pathname).toBe("/Singular/mobile.html");
  await expect(page.locator("[data-singular-mobile-root]")).toHaveAttribute("data-singular-mounted", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("singular:public-deployment-smoke"))).toBe("preserved");
});
