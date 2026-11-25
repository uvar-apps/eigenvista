import { gridResolutions } from "./resolution";
import {
  COLOR_MODE_OPTIONS,
  COMPONENT_KINDS,
  REPRESENTATION_OPTIONS,
} from "./molecularDisplay";
import type { EigenVistaDocument } from "./types";
import type { CameraState, ViewportControl } from "./viewportControl";
import type { PendingInspectionSave } from "./pendingInspectionSave";
import {
  INSPECTION_METHODS,
  inspectionBackgroundMethods,
  inspectionReadMethods,
} from "./inspectionSchemas";

export const CONTROL_API_VERSION = 1;

export type ControlErrorKind =
  | "invalid_arguments"
  | "method_not_found"
  | "busy"
  | "no_document"
  | "stale_document"
  | "unavailable"
  | "permission_required"
  | "cancelled"
  | "operation_failed"
  | "allocation_failed"
  | "not_found"
  | "limit_exceeded"
  | "invalid_params"
  | "scope_denied"
  | "source_protected"
  | "destination_exists"
  | "validation_error"
  | "io_error"
  | "disabled"
  | "unauthorized"
  | "not_ready"
  | "timeout"
  | "invalid_request"
  | "parse_error";
const ERROR_CODES: Record<ControlErrorKind, number> = {
  invalid_arguments: -32602,
  method_not_found: -32601,
  busy: -32001,
  no_document: -32002,
  stale_document: -32003,
  unavailable: -32004,
  permission_required: -32005,
  cancelled: -32006,
  operation_failed: -32007,
  allocation_failed: -32011,
  not_found: -32008,
  limit_exceeded: -32009,
  invalid_params: -32602,
  scope_denied: -32007,
  source_protected: -32008,
  destination_exists: -32009,
  validation_error: -32602,
  io_error: -32006,
  disabled: -32010,
  unauthorized: -32001,
  not_ready: -32003,
  timeout: -32004,
  invalid_request: -32600,
  parse_error: -32700,
};
export class ControlError extends Error {
  readonly code: number;
  readonly data: { kind: ControlErrorKind; [key: string]: unknown };
  constructor(
    readonly kind: ControlErrorKind,
    message: string,
    details: Record<string, unknown> = {},
    code = ERROR_CODES[kind],
  ) {
    super(message);
    this.name = "ControlError";
    this.code = code;
    this.data = { ...details, kind };
  }
}
export function controlError(error: unknown): ControlError {
  if (error instanceof ControlError) return error;
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    const value = error as {
      code: number;
      message: string;
      data?: { kind?: string };
    };
    const kind = value.data?.kind;
    if (kind && Object.hasOwn(ERROR_CODES, kind))
      return new ControlError(
        kind as ControlErrorKind,
        String(value.message),
        value.data,
        value.code,
      );
  }
  const message = error instanceof Error ? error.message : String(error);
  const kind = /requested scene is stale/i.test(message)
    ? "stale_document"
    : error instanceof TypeError || error instanceof RangeError
      ? "invalid_arguments"
      : /cancelled|canceled|aborted/i.test(message)
        ? "cancelled"
        : "operation_failed";
  return new ControlError(kind, message);
}
export function controlErrorResponse(error: unknown) {
  const value = controlError(error);
  return { code: value.code, message: value.message, data: value.data };
}

