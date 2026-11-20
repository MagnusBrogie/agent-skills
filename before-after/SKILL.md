---
name: before-after
description: Make one image with a table of before and after screenshots showing every visual change the current branch makes against a base branch - each changed screen, component, and state captured from a local build of the base and a local build of the branch, under the same data, viewport, and theme, with a pixel check that each pair really differs. Use when the user asks for before/after screenshots, a before/after table, a visual diff, a screenshot comparison, or images of the visual changes for a pull request, review, or designer. Captures and composes images only; it does not edit the project's code.
---

# Before and after

Produce one PNG: a table with a row per visual change, and in each row the change's name, a one-line note, the screenshot from the base and the screenshot from the branch. A reader who has not seen the code should be able to tell from the image alone what looks different and where.

The image is only as good as its list of changes. A table that shows three of five changes, or that shows a difference caused by different data rather than by the code, misleads the reader. Most of the work is finding every visual change and capturing each pair so that the code is the only thing that differs.

**Where the images go.** Everything this skill produces is stored in the user's Documents folder, in `~/Documents/before-after/<repository>/<branch>/`: the shots, the manifest, a copy of `shots.mjs`, and the final `before-after.png`. The scripts choose this folder themselves and take no output path; a user who wants another root than `~/Documents/before-after` sets the `BEFORE_AFTER_DIR` environment variable, which is theirs to set, not yours. Do not write the images anywhere else, and do not move or copy them out afterwards; the scratchpad is only for the base worktree and for drafting `shots.mjs`. A later run for the same branch reuses the folder.

Two scripts sit in `scripts/` beside this file: `capture.mjs` takes the shots, and `compose.mjs` builds and checks the table. Each documents its input format in its header. Read both headers before you start.

**Local notes.** If a file named `LOCAL.md` sits beside this file, read it before you start. It holds the user's own defaults for the projects they work on (commands, hosts, accounts, paths) and is not part of the published skill. Where it covers the project at hand, it counts as part of the project's instructions; where it does not, ignore it.

## 1. Gather the changes

With no base branch given, use the pull request's base (`gh pr view --json baseRefName --jq .baseRefName`), else the default branch (`git symbolic-ref --short refs/remotes/origin/HEAD`), else `origin/main`. Prefer the remote-tracking ref. Include uncommitted work:

```sh
base=$(git merge-base <base> HEAD)
git diff --stat "$base"; git diff "$base"; git status --short   # read untracked files too
git log --oneline "$base"..HEAD
```

Read the pull request description and the issue as well, if there are any. They often say which screens the change is meant for and include screenshots people expect to see.

## 2. List every visual change

Trace each hunk outward to what a user sees:

- **View code, styles, tokens, icons, copy, translations.** Each of these is a candidate. For shared code (a UI component, a formatting helper, a CSS token), search for its callers and list every screen that renders it. A change to shared code is usually seen in more places than the branch was about.
- **Data states.** For each screen, read which branches the changed code takes: loaded, loading, empty, error, missing value, zero and negative, long text, one item and many, each mode or setting. Keep only the states whose rendering the diff changes.
- **Interaction states.** Hover, focus, pressed, disabled, selected; an open popover, menu, sheet, or dialog; a field showing a validation error. These need steps before the shot (step 4).
- **Screens the branch adds or removes.** These have only one side; the row shows a placeholder for the other.
- **Environments the project supports**, where the change could look different: dark theme, mobile and desktop widths, another locale.

Sort the candidates into three lists:

1. **Visual:** something on screen differs. These become rows.
2. **Not visual:** the change only affects the accessibility tree, attributes, screen-reader-only text, behavior, or code structure. These are not rows. Name them in the report, so that the reader knows they were considered and not missed. If the user wants them shown anyway, a row can hold an accessibility-tree excerpt captured as an image, labelled as such.
3. **Unsure:** markup or class changes that are meant to be invisible but could move or recolor something (a new wrapper element, a positioning class, a swapped helper). Capture these, and let the pixel check decide.

