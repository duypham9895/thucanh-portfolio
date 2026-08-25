# Plan v3 — Artifact Parity Rebuild

**Target:** Claude Design artifact `54559e05-eda1-4835-9b23-bd439f19e24d`
**Repo:** `thucanh-portfolio` (static, GitHub Pages, `thucanhtrantonnu.com`)
**Revision:** v3 — after Codex Sol round 2 (16 BLOCKER, verdict NOT SAFE TO EXECUTE)

---

## 0. What changed since v2

v2's central weakness was that it *described* gates instead of having them. Codex was right.
The gates are now **built and self-tested**; the deviation set is now **mechanised and
hash-pinned** instead of being prose. Everything below is verified, not asserted.

**Self-test result** — gates run with the adjusted oracle as its own candidate:

```
PASS G1 baseline integrity      52 files hash-pinned, verify OK
PASS G2 geometry parity         all sections, 1440/1280/1024
FAIL G3 horizontal overflow     320:264px 375:209px 390:194px   <- the artifact's own defect,
PASS G4 pixel parity                                               which the CANDIDATE fixes
PASS G5 design tokens
PASS G6 contrast AA             0 failures after D1
PASS G7 no failed requests
```

G3 failing on the oracle is the gate working: it reproduces the exact defect we are fixing.

Building the gates immediately caught two bugs that prose review had missed:

- The deviation script replaced only **hex** colours. React serializes inline colours as
  `rgb(r, g, b)`, so every `C(id)`-derived folder colour survived — and a `grep` for the hex
  "proved" a fix that had not happened. Both notations are now replaced (12 occurrences in VI).
- The contrast gate treated `rgba(127,127,127,.08)` as opaque grey, inventing 28 false failures.
  Backgrounds are now **alpha-composited** up the ancestor chain. 42 → 14 → 0.

## 1. Source of truth

Artifact recovered byte-exact by decoding the frame origin's `__bundler/template` (JSON-encoded
HTML) and `__bundler/manifest` (gzip+base64 assets). Nothing inferred from screenshots.

`docs/design/artifact-source/` — **52 files hash-pinned in `BASELINE.sha256`**

| Path | Role |
|---|---|
| `design-system.css` | verbatim design contract (5,136 chars) |
| `fonts/` + `fonts.css` | 40 woff2 faces, all `unicode-range` preserved |
| `modules/*.jsx` | every component + all VI/EN content + `UI` translation tables |
| `reference/oracle-{vi,en}.html` | **pristine oracle** — artifact as designed, zero JS |
| `reference/adjusted-{vi,en}.html` | **adjusted oracle** — pristine + approved deviations |
| `reference/DEVIATIONS.md` | generated manifest: every deviation + sha256 + geometry delta |

### Two oracles, and why

The candidate deliberately deviates from the artifact in six approved ways. Diffing against the
*pristine* oracle would flag those as failures, and the only way to hide them would be to widen the
mask until it also hides real regressions. So `make-adjusted-oracle.mjs` applies each deviation
mechanically and auditably; the candidate is diffed against the **adjusted** oracle at full
strictness. The deviation set is the complete, reviewable list of allowed differences.

**Pristine oracle validated against the live React artifact** (1440, full page): total height
**8737 = 8737**, all 9 sections delta 0; diff 0.0952% of which 98.2% is inside image-slot
placeholders; **0.0017% outside** — subpixel AA on one CV text line, caused by React splitting
`— {d}` into two text nodes where serialized HTML has one. That 0.0017% is the measured noise
floor; budgets are set against it, not zero.

### Approved deviation set (D1–D4)

