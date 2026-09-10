# Portfolio v3 — SHIPPED

**Live:** https://thucanhtrantonnu.com/ (English) · https://thucanhtrantonnu.com/vi/ (Vietnamese)
**Deployed:** 2026-09-10, master `639674e`
**Rollback:** `git reset --hard pre-redesign-v3 && git push --force-with-lease` — the tag is pushed.
Revert whole commits: `release.mjs` prunes unpinned hashed assets, so reverting index.html alone
can 404.

## Verified on production, not on localhost

| | |
|---|---|
| Horizontal overflow @ 320/375/390/768/900 | **0px** — both documents, all six campaign sheets |
| WCAG AA — page | **0 failures**, EN and VI |
| WCAG AA — inside campaign sheets | **0 failures** |
| Keyboard-reachable controls | 39 · **0** clickable-but-unfocusable |
| Console errors / failed requests | **0 / 0** |
| Previous generation still resolving | css, js, config and all 10 fonts — **200** |

## Still open — none of it blocks anything

1. **Eight campaign images** — `ppd` (1), `matrix` (2), `gloss` (2), `pickleball` (3). Captions are
   already written in config; adding an image is one command each. Run
   `node tools/build/subset-fonts.mjs --check` afterwards if any caption text changes.
2. **Campaign outcome numbers.** Five of six campaigns are headed "Scope & role" rather than
   "Results" because their cells hold dates and role labels. Flip a campaign's `outcomes` flag to
   `true` once it has a real number. This is the single highest-value change left.
3. **LinkedIn is on the site but not in the CV PDF** — Canva export, has to be added there.
4. **A Vietnamese CV does not exist.** Both PDFs supplied were English; `/vi/` serves the English
   one.
5. **The folder-stack compaction** described below, if wanted.

## The local `redesign-v3` branch must never be pushed

It carries 22 commits whose history includes the *filenames* of a removed internal-use document
and one commit message describing what that document contained. The image data itself is purged
and verified absent, but the repo is public, so master received a squash instead. Delete the
branch or leave it local; do not push it.

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
