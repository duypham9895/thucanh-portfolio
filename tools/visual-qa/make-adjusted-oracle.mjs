// Generate the ADJUSTED oracle from the PRISTINE oracle.
//
// The pristine oracle is the artifact exactly as designed. The candidate site intentionally
// deviates from it in a small, stakeholder-approved set of ways. Diffing the candidate against
// the pristine oracle would therefore flag those approved deviations as failures, and the only
// way to hide them would be to widen the mask until it hides real regressions too.
//
// Instead every approved deviation is applied here, mechanically and auditably, producing an
// adjusted oracle. The candidate is diffed against THAT. The deviation set below is the complete,
// reviewable list of every way the shipped site is allowed to differ from the artifact.
//
//   usage: node make-adjusted-oracle.mjs
//   in:    docs/design/artifact-source/reference/oracle-{vi,en}.html   (hash-pinned)
//   out:   docs/design/artifact-source/reference/adjusted-{vi,en}.html

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REF = path.resolve('docs/design/artifact-source/reference');

// ---------------------------------------------------------------------------
// D1 — contrast remediation (WCAG 2.2 AA). Measured, hue-preserving darkening.
// ---------------------------------------------------------------------------
const TOKEN_SWAPS = [
  // token        artifact     adjusted     why
  ['--soft', '#7B7869', '#6A6759'], // body/eyebrow text 3.97 -> 5.08 on --bg
  ['--pink', '#CB7885', '#BD5565'], // white-on-pink 3.20 -> 4.52 (buttons, contact card, folder)
];

// D1c — section colour as TEXT.
//
// The artifact tints kickers, italic section accents and numerals with the folder colour. Several
// of those colours are light (citron #D4D994 on paper = 1.42:1, beige #D0A583 = 2.0:1, awards pink
// #E7A6B0 = 1.92:1) and cannot pass at ANY size as text on a light background.
//
// NOTE: D1a's --pink swap DOES darken the About folder's own surface (its tab and body use the
// same #CB7885). Five of six folder surfaces are untouched, not six.
//
// The rule: section colour as a SURFACE keeps its artifact value; section colour as TEXT uses a
// darkened variant of the same hue, clearing 4.5:1 on BOTH --bg and --paper (--bg is the
// binding constraint for dark text). Applied mechanically to every inline `color:` declaration
// whose value matches a section colour — background/border declarations are untouched.
const SECTION_TEXT = {
  '#CB7885': '#B9495B', // about   (pre-swap value, mapped for completeness)
  '#BD5565': '#B9495B', // about   4.50 on --bg
  '#893941': '#893941', // cv      6.89 — already passes
  '#D4D994': '#6E7329', // education citron 1.42 -> 4.53
  '#5E6623': '#5E6623', // work    5.52 — already passes
  '#D0A583': '#976339', // extra   beige  2.00 -> 4.51
  '#E7A6B0': '#C9384F', // awards  pink   1.92 -> 4.51
};

const SECTION_ORDER = ['about', 'cv', 'education', 'work', 'extra', 'awards'];

