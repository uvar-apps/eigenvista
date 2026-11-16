import clipVertex from "../../shaders/surface-clip.vert?raw";
import clipFragment from "../../shaders/surface-clip.frag?raw";
import clipParameters from "../../shaders/surface-clip.params?raw";
import xrayVertex from "../../../shaders/x-ray.vert?raw";
import xrayFragment from "../../../shaders/x-ray.frag?raw";
import xrayParameters from "../../../shaders/x-ray.params?raw";
import { defaultValues, mergeUniformValues, parseParams, parseUniforms, type ShaderPair, type UniformValue } from "../shaderTools";
import { ControlError } from "../control";

export function updateDeclaredUniforms(pair: ShaderPair, patch: Record<string, UniformValue>) {
  for (const key of Object.keys(patch))
    if (!pair.uniforms.some((definition) => definition.name === key))
      throw new ControlError("invalid_arguments", `Unknown shader uniform ${key}`);
  try { return mergeUniformValues(pair.uniforms, pair.values, patch); }
  catch (error) { throw new ControlError("invalid_arguments", error instanceof Error ? error.message : String(error)); }
}

export function controlPreset(name: "surface-clip" | "x-ray", patch: Record<string, UniformValue> = {}, transparent?: boolean): ShaderPair & { target: string } {
  const vertexSource = name === "surface-clip" ? clipVertex : xrayVertex;
  const fragmentSource = name === "surface-clip" ? clipFragment : xrayFragment;
  const definitions = parseUniforms(vertexSource, fragmentSource);
  const values = mergeUniformValues(definitions, defaultValues(definitions), parseParams(name === "surface-clip" ? clipParameters : xrayParameters, definitions));
  const pair = { vertexName: `${name}.vert`, fragmentName: `${name}.frag`, vertexSource,
    fragmentSource, uniforms: definitions, values, target: "all", transparent: transparent ?? name === "x-ray" };
  return { ...pair, values: updateDeclaredUniforms(pair, patch) };
}
