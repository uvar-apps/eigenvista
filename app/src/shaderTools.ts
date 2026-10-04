import * as THREE from "three";

export type UniformKind = "float" | "int" | "bool" | "vec2" | "vec3" | "vec4";

export interface UniformDef {
  name: string;
  kind: UniformKind;
}

export type UniformValue = number | boolean | number[];

export interface ShaderPair {
  vertexName: string;
  fragmentName: string;
  vertexSource: string;
  fragmentSource: string;
  uniforms: UniformDef[];
  values: Record<string, UniformValue>;
}

const UNIFORM_RE =
  /^\s*uniform\s+(float|int|bool|vec2|vec3|vec4)\s+(\w+)\s*;/gm;

export function parseUniforms(...sources: string[]): UniformDef[] {
  const found = new Map<string, UniformDef>();
  for (const source of sources) {
    UNIFORM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = UNIFORM_RE.exec(source))) {
      const kind = match[1] as UniformKind;
      const name = match[2];
      if (!found.has(name)) found.set(name, { name, kind });
    }
  }
  return [...found.values()];
}

export function defaultValue(kind: UniformKind, name: string): UniformValue {
  if (kind === "bool") return false;
  if (kind === "float") return name.toLowerCase().includes("opacity") ? 1 : 0;
  if (kind === "int") return 0;
  const size = kind === "vec2" ? 2 : kind === "vec3" ? 3 : 4;
  const base = new Array(size).fill(0);
  if (
    name.toLowerCase().includes("color") ||
    name.toLowerCase().includes("colour")
  ) {
    base.fill(1);
    if (size === 4) base[3] = 1;
  }
  return base;
}

export function defaultValues(
  defs: UniformDef[],
): Record<string, UniformValue> {
  const values: Record<string, UniformValue> = {};
  for (const def of defs) values[def.name] = defaultValue(def.kind, def.name);
  return values;
}

function tokenize(line: string): string[] {
  return line.split(/\s+/).filter(Boolean);
}

export function parseParams(text: string): Record<string, UniformValue> {
  const values: Record<string, UniformValue> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const parts = tokenize(line);
    if (parts.length < 2) continue;
    const [kind, name, ...rest] = parts;
    if (kind === "float") values[name] = Number(rest[0] ?? 0);
    else if (kind === "int") values[name] = Math.trunc(Number(rest[0] ?? 0));
    else if (kind === "bool")
      values[name] = rest[0] === "1" || rest[0]?.toLowerCase() === "true";
    else if (kind === "vec2" || kind === "vec3" || kind === "vec4") {
      const size = kind === "vec2" ? 2 : kind === "vec3" ? 3 : 4;
      values[name] = Array.from({ length: size }, (_, i) =>
        Number(rest[i] ?? 0),
      );
    }
  }
  return values;
}

export function serializeParams(
  defs: UniformDef[],
  values: Record<string, UniformValue>,
): string {
  const lines: string[] = [];
  for (const def of defs) {
    const value = values[def.name] ?? defaultValue(def.kind, def.name);
    if (def.kind === "bool") lines.push(`bool ${def.name}\t${value ? 1 : 0}`);
    else if (def.kind === "int")
      lines.push(`int ${def.name}\t${Math.trunc(Number(value))}`);
    else if (def.kind === "float")
      lines.push(`float ${def.name}\t${Number(value)}`);
    else {
      const parts = (value as number[]).map((v) => String(v)).join(" ");
      lines.push(`${def.kind} ${def.name}\t${parts}`);
    }
  }
  return lines.join("\n") + "\n";
}

export function isColorName(name: string): boolean {
  return /colou?r/i.test(name) && !name.startsWith("gl_");
}

