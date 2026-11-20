use super::{bytes, check, clean_staging};
use eigenvista_control::ScopedFiles;
use eigenvista_core::fixtures;
use serde_json::{Value, json};
use std::{
    fs,
    path::Path,
    sync::{
        Arc, Barrier,
        atomic::{AtomicBool, Ordering},
        mpsc,
    },
    thread,
};

pub(super) fn run(root: &Path, files: Arc<ScopedFiles>, replace: bool) -> Result<Value, String> {
    let target = root.join(if replace {
        "replacement-race.eigenvista"
    } else {
        "exclusive-race.eigenvista"
    });
    let mut candidates = Vec::new();
    for index in 0..13 {
        let mut document = fixtures::hydrogen_pair();
        document.id = format!("publication-probe-{index}");
        candidates.push(eigenvista_format::encode(&document)?);
    }
    if replace {
        fs::write(&target, &candidates[0]).map_err(|error| error.to_string())?;
    }
    let candidates = Arc::new(candidates);
    let stop = Arc::new(AtomicBool::new(false));
    let (ready, ready_read) = mpsc::channel();
    let reader = if replace {
        let target = target.clone();
        let candidates = candidates.clone();
        let stop = stop.clone();
        Some(thread::spawn(move || -> Result<(usize, usize), String> {
            check(
                bytes(&target)? == candidates[0],
                "Initial reader did not observe the old complete document",
            )?;
            let mut count = 1;
            let mut seen = vec![false; candidates.len()];
            seen[0] = true;
            ready
                .send(())
                .map_err(|_| "Reader readiness receiver departed")?;
            loop {
                let value = bytes(&target)?;
                let index = candidates
                    .iter()
                    .position(|candidate| candidate == &value)
                    .ok_or("Reader observed a partial or unknown replacement")?;
                seen[index] = true;
                eigenvista_format::decode(&value)?;
                count += 1;
                if stop.load(Ordering::Acquire) {
                    // This fresh post-writer sample cannot be an old read opened before publication.
                    let final_value = bytes(&target)?;
                    let index = candidates
                        .iter()
                        .position(|candidate| candidate == &final_value)
                        .ok_or("Final reader observed a partial or unknown replacement")?;
                    seen[index] = true;
                    eigenvista_format::decode(&final_value)?;
                    return Ok((count + 1, seen.into_iter().filter(|value| *value).count()));
                }
                thread::yield_now();
            }
        }))
    } else {
        None
    };
    if replace {
        ready_read
            .recv()
            .map_err(|_| "Reader failed before publishers started")?;
    }
    let barrier = Arc::new(Barrier::new(12));
    let handles: Vec<_> = (1..13)
        .map(|index| {
            let target = target.clone();
            let candidates = candidates.clone();
            let files = files.clone();
            let barrier = barrier.clone();
            thread::spawn(move || {
                barrier.wait();
                (
                    index,
                    files.save_document(&target, &candidates[index], &[], replace),
                )
            })
        })
        .collect();
    let mut outcomes = Vec::new();
    for handle in handles {
        outcomes.push(handle.join().map_err(|_| "Publisher panicked")?);
    }
    stop.store(true, Ordering::Release);
    let (observations, distinct) = if let Some(reader) = reader {
        reader.join().map_err(|_| "Reader panicked")??
    } else {
        (0, 0)
    };
    let successful: Vec<_> = outcomes
        .iter()
        .filter(|(_, result)| result.is_ok())
        .map(|(index, _)| *index)
        .collect();
    if replace {
        check(successful.len() == 12, "An explicit replacement failed")?;
        check(
            distinct >= 2,
            "Reader did not observe both complete old and published-new payloads",
        )?;
    } else {
        check(
            successful.len() <= 1,
            "Default publication replaced a racing destination",
        )?;
    }
    if !successful.is_empty() {
        let value = bytes(&target)?;
        check(
            successful.iter().any(|index| value == candidates[*index]),
            "Published output does not exactly match a successful writer",
        )?;
        eigenvista_format::decode(&value)?;
    } else {
        check(
            !target.exists(),
            "A failed default export left a destination",
        )?;
    }
    clean_staging(root)?;
    Ok(json!({
        "replace":replace,"writers":12,"successful":successful.len(),
        "complete_reader_observations":observations,
        "distinct_reader_payloads":distinct,"initial_read_before_publishers":replace,
        "outcomes":outcomes.into_iter().map(|(index,result)| match result {
            Ok(receipt)=>json!({"index":index,"ok":true,"bytes":receipt.bytes}),
            Err(error)=>json!({"index":index,"ok":false,"error":error})
        }).collect::<Vec<_>>()
    }))
}
