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

**Result: 49 keyboard-reachable controls, 0 clickable-but-unfocusable elements.**

That number is a measurement, not a target, and it had already drifted before anyone
re-read it: 35 was the port-day figure, and the nav's permanent Download CV (D14), the
LinkedIn link and the back-to-index link landed after it without a re-measure. The figure
immediately before the video strip grew was **39**, identical on both documents; the strip
replaced one `<iframe>` with seven facade buttons (+6) and the social marks traded two text links
for six (+4), so the figure is 49. `a11y-v3.mjs` PRINTS
this count and does not assert it — re-measure it rather than reasoning about it:

```bash
node tools/visual-qa/a11y-v3.mjs | grep KEYBOARD
```

---

## D6 — `prefers-reduced-motion` forces content visible

`.reveal` starts at `opacity:0`. Disabling only the transition would leave every block permanently
invisible, so the rule forces `opacity:1 !important`. Verified: 0 hidden blocks under reduced motion.

---

## D7 — empty media renders nothing

A slot with no source renders nothing at all, and a section whose slots are all empty hides itself.
The design renders a labelled grey placeholder, which reads to a visitor as "unfinished" — the most
expensive impression a portfolio can make.

The rule has not changed; what it now hides has. All seven `VIDEOS` entries carry a source, so the
strip renders seven clips and no placeholders — the five src-less photo/video placeholders that used
to sit in the array are gone, because an entry that renders nothing and describes media nobody
intends to supply is drift, not a plan.

The guard stays load-bearing: it is what lets a clip be withdrawn — an unlisted video made private,
a cut replaced — by deleting its entry in both languages, without leaving a grey box behind, and
`videos()` still returns `null` if every source goes away. Note what that implies: withdrawing a
clip is a `config.json` edit plus a release, **not** something the page detects at runtime. A `src`
that still exists but no longer plays degrades to a facade that opens a dead embed, and nothing in
the browser can tell.

---

## D8 — video aspect ratio is honoured

Every `VIDEOS` entry is a vertical cut (`r: "9/16"`). The design's grid renders every clip in a
`minmax(230px,1fr)` track, letterboxing a phone-shaped video into a black slab. Each clip uses its
recorded ratio, and a lone clip is capped at 320px rather than stretched across the row.

That cap — `.vidgrid.single`, and the `grid.children.length === 1` branch that applies it — no longer
fires on the shipped site, because seven cells survive. Both are kept rather than deleted: they are
the guard for the state D7 describes, where clips have been withdrawn until one is left. Dormant,
deliberately, not dead. The track list they override is now D20's.

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
woff2 subsets — and so are the video posters. The shipped site makes **zero** third-party requests
until a visitor presses play on a clip: nothing is fetched from YouTube to RENDER the strip, only to
PLAY it. See D20. The posters were captured once and re-encoded locally; hot-linking them from
`i.ytimg.com` would have moved this claim from "zero" to seven on every page view, plus two
more each time a campaign sheet is opened.

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

`images/video-posters/` is a later, separate set: 25 WebP stills (**789 KB**) for the nine clips the
site embeds, written by `tools/build/make-video-posters.mjs` rather than re-encoded from the design.
The 16.1 MB → 1.35 MB figure above is a statement about the 18 DESIGN images and is unaffected. A
visitor downloads one rung per clip, not the set: **218 KB at DPR 2, 121 KB at DPR 1** for the
seven-clip strip. The ratios are exact integer fractions here too — the 9/16 rungs are 360×640,
576×1024 and 864×1536.

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

## D19 — the social card is generated, asserted and fingerprinted

`og:image` is a 1200×630 card rather than a crop of the portrait: a 3:4 full-body shot declared
as landscape drops LinkedIn out of its large-card layout, and the face is a few dozen pixels wide
at that size.

It shipped broken once. The card was rendered by hand from a throwaway file while the font subset
was still missing the uppercase Vietnamese glyphs that `text-transform` generates, so `Ầ Ữ Ụ Ô`
came from a system serif at a visibly heavier weight. Fixing the fonts could not fix the card,
because a raster is frozen at the moment it is taken and nothing regenerated it.

