#!/usr/bin/env node
// Capture the same shots from a base build and a branch build, and write the
// manifest that compose.mjs reads.
//
//   node capture.mjs <shots.mjs> --before=<base url> --after=<branch url>
//                    [--side=before|after] [--only=<slug>[,<slug>]]
//
// Run it from the project root: `playwright` (or `@playwright/test`) must resolve
// there, and the output folder is named after the repository and branch found there.
//
// Everything is written to one folder, never anywhere else:
//
//   ~/Documents/before-after/<repository>/<branch>/
//     shots/<slug>.before.png, shots/<slug>.after.png
//     manifest.json      (input for compose.mjs)
//     shots.mjs          (a copy of the spec, for later recaptures)
//
// Set the BEFORE_AFTER_DIR environment variable to use another root than
// ~/Documents/before-after; <repository>/<branch>/ is still added below it.
//
// A later run for the same branch reuses the folder and overwrites the shots it retakes.
// The last line of output is the folder's path.
//
// --side captures one side only. Use it when both builds must be served from the
// same origin (login state, allowed origins): serve the base, run with
// --side=before, swap the server, run with --side=after. The manifest is written
// from whatever files exist in the folder's shots/ after each run.
//
// <shots.mjs> is a module you write per branch. Its default export:
//
// export default {
//   title: "Visual changes on fix/foo vs main",
//   subtitle: "Desktop 1280×800, light theme, mocked holdings response",
//   // Defaults for every shot. Any Playwright browser context option works here.
//   context: { viewport: { width: 1280, height: 800 }, colorScheme: "light",
//              locale: "en-GB", timezoneId: "Europe/London",       // your app's
//              storageState: "path/to/auth-state.json" },           // a saved login (optional)
//   time: "2026-01-15T10:00:00Z",       // freezes the clock (optional)
//   shots: [
//     {
//       slug: "holdings-loading",            // file name; unique
//       label: "Holdings table, loading cell",
//       note: "Dash replaced by spinner",
//       path: "/holdings",                   // appended to the side's url
//       context: { colorScheme: "dark" },    // per-shot overrides (optional)
//       // Runs before navigation. Put route interception here, so both sides
//       // get the same data. `side` is "before" or "after".
//       mock: async (page, side) => {
//         await page.route("**/api/holdings", (route) =>
//           route.fulfill({ json: fixedPayload }));
//       },
//       // Runs after the page has settled: open the sheet, hover, focus, type.
//       steps: async (page, side) => { await page.getByRole("button", { name: "Sort" }).hover(); },
//       target: (page) => page.getByRole("table"),  // or a selector string; omit for the viewport
//       padding: 16,                         // CSS px of context around the target (default 16)
//       only: "after",                       // the screen exists on one side only (optional)
//     },
//   ],
// };

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const specPath = args.find((a) => !a.startsWith("--"));
if (!specPath) {
  console.error("usage: node capture.mjs <shots.mjs> --before=<url> --after=<url> [--side=before|after] [--only=<slug>,...]");
  process.exit(2);
}
const urls = { before: opt("before"), after: opt("after") };
const sides = opt("side") ? [opt("side")] : ["before", "after"];
const only = opt("only")?.split(",");
if (opt("out")) {
  console.error("--out is not supported: the images always go to <root>/<repository>/<branch>/, where <root> is $BEFORE_AFTER_DIR or ~/Documents/before-after");
  process.exit(2);
}
const git = (...a) => {
  try {
    return execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};
const slug = (s) => s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
// In a worktree the common git dir belongs to the main checkout, which carries the repository's name.
const commonDir = git("rev-parse", "--path-format=absolute", "--git-common-dir");
const repoName = slug(commonDir ? path.basename(path.dirname(commonDir)) : path.basename(process.cwd()));
const branchName = slug(git("branch", "--show-current") || git("rev-parse", "--short", "HEAD") || "no-branch");
const outRoot = process.env.BEFORE_AFTER_DIR
  ? path.resolve(process.env.BEFORE_AFTER_DIR)
  : path.join(homedir(), "Documents", "before-after");
const outDir = path.join(outRoot, repoName, branchName);
const shotsDir = path.join(outDir, "shots");
mkdirSync(shotsDir, { recursive: true });
for (const side of sides) {
  if (!urls[side]) {
    console.error(`Missing --${side}=<url>`);
    process.exit(2);
  }
}

const require = createRequire(path.join(process.cwd(), "noop.js"));
let chromium;
for (const name of ["playwright", "@playwright/test"]) {
  try {
    ({ chromium } = require(name));
    break;
  } catch {}
}
if (!chromium) {
  console.error("Could not resolve playwright from the current directory. Run from the project root.");
  process.exit(2);
}

const spec = (await import(pathToFileURL(path.resolve(specPath)).href)).default;
const SCALE = 2;
// Transitions are switched off with CSS. Animations are handled by the screenshot's
// `animations: "disabled"`: finite ones jump to their end, infinite ones (a shimmer, a
// spinner) are reset to their first frame. Forcing a zero duration in CSS instead leaves
// an infinite animation in an arbitrary frame.
const FREEZE_CSS = `*, *::before, *::after {
  transition-duration: 0s !important; transition-delay: 0s !important;
  caret-color: transparent !important; scroll-behavior: auto !important; }`;

let browser;
try {
  browser = await chromium.launch({ channel: "chrome" });
} catch {
  browser = await chromium.launch();
}

let failed = 0;
for (const shot of spec.shots) {
  if (only && !only.includes(shot.slug)) continue;
  for (const side of sides) {
    if (shot.only && shot.only !== side) continue;
    const file = path.join(shotsDir, `${shot.slug}.${side}.png`);
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
      ...spec.context,
      ...shot.context,
      deviceScaleFactor: SCALE,
    });
    const page = await context.newPage();
    try {
      if (spec.time) await page.clock.install({ time: new Date(spec.time) });
      await shot.mock?.(page, side);
      await page.goto(new URL(shot.path ?? "/", urls[side]).href, { waitUntil: "load" });
      await page.addStyleTag({ content: FREEZE_CSS });
      await page.evaluate(() => document.fonts.ready);
      // Apps with polling or a socket never go idle; a short wait is enough then.
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
      await shot.steps?.(page, side);
      const target =
        typeof shot.target === "string" ? page.locator(shot.target) : shot.target?.(page);
      if (target) {
        await target.first().waitFor({ state: "visible", timeout: 10000 });
        await target.first().scrollIntoViewIfNeeded();
        const box = await target.first().boundingBox();
        const pad = shot.padding ?? 16;
        const vp = page.viewportSize();
        const x = Math.max(0, box.x - pad);
        const y = Math.max(0, box.y - pad);
        await page.screenshot({
          path: file,
          animations: "disabled",
          clip: {
            x,
            y,
            width: Math.min(vp.width - x, box.width + box.x - x + pad),
            height: Math.min(vp.height - y, box.height + box.y - y + pad),
          },
        });
      } else {
        await page.screenshot({ path: file, animations: "disabled" });
      }
      console.log(`ok    ${shot.slug}.${side}`);
    } catch (error) {
      failed++;
      console.log(`FAIL  ${shot.slug}.${side}: ${String(error.message).split("\n")[0]}`);
      await page.screenshot({ path: path.join(shotsDir, `${shot.slug}.${side}.FAILED.png`) }).catch(() => {});
    }
    await context.close();
  }
}
await browser.close();

