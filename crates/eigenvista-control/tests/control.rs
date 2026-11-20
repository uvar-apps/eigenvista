#![cfg(unix)]
use base64::Engine;
use eigenvista_control::{Broker, Connection, RpcError, ScopedFiles, call, call_until_complete};
use serde_json::{Value, json};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    net::TcpStream,
    os::unix::fs::{FileTypeExt, MetadataExt, PermissionsExt, symlink},
    path::{Path, PathBuf},
    sync::{Arc, Barrier, mpsc},
    thread,
    time::Duration,
};

struct Scratch(PathBuf);
impl Scratch {
    fn new(label: &str) -> Self {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tmp");
        fs::create_dir_all(&root).unwrap();
        let mut random = [0u8; 8];
        getrandom::fill(&mut random).unwrap();
        let path = root.join(format!(
            "control-{label}-{}-{:016x}",
            std::process::id(),
            u64::from_le_bytes(random)
        ));
        fs::create_dir(&path).unwrap();
        Self(path.canonicalize().unwrap())
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn kind(error: &RpcError) -> &str {
    error.data.as_ref().unwrap()["kind"].as_str().unwrap()
}
fn native() -> Vec<u8> {
    eigenvista_format::encode(&eigenvista_core::fixtures::hydrogen_pair()).unwrap()
}
fn scope(dir: &Scratch) -> ScopedFiles {
    ScopedFiles::new(std::slice::from_ref(&dir.0)).unwrap()
}
fn raw(connection: &Connection, bytes: &[u8]) -> Value {
    let mut stream = TcpStream::connect(&connection.address).unwrap();
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .unwrap();
    let _ = stream.write_all(bytes);
    let mut response = String::new();
    BufReader::new(stream).read_line(&mut response).unwrap();
    serde_json::from_str(&response).unwrap()
}

#[test]
fn scientific_csv_is_scoped_source_protected_and_no_clobber() {
    let dir = Scratch::new("csv");
    let files = scope(&dir);
    let source = dir.0.join("source.csv");
    fs::write(&source, "original input").unwrap();
    files.read(&source).unwrap();
    let text = "distance,value,unit,status\n0,-0.5,electron/bohr^3,valid\n1,,,outside\n";
    let output = dir.0.join("profile.csv");
    assert_eq!(
        files.write_csv(&output, text, &[], false).unwrap().bytes,
        text.len()
    );
    assert_eq!(fs::read_to_string(&output).unwrap(), text);
    assert_eq!(
        kind(
            &files
                .write_csv(&output, "replacement", &[], false)
                .unwrap_err()
        ),
        "destination_exists"
    );
    assert_eq!(
        kind(&files.write_csv(&source, text, &[], false).unwrap_err()),
        "source_protected"
    );
    assert!(
        files
            .write_csv(&dir.0.join("not-native.eigenvista"), text, &[], false)
            .is_err()
    );
    assert!(
        files
            .write_csv(&dir.0.join("empty.csv"), "", &[], false)
            .is_err()
    );
    assert!(
        files
            .write_csv(&dir.0.join("nul.csv"), "x\0y", &[], false)
            .is_err()
    );
    let replacement = dir.0.join("overwrite.csv");
    files.write_csv(&replacement, text, &[], true).unwrap();
    assert_eq!(fs::read_to_string(replacement).unwrap(), text);
    let outside = Scratch::new("csv-outside");
    assert!(
        files
            .write_csv(&outside.0.join("escape.csv"), text, &[], false)
            .is_err()
    );
    assert_eq!(fs::read_to_string(&source).unwrap(), "original input");
}

#[test]
fn csv_and_source_history_can_exceed_the_former_byte_and_count_limits() {
    let dir = Scratch::new("large-csv");
    let files = scope(&dir);
    let protected: Vec<_> = (0..4097)
        .map(|index| {
            dir.0
                .join(format!("source-{index}.csv"))
                .to_string_lossy()
                .into_owned()
        })
        .collect();
    let text = "0,1\n".repeat(8 * 1024 * 1024 + 1);
    let output = dir.0.join("large.csv");
    let receipt = files.write_csv(&output, &text, &protected, false).unwrap();
    assert!(receipt.bytes > 32 * 1024 * 1024);
    assert_eq!(fs::metadata(&output).unwrap().len(), text.len() as u64);
    assert_eq!(
        kind(
            &files
                .write_csv(Path::new(&protected[4096]), "x,y\n", &[], false)
                .unwrap_err()
        ),
        "source_protected"
    );
}

#[test]
fn actual_socket_auth_readiness_correlation_and_private_descriptor() {
    let dir = Scratch::new("broker");
    let file = dir.0.join("connection.json");
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&file, move |request| {
        tx.send(request)
            .map_err(|_| RpcError::new(-32006, "io_error", "test receiver closed"))
    })
    .unwrap();
    let connection = Connection::load(&file).unwrap();
    assert_eq!(
        fs::metadata(&file).unwrap().permissions().mode() & 0o777,
        0o600
    );
    assert_eq!(connection.token.len(), 64);
    assert_eq!(connection.instance_id.len(), 32);
    assert_eq!(
        kind(&call(&connection, "app.state", json!({}), Duration::from_secs(5)).unwrap_err()),
        "not_ready"
    );
    broker.ready();
    let mut bad = connection.clone();
    bad.token = "0".repeat(64);
    assert_eq!(
        kind(&call(&bad, "app.state", json!({}), Duration::from_secs(5)).unwrap_err()),
        "unauthorized"
    );
    assert!(rx.try_recv().is_err());
    let clients: Vec<_> = (0..2)
        .map(|marker| {
            let c = connection.clone();
            thread::spawn(move || {
                call(
                    &c,
                    "app.state",
                    json!({"marker":marker}),
                    Duration::from_secs(5),
                )
                .unwrap()
            })
        })
        .collect();
    let a = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    let b = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    assert_ne!(a.request_id, b.request_id);
    for request in [b, a] {
        broker
            .respond(
                request.request_id,
                json!({"result":{"marker":request.params["marker"]}}),
            )
            .unwrap();
    }
    for (marker, client) in clients.into_iter().enumerate() {
        assert_eq!(client.join().unwrap(), json!({"marker":marker}));
    }
    drop(broker);
    assert!(!file.exists());
}

#[test]
fn real_wire_rejects_batches_notifications_bad_json_and_preserves_descriptor_security() {
    let dir = Scratch::new("wire");
    let file = dir.0.join("connection.json");
    let broker = Broker::start(&file, |_| {
        panic!("Invalid requests must never reach the app")
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&file).unwrap();
    assert_eq!(raw(&connection, b"{\n")["error"]["code"], -32700);
    assert_eq!(raw(&connection, b"[]\n")["error"]["code"], -32600);
    let notification = serde_json::to_string(
        &json!({"jsonrpc":"2.0","method":"document.open","params":{},"auth":connection.token}),
    )
    .unwrap()
        + "\n";
    assert_eq!(
        raw(&connection, notification.as_bytes())["error"]["code"],
        -32600
    );
    let public = dir.0.join("public.json");
    fs::copy(&file, &public).unwrap();
    fs::set_permissions(&public, fs::Permissions::from_mode(0o644)).unwrap();
    assert_eq!(
        kind(&Connection::load(&public).err().unwrap()),
        "scope_denied"
    );
    let alias = dir.0.join("alias.json");
    symlink(&file, &alias).unwrap();
    assert!(Connection::load(&alias).is_err());
    assert!(Broker::start(&file, |_| Ok(())).is_err());
    assert_eq!(
        Connection::load(&file).unwrap().instance_id,
        connection.instance_id
    );
}

#[test]
fn requests_and_results_can_exceed_the_former_four_mib_wire_limit() {
    let dir = Scratch::new("result");
    let file = dir.0.join("connection.json");
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&file, move |r| {
        tx.send(r).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&file).unwrap();
    let length = 4 * 1024 * 1024 + 1;
    let client = thread::spawn(move || {
        call(
            &connection,
            "app.state",
            json!({"payload":"x".repeat(length)}),
            Duration::from_secs(15),
        )
    });

    let request = rx.recv_timeout(Duration::from_secs(15)).unwrap();
    assert_eq!(request.params["payload"].as_str().unwrap().len(), length);
    broker
        .respond(request.request_id, json!({"result":"x".repeat(length)}))
        .unwrap();
    assert_eq!(
        client.join().unwrap().unwrap().as_str().unwrap().len(),
        length
    );
}

#[test]
fn default_requests_wait_for_controlled_completion_and_explicit_deadlines_are_optional() {
    let dir = Scratch::new("completion");
    let (requests, received) = mpsc::channel();
    let broker = Broker::start(&dir.0.join("connection.json"), move |request| {
        requests.send(request).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&dir.0.join("connection.json")).unwrap();
    let (completed, results) = mpsc::channel();
    let first = connection.clone();
    let length = 4 * 1024 * 1024 + 1;
    let client = thread::spawn(move || {
        completed
            .send(call_until_complete(
                &first,
                "document.save",
                json!({"payload":"x".repeat(length)}),
            ))
            .unwrap();
    });
    let pending = received.recv_timeout(Duration::from_secs(2)).unwrap();
    assert_eq!(pending.params["payload"].as_str().unwrap().len(), length);
    // The frontend owns this gate; no first-byte timeout may invent completion.
    assert!(matches!(
        results.recv_timeout(Duration::from_millis(150)),
        Err(mpsc::RecvTimeoutError::Timeout)
    ));
    let bounded = thread::spawn(move || {
        call(
            &connection,
            "app.state",
            json!({}),
            Duration::from_millis(100),
        )
    });
    received.recv_timeout(Duration::from_secs(2)).unwrap();
    assert_eq!(kind(&bounded.join().unwrap().unwrap_err()), "timeout");
    assert!(matches!(results.try_recv(), Err(mpsc::TryRecvError::Empty)));
    broker
        .respond(
            pending.request_id,
            json!({"result":{"saved":true,"artifact":"x".repeat(length)}}),
        )
        .unwrap();
    let result = results
        .recv_timeout(Duration::from_secs(2))
        .unwrap()
        .unwrap();
    assert_eq!(result["saved"], true);
    assert_eq!(result["artifact"].as_str().unwrap().len(), length);
    client.join().unwrap();
}

#[test]
fn controller_navigation_and_broker_shutdown_wake_pending_requests() {
    for close in [false, true] {
        let dir = Scratch::new("controller-disconnect");
        let (requests, received) = mpsc::channel();
        let broker = Broker::start(&dir.0.join("connection.json"), move |request| {
            requests.send(request).unwrap();
            Ok(())
        })
        .unwrap();
        broker.ready();
        let connection = Connection::load(&dir.0.join("connection.json")).unwrap();
        let (done, result) = mpsc::channel();
        let client = thread::spawn(move || {
            done.send(call_until_complete(&connection, "document.save", json!({})))
                .unwrap()
        });
        received.recv_timeout(Duration::from_secs(2)).unwrap();
        if close {
            drop(broker);
        } else {
            broker.unready();
        }
        assert_eq!(
            kind(
                &result
                    .recv_timeout(Duration::from_secs(2))
                    .unwrap()
                    .unwrap_err()
            ),
            "not_ready"
        );
        client.join().unwrap();
    }
}

#[test]
fn write_half_closed_client_receives_the_complete_delayed_response() {
    let dir = Scratch::new("half-closed-request");
    let (requests, received) = mpsc::channel();
    let broker = Broker::start(&dir.0.join("connection.json"), move |request| {
        requests.send(request).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&dir.0.join("connection.json")).unwrap();
    let (completed, result) = mpsc::channel();
    let client = thread::spawn(move || {
        let mut stream = TcpStream::connect(&connection.address).unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .unwrap();
        let frame = serde_json::to_string(&json!({"jsonrpc":"2.0","id":"half-close","method":"document.save","params":{},"auth":connection.token})).unwrap() + "\n";
        stream.write_all(frame.as_bytes()).unwrap();
        stream.shutdown(std::net::Shutdown::Write).unwrap();
        let mut response = String::new();
        BufReader::new(stream).read_line(&mut response).unwrap();
        completed
            .send(serde_json::from_str::<Value>(&response).unwrap())
            .unwrap();
    });
    let request = received.recv_timeout(Duration::from_secs(2)).unwrap();
    // Keep the frontend completion gated past the former peer-EOF polling
    // interval. Half-closing the request must never invent a failed operation.
    assert!(matches!(
        result.recv_timeout(Duration::from_millis(200)),
        Err(mpsc::RecvTimeoutError::Timeout)
    ));
    let length = 4 * 1024 * 1024 + 1;
    broker
        .respond(
            request.request_id,
            json!({"result":{"artifact":"x".repeat(length)}}),
        )
        .unwrap();
    let response = result.recv_timeout(Duration::from_secs(5)).unwrap();
    assert_eq!(response["jsonrpc"], "2.0");
    assert_eq!(response["id"], "half-close");
    assert!(response.get("error").is_none());
    assert_eq!(
        response["result"]["artifact"].as_str().unwrap().len(),
        length
    );
    client.join().unwrap();
}

#[test]
fn closed_response_socket_reports_disconnect_instead_of_timeout() {
    let dir = Scratch::new("response-disconnect");
    let (requests, received) = mpsc::channel();
    let broker = Broker::start(&dir.0.join("connection.json"), move |request| {
        requests.send(request).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&dir.0.join("connection.json")).unwrap();
    // Establish a valid descriptor but make this request's peer close after read.
    let listener = std::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).unwrap();
    let mut disconnected = connection;
    disconnected.address = listener.local_addr().unwrap().to_string();
    let server = thread::spawn(move || {
        let (stream, _) = listener.accept().unwrap();
        let mut line = String::new();
        BufReader::new(stream).read_line(&mut line).unwrap();
    });
    assert_eq!(
        kind(&call_until_complete(&disconnected, "app.state", json!({})).unwrap_err()),
        "connection_failed"
    );
    server.join().unwrap();
    assert!(received.try_recv().is_err());
}

#[test]
fn scoped_files_reject_escapes_aliases_and_import_source_replacement() {
    let dir = Scratch::new("scope");
    let outside = Scratch::new("outside");
    let files = scope(&dir);
    let original = outside.0.join("secret.xyz");
    fs::write(&original, b"not in grant").unwrap();
    assert_eq!(kind(&files.read(&original).unwrap_err()), "scope_denied");
    let link = dir.0.join("escape.xyz");
    symlink(&original, &link).unwrap();
    assert!(files.read(&link).is_err());
    let folder = dir.0.join("folder");
    symlink(&outside.0, &folder).unwrap();
    assert!(files.read(&folder.join("secret.xyz")).is_err());
    assert!(
        files
            .save_document(&folder.join("leak.eigenvista"), &native(), &[], false)
            .is_err()
    );
    assert!(!outside.0.join("leak.eigenvista").exists());
    let source = dir.0.join("source.eigenvista");
    let bytes = native();
    fs::write(&source, &bytes).unwrap();
    assert_eq!(files.read(&source).unwrap(), bytes);
    assert_eq!(
        kind(
            &files
                .save_document(&source, &bytes, &[], false)
                .unwrap_err()
        ),
        "source_protected"
    );
    let hard = dir.0.join("alias.eigenvista");
    fs::hard_link(&source, &hard).unwrap();
    assert_eq!(
        kind(&files.save_document(&hard, &bytes, &[], false).unwrap_err()),
        "source_protected"
    );
    fs::remove_file(&source).unwrap();
    assert_eq!(
        kind(
            &files
                .save_document(&source, &bytes, &[], false)
                .unwrap_err()
        ),
        "source_protected"
    );
    let huge = dir.0.join("huge.xyz");
    fs::File::create(&huge)
        .unwrap()
        .set_len(128 * 1024 * 1024 + 1)
        .unwrap();
    let bytes = files.read(&huge).unwrap();
    assert_eq!(bytes.len(), 128 * 1024 * 1024 + 1);
    assert!(bytes.iter().all(|byte| *byte == 0));
}

#[test]
fn palette_sources_keep_scope_and_source_protection_without_a_read_budget() {
    let dir = Scratch::new("palette-limit");
    let outside = Scratch::new("palette-outside");
    let files = scope(&dir);
    let palette = dir.0.join("palette.json");
    let bytes = br##"{"format":"eigenvista-atom-colors","version":1,"colors":[{"z":8,"color":"#ffaaaa"}]}"##;
    fs::write(&palette, bytes).unwrap();
    assert_eq!(files.read(&palette).unwrap(), bytes);
    let escaped = outside.0.join("palette.json");
    fs::write(&escaped, bytes).unwrap();
    assert_eq!(kind(&files.read(&escaped).unwrap_err()), "scope_denied");
    let alias = dir.0.join("palette-alias.eigenvista");
    fs::hard_link(&palette, &alias).unwrap();
    assert_eq!(
        kind(
            &files
                .save_document(&alias, &native(), &[], false)
                .unwrap_err()
        ),
        "source_protected"
    );
}

#[test]
fn native_writes_validate_before_publication_and_racing_writes_never_clobber() {
    let dir = Scratch::new("saves");
    let files = Arc::new(scope(&dir));
    let target = dir.0.join("result.eigenvista");
    assert!(
        files
            .save_document(&target, b"garbage", &[], false)
            .is_err()
    );
    assert!(!target.exists());
    assert!(
        files
            .save_document(&dir.0.join("source.molden"), &native(), &[], false)
            .is_err()
    );
    let barrier = Arc::new(Barrier::new(4));
    let workers: Vec<_> = (0..4)
        .map(|_| {
            let files = files.clone();
            let barrier = barrier.clone();
            let target = target.clone();
            thread::spawn(move || {
                barrier.wait();
                files.save_document(&target, &native(), &[], false)
            })
        })
        .collect();
    let outcomes: Vec<_> = workers.into_iter().map(|w| w.join().unwrap()).collect();
    assert_eq!(outcomes.iter().filter(|x| x.is_ok()).count(), 1);
    let before = fs::read(&target).unwrap();
    eigenvista_format::decode(&before).unwrap();
    let replacement = eigenvista_format::encode(&eigenvista_core::fixtures::open_shell()).unwrap();
    files
        .save_document(&target, &replacement, &[], true)
        .unwrap();
    assert_eq!(fs::read(&target).unwrap(), replacement);
    assert_eq!(
        fs::metadata(&target).unwrap().permissions().mode() & 0o777,
        0o600
    );
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 1);
    let source = dir.0.join("hint.eigenvista");
    assert_eq!(
        kind(
            &files
                .save_document(
                    &source,
                    &native(),
                    &[source.to_string_lossy().into_owned()],
                    false
                )
                .unwrap_err()
        ),
        "source_protected"
    );
}

#[test]
fn explicit_atomic_replacement_supports_all_exports_and_preserves_failed_destinations() {
    let dir = Scratch::new("replacement");
    let files = scope(&dir);
    let first = native();
    let second = eigenvista_format::encode(&eigenvista_core::fixtures::open_shell()).unwrap();
    let destination = dir.0.join("document.eigenvista");
    files
        .save_document(&destination, &first, &[], true)
        .unwrap();
    files
        .save_document(&destination, &second, &[], true)
        .unwrap();
    assert_eq!(fs::read(&destination).unwrap(), second);
    assert!(
        files
            .save_document(&destination, b"invalid", &[], true)
            .is_err()
    );
    assert_eq!(fs::read(&destination).unwrap(), second);

    let csv = dir.0.join("table.csv");
    files.write_csv(&csv, "value\n1\n", &[], true).unwrap();
    files.write_csv(&csv, "value\n2\n", &[], true).unwrap();
    assert_eq!(fs::read_to_string(&csv).unwrap(), "value\n2\n");
    assert!(files.write_csv(&csv, "\0", &[], true).is_err());
    assert_eq!(fs::read_to_string(csv).unwrap(), "value\n2\n");

    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    let bytes = fs::read(icon).unwrap();
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    );
    let png = dir.0.join("image.png");
    files.write_image(&png, &url, true).unwrap();
    fs::write(&png, b"previous output").unwrap();
    files.write_image(&png, &url, true).unwrap();
    assert_eq!(fs::read(&png).unwrap(), bytes);
    assert!(
        files
            .write_image(&png, "data:image/png;base64,YmFk", true)
            .is_err()
    );
    assert_eq!(fs::read(png).unwrap(), bytes);
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 3);
}

#[test]
fn explicit_replacement_keeps_source_alias_scope_and_symlink_protection() {
    let dir = Scratch::new("replace-protected");
    let outside = Scratch::new("replace-outside");
    let files = scope(&dir);
    let bytes = native();
    let source = dir.0.join("source.eigenvista");
    fs::write(&source, &bytes).unwrap();
    files.read(&source).unwrap();
    let alias = dir.0.join("alias.eigenvista");
    fs::hard_link(&source, &alias).unwrap();
    for destination in [&source, &alias] {
        assert_eq!(
            kind(
                &files
                    .save_document(destination, &bytes, &[], true)
                    .unwrap_err()
            ),
            "source_protected"
        );
        assert_eq!(fs::read(destination).unwrap(), bytes);
    }
    let hinted = dir.0.join("hinted.csv");
    fs::write(&hinted, "original").unwrap();
    assert_eq!(
        kind(
            &files
                .write_csv(
                    &hinted,
                    "value\n1\n",
                    &[hinted.to_string_lossy().into_owned()],
                    true
                )
                .unwrap_err()
        ),
        "source_protected"
    );
    assert_eq!(fs::read_to_string(&hinted).unwrap(), "original");
    let link = dir.0.join("link.eigenvista");
    symlink(&source, &link).unwrap();
    assert_eq!(
        kind(&files.save_document(&link, &bytes, &[], true).unwrap_err()),
        "scope_denied"
    );
    assert!(
        fs::symlink_metadata(&link)
            .unwrap()
            .file_type()
            .is_symlink()
    );
    let folder = dir.0.join("folder");
    symlink(&outside.0, &folder).unwrap();
    for path in [
        outside.0.join("leak.eigenvista"),
        folder.join("leak.eigenvista"),
    ] {
        assert_eq!(
            kind(&files.save_document(&path, &bytes, &[], true).unwrap_err()),
            "scope_denied"
        );
    }
    assert_eq!(fs::read_dir(&outside.0).unwrap().count(), 0);
    assert_eq!(fs::read(source).unwrap(), bytes);
    assert!(!fs::read_dir(&dir.0).unwrap().any(|entry| {
        entry
            .unwrap()
            .file_name()
            .to_string_lossy()
            .starts_with(".eigenvista-control-save-")
    }));
}

#[test]
fn racing_explicit_replacements_publish_only_complete_valid_documents() {
    use std::sync::atomic::{AtomicBool, Ordering};
    let dir = Scratch::new("replace-race");
    let files = Arc::new(scope(&dir));
    let path = dir.0.join("result.eigenvista");
    let mut candidates = vec![native()];
    for index in 0..12 {
        let mut document = eigenvista_core::fixtures::hydrogen_pair();
        document.id = format!("replacement-race-{index}");
        candidates.push(eigenvista_format::encode(&document).unwrap());
    }
    fs::write(&path, &candidates[0]).unwrap();
    let candidates = Arc::new(candidates);
    let stop = Arc::new(AtomicBool::new(false));
    let reader = {
        let path = path.clone();
        let candidates = candidates.clone();
        let stop = stop.clone();
        thread::spawn(move || {
            let mut observations = 0;
            loop {
                let bytes = fs::read(&path).unwrap();
                assert!(
                    candidates.contains(&bytes),
                    "partial or unknown publication"
                );
                eigenvista_format::decode(&bytes).unwrap();
                observations += 1;
                if stop.load(Ordering::Acquire) {
                    return observations;
                }
                thread::yield_now();
            }
        })
    };
    let barrier = Arc::new(Barrier::new(candidates.len() - 1));
    let writers: Vec<_> = (1..candidates.len())
        .map(|index| {
            let path = path.clone();
            let candidates = candidates.clone();
            let files = files.clone();
            let barrier = barrier.clone();
            thread::spawn(move || {
                barrier.wait();
                files
                    .save_document(&path, &candidates[index], &[], true)
                    .unwrap();
            })
        })
        .collect();
    for writer in writers {
        writer.join().unwrap();
    }
    stop.store(true, Ordering::Release);
    assert!(reader.join().unwrap() > 0);
    let final_bytes = fs::read(&path).unwrap();
    assert!(candidates[1..].contains(&final_bytes));
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 1);
}

