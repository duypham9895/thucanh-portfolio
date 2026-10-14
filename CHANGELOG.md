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
  390px in both languages, with `.vidnote` taking over the 10px/24px spacing that used to sit
  between heading and grid — so nothing below it moves.

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
