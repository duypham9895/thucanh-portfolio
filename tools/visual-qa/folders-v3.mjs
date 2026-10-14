// folders-v3 — the folder stack points at what you can see.
//
// Why this gate exists. The tiles overlap by 16px (`.folder{margin-top:-16px}`) so they read as
// paper in a drawer. The button is full width and its box starts at its own tab's top, so the
// bottom 16px of every tile's body sat underneath the NEXT button: hovering the lower edge of
// "Education" lifted "Work experience". Nothing in the suite could see it. smoke-v3 measures
// overflow, a11y-v3 measures contrast and focus, videos-v3 measures the strip — none of them asks
// "does the thing under the cursor match the thing on the screen".
//
// Two ground truths, because one is not enough:
//
//   1. THE PAINTED PIXEL. Every folder has its own background colour, so an exact colour match
//      names the tile that is visually there. Pixels that are not a flat folder colour — text,
//      the inset highlight, antialiased corners — are skipped, which is what keeps a rounded
//      corner from being reported as a routing error. A rectangle-based oracle produced 686 false
//      positives here; this one produces none.
//
//   2. A REAL MOUSE. `elementFromPoint` hit-tests a page that is not being hovered, so it cannot
//      see a tile move out from under the cursor. `.folder:hover` lifts the tile 12px; point at
//      the bottom 12px of a body and it rises, un-hovers, and STAYS un-hovered, because hit
//      testing is re-evaluated on pointer movement and not on layout change. Fixing the routing
//      with `pointer-events` alone turned 44 wrong-tile points into 67 dead ones — worse than the
//      bug it fixed. Only a real mouse walk catches that, so this gate drives one.
//
// Exits non-zero. Verified to fail: removing `.folder{pointer-events:none}` reports ~18.9% of
// painted pixels misrouted; removing the `.folder:hover .folder-body::after` skirt reports the
// dead strip. A check that cannot fail cannot gate anything.
//
//   node folders-v3.mjs [urlEN] [urlVI]

import { launch, CONTEXT } from './browser.mjs';

const EN = process.argv[2] || 'http://localhost:8900/';
const VI = process.argv[3] || 'http://localhost:8900/vi/';
const WIDTHS = [1440, 1280, 1024, 901, 900, 768, 620, 390, 320];

let FAIL = 0;
const bad = (m) => { FAIL++; console.log('  FAIL ' + m); };
const ok = (m) => console.log('  ok   ' + m);

// The lift animates over 450ms. Reading hover state at 90ms reports the tile that is still
// settling as well as the one just entered — AGENTS.md says it: kill the transition, do not race it.
const NO_ANIM = '.folder,.tab,.folder-body,.fgo{transition:none!important}';

const prep = async (p, url) => {
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelectorAll('.reveal').forEach((e) => { e.style.transition = 'none'; e.classList.add('in'); });
  });
  await p.addStyleTag({ content: NO_ANIM });
  await p.waitForTimeout(200);
};

const b = await launch();

// ── 1. every painted pixel of the stack routes to the tile it belongs to ───────────────────
let probes = 0, misrouted = 0, dead = 0;
for (const [lang, url] of [['EN', EN], ['VI', VI]]) {
  for (const w of WIDTHS) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, ...CONTEXT });
    await prep(p, url);
    const geo = await p.evaluate(() => {
      const s = document.querySelector('.stack');
      if (!s) return null;
      const r = s.getBoundingClientRect();
      const x = Math.max(0, Math.floor(r.left)), y = Math.max(0, Math.floor(r.top));
      return {
        x, y,
        w: Math.min(Math.ceil(r.width), innerWidth - x),
        h: Math.min(Math.ceil(r.height), innerHeight - y),
        cols: [...document.querySelectorAll('.folder')].map((f) => getComputedStyle(f.querySelector('.tab')).backgroundColor),
      };
    });
    if (!geo) { bad(`${lang}@${w}: no .stack on the page`); await p.close(); continue; }
    if (geo.w <= 0 || geo.h <= 0) { await p.close(); continue; }
    const png = await p.screenshot({ clip: { x: geo.x, y: geo.y, width: geo.w, height: geo.h } });
    const r = await p.evaluate(async ({ b64, geo }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
      const d = cx.getImageData(0, 0, img.width, img.height).data;
      const key = (s) => s.match(/\d+/g).slice(0, 3).join(',');
      const map = new Map(); geo.cols.forEach((s, i) => map.set(key(s), i));
      const folders = [...document.querySelectorAll('.folder')];
      let total = 0, mis = 0, dd = 0; const ex = [];
      for (let yy = 0; yy < img.height; yy += 2) {
        for (let xx = 0; xx < img.width; xx += 3) {
          const i = (yy * img.width + xx) * 4;
          const vis = map.get(`${d[i]},${d[i + 1]},${d[i + 2]}`);
          if (vis === undefined) continue;
          total++;
          const el = document.elementFromPoint(geo.x + xx, geo.y + yy);
          const f = el ? el.closest('.folder') : null;
          const got = f ? folders.indexOf(f) : -1;
          if (got !== vis) {
            if (got === -1) dd++; else mis++;
            if (ex.length < 2) ex.push({ x: geo.x + xx, y: geo.y + yy, sees: vis, got });
          }
        }
      }
      return { total, mis, dd, ex, names: folders.map((f) => f.querySelector('.tabname').textContent.trim().slice(0, 20)) };
    }, { b64: png.toString('base64'), geo });
    probes += r.total; misrouted += r.mis; dead += r.dd;
    if (r.mis || r.dd) {
      bad(`${lang}@${w}: ${r.mis} painted pixel(s) route to the wrong tile, ${r.dd} to none, of ${r.total}`);
      for (const e of r.ex) {
        console.log(`        (${e.x},${e.y}) shows "${r.names[e.sees]}" but routes to ${e.got < 0 ? 'nothing' : `"${r.names[e.got]}"`}`);
      }
    }
    await p.close();
  }
}
if (!misrouted && !dead) ok(`${probes} painted pixels across ${WIDTHS.length} widths x 2 documents, every one routes to the tile it shows`);