`tools/build/make-og-card.mjs` now owns it: it reads the strings from `config.json`, draws with
the shipped font files, asserts through CDP that no glyph fell back, and records a fingerprint of
its inputs that `release.mjs --check` verifies. All three guards are tested to fail.

## D20 — the video strip: a declared column ladder, and click-to-play

The design's strip is one `repeat(auto-fit, minmax(230px, 1fr))` track list holding six entries, of
which one had a source. The owner supplied six more clips, all 9:16 vertical, and at seven clips
both halves of that arrangement fail.

### The grid

`auto-fit` cannot express the ladder a pure-vertical set needs. Reaching two columns at 320px
(content 276) requires a track minimum of ≤127px, and a 127px minimum overshoots to **four** columns
at 620px. A minimum that is right at the bottom of the phone tier is wrong at the top of it. The
230px floor was authored for a mixed 4:3 / 9:16 strip showing one clip; it does not survive seven
verticals, and under it the strip collapses to a single column below 526px.

Declared counts instead — 4, then 3 at ≤900, then 2 at ≤620 — on the repo's existing breakpoints,
adding none. Tracks are `minmax(0,1fr)` rather than `minmax(min(N,100%),1fr)`: a 0 minimum can
always shrink, so there is no width at which a declared track can overflow its container (D4).

Measured, seven clips, section height including heading and padding:

| viewport | columns | cell | before (old rule, 7 clips) | after |
|---|---|---|---|---|
| 320 | 2 | 131 × 233 | ~3,830px | **1,305px** |
| 390 | 2 | 166 × 295 | ~4,440px | **1,510px** |
| 768 | 3 | 227 × 403 | ~2,710px | **1,479px** |
| 1024 | 4 | 217 × 385 | ~1,740px | **1,008px** |
| 1440 | 4 | 281 × 499 | ~1,095px | **1,235px** |

Seven is prime, so every column count but seven leaves a ragged last row. Four fills it best (75%)
and uses the fewest rows; seven across would put a 151px cell on a 1440 desktop, at which the clips'
burned-in overlay text is unreadable. **The ragged row is left ragged** — not centred, not spanned.
Tracks are `1fr`, so a short last row keeps its cell width against the same left edge as the rows
above, which reads as a reel that ended. A centred orphan reads as a mistake someone tried to cover,
and spanning a cell to fill the row would render it at a ratio other than 9/16, which D8 forbids.

Column-gap drops 22px → 14px at ≤400 and row-gap does not: column-gap trades directly against poster
width (every 2px costs 1px off each of two cells) and row-gap trades against nothing. At 320 the
cell goes 127 → 131.

Captions reserve two lines at every width (`.vidcap`, `min-height:2.9em`) — one line on a desktop
cell, two on a phone cell. An unreserved box leaves a row's captions ragged under frames that are
not.

Holding that to two lines at the narrow end took one more declaration. `.eyebrow` tracks at `.2em`,
roughly 2px per character, which at a 131px cell is most of a word: measured, three English captions
and one Vietnamese caption took a **third** line at 320–341px. `.vidcap` drops to `.13em` below
400px, and every caption in both languages then fits the two reserved lines down to 320px. Tighter
tracking rather than a third reserved line, because the third line is only ever used below ~342px
while reserving it would have cost 14.5px of dead space at 360, 375, 390 and 393 — which is where
the phones actually are. `videos-v3.mjs` asserts the two-line ceiling at every tier, so the claim
in the sentence above is now a gate rather than a hope.

### Click-to-play

One clip was cheap to embed live. Seven are not: each YouTube embed is roughly 0.6–1.2 MB of player,
and `loading="lazy"` only defers that until the strip is scrolled to — at which point all seven
arrive together. `video()` now builds a facade: a self-hosted WebP still, a play disc and a duration
chip inside a real `<button>` (D5), and the iframe is built in place on activation.

- **Measured**, loading the shipped page and letting the strip paint: **121 KB** of posters at
  DPR 1, and **0 bytes / 0 requests** to any third party. At DPR 2 the posters sum to 218 KB.
