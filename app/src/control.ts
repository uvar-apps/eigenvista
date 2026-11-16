import { fileByteLimit } from "./files";
import { gridResolutions } from "./resolution";
import { REPRESENTATION_OPTIONS, COMPONENT_KINDS } from "./molecularDisplay";
import type { EigenVistaDocument } from "./types";
import type { CameraState, ViewportControl } from "./viewportControl";

export const CONTROL_API_VERSION = 1;
export const CONTROL_LIMITS = {
  pageSize: 100,
  orbitalBatch: 32,
  retainedJobs: 32,
  importBytes: fileByteLimit,
  browserSaveBytes: 8 * 1024 * 1024,
  imageDataUrlCharacters: 16 * 1024 * 1024,
  selectorCharacters: 512,
  paletteBytes: 256 * 1024,
  presentationSelectors: 512,
};

export type ControlErrorKind =
  | "invalid_arguments" | "method_not_found" | "busy" | "no_document"
  | "stale_document" | "unavailable" | "permission_required" | "cancelled"
  | "operation_failed" | "not_found" | "limit_exceeded"
  | "invalid_params" | "scope_denied" | "source_protected" | "destination_exists"
  | "validation_error" | "io_error" | "disabled" | "unauthorized" | "not_ready"
  | "timeout" | "invalid_request" | "parse_error";
const ERROR_CODES: Record<ControlErrorKind, number> = {
  invalid_arguments: -32602, method_not_found: -32601, busy: -32001,
  no_document: -32002, stale_document: -32003, unavailable: -32004,
  permission_required: -32005, cancelled: -32006, operation_failed: -32007,
  not_found: -32008, limit_exceeded: -32009,
  invalid_params: -32602, scope_denied: -32007, source_protected: -32008,
  destination_exists: -32009, validation_error: -32602, io_error: -32006,
  disabled: -32010, unauthorized: -32001, not_ready: -32003, timeout: -32004,
  invalid_request: -32600, parse_error: -32700,
};
export class ControlError extends Error {
  readonly code: number;
  readonly data: { kind: ControlErrorKind; [key: string]: unknown };
  constructor(readonly kind: ControlErrorKind, message: string, details: Record<string, unknown> = {}, code = ERROR_CODES[kind]) {
    super(message);
    this.name = "ControlError";
    this.code = code;
    this.data = { ...details, kind };
  }
}
export function controlError(error: unknown): ControlError {
  if (error instanceof ControlError) return error;
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const value = error as { code: number; message: string; data?: { kind?: string } };
    const kind = value.data?.kind;
    if (kind && Object.hasOwn(ERROR_CODES, kind))
      return new ControlError(kind as ControlErrorKind, String(value.message).slice(0, 2048), value.data, value.code);
  }
  const message = error instanceof Error ? error.message : String(error);
  const kind = /requested scene is stale/i.test(message) ? "stale_document"
    : error instanceof TypeError || error instanceof RangeError
    ? "invalid_arguments"
    : /cancelled|canceled|aborted/i.test(message) ? "cancelled" : "operation_failed";
  return new ControlError(kind, message.slice(0, 2048));
}
export function controlErrorResponse(error: unknown) {
  const value = controlError(error);
  return { code: value.code, message: value.message, data: value.data };
}

type Schema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  items?: Schema;
  properties?: Record<string, Schema>; required?: string[];
  additionalProperties?: boolean | Schema; enum?: unknown[]; anyOf?: Schema[];
  minimum?: number; maximum?: number; minItems?: number; maxItems?: number;
  minLength?: number; maxLength?: number; maxProperties?: number; pattern?: string;
};
const string: Schema = { type: "string", minLength: 1, maxLength: CONTROL_LIMITS.selectorCharacters };
const number: Schema = { type: "number" };
const boolean: Schema = { type: "boolean" };
const color: Schema = { type: "string", pattern: "^#[0-9a-fA-F]{6}$", maxLength: 7 };
const vector: Schema = { type: "array", minItems: 3, maxItems: 3, items: number };
const revision: Schema = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const page = { offset: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as Schema,
  limit: { type: "integer", minimum: 1, maximum: CONTROL_LIMITS.pageSize } as Schema };
