use super::digest;
use eigenvista_format::{decode, encode, native};
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
    time::Duration,
};

pub fn observe(root: &Path, old: &[u8], new: &[u8]) -> Result<Value, String> {
    let destination = root.join("visible.eigenvista");
    native::save_atomic(&destination, old)?;
    let reader_path = destination.clone();
    let old = Arc::new(old.to_vec());
    let new = Arc::new(new.to_vec());
    let finished = Arc::new(AtomicBool::new(false));
    let done = finished.clone();
    let expected_old = old.clone();
    let expected_new = new.clone();
    let (sender, receiver) = mpsc::sync_channel(2);
    let reader = thread::spawn(move || -> Result<(usize, usize), String> {
        let mut counts = [0, 0];
        for _ in 0..20_000 {
            let bytes = fs::read(&reader_path).map_err(|e| e.to_string())?;
            let index = if bytes == *expected_old {
                0
            } else if bytes == *expected_new {
                1
            } else {
                return Err("Reader observed absent/partial/unexpected native contents".into());
            };
            counts[index] += 1;
            if counts[index] == 1 {
                sender.send(index).map_err(|e| e.to_string())?;
            }
            if done.load(Ordering::Acquire) {
                return Ok((counts[0], counts[1]));
            }
            thread::sleep(Duration::from_micros(100));
        }
        Err("Bounded reader observation budget exhausted".into())
    });
    if receiver
        .recv_timeout(Duration::from_secs(5))
        .map_err(|e| e.to_string())?
        != 0
    {
        return Err("Reader did not observe initial complete document".into());
    }
    native::save_atomic(&destination, &new)?;
    if receiver
        .recv_timeout(Duration::from_secs(5))
        .map_err(|e| e.to_string())?
        != 1
    {
        return Err("Reader did not observe complete replacement document".into());
    }
    for iteration in 0..11 {
        native::save_atomic(&destination, if iteration % 2 == 0 { &old } else { &new })?;
    }
    finished.store(true, Ordering::Release);
    let (old_reads, new_reads) = reader.join().map_err(|_| "Reader panicked")??;
    let contenders = 12;
    let candidates: Vec<_> = (0..contenders)
        .map(|index| {
            let mut document = decode(&old)?;
            document.id = format!("save-race-candidate-{index}");
            encode(&document)
        })
        .collect::<Result<_, _>>()?;
    let start = Arc::new(Barrier::new(contenders));
    let race = root.join("race.eigenvista");
    let handles: Vec<_> = candidates
        .iter()
        .enumerate()
        .map(|(index, candidate)| {
            let start = start.clone();
            let path = race.clone();
            let bytes = candidate.clone();
            thread::spawn(move || {
                start.wait();
                (index, native::save_atomic_new(&path, &bytes))
            })
        })
        .collect();
    let outcomes: Vec<_> = handles
        .into_iter()
        .map(|h| h.join().map_err(|_| "Contender panicked".to_string()))
        .collect::<Result<_, _>>()?;
    let successes: Vec<_> = outcomes
        .iter()
        .filter(|(_, result)| result.is_ok())
        .map(|(index, _)| *index)
        .collect();
    if successes.len() != 1 {
        return Err(
            "No-clobber contenders did not produce exactly one successful publisher".into(),
        );
    }
    let winner = successes[0];
    if fs::read(&race).map_err(|e| e.to_string())? != candidates[winner] {
        return Err("No-clobber winner's contents were overwritten".into());
    }
    Ok(
        json!({"replacement_publications":12,"old_complete_reads":old_reads,"new_complete_reads":new_reads,
        "no_clobber_contenders":contenders,"successful_publishers":successes,
        "failed_publishers":outcomes.iter().filter(|(_,result)| result.is_err()).count(),
        "winner_archive_sha256":digest(&candidates[winner]),
        "candidate_archive_sha256":candidates.iter().map(|bytes|digest(bytes)).collect::<Vec<_>>(),
        "observation_limit":"Bounded concurrent-reader observations plus source/API semantics; not exhaustive interleavings or crash durability"}),
    )
}