export type ControlSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  items?: ControlSchema;
  properties?: Record<string, ControlSchema>;
  required?: string[];
  additionalProperties?: boolean | ControlSchema;
  enum?: unknown[];
  anyOf?: ControlSchema[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  maxProperties?: number;
  pattern?: string;
};
type Schema = ControlSchema;
const string: Schema = { type: "string", minLength: 1 };
const number: Schema = { type: "number" };
const boolean: Schema = { type: "boolean" };
const color: Schema = {
  type: "string",
  pattern: "^#[0-9a-fA-F]{6}$",
  maxLength: 7,
};
const vector: Schema = {
  type: "array",
  minItems: 3,
  maxItems: 3,
  items: number,
};
const revision: Schema = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
};
const page = {
  offset: {
    type: "integer",
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  } as Schema,
  limit: {
    type: "integer",
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  } as Schema,
};
const uniforms: Schema = {
  type: "object",
  additionalProperties: {
    anyOf: [
      number,
      boolean,
      { type: "array", minItems: 2, maxItems: 4, items: number },
    ],
  },
};
const object = (
  properties: Record<string, Schema> = {},
  required: string[] = [],
): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const mutation = (
  properties: Record<string, Schema> = {},
  required: string[] = [],
): Schema => object({ ...properties, expectedRevision: revision }, required);
const definition = (description: string, inputSchema: Schema) => ({
  description,
  inputSchema,
});
const chainIndex: Schema = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
};
const representation: Schema = {
  type: "string",
  enum: REPRESENTATION_OPTIONS.map((x) => x.value),
};
const nullable = (schema: Schema): Schema => ({
  anyOf: [schema, { enum: [null] }],
});
export const CONTROL_METHODS = {
  ...INSPECTION_METHODS,
  "app.capabilities": definition(
    "Inspect API version, schemas, bounds and file capabilities.",
    object(),
  ),
  "app.state": definition(
    "Inspect the accepted document and actual presentation without scientific arrays.",
    object(),
  ),
  "fields.list": definition(
    "List paginated orbital, supplied density and grid metadata.",
    object(page),
  ),
  "surfaces.list": definition(
    "List saved surface metadata without mesh arrays.",
    object(),
  ),
  "structure.list": definition(
    "List paginated chains and component counts.",
    object(page),
  ),
  "palette.load": definition(
    "Load a custom atom palette through the GUI's validated parser; native paths must be scoped.",
    mutation({
      path: string,
      name: string,
      text: { type: "string", minLength: 1 },
    }),
  ),
  "palette.reset": definition(
    "Restore the bundled atom palette for this session.",
    mutation(),
  ),
  "structure.set": definition(
    "Apply biological session coloring, visibility, residue range and representation overrides.",
    mutation({
      reset: { type: "boolean", enum: [true] },
      showAll: { type: "boolean", enum: [true] },
      clearStyles: { type: "boolean", enum: [true] },
      colorMode: {
        type: "string",
        enum: COLOR_MODE_OPTIONS.map(({ value }) => value),
      },
      hiddenChains: { type: "array", items: chainIndex },
      hiddenKinds: {
        type: "array",
        maxItems: COMPONENT_KINDS.length,
        items: { type: "string", enum: [...COMPONENT_KINDS] },
      },
      isolatedChain: nullable(chainIndex),
      residueRange: nullable(
        object({ chainIndex, first: string, last: string }, [
          "chainIndex",
          "first",
          "last",
        ]),
      ),
      chainStyles: {
        type: "array",
        items: object(
          { chainIndex, representation: nullable(representation) },
          ["chainIndex", "representation"],
        ),
      },
      componentStyles: object(
        Object.fromEntries(
          COMPONENT_KINDS.map((kind) => [kind, nullable(representation)]),
        ),
      ),
    }),
  ),
  "structure.focus": definition(
    "Focus the currently visible atoms, optionally restricted to one existing chain.",
    mutation(
      {
        target: { type: "string", enum: ["visible", "chain"] },
        chainIndex,
      },
      ["target"],
    ),
  ),
  "document.open": definition(
    "Import an authorized file without hidden unsaved-change prompts.",
    mutation({
      path: string,
      name: string,
      bytes: {
        type: "array",
        items: { type: "integer", minimum: 0, maximum: 255 },
      },
      discardUnsaved: boolean,
    }),
  ),
  "document.save": definition(
    "Save a scoped native destination; overwrite:true explicitly allows atomic replacement, otherwise refuse existing outputs. Browser returns encoded bytes.",
    mutation({
      path: string,
      overwrite: boolean,
    }),
  ),
  "field.select": definition(
    "Select an existing field using the application's preview transitions.",
    mutation({ fieldId: string }, ["fieldId"]),
  ),
  "field.preview": definition(
    "Start a sampling-only volume or raycast job without meshing.",
    mutation(
      {
        fieldId: string,
        mode: { type: "string", enum: ["volume", "raycast"] },
        resolution: { type: "integer", minimum: 2 },
      },
      ["fieldId", "mode", "resolution"],
    ),
  ),
  "surfaces.generate": definition(
    "Generate orbital, density or grid meshes. Optionally color one all-electron total density surface by molecular electrostatic potential.",
    mutation(
      {
        fieldIds: { type: "array", minItems: 1, items: string },
        isovalue: { type: "number", minimum: Number.MIN_VALUE },
        electrostaticPotential: boolean,
        resolution: { type: "integer", minimum: 2 },
      },
      ["fieldIds", "isovalue", "resolution"],
    ),
  ),
  "surfaces.set_potential_appearance": definition(
    "Enable or hide the electrostatic potential colors or change the symmetric range in hartree/e. Retain the geometry and samples.",
    mutation(
      {
        surfaceId: string,
        enabled: boolean,
        range: { type: "number", minimum: Number.MIN_VALUE },
      },
      ["surfaceId"],
    ),
  ),
  "surfaces.set_visibility": definition(
    "Set one saved surface's visibility.",
    mutation({ surfaceId: string, visible: boolean }, ["surfaceId", "visible"]),
  ),
  "surfaces.remove": definition(
    "Remove one saved surface from the accepted document.",
    mutation({ surfaceId: string }, ["surfaceId"]),
  ),
  "scene.set": definition(
    "Apply document/session appearance settings, including separate AO switches for atoms and opaque SES/SAS.",
    mutation({
      mode: { type: "string", enum: ["mesh"] },
      representation: {
        type: "string",
        enum: REPRESENTATION_OPTIONS.map((x) => x.value),
      },
      positiveColor: color,
      negativeColor: color,
      opacity: { type: "number", minimum: 0, maximum: 1 },
      isovalue: { type: "number", minimum: Number.MIN_VALUE },
      shading: { type: "string", enum: ["diffuse", "blinn-phong"] },
      backgroundColor: color,
      volumeQuality: { type: "integer", enum: [1, 2, 4] },
      ambientOcclusion: object({
        enabled: boolean,
        surfaceEnabled: boolean,
        strength: { type: "number", minimum: 0, maximum: 1 },
        radiusAngstrom: { type: "number", minimum: 0.25, maximum: 50 },
        automaticRadius: boolean,
      }),
    }),
  ),
  "shader.apply": definition(
    "Apply a bundled shader preset and declared uniform values.",
    mutation(
      {
        preset: {
          type: "string",
          enum: ["surface-clip", "x-ray", "surface-phong-vertex-color"],
        },
        target: string,
        uniforms,
        transparency: boolean,
      },
      ["preset"],
    ),
  ),
  "shader.set_uniforms": definition(
    "Update only declared values of the currently applied shader.",
    mutation({ uniforms, target: string, transparency: boolean }, ["uniforms"]),
  ),
  "shader.clear": definition(
    "Clear the custom shader, preserving scientific data.",
    mutation(),
  ),
  "camera.get": definition(
    "Read the current camera in bohr coordinates.",
    object(),
  ),
  "camera.fit": definition("Fit the actual visible scene.", mutation()),
  "camera.set": definition(
    "Set finite nondegenerate position, target and optional up vectors.",
    mutation({ position: vector, target: vector, up: vector }, [
      "position",
      "target",
    ]),
  ),
  "camera.orbit": definition(
    "Orbit the current camera in degrees without changing molecular data.",
    mutation({ horizontalDegrees: number, verticalDegrees: number }, [
      "horizontalDegrees",
      "verticalDegrees",
    ]),
  ),
  "camera.zoom": definition(
    "Zoom by a positive factor; greater than one moves closer.",
    mutation({ factor: { type: "number", minimum: Number.MIN_VALUE } }, [
      "factor",
    ]),
  ),
  "image.export": definition(
    "Capture the actual final frame. Native overwrite:true explicitly allows atomic replacement; default refuses existing outputs.",
    mutation({
      path: string,
      transparent: boolean,
      overwrite: boolean,
    }),
  ),
  "job.get": definition(
    "Read an owned operation and real progress/terminal result.",
    object({ jobId: string }, ["jobId"]),
  ),
  "job.cancel": definition(
    "Cancel only this operation and await cleanup.",
    object({ jobId: string }, ["jobId"]),
  ),
};

