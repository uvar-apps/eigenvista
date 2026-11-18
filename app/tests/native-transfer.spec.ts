import { expect, test, type Page } from "@playwright/test";
import { installNativeIpc, type NativeIpcWindow } from "./nativeIpc";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(page.getByRole("alert")).toHaveCount(0);
}

async function nativeCall<T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
) {
  return (await page.evaluate(
    ({ method, params }) =>
      (window as unknown as NativeIpcWindow).nativeIpc.requestControl(
        method,
        params,
      ),
    { method, params },
  )) as T;
}

test("binary transfer frames contain exact view bytes and complete Unicode metadata", async ({
  page,
}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const module = "/src/nativeTransfer.ts";
    const { makeNativeTransfer } = await import(/* @vite-ignore */ module);
    const source = new Uint8Array([99, 0, 1, 254, 255, 0, 88]);
    const metadata = {
      name: "分子–é🧪.eigenvista",
      protectedPaths: Array.from(
        { length: 130 },
        (_, i) => `/模型/${i}-${"é🧪".repeat(30)}.cube`,
      ),
    };
    const json = JSON.stringify(metadata);
    const expectedLength = new TextEncoder().encode(json).byteLength;
    const frame: Uint8Array = makeNativeTransfer(
      source.subarray(1, 6),
      metadata,
    );
    const length = Number(
      new DataView(
        frame.buffer,
        frame.byteOffset,
        frame.byteLength,
      ).getBigUint64(4, true),
    );
    return {
      prefix: Array.from(frame.subarray(0, 4)),
      length,
      expectedLength,
      jsonCharacters: json.length,
      metadata: JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          frame.subarray(12, 12 + length),
        ),
      ),
      expectedMetadata: metadata,
      archive: Array.from(frame.subarray(12 + length)),
      byteLength: frame.byteLength,
      unchangedSource: Array.from(source),
    };
  });
  expect(result.prefix).toEqual([69, 86, 84, 49]);
  expect(result.length).toBe(result.expectedLength);
  expect(result.length).toBeGreaterThan(result.jsonCharacters);
  expect(result.metadata).toEqual(result.expectedMetadata);
  expect(result.archive).toEqual([0, 1, 254, 255, 0]);
  expect(result.byteLength).toBe(12 + result.expectedLength + 5);
  expect(result.unchangedSource).toEqual([99, 0, 1, 254, 255, 0, 88]);
});

test("metadata serialization and detached archive failures surface their real errors", async ({
  page,
}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const module = "/src/nativeTransfer.ts";
    const { makeNativeTransfer } = await import(/* @vite-ignore */ module);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    let serialization = "",
      detached = "";
    try {
      makeNativeTransfer(new Uint8Array([1]), cyclic);
    } catch (error) {
      serialization = String(error);
    }
    const bytes = new Uint8Array([1, 2, 3]);
    structuredClone(bytes.buffer, { transfer: [bytes.buffer] });
    try {
      makeNativeTransfer(bytes, { name: "detached", protectedPaths: [] });
    } catch (error) {
      detached = String(error);
    }
    return { serialization, detached };
  });
  expect(result.serialization).toContain(
    "Cannot serialize native transfer metadata",
  );
  expect(result.serialization).toMatch(/cyclic|circular/i);
  expect(result.detached).toContain("Cannot create native document transfer");
  expect(result.detached).toMatch(/detached|neuter/i);
});

test("native saveBytes sends raw frames and clears save activity after allocation failure or cancellation", async ({
  page,
}) => {
  await installNativeIpc(page, { saveOutcome: "cancelled" });
  await ready(page);
  const result = await page.evaluate(async () => {
    const fileModule = "/src/files.ts",
      activityModule = "/src/nativeSaveActivity.ts";
    const { saveBytes } = await import(/* @vite-ignore */ fileModule);
    const { hasNativeSave } = await import(/* @vite-ignore */ activityModule);
    const bytes = new Uint8Array([0, 80, 75, 255]);
    const Original = window.Uint8Array;
    let failure = "";
    try {
      window.Uint8Array = new Proxy(Original, {
        construct() {
          throw new RangeError("Deliberate native allocation failure");
        },
      });
      await saveBytes(bytes, "allocation.eigenvista", []);
    } catch (error) {
      failure = String(error);
    } finally {
      window.Uint8Array = Original;
    }
    const afterFailure = hasNativeSave();
    const saved = await saveBytes(bytes, "分子.eigenvista", [
      "/source/轨道.cube",
    ]);
    return {
      failure,
      afterFailure,
      saved,
      afterCancel: hasNativeSave(),
      saves: (window as unknown as NativeIpcWindow).nativeIpc.saves,
    };
  });
  expect(result.failure).toContain("Deliberate native allocation failure");
  expect(result.afterFailure).toBe(false);
  expect(result.saved).toBe(false);
  expect(result.afterCancel).toBe(false);
  expect(result.saves).toEqual([
    {
      bytes: [0, 80, 75, 255],
      name: "分子.eigenvista",
      protectedPaths: ["/source/轨道.cube"],
    },
  ]);
});

