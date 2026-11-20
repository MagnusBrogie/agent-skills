# mappings: mappings and data-contract audit

1. List every mapping that was added or modified: case expressions, lookup tables, encoders and decoders, enum conversions, sort keys, filters, labels.
2. For each mapping, find the authoritative source: the API contract, schema, backend code, fixtures, or documentation.
3. Go entry by entry and record the result in the table below. Include the unchanged entries of a modified mapping, since a dropped entry is only visible against the full old list.
4. Check that the sides of each mapping agree: everything the decoder can produce is handled by the filter, the sort, and the renderer, and the encoder and decoder round-trip.
5. Check catch-all branches: say what falls into each one and whether that is right.

Report a table:

| Mapping | Key | Old value | New value | Source checked | Result |
|---|---|---|---|---|---|

The result is one of correct, wrong, missing, duplicate, or unverified. Put wrong, missing, and duplicate rows first. If no authoritative source is available for an entry, mark it unverified and say what would verify it. After the table, report what steps 4 and 5 found.