function validate(value: unknown, schema: Schema, path = "params"): void {
  const fail = (message: string): never => {
    throw new ControlError("invalid_arguments", `${path}: ${message}`);
  };
  if (schema.anyOf) {
    for (const candidate of schema.anyOf) {
      try {
        validate(value, candidate, path);
        return;
      } catch {
        /* next declared type */
      }
    }
    fail("value does not match an allowed type");
  }
  if (schema.enum && !schema.enum.some((item) => item === value))
    fail("unsupported value");
  if (schema.type === "boolean" && typeof value !== "boolean")
    fail("expected a boolean");
  if (schema.type === "number" || schema.type === "integer") {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      (schema.type === "integer" && !Number.isSafeInteger(value))
    )
      fail(`expected a finite ${schema.type}`);
    const n = value as number;
    if (schema.minimum !== undefined && n < schema.minimum)
      fail(`minimum is ${schema.minimum}`);
    if (schema.maximum !== undefined && n > schema.maximum)
      fail(`maximum is ${schema.maximum}`);
  }
  if (schema.type === "string") {
    if (typeof value !== "string") fail("expected a string");
    const text = value as string;
    if (
      text.length < (schema.minLength ?? 0) ||
      (schema.maxLength !== undefined && text.length > schema.maxLength)
    )
      fail("string length is outside the supported bound");
    if (schema.pattern && !new RegExp(schema.pattern).test(text))
      fail("invalid string format");
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) fail("expected an array");
    const array = value as unknown[];
    if (
      array.length < (schema.minItems ?? 0) ||
      (schema.maxItems !== undefined && array.length > schema.maxItems)
    )
      fail("array length is outside the supported bound");
    if (schema.items)
      for (let index = 0; index < array.length; index++)
        validate(array[index], schema.items, `${path}[${index}]`);
  }
  if (schema.type === "object") {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null)
    )
      fail("expected a plain object");
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (
      schema.maxProperties !== undefined &&
      keys.length > schema.maxProperties
    )
      fail("too many properties");
    for (const key of schema.required ?? [])
      if (!Object.hasOwn(record, key)) fail(`missing ${key}`);
    for (const key of keys) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        fail("unsupported property name");
      const property = schema.properties?.[key];
      if (property) validate(record[key], property, `${path}.${key}`);
      else if (typeof schema.additionalProperties === "object")
        validate(record[key], schema.additionalProperties, `${path}.${key}`);
      else if (schema.additionalProperties !== true)
        fail(`unknown parameter ${key}`);
    }
  }
}

