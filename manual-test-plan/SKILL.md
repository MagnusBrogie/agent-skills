---
name: manual-test-plan
description: Write a testing plan for checking the current branch in the running app - cases with preconditions, steps, and the exact expected result, split into what an agent can carry out with a browser or an iOS simulator and what a human has to do by hand, such as screen reader testing, with an agent rehearsal of each human case through the accessibility tree and, where a screen reader can be driven, a real screen reader transcript. Use when the user asks for a manual test plan, a QA checklist, test steps, what to test by hand, what an agent can test, or how to verify a branch or PR in the app. Writes the plan, then offers to sign in on staging and run the agent part; it runs nothing until the user says yes, and it does not edit code.
---

# Manual test plan

Write the plan for checking this branch in the running app. The plan covers what automated tests cannot show: how the change looks and behaves with real data, in real flows, across the states a user can reach.

Every case is assigned to whoever can settle it: an agent driving a browser, an agent driving an iOS simulator, or a human. Give an agent everything an agent can settle. For the cases only a human can settle, have an agent attempt them first as a rehearsal, so that the obvious problems are found before a person spends time on them and the person knows where to look.

Running a case in the app is expensive. An agent driving a browser spends many times the tokens of a code test for the same check, and a person spends minutes. So the plan is small and aimed: it holds the cases most likely to expose a bug that matters, and nothing a test in code could cover as well. A good plan is short enough to be carried out in full.

For the same reason, write and run the plan late: after the reviews that read the code, after the fixes and refactoring they lead to, and after the code tests are in place. Then the plan is run once, on the code that will be merged, and the earlier passes have already taken the checks that are cheap. If the code is still changing, say so at the top of the plan. If it changes after the plan has been run, name the cases that have to be run again: those whose "Catches" line points into the changed code.

**Local notes.** If a file named `LOCAL.md` sits beside this file, read it before you start. It holds the user's own defaults for the projects they work on (commands, hosts, accounts, paths) and is not part of the published skill. Where it covers the project at hand, it counts as part of the project's instructions; where it does not, ignore it.

## Gather the changes

The request may name a base branch. With none given, choose it in this order:

1. The base branch of the branch's pull request, if it has one: `gh pr view --json baseRefName --jq .baseRefName`.
2. The repository's default branch: `git symbolic-ref --short refs/remotes/origin/HEAD`.
3. `origin/main`, then `main`.

Use the remote-tracking ref (`origin/<branch>`) in preference to a local branch of the same name. Include work that is not committed yet:

```sh
base=$(git merge-base <base> HEAD)
git diff --stat "$base"          # committed + staged + unstaged
git diff "$base"
git status --short               # untracked files are not in the diff; read them
git log --oneline "$base"..HEAD
```

## Read the three sources that the diff does not contain

The diff shows what changed. It does not show what the change is for, what people have already seen go wrong, or what has been decided in this conversation. Read all three before choosing any case. They are required input, not background; the plan reports what was read and shows where each source shaped it.

### 1. The pull request and its comments

```sh
pr=$(gh pr view --json number --jq .number)
gh pr view --json title,body,baseRefName
for kind in "issues/$pr/comments" "pulls/$pr/reviews" "pulls/$pr/comments"; do
  gh api "repos/{owner}/{repo}/$kind" --paginate --jq '.[]
    | select(.user.type != "Bot" and (.body // "") != "")
    | {id, reply_to: .in_reply_to_id, user: .user.login, path, line: (.line // .original_line), body}'
done
```

The three lists are the conversation comments, the review summaries, and the inline comments on lines of the diff, with bot output left out. Bots are still where a deployment link usually is, so look for that separately. The deployed environment is not where the plan is run (see "Test a local build" below); the link is for comparisons and as a fallback:

```sh
gh api "repos/{owner}/{repo}/issues/$pr/comments" --paginate \
  --jq '.[] | select(.user.type == "Bot") | .body' | grep -oE 'https?://[^ )|>"]+' | sort -u
```

Read the description, every human comment, and the author's replies. A report in the description counts the same as one in a comment. Take from them:

