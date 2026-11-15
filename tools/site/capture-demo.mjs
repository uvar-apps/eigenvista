// Record actual 0.7.2 UI interactions. Caller owns a production preview on 5189.
// Reuse the previously generated native density cache; do not resample for footage.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "../../app/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
assert.equal(process.cwd(), root);
const out = path.join(root, "tmp/2026-11-15-visibility");
fs.mkdirSync(out, { recursive: true });
for (const key of ["TMPDIR", "TMP", "TEMP"]) process.env[key] = path.join(root, "tmp");
const browser = await chromium.launch({headless:true,args:["--use-angle=metal", "--use-gl=angle"]});
const context = await browser.newContext({ viewport:{width:1920,height:960}, deviceScaleFactor:1,
  recordVideo:{dir:path.join(out,"raw"),size:{width:1920,height:960}} });
const page = await context.newPage();
page.setDefaultTimeout(90000);
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("dialog",d=>d.accept());
const label=name=>page.getByLabel(name,{exact:true});
const button=name=>page.getByRole("button",{name,exact:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const set=async(name,value)=>{
  await label(name).evaluate((el,value)=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,String(value));
    el.dispatchEvent(new Event("input",{bubbles:true}));
    el.dispatchEvent(new Event("change",{bubbles:true}));
  },value);
};
const shader=async(stem,dir)=>{
  for(const [kind,ext] of [["vertex","vert"],["fragment","frag"],["params","params"]])
    await page.locator(`[data-shader-input="${kind}"]`).setInputFiles(path.join(root,dir,stem+"."+ext));
  await button("Apply shader").click();
};
const controls=()=>page.locator(".shader-panel input[aria-label]").evaluateAll(nodes=>nodes.map(n=>({label:n.ariaLabel,value:n.type==="checkbox"?n.checked:n.value})));
const records=[];
try {
  await page.goto("http://127.0.0.1:5189/");
  console.log("PREVIEW_READY");
  await label("Open molecular file").setInputFiles(path.join(root,"tmp/2026-11-15-website-quality/cache-density-256.eigenvista"));
  await page.waitForFunction(()=>document.querySelector("footer [role=status]")?.textContent?.includes("Opened cache-density-256.eigenvista"));
  console.log("CACHE_OPENED");
  await page.screenshot({path:path.join(out,"demo-setup.png")});
  if(await label("Dismiss import warnings").count()) await label("Dismiss import warnings").click();
  for(const title of ["Field rendering","Appearance","Atom colours"]){
    const heading=button(title);
    if(await heading.getAttribute("aria-expanded")==="true") await heading.click();
  }
  console.log("PANELS_COLLAPSED");
  await button("Reorder Surface shader").focus();
  await page.keyboard.press("Home");
  await button("Surface shader").click({trial:true});
  if(await button("Surface shader").getAttribute("aria-expanded")==="false") await button("Surface shader").click();
  console.log("SHADER_PANEL_READY");
  await set("Background color","#17232d");
  await set("Positive color","#93e8d9");
  await set("Opacity",1);
  await label("Surface shading").evaluate(el=>{el.value="blinn-phong";el.dispatchEvent(new Event("change",{bubbles:true}));});
  console.log("APPEARANCE_READY");
  await button("Fit scene").click();
  await button("Zoom in").click();
  const scene=await page.locator(".scene").boundingBox();
  await page.mouse.move(scene.x+scene.width/2,scene.y+scene.height/2);
  await page.mouse.down();
  await page.mouse.move(scene.x+scene.width/2+100,scene.y+scene.height/2+80,{steps:18});
  await page.mouse.up();
  await wait(1600);
  const videoStart=await page.evaluate(()=>performance.now()/1000);
  const mark=async(name)=>{
    const time=await page.evaluate(()=>performance.now()/1000);
    records.push({name,time,relative:time-videoStart,controls:await controls()});
    await page.screenshot({path:path.join(out,`demo-${name}.png`)});
  };
  await mark("solid");
  await wait(6500);
  await shader("x-ray","shaders");
  await set("maxOpacity",0.85); await set("minOpacity",0); await set("da",0.03);
  await wait(800);
  await mark("xray");
  await label("maxOpacity").click();
  for(let n=0;n<80;n++){
    const value=n<40?0.85-0.4*n/39:0.45+0.4*(n-40)/39;
    await set("maxOpacity",Number(value.toFixed(2)));await wait(50);
  }
  await wait(2700);
  await button("Clear shader").click();
  await shader("surface-clip","app/shaders");
  for(const key of ["xmin","ymin","zmin"]) await set(key,-10);
  for(const key of ["xmax","ymax","zmax"]) await set(key,10);
  await set("factor",0.24);
  await label("Shader transparency").uncheck();
  await wait(700);
  await mark("clipping");
  await label("zmax").click();
  for(let n=0;n<120;n++){
    const value=n<72?2-2.25*n/71:-0.25+0.5*(n-72)/47;
    await set("zmax",Number(value.toFixed(2)));await wait(60);
  }
  await wait(3500);
  await mark("end");
  const videoPath=await page.video().path();
  const timing={videoPath,videoStart,records,errors,viewport:{width:1920,height:960},
    field:"Total electron density",isovalue:0.04,units:"electrons/bohr^3",grid:[256,256,256],
    source:"tools/site/examples/bicyclic-c7h10.molden",applicationVersion:"0.7.2",notes:"Actual production UI and cached density mesh; no time spent generating or importing is represented."};
  fs.writeFileSync(path.join(out,"demo-recording.json"),JSON.stringify(timing,null,2)+"\n");
  console.log(JSON.stringify(timing,null,2));
  assert.deepEqual(errors,[]);
} catch(error) {
  await page.screenshot({path:path.join(out,"demo-failed.png")}).catch(()=>{});
  throw error;
} finally {await context.close();await browser.close();}
