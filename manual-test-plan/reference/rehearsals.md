# Rehearsals

Read this when the plan has a human case marked must pass. It says how an agent rehearses each kind of human case, and how the plan records it.

- **Screen reader rehearsal.** The agent goes through the flow using only the accessibility tree, as someone who cannot see the screen would, in the browser and, where the app ships there, in the simulator:
  1. Read the tree of the screen in reading order and write down, for each element a screen reader would stop on, what it would be expected to announce: name, role, state, and value.
  2. Carry out the task of the case (find a figure, sort a table, open a sheet, complete a form) by choosing each next step from the tree alone, without looking at a screenshot.
  3. After each action, read the tree again: where focus went, what changed, and whether the change is exposed (a live region, a state change on the control, moved focus) or happens silently.
  4. Record what would trip a listener: a control with no name, or named by its icon or by placeholder text; several controls with the same name and nothing to tell them apart; a value read without its label or its unit; a table without header relationships; decorative content that is not hidden; content that is visible but missing from the tree; a loading or error state that nothing announces; an order in the tree that differs from the order on screen.
  5. Write out the expected announcements as a transcript. The human compares it with what the screen reader says.

  These five steps are what the agent does when the rehearsal is run. The plan only states the flow to walk through, the task to carry out, and that the transcript is the evidence; it does not try to write the transcript in advance.
- **Visual rehearsal.** The agent captures the screen in each state, size, and appearance the human case covers, and reports the facts (cut off, overlapping, misaligned by measurement, contrast ratio computed from the colors) with its own assessment, marked as an agent's opinion. The human judges from the screenshots and then in the app.
- **Real device rehearsal.** The agent runs the same steps in the simulator. The human repeats on hardware what a simulator does not show.
- **Wording and product judgment.** The agent reads the text in context and reports what it finds unclear or inconsistent with the rest of the app, again as an opinion.
- **Real consequences.** Where the action is safe for an agent (see "Actions with real consequences" in `SKILL.md`), there is no human case to rehearse: the agent carries it out. Otherwise the agent does not perform the action. It can still rehearse the state the action leads to: rewrite the response to what the backend is expected to send afterwards, and check what the app shows. Say on the human case that the rehearsal covered the end state only, and not the action, the transition, or what the backend really sends.
- **No rehearsal** for signing in with a personal credential. Say so on the human case.

Write each rehearsal as an agent case in the agent's list, marked "Rehearses: H3", and mark the human case "Rehearsed by: B7". A human case marked should check is not rehearsed; write "Not rehearsed" on it, and point to evidence from another agent case if one happens to collect it. On the human case, say in one line what the rehearsal cannot show, so that the person spends their time there.
