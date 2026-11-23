// Build a host-qualified Linux prefix; this is not an AppImage portability claim.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  ABOUT_VERSION,
  packagedSurfaceShaders,
  testerPackageName,
  packageSourceFiles,
  snapshotFiles,
  digest,
  treeManifest,
  assertEqualManifest,
  npmNotices,
  rustNotices,
  licenseSupplements,
  stageVendoredRustSources,
} from "./package-support.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = "x86_64-unknown-linux-gnu";
const dataPath = "share/eigenvista";
const palettes = [
  "matterviz-muted.json",
  "matterviz-pastel.json",
  "accessible-elements.json",
  "README.md",
  "LICENSE-MatterViz.txt",
];

/** Keep the existing release identity validation and explicit dirty-source marker. */
export const linuxPackageName = (config, revision, started, dirty) => {
  if (
    !/^[0-9a-f]{40}$/.test(revision) ||
    new Date(started).toISOString() !== started
  )
    throw Error("Invalid package source revision or timestamp");
  return testerPackageName(config, revision, started, dirty).replace(
    `${config.productName}-${config.version}-apple-silicon-`,
    `${config.productName}-${config.version}-linux-x86_64-`,
  );
};

/** Project tools and every build subprocess use repository-local temporary files. */
export const linuxPackageEnvironment = (parent, repository) => {
  const env = { ...parent };
  for (const key of Object.keys(env))
    if (
      key.startsWith("APPLE_") ||
      key.startsWith("TAURI_SIGNING_") ||
      key === "MACOSX_DEPLOYMENT_TARGET"
    )
      delete env[key];
  return {
    ...env,
    TMPDIR: path.join(repository, "tmp"),
    TMP: path.join(repository, "tmp"),
    TEMP: path.join(repository, "tmp"),
    CARGO_TARGET_DIR: path.join(repository, "target"),
    CI: "true",
  };
};

/** Collect the actual Linux/WASM license graph without changing Mac policy. */
export const linuxLicenseConfiguration = (template) => {
  const toml = createRequire(path.join(root, "app/package.json"))(
    "@iarna/toml",
  );
  const config = toml.parse(template);
  if (!config.targets.includes("aarch64-apple-darwin"))
    throw Error("Review changed license target configuration");
  config.targets = config.targets.map((value) =>
    value === "aarch64-apple-darwin" ? target : value,
  );
  // target-lexicon 0.12.16 declares this SPDX expression on the Linux graph.
  config.accepted = [
    ...new Set([...config.accepted, "Apache-2.0 WITH LLVM-exception"]),
  ];
  return toml.stringify(config);
};

/** Check ELF class, byte order, executable kind and x86_64 machine before execution. */
export const verifyLinuxExecutable = (file) => {
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    fs.realpathSync(file) !== path.resolve(file) ||
    !(stat.mode & 0o111)
  )
    throw Error(
      `Expected a regular executable without symlink components: ${file}`,
    );
  const bytes = fs.readFileSync(file);
  if (
    bytes.length < 64 ||
    !bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) ||
    bytes[4] !== 2 ||
    bytes[5] !== 1 ||
    ![2, 3].includes(bytes.readUInt16LE(16)) ||
    bytes.readUInt16LE(18) !== 62
  )
    throw Error(`Expected an ELF64 little-endian x86_64 executable: ${file}`);
  return {
    bytes: bytes.length,
    sha256: digest(bytes),
    mode: stat.mode & 0o777,
  };
};

