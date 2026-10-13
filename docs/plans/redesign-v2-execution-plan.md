# Plan — Portfolio redesign v2 from a new Claude Design artifact

**Repo:** `thucanh-portfolio` · static, GitHub Pages legacy build from `master:/` · `thucanhtrantonnu.com`
**Subject:** Trần Tôn Nữ Thục Anh — Project Marketing Executive, beauty e-commerce. The site *is* her CV.
**Written:** 2026-09-09, before the design URL was supplied.
**Status:** awaiting owner approval. Nothing has been implemented.

---

## 0. Read this first — the plan's three load-bearing conclusions

Five parallel auditors and two adversarial critics went over the repo, the live origin and the
upstream artifact. Three findings reframe the job. They are verified, not asserted.

**1. The upstream artifact is mutable and cannot be version-pinned.** The recovery path reaches the
artifact through an iframe origin whose `_f/<token>/` segment rotates, and the
`?__frame_v=manifest.<hash>.json` query does **not** pin a version — the origin 302s to whatever is
current. Artifact `54559e05` has already drifted from what `BASELINE.sha256` pins. Everything the
parity method costs is downstream of one snapshot of a document that can change mid-rebuild.
→ **Snapshot on arrival, hash it, and never re-fetch upstream during the rebuild.** See Stage A.

**2. The new design is probably a small delta, not a new artifact.** Decoded from the origin today,
`54559e05` — titled `thucanh-portfolio`, the same ID the current site was ported from — now carries a
7th folder `xfile`, a 6th campaign `newsletter`, a `.certstage/.cert/.certcap` certificate gallery, a
per-campaign `CLogo` component, and three media queries (900/760/620) where the ported version had
one. `:root` is byte-identical: same 16 token names, same values. If the URL you send is this
artifact, the job is *extend*, not *rebuild*, and Stage A.5 exists to prove which it is before anyone
commits to the expensive path.

**3. The content is a bigger threat to callbacks than the design is.** All 23 media slots are empty —
the portfolio has zero campaign imagery. 14 of 15 campaign result cells hold dates and role labels
rather than outcomes. The CV PDF is 3+ months stale, contradicts the site in both directions, and
carries misspellings the site does not (`Profesionnel`, `Canvas`). No redesign fixes any of that, and
**no gate in the suite can fail because of it.**

---

## 1. Decisions locked by the owner (2026-09-09)

| # | Decision | Consequence for this plan |
|---|---|---|
| D-a | Attempt byte-exact recovery, with a graded fallback | Stage A has a written abort criterion (§4). Not a single-mode plan. |
| D-b | Content provenance is mixed — inventory and diff before coding | Content track runs ahead of the build track and gates it (§5). |
| D-c | **Full 9-gate rigor**, as the previous rebuild | No gate relaxation without a logged deviation. Cost is accepted. |
| D-d | **EN equal to VI, with real multilingual SEO** | New architectural work: `/en/index.html`, hreflang pair, EN meta, EN CV PDF (§7). |

D-d overturns a documented decision. `index.html:8` currently reads *"hreflang is not applicable:
crawlers will not operate the toggle."* That reasoning was correct for a one-URL toggle. Making EN a
first-class page means a real second document. `?lang=en` already works (`index.js:734`), so this is
additive, not a rewrite — but the EN CV PDF is a deliverable only the owner can supply.

---

## 2. What survives the swap, and what does not

Verified by reading every file in `tools/` and `tools/visual-qa/`.

| Survives untouched | Needs re-parameterizing | Must be rebuilt |
|---|---|---|
| Determinism layer (pinned Chromium, launch flags, locale/timezone, `document.fonts.ready` + settle) | `settle()` — hardcodes `.reveal`/`.in` | `make-adjusted-oracle.mjs` — all 13 deviations are literal-string patches; ~220 of 308 lines |
| G6 contrast — the only end-to-end design-agnostic gate | G1 — `EXPECTED_PINS = 52` | Pristine-oracle production — manual, unscripted, the largest single cost |
| G7 failed requests | G2 — viewport list, oracle URL, `#top` exclusion | G8 reader flow — every element it looks for is a D5/D6 invention |
| `diff.mjs`, `shoot.mjs` | G3 — page half generic, sheet loop assumes 5 campaign modals | `index.js` — infrastructure survives, the 7 section renderers do not |
| `release.mjs` + `verify-deployed.mjs` release-integrity half | G4 — mask, budget, crop anchor all artifact-derived | |
| `{meta, vi, en}` config schema | G5 — the 16-token list is this artifact's palette | |
| Reader-flow research (`docs/research/reader-flow.md`) | | |

