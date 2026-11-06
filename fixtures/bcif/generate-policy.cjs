// Generate the policy BinaryCIF with the independent Molstar 5.13.1 encoder.
// Pass the installed Molstar lib/commonjs directory as the only argument.
// This offline fixture tool is not part of the application build or test path.
const fs = require("node:fs");
const path = require("node:path");

const molstarRoot = path.resolve(process.argv[2]);
const { parseCifText } = require(
  path.join(molstarRoot, "mol-io/reader/cif/text/parser.js"),
);
const { parseCifBinary } = require(
  path.join(molstarRoot, "mol-io/reader/cif/binary/parser.js"),
);
const { CifWriter } = require(path.join(molstarRoot, "mol-io/writer/cif.js"));
const { decodeMsgPack } = require(
  path.join(molstarRoot, "mol-io/common/msgpack/decode.js"),
);

const generate = async () => {
  const text = fs.readFileSync(path.join(__dirname, "policy.cif"), "utf8");
  const parsed = await parseCifText(text).run();
  if (parsed.isError) throw new Error(parsed.message);
  const block = parsed.result.blocks[0];
  const encoder = CifWriter.createEncoder({
    binary: true,
    encoderName: "Molstar 5.13.1; EigenVista independent policy fixture",
  });
  encoder.startDataBlock(block.header);
  for (const name of block.categoryNames) {
    const category = block.categories[name];
    const fields = category.fieldNames.map((item) => {
      const field = category.getField(item);
      const params = { valueKind: (row) => field.valueKind(row) };
      if (name === "atom_site" && /^(Cartn_[xyz]|occupancy)$/.test(item)) {
        return CifWriter.Field.float(item, (row) => field.float(row), {
          ...params,
          typedArray: Float64Array,
          encoder: CifWriter.Encodings.fixedPoint3,
        });
      }
      if (name === "atom_site" && /^(id|pdbx_PDB_model_num)$/.test(item)) {
        return CifWriter.Field.int(item, (row) => field.int(row), {
          ...params,
          typedArray: Int32Array,
          encoder: CifWriter.Encodings.deltaRLE,
        });
      }
      return CifWriter.Field.str(item, (row) => field.str(row), params);
    });
    encoder.writeCategory({
      name,
      instance: () => ({
        fields,
        source: [{ data: category, rowCount: category.rowCount }],
      }),
    });
  }
  const bytes = encoder.getData();
  const binary = await parseCifBinary(bytes).run();
  if (binary.isError) throw new Error(binary.message);
  const binaryAtoms = binary.result.blocks[0].categories.atom_site;
  const textAtoms = block.categories.atom_site;
  for (const item of textAtoms.fieldNames) {
    const a = textAtoms.getField(item);
    const b = binaryAtoms.getField(item);
    for (let row = 0; row < textAtoms.rowCount; row++) {
      const numeric = /^(Cartn_[xyz]|occupancy|id|pdbx_PDB_model_num)$/.test(
        item,
      );
      const equal = numeric
        ? a.float(row) === b.float(row)
        : a.str(row) === b.str(row);
      if (!equal || a.valueKind(row) !== b.valueKind(row)) {
        throw new Error(
          `Independent policy roundtrip differs: ${item} row ${row}`,
        );
      }
    }
  }
  const packed = decodeMsgPack(bytes);
  const kinds = new Set();
  const masks = new Set();
  const visit = (chain) => {
    for (const encoding of chain) {
      kinds.add(encoding.kind);
      if (encoding.dataEncoding) visit(encoding.dataEncoding);
      if (encoding.offsetEncoding) visit(encoding.offsetEncoding);
    }
  };
  for (const category of packed.dataBlocks[0].categories) {
    for (const column of category.columns) {
      visit(column.data.encoding);
      if (column.mask) visit(column.mask.encoding);
    }
  }
  for (const item of textAtoms.fieldNames) {
    const field = binaryAtoms.getField(item);
    for (let row = 0; row < binaryAtoms.rowCount; row++)
      masks.add(field.valueKind(row));
  }
  fs.writeFileSync(path.join(__dirname, "policy.bcif"), bytes);
  console.log(
    JSON.stringify({
      encoder: packed.encoder,
      rows: binaryAtoms.rowCount,
      encodings: [...kinds].sort(),
      masks: [...masks].sort(),
      textAndBinaryColumnsAgree: true,
    }),
  );
};

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
