// End-to-end checks against the real static HTTP site at its project prefix.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { application } from "./application.mjs";
import { release } from "./release.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const origin = process.env.EIGENVISTA_SITE_ORIGIN || "http://127.0.0.1:5190";
const base = origin + "/eigenvista/";
const task = path.join(root, "tmp/2026-11-15-website");
fs.mkdirSync(task, { recursive: true });
const out = fs.mkdtempSync(path.join(task, "browser-"));
const { chromium, webkit } = await import(
  pathToFileURL(path.join(root, "app/node_modules/playwright/index.mjs"))
);
const pages = fs
  .readdirSync(path.join(root, "site"))
  .filter((name) => name.endsWith(".html"))
  .sort();
const records = [];
const sha = (value) => createHash("sha256").update(value).digest("hex");
const nextFrame = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
const allImages = (page) =>
  page.locator("main img").evaluateAll((images) =>
    Promise.all(
      images.map(async (image) => {
        image.loading = "eager";
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight)
          throw Error("Undecoded image");
        if (
          Number(image.getAttribute("width")) !== image.naturalWidth ||
          Number(image.getAttribute("height")) !== image.naturalHeight
        )
          throw Error("Image dimensions disagree with capture provenance");
        if (image.width < 1 || image.height < 1)
          throw Error("Invisible image box");
        if (
          image.closest(".prose") &&
          Math.abs(
            image.width / image.height -
              image.naturalWidth / image.naturalHeight,
          ) > 0.01
        )
          throw Error(
            "Distorted manual/tutorial image aspect ratio: " + image.src,
          );
      }),
    ),
  );
const comparePixels = (page, first, second) =>
  page.evaluate(
    async ({ a, b }) => {
      const decode = async (data) => {
        const image = new Image();
        image.src = "data:image/png;base64," + data;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return {
          width: image.width,
          height: image.height,
          data: context.getImageData(0, 0, image.width, image.height).data,
        };
      };
      const one = await decode(a),
        two = await decode(b);
      if (one.width !== two.width || one.height !== two.height)
        throw Error("Comparison frames differ in size");
      let changed = 0,
        total = 0,
        difference = 0;
      // Exclude labels and frame edges so changing chrome cannot pass this oracle.
      for (let y = 45; y < one.height - 12; y++)
        for (let x = 12; x < one.width - 12; x++) {
          const i = (y * one.width + x) * 4;
          const d =
            Math.abs(one.data[i] - two.data[i]) +
            Math.abs(one.data[i + 1] - two.data[i + 1]) +
            Math.abs(one.data[i + 2] - two.data[i + 2]);
          if (d > 12) changed++;
          difference += d;
          total++;
        }
      return {
        changedFraction: changed / total,
        meanChannelDifference: difference / (total * 3),
      };
    },
    { a: first.toString("base64"), b: second.toString("base64") },
  );

