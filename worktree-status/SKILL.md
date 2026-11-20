---
name: worktree-status
description: Report where the current worktree and its pull request stand and suggest the next steps - uncommitted and unpushed work, how far the branch is behind its base, whether the PR is a draft, failing checks, reviews, unresolved review comments, and what the PR description or this conversation left open - each next step paired with the skill or command that does it. Use when the user asks for the status of the worktree, branch, or PR, "where are we", "where does this branch stand", "what's left on this branch", "what's left before this can merge", "is this ready for review", "is this ready to merge", or comes back to a branch after a break. Not for "what's next" asked about the task in hand, which is a question about that task. Read-only apart from a git fetch - it reports and suggests, and does not edit, commit, push, or reply to comments.
---

# Worktree status

Answer two questions about the current worktree: where does it stand, and what should happen next. The reader may be returning after a day away or in the middle of a long session; either way they should be able to act on the answer without opening GitHub.

A status is built from three sources, and it needs all three:

1. **The worktree and the pull request**, read fresh by the script below.
2. **The conversation above this call**, which holds what the facts cannot show: what was already done, decided, or put off.
3. **The skills available in this session**, which turn "what is left" into "what to run".

## 1. Gather the facts

Run `scripts/gather.sh`, which sits beside this file, from the worktree. It prints everything in one pass:

```sh
<this skill>/scripts/gather.sh [--no-fetch] [base-branch]
```

It fetches the base and the branch from `origin` (so the ahead and behind counts are true), and otherwise only reads. The base is the pull request's base branch, then the repository's default branch, unless the request names one. Pass `--no-fetch` if the user asks for no network access to the remote.

The output covers: uncommitted files, an unfinished rebase or merge, unpushed commits, commits on the remote that are not here, the commits on the branch, how far the base has moved and which files both sides changed, the pull request's state (draft, mergeable, review decision, requested reviewers, labels), its description, the checks, the latest review per reviewer and whether it was made on the current head, every unresolved review thread, and the conversation comments.

The script never shortens anything silently, and never reports a failed read as an empty one. Hold the report to the same standard:

- A section that says `NOT READ` or `gh ... failed` was not read. Say so under "Not read"; do not present it as "nothing there". In particular, `NOT READ` under "Pull request" means it is unknown whether a pull request exists, which is different from `none`.
- A comment that ends in `...[TRUNCATED: ...]` was cut. A request often comes at the end of a long comment, so read the rest before sorting the thread: `gh api repos/{owner}/{repo}/pulls/comments/<id> --jq .body`, with the id being the digits after `discussion_r` in the thread's link.
- A `WARNING` line means threads, comments, or reviews beyond the page size were not read. Carry the warning into the report.

Then read what the script cannot:

- **The issue.** If the PR title, branch name, or description names an issue, and the project's instructions name an issue tracker with a tool for it in this session, read the issue's status and whether its description lists something the branch does not do yet. If there is no issue and the project expects one (a bot comment about a missing ticket ID is the usual sign), that is a next step.
- **Orca.** If the `orca` CLI is present and this is an Orca worktree, `orca worktree current --json` gives the worktree's comment and linked issue. The comment is a note the user or another agent left about this worktree; treat a non-empty one as an open item.
- **A failing check.** For each failing check, read enough of its log to say what failed in one line: `gh run view <run-id> --log-failed | tail -50`, with the run id taken from the check's link. A status that says only "CI is red" sends the user off to find out why.

Do not run the compiler, tests, or linters to produce a status; that is what the checks and the conversation are for. The exception is when the tree has changed since anything last ran (uncommitted or unpushed work, and nothing in the conversation shows a run after it): then say so, and make running them a next step.

## 2. Read the conversation above

Go back over the conversation before this call and collect:

- **What was done**: reviews run and with which angle, tests and compiler runs and their results, test plans written or carried out, screenshots made, comments answered.
- **What was found and not fixed**: review findings, failing cases, "unconfirmed" items.
- **What was decided**: a finding the user declined, a scope cut, a reviewer comment the user chose not to follow. These are closed. Do not raise them again as next steps.
- **What was put off**: "later", "after this", "in a follow-up", "remind me", a question nobody answered, something you said you would do and have not.

Check each item against the facts before using it. The conversation is a record of what was true when it was said: a finding from an hour ago may have been fixed in a later commit, and a test run from before the latest edit does not cover that edit. Where the tree has moved since, say that the result is stale; do not carry it forward as current.

If there is no conversation above (the skill was the first thing asked), say so in one line and lean on the commit log and the PR description instead. A description often states its own gaps ("not tried with VoiceOver", "not looked at in the app"); each such line is an open item until something shows it was done.

## 3. Work out what blocks what

### First, the state of the pull request

Everything after this section assumes an open pull request. Check that first:

- **No pull request.** The next step is to open one, as a draft if the work is unfinished. Before that come whatever the branch still needs: commit, push (a branch with no upstream has never been pushed), and a description. If the branch has no commits of its own against the base, there is nothing to open; say so.
- **Merged.** The work is done. Do not report on checks or threads as if they were open. What is left is tidying: the issue's status, any follow-up promised in the conversation or the review, and removing the worktree and the local branch. If the worktree has uncommitted work or commits that are not in the merged pull request (the head here differs from the head on GitHub), that is the headline: work is sitting on a branch that has already merged, and it needs a new branch and pull request.
- **Closed without merging.** Say so, and say why if a comment or the conversation shows it. The next step is the user's choice between reopening it, opening a new one, and dropping the branch; do not pick for them.
- **Open.** Carry on below.

`gh pr view` returns the most recent pull request for the branch name, so a merged or closed one may belong to earlier work on a reused name. If its commits are not the commits on this branch, treat the branch as having no pull request and mention the old one in a line.