| ID | Deviation | Effect |
|---|---|---|
| **D1a** | `--soft` `#7B7869`→`#6A6759`; `--pink` `#CB7885`→`#BD5565` | body text 3.97→5.08; white-on-pink 3.20→4.52 |
| **D1c** | section colour **as text** → darkened variant (surfaces unchanged) | citron 1.42→4.53, beige 2.00→4.51, awards pink 1.92→4.51, about 4.04→4.50 |
| **D1c′** | contact card `rgba(255,255,255,.8)` → solid white | 3.48→4.52 |
| **D2** | EN folder tab label shown instead of `visibility:hidden;width:126px` | removes a blank tab that reads as broken |
| **D3** | 6 brand `<img>` → the design's own styled `<span>` | `brands/*.png` 404 even in the artifact |
| **D4** | contact +3 cells (LinkedIn, Facebook, Portfolio) | uses the section's existing auto-fit grid |
| **D5/D6** | hero proof line + persistent nav CV | additive; excluded from G2/G4, asserted by G8 |
| **D7** | empty media renders nothing | removed a section that was 13.8% of the page in grey boxes |
| **D8** | section order `work>cv>about>education>awards>extra` | campaigns moved from screen 4.6 to 1.0 — see `docs/research/reader-flow.md` |
| **D9** | hero `calc(100vh - 72px)`, `100svh` where supported | kills the false floor at 1440x900; stops mobile overshoot |

**Measured geometric consequences** (absorbed into the adjusted oracle, so exact equality still
applies): about **−15px** (D3 brand wall), contact **+67px** (D4 wrap), total **+52px**.

The rule behind D1c, stated once: **section colour as a _surface_ keeps its artifact value;
section colour as _text_ uses a darkened variant of the same hue**, clearing 4.5:1 on both `--bg`
and `--paper` (`--bg` is the binding constraint for dark text). All six folder surfaces are
untouched.

## 2. Architecture

Artifact ships React dev + ReactDOM dev + Babel ≈ **4.3 MB**, compiling JSX in-browser.
`AGENTS.md`: *"Avoid adding build tooling unless project grows beyond static needs."*

**Decision: vanilla JS, no framework, no build step.**

### 2.1 Style migration — three tiers

| Tier | Examples | Migration |
|---|---|---|
| **Static** | section padding, grid templates, font sizes, gaps | → CSS class |
| **Per-instance (closed set)** | folder colour, `--off`, `--sc`, slot ratio | → inline custom property |
| **Runtime** | hover-peek coords, nav scroll state, drag-over | → stays inline / toggled class |

The per-instance tier is a **closed set of exactly 4 properties**, enforced by an allowlist in the
renderer; anything else throws in dev. It is not open-ended.

**Critical correction (Codex).** v2 put `--off` inline *and* expected a media query to zero it.
**A media query cannot override an inline custom property.** The inline value is therefore named
`--off-instance`, and the consumed value is derived:

```css
.folder { --off: var(--off-instance, 0px); }           /* desktop: use the stagger */
@media (max-width: 900px) { .folder { --off: 0px; } }  /* mobile: overrides cleanly */
```

Same pattern for any per-instance property the responsive tier must override.

### 2.2 Cascade preservation

Inline styles beat `a:hover` / `.btn:hover`. Lifting the white contact links to a class would
**lose** to those rules and change rendering. Therefore:

- A written **property × state map** is produced *before* the lift. Every lifted declaration that
  competes with a `:hover`/`:focus` rule gets an explicit same-or-higher-specificity counterpart.
- **Shorthands stay shorthands.** React's `font:'11px/1 sans-serif'` resets every font longhand;
  a partial longhand replacement lets inherited weight/style/spacing leak in.

### 2.3 Computed-style gate — with an allowed-delta map

Unconditional full-longhand equality is **impossible by construction** (Codex, correct): semantic
buttons must gain focus behaviour the oracle's `<div>`s lack, and D1/D2/D3 change styles on
purpose. The gate is therefore:

- node correspondence via a stable `data-qa` path (semantic tags change; paths do not);
- compare full longhand sets in **default / `:hover` / `:focus-visible`**;
- differences must appear in an **explicit allowed-delta map keyed by `data-qa × state ×
  property`**, derived from `DEVIATIONS.md`. Any unlisted delta fails.
