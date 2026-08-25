// Acceptance gates. Every gate exits non-zero on failure; the runner aggregates.
//
//   node gates.mjs <candidateBaseUrl> [--oracle <dir>] [--lang vi|en|both]
//
// Gates implemented here (see docs/plans/artifact-parity-rebuild.md §8):
//   G1 baseline integrity      hash-pin of the recovered design source
//   G2 geometry parity         per-section height equality vs ADJUSTED oracle, per viewport
//   G3 horizontal overflow     page AND every campaign sheet, at mobile viewports
//   G4 pixel parity            dimension equality + masked diff + connected-component cap
//   G5 design tokens           :root computed tokens vs oracle, allowing only DEVIATIONS.md
//   G6 contrast                every rendered text node vs its effective background
//   G7 assets                  zero failed network requests
//
// G4 needs captures; run capture.mjs first or pass --capture.

import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const EXE = process.env.QA_CHROME
  || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

const args = process.argv.slice(2);
const CAND = args[0];
const ORACLE_BASE = process.env.QA_ORACLE || 'http://localhost:8900/docs/design/artifact-source/reference';
const REPO = path.resolve(process.env.QA_REPO || '.');

const PARITY_VIEWPORTS = [1440, 1280, 1024, 901, 900];
const MOBILE_VIEWPORTS = [320, 375, 390, 768];

const results = [];
const record = (id, name, pass, detail) => {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}`);
  if (!pass || process.env.QA_VERBOSE) console.log(`        ${JSON.stringify(detail)}`);
};

async function launch() {
  return chromium.launch({
    executablePath: EXE,
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--force-color-profile=srgb',
      '--disable-lcd-text', '--font-render-hinting=none', '--disable-font-subpixel-positioning'],
  });
}
async function pageAt(browser, width, height = 1000) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1,
    locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', colorScheme: 'light', reducedMotion: 'reduce',
  });
  const p = await ctx.newPage();
  const failed = [];
  p.on('requestfailed', (r) => failed.push(r.url()));
  p.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  p.__failed = failed;
  return p;
}
async function settle(p) {
  await p.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;
      caret-color:transparent!important;scroll-behavior:auto!important}
      .reveal{opacity:1!important;transform:none!important}
      [class*="tweak" i],[id*="tweak" i],#__claude_design_branding{display:none!important}`,
  });
  await p.evaluate(() => {
    document.querySelectorAll('.reveal').forEach((n) => n.classList.add('in'));
    window.scrollTo(0, 0);
  });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(350);
}
const sectionHeights = (p) => p.evaluate(() => [...document.querySelectorAll('section')]
  .map((s, i) => ({ i, id: s.id || `(anon${i})`, h: Math.round(s.getBoundingClientRect().height) })));

// ── G1 baseline integrity ───────────────────────────────────────────────────
function g1() {
  const dir = path.join(REPO, 'docs/design/artifact-source');
  try {
    execFileSync('shasum', ['-a', '256', '-c', 'BASELINE.sha256'], { cwd: dir, stdio: 'pipe' });
    const lines = fs.readFileSync(path.join(dir, 'BASELINE.sha256'), 'utf8')
      .split('\n').filter((l) => /^[0-9a-f]{64}/.test(l));
    // `shasum -c` only verifies files that ARE listed. Deleting a pin AND its file passes.
    // Require the exact expected count so the manifest cannot silently shrink.
    const EXPECTED_PINS = 52;
    record('G1', 'baseline integrity', lines.length === EXPECTED_PINS,
      { filesPinned: lines.length, expected: EXPECTED_PINS });
  } catch (e) {
    const out = (e.stdout || Buffer.from('')).toString() + (e.stderr || Buffer.from('')).toString();
    record('G1', 'baseline integrity', false, { failed: out.split('\n').filter((l) => /FAILED/.test(l)) });
  }
}

