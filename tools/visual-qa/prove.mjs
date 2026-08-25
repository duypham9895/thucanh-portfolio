// Prove every diff pixel lies inside a known-delta region (image-slot placeholders).
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs'; import pixelmatch from 'pixelmatch'; import fs from 'node:fs';
const EXE=`${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const b=await chromium.launch({executablePath:EXE,args:['--force-device-scale-factor=1','--hide-scrollbars','--force-color-profile=srgb','--disable-lcd-text']});
const p=await (await b.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1})).newPage();
await p.goto('http://localhost:8899/',{waitUntil:'networkidle'});
await p.evaluate(()=>{document.querySelectorAll('.reveal').forEach(n=>n.classList.add('in'));window.scrollTo(0,0);});
await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
const boxes=await p.evaluate(()=>[...document.querySelectorAll('image-slot')].map(s=>{
  const r=s.getBoundingClientRect(); const sy=window.scrollY, sx=window.scrollX;
  return {id:s.id, x0:Math.floor(r.left+sx)-3, y0:Math.floor(r.top+sy)-3, x1:Math.ceil(r.right+sx)+3, y1:Math.ceil(r.bottom+sy)+3};
}));
await b.close();

const A=PNG.sync.read(fs.readFileSync(process.argv[2])), B=PNG.sync.read(fs.readFileSync(process.argv[3]));
const d=new PNG({width:A.width,height:A.height});
const n=pixelmatch(A.data,B.data,d.data,A.width,A.height,{threshold:0.1,includeAA:false,diffMask:true});
let inside=0, outside=0; const outPts=[];
for(let y=0;y<A.height;y++)for(let x=0;x<A.width;x++){
  const i=(y*A.width+x)*4; if(d.data[i+3]===0) continue;
  if(boxes.some(bx=>x>=bx.x0&&x<=bx.x1&&y>=bx.y0&&y<=bx.y1)) inside++;
  else { outside++; if(outPts.length<12) outPts.push([x,y]); }
}
console.log(JSON.stringify({slotBoxes:boxes.length, totalDiff:n, insideSlots:inside, outsideSlots:outside,
  pctOutside:+(100*outside/(A.width*A.height)).toFixed(5), sampleOutside:outPts},null,1));
