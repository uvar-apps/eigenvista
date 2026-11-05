import type { EigenVistaDocument } from "./types";

interface Registration {
  id: number;
  inputs: unknown[];
}

/** One worker-lifetime registration. Source objects must be immutable snapshots. */
export class ScienceRegistration {
  private current?: Registration;
  private nextId = 0;

  clear() {
    this.current = undefined;
  }

  prepare(action: string, args: Record<string, unknown>) {
    if (action !== "sample" && action !== "generate") return { args };
    const { doc: source, ...parameters } = args;
    const doc = source as EigenVistaDocument;
    if (!doc) throw new Error("Sampling requires a document");
    // Observe metadata/geometry replacements too so registration validation
    // cannot be bypassed. View and saved meshes are not source dependencies.
    const inputs = [
      doc.id,
      doc.title,
      doc.atoms,
      doc.bonds,
      doc.basis,
      doc.orbitals,
      doc.densities,
      doc.grids,
      doc.provenance,
    ];
    const reused = this.current?.inputs.every(
      (value, i) => value === inputs[i],
    );
    const registration = reused ? this.current! : { id: ++this.nextId, inputs };
    return {
      registration,
      args: {
        ...parameters,
        registration: registration.id,
        ...(!reused ? { doc: { ...doc, surfaces: [] } } : {}),
        appearance: {
          positive_color: doc.view.positive_color,
          negative_color: doc.view.negative_color,
          opacity: doc.view.opacity,
        },
      },
    };
  }

  commit(registration?: Registration) {
    if (registration) this.current = registration;
  }
}
