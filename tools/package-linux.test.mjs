import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  linuxPackageName,
  linuxPackageEnvironment,
  verifyLinuxExecutable,
  linuxResourceFiles,
  stageLinuxResources,
  linuxLicenseConfiguration,
  linuxSourceFiles,
} from "./package-linux.mjs";
import {
  digest,
  packageSourceFiles,
  snapshotFiles,
  treeManifest,
  licenseSupplements,
} from "./package-support.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
const fixture = (t) => {
  const directory = fs.mkdtempSync(path.join(tmp, "linux-package-test-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
};
const identity = {
  productName: "EigenVista",
  identifier: "org.uvar-apps.eigenvista",
  version: "0.10.3",
};
const revision = "abcdef0".padEnd(40, "1");
const timestamp = "2026-11-20T12:01:02.000Z";

test("Linux source selection excludes transfer metadata before filesystem access and retains public source", (t) => {
  const directory = fixture(t);
  fs.mkdirSync(path.join(directory, "nested"));
  const content = Buffer.from("pub fn public_source() {}\n");
  fs.writeFileSync(path.join(directory, "public.rs"), content);
  fs.writeFileSync(path.join(directory, "._unreadable"), "Mac metadata", {
    mode: 0o000,
  });
  fs.writeFileSync(path.join(directory, "nested/.DS_Store"), "Mac metadata", {
    mode: 0o000,
  });
  fs.symlinkSync("__MACOSX", path.join(directory, "__MACOSX"));
  fs.symlinkSync("._loop", path.join(directory, "nested/._loop"));
  // This real ELOOP control proves that delegating first would access the metadata.
  assert.throws(() => packageSourceFiles(directory, ["__MACOSX/private.bin"]), {
    code: "ELOOP",
  });
  const selected = linuxSourceFiles(directory, [
    "public.rs",
    "._unreadable",
    "nested/.DS_Store",
    "__MACOSX/private.bin",
    "nested/._loop/private.bin",
    "nested\\._sidecar\\private.bin",
    "zenodo-upload.md",
    "session-chat-export.md",
  ]);
  assert.deepEqual(selected, ["public.rs"]);
  assert.deepEqual(snapshotFiles(directory, selected), {
    "public.rs": digest(content),
  });
});

test("Linux-only missing crate notices retain exact upstream copyright, versions and verified bytes", () => {
  const supplements = licenseSupplements(
    path.join(root, "packaging/licenses/linux"),
  );
  const dlopen = supplements.find((entry) =>
    entry.packages.includes("dlopen2@0.8.2"),
  );
  assert.ok(dlopen);
  assert.ok(dlopen.packages.includes("dlopen2_derive@0.4.3"));
  assert.match(
    dlopen.url,
    /cc80e4a0a90d499b677fdf7743699b4b3a43a989\/LICENSE$/,
  );
  assert.match(dlopen.text, /Copyright \(c\) 2017 Szymon Wieloch/);
  assert.match(dlopen.text, /Copyright \(C\) 2022 OpenByte/);
});

test("Linux license selection includes the declared target-lexicon exception and keeps Mac configuration intact", () => {
  const template = fs.readFileSync(
    path.join(root, "packaging/about.toml"),
    "utf8",
  );
  const config = linuxLicenseConfiguration(template);
  assert.match(config, /x86_64-unknown-linux-gnu/);
  assert.match(config, /wasm32-unknown-unknown/);
  assert.match(config, /Apache-2.0 WITH LLVM-exception/);
  assert.doesNotMatch(config, /aarch64-apple-darwin/);
  assert.equal(
    fs.readFileSync(path.join(root, "packaging/about.toml"), "utf8"),
    template,
  );
  assert.throws(
    () =>
      linuxLicenseConfiguration(
        template.replace("aarch64-apple-darwin", "other"),
      ),
    /Review changed/,
  );
});

test("Linux archive names retain release identity, revision, timestamp and dirty marker", () => {
  assert.equal(
    linuxPackageName(identity, revision, timestamp, false),
    "EigenVista-0.10.3-linux-x86_64-20261120T120102Z-abcdef0",
  );
  assert.equal(
    linuxPackageName(identity, revision, timestamp, true),
    "EigenVista-0.10.3-linux-x86_64-20261120T120102Z-abcdef0-dirty",
  );
  assert.equal(
    linuxPackageName(
      { ...identity, version: "0.10.3-apple-silicon-test" },
      revision,
      timestamp,
      false,
    ),
    "EigenVista-0.10.3-apple-silicon-test-linux-x86_64-20261120T120102Z-abcdef0",
  );
  for (const config of [
    { ...identity, productName: "../../other" },
    { ...identity, identifier: "other" },
    { ...identity, version: "../escape" },
  ])
    assert.throws(() => linuxPackageName(config, revision, timestamp, false));
  assert.throws(() =>
    linuxPackageName(identity, "../escape", timestamp, false),
  );
  assert.throws(() => linuxPackageName(identity, revision, "bad-date", false));
});

test("Linux build environment preserves caller settings while removing Mac signing and relocating temporary files", () => {
  const parent = {
    PATH: "/usr/bin",
    RUSTUP_HOME: "/project/toolchain",
    APPLE_API_KEY: "must-not-propagate",
    TAURI_SIGNING_PRIVATE_KEY: "must-not-propagate",
    MACOSX_DEPLOYMENT_TARGET: "13.0",
    TMPDIR: "/elsewhere",
  };
  const env = linuxPackageEnvironment(parent, root);
  for (const name of ["TMPDIR", "TMP", "TEMP"]) assert.equal(env[name], tmp);
  assert.equal(env.CARGO_TARGET_DIR, path.join(root, "target"));
  assert.equal(env.PATH, parent.PATH);
  assert.equal(env.RUSTUP_HOME, parent.RUSTUP_HOME);
  for (const name of [
    "APPLE_API_KEY",
    "TAURI_SIGNING_PRIVATE_KEY",
    "MACOSX_DEPLOYMENT_TARGET",
  ])
    assert.equal(env[name], undefined);
  assert.equal(parent.APPLE_API_KEY, "must-not-propagate");
});

// These cases test the packaging header guard; real executable startup belongs to native acceptance.
test("ELF validation rejects wrong architectures, formats, file kinds and execution modes", (t) => {
  const directory = fixture(t);
  const file = path.join(directory, "executable");
  const valid = Buffer.alloc(64);
  Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1]).copy(valid);
  valid.writeUInt16LE(3, 16);
  valid.writeUInt16LE(62, 18);
  fs.writeFileSync(file, valid, { mode: 0o755 });
  assert.deepEqual(verifyLinuxExecutable(file), {
    bytes: 64,
    sha256: digest(valid),
    mode: 0o755,
  });
  for (const mutate of [
    (b) => b.fill(0, 0, 4),
    (b) => (b[4] = 1),
    (b) => (b[5] = 2),
    (b) => b.writeUInt16LE(183, 18),
    (b) => b.writeUInt16LE(1, 16),
  ]) {
    const bytes = Buffer.from(valid);
    mutate(bytes);
    fs.writeFileSync(file, bytes);
    assert.throws(() => verifyLinuxExecutable(file), /ELF64/);
  }
  fs.writeFileSync(file, valid);
  fs.chmodSync(file, 0o644);
  assert.throws(() => verifyLinuxExecutable(file), /regular executable/);
  fs.chmodSync(file, 0o755);
  fs.symlinkSync(file, path.join(directory, "link"));
  assert.throws(
    () => verifyLinuxExecutable(path.join(directory, "link")),
    /regular executable/,
  );
  assert.throws(() => verifyLinuxExecutable(directory), /regular executable/);
});