- **Anything a person saw in the app:** a wrong value, a state that never ends, a broken flow, a screenshot. Each one becomes a case that retests that exact report, whether or not the code has changed since. Then ask where else the same fault could show (the sibling screens, the same state reached another way) and consider a case there.
- **Doubts about behavior** raised in review ("the order can disagree with what is shown"): each is a candidate case, rated high for likelihood, because a reader of the code already suspected it.
- **Testing notes in the description:** what the author says they tested, and what they say they did not. Date the notes against the commit log (`git log --format='%h %ad %s' --date=short "$base"..HEAD`): what was tested before later commits touched the same code has not been tested in its current form. The commits that landed after the last manual test are where the plan should aim first.
- **Links to deployed environments:** the branch's own deployment, and the base's, for side-by-side comparisons.
- **Decisions made in the thread** about how something should behave. These settle expected results.

### 2. The issue

Find the issue identifier in the branch name, the commit subjects, the pull request title or body, or a tracker bot's comment on the pull request. Look it up with the tracker the project's instructions name, using the tool available for it. Read the description, the acceptance criteria, the discussion, and any attached screenshots or reproduction steps. Take from it:

- **The original report.** If the issue describes a bug, its reproduction steps become the first case in the plan: the steps as reported, with the fixed behavior as the expected result. If the issue is only a title, or points to a thread or attachment that cannot be read, say so, reconstruct the case from the title and the pull request description, and mark it as reconstructed.
- **Each acceptance criterion.** Every one must end up in one of three places: a case in the plan, a named test in code that covers it, or the list of what was left out, with the reason.
- **The affected users, data, and platforms** the issue names, which say what data shape and which device to test with.
- **Related issues** it links to, where they describe the same area failing in another way.

### 3. The conversation so far

Go back through this conversation before writing. Take from it:

- **Review findings:** check each against the current tree first, since it may have been fixed since. A finding that needs the running app to confirm gets a case: one that confirms the fix, or one that shows the fault if it was left. A finding that a test in code can pin down goes on the list of tests to write, not into the cases.
- **"Not verified" lists and manual validation steps** from earlier review passes. These were written to be checked in the app; they are the most direct input there is.
- **What the user said about the change:** the parts they are worried about, the states they mentioned, what they have already tested by hand, and what they said not to spend time on. A stated worry raises a case's rating; "I have checked that" removes it.
- **Decisions about behavior** made in the conversation, which settle expected results that the code alone leaves open.
- **What changed in the code during the conversation.** Code written or rewritten in this session has had the least testing.

If the conversation holds nothing relevant, say so in the plan; do not pretend it did.

### When a source cannot be read

If `gh` is missing or not signed in, the branch has no pull request, no issue is linked, or the tracker cannot be reached, carry on with what there is. Name each source that was not read at the top of the plan, and say that the plan may miss what it held. Do not present a plan built from the diff alone as a full one.

## Read what else bears on the plan

- **How to run the app locally:** the project's documented command for a local build, which backend it talks to, and which ports it uses. Read the project's instructions for test environments, test accounts, and feature flags, and for which platforms the app ships on (web, iOS, Android).
- **What the automated tests cover:** read the tests in the diff, so the plan does not spend anyone's time on what a test already pins down.
- **Which tools an agent has here:** a browser it can drive, and a device simulator. In Orca these are the embedded browser (the `orca-cli` skill) and the iOS Simulator (the `orca-emulator` skill; `orca-emulator-android` for Android). Also look for:
  - **A screen reader the agent can drive**, such as the `voiceover` skill, which runs the real macOS VoiceOver against a page and returns what it says.
  - **A scripted browser** (Playwright with an installed browser) for what the embedded browser cannot do. For example, the embedded browser may not put a copy on the system clipboard, so checking what is copied needs a browser whose clipboard the agent can read.

  Note which are available in this session; the plan says so in its setup.


## Test a local build, not the deployed branch

Plan every case against a local build of the working tree. A deployed feature or preview environment only has what was committed and pushed: it lags behind the code being worked on, it cannot show uncommitted changes, and a fix made during testing would need a commit and a push before it could be retested there. A local build shows the code as it is now, and a fix can be retested straight away.

The plan's setup therefore says:

