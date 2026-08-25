#!/usr/bin/env node
// Assert every character in the shipped content is covered by a declared @font-face subset.
//
// Subsets were dropped deliberately (cyrillic, latin-ext, two unused weights) after proving no
// character needed them. That proof is only true for the CURRENT content — add a Polish or Turkish
// name and latin-ext becomes necessary again, and the glyph would silently fall back to a system
// font. This makes that regression loud instead of invisible.
//
//   node tools/check-font-coverage.mjs        # exit 1 if a character has no declared subset
//
// KNOWN FALLBACKS are the arrow/close glyphs the artifact also renders from a system font.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.join(import.meta.dirname, '..'));
const f = (n) => path.join(ROOT, n);

// U+2190 ←  U+2192 →  U+2715 ✕ — geometric, no declared subset covers them, and the artifact
// rendered them from a system font too. Listed so they cannot hide a real regression.
const KNOWN_FALLBACK = new Set(['←', '→', '✕']);

const css = fs.readFileSync(f('index.css'), 'utf8');
const FACE = /@font-face\{font-family:'([^']+)';font-style:(\w+);font-weight:(\d+);[^}]*?unicode-range:([^}]+)\}/g;

const families = new Map();
let m;
while ((m = FACE.exec(css))) {
  const [, fam, style, weight, ur] = m;
  const ranges = ur.split(',').map((p) => {
    const t = p.trim().replace('U+', '');
    if (t.includes('-')) { const [a, b] = t.split('-'); return [parseInt(a, 16), parseInt(b, 16)]; }
    const v = parseInt(t, 16); return [v, v];
  });
  const key = `${fam} ${weight} ${style}`;
  if (!families.has(key)) families.set(key, []);
  families.get(key).push(...ranges);
}
if (!families.size) { console.error('no @font-face rules found in index.css'); process.exit(1); }

// every string that can reach the page
const cfg = JSON.parse(fs.readFileSync(f('config.json'), 'utf8'));
const chars = new Set();
const walk = (o) => {
  if (typeof o === 'string') { for (const c of o) chars.add(c); }
  else if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object') Object.values(o).forEach(walk);
};
walk(cfg);
// text baked into the shell (skip tags/attributes: only text nodes matter)
const html = fs.readFileSync(f('index.html'), 'utf8')
  .replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
for (const c of html) chars.add(c);

const printable = [...chars].filter((c) => c.codePointAt(0) > 31 && !/\s/.test(c));
const covers = (ranges, cp) => ranges.some(([a, b]) => cp >= a && cp <= b);

let bad = 0;
for (const [key, ranges] of families) {
  const missing = printable.filter((c) => !covers(ranges, c.codePointAt(0)) && !KNOWN_FALLBACK.has(c));
  if (missing.length) {
    bad += missing.length;
    console.error(`FAIL  ${key}: ${missing.length} character(s) have no declared subset`);
    console.error(`      ${missing.sort().join('')}`);
    console.error(`      ${missing.map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')}`);
  }
}
const fallbacks = printable.filter((c) => KNOWN_FALLBACK.has(c));
if (bad) {
  console.error(`\n${bad} uncovered character slot(s). A dropped subset is now needed again — ` +
                `restore it in index.css and fonts/, then re-run node tools/release.mjs`);
  process.exit(1);
}
console.log(`font coverage OK: ${printable.length} distinct characters, ${families.size} face group(s)`);
console.log(`  known system-font fallbacks present: ${fallbacks.join(' ') || 'none'}`);