const uniforms: Schema = { type: "object", maxProperties: 32, additionalProperties: {
  anyOf: [number, boolean, { type: "array", minItems: 2, maxItems: 4, items: number }],
} };
const object = (properties: Record<string, Schema> = {}, required: string[] = []): Schema =>
  ({ type: "object", properties, required, additionalProperties: false });
const mutation = (properties: Record<string, Schema> = {}, required: string[] = []): Schema =>
  object({ ...properties, expectedRevision: revision }, required);
const definition = (description: string, inputSchema: Schema) => ({ description, inputSchema });
const chainIndex: Schema = { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
const representation: Schema = { type: "string", enum: REPRESENTATION_OPTIONS.map((x) => x.value) };
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { enum: [null] }] });
export const CONTROL_METHODS = {
  "app.capabilities": definition("Inspect API version, schemas, bounds and file capabilities.", object()),
  "app.state": definition("Inspect the accepted document and actual presentation without scientific arrays.", object()),
  "fields.list": definition("List bounded orbital, supplied density and grid metadata.", object(page)),
  "surfaces.list": definition("List saved surface metadata without mesh arrays.", object()),
  "structure.list": definition("List bounded chains and component counts.", object(page)),
  "palette.load": definition("Load a custom atom palette through the GUI's validated parser; native paths must be scoped.", mutation({
    path: { ...string, maxLength: 4096 }, name: string,
    text: { type: "string", minLength: 1, maxLength: CONTROL_LIMITS.paletteBytes },
  })),
  "palette.reset": definition("Restore the bundled atom palette for this session.", mutation()),
  "structure.set": definition("Apply biological session coloring, visibility, residue range and representation overrides.", mutation({
    reset: { type: "boolean", enum: [true] }, showAll: { type: "boolean", enum: [true] }, clearStyles: { type: "boolean", enum: [true] },
    colorMode: { type: "string", enum: ["element", "chain", "entity", "secondary"] },
    hiddenChains: { type: "array", maxItems: CONTROL_LIMITS.presentationSelectors, items: chainIndex },
    hiddenKinds: { type: "array", maxItems: COMPONENT_KINDS.length, items: { type: "string", enum: [...COMPONENT_KINDS] } },
    isolatedChain: nullable(chainIndex),
    residueRange: nullable(object({ chainIndex, first: string, last: string }, ["chainIndex", "first", "last"])),
    chainStyles: { type: "array", maxItems: CONTROL_LIMITS.presentationSelectors,
      items: object({ chainIndex, representation: nullable(representation) }, ["chainIndex", "representation"]) },
    componentStyles: object(Object.fromEntries(COMPONENT_KINDS.map((kind) => [kind, nullable(representation)]))),
  })),
  "structure.focus": definition("Focus the currently visible atoms, optionally restricted to one existing chain.", mutation({
    target: { type: "string", enum: ["visible", "chain"] }, chainIndex,
  }, ["target"])),
  "document.open": definition("Import an authorized file without hidden unsaved-change prompts.", mutation({
    path: { ...string, maxLength: 4096 }, name: string,
    bytes: { type: "array", maxItems: fileByteLimit, items: { type: "integer", minimum: 0, maximum: 255 } },
    discardUnsaved: boolean,
  })),
  "document.save": definition("Save a scoped native destination, or encode browser bytes without clearing dirty state.", mutation({
    path: { ...string, maxLength: 4096 }, overwrite: { type: "boolean", enum: [false] },
  })),
  "field.select": definition("Select an existing field using the application's preview transitions.", mutation({ fieldId: string }, ["fieldId"])),
  "field.preview": definition("Start a sampling-only volume or raycast job without meshing.", mutation({
    fieldId: string, mode: { type: "string", enum: ["volume", "raycast"] },
    resolution: { type: "integer", enum: [...gridResolutions] },
  }, ["fieldId", "mode", "resolution"])),
  "surfaces.generate": definition("Start an atomic batch of orbital meshes or one supplied density/grid.", mutation({
    fieldIds: { type: "array", minItems: 1, maxItems: 32, items: string },
    isovalue: { type: "number", minimum: Number.MIN_VALUE },
    resolution: { type: "integer", enum: [...gridResolutions] },
  }, ["fieldIds", "isovalue", "resolution"])),
  "surfaces.set_visibility": definition("Set one saved surface's visibility.", mutation({ surfaceId: string, visible: boolean }, ["surfaceId", "visible"])),
  "surfaces.remove": definition("Remove one saved surface from the accepted document.", mutation({ surfaceId: string }, ["surfaceId"])),
  "scene.set": definition("Apply a validated document/session appearance patch.", mutation({
    representation: { type: "string", enum: REPRESENTATION_OPTIONS.map((x) => x.value) },
    positiveColor: color, negativeColor: color,
    opacity: { type: "number", minimum: 0, maximum: 1 },
    isovalue: { type: "number", minimum: Number.MIN_VALUE },
    shading: { type: "string", enum: ["diffuse", "blinn-phong"] },
    backgroundColor: color, volumeQuality: { type: "integer", enum: [1, 2, 4] },
    ambientOcclusion: object({ enabled: boolean,
      strength: { type: "number", minimum: 0, maximum: 1 },
      radiusAngstrom: { type: "number", minimum: 0.25, maximum: 50 }, automaticRadius: boolean }),
  })),
  "shader.apply": definition("Apply a bundled shader preset and declared uniform values.", mutation({
    preset: { type: "string", enum: ["surface-clip", "x-ray"] },
    target: { type: "string", enum: ["all"] }, uniforms, transparency: boolean,
  }, ["preset"])),
  "shader.set_uniforms": definition("Update only declared values of the currently applied shader.", mutation({ uniforms,
    target: { type: "string", enum: ["all"] }, transparency: boolean }, ["uniforms"])),
  "shader.clear": definition("Clear the custom shader, preserving scientific data.", mutation()),
  "camera.get": definition("Read the current camera in bohr coordinates.", object()),
  "camera.fit": definition("Fit the actual visible scene.", mutation()),
  "camera.set": definition("Set finite nondegenerate position, target and optional up vectors.", mutation({ position: vector, target: vector, up: vector }, ["position", "target"])),
  "camera.orbit": definition("Orbit the current camera in degrees without changing molecular data.", mutation({ horizontalDegrees: number, verticalDegrees: number }, ["horizontalDegrees", "verticalDegrees"])),
  "camera.zoom": definition("Zoom by a positive factor; greater than one moves closer.", mutation({ factor: { type: "number", minimum: Number.MIN_VALUE } }, ["factor"])),
  "image.export": definition("Capture the actual final frame, optionally with a transparent background.", mutation({
    path: { ...string, maxLength: 4096 }, transparent: boolean, overwrite: { type: "boolean", enum: [false] },
  })),
  "job.get": definition("Read an owned operation and real progress/terminal result.", object({ jobId: string }, ["jobId"])),
  "job.cancel": definition("Cancel only this operation and await cleanup.", object({ jobId: string }, ["jobId"])),
};

