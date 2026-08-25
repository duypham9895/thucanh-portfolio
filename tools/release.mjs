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
const sha8 = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 8);
const HASHED = /^(index|config)\.[0-9a-f]{8}\.(css|js|json)$/;
const MANIFEST = 'release-manifest.json';
const RETAIN = 3;

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

  let html = fs.readFileSync(f('index.html'), 'utf8');
  const cur = assetRefs(stripComments(html));
  cur.css.forEach((h) => { html = html.split(`"${h}"`).join(`"${cssName}"`); });
  cur.js.forEach((h) => { html = html.split(`"${h}"`).join(`"${jsName}"`); });
  cur.preloadFetch.forEach((h) => { html = html.split(`"${h}"`).join(`"${cfgName}"`); });
  fs.writeFileSync(f('index.html'), html);

  const prev = fs.existsSync(f(MANIFEST))
    ? JSON.parse(fs.readFileSync(f(MANIFEST), 'utf8')).generations || [] : [];
  const current = { css: cssName, js: jsName, config: cfgName };
  const same = (a, b) => a.css === b.css && a.js === b.js && a.config === b.config;
  const generations = [current, ...prev.filter((g) => !same(g, current))].slice(0, RETAIN);
  fs.writeFileSync(f(MANIFEST), JSON.stringify({ generations }, null, 2) + '\n');

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
const html = stripComments(fs.readFileSync(f('index.html'), 'utf8'));
const { css: cssRefs, js: jsRefs, preloadFetch } = assetRefs(html);

if (cssRefs.length !== 1) fail(`expected exactly 1 real <link rel="stylesheet">, found ${cssRefs.length}`);
if (jsRefs.length !== 1) fail(`expected exactly 1 real JS <script src>, found ${jsRefs.length}`);

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