export interface ControlExecution {
  /** The app calls this synchronously at accepted publication, before unwinding. */
  markPublished(): void;
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
  inspection?: unknown;
}
export interface ControlHost {
  native: boolean;
  snapshot(): ControlSnapshot;
  viewport(): ViewportControl | null;
  synchronize(): Promise<void>;
  execute(
    method: string,
    params: Record<string, unknown>,
    execution: ControlExecution,
  ): Promise<unknown>;
}
type Status = "accepted" | "running" | "completed" | "failed" | "cancelled";
type Job = {
  jobId: string;
  status: Status;
  operation: string;
  progress?: unknown;
  result?: unknown;
  published: boolean;
  error?: ReturnType<typeof controlErrorResponse>;
  abort: AbortController;
  done: Promise<void>;
  /** Only explicitly replaceable plane work belongs to a supersession chain. */
  planeUpdate?: { id: string; document: EigenVistaDocument | null };
};
const terminal = (job: Job) =>
  ["completed", "failed", "cancelled"].includes(job.status);
const bounded = (text: string | null | undefined) => text ?? null;
export const controlIdentifier = <T extends string | null | undefined>(
  value: T,
  _name: string,
): T => value;
const identifier = controlIdentifier;
// randomUUID is secure-context-only; normal HTTP/LAN previews must still start.
const controlId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
const sameSource = (
  a: EigenVistaDocument | null,
  b: EigenVistaDocument | null,
) =>
  a === b ||
  Boolean(
    a &&
      b &&
      a.id === b.id &&
      a.title === b.title &&
      a.atoms === b.atoms &&
      a.structure === b.structure &&
      a.bonds === b.bonds &&
      a.basis === b.basis &&
      a.orbitals === b.orbitals &&
      a.densities === b.densities &&
      a.grids === b.grids &&
      a.provenance === b.provenance,
  );