// ── G2 geometry parity ──────────────────────────────────────────────────────
async function g2(browser, lang) {
  const bad = [];
  for (const w of PARITY_VIEWPORTS) {
    if (w <= 900) continue; // ≤900 is the responsive tier — no oracle
    const [po, pc] = [await pageAt(browser, w), await pageAt(browser, w)];
    await po.goto(`${ORACLE_BASE}/adjusted-${lang}.html`, { waitUntil: 'networkidle' });
    await pc.goto(`${CAND}?lang=${lang}`, { waitUntil: 'networkidle' });
    await settle(po); await settle(pc);
    // #top carries D5 (hero proof) and D6 (nav CV) — additive product-layer elements asserted by
    // G8 instead. Comparing them against an oracle derived from the candidate would be circular.
    // Every other section remains under exact-equality parity.
    const drop = (xs) => xs.filter((x) => x.id !== 'top');
    const [a, b] = [drop(await sectionHeights(po)), drop(await sectionHeights(pc))];
    if (a.length !== b.length) {
      bad.push({ w, reason: 'section count', oracle: a.map((x) => x.id), cand: b.map((x) => x.id) });
    } else {
      a.forEach((s, i) => {
        if (s.id !== b[i].id) bad.push({ w, reason: 'section order', at: i, oracle: s.id, cand: b[i].id });
        else if (s.h !== b[i].h) bad.push({ w, section: s.id, oracle: s.h, cand: b[i].h });
      });
    }
    await po.context().close(); await pc.context().close();
  }
  record('G2', `geometry parity (${lang})`, bad.length === 0, { mismatches: bad.slice(0, 12), count: bad.length });
}

// ── G3 overflow: page AND every campaign sheet ──────────────────────────────
const EXPECTED_CAMPAIGNS = 5;
async function g3(browser, lang) {
  const bad = [];
  for (const w of MOBILE_VIEWPORTS) {
    const p = await pageAt(browser, w, 900);
    await p.goto(`${CAND}?lang=${lang}`, { waitUntil: 'networkidle' });
    await settle(p);
    const page = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    if (page.sw > page.cw) bad.push({ w, where: 'page', overflow: page.sw - page.cw });

    // open each campaign through its REAL control, then measure the sheet and its descendants
    const controls = await p.$$('[data-qa^="campaign-"]');
    // Zero controls previously passed silently: the oracle has 5 .crow but 0 data-qa hooks,
    // so the sheet loop iterated zero times and G3 "passed" without testing a single sheet.
    if (controls.length !== EXPECTED_CAMPAIGNS) {
      bad.push({ w, where: 'campaign controls', expected: EXPECTED_CAMPAIGNS, found: controls.length });
    }
    for (let i = 0; i < controls.length; i++) {
      const c = (await p.$$('[data-qa^="campaign-"]'))[i];
      if (!c) continue;
      await c.click();
      await p.waitForSelector('.sheet', { timeout: 5000 }).catch(() => {});
      await settle(p);
      const r = await p.evaluate(() => {
        const s = document.querySelector('.sheet');
        if (!s) return { missing: true };
        const out = { sheet: s.scrollWidth - s.clientWidth, kids: [] };
        s.querySelectorAll('*').forEach((el) => {
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') {
            out.kids.push({ cls: (el.className || '').toString().slice(0, 30), by: el.scrollWidth - el.clientWidth });
          }
          const rect = el.getBoundingClientRect();
          if (rect.right > document.documentElement.clientWidth + 1 && rect.width > 30) {
            out.kids.push({ cls: (el.className || '').toString().slice(0, 30), spillRight: Math.round(rect.right) });
          }
        });
        return out;
      });
      if (r.missing) bad.push({ w, where: `sheet#${i}`, reason: 'sheet did not open' });
      else if (r.sheet > 0 || r.kids.length) bad.push({ w, where: `sheet#${i}`, sheetOverflow: r.sheet, kids: r.kids.slice(0, 4) });
      const wanted = await c.getAttribute('data-qa');
      const shown = await p.evaluate(() => { const s = document.querySelector('.sheet');
        return s ? s.getAttribute('data-qa-campaign') : null; });
      if (shown && wanted && `campaign-${shown}` !== wanted) {
        bad.push({ w, where: `sheet#${i}`, reason: 'wrong campaign opened', wanted, shown });
      }
      await p.keyboard.press('Escape');
      await p.waitForTimeout(150);
      if (await p.$('.sheet')) bad.push({ w, where: `sheet#${i}`, reason: 'Escape did not close sheet' });
    }
    await p.context().close();
  }
  record('G3', `horizontal overflow (${lang})`, bad.length === 0, { violations: bad.slice(0, 10), count: bad.length });
}

// ── G4 pixel parity ─────────────────────────────────────────────────────────
const OUTSIDE_BUDGET_PCT = 0.05;   // noise floor measured at 0.0017%
const MAX_REGION_PX = 2000;

