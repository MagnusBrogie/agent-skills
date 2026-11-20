# fresh: fresh-angle review

This angle depends on knowing what has been reviewed already. Establish that first:

- If earlier passes are in this conversation, list in a few lines which angles ran and what they concluded.
- If the user supplied earlier findings or notes, use those.
- If there is neither, say so at the top of the report, and proceed by choosing the angles a standard review is least likely to have covered. Do not pretend to know what was reviewed.

Then look for an important angle or assumption that was missed. Focus on gaps in the reasoning and the validation:

- What did every earlier pass assume without checking?
- Which inputs, states, or user paths did nobody consider (real production data shapes, old persisted data, concurrent updates, other callers, other platforms)?
- What do the tests and the reviews share as a blind spot, for example fixtures that all have the same shape?
- What is absent from the diff that should be there (a migration, a caller that was not updated, a doc)?

Do not repeat earlier findings.