- plus geometry equality, which no style comparison can substitute for.

### 2.4 Rendering strategy

`innerHTML` re-render on language switch would reset `.reveal.in`, focus, scroll, object URLs and
hover. Language switching **mutates text nodes and attributes in place** against a keyed node map:

- key = `sectionId / collectionName / index / fieldName`;
- a **VI/EN structural-parity check runs at build time** — every collection must have identical
  length and key shape in both languages, or the build fails. This is what prevents stale or
  unmapped DOM.
- "nodes are never replaced" is narrowed to **language-owned static nodes**. Sheet lifecycle and
  video/media elements legitimately create and destroy nodes and are excluded.

### 2.5 Consequences (the scope boundary)

- JS budget. The plan set **< 25 KB raw / < 9 KB gzip**; the deployed file is **36.0 KB raw /
  9.97 KB gzip** and therefore **misses both**. Recorded rather than quietly rewritten; the figure
  is refreshed here because it went stale as the code grew. The overage is explanatory comments
  documenting *why* each artifact behaviour is reproduced. Stripping them safely needs a real
  parser and saves ~1.5 KB gzip — a risky transform to hit a self-imposed number is the wrong
  trade, and Codex agreed. 10 KB gzip against the artifact's 4.3 MB is the number that matters.
- Fonts self-hosted; **Cormorant cyrillic + cyrillic-ext dropped** (unreachable for VI/EN).
- **Removed** (absent from the artifact): dark mode, custom cursor, mailto form, AOS, Font Awesome,
  body-scroll-lock.
- Tweaks panel **not shipped**; its defaults become fixed config.
- **Grid renderer dropped** — layout is fixed to List.
- `uploads/cv.pdf` → real `downloads/Tran-Ton-Nu-Thuc-Anh-CV.pdf`.
- `manifest.json` updated: `lang` → `vi`, theme colours → new palette.

## 3. Breakpoint contract

The artifact's own query is `@media (max-width:900px)`, so **900px is already mobile there**.

- **Parity tier — 1440 / 1280 / 1024 / 901**, VI *and* EN. 901 is included because it is the
  highest-risk boundary.
- **Responsive tier — ≤900px** (incl. exactly 900). New work; judged by overflow + review.

## 4. Mobile overflow — corrected

**`repeat(auto-fit,minmax(0,1fr))` is not a single-column fix** (Codex, correct): a zero minimum
lets many narrow tracks form, so a grid can stay multi-column while technically passing an overflow
check. The responsive tier uses **explicit `1fr`**.

| Rule | Artifact | ≤900px |
|---|---|---|
| hero | `1fr 1.05fr` | `1fr` |
| about | `1.2fr minmax(250px,.8fr)` | `1fr` |
| cv | `190px 1fr` | `1fr` |
| education / extra / awards / contact / videos | `repeat(auto-fit,minmax(270–300px,1fr))` | `1fr` |
| sheet grids (×4) | `minmax(300px,1fr)`, `1fr 1fr` | `1fr` |
| **sheet action list** | **`30px 1fr`** ← missed in v2 | `24px 1fr` + `min-width:0` on the text cell |
| `.tab` | `max-width:none` ← the actual cause | re-clamp; `--off` → 0 via `--off-instance` |

Additionally **every grid/flex child that can hold long content gets `min-width:0`** — a track
minimum alone does not stop a child from forcing width.

**Acceptance:** `scrollWidth === clientWidth` at 320/375/390/768, on the page **and inside every
one of the 5 campaign sheets**, each opened through its real control (see §6 G3).

## 5. Behaviour parity

- **Reveal:** observe after first render, `unobserve` on fire, never double-observe.
  `prefers-reduced-motion` must **force `.reveal{opacity:1}`** — merely disabling the transition
  leaves content invisible at `opacity:0`.
