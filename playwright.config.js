import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser-tests",
  testMatch: "**/*.spec.js",
  testIgnore: "public-deployment.spec.js",
  timeout: 20_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node browser-tests/static-server.mjs 4173",
    url: "http://127.0.0.1:4173/mobile.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
  },
});
