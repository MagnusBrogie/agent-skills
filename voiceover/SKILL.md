---
name: voiceover
description: Drive the real macOS VoiceOver screen reader against a web page with Guidepup and Playwright, and get back a transcript of what it says. Use when a task needs to know what a screen reader actually announces - "test with VoiceOver", "what does the screen reader say", "run a screen reader test", "check how this reads aloud", or to run the screen reader part of a manual test plan. Not for checks the accessibility tree already answers (roles, names, hidden content) - use an ARIA snapshot for those. Local machine only; it takes over the keyboard and the screen while it runs.
---

# VoiceOver

Runs VoiceOver on this machine against a page in Playwright's WebKit, and prints what VoiceOver said. The tooling is in the `tool` folder beside this file, with its own `node_modules`, so nothing is installed in any project repository. Below, `<tool>` stands for that folder's absolute path.

**Local notes.** If a file named `LOCAL.md` sits beside this file, read it before you start. It holds the user's own notes for this machine and their projects (which permissions have been granted, where a saved login state lives, a locale) and is not part of the published skill.

## Setup, once per machine

This needs macOS and Node.js. If `<tool>/node_modules` is missing, install the packages and the browser:

```sh
cd <tool>
npm ci
npx playwright install webkit
```

The user also has to tick "Allow VoiceOver to be controlled with AppleScript" in VoiceOver Utility, General, and grant the macOS permissions that the first runs ask for. "If a run fails" lists them in the order they appear. Only the user can do these; do not try to grant them yourself.

## Before running

- **It takes over the machine.** VoiceOver starts, a browser window opens in front, and keystrokes are sent to whatever has focus. Tell the user before a run and wait for a yes, unless they asked for this run. Never start one in the background while the user is working.
- **One run at a time.** There is only one VoiceOver. Do not start a run from two agents, and do not run it in parallel with other headed browser work.
- **Use it for what only it can show**: the words VoiceOver speaks, the order it stops in, and what it says after an action. For roles, names, and what is hidden, an ARIA snapshot (Playwright's `locator.ariaSnapshot()`, or the snapshot command of the agent's own browser) is faster, deterministic, and does not disturb the user.
- A run is slow, about a second per stop. Read the part of the page the task is about, not the whole page.
- **Check that it can start** before a long run, with the bundled test page: `VO_URL="file://<tool>/fixtures/smoke.html" VO_STEPS=6 npx playwright test specs/read.spec.ts`, run in `<tool>`. It should read "main", a heading, a paragraph, "Value:", "missing", a button, and a link. If it fails, see "If a run fails"; the errors come one at a time, each after the previous one is fixed.
- **Afterwards**, check that VoiceOver is no longer running: `pgrep -fl 'VoiceOver.app/Contents/MacOS/VoiceOver'` prints nothing. Delete scratch specs and any saved session file.

## Reading a page

From the tool directory:

```sh
cd <tool>
VO_URL='http://localhost:3000/' VO_STEPS=40 npx playwright test specs/read.spec.ts
```

The transcript is printed between `--- VoiceOver transcript ---` and `--- end ---`, one numbered line per stop of the VoiceOver cursor.

| Variable           | Meaning                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `VO_URL`           | The page to read. Required. A `file://` URL works.                                                   |
| `VO_STEPS`         | How many times to move to the next item. Default 30.                                                 |
| `VO_UNTIL`         | Stop early at the first phrase that contains this text (case-insensitive).                           |
| `VO_WAIT_FOR`      | A selector to wait for before reading, for pages that render after load.                             |
| `VO_FOCUS`         | A selector to focus before reading, so that reading starts there. The element must be focusable.     |
| `VO_STORAGE_STATE` | A Playwright storage state file, for a signed-in session.                                            |
| `VO_LOCALE`        | Browser locale, for example `en-GB`.                                                                 |
| `VO_TIMEZONE`      | Browser timezone, for example `Europe/London`.                                                      |

## Anything more than reading forward

Write a spec in `<tool>/specs/scratch/` and run it with `npx playwright test specs/scratch/<name>.spec.ts`. The spec has to be under the tool folder to resolve the packages. Create `scratch` if it is missing; git ignores it. Delete it afterwards unless the user wants it kept.

```ts
import { voiceOverTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";

test("the sort button announces its state", async ({ page, voiceOver }) => {
    await page.goto("http://localhost:3000/", { waitUntil: "load" });
    await page.getByRole("heading", { level: 1 }).waitFor();
    await voiceOver.navigateToWebContent();

    await voiceOver.nextHeading();
    await voiceOver.next();
    await voiceOver.act();

    expect(await voiceOver.lastSpokenPhrase()).toContain("…");
    console.log(await voiceOver.spokenPhraseLog());
});
```

