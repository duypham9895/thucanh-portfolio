# Deviations from the v3 design

Every deliberate difference between `docs/design/v3-source/` (the frozen Claude Design project) and
what the site ships. Anything not listed here is a bug, not a decision.

Each entry says what changed, why, and — where it is a number — what was measured before and after.
Colour changes were derived by `tools/build/derive-contrast.mjs`, which computes them from this
design's own values rather than copying the previous port's.

---

## D1 — WCAG AA contrast

The design uses each section colour for three different jobs, and they fail differently. The rule:
**only lightness moves, in oklab; hue and chroma are held**, so every colour still reads as the
colour the design chose.

### D1a — surfaces that carry white text

The folder tab, folder body and contact card are solid fills with `#fff` on them. White cannot be
darkened, so the surface moves.

| | design | shipped | white-on-it |
|---|---|---|---|
| `about` folder + contact card | `#CB7885` | `#AE5E6C` | 3.20 → **4.55** |

The other five white-text surfaces (`cv` `#893941`, `work` `#5E6623`) already cleared AA and are
untouched.

### D1b — section colour used as text

Section kickers, the italic half of each section title, stat numbers and list indices. Stored as
`tc` alongside `c` in `config.json`, so the surface keeps the design value and only the text role
changes. `--pink-ink` is the same split applied to the page accent.

| | design | as text | before | after |
|---|---|---|---|---|
| `education` | `#D4D994` | `#6F7230` | **1.33** | 4.55 |
| `xfile` | `#C6C3B8` | `#6F6D63` | 1.53 | 4.51 |
| `awards` | `#E7A6B0` | `#995E69` | 1.79 | 4.51 |
| `extra` | `#D0A583` | `#8D6646` | 1.97 | 4.50 |
| `about` | `#AE5E6C` | `#9E4F5E` | 3.65 | 4.52 |
| `--pink-ink` | `#CB7885` | `#9B4D5B` | 2.49 | 4.53 |

`cv` (5.98) and `work` (5.35) already cleared AA and are unchanged.

Citron at **1.33:1** was the worst: a section heading effectively invisible against its own
background.

### D1c — body text against the darkest tint

`--soft` `#7B7869` → `#686657`. Every section paints a tinted background
(`color-mix(in oklab, C(id) N%, #FBFAF6)`), and the darkest of them — `cv` at 13% of `#893941` — is
the binding constraint, not the page `--bg`. Measuring against `--bg` alone left body copy at
**3.91:1** inside the About section. 3.45 → **4.50** against the darkest tint.

### D1d — opacity and inherited colour

- `.fnote` / `.fgo` dropped their `opacity:.85` / `.75`. Opacity composites text toward the surface
  underneath and pulled both under AA.
- `.card .eyebrow` was `rgba(255,255,255,.86)` — 3.82:1 on the card. Now solid `#fff`.
- `.xdrivebtn` carries `class="eyebrow"`, and `.eyebrow` sets `color:var(--soft)`, which overrode
  the Drive panel's own readable colour and landed at 3.28:1. It now inherits the panel colour.

**Result: zero AA failures**, VI and EN, measured with alpha- and opacity-composited backgrounds.

---

## D2 — the English folder tab shows its label

The design hides it: `style={D.lang==='EN' ? {visibility:'hidden', width:126} : null}`
(`portfolio-v3-app.jsx`, `Opening`). That leaves seven blank tabs on the English page, which reads
as broken rather than as a design choice. The label is shown in both languages.

---

## D3 — not needed in this design

The previous port replaced brand logos with styled `<span>`s because `brands/*.png` 404'd even
inside the artifact. **In this project the files exist**, so both `BRANDLOGO` (the brand wall) and
`CLOGO` (per campaign) render real images. No deviation.

---

## D4 — inline layout lifted to CSS classes

**A media query cannot override an inline style.** React writes every grid as an inline style, so
on a phone each one stays frozen at its desktop track list — which is how the previous design
shipped a 208px horizontal overflow at 375px.

Each inline grid is now a class with the design's own values at desktop width; only its
*reachability* from a media query changes. Every `repeat(auto-fit, minmax(Npx, 1fr))` keeps the
design's N but wraps it as `min(N, 100%)`: auto-fit does **not** collapse a track whose minimum
exceeds the container, so at 320px a bare `minmax(300px,1fr)` overflows by 24px while still
reporting one column.

The folder stagger is written inline as `--off-instance` and consumed through
`.folder{--off:var(--off-instance,0px)}`, because a media query cannot override an inline **custom
property** either.

**Result: 0px horizontal overflow** at 320 / 375 / 390 / 768 / 900, on the page and inside all six
campaign sheets.

