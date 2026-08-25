# Trần Tôn Nữ Thục Anh — Portfolio

Vietnamese-first (EN toggle) portfolio for a Project Marketing Executive working in beauty
e-commerce. Static site, no framework, no build step. Live at
**[thucanhtrantonnu.com](https://thucanhtrantonnu.com)**.

## Run it

`config.json` is fetched at runtime, so open it over HTTP rather than from the filesystem:

```bash
python3 -m http.server 8900
# → http://localhost:8900
```

## What's here

```
index.html      shell: nav, language toggle, mount points, font preloads, noscript fallback
index.css       @font-face → verbatim design system → component classes → responsive tier
index.js        renderer, i18n, folder nav, reveal observer, campaign sheet, toast
config.json     all content, { meta, vi, en } — the single source of truth
fonts/          21 self-hosted woff2 subsets (content-hashed). No Google Fonts request.
docs/design/    the recovered design source + pixel oracles (see below)
tools/          dev-only QA harness + release tool — never shipped to the browser
```

## Design provenance

The design is a port of a Claude Design artifact. The artifact was **recovered byte-exact** — its
bundled HTML and assets were decoded rather than eyeballed from screenshots — and the recovered
source lives in `docs/design/artifact-source/`, hash-pinned in `BASELINE.sha256` (52 files).

Two oracles sit alongside it:

- **pristine** (`oracle-{vi,en}.html`) — the artifact exactly as designed, zero JavaScript
- **adjusted** (`adjusted-{vi,en}.html`) — pristine plus the approved deviations

The site is diffed against the *adjusted* oracle at full strictness. Every allowed difference is
listed in `reference/DEVIATIONS.md`, so nothing is waved through with a tolerance band.

`index.css` opens with the design system copied verbatim. **Don't restyle by taste** — change the
oracle deliberately, or not at all.

### Deliberate departures from the artifact

- **Accessibility.** The artifact's palette failed WCAG AA badly in places — citron section text
  measured **1.42:1**. Section colours keep their artifact value as *surfaces* but use a darkened
  variant as *text*; body text and the pink token were nudged; folder caption opacity was removed.
  Result: **zero AA failures**.
- **Mobile.** The artifact overflows **208px at 375px**, because its layout grids are inline React
  styles that a media query cannot reach. Those became CSS classes, and a real responsive tier was
  written. Result: **0px overflow** at 320/375/390/768, including inside every campaign sheet.
- **Weight and speed.** The artifact shipped React + Babel (~4.3 MB) compiling JSX in the browser.
  This is vanilla JS. Measured, throttled:

  | | Desktop (cable) | Mobile (4G, 4x CPU) |
  |---|---|---|
  | FCP | 64 ms | 1160 ms |
  | LCP | 136 ms | 1496 ms |
  | CLS | **0** | 0.0004 |

  First-load transfer as GitHub Pages serves it (text gzipped): **28 KB** text +
  **91 KB** preloaded fonts + **230 KB** portrait (below the fold, lazy) = **349 KB** desktop,
  **119 KB** to first paint on mobile. 15 requests.
- Brand logos use the design's own styled text treatment (`brands/*.png` 404 even in the artifact);
  LinkedIn / Facebook / Drive links were kept, which the artifact drops.
- **Reader flow and section order.** Driven by measurement plus published eyetracking research,
  not taste — the full evidence and citations are in
  [`docs/research/reader-flow.md`](docs/research/reader-flow.md). In short: NN/G found **74% of
  viewing time falls in the first two screenfuls**, yet the campaigns — the strongest asset — began
  at screen **4.6**. Ladders found recruiters give a first screen **7.4 seconds** and scan
  *current title → previous role → dates → education*. Portfolio guidance is consistent that About
  is *"where people go after they already like your work"*.
  So the order is now **campaigns → experience → about → education → awards → extracurricular →
  contact**, proof and a permanent Download CV live in the first screen, empty media renders
  nothing, and the hero no longer forms a false floor at the fold.

### What the visitor sees now

| | Before | After |
|---|---|---|
| Download CV | 2.1 screens down | **always visible** in the nav |
| Proof numbers | 2.0 screens | **0.6** — first screen |
| Brands worked with | 2.4 screens | **0.75** — first screen |
| Empty media frames | 6 | **0** |
| Page length, desktop | 9.7 screens | **8.2** |
| Page length, mobile | 16.5 screens | **13.1** |

## Editing content

Edit `config.json`, not the markup — and change both languages together. VI and EN are
structurally identical and a parity check enforces it.

**All strings must be NFC.** Decomposed (NFD) Vietnamese needs `U+0302`, `U+0306`, `U+031B`, none
of which is in any font subset's `unicode-range`; NFD text silently falls back to a system font.

Image slots are config-driven. An unset slot **renders nothing at all**, and a section whose slots
are all empty hides itself — a labelled empty frame reads as "unfinished" to a visitor, which is the
most expensive impression a portfolio can make. Add a path and the slot (and its section) reappears
with no code change. A slot accepts an image path, a local video file, or a YouTube / Vimeo / Drive /
Facebook URL.

## QA

```bash
cd tools/visual-qa && npm install
node gates.mjs      http://localhost:8900/   # G1–G7 × VI+EN, exits non-zero on failure
node functional.mjs http://localhost:8900/   # behaviour + accessibility
```

**Gates (G1–G9):** baseline hashes · geometry vs oracle (heights *and* order) · horizontal overflow
(page *and* all 5 campaign sheets) · masked pixel diff with connected-component limits · design
tokens · contrast, alpha- and opacity-composited · failed requests · reader flow (CV persistent and
visible, proof in the first screen, zero empty frames — checked at 1440 **and** 390) · **browser-truth
release verification**.

The last one matters most: `tools/visual-qa/verify-deployed.mjs` loads the page in a real browser and observes
what the engine *actually* applied, executed and fetched, rather than parsing the HTML. A static
parser cannot be made spoof-proof, and no text analysis can determine which value reaches
`fetch()`. `tools/visual-qa/README.md` documents the determinism pins and the full negative-test
matrix.

## Releasing

```bash
node tools/release.mjs           # write content-hashed index.<h>.css/js + config.<h>.json
node tools/release.mjs --check   # fail unless the deployed set is mutually consistent
```

`index.html` names only hashed files, and the hashed JS has its config's hashed name compiled in.
A filename either exists with exactly the bytes its hash describes, or not at all — so a browser
cannot assemble a page from two generations.

Three generations are retained (`release-manifest.json`) so a visitor holding an older `index.html`
still gets its assets rather than a 404. **Run `--check` before committing** — it fails on an
edited-but-unreleased source, a non-hashed reference, or an orphaned asset.

## Browser support

Modern evergreen browsers. Requires CSS custom properties, `aspect-ratio`, `color-mix()`,
`IntersectionObserver`, and `fetch`. Without JavaScript, the `noscript` block still shows name,
role and contact details.
