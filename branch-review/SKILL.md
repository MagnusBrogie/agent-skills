---
name: branch-review
description: Review the current branch against a base branch from one named angle - general, indirection, architecture, dependencies, tests, regression, mappings, docs, scope, risks, or fresh - or all of them with "all". Use when the user invokes branch-review or asks for one of these angles by name or meaning ("architectural pass", "regression audit", "audit the mappings", "review the test quality", "is the ADR too detailed", "is this in scope", "what are the risks", "what did we miss"). Not for a plain "review this" with no angle - use the standard code review for that. Read-only - it reports findings and does not edit code.
---

# Branch review

Review the changes on the current branch from one angle at a time. Each angle is a separate question about the same diff, and a pass that tries to answer all of them at once answers none of them thoroughly.

## Pick the angle and the base

The request names an angle and, optionally, a base branch, for example `branch-review tests` or `branch-review regression against release/2.4`.

- With no angle given, run `general`.
- With several angles given, do the shared work once (settle the base, gather the changes, read the review comments, run the compiler and tests), then run the angles one after another and report each under its own heading.
- With `all` given, run every applicable angle as described in `angles/all.md`.
- With `help` given, or when asked what the options are, print the help text below and stop. Do not gather the changes or review anything.

If the request adds its own focus ("only the decoder changes", "ignore the tests"), that narrows the angle; it does not replace it.

### The base

With no base given, choose it in this order:

1. The base branch of the branch's pull request, if it has one: `gh pr view --json baseRefName --jq .baseRefName`. A stacked pull request targets its parent branch, and reviewing it against the default branch would pull the parent's changes into the review.
2. The repository's default branch: `git symbolic-ref --short refs/remotes/origin/HEAD`.
3. `origin/main`, then `main`.

Use the remote-tracking ref (`origin/<branch>`) in preference to a local branch of the same name, which may be out of date. Do not fetch unless asked. State the base and the merge-base commit at the top of the report.

### Help text

```
branch-review [angle ...] [against <base-branch>] [extra focus in plain words]

general       bugs, mistakes, edge cases, simplifications, readability (the default)
indirection   wrappers, aliases, helpers, and intermediate types that could go
architecture  fit of module boundaries, responsibilities, and APIs with the codebase
dependencies  awkward dependencies between modules, exported internals
tests         a verdict per test: keep, simplify, merge, or remove; plus untested behavior
regression    hunk-by-hunk audit of every behavior change, intended or accidental
mappings      entry-by-entry audit of mappings against the authoritative source
docs          whether ADRs, glossaries, and doc comments belong, are true, and are proportionate
scope         whether the changes stay within the purpose of the PR
risks         realistic failure modes, what the tests cover, manual validation needed
fresh         what the earlier passes missed
all           every applicable angle, then one consolidated report (expensive)
help          this list
```

## Gather the changes

Review everything that differs from the base, including work that is not committed yet:

```sh
base=$(git merge-base <base> HEAD)
git diff --stat "$base"          # committed + staged + unstaged
git status --short               # untracked files are not in the diff; read them
git log --oneline "$base"..HEAD  # intent of each commit
git diff --stat HEAD             # the uncommitted part on its own
git show "${base}:<path>"        # a file as it was on the base (keep the braces; zsh misreads "$base:t...")
```

If nothing differs from the base (an empty stat and no untracked files), say so, name the base that was used, and stop; a wrong base is the usual cause.

Start from the stat, then read the diff. Read the changed files in full where the diff alone hides context, and read the callers and neighbors of anything whose behavior or signature changed. Read the project's own instructions and docs (AGENTS.md, CLAUDE.md, architecture docs, ADRs) when the angle depends on project conventions. Apply the project review skills those instructions call for when they bear on the angle; skip them when they do not, and say so. This holds even where the project says to apply a skill to every review: one angle is a part of a review, and the skill belongs to the angle it informs (a patterns skill to `architecture` and `indirection`, an accessibility skill to `general` and `regression` when the diff changes markup).

When a finding sits only in uncommitted work, say so in the report: it tells the user the problem is recent and not yet in the branch history.

### Existing review comments

If the branch has a pull request, read what human reviewers have already said. Select by account type, which leaves out bot reviews (they can run to tens of kilobytes) without guessing from login names:

```sh
pr=$(gh pr view --json number --jq .number)
gh pr view --json title,body,baseRefName
for kind in "issues/$pr/comments" "pulls/$pr/reviews" "pulls/$pr/comments"; do
  gh api "repos/{owner}/{repo}/$kind" --paginate --jq '.[]
    | select(.user.type != "Bot" and (.body // "") != "")
    | {id, reply_to: .in_reply_to_id, user: .user.login, path, line: (.line // .original_line), body}'
done
```

The three lists are the conversation comments, the review summaries, and the inline comments on lines of the diff. An inline comment with `reply_to` set is a reply in the thread of the comment with that `id`; read the author's replies before deciding whether a comment is still open.

If `gh` is not installed or not signed in, the repository is not on GitHub, or the branch has no pull request, skip this step and say in the report that existing review comments were not read. If the project's instructions name another code host and a tool for it is available, use that.

With the comments in hand:

- Treat each comment as a sample of a wider concern. A reviewer who objects to one paragraph or one function has usually shown what they think of the rest; look for every other place in the diff where the same objection applies, and report those.
- Check whether each comment has been addressed in the current tree, including uncommitted work, and list the ones that have not.
- Do not report a reviewer's own point back as a new finding. Name the reviewer when a finding extends their comment.

