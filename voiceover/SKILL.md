---
name: voiceover
description: Drive the real macOS VoiceOver screen reader against a web page with Guidepup and Playwright, and get back a transcript of what it says. Use when a task needs to know what a screen reader actually announces - "test with VoiceOver", "what does the screen reader say", "run a screen reader test", "check how this reads aloud", or to run the screen reader part of a manual test plan. Not for checks the accessibility tree already answers (roles, names, hidden content) - use an ARIA snapshot for those. Runs in a macOS virtual machine, not on the host, because it needs wide system permissions and takes over the keyboard and the screen while it runs.
---

# VoiceOver

Runs VoiceOver in a macOS virtual machine against a page in Playwright's WebKit, and prints what VoiceOver said. The tooling is in the `tool` folder beside this file, with its own `node_modules`, so nothing is installed in any project repository. Below, `<tool>` stands for that folder's absolute path.

**Local notes.** If a file named `LOCAL.md` sits beside this file, read it before you start. It holds the user's own notes for this machine and their projects (which permissions have been granted, where a saved login state lives, a locale) and is not part of the published skill.

## Run it in a virtual machine

Run VoiceOver in a macOS guest, not on the user's own machine. The reasons are about security:

- **The permissions are wide and they stay.** A run needs Accessibility (sending keystrokes to any app), Automation of System Events, and access to another app's data. On the host these go to the app the agent runs in, so every command any agent runs from that app afterwards holds them too, not only this skill. In a guest they are granted to a machine that holds nothing else.
- **Keystrokes go to whatever has focus.** If focus moves during a run (a notification, a dialog, the user clicking), the keys land in the user's mail, chat, or terminal. In a guest the worst case is a failed run.
- **VoiceOver reads whatever is on screen**, and the transcript ends up in the conversation. In a guest only the page under test is on screen.
- **AppleScript control of VoiceOver is a system-wide switch** that stays on for every process until someone turns it off.

A guest does not isolate the network: it can reach the host and whatever the host can reach. Keep the user's Apple account, password manager, and real credentials out of it. The only secret that may go in is a test account's session file, and only for the length of a run.

If no guest is available, stop and say so; setting one up is the user's decision (it downloads tens of gigabytes). Run on the host only when the user has said, for this run, that they accept the above. A note in `LOCAL.md` that the host permissions were once granted is not that yes.

### The guest

