import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const ABOUT_VERSION = "0.9.1";

export const packagedSurfaceShaders = [
  "surface-x-ray.vert",
  "surface-x-ray.frag",
  "surface-x-ray.params",
];

export function testerPackageName(config, revision, started, dirty) {
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(config.version))
    throw new Error("Unsafe package version");
  if (
    config.productName !== "EigenVista" ||
    config.identifier !== "org.uvar-apps.eigenvista"
  )
    throw new Error("Unexpected EigenVista application identity");
  return `${config.productName}-${config.version}-apple-silicon-${started.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}-${revision.slice(0, 7)}${dirty ? "-dirty" : ""}`;
}

export function existingSourceFiles(root, names) {
  // Git lists deleted tracked paths until the rename/removal is committed.
  return names.filter((name) =>
    fs.lstatSync(inside(root, name), { throwIfNoEntry: false }),
  );
}

function privateChat(name) {
  return /(^|[\\/])(?:[^\\/]*-)?chat-[^\\/]*\.md$/i.test(name);
}

// These private working documents are not application source or redistribution inputs.
function privateDocument(name) {
  const normalized = path.posix
    .normalize(name.replaceAll("\\", "/"))
    .toLowerCase();
  return (
    normalized === "docs/reviews/2026-11-11-code-review.md" ||
    path.posix.basename(normalized) === "zenodo-upload.md"
  );
}

export function packageSourceFiles(root, names) {
  const publicNames = names.filter((name) => {
    inside(root, name);
    return !privateChat(name) && !privateDocument(name);
  });
  return [...new Set(existingSourceFiles(root, publicNames))].sort();
}

export function testerEnvironment(parent, root) {
  const env = { ...parent };
  // A tester build must never use developer credentials or contact the notary.
  for (const key of Object.keys(env)) {
    if (key.startsWith("APPLE_") || key.startsWith("TAURI_SIGNING_"))
      delete env[key];
  }
  const tmp = path.join(root, "tmp");
  return {
    ...env,
    TMPDIR: tmp,
    TMP: tmp,
    TEMP: tmp,
    CARGO_TARGET_DIR: path.join(root, "target"),
    APPLE_SIGNING_IDENTITY: "-",
    MACOSX_DEPLOYMENT_TARGET: "13.0",
    COPYFILE_DISABLE: "1",
    CI: "true",
  };
}

export function inside(root, relative) {
  const resolved = path.resolve(root, relative);
  if (
    !relative ||
    path.isAbsolute(relative) ||
    !resolved.startsWith(`${path.resolve(root)}${path.sep}`)
  ) {
    throw new Error(`Unsafe package path: ${relative}`);
  }
  return resolved;
}

export function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function snapshotFiles(root, names, destination) {
  const manifest = {};
  for (const name of [...new Set(names)].sort()) {
    if (privateChat(name) || privateDocument(name))
      throw new Error(
        `Private chat exports and personal documents must not enter the source package: ${name}`,
      );
    const source = inside(root, name);
    if (fs.realpathSync(source) !== source || !fs.lstatSync(source).isFile()) {
      throw new Error(
        `Only regular, non-symlink source files may be packaged: ${name}`,
      );
    }
    if (/(^|\/)(\.env[^/]*|[^/]*\.(pem|p12|p8|key))$/i.test(name)) {
      throw new Error(
        `Possible credentials must not enter the source package: ${name}`,
      );
    }
    const bytes = fs.readFileSync(source);
    manifest[name] = digest(bytes);
    if (destination) {
      const target = inside(destination, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
  }
  return manifest;
}

export function noticeFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter(
      (name) =>
        /^(licen[cs]e|notice|copying|copyright|authors)([._-]|$)/i.test(name) &&
        fs.statSync(path.join(directory, name)).isFile(),
    )
    .sort();
}

export function npmNotices(app, output) {
  const lock = JSON.parse(
    fs.readFileSync(path.join(app, "package-lock.json"), "utf8"),
  );
  if (lock.lockfileVersion !== 3)
    throw new Error("Expected npm lockfile version 3");
  const packages = [];
  const sections = [
    "FRONTEND DEPENDENCIES\nVersions and license text from the locked, installed packages.\n",
  ];
  for (const [relative, entry] of Object.entries(lock.packages).sort()) {
    if (!relative || entry.dev) continue;
    const directory = inside(app, relative);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(directory, "package.json"), "utf8"),
    );
    if (pkg.version !== entry.version)
      throw new Error(`Installed version differs from lock: ${relative}`);
    const files = noticeFiles(directory);
    if (!pkg.license || !files.some((f) => /^(licen[cs]e|copying)/i.test(f))) {
      throw new Error(`Missing frontend license text: ${pkg.name}`);
    }
    sections.push(`\n${pkg.name} ${pkg.version}\nLicense: ${pkg.license}\n`);
    for (const file of files)
      sections.push(
        `--- ${file} ---\n${fs.readFileSync(path.join(directory, file), "utf8")}\n`,
      );
    packages.push({
      name: pkg.name,
      version: pkg.version,
      license: pkg.license,
      directory,
    });
  }
  if (!packages.length) throw new Error("No frontend dependencies found");
  fs.writeFileSync(output, sections.join("\n"));
  return packages;
}