// ── 2. a real mouse, walked down every body, hovers the tile it is pointing at ──────────────
for (const [lang, url] of [['EN', EN], ['VI', VI]]) {
  for (const w of [1440, 900, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, ...CONTEXT });
    await prep(p, url);
    const n = await p.evaluate(() => document.querySelectorAll('.folder').length);
    let checked = 0, dd = 0, wrong = 0;
    for (let i = 0; i < n; i++) {
      const g = await p.evaluate((i) => {
        const r = document.querySelectorAll('.folder')[i].querySelector('.folder-body').getBoundingClientRect();
        return { x: Math.round(r.right - 40), top: Math.round(r.top), h: Math.round(r.height), vis: r.top > 2 && r.bottom < innerHeight - 2 };
      }, i);
      if (!g.vis) continue;   // scrolled out of this viewport; the pixel pass already covered it
      for (let dy = 2; dy < g.h; dy += 3) {
        await p.mouse.move(2, 2); await p.waitForTimeout(18);
        await p.mouse.move(g.x, g.top + dy); await p.waitForTimeout(45);
        const hov = await p.evaluate(() => [...document.querySelectorAll('.folder')].map((f, j) => (f.matches(':hover') ? j : -1)).filter((j) => j >= 0));
        checked++;
        if (!hov.length) { dd++; if (dd === 1) bad(`${lang}@${w}: ${dy}px into tile ${i}'s body the pointer hovers NOTHING — the lift moved it away`); }
        else if (hov[0] !== i) { wrong++; if (wrong === 1) bad(`${lang}@${w}: ${dy}px into tile ${i}'s body, tile ${hov[0]} is the one that lifts`); }
      }
    }
    if (!dd && !wrong) ok(`${lang}@${w}: a real mouse walked ${checked} point(s) down every visible body, each lifts its own tile`);
    await p.close();
  }
}

// ── 3. the button still behaves like a button ──────────────────────────────────────────────
for (const [lang, url] of [['EN', EN], ['VI', VI]]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...CONTEXT });
  await prep(p, url);
  const cur = await p.evaluate(() => {
    const f = document.querySelectorAll('.folder')[1];
    return { tab: getComputedStyle(f.querySelector('.tab')).cursor, body: getComputedStyle(f.querySelector('.folder-body')).cursor };
  });
  if (cur.tab === 'pointer' && cur.body === 'pointer') ok(`${lang}: cursor is still pointer on tab and body`);
  else bad(`${lang}: cursor is tab=${cur.tab} body=${cur.body}, want pointer — pointer-events:none dropped the inherited cursor`);

  const pt = await p.evaluate(() => {
    const r = document.querySelectorAll('.folder')[1].querySelector('.folder-body').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(500);
  const moved = await p.evaluate(() => Math.round(scrollY) > 0 || location.hash !== '');
  if (moved) ok(`${lang}: clicking a body still navigates`);
  else bad(`${lang}: clicking a body no longer navigates`);

  await p.evaluate(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelectorAll('.folder')[3].focus(); });
  const focused = await p.evaluate(() => document.activeElement.classList.contains('folder'));
  if (focused) ok(`${lang}: a folder still takes keyboard focus`);
  else bad(`${lang}: a folder no longer takes keyboard focus`);
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const navd = await p.evaluate(() => Math.round(scrollY) > 0 || location.hash !== '');
  if (navd) ok(`${lang}: Enter on a focused folder still navigates`);
  else bad(`${lang}: Enter on a focused folder no longer navigates`);

  const clip = await p.evaluate(() => {
    const c = document.querySelector('.clip');
    if (!c || c.getBoundingClientRect().width === 0) return { hidden: true };
    const r = c.getBoundingClientRect();
    return { hidden: false, isClip: document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)) === c };
  });
  if (clip.hidden || !clip.isClip) ok(`${lang}: the paperclip is decoration, not a hit target`);
  else bad(`${lang}: the decorative paperclip is the hit target and blocks whatever is beneath it`);
  await p.close();
}

await b.close();
console.log(FAIL ? `\nFOLDERS FAILED — ${FAIL} problem(s)` : `\nfolders OK — ${probes} painted pixels and a real mouse agree on every tile`);
process.exit(FAIL ? 1 : 0);
