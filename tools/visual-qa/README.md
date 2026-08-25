# Visual QA harness

Dev-only. Never loaded by the site; `index.html` has no dependency on any of this.

## What it compares

`docs/design/artifact-source/reference/oracle-vi.html` and `oracle-en.html` are **static pixel
oracles** — the recovered Claude Design artifact with every React inline style intact, the
`image-slot` shadow DOM flattened and scoped under `[data-fslot]`, and zero JavaScript. Being
static, they cannot race fonts, animations or JSX compilation.

## Determinism

`shoot.mjs` pins everything that can move a pixel:

| Pinned | Why |
|---|---|
| `chromium_headless_shell-1228` (explicit `executablePath`) | browser build drift changes glyph rasterisation |
| `--hide-scrollbars` | otherwise a 1440 viewport captures at 1425 |
| `--disable-lcd-text`, `--font-render-hinting=none`, `--disable-font-subpixel-positioning` | grayscale AA instead of subpixel |
| `--force-color-profile=srgb`, `deviceScaleFactor: 1` | colour + DPR stability |
| `locale vi-VN`, `timezone Asia/Ho_Chi_Minh`, `colorScheme light`, `reducedMotion reduce` | content and theme stability |
| `document.fonts.ready` + settle delay | no FOUT mid-capture |
| animations/transitions/caret forced off, `.reveal` forced visible, scroll reset to 0 | no in-flight state |

## Usage

```bash
npm install
python3 -m http.server 8900          # from repo root, in another shell

node shoot.mjs   <url> <out.png> <width> [full]   # deterministic capture
node measure.mjs <url>                            # per-section geometry + overflow
node diff.mjs    <a.png> <b.png> <diff.png>       # hard-fails on dimension mismatch
node prove.mjs   <a.png> <b.png>                  # classify diffs inside/outside known-delta regions
```

## Acceptance is geometry-first, pixels-second

A whole-page percentage can hide a missing control in background whitespace, so a percentage is
never the only gate:

1. `measure.mjs` — every section height must match the oracle exactly, and `scrollWidth === clientWidth`.
2. `diff.mjs` — dimensions must be equal; it exits 2 rather than rescaling.
3. `prove.mjs` — diffs are classified against known-delta boxes (image slots, brand wall).
   The budget applies to **pixels outside** those boxes.

## Validated baseline (oracle vs live React artifact, 1440 full page)

```
total diff      11,983 px   0.0952%
inside slots    11,771 px   98.2%   <- placeholders replaced by real content
outside slots      212 px   0.0017% <- subpixel AA on one CV text line
```

The 212 px come from React splitting `— {d}` into two text nodes where serialized HTML has one;
merged vs split text runs get different subpixel glyph positioning. This is the noise floor —
budgets are set relative to it, not to zero.

## Negative-test matrix

A gate that has never been shown to fail is not a gate. Every row below was executed against this
repo; each was a real false-pass found in adversarial review (Codex Sol, rounds 5–7) and each is now
blocked. Re-run any of them before trusting a change to the tooling.

### `tools/release.mjs --check`

| Spoof | Why it used to pass | Now |
|---|---|---|
| `data-rel` / `data-href` / `data-src` only | `\brel=` also matches `data-rel=` — `\b` sits between `-` and `rel` | exit 1 |
| `<link-spoof>` / `<script-spoof>` | `<(link\|script)\b` matches `<link-spoof` for the same reason | exit 1 |
| asset tags inside `<textarea>` | raw HTML scanned without browser context | exit 1 |
| **unclosed** `<textarea>` before the real tags | stripping handled only *paired* elements | exit 1 |
| `type='text/plain'` single-quoted | quoting styles not all handled | exit 1 |
| duplicate `rel`, benign value first | parser kept the **last** value; browsers keep the **first** | exit 1 |
| NBSP as an attribute separator | JS `\s` matches NBSP; HTML whitespace does not | exit 1 |
| NBSP inside a `rel` token list | `rel` split on `\s` | exit 1 |
| `index.js` edited, not re-released | freshness checked CSS only | exit 1 |
| `index.css` / `config.json` edited, not re-released | — | exit 1 |
| source `CONFIG_URL` edited | the transform overwrote the value **before** hashing, masking the edit | exit 1 |
| `CONFIG_URL` only inside a comment | line anchoring proves position, not execution context | exit 1 |
| commented `CONFIG_URL` decoy **before** the real one | the rewrite hit the first textual match | decoy untouched, real one rewritten |
| retained asset deleted | manifest entries trusted without checking they exist | exit 1 |
| retained JS pointing at another generation's config | files hashed independently, pairing unchecked | exit 1 |
| stale `rel=preload as=fetch` config hash | preload not owned by the release tool | exit 1 |
| orphaned hashed asset on disk | — | exit 1 |

### Gate G8 (reader flow)

| Spoof | Why it used to pass | Now |
|---|---|---|
| `.nav-cv{display:none}` | presence checked, not visibility | FAIL |
| `.nav{position:static}` | persistence never asserted | FAIL |
| `.nav.is-scrolled .nav-cv{opacity:0}` | post-scroll check omitted opacity | FAIL |
| `.nav-cv{left:-9999px}` | opacity and dimensions survive off-screen | FAIL |
| `href="…CV.pdf.not-a-pdf"` | substring match | FAIL |
| `href="https://evil.example/…/CV.pdf"` | `endsWith('/'+path)` | FAIL |
| `href="javascript:0//…/CV.pdf"` | same | FAIL |

