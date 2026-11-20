# docs: documentation fit and proportionality

Review the documentation added or changed in the diff as content to be judged, not as a statement of intent to be trusted: decision records, glossaries and context files, guides, READMEs, the pull request description, and doc comments. The other angles use these documents as evidence; this is the angle that questions them.

Doc comments in code are in scope only where they restate one of the documents, record history or a decision, or make a claim that reaches beyond their own function ("every screen does this"). Give those a row each and cover the rest with one grouped row.

To check whether a claim is true, search the code for that claim; this angle does not need the whole diff read area by area.

First find out what each kind of document is for in this project: read the project's own guidance on its docs and two or three existing documents of the same kind. Then go through each changed document section by section and ask:

- **Does this belong in this document?** A decision record holds the context, the decision, the alternatives rejected, and the consequences. It does not hold a description of how the app behaves, a walkthrough of the implementation, or definitions of domain terms. Shared vocabulary belongs in the glossary or context file; behavior belongs in code and tests.
- **Will it go stale?** References to specific functions, modules, line numbers, tickets, team names, or dates are out of date as soon as the code moves. A lasting document names the concept, not the identifier.
- **Is it proportionate?** Compare its length and level of detail with neighboring documents of the same kind. For each section, ask what a reader would lose if it were cut; if the answer is nothing they could not get from the code, cut it.
- **Is the document explaining something the code should fix?** A paragraph that explains a confusing behavior or a limitation of a component is a sign that the component could be improved instead.
- **Is it true?** Check each factual claim against the code in the current tree. Documents written early in a branch drift from where the code ended up.
- **Is anything duplicated** between the documents, or between a document and the code comments?

Report a table with one row per section or passage:

| Document | Section | Verdict | Reason | Where it belongs |
|---|---|---|---|---|

The verdict is one of keep, correct, shorten, move, or cut. Use correct for a claim that is untrue or out of date, and list those rows first: an untrue statement is a concrete problem, while most shorten and cut verdicts are matters of proportion. Say which rows are which. After the table, say what each document would contain if the verdicts were applied, in a few lines, so the user can see the target shape.
