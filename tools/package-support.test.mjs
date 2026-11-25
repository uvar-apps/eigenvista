import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  testerEnvironment,
  testerPackageName,
  packagedSurfaceShaders,
  existingSourceFiles,
  packageSourceFiles,
  inside,
  snapshotFiles,
  treeManifest,
  assertEqualManifest,
  npmNotices,
  rustNotices,
  licenseSupplements,
  vendoredRustSources,
  stageVendoredRustSources,
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
test("protected working documents are excluded before access without hiding public reviews or sample sessions", (t) => {
  const dir = fixture(t);
  const allowed = [
    "source.rs",
    "docs/reviews/public-review.md",
    "docs/sample-ai-session/README.md",
  ];
  for (const name of allowed) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "public source fixture");
  }
  const protectedNames = [
    "docs/reviews/2026-11-11-code-review.md",
    "docs/./reviews/2026-11-11-code-review.md",
    "DOCS/REVIEWS/2026-11-11-CODE-REVIEW.MD",
    "zenodo-upload.md",
    "docs/zenodo-upload.md",
  ];
  // Protected files deliberately do not exist; no filesystem access is needed.
  assert.deepEqual(packageSourceFiles(dir, protectedNames), []);
  const names = packageSourceFiles(dir, [...protectedNames, ...allowed]);
  assert.deepEqual(names, [...allowed].sort());
  assert.deepEqual(Object.keys(snapshotFiles(dir, names)), [...allowed].sort());
  for (const name of protectedNames)
    assert.throws(
      () => snapshotFiles(dir, [name]),
      /Private chat exports and personal documents/,
    );
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
test("X-ray and vertex-colored Phong examples stage from the package source snapshot", (t) => {
  const sources = packagedSurfaceShaders.map((file) => `app/shaders/${file}`);
  const snapshot = fixture(t);
  const manifest = snapshotFiles(repo, sources, snapshot);
  assert.equal(sources.length, 6);
  for (const file of sources) {
    assert.ok(manifest[file]);
    assert.ok(!fs.existsSync(path.join(repo, "shaders", path.basename(file))));
    assert.deepEqual(
      fs.readFileSync(path.join(snapshot, file)),
      fs.readFileSync(path.join(repo, file)),
    );
  }
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

function vendoredFixture(t) {
  const root = fixture(t);
  const directory = path.join(root, "vendor/sesmesh");
  fs.cpSync(path.join(repo, "vendor/sesmesh"), directory, { recursive: true });
  const names = Object.keys(treeManifest(directory)).map(
    (name) => `vendor/sesmesh/${name}`,
  );
  const snapshot = path.join(root, "snapshot");
  const sourceManifest = snapshotFiles(root, names, snapshot);
  const pkg = {
    name: "sesmesh",
    version: "1.1.2",
    source: null,
    manifest_path: path.join(directory, "Cargo.toml"),
  };
  const report = {
    crates: [{ package: pkg, license: "MIT OR Apache-2.0" }],
    licenses: [
      {
        id: "MIT",
        name: "MIT License",
        used_by: [{ crate: pkg }],
        text: fs.readFileSync(path.join(directory, "LICENSE-MIT"), "utf8"),
      },
    ],
  };
  return { root, directory, snapshot, sourceManifest, report, names };
}

test("vendored Sesmesh notices and complete pinned source survive actual dependency archive staging", (t) => {
  const value = vendoredFixture(t);
  const dependencySources = path.join(value.root, "dependencies");
  const notices = path.join(value.root, "notices");
  const inventory = stageVendoredRustSources({
    ...value,
    repository: value.root,
    dependencySources,
    notices,
  });
  assert.equal(inventory.length, 1);
  assert.equal(inventory[0].name, "sesmesh");
  assert.equal(inventory[0].license, "MIT");
  assert.equal(
    inventory[0].revision,
    "1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8",
  );
  assert.deepEqual(inventory[0].patchedFiles, [
    "src/control.rs",
    "src/diag.rs",
    "src/error.rs",
    "src/field/kernel.rs",
    "src/field/lattice.rs",
    "src/field/point.rs",
    "src/geom/arrangement.rs",
    "src/geom/cells.rs",
    "src/io/assembly.rs",
    "src/io/cif/mod.rs",
    "src/io/mod.rs",
    "src/io/pdb.rs",
    "src/io/pqr.rs",
    "src/io/xyz.rs",
    "src/mesh/extract.rs",
    "src/mesh/mod.rs",
    "src/mesh/post.rs",
    "src/par.rs",
    "src/radii/mod.rs",
    "src/structure/select.rs",
    "src/surface.rs",
  ]);
  assert.equal(inventory[0].fileCount, value.names.length);
  const archive = path.join(value.root, "dependency-sources.tar.gz");
  const tar = spawnSync(
    "/usr/bin/tar",
    ["-czf", archive, "-C", dependencySources, "."],
    { env: testerEnvironment(process.env, repo) },
  );
  assert.equal(tar.status, 0, String(tar.stderr));
  const extracted = path.join(value.root, "extracted");
  fs.mkdirSync(extracted);
  const unpack = spawnSync("/usr/bin/tar", ["-xzf", archive, "-C", extracted], {
    env: testerEnvironment(process.env, repo),
  });
  assert.equal(unpack.status, 0, String(unpack.stderr));
  const vendored = path.join(extracted, "rust-vendored/sesmesh-1.1.2");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(vendored, "SOURCE-MANIFEST.json"), "utf8"),
  );
  assertEqualManifest(manifest, snapshotFiles(vendored, Object.keys(manifest)));
  for (const name of [
    "Cargo.toml",
    "src/lib.rs",
    "src/surface.rs",
    "LICENSE-MIT",
    "ORIGIN.md",
  ])
    assert.equal(
      fs.readFileSync(path.join(vendored, name), "utf8"),
      fs.readFileSync(path.join(value.directory, name), "utf8"),
    );
  const notice = fs.readFileSync(
    path.join(notices, "Sesmesh/LICENSE-MIT"),
    "utf8",
  );
  assert.equal(notice, value.report.licenses[0].text);
  assert.match(notice, /Copyright \(c\) 2026 Ugo Varetto/);
  assert.match(
    fs.readFileSync(path.join(notices, "Sesmesh/ORIGIN.md"), "utf8"),
    /1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8/,
  );
});