Visibility is now: computed `display`/`visibility`, cumulative ancestor `opacity` > 0.05, non-zero
box, on-screen geometry, **and** an `elementFromPoint` hit-test so a clipped or covered element
cannot pass. Link targets are resolved against the page origin and compared by exact `pathname`.


## Why the static release gate is no longer the authority

Eight rounds of adversarial review established something worth writing down: **a hand-rolled HTML
parser cannot be finished.** Each fix closed the reported case but not its equivalence class —
unclosed elements, spoofed tag names, tags inside attribute values, unclosed comments, NBSP in token
lists, and so on, indefinitely. Worse, deciding *which value reaches* `fetch(CONFIG_URL)` from source
text is undecidable in general: a template literal, a dead branch, or a runtime-assembled string all
defeat it.

The demonstration, run against this repo:

| | `release.mjs --check` (static) | `verify-deployed.mjs` (browser) |
|---|---|---|
| `CONFIG_URL` decoy in a template literal, live code doing `['config','.json'].join('')` | **exit 0 — spoof passed** | **exit 1** — *"the page fetched MUTABLE config.json"* |

So the roles are now split:

- **`tools/release.mjs --check`** — a fast static pre-flight. Useful, not trusted.
- **`tools/visual-qa/verify-deployed.mjs`** (gate **G9**) — **the authority.** It loads the page in a real
  browser and observes what actually happened:
  - `document.styleSheets` — the stylesheet the engine *applied*
  - the network log — the config the page *fetched* (fails on mutable `config.json`)
  - executed scripts — the JS that actually *ran*, plus proof the renderer produced DOM
  - `document.baseURI` and any `<base>` — a `<base href>` silently repoints every relative URL
  - **pixel truth** for the CV button: photograph its box, delete the element, photograph again.
    Identical images mean it renders nothing. `display`, `visibility`, `opacity`, geometry and
    hit-testing are each individually defeatable — `filter:opacity(0)` leaves all of them intact.

A browser is a spec-compliant parser, so every parser-spoof class collapses at once instead of one
regex at a time.

### Round-8 spoofs, all blocked by browser truth

| Spoof | Static gate | Browser |
|---|---|---|
| closed `<textarea>` then unclosed one holding the only assets | passed | **exit 1** |
| assets only inside a quoted attribute value | passed | **exit 1** |
| unclosed `<!--` before the assets | passed | **exit 1** |
| `<base href="https://evil.example/">` | n/a | **exit 1** |
| `filter:opacity(0)` on the CV button | n/a | **exit 1** (*renders NOTHING*) |
| template-literal `CONFIG_URL` decoy + runtime-assembled real value | **passed** | **exit 1** |

## Run destructive tests in a sandbox, never against the live tree

A spoof test once **poisoned a retained release generation**. Injecting a template-literal
`CONFIG_URL` decoy and running `node tools/release.mjs` produced a hashed JS whose live code
assembled mutable `config.json`; restoring the source and re-releasing then *retained* that poisoned
artifact as an older generation. `release.mjs --check` reported it as verified, G9 only inspected
generation 0, and committing would have shipped it — reachable by any browser holding an older
`index.html`.

Two changes came out of that:

1. **G9 and `release.mjs --check` now validate every retained generation**, not just the newest:
   each must contain exactly **one** `CONFIG_URL` assignment and it must be a plain hashed string
   literal. A decoy plus a runtime-assembled value fails structurally.
2. **Spoof tests run in a throwaway copy of the repo**, served on its own port:

```bash
SB=$(mktemp -d)
(cd "$REPO" && tar cf - index.html index.css index.js config.json manifest.json \
  release-manifest.json index.*.css index.*.js config.*.json fonts images downloads icons tools \
  docs/design) | (cd "$SB" && tar xf -)
ln -sf "$REPO/tools/visual-qa/node_modules" "$SB/tools/node_modules"
(cd "$SB" && python3 -m http.server 8901 &)
# attack $SB, never $REPO
```

### Round-9 spoofs, all blocked

| Spoof | Now |
|---|---|
| poisoned **retained** generation (not generation 0) | exit 1 — *"CONFIG_URL assignments, need exactly 1"* |
| right filename, bytes tampered after release | exit 1 — *"does not hash to its filename"* |
| **mobile-only** `filter:opacity(0)` on the CV button | exit 1 — *"[mobile] CV button renders only 0 px"* |

G9 also now: hashes **response bodies** and compares them to disk (a redirect, cache, or server
substitution cannot serve the right name with different bytes); reads the executed code's own
`CONFIG_URL` via a `window.__PORTFOLIO_BUILD__` beacon rather than inferring it from a request;
blocks service workers and fails if one controls the page; rejects redirects and inline
`<script>`/`<style>`; requires a **meaningful** pixel area (≥120 px) for the CV button; and runs at
**both** 1440 and 390.

One trap worth remembering: the pixel probe first reported **0 px** for a perfectly visible button.
`.btn` has `transition:all`, and **`visibility` is transitionable** — it flips discretely at the
transition midpoint, so the probe was reading the pre-change value. Transitions are now suppressed
before probing, and the probe asserts the hide actually took effect.
