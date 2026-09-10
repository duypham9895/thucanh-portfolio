#!/usr/bin/env node
// Content-hashed release.
//
// index.html names only hashed files:  index.<h>.css   index.<h>.js   config.<h>.json
// A filename either exists with exactly the bytes its hash describes, or not at all, and
// index.<h>.js has its config's hashed name compiled in — so code and content are inseparable.
//
// Not a serve-time build step: outputs are committed and served as-is, like generate_icons.py.
// Editing stays in the unhashed sources.
//
//   node tools/release.mjs           # cut a release
//   node tools/release.mjs --check   # verify the deployed set; exit 1 if not shippable
//
// RETENTION. Superseded assets are NOT deleted immediately. A browser holding index.html from a
// previous release must still be able to fetch that release's assets, or an immutable-asset scheme
// turns a stale-but-working page into a 404. RETAIN generations are kept, recorded in
// release-manifest.json, and their bytes are re-verified by --check — an unverified retention
// promise is fiction.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.join(import.meta.dirname, '..'));
const f = (n) => path.join(ROOT, n);

// Every HTML shell that references the hashed bundle, with the prefix its own depth needs.
// English is the primary language and lives at the root; Vietnamese is a real document at
// /vi/index.html so hreflang has something to point at, and it loads the same hashed
// css/js/config from one level up. A release that rewrote only the root shell would leave /vi/
// pointing at the unhashed files — which still exist, so it would not 404; it would silently
// serve a DIFFERENT generation to Vietnamese visitors.
const SHELLS = [
  { file: 'index.html', prefix: '' },
  { file: 'vi/index.html', prefix: '../' },
];
const sha8 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);
const HASHED = /^(index|config)\.[0-9a-f]{8}\.(css|js|json)$/;
const MANIFEST = 'release-manifest.json';
// Raised from 3 for the v3 launch. Iterating during development ran enough releases to evict
// the generation the LIVE site was still serving, so merging would have 404'd the css and js for
// anyone holding index.html from the previous ten minutes (Pages sends max-age=600) — a blank
// page, because #fallback is only revealed by the script that failed to load. Drop back to 3 once
// the new release has been live longer than that cache window.
const RETAIN = 4;

// Comments plus the CONTENT of raw-text / escapable-raw-text elements. A browser treats markup
// inside <textarea> or <title> as TEXT, so asset-looking tags in there must not satisfy the gate.
// The tags themselves are kept so <script src> is still discoverable.
function stripInert(html) {
  let out = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of ['textarea', 'title', 'style', 'script', 'noscript', 'template', 'xmp']) {
    // Paired form first...
    const paired = new RegExp(`(<${tag}(?=[\\s/>])[^>]*>)([\\s\\S]*?)(<\\/${tag}\\s*>)`, 'gi');
    out = out.replace(paired, (m, open, body, close) => open + close);
    // ...then any UNCLOSED occurrence: a browser swallows the rest of the document as text, so
    // asset tags after an unclosed <textarea> never load. Paired-only stripping let them pass.
    const unclosed = new RegExp(`<${tag}(?=[\\s/>])[^>]*>[\\s\\S]*$`, 'i');
    const m2 = out.match(unclosed);
    if (m2 && !new RegExp(`</${tag}\\s*>`, 'i').test(m2[0])) {
      out = out.slice(0, m2.index) + m2[0].slice(0, m2[0].indexOf('>') + 1);
    }
  }
  return out;
}
const stripComments = stripInert;

// ── attribute-level parsing, not regex-on-tag ──────────────────────────────
// `\brel=` also matches `data-rel=` (\b matches between "-" and "rel"), so a shell carrying only
// data-* attributes used to pass the gate while loading neither CSS nor JS. Attribute names must
// begin at a real boundary, and quoting styles must all be handled.
// (?=[\s/>]) not \b: `\b` sits between "k" and "-", so <link-spoof> matched as <link>.
const TAG = /<(link|script)(?=[ \t\n\f\r/>])([^>]*)>/gi;
// HTML whitespace only: [ \t\n\f\r]. JS \s also matches NBSP, which is NOT an attribute
// separator per spec, so using \s would let `rel="stylesheet"<NBSP>href=...` read as a real href.
const ATTR = /(?:^|[ \t\n\f\r])([A-Za-z_:][-\w:.]*)(?:[ \t\n\f\r]*=[ \t\n\f\r]*(?:"([^"]*)"|'([^']*)'|([^ \t\n\f\r"'=<>`]+)))?/g;
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

