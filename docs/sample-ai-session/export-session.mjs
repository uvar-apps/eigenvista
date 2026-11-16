import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../app/node_modules/playwright/index.mjs';

const stage=path.dirname(new URL(import.meta.url).pathname);
const source=JSON.parse(fs.readFileSync(path.join(stage,'capture.json')));
const basename='EigenVista-prompt-session-2026-11-16';
assert.equal(source.messages.length,14);
assert.equal(source.assets.length,6);
fs.mkdirSync(path.join(stage,'images'),{recursive:true});
const names=['01-homo-isosurfaces','02-homo-dark-blue','03-homo-transparent','04-homo-saved','05-homo-xray','06-homo-xray-128'];
const assets=source.assets.map((asset,index)=>{
  assert.equal(asset.status,200);
  assert.equal(asset.type,'image/png');
  const bytes=Buffer.from(asset.dataUrl.split(',')[1],'base64');
  assert.equal(bytes.length,asset.bytes);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const file=`images/${names[index]}.png`;
  fs.writeFileSync(path.join(stage,file),bytes);
  return {...asset,file,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sha256:createHash('sha256').update(bytes).digest('hex')};
});
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:1});
 const content=await page.evaluate(({messages,assets})=>{
   const escape=text=>text.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
   const known=new Map(assets.map(asset=>[asset.url,asset]));
   const tags=new Set(['p','strong','em','b','i','code','pre','ul','ol','li','table','thead','tbody','tr','th','td','h1','h2','h3','h4','blockquote','br','hr']);
   function clean(node){
     if(node.nodeType===Node.TEXT_NODE)return escape(node.textContent||'');
     if(node.nodeType!==Node.ELEMENT_NODE)return '';
     const tag=node.tagName.toLowerCase();
     if(['script','style','svg','noscript','iframe','input'].includes(tag))return '';
     if(tag==='button'&&['Copy table','Expand table'].includes(node.getAttribute('aria-label')))return '';
     if(tag==='img'){
       const src=node.getAttribute('src');const asset=known.get(src);if(!asset)throw Error('Uncaptured image '+src);
       return `<figure><img src="${escape(asset.dataUrl)}" data-file="${asset.file}" alt="${escape(node.getAttribute('alt')||'Conversation image')}" width="${asset.width}" height="${asset.height}"></figure>`;
     }
     const children=[...node.childNodes].map(clean).join('');
     if(!tags.has(tag))return children;
     return ['br','hr'].includes(tag)?`<${tag}>`:`<${tag}>${children}</${tag}>`;
   }
   function markdown(node){
     if(node.nodeType===Node.TEXT_NODE)return node.textContent||'';
     if(node.nodeType!==Node.ELEMENT_NODE)return '';
     const tag=node.tagName.toLowerCase();
     const children=()=>[...node.childNodes].map(markdown).join('');
     if(tag==='img')return `\n\n![${node.getAttribute('alt')||'Conversation image'}](${node.getAttribute('data-file')})\n\n`;
     if(tag==='table'){
       const rows=[...node.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.trim().replace(/\|/g,'\\|')));
       return '\n\n'+rows.map((row,i)=>'| '+row.join(' | ')+' |'+(i===0?'\n| '+row.map(()=>'---').join(' | ')+' |':'')).join('\n')+'\n\n';
     }
     if(tag==='strong'||tag==='b')return '**'+children()+'**';
     if(tag==='em'||tag==='i')return '*'+children()+'*';
     if(tag==='code')return '`'+node.textContent+'`';
     if(tag==='li')return '\n- '+children().trim();
     if(['p','pre','blockquote','ul','ol','figure'].includes(tag))return '\n\n'+children().trim()+'\n\n';
     if(/^h[1-4]$/.test(tag))return '\n\n'+'#'.repeat(Number(tag[1])+1)+' '+children()+'\n\n';
     if(tag==='br')return '\n';
     return children();
   }
   return messages.map(message=>{
     const parsed=new DOMParser().parseFromString(message.html,'text/html');
     const html=clean(parsed.body);
     const cleanDoc=new DOMParser().parseFromString(html,'text/html');
     const text=cleanDoc.body.textContent.replace(/\s+/g,'').trim();
     const original=message.text.replace(/\s+/g,'').trim();
     if(text!==original)throw Error(`Text fidelity mismatch in ${message.id}`);
     return {...message,html,markdown:markdown(cleanDoc.body).replace(/\n{3,}/g,'\n\n').trim(),imageCount:cleanDoc.querySelectorAll('img').length};
   });
 },{messages:source.messages,assets});
 assert.equal(content.reduce((n,m)=>n+m.imageCount,0),6);
 const esc=text=>text.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const pairs=[];
 for(let i=0;i<content.length;i+=2){
   assert.equal(content[i].role,'user');assert.equal(content[i+1].role,'assistant');
   const images=content[i+1].imageCount;
   pairs.push(`<section class="exchange ${images?'with-images':''} ${images===2?'two-images':''}"><h2>Exchange ${i/2+1}</h2><div class="message user"><h3>User</h3>${content[i].html}</div><div class="message assistant"><h3>Assistant</h3>${content[i+1].html}</div></section>`);
 }
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>${esc(source.title)}</title><style>
 :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f3f5f6;color:#17212a;font:15px/1.55 Arial,Helvetica,sans-serif}.page{max-width:900px;margin:32px auto;padding:38px 44px;background:white;border:1px solid #d5dce0}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:700;color:#366575}h1{font-size:30px;line-height:1.2;margin:8px 0 16px}header{border-bottom:3px solid #17212a;padding-bottom:20px;margin-bottom:24px}.metadata{font-size:12px;line-height:1.6;color:#54636d}.metadata a{color:#21556d;overflow-wrap:anywhere}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin:22px 0 12px;color:#52636e}h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;color:#416d80}.message{padding:13px 16px;margin:0 0 16px}.user{background:#eef3f6;border-left:3px solid #416d80}.assistant{padding-left:0;padding-right:0}p{margin:0 0 9px}p:last-child{margin-bottom:0}ul,ol{padding-left:22px;margin:8px 0}code{font: .9em/1.5 Menlo,Consolas,monospace;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px;break-inside:avoid}th,td{text-align:left;padding:8px;border-bottom:1px solid #cbd4db}th{background:#eef3f6}figure{margin:12px 0 20px;padding:0;border:1px solid #d6dfe4;background:repeating-conic-gradient(#edf0f2 0% 25%,white 0% 50%) 50% / 18px 18px;break-inside:avoid}figure img{display:block;width:auto;height:auto;max-width:100%;margin:auto}footer{border-top:1px solid #d5dce0;padding-top:14px;font-size:11px;color:#657580;margin-top:26px}.message>div:empty{display:none}
 @page{size:A4;margin:16mm 17mm 18mm}@media print{body{background:white;font-size:11pt;line-height:1.42}.page{max-width:none;border:0;margin:0;padding:0}h1{font-size:24pt}header{margin-bottom:14px;padding-bottom:14px}h2{font-size:10pt;margin-top:0}h3{font-size:9pt}.message{padding:9px 12px;margin-bottom:10px}.assistant{padding:0}.with-images{break-before:page}figure{margin:9px 0 12px}figure img{max-height:118mm}.two-images figure img{max-height:79mm}.metadata{font-size:9pt}table{font-size:9pt}th,td{padding:6px}footer{font-size:8pt}}
 @media(max-width:650px){.page{margin:0;padding:24px 18px;border:0}h1{font-size:25px}table{font-size:11px}th,td{padding:6px}}
 figure{background:none;border:0}figure img{outline:1px solid #d6dfe4}img[data-file="images/03-homo-transparent.png"]{background:repeating-conic-gradient(#edf0f2 0% 25%,white 0% 50%) 50% / 18px 18px}
 </style></head><body><main class="page"><header><div class="eyebrow">EigenVista · Conversation export</div><h1>${esc(source.title)}</h1><div class="metadata">7 exchanges · 6 images · Exported 16 November 2026<br>Source: <a href="${esc(source.url)}">${esc(source.url)}</a></div></header>${pairs.join('\n')}<footer>Export of the shared user/assistant messages and attached images. Conversation wording and image bytes are preserved. Application controls and collapsed work traces are omitted. Images are embedded in this export for offline sharing.</footer></main></body></html>`;
 const htmlPath=path.join(stage,basename+'.html');fs.writeFileSync(htmlPath,html);
 const markdown=`# ${source.title}\n\nSource: ${source.url}\n\nExported: 16 November 2026. Seven exchanges and six attached images.\n\n`+content.map((m,i)=>`${i%2===0?`## Exchange ${i/2+1}\n\n`:''}### ${m.role==='user'?'User':'Assistant'}\n\n${m.markdown}`).join('\n\n')+'\n';
 fs.writeFileSync(path.join(stage,basename+'.md'),markdown);
 await page.setContent(html,{waitUntil:'load'});await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()))});
 assert.equal(await page.locator('img').count(),6);
 const pdfPath=path.join(stage,basename+'.pdf');
 await page.pdf({path:pdfPath,format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-family:Arial;font-size:8px;color:#64717b;width:100%;text-align:center">EigenVista prompt-control session · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',margin:{top:'16mm',bottom:'18mm',left:'17mm',right:'17mm'}});
 await page.screenshot({path:path.join(stage,'html-preview.png'),fullPage:true});
 execFileSync('/usr/bin/zip',['-q','-r',basename+'-markdown.zip',basename+'.md','images'],{cwd:stage});
 const result={source:source.url,title:source.title,capturedAt:source.capturedAt,exportedAt:new Date().toISOString(),messages:14,userMessages:7,assistantMessages:7,imageOccurrences:6,textFidelity:'All 14 messages matched after whitespace normalization; no wording changed.',images:assets.map(({url,file,bytes,width,height,sha256})=>({url,file,bytes,width,height,sha256})),outputs:[basename+'.pdf',basename+'.html',basename+'.md',basename+'-markdown.zip'].map(file=>{const bytes=fs.readFileSync(path.join(stage,file));return{file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}})};
 fs.writeFileSync(path.join(stage,'export-manifest.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close()}
