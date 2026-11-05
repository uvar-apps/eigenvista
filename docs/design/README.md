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
| 2026-11-06 | [Sampled rendering quality and shader alpha](2026-11-06-rendering-quality.md) | implemented | [#12](https://github.com/uvar-apps/eigenvista/issues/12), [#2](https://github.com/uvar-apps/eigenvista/issues/2) |
| 2026-10-12 | [Atom colours from a file](2026-10-12-atom-colors-from-file.md) | implemented | [#17](https://github.com/uvar-apps/eigenvista/issues/17) |