**The deviation register is D1–D4, D7, D8, D10–D13 — thirteen, not nine.** `BASELINE.sha256:2` and the
generated `DEVIATIONS.md` are correct; `docs/plans/artifact-parity-rebuild.md` and `AGENTS.md` both
stop at D9 and are stale. Any triage anchored on nine silently drops D10 (font-subset alignment),
D11 (`.crow` column widths), D12 (typography/wrapping) and D13 (link affordance).

**Correct regeneration order** — G1 fails the moment the oracle is regenerated and stays red until
step 4, so this sequence is not optional:

1. recover new artifact into `docs/design/artifact-source/`
2. rewrite the D-set in `make-adjusted-oracle.mjs` against the new markup
3. `node make-adjusted-oracle.mjs`
4. regenerate `BASELINE.sha256` — **no generator exists; one must be written**
5. update `EXPECTED_PINS` in `gates.mjs:87`

---

## 3. Pre-work — starts now, needs no design URL

All of it is design-agnostic, all of it is currently missing, and all of it reduces risk during the
highest-churn operation this repo will undergo. This is the work I would do while waiting.

| # | Task | Why it cannot wait | Owner |
|---|---|---|---|
| P1 | `git tag -a pre-redesign-2026-09-09 dc771cc` and push | Only tags are `pre-artifact-rebuild` / `pre-ui-audit-fixes`, neither on the deployed commit. No rollback anchor exists. | DevOps |
| P2 | `touch .nojekyll` + commit | Pages `build_type` is **legacy (Jekyll)**. Any `_`-prefixed directory the new design ships is silently dropped in production and works fine on localhost. | DevOps |
| P3 | `robots.txt` disallowing `/docs/` and `/tools/`; `noindex` stamped into the oracle generator's output | **Verified live:** `oracle-vi.html` → 200, 69,892 B, indexable — a full duplicate of her portfolio on her CV domain. `gates.mjs`, `BASELINE.sha256`, the plan doc are all 200 too. | SEO |
| P4 | `404.html` | Currently a 9,379 B Jekyll default on a custom-domain CV site. | SEO |
| P5 | Write `tools/recover-artifact.mjs` | The byte-exact decode exists only as prose, and the prose is wrong about the mechanism. Must fail non-zero on a tampered payload. | Frontend |
| P6 | Write `tools/gen-baseline.mjs`, derive `EXPECTED_PINS` from the manifest | Step 4 above has no tool; the count is hand-maintained in two places. | QA |
| P7 | Lift the Chromium pin into one shared module; resolve via `chromium.executablePath()` | Pinned to revision 1228 in **six files**; `playwright-core` is locked at 1.62.1 which ships 1234. Works here only on a leftover cache — any clean clone or CI runner gets ENOENT. This is what blocks CI. | QA |
| P8 | Delete `prove.mjs`; fix `measure.mjs`'s dead selector; fix the `capture.mjs` reference at `gates.mjs:14` | Three tools that **cannot fail**. `prove.mjs` queries `image-slot` (0 matches; oracle uses `data-fslot`) so it always reports 100%, and `README.md:35` documents it as a live step. | QA |
| P9 | `@media print` rule + a print gate | 25 of 25 reveal blocks print blank. Recruiters print. | Frontend |
| P10 | Raise `RETAIN` for the duration, or iterate on a throwaway copy | `RETAIN=3`; three release runs during a rebuild evict the currently-live generation and `release.mjs:204` deletes the files. | DevOps |
| P11 | Stand up `/preview/` on master with its own hashed assets | There is no staging. `verify-deployed.mjs` already takes a base URL as `argv[2]`, so it runs against a preview unchanged. Otherwise the first time the redesign meets a real HTTPS origin is when it becomes her live CV. | DevOps |
| P12 | Track `AGENTS.md` | It is gitignored (`.gitignore:16-17`). The one document that says "read before changing anything visual" is absent from a fresh clone. | PM |