- **Sheet:** `role="dialog"` + `aria-modal`, focus trap, focus restore, background `inert`,
  scrollbar-gutter compensation. Artifact's `next()` calls `window.scrollTo`, which does not reset
  `.sheet.scrollTop`; we reset the sheet's own scroll (documented deviation).
- **Escape** inside the video-link input must `stopPropagation()` — in the artifact it bubbles and
  closes the whole campaign.
- **Video source precedence — exactly the artifact's order:** IndexedDB blob → configured `src` →
  persisted localStorage link. (`emb = embedUrl(src || link)`, and `url ? video : emb ? iframe`.)
  Store names preserved: DB `v3vid`, store `v`, key `v3vidlink-<id>`. Blob URLs revoked on
  replace/unmount; quota failure handled.
- **Keyboard:** `.crow` and `.ccard` are clickable `<div>`s in the artifact — sheets would be
  unreachable. They become real controls, as do folders.
- **Semantic swap safety:** `.folder` gets explicit `display:block;width:100%;text-align:left;
  font:inherit` and is re-diffed after the tag change.
- Scroll offset `-60px`; toast 1800 ms.

## 6. Gates — implemented in `tools/visual-qa/gates.mjs`

| Gate | Checks | Fails when |
|---|---|---|
| **G1** baseline | `shasum -c BASELINE.sha256` | any pinned file drifted |
| **G2** geometry | per-section height vs **adjusted** oracle at 1440/1280/1024/901, VI+EN | any integer mismatch |
| **G3** overflow | page at 320/375/390/768 **and** each of 5 sheets opened via `[data-qa^="campaign-"]`, incl. descendant scrollers and right-edge spill | any overflow |
| **G4** pixel | dimension equality (no rescale), masked diff, **connected-component** sizing | outside-mask > 0.05% or largest region > 2000px |
| **G5** tokens | computed `:root` tokens vs adjusted oracle | any drift |
| **G6** contrast | every text node vs **alpha-composited** background, size/weight-aware | any AA failure |
| **G7** assets | `requestfailed` + status ≥ 400 | any failed request |

Plus, outside the browser: JS size (raw + gzip), `python3 -m json.tool` on both JSON files, and
**copy fidelity by parsed code-point comparison** (not byte compare — JS literals and JSON differ
in quoting/escaping) for **both** VI and EN.

### Fonts — NFC normalisation

Codex was right and it is verified: NFD decomposition of the real VI content requires **U+0302,
U+0306, U+031B**, and **none of the three appears in any preserved `unicode-range`** — NFD text
would silently fall back to a system font. Hash-pinning the faces cannot detect that.

Resolution: **all rendered content is normalised to NFC** (`String.prototype.normalize('NFC')`
applied at config load), plus a build-time assertion that every code point in the shipped content
is covered by some declared `unicode-range`, and a render check that no fallback family is used.

### Cache coherency — content-hashed filenames

Two earlier attempts were rejected in review; both are recorded because the reasoning matters.

1. **`?v=<date>` query stamps.** Rejected: query strings are cache *busting*, not immutable
   versioning. A stale `index.html` can load cached old CSS while a cache-miss on
   `index.js?v=old` silently resolves to the current bytes, mixing generations.
2. **The same stamp plus a runtime release check.** Rejected: a same-day re-release reused the
   stamp, so changed bytes shipped under an unchanged URL; and the `--check` gate accepted any
   number of HTML references, so it passed even with the stylesheet reference deleted entirely.

**Shipped:** `tools/release.mjs` writes `index.<sha8>.css`, `index.<sha8>.js` and
`config.<sha8>.json`, points `index.html` at them, and compiles the hashed config name into the
hashed JS. A filename therefore either exists with exactly the bytes its hash names, or does not
exist at all — and a cached `index.<h>.js` can only ever request the `config.<h>.json` it shipped
with. Code and content are inseparable; there is no stamp to drift and no reload fallback.

