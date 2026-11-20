# dependencies: awkward cross-module dependencies

1. List the dependencies the diff changed: search the diff for added and removed import lines in the project's language, and for exports that were added or widened. The findings come from this list.
2. For each new dependency from one module to another, establish:
   - **Direction:** does a lower-level or more general module now depend on a higher-level or more specific one? Does it create a cycle, or one that is only avoided by a workaround?
   - **Weight:** how much is used across it? A dependency on a whole domain to reuse one small mapping or helper is a poor trade.
   - **What crosses:** is it part of the other module's intended API, or an internal that was exported for this purpose (including exports added only for tests)?
3. For each changed file that belongs to a feature other than the one the branch is about, establish why it had to change.
4. For each awkward case, weigh the alternatives: keep the code local at the cost of slight duplication, move the shared part to a neutral module, or pass the value in as an argument.

Report a table:

| From → To | What is used | Concern | Verdict | Reason |
|---|---|---|---|---|

The verdict is one of fine, keep local, move to shared, or invert. Put the dependencies that are fine in one grouped row.
