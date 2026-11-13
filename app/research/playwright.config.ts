import path from "node:path";
import { fileURLToPath } from "node:url";
import base from "../../ci/playwright.config.mts";

const root = fileURLToPath(new URL("../../", import.meta.url));
export default {
  ...base,
  testDir: path.dirname(fileURLToPath(import.meta.url)),
  testMatch: "anisotropy.probe.ts",
  outputDir: path.join(
    root,
    "tmp/2026-11-13-research41-43/anisotropy43/probe-results",
  ),
  reporter: [
    ["line"],
    [
      "json",
      {
        outputFile: path.join(
          root,
          "tmp/2026-11-13-research41-43/anisotropy43/probe-report.json",
        ),
      },
    ],
  ],
};