function parseAttrs(raw) {
  const out = {};
  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(raw))) {
    const v = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    const k = m[1].toLowerCase();
    // Browsers keep the FIRST occurrence of a duplicated attribute; keeping the last let a
    // second rel=/src= override a benign first one.
    if (!(k in out)) out[k] = v;
  }
  return out;
}

// href of every real stylesheet <link>, src of every real JS <script>, and any
// <link rel=preload as=fetch> (the config preload, whose hash must track the release).
function assetRefs(html) {
  const css = [], js = [], preloadFetch = [];
  TAG.lastIndex = 0;
  let m;
  while ((m = TAG.exec(html))) {
    const a = parseAttrs(m[2]);
    if (m[1].toLowerCase() === 'link') {
      // rel is a space-separated token list; split on HTML whitespace only, or
      // rel="x<NBSP>stylesheet" would read as containing the stylesheet token.
      const rel = (a.rel || '').trim().toLowerCase().split(/[ \t\n\f\r]+/);
      if (rel.includes('stylesheet') && a.href) css.push(a.href);
      if (rel.includes('preload') && (a.as || '').toLowerCase() === 'fetch' && a.href) {
        preloadFetch.push(a.href);
      }
    } else if (a.src && JS_TYPES.has((a.type || '').trim().toLowerCase())) {
      js.push(a.src);
    }
  }
  return { css, js, preloadFetch };
}

// ── CONFIG_URL ─────────────────────────────────────────────────────────────
// Anchored to its own line so a comment containing the same text cannot be rewritten in place of
// the live declaration, and counted so a second declaration is an error rather than a silent
// pick-the-first.
const CFG_DECL = /^[ \t]*var CONFIG_URL = '([^']*)';[ \t]*$/gm;
const PLACEHOLDER = 'config.json';

// Line anchoring does not establish execution context: a declaration inside a /* block comment */
// satisfied it while the real code fetched mutable config.json. Comments are blanked (preserving
// newlines so the line anchor still works) before matching. String/template/regex states are
// tracked so a "/*" inside a literal is not mistaken for a comment.
function blankComments(src) {
  let out = '', i = 0;
  const n = src.length;
  let state = 'code';        // code | sq | dq | tpl | line | block | re
  let prevSig = '';          // last significant char, to tell division from a regex literal
  while (i < n) {
    const c = src[i], c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (c === "'") state = 'sq';
      else if (c === '"') state = 'dq';
      else if (c === '`') state = 'tpl';
      else if (c === '/' && /[(,=:[!&|?{};+\-*%~^]/.test(prevSig)) state = 're';
      if (!/\s/.test(c)) prevSig = c;
      out += c; i++; continue;
    }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += c; } else out += ' '; i++; continue; }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; out += '  '; i += 2; continue; }
      out += (c === '\n' ? '\n' : ' '); i++; continue;
    }
    // inside a literal
    out += c;
    if (c === '\\') { if (i + 1 < n) { out += src[i + 1]; i += 2; continue; } i++; continue; }
    if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"')
        || (state === 'tpl' && c === '`') || (state === 're' && c === '/')) { state = 'code'; prevSig = c; }
    i++;
  }
  return out;
}

function readCfgDecls(src) {
  const code = blankComments(src);
  CFG_DECL.lastIndex = 0;
  const out = [];
  let m;
  while ((m = CFG_DECL.exec(code))) out.push(m[1]);
  return out;
}

function buildJs(configName) {
  const src = fs.readFileSync(f('index.js'), 'utf8');
  const decls = readCfgDecls(src);
  if (decls.length !== 1) {
    throw new Error(`index.js must have exactly one CONFIG_URL declaration, found ${decls.length}`);
  }
  // The transform used to overwrite whatever the source said, which MASKED an edited source value:
  // changing it to 'config.stale.json' still produced a passing hash. The source must be the
  // canonical placeholder, so an edit is an error rather than something we paper over.
  if (decls[0] !== PLACEHOLDER) {
    throw new Error(`index.js CONFIG_URL must be '${PLACEHOLDER}' in source, found '${decls[0]}'`);
  }
  // rewrite by position from the comment-blanked view, so a commented twin is never touched
  const code = blankComments(src);
  CFG_DECL.lastIndex = 0;
  const hit = CFG_DECL.exec(code);
  if (!hit) throw new Error('index.js: CONFIG_URL declaration not found in executable code');
  return src.slice(0, hit.index) + `  var CONFIG_URL = '${configName}';` +
         src.slice(hit.index + hit[0].length);
}

