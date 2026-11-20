#!/usr/bin/env node
// Compose before/after screenshots into one table image.
//
//   node compose.mjs <manifest.json> [--diff] [--stack] [--width=1600]
//
// The image is always written beside the manifest, as before-after.png. capture.mjs
// puts the manifest in ~/Documents/before-after/<repository>/<branch>/ (or under
// $BEFORE_AFTER_DIR when that is set), so that is
// where the image ends up. The last line of output is the image's path.
//
// Run it from a directory where `playwright` (or `@playwright/test`) resolves,
// such as the project root. It drives the installed Google Chrome, so no
// Playwright browser download is needed; it falls back to Playwright's own
// Chromium if Chrome is missing.
//
// Manifest (paths are relative to the manifest file; capture.mjs writes one):
// {
//   "title": "Visual changes on fix/foo vs main",
//   "subtitle": "Desktop 1280×800, light theme, mocked holdings response",
//   "scale": 2,                      // device scale factor of the shots (default 2)
//   "rows": [
//     { "label": "Holdings table, loading cell", "note": "Dash replaced by spinner",
//       "before": "shots/holdings-loading.before.png",
//       "after":  "shots/holdings-loading.after.png" },
//     { "label": "New empty state", "note": "Did not exist on the base",
//       "before": null, "after": "shots/empty.after.png" }
//   ]
// }
//
// - `before: null` marks something the branch adds, `after: null` something it
//   removes. The missing side is drawn as a placeholder.
// - Both images of a row are drawn at the same scale, so a size difference in
//   the table is a real size difference.
// - A row whose shots are too wide to sit side by side is stacked (before above
//   after) on its own. --stack stacks every row.
// - For every pair it compares the two images pixel by pixel and prints the
//   share of changed pixels. A pair with 0 changed pixels is not a visual
//   change: the script exits with code 3. With --diff, an extra image shows the
//   changed pixels in magenta over a faded copy of the "after" image.

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const [manifestPath, extra] = args.filter((a) => !a.startsWith("--"));
if (!manifestPath || extra) {
  console.error("usage: node compose.mjs <manifest.json> [--diff] [--stack] [--width=1600]\nThe image is written beside the manifest as before-after.png; no output path is taken.");
  process.exit(2);
}
const outPath = path.join(path.dirname(path.resolve(manifestPath)), "before-after.png");
const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};
const width = Number(flags.find((f) => f.startsWith("--width="))?.split("=")[1] ?? 1600);
const showDiff = flags.includes("--diff");
const stackAll = flags.includes("--stack");

const require = createRequire(path.join(process.cwd(), "noop.js"));
let chromium;
for (const name of ["playwright", "@playwright/test"]) {
  try {
    ({ chromium } = require(name));
    break;
  } catch {}
}
if (!chromium) {
  fail(
    "Could not resolve playwright from the current directory. Run from the project root, or `npm i playwright` in a scratch directory and run from there.",
  );
}

const manifestDir = path.dirname(path.resolve(manifestPath));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const shotScale = manifest.scale ?? 2;
if (!manifest.rows?.length) fail("The manifest has no rows: there is nothing to compose.");

const load = (p, where) => {
  if (p == null) return null;
  const file = path.resolve(manifestDir, p);
  if (!existsSync(file)) fail(`${where}: no such file ${file}`);
  const buf = readFileSync(file);
  if (buf.toString("latin1", 1, 4) !== "PNG") fail(`${where}: ${file} is not a PNG`);
  return {
    url: `data:image/png;base64,${buf.toString("base64")}`,
    w: buf.readUInt32BE(16),
    h: buf.readUInt32BE(20),
  };
};
const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const LABEL_W = 240;
const PAD = 12;
const contentW = width - 64 - LABEL_W;
const cols = showDiff ? 3 : 2;
const sideCellW = Math.floor(contentW / cols) - 2 * PAD;
const stackCellW = contentW - 2 * PAD;

const rows = manifest.rows.map((r, i) => {
  const where = `row ${i + 1} (${r.label})`;
  const before = load(r.before, where);
  const after = load(r.after, where);
  if (!before && !after) fail(`${where}: both before and after are null`);
  // CSS size of the larger of the two; one factor for the whole row.
  const cssW = Math.max(before?.w ?? 0, after?.w ?? 0) / shotScale;
  const cssH = Math.max(before?.h ?? 0, after?.h ?? 0) / shotScale;
  const stacked = stackAll || sideCellW / cssW < 0.75;
  const factor = Math.min(1, (stacked ? stackCellW : sideCellW) / cssW);
  return { ...r, i, before, after, cssW, cssH, stacked, factor, pair: Boolean(before && after) };
});

const px = (n) => `${Math.round(n)}px`;
const cell = (r, side) => {
  const img = r[side];
  if (!img) {
    const text = side === "before" ? "Did not exist" : "Removed";
    return `<div class="none" style="width:${px(r.cssW * r.factor)};height:${px(Math.max(48, r.cssH * r.factor))}">${text}</div>`;
  }
  return `<img id="${side[0]}${r.i}" src="${img.url}" style="width:${px((img.w / shotScale) * r.factor)}">`;
};
const diffCell = (r) =>
  r.pair
    ? `<canvas id="d${r.i}" style="width:${px(r.cssW * r.factor)}"></canvas>`
    : `<div class="none" style="width:${px(r.cssW * r.factor)};height:48px">No pair to compare</div>`;