P1–P4 are minutes. P5–P8 are the ones that decide whether Stage B is a week or a month.

---

## 4. Stage gates, with abort criteria

The previous plan had one mode. This one stops in three places.

### Stage A — Freeze the artifact (day 1, ~1 hour)

1. Fetch the artifact through the iframe origin, decode `template` + `manifest`.
2. **Write the raw payload to `docs/design/artifact-source-v2/SNAPSHOT/` and sha256 it.** From here
   on, the snapshot is the upstream. Nothing re-fetches.
3. Record the snapshot hash, the fetch timestamp and the rotating token in `SNAPSHOT/PROVENANCE.md`.

> **Exit criterion.** A byte-exact snapshot exists and re-decoding it reproduces the same hashes.
> **If it does not:** STOP. Do not proceed to Stage B. Re-scope to the design-informed track (§4.1)
> and tell the owner the rigor cost in writing before continuing.

### Stage A.5 — Delta report (day 1, ~1 hour) — **the gate that decides the budget**

Diff the snapshot against `docs/design/artifact-source/` with asset UUIDs normalised. Produce a
written report: template CSS diff, per-module diffs, added/removed section ids, added/removed
folders, added/removed campaigns, new UI string keys, changed media queries, changed `:root` tokens.

> **Branch on the result.**
> - **Small delta** (sections added, tokens unchanged, mechanism unchanged) → *extend* path.
>   Amend the D-set, add renderers, keep the oracle pipeline. Days, not weeks.
> - **Large delta** (new IA, new token set, different bundling) → *rebuild* path, as §2.
>
> Committing to the rebuild path without this report is the single largest avoidable cost in the
> project. Present the report to the owner before choosing.

### Stage B — Derive deviations **by measurement, not by triage**

Run G6 (contrast), G3 (overflow) and G7 (assets) against the **pristine new oracle, before touching
`make-adjusted-oracle.mjs`.** The failure list *is* the D1 specification.

Carry forward the **rule**, never a hex value: *section colour as a surface keeps its artifact value;
as text it uses a darkened variant of the same hue.* The old artifact produced 42 contrast failures;
a fresh one will produce its own set. The new `xfile` folder ships `c:"#C6C3B8", t:"#43423B"` and
**no `tc`** — the surface/text split has to be re-derived for it from scratch.

The fail-loud throws in `make-adjusted-oracle.mjs` fire only when an anchor **disappears**. They
cannot fire for a new surface that needs a new deviation. A rebuilder who runs the script, sees no
throws and a familiar log will conclude the set transferred when `.certcap`, the tinted `.certstage`
and the `#xfile` panel are audited by nobody. That is why the order is inverted.

`D3 has grown, not gone.` The new artifact's `CLogo` component consumes `brands/*.png` **per campaign**
in addition to the brand wall — the same family that 404s in the artifact. G7 only observes requests
the candidate makes, so porting the brand wall's D3 and missing `CLogo` ships broken images per
campaign row and every gate stays green.

### Stage C — Build, gate, review, ship

Per-section, against the adjusted oracle at full strictness. Every round goes through the review loop
in §8. Ship through `/preview/` first (P11), never straight to the apex domain.

> **Exit criterion.** All blocking gates green on `/preview/` at the real HTTPS origin, plus the
> owner's sign-off on the delta report's content decisions.

### 4.1 The fallback, written down in advance

If Stage A cannot produce a byte-exact oracle, G1, G2, G4 and G5 all collapse — four of nine gates,
and every gate that references the design at all. The project then becomes:

- **Kept:** G3 overflow, G6 contrast, G7 assets, G9 release verification, all functional checks, the
  print gate, the WebKit smoke pass.
- **Lost:** geometry parity, pixel parity, token parity, baseline integrity.
- **Compensating:** full-page screenshot oracle at each breakpoint with a loosened geometric gate, and
  a written design review against the artifact by eye — recorded in `DEVIATIONS.md` as a rigor
  downgrade, not waved through.

This is worse and the plan says so. The point is that the decision is made now, at zero sunk cost,
rather than under schedule pressure three weeks in.

---

## 5. The content track — runs ahead of the build, and gates it

**This track matters more to callbacks than the redesign does.** Verified findings:

| Finding | Evidence |
|---|---|
| All 23 media slots empty | `"src"` appears 0 times in `config.json` |
| 14 of 15 campaign result cells are metadata, not outcomes | dates and role labels where results belong |
| CV PDF 3+ months stale, contradicts the site both ways | misspellings `Profesionnel`, `Canvas`; metadata leaks Canva scaffolding and scrambles her name; 1.2 MB for one A4 page |
| `Clinique` claimed on the brand wall with no supporting evidence anywhere | credibility risk on a document used for hiring |
| No per-campaign evidence link | one generic Drive folder is the only proof route |
| `<h1>` is the word "Portfolio"; her name is a `<p>` | SEO and screen-reader identity |
| No JSON-LD `Person`, no sitemap | invisible to structured-data consumers |
| Zero telemetry | no way to know a recruiter visited |

### The one step that silently degrades the CV

**Reseeding `config.json` from the new artifact's content modules.** The artifact's modules are a
plausible content source — it is how the last port was seeded — and they carry the *design author's
draft copy*, not the owner's verified copy. Three of the last five commits (`ebb74e0`, `cda7f12`,
`dc771cc`) are owner copy edits that exist **only** in `config.json`.

A reseed passes every gate. G2/G4 compare against an oracle built from the same artifact, so artifact
copy matches artifact copy perfectly; G3, G6, G7 and G9 are copy-blind.

> **Rule, non-negotiable.** Freeze the current `config.json` as the content baseline **before any
> artifact content is read.** Migrate forward from it. New artifact content may only **add** keys,
> never overwrite an existing leaf. Every overwrite is an explicit owner decision, logged like a
> deviation.

### Owner-supplied deliverables (blocking)

These are the items no agent can produce. They gate Stage C.

1. Campaign imagery for the media slots — or an explicit decision to ship fewer, fuller campaigns.
2. Real outcome numbers for the 15 campaign result cells.
3. A decision on `Clinique` — evidence, or remove it.
4. VI + EN copy for the new `xfile` section and campaign 06 `newsletter`, if they ship.
5. Certificate images the new `.certstage` CSS implies.
6. A refreshed CV PDF, **and an EN CV PDF** (new, per D-d).

---

## 6. Roles — defined as artifacts that can fail, not as perspectives

The adversarial pass made a point worth adopting. Five auditors ran as the same model, in the same
session, with the same tools; three of five independently rediscovered the same two findings, and all
five accepted the one premise that turned out to be false. **On a solo-operator project, personas
cannot manufacture independent perspectives — they can only manufacture files.**

So a role here owns an **executable that can return non-zero**, not an opinion.

| Role | Owns | Its deliverable fails when |
|---|---|---|
| **PM** | `docs/plans/` · the delta report · the deviation register as single source | The register disagrees with `DEVIATIONS.md`, or a stage ships without its exit criterion met |
| **Design** | `make-adjusted-oracle.mjs` · the D-set · token parity | A deviation has no measured justification, or G5 drifts |
| **Frontend** | `tools/recover-artifact.mjs` · `index.js` renderers · `index.css` | Recovery does not fail non-zero on a tampered payload; a renderer hardcodes a human-readable string |
| **Content** | `config.json` · VI/EN structural parity · NFC coverage | A leaf is overwritten without a logged decision; VI and EN diverge structurally |
| **A11y** | G6 · keyboard traversal · reduced-motion · screen-reader semantics | Any AA failure, or Tab cannot reach a control |
| **QA** | `gates.mjs` · `functional.mjs` · the self-test runner | A gate passes vacuously when its target does not exist |
| **DevOps** | `release.mjs` · `/preview/` · rollback · CI | `--check` passes on an inconsistent set, or rollback is not executable |
| **SEO** | `robots.txt` · JSON-LD · hreflang · `/en/` | The oracle is indexable, or EN has no shareable identity |
| **Reviewer** | Codex via `crossagent` (§8) | It returns a BLOCKER and the round proceeds anyway |

**Independence lives in the Reviewer row and nowhere else.** Every other row is me. Calling the rest
"independent verification" would be the failure the review rule exists to prevent.

---

## 7. The EN track (D-d)

GitHub Pages serves static files with no server, so a genuine hreflang pair means a real second
document.

