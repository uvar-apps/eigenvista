import { useRef, useState } from "react";
import {
  parseParams,
  serializeParams,
  defaultValue,
  defaultValues,
  parseUniforms,
  mergeUniformValues,
  isColorName,
  type UniformDef,
  type UniformValue,
} from "./shaderTools";
import { saveShaderParameters, native, pickNative } from "./files";

export interface ShaderFileState {
  name: string;
  source: string;
}

export interface ShaderEditorState {
  vertex: ShaderFileState | null;
  fragment: ShaderFileState | null;
  values: Record<string, UniformValue>;
  target: string;
}

function components(kind: UniformDef["kind"]) {
  return kind === "vec2" ? 2 : kind === "vec3" ? 3 : kind === "vec4" ? 4 : 1;
}

function toNumberArray(value: UniformValue, kind: UniformDef["kind"]) {
  if (kind === "bool") return value ? 1 : 0;
  if (kind === "float" || kind === "int") return Number(value);
  return value as number[];
}

function fromNumberArray(
  kind: UniformDef["kind"],
  nums: number[],
): UniformValue {
  if (kind === "bool") return nums[0] !== 0;
  if (kind === "int") return Math.trunc(nums[0] ?? 0);
  if (kind === "float") return nums[0] ?? 0;
  return Array.from({ length: components(kind) }, (_, i) => nums[i] ?? 0);
}