test("vendored source packaging rejects omissions, unreviewed changes and license substitutions", (t) => {
  const value = vendoredFixture(t);
  const validate = (manifest = value.sourceManifest, report = value.report) =>
    vendoredRustSources(report, value.root, manifest);
  assert.equal(validate()[0].fileCount, value.names.length);
  const omitted = { ...value.sourceManifest };
  delete omitted["vendor/sesmesh/src/field/mod.rs"];
  assert.throws(() => validate(omitted), /incomplete/);
  const invalidLicense = structuredClone(value.report);
  invalidLicense.licenses[0].id = "Apache-2.0";
  assert.throws(
    () => validate(value.sourceManifest, invalidLicense),
    /selected MIT/,
  );
  const lostCopyright = structuredClone(value.report);
  lostCopyright.licenses[0].text =
    "MIT boilerplate without the actual copyright";
  assert.throws(
    () => validate(value.sourceManifest, lostCopyright),
    /selected MIT/,
  );
  fs.appendFileSync(
    path.join(value.directory, "src/geom/mod.rs"),
    "\n// unreviewed change\n",
  );
  const changed = snapshotFiles(value.root, value.names);
  assert.throws(() => validate(changed), /Unreviewed vendored source change/);
  assert.throws(() => validate(), /changed after snapshot/);
});

test("vendored source packaging refuses external local crates and altered reviewed patch provenance", (t) => {
  const value = vendoredFixture(t);
  const external = structuredClone(value.report);
  external.crates.push({
    package: {
      name: "foreign",
      version: "1",
      source: null,
      manifest_path: path.join(value.root, "../not-authorized/Cargo.toml"),
    },
    license: "MIT",
  });
  assert.throws(
    () => vendoredRustSources(external, value.root, value.sourceManifest),
    /missing from the source snapshot/,
  );
  fs.appendFileSync(path.join(value.directory, "UPSTREAM-PATCHES.json"), " ");
  const changed = snapshotFiles(value.root, value.names);
  assert.throws(
    () => vendoredRustSources(value.report, value.root, changed),
    /provenance changed/,
  );
});
