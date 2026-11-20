# tests: test quality and proportionality

Go through every test that was added or changed and give each a verdict. Find the tests by content, not by path: some projects keep tests inline in production modules, and a search of the test directory alone will miss them. Check also for tests that were deleted.

For each test, ask:

- What production change would make this test fail? If none would, or only a rename would, it protects nothing. Where the answer is not obvious, try the change in a copy and run the test.
- Could the assertion pass for the wrong reason (both sides computed by the same code, a default that happens to match, an empty list satisfying an "all" check)?
- If it failed, would the message tell the reader what broke?
- Does it go through the production path it claims to cover, or does it build its own version of the logic?
- Does another test already pin the same behavior?

Report a table with one row per test (or per group of near-identical tests):

| Test | Protects | Verdict | Reason |
|---|---|---|---|

The verdict is one of keep, simplify, merge, or remove, and it serves as the finding's label. Say for each verdict whether it was confirmed by running a mutation or reasoned from the code. Mechanical edits to fixtures that change no assertion get one summary row marked "fixture only". After the table, list the meaningful behavior in the diff that has no test.