---

## D5 — real controls instead of clickable `<div>`s

`.folder`, `.crow` and `.ccard` are clickable `<div>`s in the design, so no keyboard can reach the
folders or open a campaign. They are `<button>`s here, with the UA button styling restated
(`display`, `width`, `text-align`, `font`, `color`, `background`, `border`) so layout is unchanged.

The campaign sheet gains `role="dialog"`, `aria-modal`, a focus trap, focus restore to the row that
opened it, background `inert`, and scrollbar-gutter compensation. Escape inside the sheet stops
propagating so it closes the sheet and nothing else.

**Result: 35 keyboard-reachable controls, 0 clickable-but-unfocusable elements.**

---

## D6 — `prefers-reduced-motion` forces content visible

`.reveal` starts at `opacity:0`. Disabling only the transition would leave every block permanently
invisible, so the rule forces `opacity:1 !important`. Verified: 0 hidden blocks under reduced motion.

---

## D7 — empty media renders nothing

A slot with no source renders nothing at all, and a section whose slots are all empty hides itself.
The design renders a labelled grey placeholder, which reads to a visitor as "unfinished" — the most
expensive impression a portfolio can make. Of six `VIDEOS` entries only one has a source, so the
video strip shows that one clip rather than one clip and five grey boxes.

---

## D8 — video aspect ratio is honoured

`VIDEOS[0]` is a vertical TikTok cut (`r: "9/16"`). The design's grid renders every clip in a
`minmax(230px,1fr)` track, letterboxing a phone-shaped video into a black slab. Each clip uses its
recorded ratio, and a lone clip is capped at 320px rather than stretched across the row.

---

## D9 — print

No `@media print` exists in the design, and with `.reveal` at `opacity:0` **every** content block
prints blank. A recruiter may well print this. The print tier forces reveals visible, drops the
fixed nav, language toggle, hover peek and sheet, and appends `href` after external links.
Verified: 0 blocks print blank.

---

## D10 — two documents, real hreflang, English at the root

The design switches language in place at one URL. A crawler will not operate a toggle, so neither
language had a shareable identity of its own.

**English is the primary language and is served at `/`; Vietnamese is at `/vi/`.** Each is a real
document with its own `<title>`, description, Open Graph, `og:locale` and canonical, and both carry
a reciprocal `hreflang` pair. `x-default` points at the English root.

The language buttons navigate between the two URLs instead of mutating text, so a forwarded link
opens in the language it was sent in. Initial language comes from the shell's `<html lang>` — **not**
from `localStorage`, so a visitor who once opened `/vi/` is not pinned to Vietnamese at the root.

`index.js` derives its base URL from its own `<script src>`, so one code path serves both documents
from either depth.

Her name keeps its diacritics on both documents — "Trần Tôn Nữ Thục Anh" — where the design's `P_EN`
had stripped them. The JSON-LD `alternateName` carries the unaccented form, which is the field that
exists for exactly that: an ATS searching "Tran Ton Nu" still matches.

---

## D11 — self-hosted fonts, no CDN

The design loads three families from `fonts.googleapis.com`. All are self-hosted as content-hashed
woff2 subsets; the shipped site makes **zero** third-party requests.

Cormorant Garamond is a **variable** font — Google serves one file per subset per style and pins the
axis with the `font-weight` descriptor — so the design's new 400 and 500 weights needed no new files.
Be Vietnam Pro 200 and 500 are requested by the design and referenced by nothing; they are not
shipped. The preload set is seven faces (110 KB), up from five: Be Vietnam Pro 400 paints the hero's
first line and the primary CTA.

---

## D12 — images

18 design images re-encoded to WebP: **16.1 MB → 1.35 MB (−91.6%)**. Every aspect ratio recorded in
`config.json` is preserved as an exact integer fraction. Brand logos are near-lossless with
transparency intact, capped at 2× their fixed render heights.

`images/portrait-og.jpg` (1200×630, JPEG) is added for `og:image`: social scrapers are not evergreen
browsers and WebP handling is unreliable across them.

Known limit: `matrix-shopee-store` is 624×1006 at source and renders in a 582 CSS-px column, so it
is only 1.07× — it will look soft on a Retina display. That needs a larger capture, not a better
encoder.

---

## Not ported

- **The tweaks panel** — Claude Design's in-canvas edit tooling. Its `TWEAK_DEFAULTS` become fixed
  config (`meta.fixed`).
- **The Grid campaign layout** — `TWEAK_DEFAULTS` selects `Danh sách` (List); Grid is unreachable.
- **`image-slot.js`** — a 65 KB upload/placeholder custom element for editing inside the canvas.
  Slots are config-driven paths here.
