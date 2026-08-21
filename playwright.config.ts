import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3210",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 730 } },
    },
  ],
  webServer: {
    command: "bun run dev -- --port 3210",
    url: "http://127.0.0.1:3210",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