async function shoot(browser, url, w) {
  const p = await pageAt(browser, w);
  await p.goto(url, { waitUntil: 'networkidle' });
  await settle(p);
  const buf = await p.screenshot({ fullPage: true, animations: 'disabled', scale: 'css' });
  // Anchor on the first section AFTER the hero, not a hard-coded #about. Hard-coding meant that
  // reordering sections silently dropped #work and #cv out of the pixel comparison — a content
  // change quietly narrowing the test.
  const aboutTop = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('section')];
    const i = secs.findIndex((x) => x.id === 'top');
    const first = secs[i + 1];
    return first ? Math.round(first.getBoundingClientRect().top + window.scrollY) : 0;
  });
  const boxes = await p.evaluate(() => [...document.querySelectorAll('[data-qa="slot"],image-slot,[data-fslot]')]
    .map((s) => { const r = s.getBoundingClientRect();
      return { x0: Math.floor(r.left + scrollX) - 3, y0: Math.floor(r.top + scrollY) - 3,
               x1: Math.ceil(r.right + scrollX) + 3, y1: Math.ceil(r.bottom + scrollY) + 3 }; }));
  await p.context().close();
  return { png: PNG.sync.read(buf), boxes, aboutTop };
}

function connectedRegions(mask, w, h) {
  const seen = new Uint8Array(w * h); const sizes = [];
  const idx = (x, y) => y * w + x;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(x, y);
    if (seen[i] || !mask[i]) continue;
    let n = 0; const st = [i]; seen[i] = 1;
    while (st.length) {
      const c = st.pop(); n++;
      const cx = c % w, cy = (c - cx) / w;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = idx(nx, ny);
        if (!seen[ni] && mask[ni]) { seen[ni] = 1; st.push(ni); }
      }
    }
    sizes.push(n);
  }
  return sizes.sort((a, b) => b - a);
}

async function g4(browser, lang) {
  const oRaw = await shoot(browser, `${ORACLE_BASE}/adjusted-${lang}.html`, 1440);
  const cRaw = await shoot(browser, `${CAND}?lang=${lang}`, 1440);
  // Crop each capture from ITS OWN first-post-hero section top. The hero differs by design (D5/D6); everything
  // below must still match to the pixel, and cropping per-source keeps the regions aligned.
  const crop = (r) => {
    const { png, aboutTop } = r;
    const h = png.height - aboutTop;
    const out = new PNG({ width: png.width, height: h });
    PNG.bitblt(png, out, 0, aboutTop, png.width, h, 0, 0);
    return { png: out, boxes: r.boxes.map((b) => ({ ...b, y0: b.y0 - aboutTop, y1: b.y1 - aboutTop })) };
  };
  const o = crop(oRaw), c = crop(cRaw);
  if (o.png.width !== c.png.width || o.png.height !== c.png.height) {
    record('G4', `pixel parity (${lang})`, false,
      { reason: 'DIMENSION MISMATCH', oracle: [o.png.width, o.png.height], cand: [c.png.width, c.png.height] });
    return;
  }
  const { width: w, height: h } = o.png;
  const d = new PNG({ width: w, height: h });
  pixelmatch(o.png.data, c.png.data, d.data, w, h, { threshold: 0.1, includeAA: false, diffMask: true });
  // The mask MUST come only from the pinned oracle. Unioning candidate boxes lets a candidate
  // enlarge or move a slot to swallow a regression inside the mask.
  const boxes = o.boxes;
  if (c.boxes.length !== o.boxes.length) {
    record('G4', `pixel parity (${lang})`, false,
      { reason: 'slot count mismatch', oracle: o.boxes.length, cand: c.boxes.length });
    return;
  }
  const geomDrift = o.boxes.map((b, i) => {
    const k = c.boxes[i];
    const d = Math.max(Math.abs(b.x0 - k.x0), Math.abs(b.y0 - k.y0), Math.abs(b.x1 - k.x1), Math.abs(b.y1 - k.y1));
    return d > 1 ? { i, oracle: b, cand: k, drift: d } : null;
  }).filter(Boolean);
  if (geomDrift.length) {
    record('G4', `pixel parity (${lang})`, false, { reason: 'slot geometry drift', geomDrift: geomDrift.slice(0, 5) });
    return;
  }
  const outside = new Uint8Array(w * h);
  let inside = 0, out = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d.data[(y * w + x) * 4 + 3] === 0) continue;
    if (boxes.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1)) inside++;
    else { out++; outside[y * w + x] = 1; }
  }
  const regions = connectedRegions(outside, w, h);
  const pct = 100 * out / (w * h);
  fs.mkdirSync(path.join(REPO, 'tools/visual-qa/out'), { recursive: true });
  fs.writeFileSync(path.join(REPO, `tools/visual-qa/out/diff-${lang}-1440.png`), PNG.sync.write(d));
  record('G4', `pixel parity (${lang})`, pct <= OUTSIDE_BUDGET_PCT && (regions[0] || 0) <= MAX_REGION_PX,
    { insideMasks: inside, outside: out, outsidePct: +pct.toFixed(4), budgetPct: OUTSIDE_BUDGET_PCT,
      largestRegion: regions[0] || 0, maxRegion: MAX_REGION_PX, top5Regions: regions.slice(0, 5) });
}

