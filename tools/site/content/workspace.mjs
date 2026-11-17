import { application } from "../application.mjs";
import { release } from "../release.mjs";

export const workspaceNotice = `<div class="notice" data-current-workspace><strong>This guide follows the ${application.version} source interface.</strong> Use the four tabs in the single Tools pane: Molecule, Fields, Surfaces and Appearance. The published ${release.version} Mac download has the earlier layout and lacks the new scientific-inspection tools. <a href="reference.html#workspace">Find your way around the current workspace →</a></div>`;

export const agentWorkspaceNote = `<p>The current ${application.version} source groups manual controls in four Tools tabs: Molecule, Fields, Surfaces and Appearance. You can watch or adjust the scene while your agent works; scientific requests do not depend on which tab is open. The published ${release.version} app uses the earlier layout. <a href="reference.html#workspace">See the current workspace</a>.</p>`;

export const workspaceFigure = (file, alt, caption) =>
  `<figure class="plate"><a href="assets/media/simple-${file}-1280.webp"><img src="assets/media/simple-${file}-1280.webp" width="1280" height="800" loading="lazy" alt="${alt}"></a><figcaption>${caption} Actual 0.9.0 source-preview capture, 17 November 2026; the same pane design is now the source default. <a href="assets/media/provenance.json">Capture provenance</a>.</figcaption></figure>`;
