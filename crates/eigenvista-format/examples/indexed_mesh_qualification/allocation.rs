//! Requested Rust allocation accounting for this single-process research example.
//! It is not resident memory, allocator overhead, or a production allocator.
use serde::Serialize;
use std::{
    alloc::{GlobalAlloc, Layout, System},
    sync::atomic::{AtomicBool, AtomicUsize, Ordering},
    time::Instant,
};

pub struct TrackedSystem;
static LIVE: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);
static TOTAL_PEAK: AtomicUsize = AtomicUsize::new(0);
static CALLS: AtomicUsize = AtomicUsize::new(0);
static CAPTURE: AtomicBool = AtomicBool::new(false);
static EVENTS: AtomicUsize = AtomicUsize::new(0);
const EVENT_LIMIT: usize = 4096;
static SIZES: [AtomicUsize; EVENT_LIMIT] = [const { AtomicUsize::new(0) }; EVENT_LIMIT];
static OLDS: [AtomicUsize; EVENT_LIMIT] = [const { AtomicUsize::new(0) }; EVENT_LIMIT];

fn event(bytes: usize, old: usize) {
    // Tiny per-cell allocations still count toward LIVE/PEAK/CALLS; record
    // larger buffer growth in the fixed log without per-cell event overflow.
    if bytes < 4096 && old < 4096 {
        return;
    }
    if CAPTURE.load(Ordering::Relaxed) {
        let index = EVENTS.fetch_add(1, Ordering::Relaxed);
        if index < EVENT_LIMIT {
            SIZES[index].store(bytes, Ordering::Relaxed);
            OLDS[index].store(old, Ordering::Relaxed);
        }
    }
}

fn allocated(bytes: usize) {
    CALLS.fetch_add(1, Ordering::Relaxed);
    let live = LIVE.fetch_add(bytes, Ordering::Relaxed) + bytes;
    PEAK.fetch_max(live, Ordering::Relaxed);
    TOTAL_PEAK.fetch_max(live, Ordering::Relaxed);
}

pub fn cumulative_peak() -> usize {
    TOTAL_PEAK.load(Ordering::Relaxed)
}

// SAFETY: Every pointer/layout operation delegates unchanged to System. Counters
// observe only successful allocations and never inspect or alter allocated data.
unsafe impl GlobalAlloc for TrackedSystem {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let pointer = unsafe { System.alloc(layout) };
        if !pointer.is_null() {
            allocated(layout.size());
            event(layout.size(), 0);
        }
        pointer
    }
    unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
        let pointer = unsafe { System.alloc_zeroed(layout) };
        if !pointer.is_null() {
            allocated(layout.size());
            event(layout.size(), 0);
        }
        pointer
    }
    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        unsafe {
            System.dealloc(pointer, layout);
        }
        LIVE.fetch_sub(layout.size(), Ordering::Relaxed);
    }
    unsafe fn realloc(&self, pointer: *mut u8, old: Layout, size: usize) -> *mut u8 {
        let result = unsafe { System.realloc(pointer, old, size) };
        if !result.is_null() {
            event(size, old.size());
            if size >= old.size() {
                allocated(size - old.size());
            } else {
                LIVE.fetch_sub(old.size() - size, Ordering::Relaxed);
            }
        }
        result
    }
}

#[derive(Serialize)]
pub struct AllocationEvent {
    pub requested_bytes: usize,
    pub previous_bytes: usize,
}

#[derive(Serialize)]
pub struct Phase {
    pub name: &'static str,
    pub ordinal: usize,
    pub start_live_bytes: usize,
    pub peak_live_bytes: usize,
    pub end_live_bytes: usize,
    pub peak_over_start_bytes: usize,
    pub allocation_calls: usize,
    pub milliseconds: f64,
    pub allocation_events: Vec<AllocationEvent>,
    pub event_log_truncated: bool,
    pub event_log_minimum_bytes: usize,
}

/// No logging/JSON construction runs inside the observed operation.
pub fn measure<T>(name: &'static str, ordinal: usize, operation: impl FnOnce() -> T) -> (T, Phase) {
    let start_live_bytes = LIVE.load(Ordering::Relaxed);
    PEAK.store(start_live_bytes, Ordering::Relaxed);
    let calls = CALLS.load(Ordering::Relaxed);
    EVENTS.store(0, Ordering::Relaxed);
    CAPTURE.store(true, Ordering::Relaxed);
    let start = Instant::now();
    let value = operation();
    let milliseconds = start.elapsed().as_secs_f64() * 1000.;
    let peak_live_bytes = PEAK.load(Ordering::Relaxed);
    let end_live_bytes = LIVE.load(Ordering::Relaxed);
    CAPTURE.store(false, Ordering::Relaxed);
    let event_count = EVENTS.load(Ordering::Relaxed);
    let allocation_calls = CALLS.load(Ordering::Relaxed) - calls;
    let allocation_events = (0..event_count.min(EVENT_LIMIT))
        .map(|index| AllocationEvent {
            requested_bytes: SIZES[index].load(Ordering::Relaxed),
            previous_bytes: OLDS[index].load(Ordering::Relaxed),
        })
        .collect();
    (
        value,
        Phase {
            name,
            ordinal,
            start_live_bytes,
            peak_live_bytes,
            end_live_bytes,
            peak_over_start_bytes: peak_live_bytes.saturating_sub(start_live_bytes),
            allocation_calls,
            milliseconds,
            allocation_events,
            event_log_truncated: event_count > EVENT_LIMIT,
            event_log_minimum_bytes: 4096,
        },
    )
}
