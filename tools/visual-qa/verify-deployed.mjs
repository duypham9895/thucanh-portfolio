#!/usr/bin/env node
// Browser-truth verification of the deployed release. Gate G9.
//
// WHY THIS EXISTS
// tools/release.mjs verifies by parsing index.html and index.js with regexes. Nine rounds of
// adversarial review showed that cannot be finished: a hand-rolled HTML parser keeps admitting new
// spoof classes, and deciding *which value reaches* `fetch(CONFIG_URL)` from source text is
// undecidable — a template literal, dead branch, or runtime-assembled string all defeat it.
//
// So this parses nothing. It loads the page in a real browser and observes what happened, and it
// binds what the browser CONSUMED to what is on disk by hashing response BODIES, not filenames.
//
//   node tools/visual-qa/verify-deployed.mjs [baseUrl]
// Lives beside the harness so it resolves playwright-core/pngjs/pixelmatch from its node_modules.

import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.join(import.meta.dirname, '..', '..'));
const BASE = (process.argv[2] || 'http://localhost:8900/').replace(/\/?$/, '/');
const EXE = process.env.QA_CHROME
  || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

const HASHED = /^(index|config)\.[0-9a-f]{8}\.(css|js|json)$/;
const sha8 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const CV_PATH = 'downloads/Tran-Ton-Nu-Thuc-Anh-CV.pdf';
const MIN_CV_PIXELS = 120;   // a 1px artifact or rounding wobble must not count as "renders"

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-manifest.json'), 'utf8'));
const generations = manifest.generations || [];
const want = generations[0];

const problems = [];
const fail = (m) => problems.push(m);
const ok = (m) => console.log(`  ok    ${m}`);

// ── every RETAINED generation must be a clean artifact, not just generation 0 ───────────────
// A spoof test once poisoned a retained generation: its hashed declaration was a template-literal
// decoy while live code assembled mutable config.json. G9 only checked generation 0, and committing
// would have shipped it.
generations.forEach((g, i) => {
  for (const k of ['css', 'js', 'config']) {
    const n = g[k];
    if (!n || !HASHED.test(n)) { fail(`generation ${i} ${k} invalid: ${n}`); continue; }
    const p = path.join(ROOT, n);
    if (!fs.existsSync(p)) { fail(`generation ${i} ${k} missing on disk: ${n}`); continue; }
    if (sha8(fs.readFileSync(p)) !== n.split('.')[1]) fail(`${n} does not hash to its filename`);
  }
  if (!g.js || !fs.existsSync(path.join(ROOT, g.js))) return;
  const js = fs.readFileSync(path.join(ROOT, g.js), 'utf8');
  const assigns = [...js.matchAll(/CONFIG_URL\s*=/g)].length;
  if (assigns !== 1) fail(`generation ${i} ${g.js}: ${assigns} CONFIG_URL assignments, need exactly 1`);
  if (!new RegExp(`CONFIG_URL = '${String(g.config).replace(/\./g, '\\.')}';`).test(js)) {
    fail(`generation ${i} ${g.js} lacks a plain literal CONFIG_URL = '${g.config}';`);
  }
});
if (!problems.length) ok(`all ${generations.length} retained generation(s) are clean, hash-matched artifacts`);

const browser = await chromium.launch({ executablePath: EXE });

