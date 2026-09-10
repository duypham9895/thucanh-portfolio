# Portfolio v3 — what was built overnight, and what needs you

**Branch:** `redesign-v3` · commits `85f9c3d` → `ddd623d` → `5a93c72` · **master and the live site are untouched**
**Rollback anchor:** tag `pre-redesign-v3` on `dc771cc`
**Preview:** `python3 -m http.server 8900` → http://localhost:8900 and http://localhost:8900/en/

---

## Where it stands

The whole design is ported and passing. Nothing is deployed.

| Check | Result |
|---|---|
| Sections rendered, both languages | 10, in the design's order |
| Horizontal overflow @ 320/375/390/768/900 | **0px** — page and all 6 campaign sheets |
| WCAG AA contrast, VI and EN | **0 failures** (alpha- and opacity-composited) |
| Keyboard-reachable controls | 35, **0** clickable-but-unfocusable |
| Modal | `role=dialog`, focus trap, focus restore, background inert, Escape closes |
| Reduced motion / print | 0 blocks left invisible |
| Console errors / failed requests | 0 / 0 |
| Images | 16.1 MB → **1.35 MB** (−91.6%), aspect ratios exact |
| Design snapshot integrity | 27 files pinned, 0 drift |
| `release --check` | OK, both shells on one generation |
| First load, desktop / mobile | **277 KB / 256 KB** (≈170 KB as Pages gzips it) |
| FCP · LCP, mobile 4G + 4× CPU | 956 ms · 1396 ms |
| Fonts | 167.8 KB → **99.0 KB**, subsetted to the 165 glyphs rendered · zero CDN requests |

Full detail: `docs/design/v3-source/DEVIATIONS.md`.

---

## Decisions I made for you

Small ones, taken from the position of "this is a CV going to recruiters". Each is one line to undo.

1. **Newest CV PDF.** The export had three. The design references `uploads/cv.pdf` (dated
   2026-07-29), but a later one dated **2026-08-19** appears twice in `uploads/` (identical hashes —
   a deliberate re-upload). I shipped the 08-19 one. *If the 07-29 file is the right one, say so.*
2. **Vietnamese stays the default at `/`.** The design's `TWEAK_DEFAULTS` say `lang:"EN"`, but the
   domain and market are Vietnamese, and English now has its own real URL at `/en/`. A recruiter
   sent the English link lands in English.
3. **Section order follows your design exactly** — about → education → cv → work → extra → awards →
   xfile. See question 1 below; there is evidence against it and I did not act on it unilaterally.
4. **Certificate gallery not shipped.** The design has the CSS (`.certstage`) but no certificate
   images were in the export. An empty gallery renders nothing rather than grey boxes.
5. **Deleted `images/avatar.jpg` + `avatar.webp`** (757 KB) — the previous port's portrait, no longer
   referenced. `og:image` now uses a purpose-made 1200×630 crop.
6. **Contrast fixes applied where the design failed AA.** The visible ones: the About folder and
   contact card darkened from `#CB7885` to `#AE5E6C`, and section colours used *as text* darkened.
   Surfaces otherwise keep your exact values. Citron section headings measured **1.33:1** — they
   were effectively invisible.

---

## Questions for you — these change the work

### 1. Section order — your design vs. the research this repo already paid for

Your design puts **About first, campaigns fifth**. The previous round commissioned reader-flow
research (`docs/research/reader-flow.md`) which found:

- NN/G: **74% of viewing time** falls in the first two screenfuls.
- Ladders: recruiters give a first screen **7.4 seconds**.
- Campaigns are the strongest asset, and they now begin around screen 4.

I built your order because you said to follow the design. But the same research is why the *current
live site* leads with campaigns. **Which wins?** A middle option: keep your order, and add a
one-line proof strip in the hero (numbers + brand names) so the evidence is above the fold without
moving anything.

### 2. Persistent "Download CV" in the nav

Your design has CV buttons in About, the CV section head, and Contact — but not in the fixed nav.
The live site keeps one in the nav permanently, because it was 2.1 screens down before. Add it back?
It is a visible addition to your design, so I did not do it.

### 3. `Clinique` on the brand wall

It appears in `P.brands` and has a logo, but no campaign, job entry or achievement mentions
Clinique anywhere. On a document used for hiring, an unsupported brand claim is a real risk if
someone asks about it in an interview. **Keep it, or drop it?**