/** Select redistributable resources from the already validated source snapshot. */
export const linuxResourceFiles = (sourceManifest) => {
  const files = [
    ["LICENSE", "LICENSE"],
    ["CITATION.cff", "CITATION.cff"],
    ["docs/user-guide.md", `${dataPath}/User-guide.md`],
    ["docs/ai-connector.md", `${dataPath}/ai-connector.md`],
    ["docs/allocation-policy.md", `${dataPath}/allocation-policy.md`],
    ["docs/structure-imports.md", `${dataPath}/Structure-imports.md`],
    ["docs/molden-import.md", `${dataPath}/Molden-import.md`],
    ["docs/cube-import.md", `${dataPath}/Cube-import.md`],
    [
      "fixtures/molden/water-rhf-ccpvdz.molden",
      `${dataPath}/Examples/water.molden`,
    ],
    [
      "fixtures/cube/signed-affine.cube",
      `${dataPath}/Examples/signed-affine.cube`,
    ],
    ["skills/eigenvista-control/SKILL.md", `${dataPath}/AI-connector/SKILL.md`],
    [
      "skills/eigenvista-control/reference.md",
      `${dataPath}/AI-connector/reference.md`,
    ],
    ["docs/ai-connector.md", `${dataPath}/AI-connector/README.md`],
    [
      "docs/allocation-policy.md",
      `${dataPath}/AI-connector/allocation-policy.md`,
    ],
    [
      "tools/ai-connector/Start AI connection.command",
      `${dataPath}/AI-connector/Start AI connection.sh`,
    ],
    [
      "tools/site/examples/bicyclic-c7h10.molden",
      `${dataPath}/AI-connector/examples/bicyclic-c7h10.molden`,
    ],
    [
      "tools/site/examples/complex-field.cube",
      `${dataPath}/AI-connector/examples/complex-field.cube`,
    ],
    [
      "tools/site/examples/README.md",
      `${dataPath}/AI-connector/examples/README.md`,
    ],
    ["LICENSE", `${dataPath}/AI-connector/examples/LICENSE`],
    ...packagedSurfaceShaders.map((file) => [
      `app/shaders/${file}`,
      `${dataPath}/Shaders/${file}`,
    ]),
    ...palettes.flatMap((name) => [
      [`palettes/${name}`, `${dataPath}/Palettes/${name}`],
      [`palettes/${name}`, `${dataPath}/AI-connector/palettes/${name}`],
    ]),
  ];
  for (const source of Object.keys(sourceManifest)) {
    if (source.startsWith("packaging/examples/"))
      files.push([
        source,
        `${dataPath}/Examples/${source.slice("packaging/examples/".length)}`,
      ]);
    if (source.startsWith("shaders/") || source.startsWith("docs/images/"))
      files.push([
        source,
        `${dataPath}/${source.startsWith("shaders/") ? "Shaders/" + source.slice(8) : "images/" + source.slice(12)}`,
      ]);
  }
  if (sourceManifest["docs/linux.md"])
    files.push(
      ["docs/linux.md", `${dataPath}/Linux-guide.md`],
      ["docs/linux.md", `${dataPath}/AI-connector/linux.md`],
    );
  for (const [source] of files)
    if (!sourceManifest[source])
      throw Error(`Missing redistributable resource: ${source}`);
  return files;
};

