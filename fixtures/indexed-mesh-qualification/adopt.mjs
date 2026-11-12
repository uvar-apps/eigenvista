// Manual, lossless packaging of Rust-produced immutable qualification inputs.
// Never invoked by tests/builds. Output must be a NEW directory under repo tmp.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 2) throw new Error("usage: node adopt.mjs RAW_PREPARE_DIRECTORY NEW_REPO_TMP_DIRECTORY");
const input = fs.realpathSync(path.resolve(args[0]));
const requestedOutput = path.resolve(args[1]);
const output = path.join(fs.realpathSync(path.dirname(requestedOutput)), path.basename(requestedOutput));
const temp = fs.realpathSync(path.join(root, "tmp")) + path.sep;
if (!input.startsWith(temp) || !output.startsWith(temp))
  throw new Error("Input and new output must be under this repository's tmp directory");
const basename = (filename) => {
  if (typeof filename !== "string" || !/^[a-z0-9][a-z0-9.-]*$/.test(filename) ||
      path.basename(filename) !== filename)
    throw new Error("Corpus entries must be plain safe basenames");
  return filename;
};
const readUnder = (directory, name) => {
  const filename = fs.realpathSync(path.join(directory, basename(name)));
  if (!filename.startsWith(directory + path.sep)) throw new Error("Input symlink escapes its corpus directory");
  return fs.readFileSync(filename);
};
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const index = JSON.parse(readUnder(input, "manifest.json"));
const provenance = path.dirname(input);
const allowedSources = new Set([
  "crates/eigenvista-format/examples/indexed_mesh_qualification.rs",
  "crates/eigenvista-format/examples/indexed_mesh_qualification/allocation.rs",
  "crates/eigenvista-format/examples/indexed_mesh_qualification/packing.rs",
  "target/release/examples/indexed_mesh_qualification",
  "crates/eigenvista-core/src/compute.rs", "crates/eigenvista-core/src/model.rs",
  "crates/eigenvista-core/src/fixtures.rs", "crates/eigenvista-format/src/lib.rs",
  "crates/eigenvista-format/src/typed.rs", "fixtures/pyscf/water-rhf-ccpvdz.json",
  "Cargo.lock", "rust-toolchain.toml",
]);
const sources = readUnder(provenance, "source-hashes.txt").toString("utf8")
  .trim().split("\n").map((line) => {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw new Error("Malformed producer source hash record");
    const [, digest, filename] = match;
    // External registry paths are metadata only; never read external files here.
    if (!allowedSources.has(filename) &&
        !/^\/[^\n]+\/registry\/src\/[^/]+\/mcubes-0\.1\.7\/src\/lib\.rs$/.test(filename))
      throw new Error(`Unexpected producer source: ${filename}`);
    return { sha256: digest, path: filename };
  });
const sourceNames = new Set(sources.map((source) => source.path));
if (sourceNames.size !== sources.length || sources.length !== allowedSources.size + 1 ||
    [...allowedSources].some((name) => !sourceNames.has(name)))
  throw new Error("Missing or duplicate known producer sources");
for (const source of sources.filter((entry) => !path.isAbsolute(entry.path))) {
  const filename = fs.realpathSync(path.join(root, source.path));
  if (!filename.startsWith(fs.realpathSync(root) + path.sep) ||
      sha(fs.readFileSync(filename)) !== source.sha256)
    throw new Error(`Producer source/binary identity changed: ${source.path}`);
}
fs.mkdirSync(output); // Refuse to overwrite any previously adopted corpus.

function compressSemantic(record) {
  const bytes = readUnder(input, record.case_file);
  if (sha(bytes) !== record.case_sha256) throw new Error(`Original JSON hash differs: ${record.case_file}`);
  const compressed = gzipSync(bytes, { level: 9 });
  if (compressed.readUInt32LE(4) !== 0 || !gunzipSync(compressed).equals(bytes) ||
      !gzipSync(bytes, { level: 9 }).equals(compressed))
    throw new Error("Non-deterministic or non-lossless gzip derivation");
  record.case_uncompressed_sha256 = record.case_sha256;
  record.case_uncompressed_bytes = bytes.length;
  record.case_file += ".gz";
  record.case_sha256 = sha(compressed);
  record.case_bytes = compressed.length;
  fs.writeFileSync(path.join(output, basename(record.case_file)), compressed, { flag: "wx" });
}

function copyArchive(record) {
  const bytes = readUnder(input, record.file);
  if (bytes.length !== record.bytes || sha(bytes) !== record.sha256)
    throw new Error(`Native archive identity changed: ${record.file}`);
  fs.writeFileSync(path.join(output, basename(record.file)), bytes, { flag: "wx" });
}

for (const record of index.cases) {
  compressSemantic(record);
  Object.values(record.archives).forEach(copyArchive);
}
compressSemantic(index.arbitrary_indexed);
copyArchive(index.arbitrary_indexed);
index.producer = {
  rustc: readUnder(provenance, "rustc.txt").toString("utf8").trim(),
  cargo: readUnder(provenance, "cargo.txt").toString("utf8").trim(),
  platform: readUnder(provenance, "platform.txt").toString("utf8").trim(),
  sources: sources.filter((entry) => !entry.path.startsWith("target/")).map((entry) =>
    path.isAbsolute(entry.path) ? { path: "registry:mcubes-0.1.7/src/lib.rs", sha256: entry.sha256 } : entry),
  binary_sha256: sources.find((entry) => entry.path.startsWith("target/"))?.sha256,
  original_manifest_sha256: sha(readUnder(input, "manifest.json")),
};
index.semantic_compression = {
  method: "gzipSync(original JSON bytes, {level: 9}); mtime=0; strict gunzip byte equality",
  node: process.version,
  zlib: process.versions.zlib,
  adapter_sha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
};
fs.writeFileSync(path.join(output, "manifest.json"), JSON.stringify(index, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, bytes: fs.readdirSync(output).reduce((sum, name) =>
  sum + fs.statSync(path.join(output, name)).size, 0) }));
