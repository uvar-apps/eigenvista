/** Native document IPC: EVT1, u64 little-endian JSON byte length, UTF-8 JSON,
 * then the unchanged archive bytes. Binary data never becomes JSON numbers. */
export function makeNativeTransfer(
  bytes: Uint8Array,
  metadata: Record<string, unknown>,
): Uint8Array {
  let json: string;
  try {
    json = JSON.stringify(metadata);
    if (typeof json !== "string")
      throw new TypeError("Native transfer metadata must serialize to JSON");
  } catch (cause) {
    throw new Error(
      `Cannot serialize native transfer metadata: ${String(cause)}`,
      {
        cause,
      },
    );
  }
  try {
    const encoded = new TextEncoder().encode(json);
    const payloadOffset = 12 + encoded.byteLength;
    const byteLength = payloadOffset + bytes.byteLength;
    if (
      !Number.isSafeInteger(payloadOffset) ||
      !Number.isSafeInteger(byteLength)
    )
      throw new RangeError(
        "Native transfer byte length exceeds the JavaScript address representation",
      );
    const frame = new Uint8Array(byteLength);
    frame.set([0x45, 0x56, 0x54, 0x31]);
    new DataView(frame.buffer).setBigUint64(
      4,
      BigInt(encoded.byteLength),
      true,
    );
    frame.set(encoded, 12);
    frame.set(bytes, payloadOffset);
    return frame;
  } catch (cause) {
    throw new Error(
      `Cannot create native document transfer: ${String(cause)}`,
      {
        cause,
      },
    );
  }
}
