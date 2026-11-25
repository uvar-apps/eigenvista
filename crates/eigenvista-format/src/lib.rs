use eigenvista_core::{Document, Result};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, HashSet},
    io::{Cursor, Write},
};
use zip::{CompressionMethod, ZipArchive, ZipWriter, write::SimpleFileOptions};

mod buffer;
#[cfg(not(target_arch = "wasm32"))]
pub mod native;
#[cfg(test)]
mod preflight_tests;
mod typed;

const PROFILE: &str = "eigenvista-preview-polynomial-v1";
const LEGACY_PROFILE: &str = "molekel-preview-polynomial-v1";
const BIO_PROFILE: &str = "eigenvista-biological-structure-v1";
const ANNOTATIONS_PROFILE: &str = "eigenvista-annotations-v1";
const MOLECULAR_SURFACES_PROFILE: &str = "eigenvista-molecular-surfaces-v1";
const FIELD_ANALYSIS_PROFILE: &str = "eigenvista-field-analysis-v1";
const ELECTROSTATIC_POTENTIAL_PROFILE: &str = "eigenvista-electrostatic-potential-v1";

/// Exact ordered capabilities reject unknown/duplicate flags and require each
/// optional scientific payload to declare its interpretation explicitly.
fn required_features(document: &Value) -> Vec<String> {
    let mut features = vec![PROFILE.into()];
    for (key, feature) in [
        ("structure", BIO_PROFILE),
        ("annotations", ANNOTATIONS_PROFILE),
        ("molecular_surfaces", MOLECULAR_SURFACES_PROFILE),
        ("field_analysis", FIELD_ANALYSIS_PROFILE),
    ] {
        if document.get(key).is_some_and(|value| !value.is_null()) {
            features.push(feature.into());
        }
    }
    if document["surfaces"].as_array().is_some_and(|surfaces| {
        surfaces
            .iter()
            .any(|surface| !surface["electrostatic_potential"].is_null())
    }) {
        features.push(ELECTROSTATIC_POTENTIAL_PROFILE.into());
    }
    features
}

#[derive(Serialize, Deserialize)]
struct Array {
    dtype: String,
    shape: Vec<usize>,
    entry: String,
    bytes: usize,
    sha256: String,
}
#[derive(Serialize, Deserialize)]
struct Manifest {
    format: String,
    version: [u32; 2],
    required_features: Vec<String>,
    coordinate_unit: String,
    arrays: BTreeMap<String, Array>,
    document: Value,
}

fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

struct PreparedDocument {
    manifest: Vec<u8>,
    entries: Vec<(String, Vec<u8>)>,
}

// Publication and Save use the same typed packing and exact manifest accounting.
// The existing preview layout, numeric bits and source hashes remain unchanged.
fn preflight(doc: &Document) -> Result<PreparedDocument> {
    doc.validate()?;
    let typed::PackedDocument {
        document,
        arrays,
        entries,
    } = typed::pack(doc)?;
    let required_features = required_features(&document);
    let manifest = Manifest {
        format: "eigenvista".into(),
        version: [0, 1],
        required_features,
        coordinate_unit: "bohr".into(),
        arrays,
        document,
    };
    let mut bytes = buffer::Buffer::default();
    serde_json::to_writer(&mut bytes, &manifest).map_err(|e| e.to_string())?;
    let manifest = bytes.into_inner();
    Ok(PreparedDocument { manifest, entries })
}

/// Validate scientific inputs and saved-surface identity using fallible native packing.
///
/// Builds the same uncompressed entries and manifest as `encode`, without ZIP
/// construction or compression. Retained scientific inputs and meshes are still
/// visited, serialized and hashed; this is not a constant-cost mesh-only check.
pub fn validate_document(doc: &Document) -> Result<()> {
    preflight(doc).map(|_| ())
}

pub fn encode(doc: &Document) -> Result<Vec<u8>> {
    encode_prepared(preflight(doc)?)
}