const problems = [];
const fail = (m) => problems.push(m);

// ── generate ───────────────────────────────────────────────────────────────
if (!process.argv.includes('--check')) {
  const cfgBuf = fs.readFileSync(f('config.json'));
  const cfgName = `config.${sha8(cfgBuf)}.json`;
  fs.writeFileSync(f(cfgName), cfgBuf);

  const jsOut = buildJs(cfgName);
  const jsName = `index.${sha8(Buffer.from(jsOut))}.js`;
  fs.writeFileSync(f(jsName), jsOut);

  const cssBuf = fs.readFileSync(f('index.css'));
  const cssName = `index.${sha8(cssBuf)}.css`;
  fs.writeFileSync(f(cssName), cssBuf);

  for (const shell of SHELLS) {
    if (!fs.existsSync(f(shell.file))) continue;
    let html = fs.readFileSync(f(shell.file), 'utf8');
    const cur = assetRefs(stripComments(html));
    cur.css.forEach((h) => { html = html.split(`"${h}"`).join(`"${shell.prefix}${cssName}"`); });
    cur.js.forEach((h) => { html = html.split(`"${h}"`).join(`"${shell.prefix}${jsName}"`); });
    cur.preloadFetch.forEach((h) => { html = html.split(`"${h}"`).join(`"${shell.prefix}${cfgName}"`); });
    fs.writeFileSync(f(shell.file), html);
  }

  const prevRaw = fs.existsSync(f(MANIFEST))
    ? JSON.parse(fs.readFileSync(f(MANIFEST), 'utf8')) : {};
  const prev = prevRaw.generations || [];
  const current = { css: cssName, js: jsName, config: cfgName };
  const same = (a, b) => a.css === b.css && a.js === b.js && a.config === b.config;
  // A generation the LIVE site is still serving must survive prune no matter how many releases
  // happen. RETAIN alone does not protect it: during this rebuild the live generation was
  // restored, RETAIN raised to 4, and then evicted anyway within the hour by the releases that
  // came with the next round of fixes — silently, because prune says nothing about what it took.
  // `pinned` in the manifest is exempt from the slice. Remove the pin once the deployed release
  // has been live longer than Pages' cache-control window (max-age=600).
  const pinnedGens = (prevRaw.pinned || []);
  const rolling = [current, ...prev.filter((g) => !same(g, current) && !pinnedGens.some((q) => same(q, g)))]
    .slice(0, RETAIN);
  const generations = [...rolling, ...pinnedGens.filter((q) => !same(q, current))];
  fs.writeFileSync(f(MANIFEST), JSON.stringify(
    pinnedGens.length ? { generations, pinned: pinnedGens } : { generations }, null, 2) + '\n');

  // Fonts are content-hashed on the same scheme but are NOT matched by HASHED, so prune never
  // touched them — the subsetter deleted them instead. The live generation's CSS names ten of
  // them, so they have to survive the swap too or a cached visitor gets a styled page in system
  // fonts plus ten failed requests. Recorded next to the pinned generation, and asserted below.
  const keep = new Set(generations.flatMap((g) => [g.css, g.js, g.config]));
  const pruned = fs.readdirSync(ROOT).filter((n) => HASHED.test(n) && !keep.has(n));
  pruned.forEach((n) => fs.unlinkSync(f(n)));

  console.log('released:');
  console.log(`  ${cssName}`);
  console.log(`  ${jsName}   -> ${cfgName}`);
  console.log(`  retained ${generations.length} generation(s) for cached HTML`);
  if (pruned.length) console.log(`  pruned ${pruned.length}: ${pruned.join(', ')}`);
}

