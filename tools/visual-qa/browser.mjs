// One place that answers "which browser binary, launched how".
//
// This used to be six copies of a hardcoded path, and the path was Intel-shaped
// (`chromium_headless_shell-<rev>/chrome-mac/headless_shell`). On Apple Silicon the same revision
// unpacks to `chrome-headless-shell-mac-arm64/chrome-headless-shell`, so every gate failed with
// ENOENT on this machine unless QA_CHROME happened to be exported. A determinism pin that only
// resolves on one architecture is not a pin, it is a trap: it turns "the suite did not run" into
// something that looks like an environment problem rather than a bug.
//
// Resolution order, most explicit first:
//   1. $QA_CHROME                       — an operator override, always wins
//   2. the pinned revision, either layout, either binary name
//   3. playwright-core's own resolution — whatever revision this install ships
// Whichever wins is reported by describe(), so a run always states which browser produced it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

export const PINNED_REVISION = '1228';

const CACHE = process.env.PLAYWRIGHT_BROWSERS_PATH
  || path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');

function pinnedCandidates(rev) {
  const out = [];
  for (const dir of [`chromium_headless_shell-${rev}`, `chromium-${rev}`]) {
    for (const platform of ['chrome-headless-shell-mac-arm64', 'chrome-mac-arm64', 'chrome-mac', 'chrome-linux']) {
      for (const bin of ['chrome-headless-shell', 'headless_shell', 'chrome']) {
        out.push(path.join(CACHE, dir, platform, bin));
      }
    }
  }
  return out;
}

export function resolveBrowser() {
  if (process.env.QA_CHROME) {
    if (!fs.existsSync(process.env.QA_CHROME)) {
      throw new Error(`QA_CHROME is set but does not exist: ${process.env.QA_CHROME}`);
    }
    return { path: process.env.QA_CHROME, source: 'QA_CHROME' };
  }
  for (const p of pinnedCandidates(PINNED_REVISION)) {
    if (fs.existsSync(p)) return { path: p, source: `pinned r${PINNED_REVISION}` };
  }
  const fallback = chromium.executablePath();
  if (fallback && fs.existsSync(fallback)) {
    return { path: fallback, source: 'playwright-core default (NOT the pinned revision)' };
  }
  throw new Error(
    `No Chromium found. Looked for pinned r${PINNED_REVISION} under ${CACHE}, then playwright-core's default.\n` +
    `Fix with:  npx playwright install chromium   — or set QA_CHROME to a binary path.`
  );
}

// Rendering determinism. Every one of these changes measured pixels or layout, so they belong with
// the binary rather than at each call site: device scale fixes DPR, hidden scrollbars stop the
// viewport narrowing, sRGB fixes colour, and the three text flags stop subpixel antialiasing from
// making an identical render differ between runs.
export const LAUNCH_ARGS = [
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  '--force-color-profile=srgb',
  '--disable-lcd-text',
  '--font-render-hinting=none',
  '--disable-font-subpixel-positioning',
];

export const CONTEXT = {
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  colorScheme: 'light',
  deviceScaleFactor: 1,
};

export async function launch(extra) {
  const b = resolveBrowser();
  const browser = await chromium.launch({ executablePath: b.path, args: LAUNCH_ARGS, ...(extra || {}) });
  browser.__qaSource = b.source;
  return browser;
}

export function describe() {
  const b = resolveBrowser();
  return `${b.source} → ${b.path}`;
}