### Starting at a given element

To read one stretch of a page (a table row, a cell, a form), move the VoiceOver cursor there by focusing an element, then step forward. An element that is not focusable can be made so with `tabindex="-1"`; it changes no announcement:

```ts
await voiceOver.navigateToWebContent();
await page.evaluate(() => {
    const el = [...document.querySelectorAll("dl dt")].find((e) => e.textContent === "None")!;
    el.setAttribute("tabindex", "-1");
    el.focus();
});
await page.waitForTimeout(800);
for (let i = 0; i < 3; i++) await voiceOver.next();
console.log((await voiceOver.spokenPhraseLog()).join("\n"));
```

Use `spokenPhraseLog()` as the record. `itemText()` straight after moving focus can still return the previous item, and it leaves out what VoiceOver adds, such as the column header and position it speaks for a table cell ("Monday 23 column 2 of 6").

A spec that needs a signed-in page takes `test.use({ storageState: "<file>" })`. Signing in to make that file may end a session for the same account elsewhere, such as in another browser.

Always call `voiceOver.navigateToWebContent()` after the page has loaded and before any other VoiceOver command. Useful commands: `next`, `previous`, `nextHeading`, `nextLink`, `nextLandmark`, `act` (activate), `interact`, `stopInteracting`, `press("Tab")`, `type("text")`, `lastSpokenPhrase`, `itemText`, `spokenPhraseLog`. The full list is in `node_modules/@guidepup/guidepup/lib/macOS/VoiceOver/VoiceOver.d.ts`.

## Reading the result

- A phrase is the text VoiceOver sends to speech, so it shows wording, role, and state. It does not show pronunciation, and text in one language read by a voice for another still looks correct here.
- This is VoiceOver with WebKit on macOS. It says nothing certain about NVDA, JAWS, TalkBack, or VoiceOver on iOS. Say so when reporting.
- Playwright's WebKit is close to Safari but is not Safari. For a finding that matters, ask the user to confirm it in Safari.
- An empty phrase or the same phrase twice usually means the cursor did not move or the speech was not captured in time. Run again before reporting it as a defect.

## If a run fails

Each of the first three is a macOS permission for the app the agent runs in (a terminal, an editor, an agent app). Only the user can grant it; stop, say which one is missing, and wait. Do not work around a permission. They tend to appear in this order on a machine that has never run Guidepup, one per attempt:

1. **"Failed to mount Guidepup preferences … EPERM … symlink"**: on every start Guidepup puts four symlinks in `~/Library/Group Containers/group.com.apple.VoiceOver/Library/Preferences`, which macOS protects as another app's data. The app has to be allowed to reach it: a system dialog about "data from other apps", or Full Disk Access for the app. The command must also not be sandboxed away from it; `ls` on that folder failing with "Operation not permitted" shows the block.
2. **"Unable to activate application by ID: org.webkit.Playwright"** or **"System Events got an error: AppleEvent timed out (-1712)"**: the app is not allowed to control System Events or VoiceOver, or the dialog asking for it is waiting unanswered, perhaps behind other windows. The user allows it in the dialog, or under Privacy & Security, Automation: the app, with System Events and VoiceOver on.
3. **"osascript is not allowed to send keystrokes (1002)"**: the app lacks Accessibility (control of the computer). Settings layouts change between macOS versions; `open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"` opens the right pane directly. If the app is already on, switching it off and on again can clear a stale entry.

- **VoiceOver is left running** after a crash: turn it off with Cmd+F5, or `pkill -f 'VoiceOver.app/Contents/MacOS/VoiceOver'`.
- **"AppleScript control" errors**: the checkbox "Allow VoiceOver to be controlled with AppleScript" in VoiceOver Utility, General, is off. The user has to tick it; `ls /private/var/db/Accessibility/.VoiceOverAppleScriptEnabled` shows whether it is on.
- **Stuck at "item chooser" or "web content"**: `navigateToWebContent` matches English phrases, so the system language must be English.
- **After updating `@guidepup/guidepup`**: run `npx @guidepup/setup install voiceover` in the tool directory.

Do not run `npx @guidepup/setup setup` without `--macos-ignore-tcc-db`. Without the flag it tries to write Full Disk Access, Accessibility, and screen and microphone capture for `bash`, `zsh`, `sshd`, and `osascript` straight into the privacy database.