- **How to build and start the app locally,** with the exact command from the project's docs, the directory to run it in, and the URL it serves on. If other sessions or worktrees may be running the app, say how to choose free ports.
- **Which backend the local build talks to.** It must be the staging or test backend, never production. A local build pointed at production runs every case, including mocked ones and orders, against real customers' systems. Projects often have one command per environment (for example a `stage` and a `prod` script): name the staging one in the plan, and say in so many words that the production one must not be used. If the project's docs do not make clear which command targets which backend, find out from the build configuration, and if it is still unclear, stop and ask the user; do not guess.
- **How to check the backend before the first case:** look at where the running app sends its requests (the host of an API call in the network log, or the configured API URL) and confirm it is the staging host. The plan names the host to expect. If it is the production host, stop: do not sign in, and do not run any case.
- **How to tell that the build is the current code:** start it from the working tree after the last change, and rebuild or reload after any further change. If the app shows a version or commit, check it.
- **How to stop it** when the run is over.

Use a deployed environment only for:

- **Comparing with the base:** the base branch's deployment, next to the local build of the branch, for the side-by-side cases.
- **What a local build cannot show:** a case about the deployment itself, such as built assets, caching, or a native app that wraps the deployed site. Before such a case, check that the working tree is clean and pushed and that the deployment serves that commit, and say so in the case.
- **A fallback** when the app cannot be built locally. Say why at the top of the plan, and state which commit the deployment serves and what is in the working tree that it lacks.

The same rule holds for any deployed environment the plan uses: the staging deployment, never the production one. Where a branch has both a staging and a production deployment, give only the staging URL in the plan.


## Work out what to test

1. **List what a user can see or do differently.** Trace each change in the diff outward to the screens and flows that show it. A change in shared code reaches every screen that uses it; search for the callers and list them all, including the ones the branch was not about.
2. **For each one, decide whether it needs the running app.** Ask whether a test in code could settle it. If one already does, leave it out. If one easily could (a pure function, a decoder, a sort order, a view function given a state, a state transition), leave it out of the cases and put it on the list of tests to write instead; that check then runs on every change for nothing, where a case in the app is paid for each time. Keep only what a code test cannot reach or would not be trusted for: how real data from the real backend comes through, what is rendered and laid out in a real browser, how parts that are tested separately behave when joined, timing and ordering of real requests, the state the app is in after real navigation, and what assistive technology is given.
3. **Find the states.** For each screen, read the code for the branches it can take: loaded, loading, empty, error, missing or partial data, zero and negative values, very long values, one item and many, each setting or mode that changes the display, each account or user type. Keep the states the diff touches.
4. **Work out how to reach each state.** Name the navigation path, and describe the data it needs by its shape ("an instrument held in two accounts, one of them with no purchase cost"), not by an account you have not confirmed exists. Where a state is hard to reach with real data, say how it can be produced (a feature flag, a rewritten response, a throttled network, a setting) or mark it as needing a specific test account.

   When a case depends on a rewritten response, the plan must make the rewrite repeatable; `reference/mocks.md` says how.
5. **Derive the expected result from the code.** Read what the code will render or do in that state and write that down exactly: the text as the app shows it, in the app's language; the value, with its formatting; what is absent. An expected result of "displays correctly" tells the tester nothing. If the code does not settle what should happen, do not guess: put it under the open questions.
6. **Add the checks around the change:**
   - **Neighbors:** where changed shared code is used by other screens, a case for the one or two where it is most likely to behave differently (different data, a different path through the changed code). Screens that use it in the same way as one already covered do not need their own case.
   - **Refactors:** where the branch claims to preserve behavior, a side-by-side comparison with the base or with production, naming what to compare.
   - **Accessibility:** when the diff changes markup or interaction, cases for keyboard operation and for screen reader output, and for anything else the project's instructions require.
   - **Platforms:** the screen sizes, browsers, or devices the project supports, where the change could differ between them. Plan simulator cases only when the project ships on that platform and the change could behave differently there.
The result of these steps is a list of candidate cases. The next section decides which of them make the plan.

## Provoke the risky states with mocks

The states most likely to hide a bug are often the ones that real test data never produces: a field the backend sends as null once in a thousand accounts, a request that fails halfway, a value that changes between two fetches. Do not leave these out because they are hard to reach, and do not wait for a test account that happens to have them. Have the agent produce them with code. A plan whose cases all use the data that happens to be on the test account is testing the ordinary path, which is where bugs are least likely.

For each high-risk state that real data does not give, plan a mocked scenario. Before planning the first one, read `reference/mocks.md` in full: it lists the states to go through against the diff, the ways to produce them, and what the plan must write down so that the mock can be repeated.


## Rank by risk and cut

Give each candidate case two ratings, and keep them with the case:

