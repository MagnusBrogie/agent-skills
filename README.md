# agent-skills

Skills for coding agents such as Claude Code, for working on a feature branch: reviewing it, explaining it, testing it, showing its visual changes, and checking where it stands.

| Skill | What it does |
| --- | --- |
| [`branch-review`](branch-review/SKILL.md) | Reviews the current branch against its base from one named angle (architecture, regression, tests, docs, scope, risks and more) or all of them. Read-only. |
| [`explain-branch`](explain-branch/SKILL.md) | Walks through a branch's changes step by step: data and control flow, why each abstraction exists, and which changes were needed versus chosen. Read-only. |
| [`manual-test-plan`](manual-test-plan/SKILL.md) | Writes a plan for testing the branch in the running app, split into cases an agent can run with a browser or simulator and cases a person has to do by hand, such as screen reader checks. |
| [`before-after`](before-after/SKILL.md) | Makes one image with a table of before and after screenshots for every visual change on the branch, taken from local builds of the base and the branch. |
| [`voiceover`](voiceover/SKILL.md) | Drives the real macOS VoiceOver against a web page and returns a transcript of what it says, in a macOS virtual machine so that the permissions it needs stay off your own machine. `manual-test-plan` uses it to rehearse screen reader cases when it is installed. macOS only. |
| [`worktree-status`](worktree-status/SKILL.md) | Reports where the worktree and its pull request stand (uncommitted work, checks, reviews, open comments) and suggests the next steps. Read-only apart from a `git fetch`. |

## Example

Asking "where does this branch stand?" runs `worktree-status`. A report looks like this (an illustration, not output from a real repository):

> **Draft PR #123: approved, but two commits pushed since then are unreviewed, and one check fails.**
>
> | Area | Status |
> | --- | --- |
> | Working tree | 2 files uncommitted |
> | Branch vs remote | in sync |
> | Branch vs base | 7 behind, no file changed on both sides |
> | PR | #123, draft |
> | Checks | 10 pass, 1 failing: `lint`, an unused import in `src/table/sort.ts` |
> | Reviews | approved by alice, before the last 2 commits |
> | Review threads | 1 to do, 1 needs a reply |
>
> **Open review comments**
> - `src/table/sort.ts:41`, alice: empty values should sort last in both directions. To do.
> - `src/table/view.ts:88`, alice: asked for a test of the loading state. Done in the last commit, needs a reply.
>
> **From this conversation**
> - `branch-review regression` ran before the last two commits, so its result is stale for `sort.ts`.
> - Checking the table with a screen reader was put off.
>
> **Next steps**
> 1. Fix the sort order for empty values, and commit with the two uncommitted files.
> 2. Remove the unused import, so that `lint` passes.
> 3. Run `branch-review regression` again, since `sort.ts` changed after the last pass.
> 4. Push, reply on the two threads, and ask alice for a second look.
> 5. Run `manual-test-plan` for the screen reader case, then mark the PR ready for review.

The other skills report in the same spirit: a verdict first, findings in a table with `file:line`, and a list of what could not be verified.

## Install

Clone the repo and link the skills into your agent's skills folder. For Claude Code:

```sh
git clone https://github.com/MagnusBrogie/agent-skills.git ~/.agents/skills
mkdir -p ~/.claude/skills
for s in branch-review explain-branch manual-test-plan before-after voiceover worktree-status; do
  ln -s ../../.agents/skills/"$s" ~/.claude/skills/"$s"
done
```

## Requirements

- `git` for all of them.
- The GitHub CLI (`gh`), signed in, for anything that involves a pull request. `worktree-status` is built around it. `branch-review`, `explain-branch`, and `manual-test-plan` use it to find the base branch and read the pull request's comments, and carry on without it.
- `before-after` needs Node.js, and Playwright (`playwright` or `@playwright/test`) installed in the project you run it in. It uses the installed Google Chrome, or Playwright's own Chromium if Chrome is missing. The images go to `~/Documents/before-after/<repository>/<branch>/`; set `BEFORE_AFTER_DIR` to use another root.
- `voiceover` needs a macOS virtual machine on Apple silicon (the skill's examples use [Tart](https://tart.run)), with Node.js and the skill's own packages in it: `npm ci` and `npx playwright install webkit` in a copy of `voiceover/tool`. A run takes over the keyboard and the screen, and needs VoiceOver to be controllable with AppleScript plus wide macOS permissions (Accessibility, Automation, another app's data), which is why it runs in a guest. The skill has the reasons and the steps, and what it takes to run on the host instead.

## Orca

The skills don't need Orca, but three of them use it when it's there. `before-after` and `manual-test-plan` can drive Orca's embedded browser (and, for `manual-test-plan`, its emulator). `worktree-status` reads the Orca worktree's comment for extra context.

## License

[MIT](LICENSE)

## Local notes

`before-after`, `manual-test-plan`, and `voiceover` read a `LOCAL.md` beside their `SKILL.md` if there is one. Put your own defaults there, such as the command that starts your app against staging, the staging host, or where a saved login state lives. The file is ignored by git, so it stays on your machine. Facts that belong to one project are better kept in that project's own agent instructions.
