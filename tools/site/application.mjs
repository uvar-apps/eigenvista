// Current source identity is separate from verified, published download facts.
import fs from "node:fs";
import { release } from "./release.mjs";

const { version } = JSON.parse(
  fs.readFileSync(new URL("../../app/src-tauri/tauri.conf.json", import.meta.url)),
);
if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version))
  throw Error("A valid current application version is required for the website");

export const application = Object.freeze({
  version,
  status: version === release.version ? "published" : "unreleased",
  publishedVersion: release.version,
});
