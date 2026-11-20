# all: every angle

`all` runs every angle. It is the expensive option: each angle is a full pass over the diff, so expect roughly ten times the cost and time of a single angle. Run it only when the user asked for `all` or for every angle; never choose it on your own.

`all` reviews the tree as it stands, with no fixes between the angles. It is a snapshot. If its findings lead to substantial changes, the angles that depend on the final state of the code (`regression`, `tests`, `docs`) are worth running again afterwards; say so at the end of the report when that applies.

1. **Decide which angles apply.** From the stat, skip an angle that has nothing to look at: `tests` when no test was added, changed, or deleted, `docs` when no documentation changed, `mappings` when no mapping changed. List each skipped angle with the reason. When in doubt, run it.
2. **Do the shared work once.** Settle the base, read the existing review comments, and run the compiler and the test suite a single time. Every angle uses these results. Several passes building in the same tree at once get in each other's way.
3. **Run each angle as its own pass**, following that angle's file in full, with its own table. Do not merge angles into one reading of the diff; the angles ask different questions and a combined pass answers each of them worse.
   - If subagents are available, give each angle to its own subagent and run them in parallel. Give each one the path to this skill's `SKILL.md` and to its angle file, with the instruction to read both in full, the base commit, the review comments, the compiler and test results, and two instructions: edit nothing, and do not build or run tests in the working tree (a copy made as `SKILL.md` describes is fine). Tell each one to use the base, the review comments, and the build results it was handed and not to gather them again, and to do the work itself without delegating to further subagents. Do not pass one angle's findings to another; independent passes are the point.
   - Without subagents, run the angles one after another in the order of the suggested sequence in `SKILL.md`: `general`, `regression`, `mappings`, `tests`, `indirection`, `dependencies`, `architecture`, `docs`, `scope`, `risks`.
4. **Run `fresh` last**, after every other angle has reported, and give it their findings. It is the one angle that needs them.
5. **Check the findings yourself** before reporting: confirm each concrete problem against the code, and drop or mark the ones that do not hold.
6. **Write one consolidated report:**
   - The overall verdict in two or three sentences, and whether the tree compiles and the tests pass.
   - The concrete problems from all angles in one list, most severe first, each naming the angle or angles that found it. Merge duplicates; a problem found independently by two angles is stronger evidence, so say so.
   - Where two angles disagree (one says remove a helper, another says it is the right boundary), put both views side by side and give a recommendation.
   - Then one section per angle with its findings (part 5 of the report outline in `SKILL.md`) and its optional preferences. The base, what was checked, and the review comment status appear once, at the top of the consolidated report, not in every section.
   - The angles skipped, and anything that was not verified.
