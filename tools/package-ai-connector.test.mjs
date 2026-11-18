import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  stageAiConnector,
  verifyAiConnector,
} from "./package-ai-connector.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = path.join(root, "tmp");
fs.mkdirSync(tmp, { recursive: true });
const environment = { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp };
const client =
  process.env.EIGENVISTA_TEST_CONTROL_CLIENT ||
  path.join(root, "target/debug/eigenvista-ctl");
const desktop =
  process.env.EIGENVISTA_TEST_DESKTOP_BINARY ||
  path.join(root, "target/debug/eigenvista-desktop");
const launcherRelative =
  "Contents/Resources/AI-connector/Start AI connection.command";
const fixture = (t) => {
  const directory = fs.mkdtempSync(path.join(tmp, "ai-package-test-"));
  const bundle = path.join(
    directory,
    "Installed with spaces",
    "EigenVista.app",
  );
  fs.mkdirSync(path.join(bundle, "Contents/MacOS"), { recursive: true });
  fs.mkdirSync(path.join(bundle, "Contents/Resources"));
  // This is the real app executable; these unit tests only use --help or
  // validation failures, never execute its valid GUI startup path.
  fs.copyFileSync(
    desktop,
    path.join(bundle, "Contents/MacOS/eigenvista-desktop"),
  );
  fs.chmodSync(path.join(bundle, "Contents/MacOS/eigenvista-desktop"), 0o755);
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return {
    directory,
    bundle,
    workspace: path.join(directory, "My workspace"),
    launcher: path.join(bundle, launcherRelative),
  };
};
const stage = (bundle) =>
  stageAiConnector({ repositoryRoot: root, bundle, client, environment });
const launch = (launcher, args = []) =>
  spawnSync(launcher, args, {
    env: environment,
    encoding: "utf8",
    timeout: 5000,
  });

test("staging refuses existing helpers and connector folders before changing their bytes", (t) => {
  const { bundle } = fixture(t);
  const helper = path.join(bundle, "Contents/MacOS/eigenvista-ctl");
  fs.copyFileSync(client, helper);
  const bytes = fs.readFileSync(helper);
  assert.throws(() => stage(bundle), /Refusing to replace/);
  assert.equal(fs.readFileSync(helper).equals(bytes), true);
  assert.equal(
    fs.existsSync(path.join(bundle, "Contents/Resources/AI-connector")),
    false,
  );
  fs.unlinkSync(helper);
  const connector = path.join(bundle, "Contents/Resources/AI-connector");
  fs.mkdirSync(connector);
  fs.writeFileSync(
    path.join(connector, "keep.txt"),
    "existing connector files",
  );
  assert.throws(() => stage(bundle), /Refusing to replace/);
  assert.equal(
    fs.readFileSync(path.join(connector, "keep.txt"), "utf8"),
    "existing connector files",
  );
  assert.equal(fs.existsSync(helper), false);
});

test("prebuilt arm64 client, portable instructions and attributed data stage and survive real ZIP extraction", (t) => {
  const { directory, bundle } = fixture(t);
  const staged = stage(bundle);
  assert.equal(staged.architecture, "arm64");
  assert.match(staged.version, /^eigenvista-ctl /);
  assert.equal(Object.keys(staged.files).length, 14);
  const prefix = "Contents/Resources/AI-connector/";
  for (const name of [
    "SKILL.md",
    "reference.md",
    "README.md",
    "allocation-policy.md",
    "Start AI connection.command",
    "examples/bicyclic-c7h10.molden",
    "examples/complex-field.cube",
    "examples/README.md",
    "examples/LICENSE",
    "palettes/matterviz-muted.json",
    "palettes/matterviz-pastel.json",
    "palettes/README.md",
    "palettes/LICENSE-MatterViz.txt",
  ])
    assert.ok(staged.files[prefix + name], `Missing portable resource ${name}`);
  assert.equal(
    staged.files[prefix + "Start AI connection.command"].mode & 0o111,
    0o111,
  );
  assert.equal(
    fs
      .readFileSync(path.join(bundle, prefix, "examples/bicyclic-c7h10.molden"))
      .equals(
        fs.readFileSync(
          path.join(root, "tools/site/examples/bicyclic-c7h10.molden"),
        ),
      ),
    true,
  );
  const zip = path.join(directory, "connector.zip");
  const extract = path.join(directory, "Extracted without sources");
  const packed = spawnSync(
    "/usr/bin/ditto",
    ["-c", "-k", "--norsrc", "--noextattr", "--keepParent", bundle, zip],
    { env: environment, encoding: "utf8" },
  );
  assert.equal(packed.status, 0, packed.stderr);
  const unpacked = spawnSync(
    "/usr/bin/ditto",
    ["-x", "-k", "--noqtn", zip, extract],
    { env: environment, encoding: "utf8" },
  );
  assert.equal(unpacked.status, 0, unpacked.stderr);
  assert.deepEqual(
    verifyAiConnector({
      bundle: path.join(extract, "EigenVista.app"),
      environment,
    }),
    staged,
  );
  const extractedConnector = path.join(extract, "EigenVista.app", prefix);
  const extractedReadme = fs.readFileSync(
    path.join(extractedConnector, "README.md"),
    "utf8",
  );
  assert.match(
    extractedReadme,
    /\]\(allocation-policy\.md\)/,
    "Installed instructions must link to the included local allocation guide",
  );
  assert.deepEqual(
    fs.readFileSync(path.join(extractedConnector, "allocation-policy.md")),
    fs.readFileSync(path.join(root, "docs/allocation-policy.md")),
    "The local guide must remain complete and readable after ZIP extraction without sources",
  );
});