fn encode_prepared(prepared: PreparedDocument) -> Result<Vec<u8>> {
    let PreparedDocument { manifest, entries } = prepared;
    let mut zip = ZipWriter::new(buffer::Buffer::default());
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    zip.start_file(
        "manifest.json",
        options.large_file(manifest.len() as u64 > u32::MAX as u64),
    )
    .map_err(|e| e.to_string())?;
    zip.write_all(&manifest).map_err(|e| e.to_string())?;
    for (name, bytes) in entries {
        zip.start_file(
            name,
            options.large_file(bytes.len() as u64 > u32::MAX as u64),
        )
        .map_err(|e| e.to_string())?;
        zip.write_all(&bytes).map_err(|e| e.to_string())?;
    }
    Ok(zip.finish().map_err(|e| e.to_string())?.into_inner())
}

fn reshape(values: Vec<Value>, shape: &[usize]) -> Result<Value> {
    fn rows(values: &mut impl Iterator<Item = Value>, shape: &[usize]) -> Result<Value> {
        let mut row = Vec::new();
        row.try_reserve_exact(shape[0])
            .map_err(|_| "Cannot allocate native array rows")?;
        for _ in 0..shape[0] {
            row.push(if shape.len() == 1 {
                values.next().ok_or("Native array shape mismatch")?
            } else {
                rows(values, &shape[1..])?
            });
        }
        Ok(Value::Array(row))
    }
    if shape.len() == 1 {
        return Ok(Value::Array(values));
    }
    rows(&mut values.into_iter(), shape)
}
fn unpack(
    v: &mut Value,
    arrays: &mut BTreeMap<String, Value>,
    referenced: &mut HashSet<String>,
) -> Result<()> {
    if let Some(id) = v.get("$array") {
        let id = id.as_str().ok_or("Invalid array reference")?.to_owned();
        let object = v.as_object().ok_or("Malformed array reference")?;
        if let Some(index) = object.get("$index") {
            if object.len() != 2 {
                return Err("Malformed column reference".into());
            }
            let index = usize::try_from(index.as_u64().ok_or("Invalid column index")?)
                .map_err(|_| "Column index out of range")?;
            let column = arrays
                .get_mut(&id)
                .ok_or("Unknown or multiply referenced array")?;
            let rows = column
                .as_array_mut()
                .ok_or("Column reference target is not an array")?;
            let Some(slot) = rows.get_mut(index) else {
                return Err("Column index out of range".into());
            };
            if slot.is_null() {
                return Err("Column row already consumed".into());
            }
            *v = std::mem::replace(slot, Value::Null);
            referenced
                .try_reserve(1)
                .map_err(|_| "Cannot allocate native array reference set")?;
            referenced.insert(id);
        } else {
            if object.len() != 1 {
                return Err("Malformed array reference".into());
            }
            *v = arrays
                .remove(&id)
                .ok_or("Unknown or multiply referenced array")?;
            referenced
                .try_reserve(1)
                .map_err(|_| "Cannot allocate native array reference set")?;
            referenced.insert(id);
        }
    } else {
        match v {
            Value::Array(a) => {
                for v in a {
                    unpack(v, arrays, referenced)?;
                }
            }
            Value::Object(o) => {
                for v in o.values_mut() {
                    unpack(v, arrays, referenced)?;
                }
            }
            _ => {}
        }
    }
    Ok(())
}