export function rustNotices(report, output, supplements = []) {
  if (!report.licenses?.length || !report.crates?.length)
    throw new Error("Empty Rust license report");
  const sections = [
    "RUST DEPENDENCIES\nIncludes native/WASM and build-time dependencies; some are not shipped in the executable.\n",
  ];
  for (const license of report.licenses) {
    if (!license.text?.trim() || !license.used_by?.length)
      throw new Error("Incomplete Rust license text");
    sections.push(
      `\n${license.name} (${license.id})\nUsed by:\n${license.used_by.map((u) => `  ${u.crate.name} ${u.crate.version}`).join("\n")}\n\n${license.text}\n`,
    );
  }
  for (const { package: pkg, license } of report.crates) {
    if (!pkg.source) continue;
    if (["Unknown", "Ignore"].includes(license))
      throw new Error(`Unresolved license: ${pkg.name}`);
    const directory = path.dirname(pkg.manifest_path);
    const files = noticeFiles(directory);
    if (
      !files.some((f) => /^(licen[cs]e|copying)/i.test(f)) &&
      !supplements.some((s) =>
        s.packages.includes(`${pkg.name}@${pkg.version}`),
      )
    ) {
      throw new Error(
        `Upstream license notice needs review: ${pkg.name} ${pkg.version}`,
      );
    }
    for (const file of files) {
      // Preserve notices that are not themselves detected as license boilerplate.
      sections.push(
        `\n--- ${pkg.name} ${pkg.version}: ${file} ---\n${fs.readFileSync(path.join(directory, file), "utf8")}\n`,
      );
    }
  }
  for (const supplement of supplements) {
    sections.push(
      `\n--- Supplement for ${supplement.packages.join(", ")} ---\nSource: ${supplement.url}\n${supplement.text}\n`,
    );
  }
  fs.writeFileSync(output, sections.join("\n"));
}

export function licenseSupplements(directory) {
  const entries = JSON.parse(
    fs.readFileSync(path.join(directory, "manifest.json"), "utf8"),
  );
  return entries.map((entry) => {
    const bytes = fs.readFileSync(inside(directory, entry.file));
    if (digest(bytes) !== entry.sha256)
      throw new Error(`License supplement checksum mismatch: ${entry.file}`);
    return { ...entry, text: bytes.toString("utf8") };
  });
}

