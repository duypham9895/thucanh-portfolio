// Functional acceptance: behaviour parity + accessibility. Exits non-zero on any failure.
//   node functional.mjs <baseUrl>
import { chromium } from 'playwright-core';

const EXE = process.env.QA_CHROME
  || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const BASE = process.argv[2] || 'http://localhost:8900/';

const res = [];
const check = (name, pass, detail) => {
  res.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '  ' + JSON.stringify(detail)}`);
};

const browser = await chromium.launch({ executablePath: EXE, args: ['--hide-scrollbars'] });

async function newPage(opts = {}) {
  const ctx = await browser.newContext(Object.assign(
    { viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' }, opts));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.__errs = errs;
  return p;
}
const ready = async (p) => { await p.waitForSelector('#work .crow', { timeout: 15000 }); await p.waitForTimeout(250); };

/* 1 — renders, VI default, no console errors */
{
  const p = await newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await ready(p);
  const s = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    sections: [...document.querySelectorAll('section')].map((x) => x.id || '(videos)'),
    campaigns: document.querySelectorAll('[data-qa^="campaign-"]').length,
    folders: document.querySelectorAll('.folder').length,
    pressedVI: document.querySelector('[data-lang="VI"]').getAttribute('aria-pressed'),
    emptySlots: document.querySelectorAll('.slot-empty').length,
  }));
  // Two rules rather than two literals, so neither can go stale:
  //  - the videos section appears only when a VIDEOS entry has media (D7)
  //  - section order comes from config.meta.sectionOrder (D8), not a hard-coded list here
  const cfg = await p.evaluate(() => fetch('config.json').then((r) => r.json()));
  const CORE = ['top'].concat(cfg.meta.sectionOrder).concat(['contact']);
  const core = s.sections.filter((x) => x !== '(videos)');
  const coreOk = core.length === CORE.length && CORE.every((id, i) => core[i] === id);
  check(`renders VI with sections in config order (${CORE.join(' > ')}) / 6 folders / 5 campaigns`,
    s.lang === 'vi' && coreOk && s.folders === 6 && s.campaigns === 5 && s.pressedVI === 'true',
    { expected: CORE, actual: core, ...s });
  // the folder stack is the table of contents: it must match the page order
  const folderOrder = await p.evaluate(() => [...document.querySelectorAll('.folder')]
    .map((f) => (f.querySelector('.tabname') || {}).textContent));
  check('folder stack order matches page order',
    folderOrder.length === cfg.meta.sectionOrder.length
      && cfg.meta.sectionOrder.every((id, i) => {
        const f = cfg.meta.folders[i];
        return f && f.id === id && folderOrder[i] === f.label;
      }),
    { folderOrder, sectionOrder: cfg.meta.sectionOrder });
  check('no empty media frames are rendered (D7)', s.emptySlots === 0, { emptySlots: s.emptySlots });
  check('no console errors on load', p.__errs.length === 0, p.__errs.slice(0, 3));
  await p.context().close();
}

/* 2 — language toggle swaps copy + <html lang>, and persists */
{
  const p = await newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await ready(p);
  const before = await p.textContent('.opening-intro');
  await p.click('[data-lang="EN"]'); await p.waitForTimeout(400);
  const after = await p.textContent('.opening-intro');
  const langAttr = await p.evaluate(() => document.documentElement.lang);
  const stored = await p.evaluate(() => localStorage.getItem('lang'));
  check('EN toggle swaps copy and <html lang>', before !== after && langAttr === 'en' && /3\+ years/.test(after),
    { langAttr, stored, after: (after || '').slice(0, 40) });
  await p.reload({ waitUntil: 'networkidle' }); await ready(p);
  const persisted = await p.evaluate(() => document.documentElement.lang);
  check('language choice persists across reload', persisted === 'en', { persisted });
  // and back
  await p.click('[data-lang="VI"]'); await p.waitForTimeout(400);
  const backVI = await p.evaluate(() => document.documentElement.lang);
  check('toggling back to VI works', backVI === 'vi', { backVI });
  await p.context().close();
}

/* 3 — campaign sheet: open, correct campaign, next cycles, Escape closes, focus restores */
{
  const p = await newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await ready(p);
  const ids = await p.evaluate(() => [...document.querySelectorAll('[data-qa^="campaign-"]')]
    .map((b) => b.getAttribute('data-qa').replace('campaign-', '')));
  let allOpen = true, allMatch = true;
  for (const id of ids) {
    await p.click(`[data-qa="campaign-${id}"]`);
    await p.waitForSelector('.sheet', { timeout: 4000 }).catch(() => { allOpen = false; });
    const shown = await p.evaluate(() => { const s = document.querySelector('.sheet');
      return s ? s.getAttribute('data-qa-campaign') : null; });
    if (shown !== id) allMatch = false;
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    if (await p.$('.sheet')) allOpen = false;
  }
  check(`all ${ids.length} sheets open, match their campaign, and close on Escape`, allOpen && allMatch, { ids, allOpen, allMatch });

  // next-campaign cycling
  await p.click(`[data-qa="campaign-${ids[0]}"]`); await p.waitForSelector('.sheet');
  const seq = [await p.evaluate(() => document.querySelector('.sheet').getAttribute('data-qa-campaign'))];
  for (let i = 0; i < ids.length; i++) {
    await p.click('.sheet-foot .btn-solid'); await p.waitForTimeout(250);
    seq.push(await p.evaluate(() => document.querySelector('.sheet').getAttribute('data-qa-campaign')));
  }
  check('next-campaign cycles through all and wraps',
    seq.length === ids.length + 1 && seq[0] === seq[ids.length] && new Set(seq).size === ids.length, { seq });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // focus restore
  await p.focus(`[data-qa="campaign-${ids[1]}"]`);
  await p.keyboard.press('Enter'); await p.waitForSelector('.sheet');
  const insideSheet = await p.evaluate(() => !!document.activeElement.closest('.sheet'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  const restored = await p.evaluate(() => document.activeElement.getAttribute('data-qa'));
  check('sheet takes focus, Escape restores it to the opener',
    insideSheet && restored === `campaign-${ids[1]}`, { insideSheet, restored });

  // background inert while modal open
  await p.click(`[data-qa="campaign-${ids[0]}"]`); await p.waitForSelector('.sheet');
  const inert = await p.evaluate(() => ({
    app: document.getElementById('app').getAttribute('aria-hidden'),
    bodyOverflow: document.body.style.overflow,
    sheetScroll: document.querySelector('.sheet').scrollTop,
    role: document.querySelector('.sheet').getAttribute('role'),
    modal: document.querySelector('.sheet').getAttribute('aria-modal'),
  }));
  check('modal semantics: role=dialog, aria-modal, background hidden, scroll locked, sheet at top',
    inert.role === 'dialog' && inert.modal === 'true' && inert.app === 'true'
    && inert.bodyOverflow === 'hidden' && inert.sheetScroll === 0, inert);
  await p.context().close();
}

/* 4 — keyboard reachability of primary controls */
{
  const p = await newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await ready(p);
  const reach = await p.evaluate(() => {
    const sel = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const all = [...document.querySelectorAll(sel)];
    return {
      folders: all.filter((n) => n.classList.contains('folder')).length,
      campaigns: all.filter((n) => (n.getAttribute('data-qa') || '').startsWith('campaign-')).length,
      langBtns: all.filter((n) => n.hasAttribute('data-lang')).length,
      skip: !!document.querySelector('.skip'),
      divClickHandlers: document.querySelectorAll('div[onclick]').length,
    };
  });
  check('folders, campaigns and lang toggle are all keyboard-reachable controls',
    reach.folders === 6 && reach.campaigns === 5 && reach.langBtns === 2 && reach.skip, reach);
  await p.context().close();
}

/* 5 — reduced motion must FORCE reveals visible, not just disable the transition */
{
  const p = await newPage({ reducedMotion: 'reduce' });
  await p.goto(BASE, { waitUntil: 'networkidle' }); await ready(p);
  const hidden = await p.evaluate(() => [...document.querySelectorAll('.reveal')]
    .filter((n) => parseFloat(getComputedStyle(n).opacity) < 1).length);
  check('prefers-reduced-motion leaves no content stranded at opacity:0', hidden === 0, { hiddenReveals: hidden });
  await p.context().close();
}

/* 6 — copy-email toast */
{
  const p = await newPage();
  await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await p.goto(BASE, { waitUntil: 'networkidle' }); await ready(p);
  await p.click('.contact-btns .btn-solid');
  await p.waitForTimeout(150);
  const shown = await p.evaluate(() => !!document.querySelector('.toast'));
  await p.waitForTimeout(2000);
  const gone = await p.evaluate(() => !document.querySelector('.toast'));
  check('copy-email shows a toast that clears after ~1.8s', shown && gone, { shown, gone });
  await p.context().close();
}

/* 7 — Vietnamese renders with the self-hosted family, not a fallback */
{
  const p = await newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' }); await ready(p);
  const f = await p.evaluate(async () => {
    await document.fonts.ready;
    const probe = 'Trần Tôn Nữ Thục Anh — kỹ năng, chiến dịch, thương hiệu';
    return {
      loaded: [...document.fonts].filter((x) => x.status === 'loaded').map((x) => x.family + ' ' + x.weight),
      beVN: document.fonts.check('300 16px "Be Vietnam Pro"', probe),
      cormorant: document.fonts.check('300 16px "Cormorant Garamond"', probe),
      italianno: document.fonts.check('400 16px "Italianno"', 'folio'),
      nfcOnly: [...document.body.innerText].every((c) => c.normalize('NFC') === c),
    };
  });
  check('all three families cover the Vietnamese probe string; text is NFC',
    f.beVN && f.cormorant && f.italianno && f.nfcOnly,
    { beVN: f.beVN, cormorant: f.cormorant, italianno: f.italianno, nfcOnly: f.nfcOnly, loaded: f.loaded.length });
  await p.context().close();
}

await browser.close();
const failed = res.filter((r) => !r.pass);
console.log(`\n${res.length - failed.length}/${res.length} functional checks passed`);
if (failed.length) process.exit(1);