In the report, put the status of the comments in a short table of its own, before the findings: the comment and its status. The status is one of addressed, not addressed, partly addressed, or declined (the author answered, in a reply or in the code, with a reason for leaving it; give the reason). Give a row to each comment that bears on the angle, and one grouped row to the rest that names the angle they belong to.

### Running things without touching the tree

The working tree is read-only for this review, but running the compiler and the tests is encouraged when it is cheap and the angle's findings depend on it (`general`, `tests`, `regression`, `mappings`, `risks`). Running them in place on the unmodified tree is fine; build output written to the project's usual ignored folders does not count as touching the tree. If the tree turns out not to compile or the tests cannot run, that is the first finding in the report, whatever the angle.

To run something that needs a change (getting past a compile error, or mutating production code to see whether a test notices), work on a copy:

1. Create a temporary directory with `mktemp -d`, outside the repository.
2. Copy only what the build and the tests need: the sources, the tests, and the build configuration. Leave out version control data, build output, and dependency folders; symlink the dependency folders from the original if the build needs them.
3. Make the change in the copy and run there.
4. Delete the directory when the review is done.

Say in the report what was run, and that it ran in a copy.

### Large diffs

Judge size by what the angle needs to read, not by the whole diff: `tests` needs the tests and the code they exercise, `regression` needs every hunk. When that part is too large to hold in view at once (roughly more than 1,000 changed lines or 20 files), do not read it in one piece and do not sample it:

1. From the stat, group the changed files into areas that can be reviewed on their own (a module with its tests, a feature, a layer).
2. Review one area at a time with `git diff "$base" -- <paths>`, and write down the findings for that area before moving on.
3. If the areas together are more than you can read with care in one pass, and subagents are available, consider handing each area to one, giving it the angle's full instructions, the base commit, and the paths. Check its findings against the code yourself before reporting them. A diff that reads comfortably in four or five area-sized pieces does not need this.
4. Afterwards, look once across areas for what a per-area pass cannot see: a change in one area that breaks an assumption in another.

State in the report which areas were covered. If any part was not reviewed, say so; never let a partial pass read as a complete one. The `regression` and `mappings` angles must cover every changed hunk, however large the diff.

## Angles

Each angle has its own file in the `angles` folder next to this file. Read the file for the angle you are running, in full, before starting; it gives the method and the form of the report. Do not run an angle from its one-line summary in the help text.

The file for an angle is `angles/<name>.md`, with the names listed in the help text; `all` has `angles/all.md`.

Read only the files for the angles you are running. Everything else in this file applies to every angle.

## Suggested sequence

The angles can be run in any order, but when a branch gets several passes this order wastes the least work. Each step is a separate run. The review itself never edits; the user fixes what a pass finds before starting the next, so that later passes review the code that will be merged.

1. **`explain-branch`** (a separate skill): understand the change before judging it.
2. **`general`**: find the bugs first. There is little point polishing code that is wrong.
3. **`regression`**, and **`mappings`** when the branch touches mappings: confirm that what was meant to stay the same did.
4. **`tests`**: once the behavior is settled, check that the tests pin it down.
5. **`indirection`**, **`dependencies`**, **`architecture`**: the shape of the code, from the smallest scale to the largest. Run `regression` again afterwards if these lead to refactoring.
6. **`docs`**: after the code has stopped moving, so the documents are checked against the final state.
7. **`scope`**: decide what stays in this PR and what moves to a later branch.
8. **`manual-test-plan`** (a separate skill): write the plan for checking the branch in the running app, and have it carried out. It comes this late on purpose. Running cases in the app is the most expensive step in the sequence, so it should happen once, on the code that will be merged, after the cheaper passes have found what reading and code tests can find. Every code change after it means running some of its cases again.
9. **`risks`**: what is still unverified once the plan has been carried out.
10. **`fresh`**: last, when the earlier passes are there to look past.

A small branch does not need all of this: `general`, `tests`, and `risks` cover most of it. At the end of a single-angle report, name the next step in this sequence that applies to the branch, in one line; it may be one of the separate skills.

## Verify before reporting

Confirm each finding against the code before reporting it: follow the call, read the caller, check the type, or run the test or compiler when that is cheap. Drop findings that do not survive. If a finding could not be confirmed, report it as unconfirmed and say what would confirm it.

## Report

Do not edit code. Report the findings and let the user decide what to change.

Write the report in this order, leaving out a part that does not apply:

1. **Base:** the base and the merge-base commit, in one line.
2. **Verdict:** the conclusion for this angle in one or two sentences. If the tree does not compile or the tests cannot run, that comes first.
3. **What was checked:** the areas covered, what was run and where, and which project review skills were applied or skipped.
4. **Existing review comments:** the table of comments that bear on the angle and whether the current tree addresses each.
5. **Findings:** the table the angle defines, followed by whatever the angle asks for after its table. For an angle without a table, list the findings with the most severe first, each with `file:line`, what is wrong or could be better, and the concrete case where it matters.
6. **Not verified:** what could not be confirmed, and what would confirm it.
7. **Outside the angle:** anything important noticed that belongs to another angle, one line each, without expanding on it.
8. **Next:** the next step in the suggested sequence that applies to the branch, in one line.

Throughout:

- Keep concrete problems separate from optional preferences, and label each. Where the angle has verdicts, the verdict is the label.
- Mark the findings that sit only in uncommitted work.
- If the angle turned up nothing, say so; part 3 then carries the weight.
