/* Poster frames for the video strip.
 *
 * The strip renders click-to-play facades: a still frame with a play control, and the YouTube
 * iframe is built only when a visitor actually asks for it. The still has to come from somewhere,
 * and it may not come from i.ytimg.com — DEVIATIONS.md D11 says the shipped site makes ZERO
 * third-party requests, and a hot-linked thumbnail would be one on every page view.
 *
 * So the posters are fetched once, here, re-encoded to WebP, and committed. That is the same trade
 * the fonts took in D11 and the images took in D12.
 *
 * WHICH THUMBNAIL. YouTube serves several per video and only one of them is the right shape:
 *
 *     hqdefault / maxresdefault   16:9, the vertical frame letterboxed into it. Cropping this back
 *                                 to 9:16 keeps the pillarbox and throws away her face.
 *     oardefault.jpg              404 for every one of these clips.
 *     oar2.jpg                    "original aspect ratio" — 1080x1920, the actual frame.  <-- this
 *
 * The fallback chain still ends at hqdefault so a future clip without an oar2 produces a poster
 * rather than an error, but it records which source it used so a soft poster can be explained
 * rather than puzzled over.
 *
 *   node tools/build/make-video-posters.mjs           # fetch + encode
 *   node tools/build/make-video-posters.mjs --check   # verify every clip has every width, exit 1
 *
 * --check is cheap and offline. The full run needs the network.
 *
 * Depends on `magick` (ImageMagick), which tools/build/make-og-card.mjs already requires. There is
 * deliberately no package.json at the repo root — see AGENTS.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONFIG = path.join(ROOT, 'config.json');

const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));

/* Widths, the output directory and the `sizes` strings all live in `meta.videoPosters`, and this
 * script reads them from there rather than holding its own copy. The page writes `srcset` from the
 * same object, so the files on disk and the candidates the browser is offered cannot drift apart —
 * which is the failure the social card taught this repo to design against (D19): a generated asset
 * whose inputs moved underneath it and which had no way to say so.
 *
 * The widths are per aspect because the two consumers paint at very different sizes:
 *
 *   9/16  the strip. `.vidgrid` is capped at 4 columns inside a 1188px wrap, so the widest cell
 *         it ever produces is 280.5 CSS px. 360 covers DPR 1, 576 covers DPR 2 (561) and DPR 3 on
 *         a phone (166 x 3 = 498), 864 covers DPR 3 on the desktop cell.
 *   16/9  the campaign sheet. `.sheet-vids` is auto-fit minmax(min(300px,100%),1fr) with a 24px
 *         gap inside the same wrap, so two clips sit at 582 CSS px — more than twice the strip's
 *         cell, hence its own ladder.
 */
const POSTERS = cfg.meta.videoPosters;
const OUTDIR = path.join(ROOT, POSTERS.dir);
const LEDGER = path.join(OUTDIR, 'sources.json');
const QUALITY = 72;

/** The width ladder for a clip's aspect ratio. An unlisted ratio falls back to the 16/9 ladder,
 *  which is what video() itself defaults to when config records no `r`. */
const widthsFor = (ratio) => POSTERS.widths[ratio] || POSTERS.widths['16/9'];

/* Some clips deliberately get NO poster, and the list lives in config rather than in a deleted
 * file, so the omission is a recorded decision instead of something a future run silently "fixes".
 *
 * The two PPD campaign films are on it. `config.json` describes Film 1 as an "internal news-style
 * report"; its only usable thumbnail is a group shot of roughly nine identifiable L'Oréal
 * colleagues at an internal event, under a "CHUYỂN ĐỘNG PPD" title card. Embedding the film is one
 * thing — she made it, it is on her own channel, and it was already embedded before any of this.
 * Re-hosting a 1200px still of her colleagues' faces as a crawler-fetchable asset on her personal
 * CV domain is another, and D17 already settled how this repo treats internal material: remove it,
 * do not merely hide it.
 *
 * A skipped clip costs nothing at runtime: `video()` finds no poster and falls back to the lazy
 * live embed, which is exactly what those two clips did before the facade existed. */
const SKIP = new Set(POSTERS.skip || []);

/* Ordered by how much of the real frame survives. */
const SOURCES = ['oar2', 'maxresdefault', 'hqdefault'];

const ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;

/** Every clip referenced anywhere in config.json as {id, ratio}, in document order, deduplicated.
 *  `ratio` is what the site will paint the poster into, so it is also what the poster must BE. */