// ── G5 design tokens ────────────────────────────────────────────────────────
const TOKENS = ['--bg','--paper','--ink','--soft','--line','--pink','--rose','--olive','--citron',
  '--beige','--accent','--accent2','--disp','--sans','--script','--scale'];
async function g5(browser, lang) {
  const read = async (url) => {
    const p = await pageAt(browser, 1440);
    await p.goto(url, { waitUntil: 'networkidle' }); await settle(p);
    const v = await p.evaluate((ts) => { const cs = getComputedStyle(document.documentElement);
      return Object.fromEntries(ts.map((t) => [t, cs.getPropertyValue(t).trim()])); }, TOKENS);
    await p.context().close(); return v;
  };
  const [a, b] = [await read(`${ORACLE_BASE}/adjusted-${lang}.html`), await read(`${CAND}?lang=${lang}`)];
  const diff = TOKENS.filter((t) => a[t] !== b[t]).map((t) => ({ token: t, oracle: a[t], cand: b[t] }));
  record('G5', `design tokens (${lang})`, diff.length === 0, { drift: diff });
}

// ── G6 contrast ─────────────────────────────────────────────────────────────
async function g6(browser, lang) {
  const p = await pageAt(browser, 1440);
  await p.goto(`${CAND}?lang=${lang}`, { waitUntil: 'networkidle' }); await settle(p);
  const fails = await p.evaluate(() => {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const parse = (s) => { const m = (s.match(/[\d.]+/g) || []).map(Number);
      return { rgb: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
    // Backgrounds must be COMPOSITED, not taken as opaque. Treating rgba(127,127,127,.08)
    // as solid grey invents contrast failures that do not exist on screen.
    const over = (fg, fa, bg) => fg.map((c, i) => c * fa + bg[i] * (1 - fa));
    const bgOf = (el) => {
      const stack = []; let n = el;
      while (n && n !== document.documentElement) {
        const { rgb, a } = parse(getComputedStyle(n).backgroundColor || 'rgba(0,0,0,0)');
        if (a > 0) { stack.push({ rgb, a }); if (a >= 1) break; }
        n = n.parentElement;
      }
      let base = parse(getComputedStyle(document.documentElement).backgroundColor || 'rgb(244,242,237)');
      let acc = base.a > 0 ? base.rgb : [244, 242, 237];
      for (let i = stack.length - 1; i >= 0; i--) acc = over(stack[i].rgb, stack[i].a, acc);
      return acc;
    };
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      const t = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join('');
      if (!t) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
      // Element opacity fades the TEXT against its own backdrop. Ignoring it is a false pass:
      // white on #BD5565 is 4.52, but .fnote{opacity:.85} renders 3.72 and .fgo{opacity:.75} 3.25.
      let cumOpacity = 1;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const o = parseFloat(getComputedStyle(n).opacity);
        if (!Number.isNaN(o)) cumOpacity *= o;
      }
      if (cumOpacity === 0) return;
      const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const fgp = parse(cs.color); const bg = bgOf(el);
      const fg = over(fgp.rgb, fgp.a * cumOpacity, bg);
      const l1 = L(fg), l2 = L(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const need = large ? 3 : 4.5;
      if (ratio < need) out.push({ text: t.slice(0, 38), size, weight, ratio: +ratio.toFixed(2), need,
        fg: cs.color, opacity: +cumOpacity.toFixed(2), bg: `rgb(${bg.map(Math.round).join(',')})` });
    });
    return out;
  });
  await p.context().close();
  record('G6', `contrast AA (${lang})`, fails.length === 0, { failures: fails.slice(0, 12), count: fails.length });
}