for (const [engine, launcher] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await launcher.launch({ headless: true });
  const tabKey = engine === "webkit" ? "Alt+Tab" : "Tab";
  const errors = [];
  let context;
  try {
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      colorScheme: "light",
      acceptDownloads: true,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(String(error)));
    const visited = [];
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      for (const file of pages) {
        const response = await page.goto(base + file, { waitUntil: "load" });
        assert.equal(response.status(), 200, `${engine}/${width}/${file}`);
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(await page.locator("[data-application-version]").textContent(), `${application.version} test build`);
        assert.equal(await page.locator("[data-application-status]").textContent(), `v${application.version} / UNRELEASED TEST BUILD`);
        assert.equal(
          await page
            .getByRole("navigation", { name: "Main navigation" })
            .count(),
          1,
        );
        await allImages(page);
        const size = await page.evaluate(() => ({
          viewport: innerWidth,
          body: document.documentElement.scrollWidth,
        }));
        assert(
          size.body <= size.viewport,
          `${engine}/${width}/${file}: overflow ${JSON.stringify(size)}`,
        );
        assert.equal(
          await page
            .locator("main a")
            .filter({ hasText: /undefined|\[object Object\]/ })
            .count(),
          0,
        );
        visited.push({ file, width, http: response.status() });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "ai-install.html");
    const agentTable = page.locator(".agent-setup-table");
    assert.equal(await agentTable.getByRole("rowheader").count(), 6);
    assert.equal(await agentTable.getByRole("columnheader").count(), 3);
    const codexRow = agentTable.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Codex CLI", exact: true }) });
    assert.equal(await codexRow.count(), 1);
    const desktopHeader = await codexRow.getByRole("rowheader").boundingBox();
    const desktopCell = await codexRow.getByRole("cell").first().boundingBox();
    assert(desktopCell.x > desktopHeader.x + desktopHeader.width - 2);
    const installer = await codexRow.getByRole("cell").first().textContent();
    assert(installer.includes("existing") || installer.includes("local"));
    const launcher = page.locator("pre code").filter({ hasText: '"/Applications/EigenVista.app/Contents/Resources/AI-connector/Start AI connection.command"' }).first();
    const launcherCommand = await launcher.textContent();
    assert.equal(launcherCommand, '"/Applications/EigenVista.app/Contents/Resources/AI-connector/Start AI connection.command"');
    const setupPrompt = await page.locator("pre code").filter({ hasText: "Set up EigenVista so you can operate its desktop window for me." }).textContent();
    assert(setupPrompt.includes("I authorize this installation and setup"));
    assert(setupPrompt.includes("binary package from https://github.com/uvar-apps/eigenvista/releases"));
    assert(setupPrompt.includes("standalone instructions"));
    assert(!/cargo build|git clone|wasm-bindgen|EIGENVISTA_REPO/.test(setupPrompt));
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const header = await codexRow.getByRole("rowheader").boundingBox();
      const cells = codexRow.getByRole("cell");
      const install = await cells.nth(0).boundingBox();
      const start = await cells.nth(1).boundingBox();
      assert(install.y >= header.y + header.height - 2, "Phone installer is stacked below agent name");
      assert(start.y >= install.y + install.height - 2, "Phone start instructions follow installation");
      assert(install.width > width * 0.7, "Phone commands use a readable full-width cell");
      assert.equal(await codexRow.getByRole("cell").first().textContent(), installer);
      assert.equal(await launcher.textContent(), launcherCommand);
      assert.equal(await page.locator("pre code").filter({ hasText: "Set up EigenVista so you can operate its desktop window for me." }).textContent(), setupPrompt);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "ai.html");
    assert.equal(await page.getByRole("navigation").getByRole("link", { name: "AI", exact: true }).getAttribute("aria-current"), "page");
    await page.getByRole("button", { name: "Search", exact: false }).click();
    await page.getByRole("searchbox").fill("Claude Code");
    await page.locator('[data-search-results] a[href$="/ai-install.html"]').waitFor();
    await page.keyboard.press("Escape");
    const aiGuide = { agents: 6, responsiveInstaller: true, unchangedCopiedCommands: true, explicitInstallAuthorization: true, navigation: true, searchable: true };
    const inspectionPages = ["reference-inspection.html", "tutorials-geometry.html", "tutorials-molecular-surfaces.html", "tutorials-quantitative-fields.html"];
    for (const file of inspectionPages) {
      await page.goto(base + file);
      assert.equal(await page.locator("[data-unreleased-inspection]").count(), 1);
      const notice = await page.locator("[data-unreleased-inspection]").textContent();
      assert(notice.includes(`EigenVista ${application.version}`));
      assert(notice.includes(`not included in the published ${release.version} download`));
      await allImages(page);
      if (file.startsWith("tutorials-")) {
        const prompt = page.locator("pre code").filter({ hasText: "test build" });
        assert.equal(await prompt.count(), 1, `One usable ordinary-language task: ${file}`);
        const text = await prompt.textContent();
        assert(!/app\.state|analysis\.create|molecularSurfaces\.|expectedRevision/.test(text));
      }
    }
    await page.goto(base);
    const development = page.locator("[data-current-development]");
    assert((await development.textContent()).includes(`${application.version} · Unreleased test build`));
    assert((await development.textContent()).includes(`published Mac download below remains ${release.version}`));
    assert.equal(await development.getByRole("link").getAttribute("href"), "reference-inspection.html");
    assert.equal(await page.getByRole("link", { name: "Download for Mac" }).getAttribute("href"), `${release.base}${release.stem}.zip`);
    assert.deepEqual(await (await context.request.get(base + "application.json")).json(), application);
    assert.deepEqual(await (await context.request.get(base + "release.json")).json(), release);
    const video = page.locator("#shader-demo video");
    assert.equal(await video.getAttribute("preload"), "none");
    assert.equal(await video.getAttribute("autoplay"), null);
    const demo = await video.evaluate(async (movie) => {
      const event = name => new Promise((resolve, reject) => {
        const timer=setTimeout(()=>reject(Error(`Video ${name} timed out`)),15000);
        movie.addEventListener(name,()=>{clearTimeout(timer);resolve();},{once:true});
      });
      const metadata=event("loadedmetadata");movie.load();await metadata;
      const dimensions={width:movie.videoWidth,height:movie.videoHeight,duration:movie.duration};
      const frames=[];
      for(const time of [4,11,21]){
        const seek=event("seeked");movie.currentTime=time;await seek;
        const canvas=document.createElement("canvas");canvas.width=192;canvas.height=108;
        const ctx=canvas.getContext("2d");ctx.drawImage(movie,0,0,192,108);
        frames.push(ctx.getImageData(0,0,192,108).data);
      }
      const changes=frames.slice(1).map((frame,i)=>{
        let difference=0;for(let p=0;p<frame.length;p+=4)for(let c=0;c<3;c++)difference+=Math.abs(frame[p+c]-frames[i][p+c]);
        return difference/(192*108*3);
      });
      const box=movie.getBoundingClientRect();
      return {...dimensions,changes,ratio:box.width/box.height};
    });
    // Narration needs an actual user gesture, as it does in the native player.
    const start=await video.evaluate(movie=>movie.currentTime);
    await video.evaluate(movie=>{
      window.demoPlayback=null;
      movie.addEventListener("click",event=>{
        event.preventDefault();
        movie.play().then(()=>{window.demoPlayback={played:true};},error=>{window.demoPlayback={error:error.message};});
      },{once:true});
    });
    await video.click({position:{x:20,y:20}});
    await page.waitForFunction(()=>window.demoPlayback!==null);
    assert.deepEqual(await page.evaluate(()=>window.demoPlayback),{played:true});
    await page.waitForFunction(start=>document.querySelector("#shader-demo video").currentTime>start+0.2,start);
    Object.assign(demo,await video.evaluate(movie=>{
      movie.pause();
      return {advanced:true,hasAudio:(movie.audioTracks?.length??0)>0||(movie.webkitAudioDecodedByteCount??0)>0};
    }));
    const captions=video.locator("track");
    await captions.evaluate(track=>{track.track.mode="hidden";});
    await page.waitForFunction(()=>document.querySelector("#shader-demo track").readyState===2);
    demo.captions=await captions.evaluate(track=>Array.from(track.track.cues,cue=>({start:cue.startTime,end:cue.endTime,text:cue.text})));
    assert.equal(demo.width,1920);assert.equal(demo.height,1080);
    assert(Math.abs(demo.duration-30)<0.1);
    assert(demo.changes.every(value=>value>1),"Actual solid, X-ray and clipping frames differ");
    assert(demo.advanced,"Video plays and advances");
    assert(demo.hasAudio,"Narrated video includes a decoded audio track");
    assert.equal(demo.captions.length,6,"Captions follow the six spoken sentences");
    assert.match(demo.captions[0].text,/EigenVista shows the electron density/);
    assert.match(demo.captions.at(-1).text,/Explore more with EigenVista/);
    assert(demo.captions.every(cue=>cue.start>=0&&cue.end>cue.start&&cue.end<30));
    assert(Math.abs(demo.ratio-16/9)<0.01,"Video keeps its natural aspect ratio");
    const range=await context.request.get(base+"assets/social/eigenvista-shaders.mp4",{headers:{Range:"bytes=0-1"}});
    assert.equal(range.status(),206);
    assert.equal((await range.body()).length,2);
    assert.equal(range.headers()["content-type"],"video/mp4");
    assert.match(range.headers()["content-range"],/^bytes 0-1\/\d+$/);
    const unsatisfied=await context.request.get(base+"assets/social/eigenvista-shaders.mp4",{headers:{Range:"bytes=999999999-"}});
    assert.equal(unsatisfied.status(),416);
    assert.equal((await unsatisfied.body()).length,0);
    // Start keyboard navigation on a fresh page, outside the native player's focus.
    await page.goto(base);
    await page.keyboard.press(tabKey);
    assert.equal(await page.locator(":focus").textContent(), "Skip to content");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(":focus").getAttribute("id"), "main");
    const beforeTheme = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    await page
      .getByRole("button", { name: "Switch to dark color theme", exact: true })
      .click();
    const darkTheme = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    assert.notEqual(darkTheme, beforeTheme);
    await page.reload();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      "dark",
    );
    await page
      .getByRole("button", { name: "Switch to light color theme", exact: true })
      .click();
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
      ),
      beforeTheme,
    );
    await page.getByRole("button", { name: "Search", exact: false }).click();
    const dialog = page.getByRole("dialog", { name: "Find a topic" });
    assert.equal(await dialog.isVisible(), true);
    const search = page.getByRole("searchbox");
    assert.equal(
      await search.evaluate((node) => document.activeElement === node),
      true,
    );
    await search.fill("ambient occlusion");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-search-results]")?.children.length > 0,
    );
    assert(
      (await dialog.locator('a[href$="/reference-scene.html"]').count()) > 0,
    );
    await search.fill("zzzz_eigenvista_unknown_topic");
    assert.equal(await dialog.locator("li").count(), 0);
    assert(
      (await dialog.getByRole("status").textContent()).includes(
        "No matching topics",
      ),
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await dialog.isVisible(), false);
    await page.waitForFunction(() =>
      document.activeElement?.hasAttribute("data-search-open"),
    );
    assert.equal(
      await page.locator(":focus").getAttribute("data-search-open"),
      "",
    );
    await page.keyboard.press("/");
    assert.equal(await dialog.isVisible(), true);
    await page
      .getByRole("button", { name: "Close search", exact: true })
      .click();

    await page.goto(base + "gallery.html");
    await allImages(page);
    assert.equal(await page.locator("[data-gallery-item]:visible").count(), 8);
    await page.getByRole("button", { name: "Molecules", exact: true }).click();
    assert.equal(await page.locator("[data-gallery-item]:visible").count(), 2);
    await page
      .getByRole("button", { name: "Quantum fields", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("[data-gallery-item]:visible").count(), 3);
    await page.getByRole("button", { name: "Shaders", exact: true }).click();
    assert.equal(await page.locator("[data-gallery-item]:visible").count(), 3);
    await page.getByRole("button", { name: "All views", exact: true }).click();
    assert.equal(await page.locator("[data-gallery-item]:visible").count(), 8);
    const comparisons = [];
    for (const [i, figure] of (
      await page.locator("[data-comparison]").all()
    ).entries()) {
      const range = figure.getByRole("slider");
      await range.focus();
      await page.keyboard.press("Home");
      await nextFrame(page);
      assert.equal(await range.inputValue(), "0");
      const off = await figure
        .locator(".comparison-images")
        .screenshot({ path: path.join(out, `${engine}-ao-${i}-off.png`) });
      await page.keyboard.press("End");
      await nextFrame(page);
      assert.equal(await range.inputValue(), "100");
      const on = await figure
        .locator(".comparison-images")
        .screenshot({ path: path.join(out, `${engine}-ao-${i}-on.png`) });
      const difference = await comparePixels(page, off, on);
      assert(
        difference.changedFraction > 0.02 &&
          difference.meanChannelDifference > 1,
        JSON.stringify(difference),
      );
      const negative = await comparePixels(page, off, off);
      assert.equal(negative.changedFraction, 0);
      assert.equal(negative.meanChannelDifference, 0);
      comparisons.push(difference);
    }
    await page.goto(base + "tutorials-first-molecule.html");
    const pendingDownload = page.waitForEvent("download");
    await page
      .getByRole("link", { name: "water.pdb", exact: true })
      .first()
      .click();
    const download = await pendingDownload;
    assert.equal(download.suggestedFilename(), "water.pdb");
    const downloaded = path.join(out, `${engine}-water.pdb`);
    await download.saveAs(downloaded);
    assert.deepEqual(
      fs.readFileSync(downloaded),
      fs.readFileSync(path.join(root, "packaging/examples/water.pdb")),
    );
    const notFound = await page.goto(base + "nested/missing-page");
    assert.equal(notFound.status(), 404);
    await page.keyboard.press(tabKey);
    assert.equal(await page.locator(":focus").textContent(), "Skip to content");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(":focus").getAttribute("id"), "main");
    assert.equal(page.url(), base + "nested/missing-page#main");
    assert(
      (await page.locator("h1").innerText()).includes("THIS VIEW IS MISSING"),
    );
    assert.equal(
      await page
        .locator('link[rel="stylesheet"]')
        .evaluate((link) => link.sheet !== null),
      true,
    );
    await page.keyboard.press("/");
    await page.getByRole("searchbox").fill("ambient occlusion");
    const nestedResult = page
      .getByRole("dialog")
      .locator('a[href$="/reference-scene.html"]');
    await nestedResult.waitFor();
    await nestedResult.click();
    await page.waitForURL(base + "reference-scene.html");
    await page.goto(base + "nested/missing-page");
    await page
      .getByRole("link", { name: "Back to EigenVista", exact: false })
      .click();
    assert.equal(page.url(), base);
    assert.deepEqual(errors, []);

    for (const [name, file, width] of [
      ["home-desktop", "index.html", 1440],
      ["home-mobile", "index.html", 390],
      ["manual-desktop", "reference-fields.html", 1440],
      ["manual-mobile", "reference-scene.html", 390],
      ["tutorial", "tutorials-orbitals.html", 1100],
      ["gallery", "gallery.html", 1440],
      ["inspection-manual-desktop", "reference-inspection.html", 1440],
      ["inspection-manual-mobile", "reference-inspection.html", 390],
      ["inspection-geometry", "tutorials-geometry.html", 1100],
      ["inspection-surfaces", "tutorials-molecular-surfaces.html", 1100],
      ["inspection-fields", "tutorials-quantitative-fields.html", 1100],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + file);
      await allImages(page);
      await page.screenshot({
        path: path.join(out, `${engine}-${name}.png`),
        fullPage: true,
      });
    }
    await context.close();
    const noJs = await browser.newContext({
      viewport: { width: 390, height: 844 },
      javaScriptEnabled: false,
    });
    const plain = await noJs.newPage();
    await plain.goto(base + "gallery.html");
    assert.equal(await plain.locator("[data-comparison].is-ready").count(), 0);
    assert.equal(await plain.locator(".comparison-control:visible").count(), 0);
    assert.equal(await plain.locator("[data-gallery-item]:visible").count(), 8);
    await plain
      .getByRole("navigation")
      .getByRole("link", { name: "Manual", exact: true })
      .click();
    assert((await plain.locator("h1").innerText()).includes("USER REFERENCE"));
    await plain.goto(base + "another/deep/missing");
    await plain.keyboard.press(tabKey);
    await plain.keyboard.press("Enter");
    assert.equal(await plain.locator(":focus").getAttribute("id"), "main");
    assert.equal(plain.url(), base + "another/deep/missing#main");
    await noJs.close();
    const reduced = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      colorScheme: "dark",
    });
    const still = await reduced.newPage();
    await still.goto(base);
    assert.equal(
      await still.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
      true,
    );
    assert.equal(
      await still
        .getByRole("button", {
          name: "Switch to light color theme",
          exact: true,
        })
        .count(),
      1,
    );
    assert.equal(
      await still.evaluate(() => document.getAnimations().length),
      0,
    );
    assert.equal(
      await still
        .locator("main a")
        .first()
        .evaluate((node) => getComputedStyle(node).transitionDuration),
      "0s",
    );
    await still.screenshot({
      path: path.join(out, `${engine}-dark-mobile.png`),
      fullPage: true,
    });
    await reduced.close();
    const failureContext = await browser.newContext();
    await failureContext.route("**/search-index.json", (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );
    const fallback = await failureContext.newPage();
    await fallback.goto(base);
    await fallback
      .getByRole("button", { name: "Search", exact: false })
      .click();
    await fallback
      .getByText(
        "Search is unavailable. Use the Manual or Tutorials links to browse.",
        { exact: true },
      )
      .waitFor();
    await fallback.getByRole("button", { name: "Close search" }).click();
    await fallback
      .getByRole("navigation")
      .getByRole("link", { name: "Manual", exact: true })
      .click();
    assert(fallback.url().endsWith("/reference.html"));
    await failureContext.close();
    records.push({
      engine,
      keyboardNavigationKey: tabKey,
      visited,
      comparisons,
      pageErrors: errors,
      search: true,
      themePersistence: true,
      keyboard: true,
      noJavaScriptNavigation: true,
      reducedMotion: true,
      darkScheme: true,
      unavailableSearchRecovery: true,
      realDownloadEquality: true,
      nested404Navigation: true,
      shaderDemo: demo,
      mediaByteRanges: true,
      aiGuide,
    });
    console.log(
      `SITE_ENGINE_PASS ${engine}: ${visited.length} route/viewport checks and all interactions`,
    );
  } catch (error) {
    fs.writeFileSync(
      path.join(out, `${engine}-failure.json`),
      JSON.stringify({ error: String(error.stack), errors }, null, 2),
    );
    if (context?.pages()[0])
      await context
        .pages()[0]
        .screenshot({
          path: path.join(out, `${engine}-failure.png`),
          fullPage: true,
        })
        .catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}
fs.writeFileSync(
  path.join(out, "RESULT.json"),
  JSON.stringify(
    { passed: true, completedAt: new Date().toISOString(), base, records },
    null,
    2,
  ) + "\n",
);
console.log(
  `SITE_BROWSER_CHECK_PASS ${records.length} engines; ${records.reduce((sum, row) => sum + row.visited.length, 0)} route/viewport checks; ${out}`,
);
