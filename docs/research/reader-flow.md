# Reader-flow research — why the sections are in this order

The artifact's section order was a design choice. The order this site ships is an **evidence-based**
one. This file records the evidence so the decision can be re-argued rather than re-guessed.

## The evidence

### 1. Attention decays sharply with depth — NN/G eyetracking

Nielsen Norman Group's scrolling-and-attention study measured how viewing time distributes down a
page:

| Region | Share of viewing time |
|---|---|
| Above the fold | **57%** |
| Second screenful | **~17%** |
| **First two screenfuls combined** | **74%** |
| Everything below | 26% (long tail) |

Also: **more than 65% of above-the-fold viewing time is in the top half of the viewport**, and the
study's summary is blunt — *"the closer a piece of information is to the top of the page, the higher
the chance that it will be read."*

The same source warns about the **illusion of completeness** ("false floor"): if nothing is visibly
cut off at the fold, users conclude the page has ended and do not scroll. Its prescription is to
include a visual signifier such as cut-off content.

→ Source: [Scrolling and Attention, NN/G](https://www.nngroup.com/articles/scrolling-and-attention/)

### 2. People scan, they don't read — the F-pattern

NN/G recorded 232 users reading thousands of pages and found the dominant pattern resembles an
**F**: two horizontal sweeps across the top, then a vertical scan down the left edge. Average page
visit is under a minute, and users read roughly a quarter of the text.

→ Sources: [F-Pattern in Reading Digital Content, NN/G](https://www.nngroup.com/videos/f-pattern-reading-digital-content/) ·
[How People Read Online, W&M Libraries](https://guides.libraries.wm.edu/writing-for-web/how-we-read-online)

### 3. Recruiters give a first screen ~7.4 seconds — Ladders eyetracking

Ladders' 2018 eyetracking study of recruiters found the initial screen gets an average of
**7.4 seconds** (up from 6 seconds in 2012). Scan path: **current title and company → previous role
→ dates (checking progression) → education.**

What *helped*: simple layouts, clear sections and heading titles, organisation that follows E-/F-
pattern reading, **bold titles and bulleted accomplishments**.

What *hurt*: cluttered layouts, **lack of white space**, **multiple columns**, long sentences,
missing section or job headers, and *"text that didn't flow or draw the eye down the page."*

→ Sources: [HR Dive summary](https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/) ·
[Ladders: you have 7.4 seconds](https://www.theladders.com/career-advice/you-only-get-6-seconds-of-fame-make-it-count) ·
[Ladders press release](https://www.prnewswire.com/news-releases/ladders-updates-popular-recruiter-eye-tracking-study-with-new-key-insights-on-how-job-seekers-can-improve-their-resumes-300744217.html)

### 4. Portfolios: best work first, About last

Portfolio-specific guidance is consistent: **show your best work first**, because hiring managers
spend under a minute on a résumé-plus-portfolio pass, and *"the About page is where people go after
they already like your work."* Strong portfolios read as short case studies — problem, your role,
the asset, the result.

→ Sources: [Portfolio Website Sections, Portfolio Studio](https://portfoliostudio.dev/blog/portfolio-website-sections) ·
[How Recruiters and Hiring Managers Actually Look at Your Portfolio](https://blog.opendoorscareers.com/p/how-recruiters-and-hiring-managers-actually-look-at-your-portfolio) ·
[Marketing Portfolios, Indeed](https://www.indeed.com/career-advice/career-development/marketing-portfolios) ·
[How to Make a Marketing Portfolio, BrainStation](https://brainstation.io/career-guides/how-to-build-a-digital-marketing-portfolio)

## What changed, and why

**Order: `hero → work → cv → about → education → awards → extra → contact`**

| Position | Section | Reason |
|---|---|---|
| hero | identity + proof + CV | 57% of attention lands here; it must argue, not just introduce |
| 1 | **Campaigns** | best work first; must land inside the 74% window. Was at screen **4.6** |
| 2 | **Experience** | the recruiter scan path: current title/company → previous → dates |
| 3 | About | *"where people go after they already like your work"* |
| 4–5 | Education, Awards | academic honours belong beside academics |
| 6 | Extracurricular | weakest signal |
| 7 | Contact | terminal action; the persistent nav CV covers the early intent |

### Measured effect

| | Before | After |
|---|---|---|
| Campaigns reachable at | 4.57 screens | **1.0** |
| Experience | 2.53 | **2.38** |
| Download CV | 2.1 screens down | **always visible** (nav) |
| Proof numbers | 2.0 | **0.6** |
| Brands | 2.4 | **0.75** |
| Empty media frames | 6 | **0** |
| Page length, desktop | 9.7 screens | **8.2** |
| Page length, mobile | 16.5 screens | **13.1** |

### False floor

At 1440×900 the hero was exactly `100vh` with the folder stack ending 90px short, so **nothing was
cut off at the fold** — precisely the illusion of completeness NN/G describes. The hero is now
`calc(100vh - 72px)`, so the next section peeks ~49px above the fold as a scroll cue.

**Correction.** An earlier version of this note claimed the `100svh` variant fixes mobile browsers
whose chrome hides on scroll. That was wrong, and Codex caught it: the `≤900px` media query sets
`min-height:0`, so the `svh` rule only ever applies **above** 900px. It is kept for large short
viewports (landscape tablets). On phones the hero is content-sized and already taller than the
viewport, which is its own scroll cue.

## What the evidence did NOT justify changing

- **The folder stack.** It is a table of contents visible in the first screen, which serves scanning
  rather than fighting it. Its order now mirrors the page order, and a functional check enforces that.
- **Multi-column layouts.** Ladders warns about columns on *résumés*, where they break the F-pattern
  sweep. The campaign rows are a scan **table** (number │ title │ brand │ result) read left-to-right,
  and the CV rows are a label-value pair — both reinforce the F-pattern rather than interrupting it.
- **The "Portfolio" wordmark.** It occupies top-half space and carries no information, but name,
  role, proof and CV all still land in the first screen, and it is the design's signature.
- **Section backgrounds.** The bg/paper rhythm still alternates in pairs after reordering.

## Deliberate gaps

Recruiters check **dates for progression** (Ladders). The CV shows them, but the campaigns section
above it leads with titles rather than dates — acceptable, since campaigns argue capability and the
CV immediately below carries the chronology.

---

## Performance work (measured, not assumed)

| | Before | After |
|---|---|---|
| Portrait image | 521 KB JPEG, 1440×1800 | **230 KB WebP, 896×1120** (−56%) |
| Fonts fetched | 256 KB, 15 files | **164 KB, 10 files** (−92 KB) |
| Desktop first load | 628 KB | **349 KB** (−44%) |
| Mobile to first paint | — | **119 KB** (portrait lazy-loads) |
| Desktop FCP / LCP | 148 / 148 ms | **64 / 136 ms** |
| Mobile LCP (4G, 4× CPU) | 1780 ms | **1496 ms** |
| CLS | 0 | **0** |

### The portrait was 81% of the page

`avatar.jpg` was 1440×1800 but never displays larger than 448×597 CSS px (896×1120 at 2× DPR).
Resized and re-encoded to WebP q78 after checking a 3× magnified face crop against q75 and an
uncompressed resize — visually indistinguishable. It is also `loading="lazy"` and below the fold, so
it no longer blocks first paint at all.

### The `latin-ext` overlap — 92 KB for nothing

Google's font subsets overlap: `latin-ext` covers `U+0100-02AF` and `U+1EF2-1EFF`, while
`vietnamese` covers `U+0102-0103`, `U+0110-0111`, `U+01A0-01B0`, `U+1EA0-1EF9`. When two
`@font-face` rules cover the same character, **the later declaration wins** — and Google emits
`vietnamese` *before* `latin-ext`. So on a Vietnamese page, `latin-ext` won for the everyday letters
**ă Đ đ ũ ơ ư ỳ ỹ**, forcing an extra subset download per family.

Declaring `vietnamese` last and dropping `latin-ext` was verified character-by-character against the
real content: **zero characters need it.** `tools/check-font-coverage.mjs` guards this — it exits 1
if content is ever added that needs a dropped subset (verified by injecting Polish text: it caught
`Ć ć ł Ż`).

Two never-fetched weights (Be Vietnam Pro 200 and 500) were also removed.

**The pixel gate caught the consequence.** Serving `ă đ ơ ư` from a different subset file changes
rasterisation very slightly — VI diff rose to 5,085 px, but with a largest connected region of only
33 px, which is the signature of antialiasing rather than a missing glyph. Applying the same subset
set to the adjusted oracle (deviation D10) brought it to **325 px / 0.0035%**, confirming the
diagnosis: file provenance, not design.

### Not optimised, deliberately

- **`config.json` (9.7 KB gzip) is fetched, not inlined.** Inlining would remove a request but
  duplicate content into the HTML and break the single-source-of-truth model. It is `rel=preload`ed
  so the fetch starts in parallel with `index.js` rather than after it.
- **Fonts are not subset to the exact glyph set used.** That would cut them further, but it would
  break the moment copy changes — a trap for a document that gets edited.
- **The whole page renders at once** rather than lazily by section. Deferred rendering would lower
  initial font demand, but the goal is a page a recruiter can scan end to end in under a minute.