const rowHtml = (r) => {
  const label = `<td class="label"><b><span class="n">${r.i + 1}</span>${esc(r.label)}</b><span>${esc(r.note)}</span><span class="px" id="px${r.i}"></span></td>`;
  if (r.stacked) {
    return `<tr>${label}<td colspan="${cols}">
      <div class="cap before">Before</div>${cell(r, "before")}
      <div class="cap after">After</div>${cell(r, "after")}
      ${showDiff ? `<div class="cap">Diff</div>${diffCell(r)}` : ""}
    </td></tr>`;
  }
  return `<tr>${label}<td>${cell(r, "before")}</td><td>${cell(r, "after")}</td>${showDiff ? `<td>${diffCell(r)}</td>` : ""}</tr>`;
};

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; width: ${width}px; background: #fff; color: #1a1a1a;
         font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #666; margin: 0 0 20px; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .06em;
       color: #666; padding: 8px ${PAD}px; border-bottom: 2px solid #ddd; }
  td { vertical-align: top; padding: 14px ${PAD}px; border-bottom: 1px solid #e5e5e5; }
  .label b { display: block; font-size: 15px; margin-bottom: 4px; }
  .label span { color: #555; }
  .label .n { color: #999; font-variant-numeric: tabular-nums; margin-right: 6px; }
  .label .px { display: block; margin-top: 8px; font-size: 12px; color: #888; }
  img, canvas { display: block; height: auto; outline: 1px solid #d0d0d0; border-radius: 4px; }
  .none { display: flex; align-items: center; justify-content: center; color: #888; font-style: italic;
          border: 1px dashed #bbb; border-radius: 4px; background: #fafafa; }
  .cap { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #666; margin: 10px 0 6px; }
  .cap:first-child { margin-top: 0; }
  .before { color: #b42318; } .after { color: #067647; }
</style></head><body>
  <h1>${esc(manifest.title ?? "Visual changes")}</h1>
  ${manifest.subtitle ? `<p class="sub">${esc(manifest.subtitle)}</p>` : ""}
  <table>
    <thead><tr><th style="width:${LABEL_W}px">Change</th><th class="before">Before</th><th class="after">After</th>${showDiff ? "<th>Diff</th>" : ""}</tr></thead>
    <tbody>${rows.map(rowHtml).join("")}</tbody>
  </table>
</body></html>`;

let browser;
try {
  browser = await chromium.launch({ channel: "chrome" });
} catch {
  browser = await chromium.launch();
}
const page = await browser.newPage({ viewport: { width, height: 100 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "load" });

const stats = await page.evaluate(
  ({ rows, showDiff }) => {
    const pixels = (img, w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    return rows.map(({ i, pair, missing }) => {
      const out = document.getElementById(`px${i}`);
      if (!pair) {
        out.textContent = missing === "before" ? "Added on the branch" : "Removed on the branch";
        return { pair: false, missing };
      }
      const b = document.getElementById(`b${i}`);
      const a = document.getElementById(`a${i}`);
      const w = Math.max(b.naturalWidth, a.naturalWidth);
      const h = Math.max(b.naturalHeight, a.naturalHeight);
      const pb = pixels(b, w, h);
      const pa = pixels(a, w, h);
      let changed = 0;
      const canvas = showDiff ? document.getElementById(`d${i}`) : null;
      let diff;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        diff = canvas.getContext("2d").createImageData(w, h);
      }
      for (let p = 0; p < pb.length; p += 4) {
        const d =
          Math.abs(pb[p] - pa[p]) + Math.abs(pb[p + 1] - pa[p + 1]) +
          Math.abs(pb[p + 2] - pa[p + 2]) + Math.abs(pb[p + 3] - pa[p + 3]);
        const hit = d > 24;
        if (hit) changed++;
        if (diff) {
          if (hit) diff.data.set([255, 0, 200, 255], p);
          else {
            const g = 255 - (255 - (pa[p] + pa[p + 1] + pa[p + 2]) / 3) * 0.25;
            diff.data.set([g, g, g, 255], p);
          }
        }
      }
      if (canvas) canvas.getContext("2d").putImageData(diff, 0, 0);
      const share = changed / (w * h);
      const resized = b.naturalWidth !== a.naturalWidth || b.naturalHeight !== a.naturalHeight;
      const sizeNote = resized
        ? ` · size ${b.naturalWidth}×${b.naturalHeight} → ${a.naturalWidth}×${a.naturalHeight}`
        : "";
      out.textContent =
        `${(share * 100).toFixed(2)}% of pixels changed${sizeNote}` +
        (resized ? " · sizes differ, so the pixels are compared from the top left corner and content after the shift counts as changed" : "");
      return { pair: true, changed, share, sizeNote, resized };
    });
  },
  {
    rows: rows.map((r) => ({ i: r.i, pair: r.pair, missing: r.before ? "after" : "before" })),
    showDiff,
  },
);

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

let identical = 0;
for (const [i, s] of stats.entries()) {
  const r = rows[i];
  const layout = `${r.stacked ? "stacked" : "side by side"}, drawn at ${Math.round(r.factor * 100)}%`;
  if (!s.pair) {
    console.log(`${i + 1}. ${r.label}: ${s.missing === "before" ? "added" : "removed"} (${layout})`);
  } else {
    if (s.changed === 0) identical++;
    console.log(
      `${i + 1}. ${r.label}: ${(s.share * 100).toFixed(2)}% changed${s.sizeNote} (${layout})${s.changed === 0 ? "  <-- IDENTICAL" : ""}`,
    );
  }
  if (r.factor < 0.6) {
    console.log(`   warning: drawn at ${Math.round(r.factor * 100)}% even ${r.stacked ? "stacked" : "side by side"}; text may be unreadable. Crop narrower or pass a larger --width.`);
  }
}
if (identical) process.exitCode = 3;
console.log(outPath);