function adjust(html, lang) {
  const log = [];
  let out = html;

  // D1a — swap tokens in the :root declaration and any literal reuse.
  // NOTE: React serializes inline colours as `rgb(r, g, b)`, NOT hex. Replacing only the hex
  // form silently leaves every C(id)-derived folder colour untouched — a grep for the hex then
  // "proves" a fix that never happened. Both notations must be replaced.
  const toRgb = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `rgb(${r}, ${g}, ${b})`;
  };
  for (const [token, from, to] of TOKEN_SWAPS) {
    const before = out;
    let n = 0;
    for (const [f, t] of [[from, to], [from.toLowerCase(), to],
                          [toRgb(from), toRgb(to)]]) {
      const hits = out.split(f).length - 1;
      if (hits) { out = out.split(f).join(t); n += hits; }
    }
    if (out !== before) log.push(`D1 token ${token}: ${from} -> ${to} (${n} occurrences, hex + rgb())`);
  }

  // D1c — swap section colours used as TEXT. Only `color:` declarations; `background`,
  // `border-color` and `background-color` are deliberately left alone so surfaces keep the
  // artifact's palette. Also lift rgba(255,255,255,.8) to solid white on the pink contact card
  // (3.48:1 -> 4.52:1).
  {
    const toRgbTuple = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const map = new Map();
    for (const [from, to] of Object.entries(SECTION_TEXT)) {
      if (from.toLowerCase() === to.toLowerCase()) continue;
      const [r, g, b] = toRgbTuple(from);
      map.set(`rgb(${r}, ${g}, ${b})`, `rgb(${toRgbTuple(to).join(', ')})`);
      map.set(from, to);
    }
    let n = 0;
    out = out.replace(/(^|[^-\w])color:\s*(rgb\(\d+, \d+, \d+\)|#[0-9A-Fa-f]{6})/g, (m, pre, val) => {
      const hit = map.get(val) || map.get(val.toUpperCase());
      if (!hit) return m;
      n++; return `${pre}color: ${hit}`;
    });
    const wBefore = out;
    out = out.split('rgba(255, 255, 255, 0.8)').join('rgb(255, 255, 255)');
    log.push(`D1c section-colour text swaps: ${n}` + (out !== wBefore ? ' (+ contact-card white lifted to solid)' : ''));
  }

  // D1b — tag section kickers so the kicker tokens can reach them
  let ki = 0;
  out = out.replace(/<div class="sechead"([^>]*)><div><p class="eyebrow"([^>]*)>/g, (m, a, b) => {
    const id = SECTION_ORDER[ki++] || 'about';
    return `<div class="sechead"${a}><div><p class="eyebrow" data-kicker="${id}"${b}>`;
  });
  const wantKickers = lang === 'en' ? 0 : 6;  // SecHead renders kickers only when lang !== 'EN'
  if (ki !== wantKickers) throw new Error(`D1b: expected ${wantKickers} kicker tags, applied ${ki}`);
  log.push(`D1 kicker tags applied: ${ki}`);

  // D1d — folder caption opacity. `.fnote{opacity:.85}` and `.fgo{opacity:.75}` fade functional
  // text (the folder note and the "Open ->" affordance) below AA on EVERY folder colour, not just
  // pink: 3.25–4.49:1. At full opacity all six pass (4.52–7.71). The hover reveal survives via
  // the existing translateX shift.
  out = out.replace('</style>\n</head>',
    '.fnote{opacity:1}.fgo{opacity:1}\n</style>\n</head>');
  log.push('D1d folder caption opacity .85/.75 -> 1');

  // D5/D6/D7 — reader-flow changes approved after a visitor audit.
  //   D5 hero proof line, D6 persistent CV button: ADDITIVE product-layer elements. They are not
  //      injected here; instead the hero band is excluded from pixel/geometry parity and asserted
  //      by gate G8 (existence + content). Deriving oracle markup from the candidate would make
  //      that comparison circular and therefore worthless.
  //   D7 empty media hidden: mechanical and artifact-shaped, so it IS applied to the oracle —
  //      which keeps strict parity meaningful for every section that still renders media.
  {
    // The videos section is the only <section> the artifact renders without an id, so that is
    // how it is identified. Sections are not nested, so the next </section> closes it.
    const vm = out.match(/<section style="padding: 0px 0px 100px[^"]*">/);
    if (!vm) throw new Error('D7: videos section not found in oracle');
    const vi = out.indexOf(vm[0]);
    const vEnd = out.indexOf('</section>', vi);
    if (vEnd === -1) throw new Error('D7: videos section has no closing tag');
    out = out.slice(0, vi) + out.slice(vEnd + '</section>'.length);
    log.push('D7 videos section removed (all slots empty)');
    // remove every remaining empty slot frame except the portrait, which has a real image
    let removed = 0;
    for (;;) {
      const m = out.match(/<div class="frame"[^>]*>\s*<div data-fslot="(?!v3-portrait)[^"]*"[\s\S]*?<\/div>\s*<\/div>/);
      if (!m) break;
      out = out.replace(m[0], '');
      if (++removed > 40) break;
    }
    if (removed) log.push(`D7 empty slot frames removed: ${removed}`);
    log.push('D5 hero proof line — CANDIDATE ONLY, not injected here (see note above); gate G8');
    log.push('D6 persistent nav CV button — CANDIDATE ONLY, not injected here; gate G8');
  }

  // D8 — section order. Evidence-driven, not the artifact's: NN/G eyetracking puts 74% of viewing
  // time in the first two screenfuls, so the strongest asset (campaigns) must arrive early rather
  // than at screen 4.6, followed by experience (the recruiter scan path) and only then About.
  // Applied here so G2/G4 keep comparing like for like instead of being loosened.
  {
    const ORDER = ['work', 'cv', 'about', 'education', 'awards', 'extra'];
    const OPEN = /<section id="(\w+)"[^>]*>/g;
    // split the body into: [before #about] [reorderable sections] [contact onwards]
    const bodyStart = out.indexOf('<section id="about"');
    const contactStart = out.indexOf('<section id="contact"');
    if (bodyStart === -1 || contactStart === -1) throw new Error('D8: section boundaries not found');
    const head = out.slice(0, bodyStart);
    const middle = out.slice(bodyStart, contactStart);
    const tail = out.slice(contactStart);

    const found = {};
    OPEN.lastIndex = 0;
    const starts = [];
    let m;
    while ((m = OPEN.exec(middle))) starts.push({ id: m[1], at: m.index });
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].at : middle.length;
      found[s.id] = middle.slice(s.at, end);
    });
    const missing = ORDER.filter((id) => !found[id]);
    if (missing.length) throw new Error(`D8: sections missing from oracle: ${missing.join(',')}`);
    const extraIds = Object.keys(found).filter((id) => !ORDER.includes(id));
    if (extraIds.length) throw new Error(`D8: unexpected sections: ${extraIds.join(',')}`);
    out = head + ORDER.map((id) => found[id]).join('') + tail;
    log.push(`D8 section order -> ${ORDER.join(' > ')}`);
  }

  // D10 — font subset set. The site drops `latin-ext` (zero characters need it once `vietnamese`
  // is declared last) and two never-fetched weights. Which SUBSET FILE serves a glyph is not a
  // design property — the typeface and outlines are identical — but the rasterisation differs
  // slightly, and Vietnamese uses the affected letters (ă đ ơ ư) constantly. Applying the same
  // subset set here keeps G4 comparing design rather than file provenance.
  {
    const before = (out.match(/@font-face/g) || []).length;
    // drop whole "/* subset */ @font-face{...}" units for latin-ext and the unused weights
    out = out.replace(/\/\* latin-ext \*\/\s*@font-face\s*\{[^}]*\}\s*/g, '');
    out = out.replace(/@font-face\s*\{[^}]*font-family:\s*'Be Vietnam Pro'[^}]*font-weight:\s*(?:200|500)[^}]*\}\s*/g, '');
    out = out.replace(/@font-face\s*\{[^}]*font-weight:\s*(?:200|500)[^}]*font-family:\s*'Be Vietnam Pro'[^}]*\}\s*/g, '');
    const after = (out.match(/@font-face/g) || []).length;
    if (after >= before) throw new Error('D10: no @font-face rules were dropped');
    log.push(`D10 font subsets: ${before} -> ${after} @font-face rules (latin-ext + unused weights dropped)`);
  }

  // D2 — EN mode: the artifact hides the folder tab label with
  // visibility:hidden;width:126px, leaving a blank coloured tab. Show the label.
  if (lang === 'en') {
    const before = out;
    out = out.replace(/visibility:\s*hidden;\s*width:\s*126px;?/g, '');
    if (out !== before) log.push('D2 EN folder tab labels made visible');
  }

  // D3 — brand wall: all six brands map to brands/*.png which 404 even in the artifact.
  // Drop the <img> so the design's own styled <span> fallback renders instead.
  const imgs = [...out.matchAll(/<img[^>]*class="blogo"[^>]*alt="([^"]*)"[^>]*>/g)];
  for (const m of imgs) out = out.replace(m[0], `<span>${m[1]}</span>`);
  if (imgs.length !== 6) throw new Error(`D3: expected 6 brand logos, found ${imgs.length}`);
  log.push(`D3 brand logos -> styled spans: ${imgs.length}`);

  // D4 — contact: restore LinkedIn / Facebook / Drive using the section's own
  // auto-fit grid and the existing eyebrow-label + link cell pattern.
  // Real targets, taken from config.json — an href="#" placeholder would make D4 cosmetic
  // and would let the candidate ship dead links while still matching the oracle.
  const LI = 'https://www.linkedin.com/in/thuc-anh-tran-ton-nu-8b0419222/';
  const FB = 'https://www.facebook.com/thucanhtrantonnu/';
  const DR = 'https://drive.google.com/drive/folders/1eRe98GgmxOvXPUkp-DpNgiSSk0DV4TBY';
  const L = lang === 'en'
    ? [['LinkedIn', 'Trần Tôn Nữ Thục Anh', LI], ['Facebook', 'thucanhtrantonnu', FB], ['Portfolio', 'Open work samples', DR]]
    : [['LinkedIn', 'Trần Tôn Nữ Thục Anh', LI], ['Facebook', 'thucanhtrantonnu', FB], ['Portfolio', 'Xem work samples', DR]];
  const cells = L.map(([label, val, href]) =>
    `<div><p class="eyebrow" style="margin-bottom:8px">${label}</p>` +
    `<a href="${href}" target="_blank" rel="noopener" style="font-size:15.5px">${val}</a></div>`).join('');
  // append into the contact grid (the grid immediately preceding the copy/back buttons)
  const anchor = out.lastIndexOf('</div><div style="display: flex; gap: 10px;');
  if (anchor !== -1) {
    out = out.slice(0, anchor) + cells + out.slice(anchor);
    log.push('D4 contact: +3 cells (LinkedIn, Facebook, Portfolio)');
  } else throw new Error('D4: contact grid anchor not found — refusing to write a partial oracle');

  return { out, log };
}