function validate(value: unknown, schema: Schema, path = "params"): void {
  const fail = (message: string): never => { throw new ControlError("invalid_arguments", `${path}: ${message}`); };
  if (schema.anyOf) {
    for (const candidate of schema.anyOf) { try { validate(value, candidate, path); return; } catch { /* next declared type */ } }
    fail("value does not match an allowed type");
  }
  if (schema.enum && !schema.enum.some((item) => item === value)) fail("unsupported value");
  if (schema.type === "boolean" && typeof value !== "boolean") fail("expected a boolean");
  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value) || (schema.type === "integer" && !Number.isSafeInteger(value))) fail(`expected a finite ${schema.type}`);
    const n = value as number;
    if (schema.minimum !== undefined && n < schema.minimum) fail(`minimum is ${schema.minimum}`);
    if (schema.maximum !== undefined && n > schema.maximum) fail(`maximum is ${schema.maximum}`);
  }
  if (schema.type === "string") {
    if (typeof value !== "string") fail("expected a string");
    const text = value as string;
    if (text.length < (schema.minLength ?? 0) || text.length > (schema.maxLength ?? 512)) fail("string length is outside the supported bound");
    if (schema.pattern && !new RegExp(schema.pattern).test(text)) fail("invalid string format");
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) fail("expected an array");
    const array = value as unknown[];
    if (array.length < (schema.minItems ?? 0) || array.length > (schema.maxItems ?? 1024)) fail("array length is outside the supported bound");
    if (schema.items)
      for (let index = 0; index < array.length; index++) validate(array[index], schema.items, `${path}[${index}]`);
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail("expected a plain object");
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > (schema.maxProperties ?? 32)) fail("too many properties");
    for (const key of schema.required ?? []) if (!Object.hasOwn(record, key)) fail(`missing ${key}`);
    for (const key of keys) {
      if (key.length > 256 || ["__proto__", "constructor", "prototype"].includes(key)) fail("unsupported property name");
      const property = schema.properties?.[key];
      if (property) validate(record[key], property, `${path}.${key}`);
      else if (typeof schema.additionalProperties === "object") validate(record[key], schema.additionalProperties, `${path}.${key}`);
      else if (schema.additionalProperties !== true) fail(`unknown parameter ${key}`);
    }
  }
}

