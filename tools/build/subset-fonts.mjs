// Subset the self-hosted fonts to the glyphs this site actually renders.
//
// Google's subsets are built for the whole Vietnamese language. This site renders 154 distinct
// codepoints, so ~90% of every file is glyphs nobody will ever see — and fonts were the single
// heaviest category on the page, heavier than every image put together.
//
// Subsetting FREEZES the glyph set. Change the content and a new character silently falls back to
// a system font, which for Vietnamese is very visible. So:
//   - the glyph set is derived from config.json AND both shells, never hand-written
//   - tools/check-font-coverage.mjs must pass afterwards
//   - re-run this after any content change
//
// Requires fontTools. It is not a project dependency — this runs by hand, and the outputs are
// committed, exactly like the release hashes and the generated icons.
//   python3 -m venv .fontvenv && .fontvenv/bin/pip install fonttools brotli
//   node tools/build/subset-fonts.mjs --python .fontvenv/bin/python
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const PY = argv.includes('--python') ? argv[argv.indexOf('--python') + 1] : 'python3';
const APPLY = argv.includes('--apply');
// --check exits non-zero if the shipped fonts no longer cover the shipped text. Subsetting freezes
// the glyph set, so ANY content edit can silently drop a character into a fallback font — which for
// Vietnamese is immediately visible and easy to miss in review. This ran red the first time content
// was edited after a subset (curly quotes, U+201C/201D), which is why it exists.
const CHECK = argv.includes('--check');
const OUT = 'fonts';

// ── the glyph set, derived not assumed ─────────────────────────────────────
function textOf(v, acc) {
  if (typeof v === 'string') acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => textOf(x, acc));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => textOf(x, acc));
  return acc;
}
const chunks = textOf(JSON.parse(fs.readFileSync('config.json', 'utf8')), []);
// Discover the shells rather than list them. This was hardcoded to ['index.html','en/index.html']
// and broke the moment English moved to the root and Vietnamese to /vi/ — a hardcoded list of
// files that another decision can rename is a drift waiting to happen.
const SHELL_FILES = ['index.html', ...fs.readdirSync('.', { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') &&
          !['node_modules', 'docs', 'tools', 'fonts', 'images', 'brands', 'icons', 'downloads'].includes(e.name))
  .map((e) => path.join(e.name, 'index.html'))
  .filter((f) => fs.existsSync(f))];
for (const shell of SHELL_FILES) {
  const h = fs.readFileSync(shell, 'utf8')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ');
  chunks.push(h);
}
// Characters the renderer produces that appear in no source string: the zero-padded indices it
// builds with padStart, and the separators it inserts between fields.
chunks.push('0123456789 ·—–→←↑✕%&/()[]{}<>@#*+="\'.,:;!?_|');

// String literals the renderer itself paints. The copyright line is built in index.js and appears
// in no other source, so © was silently falling back to a system font on the shipped build.
const rendererSrc = fs.readFileSync('index.js', 'utf8');
for (const m of rendererSrc.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) {
  chunks.push(m[1] || m[2] || '');
}

// CSS text-transform generates codepoints that appear NOWHERE in the source. `.heroname` and
// `.eyebrow` are uppercase, so "Trần Tôn Nữ" is painted as "TRẦN TÔN NỮ" — and Ầ (U+1EA6),
// Ữ (U+1EEE), Ụ (U+1EE4) and Ô (U+00D4) are different characters from their lowercase forms.
// Dropping them left her own name half-set in Cormorant and half in a system serif, with the
// accents visibly detached, in the largest type on the page. Cover both cases of everything.
const base = chunks.join('');
chunks.push(base.toUpperCase(), base.toLowerCase());

const set = new Set([...chunks.join('')].filter((c) => c.codePointAt(0) > 31));
const unicodes = [...set].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).sort();
console.log(`glyph set: ${unicodes.length} codepoints, from config.json + ${SHELL_FILES.join(', ')}`);

if (CHECK) {
  const have = new Set(
    execFileSync(PY, ['-c', `
from fontTools.ttLib import TTFont
import glob
have = set()
for f in glob.glob("${OUT}/*.woff2"):
    have |= set(TTFont(f).getBestCmap())
print(",".join(str(c) for c in sorted(have)))`], { encoding: 'utf8' }).trim().split(',').filter(Boolean).map(Number)
  );
  // Absent from every source Google ships for these families, so they have always fallen back.
  const NEVER_AVAILABLE = new Set([0x2192, 0x2190, 0x2715]);
  const gap = [...set].map((c) => c.codePointAt(0)).filter((c) => !have.has(c) && !NEVER_AVAILABLE.has(c));
  if (gap.length) {
    console.error(`FONT COVERAGE FAILED — ${gap.length} codepoint(s) in the content have no glyph:`);
    console.error('  ' + gap.map((c) => `${String.fromCodePoint(c)} U+${c.toString(16).toUpperCase().padStart(4, '0')}`).join('  '));
    console.error('\nRe-run the subsetter against the current content:');
    console.error('  git checkout <pre-subset-commit> -- fonts/   # the subsets no longer contain it');
    console.error('  node tools/build/subset-fonts.mjs --python <venv>/bin/python --apply');
    process.exit(1);
  }
  console.log(`font coverage OK — ${set.size} codepoints, all rendered by a self-hosted face`);
  console.log(`  (${[...NEVER_AVAILABLE].map((c) => String.fromCodePoint(c)).join(' ')} fall back by design: absent from every source font)`);
  process.exit(0);
}