async function nativeDocument(page: Page) {
  await installNativeIpc(page, { controlEnabled: true });
  await ready(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.controlReady,
      ),
    )
    .toBe(true);
  const path = "/source/分子–é🧪.xyz";
  await page.evaluate((path) => {
    (window as unknown as NativeIpcWindow).nativeIpc.files[path] = Array.from(
      new TextEncoder().encode(
        "2\nNative binary molecule\nO 0 0 0\nH 0 0 0.96\n",
      ),
    );
  }, path);
  await nativeCall(page, "document.open", { path });
  return path;
}

test("native controller saves actual encoded documents with protected paths and no-overwrite metadata", async ({
  page,
}) => {
  const source = await nativeDocument(page);
  const before = await nativeCall<{ revision: number; dirty: boolean }>(
    page,
    "app.state",
  );
  expect(before.dirty).toBe(true);
  const destination = "/exports/分子–é🧪.eigenvista";
  const receipt = await nativeCall<{
    saved: boolean;
    current: boolean;
    bytes: number;
    snapshotRevision: number;
  }>(page, "document.save", { path: destination, overwrite: false });
  expect(receipt.saved).toBe(true);
  expect(receipt.current).toBe(true);
  expect(receipt.snapshotRevision).toBe(before.revision);
  const result = await page.evaluate(async () => {
    const saves = (window as unknown as NativeIpcWindow).nativeIpc.controlSaves;
    if (saves.length !== 1)
      throw new Error("Expected one native controller save");
    const wasmModule = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ wasmModule);
    await core.default();
    const document = JSON.parse(core.decode(new Uint8Array(saves[0].bytes)));
    return {
      save: saves[0],
      title: document.title,
      atoms: document.atoms.positions.length,
    };
  });
  expect(result.save.path).toBe(destination);
  expect(result.save.protectedPaths).toEqual([source]);
  expect(result.save.overwrite).toBe(false);
  expect(result.save.bytes.slice(0, 4)).toEqual([80, 75, 3, 4]);
  expect(result.save.bytes.length).toBe(receipt.bytes);
  expect(result.title).toBe("Native binary molecule");
  expect(result.atoms).toBe(2);
  expect((await nativeCall<{ dirty: boolean }>(page, "app.state")).dirty).toBe(
    false,
  );
});

test("native controller write failures retain dirty state and clear save activity", async ({
  page,
}) => {
  await nativeDocument(page);
  await page.evaluate(() => {
    (window as unknown as NativeIpcWindow).nativeIpc.saveOutcome = "failed";
  });
  await expect(
    nativeCall(page, "document.save", { path: "/exports/failed.eigenvista" }),
  ).rejects.toThrow("Deliberate native write failure");
  const state = await nativeCall<{ dirty: boolean; busy: string }>(
    page,
    "app.state",
  );
  expect(state.dirty).toBe(true);
  expect(state.busy).toBe("");
  expect(
    await page.evaluate(async () => {
      const module = "/src/nativeSaveActivity.ts";
      return (await import(/* @vite-ignore */ module)).hasNativeSave();
    }),
  ).toBe(false);
});

test("browser document.save continues returning archive bytes without native IPC", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const saved = await page.evaluate(async () => {
    const api = window.eigenvistaControl!;
    await api.request("scene.set", { representation: "space-fill" });
    const result = (await api.request("document.save")) as {
      bytes: number[];
      byteLength: number;
      saved: boolean;
    };
    const state = (await api.request("app.state")) as { dirty: boolean };
    return { ...result, dirty: state.dirty };
  });
  expect(Array.isArray(saved.bytes)).toBe(true);
  expect(saved.bytes.slice(0, 4)).toEqual([80, 75, 3, 4]);
  expect(saved.byteLength).toBe(saved.bytes.length);
  expect(saved.saved).toBe(false);
  expect(saved.dirty).toBe(true);
});
