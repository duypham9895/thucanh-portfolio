# Changelog

Notable changes to [thucanhtrantonnu.com](https://thucanhtrantonnu.com), which is a live CV.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Versioning starts at v1.0.0 — that is not a claim that nothing shipped before.** The site was
rebuilt from the Claude Design v3 project in `dc921a9` and has been live and iterated on since;
that history is in `git log`, and the design decisions behind it are in
[`docs/design/v3-source/DEVIATIONS.md`](docs/design/v3-source/DEVIATIONS.md), numbered D1–D21.
This file begins where tagged releases begin.

The three existing tags — `pre-artifact-rebuild`, `pre-redesign-v3`, `pre-ui-audit-fixes` — are
safety markers taken *before* large changes, not releases. They are left alone.

---

## [1.2.2] — 2026-10-14

### Fixed

- **The folder stack lifted the wrong tile.** The tiles overlap by 16px so the stack reads as paper
  in a drawer, but `.folder` is a full-width `<button>` whose box starts at its own tab's top — so
  the bottom 16px of every tile's body sat underneath the *next* button. Hovering the lower edge of
  "Education" lifted "Work experience". Measured against the painted pixel at nine widths in both
  documents: **75,516 of 399,700 probes (18.9%) routed to the tile below the one on screen.** That
  figure is structural, not incidental — a tile is 100px tall and overlaps by 16, so 16/84 of every
  tile was mis-targeted.

  Fixed by putting `pointer-events` on the two painted children instead of on the button, so the
  hit region is exactly the tab plus the body. `.folder:hover` still matches — hover propagates
  from a child to its ancestors — and keyboard focus is untouched.

- **…and the obvious fix, alone, was worse than the bug.** `.folder:hover` lifts the tile 12px.
  Point at the bottom 12px of a body and the tile rises out from under the cursor, un-hovers, and
  *stays* un-hovered, because hit testing is re-evaluated on pointer movement rather than on layout
  change. Measured with a real mouse: `pointer-events` on its own traded 44 wrong-tile points for
  **67 dead ones**. Shipped with a stationary 12px skirt, `.folder:hover .folder-body::after`, in
  exactly the space the lifted body vacates. It exists only while hovered, so it never takes a hit
  from the tile below. Final: **0 misrouted, 0 dead.**

### Added

- **`tools/visual-qa/folders-v3.mjs`** — a gate for the stack, exiting non-zero. It checks hit
  routing against the painted pixel (each folder has its own background colour, so a colour match
  names the tile that is visually there) and then **drives a real mouse down every body**, because
  `elementFromPoint` hit-tests a page that is not being hovered and therefore cannot see an element
  move away from the cursor. Verified to fail on each half of the fix independently: removing
  `pointer-events` reports 24 problems, removing the skirt reports 6 and names the cause.

### Documentation

`DEVIATIONS.md` gains **D22**, including why no existing gate could see this and why two different
wrong oracles were discarded on the way — a rectangle-based one that reported 686 false positives
on rounded corners, and `elementFromPoint`, which would have shipped the dead strip. `AGENTS.md`
registers the new gate and says plainly why it drives a real mouse.

### Verified

Both documents: `folders-v3` (399,700 painted pixels, plus a real mouse over every visible body at
1440/900/390 — cursor still `pointer`, click still navigates, folders still take keyboard focus,
Enter still navigates, the paperclip still is not a hit target), `smoke-v3`, `a11y-v3` EN and VI
(zero contrast failures, **49** keyboard-reachable controls — unchanged — zero
clickable-but-unfocusable), `videos-v3` EN and VI, `check-font-coverage`,
`make-video-posters --check`, `release.mjs --check`. The v1.2.1 band fix still holds at every width.

---

## [1.2.1] — 2026-10-14

### Fixed

- **The video heading sat on page background instead of on its own band.** `.vidlabel`'s 70px top
  margin had nothing to stop it. The section is deliberately `border-top:0;padding-top:0` so the
  strip reads as a continuation of the work band, and with no top padding or border on `.wrap`
  either, the margin collapsed out of both and became the **section's** own — leaving 70px of
  `#F4F2ED` between two bands of the same tint (48px at ≤900px), with the heading flush on the top
  edge of the lower one. Reported by the owner: *"chữ 'Video work I produced' đang nằm lệch vs
  background"*.

  Sampled as painted pixels the junction read `rgb(239,239,231)` · `rgb(244,242,237)` × 70px ·
  `rgb(239,239,231)`, and `elementFromPoint` in the middle of the stripe returned `body > main` —
  no section covered it.

  Fixed by making the section a block formatting context — `.vidsec{display:flow-root}` — so the
  margin stays on the box it was written for. One CSS declaration and one class name; `.vidlabel`'s
  own two rules, including its 48px tier at ≤900px, are untouched, and the inline
  `border-top:0;padding-top:0` is left alone. Paying the gap as `padding-top` instead measures
  identically but would have copied the 70/48 split into new rules and silently opted the section
  out of the print padding tier on specificity. Recorded in D20.

### Documentation

- **`AGENTS.md` claimed `a11y-v3` tests print. It never did** — no gate in the suite calls
  `emulateMedia`. The line is corrected and the gap is now stated, so D9's print tier is known to
  be hand-verified rather than assumed covered.
- **D20's height table was measured on the box this fix grows** and is updated: 320 1,310 · 390
  1,558 · 768 1,527 · 1024 1,078 · 1440 1,305. The 320 row also corrects a pre-existing error — it
  measured 1,261.5px, not the 1,305px recorded.

### Verified

Both documents, English and Vietnamese, at fourteen widths from 320 to 1512: the gap between the two
bands goes 70/48px → **0** and the heading's offset from the top of its own band goes 0 → **70 above
900px, 48 at and below**. Document height is **identical at every width in both languages** — the
space is moved, not added — horizontal overflow stays 0, grid height, cell width and column count
are unchanged, both bands keep the same computed colour, and the label's left edge still matches the
grid's. Under `emulateMedia` print: rule-to-label 94px at 1440 and 72px at 794, contact sheet still
four columns of 189.5px, print document height EN 8466/9287 and VI 8414/9227, and a real A4 render
still **ten pages** in each language. `smoke-v3`, `a11y-v3` (EN and VI), `videos-v3` (EN and VI),
`check-font-coverage`, `make-video-posters --check` and `release.mjs --check` all exit 0.

One measurement needed a control before it could be trusted: document height at EN@390 appeared to
shift by 72px between the before and after reads. Injecting an **empty** stylesheet reproduced the
same 72px shift, so it was the page not having settled at `networkidle`, not the change. Once
settled, before and after are identical.

---

## [1.2.0] — 2026-10-14

The sentence added in 1.1.0 is removed. It was not wanted.

### Removed

- **The line under the video heading** (`T.videosNote`, `p.body.vidnote`, `.vidnote`). Removed at
  the owner's request — *"kh bỏ nó đi, tôi kh muốn có nữa"*. No further justification is recorded
  here, because none is needed: it is her CV.

  The revert is complete rather than approximate. `config.json`, `index.js` and `index.css` are
  **byte-identical to `212b8c2`**, the commit before the sentence shipped, and content hashing
  proves it independently: this release reproduced the v1.0.0 generation exactly —
  `index.ede95581.css`, `index.1cfaf7ff.js`, `config.c7cb03b9.json`. A partial revert could not
  have produced those three hashes.

  `T` is back to 54 keys per language, key sets identical. The grid returns to the 20px gap under
  the `h3` that 1.1.0's entry measured it leaving: the 40.09px / 66.19px it had been pushed down at
  1440px / 390px is given back.

### Verified

Both documents, English and Vietnamese: `smoke-v3` (zero console errors, zero failed requests, zero
horizontal overflow), `a11y-v3` (zero contrast failures on page and sheets, 49 keyboard-reachable
controls, zero clickable-but-unfocusable), `videos-v3`, `check-font-coverage`,
`make-video-posters --check`, `release.mjs --check`.

---

## [1.1.0] — 2026-10-14

One sentence under the video heading, naming what the strip could not say for itself.

### Added

- **A line under "Video work I produced"** — *"On camera in six of the seven — the third is a KOL
  at a Kérastase event."* / *"Tôi lên hình trong sáu trên bảy — clip thứ ba là KOL tại sự kiện
  Kérastase."* The strip is the largest block in the work section and it claimed only authorship;
  a reader with no other signal would assume she worked behind the camera. Being the talent on six
  of seven brand clips is the stronger claim, and it was the one going unsaid. The exception is
  named rather than glossed, because a blanket "on camera in all seven" would be untrue and a
  vaguer phrasing would invite the reader to assume it.

  It renders as `p.body.vidnote` at 14.5px under the 20px `h3`, one line at 1440px and two at
  390px in both languages. Its `-10px` top margin collapses into the heading's 20px bottom margin
  (`20 + (-10) = 10`), so the gap above the sentence is 10px rather than the 20px that used to run
  straight to the grid; below it there is 24px.

  **The heading does not move and the grid does.** Measured: heading bottom identical to the pixel,
  grid pushed down 40.09px at 1440px and 66.19px at 390px, page 41px and 67px taller. An earlier
  wording of this entry, and the commit message of `f501fe6`, both said "nothing below it moves" —
  that was wrong. Inserting a paragraph necessarily pushes what follows it down; what the negative
  margin buys is the spacing rhythm, not a free insertion.

### Not changed

The **folder stack on the first screen was examined and deliberately left alone.** The research is
recorded in the session, not here: physical filing systems stagger tabs by *cycling* cut positions
(1/3-cut, 1/5-cut) rather than marching monotonically right, and three faithful reconstructions of
that convention were built and measured. Every one of them truncates labels at 901–1024px, because
the convention assumes short labels on a fixed-width 8.5" folder while this stack has phrase-length
labels in two languages inside a fluid body. The monotonic stagger survives precisely because it
lets each tab size to its own content. No change shipped.

### Verified

Both documents, English and Vietnamese: `smoke-v3` (zero horizontal overflow at 320/375/390/768/900,
zero console errors, zero failed requests), `a11y-v3` (zero contrast failures on page and sheets, 49
keyboard-reachable controls, zero clickable-but-unfocusable), `videos-v3`, `check-font-coverage`
(157 distinct characters, the two new strings add none), `make-video-posters --check` (7 clips, 21
files, all tracked), `release.mjs --check`. `T` holds 55 keys in each language and the key sets are
identical; both new strings are NFC.

---

## [1.0.0] — 2026-10-13

The video strip grows from one clip to seven, the contact block gains two more social profiles,
and the first screen stops forcing a full-page layout before it paints.

### Added

- **Six more clips in the video strip**, all 9:16 vertical, taking it from one to seven. Captions
  were written from what is visible in each clip's own frame rather than from its YouTube title —
  three of the seven titles are near-identical, so the titles could not tell them apart. The strip
  is ordered as two bodies of work: three Kérastase, then four L'Oréal Professionnel.
- **Click-to-play facades.** Each clip renders a self-hosted WebP still, a play control and a
  duration chip inside a real button; the YouTube embed is built only when someone asks for it.
  Seven live embeds would have arrived together the moment the strip scrolled into view. Measured:
  121 KB of posters at DPR 1, **zero bytes and zero requests to any third party** until a visitor
  presses play.
- **Facebook and Instagram** beside LinkedIn, in both contact surfaces and in the JSON-LD
  `sameAs`, as three monochrome inline-SVG marks sharing one stroke weight.
- **`tools/build/make-video-posters.mjs`** — fetches each clip's original-aspect-ratio thumbnail
  and re-encodes it locally, because a hot-linked thumbnail would be a third-party request on
  every page view. It asserts the shape it received against the ratio the page will paint it into
  and refuses to ship a poster that `object-fit: cover` would crop.
- **`tools/visual-qa/videos-v3.mjs`** — a gate for the strip: the column ladder at nine widths,
  poster decoding, the `sizes` string against the painted box, caption line counts, click-to-play
  activation, keyboard activation, font fallback, and the campaign sheet's own clips. Exits
  non-zero. Verified to fail on a deleted poster and on an out-of-subset character.
- **`sitemap.xml`** — `robots.txt` had been advertising one that did not exist.

### Changed

- **The video grid uses declared column counts** — 4, then 3 below 900px, then 2 below 620px —
  instead of `auto-fit`. `auto-fit` cannot express that ladder: reaching two columns at 320px
  needs a track minimum small enough to produce four columns at 620px. Under the old rule seven
  vertical clips collapsed to a single column below 526px, about 4,440px of scrolling at 390px;
  it is now 1,510px.
- **The strip's label is an `<h3>`, not a `<p>`** — it is the only label on the largest block in
  the section, and a screen-reader user scans a CV by heading. Nothing moves visually.
- **The strip heading** is now "Video work I produced" / "Video tôi đã thực hiện". It had promised
  photo work above seven videos and no photos.
- **The nav's scroll handler is an IntersectionObserver.** It read `window.scrollY` and toggled a
  class on every scroll event, and was also called once directly at the end of boot — the instant
  after the whole page DOM was built. Measured on a 4×-throttled CPU at 390px, that single call
  forced a synchronous layout of 821 of 831 nodes taking 418 ms, on the critical path, immediately
  before first paint; the handler accounted for 431 ms of forced reflow over the load. No
  JavaScript function forces a layout any more.
- **The social marks are strokes, not filled glyphs.** As the platforms' solid marks they measured
  38.3% / 31.9% / 21.6% ink coverage in the same box — two solid shapes beside one line drawing,
  which cannot balance. Redrawn at one stroke weight they match by construction.

### Fixed

- **The keyboard focus ring on a video facade did not render.** It inherited an *outer* halo that
  `.frame { overflow: hidden }` clipped away entirely, leaving one `#2B2A25` hairline over an
  arbitrary still — and over the facade's own `#2B2A25` background while the poster decodes, where
  it was invisible at 1:1. An inset `box-shadow` did not fix it either: it paints beneath the
  button's own children, and the poster covers the box. It is now a layer that paints above.
- **Printing dumped every social URL inside a 32px icon box**, overprinting the contact block in
  both surfaces. The marks now print as their handles.
- **Captions could take a third line** against a two-line reservation at 320–341px. Tightening the
  tracking below 400px holds every caption in both languages to two lines down to 320px, which
  costs nothing, where reserving a third line would have cost 14.5 px on every common phone.
- **The play control grew as its frame shrank.** Its 44px rule stopped at 900px while four columns
  start at 901px, so the control was 31% of the cell at 901 and 16% at 900.

### Removed

- **`out/v3/` (9 PNGs, 1.26 MB)** — QA screenshots that were tracked and publicly fetchable on the
  CV domain, and not excluded by `robots.txt`. One of them pictured a layout the site no longer
  had. They are regenerated by `tools/visual-qa/sections-v3.mjs`.
- **Posters for the two PPD campaign films.** The only thumbnail available for the film the site
  itself describes as an "internal news-style report" is a group shot of roughly nine identifiable
  colleagues at an internal event. Embedding a film she made, from her own channel, is one thing;
  re-hosting a 1200px still of her colleagues on her personal domain is another. D17 had already
  settled how this repo treats internal material. `meta.videoPosters.skip` records the decision and
  the build refuses to regenerate them; those two clips fall back to the lazy embed they used
  before.
- **Five placeholder entries** in `VIDEOS` describing photo and video slots that rendered nothing.

### Documentation

`DEVIATIONS.md` gains **D20** (the strip) and **D21** (the social marks), and corrects D5, D7, D8,
D11 and D12. `README.md` and `AGENTS.md` carried four statements that were already false before
this release — among them `RETAIN is 3` when the code says 4, and a keyboard-control count that had
drifted from 35 to 49 — and now say what the code says.

### Verified

Both documents, English and Vietnamese: `smoke-v3` (zero horizontal overflow at 320/375/390/768/900,
zero console errors, zero failed requests), `a11y-v3` (zero contrast failures, 49 keyboard-reachable
controls, zero clickable-but-unfocusable), `videos-v3`, `check-font-coverage`,
`make-video-posters --check`, `release.mjs --check`. Lighthouse mobile: accessibility 100, best
practices 100, SEO 100, 54 audits passed and none failed. CLS 0.00.

What was *not* verified: the byte saving against seven live embeds. The pinned headless browser
cannot reach YouTube, so the usual per-embed figure is an external estimate rather than a
measurement, and D20 says so rather than quoting a number this repo did not take.
