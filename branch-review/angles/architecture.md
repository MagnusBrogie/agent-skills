# architecture: architectural fit

1. Read the project's architecture docs and decision records first.
2. For each module, type, or public API the diff adds or reshapes, find the two or three nearest existing counterparts in the codebase: the modules that do the same kind of job for another feature.
3. Compare the new code with them on:
   - where it lives;
   - what it is responsible for, and whether that is one thing;
   - what it exposes, and whether the API is minimal and hard to misuse;
   - which layer the logic sits in (domain, service, page, view);
   - how state, effects, and errors flow through it;
   - which way its dependencies point;
   - naming.
4. Ask whether the codebase already had a facility for this that the diff duplicates, and whether the next similar feature would fit the structure this branch leaves behind.

Report a table:

| Element | Existing pattern | What this branch does | Verdict | Suggestion |
|---|---|---|---|---|

Give the location of an example for each existing pattern. The verdict is one of fits, justified departure, or unjustified departure. For a departure that is better than the existing pattern, say so, and say whether the pattern should change elsewhere; that is a separate piece of work, not a finding against this branch.