// The manifest lists every shot whose files exist, so a --side or --only run
// keeps the rows captured earlier.
const rel = (slug, side) => {
  const file = path.join(shotsDir, `${slug}.${side}.png`);
  return existsSync(file) ? path.relative(outDir, file) : null;
};
const rows = spec.shots
  .map((s) => ({
    label: s.label,
    note: s.note,
    before: s.only === "after" ? null : rel(s.slug, "before"),
    after: s.only === "before" ? null : rel(s.slug, "after"),
    incomplete: !s.only && (!rel(s.slug, "before") || !rel(s.slug, "after")),
    slug: s.slug,
  }))
  .filter((r) => r.before || r.after);
const incomplete = rows.filter((r) => r.incomplete).map((r) => r.slug);
const manifest = {
  title: spec.title,
  subtitle: spec.subtitle,
  scale: SCALE,
  rows: rows.filter((r) => !r.incomplete).map(({ label, note, before, after }) => ({ label, note, before, after })),
};
writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const specCopy = path.join(outDir, "shots.mjs");
if (path.resolve(specPath) !== specCopy) copyFileSync(specPath, specCopy);
console.log(`Wrote manifest.json with ${manifest.rows.length} row(s)`);
if (incomplete.length) console.log(`Not in the manifest yet (one side missing): ${incomplete.join(", ")}`);
if (failed) process.exitCode = 1;
console.log(outDir);
