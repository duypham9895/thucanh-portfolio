# Project Memory

Last reviewed: 2026-09-09.

## Purpose

Static personal portfolio for Trần Tôn Nữ Thục Anh, Project Marketing Executive (L'Oréal Vietnam —
Kérastase & L'Oréal Professionnel). Positioning: 3+ years in online marketing and e-commerce across
beauty — product launches, marketplace storefronts, livestream commerce, KOL/KOC and merchandise.
**It is her actual CV, live, used for real job applications.** Treat a broken deploy accordingly.

**English is the primary language and lives at the root; Vietnamese is at `/vi/`.** Each is a
real document with its own metadata and a reciprocal hreflang pair; `x-default` points at English. Tone is editorial and understated, not
salesy. Keep Vietnamese accents exact and keep both languages in sync.

## Stack

- Static HTML + CSS + vanilla JS. **No framework, no build step, no `package.json` at the root.**
- Content loads at runtime from `config.json` via `fetch`.
- **Self-hosted fonts** in `fonts/` — 10 woff2 files, content-hashed. No Google Fonts request.
  Cormorant Garamond (display, **variable** — one file covers 300/400/500), Be Vietnam Pro (sans),
  Italianno (script). No CDN dependencies at all.
- PWA metadata in `manifest.json`; GitHub Pages custom domain in `CNAME` (`thucanhtrantonnu.com`).
- Pages runs the **legacy Jekyll** builder, so `.nojekyll` must stay committed or any
  underscore-prefixed directory is silently dropped in production while working fine on localhost.

## Design provenance — read this before changing anything visual

The design is a port of **Claude Design project `b8e2e5a4-1ed4-444a-81a6-089830b12b02`**, file
`Portfolio v3.html`. This is a different source from the previous port (artifact
`54559e05-…`) and shares no version lineage with it.

The snapshot is frozen and hash-pinned in **`docs/design/v3-source/`** (27 files,
`BASELINE.sha256`, regenerate with `tools/build/gen-baseline.sh`):

| Path | What |
|---|---|
| `template.html` | the design contract: full CSS + shell |
| `modules/*.jsx` | every original component and all VI/EN content |
| `assets/`, `brands/` | the 18 referenced images, pre-optimization |
| `PROVENANCE.md` | where it came from, and why it is frozen rather than fetched |
| `DEVIATIONS.md` | **every deliberate difference between the design and the site** |

**Claude Design content is mutable and cannot be version-pinned** — the iframe origin's token
rotates and `?__frame_v=…` is ignored. The local freeze is the authority. **Nothing re-fetches
upstream.**

`index.css` opens with the design system copied verbatim, except the D1 contrast tokens.
**Do not restyle by taste** — change `DEVIATIONS.md` deliberately, or change nothing.

Deviations are D1–D12 plus a "not ported" list. Do not restate them here; `DEVIATIONS.md` is the
single source and the previous port's docs drifted out of sync precisely because they restated.

## Important files

- `index.html` — **English** shell (the primary document): nav, language toggle, `#app`, `#sheet-host`, `#toast-host`,
  `#fallback`, noscript block, font preloads, JSON-LD.
- `vi/index.html` — the English document. Same shell, EN metadata, `../` asset prefix.
  **Both shells must reference the same hashed generation**; `release.mjs --check` enforces it.
- `index.css` — `@font-face` → verbatim design system → lifted component classes → responsive tier.
- `index.js` — renderer, i18n, folder nav, reveal observer, campaign sheet, toast, hover peek.
  Derives its base URL from its own `<script src>` so one file serves both documents.
- `config.json` — `{ meta, vi, en }`. VI and EN are structurally identical; keep them that way.

### Regenerating the social card

`images/portrait-og.jpg` is the 1200×630 image every link preview shows. It is a RASTER of her
name set in the site's own fonts, so it cannot tell you when it has gone stale — and it did:
it was rendered by hand while the subsetted fonts were still missing the uppercase Vietnamese
glyphs, so `Ầ Ữ Ụ Ô` fell back to a system serif and her name shipped half in the wrong face.

```bash
node tools/build/make-og-card.mjs            # regenerate
node tools/build/make-og-card.mjs --check    # re-render and compare, exits 1 if stale
```

Three guards, because one was not enough:
- The generator **asserts via CDP** that every glyph came from the intended family, and refuses to
  write the file otherwise. Verified to bite: a codepoint outside the subset produces
  `1 glyph(s) rendered in "蘋方-簡"` and exit 1 with the image untouched.
- It writes `images/portrait-og.inputs`, a fingerprint of the name, role, niche, brands and the
  exact font filenames it drew with.
- **`release.mjs --check` compares that fingerprint** and fails if anything it depends on changed.
  Cheap — no browser. Verified to bite on a renamed brand.

Re-run it after any change to her name, role, niche, the first five brands, or the fonts.

### Regenerating config.json

`config.json` is **generated**, not hand-edited at first creation:

```bash
node tools/build/extract-config.mjs   # executes the frozen data modules, asserts VI/EN parity
node tools/build/derive-contrast.mjs  # measures contrast, writes folder `tc` variants
```

`extract-config.mjs` runs the design's own data modules in a `vm` with a bare `window` shim, so the
content is exact by construction rather than transcribed. It fails loudly if VI and EN diverge
structurally. **Re-running it discards hand edits to content** — for ongoing copy changes, edit
`config.json` directly and keep both languages in step.

### Four properties stay inline (everything else is a class)

`background` (folder surfaces and section tints), `aspect-ratio` (slots), `--off-instance` (folder
stagger), and per-section text colour. `--off` is derived:
`.folder{--off:var(--off-instance,0px)}` — **a media query cannot override an inline custom
property**, hence the indirection. The same applies to inline layout: that is deviation D4, and it
is the single most expensive lesson in this repo.

## Content model

Edit `config.json`, not the markup. Both languages must change together.

- `meta` — folders (id, label, `c` surface, `tc` text, `t` on-surface text, `off` stagger),
  `fixed` (the design's frozen tweak defaults), cv path, brand and campaign logo maps, portrait,
  `sectionOrder`.
- `vi` / `en` — `P` (profile, bio, stats, brands, skills, edu, awards, cv), `CAMPAIGNS` (6),
  `EXTRA`, `VIDEOS`, `XFILE`, `F` (folder text), `T` (50 UI strings).

**All strings must be NFC.** NFD Vietnamese decomposes to `U+0302`, `U+0306`, `U+031B`, none of
which is in any font subset's `unicode-range` — NFD text silently falls back to a system font.
`extract-config.mjs` normalises on the way out.

Image slots are config-driven. An unset slot renders **nothing**, and a section whose slots are all
empty hides entirely (D7).

## Run and verify

```bash
python3 -m http.server 8900          # config.json is fetched, so serve over HTTP
```

Then in `tools/visual-qa/` (dev-only; never shipped):

```bash
node smoke-v3.mjs                    # both documents: sections, counts, overflow, console, requests
node a11y-v3.mjs [url]               # contrast (alpha+opacity composited), keyboard, modal, print
node perf-v3.mjs                     # throttled desktop and mobile timings
node sections-v3.mjs                 # per-section screenshots into out/v3/
node shots-v3.mjs                    # full-page + every campaign sheet at 390
```

**smoke-v3 and a11y-v3 exit non-zero on failure**, so they can gate a deploy. They did not until
the pre-deploy review pointed out that a check which cannot fail cannot gate anything.

The previous design's harness — `gates.mjs`, `make-adjusted-oracle.mjs`, `functional.mjs`,
`verify-deployed.mjs`, `prove.mjs`, `measure.mjs`, `shoot.mjs`, `diff.mjs` — and its pinned oracle
at `docs/design/artifact-source/` are **deleted**. They diffed against the 54559e05 design and
reported 8 of 9 gates failing against v3, which is worse than having no gates: it trains everyone
to ignore a red suite. Git history has them if the old port ever needs re-examining.

`browser.mjs` resolves the browser binary in one place. The old harness hardcoded an Intel-shaped
path (`chrome-mac/headless_shell`); on Apple Silicon the same revision unpacks to
`chrome-headless-shell-mac-arm64/chrome-headless-shell`, so every gate failed with ENOENT. Order is
`$QA_CHROME` → pinned r1228 (either layout) → playwright-core's default, and the choice is printed.

**Two lessons about the tests themselves**, both of which produced confident false failures here:

- `getComputedStyle` returns `oklab(...)` for a `color-mix()`. A regex that assumes `rgb()` reads
  those coordinates as RGB channels, and canvas `fillStyle` silently *rejects* the value and keeps
  its previous one. Either way every tinted section reads as black — 188 invented failures.
  `a11y-v3.mjs` converts oklab explicitly.
- `.reveal` transitions opacity over 0.9s. Adding `.in` and measuring 400ms later reads part-faded
  text. Kill the transition before measuring; do not race it.

Also: `python3 -m json.tool config.json` and `manifest.json`.

## Releasing

```bash
node tools/release.mjs           # write content-hashed index.<h>.css/js + config.<h>.json
node tools/release.mjs --check   # fail unless the deployed set is mutually consistent
```

Both shells are rewritten and both are verified, including a cross-check that they name the **same**
generation — a shell left behind is exactly what content hashing exists to prevent, and it would not
404, it would silently serve English visitors different code. Verified to exit 1 on a stale shell.

Three generations are retained (`release-manifest.json`). **`RETAIN` is 3, so three releases evict
the currently-live generation** — iterate on a scratch copy, or produce one release commit per ship.

## Working notes

- The user prefers direct execution when scope is clear; give a short plan or delta, then do it.
- Substantive changes go through the review loop in `~/.claude/skills/codex-review-loop`. Codex via
  `crossagent` works but **needs an explicit model pin**: `--model gpt-5.6-terra`. The global rule
  banning it is stale; the failure was `~/.codex/config.toml` pinning a model the CLI rejects.
- Stage only intentional source files; ignore unrelated local tool artifacts.
- `docs/` and `tools/` are served publicly on the CV domain. `robots.txt` disallows both, but do not
  put anything there that would embarrass her if a recruiter opened it.
