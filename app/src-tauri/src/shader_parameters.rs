use std::{
    fs::OpenOptions,
    io::Write,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

pub fn save(path: &Path, text: &str) -> Result<(), String> {
    if !path
        .extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case("params"))
    {
        return Err("Save shader parameters to a .params filename".into());
    }
    let parent = path.parent().ok_or("No save directory")?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let temporary = parent.join(format!(".eigenvista-params-{}-{nonce}", std::process::id()));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(&temporary).map_err(|e| e.to_string())?;
    let result = (|| {
        file.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        drop(file);
        std::fs::rename(&temporary, path).map_err(|e| e.to_string())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(temporary);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parameter_export_replaces_complete_text_and_rejects_invalid_destinations() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tmp")
            .join(format!("shader-export-{}-{nonce}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let path = root.join("surface.PARAMS");
        save(&path, "float opacity 1\n").unwrap();
        let text = "float opacity 0.5\nvec3 lightDir 0 0 1\nbool enabled 1\n";
        save(&path, text).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), text);
        let large = "x".repeat(128 * 1024 + 1);
        save(&path, &large).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), large);
        let molecular = root.join("original.eigenvista");
        std::fs::write(&molecular, "original bytes").unwrap();
        assert!(save(&molecular, text).is_err());
        assert_eq!(
            std::fs::read_to_string(&molecular).unwrap(),
            "original bytes"
        );
        let directory = root.join("directory.params");
        std::fs::create_dir(&directory).unwrap();
        assert!(save(&directory, text).is_err());
        assert!(save(&root.join("missing/file.params"), text).is_err());
        assert_eq!(std::fs::read_dir(&root).unwrap().count(), 3);
        assert!(directory.is_dir());
        std::fs::remove_dir_all(root).unwrap();
    }
}