A change to motion (an animation, a transition, its timing) cannot be shown in a still image. Put it under "Not shown" in the report and say how to see it.

Group rows sensibly: one row per distinct look, not per call site. If ten screens use the changed cell in the same way, show one or two of them and name the rest in the note. Aim for a table someone will actually read; past about twelve rows, make a second image per area and say so.

**If the visual and unsure lists are both empty, stop here.** Tell the user that the branch has no visual changes, list what was considered and why each item is not visual, and produce no image. If only unsure items exist and every pair turns out identical, the result is the same, and the identical pairs are the evidence: report them as checked and unchanged.

## 3. Build the base and the branch locally

Capture both sides from local builds, never from a deployment: a deployment lags behind the working tree and cannot show uncommitted work.

- **Branch:** the current working tree, built after the last change.
- **Base:** a separate worktree at the merge base, so that the user's working tree is never touched. Never switch branches or stash in the user's checkout.

  ```sh
  git worktree add --detach <scratchpad>/before-after-base "$base"
  ```

  Install dependencies there. Symlinking the main checkout's dependency directory is fine only when the diff does not touch the lockfile. Remove the worktree when you are done (`git worktree remove`).

Use the project's documented commands (read its README, AGENTS.md, CLAUDE.md, development docs, and any `run` skill). Both sides must talk to the **same staging or test backend, never production**. If it is unclear which command targets which backend, read the build config, and if that still leaves doubt, stop and ask. Before you capture anything, check the host of a real API request from each side.

Prefer the project's production build served statically (a `build` followed by a `preview` or any static server) over its dev server. A dev server adds hot-reload clients and overlays, may need a watcher process per worktree, and can render differently from what ships. If you build with a tool that is not the project's own build command, check that the page renders: a project may post-process its bundle. A build can also empty or overwrite an output directory in the user's working tree. Those are generated files, but say in the report what you rebuilt, and put back what the dev setup expects if the build removed it.

Before trusting any capture, **confirm that the two builds differ**: read the changed element's markup on each side and see the diff's change in it. Two servers that serve the same code give identical pairs that prove nothing.

Choose how to serve the two builds:

- **Both at once, on two free ports.** This is the simplest, and the two captures of a pair are taken seconds apart. It works when the screens need no login, or when login survives a change of port. Cookies are shared between ports on the same host, but local storage is not, and a backend may only accept certain origins. Check that a logged-in screen really loads on the second port before relying on it.
- **One after the other, on the same port.** Serve the base on the project's usual port, capture with `--side=before`, stop it, serve the branch on that port, and capture with `--side=after`. Saved login state and allowed origins then apply to both. The captures are minutes apart, so the data must be mocked or known to be stable.

If the project has a component catalogue (Storybook, a "workshop" app or similar) and the change lives in a shared component, capturing it there is cheaper and more stable than in the full app, and usually needs no login. Still capture at least one real screen per change where you can, so that the image shows it in context. If a real screen cannot be reached (no test login, for example), say so under "Not shown".

## 4. Capture each pair under identical conditions

Write a `shots.mjs` in the scratchpad, in the format given in the header of `scripts/capture.mjs`, and run it from the project root, so that Playwright resolves and the output folder gets the right repository and branch name:

```sh
node <this skill>/scripts/capture.mjs <scratchpad>/shots.mjs --before=http://localhost:<p1> --after=http://localhost:<p2>
```

The script runs the same steps against both URLs. It uses the installed Chrome, a device scale factor of 2, and reduced motion. It turns off transitions, resets infinite animations (a shimmer, a spinner) to their first frame and finishes finite ones, waits for fonts and for the network to settle, and freezes the clock if you give it a time. It writes `shots/<slug>.before.png`, `shots/<slug>.after.png`, and the `manifest.json` for step 5 into the Documents folder described above, copies `shots.mjs` there, and prints the folder's path as its last line. `--only=<slug>` recaptures one row. A failed shot leaves a `<slug>.<side>.FAILED.png` of the whole viewport, which shows what the page looked like instead.

