// Stage a binary-only connector inside an existing macOS app, before outer signing.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const resourceFiles = [
  ["skills/eigenvista-control/SKILL.md", "SKILL.md"],
  ["skills/eigenvista-control/reference.md", "reference.md"],
  ["docs/ai-connector.md", "README.md"],
  [
    "tools/ai-connector/Start AI connection.command",
    "Start AI connection.command",
  ],
  [
    "tools/site/examples/bicyclic-c7h10.molden",
    "examples/bicyclic-c7h10.molden",
  ],
  ["tools/site/examples/complex-field.cube", "examples/complex-field.cube"],
  ["tools/site/examples/README.md", "examples/README.md"],
  ["LICENSE", "examples/LICENSE"],
  ...[
    "matterviz-muted.json",
    "matterviz-pastel.json",
    "README.md",
    "LICENSE-MatterViz.txt",
  ].map((name) => [`palettes/${name}`, `palettes/${name}`]),
];
const clientRelative = "Contents/MacOS/eigenvista-ctl";
const resourcesRelative = "Contents/Resources/AI-connector";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exists = (file) => {
  try {
    fs.lstatSync(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

const regularFile = (file) => {
  const status = fs.lstatSync(file);
  if (!status.isFile() || fs.realpathSync(file) !== path.resolve(file))
    throw Error(`Expected a regular file without symlink components: ${file}`);
};

const run = (command, args, environment = process.env) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: environment,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(
      `${path.basename(command)} failed (${result.status}): ${result.stderr}`,
    );
  return result.stdout.trim();
};

/** Check the actual Mach-O, signature and dependencies, including after extraction. */
export const verifyAiConnector = ({ bundle, environment = process.env }) => {
  const client = path.join(bundle, clientRelative);
  regularFile(client);
  const architecture = run("/usr/bin/lipo", ["-archs", client], environment);
  if (architecture !== "arm64")
    throw Error(`Unexpected control client architecture: ${architecture}`);
  const libraries = run("/usr/bin/otool", ["-L", client], environment)
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(" (")[0]);
  if (
    !libraries.length ||
    libraries.some(
      (library) =>
        !library.startsWith("/System/Library/") &&
        !library.startsWith("/usr/lib/"),
    )
  )
    throw Error("Non-system control client runtime library found");
  run(
    "/usr/bin/codesign",
    ["--verify", "--strict", "--verbose=2", client],
    environment,
  );
  const version = run(client, ["--version"], environment);
  if (!version.startsWith("eigenvista-ctl "))
    throw Error("Unexpected bundled control client identity");
  const help = run(client, ["--help"], environment);
  if (!help.includes("--connection"))
    throw Error("Bundled control client help is incomplete");
  const files = {};
  for (const relative of [
    clientRelative,
    ...resourceFiles.map(
      ([, destination]) => `${resourcesRelative}/${destination}`,
    ),
  ]) {
    const file = path.join(bundle, relative);
    regularFile(file);
    const bytes = fs.readFileSync(file);
    files[relative] = {
      sha256: sha256(bytes),
      bytes: bytes.length,
      mode: fs.statSync(file).mode & 0o777,
    };
  }
  const launcher = path.join(
    bundle,
    resourcesRelative,
    "Start AI connection.command",
  );
  if (!(fs.statSync(launcher).mode & 0o111))
    throw Error("Bundled AI launcher is not executable");
  run("/bin/bash", ["-n", launcher], environment);
  run(launcher, ["--help"], environment);
  return { version, architecture, libraries, files };
};

/** Explicit allowlist only; no checkout, source archive, private chat or credentials are bundled. */
export const stageAiConnector = ({
  repositoryRoot,
  bundle,
  client,
  environment = process.env,
}) => {
  const macos = path.join(bundle, "Contents/MacOS");
  const resources = path.join(bundle, "Contents/Resources");
  for (const directory of [macos, resources])
    if (
      !fs.lstatSync(directory).isDirectory() ||
      fs.realpathSync(directory) !== path.resolve(directory)
    )
      throw Error(
        `Expected an existing app directory without symlinks: ${directory}`,
      );
  const destination = path.join(bundle, clientRelative);
  const connector = path.join(bundle, resourcesRelative);
  for (const file of [destination, connector])
    if (exists(file))
      throw Error(
        `Refusing to replace an existing AI connector destination: ${file}`,
      );
  regularFile(client);
  for (const [source] of resourceFiles)
    regularFile(path.join(repositoryRoot, source));
  fs.copyFileSync(client, destination, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(destination, 0o755);
  fs.mkdirSync(connector);
  for (const [source, relative] of resourceFiles) {
    const file = path.join(connector, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(
      path.join(repositoryRoot, source),
      file,
      fs.constants.COPYFILE_EXCL,
    );
    fs.chmodSync(file, relative.endsWith(".command") ? 0o755 : 0o644);
  }
  run(
    "/usr/bin/codesign",
    [
      "--force",
      "--sign",
      "-",
      "--timestamp=none",
      "--identifier",
      "org.uvar-apps.eigenvista.control",
      destination,
    ],
    environment,
  );
  return verifyAiConnector({ bundle, environment });
};
