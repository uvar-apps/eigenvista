import { application } from "../application.mjs";
import { release } from "../release.mjs";

export const workspaceNotice = `<div class="notice" data-current-workspace><strong>This guide follows EigenVista ${application.version}.</strong> Use the four tabs in the single Tools pane: Molecule, Fields, Surfaces and Appearance. The ${release.version} Mac package includes this workspace and its scientific-inspection tools. <a href="reference.html#workspace">Find your way around the current workspace →</a></div>`;

export const agentWorkspaceNote = `<p>EigenVista ${application.version} groups manual controls in four Tools tabs: Molecule, Fields, Surfaces and Appearance. You can watch or adjust the scene while your agent works; scientific requests do not depend on which tab is open. The current ${release.version} package includes the same scientific workflows. <a href="reference.html#workspace">See the current workspace</a>.</p>`;

export const workspaceFigure = (file, alt, caption) =>
  `<figure class="plate"><a href="assets/media/simple-${file}-1280.webp"><img src="assets/media/simple-${file}-1280.webp" width="1280" height="800" loading="lazy" alt="${alt}"></a><figcaption>${caption} Actual 0.9.0 source-preview capture, 17 November 2026; this pane design became the default in 0.10.0 and is retained in EigenVista ${application.version}. <a href="assets/media/provenance.json">Capture provenance</a>.</figcaption></figure>`;
