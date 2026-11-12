# Design records

In-repo design documents for changes that required a decision before code.
They sit alongside [reviews](../reviews/), which record *assessment after the
fact*; this directory records *decisions before the fact*.

## Convention

- One file per design: `YYYY-MM-DD-<topic>.md`, dated by the day the design was
  settled, not the day it was implemented.
- Record the **decision and its reasoning**, not a running log. If a later
  design supersedes it, say so at the top of both files rather than editing the
  older one into something it was not.
- Status is one of: `proposed`, `accepted`, `implemented`, `superseded`.
  Update the status line when the state changes; leave the reasoning intact.
- Design docs are not feature documentation. Once a feature ships, the user
  guide and architecture docs describe it; this file remains as the record of
  why it was built this way and what alternatives were rejected.
- Link the tracking issue. The issue tracks the work; the design doc holds the
  reasoning that outlives the issue.

## Index

| Date | Design | Status | Issue |
| --- | --- | --- | --- |
| 2026-11-12 | [Typed native encoding](2026-11-12-typed-native-encoding.md) | implemented | [#39](https://github.com/uvar-apps/eigenvista/issues/39) |
| 2026-11-12 | [Vite maintenance and immutable native fixtures](2026-11-12-vite-and-native-fixtures.md) | implemented | [#46](https://github.com/uvar-apps/eigenvista/issues/46), fixture phase of [#39](https://github.com/uvar-apps/eigenvista/issues/39) |
| 2026-11-11 | [Hosted verification and exact publication preflight](2026-11-11-ci-and-publication-preflight.md) | implemented | [#32](https://github.com/uvar-apps/eigenvista/issues/32), [#33](https://github.com/uvar-apps/eigenvista/issues/33), [#34](https://github.com/uvar-apps/eigenvista/issues/34) |
| 2026-11-11 | [Native lifecycle and Molden capacity contracts](2026-11-11-native-lifecycle-and-molden-limits.md) | implemented | [#30](https://github.com/uvar-apps/eigenvista/issues/30), [#31](https://github.com/uvar-apps/eigenvista/issues/31) |
| 2026-11-06 | [BinaryCIF import and viewer capture](2026-11-06-binarycif-and-capture.md) | implemented | [#21](https://github.com/uvar-apps/eigenvista/issues/21), [#7](https://github.com/uvar-apps/eigenvista/issues/7), [#4](https://github.com/uvar-apps/eigenvista/issues/4) |
| 2026-11-06 | [Bond search and declared mmCIF connections](2026-11-06-bond-search-and-cif-connections.md) | implemented | [#3](https://github.com/uvar-apps/eigenvista/issues/3), [#19](https://github.com/uvar-apps/eigenvista/issues/19) |
| 2026-11-06 | [Worker ownership and resident registration](2026-11-06-worker-ownership-and-registration.md) | implemented | [#6](https://github.com/uvar-apps/eigenvista/issues/6), [#5](https://github.com/uvar-apps/eigenvista/issues/5) |
| 2026-11-06 | [Sampled rendering quality and shader alpha](2026-11-06-rendering-quality.md) | implemented | [#12](https://github.com/uvar-apps/eigenvista/issues/12), [#2](https://github.com/uvar-apps/eigenvista/issues/2) |
| 2026-10-12 | [Atom colours from a file](2026-10-12-atom-colors-from-file.md) | implemented | [#17](https://github.com/uvar-apps/eigenvista/issues/17) |