async function run(width, height, label) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'vi-VN',
    deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await ctx.newPage();

  const requests = [];
  const bodies = new Map();   // url -> sha256 of the response body actually delivered
  const bad = [];
  page.on('request', (r) => requests.push({ url: r.url(), type: r.resourceType() }));
  page.on('requestfailed', (r) => bad.push(`FAILED ${r.url()}`));
  page.on('response', async (r) => {
    if (r.status() >= 400) { bad.push(`${r.status()} ${r.url()}`); return; }
    if (r.status() >= 300) { bad.push(`REDIRECT ${r.status()} ${r.url()} -> ${r.headers().location}`); return; }
    const name = r.url().split('/').pop().split('?')[0];
    if (name === 'index.html' || HASHED.test(name) || r.url() === BASE) {
      try { bodies.set(r.url(), sha256(await r.body())); } catch (e) { /* body gone */ }
    }
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('#work .crow', { timeout: 20000 });
  await page.waitForTimeout(1200);           // let any late request or SW registration surface

  const seen = await page.evaluate(() => ({
    sheets: [...document.styleSheets].map((s) => s.href).filter(Boolean),
    inlineSheets: [...document.styleSheets].filter((s) => !s.href).length,
    baseURI: document.baseURI,
    baseTags: [...document.querySelectorAll('base')].map((b) => b.getAttribute('href')),
    build: window.__PORTFOLIO_BUILD__ || null,
    swControlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    swRegs: 0,
    inlineScripts: [...document.querySelectorAll('script:not([src])')]
      .filter((s) => (s.textContent || '').trim().length > 0).length,
    sections: [...document.querySelectorAll('section')].map((s) => s.id || '(anon)'),
    cv: (() => {
      const a = document.querySelector('[data-nav-cv]');
      if (!a) return null;
      const u = new URL(a.href);          // .href is resolved by the engine, including <base>
      return { origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash };
    })(),
  }));

  const P = (m) => fail(`[${label}] ${m}`);

  // 1. base URI not redirected
  if (seen.baseTags.length) P(`unexpected <base href>: ${seen.baseTags.join(', ')}`);
  if (seen.baseURI !== BASE) P(`document.baseURI is ${seen.baseURI}, expected ${BASE}`);

  // 2. the EXECUTED code's own config value — not merely a URL that was requested
  if (!seen.build) P('window.__PORTFOLIO_BUILD__ absent — the released JS did not execute');
  else {
    if (seen.build.config !== want.config) {
      P(`executed code used CONFIG_URL '${seen.build.config}', release says '${want.config}'`);
    }
    if (!seen.build.booted) P('renderer never reported a successful boot');
  }
  if (seen.inlineScripts) P(`${seen.inlineScripts} inline <script> with code present; all JS must be the released file`);
  if (seen.swControlled) P('page is controlled by a service worker — responses are not the origin\'s');

  // 3. the stylesheet the engine applied
  if (seen.sheets.length !== 1) P(`engine applied ${seen.sheets.length} external stylesheets, expected 1`);
  else {
    const n = seen.sheets[0].split('/').pop().split('?')[0];
    if (n !== want.css) P(`applied stylesheet ${n} != ${want.css}`);
  }
  if (seen.inlineSheets) P(`${seen.inlineSheets} inline <style> block(s) present`);

  // 4. the config actually fetched, and no mutable one
  const cfgNames = [...new Set(requests.filter((r) => /config[^/]*\.json/.test(r.url))
    .map((r) => r.url.split('/').pop().split('?')[0]))];
  if (cfgNames.includes('config.json')) P(`page fetched MUTABLE config.json (${cfgNames.join(', ')})`);
  else if (cfgNames.length !== 1 || cfgNames[0] !== want.config) P(`fetched config ${cfgNames.join(', ')} != ${want.config}`);

  // 5. BYTES the browser consumed must equal bytes on disk — a redirect, alternate path, cache or
  //    server substitution can serve the right NAME with different content.
  let checkedBodies = 0;
  for (const [url, hash] of bodies) {
    const name = url.split('/').pop().split('?')[0];
    const local = path.join(ROOT, HASHED.test(name) ? name : 'index.html');
    if (!fs.existsSync(local)) { P(`served ${name} has no counterpart on disk`); continue; }
    if (sha256(fs.readFileSync(local)) !== hash) {
      P(`served bytes for ${name} differ from ${path.relative(ROOT, local)} on disk`);
    } else checkedBodies++;
  }
  if (!checkedBodies) P('no response bodies could be compared to disk');

  // 6. one request per hashed asset; a second same-named request can carry different bytes
  const hashedReqs = requests.map((r) => r.url).filter((u) => HASHED.test(u.split('/').pop().split('?')[0]));
  const counts = {};
  hashedReqs.forEach((u) => { const k = u.split('/').pop().split('?')[0]; counts[k] = (counts[k] || 0) + 1; });
  Object.entries(counts).forEach(([k, n]) => { if (n > 1) P(`${k} requested ${n} times`); });

  // 7. CV target, resolved by the engine
  if (!seen.cv) P('no [data-nav-cv] element');
  else {
    const exp = new URL(CV_PATH, BASE);
    if (seen.cv.origin !== exp.origin) P(`CV origin ${seen.cv.origin} != ${exp.origin}`);
    if (seen.cv.pathname !== exp.pathname) P(`CV pathname ${seen.cv.pathname} != ${exp.pathname}`);
    if (seen.cv.search || seen.cv.hash) P(`CV href carries query/fragment: ${seen.cv.search}${seen.cv.hash}`);
  }

  // 8. PIXEL TRUTH: the CV button must contribute a MEANINGFUL number of pixels.
  //    display/visibility/opacity/geometry/hit-testing are each individually defeatable —
  //    filter:opacity(0) leaves all of them intact. A threshold stops a 1px artifact passing.
  const el = await page.$('[data-nav-cv]');
  if (el) {
    const b = await el.boundingBox();
    if (!b || b.width < 2 || b.height < 2) P(`CV button has no box: ${JSON.stringify(b)}`);
    else {
      const clip = { x: Math.max(0, Math.round(b.x)), y: Math.max(0, Math.round(b.y)),
                     width: Math.round(b.width), height: Math.round(b.height) };
      // `.btn` has transition:all — and `visibility` IS transitionable, flipping discretely at the
      // midpoint. Without suppressing transitions the probe reads the OLD value and reports 0 px.
      await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
      await page.waitForTimeout(60);
      const before = PNG.sync.read(await page.screenshot({ clip }));
      const hidden = await page.evaluate(() => {
        const a = document.querySelector('[data-nav-cv]');
        if (!a) return null;
        a.style.setProperty('visibility', 'hidden', 'important');
        return getComputedStyle(a).visibility;
      });
      if (hidden !== 'hidden') P(`could not hide the CV button for the pixel probe (computed: ${hidden})`);
      await page.waitForTimeout(150);
      const after = PNG.sync.read(await page.screenshot({ clip }));
      if (before.width !== after.width || before.height !== after.height) P('CV clip size changed between shots');
      else {
        const diff = new PNG({ width: before.width, height: before.height });
        const n = pixelmatch(before.data, after.data, diff.data, before.width, before.height,
          { threshold: 0.1, includeAA: false, diffMask: true });
        if (n < MIN_CV_PIXELS) {
          P(`CV button renders only ${n} px (need >= ${MIN_CV_PIXELS}) — effectively invisible`);
        } else ok(`[${label}] CV button renders ${n} px of its own`);
      }
    }
  }

  if (bad.length) P(`failed / 4xx / redirected requests: ${bad.slice(0, 4).join(' | ')}`);
  await ctx.close();
  return { checkedBodies };
}

// run at both widths: a mobile-only filter:opacity(0) must not slip through
const d = await run(1440, 900, 'desktop');
const m = await run(390, 844, 'mobile');
await browser.close();

if (!problems.length) {
  ok(`response bodies byte-matched to disk (${d.checkedBodies} desktop / ${m.checkedBodies} mobile)`);
  ok('executed code, applied stylesheet and fetched config all match the release');
}

if (problems.length) {
  console.error('\nBROWSER VERIFICATION FAILED:');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('\nbrowser verification OK — the engine applied, executed and fetched exactly the released bytes');