#[test]
fn png_exports_validate_chunks_and_preserve_no_clobber() {
    let dir = Scratch::new("png");
    let files = scope(&dir);
    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    let bytes = fs::read(icon).unwrap();
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    );
    let destination = dir.0.join("render.png");
    files.write_image(&destination, &url, false).unwrap();
    assert_eq!(fs::read(&destination).unwrap(), bytes);
    assert!(files.write_image(&destination, &url, false).is_err());
    assert!(
        files
            .write_image(&dir.0.join("bad.png"), "data:image/png;base64,YmFk", false)
            .is_err()
    );
    assert!(
        files
            .write_image(&dir.0.join("bad.txt"), &url, false)
            .is_err()
    );
    let mut corrupt = bytes;
    corrupt[30] ^= 1;
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(corrupt)
    );
    assert!(
        files
            .write_image(&dir.0.join("checksum.png"), &url, false)
            .is_err()
    );
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 1);
}

#[test]
fn png_above_the_former_data_url_limit_exports_without_truncation() {
    let dir = Scratch::new("large-png");
    let files = scope(&dir);
    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    let mut bytes = fs::read(icon).unwrap();
    let payload_length = 16 * 1024 * 1024;
    let mut chunk = Vec::with_capacity(payload_length + 12);
    chunk.extend_from_slice(&(payload_length as u32).to_be_bytes());
    chunk.extend_from_slice(b"tEXt");
    chunk.extend_from_slice(b"Comment\0");
    chunk.resize(payload_length + 8, b'x');
    chunk.extend_from_slice(&crc32fast::hash(&chunk[4..]).to_be_bytes());
    bytes.splice(bytes.len() - 12..bytes.len() - 12, chunk);
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    );
    let destination = dir.0.join("large.png");
    assert_eq!(
        files.write_image(&destination, &url, false).unwrap().bytes,
        bytes.len()
    );
    assert_eq!(fs::read(destination).unwrap(), bytes);
}