let manifest = `# Adjusted-oracle deviation manifest
# Generated by tools/visual-qa/make-adjusted-oracle.mjs — do not hand-edit, it is overwritten.
#
# D1a/D1c/D1c'/D1d  WCAG AA contrast remediation
# D2                EN folder tab label shown instead of a blank tab
# D3                brand logos -> the design's own styled <span> (brands/*.png 404 in the artifact)
# D4                contact keeps LinkedIn / Facebook / Drive
# D7                empty media hidden (applied here, so parity stays strict for real media)
# D5, D6            hero proof line + persistent nav CV button — ADDITIVE product-layer elements.
#                   Deliberately NOT injected into the oracle: deriving oracle markup from the
#                   candidate would make the comparison circular. The hero band is excluded from
#                   G2/G4 and asserted instead by gate G8.
`;
for (const lang of ['vi', 'en']) {
  const src = path.join(REF, `oracle-${lang}.html`);
  const html = fs.readFileSync(src, 'utf8');
  const { out, log } = adjust(html, lang);
  const dst = path.join(REF, `adjusted-${lang}.html`);
  fs.writeFileSync(dst, out);
  const h = crypto.createHash('sha256').update(out).digest('hex');
  manifest += `\n## adjusted-${lang}.html  sha256=${h}\n` + log.map((l) => `  - ${l}`).join('\n') + '\n';
  console.log(`adjusted-${lang}.html  ${out.length} chars`);
  log.forEach((l) => console.log(`   ${l}`));
}
fs.writeFileSync(path.join(REF, 'DEVIATIONS.md'), manifest);
console.log('\nwrote reference/DEVIATIONS.md');