/** Copy only snapshotted files; fail if a source changes or a destination exists. */
export const stageLinuxResources = (repository, prefix, sourceManifest) => {
  const result = {};
  for (const [source, relative] of linuxResourceFiles(sourceManifest)) {
    const bytes = fs.readFileSync(path.join(repository, source));
    if (digest(bytes) !== sourceManifest[source])
      throw Error(`Resource changed after snapshot: ${source}`);
    const destination = path.join(prefix, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const mode = relative.endsWith(".sh") ? 0o755 : 0o644;
    fs.writeFileSync(destination, bytes, { flag: "wx", mode });
    fs.chmodSync(destination, mode);
    result[relative] = {
      sha256: digest(bytes),
      bytes: bytes.length,
      mode: fs.statSync(destination).mode & 0o777,
    };
  }
  return result;
};

/** Drop Mac transfer metadata by name before any filesystem or source access. */
export const linuxSourceFiles = (repository, names) =>
  packageSourceFiles(
    repository,
    names.filter(
      (name) =>
        !name
          .replaceAll("\\", "/")
          .split("/")
          .some(
            (component) =>
              component.startsWith("._") ||
              component === ".DS_Store" ||
              component === "__MACOSX",
          ),
    ),
  );
const sourceNames = (run) =>
  linuxSourceFiles(root, [
    ...run(
      "git",
      [
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
        "--",
        ".",
      ],
      root,
      true,
    )
      .split("\0")
      .filter(Boolean),
    ".gitignore",
    "fixtures/legacy/LICENSE",
    "fixtures/legacy/data/molden.input",
    "fixtures/legacy/data/h2o-dens.cube",
    "fixtures/legacy/all_data/Benzene.MO19-BOTH-SIGNS.cube",
    "fixtures/legacy/all_data/molden_test/test_homo.cube",
    ...["guanine", "3POR", "URIDINE-VANADATE", "alaninemulti"].map(
      (name) => `fixtures/legacy/data/${name}.pdb`,
    ),
  ]);

const json = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const copy = (source, destination) => {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
};

/** Include exact locked dependency sources and their complete existing notices. */
const dependencyArchive = ({
  run,
  staging,
  payload,
  snapshot,
  sourceManifest,
  app,
}) => {
  const toolRoot = path.join(root, "artifacts/packaging-tools");
  const about = path.join(toolRoot, "bin/cargo-about");
  if (
    !fs.existsSync(about) ||
    run(about, ["--version"], root, true) !== `cargo-about ${ABOUT_VERSION}`
  )
    run(
      "cargo",
      [
        "install",
        "cargo-about",
        "--version",
        ABOUT_VERSION,
        "--features",
        "cli",
        "--locked",
        "--root",
        toolRoot,
      ],
      root,
      false,
      { CARGO_TARGET_DIR: path.join(staging, "cargo-about-target") },
    );
  const config = path.join(staging, "about-linux.toml");
  const template = fs.readFileSync(
    path.join(root, "packaging/about.toml"),
    "utf8",
  );
  fs.writeFileSync(config, linuxLicenseConfiguration(template));
  const reportFile = path.join(staging, "rust-licenses.json");
  run(about, [
    "generate",
    "--locked",
    "--workspace",
    "--fail",
    "--format",
    "json",
    "--config",
    config,
    "--output-file",
    reportFile,
  ]);
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  const notices = path.join(payload, dataPath, "Third-party-notices");
  fs.mkdirSync(notices, { recursive: true });
  for (const name of ["README.md", "IODATA-LICENSE.txt"])
    copy(
      path.join(root, "fixtures/molden/third-party", name),
      path.join(notices, "Molden-test-data", name),
    );
  copy(
    path.join(root, "shaders/README.md"),
    path.join(notices, "Classic-shaders/README.md"),
  );
  rustNotices(report, path.join(notices, "Rust.txt"), [
    ...licenseSupplements(path.join(root, "packaging/licenses")),
    ...licenseSupplements(path.join(root, "packaging/licenses/linux")),
  ]);
  const npmPackages = npmNotices(app, path.join(notices, "Frontend.txt"));
  const dependencySources = path.join(staging, "dependency-sources");
  const inventory = stageVendoredRustSources({
    report,
    repository: root,
    snapshot,
    sourceManifest,
    dependencySources,
    notices,
  });
  const toml = createRequire(path.join(app, "package.json"))("@iarna/toml");
  const lock = toml.parse(
    fs.readFileSync(path.join(root, "Cargo.lock"), "utf8"),
  );
  for (const { package: pkg } of report.crates) {
    if (!pkg.source) continue;
    if (!pkg.source.startsWith("registry+"))
      throw Error(`Review non-registry dependency source: ${pkg.name}`);
    const directory = path.dirname(pkg.manifest_path);
    const archive = path.resolve(
      directory,
      "../../../cache",
      path.basename(path.dirname(directory)),
      `${pkg.name}-${pkg.version}.crate`,
    );
    const checksum = lock.package.find(
      (entry) =>
        entry.name === pkg.name &&
        entry.version === pkg.version &&
        entry.source === pkg.source,
    )?.checksum;
    if (!checksum || digest(fs.readFileSync(archive)) !== checksum)
      throw Error(`Dependency source checksum mismatch: ${pkg.name}`);
    copy(archive, path.join(dependencySources, "rust", path.basename(archive)));
    inventory.push({
      ecosystem: "rust",
      name: pkg.name,
      version: pkg.version,
      license: pkg.license,
      sha256: checksum,
    });
  }
  for (const pkg of npmPackages) {
    copy(pkg.directory, path.join(dependencySources, "frontend", pkg.name));
    inventory.push({
      ecosystem: "npm",
      name: pkg.name,
      version: pkg.version,
      license: pkg.license,
    });
  }
  json(path.join(notices, "Inventory.json"), inventory);
  const destination = path.join(payload, dataPath, "Source");
  fs.mkdirSync(destination);
  for (const [name, source] of [
    ["eigenvista-source", snapshot],
    ["dependency-sources", dependencySources],
  ])
    run("tar", [
      "-czf",
      path.join(destination, name + ".tar.gz"),
      "-C",
      source,
      ".",
    ]);
};

export const packageLinux = () => {
  if (process.platform !== "linux" || process.arch !== "x64")
    throw Error(
      "Linux packaging requires native x86_64 Linux and x64 Node.js; use --help",
    );
  const app = path.join(root, "app");
  const env = linuxPackageEnvironment(process.env, root);
  fs.mkdirSync(env.TMPDIR, { recursive: true });
  const staging = fs.mkdtempSync(
    path.join(env.TMPDIR, "eigenvista-linux-package-"),
  );
  console.log(`Linux staging retained at ${staging}`);
  let capturedCommands = 0;
  const run = (command, args, cwd = root, capture = false, overrides = {}) => {
    const output = path.join(staging, `command-${capturedCommands++}`);
    const descriptors = [];
    let result;
    try {
      if (capture)
        for (const extension of [".stdout", ".stderr"])
          descriptors.push(fs.openSync(output + extension, "wx", 0o600));
      result = spawnSync(command, args, {
        cwd,
        env: { ...env, ...overrides },
        stdio: capture ? ["ignore", ...descriptors] : "inherit",
      });
    } finally {
      for (const descriptor of descriptors) fs.closeSync(descriptor);
    }
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw Error(
        `${path.basename(command)} failed (${result.status}): ${capture ? "inspect " + output + ".stderr" : "see output above"}`,
      );
    return capture ? fs.readFileSync(output + ".stdout", "utf8").trimEnd() : "";
  };
  const config = JSON.parse(
    fs.readFileSync(path.join(app, "src-tauri/tauri.conf.json"), "utf8"),
  );
  if (
    fs.realpathSync(
      run("git", ["rev-parse", "--show-toplevel"], root, true),
    ) !== root
  )
    throw Error("Build from the standalone EigenVista repository");
  const revision = run("git", ["rev-parse", "HEAD"], root, true);
  const dirty = !!run(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    root,
    true,
  );
  const started = new Date().toISOString();
  const id = linuxPackageName(config, revision, started, dirty);
  const payload = path.join(staging, id);
  const snapshot = path.join(staging, "source-snapshot");
  fs.mkdirSync(payload);
  const sourceManifest = snapshotFiles(root, sourceNames(run), snapshot);
  json(path.join(snapshot, "SOURCE-MANIFEST.json"), sourceManifest);
  const rust = run("rustc", ["--version"], root, true);
  if (!rust.startsWith("rustc 1.99.0 "))
    throw Error("Use the repository-pinned Rust 1.99.0 toolchain");
  const wasmBindgen = run("wasm-bindgen", ["--version"], root, true);
  if (wasmBindgen !== "wasm-bindgen 0.2.108")
    throw Error("Install pinned wasm-bindgen-cli 0.2.108");
  run("rustup", ["target", "add", "wasm32-unknown-unknown", target]);
  run("npm", ["ci", "--no-audit", "--no-fund"], app);
  run(process.execPath, [
    "--test",
    "tools/package-support.test.mjs",
    "tools/package-linux.test.mjs",
  ]);
  // Resolve complete notices before spending time on compilation and science tests.
  dependencyArchive({ run, staging, payload, snapshot, sourceManifest, app });
  run("cargo", ["test", "--locked"]);
  run("cargo", [
    "build",
    "--locked",
    "--release",
    "--target",
    target,
    "-p",
    "eigenvista-convert",
    "-p",
    "eigenvista-control",
  ]);
  run(
    path.join(app, "node_modules/.bin/tauri"),
    ["build", "--ci", "--target", target, "--no-bundle", "--", "--locked"],
    app,
  );
  const resources = stageLinuxResources(root, payload, sourceManifest);
  const binaries = {};
  for (const [built, name] of [
    ["eigenvista-desktop", "eigenvista"],
    ["eigenvista-ctl", "eigenvista-ctl"],
    ["eigenvista-convert", "eigenvista-convert"],
  ]) {
    const destination = path.join(payload, "bin", name);
    copy(path.join(root, "target", target, "release", built), destination);
    fs.chmodSync(destination, 0o755);
    const elf = verifyLinuxExecutable(destination);
    const libraries = run("ldd", [destination], root, true);
    if (libraries.includes("not found") || libraries.includes(root))
      throw Error(`Unresolved or development-tree runtime dependency: ${name}`);
    binaries[name] = { ...elf, libraries };
  }
  const helper = path.join(payload, "bin/eigenvista-ctl");
  if (
    run(helper, ["--version"], root, true) !==
    `eigenvista-ctl ${config.version}`
  )
    throw Error("Control helper version mismatch");
  if (!run(helper, ["--help"], root, true).includes("--connection"))
    throw Error("Control helper interface mismatch");
  const launcher = path.join(
    payload,
    dataPath,
    "AI-connector/Start AI connection.sh",
  );
  run("/bin/bash", ["-n", launcher]);
  run(launcher, ["--help"], root, true);
  fs.writeFileSync(
    path.join(payload, "README-linux.txt"),
    `EigenVista ${config.version} — Linux x86_64 test build\n\nExtract the entire directory. Run ./bin/eigenvista from a graphical Linux session.\nKeep bin/ and share/ together. No source checkout, Node or Rust is required to run it.\nRuntime libraries are system-provided: WebKitGTK4.1, GTK3, libsoup3, OpenSSL3 and their dependencies.\nOn CachyOS/Arch: sudo pacman -S --needed webkit2gtk-4.1 gtk3 openssl\n\nAI launcher: ./share/eigenvista/AI-connector/Start\\ AI\\ connection.sh\nConverter: ./bin/eigenvista-convert --help\nExamples, palettes, shaders, offline guides and notices: share/eigenvista/\nUse the installed AI guide to connect Codex, Claude Code or another local agent.\n\nThis archive is built on the system recorded in BUILD-INFO.json. It is not an AppImage\nand does not promise compatibility with older glibc, every distribution or every GPU.\nPreserve original molecular inputs. Qualification and physical-desktop gaps are\nrecorded separately in the project's Linux guide and issue108. Nothing was uploaded.\n`,
  );
  const buildInfo = {
    name: config.productName,
    identifier: config.identifier,
    version: config.version,
    package: id,
    gitRevision: revision,
    sourceDirty: dirty,
    builtAt: started,
    sourceManifestSha256: digest(JSON.stringify(sourceManifest)),
    target,
    architecture: "x86_64",
    buildOS: fs.readFileSync("/etc/os-release", "utf8"),
    kernel: os.release(),
    glibc: run("getconf", ["GNU_LIBC_VERSION"], root, true),
    webkitGTK: run(
      "pkg-config",
      ["--modversion", "webkit2gtk-4.1"],
      root,
      true,
    ),
    toolchain: {
      rust,
      node: process.version,
      wasmBindgen,
      cargoAbout: ABOUT_VERSION,
    },
    binaries,
    aiConnector: { files: resources },
    embeddedAssets: treeManifest(path.join(app, "dist")),
    checks: [
      "packaging unit tests",
      "Rust tests",
      "production WASM/TypeScript/Tauri build",
      "ELF64x86_64 and resolved runtime dependencies",
      "helper version/interface and launcher syntax",
      "original/extracted example conversion and WASM parity",
      "tar extraction complete byte/mode parity",
      "source snapshot stable through build",
    ],
    limitations:
      "Host-qualified Linux preview using system GTK/WebKit libraries. Full browser/native/physical-desktop and other-distribution qualification is recorded separately; packaging does not imply those checks passed.",
  };
  json(path.join(payload, "BUILD-INFO.json"), buildInfo);
  const checkExamples = (prefix, output) =>
    run(process.execPath, [
      "tools/verify-package-examples.mjs",
      path.join(app, "src/wasm"),
      path.join(prefix, dataPath, "Examples"),
      path.join(prefix, "bin/eigenvista-convert"),
      path.join(staging, output),
    ]);
  checkExamples(payload, "converted.eigenvista");
  assertEqualManifest(sourceManifest, snapshotFiles(root, sourceNames(run)));
  const archive = path.join(staging, id + ".tar.gz");
  run("tar", ["-czf", archive, "-C", staging, id]);
  const extracted = path.join(staging, "verification");
  fs.mkdirSync(extracted);
  run("tar", ["-xzf", archive, "-C", extracted, "--no-same-owner"]);
  const restored = path.join(extracted, id);
  assertEqualManifest(treeManifest(payload), treeManifest(restored));
  for (const name of Object.keys(binaries))
    verifyLinuxExecutable(path.join(restored, "bin", name));
  run(path.join(restored, "bin/eigenvista-ctl"), ["--version"], root, true);
  run(
    path.join(restored, dataPath, "AI-connector/Start AI connection.sh"),
    ["--help"],
    root,
    true,
  );
  checkExamples(restored, "extracted-converted.eigenvista");
  assertEqualManifest(sourceManifest, snapshotFiles(root, sourceNames(run)));
  const out = path.join(root, "artifacts/distributions");
  fs.mkdirSync(out, { recursive: true });
  if (fs.realpathSync(out) !== out)
    throw Error("Distribution directory must not have symlink components");
  const checksum = path.join(staging, id + ".tar.gz.sha256");
  fs.writeFileSync(
    checksum,
    `${digest(fs.readFileSync(archive))}  ${path.basename(archive)}\n`,
    { flag: "wx" },
  );
  const metadata = path.join(staging, id + ".json");
  json(metadata, buildInfo);
  // Hard-link complete files for atomic no-replace publication; do not expose partial output.
  for (const file of [archive, checksum, metadata])
    fs.linkSync(file, path.join(out, path.basename(file)));
  console.log(
    `LINUX_PACKAGE_PASS ${path.join(out, path.basename(archive))}\nChecksum: ${path.join(out, path.basename(checksum))}\nStaging retained: ${staging}`,
  );
  return {
    archive: path.join(out, path.basename(archive)),
    staging,
    buildInfo,
  };
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length === 3 && process.argv[2] === "--help")
    console.log(
      "Usage: node tools/package-linux.mjs\nBuild and verify a Linux x86_64 desktop/converter/AI-connector tar.gz using system GTK/WebKitGTK4.1.\nRequires native Linux x64 Node, pinned Rust1.99.0 and wasm-bindgen0.2.108, standard Linux build dependencies and tar.\nInstalls locked npm dependencies and pinned repository-local cargo-about on first use.\nOutputs tar.gz, checksum and build metadata in artifacts/distributions/. No upload, installer or prompts; diagnostics stay in repository tmp/.\nThis is a host-qualified preview, not a universal AppImage. Full browser/native acceptance is a separate validation step.",
    );
  else {
    try {
      if (process.argv.length !== 2)
        throw Error("Unexpected arguments; use --help");
      packageLinux();
    } catch (error) {
      console.error(`Linux packaging failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