### The merge state

GitHub reports two fields, and they are easy to misread:

| Value | Meaning |
| --- | --- |
| `mergeable: UNKNOWN` | GitHub has not worked it out yet, usual for a minute after a push. Not a conflict. Report it as unknown; do not guess. |
| `mergeable: CONFLICTING`, or merge state `DIRTY` | The branch conflicts with its base. Blocks merge; the fix is a rebase or merge of the base. |
| merge state `BEHIND` | The base has commits the branch lacks. Blocks merge only where the repository requires branches to be current; otherwise it is a note. |
| merge state `BLOCKED` | A required approval, a required check, or an unresolved thread is missing. Normal for a pull request awaiting review; name which requirement it is from the other sections. |
| merge state `UNSTABLE` | Mergeable, but a check that is not required is failing or pending. |
| merge state `DRAFT` | It is a draft. |
| merge state `CLEAN` | Nothing on GitHub's side stops the merge. |

### What each open item stops

Sort the open items by what they stop:

- **Blocks any further work**: an unfinished rebase or merge, conflict markers, a tree that does not compile.
- **Blocks review**: a draft PR, no reviewer requested, failing checks, a description that no longer matches the commits, unpushed commits (the reviewer and the checks see the head on GitHub, not the head here; when the two differ, every check result and review is about older code).
- **Blocks merge**: changes requested, an approval made on an older head where commits pushed since have changed the code (the reviews section says which head each review was made on; whether GitHub dismisses such an approval depends on the repository, so report it as "approved before the last N commits" and suggest asking for a second look), unresolved review threads, a branch behind its base where the repository requires it to be current, conflicts with the base, a missing approval.
- **Blocks nothing, but is owed**: validation the description admits was skipped, follow-ups promised in the conversation, the issue's status.

For review threads, read each one before counting it. A thread is unresolved on GitHub until someone clicks resolve, so sort them yourself:

- **To do**: the reviewer asked for something and the current tree, uncommitted work included, does not do it.
- **Done, needs a reply**: the tree does it, and the thread has no answer saying so.
- **Waiting on the reviewer**: the author had the last word.
- **Question**: the reviewer asked something that needs an answer, not a change.

Open the file at the thread's line to decide; do not judge from the comment alone. An outdated thread (the code under it has changed) is not thereby addressed. Bot threads count when they point at a real problem; say which they are.

## 4. Pair each next step with what does it

Look at the skills listed as available in this session and the project's own instructions, and for each next step name the one that does it. Use the list as it is in this session; do not rely on a remembered set, since skills are added and removed. As a guide to how the usual ones fit:

| Situation | Suggest |
| --- | --- |
| Coming back cold, or the branch is someone else's | `explain-branch` |
| No review of the code has happened in the conversation or on the PR | `branch-review general`, or the standard code review |
| Bugs fixed, behavior settled, more passes wanted | the next step in `branch-review`'s suggested sequence after the angles already run |
| Refactoring landed after a `regression` pass | `branch-review regression` again |
| The change is visible and the PR has no screenshots | `before-after` |
| The description says it was not checked in the app, or the change needs a screen reader or a device | `manual-test-plan`, then having it carried out |
| The diff touches an area a project skill covers (UI markup, a language's patterns, a page or endpoint recipe) and that skill has not been applied | that project skill |
| Work should go to another agent or worktree | `orca-cli` |
| Waiting on checks or a reviewer with nothing else to do | say that it is waiting, and on whom; offer `loop` only if the user wants it watched |

Steps with no skill get the plain command or action: push, rebase onto the base, mark ready for review, request a reviewer, update the description, reply to a thread, move the issue.

Follow what the project's instructions and the user's saved preferences say about these actions. If they say commits wait for the user's word, a next step reads "commit, when you are ready", not an offer to do it now.

Order the steps so that each is done on the code the next will see: finish changing code before pushing, push before asking for review, settle review comments before the last checks in the app. Do not suggest a step the conversation shows is done and still current, and do not suggest every skill that could apply. Three to six steps is typical; a branch that only needs a push and a reviewer gets two.

## Report

Keep it short enough to read at a glance. Lead with the verdict.

1. **In one line**: where the branch stands and the single thing holding it up. For example: "Draft PR #123, checks green on an older head; 3 commits unpushed and nothing has been checked in the app."
2. **Status table**: one row per area, with a mark and a few words. Leave out rows that do not apply; never leave out a row that has a problem.

   | Area | Status |
   | --- | --- |
   | Working tree | clean / 3 files uncommitted / rebase in progress |
   | Branch vs remote | in sync / 3 unpushed / 1 remote commit not here |
   | Branch vs base | current / 7 behind, 1 file changed on both sides |
   | PR | #, draft or ready, link / none yet / merged / closed / not read |
   | Checks | 11 pass / 1 failing: what, in one line / cover an older head |
   | Reviews | none requested / approved by / approved by, before the last 2 commits / changes requested by |
   | Review threads | none / 2 to do, 1 needs a reply, 1 waiting on the reviewer |
   | Issue | id and status / none linked |

3. **Open review comments**, only if there are any: one line each, with `file:line`, the reviewer, what they asked in a few words, the category from section 3, and the link.
4. **From this conversation**: what was done and still holds, what is stale, and what was put off. A few lines. Leave it out if there was no conversation.
5. **Next steps**: a numbered list in the order to do them. Each step is one line: what to do, why now, and the skill or command in backticks.
6. **Not read**: anything that could not be read (gh not signed in, the issue tracker not connected, a failed fetch), in one line.

Mark what is uncertain as uncertain. If the facts and the conversation disagree, report the facts and say what the conversation claimed.

Do not act on the next steps. End the report after them; the user picks.