- **Not measured here**: what seven live embeds would have cost. The pinned headless browser cannot
  reach YouTube at all — it builds the seven iframes and issues no request the harness can observe
  — so the usual 0.6–1.2 MB-per-embed figure is an *external estimate*, not something this repo has
  weighed. Treat the saving as "two orders of magnitude, direction certain, exact factor
  unverified" rather than as a number. What IS verified is the part D11 depends on: nothing is
  fetched from YouTube until a visitor presses play, asserted by `videos-v3.mjs`.
- **Zero layout shift** on activation: the embed replaces the facade inside the same `.frame`, which
  keeps its inline `aspect-ratio`. Asserted by `tools/visual-qa/videos-v3.mjs`.
- It also fixes something the single clip already got wrong. An iframe that has not painted is a
  dark slab — the "unfinished" impression D7 exists to prevent — and that is what the strip showed
  on a slow connection before this change. A poster paints from disk.

Posters are **self-hosted**, never hot-linked, because D11 says the shipped site makes no
third-party request. `tools/build/make-video-posters.mjs` fetches each clip's `oar2.jpg` — the only
thumbnail YouTube serves at the clip's own aspect ratio; `hqdefault` and `maxresdefault` are 16:9
with the vertical frame letterboxed into them, and cropping one back to 9:16 keeps the pillarbox and
discards her face. It asserts the shape it got against the ratio `config.json` paints it into, and
exits 1 on a mismatch rather than shipping a poster `object-fit:cover` will quietly crop.

`meta.videoPosters` is the single source of truth for the directory, the width rungs and the `sizes`
strings; the build script and `posterImg()` both read it, so the files on disk and the candidates
offered to the browser cannot drift apart. Every rung has a real consumer — 360w at DPR 1 and on a
phone at DPR 2, 576w at DPR 2 desktop and on a large phone, 864w at DPR 3 — asserted per rung by
`videos-v3.mjs`.

### Three smaller things in the same change

- **The strip label is an `<h3>`, not a `<p>`.** It is the only label on the largest block in the
  work section, and a screen-reader user scans a CV by heading. `.vidlabel` is matched by class
  only, so nothing moves by a pixel. h3 rather than h2 because the strip sits inside the work
  section, whose h2 is already its title.
- **The duration chip is opaque ink, not a scrim.** `a11y-v3.mjs`'s `bgOf()` composites
  `background-color` only and never samples `background-image`, so text over a poster is scored
  against the frame's paper — a pass the gate cannot actually see. Opaque removes the question:
  `#FBFAF6` on `#2B2A25` is 13.8:1 whatever the still underneath happens to be. The play disc may
  use a scrim because it contains no text.
- **Print.** The strip prints as a contact sheet: four columns of 189.5px, play disc and duration
  chip hidden, posters kept. Measured at A4: 762px, about two thirds of a page. The evidence
  survives; seven full-width stills would not have been worth the paper. A printed poster is also
  strictly better than what an iframe printed before, which was nothing. A clip the reader opened
  before printing is hidden entirely (`.vopen`, `.vembed`) — an embed prints as a dark slab.

### The campaign sheet gets the same treatment

`video()` is shared, so the two clips inside the PPD sheet go through the same code — though they
ship with no poster and therefore no facade at all; see "Two clips deliberately have no poster"
below.

One honest cost remains, and it is pre-existing rather than introduced here: once focus is inside a
cross-origin YouTube frame, keydowns never reach the sheet's focus trap
(`trapFocus` is bound to `document` with `capture:true`), so **Escape stops closing the modal**.
An earlier revision of this entry claimed Shift-Tab was the way out. It was **not measured, and it
is wrong**: with the real player loaded, Shift-Tab left `document.activeElement` on the iframe and
Escape still did nothing. The honest statement is that the keyboard exit from a cross-origin frame
is browser-dependent and was not reproducible in the pinned browser; the reliable exits are the
mouse and the browser's own chrome.

Tabbing into the old live iframe did the same thing, so this is not new. What the facade changed is
that the *primary* path now puts a keyboard user there, because activation calls `iframe.focus()` —
which is also the thing a keyboard user asked for. Removing the focus call would fix Escape and cost
every keyboard user a second interaction to reach the player they just opened. Left as is, and now
recorded accurately.

