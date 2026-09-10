import { launch, CONTEXT } from './browser.mjs';
const b = await launch();
const p = await b.newPage({ viewport:{width:1440,height:1000}, ...CONTEXT });
await p.goto('http://localhost:8900/',{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(n=>n.classList.add('in')));
await p.waitForTimeout(600);
for (const id of ['about','education','cv','work','extra','awards','xfile','contact']) {
  const el = await p.$(`#${id}`);
  if (!el) { console.log('missing', id); continue; }
  await el.screenshot({ path:`out/v3/sec-${id}.png` });
  const box = await el.boundingBox();
  console.log(`${id.padEnd(10)} ${Math.round(box.width)}x${Math.round(box.height)}`);
}
// videos has no id
const v = await p.$('.vidgrid');
if (v) { await (await p.$('.vidgrid')).screenshot({path:'out/v3/sec-videos.png'}); console.log('videos     captured'); }
await b.close();
