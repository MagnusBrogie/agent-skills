# scope: scope and API discipline

Establish the purpose of the PR before judging anything against it. Read the linked issue; do not infer the purpose from the code alone, since code that drifted out of scope will describe a purpose that includes the drift.

1. Find the issue identifier in the branch name, the commit subjects, the PR title, or the PR body (for example `ABC-123` in `fix/abc-123-short-description`). A linked issue may also show up as a tracker bot's comment on the PR.
2. Find out which tracker the project uses from its instructions (AGENTS.md, CLAUDE.md, contributing docs), and look the issue up with the tool available for it: a tracker integration or MCP tool, or `gh issue view` for GitHub Issues. Read the description, the acceptance criteria, and the discussion.
3. Read the PR description as well. Where the issue and the PR description disagree about the purpose, say so; the PR may have grown, or the issue may be out of date.
4. If there is no identifier, or the tracker cannot be reached, say so at the top of the report and state that the purpose was taken from the branch name, commits, and PR description only.

State the purpose in one sentence, with its source. Then go through the changed files, grouping hunks that belong together, and report a table:

| Change | Category | Needed for the purpose? | Could it be avoided or deferred? |
|---|---|---|---|

The category is one of needed, supporting (tests and docs for the needed changes), or outside the purpose. Put the rows outside the purpose first. For every change to an API between modules, and every change to behavior that unrelated features use, say whether the same result could be reached without it. After the table, list what belongs on a later branch, as pieces of work that could each be split off.
