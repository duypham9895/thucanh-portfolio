// Deterministic screenshot capture.
// Pins: browser build, DPR, viewport, locale, timezone, colour scheme, overlay scrollbars,
// animation suppression, font readiness. Same conditions for oracle and candidate.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [, , url, out, wStr, opts = ''] = process.argv;
const width = parseInt(wStr, 10);
const fullPage = opts.includes('full');

// Pinned browser build — determinism depends on this not drifting.
const EXE = process.env.QA_CHROME
  || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

const browser = await chromium.launch({
  executablePath: EXE,
  args: [
    '--force-device-scale-factor=1',
    '--hide-scrollbars',              // removes the 15px scrollbar that made 1440 -> 1425
    '--force-color-profile=srgb',
    '--disable-lcd-text',             // deterministic AA: grayscale, not subpixel
    '--font-render-hinting=none',
    '--disable-font-subpixel-positioning',
  ],
});
const ctx = await browser.newContext({
  viewport: { width, height: 1000 },
  deviceScaleFactor: 1,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

// kill every source of nondeterminism before capture
await page.addStyleTag({
  content: `*,*::before,*::after{animation:none!important;transition:none!important;
             caret-color:transparent!important;scroll-behavior:auto!important}
            .reveal{opacity:1!important;transform:none!important}
            [class*="tweak" i],[id*="tweak" i],#__claude_design_branding{display:none!important}`,
});
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach((n) => n.classList.add('in'));
  // neutralise scroll-dependent header state
  window.scrollTo(0, 0);
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

const buf = await page.screenshot({ fullPage, animations: 'disabled', scale: 'css' });
fs.writeFileSync(out, buf);
const dim = await page.evaluate(() => ({
  w: document.documentElement.clientWidth,
  sw: document.documentElement.scrollWidth,
  h: document.documentElement.scrollHeight,
}));
console.log(JSON.stringify({ out, width, fullPage, ...dim, overflow: dim.sw - dim.w }));
await browser.close();
