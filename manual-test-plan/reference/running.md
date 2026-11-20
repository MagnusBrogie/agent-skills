# Running the agent cases

Read this when the user has said yes to the offer, or has asked for the agent cases to be run. Do not run anything before that.

## Before the first case

1. Start the local staging build as the plan's setup says, and check the request host before signing in.
2. Sign in with the sign-in skill or the documented test-account flow. Never ask for a password in the chat, and never print one. A test account may allow one session at a time: signing in from a second browser (a script, a screen reader run) can sign the first one out. Sign in again in the browser a case needs before running it, and say in the report which sessions were replaced.
3. Run the cases under the rules below.

## When the state a case needs is not there

The data on the test account, the screen as it loads, or the tool in hand will often not give a case what it needs. That is a problem to solve, not a result to report. "Not exercised" is the last answer, after the ways below have been tried, and a case reported that way says which were tried and why each failed.

Work through these, cheapest first:

1. **Use the app as a user would.** Most states are one or two actions away: a setting or a toggle (hide values, another currency, dark mode), another account or portfolio, a filter, a sort, a date range, an empty search, a sheet opened and closed again. Read the screen's code or its controls for what switches the state on.
2. **Look where the state already is.** Another row, another screen that renders the same component, or the project's component catalogue, which usually shows every state without a sign-in.
3. **Make the state.** Rewrite a response so that the field is null, the list is empty, or the value is huge; fail a request; set a flag or the clock in the page. `mocks.md` in this folder says how, and how to make it repeatable. A case planned on real data may be run on a mock when the real data lacks the state: say so in the result.
4. **Hold a passing state still.** A loading or transitional state is gone before it can be measured. Stall the request it waits for, do everything the case asks while it is held (scroll, resize, read the tree), then release it. Sampling while the page loads leaves the result to chance.
5. **Use another tool for what this one cannot do.** If the browser at hand cannot intercept requests, read the clipboard, or set a viewport, a scripted browser can. If the real action would touch the user's own machine (their clipboard, their keyboard, their screen reader), do the real action in an isolated place such as a virtual machine or a separate browser profile, in preference to a simulated one on the host.
6. **Find the control another way.** When a locator does not match, the control is still on the screen: list what is there (roles, names, text) and pick it from that. A button that is not a tab, or a link that is a button, is not a missing feature.

Stay within the other rules while doing this: no edits to the working tree, no production backend, no action with real consequences outside a safe environment, and nothing the user would have to clean up. If a way in would break one of these, it is not available; go to the next.

Carry out the substitute and report it as what it is. "Passed on a mocked response, the account had no such row" is a result. A simulated action (an event fired from script in place of a keystroke) is weaker evidence than the real one: say which was used, and what the real one would add.

Only when these are exhausted is the case blocked or not exercised. Then say what state was missing, what was tried, and what would make it runnable: a test account with a given shape of data, a tool, a permission.

## Rules for the run

- Run the cases marked must pass only, unless asked for more, in the order given.
- Keep the evidence each case names.
- Report each case as passed, failed, or blocked, with what was seen. Say how the state was reached when it was not the way the plan gave. Do not report a part of a case as not exercised before the ways in "When the state a case needs is not there" have been tried.
- Stop and report when a failure makes the cases after it meaningless.
- Report a rehearsal as a rehearsal: what it found, and that the human case is still open. Never mark a human case as done.
- Stop before any action with real consequences that the plan did not place in a safe environment. Before the first such action in a run, confirm that the local build is talking to that environment's backend and that the browser is signed in as the test account the plan names.
- Never run a case, mocked or not, against a production backend or a production deployment.
- Edit no code in the working tree. A mock that needs a patch goes in a throwaway copy, as the plan's setup says.
- When a rehearsal finds a problem, say that the human case waits until it is fixed.
- A screen reader run takes over the machine: follow that tool's instructions, run it alone, and check afterwards that the screen reader is no longer running.
- Clean up when the run is over: stop the servers you started, remove any throwaway copies and mocks, and delete any saved session files.