test("staging refuses existing helpers and connector directories without overwriting", (t) => {
  const { bundle } = fixture(t);
  const original = stage(bundle);
  assert.throws(() => stage(bundle), /Refusing to replace/);
  assert.deepEqual(verifyAiConnector({ bundle, environment }), original);
  const { bundle: occupied } = fixture(t);
  const control = path.join(occupied, "Contents/MacOS/eigenvista-ctl");
  fs.writeFileSync(control, "preserve existing helper");
  assert.throws(() => stage(occupied), /Refusing to replace/);
  assert.equal(fs.readFileSync(control, "utf8"), "preserve existing helper");
  assert.equal(
    fs.existsSync(path.join(occupied, "Contents/Resources/AI-connector")),
    false,
  );
});

test("installed launcher help needs no source checkout, compiler, Node or writable workspace", (t) => {
  const { launcher, workspace, bundle } = fixture(t);
  stage(bundle);
  const result = launch(launcher, ["--workspace", workspace, "--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--workspace DIR/);
  assert.match(result.stdout, /--input DIR/);
  assert.match(result.stdout, /\$HOME\/Documents\/EigenVista/);
  assert.equal(fs.existsSync(workspace), false);
});

test("launcher rejects malformed arguments, missing inputs and directory traversal before starting or creating sessions", (t) => {
  const { launcher, workspace, bundle } = fixture(t);
  stage(bundle);
  for (const args of [
    ["--unexpected"],
    ["--workspace"],
    ["--input"],
    ["--workspace", workspace, "--input", path.join(workspace, "missing")],
    ["--workspace", `${workspace}/../escape`],
  ]) {
    const result = launch(launcher, args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(
      result.stderr,
      /Unknown argument|needs a directory|does not exist|traversal/,
    );
  }
  assert.equal(fs.existsSync(workspace), false);
});

test("launcher refuses symlink inputs, workspace ancestors and dangling Inputs without touching existing files", (t) => {
  const { directory, launcher, workspace, bundle } = fixture(t);
  stage(bundle);
  const approved = path.join(directory, "Existing input");
  fs.mkdirSync(approved);
  const linked = path.join(directory, "Linked input");
  fs.symlinkSync(approved, linked);
  const throughInput = launch(launcher, [
    "--workspace",
    workspace,
    "--input",
    linked,
  ]);
  assert.equal(throughInput.status, 1);
  assert.match(throughInput.stderr, /Symlink directory/);
  const throughWorkspace = launch(launcher, [
    "--workspace",
    path.join(linked, "Child"),
  ]);
  assert.equal(throughWorkspace.status, 1);
  assert.match(throughWorkspace.stderr, /Symlink directory/);
  assert.equal(fs.existsSync(workspace), false);
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace, "keep.txt"), "existing user data");
  fs.symlinkSync(
    path.join(directory, "not-created"),
    path.join(workspace, "Inputs"),
  );
  const dangling = launch(launcher, ["--workspace", workspace]);
  assert.equal(dangling.status, 1);
  assert.match(dangling.stderr, /Symlink directory/);
  assert.equal(
    fs.readFileSync(path.join(workspace, "keep.txt"), "utf8"),
    "existing user data",
  );
  assert.equal(fs.existsSync(path.join(workspace, "Sessions")), false);
});