// ── G7 assets ───────────────────────────────────────────────────────────────
async function g7(browser, lang) {
  const p = await pageAt(browser, 1440);
  await p.goto(`${CAND}?lang=${lang}`, { waitUntil: 'networkidle' }); await settle(p);
  const failed = p.__failed.slice();
  await p.context().close();
  record('G7', `no failed requests (${lang})`, failed.length === 0, { failed: failed.slice(0, 10) });
}

// ── G8 reader-flow product layer (D5/D6/D7) ────────────────────────────────
// The hero band is excluded from G2/G4 because D5/D6 are additive and an oracle derived from the
// candidate would make that comparison circular. G8 therefore has to carry real weight: it asserts
// genuine VISIBILITY (not merely presence — a display:none node reports rect.top 0 and would have
// passed the earlier version), that the nav is actually persistent, that the CV link resolves to
// the real PDF, that the CV stays reachable after scrolling, and it runs at mobile as well as
// desktop.
const CV_PATH = 'downloads/Tran-Ton-Nu-Thuc-Anh-CV.pdf';

async function g8(browser, lang) {
  const bad = [];
  for (const w of [1440, 390]) {
    const p = await pageAt(browser, w, w < 900 ? 844 : 900);
    await p.goto(`${CAND}?lang=${lang}`, { waitUntil: 'networkidle' });
    await settle(p);

    const r = await p.evaluate((cvPath) => {
      const shown = (el) => {
        if (!el) return false;
        if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility !== 'visible') return false;
        let op = 1;
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
          const o = parseFloat(getComputedStyle(n).opacity);
          if (!Number.isNaN(o)) op *= o;
        }
        if (op <= 0.05) return false;
        const b = el.getBoundingClientRect();
        if (b.width <= 1 || b.height <= 1) return false;
        // left:-9999px keeps opacity and dimensions, so geometry has to be checked too — and a
        // hit-test catches an element covered or clipped by an ancestor.
        if (b.right <= 0 || b.bottom <= 0 || b.left >= innerWidth || b.top >= innerHeight) return false;
        const cx = Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1);
        const cy = Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 1);
        const hit = document.elementFromPoint(cx, cy);
        return !!hit && (el === hit || el.contains(hit) || hit.contains(el));
      };
      const cv = document.querySelector('[data-nav-cv]');
      const nav = document.getElementById('nav');
      const proof = document.querySelector('.hero-proof');
      const stats = [...document.querySelectorAll('.hero-stat')].map((s) => ({
        v: (s.querySelector('.hero-stat-v') || {}).textContent || '',
        k: (s.querySelector('.hero-stat-k') || {}).textContent || '',
        shown: shown(s),
      }));
      const brandsEl = document.querySelector('[data-hero-brands]');
      const brands = brandsEl ? brandsEl.textContent : '';
      const cvBox = cv ? cv.getBoundingClientRect() : null;
      return {
        cvShown: shown(cv),
        cvHref: cv ? cv.getAttribute('href') : null,
        // endsWith('/'+path) accepted https://evil.example/downloads/…CV.pdf and
        // javascript:…//downloads/…CV.pdf. Resolve against the page origin and require BOTH
        // same-origin and an exact pathname match.
        cvHrefOk: !!cv && (() => {
          try {
            const u = new URL(cv.getAttribute('href') || '', location.href);
            if (u.origin !== location.origin) return false;
            if (u.protocol !== location.protocol) return false;
            const want = new URL(cvPath, location.origin + '/').pathname;
            return u.pathname === want;
          } catch (e) { return false; }
        })(),
        cvDownload: !!cv && cv.hasAttribute('download'),
        cvInViewport: !!cvBox && cvBox.top >= 0 && cvBox.bottom <= window.innerHeight
                      && cvBox.left >= 0 && cvBox.right <= window.innerWidth,
        navFixed: !!nav && getComputedStyle(nav).position === 'fixed',
        proofShown: shown(proof),
        proofInFirstScreen: !!proof && proof.getBoundingClientRect().top < window.innerHeight,
        stats,
        statsOk: stats.length === 4 && stats.every((x) => x.v.trim() && x.k.trim() && x.shown),
        brandsShown: shown(brandsEl),
        brandCount: brands ? brands.split('·').length : 0,
        emptySlots: document.querySelectorAll('.slot-empty').length,
        unfilledFrames: [...document.querySelectorAll('.frame')]
          .filter((fr) => !fr.querySelector('img,iframe,video')).length,
      };
    }, CV_PATH);

    // the point of a persistent action is that it survives scrolling
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.7));
    await p.waitForTimeout(200);
    const afterScroll = await p.evaluate(() => {
      const cv = document.querySelector('[data-nav-cv]');
      if (!cv) return { shown: false, inViewport: false };
      const b = cv.getBoundingClientRect();
      const cs = getComputedStyle(cv);
      // opacity was omitted here, so `.nav.is-scrolled .nav-cv{opacity:0}` counted as visible.
      let op = 1;
      for (let n = cv; n && n !== document.documentElement; n = n.parentElement) {
        const o = parseFloat(getComputedStyle(n).opacity);
        if (!Number.isNaN(o)) op *= o;
      }
      const onScreen = b.right > 0 && b.bottom > 0
                       && b.left < window.innerWidth && b.top < window.innerHeight;
      const cx = Math.min(Math.max(b.left + b.width / 2, 1), window.innerWidth - 1);
      const cy = Math.min(Math.max(b.top + b.height / 2, 1), window.innerHeight - 1);
      const hit = document.elementFromPoint(cx, cy);
      const hittable = !!hit && (cv === hit || cv.contains(hit) || hit.contains(cv));
      return {
        shown: cs.display !== 'none' && cs.visibility === 'visible' && op > 0.05
               && b.height > 1 && b.width > 1 && onScreen && hittable,
        inViewport: b.top >= 0 && b.bottom <= window.innerHeight
                    && b.left >= 0 && b.right <= window.innerWidth,
      };
    });
    await p.context().close();

    const checks = {
      cvShown: r.cvShown, cvHrefOk: r.cvHrefOk, cvDownload: r.cvDownload,
      cvInViewportAtTop: r.cvInViewport, navFixed: r.navFixed,
      cvStillVisibleAfterScroll: afterScroll.shown && afterScroll.inViewport,
      proofShown: r.proofShown, proofInFirstScreen: r.proofInFirstScreen,
      statsOk: r.statsOk, brandsShown: r.brandsShown, brandsAtLeast5: r.brandCount >= 5,
      noEmptySlots: r.emptySlots === 0, noUnfilledFrames: r.unfilledFrames === 0,
    };
    Object.keys(checks).forEach((k) => { if (!checks[k]) bad.push({ w, failed: k, detail: r[k] }); });
  }
  record('G8', `reader flow: CV + proof visible, no empty media (${lang})`, bad.length === 0,
    { failures: bad.slice(0, 8), count: bad.length });
}