- **How likely is a bug here?** Highest where someone has already seen it fail or doubted it: a reviewer's report from the app, the issue's own reproduction, a finding from an earlier pass, a worry the user stated. Higher where the code is new or was rewritten, where the logic branches on data, where several changes meet, where the fixtures in the tests may not look like real data, where a reviewer or an earlier pass already found something nearby, and where nothing in code tests the path. Lower where the change is mechanical or the path is well tested.
- **How much would it matter?** Higher for wrong figures, money, lost or corrupted data, a blocked main flow, a legal requirement such as accessibility, and anything seen by every user. Lower for cosmetic differences in a rare state.

Then cut hard:

1. **Aim each case at a specific bug.** State the bug the case would catch: "the merged row shows the cost of the last account only". A case that only confirms the feature works in the ordinary state is the weakest one; keep one of those for the main flow and spend the rest on the states where the code is most likely to be wrong: boundaries, missing data, the combination of two changed things, the second visit to a screen, the state straight after an action. Most of these will be mocked scenarios. Within the budget, a mocked case that provokes a risky state is worth more than a second case on real data.
2. **Keep high risk; drop low.** A case that is unlikely to fail and would not matter much if it did is left out. List what was left out in one line each, so the user can overrule it.
3. **Mark must pass sparingly.** Must pass means that a failure would block the merge. Everything else that survives is "should check", which is not run unless the user asks.
4. **Hold the agent cases to a budget.** Aim for at most eight agent cases marked must pass, fewer for a small change. If more than that seem necessary, the branch is large or the code tests are thin: say which, and move the checks that code could cover to the list of tests to write.
5. **Make each case cheap to run:**
   - Merge cases that share a screen and a state into one visit that checks several expected results.
   - Order the cases so that the app is moved through once, with one sign-in and one setup.
   - Prefer reading text or the accessibility tree to taking screenshots; ask for a screenshot only where the case is about how something looks.
   - Give exact steps and an exact stopping point. A case never says "explore" or "check that everything looks right".
   - Drop cases that only repeat another with a different value.
6. **Rehearsals come under the same budget.** Rehearse a human case when it is marked must pass, and do it in the same visit as the other cases on that screen. A screen reader rehearsal covers the screens whose markup or interaction the diff changed, not every screen the feature touches.


## Decide who carries out each case

Assign each case to one of three: **agent, browser**; **agent, iOS simulator**; or **human**. Decide by what settles the case, not by how the steps are performed.

**An agent can settle a case when the expected result can be read off the app as a fact:**

- text, values, and formatting shown on a screen, and what is absent from it;
- which elements exist, their order, and their state (enabled, selected, expanded, loading);
- the result of navigating, clicking, typing, sorting, filtering, or switching a setting;
- layout facts at a given viewport or device size: something is cut off, overlaps, or scrolls sideways;
- the accessibility tree: each control has a name, a role, and a state, and headings and landmarks are present;
- keyboard operation in the browser: the tab order, that focus is visible and lands where it should after an action, that every control can be operated without a pointer;
- a side-by-side comparison of the same screen on the base and on the branch;
- what is copied when text is selected, in a browser whose clipboard the agent can read;
- with a screen reader the agent can drive: the words that screen reader speaks, the order it stops in, and what it says after an action. This holds for that screen reader, browser engine, and platform only;
- on the simulator: the same facts in the installed app, plus rotation, text size settings, and light and dark appearance.

**A human is needed when the case turns on perception, judgment, a real device, or something an agent must not or cannot do:**

- **Screen reader testing.** Whether a person can complete the task by listening: pronunciation, timing and verbosity, and the screen readers and platforms no agent drove (VoiceOver on iOS, TalkBack, NVDA, Safari where the agent used another WebKit). An agent can check that the accessibility tree is well formed, and with a driven screen reader it can record what that one screen reader says. Neither shows the experience is usable, and neither replaces this case; the transcript narrows it to what the transcript cannot show. Where accessibility is a legal requirement for the project, a human screen reader case is required whenever the diff changes markup or interaction, or changes what is shown in a state so that a listener meets something new: different content in a cell, a state that now lasts longer, a control that appears or disappears.
- **Visual judgment.** Whether something looks right: alignment, spacing, emphasis, contrast as perceived, and whether an animation or transition feels smooth.
- **Real devices.** Touch on real hardware, haptics, the on-screen keyboard and its autofill, a real mobile browser, performance on a slow device, behavior on a real network.
- **Signing in with a personal credential.** A login that needs a person's identity, a hardware token, or a second factor on their phone.
- **Actions with real consequences.** Placing an order, moving money, sending a message to a real recipient, deleting real data. An agent carries these out only where it has been told it is safe: in an environment that the project's instructions name as safe for it, or that the user has said is safe, in this conversation or in what the agent remembers from earlier ones (for example "placing orders with the test user on staging is fine"). Then the case is an agent case, restricted to that environment and that account, and the plan states both. Otherwise it is a human case, and the plan says why. If nothing says either way and such a case matters, ask the user before assigning it; do not assume.
- **Product judgment.** Whether the wording is clear, or the behavior is what a customer would expect.

