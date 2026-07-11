import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser-tests",
  testMatch: "public-deployment.spec.js",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4174/Singular",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build:public && rm -rf .public-smoke && mkdir -p .public-smoke/Singular && cp -R dist/. .public-smoke/Singular/ && cd .public-smoke && PORT=4174 SINGULAR_SMOKE_SERVER_IDLE_MS=120000 node ../browser-tests/static-server.mjs",
    url: "http://127.0.0.1:4174/Singular/mobile.html",
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
