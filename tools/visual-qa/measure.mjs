import { chromium } from 'playwright-core';
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const url = process.argv[2];
const b = await chromium.launch({ executablePath: EXE, args:['--force-device-scale-factor=1','--hide-scrollbars','--force-color-profile=srgb'] });
const p = await (await b.newContext({ viewport:{width:1440,height:1000}, deviceScaleFactor:1 })).newPage();
await p.goto(url, { waitUntil:'networkidle', timeout:60000 });
await p.evaluate(()=>{document.querySelectorAll('.reveal').forEach(n=>n.classList.add('in'));});
await p.evaluate(()=>document.fonts.ready);
await p.waitForTimeout(400);
const out = await p.evaluate(()=>{
  const secs=[...document.querySelectorAll('section')].map((s,i)=>({i,id:s.id||'(videos)',h:Math.round(s.getBoundingClientRect().height)}));
  const slots=[...document.querySelectorAll('image-slot,[data-flattened-image-slot]')].map(s=>{
    const r=s.getBoundingClientRect(); return {id:s.id||s.getAttribute('data-flattened-image-slot'),w:Math.round(r.width),h:Math.round(r.height)};});
  return {total:document.documentElement.scrollHeight, secs, slots};
});
console.log(JSON.stringify(out,null,1));
await b.close();
