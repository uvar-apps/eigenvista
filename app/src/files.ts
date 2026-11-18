import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { trackNativeSave } from "./nativeSaveActivity";
import { makeNativeTransfer } from "./nativeTransfer";

export const native = isTauri();
export const molecularExtensions =
  ".eigenvista,.molekel,.xyz,.pdb,.cif,.mcif,.pdbx,.bcif,.gz,.cube,.cub,.molden,.molf,.input";
export interface SourceFile {
  name: string;
  path?: string;
  read: () => Promise<Uint8Array>;
}
export function browserSource(file: File): SourceFile {
  return {
    name: file.name,
    read: async () => {
      return new Uint8Array(await file.arrayBuffer());
    },
  };
}
export async function pickNative(
  multiple = false,
  extensions?: string[],
  label = "Molecular documents",
): Promise<SourceFile[]> {
  const selection = await open({
    multiple,
    filters: [
      {
        name: label,
        extensions:
          extensions ??
          molecularExtensions.split(",").map((extension) => extension.slice(1)),
      },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (!selection) return [];
  return (Array.isArray(selection) ? selection : [selection]).map((path) => ({
    name: path.split(/[\\/]/).pop()!,
    path,
    read: () => readFile(path),
  }));
}
export async function saveBytes(
  bytes: Uint8Array,
  name: string,
  protectedPaths: string[] = [],
) {
  if (native) {
    return trackNativeSave(() =>
      invoke<boolean>(
        "save_native",
        makeNativeTransfer(bytes, {
          name,
          protectedPaths,
        }),
      ),
    );
  } else {
    const url = URL.createObjectURL(
      new Blob([bytes.slice().buffer], { type: "application/octet-stream" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return true;
}

export async function saveShaderParameters(text: string) {
  if (native)
    return trackNativeSave(() =>
      invoke<boolean>("save_shader_parameters", { text }),
    );
  return saveBytes(new TextEncoder().encode(text), "surface-shader.params");
}
