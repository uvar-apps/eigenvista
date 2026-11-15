// Stage a recorded real-app session for HyperFrames, or publish its checked render.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { release } from "./release.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
assert.equal(process.cwd(),root);
for(const key of ["TMPDIR","TMP","TEMP"]) process.env[key]=path.join(root,"tmp");
const task=path.join(root,"tmp/2026-11-15-visibility");
const project=path.join(task,"videos/eigenvista-shaders");
const assets=path.join(project,"assets");
const output=path.join(root,"site/assets/social");
const ffmpeg=process.env.EIGENVISTA_FFMPEG||"ffmpeg";
const ffprobe=process.env.EIGENVISTA_FFPROBE||"ffprobe";
const probe=file=>JSON.parse(execFileSync(ffprobe,["-v","error","-show_format","-show_streams","-of","json",file],{encoding:"utf8"}));
const hash=file=>createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const recording=JSON.parse(fs.readFileSync(path.join(task,"demo-recording.json")));
assert.deepEqual(recording.errors,[]);
assert(recording.videoPath.startsWith(path.join(root,"tmp")+path.sep));
const beats={ xray:Number(recording.records.find(r=>r.name==="xray").relative.toFixed(1)),
  clipping:Number(recording.records.find(r=>r.name==="clipping").relative.toFixed(1)) };
assert(beats.xray>0&&beats.clipping>beats.xray&&beats.clipping<27);
if(!process.argv.includes("--publish")){
  fs.mkdirSync(assets,{recursive:true});
  const raw=probe(recording.videoPath);
  // Align to the stable solid view, allowing for the final screenshot/close.
  const start=Math.max(0,Number(raw.format.duration)-recording.records.at(-1).relative-0.15);
  execFileSync(ffmpeg,["-hide_banner","-loglevel","error","-y","-ss",String(start),"-i",recording.videoPath,"-t","30","-vf","tpad=stop_mode=clone:stop_duration=10","-an","-c:v","libx264","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",path.join(assets,"demo.mp4")]);
  fs.copyFileSync(path.join(root,"site/assets/favicon.svg"),path.join(assets,"logo.svg"));
  let html=fs.readFileSync(path.join(root,"tools/site/demo-composition.html"),"utf8");
  for(const [key,value] of Object.entries({DEMO_XRAY_TIME:beats.xray,DEMO_CLIP_TIME:beats.clipping,DEMO_XRAY_DURATION:beats.clipping-beats.xray,DEMO_CLIP_DURATION:27-beats.clipping})) html=html.replaceAll(key,String(value));
  fs.writeFileSync(path.join(project,"index.html"),html);
  fs.writeFileSync(path.join(task,"demo-edit.json"),JSON.stringify({start,beats,sourceDuration:Number(raw.format.duration),duration:30,lastFrameHold:true},null,2)+"\n");
  console.log("DEMO_STAGED",JSON.stringify({start,beats}));
}else{
  const master=path.join(task,"eigenvista-shaders-master.mp4");
  const movie=probe(master),stream=movie.streams.find(s=>s.codec_type==="video");
  assert.equal(Number(movie.format.duration),30);
  assert.equal(stream.width,1920);assert.equal(stream.height,1080);
  assert.equal(stream.codec_name,"h264");assert.equal(stream.avg_frame_rate,"25/1");
  assert.equal(movie.streams.length,1,"Intentionally silent demonstration");
  fs.copyFileSync(master,path.join(output,"eigenvista-shaders.mp4"));
  execFileSync(ffmpeg,["-hide_banner","-loglevel","error","-y","-ss",String(beats.xray+2),"-i",master,"-frames:v","1","-c:v","libwebp","-quality","90",path.join(output,"eigenvista-demo-poster.webp")]);
  const timestamp=t=>`00:${t.toFixed(3).padStart(6,"0")}`;
  fs.writeFileSync(path.join(output,"eigenvista-shaders.vtt"),`WEBVTT\n\n00:00.000 --> ${timestamp(beats.xray)}\nA solid electron-density envelope surrounds a 17-atom C7H10 molecule.\nDensity is 0.04 electrons/bohr³ on a 256³ grid.\n\n${timestamp(beats.xray)} --> ${timestamp(beats.clipping)}\nThe X-ray shader reveals the atoms inside.\nChanging maxOpacity redraws the same mesh immediately.\n\n${timestamp(beats.clipping)} --> 00:27.000\nThe clipping shader opens the envelope.\nChanging zmax moves the boundary through the surface.\n\n00:27.000 --> 00:30.000\nInstall EigenVista and try the downloadable examples:\nuvar-apps.github.io/eigenvista\n`);
  const files=["eigenvista-social.png","eigenvista-shaders.mp4","eigenvista-demo-poster.webp","eigenvista-shaders.vtt"].map(file=>({file,bytes:fs.statSync(path.join(output,file)).size,sha256:hash(path.join(output,file))}));
  const provenance={ applicationVersion:release.version,applicationSource:release.source,durationSeconds:30,width:1920,height:1080,fps:25,
    field:recording.field,isovalue:recording.isovalue,units:recording.units,grid:recording.grid,
    input:{file:recording.source,sha256:hash(path.join(root,recording.source))},
    socialImage:JSON.parse(fs.readFileSync(path.join(output,"provenance.json"))).socialImage,
    capture:"Actual production web UI. Native density cache opened before recording; same 72,848-triangle mesh and camera throughout. maxOpacity and zmax changed through real React controls.",
    editing:"Initial setup trimmed; final frame held for reading. Actual 1920×960 app view remains at native size below a 120px branded header. No scientific image alteration, time scaling, audio or calculation-speed claim.",
    beats,tools:{recorder:"Playwright",composition:"HyperFrames 0.9.52",encoding:"FFmpeg 6.0, H.264 yuv420p, 25 fps"},files };
  fs.writeFileSync(path.join(output,"provenance.json"),JSON.stringify(provenance,null,2)+"\n");
  fs.writeFileSync(path.join(task,"final-video-probe.json"),JSON.stringify(movie,null,2)+"\n");
  console.log("DEMO_PUBLISHED_ASSETS",JSON.stringify(files));
}