pub fn decode(bytes: &[u8]) -> Result<Document> {
    let mut zip = ZipArchive::new(Cursor::new(bytes)).map_err(|e| e.to_string())?;
    let mut names = HashSet::new();
    for i in 0..zip.len() {
        let file = zip.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name();
        names
            .try_reserve(1)
            .map_err(|_| "Cannot allocate native ZIP entry names")?;
        names
            .try_reserve(1)
            .map_err(|_| "Cannot allocate ZIP entry directory")?;
        if name.starts_with('/')
            || name.contains('\\')
            || name
                .split('/')
                .any(|s| s.is_empty() || s == ".." || s == ".")
            || !names.insert(name.to_owned())
            || file.unix_mode().is_some_and(|m| m & 0o170000 == 0o120000)
            || ![CompressionMethod::Stored, CompressionMethod::Deflated]
                .contains(&file.compression())
        {
            return Err("Unsafe, duplicate, or unsupported ZIP entry".into());
        }
    }
    let manifest_file = zip
        .by_name("manifest.json")
        .map_err(|_| "Missing manifest.json")?;
    // Grow from bytes actually produced by decompression rather than trusting a
    // declared uncompressed size, and read through EOF to verify the ZIP CRC.
    let manifest_bytes = buffer::read(manifest_file)?;
    let mut manifest: Manifest =
        serde_json::from_slice(&manifest_bytes).map_err(|e| e.to_string())?;
    let expected_features = required_features(&manifest.document);
    let supported_profile = match manifest.format.as_str() {
        "eigenvista" => manifest.required_features == expected_features,
        "molekel" => {
            expected_features == [PROFILE] && manifest.required_features == [LEGACY_PROFILE]
        }
        _ => false,
    };
    if !supported_profile || manifest.version != [0, 1] || manifest.coordinate_unit != "bohr" {
        return Err("Unsupported native format version or required profile".into());
    }
    let mut decoded = BTreeMap::new();
    let mut used = HashSet::from(["manifest.json".to_string()]);
    used.try_reserve(manifest.arrays.len())
        .map_err(|_| "Cannot allocate native array entry set")?;
    for (id, a) in manifest.arrays {
        let width = match a.dtype.as_str() {
            "f64" => 8,
            "u32" => 4,
            _ => return Err("Unsupported array type".into()),
        };
        let n = a
            .shape
            .iter()
            .try_fold(1usize, |n, d| n.checked_mul(*d))
            .ok_or("Array shape overflow")?;
        used.try_reserve(1)
            .map_err(|_| "Cannot allocate native array entry names")?;
        if a.shape.is_empty()
            || a.shape.len() > 4
            || a.shape.contains(&0)
            || n.checked_mul(width) != Some(a.bytes)
            || !a.entry.starts_with("arrays/")
            || !used.insert(a.entry.clone())
        {
            return Err("Invalid array shape, size, or path".into());
        }
        let file = zip.by_name(&a.entry).map_err(|_| "Missing array entry")?;
        if file.size() != a.bytes as u64 {
            return Err("Array byte length mismatch".into());
        }
        let bytes = buffer::read(file)?;
        if bytes.len() != a.bytes {
            return Err("Inflated array length mismatch".into());
        }
        if digest(&bytes) != a.sha256 {
            return Err("Array checksum mismatch".into());
        }
        let mut values = Vec::new();
        values
            .try_reserve_exact(n)
            .map_err(|_| "Cannot allocate decoded native array")?;
        for b in bytes.chunks_exact(width) {
            if width == 4 {
                values.push(json!(u32::from_le_bytes(b.try_into().unwrap())));
            } else {
                let v = f64::from_le_bytes(b.try_into().unwrap());
                if !v.is_finite() {
                    return Err("Non-finite scientific array".into());
                }
                values.push(json!(v));
            }
        }
        decoded.insert(id, reshape(values, &a.shape)?);
    }
    if used != names {
        return Err("Unreferenced entries are not supported by the preview profile".into());
    }
    let mut referenced = HashSet::new();
    referenced
        .try_reserve(decoded.len())
        .map_err(|_| "Cannot allocate native array reference set")?;
    unpack(&mut manifest.document, &mut decoded, &mut referenced)?;
    if !decoded.keys().all(|id| referenced.contains(id)) {
        return Err("Unreferenced arrays".into());
    }
    let doc: Document = serde_json::from_value(manifest.document).map_err(|e| e.to_string())?;
    doc.validate()?;
    Ok(doc)
}