const redistributableSources = () => {
  const names = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  return snapshotFiles(root, linuxSourceFiles(root, names));
};

test("Real Linux resources stage with exact hashes, modes, all palettes, examples and portable instructions", (t) => {
  const prefix = fixture(t);
  const sourceManifest = redistributableSources();
  const mappings = linuxResourceFiles(sourceManifest);
  const oldMask = process.umask(0o077);
  let manifest;
  try {
    manifest = stageLinuxResources(root, prefix, sourceManifest);
  } finally {
    process.umask(oldMask);
  }
  const restored = treeManifest(prefix);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(manifest).map(([name, { sha256, mode }]) => [
        name,
        { sha256, mode },
      ]),
    ),
    restored,
  );
  for (const [name, entry] of Object.entries(manifest))
    assert.equal(entry.bytes, fs.statSync(path.join(prefix, name)).size);
  for (const [source, destination] of mappings)
    assert.equal(restored[destination].sha256, sourceManifest[source]);
  for (const name of [
    "matterviz-muted.json",
    "matterviz-pastel.json",
    "accessible-elements.json",
  ])
    for (const directory of ["Palettes", "AI-connector/palettes"])
      assert.equal(
        restored[`share/eigenvista/${directory}/${name}`].sha256,
        sourceManifest[`palettes/${name}`],
      );
  for (const file of [
    "SKILL.md",
    "reference.md",
    "README.md",
    "examples/bicyclic-c7h10.molden",
    "examples/complex-field.cube",
  ])
    assert.ok(restored[`share/eigenvista/AI-connector/${file}`]);
  assert.ok(restored["share/eigenvista/Examples/water.molden"]);
  assert.ok(restored["share/eigenvista/Examples/signed-affine.cube"]);
  for (const file of [
    "Examples/water.pdb",
    "Examples/water.xyz",
    "Shaders/x-ray.frag",
    "Shaders/lambert.vert",
    "User-guide.md",
  ])
    assert.ok(restored[`share/eigenvista/${file}`], file);
  assert.equal(
    restored["share/eigenvista/AI-connector/Start AI connection.sh"].mode,
    0o755,
  );
  assert.ok(
    !Object.keys(restored).some((file) =>
      /Contents\/|\.command$|zenodo-upload|chat-|\.env(?:\.|$)|\/\.git\//i.test(
        file,
      ),
    ),
  );
  assert.throws(
    () => stageLinuxResources(root, prefix, sourceManifest),
    /EEXIST/,
  );
});

