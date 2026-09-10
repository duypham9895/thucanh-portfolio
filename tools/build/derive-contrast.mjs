// Derive the D1 accessibility deviations, by measurement rather than by copying the previous
// port's hex values.
//
// The design uses each section colour for two different jobs, and they fail differently:
//
//   as a TINTED BACKGROUND   the section fill. Fine, but it darkens the page under body text,
//                            so --soft must clear AA against the darkest tint, not just --bg.
//   as TEXT                  section kicker, the italic title fragment, stat numbers, indices.
//                            Citron measured 1.33:1. Fix by darkening the TEXT, keeping the hue.
//   as a SOLID SURFACE       folder tabs and the contact card, which carry white text. Here the
//                            text cannot move — white is the design — so the SURFACE must darken.
//
// Only lightness moves in any of the three; hue and chroma are held, so every colour still reads
// as the colour the design chose.
import fs from 'node:fs';

const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const l2s = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgb2hex = (r) => '#' + r.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0').toUpperCase()).join('');
function rgb2oklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(s2l);
  const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
  const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
  const s = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
  return [0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
          1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
          0.0259040371*l + 0.7827717662*m - 0.8086757660*s];
}
function oklab2rgb([L, A, B]) {
  const l = (L + 0.3963377774*A + 0.2158037573*B) ** 3;
  const m = (L - 0.1055613458*A - 0.0638541728*B) ** 3;
  const s = (L - 0.0894841775*A - 1.2914855480*B) ** 3;
  return [ 4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
          -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
          -0.0041960863*l - 0.7034186147*m + 1.7076147010*s].map(l2s);
}
const mix = (a, b, p) => {
  const A = rgb2oklab(hex2rgb(a)), B = rgb2oklab(hex2rgb(b)), t = p / 100;
  return rgb2hex(oklab2rgb([0,1,2].map((i) => A[i]*t + B[i]*(1-t))));
};
const lum = (h) => { const [R,G,B] = hex2rgb(h).map(s2l); return 0.2126*R + 0.7152*G + 0.0722*B; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };

// Walk lightness in oklab until every backdrop clears the target. dir -1 darkens, +1 lightens.
function shift(hex, backdrops, target, dir) {
  const lab = rgb2oklab(hex2rgb(hex));
  for (let i = 0; i <= 500; i++) {
    const cand = oklab2rgb([lab[0] + dir * i * 0.002, lab[1], lab[2]]);
    if (cand.some((c) => c < -0.02 || c > 1.02)) continue;
    const h = rgb2hex(cand);
    if (Math.min(...backdrops.map((b) => ratio(h, b))) >= target) return h;
  }
  return hex;
}

const PAPER = '#FBFAF6', BG = '#F4F2ED', AA = 4.5;
const TINT = { about: 14, education: 16, cv: 13, work: 7, extra: 12, awards: 10, xfile: 20 };

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const log = [];

// 1. Section surfaces that carry white text (folder tabs, the contact card).
for (const f of cfg.meta.folders) {
  const white = /^#f{3,6}$/i.test(f.t);
  if (white) {
    const before = ratio('#FFFFFF', f.c);
    if (before < AA) {
      const c2 = shift(f.c, ['#FFFFFF'], AA, -1);
      log.push(['surface', f.id, f.c, c2, before, ratio('#FFFFFF', c2)]);
      f.c = c2;
    }
  } else {
    const before = ratio(f.t, f.c);
    if (before < AA) {
      const t2 = shift(f.t, [f.c], AA, -1);
      log.push(['on-surface text', f.id, f.t, t2, before, ratio(t2, f.c)]);
      f.t = t2;
    }
  }
}

// 2. Section colour used AS TEXT, over its own tint and over --bg.
const tints = [BG];
for (const f of cfg.meta.folders) {
  const tint = mix(f.c, PAPER, TINT[f.id] ?? 10);
  tints.push(tint);
  const backdrops = [tint, BG];
  const before = Math.min(...backdrops.map((b) => ratio(f.c, b)));
  const tc = before >= AA ? f.c : shift(f.c, backdrops, AA, -1);
  if (tc !== f.c) log.push(['as text', f.id, f.c, tc, before, Math.min(...backdrops.map((b) => ratio(tc, b)))]);
  f.tc = tc;
}

// 3. Body text. It sits on every tint, so the DARKEST tint is the binding constraint —
//    checking only --bg is what left .body at 3.75:1 inside the About section.
const soft0 = '#7B7869';
const soft = shift(soft0, tints, AA, -1);
log.push(['--soft', 'body text', soft0, soft, Math.min(...tints.map((b) => ratio(soft0, b))), Math.min(...tints.map((b) => ratio(soft, b)))]);

// 4. The accent, in both of its roles.
const pink0 = '#CB7885';
const pinkSurface = shift(pink0, ['#FFFFFF'], AA, -1);      // white text sits on it
const pinkInk = shift(pink0, tints, AA, -1);                // it is text on the page
log.push(['--pink surface', 'white on it', pink0, pinkSurface, ratio('#FFFFFF', pink0), ratio('#FFFFFF', pinkSurface)]);
log.push(['--pink-ink', 'as text', pink0, pinkInk, Math.min(...tints.map((b) => ratio(pink0, b))), Math.min(...tints.map((b) => ratio(pinkInk, b)))]);

console.log('role              id/what          before   ->  after     ratio');
log.forEach(([role, id, a, b, r1, r2]) =>
  console.log(`  ${role.padEnd(16)} ${String(id).padEnd(15)} ${a} -> ${b}   ${r1.toFixed(2)} -> ${r2.toFixed(2)}`));

fs.writeFileSync('config.json', JSON.stringify(cfg, null, 2) + '\n');
fs.writeFileSync('tools/build/contrast-report.json', JSON.stringify({ log, tokens: { soft, pinkSurface, pinkInk } }, null, 2) + '\n');
console.log(`\nTOKENS for index.css:  --soft:${soft}  --pink:${pinkSurface}  --pink-ink:${pinkInk}`);