- **Video upload, drag-and-drop and IndexedDB persistence** — visitor-side editing of a portfolio's
  own media has no meaning once published.
- **The certificate gallery** (`.certstage` / `.cert` / `.certcap`). The CSS is in the design but no
  certificate images were supplied, and D7 says an empty gallery renders nothing. Add the images and
  the section can ship.

---

## D13 — proof above the fold

The design's section order puts About first and the campaigns fourth, and the owner chose to keep
it. The reader-flow research this repo already paid for (`docs/research/reader-flow.md`) measures
74% of viewing time inside the first two screenfuls and a 7.4-second first-screen scan, which would
leave the evidence starting around screen four.

Rather than reorder the design, the hero gains a proof strip: the four stat figures and the brand
list, set quietly under a rule. Measured at 1440×900 it ends at 790px — inside the first screen —
and it moves no section.

## D14 — a permanent Download CV in the nav

The design places CV links in the About card, the experience section head and the contact block;
the fixed nav carries only the name and the language toggle. The CV is the action the page exists
to produce, so one lives in the nav permanently.

The bar now holds three things and had to survive a phone: nothing may wrap. Below 620px the nav
drops her family names and keeps "Thục Anh"; the button keeps its full label, because that label
is the whole point of the button.

## D15 — "Results" only where there are results

Each campaign sheet ends with a three-figure block set at 38–64px. In five of six campaigns that
block holds dates, roles and formats — `04/2026 · thời điểm tổ chức`, `Concept · vai trò ý tưởng` —
which are scope, not results. Labelling them "Results" promises what the block does not deliver, in
the largest type on the page.

Campaigns carry an `outcomes` flag. Only `ppd` has real outcomes (a People Prize and a produced
count) and keeps the "Results" heading; the other five are headed "Scope & role" / "Phạm vi & vai
trò". The figures themselves are untouched.

## D16 — one CV, in English

`meta.cv` is a single path. Both documents serve the same PDF, and it is in English.

An earlier revision of this file claimed the opposite — that `meta.cv` was language-keyed and an
English CV was owed. Both PDFs supplied turned out to be English; the one that looked Vietnamese
by filename never was. The owner's decision is one CV in English, so the language-keyed shape and
the `cvPending` marker were removed rather than left as machinery nothing uses.

`cvPath()` in index.js still accepts an object keyed by language, so splitting it later is a
config change with no code change.

## D17 — the newsletter's headline images are not published

The campaign's two June pages carried the classification marking "- Internal use", the internal
source "EMT TRACKER", and competitor livestream cadence and promotion depth per brand. They are
removed from the site, from the frozen snapshot, and from this branch's git history — the repo is
public and the branch had not yet been pushed.

The four archive thumbnails remain. They are deliberately low-resolution overviews whose text is
illegible, which is what the campaign copy already promises: "Recent issues are shown as overviews
only, since the content is internal."

The campaign therefore leads with no image. The work is described in the text and the archive
shows the cadence without showing the contents.

## D18 — the folder stack fits the screen

Each tile printed its own label twice: a 16.5px label on the tab and a 26px title 30px below it in
the body, both rendering `F.<id>.t`. The accessible name read "About meAbout meContact · Skills ·
CV Open →".

The repeat is deleted and the note takes its place, so the body now carries the only thing on the
tile that is not already on its tab — "UEF · GPA 3.7", "6 selected campaigns", "L'Oréal · Estée
Lauder · Baresoul". Tile 130px → 100px, pitch 114 → 84, stack **814px → 604px**.

Measured, all seven tiles fully visible: 1440×800 was 6/7 and is now 7/7; 1366×768 and 1280×720
were 5–6/7 and are now 7/7. Below 780px tall the hero's own padding tightens so the index still
clears the fold; nothing else moves.

The stagger, tab, paperclip, overlap and hover lift are untouched. On mobile the note is now
shown rather than hidden — the tile had no room for it before and was left repeating one word.

### D18b — mobile runway

At 390×844 the stack began at y=845, one pixel past the fold, so the cue "Pick a folder to open →"
pointed at an index nobody could see. The stack was never the problem: the hero above it ran 1.96
screenfuls. Below 620px the two hero pills are dropped (both strings repeat verbatim in About and
in the contact grid), the proof strip tightens, and the hero padding shrinks. The stack now starts
at y=691 and two tiles reach the first screen, with the proof strip still above the fold.

Rejected: collapse-by-default with expand-on-hover. Hover does not exist on touch and fails
differently on iOS and Android; the tile's note is already the excerpt such a panel would show,
and it is permanent, copyable and printable instead of transient.