function stripVersion(source: string): string {
  return source.replace(/^\s*#version[^\n]*\n?/m, "");
}

function usesClassicGlsl(source: string): boolean {
  return /ftransform\s*\(|\bgl_Vertex\b|\bgl_ModelViewMatrix\b|\bgl_NormalMatrix\b|\bgl_Color\b|\bgl_ProjectionMatrix\b/.test(
    source,
  );
}

/** Names Three.js (or our preamble) already defines in ShaderMaterial. */
const RESERVED = new Set([
  "position",
  "normal",
  "uv",
  "aColor",
  "modelMatrix",
  "modelViewMatrix",
  "projectionMatrix",
  "viewMatrix",
  "normalMatrix",
  "cameraPosition",
  "isOrthographic",
]);

function renameReservedDeclarations(source: string): string {
  let out = source;
  for (const name of RESERVED) {
    const decl = new RegExp(
      `\\b(varying|attribute|uniform)\\s+(\\w+)\\s+${name}\\s*;`,
      "g",
    );
    if (!decl.test(out)) continue;
    decl.lastIndex = 0;
    out = out.replace(decl, `$1 $2 user_${name};`);
    out = out.replace(new RegExp(`\\b${name}\\b`, "g"), `user_${name}`);
  }
  return out;
}

/** Map desktop GLSL 1.10 / VTK-style built-ins onto Three.js ShaderMaterial. */
export function prepareVertexSource(source: string): string {
  let body = stripVersion(source);
  const classic = usesClassicGlsl(body);
  if (classic) body = renameReservedDeclarations(body);
  if (!classic) return body;
  // Writable aliases so assignments like `gl_ClipVertex = ...` compile.
  return `attribute vec3 aColor;
vec4 clipVertexCompat;
float fogFragCoordCompat;
#define gl_Vertex vec4(position, 1.0)
#define gl_Normal normal
#define gl_Color vec4(aColor, 1.0)
#define gl_ModelViewMatrix modelViewMatrix
#define gl_ProjectionMatrix projectionMatrix
#define gl_ModelViewProjectionMatrix (projectionMatrix * modelViewMatrix)
#define gl_NormalMatrix normalMatrix
#define gl_ClipVertex clipVertexCompat
#define gl_FogFragCoord fogFragCoordCompat
vec4 ftransform() { return projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
${body}`;
}

export function prepareFragmentSource(source: string): string {
  const body = stripVersion(source);
  return renameReservedDeclarations(body);
}

function toUniformValue(
  kind: UniformKind,
  value: UniformValue,
): THREE.IUniform["value"] {
  if (kind === "bool") return Boolean(value);
  if (kind === "int") return Math.trunc(Number(value));
  if (kind === "float") return Number(value);
  const nums = (value as number[]).map(Number);
  if (kind === "vec2") return new THREE.Vector2(nums[0] ?? 0, nums[1] ?? 0);
  if (kind === "vec3")
    return new THREE.Vector3(nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0);
  return new THREE.Vector4(
    nums[0] ?? 0,
    nums[1] ?? 0,
    nums[2] ?? 0,
    nums[3] ?? 1,
  );
}

export function buildSurfaceMaterial(
  pair: ShaderPair,
  surface: { color: string; opacity: number },
): THREE.ShaderMaterial {
  const uniforms: Record<string, THREE.IUniform> = {};
  for (const def of pair.uniforms) {
    const value = pair.values[def.name] ?? defaultValue(def.kind, def.name);
    uniforms[def.name] = { value: toUniformValue(def.kind, value) };
  }
  return new THREE.ShaderMaterial({
    transparent: surface.opacity < 1,
    side: THREE.DoubleSide,
    depthWrite: surface.opacity >= 1,
    uniforms,
    vertexShader: prepareVertexSource(pair.vertexSource),
    fragmentShader: prepareFragmentSource(pair.fragmentSource),
  });
}

export function applyUniformValues(
  material: THREE.ShaderMaterial,
  defs: UniformDef[],
  values: Record<string, UniformValue>,
) {
  for (const def of defs) {
    const uniform = material.uniforms[def.name];
    if (!uniform) continue;
    const value = values[def.name] ?? defaultValue(def.kind, def.name);
    if (def.kind === "vec2" && uniform.value instanceof THREE.Vector2) {
      const nums = value as number[];
      uniform.value.set(nums[0] ?? 0, nums[1] ?? 0);
    } else if (def.kind === "vec3" && uniform.value instanceof THREE.Vector3) {
      const nums = value as number[];
      uniform.value.set(nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0);
    } else if (def.kind === "vec4" && uniform.value instanceof THREE.Vector4) {
      const nums = value as number[];
      uniform.value.set(nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0, nums[3] ?? 1);
    } else {
      uniform.value = toUniformValue(def.kind, value);
    }
  }
}

export function attachSurfaceColors(
  geometry: THREE.BufferGeometry,
  color: string,
  vertexCount: number,
) {
  const c = new THREE.Color(color);
  const data = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    data[i * 3] = c.r;
    data[i * 3 + 1] = c.g;
    data[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("aColor", new THREE.BufferAttribute(data, 3));
}

export function mergeUniformValues(
  defs: UniformDef[],
  values: Record<string, UniformValue>,
  patch: Record<string, UniformValue>,
): Record<string, UniformValue> {
  const next = { ...values };
  for (const def of defs) {
    if (patch[def.name] !== undefined) next[def.name] = patch[def.name];
  }
  return next;
}

/**
 * Force-compile a surface material and collect WebGL/Three.js log lines.
 * Uses Three's `debug.onShaderError` plus console capture; logs are also
 * left on the console for debugging.
 */
export function validateShaderMaterial(
  renderer: THREE.WebGLRenderer,
  material: THREE.ShaderMaterial,
): string[] {
  const messages: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  const previousOnShaderError = renderer.debug.onShaderError;
  const capture =
    (original: (...args: unknown[]) => void) =>
    (...args: unknown[]) => {
      const text = args
        .map((a) => {
          if (typeof a === "string") return a;
          if (a instanceof Error) return a.stack || a.message;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
      if (text.trim()) messages.push(text);
      original.apply(console, args as []);
    };
  console.error = capture(originalError);
  console.warn = capture(originalWarn);
  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    const parts = [
      gl.getProgramInfoLog(program) || "",
      gl.getShaderInfoLog(vs) || "",
      gl.getShaderInfoLog(fs) || "",
    ].filter((s) => s.trim());
    messages.push(parts.join("\n") || "Shader failed to compile or link");
  };
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    camera.position.z = 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
    );
    geometry.setAttribute(
      "aColor",
      new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3),
    );
    const probe = new THREE.Mesh(geometry, material);
    probe.frustumCulled = false;
    scene.add(probe);
    try {
      renderer.render(scene, camera);
    } catch (error) {
      messages.push(String(error));
    }
    geometry.dispose();
    const diagnostics = (
      material as THREE.ShaderMaterial & {
        program?: { diagnostics?: { runnable?: boolean; programLog?: string } };
      }
    ).program?.diagnostics;
    if (diagnostics && diagnostics.runnable === false) {
      messages.push(diagnostics.programLog || "Shader program is not runnable");
    }
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
    renderer.debug.onShaderError = previousOnShaderError;
  }
  return messages;
}

/** Compact shader log for UI display (drop GPU stall noise). */
export function formatShaderLog(messages: string[]): string {
  const unique = [
    ...new Set(
      messages
        .map((m) => m.trim())
        .filter(Boolean)
        .filter((m) => !/GPU stall|ReadPixels/i.test(m)),
    ),
  ];
  if (!unique.length) return "";
  return unique
    .map((m) =>
      m
        .replace(/^THREE\.WebGLProgram:\s*/i, "")
        .replace(/^Error:\s*/i, "")
        .trim(),
    )
    .join("\n");
}
