# Project Memory

Last reviewed: 2026-05-17.

## Purpose

This is a static personal portfolio for Trần Tôn Nữ Thục Anh, positioned as a beauty marketing professional and Business Administration student. Tone should stay polished, warm, and career-focused, with emphasis on beauty, brand storytelling, livestream commerce, KOL work, and measurable marketing results.

## Stack

- Static HTML, CSS, and vanilla JavaScript. No framework.
- No `package.json`, no build step, no local dependency install needed.
- Runtime content loads from `config.json` using `fetch("config.json")`.
- External browser dependencies:
  - Google Fonts: Playfair Display and Inter.
  - Font Awesome 5.15.4 from CDN.
  - AOS 2.3.1 from unpkg.
  - body-scroll-lock 3.1.5 from jsdelivr.
- PWA metadata lives in `manifest.json`.
- GitHub Pages custom domain lives in `CNAME`: `thucanhtrantonnu.com`.

## Important Files

- `index.html`: semantic section shells, nav, hero, contact form, CDN links, `data-config` placeholders.
- `index.css`: full visual system, responsive behavior, light/dark themes, cursor, cards, timeline, mobile menu.
- `index.js`: device detection, custom cursor, theme persistence, navigation scroll state, mobile drawer, mailto contact form, config loading, dynamic section rendering.
- `config.json`: source of truth for portfolio text, work history, project cards, contact details, image paths, and social links.
- `images/avatar.jpg`: profile image, 1440x1800 JPEG.
- `icons/`: active PWA/favicons used by HTML and manifest.
- `generate_icons.py`: Pillow script that regenerates `icons/` with layered `TA` monogram.
- `IconKitchen-Output/` and `IconKitchen-Output.zip`: ignored/generated app icon export, not part of active site.
- `.pnp.cjs`, `.pnp.loader.mjs`, `.yarn/`, `.superpowers/`: currently untracked local/tool artifacts, not project source.

## Run And Verify

Use a local HTTP server because `config.json` is loaded with `fetch`; opening `index.html` directly can fail in some browsers.

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Quick checks:

```bash
python3 -m json.tool config.json >/dev/null
python3 -m json.tool manifest.json >/dev/null
```

No automated tests exist.

## Content Model

Prefer editing portfolio content in `config.json`, not `index.html`.

Main keys:

- `fullName`, `firstName`, `pageTitle`
- `hero`
- `about`
- `education.educationHistory`
- `portfolio.projects`
- `experience.workHistory`
- `skills.skillList`
- `activities.activityList`
- `achievements.achievementList`
- `contact`

Current profile highlights:

- Full name: `Trần Tôn Nữ Thục Anh`
- Positioning: beauty marketing, digital strategy, livestream commerce, brand storytelling.
- Education: University of Economics and Finance, HCMC, Business Administration, 2021-2025.
- Current role: L'Oréal Vietnam, Professional Products Division, Online Marketing Intern, Jun 2025-Present.
- Contact email: `thucanh.ttn@gmail.com`
- Phone: `(+84) 797 038 080`
- Location: Ho Chi Minh City, Vietnam.

If adding/removing sections, update all three places together:

1. Section markup in `index.html`.
2. Renderer or placeholder handling in `index.js`.
3. Layout and responsive styles in `index.css`.

## Runtime Behavior

- Theme is stored in `localStorage` under `theme`; initial theme is set inline in `index.html` before CSS renders.
- Desktop gets a custom cursor. Mobile disables cursor and uses native cursor/touch behavior.
- Desktop navigation is a fixed left icon rail, width from `--nav-width`.
- Mobile navigation uses a fixed top bar and full-width slide-in drawer.
- Active navigation state is computed from scroll position with throttling.
- Contact form creates a `mailto:` URL. There is no backend submission.
- LinkedIn and Facebook contact rows open URLs from `config.json`.
- Dynamic renderers use template strings and `innerHTML`; current `config.json` is trusted local content. If content ever becomes user-provided, rewrite renderers to use DOM nodes and `textContent`.
- AOS is initialized after config applies. CSS also forces `[data-aos]` visible, and JS has a fallback to avoid hidden content if AOS fails.

## Design Language

- Current visual direction: Feng Shui Mộc, Dương Liễu Mộc, jade and navy.
- Light palette starts with:
  - `--primary: #0A6E5C`
  - `--accent: #1E3A5F`
  - `--bg: #F4F8F6`
- Dark palette starts with:
  - `--primary: #3AAFA9`
  - `--bg: #0F1A1E`
  - `--card: #1A2B2E`
- Fonts:
  - Display: Playfair Display.
  - Body: Inter.
- Keep rounded, refined portfolio feel. Existing cards use 16-24px radii and soft jade/navy shadows.
- Existing README has an older blue-theme note in the theme section; trust `index.css` for current colors.

## Asset Notes

To regenerate active icons:

```bash
python3 generate_icons.py
```

Requires Pillow:

```bash
python3 -m pip install Pillow
```

Generated active outputs:

- `icons/favicon.ico`
- `icons/apple-touch-icon.png`
- `icons/icon-192.png`
- `icons/icon-512.png`
- `icons/icon-192-maskable.png`
- `icons/icon-512-maskable.png`

## Maintenance Rules

- Keep `config.json` valid JSON. No comments or trailing commas.
- Keep section IDs aligned with nav links: `about`, `education`, `portfolio`, `experience`, `skills`, `activities`, `achievements`, `contact`.
- Preserve Vietnamese names and accents.
- Avoid adding build tooling unless project grows beyond static needs.
- Do not rely on `README.md` alone for current design facts; inspect `index.css` and `config.json`.
- Ignore unrelated untracked local artifacts unless user asks to clean repository state.
