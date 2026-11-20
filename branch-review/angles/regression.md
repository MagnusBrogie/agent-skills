# regression: behavior-preservation audit

Work through the diff hunk by hunk; do not summarize by file.

1. Classify each hunk as a refactor (no behavior change intended), an intended behavior change, or new code. Use the commits, the PR purpose, the tests, and any docs or ADRs changed in the diff to decide what was intended; a decision record in the diff is usually the best evidence there is.
2. For each refactor hunk, put the old and new code side by side and check what the hunk touches from this list: rendered structure, classes, text, interactions, state transitions, decoding, sorting, handling of missing values, and error reporting. Do not trust names, comments, or commit messages as evidence that behavior is the same.
3. For each difference, find an input or state where old and new behave differently, or establish that none exists. Pay attention to empty collections, missing or null values, zero, negative numbers, rounding, ties in sort order, and the order of evaluation. For anything sorted, check the order in which the collection reaches the sort as well as the comparator: a changed dictionary order or a fold that reverses a list changes how ties come out.
4. For intended behavior changes, check that the change is limited to what was intended. Look for side effects the stated intent does not mention, and for other callers the change reaches.
5. Trace each changed data flow from end to end across files, in its old and its new form. Changes in how steps are ordered or composed are invisible when hunks are read one at a time. On a large diff, do this tracing yourself over the whole flow, even if the hunk-by-hunk reading was split by area.

Report every behavior change, however small, in a table:

| Location | Old behavior | New behavior | Input where they differ | Intentional? | Evidence |
|---|---|---|---|---|---|

- Mark each row as intentional, accidental, or unclear. A side effect of an intended change that the evidence does not mention is unclear, not intentional.
- Put accidental rows first, then unclear, then intentional.
- The same change repeated across parallel files may share a row that names all the locations.

After the table, show the coverage: the number of hunks of production code read, how many were classified as refactor, intended change, and new code, and which refactor hunks were checked and found to preserve behavior. Count docs and test hunks separately. Then list what could not be verified by reading alone and what would verify it.