Any macOS guest on Apple silicon works if it has a signed-in desktop session (VoiceOver needs one), English as the system language, and a way to run commands in it, such as SSH. The examples use [Tart](https://tart.run) (`brew install openai/tools/tart`) with one of its macOS base images, which signs in automatically as `admin` (password `admin`), has Remote Login on, and carries Tart's guest agent, so `tart exec <name> <command>` also runs a command in it without SSH. Substitute what the user has; `LOCAL.md` may name the guest.

Keep one prepared guest and run each session in a clone of it, so that nothing a page or a run leaves behind carries over:

```sh
tart clone <image> voiceover-base     # once, about 25 GB; <image> is a macOS base image, such as ghcr.io/cirruslabs/macos-tahoe-base:latest
tart clone voiceover-base voiceover-run
tart run voiceover-run &              # opens the guest's window; --no-graphics hides it
ssh admin@"$(tart ip voiceover-run)"
```

- **Commands in the guest.** Both `tart exec` and SSH work for everything below, VoiceOver runs included. `tart exec <name> zsh -lc '<command>'` needs no credentials. Over SSH, run commands through a login shell too (`ssh … "zsh -lc '<command>'"`): a bare SSH command does not have Homebrew's Node.js on its path. For SSH without a password prompt, add a public key made for this purpose to the guest's `~/.ssh/authorized_keys`, in `voiceover-base` so that clones have it.
- **The tool folder.** Copy it into the guest without `node_modules`, `test-results`, and `specs/scratch`, and run "Setup" there. `rsync -a --exclude` over SSH does it, and so does `tar --exclude … -cf - . | tart exec -i <name> zsh -lc 'mkdir -p ~/voiceover-tool && tar -xf - -C ~/voiceover-tool'` from the tool folder. In every command below, `<tool>` is that copy, and the command runs in the guest. Do not share the host's home folder or a whole repository with the guest; if a folder is shared, share only the tool folder.
- **The page.** A `localhost` URL on the host is not `localhost` in the guest. Forward the port when connecting, `ssh -R 3000:localhost:3000 admin@<guest address>`, and the same `http://localhost:3000/…` URL works in the guest, with the origin a saved session expects. This also avoids making the dev server listen on other interfaces.
- **A signed-in session.** Copy the storage state file in with `scp`, for a test account only, never a real user's session.
- **The macOS version** in the guest decides VoiceOver's wording, and it may differ from the host's. Give the guest's version (`sw_vers -productVersion`) when reporting.
- **Afterwards**, stop and delete the clone: `tart stop voiceover-run && tart delete voiceover-run`. That removes the session file and scratch specs with it. Keep `voiceover-base`.

## Setup, once per guest

This needs macOS and Node.js. Tart's macOS base images have Node.js from Homebrew; install it in the guest if the image lacks it. If `<tool>/node_modules` is missing, install the packages and the browser:

```sh
cd <tool>
npm ci
npx playwright install webkit
```

Then VoiceOver has to be allowed to be controlled with AppleScript, and the process that runs the commands needs the macOS permissions listed under "If a run fails".

- **In a disposable guest**, two commands in `<tool>` do both:

  ```sh
  sudo env PATH="$PATH" HOME="$HOME" npx @guidepup/setup setup --ci   # the AppleScript switch and the permissions
  npx @guidepup/setup install voiceover                              # the VoiceOver preferences a run mounts
  ```

  The first writes the permissions for the shells, `sshd`, and `osascript` into the guest's privacy database, which is what a throwaway machine is for. It needs root (without `sudo` it fails with "Unable to write to the VoiceOver database file") and System Integrity Protection off in the guest (`csrutil status`), as it is in Tart's base images. Without the second, a run fails with "Failed to mount Guidepup preferences". If the first cannot write the permissions, grant them by hand in the guest's window. Do this in `voiceover-base`, with the packages installed, so that every clone starts ready.
- **On the host**, never run the first of those commands (see the end of this file). The user ticks "Allow VoiceOver to be controlled with AppleScript" in VoiceOver Utility, General, and grants each permission when a run asks for it. Only the user can do these; do not try to grant them yourself.

## Before running

- **Check where you are.** Before any command that starts VoiceOver, confirm the shell is in the guest (`whoami` and `hostname` give the guest's, not the user's). A command meant for the guest that runs on the host is the mistake this setup exists to prevent.
- **It takes over the machine it runs on.** VoiceOver starts, a browser window opens in front, and keystrokes are sent to whatever has focus. In a guest this does not disturb the user, though they may hear the guest's VoiceOver speak. On the host, tell the user before a run and wait for a yes, and never start one in the background while the user is working.
- **One run at a time per machine.** There is only one VoiceOver in a guest. Do not start a run from two agents in the same guest, and do not run it in parallel with other headed browser work there.
- **Use it for what only it can show**: the words VoiceOver speaks, the order it stops in, and what it says after an action. For roles, names, and what is hidden, an ARIA snapshot (Playwright's `locator.ariaSnapshot()`, or the snapshot command of the agent's own browser) is faster, deterministic, and does not disturb the user.
- A run is slow, about a second per stop. Read the part of the page the task is about, not the whole page.
- **Check that it can start** before a long run, with the bundled test page: `VO_URL="file://<tool>/fixtures/smoke.html" VO_STEPS=6 npx playwright test specs/read.spec.ts`, run in `<tool>`. It should read "main", a heading, a paragraph, "Value:", "missing", a button, and a link. If it fails, see "If a run fails"; the errors come one at a time, each after the previous one is fixed.
- **Afterwards**, delete the guest clone. After a run on the host, check that VoiceOver is no longer running (`pgrep -fl 'VoiceOver.app/Contents/MacOS/VoiceOver'` prints nothing), and delete scratch specs and any saved session file.

## Reading a page

From the tool directory, in the guest:

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

Each of the first three is a macOS permission. In a guest it belongs to the process that runs the commands (`sshd` over SSH, Tart's guest agent under `tart exec`, or the guest's Terminal); run the setup command from "Setup" there again, or grant it in the guest's window. On the host it belongs to the app the agent runs in (a terminal, an editor, an agent app), and only the user can grant it: stop, say which one is missing, and wait. Do not work around a permission on the host. They tend to appear in this order on a machine that has never run Guidepup, one per attempt:

1. **"Failed to mount Guidepup preferences … EPERM … symlink"**: on every start Guidepup puts four symlinks in `~/Library/Group Containers/group.com.apple.VoiceOver/Library/Preferences`, which macOS protects as another app's data. The app has to be allowed to reach it: a system dialog about "data from other apps", or Full Disk Access for the app. The command must also not be sandboxed away from it; `ls` on that folder failing with "Operation not permitted" shows the block.
2. **"Unable to activate application by ID: org.webkit.Playwright"** or **"System Events got an error: AppleEvent timed out (-1712)"**: the app is not allowed to control System Events or VoiceOver, or the dialog asking for it is waiting unanswered, perhaps behind other windows. The user allows it in the dialog, or under Privacy & Security, Automation: the app, with System Events and VoiceOver on.
3. **"osascript is not allowed to send keystrokes (1002)"**: the app lacks Accessibility (control of the computer). Settings layouts change between macOS versions; `open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"` opens the right pane directly. If the app is already on, switching it off and on again can clear a stale entry.

- **VoiceOver is left running** after a crash: turn it off with Cmd+F5, or `pkill -f 'VoiceOver.app/Contents/MacOS/VoiceOver'`.
- **"AppleScript control" errors**: the checkbox "Allow VoiceOver to be controlled with AppleScript" in VoiceOver Utility, General, is off. The user has to tick it; `ls /private/var/db/Accessibility/.VoiceOverAppleScriptEnabled` shows whether it is on.
- **The guest does not start: "The virtual machine encountered a security error … Failed to create new HostKey"**: the host could not make the guest's key. It needs the user's unlocked login keychain and a signed-in desktop session on the host, so it is the user's to fix; Tart's FAQ has a section on it. Linux guests start regardless, which tells this apart from virtualization being blocked.
- **Stuck at "item chooser" or "web content"**: `navigateToWebContent` matches English phrases, so the system language must be English.
- **After updating `@guidepup/guidepup`**: run `npx @guidepup/setup install voiceover` in the tool directory.

On the host, do not run `npx @guidepup/setup` without `--macos-ignore-tcc-db`. Without the flag it tries to write Full Disk Access, Accessibility, and screen and microphone capture for `bash`, `zsh`, `sshd`, and `osascript` straight into the privacy database.
