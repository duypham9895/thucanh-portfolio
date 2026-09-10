// Generate images/portrait-og.jpg — the 1200x630 card every link preview shows.
//
// WHY THIS FILE EXISTS. The card used to be rendered once, by hand, from a throwaway HTML file
// in /tmp. It was rendered while the subsetted fonts were still missing the uppercase Vietnamese
// glyphs that CSS text-transform generates (Ầ U+1EA6, Ữ U+1EEE, Ụ U+1EE4, Ô U+00D4), so those
// four letters fell back to a system serif — and because a raster is frozen at the moment it is
// taken, fixing the fonts could not fix the card. Her name shipped half-set in the wrong face on
// every shared link, which is the single most-seen image of this site.
//
// Three properties keep that from recurring:
//   1. It is a script, so it can be re-run whenever the fonts or the content change.
//   2. It reads the name, role and brands from config.json rather than restating them.
//   3. It ASSERTS, via CDP, that every glyph it drew came from the intended family. A fallback
//      is a hard failure, not something you notice later in a screenshot.
//
// Run:   node tools/build/make-og-card.mjs
// Check: node tools/build/make-og-card.mjs --check   (regenerates to a temp file and compares)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { launch, CONTEXT } from '../visual-qa/browser.mjs';

// Anchor to the repo, not to cwd: a build script that only works from one directory is a build
// script people run from the wrong directory.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const r = (...p) => path.join(ROOT, ...p);

const OUT = r('images/portrait-og.jpg');
const CHECK = process.argv.includes('--check');

const cfg = JSON.parse(fs.readFileSync(r('config.json'), 'utf8'));
const P = cfg.en.P;

// The card is English: it is what a non-Vietnamese recruiter sees when the link is pasted. Her
// name keeps its diacritics (D10) — that is the whole reason the glyph assertion below matters.
const NAME = `${cfg.vi.P.name} ${cfg.vi.P.name2}`;
const ROLE = P.role;
const YEARS = P.stats[0].v;
const NICHE = P.niche;
const BRANDS = P.brands.slice(0, 5).join(' · ');

// Everything the rendered card depends on: the strings it prints and the exact font files it
// prints them with.
function ogInputsHash() {
  const fonts = fs.readdirSync(r('fonts')).filter((n) => n.endsWith('.woff2')).sort().join(',');
  return crypto.createHash('sha256')
    .update([NAME, ROLE, YEARS, NICHE, BRANDS, fonts].join('\u0000')).digest('hex');
}

const font = (stem) => {
  const f = fs.readdirSync(r('fonts')).find((n) => n.startsWith(stem + '.') && n.endsWith('.woff2'));
  if (!f) throw new Error(`font not found: ${stem}.*.woff2`);
  return 'file://' + r('fonts', f);
};

// A bust crop, not the full-body portrait: at 430px wide her face is a few dozen pixels in the
// original framing, which is not a portrait, it is a corridor.
const SRC = r('docs/design/v3-source/assets/portrait.jpg');
const BUST = '/tmp/og-bust.jpg';
execFileSync('magick', [SRC, '-crop', '782x1118+348+246', '+repage', BUST]);

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'CG';src:url('${font('cormorantgaramond-300-normal-latin')}') format('woff2')}
@font-face{font-family:'CG';src:url('${font('cormorantgaramond-300-normal-vietnamese')}') format('woff2')}
@font-face{font-family:'BV';src:url('${font('bevietnampro-300-normal-latin')}') format('woff2')}
@font-face{font-family:'BV';src:url('${font('bevietnampro-300-normal-vietnamese')}') format('woff2')}
@font-face{font-family:'BV4';src:url('${font('bevietnampro-400-normal-latin')}') format('woff2')}
@font-face{font-family:'BV4';src:url('${font('bevietnampro-400-normal-vietnamese')}') format('woff2')}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;display:flex;background:#F4F2ED;overflow:hidden;
     font-family:'BV',sans-serif;color:#2B2A25;-webkit-font-smoothing:antialiased}
.l{flex:1;padding:64px 56px 56px 72px;display:flex;flex-direction:column;justify-content:center}
#eb{font-family:'BV4',sans-serif;font-size:15px;letter-spacing:.2em;text-transform:uppercase;color:#686657}
#nm{font-family:'CG',Georgia,serif;font-weight:300;font-size:74px;line-height:1.04;
    letter-spacing:.02em;text-transform:uppercase;color:#893941;margin-top:20px}
