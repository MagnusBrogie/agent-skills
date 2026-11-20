---
name: explain-branch
description: Explain the changes on the current branch against a base branch hyperpedagogically - trace data and control flow, explain why each abstraction exists, and separate necessary changes from implementation choices. Use when the user asks to explain, walk through, or get up to speed on a branch, diff, or PR, often as a precursor to reviewing it. Read-only.
---

# Explain branch

Explain the changes on the current branch so that a reader who has not seen the code can follow exactly what changed and why. This is a teaching walkthrough and often the precursor to a review; it is not itself a review.

## Gather the changes

The request may name a base branch. With none given, choose it in this order:

1. The base branch of the branch's pull request, if it has one: `gh pr view --json baseRefName --jq .baseRefName`. A stacked pull request targets its parent branch, and explaining it against the default branch would pull the parent's changes into the explanation.
2. The repository's default branch: `git symbolic-ref --short refs/remotes/origin/HEAD`.
3. `origin/main`, then `main`.

Use the remote-tracking ref (`origin/<branch>`) in preference to a local branch of the same name, which may be out of date. State the base at the top of the explanation.

Include work that is not committed yet:

```sh
base=$(git merge-base <base-branch> HEAD)
git diff --stat "$base"          # committed + staged + unstaged
git diff "$base"
git status --short               # untracked files are not in the diff; read them
git log --oneline "$base"..HEAD
```

Read the changed files in full, plus the callers and the code that the changes call into, far enough to explain the flow from end to end. Read the project docs that define the domain terms involved.

## Explain

Be hyperpedagogical: assume an intelligent reader who does not know this part of the codebase. Define each domain term and each project-specific type the first time it appears, and do not skip steps that seem obvious from inside the code.

1. **The problem.** What was wrong or missing before, shown with a concrete example: specific input, what happened, what should have happened.
2. **The shape of the solution.** The approach in a few sentences, before any detail.
3. **Data and control flow.** Trace the path from where the data enters (API response, user action, route) through each transformation to where it is rendered or acted on. Name the function and `file:line` at each step, and say what the data looks like before and after. Carry one concrete example through the whole trace.
4. **Each abstraction.** For every type, function, or module that was added or changed, explain why it exists: what it guarantees, what would go wrong without it, and what the simpler alternative would have been.
5. **Necessary versus chosen.** Separate the changes the fix or feature requires from the implementation choices that could reasonably have gone another way. For each choice, name the alternative.
6. **Supporting changes.** Tests, docs, and mechanical edits, briefly, with what each test pins down.

Use small code excerpts and before/after comparisons where they make a point clearer than prose. Order the explanation by the flow of data, not by the order of files in the diff.

Do not edit code. If something looks like a bug while reading, note it in one line at the end and leave the reviewing to a review pass.