Separately, `inert` on `#app` hides the strip from assistive tech and pointer events but does not
pause media, so a strip clip kept playing underneath an open sheet. `openSheet()` now posts
`pauseVideo` to every embed in `#app` before it goes inert, which is why the activation URL carries
`enablejsapi=1`.

### Two clips deliberately have no poster

`meta.videoPosters.skip` lists the two PPD campaign films, and
`tools/build/make-video-posters.mjs --check` fails if a poster for either ever appears on disk.

The reason is D17's, applied again. `config.json` describes Film 1 as an "internal news-style
report"; the only thumbnail YouTube offers for it is a group shot of roughly nine identifiable
L'Oréal colleagues at an internal event, under a "CHUYỂN ĐỘNG PPD" title card. Embedding the film
is one thing — she made it, it sits on her own channel, and it was embedded here long before the
facade existed. Re-hosting a 1200px still of her colleagues' faces as a crawler-fetchable asset on
her personal CV domain is another, and D17 already settled how this repo treats internal material:
remove it, do not merely hide it.

The cost is nothing: `video()` finds no poster and falls back to the lazy live embed, which is
exactly what those two clips did before. The seven strip clips — her own on-camera brand work —
keep theirs, and `robots.txt` disallows `/images/video-posters/` so they are not offered up as
standalone image-search results either.

### Deliberately not done

**No `VideoObject` structured data.** The seven clips are unlisted brand assets on the owner's own
channel; the JSON-LD stays `Person`-only so nothing invites a crawler to index them. The omission is
a decision, not an oversight — do not "fix" it without asking the owner.

## D21 — social marks in both contact surfaces

The design's contact surfaces carry email, phone and city. LinkedIn was added earlier; the owner
asked for Facebook and Instagram beside it, "three logos".

Three more labelled rows would have taken `.cgrid` from five cells to seven and made the quietest
block on the page the busiest. Instead the three sit as one row of marks: in the About card they
replace the LinkedIn text link inside `.cardlinks`, and in the contact grid they occupy a single
cell labelled "Social" / "Mạng xã hội", so the grid stays at five.

**Monochrome, one stroke weight, inline SVG.** Not the platforms' brand colours: LinkedIn blue,
Facebook blue and Instagram's orange-to-purple gradient together would be the loudest thing on a
page built from paper, ink and one rose accent — and loudest in the block that is quiet by design.
No icon font, no sprite sheet, no request: D11 holds.

They are drawn as **strokes, not fills**, and that is the whole correction. Shipped first as the
platforms' solid glyphs, they measured 38.3% / 31.9% / 21.6% ink coverage inside the same 16px box
— two solid shapes beside one line drawing, which can never balance, and together far heavier than
the 15px letterforms around them. Dropping the colour to `--soft` treated the symptom and cost the
row its rank: the marks then measured identical to the `.eyebrow` label above them. Redrawn on one
24 grid at `stroke-width:1.7`, all three carry the same weight by construction, and a hairline mark
is what the rest of this page is made of. They keep `--ink`, and move to `--pink-ink` on hover and
focus — a real lightness step, not a hue-only change that a colour-blind reader cannot see.

`currentColor` still does the inheriting: the About card sets `#fff` explicitly on its own row
because that surface is the rose accent, and the contact grid takes `--ink` from the page.

The link is 32×32 for a comfortable touch target while the mark stays 18px, which is the size the
15px text beside it wants. In the contact grid the row is pulled up 6px, because a 32px box around
an 18px glyph otherwise drops its optical centre below the baseline band of the text cells beside
it. The `<svg>` is `aria-hidden` with `focusable="false"` and the `<a>`
carries the name — `"Instagram — thucanhtrantonnu"` — so each link announces the platform and the
handle rather than "link, graphic".

D7 extends to these: a profile with no URL in `config.json` renders nothing, and if none of the
three has one the row is absent rather than an empty box.

The Instagram URL was supplied with a `?mdxt=…` share-tracking parameter. It identifies the share,
not the profile, and it is stripped — a CV should not carry a referral token from the message that
delivered the link.
