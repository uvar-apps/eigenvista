# Sample AI-controlled EigenVista session

A recorded walkthrough in which natural-language prompts in an external coding
harness control the running EigenVista application. It covers loading Molden,
identifying the HOMO and LUMO, generating signed orbital surfaces, adjusting the
camera/background/ambient occlusion, exporting images, applying the X-Ray shader
and increasing mesh resolution.

Source: [Start EigenVista with external control](https://chatgpt.com/s/cx_6afa6aac0fa48191befd5ad211e86009).
Exported on 16 November 2026. All seven user/assistant exchanges and six attached
image occurrences are preserved. Application controls and collapsed work traces
are omitted; message wording and original PNG bytes are preserved.

## Read or share

- [PDF](EigenVista-prompt-session-2026-11-16.pdf): six pages, ready to share.
- [HTML](EigenVista-prompt-session-2026-11-16.html): a single offline file with
  embedded images.
- [Markdown](EigenVista-prompt-session-2026-11-16.md): keep the adjacent
  [`images/`](images/) directory when sharing it.
- [Markdown and images ZIP](EigenVista-prompt-session-2026-11-16-markdown.zip):
  a portable bundle of the Markdown version and its images.

The [application-control guide](../application-control.md) explains how to start
an authorized instance and use its API. This sample records an unreleased source
build; the published 0.7.2 package predates this feature.

## Supporting files

- `capture.json` and `browser-capture.json`: the captured shared-page content and
  six image assets.
- `export-session.mjs`: the export script used to produce the documents.
- [Export manifest](export-manifest.json): source, dimensions, sizes and hashes.
- [PDF checks](independent-pdf-qa.json), [HTML checks](html-qa.json),
  [`rendered/`](rendered/) and preview PNGs: text, image, layout and offline checks.
- `export.log`: the original export run's metadata.

Moving this archive from repository-local temporary storage preserved the bytes
and hashes of all 27 original files. No application code or release artifacts
were changed for the move.
