import path from "node:path";
import { fileURLToPath } from "node:url";
import baseConfig from "../app/playwright.config.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Keep the local test selection, engines, timeouts and single worker. Only
// hosted diagnostics and server ownership differ from the normal test command.
export default {
  ...baseConfig,
  testDir: path.join(root, "app/tests"),
  outputDir: path.join(root, "app/test-results"),
  forbidOnly: true,
  reporter: [
    ["line"],
    [
      "html",
      { outputFolder: path.join(root, "app/playwright-report"), open: "never" },
    ],
  ],
  use: {
    ...baseConfig.use,
    screenshot: "only-on-failure",
    trace: { mode: "retain-on-failure", sources: false },
  },
  webServer: {
    ...baseConfig.webServer,
    cwd: path.join(root, "app"),
    reuseExistingServer: false,
  },
};
