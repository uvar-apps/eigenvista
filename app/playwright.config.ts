import { defineConfig } from "@playwright/test";
// Enable only after checking this Linux machine's EGL renderer; other runners
// retain Playwright's normal backend. This changes tests, never app rendering.
const linuxEgl =
  process.platform === "linux" && process.env.EIGENVISTA_TEST_LINUX_EGL === "1";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        ...(linuxEgl
          ? {
              launchOptions: {
                args: ["--use-gl=angle", "--use-angle=gl-egl", "--enable-gpu"],
              },
            }
          : {}),
      },
    },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  use: {
    baseURL: "http://127.0.0.1:5178",
    viewport: { width: 1440, height: 960 },
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
