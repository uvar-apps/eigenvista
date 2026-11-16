// External native-API demonstration. No UI automation, model client or app script engine.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (!argv[index + 1] || argv[index + 1].startsWith("--"))
    throw Error(`Missing ${name} value`);
  return path.resolve(argv[index + 1]);
};
const connection = option("--connection");
const output = option("--output");
if (!connection || !output)
  throw Error(
    "Usage: node tools/control-harness/demo.mjs --connection FILE --output DIR [--client FILE] [--input FILE]",
  );
const client = option(
  "--client",
  path.join(root, "target/debug/eigenvista-ctl"),
);
const input = option(
  "--input",
  path.join(root, "tools/site/examples/bicyclic-c7h10.molden"),
);
fs.mkdirSync(output, { recursive: true });
for (const key of ["TMPDIR", "TMP", "TEMP"])
  process.env[key] = path.join(root, "tmp");
const records = [];
const rpc = (method, params = {}, wait = false) => {
  const args = [
    "--connection",
    connection,
    method,
    "--params",
    JSON.stringify(params),
  ];
  if (wait) args.push("--wait", "120");
  const stdout = execFileSync(client, args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const envelope = JSON.parse(stdout);
  if (envelope.error) throw Error(JSON.stringify(envelope.error));
  const result = envelope.result ?? envelope;
  if (result.status === "failed" || result.status === "cancelled")
    throw Error(JSON.stringify(result));
  records.push({ method, result });
  return result;
};
const mutate = (method, params = {}, wait = false) => {
  const state = rpc("app.state");
  return rpc(method, { ...params, expectedRevision: state.revision }, wait);
};
const capture = (name, transparent = false) => {
  assert.equal(rpc("app.state").backgroundColor, "#17232d");
  return rpc("image.export", { path: path.join(output, name), transparent });
};
const capabilities = rpc("app.capabilities");
mutate("document.open", { path: input }, true);
const fields = [];
for (let offset = 0; offset < 4096; offset += 100) {
  const page = rpc("fields.list", { offset, limit: 100 });
  fields.push(...page.items);
  if (offset + page.items.length >= page.total || !page.items.length) break;
}
const density = fields.find(
  (field) => field.kind === "density" && field.quantity === "total",
);
assert(density, "The demonstration input must supply a total-density field");
mutate("scene.set", {
  isovalue: 0.04,
  positiveColor: "#93e8d9",
  negativeColor: "#cb4e72",
  opacity: 1,
  backgroundColor: "#17232d",
});
mutate(
  "field.preview",
  { fieldId: density.id, mode: "volume", resolution: 48 },
  true,
);
assert.equal(
  rpc("app.state").document.surfaceCount,
  0,
  "Direct sampled preview must not create meshes",
);
rpc("camera.fit");
capture("01-density-volume.png");
mutate(
  "surfaces.generate",
  { fieldIds: [density.id], isovalue: 0.04, resolution: 48 },
  true,
);
assert(
  rpc("surfaces.list").items.length > 0,
  "The complete mesh job must publish saved geometry",
);
mutate("shader.apply", {
  preset: "x-ray",
  transparency: true,
  uniforms: { minOpacity: 0, maxOpacity: 0.85, da: 0.03 },
});
rpc("camera.fit");
capture("02-density-xray.png");
mutate("shader.apply", {
  preset: "surface-clip",
  transparency: false,
  uniforms: {
    factor: 0.24,
    xmin: -10,
    xmax: 10,
    ymin: -10,
    ymax: 10,
    zmin: -10,
    zmax: 0.25,
  },
});
rpc("camera.orbit", { horizontalDegrees: 35, verticalDegrees: 15 });
capture("03-density-clipped.png");
capture("04-density-transparent.png", true);
const saved = mutate(
  "document.save",
  { path: path.join(output, "controlled.eigenvista") },
  true,
);
assert.equal(saved.saved, true);
assert.equal(saved.current, true);
const files = fs
  .readdirSync(output)
  .filter((name) => /\.(png|eigenvista)$/.test(name))
  .map((name) => {
    const bytes = fs.readFileSync(path.join(output, name));
    if (name.endsWith(".png")) {
      assert.deepEqual(
        [...bytes.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10],
      );
      assert(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
    }
    return {
      name,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
assert.equal(files.length, 5);
const result = {
  completedAt: new Date().toISOString(),
  input,
  capabilities,
  saved,
  finalState: rpc("app.state"),
  files,
  records,
};
fs.writeFileSync(
  path.join(output, "harness-result.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  `CONTROL_HARNESS_PASS ${files.length} actual native artifacts; ${output}`,
);