// ── verify ─────────────────────────────────────────────────────────────────
// Each shell is checked independently, and each must agree with the others: a shell left behind
// at an older generation is the exact failure the content hashing exists to prevent.
const shellRefs = [];
for (const shell of SHELLS) {
  if (!fs.existsSync(f(shell.file))) {
    if (shell.file !== 'index.html') continue;
    fail(`${shell.file} is missing`);
    continue;
  }
  const h = stripComments(fs.readFileSync(f(shell.file), 'utf8'));
  const r = assetRefs(h);
  // Require the prefix, do not merely tolerate it. Returning the href unchanged when the prefix
  // is ABSENT made a /vi/ shell naming "index.<h>.css" compare equal to the root shell's — so a
  // shell that loads neither its stylesheet nor its script passed the check clean.
  const strip = (x) => {
    if (!shell.prefix) return x;
    if (!x.startsWith(shell.prefix)) {
      fail(`${shell.file} references "${x}" without the "${shell.prefix}" prefix its depth needs — it will 404`);
      return null;
    }
    return x.slice(shell.prefix.length);
  };
  if (r.css.length !== 1) fail(`${shell.file}: expected exactly 1 real <link rel="stylesheet">, found ${r.css.length}`);
  if (r.js.length !== 1) fail(`${shell.file}: expected exactly 1 real JS <script src>, found ${r.js.length}`);
  shellRefs.push({
    shell, css: r.css.map(strip), js: r.js.map(strip), preloadFetch: r.preloadFetch.map(strip),
  });
}
// A shell may legitimately not exist — but not if another shell advertises it. index.html carries
// <link rel="alternate" hreflang> pointing at /en/, so deleting en/index.html would leave a live
// hreflang aimed at a 404, and the loop above would `continue` right past it.
{
  const viHtml = fs.readFileSync(f('index.html'), 'utf8');
  for (const m of viHtml.matchAll(/<link[^>]+rel=["']alternate["'][^>]*>/gi)) {
    const href = (m[0].match(/href=["']([^"']+)["']/i) || [])[1] || '';
    const lang = (m[0].match(/hreflang=["']([^"']+)["']/i) || [])[1] || '';
    if (!href || lang === 'x-default') continue;
    const rel = href.replace(/^https?:\/\/[^/]+\//, '');
    if (!rel) continue;                                   // the root, which is index.html itself
    const target = rel.endsWith('/') ? rel + 'index.html' : rel;
    if (!fs.existsSync(f(target))) {
      fail(`index.html advertises hreflang="${lang}" -> ${href}, but ${target} does not exist`);
    } else if (!SHELLS.some((sh) => sh.file === target)) {
      fail(`${target} is advertised by hreflang but is not in SHELLS, so release does not hash it`);
    }
  }
}

{
  const man = fs.existsSync(f(MANIFEST)) ? JSON.parse(fs.readFileSync(f(MANIFEST), 'utf8')) : {};
  for (const g of (man.pinned || [])) {
    for (const n of [g.css, g.js, g.config]) {
      if (!fs.existsSync(f(n))) fail(`pinned generation asset ${n} is missing — a cached visitor would 404`);
    }
  }
  for (const a of (man.pinnedAssets || [])) {
    if (!fs.existsSync(f(a))) fail(`pinned asset ${a} is missing — the pinned generation's CSS names it`);
  }
}

const head = shellRefs[0] || { css: [], js: [], preloadFetch: [] };
for (const s2 of shellRefs.slice(1)) {
  if (s2.css[0] !== head.css[0] || s2.js[0] !== head.js[0]) {
    fail(`${s2.shell.file} references {${s2.css[0]}, ${s2.js[0]}} but index.html references ` +
         `{${head.css[0]}, ${head.js[0]}} — shells are on different generations`);
  }
}
const html = stripComments(fs.readFileSync(f('index.html'), 'utf8'));
const { css: cssRefs, js: jsRefs, preloadFetch } = head;

const verifyHashed = (ref, kind) => {
  if (!ref || !HASHED.test(ref)) { fail(`${kind} "${ref}" is not content-hashed`); return false; }
  if (!fs.existsSync(f(ref))) { fail(`${kind} "${ref}" does not exist`); return false; }
  const got = sha8(fs.readFileSync(f(ref))), want = ref.split('.')[1];
  if (want !== got) { fail(`${ref} hashes to ${got}, filename claims ${want}`); return false; }
  return true;
};
cssRefs.forEach((r) => verifyHashed(r, 'stylesheet'));
jsRefs.forEach((r) => verifyHashed(r, 'script'));

let cfgRef = null;
if (jsRefs.length === 1 && HASHED.test(jsRefs[0]) && fs.existsSync(f(jsRefs[0]))) {
  const decls = readCfgDecls(fs.readFileSync(f(jsRefs[0]), 'utf8'));
  if (decls.length !== 1) fail(`${jsRefs[0]} must have exactly one CONFIG_URL, found ${decls.length}`);
  else if (decls[0] === PLACEHOLDER) fail(`${jsRefs[0]} still points at mutable ${PLACEHOLDER}`);
  else { cfgRef = decls[0]; verifyHashed(cfgRef, 'config'); }
}

// source freshness — all three, not just CSS
if (cssRefs.length === 1 && HASHED.test(cssRefs[0])
    && sha8(fs.readFileSync(f('index.css'))) !== cssRefs[0].split('.')[1]) {
  fail('index.css has changed since the last release — run: node tools/release.mjs');
}
if (cfgRef && sha8(fs.readFileSync(f('config.json'))) !== cfgRef.split('.')[1]) {
  fail('config.json has changed since the last release — run: node tools/release.mjs');
}
if (cfgRef && jsRefs.length === 1 && HASHED.test(jsRefs[0])) {
  try {
    if (sha8(Buffer.from(buildJs(cfgRef))) !== jsRefs[0].split('.')[1]) {
      fail('index.js has changed since the last release — run: node tools/release.mjs');
    }
  } catch (e) { fail(String(e.message)); }
}

// retained generations must actually be intact
const manifest = fs.existsSync(f(MANIFEST))
  ? JSON.parse(fs.readFileSync(f(MANIFEST), 'utf8')).generations || [] : [];
manifest.forEach((g, i) => {
  let ok = true;
  ['css', 'js', 'config'].forEach((k) => {
    const n = g[k];
    if (!n || !HASHED.test(n)) { fail(`manifest generation ${i} has an invalid ${k}: ${n}`); ok = false; return; }
    if (!fs.existsSync(f(n))) { fail(`retained asset missing: ${n} (generation ${i})`); ok = false; return; }
    if (sha8(fs.readFileSync(f(n))) !== n.split('.')[1]) { fail(`retained asset corrupt: ${n}`); ok = false; }
  });
  // Hashing each file alone is not enough: a retained JS must still point at ITS OWN generation's
  // config, or an older cached page fetches a config that no longer exists.
  if (!ok) return;
  const jsText = fs.readFileSync(f(g.js), 'utf8');
  const decls = readCfgDecls(jsText);
  if (decls.length !== 1) fail(`retained ${g.js} must have exactly one CONFIG_URL, found ${decls.length}`);
  else if (decls[0] !== g.config) {
    fail(`retained ${g.js} embeds CONFIG_URL '${decls[0]}' but generation ${i} records '${g.config}'`);
  }
  // A retained artifact must not contain ANY other CONFIG_URL assignment. Testing spoofs against
  // the live tree once poisoned a retained generation this way: the hashed declaration was a
  // template-literal decoy while live code assembled mutable config.json at runtime.
  const assigns = [...jsText.matchAll(/CONFIG_URL\s*=/g)].length;
  if (assigns !== 1) {
    fail(`retained ${g.js} has ${assigns} CONFIG_URL assignments; exactly 1 plain hashed literal is required`);
  }
  if (!new RegExp(`CONFIG_URL = '${g.config.replace(/\./g, '\\.')}';`).test(jsText)) {
    fail(`retained ${g.js} does not contain a plain literal CONFIG_URL = '${g.config}';`);
  }
});
if (!manifest.length) fail(`${MANIFEST} missing or empty — run: node tools/release.mjs`);
else {
  const h = manifest[0];
  if (h.css !== cssRefs[0] || h.js !== jsRefs[0] || h.config !== cfgRef) {
    fail(`${MANIFEST} head {${h.css}, ${h.js}, ${h.config}} != index.html ` +
         `{${cssRefs[0]}, ${jsRefs[0]}, ${cfgRef}} — run: node tools/release.mjs`);
  }
}

// A stale preload href is a wasted request and, worse, silently drifts from what the JS fetches.
if (preloadFetch.length > 1) fail(`expected at most 1 <link rel=preload as=fetch>, found ${preloadFetch.length}`);
if (preloadFetch.length === 1 && cfgRef && preloadFetch[0] !== cfgRef) {
  fail(`config preload "${preloadFetch[0]}" != the config the JS fetches "${cfgRef}" — run: node tools/release.mjs`);
}

const allowed = new Set(manifest.flatMap((g) => [g.css, g.js, g.config]).filter(Boolean));
[...cssRefs, ...jsRefs, ...preloadFetch, cfgRef].filter(Boolean).forEach((n) => allowed.add(n));
const orphans = fs.readdirSync(ROOT).filter((n) => HASHED.test(n) && !allowed.has(n));
if (orphans.length) fail(`orphaned hashed assets not in ${MANIFEST}: ${orphans.join(', ')}`);

if (problems.length) {
  console.error('\nRELEASE CHECK FAILED:');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log(`release check OK: ${cssRefs[0]}, ${jsRefs[0]} -> ${cfgRef}` +
            ` (+${Math.max(0, manifest.length - 1)} retained generation(s), all verified)`);
