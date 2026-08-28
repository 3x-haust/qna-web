import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  webServer: {
    command: "QNA_E2E_AUTH=1 bun run start -- --port 3210",
    url: "http://127.0.0.1:3210",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
