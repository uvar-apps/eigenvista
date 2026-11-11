import init, * as core from "./wasm/eigenvista_wasm";
import type { SampledGrid } from "./types";

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
    if (!fatal) clearCache();
    self.postMessage({
      id,
      fatal,
      error: fatal
        ? "The calculation worker exhausted memory or failed. Reduce the grid resolution and retry; previous surfaces were retained."
        : String(e),
    });
  }
};