test("Missing or changed resource source fails before its bytes can be accepted", (t) => {
  const sourceManifest = redistributableSources();
  const missing = { ...sourceManifest };
  delete missing["palettes/accessible-elements.json"];
  assert.throws(
    () => linuxResourceFiles(missing),
    /Missing redistributable resource: palettes\/accessible-elements\.json/,
  );
  const changed = { ...sourceManifest, LICENSE: "0".repeat(64) };
  const prefix = fixture(t);
  assert.throws(
    () => stageLinuxResources(root, prefix, changed),
    /Resource changed after snapshot: LICENSE/,
  );
  assert.deepEqual(fs.readdirSync(prefix), []);
});

test("Packaging help is available on every host without a build and unexpected options fail", () => {
  const options = {
    cwd: root,
    env: linuxPackageEnvironment(process.env, root),
    encoding: "utf8",
  };
  const help = spawnSync(
    process.execPath,
    ["tools/package-linux.mjs", "--help"],
    options,
  );
  assert.equal(help.status, 0, help.stderr);
  assert.match(
    help.stdout,
    /Linux x86_64 desktop\/converter\/AI-connector tar\.gz/,
  );
  assert.match(help.stdout, /not a universal AppImage/);
  const bad = spawnSync(
    process.execPath,
    ["tools/package-linux.mjs", "--unknown"],
    options,
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /Unexpected arguments/);
});
