# The agent part as one block to paste

Read this when the plan has at least one agent case. The agent cases will usually be handed to another agent session, so give them a second time at the end of the plan as a single fenced block that can be copied in one go and pasted as that session's whole instruction. Put a line above it saying what it is for. Use a fence longer than any fence inside it (four backticks or more), so that the block does not end early.

The block must stand on its own, because the agent that receives it has not seen the plan, the diff, or this conversation. It contains, in this order:

1. One sentence on what is being tested and why.
2. Where: the command to build and start the app locally against the staging backend, the directory to run it in, the local URL, the staging host its requests must go to, the account to use, and which tool to drive (the browser, the simulator). State that the production build command and production URLs must not be used, and that the agent must check the request host before signing in and stop if it is not the staging host. Say plainly that the cases are run against this local build and not against the deployed branch, and give any deployed URL only for the comparison cases that need it.
3. What a human has already done or must do first, such as signing in.
4. The rules for the run: carry out only these cases, in this order; edit no code in the working tree (a mock that needs a patch goes in a throwaway copy, as the setup says); which actions with real consequences are allowed, and only on this environment and account; stop and report when a failure makes the following cases meaningless.
5. The shared setup, including the code for every mock (the interception or script and the exact payload change), written out in full and ready to run, with how to remove each mock again before the cases that need real data.
6. The agent cases marked must pass, each with its setup, steps, expected result, and evidence to keep. Leave out the "Catches", "From", and "Risk" lines; they are for the person deciding what to run. For a rehearsal, say in one line what the human will do with the evidence.
7. What to send back: for each case, passed, failed, or blocked, with what was seen and the evidence; then anything unexpected that was noticed on the way.

Do not refer to anything outside the block ("see H2", "as described above"). List the should check cases after the block, not in it, so that they are not run by default.
