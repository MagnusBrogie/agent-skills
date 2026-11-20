# Mocked scenarios

Read this when a candidate case needs a state that real test data does not give.

The states most likely to hide a bug are often the ones that real test data never produces: a field the backend sends as null once in a thousand accounts, a request that fails halfway, a value that changes between two fetches. Do not leave these out because they are hard to reach, and do not wait for a test account that happens to have them. Have the agent produce them with code. A plan whose cases all use the data that happens to be on the test account is testing the ordinary path, which is where bugs are least likely.

For each high-risk state that real data does not give, plan a mocked scenario. Go through this list against the diff and take the ones the changed code is sensitive to:

- **Data shape:** a field null or absent; one of two related fields missing; an empty list; one item; thousands of items; duplicates; an unknown enum value; a number that is zero, negative, huge, or has more decimals than expected; a very long name.
- **Combinations across items:** the state the diff is about in one account or row and not in another; all of them in that state; none.
- **Failure:** the request the changed code depends on returns an error, times out, or returns malformed data, while the other requests succeed.
- **Timing:** a slow response, so that the loading state can be looked at; two responses arriving in the other order; a response arriving after the user has moved on.
- **Change over time:** the first fetch returns one state and the next returns another (a missing value that arrives later, a position that is sold, an order that fills), to check that the screen moves from one to the other and does not stay stuck.
- **Environment:** a feature flag in each state, another locale or currency, a date or time of day that the code branches on, a small viewport.

Ways to produce them, cheapest first:

1. **Rewrite a response** by intercepting the request in the agent's browser. Capture the real response first and change only the fields the case is about, so that the rest of the data stays realistic and the case fails only for the reason it is meant to.
2. **Run a script in the page** to set a flag, a stored setting, the clock, or the network condition.
3. **Change the app locally**, where neither of those can reach the state: a temporary patch in a throwaway copy or worktree of the repository, run locally, never in the user's working tree and never committed. Name the file and the change, and delete the copy afterwards.

Write the mock as code in the plan: the interception or script, and the exact payload change, ready to run. Derive the request path and the field names from the code (the request builders and decoders), not from guesswork, and say where they came from.

Keep two limits in mind:

- A mocked scenario earns a case in the app only when it checks the joined app: what the screens render and do in that state. If it only checks that a decoder or a function handles the value, it is a test to write in code, with the same payload as its fixture.
- A mock shows how the app handles a state, not that the backend produces it. Say so under "Not covered", and where it matters whether the state can really occur, put the question to whoever owns the backend under "Open questions".

## Make a rewritten response repeatable

When a case depends on a rewritten response, the plan must make the rewrite repeatable:

- Name the request (method and path) and the exact fields to change, with their values.
- Find out from the code how the app makes its requests, and say which way of intercepting works for it. A patch of one request API in the page does nothing for an app that uses another, and a rewrite must survive a reload if the case reloads.
- Check that the agent's browser tool can intercept requests at all. If it cannot, the case is a human case, or needs a human to set up the rewrite first.
- Give the human way of doing the same rewrite (for example the browser's developer tools), for the human cases that need the same state.
- Record under "Not covered" that the case shows how the app handles the rewritten response, not that the backend sends that shape.
