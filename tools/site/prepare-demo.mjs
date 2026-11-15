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
const streamHash=(file,kind)=>execFileSync(ffmpeg,["-hide_banner","-loglevel","error","-i",file,"-map",`0:${kind}:0`,"-c","copy","-f","hash","-hash","sha256","-"],{encoding:"utf8"}).trim();
const publishing=process.argv.includes("--publish");
const previous=publishing?JSON.parse(fs.readFileSync(path.join(output,"provenance.json"))):null;
const recording=publishing?{source:previous.input.file,field:previous.field,isovalue:previous.isovalue,units:previous.units,grid:previous.grid}:JSON.parse(fs.readFileSync(path.join(task,"demo-recording.json")));
const beats=publishing?previous.beats:{ xray:Number(recording.records.find(r=>r.name==="xray").relative.toFixed(1)),
  clipping:Number(recording.records.find(r=>r.name==="clipping").relative.toFixed(1)) };
assert(beats.xray>0&&beats.clipping>beats.xray&&beats.clipping<27);
fs.mkdirSync(task,{recursive:true});
if(!publishing){
  assert.deepEqual(recording.errors,[]);
  assert(recording.videoPath.startsWith(path.join(root,"tmp")+path.sep));
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
  const cached=path.join(task,"eigenvista-shaders-master.mp4");
  const master=fs.existsSync(cached)?cached:path.join(output,"eigenvista-shaders.mp4");
  const movie=probe(master),stream=movie.streams.find(s=>s.codec_type==="video");
  assert.equal(Number(movie.format.duration),30);
  assert.equal(stream.width,1920);assert.equal(stream.height,1080);
  assert.equal(stream.codec_name,"h264");assert.equal(stream.avg_frame_rate,"25/1");
  if(master===cached) assert.equal(movie.streams.length,1,"The recorded visual master remains silent");
  const script=path.join(root,"tools/site/narration.json");
  const narration=JSON.parse(fs.readFileSync(script));
  assert.equal(narration.durationSeconds,30);
  assert.deepEqual(beats,{xray:narration.beats.xray,clipping:narration.beats.clipping},"Review/re-time narration when recorded scene beats change");
  const voice=path.join(root,narration.audio.file);
  assert.equal(hash(voice),narration.audio.sha256,"Preserve the approved narration bytes");
  const audio=probe(voice),audioStream=audio.streams[0];
  assert.equal(audio.streams.length,1);assert.equal(audioStream.codec_name,"aac");
  assert.equal(audioStream.channels,1);assert.equal(Number(audioStream.sample_rate),48000);
  assert.equal(Number(audio.format.duration),30);
  const videoHash=streamHash(master,"v"),audioHash=streamHash(voice,"a");
  assert.equal(videoHash,narration.sourceVideoPacketHash,"Review new footage before pairing it with the retained narration");
  const published=path.join(task,"eigenvista-shaders-narrated.mp4");
  execFileSync(ffmpeg,["-hide_banner","-loglevel","error","-y","-i",master,"-i",voice,"-map","0:v:0","-map","1:a:0","-c","copy","-t","30","-metadata:s:a:0","language=eng","-metadata:s:a:0","title=Synthetic female English narration","-metadata","comment=EigenVista demonstration with approved synthetic narration.","-movflags","+faststart",published]);
  assert.equal(streamHash(published,"v"),videoHash,"Original video packets must remain unchanged");
  assert.equal(streamHash(published,"a"),audioHash,"Approved audio packets must remain unchanged");
  const narrated=probe(published);
  assert.equal(narrated.streams.length,2);assert.equal(Number(narrated.format.duration),30);
  execFileSync(ffmpeg,["-hide_banner","-loglevel","error","-y","-ss",String(beats.xray+2),"-i",master,"-frames:v","1","-c:v","libwebp","-quality","90",path.join(output,"eigenvista-demo-poster.webp")]);
  fs.copyFileSync(published,path.join(output,"eigenvista-shaders.mp4"));
  const timestamp=t=>`00:${t.toFixed(3).padStart(6,"0")}`;
  fs.writeFileSync(path.join(output,"eigenvista-shaders.vtt"),"WEBVTT\n\n"+narration.cues.map(cue=>`${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`).join("\n"));
  const files=["eigenvista-social.png","eigenvista-shaders.mp4","eigenvista-demo-poster.webp","eigenvista-shaders.vtt"].map(file=>({file,bytes:fs.statSync(path.join(output,file)).size,sha256:hash(path.join(output,file))}));
  const provenance={ applicationVersion:release.version,applicationSource:release.source,durationSeconds:30,width:1920,height:1080,fps:25,
    field:recording.field,isovalue:recording.isovalue,units:recording.units,grid:recording.grid,
    input:{file:recording.source,sha256:hash(path.join(root,recording.source))},
    socialImage:JSON.parse(fs.readFileSync(path.join(output,"provenance.json"))).socialImage,
    capture:"Actual production web UI. Native density cache opened before recording; same 72,848-triangle mesh and camera throughout. maxOpacity and zmax changed through real React controls.",
    editing:"Initial setup trimmed; final frame held for reading. Actual 1920×960 app view remains at native size below a 120px branded header. Approved synthetic English narration added by copying the original H.264 and retained AAC packets. No scientific image alteration, time scaling or calculation-speed claim.",
    narration:{script:"tools/site/narration.json",scriptSha256:hash(script),audio:narration.audio,voice:narration.voice,videoPacketHash:videoHash,audioPacketHash:audioHash},
    beats,tools:{recorder:"Playwright",composition:"HyperFrames 0.9.52",encoding:"FFmpeg 6.0, H.264 yuv420p, 25 fps"},files };
  fs.writeFileSync(path.join(output,"provenance.json"),JSON.stringify(provenance,null,2)+"\n");
  fs.writeFileSync(path.join(task,"final-video-probe.json"),JSON.stringify(narrated,null,2)+"\n");
  console.log("DEMO_PUBLISHED_ASSETS",JSON.stringify(files));
}
