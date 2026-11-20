//! Native save IPC: EVT1, a u64 LE UTF-8 metadata byte count, JSON, raw archive.
//! Only the small metadata is JSON; document bytes never become JSON numbers.
use serde::{Deserialize, de::DeserializeOwned};
use tauri::ipc::InvokeBody;

#[derive(Debug)]
pub enum TransferError {
    Invalid(String),
    Allocation(String),
}
impl std::fmt::Display for TransferError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Invalid(message) | Self::Allocation(message) => formatter.write_str(message),
        }
    }
}

pub trait Metadata: DeserializeOwned {
    fn validate(&self) -> Result<(), TransferError> {
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeSaveMetadata {
    pub name: String,
    pub protected_paths: Vec<String>,
}
impl Metadata for NativeSaveMetadata {}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ControlSaveMetadata {
    pub path: String,
    pub protected_paths: Vec<String>,
    pub overwrite: bool,
}
// The scoped writer validates destination/source policy. This boundary checks
// the typed permission, retaining explicit false and true without coercion.
impl Metadata for ControlSaveMetadata {}

#[derive(Debug)]
pub struct Transfer<T> {
    pub metadata: T,
    pub bytes: Vec<u8>,
}

pub fn decode_body<T: Metadata>(body: &InvokeBody) -> Result<Transfer<T>, TransferError> {
    let InvokeBody::Raw(bytes) = body else {
        return Err(TransferError::Invalid(
            "Native save requires a raw EVT1 binary transfer".into(),
        ));
    };
    decode(bytes)
}

pub fn decode<T: Metadata>(frame: &[u8]) -> Result<Transfer<T>, TransferError> {
    let invalid = |message: &str| TransferError::Invalid(message.into());
    let header = frame
        .get(..12)
        .ok_or_else(|| invalid("Truncated EVT1 transfer header"))?;
    if &header[..4] != b"EVT1" {
        return Err(invalid("Unsupported native transfer magic"));
    }
    let count = u64::from_le_bytes(header[4..12].try_into().expect("eight-byte length"));
    let length = usize::try_from(count)
        .map_err(|_| invalid("Native metadata length exceeds address representation"))?;
    let end = 12usize
        .checked_add(length)
        .ok_or_else(|| invalid("Native metadata offset overflow"))?;
    let metadata = frame
        .get(12..end)
        .ok_or_else(|| invalid("Truncated native metadata payload"))?;
    let payload = frame
        .get(end..)
        .ok_or_else(|| invalid("Native payload offset is invalid"))?;
    if payload.is_empty() {
        return Err(invalid("Missing native document payload"));
    }
    let metadata: T = serde_json::from_slice(metadata).map_err(|error| {
        TransferError::Invalid(format!("Invalid native save metadata: {error}"))
    })?;
    metadata.validate()?;
    let mut bytes = Vec::new();
    bytes.try_reserve_exact(payload.len()).map_err(|error| {
        TransferError::Allocation(format!("Cannot allocate native save transfer: {error}"))
    })?;
    bytes.extend_from_slice(payload);
    Ok(Transfer { metadata, bytes })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value, json};

    fn frame(metadata: Value, payload: &[u8]) -> Vec<u8> {
        let metadata = serde_json::to_vec(&metadata).unwrap();
        let mut bytes = b"EVT1".to_vec();
        bytes.extend_from_slice(&(metadata.len() as u64).to_le_bytes());
        bytes.extend_from_slice(&metadata);
        bytes.extend_from_slice(payload);
        bytes
    }

    #[test]
    fn complete_unicode_metadata_and_raw_bytes_have_no_transfer_allowance() {
        let name = "分子-é-🧪".repeat(16_385);
        let protected: Vec<_> = (0..4097)
            .map(|index| format!("/source/原子-{index}.molden"))
            .collect();
        let payload = [0, 255, 0x80, b'P', b'K', b'\n'];
        let bytes = frame(json!({"name":name,"protectedPaths":protected}), &payload);
        let decoded: Transfer<NativeSaveMetadata> = decode(&bytes).unwrap();
        assert_eq!(decoded.metadata.name, name);
        assert_eq!(decoded.metadata.protected_paths, protected);
        assert_eq!(decoded.bytes, payload);
        assert!(u64::from_le_bytes(bytes[4..12].try_into().unwrap()) > 128 * 1024);
    }

    #[test]
    fn malformed_headers_and_metadata_types_fail_before_payload_copy() {
        let good = frame(
            json!({"path":"/result.eigenvista","protectedPaths":[],"overwrite":false}),
            &[1],
        );
        for length in [0, 3, 4, 11] {
            assert!(decode::<ControlSaveMetadata>(&good[..length]).is_err());
        }
        let mut wrong_magic = good.clone();
        wrong_magic[0] = b'X';
        assert!(
            decode::<ControlSaveMetadata>(&wrong_magic)
                .unwrap_err()
                .to_string()
                .contains("magic")
        );
        let mut overflowing = good.clone();
        overflowing[4..12].copy_from_slice(&u64::MAX.to_le_bytes());
        assert!(decode::<ControlSaveMetadata>(&overflowing).is_err());
        let mut truncated = good.clone();
        truncated[4..12].copy_from_slice(&(good.len() as u64).to_le_bytes());
        assert!(
            decode::<ControlSaveMetadata>(&truncated)
                .unwrap_err()
                .to_string()
                .contains("Truncated")
        );
        for metadata in [
            json!({"path":"/x","protectedPaths":[],"overwrite":"true"}),
            json!({"path":9,"protectedPaths":[],"overwrite":false}),
            json!({"path":"/x","protectedPaths":[9],"overwrite":false}),
            json!({"path":"/x","protectedPaths":[],"overwrite":false,"bytes":[1]}),
            json!({"path":"/x","protectedPaths":[]}),
        ] {
            assert!(decode::<ControlSaveMetadata>(&frame(metadata, &[1])).is_err());
        }
        assert!(
            decode::<ControlSaveMetadata>(&frame(
                json!({"path":"/x","protectedPaths":[],"overwrite":false}),
                &[]
            ))
            .is_err()
        );
        assert!(
            decode_body::<ControlSaveMetadata>(&InvokeBody::Json(json!({"bytes":[1]}))).is_err()
        );
    }

    #[test]
    fn native_control_transfer_retains_explicit_publication_permission() {
        for overwrite in [false, true] {
            let payload = [0, 255, b'P', b'K'];
            let encoded = frame(
                json!({"path":"/result.eigenvista","protectedPaths":["/input.eigenvista"],"overwrite":overwrite}),
                &payload,
            );
            let decoded: Transfer<ControlSaveMetadata> = decode(&encoded).unwrap();
            assert_eq!(decoded.metadata.overwrite, overwrite);
            assert_eq!(decoded.metadata.protected_paths, ["/input.eigenvista"]);
            assert_eq!(decoded.metadata.path, "/result.eigenvista");
            assert_eq!(decoded.bytes, payload);
        }
    }

    #[test]
    fn large_raw_archive_transfer_is_linear_and_retains_every_byte() {
        let payload = vec![0xa5; 62 * 1024 * 1024];
        let encoded = frame(
            json!({"path":"/data/大きい.eigenvista","protectedPaths":[],"overwrite":false}),
            &payload,
        );
        let metadata_length = u64::from_le_bytes(encoded[4..12].try_into().unwrap()) as usize;
        assert_eq!(encoded.len(), 12 + metadata_length + payload.len());
        let decoded: Transfer<ControlSaveMetadata> =
            decode_body(&InvokeBody::Raw(encoded)).unwrap();
        assert_eq!(decoded.bytes, payload);
        assert_eq!(decoded.metadata.path, "/data/大きい.eigenvista");
    }

    #[test]
    fn invalid_utf8_and_incorrect_metadata_byte_boundaries_are_rejected() {
        let mut invalid = b"EVT1".to_vec();
        invalid.extend_from_slice(&1u64.to_le_bytes());
        invalid.extend_from_slice(&[0xff, 1]);
        assert!(decode::<NativeSaveMetadata>(&invalid).is_err());
        let mut wrong_length = frame(json!({"name":"分子.eigenvista","protectedPaths":[]}), &[1]);
        let length = u64::from_le_bytes(wrong_length[4..12].try_into().unwrap());
        wrong_length[4..12].copy_from_slice(&(length - 1).to_le_bytes());
        assert!(decode::<NativeSaveMetadata>(&wrong_length).is_err());
    }
}