/** Verify the reviewed vendored dependency against the exact packaged snapshot. */
export function vendoredRustSources(report, root, sourceManifest) {
  const directory = "vendor/sesmesh";
  const revision = "1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8";
  const crates = report.crates.filter(
    ({ package: pkg }) => pkg.name === "sesmesh",
  );
  if (crates.length !== 1)
    throw new Error("Expected exactly one reviewed Sesmesh dependency");
  for (const { package: pkg } of report.crates) {
    if (pkg.source) continue;
    const relative = path
      .relative(root, pkg.manifest_path)
      .replaceAll(path.sep, "/");
    if (
      relative.startsWith("../") ||
      path.isAbsolute(relative) ||
      !sourceManifest[relative]
    )
      throw new Error(
        `Local Rust dependency is missing from the source snapshot: ${pkg.name}`,
      );
    if (
      !pkg.name.startsWith("eigenvista-") &&
      relative !== `${directory}/Cargo.toml`
    )
      throw new Error(`Unreviewed local Rust dependency: ${pkg.name}`);
  }
  const { package: pkg } = crates[0];
  if (
    pkg.source ||
    pkg.version !== "1.1.2" ||
    path.resolve(pkg.manifest_path) !== path.join(root, directory, "Cargo.toml")
  )
    throw new Error(
      "Sesmesh dependency does not match its reviewed vendored source",
    );
  const read = (relative) => {
    const name = `${directory}/${relative}`;
    if (!sourceManifest[name])
      throw new Error(`Missing vendored source file: ${name}`);
    const file = inside(root, name);
    if (fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile())
      throw new Error(
        `Only regular vendored source files may be packaged: ${name}`,
      );
    const bytes = fs.readFileSync(file);
    if (digest(bytes) !== sourceManifest[name])
      throw new Error(`Vendored source changed after snapshot: ${name}`);
    return bytes;
  };
  const originalBytes = read("UPSTREAM-SHA256.json");
  const patchBytes = read("UPSTREAM-PATCHES.json");
  if (
    digest(originalBytes) !==
      "33101809581739e239eaaa8802a28c40683b9d386c8f32e6a7c2d683b807f03c" ||
    digest(patchBytes) !==
      "65343244864bba51a983987391ef558cb02e587effa2b9300864f6fb8d758b67"
  )
    throw new Error("Sesmesh provenance changed without packaging review");
  const original = JSON.parse(originalBytes);
  const patches = JSON.parse(patchBytes);
  if (
    patches.upstream_revision !== revision ||
    patches.selected_license !== "MIT" ||
    Object.keys(original).length !== 50
  )
    throw new Error("Invalid pinned Sesmesh provenance");
  const expected = [
    ...Object.keys(original),
    "Cargo.toml",
    "README.md",
    "ORIGIN.md",
    "LICENSE-MIT",
    "LICENSE-APACHE",
    "UPSTREAM-SHA256.json",
    "UPSTREAM-PATCHES.json",
  ].sort();
  const names = Object.keys(sourceManifest)
    .filter((name) => name.startsWith(directory + "/"))
    .map((name) => name.slice(directory.length + 1))
    .sort();
  if (JSON.stringify(names) !== JSON.stringify(expected))
    throw new Error(
      "Vendored Sesmesh source snapshot is incomplete or contains unreviewed files",
    );
  for (const [name, hash] of Object.entries(original)) {
    if (digest(read(name)) !== (patches.modified_files[name] ?? hash))
      throw new Error(`Unreviewed vendored source change: ${name}`);
  }
  const license = read("LICENSE-MIT");
  if (
    digest(license) !==
    "56b5fe0eca17bdf6ee891a1947e98fe43d22cfdf86742ff32bb650c2327e366a"
  )
    throw new Error("Pinned Sesmesh MIT notice differs");
  const selected = report.licenses.filter((entry) =>
    entry.used_by?.some(
      (use) => use.crate.name === pkg.name && use.crate.version === pkg.version,
    ),
  );
  if (
    selected.length !== 1 ||
    selected[0].id !== "MIT" ||
    selected[0].text.trim() !== license.toString("utf8").trim()
  )
    throw new Error(
      "Sesmesh license report must retain its complete selected MIT notice",
    );
  const manifest = Object.fromEntries(
    names.map((name) => [name, sourceManifest[`${directory}/${name}`]]),
  );
  return [
    {
      name: pkg.name,
      version: pkg.version,
      directory,
      license: "MIT",
      revision,
      upstream: `https://github.com/uvar-apps/sesmesh/tree/${revision}`,
      patchedFiles: Object.keys(patches.modified_files),
      fileCount: names.length,
      sourceManifestSha256: digest(JSON.stringify(manifest)),
      manifest,
    },
  ];
}

/** Stage verified local dependency source and the chosen notice for the actual ZIP. */
export function stageVendoredRustSources({
  report,
  repository,
  snapshot,
  sourceManifest,
  dependencySources,
  notices,
}) {
  const vendored = vendoredRustSources(report, repository, sourceManifest);
  return vendored.map((vendor) => {
    const source = inside(snapshot, vendor.directory);
    assertEqualManifest(
      vendor.manifest,
      snapshotFiles(source, Object.keys(vendor.manifest)),
    );
    const destination = path.join(
      dependencySources,
      "rust-vendored",
      `${vendor.name}-${vendor.version}`,
    );
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    fs.writeFileSync(
      path.join(destination, "SOURCE-MANIFEST.json"),
      JSON.stringify(vendor.manifest, null, 2) + "\n",
    );
    const noticeDirectory = path.join(notices, "Sesmesh");
    fs.mkdirSync(noticeDirectory, { recursive: true });
    for (const file of [
      "LICENSE-MIT",
      "ORIGIN.md",
      "UPSTREAM-SHA256.json",
      "UPSTREAM-PATCHES.json",
    ])
      fs.copyFileSync(
        path.join(source, file),
        path.join(noticeDirectory, file),
        fs.constants.COPYFILE_EXCL,
      );
    return {
      ecosystem: "rust",
      source: "vendored",
      name: vendor.name,
      version: vendor.version,
      license: vendor.license,
      revision: vendor.revision,
      upstream: vendor.upstream,
      patchedFiles: vendor.patchedFiles,
      fileCount: vendor.fileCount,
      sourceManifestSha256: vendor.sourceManifestSha256,
      sourceArchive: `Source/dependency-sources.tar.gz:rust-vendored/${vendor.name}-${vendor.version}`,
    };
  });
}

export function treeManifest(root, relative = "") {
  const result = {};
  for (const entry of fs
    .readdirSync(path.join(root, relative), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(result, treeManifest(root, name));
    else if (entry.isFile()) {
      const file = path.join(root, name);
      result[name] = {
        sha256: digest(fs.readFileSync(file)),
        mode: fs.statSync(file).mode & 0o777,
      };
    } else throw new Error(`Unexpected non-regular archive entry: ${name}`);
  }
  return result;
}

export function assertEqualManifest(before, after) {
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Package/source file manifest changed unexpectedly");
}