export function createApplicationControl(
  getHost: () => ControlHost,
  pendingInspectionSave?: PendingInspectionSave,
) {
  const jobs = new Map<string, Job>();
  let active: Job | undefined;
  let mutating = false;
  let disposed = false;
  let instanceId = `browser-${controlId()}`;
  const getDocument = () => {
    const doc = getHost().snapshot().document;
    if (!doc)
      throw new ControlError("no_document", "No molecular document is open");
    return doc;
  };
  const viewport = () => {
    const value = getHost().viewport();
    if (!value)
      throw new ControlError(
        "unavailable",
        "The molecular renderer is not ready",
      );
    return value;
  };
  const idle = () => {
    if (mutating || getHost().snapshot().busy || (active && !terminal(active)))
      throw new ControlError(
        "busy",
        "Finish or cancel the active operation first",
      );
  };
  const checkRevision = (params: Record<string, unknown>) => {
    if (
      params.expectedRevision !== undefined &&
      params.expectedRevision !== getHost().snapshot().revision
    )
      throw new ControlError(
        "stale_document",
        "The accepted document revision has changed",
        { revision: getHost().snapshot().revision },
      );
  };
  const execution = (
    source: ControlSnapshot,
    abort: AbortController,
    progress: ControlExecution["progress"],
    strictRevision = false,
    onPublication?: () => void,
  ): ControlExecution => {
    let acceptedRevision = source.revision;
    let published = false;
    return {
      signal: abort.signal,
      progress,
      markPublished() {
        // An operation may finish session selection/focus after committing its
        // durable record. Guard that accepted revision, not its own old one.
        acceptedRevision = getHost().snapshot().revision;
        published = true;
        onPublication?.();
      },
      assertCurrent() {
        if (abort.signal.aborted && !published)
          throw new ControlError("cancelled", "Operation cancelled");
        const current = getHost().snapshot();
        if (
          (strictRevision && current.revision !== acceptedRevision) ||
          !sameSource(source.document, current.document)
        )
          throw new ControlError(
            "stale_document",
            "The source document changed before publication",
            { revision: current.revision },
          );
      },
    };
  };
  const publicJob = ({
    jobId,
    status,
    operation,
    progress,
    result,
    error,
  }: Job) => ({
    jobId,
    status,
    operation,
    ...(progress === undefined ? {} : { progress }),
    ...(result === undefined ? {} : { result }),
    ...(error ? { error } : {}),
  });
  const startJob = (method: string, params: Record<string, unknown>) => {
    const source = getHost().snapshot();
    const planeUpdate =
      method === "analysis.create" && params.supersede === true
        ? {
            id: (params.request as { id: string }).id,
            document: source.document,
          }
        : undefined;
    const previous =
      planeUpdate &&
      active?.planeUpdate?.id === planeUpdate.id &&
      sameSource(active.planeUpdate.document, source.document) &&
      !mutating
        ? active
        : undefined;
    if (!previous) idle();
    const abort = new AbortController();
    let finish!: () => void;
    const job: Job = {
      jobId: controlId(),
      operation: method,
      status: "accepted",
      abort,
      planeUpdate,
      published: false,
      done: new Promise<void>((resolve) => {
        finish = resolve;
      }),
    };
    jobs.set(job.jobId, job);
    active = job;
    // Receipt ownership is established before cancelling the old request. Its
    // finally block cannot clear a replacement's active-job reservation.
    if (previous && !previous.published) previous.abort.abort();
    queueMicrotask(async () => {
      try {
        // Even an aborted queued request waits for its predecessor to unwind.
        // The newest request therefore cannot overlap an earlier host.execute.
        if (previous) await previous.done;
        if (abort.signal.aborted)
          throw new ControlError("cancelled", "Operation cancelled");
        job.status = "running";
        const context = execution(
          source,
          abort,
          (stage, counts) => {
            job.progress = { stage, ...(counts ? { counts } : {}) };
          },
          params.expectedRevision !== undefined,
          () => {
            job.published = true;
          },
        );
        context.assertCurrent();
        job.result = await getHost().execute(method, params, context);
        if (abort.signal.aborted && !job.published)
          throw new ControlError("cancelled", "Operation cancelled");
        // Accepted publication is the cancellation boundary: a later Cancel must
        // not describe already committed geometry as retained previous results.
        job.status = "completed";
        await getHost().synchronize();
      } catch (error) {
        const failure = controlError(error);
        job.status =
          !job.published &&
          (abort.signal.aborted || failure.kind === "cancelled")
            ? "cancelled"
            : "failed";
        job.error = controlErrorResponse(
          job.published
            ? new ControlError(
                "operation_failed",
                "Operation failed after publication; committed results are retained",
                { cause: failure.message },
              )
            : job.status === "cancelled"
              ? new ControlError(
                  "cancelled",
                  "Operation cancelled; previous results retained",
                )
              : failure,
        );
        delete job.result;
      } finally {
        if (active === job) active = undefined;
        delete job.planeUpdate;
        finish();
      }
    });
    return { jobId: job.jobId, status: "accepted" as const };
  };

  return {
    setInstanceId(value: string) {
      instanceId = value;
    },
    dispose() {
      disposed = true;
      for (const job of jobs.values()) if (!terminal(job)) job.abort.abort();
    },
    async request(
      method: string,
      params: Record<string, unknown> = {},
    ): Promise<unknown> {
      // Admission precedes the first React synchronization/worker validation.
      // The GUI shares this tracker, including its coalesced input lifetime.
      const finishInspection =
        Object.hasOwn(INSPECTION_METHODS, method) &&
        !inspectionReadMethods.has(method)
          ? pendingInspectionSave?.begin()
          : undefined;
      try {
        if (disposed)
          throw new ControlError(
            "unavailable",
            "The application controller is closed",
          );
        if (!Object.hasOwn(CONTROL_METHODS, method))
          throw new ControlError(
            "method_not_found",
            `Unknown application method ${String(method)}`,
          );
        const definition =
          CONTROL_METHODS[method as keyof typeof CONTROL_METHODS];
        if (params && typeof params === "object" && !Array.isArray(params)) {
          if (
            (method === "field.select" || method === "field.preview") &&
            typeof params.fieldId === "string"
          )
            identifier(params.fieldId, "Field ID");
          if (
            (method === "surfaces.remove" ||
              method === "surfaces.set_visibility" ||
              method === "surfaces.set_potential_appearance") &&
            typeof params.surfaceId === "string"
          )
            identifier(params.surfaceId, "Surface ID");
          if (method === "surfaces.generate" && Array.isArray(params.fieldIds))
            for (const id of params.fieldIds)
              if (typeof id === "string") identifier(id, "Field ID");
        }
        validate(params, definition.inputSchema);
        if (
          params.overwrite === true &&
          ["document.save", "image.export", "table.export"].includes(method) &&
          !getHost().native
        )
          throw new ControlError(
            "invalid_arguments",
            "Replacement applies only to native file exports; browser exports return data",
          );
        if (
          method === "analysis.create" &&
          params.supersede === true &&
          (params.request as { definition: { kind: string } }).definition
            .kind !== "plane"
        )
          throw new ControlError(
            "invalid_arguments",
            "Only plane analyses support superseding updates",
          );
        if (method === "scene.set") {
          const ao = params.ambientOcclusion as
            | { automaticRadius?: boolean; radiusAngstrom?: number }
            | undefined;
          if (ao?.automaticRadius === true && ao.radiusAngstrom !== undefined)
            throw new ControlError(
              "invalid_arguments",
              "Choose either an automatic AO radius or an explicit radius, not both",
            );
        }
        if (method === "app.capabilities")
          return {
            apiVersion: 1,
            instanceId,
            methods: Object.entries(CONTROL_METHODS).map(([method, value]) => ({
              method,
              ...value,
            })),
            allocationPolicy: "allocation-driven",
            gridResolutionPresets: [...gridResolutions],
            files: {
              nativePaths: getHost().native,
              browserBytes: !getHost().native,
              overwrite: getHost().native,
            },
            errorKinds: Object.keys(ERROR_CODES),
          };
        if (method === "job.get" || method === "job.cancel") {
          const job = jobs.get(params.jobId as string);
          if (!job)
            throw new ControlError("not_found", "Unknown or expired job ID");
          if (method === "job.cancel" && !terminal(job)) {
            if (!job.published) job.abort.abort();
            await job.done;
            await getHost().synchronize();
          }
          return publicJob(job);
        }
        await getHost().synchronize();
        checkRevision(params);
        const snapshot = getHost().snapshot();
        if (method === "app.state") {
          const d = snapshot.document;
          let camera: CameraState | null = null;
          let backgroundColor: string | null = null;
          try {
            camera = viewport().getCamera();
            backgroundColor = viewport().getBackground();
          } catch {
            /* state remains available during renderer startup */
          }
          return {
            apiVersion: 1,
            instanceId,
            revision: snapshot.revision,
            document: d
              ? {
                  id: identifier(d.id, "Document ID"),
                  title: bounded(d.title),
                  atomCount: d.atoms.positions.length,
                  bondCount: d.bonds.length,
                  basisCount: d.basis.length,
                  orbitalCount: d.orbitals.length,
                  densityCount: d.densities.length,
                  gridCount: d.grids.length,
                  surfaceCount: d.surfaces.length,
                }
              : null,
            dirty: snapshot.dirty,
            busy:
              snapshot.busy || (mutating ? "Applying control operation" : ""),
            progress: snapshot.progress,
            view: d
              ? { ...d.view, field: identifier(d.view.field, "Field ID") }
              : null,
            mode: snapshot.mode,
            resolution: snapshot.resolution,
            shading: snapshot.shading,
            ambientOcclusion: snapshot.ambientOcclusion,
            shader: snapshot.shader,
            palette: snapshot.palette,
            volumeQuality: snapshot.volumeQuality,
            camera,
            backgroundColor,
            structureDisplay: snapshot.structureDisplay,
            inspection: snapshot.inspection ?? null,
          };
        }
        if (method === "fields.list") {
          const d = getDocument(),
            offset = (params.offset as number | undefined) ?? 0,
            limit = (params.limit as number | undefined) ?? 100;
          const fields = [
            ...d.orbitals.map((field) => ({ kind: "orbital" as const, field })),
            ...d.densities.map((field) => ({
              kind: "density" as const,
              field,
            })),
            ...d.grids.map((field) => ({ kind: "grid" as const, field })),
          ];
          return {
            revision: snapshot.revision,
            total: fields.length,
            offset,
            items: fields
              .slice(offset, offset + limit)
              .map(({ kind, field }) => ({
                id: identifier(field.id, "Field ID"),
                label: bounded(field.label),
                kind,
                ...(kind === "orbital"
                  ? {
                      spin: bounded(
                        (field as (typeof d.orbitals)[number]).spin,
                      ),
                      energy: (field as (typeof d.orbitals)[number]).energy,
                      occupation: (field as (typeof d.orbitals)[number])
                        .occupation,
                      energyUnits: "hartree",
                      units: "atomic units",
                    }
                  : {}),
                ...(kind === "density"
                  ? {
                      quantity: bounded(
                        (field as (typeof d.densities)[number]).kind,
                      ),
                      units: "bohr^-3",
                    }
                  : {}),
                ...(kind === "grid"
                  ? {
                      quantity: bounded(
                        (field as (typeof d.grids)[number]).quantity,
                      ),
                      units: "unspecified",
                      dims: [...(field as (typeof d.grids)[number]).dims],
                    }
                  : {}),
              })),
          };
        }
        if (method === "surfaces.list") {
          const d = getDocument();
          return {
            revision: snapshot.revision,
            total: d.surfaces.length,
            items: d.surfaces.map((s) => ({
              id: identifier(s.id, "Surface ID"),
              label: bounded(s.label),
              fieldId: identifier(s.field, "Field ID"),
              isovalue: s.isovalue,
              visible: s.visible,
              color: s.color,
              opacity: s.opacity,
              triangleCount: s.indices.length / 3,
              vertexCount: s.positions.length / 3,
              resolution: [...s.resolution],
              sourceHash: bounded(s.source_hash),
              ...(s.electrostatic_potential
                ? {
                    electrostaticPotential: {
                      enabled: s.electrostatic_potential.enabled,
                      range: s.electrostatic_potential.range,
                      units: "hartree/e",
                    },
                  }
                : {}),
            })),
          };
        }
        if (method === "structure.list") {
          const d = getDocument(),
            structure = d.structure,
            offset = (params.offset as number | undefined) ?? 0,
            limit = (params.limit as number | undefined) ?? 100;
          const counts =
            structure?.chains.map(() => ({ atomCount: 0, residueCount: 0 })) ??
            [];
          const components = Object.fromEntries(
            COMPONENT_KINDS.map((kind) => [kind, 0]),
          );
          if (structure) {
            for (const residue of structure.residues)
              counts[residue.chain].residueCount++;
            for (const index of structure.atom_residues) {
              const residue = structure.residues[index];
              counts[residue.chain].atomCount++;
              components[residue.kind]++;
            }
          }
          return {
            revision: snapshot.revision,
            total: structure?.chains.length ?? 0,
            offset,
            items:
              structure?.chains
                .slice(offset, offset + limit)
                .map((chain, i) => ({
                  id: `chain:${i + offset}`,
                  index: i + offset,
                  labelId: bounded(chain.label_id),
                  authorId: bounded(chain.author_id),
                  entityId: bounded(chain.entity_id),
                  ...counts[i + offset],
                })) ?? [],
            components,
            secondarySource: structure?.secondary_source ?? "none",
          };
        }
        if (method === "camera.get")
          return { revision: snapshot.revision, ...viewport().getCamera() };
        if (Object.hasOwn(INSPECTION_METHODS, method)) {
          getDocument();
          if (inspectionBackgroundMethods.has(method))
            return startJob(method, params);
          const writes = !inspectionReadMethods.has(method);
          if (writes) {
            idle();
            mutating = true;
          }
          try {
            const result = await getHost().execute(
              method,
              params,
              execution(
                snapshot,
                new AbortController(),
                () => {},
                params.expectedRevision !== undefined,
              ),
            );
            await getHost().synchronize();
            return result;
          } finally {
            if (writes) mutating = false;
          }
        }
        if (method === "field.preview" || method === "surfaces.generate") {
          const d = getDocument();
          const ids =
            method === "field.preview"
              ? [params.fieldId as string]
              : (params.fieldIds as string[]);
          const all = [...d.orbitals, ...d.densities, ...d.grids];
          if (
            new Set(ids).size !== ids.length ||
            ids.some((id) => !all.some((f) => f.id === id))
          )
            throw new ControlError(
              "invalid_arguments",
              "Choose distinct existing field IDs",
            );
          if (
            ids.length > 1 &&
            ids.some((id) => !d.orbitals.some((f) => f.id === id))
          )
            throw new ControlError(
              "invalid_arguments",
              "A batch may contain orbitals only; generate one supplied density/grid separately",
            );
          if (
            params.electrostaticPotential === true &&
            (ids.length !== 1 ||
              !d.densities.some(
                (density) => density.id === ids[0] && density.kind === "total",
              ))
          )
            throw new ControlError(
              "invalid_arguments",
              "Choose one all-electron total density matrix to map electrostatic potential",
            );
          return startJob(method, params);
        }
        if (method === "field.select") {
          const d = getDocument();
          if (
            ![...d.orbitals, ...d.densities, ...d.grids].some(
              (f) => f.id === params.fieldId,
            )
          )
            throw new ControlError("not_found", "Unknown field ID");
          if (
            d.view.field !== params.fieldId &&
            (snapshot.mode !== "mesh" ||
              d.grids.some((g) => g.id === params.fieldId))
          )
            return startJob(method, params);
        }
        if (
          [
            "document.open",
            "document.save",
            "field.select",
            "surfaces.remove",
            "surfaces.set_potential_appearance",
          ].includes(method) ||
          (method === "scene.set" && params.isovalue !== undefined)
        )
          idle();
        if (method === "document.save" && pendingInspectionSave?.getSnapshot())
          throw new ControlError(
            "busy",
            "An inspection edit is still being applied; wait for it to finish before saving",
          );
        if (method !== "document.open") getDocument();
        if (mutating)
          throw new ControlError(
            "busy",
            "Another application command is being applied",
          );
        mutating = true;
        try {
          const abort = new AbortController();
          const result = await getHost().execute(
            method,
            params,
            execution(
              snapshot,
              abort,
              () => {},
              method === "document.open" ||
                method === "document.save" ||
                params.expectedRevision !== undefined,
            ),
          );
          await getHost().synchronize();
          return result;
        } finally {
          mutating = false;
        }
      } catch (error) {
        throw controlError(error);
      } finally {
        finishInspection?.();
      }
    },
  };
}

export type ApplicationControl = ReturnType<typeof createApplicationControl>;
declare global {
  interface Window {
    eigenvistaControl?: Pick<ApplicationControl, "request">;
  }
}
