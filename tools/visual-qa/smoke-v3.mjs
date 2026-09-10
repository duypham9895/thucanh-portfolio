import { launch, describe, CONTEXT } from './browser.mjs';
console.log('browser:', describe());
const b = await launch();
let FAIL = 0;   // a check that cannot fail cannot gate anything
const errs = [], failed = [];
for (const [label, url] of [['EN (root)','http://localhost:8900/'], ['VI','http://localhost:8900/vi/']]) {
  const p = await b.newPage({ viewport:{width:1440,height:900}, ...CONTEXT });
  p.on('console', m => { if (m.type()==='error') errs.push(`${label}: ${m.text().slice(0,200)}`); });
  p.on('pageerror', e => errs.push(`${label} PAGEERROR: ${String(e).slice(0,300)}`));
  p.on('requestfailed', r => failed.push(`${label}: ${r.url().slice(0,120)} ${r.failure()?.errorText}`));
  p.on('response', r => { if (r.status()>=400) failed.push(`${label}: ${r.status()} ${r.url().slice(0,120)}`); });
  await p.goto(url, { waitUntil:'networkidle' });
  await p.evaluate(()=>document.fonts.ready);
  const info = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    sections: [...document.querySelectorAll('main section')].map(s=>s.id||'(no-id)'),
    h1: document.querySelector('h1')?.textContent?.trim().slice(0,40),
    folders: document.querySelectorAll('.folder').length,
    campaigns: document.querySelectorAll('.crow').length,
    brandImgs: document.querySelectorAll('.brandwall img').length,
    height: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    firstEyebrow: document.querySelector('.eyebrow')?.textContent?.trim().slice(0,50),
    fallbackShown: !document.getElementById('fallback')?.hidden,
  }));
  console.log(`\n── ${label} ${url}`);
  console.log(`   lang=${info.lang}  height=${info.height}  overflow=${info.overflow}  fallback=${info.fallbackShown}`);
  console.log(`   h1="${info.h1}"  eyebrow="${info.firstEyebrow}"`);
  console.log(`   sections(${info.sections.length}): ${info.sections.join(' → ')}`);
  console.log(`   folders=${info.folders} campaigns=${info.campaigns} brandImgs=${info.brandImgs}`);
  // mobile overflow
  for (const w of [320,375,390,768,900]) {
    await p.setViewportSize({width:w,height:900});
    await p.waitForTimeout(220);
    const o = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if (o > 0) FAIL++;
    console.log(`   overflow @${w}: ${o}${o>0?'  ← FAIL':''}`);
  }
  await p.close();
}
if (errs.length) FAIL++;
console.log(`\nconsole errors: ${errs.length}`); errs.slice(0,10).forEach(e=>console.log('  '+e));
if (failed.length) FAIL++;
console.log(`failed requests: ${failed.length}`); failed.slice(0,10).forEach(e=>console.log('  '+e));
await b.close();
if (FAIL) { console.error(`\nSMOKE FAILED — ${FAIL} problem(s)`); process.exit(1); }
console.log('\nsmoke OK');