If the project's end-to-end setup has a saved login state, pass it as `storageState` (read the project's docs for how it is made). In Orca, the embedded browser (the `orca-cli` skill) also works for a pair or two, but a script makes the pairs repeatable.

What you have to get right in `shots.mjs`:

- **Same data on both sides.** Live data drifts between two captures: prices tick, and lists reorder. Prefer to mock the responses the screen depends on in the shot's `mock`: capture one real payload from staging and fulfill both sides with it. Two limits:
  - If the branch changes the request or the response shape (a new endpoint, a new field, a changed decoder), one payload cannot serve both sides. Give each side the payload its code expects, built from the same underlying values, and say so in the subtitle.
  - Data that arrives over a WebSocket or server-sent events is not touched by `page.route`. Use `page.routeWebSocket`, or pick a screen or a time when the stream is quiet, or hide the live element if it is not the subject.
- **Reach the state deliberately.** Loading, error, and missing-value states rarely occur on test accounts: produce them in `mock` (delay a response, fail it, null a field). Derive the request paths and field names from the code, not by guessing. Reach interaction states in `steps` (hover, focus, click to open).
- **Crop to the change with context.** Set `target` to the smallest element that shows the change and is still recognisable as part of its screen: the card, the table, the sheet, not the whole page. Aim for a crop of **at most about 650 CSS px wide**: that is what fits side by side at full size. A wider crop is stacked (before above after), and one wider than about 1300 CSS px is shrunk, so its text becomes harder to read. Use the same target on both sides so the crops line up.
- **Hide what is not the subject and keeps moving** (a ticker, a clock, an avatar that loads late) with a style tag in `steps`, on both sides.

## 5. Compose and check

```sh
node <this skill>/scripts/compose.mjs <folder>/manifest.json [--diff] [--stack]
```

The image is written beside the manifest as `before-after.png`, and its path is the last line of output. `--diff` adds an image per row with the changed pixels in magenta. Use it when the change is small or subtle (spacing, a colour, one glyph); leave it out when the change is obvious. When the two shots of a row differ in size, the comparison is aligned at the top left corner, so everything after the shift counts as changed; the row says so, and the diff image is then only a rough guide.

The script draws both shots of a row at the same scale. It prints the share of changed pixels per row and how each row was laid out, and exits with code 3 if any pair is identical. Then:

1. **An identical pair** means the capture missed the change (wrong state, wrong screen, a cache, a base build that is not actually the base) or the change is not visual. Find out which. Fix the capture, or take the row out of the manifest and move the item to the not-visual list as "checked, no pixel differs". Never ship a row with an identical pair.
2. **Look at the image** (read the PNG) and check every row: the difference you see is the one the note describes, and nothing else differs. A difference that is not explained by the diff (a different price, a missing row, shifted layout elsewhere) is data drift or an unexpected regression. Recapture, or report it to the user as a possible regression. Do not hide it.
3. **Check that the text in every shot can be read.** Act on any "text may be unreadable" warning from the script: crop narrower and recapture that row with `--only`.
4. If the image is very long, split it by area: make a subfolder per area inside the branch's folder, each with its own `manifest.json` whose paths point at `../shots/...`, and compose each one.

## 6. Report

Give the user:

- The full absolute path to the PNG.
- The rows, one line each.
- **Not shown:** the not-visual changes, the unsure items the pixel check found unchanged, motion changes, the visual ones you could not capture (and why), and the call sites left out as duplicates of a row that is shown.
- Anything unexpected that the pixel check or your own look turned up.
- How the pairs were produced (real staging data, or which responses were mocked; a catalogue or the real app), so the reader knows what the images prove.

Stop the dev servers you started and remove the base worktree. The shots, the copy of `shots.mjs`, and the manifest stay in the output folder, so that a later run can recapture a single row with `--only`.