#[test]
fn cli_uses_the_actual_socket_and_never_prints_the_auth_secret() {
    let dir = Scratch::new("cli");
    let descriptor = dir.0.join("connection.json");
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&descriptor, move |r| {
        tx.send(r).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let connection = Connection::load(&descriptor).unwrap();
    let runner = thread::spawn(move || {
        std::process::Command::new(env!("CARGO_BIN_EXE_eigenvista-ctl"))
            .args([
                "--connection",
                descriptor.to_str().unwrap(),
                "app.state",
                "--params",
                "{\"tag\":42}",
            ])
            .output()
            .unwrap()
    });
    let request = rx.recv_timeout(Duration::from_secs(5)).unwrap();
    assert_eq!(request.params, json!({"tag":42}));
    broker
        .respond(request.request_id, json!({"result":{"revision":4}}))
        .unwrap();
    let result = runner.join().unwrap();
    assert!(result.status.success());
    assert_eq!(
        serde_json::from_slice::<Value>(&result.stdout).unwrap(),
        json!({"revision":4})
    );
    assert!(!String::from_utf8_lossy(&result.stdout).contains(&connection.token));
    assert!(result.stderr.is_empty());
    assert_eq!(
        fs::metadata(dir.0.join("connection.json")).unwrap().uid(),
        unsafe { libc::geteuid() }
    );
}

#[test]
fn cli_wait_polls_real_job_receipts_and_reads_params_file() {
    let dir = Scratch::new("wait");
    let descriptor = dir.0.join("connection.json");
    let params = dir.0.join("params.json");
    fs::write(&params, b"{\"fieldIds\":[\"molden-mo-1\"]}").unwrap();
    let (tx, rx) = mpsc::channel();
    let broker = Broker::start(&descriptor, move |request| {
        tx.send(request).unwrap();
        Ok(())
    })
    .unwrap();
    broker.ready();
    let runner = thread::spawn(move || {
        std::process::Command::new(env!("CARGO_BIN_EXE_eigenvista-ctl"))
            .args([
                "--connection",
                descriptor.to_str().unwrap(),
                "surfaces.generate",
                "--params-file",
                params.to_str().unwrap(),
                "--wait",
                "86401",
            ])
            .output()
            .unwrap()
    });
    for phase in 0..3 {
        let request = rx.recv_timeout(Duration::from_secs(5)).unwrap();
        let response = if phase == 0 {
            assert_eq!(request.method, "surfaces.generate");
            assert_eq!(request.params, json!({"fieldIds":["molden-mo-1"]}));
            json!({"jobId":"j1","status":"accepted"})
        } else {
            assert_eq!(request.method, "job.get");
            assert_eq!(request.params, json!({"jobId":"j1"}));
            if phase == 1 {
                json!({"jobId":"j1","status":"running"})
            } else {
                json!({"jobId":"j1","status":"completed","result":{"triangles":120}})
            }
        };
        broker
            .respond(request.request_id, json!({"result":response}))
            .unwrap();
    }
    let output = runner.join().unwrap();
    assert!(output.status.success());
    let result: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["status"], "completed");
    assert_eq!(result["result"]["triangles"], 120);
}

