/* The video strip: the behaviour no other gate covers.
 *
 * smoke-v3 never scrolls and never queries a video, so it cannot see the strip at all. a11y-v3
 * measures contrast and focusability but never presses a facade, so everything after the click is
 * unmeasured. This file covers exactly that gap:
 *
 *   - every clip in config.json renders a cell, with a poster that actually decoded
 *   - the declared column ladder is the one the browser computes, at every tier
 *   - the browser picks the poster width the `sizes` string promises, at DPR 1 and DPR 2
 *   - no third-party request is made before a click, and only the clicked clip embeds
 *   - activating a facade swaps in the embed with ZERO layout shift
 *   - the keyboard reaches a facade and Enter activates it
 *
 *   node videos-v3.mjs [url]
 *
 * Exits non-zero on failure. A check that cannot fail cannot gate anything.
 */
import { launch, describe, CONTEXT } from './browser.mjs';

const URL = process.argv[2] || 'http://localhost:8900/';
console.log('browser:', describe());
console.log('url:', URL);

let FAIL = 0;
const bad = (m) => { console.error('  FAIL ' + m); FAIL++; };
const ok = (m) => console.log('  ok   ' + m);

const b = await launch();

/* The ladder this file asserts. It is the contract in index.css, restated here so a silent change
 * to one of them shows up as a disagreement rather than as nothing at all. The tiers are sampled
 * ON the breakpoints and one pixel past them, because a column ladder fails at its edges. */
const TIERS = [
  { w: 320, cols: 2 }, { w: 390, cols: 2 }, { w: 620, cols: 2 },
  { w: 621, cols: 3 }, { w: 768, cols: 3 }, { w: 900, cols: 3 },
  { w: 901, cols: 4 }, { w: 1024, cols: 4 }, { w: 1440, cols: 4 },
];

const read = async (p) => p.evaluate(() => {
  const lab = document.querySelector('.vidlabel');
  if (!lab) return null;
  const sec = lab.closest('section');
  const grid = sec.querySelector('.vidgrid');
  const cells = [...grid.children];
  const imgs = [...sec.querySelectorAll('img.vposter')];
  return {
    heading: lab.tagName,
    cells: cells.length,
    cols: new Set(cells.map((c) => Math.round(c.getBoundingClientRect().left))).size,
    posters: imgs.length,
    decoded: imgs.filter((i) => i.naturalWidth > 0).length,
    chosen: imgs.map((i) => (i.currentSrc || '').split('/').pop()),
    // The rung alone cannot catch a wrong `sizes`: three of the cases below sit on the floor
    // rung, where even `sizes:"1px"` would win. Compare what `sizes` RESOLVED to against the box
    // the image actually paints into.
    declared: imgs.map((i) => Math.round(parseFloat(getComputedStyle(i).width))),
    boxes: imgs.map((i) => Math.round(i.getBoundingClientRect().width)),
    buttons: sec.querySelectorAll('button.vfacade').length,
    named: [...sec.querySelectorAll('button.vfacade')].filter((x) => (x.getAttribute('aria-label') || '').length > 12).length,
    iframes: sec.querySelectorAll('iframe').length,
    // `.vidcap` reserves two lines. A caption that takes three does not clip — `min-height` is a
    // floor — it just makes its row taller than its neighbours, which is the misalignment the
    // reservation exists to prevent. It is also invisible to every other check here, and it only
    // appears at the narrow end, which viewport-sampling tends to skip.
    capLines: (() => {
      const caps = [...sec.querySelectorAll('.vidcap')];
      if (!caps.length) return [];
      const lh = parseFloat(getComputedStyle(caps[0]).lineHeight);
      return caps.map((c) => Math.round((c.getBoundingClientRect().height / lh) * 10) / 10);
    })(),
    overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  };
});

// Lazy images outside the viewport never load, and nothing here scrolls.
const eager = async (p) => {
  await p.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => {}))));
  });
  await p.waitForTimeout(400);
};

