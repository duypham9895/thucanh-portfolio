// Extract config.json from the frozen Claude Design data modules by EXECUTING them.
// Hand-transcribing 30 KB of nested content is how copy errors get into a CV; running the
// modules is exact by construction. The modules are plain JS — only the app module is JSX —
// so a bare `window` shim is the whole harness they need.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const SRC = 'docs/design/v3-source/modules';
const win = {};
const ctx = vm.createContext({ window: win, console });

// Load order is the design's own, from template.html. v2-data must precede i18n:
// i18n's P_EN reuses `P.brands` by reference.
for (const f of ['portfolio-v2-data.jsx', 'portfolio-v3-data.jsx', 'portfolio-v3-i18n.jsx']) {
  const code = fs.readFileSync(path.join(SRC, f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
}

const { DATA, FOLDERS, EXTRA } = win;
if (!DATA || !FOLDERS) throw new Error('modules did not populate DATA/FOLDERS');

// EXTRA lives in the v3 data module (VI) and the i18n module (EN). DATA.vi.EXTRA picks up the
// VI one via the shared global; assert it rather than assume.
if (DATA.vi.EXTRA !== EXTRA) throw new Error('DATA.vi.EXTRA is not the VI EXTRA');
if (DATA.en.EXTRA === EXTRA) throw new Error('DATA.en.EXTRA aliases the VI EXTRA — EN content missing');

// Vietnamese must be NFC. NFD decomposes to U+0302/U+0306/U+031B, none of which appears in any
// font subset's unicode-range, so NFD text silently falls back to a system font.
const nfc = (v) =>
  typeof v === 'string' ? v.normalize('NFC')
  : Array.isArray(v) ? v.map(nfc)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, nfc(x)]))
  : v;

const out = {
  meta: {
    schema: 3,
    source: 'Claude Design project b8e2e5a4-1ed4-444a-81a6-089830b12b02 — Portfolio v3.html',
    defaultLang: 'vi',
    folders: nfc(FOLDERS),
    // TWEAK_DEFAULTS from portfolio-v3-app.jsx, frozen as fixed config. The tweaks panel is
    // Claude Design edit tooling and is not shipped, so these stop being adjustable.
    fixed: { accent: '#CB7885', layout: 'list', scale: 1, showVideos: true, opening: 'cover+folders' },
    cv: 'downloads/Tran-Ton-Nu-Thuc-Anh-CV.pdf',
    brandLogos: {
      "L'Oréal Professionnel": ['brands/loreal-professionnel.png', 52],
      "Kérastase": ['brands/kerastase.png', 30],
      "Matrix": ['brands/matrix.png', 44],
      "Estée Lauder": ['brands/estee-lauder.png', 46],
      "Baresoul Cosme": ['brands/baresoul.png', 52],
      "Clinique": ['brands/clinique.png', 24],
    },
    campaignLogos: {
      ppd: ['brands/loreal-vietnam.png', 29], newsletter: ['brands/loreal-vietnam.png', 29],
      matrix: ['brands/matrix.png', 30], serioxyl: ['brands/loreal-professionnel.png', 26],
      gloss: ['brands/kerastase.png', 17], pickleball: ['brands/kerastase.png', 17],
    },
    portrait: 'images/portrait.jpg',
    sectionOrder: ['about', 'education', 'cv', 'work', 'extra', 'awards', 'xfile'],
  },
  vi: nfc(DATA.vi),
  en: nfc(DATA.en),
};

// VI and EN must stay structurally identical — the whole in-place i18n mechanism depends on it.
const shape = (v, p = '') =>
  Array.isArray(v) ? [`${p}[]${v.length}`, ...v.flatMap((x, i) => shape(x, `${p}[${i}]`))]
  : v && typeof v === 'object' ? Object.keys(v).sort().flatMap((k) => shape(v[k], `${p}.${k}`))
  : [`${p}:${typeof v}`];
const a = shape(out.vi), b = shape(out.en);
const diff = a.filter((x, i) => b[i] !== x).slice(0, 12);
if (a.length !== b.length || diff.length) {
  console.error(`VI/EN structural parity FAILED (${a.length} vs ${b.length})`);
  diff.forEach((d, i) => console.error(`  vi ${d}\n  en ${b[a.indexOf(d)]}`));
  process.exit(1);
}

// This regenerates content from the FROZEN design. Everything decided since the port — the D1
// contrast variants, the corrected dates, the Clinique evidence link, the removed internal-use
// images, every copy fix — lives only in config.json and would be silently reverted. It used to
// do exactly that and exit 0.
if (fs.existsSync('config.json') && !process.argv.includes('--force')) {
  const cur = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const flat = (v, p = '', acc = {}) => {
    if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => flat(x, p + '.' + k, acc));
    else acc[p] = v;
    return acc;
  };
  const a = flat(cur), b = flat(out);
  const changed = Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);
  if (changed.length) {
    console.error(`REFUSING TO OVERWRITE config.json — ${changed.length} leaf value(s) would change.`);
    changed.slice(0, 12).forEach((k) => console.error(`  ${k}\n    now: ${JSON.stringify(a[k])}\n    gen: ${JSON.stringify(b[k])}`));
    if (changed.length > 12) console.error(`  … and ${changed.length - 12} more`);
    console.error('\nThis file is hand-maintained after the initial port. Re-run with --force only');
    console.error('if you intend to discard every edit made since.');
    process.exit(1);
  }
}
fs.writeFileSync('config.json', JSON.stringify(out, null, 2) + '\n');
console.log(`config.json written — ${(fs.statSync('config.json').size / 1024).toFixed(1)} KB`);
console.log(`  folders    ${out.meta.folders.length}`);
console.log(`  campaigns  ${out.vi.CAMPAIGNS.length}`);
console.log(`  xfile      ${out.vi.XFILE.length}`);
console.log(`  extra      ${out.vi.EXTRA.length}`);
console.log(`  awards     ${out.vi.P.awards.length}`);
console.log(`  T strings  ${Object.keys(out.vi.T).length}`);
console.log(`  VI/EN structural parity OK (${a.length} leaves)`);