#[test]
fn fifo_sources_and_existing_destinations_fail_without_waiting_for_a_peer() {
    use std::{ffi::CString, os::unix::ffi::OsStrExt};
    let dir = Scratch::new("fifo");
    let files = scope(&dir);
    let source = dir.0.join("source.xyz");
    let native_target = dir.0.join("result.eigenvista");
    let image_target = dir.0.join("render.png");
    for path in [&source, &native_target, &image_target] {
        let name = CString::new(path.as_os_str().as_bytes()).unwrap();
        // SAFETY: name is a live NUL-terminated path in this test's owned directory.
        assert_eq!(unsafe { libc::mkfifo(name.as_ptr(), 0o600) }, 0);
    }
    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(fs::read(icon).unwrap())
    );
    let (sender, receiver) = mpsc::channel();
    let worker = thread::spawn(move || {
        let read = files.read(&source).unwrap_err();
        let save = files
            .save_document(&native_target, &native(), &[], false)
            .unwrap_err();
        let image = files.write_image(&image_target, &url, false).unwrap_err();
        sender
            .send([
                kind(&read).to_owned(),
                kind(&save).to_owned(),
                kind(&image).to_owned(),
            ])
            .unwrap();
    });
    assert_eq!(
        receiver
            .recv_timeout(Duration::from_secs(2))
            .expect("FIFO operations must not block"),
        ["scope_denied", "scope_denied", "scope_denied"]
    );
    worker.join().unwrap();
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 3);
    for entry in fs::read_dir(&dir.0).unwrap() {
        assert!(entry.unwrap().file_type().unwrap().is_fifo());
    }
}