export function ShaderPanel({
  uniforms,
  state,
  surfaceOptions,
  onChange,
  onApply,
  onClear,
  status,
  error,
}: {
  uniforms: UniformDef[];
  state: ShaderEditorState;
  surfaceOptions: { id: string; label: string }[];
  onChange: (next: ShaderEditorState) => void;
  onApply: () => void;
  onClear: () => void;
  status: string;
  error: string;
}) {
  const vertexInput = useRef<HTMLInputElement>(null);
  const fragmentInput = useRef<HTMLInputElement>(null);
  const paramsInput = useRef<HTMLInputElement>(null);
  const [paramsError, setParamsError] = useState("");
  const latest = useRef({ state, onChange });
  latest.current = { state, onChange };
  const reads = useRef({ vertex: 0, fragment: 0, params: 0 });

  function publish(next: ShaderEditorState) {
    // File reads can complete before React renders the preceding update.
    latest.current.state = next;
    latest.current.onChange(next);
  }

  // One source of truth for which files each picker accepts: the browser
  // uses it as the input accept list, the native dialog uses it as the file
  // filter. Without this the native dialog filters by molecular-document
  // extensions and every shader file appears disabled (#23).
  const accept = {
    vertex: ".vert,.glsl,.vs,.txt,.frag",
    fragment: ".frag,.glsl,.fs,.txt,.vert",
    params: ".params,.txt",
  } as const;

  const extensions = (kind: keyof typeof accept) =>
    accept[kind].split(",").map((extension) => extension.slice(1));

  function changeShader(kind: "vertex" | "fragment", name: string, source: string) {
    const previous = latest.current.state;
    const previousDefs = parseUniforms(
      previous.vertex?.source ?? "", previous.fragment?.source ?? "",
    );
    const next = { ...previous, [kind]: { name, source } };
    const defs = parseUniforms(
      next.vertex?.source ?? "", next.fragment?.source ?? "",
    );
    const retained: Record<string, UniformValue> = {};
    for (const def of defs) {
      if (
        previousDefs.some((old) => old.name === def.name && old.kind === def.kind) &&
        previous.values[def.name] !== undefined
      )
        retained[def.name] = previous.values[def.name];
    }
    const values = mergeUniformValues(defs, defaultValues(defs), retained);
    publish({ ...next, values });
    setParamsError("");
  }

  async function loadShader(
    kind: "vertex" | "fragment",
    file: File | undefined,
  ) {
    if (!file) return;
    const token = ++reads.current[kind];
    try {
      const source = await file.text();
      if (token === reads.current[kind]) changeShader(kind, file.name, source);
    } catch (e) {
      if (token === reads.current[kind]) setParamsError(String(e));
    }
  }

  function applyParams(text: string) {
    try {
      const previous = latest.current.state;
      const defs = parseUniforms(
        previous.vertex?.source ?? "", previous.fragment?.source ?? "",
      );
      const values = parseParams(text, defs);
      const merged = mergeUniformValues(defs, previous.values, values);
      setParamsError("");
      publish({ ...previous, values: merged });
    } catch (e) {
      setParamsError(String(e));
    }
  }

  async function loadParams(file: File | undefined) {
    if (!file) return;
    const token = ++reads.current.params;
    try {
      const text = await file.text();
      if (token === reads.current.params) applyParams(text);
    } catch (e) {
      if (token === reads.current.params) setParamsError(String(e));
    }
  }

  async function pickNativeText(kind: "vertex" | "fragment" | "params") {
    const token = ++reads.current[kind];
    try {
      const [picked] = await pickNative(
        false,
        extensions(kind),
        kind === "params" ? "Shader parameters" : "GLSL shaders",
      );
      if (!picked || token !== reads.current[kind]) return;
      const bytes = await picked.read();
      if (token !== reads.current[kind]) return;
      const text = new TextDecoder().decode(bytes);
      if (kind === "params") applyParams(text);
      else changeShader(kind, picked.name, text);
    } catch (e) {
      if (token === reads.current[kind]) setParamsError(String(e));
    }
  }

  function chooseFile(kind: "vertex" | "fragment" | "params") {
    if (native) {
      void pickNativeText(kind).catch((e) => setParamsError(String(e)));
      return;
    }
    if (kind === "vertex") vertexInput.current?.click();
    else if (kind === "fragment") fragmentInput.current?.click();
    else paramsInput.current?.click();
  }

  async function saveParams() {
    try {
      const text = serializeParams(uniforms, state.values);
      await saveShaderParameters(text);
      setParamsError("");
    } catch (e) {
      setParamsError(String(e));
    }
  }

  function setValue(name: string, kind: UniformDef["kind"], raw: UniformValue) {
    try {
      const previous = latest.current.state;
      const values = mergeUniformValues(uniforms, previous.values, { [name]: raw });
      publish({ ...previous, values });
      setParamsError("");
    } catch (e) {
      setParamsError(String(e));
    }
  }

  const ready = !!(state.vertex && state.fragment);

  return (
    <section className="shader-panel">
      <h2>Surface shader</h2>
      <p className="empty">
        Optional vertex + fragment GLSL (classic Molekel-style or Three.js).
        Uniforms become live controls; parameters load/save as{" "}
        <code>.params</code>.
      </p>
      <div className="shader-files">
        <button type="button" onClick={() => chooseFile("vertex")}>
          {state.vertex ? state.vertex.name : "Vertex shader…"}
        </button>
        <button type="button" onClick={() => chooseFile("fragment")}>
          {state.fragment ? state.fragment.name : "Fragment shader…"}
        </button>
        <button type="button" onClick={() => chooseFile("params")}>
          Parameters file…
        </button>
      </div>
      <input
        ref={vertexInput}
        type="file"
        accept={accept.vertex}
        hidden
        data-shader-input="vertex"
        onChange={(e) => {
          void loadShader("vertex", e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={fragmentInput}
        type="file"
        accept={accept.fragment}
        hidden
        data-shader-input="fragment"
        onChange={(e) => {
          void loadShader("fragment", e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={paramsInput}
        type="file"
        accept={accept.params}
        hidden
        data-shader-input="params"
        onChange={(e) => {
          void loadParams(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <label>
        Apply to
        <select
          aria-label="Shader target surfaces"
          value={state.target}
          onChange={(e) => onChange({ ...state, target: e.target.value })}
        >
          <option value="all">All surfaces</option>
          {surfaceOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {uniforms.length > 0 && (
        <div className="shader-uniforms">
          <h3>Uniforms</h3>
          {uniforms.map((def) => {
            const value =
              state.values[def.name] ?? defaultValue(def.kind, def.name);
            if (def.kind === "bool") {
              return (
                <label key={def.name} className="shader-uniform">
                  <span>{def.name}</span>
                  <input
                    type="checkbox"
                    aria-label={def.name}
                    checked={Boolean(value)}
                    onChange={(e) =>
                      setValue(def.name, "bool", e.target.checked)
                    }
                  />
                </label>
              );
            }
            if (def.kind === "int" || def.kind === "float") {
              return (
                <label key={def.name} className="shader-uniform">
                  <span>{def.name}</span>
                  <input
                    type="number"
                    aria-label={def.name}
                    step={def.kind === "int" ? 1 : 0.01}
                    value={Number(value)}
                    onChange={(e) =>
                      setValue(
                        def.name,
                        def.kind,
                        def.kind === "int"
                          ? Math.trunc(Number(e.target.value))
                          : Number(e.target.value),
                      )
                    }
                  />
                </label>
              );
            }
            const nums = toNumberArray(value, def.kind) as number[];
            const color = isColorName(def.name) && def.kind === "vec3";
            return (
              <div key={def.name} className="shader-uniform">
                <span>{def.name}</span>
                {color ? (
                  <input
                    type="color"
                    aria-label={def.name}
                    value={
                      "#" +
                      nums
                        .map((v) =>
                          Math.round(Math.min(1, Math.max(0, v)) * 255)
                            .toString(16)
                            .padStart(2, "0"),
                        )
                        .join("")
                    }
                    onChange={(e) => {
                      const hex = e.target.value.slice(1);
                      const rgb = [0, 2, 4].map(
                        (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
                      );
                      setValue(def.name, "vec3", rgb);
                    }}
                  />
                ) : (
                  nums.map((n, i) => (
                    <input
                      key={i}
                      type="number"
                      aria-label={`${def.name}[${i}]`}
                      step={0.01}
                      value={n}
                      onChange={(e) => {
                        const next = [...nums];
                        next[i] = Number(e.target.value);
                        setValue(
                          def.name,
                          def.kind,
                          fromNumberArray(def.kind, next),
                        );
                      }}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="shader-actions">
        <button
          type="button"
          className="primary"
          disabled={!ready}
          onClick={onApply}
        >
          Apply shader
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => void saveParams()}
        >
          Save parameters
        </button>
        <button
          type="button"
          disabled={!state.vertex && !state.fragment}
          onClick={() => {
            ++reads.current.vertex;
            ++reads.current.fragment;
            ++reads.current.params;
            latest.current.state = { vertex: null, fragment: null, values: {}, target: "all" };
            setParamsError("");
            onClear();
          }}
        >
          Clear shader
        </button>
      </div>
      {status && <p className="shader-status">{status}</p>}
      {(paramsError || error) && (
        <pre className="shader-log" role="alert">
          {[paramsError, error].filter(Boolean).join("\n")}
        </pre>
      )}
    </section>
  );
}
