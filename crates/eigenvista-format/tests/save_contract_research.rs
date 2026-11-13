//! Ordinary local-filesystem contract checks, not crash-durability tests.
#[path = "../examples/save_contract_probe/probes.rs"]
mod probes;

#[test]
#[cfg(unix)]
fn actual_writers_keep_complete_contents_private_mode_bits_and_no_clobber() {
    use std::{
        fs,
        path::Path,
        time::{SystemTime, UNIX_EPOCH},
    };
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let directory = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tmp")
        .join(format!(
            "save-contract-research-{}-{nonce}",
            std::process::id()
        ));
    fs::create_dir_all(&directory).unwrap();
    let report = probes::run(&directory).unwrap();
    assert_eq!(report["capabilities"]["file_sync_all"]["ok"], true);
    for field in ["native_new", "native_replace", "parameter_replace"] {
        assert_eq!(report[field]["result"]["ok"], true, "{field}: {report}");
        assert_eq!(report[field]["after"]["metadata"]["mode"], "0600");
    }
    for field in ["native_replace", "parameter_replace"] {
        assert_eq!(report[field]["before"]["metadata"]["mode"], "0640");
        assert_ne!(
            report[field]["before"]["metadata"]["inode"],
            report[field]["after"]["metadata"]["inode"]
        );
    }
    assert!(report["concurrent"]["old_complete_reads"].as_u64().unwrap() > 0);
    assert!(report["concurrent"]["new_complete_reads"].as_u64().unwrap() > 0);
    assert_eq!(
        report["concurrent"]["successful_publishers"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(report["concurrent"]["failed_publishers"], 11);
    assert!(
        report["remaining_staging_files"]
            .as_array()
            .unwrap()
            .is_empty()
    );
    // Retain this newly-created, bounded fixture for diagnosis under repo tmp.
}
