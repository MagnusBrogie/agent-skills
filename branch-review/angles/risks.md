# risks: risks and confidence

1. List each behavior the branch changes. If a `regression` pass is in this conversation, start from its table.
2. For each one, state what gives confidence that it is right: a test that exercises it (name the test), the type system, a manual check that was done, or nothing.
3. Look for the ways it could fail in use that the tests would not show:
   - real data whose shape differs from the fixtures;
   - data saved, cached, or in flight from before the change;
   - the server and the client running different versions during a rollout;
   - other callers, platforms, locales, or account types;
   - volume: large lists, many accounts, slow networks;
   - timing: updates arriving late, twice, or in another order;
   - feature flags and configuration in each of their states.
4. Sort the failure modes into realistic and hypothetical. A realistic one has a path by which it happens; say what the path is.

Report a table of the realistic risks, most serious first:

| Changed behavior | Confidence from | Unverified | Failure mode | Likelihood | Impact on users | How it would be noticed |
|---|---|---|---|---|---|---|

After the table:

- The hypothetical concerns, one line each, with the reason they were set aside.
- The downsides of the change that are certain, not risks: what gets worse, slower, or harder to change.
- The manual validation still needed, as numbered steps someone can carry out, each with the expected result. If a manual test plan for this branch is in the conversation, do not write a second one: say which of its cases the risks above depend on, whether they have been carried out, and add only the cases it lacks.
- How hard the change would be to revert once released.