export interface ControlExecution {
  signal: AbortSignal;
  assertCurrent(): void;
  progress(stage: string, counts?: { completed: number; total: number }): void;
}
export interface ControlSnapshot {
  document: EigenVistaDocument | null;
  revision: number;
  dirty: boolean;
  busy: string;
  progress: unknown;
  mode: string;
  resolution: number;
  shading: string;
  ambientOcclusion: unknown;
  shader: unknown;
  palette: unknown;
  volumeQuality: number;
  structureDisplay: unknown;
}
export interface ControlHost {
  native: boolean;
  snapshot(): ControlSnapshot;
  viewport(): ViewportControl | null;
  synchronize(): Promise<void>;
  execute(method: string, params: Record<string, unknown>, execution: ControlExecution): Promise<unknown>;
}
type Status = "accepted" | "running" | "completed" | "failed" | "cancelled";
type Job = { jobId: string; status: Status; operation: string; progress?: unknown; result?: unknown;
  error?: ReturnType<typeof controlErrorResponse>; abort: AbortController; done: Promise<void> };
const terminal = (job: Job) => ["completed", "failed", "cancelled"].includes(job.status);
const bounded = (text: string | null | undefined) => text?.slice(0, 512) ?? null;
export const controlIdentifier = <T extends string | null | undefined>(value: T, name: string): T => {
  if (typeof value === "string" && value.length > CONTROL_LIMITS.selectorCharacters)
    throw new ControlError("limit_exceeded", `${name} exceeds the control selector length limit`,
      { length: value.length, limit: CONTROL_LIMITS.selectorCharacters });
  return value;
};
const identifier = controlIdentifier;
// randomUUID is secure-context-only; normal HTTP/LAN previews must still start.
const controlId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)),
  (byte) => byte.toString(16).padStart(2, "0")).join("");
const sameSource = (a: EigenVistaDocument | null, b: EigenVistaDocument | null) => a === b || Boolean(a && b &&
  a.id === b.id && a.title === b.title && a.atoms === b.atoms && a.structure === b.structure &&
  a.bonds === b.bonds && a.basis === b.basis && a.orbitals === b.orbitals && a.densities === b.densities &&
  a.grids === b.grids && a.provenance === b.provenance);