**Rehearse the human cases that must pass with an agent, where an agent can attempt them.** A rehearsal is an agent case that tries to do what the human will do, with the means an agent has. It does not settle the human case, which stays in the plan and stays required. It finds what can be found without a person, and it hands the person a record of what was seen.

If the plan has a human case marked must pass, read `reference/rehearsals.md` in full before writing its rehearsal: it gives the method for each kind (screen reader, visual, real device, wording, real consequences) and how the two cases refer to each other. There is no rehearsal for signing in with a personal credential.


**When a case cannot pass as the code stands.** If reading the code shows that a required case will fail (a placeholder with no accessible name, say), or its expected result depends on an open question, do not plan it as a case to run: running it would spend a person's time confirming what is already known. Put it at the top of the plan under "Known problems to settle first", with the evidence and what has to be fixed or decided, and keep the case in the plan marked as blocked by it.

**When an agent case depends on a human step,** put that step in the setup, not in the case: a person signs in and hands the session over, or installs the build on the simulator. Signing in is a human step only when it needs a personal credential. Where a skill or the project's docs give a way to sign in to staging as a test account, the agent signs in itself, and the setup names that way.

**If no browser or simulator tool is available in this session,** still classify the cases. Mark them as agent cases that need such a tool, so that the plan can be handed to a session that has one.

Write agent cases so that they can be checked without interpretation: the exact text to find, the element to look for, the value to compare. Each agent case names the evidence to keep (a screenshot, the text read from the screen or the accessibility tree), so that a human can audit the run afterwards.

## Write the plan

Use labels and text exactly as the app shows them. Write the steps so that someone, or an agent, who has not read the diff can follow them.

Keep the document in proportion to the plan. Leave out any section that has nothing in it. For a plan of five cases or fewer, give the sources as three lines without the table, and fold "Left out as low risk" and "Not covered" into one short list.

1. **What this covers:** the base, the purpose of the branch in a sentence, and where to test it: the local build, with the command to start it and its URL. Then, if there are any, **Known problems to settle first**: the cases that cannot pass as the code stands, each with the evidence and what has to be fixed or decided.
2. **Sources:** what was read and what it gave the plan, in a short table, with the sources that could not be read.

   | Source | Read | What it gave the plan |
   |---|---|---|
   | Pull request description and comments | <how many human comments, by whom> | <cases, by number> |
   | Issue | <identifier and title> | <cases; acceptance criteria covered> |
   | This conversation | <which passes and decisions> | <cases; what was removed> |

   Below the table, list each acceptance criterion and each thing a reviewer saw in the app, with where it ended up: a case number, a named test in code, or left out with the reason.
3. **Summary:** a table of how many cases each executor has, and how many of each are required before merging.

   | Carried out by | Must pass | Should check |
   |---|---|---|
   | Agent, browser | | |
   | Agent, iOS simulator | | |
   | Human | | |

   Say below the table how many of the agent cases are rehearsals of human cases.

4. **Setup:** the accounts, data, settings, and flags needed, once, so that the cases do not repeat them. Say which browser and simulator tools were available when the plan was written, and list the steps a human must do before an agent can start.
5. **Agent, browser:** the cases, grouped by screen, in an order that moves through the app once.
6. **Agent, iOS simulator:** the same. Leave the section out, with one line saying why, when the project does not ship on iOS or the change cannot differ there.
7. **Human:** the cases only a person can settle, grouped by kind (screen reader, visual, real device, real consequences), each as short as it can be. Each names the agent case that rehearses it, or says why there is none, and says what the rehearsal cannot show.
8. **Tests to write instead:** the checks that were kept out of the plan because a test in code could cover them, each with the behavior to pin down and where the test would go. These are suggestions for the author; the plan does not write them.
9. **Left out as low risk:** one line each.
10. **Not covered:** states that could not be reached or planned for, and why.
11. **Open questions:** where the expected behavior is not settled by the code, the issue, or the description.