#rl{font-size:22px;margin-top:24px;line-height:1.4}
#br{font-size:15px;color:#686657;margin-top:auto;padding-top:28px;border-top:1px solid #DAD5C7;line-height:1.6}
.r{width:430px;background:#DAD5C7}
.r img{width:100%;height:100%;object-fit:cover;object-position:50% 8%;display:block}
</style>
<div class="l">
  <div id="eb">${NICHE}</div>
  <div id="nm">${NAME}</div>
  <div id="rl">${ROLE}<br>${YEARS} years in beauty e-commerce</div>
  <div id="br">${BRANDS}</div>
</div>
<div class="r"><img src="file://${path.resolve(BUST)}"></div>`;

fs.writeFileSync('/tmp/og-card.html', html);

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, ...CONTEXT, deviceScaleFactor: 1 });
await page.goto('file:///tmp/og-card.html');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);

// THE ASSERTION. getPlatformFontsForNode reports the fonts the engine actually used, per node,
// with a glyph count each. Anything outside the intended families means a character fell back —
// which is exactly the defect that shipped, and it is invisible in a screenshot until someone
// looks closely at a diacritic.
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable');
await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
const EXPECT = { nm: 'Cormorant Garamond', eb: 'Be Vietnam Pro', rl: 'Be Vietnam Pro', br: 'Be Vietnam Pro' };
const problems = [];
for (const [id, want] of Object.entries(EXPECT)) {
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#' + id });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  for (const f of fonts) {
    if (!f.familyName.includes(want.split(' ')[0])) {
      problems.push(`#${id}: ${f.glyphCount} glyph(s) rendered in "${f.familyName}", expected ${want}`);
    }
  }
  const used = fonts.map((f) => `${f.familyName}×${f.glyphCount}`).join(', ');
  console.log(`  #${id.padEnd(3)} ${used}`);
}
if (problems.length) {
  console.error('\nGLYPH FALLBACK — the card would ship her name in the wrong face:');
  problems.forEach((p) => console.error('  ' + p));
  console.error('\nRe-run tools/build/subset-fonts.mjs: the glyph set is missing something the');
  console.error('card renders. CSS text-transform:uppercase generates codepoints that appear in');
  console.error('no source string.');
  await browser.close();
  process.exit(1);
}

const tmpPng = '/tmp/og-card.png';
await page.screenshot({ path: tmpPng });
await browser.close();

const target = CHECK ? '/tmp/og-card-check.jpg' : OUT;
execFileSync('magick', [tmpPng, '-quality', '86', '-interlace', 'Plane', '-strip', target]);

if (CHECK) {
  const a = fs.readFileSync(OUT), b = fs.readFileSync(target);
  // JPEG encoding is deterministic for identical input here, but compare pixels rather than bytes
  // so an encoder version bump does not produce a false alarm.
  // `magick compare` writes the metric to STDERR and exits non-zero when the images differ at
  // all, so capturing stdout gave an empty string and every check read as stale.
  let rmse = '';
  try {
    execFileSync('magick', ['compare', '-metric', 'RMSE', OUT, target, 'null:'],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    rmse = '0 (0)';
  } catch (e) {
    rmse = String(e.stderr || '').trim();
  }
  console.log(`\nshipped ${a.length} B vs regenerated ${b.length} B — RMSE ${rmse.trim()}`);
  const frac = Number((rmse.match(/\(([\d.]+)\)/) || [])[1] || 1);
  if (frac > 0.02) {
    console.error('OG CARD IS STALE — regenerate with: node tools/build/make-og-card.mjs');
    process.exit(1);
  }
  console.log('og card is current');
} else {
  // A fingerprint of everything the card is drawn from, so release --check can notice the card
  // has gone stale WITHOUT launching a browser. The card is a raster: it cannot tell you it is
  // out of date, and the last time it was, her name shipped in the wrong face for a day.
  fs.writeFileSync(r('images/portrait-og.inputs'), ogInputsHash() + '\n');
  console.log(`\nwrote ${OUT} — ${fs.statSync(OUT).size} B, every glyph from the intended family`);
  console.log(`wrote images/portrait-og.inputs — ${ogInputsHash().slice(0, 12)}`);
}