### 4. Campaign results are mostly not results

14 of 18 result cells hold dates and role labels rather than outcomes — `{v:"04/2026", k:"thời điểm
tổ chức"}`, `{v:"Concept", k:"vai trò ý tưởng"}`. The Results block is the part a hiring manager
reads hardest. Where you have real numbers (reach, GMV lift, engagement, attendance, view counts),
they are worth more than everything else on the page. Which campaigns can get real numbers?

### 5. Three campaigns have no images

`gloss`, `pickleball` and `ppd` (partly) list shot captions but no files. They currently render as
text-only sheets, which is honest but thin next to `serioxyl` and `newsletter`. Do you have images?

### 6. The five "100%" claims — the one I deliberately did not touch

Your copy carries five unmeasured percentages:

- `100% tính toàn vẹn danh mục` / *100% catalog integrity*
- `100% brand guideline` (twice)
- `tối ưu 100% CEM/CRM`
- `100% đồng nhất brand guideline` (Matrix results) and `100% nhất quán hình ảnh` (Gloss results)

The research pass argued they should come off, and the reasoning is sound: a percentage the reader
cannot check sits badly next to `9K+ follower` and `125% KPI`, which are real and specific — it
invites the suspicion that the real numbers are decorative too. An experienced hiring manager reads
an unfalsifiable 100% as padding.

**I did not remove them**, because deleting a number Thục Anh published about her own work is a
claim change that is hers to make, not mine. Three options:

1. Leave them. They came from her CV and match it.
2. Replace with what the 100% is a percentage *of* — "toàn bộ 6 danh mục", "cả 40 ấn phẩm/tháng".
   Strongest option if the underlying count is known.
3. Remove and let the surrounding verbs carry it.

### 7. `bio` still says "2+ năm" while everything else says "3+"

Fixed everywhere except the bio paragraph itself. The proposed rewrites also rewrote sentences
around it that were not broken, so I rejected them rather than ship collateral edits to her voice.
The minimal fix is to delete the number from that one sentence — `P.intro`, `P.stats.0` and
`T.years` already say 3+ consistently. **Confirm and I will make that one-word change.**

### 8. The CV — resolved, and it turned out differently than expected

**Both PDFs are in English.** The file shipped overnight as "the Vietnamese CV" was never
Vietnamese; it was picked by date without reading it, which was a bad assumption on my part.

The file supplied on 2026-09-10 is the better of the two and now serves both documents: it uses the
site's own pink/citron palette instead of the old gold-and-black, and its Portfolio line reads
`thucanhtrantonnu.com` instead of a bare Google Drive link.

**So what is now missing is a VIETNAMESE CV, not an English one.** `meta.cvPending` records `vi`.
Given that the Vietnamese page exists for the local market, this is worth deciding on.

### 8b. Seven spelling errors in the CV — the site spells four of them correctly

These are in the PDF a recruiter downloads. It is a Canva export, so the text cannot be corrected
here; it needs fixing in Canva and re-exporting.

| CV says | should be | where |
|---|---|---|
| L'Oréal **Profesionnel** | Professionnel | the current job title — the brand's own name |
| Canva**s** | Canva | Skills |
| **Exellent** Innovation Project | Excellent | Achievements |
| **oganizers** | organizers | AIESEC |
| **increse** to 1000+ | increase | AIESEC |
| **Adress** | Address | Contact |
| 4 **continously** years | continuous / continuously | Education |

The site already spells Professionnel, Canva, Excellent and organizers correctly, so a recruiter
reading both documents sees the CV as the weaker one. The brand-name misspelling in the job title
is the costly one: it is the employer's own name, on the line a recruiter reads first.

---

## What changed in the copy

29 line-level edits, all typography / grammar / internal consistency — no fact, number, brand or
claim was altered. Full list in commit `5a93c72`. The visible ones:

