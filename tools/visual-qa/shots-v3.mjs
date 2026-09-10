import { launch, CONTEXT } from './browser.mjs';
import fs from 'node:fs';
fs.mkdirSync('out/v3', { recursive: true });
const b = await launch();
for (const [name, url, w, full] of [
  ['desktop-hero','http://localhost:8900/',1440,false],
  ['desktop-full','http://localhost:8900/',1440,true],
  ['mobile-hero','http://localhost:8900/',390,false],
  ['mobile-full','http://localhost:8900/',390,true],
  ['vi-hero','http://localhost:8900/vi/',1440,false],
]) {
  const p = await b.newPage({ viewport:{width:w,height:900}, ...CONTEXT });
  await p.goto(url,{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready);
  await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(n=>n.classList.add('in')));
  await p.waitForTimeout(600);
  await p.screenshot({ path:`out/v3/${name}.png`, fullPage: full });
  await p.close();
  console.log('shot', name);
}
// campaign sheet: open each and measure overflow inside
const p = await b.newPage({ viewport:{width:390,height:900}, ...CONTEXT });
await p.goto('http://localhost:8900/',{waitUntil:'networkidle'});
const ids = await p.$$eval('[data-qa^="campaign-"]', ns=>ns.map(n=>n.getAttribute('data-campaign')));
for (const id of ids) {
  await p.click(`[data-campaign="${id}"]`);
  await p.waitForTimeout(400);
  const m = await p.evaluate(()=>{
    const s=document.querySelector('.sheet');
    if(!s) return {err:'no sheet'};
    const spill=[...s.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>30 && r.right>window.innerWidth+1;}).length;
    return {page:document.documentElement.scrollWidth-document.documentElement.clientWidth,
            sheet:s.scrollWidth-s.clientWidth, spill, qa:s.getAttribute('data-qa-campaign')};
  });
  console.log(`  sheet ${id.padEnd(11)} page=${m.page} sheet=${m.sheet} spill=${m.spill} matched=${m.qa===id}`);
  await p.screenshot({ path:`out/v3/sheet-${id}-390.png` });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(250);
}
await b.close();
