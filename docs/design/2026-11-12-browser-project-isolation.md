# Independent hosted browser projects

Date: 12 November 2026. Status: implemented. For hosted acceptance, consult PR #53.
Tracks [#54](https://github.com/uvar-apps/eigenvista/issues/54), required to finish
[#48](https://github.com/uvar-apps/eigenvista/issues/48) and the qualification
phase of [#37](https://github.com/uvar-apps/eigenvista/issues/37) in
[PR #53](https://github.com/uvar-apps/eigenvista/pull/53).

## Evidence and classification

At `a95ee3f`, [Verify 43240917646](https://github.com/uvar-apps/eigenvista/actions/runs/43240917646)
hit the combined Chromium/WebKit step's global 35-minute deadline. The log
records 318 of 350 case starts, then interrupts the active WebKit case. No
explicit assertion failure or individual-test timeout is logged. A finalized
report was not produced, so exact pass/skipped totals are unavailable. Starts
must not be reported as passes. Linux Rust 230, macOS desktop seven, packaging
13 and the production build passed. The same complete local traced suite passed
350/350 in 11.4 minutes, with no skips, flaky or unexpected results.

This establishes a hosted-verification capacity defect, not incorrect scientific
or rendering output. The original 22,145,868-byte artifact, raw logs and source/
run identities remain under repository-local tmp. Artifact SHA-256:
`e03297c94c2a52d112254706e9480566df9b95a1b54411507844e2775eb57a06`.

## Decision

Use a two-value browser job matrix: `chromium` and `webkit`. Each clean runner
selects its existing project via Playwright's `--project`, retains one worker,
and executes its complete 175 cases. Together these are the same 350 cases;
local/default configuration still defines and runs both engines. Source tests,
timeouts (including existing overrides), assertions, pixels, GPU scenarios,
resolutions, animation, traces and references are unchanged.

Retain the 35-minute test-step and 60-minute job limit on **each runner**, and
the unchanged 45-minute Rust/macOS jobs. Do not increase deadlines or hide
failures with retries/skips. `fail-fast: false` lets the other engine finish
even when one fails. Distinct job and failure-artifact names preserve independent
evidence. All **four** actual job results must pass at the final reviewed head.

Each browser runner performs clean pinned setup, packaging, production build and
reference derivation itself. This duplicates runner minutes but avoids a new
build/artifact-transfer stage, shared state or cache-correctness dependency.
Each installs only its selected locked engine and its native dependencies.
Repository tmp, action/dependency/compiler pins, read-only permissions, bounded
network diagnostics and seven-day allowlisted failure retention stay unchanged.

Increasing workers on one runner was rejected because it adds CPU/GPU contention.
Separate steps on the same runner retain a shared aggregate job ceiling and
cannot isolate engine resources. Increasing deadlines would weaken the existing
bound. Independent runners preserve the tested contracts while removing the
combined-suite cutoff.

The branch metadata reports `main` unprotected. The rules API is unavailable on
this repository's plan (403); no repository policy or permissions are changed.
Final merge still requires manual verification of all four actual checks.

Matrix and fail-fast behavior follow
[GitHub's job-matrix documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations).
Project selection follows the installed CLI and
[Playwright's project documentation](https://playwright.dev/docs/test-projects#run-projects).
Normal tests never regenerate the frozen expected scientific/compatibility data.