export function createApplicationControl(getHost: () => ControlHost) {
  const jobs = new Map<string, Job>();
  let active: Job | undefined;
  let mutating = false;
  let disposed = false;
  let instanceId = `browser-${controlId()}`;
  const getDocument = () => {
    const doc = getHost().snapshot().document;
    if (!doc) throw new ControlError("no_document", "No molecular document is open");
    return doc;
  };
  const viewport = () => {
    const value = getHost().viewport();
    if (!value) throw new ControlError("unavailable", "The molecular renderer is not ready");
    return value;
  };
  const idle = () => {
    if (mutating || getHost().snapshot().busy || (active && !terminal(active)))
      throw new ControlError("busy", "Finish or cancel the active operation first");
  };
  const checkRevision = (params: Record<string, unknown>) => {
    if (params.expectedRevision !== undefined && params.expectedRevision !== getHost().snapshot().revision)
      throw new ControlError("stale_document", "The accepted document revision has changed", { revision: getHost().snapshot().revision });
  };
  const execution = (source: ControlSnapshot, abort: AbortController, progress: ControlExecution["progress"], strictRevision = false): ControlExecution => ({
    signal: abort.signal, progress,
    assertCurrent() {
      if (abort.signal.aborted) throw new ControlError("cancelled", "Operation cancelled");
      const current = getHost().snapshot();
      if ((strictRevision && current.revision !== source.revision) || !sameSource(source.document, current.document))
        throw new ControlError("stale_document", "The source document changed before publication", { revision: current.revision });
    },
  });
  const publicJob = ({ jobId, status, operation, progress, result, error }: Job) => ({ jobId, status, operation,
    ...(progress === undefined ? {} : { progress }), ...(result === undefined ? {} : { result }), ...(error ? { error } : {}) });
  const startJob = (method: string, params: Record<string, unknown>) => {
    idle();
    const source = getHost().snapshot();
    const abort = new AbortController();
    let finish!: () => void;
    const job: Job = { jobId: controlId(), operation: method, status: "accepted", abort,
      done: new Promise<void>((resolve) => { finish = resolve; }) };
    while (jobs.size >= CONTROL_LIMITS.retainedJobs) {
      const oldest = [...jobs.values()].find(terminal);
      if (!oldest) throw new ControlError("limit_exceeded", "Job history is full");
      jobs.delete(oldest.jobId);
    }
    jobs.set(job.jobId, job);
    active = job;
    queueMicrotask(async () => {
      try {
        if (abort.signal.aborted) throw new ControlError("cancelled", "Operation cancelled");
        job.status = "running";
        const context = execution(source, abort, (stage, counts) => { job.progress = { stage, ...(counts ? { counts } : {}) }; });
        job.result = await getHost().execute(method, params, context);
        if (abort.signal.aborted) throw new ControlError("cancelled", "Operation cancelled");
        // Accepted publication is the cancellation boundary: a later Cancel must
        // not describe already committed geometry as retained previous results.
        job.status = "completed";
        await getHost().synchronize();
      } catch (error) {
        const failure = controlError(error);
        job.status = abort.signal.aborted || failure.kind === "cancelled" ? "cancelled" : "failed";
        job.error = controlErrorResponse(job.status === "cancelled" ? new ControlError("cancelled", "Operation cancelled; previous results retained") : failure);
        delete job.result;
      } finally {
        if (active === job) active = undefined;
        finish();
      }
    });
    return { jobId: job.jobId, status: "accepted" as const };
  };

  return {
    setInstanceId(value: string) { instanceId = value; },
    dispose() { disposed = true; for (const job of jobs.values()) if (!terminal(job)) job.abort.abort(); },
    async request(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
      try {
        if (disposed) throw new ControlError("unavailable", "The application controller is closed");
        if (!Object.hasOwn(CONTROL_METHODS, method)) throw new ControlError("method_not_found", `Unknown application method ${String(method).slice(0, 128)}`);
        const definition = CONTROL_METHODS[method as keyof typeof CONTROL_METHODS];
        if (method === "palette.load" && typeof params?.text === "string" &&
          (params.text.length > CONTROL_LIMITS.paletteBytes || new TextEncoder().encode(params.text).byteLength > CONTROL_LIMITS.paletteBytes))
          throw new ControlError("limit_exceeded", "Atom palette exceeds the 256 KiB input budget");
        if (params && typeof params === "object" && !Array.isArray(params)) {
          if ((method === "field.select" || method === "field.preview") && typeof params.fieldId === "string")
            identifier(params.fieldId, "Field ID");
          if ((method === "surfaces.remove" || method === "surfaces.set_visibility") && typeof params.surfaceId === "string")
            identifier(params.surfaceId, "Surface ID");
          if (method === "surfaces.generate" && Array.isArray(params.fieldIds) && params.fieldIds.length <= CONTROL_LIMITS.orbitalBatch)
            for (const id of params.fieldIds) if (typeof id === "string") identifier(id, "Field ID");
        }
        validate(params, definition.inputSchema);
        if (method === "scene.set") {
          const ao = params.ambientOcclusion as { automaticRadius?: boolean; radiusAngstrom?: number } | undefined;
          if (ao?.automaticRadius === true && ao.radiusAngstrom !== undefined)
            throw new ControlError("invalid_arguments", "Choose either an automatic AO radius or an explicit radius, not both");
        }
        if (method === "app.capabilities") return { apiVersion: 1, instanceId,
          methods: Object.entries(CONTROL_METHODS).map(([method, value]) => ({ method, ...value })),
          limits: { ...CONTROL_LIMITS, gridResolutions: [...gridResolutions] },
          files: { nativePaths: getHost().native, browserBytes: !getHost().native, overwrite: false },
          errorKinds: Object.keys(ERROR_CODES) };
        if (method === "job.get" || method === "job.cancel") {
          const job = jobs.get(params.jobId as string);
          if (!job) throw new ControlError("not_found", "Unknown or expired job ID");
          if (method === "job.cancel" && !terminal(job)) { job.abort.abort(); await job.done; await getHost().synchronize(); }
          return publicJob(job);
        }
        await getHost().synchronize();
        checkRevision(params);
        const snapshot = getHost().snapshot();
        if (method === "app.state") {
          const d = snapshot.document;
          let camera: CameraState | null = null;
          let backgroundColor: string | null = null;
          try { camera = viewport().getCamera(); backgroundColor = viewport().getBackground(); } catch { /* state remains available during renderer startup */ }
          return { apiVersion: 1, instanceId, revision: snapshot.revision,
            document: d ? { id: identifier(d.id, "Document ID"), title: bounded(d.title), atomCount: d.atoms.positions.length,
              bondCount: d.bonds.length, basisCount: d.basis.length, orbitalCount: d.orbitals.length,
              densityCount: d.densities.length, gridCount: d.grids.length, surfaceCount: d.surfaces.length } : null,
            dirty: snapshot.dirty, busy: snapshot.busy || (mutating ? "Applying control operation" : ""), progress: snapshot.progress,
            view: d ? { ...d.view, field: identifier(d.view.field, "Field ID") } : null, mode: snapshot.mode, resolution: snapshot.resolution,
            shading: snapshot.shading, ambientOcclusion: snapshot.ambientOcclusion, shader: snapshot.shader,
            palette: snapshot.palette, volumeQuality: snapshot.volumeQuality, camera, backgroundColor,
            structureDisplay: snapshot.structureDisplay,
          };
        }
        if (method === "fields.list") {
          const d = getDocument(), offset = (params.offset as number | undefined) ?? 0, limit = (params.limit as number | undefined) ?? 100;
          const fields = [...d.orbitals.map((field) => ({ kind: "orbital" as const, field })),
            ...d.densities.map((field) => ({ kind: "density" as const, field })),
            ...d.grids.map((field) => ({ kind: "grid" as const, field }))];
          return { revision: snapshot.revision, total: fields.length, offset,
            items: fields.slice(offset, offset + limit).map(({ kind, field }) => ({ id: identifier(field.id, "Field ID"), label: bounded(field.label), kind,
              ...(kind === "orbital" ? { spin: bounded((field as typeof d.orbitals[number]).spin), energy: (field as typeof d.orbitals[number]).energy,
                occupation: (field as typeof d.orbitals[number]).occupation, energyUnits: "hartree", units: "atomic units" } : {}),
              ...(kind === "density" ? { quantity: bounded((field as typeof d.densities[number]).kind), units: "bohr^-3" } : {}),
              ...(kind === "grid" ? { quantity: bounded((field as typeof d.grids[number]).quantity), units: "unspecified", dims: [...(field as typeof d.grids[number]).dims] } : {}),
            })) };
        }
        if (method === "surfaces.list") {
          const d = getDocument();
          return { revision: snapshot.revision, total: d.surfaces.length, items: d.surfaces.map((s) => ({
            id: identifier(s.id, "Surface ID"), label: bounded(s.label), fieldId: identifier(s.field, "Field ID"), isovalue: s.isovalue,
            visible: s.visible, color: s.color, opacity: s.opacity, triangleCount: s.indices.length / 3,
            vertexCount: s.positions.length / 3, resolution: [...s.resolution], sourceHash: bounded(s.source_hash),
          })) };
        }
        if (method === "structure.list") {
          const d = getDocument(), structure = d.structure, offset = (params.offset as number | undefined) ?? 0, limit = (params.limit as number | undefined) ?? 100;
          const counts = structure?.chains.map(() => ({ atomCount: 0, residueCount: 0 })) ?? [];
          const components = Object.fromEntries(COMPONENT_KINDS.map((kind) => [kind, 0]));
          if (structure) {
            for (const residue of structure.residues) counts[residue.chain].residueCount++;
            for (const index of structure.atom_residues) { const residue = structure.residues[index]; counts[residue.chain].atomCount++; components[residue.kind]++; }
          }
          return { revision: snapshot.revision, total: structure?.chains.length ?? 0, offset,
            items: structure?.chains.slice(offset, offset + limit).map((chain, i) => ({ id: `chain:${i + offset}`, index: i + offset,
              labelId: bounded(chain.label_id), authorId: bounded(chain.author_id), entityId: bounded(chain.entity_id), ...counts[i + offset] })) ?? [],
            components, secondarySource: structure?.secondary_source ?? "none" };
        }
        if (method === "camera.get") return { revision: snapshot.revision, ...viewport().getCamera() };
        if (method === "field.preview" || method === "surfaces.generate") {
          const d = getDocument();
          const ids = method === "field.preview" ? [params.fieldId as string] : params.fieldIds as string[];
          const all = [...d.orbitals, ...d.densities, ...d.grids];
          if (new Set(ids).size !== ids.length || ids.some((id) => !all.some((f) => f.id === id)))
            throw new ControlError("invalid_arguments", "Choose distinct existing field IDs");
          if (ids.length > 1 && ids.some((id) => !d.orbitals.some((f) => f.id === id)))
            throw new ControlError("invalid_arguments", "A batch may contain orbitals only; generate one supplied density/grid separately");
          return startJob(method, params);
        }
        if (method === "field.select") {
          const d = getDocument();
          if (![...d.orbitals, ...d.densities, ...d.grids].some((f) => f.id === params.fieldId))
            throw new ControlError("not_found", "Unknown field ID");
          if (d.view.field !== params.fieldId && (snapshot.mode !== "mesh" || d.grids.some((g) => g.id === params.fieldId)))
            return startJob(method, params);
        }
        if (["document.open", "document.save", "field.select", "surfaces.remove"].includes(method) || (method === "scene.set" && params.isovalue !== undefined)) idle();
        if (method !== "document.open") getDocument();
        if (mutating) throw new ControlError("busy", "Another application command is being applied");
        mutating = true;
        try {
          const abort = new AbortController();
          const result = await getHost().execute(method, params, execution(snapshot, abort, () => {}, method === "document.open" || method === "document.save" || params.expectedRevision !== undefined));
          await getHost().synchronize();
          return result;
        } finally { mutating = false; }
      } catch (error) { throw controlError(error); }
    },
  };
}

export type ApplicationControl = ReturnType<typeof createApplicationControl>;
declare global {
  interface Window { eigenvistaControl?: Pick<ApplicationControl, "request"> }
}