Give the cases as a checklist that can be pasted into a pull request. Number them within each section (B1, B2 for the browser, S1 for the simulator, H1 for human) so that cases can refer to each other:

```markdown
### <Screen or flow>

- [ ] **B1. <Short name of the case>** (must pass)
  - Setup: <state or data this case needs beyond the shared setup>
  - Steps: 1. <step> 2. <step>
  - Expected: <the exact text, value, or behavior>
  - Evidence: <what the agent keeps: screenshot, text read from the screen>
  - Catches: <the specific bug this would expose, with file:line>
  - From: <the review comment, acceptance criterion, or earlier finding this case comes from, when it has one>
  - Risk: <likelihood> / <impact>, and why a test in code cannot cover it
```

A rehearsal case adds a line "Rehearses: H3", and its evidence includes the transcript or screenshots the human will use. Human cases have no Evidence line; they carry "Rehearsed by: B7" and "The rehearsal cannot show: ..." instead.

### The agent part as one block to paste

The agent cases will usually be handed to another agent session, so give them a second time at the end of the plan as a single fenced block that can be copied in one go and pasted as that session's whole instruction. If the plan has an agent case, read `reference/handoff.md` in full before writing the block: it lists what the block must contain to stand on its own.

In the plan's own list of cases, keep the "Catches" and "Risk" lines: they let the tester judge a result that is close to the expected one but not identical, and let the user cut further when the budget is tight.


End with the cost of carrying the plan out: a rough time for the human cases, and for the agent cases the number of cases and screens to visit, with a note that running them in a browser costs far more tokens than writing the plan did.

## Offer to run the agent part

After the plan, as the last thing in the reply, ask the user one question: do they want you to sign in on staging and run the agent part of the plan now? Ask it in those terms, and say in the same line how many cases that is. Then stop and wait; do not start the build, sign in, or run a case until they say yes.

Make the offer only when it can be taken up. Leave it out, and say in one line what is missing, when:

- the plan has no agent cases marked must pass;
- this session has no browser or simulator tool to drive;
- there is no way for an agent to sign in: no skill or documented flow for signing in to staging as a test account, and the login needs a personal credential. Then say that the user has to sign in and hand the session over first, and offer to run the cases after that;
- "Known problems to settle first" holds something that blocks the must pass cases, or the code is still changing. Then say what has to happen before a run is worth its cost.

If the user says yes, read `reference/running.md` in full and follow it: it says how to start the build, check the backend, and sign in, and gives the rules for the run.

If the user says no, or answers something else, the plan stands as written and the paste block is there for another session.

## Rules

- Write the plan; do not carry it out, and do not edit code. Offer to run the agent cases (see "Offer to run the agent part"), and run them only once the user has said yes to that offer or asked for it, under the rules in `reference/running.md`. Never run a case, mocked or not, against a production backend or a production deployment.
- The files in `reference/` are part of this skill. Read each one at the point where this file names it, in full, and do not work from its one-line summary here.
- A rehearsal never replaces the human case it rehearses, and a clean rehearsal is not a reason to drop it. A passed agent walk through the accessibility tree is not a passed screen reader test, and neither is a clean transcript from a screen reader an agent drove.
- Do not write the plan from the diff alone when the pull request, the issue, or the conversation can be read. A case that a reviewer's report, an acceptance criterion, or an earlier finding calls for, and that needs the running app, is never cut for the budget; cut something else. Where a test in code can settle it, it goes on the list of tests to write, like anything else.
- Staging only. Every build command, URL, and backend in the plan is the staging or test one. Do not put a production command or URL in the plan, even as an alternative.
- Do not invent accounts, URLs, credentials, or data. Describe what is needed and let the tester supply it.
- Do not pad. A small change gets a handful of cases, and a change that code tests cover well may need none in the browser; say so when that is the conclusion.
- Never plan a case in the app for something a test in code could cover as well. Put it on the list of tests to write.
- If reading the code for this plan turns up something that looks like a bug, note it in one line at the end; the plan is not a review.
