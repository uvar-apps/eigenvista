import init, * as core from "./wasm/eigenvista_wasm";
import type { SampledGrid } from "./types";
import { auxiliaryScienceActions } from "./scienceActions";

const ready = init();
let registered: { id: number; document: core.RegisteredDocument } | null = null;
function clearCache() {
  registered?.document.free();
  registered = null;
}
self.onmessage = async (event: MessageEvent) => {
  const { id, action, args } = event.data;
  const progress = (stage: string) => self.postMessage({ id, progress: stage });
  const measuredProgress = (stage: string) => {
    let last = -Infinity;
    return (completed: number, total: number) => {
      const now = performance.now();
      if (completed === 0 || completed === total || now - last >= 100) {
        self.postMessage({ id, progress: stage, completed, total });
        last = now;
      }
    };
  };
  let initialized = false;
  let registrationPreserved = false;
  try {
    await ready;
    initialized = true;
    let result: unknown;
    const transfer: Transferable[] = [];
    switch (action) {
      case "example":
        result = JSON.parse(core.example(args.openShell));
        break;
      case "decode":
        result = JSON.parse(core.decode(new Uint8Array(args.bytes)));
        break;
      case "encode":
        result = core.encode(JSON.stringify(args.doc));
        break;
      case "validate":
        progress("validating");
        // Share Save's exact source/array/manifest budgets without ZIP compression.
        core.validate_document(JSON.stringify(args.doc));
        result = null;
        break;
      case "import":
        result = JSON.parse(core.import_text(args.text, args.name));
        break;
      case "import_document":
        result = JSON.parse(
          core.import_document(new Uint8Array(args.bytes), args.name),
        );
        break;
      case "backbone":
        progress("preparing protein backbone");
        result = JSON.parse(core.protein_backbone(JSON.stringify(args.doc)));
        break;
      case "inspection_measure":
        result = JSON.parse(
          core.inspection_measure(
            JSON.stringify(args.doc),
            JSON.stringify(args.request),
          ),
        );
        break;
      case "inspection_measurements":
        result = JSON.parse(
          core.inspection_measurements(JSON.stringify(args.doc)),
        );
        break;
      case "inspection_neighborhood": {
        result = core.inspection_neighborhood(
          JSON.stringify(args.doc),
          JSON.stringify(args.request),
          measuredProgress("finding neighboring atoms"),
        );
        transfer.push((result as Uint32Array).buffer);
        break;
      }
      case "inspection_validate":
        core.inspection_validate(JSON.stringify(args.doc));
        result = null;
        break;
      case "analysis_plane_atoms":
        result = JSON.parse(
          core.analysis_plane_atoms(
            JSON.stringify(args.doc),
            new Uint32Array(args.atoms),
            new Float64Array(args.extent),
            new Uint32Array(args.dims),
          ),
        );
        break;
      case "analysis_contours": {
        result = core.analysis_contours(JSON.stringify(args.item));
        transfer.push((result as Float64Array).buffer);
        break;
      }
      case "analysis_csv":
        result = core.analysis_csv(JSON.stringify(args.item));
        break;
      case "analysis_samples":
        result = JSON.parse(
          core.analysis_sample_rows(
            JSON.stringify(args.definition),
            new Float64Array(args.values),
            new Uint32Array(args.valid),
            args.offset,
          ),
        );
        break;
      case "molecular_surface": {
        const mesh = core.molecular_surface(
          JSON.stringify(args.doc),
          JSON.stringify(args.request),
          (stage: string, completed: number, total: number) =>
            self.postMessage({ id, progress: stage, completed, total }),
        );
        try {
          const positions = mesh.take_positions(),
            normals = mesh.take_normals();
          const indices = mesh.take_indices(),
            vertex_atoms = mesh.take_vertex_atoms();
          result = {
            ...JSON.parse(mesh.metadata()),
            positions,
            normals,
            indices,
            vertex_atoms,
          };
          transfer.push(
            positions.buffer,
            normals.buffer,
            indices.buffer,
            vertex_atoms.buffer,
          );
        } finally {
          mesh.free();
        }
        break;
      }
      case "describe_field":
      case "analysis_metadata":
      case "analyze": {
        if (args.doc) {
          const source = new core.RegisteredDocument(JSON.stringify(args.doc));
          clearCache();
          registered = { id: args.registration, document: source };
        }
        if (!registered || registered.id !== args.registration)
          throw new Error(
            "Scientific document registration is unavailable; retry the calculation",
          );
        // Query errors preserve an already accepted numeric registration. When a
        // new registration was installed, notify the bridge of that boundary.
        registrationPreserved = !args.doc;
        if (action === "describe_field")
          result = JSON.parse(registered.document.describe_field(args.field));
        else if (action === "analysis_metadata")
          result = JSON.parse(
            registered.document.declare_field(JSON.stringify(args.descriptor)),
          );
        else {
          const query = registered.document.analyze(
            JSON.stringify(args.request),
            measuredProgress("sampling quantitative field"),
          );
          try {
            const values = query.take_values(),
              valid = query.take_valid();
            result = { ...JSON.parse(query.metadata()), values, valid };
            transfer.push(values.buffer, valid.buffer);
          } finally {
            query.free();
          }
        }
        break;
      }
      case "sample":
      case "generate": {
        if (args.doc) {
          clearCache();
          registered = {
            id: args.registration,
            document: new core.RegisteredDocument(JSON.stringify(args.doc)),
          };
        }
        if (!registered || registered.id !== args.registration)
          throw new Error(
            "Scientific document registration is unavailable; retry the calculation",
          );
        const document = registered.document;
        document.prepare(
          args.field,
          args.resolution,
          measuredProgress("sampling"),
        );
        const surfaces =
          action === "generate"
            ? JSON.parse(
                document.surfaces(
                  args.iso,
                  args.appearance.positive_color,
                  args.appearance.negative_color,
                  args.appearance.opacity,
                  measuredProgress("meshing"),
                ),
              )
            : null;
        progress("transferring");
        const grid: SampledGrid = {
          ...JSON.parse(document.metadata()),
          values: document.display_values(),
        };
        transfer.push(grid.values.buffer);
        result = action === "sample" ? grid : { grid, surfaces };
        break;
      }
      default:
        throw new Error(`Unknown worker action ${action}`);
    }
    self.postMessage({ id, result }, { transfer });
  } catch (e) {
    // A trapped allocator/runtime must not be reused for the next calculation.
    const fatal =
      !initialized ||
      e instanceof WebAssembly.RuntimeError ||
      e instanceof RangeError;
    if (
      !fatal &&
      !auxiliaryScienceActions.has(action) &&
      !registrationPreserved
    )
      clearCache();
    self.postMessage({
      id,
      fatal,
      registrationPreserved,
      error: fatal
        ? "The calculation worker exhausted memory or failed. Reduce grid resolution, surface detail or analysis extent and retry; previous results were retained."
        : String(e),
    });
  }
};
