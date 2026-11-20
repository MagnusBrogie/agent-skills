# Running the agent cases

Read this when the user has said yes to the offer, or has asked for the agent cases to be run. Do not run anything before that.

## Before the first case

1. Start the local staging build as the plan's setup says, and check the request host before signing in.
2. Sign in with the sign-in skill or the documented test-account flow. Never ask for a password in the chat, and never print one. A test account may allow one session at a time: signing in from a second browser (a script, a screen reader run) can sign the first one out. Sign in again in the browser a case needs before running it, and say in the report which sessions were replaced.
3. Run the cases under the rules below.

## Rules for the run

- Run the cases marked must pass only, unless asked for more, in the order given.
- Keep the evidence each case names.
- Report each case as passed, failed, or blocked, with what was seen.
- Stop and report when a failure makes the cases after it meaningless.
- Report a rehearsal as a rehearsal: what it found, and that the human case is still open. Never mark a human case as done.
- Stop before any action with real consequences that the plan did not place in a safe environment. Before the first such action in a run, confirm that the local build is talking to that environment's backend and that the browser is signed in as the test account the plan names.
- Never run a case, mocked or not, against a production backend or a production deployment.
- Edit no code in the working tree. A mock that needs a patch goes in a throwaway copy, as the plan's setup says.
- When a rehearsal finds a problem, say that the human case waits until it is fixed.
- A screen reader run takes over the machine: follow that tool's instructions, run it alone, and check afterwards that the screen reader is no longer running.
- Clean up when the run is over: stop the servers you started, remove any throwaway copies and mocks, and delete any saved session files.