function videoClips() {
  const clips = [];
  const push = (src, ratio) => {
    const m = typeof src === 'string' && src.match(ID_RE);
    if (m && !SKIP.has(m[1]) && !clips.some((c) => c.id === m[1])) clips.push({ id: m[1], ratio: ratio || '16/9' });
  };
  // VIDEOS is the strip; CAMPAIGNS[].vids are the clips inside a campaign sheet. Both render
  // through the same video() helper, so both want a poster. The sheet passes no ratio, so those
  // clips take video()'s own default of 16/9 — mirrored in the `|| '16/9'` above.
  for (const langKey of ['en', 'vi']) {
    const L = cfg[langKey];
    if (!L) continue;
    (L.VIDEOS || []).forEach((v) => push(v.src, v.r));
    (L.CAMPAIGNS || []).forEach((c) => (c.vids || []).forEach((v) => push(v.src, v.r)));
  }
  return clips;
}

const posterPath = (id, w) => path.join(OUTDIR, `${id}-${w}.webp`);

/** '9/16' -> 0.5625. The config writes exact integer fractions (D12), so this is lossless. */
function ratioValue(r) {
  const [w, h] = String(r).split('/').map(Number);
  return w / h;
}

function check(clips) {
  // GitHub Pages runs the legacy Jekyll builder, so a path segment beginning with `_` or `.` is
  // silently dropped in production while working perfectly on localhost:8900 — the failure mode
  // `.nojekyll` exists to prevent, and the one no browser test can see because the files are
  // right there during QA. Checked here rather than in a second script: this is already the file
  // that knows where posters live.
  const segs = POSTERS.dir.split('/').filter(Boolean);
  if (segs.some((s) => s.startsWith('_') || s.startsWith('.'))) {
    console.error(`meta.videoPosters.dir = "${POSTERS.dir}" has a segment Jekyll will drop in production`);
    process.exit(1);
  }
  // This file resolves paths with path.join, which forgives a missing separator; `posterImg()` in
  // index.js builds the URL by CONCATENATION, which does not. Without this assertion a `dir` of
  // "images/video-posters" passes every check here while the page emits
  // "images/video-postersW1Nh9tGX5Dc-360.webp" and all 25 posters 404 in production.
  if (!POSTERS.dir.endsWith('/')) {
    console.error(`meta.videoPosters.dir = "${POSTERS.dir}" must end with "/" — index.js concatenates it`);
    process.exit(1);
  }

  const missing = [];
  for (const { id, ratio } of clips) {
    for (const w of widthsFor(ratio)) {
      const p = posterPath(id, w);
      if (!fs.existsSync(p) || fs.statSync(p).size === 0) missing.push(path.relative(ROOT, p));
    }
  }
  // A poster nothing references is dead weight in a repo that counts its bytes. Report it, but it
  // is not a failure — a clip may have been pulled from config while the file is still wanted.
  // A skipped clip with a poster on disk is the failure this list exists to prevent: someone
  // re-ran the build against an older config, or restored a file by hand.
  const strays = [...SKIP].filter((id) =>
    fs.existsSync(OUTDIR) && fs.readdirSync(OUTDIR).some((f) => f.startsWith(id + '-')));
  if (strays.length) {
    console.error(`posters exist for clip(s) meta.videoPosters.skip says must have none: ${strays.join(', ')}`);
    console.error('delete them — see the SKIP comment in this file for why they are excluded');
    process.exit(1);
  }

  const expected = new Set(clips.flatMap(({ id, ratio }) => widthsFor(ratio).map((w) => `${id}-${w}.webp`)));
  const orphans = fs.existsSync(OUTDIR)
    ? fs.readdirSync(OUTDIR).filter((f) => f.endsWith('.webp') && !expected.has(f))
    : [];

  if (orphans.length) console.log(`orphan posters (not referenced by config.json): ${orphans.join(', ')}`);
  if (missing.length) {
    console.error(`MISSING ${missing.length} poster file(s):`);
    missing.forEach((m) => console.error(`  ${m}`));
    console.error('\nrun: node tools/build/make-video-posters.mjs');
    process.exit(1);
  }

  // The expensive failure is not a missing poster — that is loud. It is a poster of the WRONG
  // SHAPE: the cell paints it with object-fit:cover, so a 16:9 still in a 9:16 cell silently
  // crops to a vertical sliver of the middle of the frame, which is where her face is not.
  // The ledger records the source aspect, so this check is offline.
  if (fs.existsSync(LEDGER)) {
    const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    const wrong = clips.filter(({ id, ratio }) => {
      const e = ledger[id];
      return e && Math.abs(e.srcW / e.srcH - ratioValue(ratio)) > 0.02;
    });
    if (wrong.length) {
      console.error('POSTER SHAPE mismatch — these would be cropped by object-fit:cover:');
      wrong.forEach(({ id, ratio }) => {
        const e = ledger[id];
        console.error(`  ${id}: poster is ${e.srcW}x${e.srcH} (${e.source}), config says ${ratio}`);
      });
      process.exit(1);
    }
  }

  // Every gate in this repo reads the local filesystem, where the posters obviously exist. The
  // deploy reads git, where — until they are staged — they do not. The whole directory is one
  // untracked unit, `AGENTS.md` tells the next person to "stage only intentional source files",
  // and a miss renders all seven clips as black boxes with nothing to say why. Ask git directly.
  const untracked = [];
  for (const { id, ratio } of clips) {
    for (const w of widthsFor(ratio)) {
      const rel = path.relative(ROOT, posterPath(id, w));
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', rel], { cwd: ROOT, stdio: 'ignore' });
      } catch { untracked.push(rel); }
    }
  }
  if (untracked.length) {
    console.error(`${untracked.length} poster(s) exist on disk but are NOT TRACKED BY GIT:`);
    untracked.slice(0, 6).forEach((f) => console.error(`  ${f}`));
    if (untracked.length > 6) console.error(`  … and ${untracked.length - 6} more`);
    console.error('\nthey would not deploy. run: git add images/video-posters/');
    process.exit(1);
  }

  const n = clips.reduce((a, c) => a + widthsFor(c.ratio).length, 0);
  console.log(`posters OK — ${clips.length} clip(s), ${n} files, all tracked, no shape mismatch`);
}