Not a serve-time build step: the generated files are committed and served as-is, exactly like the
existing `generate_icons.py` outputs. Editing continues in the unhashed sources.

**Retention.** Superseded assets are kept, not deleted. A browser holding `index.html` from the
previous release must still be able to fetch that release's assets or it gets a **404** instead of
a stale-but-working page — deleting immediately would convert generation-mixing into broken pages.
Three generations are retained and recorded in `release-manifest.json`; older ones are pruned.

**Legacy shell.** A browser cached from *before* the hashed release references the unhashed
`index.js`, whose DOM has none of the current mount points. `index.js` detects the missing shell,
reloads once (guarded by `sessionStorage`, so it cannot loop), and otherwise exits quietly instead
of throwing.

`node tools/release.mjs --check` is the gate. It matches **`<link rel="stylesheet">` and
`<script src>` structurally**, not by substring — a `rel="alternate"` or a commented-out tag used
to satisfy the earlier generic regex — and it verifies freshness of **all three** sources, not
just CSS. It was verified to actually bite — exit 1 for a
`rel="stylesheet"` swapped to `rel="alternate"`, edited-but-unreleased **CSS**, edited-but-unreleased
**JS**, edited-but-unreleased **config**, and an orphaned generation absent from the manifest;
exit 0 only when the set is mutually consistent.

### Deploy / rollback

Tag the current deploy before merge. Post-deploy smoke test against the real origin: fonts load,
config parses, CV downloads, icons resolve, zero console errors, both languages render.

## 7. Codex round-2 findings → resolution

| Finding | Resolution |
|---|---|
| Oracle/fonts/plan/QA untracked | 52 files **hash-pinned** in `BASELINE.sha256`, verified by G1 (commit is the user's call) |
| Harness does not implement its gates | `gates.mjs` written; G1–G7 implemented with exit codes; self-tested |
| Computed-style/token/contrast/copy gates absent | G5, G6 implemented; computed-style gate specified with allowed-delta map (§2.3); copy gate by code-point compare |
| Full longhand equality impossible | Allowed-delta map keyed by `data-qa × state × property` (§2.3) |
| Per-instance tier not closed; `--off` inline vs media query | Closed 4-property allowlist; **`--off-instance` indirection** (§2.1) |
| `minmax(0,1fr)` insufficient | Replaced with explicit `1fr` + `min-width:0` (§4) |
| Missed nested `30px 1fr`; children need `min-width:0` | Both added (§4) |
| "Inside every sheet" not executable | G3 opens each sheet via its real control and measures descendants (§6) |
| Keyed mutation hand-wavy | Key schema + build-time VI/EN structural-parity check; scope narrowed (§2.4) |
| Contrast inventory incomplete | D1c covers **all** section-colour text; G6 verifies; **0 failures** |
| Deviations conflict with pixel gates | **Adjusted oracle** + `DEVIATIONS.md` + measured geometry deltas (§1) |
| NFC/NFD unresolved | Verified missing U+0302/0306/031B; **normalise to NFC** + coverage assertion (§6) |
| Query-string cache busting unsafe | **Content-hashed filenames** (§6) |
| Parity samples stop at 1024 | **901 added**, VI and EN (§3) |
| Video precedence ambiguous | Stated exactly: blob → `src` → persisted link (§5) |
| *NB* preload underspecified | Explicit face manifest + assertion each preload is consumed |
| *NB* independent Claude review blocked | Noted; Codex remains the review channel |

## 8. Team

PM/Delivery · UX Research · Design Systems · Frontend Structure · Frontend Behaviour ·
Content VI+EN · Accessibility · Performance · QA · SEO/Meta · Codex (adversarial gate).

## 9. Out of scope

Dark mode, contact form, custom cursor, Grid renderer, new copy, CV edits, new photography,
analytics, `hreflang`/multi-URL i18n (both languages share one URL; static metadata is VI).
