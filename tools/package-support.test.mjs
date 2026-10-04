import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  testerEnvironment,
  testerPackageName,
  existingSourceFiles,
  packageSourceFiles,
  inside,
  snapshotFiles,
  treeManifest,
  assertEqualManifest,
  npmNotices,
  rustNotices,
  licenseSupplements,
} from "./package-support.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(repo, "tmp");
fs.mkdirSync(tmp, { recursive: true });
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(tmp, "packaging-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test("tester package names use the EigenVista identity and retain source provenance", () => {
  const config = {
    productName: "EigenVista",
    identifier: "org.uvar-apps.eigenvista",
    version: "0.3.2",
  };
  const revision = "1234567890abcdef1234567890abcdef12345678";
  const started = "2026-10-04T12:34:56.789Z";
  const expected = "EigenVista-0.3.2-apple-silicon-20261004T123456Z-1234567";
  assert.equal(testerPackageName(config, revision, started, false), expected);
  assert.equal(
    testerPackageName(config, revision, started, true),
    `${expected}-dirty`,
  );
  for (const invalid of [
    { productName: "EigenVista Preview" },
    { identifier: "org.molekel.preview" },
    { version: "../0.3.2" },
  ])
    assert.throws(() =>
      testerPackageName({ ...config, ...invalid }, revision, started, false),
    );
});
test("uncommitted source renames omit deleted tracked paths without bypassing safety checks", (t) => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "renamed.rs"), "current source");
  const names = existingSourceFiles(dir, ["old.rs", "renamed.rs"]);
  assert.deepEqual(names, ["renamed.rs"]);
  assert.deepEqual(Object.keys(snapshotFiles(dir, names)), ["renamed.rs"]);
  fs.symlinkSync(path.join(dir, "missing"), path.join(dir, "link"));
  assert.deepEqual(existingSourceFiles(dir, ["link"]), ["link"]);
  assert.throws(() => snapshotFiles(dir, existingSourceFiles(dir, ["link"])));
  assert.throws(() => existingSourceFiles(dir, ["../outside"]));
});
test("standalone source selection excludes private exports and cannot escape the repository", (t) => {
  const dir = fixture(t);
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "source.rs"), "application source");
  fs.writeFileSync(path.join(dir, "chat-private.md"), "private fixture");
  fs.writeFileSync(path.join(dir, "docs/chat-private.md"), "private fixture");
  const names = packageSourceFiles(dir, [
    "source.rs",
    "source.rs",
    "deleted.rs",
    "chat-private.md",
    "docs/chat-private.md",
  ]);
  assert.deepEqual(names, ["source.rs"]);
  assert.deepEqual(Object.keys(snapshotFiles(dir, names)), ["source.rs"]);
  assert.throws(
    () => packageSourceFiles(dir, ["../outside"]),
    /Unsafe package path/,
  );
  assert.throws(
    () => packageSourceFiles(dir, [path.join(path.dirname(dir), "outside")]),
    /Unsafe package path/,
  );
  assert.throws(
    () => snapshotFiles(dir, ["chat-private.md"]),
    /Private chat exports/,
  );
  assert.throws(
    () => snapshotFiles(dir, ["docs/chat-private.md"]),
    /Private chat exports/,
  );
});
test("titled chat exports are excluded before any file access", (t) => {
  const dir = fixture(t);
  const name = "New Molekel-EigenVista-chat-20261004-2.10pm-AWST.md";
  const names = [name, `docs/${name}`, "Project-CHAT-export.MD"];
  // These files do not exist: exclusion must happen before filesystem access.
  assert.deepEqual(packageSourceFiles(dir, names), []);
  for (const entry of names)
    assert.throws(() => snapshotFiles(dir, [entry]), /Private chat exports/);
});
test("tester environment cannot inherit Apple signing/notarization secrets", () => {
  const env = testerEnvironment(
    {
      APPLE_ID: "private",
      APPLE_PASSWORD: "secret",
      APPLE_API_KEY: "key",
      APPLE_SIGNING_IDENTITY: "real",
      TAURI_SIGNING_PRIVATE_KEY: "key",
      TMPDIR: "/not-our-tmp",
      PATH: "test",
    },
    repo,
  );
  assert.equal(env.APPLE_ID, undefined);
  assert.equal(env.APPLE_PASSWORD, undefined);
  assert.equal(env.APPLE_API_KEY, undefined);
  assert.equal(env.TAURI_SIGNING_PRIVATE_KEY, undefined);
  assert.equal(env.APPLE_SIGNING_IDENTITY, "-");
  assert.equal(env.TMPDIR, tmp);
  assert.equal(env.TMP, tmp);
  assert.equal(env.TEMP, tmp);
  assert.equal(env.PATH, "test");
});
test("standalone tester staging and build outputs remain inside the chosen repository", (t) => {
  const dir = fixture(t);
  const env = testerEnvironment({ TMPDIR: path.dirname(dir) }, dir);
  for (const key of ["TMPDIR", "TMP", "TEMP"])
    assert.equal(env[key], path.join(dir, "tmp"));
  assert.equal(env.CARGO_TARGET_DIR, path.join(dir, "target"));
});
test("package paths reject escape and absolute destinations", () => {
  for (const name of ["", "../outside", "/absolute", "a/../../outside"])
    assert.throws(() => inside(tmp, name));
  assert.equal(inside(tmp, "a/file"), path.join(tmp, "a/file"));
});
test("classic Molekel shaders ship with provenance for the tester archive", () => {
  const shaders = path.join(repo, "shaders");
  assert.ok(fs.existsSync(path.join(shaders, "README.md")));
  for (const name of [
    "lambert.vert",
    "lambert.frag",
    "lambert.params",
    "phong.vert",
    "phong.frag",
    "phong.params",
    "clip.vert",
    "clip.frag",
    "clip.params",
    "x-ray.vert",
    "x-ray.frag",
    "x-ray.params",
  ])
    assert.ok(fs.existsSync(path.join(shaders, name)), `missing ${name}`);
  assert.ok(fs.existsSync(path.join(shaders, "doc/readme")));
});
test("source snapshots include current edits and reject symlinks/credentials", (t) => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "source.rs"), "first");
  const first = snapshotFiles(dir, ["source.rs"]);
  fs.writeFileSync(path.join(dir, "source.rs"), "edited");
  const second = snapshotFiles(dir, ["source.rs"], path.join(dir, "copy"));
  assert.throws(() => assertEqualManifest(first, second));
  assert.equal(
    fs.readFileSync(path.join(dir, "copy/source.rs"), "utf8"),
    "edited",
  );
  fs.symlinkSync(path.join(dir, "source.rs"), path.join(dir, "link"));
  assert.throws(() => snapshotFiles(dir, ["link"]));
  fs.writeFileSync(path.join(dir, ".env.local"), "private");
  assert.throws(() => snapshotFiles(dir, [".env.local"]));
});
test("archive manifest detects corrupt files and executable mode loss", (t) => {
  const dir = fixture(t);
  const file = path.join(dir, "app");
  fs.writeFileSync(file, "binary", { mode: 0o755 });
  const before = treeManifest(dir);
  fs.chmodSync(file, 0o644);
  assert.throws(() => assertEqualManifest(before, treeManifest(dir)));
  fs.chmodSync(file, 0o755);
  fs.writeFileSync(file, "corrupted");
  assert.throws(() => assertEqualManifest(before, treeManifest(dir)));
});
test("npm notices require installed locked versions and license text", (t) => {
  const dir = fixture(t);
  const pkg = path.join(dir, "node_modules/example");
  fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package-lock.json"),
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "node_modules/example": { version: "1.0.0" },
        "node_modules/dev-only": { dev: true },
      },
    }),
  );
  const metadata = { name: "example", version: "1.0.0", license: "MIT" };
  fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify(metadata));
  assert.throws(
    () => npmNotices(dir, path.join(dir, "notices")),
    /license text/,
  );
  fs.writeFileSync(path.join(pkg, "LICENSE"), "MIT text with copyright");
  assert.equal(npmNotices(dir, path.join(dir, "notices")).length, 1);
  assert.match(fs.readFileSync(path.join(dir, "notices"), "utf8"), /copyright/);
  fs.writeFileSync(
    path.join(pkg, "package.json"),
    JSON.stringify({ ...metadata, version: "2.0.0" }),
  );
  assert.throws(
    () => npmNotices(dir, path.join(dir, "notices")),
    /differs from lock/,
  );
});
test("Rust notices retain distinct copyright text and extra NOTICE files", (t) => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, "NOTICE"), "Additional attribution");
  fs.writeFileSync(path.join(dir, "LICENSE"), "License text");
  const pkg = {
    name: "crate",
    version: "1",
    source: "registry",
    manifest_path: path.join(dir, "Cargo.toml"),
  };
  const report = {
    crates: [{ package: pkg, license: "MIT" }],
    licenses: ["Copyright One", "Copyright Two"].map((text) => ({
      name: "MIT",
      id: "MIT",
      text,
      used_by: [{ crate: pkg }],
    })),
  };
  const output = path.join(dir, "output");
  rustNotices(report, output);
  const result = fs.readFileSync(output, "utf8");
  for (const text of [
    "Copyright One",
    "Copyright Two",
    "Additional attribution",
  ])
    assert.ok(result.includes(text));
  assert.throws(() => rustNotices({ licenses: [], crates: [] }, output));
  report.crates[0].license = "Unknown";
  assert.throws(() => rustNotices(report, output), /Unresolved/);
});

test("pinned supplementary notices are complete and checksummed", (t) => {
  const original = path.join(repo, "packaging/licenses");
  const entries = licenseSupplements(original);
  assert.ok(entries.some((e) => e.packages.includes("alloc-stdlib@0.3.0")));
  const dir = fixture(t);
  fs.cpSync(original, dir, { recursive: true });
  fs.appendFileSync(path.join(dir, entries[0].file), "changed");
  assert.throws(() => licenseSupplements(dir), /checksum mismatch/);
});