// ── G9 browser-truth release verification ──────────────────────────────────
// Delegates to tools/verify-deployed.mjs. The static release gate parses index.html/index.js with
// regexes, which seven review rounds showed cannot be finished — and deciding which value reaches
// fetch(CONFIG_URL) from source text is undecidable anyway. This asks the browser what it actually
// applied, executed and fetched, so every parser-spoof class collapses at once.
function g9() {
  try {
    const out = execFileSync('node', [path.join(REPO, 'tools/visual-qa/verify-deployed.mjs'), CAND],
      { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    record('G9', 'browser-truth release verification',
      /browser verification OK/.test(out), { checks: (out.match(/ {2}ok {4}/g) || []).length });
  } catch (e) {
    const txt = ((e.stdout || '') + (e.stderr || '')).toString();
    record('G9', 'browser-truth release verification', false,
      { failures: txt.split('\n').filter((l) => l.trim().startsWith('- ')).slice(0, 5) });
  }
}

// ── runner ──────────────────────────────────────────────────────────────────
if (!CAND) { console.error('usage: node gates.mjs <candidateBaseUrl>'); process.exit(64); }
const langs = args.includes('--lang') ? [args[args.indexOf('--lang') + 1]] : ['vi', 'en'];
g1();
g9();
const browser = await launch();
for (const lang of langs) {
  await g2(browser, lang); await g3(browser, lang); await g4(browser, lang);
  await g5(browser, lang); await g6(browser, lang); await g7(browser, lang);
  await g8(browser, lang);
}
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} gates passed`);
if (failed.length) { console.log('FAILED: ' + failed.map((f) => f.id).join(', ')); process.exit(1); }
