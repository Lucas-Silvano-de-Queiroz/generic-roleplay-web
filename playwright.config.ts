import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_WEB_BASE_URL ?? "http://127.0.0.1:3450";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: { baseURL, screenshot: "only-on-failure", ...devices["Desktop Chrome"] },
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3450",
    url: baseURL,
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      API_BASE_URL: process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:3451",
      WEB_SESSION_COOKIE_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