/* ── 1. the column ladder, and that nothing overflows at any tier ──────────────────────────── */
console.log('\n── column ladder');
let expectedCells = null;
for (const t of TIERS) {
  const ctx = await b.newContext({ ...CONTEXT, viewport: { width: t.w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
  await eager(p);
  const m = await read(p);
  if (!m) { bad(`${t.w}: no video strip rendered at all`); await ctx.close(); continue; }
  if (expectedCells === null) expectedCells = m.cells;

  if (m.cols !== t.cols) bad(`${t.w}: ${m.cols} columns, expected ${t.cols}`);
  else if (m.overflow > 0) bad(`${t.w}: ${m.overflow}px horizontal overflow`);
  else if (m.cells !== expectedCells) bad(`${t.w}: ${m.cells} cells, expected ${expectedCells}`);
  else if (m.decoded !== m.posters) bad(`${t.w}: ${m.posters - m.decoded} of ${m.posters} posters failed to decode`);
  else if (m.capLines.some((n) => n > 2.05)) {
    const over = m.capLines.map((n, i) => (n > 2.05 ? `#${i + 1}=${n}` : null)).filter(Boolean);
    bad(`${t.w}: caption(s) exceed the two reserved lines — ${over.join(' ')}`);
  } else ok(`${t.w}: ${t.cols} cols, ${m.cells} cells, ${m.decoded} posters, captions <=2 lines, 0 overflow`);
  await ctx.close();
}

/* ── 2. structure: a real heading, a real button per clip, no embed before a click ─────────── */
console.log('\n── structure');
{
  const ctx = await b.newContext({ ...CONTEXT, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const third = [];
  p.on('request', (r) => { if (/youtube|ytimg|googlevideo/.test(r.url())) third.push(r.url()); });
  await p.goto(URL, { waitUntil: 'load' });
  await eager(p);
  const m = await read(p);

  // A <p> is not reachable by heading navigation, which is how a screen-reader user scans a CV.
  if (!/^H[1-6]$/.test(m.heading)) bad(`strip label is <${m.heading.toLowerCase()}>, not a heading`);
  else ok(`strip label is <${m.heading.toLowerCase()}>`);

  if (m.buttons !== m.cells) bad(`${m.buttons} facade buttons for ${m.cells} cells`);
  else ok(`${m.buttons} facade buttons, one per cell`);

  if (m.named !== m.buttons) bad(`${m.buttons - m.named} facade button(s) have no usable accessible name`);
  else ok('every facade button has an accessible name');

  if (m.iframes !== 0) bad(`${m.iframes} iframe(s) present before any click — the facade is not deferring`);
  else ok('0 embeds before a click');

  // D11: nothing third-party until the visitor asks. A hot-linked poster would show up here.
  if (third.length) bad(`${third.length} third-party request(s) before a click, e.g. ${third[0].slice(0, 80)}`);
  else ok('0 third-party requests before a click');
  await ctx.close();
}

/* ── 3. `sizes` actually resolves to the rung it promises ──────────────────────────────────────
   Each case is "cell width x DPR -> the smallest rung that covers it", computed from the ladder
   in index.css, not from intuition. A phone at 2x wants LESS than a desktop at 2x, because the
   phone cell is 166px and the desktop cell is 280.5px — which is the whole reason `sizes` exists.

     1440 @1x   280.5 ->  281  ->  360w
     1440 @2x   280.5 ->  561  ->  576w
     1440 @3x   280.5 ->  842  ->  864w
      620 @2x   277.0 ->  554  ->  576w   (gap is still 22 here)
      390 @2x   166.0 ->  332  ->  360w   (the <=400 tier drops the gap to 14)
      390 @1x   166.0 ->  166  ->  360w   (nothing smaller exists)                                */
console.log('\n── srcset resolution');
for (const [vw, dpr, want] of [[1440, 1, 360], [1440, 2, 576], [1440, 3, 864], [620, 2, 576], [390, 2, 360], [390, 1, 360]]) {
  const ctx = await b.newContext({ ...CONTEXT, viewport: { width: vw, height: 900 }, deviceScaleFactor: dpr });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await eager(p);
  const m = await read(p);
  const wrong = m.chosen.filter((f) => f && !f.endsWith(`-${want}.webp`));
  // A `sizes` that over-declares pulls a rung too large (wasted bytes); one that under-declares
  // pulls one too small (a blurry poster). Either way it disagrees with the rendered box.
  const slip = m.boxes.map((b, i) => Math.abs(b - m.declared[i])).filter((d) => d > 2);
  if (wrong.length) bad(`${vw}@${dpr}x: expected -${want}.webp, got ${[...new Set(wrong)].slice(0, 2).join(', ')}`);
  else if (slip.length) bad(`${vw}@${dpr}x: sizes disagrees with the painted box by up to ${Math.max(...slip)}px`);
  else ok(`${vw}@${dpr}x -> ${want}w, sizes matches the box (${m.boxes[0]}px)`);
  await ctx.close();
}

/* ── 4. activation: the embed replaces the facade in place, with no layout shift ───────────── */
console.log('\n── activation');
{
  const ctx = await b.newContext({ ...CONTEXT, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
  await eager(p);

  const before = await p.evaluate(() => {
    const f = document.querySelector('.vidgrid > * .frame').getBoundingClientRect();
    return { h: Math.round(f.height), w: Math.round(f.width), doc: document.body.scrollHeight };
  });
  await p.click('.vidgrid .vfacade');
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => {
    const fr = document.querySelector('.vidgrid > * .frame');
    const f = fr.getBoundingClientRect();
    const ifr = fr.querySelector('iframe');
    return { h: Math.round(f.height), w: Math.round(f.width), doc: document.body.scrollHeight,
             opened: fr.classList.contains('vopen'), iframe: !!ifr,
             autoplay: ifr ? /autoplay=1/.test(ifr.src) : false,
             stillFacade: !!fr.querySelector('.vfacade'),
             others: document.querySelectorAll('.vidgrid iframe').length };
  });

  if (!after.iframe) bad('clicking a facade produced no embed');
  else ok('click builds the embed');
  if (!after.autoplay) bad('embed src carries no autoplay — the visitor would have to press play twice');
  else ok('embed autoplays');
  if (after.stillFacade) bad('the facade button is still in the frame after activation');
  else ok('the facade was replaced, not stacked');
  if (!after.opened) bad('.vopen was not set on the frame');
  else ok('.vopen set');
  if (after.others !== 1) bad(`${after.others} embeds after one click — the other facades also loaded`);
  else ok('only the clicked clip loaded an embed');
  if (before.h !== after.h || before.w !== after.w || before.doc !== after.doc) {
    bad(`layout shifted on activation: frame ${before.w}x${before.h} -> ${after.w}x${after.h}, page ${before.doc} -> ${after.doc}`);
  } else ok(`zero layout shift (frame ${after.w}x${after.h}, page ${after.doc})`);
  await ctx.close();
}

/* ── 5. no caption glyph fell back to a system face ────────────────────────────────────────────
   `tools/check-font-coverage.mjs` proves every character has a DECLARED `unicode-range`, which is
   what the browser will request — not what the woff2 actually contains. That gap is exactly how
   the social card shipped with `Ầ Ữ Ụ Ô` in a system serif (D19). The captions are
   `text-transform:uppercase`, so the glyphs that render are not the ones in config.json, and
   uppercase Vietnamese is where the subset went short last time. Ask the engine directly.        */
console.log('\n── caption fonts');
{
  const ctx = await b.newContext({ ...CONTEXT, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  // Without this the captions sit at opacity:0 inside an unresolved `.reveal`, Chrome reports
  // zero glyphs for them, `strays` comes back empty and the check passes having measured nothing.
  await p.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
  await eager(p);
  await p.evaluate(() => document.fonts.ready);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: false });
  const caps = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '.vidcap, .vidlabel' });
  let fallbacks = 0, checked = 0;
  for (const nodeId of caps.nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    const real = fonts.filter((f) => f.glyphCount > 0);
    // Zero glyphs means the node did not render, not that it rendered correctly.
    if (!real.length) { bad('a caption reported zero rendered glyphs — it was not measured'); continue; }
    checked++;
    const strays = real.filter((f) => !/Be Vietnam Pro|Cormorant/i.test(f.familyName));
    if (strays.length) {
      fallbacks++;
      bad(`a caption fell back: ${strays.map((f) => `${f.glyphCount} glyph(s) in "${f.familyName}"`).join(', ')}`);
    }
  }
  if (!checked) bad('no captions found to check');
  else if (!fallbacks) ok(`${checked} caption/heading node(s), every glyph from the shipped subset`);
  await ctx.close();
}

/* ── 6. the keyboard reaches a facade and Enter activates it ───────────────────────────────── */
console.log('\n── keyboard');
{
  const ctx = await b.newContext({ ...CONTEXT, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important}' });
  await eager(p);
  await p.evaluate(() => document.querySelector('.vidgrid .vfacade').focus());
  const focused = await p.evaluate(() => document.activeElement.classList.contains('vfacade'));
  if (!focused) bad('a facade cannot take focus');
  else ok('a facade takes focus');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  const played = await p.evaluate(() => document.querySelectorAll('.vidgrid iframe').length === 1);
  if (!played) bad('Enter on a focused facade did not activate it');
  else ok('Enter activates a focused facade');
  await ctx.close();
}

/* ── 7. the campaign sheet's own clips ─────────────────────────────────────────────────────────
   They go through the same `video()`, but `meta.videoPosters.skip` deliberately gives them NO
   poster, so they must fall back to the lazy live embed — see D20. This asserts the fallback
   actually happens, because the alternative failure is silent: a poster that reappears on disk
   would turn an internal film's frame back into a crawler-fetchable asset on the CV domain, and
   nothing else in the harness would notice.                                                     */
console.log('\n── campaign sheet clips (poster-free by design)');
{
  const ctx = await b.newContext({ ...CONTEXT, viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const bad404 = [];
  p.on('response', (r) => { if (r.status() >= 400 && /video-posters/.test(r.url())) bad404.push(r.url()); });
  await p.goto(URL, { waitUntil: 'load' });
  const skip = await p.evaluate(async () => {
    const r = await fetch(document.querySelector('link[as="fetch"]').href);
    const cfg = await r.json();
    return (cfg.meta.videoPosters.skip || []);
  });
  await p.evaluate(() => {
    const f = [...document.querySelectorAll('button.folder')].find((x) => /campaign|chiến dịch/i.test(x.textContent));
    if (f) f.click();
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const r = document.querySelector('.crow'); if (r) r.click(); });
  await p.waitForTimeout(800);
  const m = await p.evaluate(() => {
    const g = document.querySelector('.sheet-vids');
    if (!g) return null;
    return { figures: g.children.length,
             facades: g.querySelectorAll('button.vfacade').length,
             posters: g.querySelectorAll('img.vposter').length,
             embeds: g.querySelectorAll('iframe.vembed').length,
             lazy: [...g.querySelectorAll('iframe.vembed')].filter((f) => f.loading === 'lazy').length };
  });
  if (!skip.length) bad('meta.videoPosters.skip is empty — the opt-out D20 records is gone');
  else ok(`${skip.length} clip(s) opted out of posters: ${skip.join(', ')}`);
  if (!m) bad('no .sheet-vids found — the campaign sheet did not open, so its clips are untested');
  else {
    if (m.posters !== 0) bad(`${m.posters} poster(s) rendered for clips that must have none`);
    else ok('0 posters in the sheet, as intended');
    if (m.facades !== 0) bad(`${m.facades} facade(s) built without a poster behind them`);
    else ok('0 facades — the fallback path is the one running');
    if (m.embeds !== m.figures) bad(`${m.embeds} embeds for ${m.figures} sheet clips`);
    else ok(`${m.embeds} lazy embed(s), one per sheet clip`);
    if (m.lazy !== m.embeds) bad(`${m.embeds - m.lazy} fallback embed(s) are not loading="lazy"`);
    else ok('every fallback embed is lazy');
  }
  if (bad404.length) bad(`${bad404.length} poster 404(s) — a skipped clip is still being requested: ${bad404[0]}`);
  else ok('no poster 404s');
  await ctx.close();
}

await b.close();
if (FAIL) { console.error(`\nVIDEOS FAILED — ${FAIL} problem(s)`); process.exit(1); }
console.log('\nvideos OK');
