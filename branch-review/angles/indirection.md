# indirection: refactoring that reduces indirection

1. List every abstraction the diff added or changed: types and aliases, wrappers, helper functions, callbacks and function parameters, intermediate records, and modules that mostly pass things through.
2. For each one, find out how many places use it, what it buys, and what the code would look like without it. Look in particular for:
   - a helper with one call site;
   - a wrapper that only forwards to something else;
   - a type with the same shape and meaning as an existing one;
   - a parameter that every caller passes the same value for;
   - a value converted to another form and back again;
   - a callback where a direct call would do;
   - a layer that only renames things.
3. Decide whether removing it leaves the code easier to read. An abstraction earns its place when it gives a name to an idea, carries a guarantee in the types, hides a detail that changes, or gives the tests a seam. Do not suggest inlining something that makes the code harder to read.

Report a table:

| Abstraction | Location | Uses | What it buys | Verdict | Tradeoff |
|---|---|---|---|---|---|

The verdict is one of keep, inline, merge, or simplify. For each verdict other than keep, state what is gained and what is lost, and sketch the resulting code in a few lines when it is not obvious. Include the abstractions that should stay, in one grouped row, so the reader can see what was considered.