| | was | now |
|---|---|---|
| EN folder tile + heading | "Working experiences" | **"Work experience"** (uncountable — the plural is a grammar error) |
| EN folder tile + heading | "Hidden me" | **"Side talents"** (a pronoun used as a noun; "Tài lẻ" means side talents) |
| EN newsletter archive | "Other newsletter" | **"Past issues"** (singular implied a different publication) |
| EN campaign titles | "Shopee store launching", "Launching event" | **"launch"** (gerund where English needs the event noun) |
| 4 campaign titles | `Serioxyl - Độ tóc tốc độ` | `Serioxyl — Độ tóc tốc độ` (hyphen doing an em dash's job, against 84 em dashes elsewhere) |
| Awards | "Sinh viên 5 **T**ốt" vs "5 **t**ốt" | one spelling |

**One real bug fixed:** the English Pickleball summary contained untranslated Vietnamese
(`"Drop" mượt mà - kháng nhiệt tối đa`), stated a *different* message from the Vietnamese
(`"Tóc mượt mà, kháng nhiệt tối đa"`), and dropped the Elixir Ultime line. The tagline genuinely is
Vietnamese, so it now stays quoted and is glossed in English rather than replaced.

## Smaller things I noticed but did not change

- `matrix-shopee-store` is 624×1006 at source and renders in a 582px column — only 1.07×, so it will
  look soft on a Retina screen. Needs a bigger screenshot, not a better encoder.
- The Serioxyl sheet is the heaviest at 455 KB (down from 6.45 MB). Fine — sheets load on demand.
- `xfileIntro` is an empty string in both languages; the section renders without an intro paragraph.
- No analytics of any kind, so there is no way to know whether a recruiter opened the page.
- No CI. Every check above is run by hand.
- **AVIF was tried and rejected.** Measured against the original sources at matched dimensions,
  ImageMagick's `heic` encoder is both bigger and worse than the shipped WebP (portrait: 87 KB at
  RMSE 0.0148 vs 127 KB at 0.0155). A real `avifenc` (libaom) would probably win — `brew install
  libavif` and re-measure if you want it. I would not ship a larger, softer image in a newer format.
- `→ ← ✕` render in a system font. They are absent from all ten source font files and always have
  been; the subsetter allow-lists them so the coverage gate fails only on real regressions.
- Re-run `node tools/build/subset-fonts.mjs --check` after **any** content edit. Subsetting freezes
  the glyph set, and editing copy afterwards dropped the new curly quotes into a fallback within the
  hour of shipping the subsetter.

---

## Cross-LLM review status

You asked for Codex via crossagent. Here is exactly what happened, because the first attempt is
worth knowing about.

**First attempt: FAILED.** The plan-stage review ran 80 minutes without a verdict and was killed
when the machine ran out of memory. The prompt was the problem — it told Codex to go read
`gates.mjs`, `release.mjs`, `AGENTS.md` and the plan document, which is an open-ended exploration,
not a review. Nothing was deployed on the strength of an unrun review; the work sat on a branch.

**Second attempt: PASSED, in 30 seconds.** Same model (`gpt-5.6-terra`), self-contained package —
the four code sections inline, four specific questions, an explicit instruction not to explore.

Its verdicts:

| | |
|---|---|
| Base-URL resolution across both shells | **sound** |
| Language toggle | NONBLOCKING — cannot loop |
| Sheet lifecycle / focus trap | NONBLOCKING — cannot leave two sheets open, no duplicate listener |
| `release --check` tolerating a missing `en/index.html` | **BLOCKER** |

The blocker is fixed in `b99e47a`. I had found the same gap minutes earlier from my own reading —
two independent paths to one finding is the reason the loop exists.

One thing Codex flagged that I documented rather than changed: `trapFocus` runs on `document` with
`capture:true` and calls `stopPropagation`, so nothing inside the sheet can ever observe Escape. No
sheet control wants it today, but the next person to add a text input there would find Escape
closing the whole sheet. The code now says so.

**Note on the ladder:** the adversarial passes inside my own workflows are author-side self-checks,
not an independent tier — same model, same session, same priors. Only the Codex round above counts
as external verification, and it covered the four code changes listed, not the copy or the design
port as a whole.

## To deploy when you are happy

```bash
cd tools/visual-qa && node smoke-v3.mjs && node a11y-v3.mjs      # re-verify
cd ../.. && node tools/release.mjs --check                        # must exit 0
git checkout master && git merge redesign-v3 && git push          # goes live
```

If anything looks wrong afterwards: `git revert` the merge, or `git reset --hard pre-redesign-v3`.
Revert whole commits — `release.mjs` prunes old hashed assets, so reverting `index.html` alone can
404.
