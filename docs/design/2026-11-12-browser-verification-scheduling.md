# Browser verification follows completed work

Date: 12 November 2026 (Australia/Perth). Status: implemented.
Tracks [#51](https://github.com/uvar-apps/eigenvista/issues/51), the verification
repair required by [#39](https://github.com/uvar-apps/eigenvista/issues/39) in
[PR #50](https://github.com/uvar-apps/eigenvista/pull/50).

## Evidence and classification

The first hosted run at `9ecb720` passed 300 browser cases and failed six in
33.2 minutes, while the same local suite passed 306. Native Rust, packaging,
production build and all 12 frozen-file browser cases passed. This does not
establish a typed-writer or scientific-output regression.

Both batch-progress failures show genuine orbital-2 sampling continuing beyond
a generic five-second UI assertion. The cancellation check demanded three
messages immediately after observing only the first positive checkpoint;
intermediate worker updates are throttled. Neither predicate establishes that
the work or required event sequence has completed.

Rendering traces show a 120-second aggregate GPU evaluation timing out, a real
12-step cube gesture taking 13 seconds followed by more than 42 seconds of
camera settling, and a viewer pixel capture still pending inside a 20-second
poll. Captured cube and viewer frames contain both signed colours; no blank
pixel result was returned by the timed-out viewer callback. Original logs,
traces and screenshots are retained with the issue/PR evidence.

## Decisions

Progress tests wait for actual generation results before terminal UI assertions,
then wait for publication progress to clear. Live cancellation requires three
real advancing checkpoints, an unfinished count and no result. The real Cancel
button remains the action under test; an observer records the current worker
and request at actual termination to reject stale or already completed work.
Existing batch, monotonicity, mesh, numerical, stale-event, retry and cache
assertions remain.

Adaptive GPU verification becomes six independent mode/quality cases. It retains
all 24 profile comparisons, 14 timing configurations, warmups, nine synchronized
measurement draws and the full canvas resolution. Each case has a fresh GL
context and its own evidence file; individual warmups remain mandatory, and
timings should not be compared blindly with the older shared-context matrix.

Cube Open/desktop, loaded-scene mobile resize and real rotation are independently
bounded scenarios. The rotation's 120-second budget follows the observed gesture
and damping cost; damping, signs, thresholds and geometry are unchanged. Mobile
still resizes an already loaded desktop scene after resolution 24 is selected.
Viewer interaction/Fit settles in mesh mode before entering the sampled modes;
it observes an actual draw and completes the compositor read before asserting
the original nonblank pixel threshold.

These changes add 14 cases, making the complete suite **320 cases** in both
engines. They do not skip coverage, reduce resolution or timing samples, disable
product animation, change production code, increase global CI deadlines or
replace assertion failures with retries. The first failure remains recorded.
Current software-rendered/traced, full-suite and reviewed-head hosted results
are maintained in the issues/PR and [status](../status.md).

Subsequent #48/#37 work expanded the suite to 350 cases. Its combined hosted
run exceeded the 35-minute step budget; [#54's project-isolation decision](2026-11-12-browser-project-isolation.md)
splits engines onto independent runners while retaining the existing deadlines,
one worker and every case/assertion. The 320-case and three-job evidence above
describes PR #50, not the later matrix topology.