// ── subset every existing face in place, keeping the latin/vietnamese split ─
// Google's `latin` and `vietnamese` files are two DISJOINT subsets of the same font: neither
// contains the other's glyphs. Collapsing them into one file would need the full original font,
// so instead each file is subsetted to (our glyph set ∩ what that file already covers), and the
// existing @font-face structure with its unicode-ranges is preserved untouched. The UNION still
// covers everything, and nothing about how the browser picks a face changes.
const existing = fs.readdirSync(OUT).filter((f) => f.endsWith('.woff2'));
const sha8 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);
const wanted = [...set].map((c) => c.codePointAt(0));

let before = 0, after = 0;
const written = [];
const coveredOverall = new Set();

for (const file of existing.sort()) {
  const src = path.join(OUT, file);
  const size = fs.statSync(src).size;
  before += size;
  const tmp = `/tmp/sub-${file}`;
  execFileSync(PY, ['-m', 'fontTools.subset', src,
    `--unicodes=${unicodes.join(',')}`,
    '--flavor=woff2', '--layout-features=*', '--no-hinting',
    '--desubroutinize', '--drop-tables+=DSIG',
    `--output-file=${tmp}`], { stdio: 'pipe' });

  const covers = execFileSync(PY, ['-c', `
from fontTools.ttLib import TTFont
f = TTFont(${JSON.stringify(tmp)})
cmap = f.getBestCmap()
print(",".join(str(c) for c in [${wanted.join(',')}] if c in cmap))`], { encoding: 'utf8' }).trim();
  covers.split(',').filter(Boolean).forEach((c) => coveredOverall.add(Number(c)));

  const buf = fs.readFileSync(tmp);
  after += buf.length;
  // stem is everything before the old content hash: name-weight-style-subset.<hash>.woff2
  const stem = file.replace(/\.[0-9a-f]{8}\.woff2$/, '');
  const name = `${stem}.${sha8(buf)}.woff2`;
  written.push({ old: file, name, buf, size, n: covers.split(',').filter(Boolean).length });
  console.log(`  ${stem.padEnd(46)} ${String(size).padStart(7)} -> ${String(buf.length).padStart(6)} B   ${covers.split(',').filter(Boolean).length} glyphs`);
}

// Two kinds of "not covered", and only one of them is a regression:
//   the source fonts never had the glyph  -> it already falls back today; subsetting changed nothing
//   the source had it and we dropped it   -> a real regression, refuse to apply
const srcCovered = new Set(
  execFileSync(PY, ['-c', `
from fontTools.ttLib import TTFont
import glob
want = [${wanted.join(',')}]
have = set()
for f in glob.glob("${OUT}/*.woff2"):
    cmap = TTFont(f).getBestCmap()
    have |= {c for c in want if c in cmap}
print(",".join(str(c) for c in sorted(have)))`], { encoding: 'utf8' }).trim().split(',').filter(Boolean).map(Number)
);
const neverThere = wanted.filter((c) => !srcCovered.has(c));
const regressed = wanted.filter((c) => srcCovered.has(c) && !coveredOverall.has(c));

console.log(`\nfonts: ${before} B -> ${after} B  (${(100 * (before - after) / before).toFixed(1)}% smaller, ${((before - after) / 1024).toFixed(1)} KB saved)`);
console.log(`coverage: ${coveredOverall.size}/${srcCovered.size} of the glyphs the source fonts actually contain`);
if (neverThere.length) {
  console.log(`\nnot in ANY source font — already falls back to a system font, unchanged by this:`);
  console.log('  ' + neverThere.map((c) => `${String.fromCodePoint(c)} U+${c.toString(16).toUpperCase()}`).join('  '));
}
if (regressed.length) {
  console.log(`\nREGRESSION — the source had these and the subset dropped them:`);
  console.log('  ' + regressed.map((c) => `${String.fromCodePoint(c)} U+${c.toString(16).toUpperCase()}`).join('  '));
}
const missing = regressed;

if (!APPLY) { console.log('\ndry run — pass --apply to write fonts/ and rewrite index.css'); process.exit(0); }
if (missing.length) { console.error('\nrefusing to apply with missing glyphs'); process.exit(1); }

// Rewrite by STEM, not by the exact old filename. Replacing `w.old` assumes index.css already
// names whatever is sitting in fonts/ right now — and that broke the moment fonts/ was restored
// from git without restoring index.css alongside it: the search string named a file the CSS had
// never heard of, every replace was a no-op, and the tree shipped a stylesheet pointing at ten
// files that no longer existed. Matching the stem cannot miss.
const repoint = (text) => {
  for (const w of written) {
    const stem = w.name.replace(/\.[0-9a-f]{8}\.woff2$/, '');
    text = text.replace(
      new RegExp(`${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.[0-9a-f]{8}\\.woff2`, 'g'),
      w.name);
  }
  return text;
};
for (const w of written) fs.writeFileSync(path.join(OUT, w.name), w.buf);
fs.writeFileSync('index.css', repoint(fs.readFileSync('index.css', 'utf8')));
for (const shell of SHELL_FILES) {
  fs.writeFileSync(shell, repoint(fs.readFileSync(shell, 'utf8')));
}
// Refuse to leave a split tree: every face the CSS names must now exist.
{
  const css2 = fs.readFileSync('index.css', 'utf8');
  const missing = [...new Set(css2.match(/fonts\/[a-z0-9.-]+\.woff2/g) || [])]
    .filter((f) => !fs.existsSync(f));
  if (missing.length) {
    console.error(`\nSPLIT TREE — index.css names ${missing.length} font(s) that do not exist:`);
    missing.forEach((f) => console.error('  ' + f));
    process.exit(1);
  }
}
for (const w of written) if (w.old !== w.name) fs.rmSync(path.join(OUT, w.old));
console.log(`\nwrote ${written.length} subsetted faces; index.css and both shells repointed; old files removed`);
