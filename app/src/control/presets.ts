import clipVertex from "../../shaders/surface-clip.vert?raw";
import clipFragment from "../../shaders/surface-clip.frag?raw";
import clipParameters from "../../shaders/surface-clip.params?raw";
import xrayVertex from "../../../shaders/x-ray.vert?raw";
import xrayFragment from "../../../shaders/x-ray.frag?raw";
import xrayParameters from "../../../shaders/x-ray.params?raw";
import phongVertex from "../../shaders/surface-phong-vertex-color.vert?raw";
import phongFragment from "../../shaders/surface-phong-vertex-color.frag?raw";
import {
  defaultValues,
  mergeUniformValues,
  parseParams,
  parseUniforms,
  type ShaderPair,
  type UniformValue,
} from "../shaderTools";
import { ControlError } from "../control";

export function updateDeclaredUniforms(
  pair: ShaderPair,
  patch: Record<string, UniformValue>,
) {
  for (const key of Object.keys(patch))
    if (!pair.uniforms.some((definition) => definition.name === key))
      throw new ControlError(
        "invalid_arguments",
        `Unknown shader uniform ${key}`,
      );
  try {
    return mergeUniformValues(pair.uniforms, pair.values, patch);
  } catch (error) {
    throw new ControlError(
      "invalid_arguments",
      error instanceof Error ? error.message : String(error),
    );
  }
}

const presets = {
  "surface-clip": {
    vertexSource: clipVertex,
    fragmentSource: clipFragment,
    parameters: clipParameters,
    transparency: false,
  },
  "x-ray": {
    vertexSource: xrayVertex,
    fragmentSource: xrayFragment,
    parameters: xrayParameters,
    transparency: true,
  },
  "surface-phong-vertex-color": {
    vertexSource: phongVertex,
    fragmentSource: phongFragment,
    parameters: "",
    transparency: true,
  },
};

export type SurfaceShaderPreset = keyof typeof presets;

export function usesVertexColorPhong(pair: ShaderPair) {
  return (
    pair.vertexSource === phongVertex && pair.fragmentSource === phongFragment
  );
}

export function controlPreset(
  name: SurfaceShaderPreset,
  patch: Record<string, UniformValue> = {},
  transparent?: boolean,
): ShaderPair & { target: string } {
  const { vertexSource, fragmentSource, parameters, transparency } =
    presets[name];
  const definitions = parseUniforms(vertexSource, fragmentSource);
  const values = mergeUniformValues(
    definitions,
    defaultValues(definitions),
    parseParams(parameters, definitions),
  );
  const pair = {
    vertexName: `${name}.vert`,
    fragmentName: `${name}.frag`,
    vertexSource,
    fragmentSource,
    uniforms: definitions,
    values,
    target: "all",
    transparent: transparent ?? transparency,
  };
  return { ...pair, values: updateDeclaredUniforms(pair, patch) };
}
