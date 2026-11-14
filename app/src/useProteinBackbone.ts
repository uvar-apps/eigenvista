import { useEffect, useRef, useState } from "react";
import { createScienceClient } from "./science";
import type {
  AtomColumns,
  EigenVistaDocument,
  SecondaryStructure,
  StructureMetadata,
} from "./types";

export interface BackbonePoint {
  residue: number;
  atom: number;
  position: [number, number, number];
  secondary: SecondaryStructure;
  orientation: [number, number, number] | null;
}
export interface BackboneSegment {
  chain: number;
  segment: number;
  points: BackbonePoint[];
}
export interface ProteinBackbone {
  segments: BackboneSegment[];
  warnings: string[];
}

interface Source {
  atoms: AtomColumns;
  structure: StructureMetadata | null | undefined;
  backbone: ProteinBackbone | null;
  loading: boolean;
  error: string;
}

/** A display-only owner; it never registers/replaces the QC sampling source. */
export function useProteinBackbone(doc: EigenVistaDocument, needed: boolean) {
  const client = useRef<ReturnType<typeof createScienceClient> | null>(null);
  if (!client.current) client.current = createScienceClient();
  const generation = useRef(0);
  const source = useRef<Source | null>(null);
  const [state, setState] = useState<Source | null>(null);

  useEffect(() => {
    const owner = client.current!;
    return () => {
      generation.current++;
      if (source.current) source.current.loading = false;
      owner.cancel(new Error("Protein display source released"));
    };
  }, []);

  useEffect(() => {
    if (
      !source.current ||
      source.current.atoms !== doc.atoms ||
      source.current.structure !== doc.structure
    ) {
      generation.current++;
      client.current!.cancel(new Error("Protein display source replaced"));
      source.current = {
        atoms: doc.atoms,
        structure: doc.structure,
        backbone: null,
        loading: false,
        error: "",
      };
      setState({ ...source.current });
    }
    const current = source.current!;
    if (
      !needed ||
      !doc.structure ||
      current.backbone ||
      current.loading ||
      current.error
    )
      return;
    const epoch = generation.current;
    current.loading = true;
    setState({ ...current });
    // Reuse the validated Rust Document contract, but send no basis, fields,
    // sampled grids, saved meshes or QC registration/appearance identifiers.
    const input: EigenVistaDocument = {
      id: "protein-display",
      title: "Protein display",
      atoms: doc.atoms,
      structure: doc.structure,
      bonds: [],
      basis: [],
      orbitals: [],
      densities: [],
      grids: [],
      surfaces: [],
      provenance: [],
      view: {
        representation: "ball-stick",
        positive_color: "#259d86",
        negative_color: "#cb4e72",
        opacity: 0.78,
        isovalue: 0.08,
        field: null,
      },
    };
    client
      .current!.request<ProteinBackbone>("backbone", { doc: input })
      .then((backbone) => {
        if (generation.current !== epoch || source.current !== current) return;
        current.backbone = backbone;
        current.loading = false;
        setState({ ...current });
      })
      .catch((error: unknown) => {
        if (generation.current !== epoch || source.current !== current) return;
        current.loading = false;
        current.error = String(error);
        setState({ ...current });
      });
    // Do not cancel merely on representation changes: retain the prepared
    // result for this source. Replacement/unmount cancel this owner only.
  }, [doc.atoms, doc.structure, needed]);

  const current =
    state && state.atoms === doc.atoms && state.structure === doc.structure
      ? state
      : null;
  return {
    backbone: current?.backbone ?? null,
    loading: current?.loading ?? false,
    error: current?.error ?? "",
  };
}
