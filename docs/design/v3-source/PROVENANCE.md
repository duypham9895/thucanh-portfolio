# Design provenance — v3

**Source:** Claude Design project `b8e2e5a4-1ed4-444a-81a6-089830b12b02`
**URL:** https://claude.ai/design/p/b8e2e5a4-1ed4-444a-81a6-089830b12b02?file=Portfolio+v3.html
**Target file:** `Portfolio v3.html` → frozen here as `template.html`
**Frozen:** 2026-09-09, from the owner's local export at `~/Downloads/thucanh-portfolio`
**Pinned:** `BASELINE.sha256`, 27 files, verified clean at freeze time

This is a **different source** from the previous port. The live site was ported from Claude Design
*artifact* `54559e05-eda1-4835-9b23-bd439f19e24d`; this is a Claude Design *project*. It is not a
revision of the old artifact and shares no version lineage with it.

## Why a local freeze rather than a live fetch

Claude Design content is mutable and cannot be version-pinned: the iframe origin's `_f/<token>/`
segment rotates and `?__frame_v=manifest.<hash>.json` is ignored — the origin serves current. The
owner's export is therefore the authoritative snapshot. **Nothing in the build re-fetches upstream.**

The `claude_design` MCP was unreachable at freeze time (`FIRST_PARTY_AUTH_REJECTED`). It is not on
the critical path: the export contains every file the project's own import list names.

## Canonical file set

The design's import list, verified complete in the export:

| File | Frozen as | Bytes |
|---|---|---|
| `Portfolio v3.html` | `template.html` | 7,974 |
| `image-slot.js` | `modules/image-slot.js` | 65,350 |
| `portfolio-v2-data.jsx` | `modules/portfolio-v2-data.jsx` | 12,501 |
| `portfolio-v3-app.jsx` | `modules/portfolio-v3-app.jsx` | 28,934 |
| `portfolio-v3-data.jsx` | `modules/portfolio-v3-data.jsx` | 1,706 |
| `portfolio-v3-i18n.jsx` | `modules/portfolio-v3-i18n.jsx` | 17,174 |
| `tweaks-panel.jsx` | `modules/tweaks-panel.jsx` | 25,439 |

Despite the filename, `portfolio-v2-data.jsx` holds the **VI content used by v3** — v3's own data
module carries only `FOLDERS` and `EXTRA`, and the i18n module carries EN plus the UI string table.

`tweaks-panel.jsx` is Claude Design's in-canvas edit tooling. It is frozen for provenance and
**deliberately not shipped**, exactly as in the previous port; its `TWEAK_DEFAULTS` become fixed
config.

## Assets

18 asset paths are referenced by the design and all are frozen: 11 under `assets/`, 7 under
`brands/`, plus `cv.pdf`. The export's `screens/` directory and the rest of `uploads/` are
unreferenced and were not copied.

`brands/*.png` **resolve in this project.** In the previous artifact they 404'd, which is what forced
deviation D3 (brand logos rendered as styled `<span>`). D3 is therefore not carried forward — the
design's `BRANDLOGO` and `CLOGO` maps point at real files.
