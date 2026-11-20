# general: correctness and improvement

Find what is wrong first, then what could be better. Keep the two apart in the report.

1. Establish what the change is meant to do, from the commits and the pull request description. A bug is a difference between that and what the code does.
2. Read each changed function in full, with its callers. For each one, walk through:
   - **Edge inputs:** empty, missing or null, zero, negative, very large, duplicated, and any variant the types allow but the code does not expect.
   - **Error paths:** what happens when a request fails, a decode fails, or a lookup finds nothing; whether the error is reported or swallowed.
   - **State and ordering:** what the code assumes has already happened; stale state; two updates arriving in the other order.
   - **Arithmetic and conversions:** units, currencies, rounding, integer versus fractional values, off-by-one at boundaries.
   - **Callers:** when a signature or a meaning changed, whether every caller was updated; when code was removed, what relied on it.
3. Run the compiler and the tests if that is cheap.
4. Then look for improvements: simplifications that do not change behavior, names that mislead, comments that are wrong or restate the code, dead code, and duplication introduced by the diff.

Report the problems in a table, most severe first:

| Severity | Location | Problem | Failing case | Confirmed? |
|---|---|---|---|---|

The failing case is a specific input or sequence and the wrong result it produces. A problem without one is a suspicion; mark it unconfirmed. Where the code path is confirmed but it is not known whether the triggering input can occur, say exactly that in the last column, and say what would settle it.

A problem that also exists on the base is a finding only when the diff touches that code or the pull request claims to fix it. Mark it as already present on the base. After the table, list the improvements separately, each marked worthwhile or optional, with the reason.
