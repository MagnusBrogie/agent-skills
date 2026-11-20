# agent-skills

Skills for coding agents such as Claude Code, for working on a feature branch: reviewing it, explaining it, testing it, showing its visual changes, and checking where it stands.

| Skill | What it does |
| --- | --- |
| [`branch-review`](branch-review/SKILL.md) | Reviews the current branch against its base from one named angle (architecture, regression, tests, docs, scope, risks and more) or all of them. Read-only. |
| [`explain-branch`](explain-branch/SKILL.md) | Walks through a branch's changes step by step: data and control flow, why each abstraction exists, and which changes were needed versus chosen. Read-only. |
| [`manual-test-plan`](manual-test-plan/SKILL.md) | Writes a plan for testing the branch in the running app, split into cases an agent can run with a browser or simulator and cases a person has to do by hand, such as screen reader checks. |
| [`before-after`](before-after/SKILL.md) | Makes one image with a table of before and after screenshots for every visual change on the branch, taken from local builds of the base and the branch. |
| [`worktree-status`](worktree-status/SKILL.md) | Reports where the worktree and its pull request stand (uncommitted work, checks, reviews, open comments) and suggests the next steps. Read-only apart from a `git fetch`. |

## Install

Clone the repo and link the skills into your agent's skills folder. For Claude Code:

```sh
git clone https://github.com/MagnusBrogie/agent-skills.git ~/.agents/skills
mkdir -p ~/.claude/skills
for s in branch-review explain-branch manual-test-plan before-after worktree-status; do
  ln -s ../../.agents/skills/"$s" ~/.claude/skills/"$s"
done
```

## Requirements

- `git` for all of them.
- The GitHub CLI (`gh`), signed in, for anything that involves a pull request. `worktree-status` is built around it. `branch-review`, `explain-branch`, and `manual-test-plan` use it to find the base branch and read the pull request's comments, and carry on without it.
- `before-after` needs Node.js, and Playwright (`playwright` or `@playwright/test`) installed in the project you run it in. It uses the installed Google Chrome, or Playwright's own Chromium if Chrome is missing. The images go to `~/Documents/before-after/<repository>/<branch>/`; set `BEFORE_AFTER_DIR` to use another root.

## Orca

The skills don't need Orca, but three of them use it when it's there. `before-after` and `manual-test-plan` can drive Orca's embedded browser (and, for `manual-test-plan`, its emulator). `worktree-status` reads the Orca worktree's comment for extra context.

## License

[MIT](LICENSE)

## Local notes

`before-after` and `manual-test-plan` read a `LOCAL.md` beside their `SKILL.md` if there is one. Put your own defaults there, such as the command that starts your app against staging, the staging host, or where a saved login state lives. The file is ignored by git, so it stays on your machine. Facts that belong to one project are better kept in that project's own agent instructions.