- `/en/index.html` — its own shell, `<html lang="en">`, EN `<title>`/description/OG, forcing EN at boot.
- Reciprocal `<link rel="alternate" hreflang="vi|en|x-default">` on both documents.
- Both load the same hashed `config.<h>.json`; only the shell differs. No content duplication.
- `og:image` currently a 1440×1800 portrait served into a `summary_large_image` card — needs a 1.91:1 crop.
- EN CV PDF is an owner deliverable.

**Open risk:** if the new artifact ships **VI only**, `oracle-en.html` cannot exist and EN drops from
four oracle-backed gates to zero — while the suite still prints green, because absent gates do not
fail. Decide before commissioning: either the artifact ships both languages, or EN becomes an
explicitly unoracled tier with named compensating gates. Given D-d, the first is the right answer, and
it needs to be stated to whoever edits the artifact.

---

## 8. Cross-LLM review — Codex via crossagent, verified working today

The global rule bans `crossagent start --agent codex` on a `status=failed` from 2026-08-27/28. **That
ban is stale on two counts**, verified this session:

- crossagent 0.1.5 has no `start` subcommand — the banned command is from an older CLI.
- The failure is not the adapter. `~/.codex/config.toml` sets `model = "gpt-6-astra"`; the installed
  codex CLI 0.149.1 rejects it with `400 … requires a newer version of Codex` (npm latest is 0.153.4).

**Working invocation** — round-tripped successfully:

```bash
crossagent --agent codex --name <session> --model gpt-5.6-terra \
  --prompt-file <file> --cwd <repo root>
```

`gpt-5.4-codex` and `gpt-5-codex` are both rejected — *"not supported when using Codex with a ChatGPT
account."* Do not assume a `-codex` suffix is available.

**The loop, per stage:** plan → Codex reviews → Opus executes → Codex reviews. Codex labels findings
BLOCKER or NONBLOCKING; only blockers force another round. At most 3 reviewer responses per stage;
unresolved blockers after the third escalate to the owner rather than spin. Fall back to the DeepSeek
ladder in the `codex-review-loop` skill if the pin also fails.

---

## 9. Definition of done

Written before the artifact arrives, because *"parity with the new artifact"* is circular once the
artifact is in hand and every inconvenient difference becomes re-litigable as an intended deviation.

**Blocking:**
- G1–G9 green, VI **and** EN, at every parity viewport derived from the new artifact's own media
  queries (not the hardcoded 901/900 — the new one declares 900, 760 **and** 620).
- All functional checks green, plus the new print gate and a WebKit smoke pass.
- G4's pixel budget **re-derived from the new oracle's own measured noise floor**, not copied. The
  current budget has 3×–11× slack: a missing 45×45 px element passes.
- `release.mjs --check` green; `verify-deployed.mjs` green against `/preview/` at the real origin.
- Zero AA failures. Zero failed requests. Zero horizontal overflow, page and every modal.
- `DEVIATIONS.md` is the single source; the plan and `AGENTS.md` reference it rather than restate it.

**Non-blocking but tracked:** JS size (the previous plan missed both its budgets and the recorded
miss is itself stale), telemetry, sitemap.

**Explicitly out of scope:** dark mode, contact form, custom cursor, analytics beyond a single
privacy-respecting counter, new photography.

---

## 10. Known unresolved

1. **Whether the URL you send is `54559e05` or a different artifact.** Stage A.5 answers it in an hour.
2. **Whether the artifact ships EN.** Must be settled before Stage B (§7).
3. **Artifact access.** `54559e05` lists as **(shared)**, not (mine), so `Artifact action:"read"`
   returns an isolated summary rather than raw HTML. Recovery therefore goes through the iframe
   origin, as it did last time. If you want the Artifact tool path available as a backup, the
   artifact needs owner-level sharing to `duy.pham@ringkas.homes`.
4. **The `claude_design` MCP is down** (`FIRST_PARTY_AUTH_REJECTED`). Run `/design-login` before
   sending the URL. It is not on the critical path — recovery does not depend on it — but it removes
   a fallback.

---

## 11. What I need from you to start

- **Now:** approval to begin the §3 pre-work. None of it touches the design and all of it is missing.
- **With the URL:** confirmation of whether the new artifact ships EN (§7).
- **Before Stage C:** the six owner deliverables in §5.