async function fetchFirst(id) {
  for (const name of SOURCES) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`);
    // A missing thumbnail is a 404 with a tiny grey placeholder body, not a network error, so the
    // status is the only thing that distinguishes it.
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 2048) return { name, buf };
  }
  throw new Error(`no usable thumbnail for ${id} — tried ${SOURCES.join(', ')}`);
}

async function build(clips) {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const ledger = {};
  const mismatched = [];
  for (const { id, ratio } of clips) {
    const { name, buf } = await fetchFirst(id);
    const tmp = path.join(OUTDIR, `.tmp-${id}.jpg`);
    fs.writeFileSync(tmp, buf);
    const dims = execFileSync('magick', ['identify', '-format', '%w %h', tmp], { encoding: 'utf8' })
      .trim().split(' ').map(Number);

    const ladder = widthsFor(ratio);
    const sizes = {};
    for (const w of ladder) {
      const out = posterPath(id, w);
      execFileSync('magick', [
        tmp,
        '-resize', `${w}x`,
        '-strip',                       // EXIF and colour profiles are dead weight on a poster
        '-quality', String(QUALITY),
        '-define', 'webp:method=6',     // slowest encode, smallest file; this runs by hand, rarely
        out,
      ]);
      sizes[w] = fs.statSync(out).size;
    }
    fs.unlinkSync(tmp);

    ledger[id] = { source: name, ratio, srcW: dims[0], srcH: dims[1], bytes: sizes };
    const total = Object.values(sizes).reduce((a, b) => a + b, 0);
    // `maxresdefault` is the right frame for a 16:9 film and the WRONG one for a vertical cut —
    // what matters is not which endpoint answered but whether the shape came back correct.
    const bad = Math.abs(dims[0] / dims[1] - ratioValue(ratio)) > 0.02;
    if (bad) mismatched.push({ id, ratio, dims, name });
    const sizeList = ladder.map((w) => `${w}w ${(sizes[w] / 1024).toFixed(0)}KB`).join('  ');
    console.log(`${id}  ${dims[0]}x${dims[1]} ${name}  ${sizeList}  (${(total / 1024).toFixed(0)}KB)${bad ? `  <-- WRONG SHAPE, config says ${ratio}` : ''}`);
  }
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  const n = clips.reduce((a, c) => a + widthsFor(c.ratio).length, 0);
  console.log(`\nwrote ${n} posters + ${path.relative(ROOT, LEDGER)}`);

  if (mismatched.length) {
    console.error(`\n${mismatched.length} poster(s) do not match the ratio config paints them into.`);
    console.error('object-fit:cover will crop them. Fix the ratio in config.json, or find a');
    console.error('correctly-shaped source, before shipping.');
    process.exit(1);
  }
}

const clips = videoClips();
if (!clips.length) {
  console.error('no video sources found in config.json');
  process.exit(1);
}
if (process.argv.includes('--check')) check(clips);
else await build(clips);
