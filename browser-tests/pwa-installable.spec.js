import { test, expect } from "@playwright/test";

test("mobile entrypoint exposes an installable standalone manifest", async ({ page }) => {
  await page.goto("/mobile.html");

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBe("./manifest.webmanifest");

  const manifest = await page.evaluate(async href => {
    const response = await fetch(href);
    return response.json();
  }, manifestHref);

  expect(manifest.start_url).toBe("./mobile.html");
  expect(manifest.scope).toBe("./");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: "192x192" }),
    expect.objectContaining({ sizes: "512x512" }),
  ]));
});

test("service worker reopens the Alpha shell offline without clearing local data", async ({ page, context }) => {
  await page.goto("/mobile.html");
  await expect(page.locator("[data-singular-mobile-root]")).toHaveAttribute("data-singular-mounted", "true");

  await page.evaluate(async () => {
    localStorage.setItem("singular:pwa-smoke", "preserved");
    await navigator.serviceWorker.ready;
  });

  await expect.poll(() => page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys.find(key => key.startsWith("singular-alpha-shell")) ?? "");
    const requests = await cache.keys();
    return requests.some(request => request.url.endsWith("/mobile.html"))
      && requests.some(request => request.url.includes("/src/domain/"));
  })).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.locator("[data-singular-mobile-root]")).toHaveAttribute("data-singular-mounted", "true");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("singular:pwa-smoke"))).toBe("preserved");
});