#[cfg(test)]
mod tests {
    use super::*;
    use eigenvista_core::{compute, fixtures};
    use std::io::Read;
    #[test]
    fn saved_mesh_rejects_changed_inputs_but_allows_appearance_edits() {
        let mut d = fixtures::hydrogen_pair();
        let g = compute::sample(&d, "bonding", 24).unwrap();
        let hash = compute::source_hash(&d, "bonding").unwrap();
        d.surfaces
            .push(compute::mesh(&g, 0.08, "bonding", &hash, "#259d86", 0.6).unwrap());
        d.surfaces[0].opacity = 0.3;
        assert!(d.validate().is_ok());
        d.orbitals[0].coefficients[0] += 0.1;
        assert!(d.validate().is_err());
    }
    #[test]
    fn array_digest_is_checked() {
        let bytes = encode(&fixtures::open_shell()).unwrap();
        let mut input = ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut output = ZipWriter::new(buffer::Buffer::default());
        for i in 0..input.len() {
            let mut f = input.by_index(i).unwrap();
            let name = f.name().to_owned();
            let mut b = vec![];
            f.read_to_end(&mut b).unwrap();
            if name == "arrays/a0/0.bin" {
                b[0] ^= 1;
            }
            output
                .start_file(name, SimpleFileOptions::default())
                .unwrap();
            output.write_all(&b).unwrap();
        }
        assert!(
            decode(&output.finish().unwrap().into_inner())
                .unwrap_err()
                .contains("checksum")
        );
    }
    #[test]
    fn quantum_mesh_roundtrip() {
        let mut d = fixtures::hydrogen_pair();
        let g = compute::sample(&d, "antibonding", 24).unwrap();
        let hash = compute::source_hash(&d, "antibonding").unwrap();
        d.surfaces
            .push(compute::mesh(&g, 0.08, "antibonding", &hash, "#259d86", 0.6).unwrap());
        let bytes = encode(&d).unwrap();
        assert!(bytes.starts_with(b"PK"));
        assert_eq!(decode(&bytes).unwrap(), d);
    }
    #[test]
    fn mapped_density_mesh_roundtrip_binds_samples_to_the_mesh_and_atoms() {
        let mut d = fixtures::hydrogen_pair();
        let field = "total";
        let g = compute::sample(&d, field, 12).unwrap();
        let hash = compute::source_hash(&d, field).unwrap();
        let mut surface = compute::mesh(&g, 0.08, field, &hash, "#259d86", 0.6).unwrap();
        eigenvista_core::electrostatic::map_surface(&d, &mut surface, |_, _| Ok(())).unwrap();
        let map = surface.electrostatic_potential.as_mut().unwrap();
        map.enabled = false;
        map.range *= 0.5;
        d.surfaces.push(surface);
        let bytes = encode(&d).unwrap();
        assert_eq!(decode(&bytes).unwrap(), d);
        let mut zip = ZipArchive::new(Cursor::new(bytes)).unwrap();
        let manifest: Manifest =
            serde_json::from_reader(zip.by_name("manifest.json").unwrap()).unwrap();
        assert!(
            manifest
                .required_features
                .contains(&ELECTROSTATIC_POTENTIAL_PROFILE.into())
        );
        let values = &manifest.document["surfaces"][0]["electrostatic_potential"]["values"];
        let array = &manifest.arrays[values["$array"].as_str().unwrap()];
        assert_eq!(array.dtype, "f64");
        assert_eq!(array.shape, vec![d.surfaces[0].positions.len() / 3]);

        let point = d.surfaces[0].positions[0];
        d.surfaces[0].positions[0] += 0.5;
        assert!(validate_document(&d).unwrap_err().contains("source hash"));
        d.surfaces[0].positions[0] = point;
        d.atoms[0].position[0] += 0.01;
        assert!(validate_document(&d).unwrap_err().contains("source hash"));
    }

    #[test]
    fn open_shell_roundtrip() {
        let d = fixtures::open_shell();
        assert_eq!(decode(&encode(&d).unwrap()).unwrap(), d);
    }
    #[test]
    fn corruption_and_truncation_rejected() {
        let mut b = encode(&fixtures::hydrogen_pair()).unwrap();
        assert!(decode(&b[..b.len() / 2]).is_err());
        b[0] = 0;
        assert!(decode(&b[..20]).is_err());
    }
    #[test]
    fn unsafe_paths_rejected() {
        let mut z = ZipWriter::new(buffer::Buffer::default());
        z.start_file("../manifest.json", SimpleFileOptions::default())
            .unwrap();
        z.write_all(b"{}").unwrap();
        assert!(decode(&z.finish().unwrap().into_inner()).is_err());
    }
    #[test]
    fn unknown_required_profile_rejected() {
        let d = fixtures::hydrogen_pair();
        let bytes = encode(&d).unwrap();
        let mut source = ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut out = ZipWriter::new(buffer::Buffer::default());
        for i in 0..source.len() {
            let mut f = source.by_index(i).unwrap();
            let name = f.name().to_owned();
            let mut b = vec![];
            f.read_to_end(&mut b).unwrap();
            if name == "manifest.json" {
                let mut m: Value = serde_json::from_slice(&b).unwrap();
                m["required_features"] = json!(["unknown"]);
                b = serde_json::to_vec(&m).unwrap();
            }
            out.start_file(name, SimpleFileOptions::default()).unwrap();
            out.write_all(&b).unwrap();
        }
        assert!(decode(&out.finish().unwrap().into_inner()).is_err());
    }
}
