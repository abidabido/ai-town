# Talking to villagers — working pilot

Open a citizen profile and choose TALK TO CITIZEN. The same button is available alongside the 3D camera controls once a citizen is selected. Type a message, choose a communication method, then Send message. Successful exchanges are saved in Convex and return after refreshing and reopening that citizen's conversation.

## Honest capabilities

This milestone uses limited, transparent rules-based replies, not a language model. A local Ollama request to localhost:11434 did not connect; no paid API was enabled or called. No claim is made that all model services are unavailable. An API key or configured provider alone would not authorize new charges.

Supported questions concern the selected citizen's current activity, occupation, goal, hobbies, values, personal beliefs, owned memories, previous messages and own trust records. Research discussion uses only the participant's recorded diary evidence when available. Responses can ask questions and challenge creator claims. Unsupported language gets a clear explanation; convincing generic prose is not substituted for actual reasoning.

A sufficiently curious and available citizen can store an explicit research suggestion as a goal. Hunger, fatigue and health can make them decline it. That is only a persistent goal change: chat does NOT launch an investigation, move a citizen, run an experiment or execute arbitrary commands. This still needs action-planning integration.

## Three methods and identity

- Messages: an explicit in-world text. The sender is unknown unless Abby deliberately identifies herself or this citizen already received that identity through their own evidence/history.
- Face-to-Face: requires an active visible Visitor/Creator avatar within 6 village units and a nonzero existing visibility/awake detection check. A remote or invisible Observer cannot use it. Controlled tests pass; a complete live Street View approach/face-to-face browser test remains pending.
- Observer Communication: blocked in Invisible mode. In The Feeling it is recorded as unexplained unless Abby has deliberately identified herself. Selecting Creator mode alone does not force belief or announce identity to unselected citizens.

The Identify myself as Abby checkbox is a self-identification claim, not evidence proving creator status. That deliberately shared identity is remembered in the participant thread. Replies do not grant worship, obedience or privileged tool access.

## Persistence and privacy scope

Each stored message has simulated tick, real recorded time, channel, presence mode, perceived identity, participant IDs, engine label and response context references. Threads are partitioned by world, timeline and citizen. The latest 60 messages are retained. Received messages add a bounded memory to the participant; user statements remain received claims, not verified world facts. Village history records a generic private-conversation occurrence without publishing message bodies.

Simulation participants do not automatically receive another citizen's thread or memories. This does not establish production multi-user security: existing Genesis administrator/backend authentication is unfinished. The app is still restricted through its private Codespace port; conversation APIs must not be advertised as secure public multi-user messaging. Do not publish or weaken private access. Strong owner authentication is a separate prerequisite for public/shared use.

## Verified automatically

scripts/verify-genesis-talk.cjs tests actual-data responses, previous-message recall, immutable inputs, participant-only memory, Invisible suppression, Feeling anonymity, explicit identity retention, proximity/visibility checks, trait-dependent disagreement, validation, actual handler persistence with a database double, duplicate idempotency, changed-payload rejection and rate limits.

scripts/e2e-genesis-talk.cjs executed actual Chromium inside the Codespace against localhost. It used the normal Sage profile/Talk button, typed questions, normal Send mutation and real Convex storage. Three player messages and three replies saved; Sage's activity grounded the first reply; the second recalled the first question; Feeling communication remained unidentified. A full refresh restored the history. Only Sage gained conversation memories; tick, balances, trust, Observer awareness and other citizens were unchanged. A 390×844 viewport exposed a reachable touch-sized Send button. No uncaught browser errors occurred.

A final non-writing --read-only run passed after fixes. All 18 scripts/verify-genesis*.cjs (including the original 17) and npm run build passed. Existing large-bundle warning remains.

Run the non-writing browser check with the previously installed temporary runner:

    GENESIS_PLAYWRIGHT_MODULE=/tmp/genesis-e2e/node_modules/playwright node scripts/e2e-genesis-talk.cjs --read-only

Omit --read-only only when intentionally recording three additional test exchanges with Sage. It changes the conversation and Sage's owned memories. Do not use real personal data for test messages. Reports and screenshots are under ignored .genesis-test-artifacts/; aggregate reports are in docs/testing/.

## Manual checks still pending

On an actual iPad/iPhone: select Sage, open Talk, send “What are you doing?”, wait for the saved confirmation, ask “What did I tell you last time?”, refresh and reopen the conversation. Confirm text remains readable and scrolling/input work with the onscreen keyboard.

Also test the 3D selection button, an actual nearby face-to-face approach and departure, physical multi-touch controls, and how opening the modal interrupts walking. A resized Chromium window is not a physical Safari test. Native modal focus/input isolation is implemented; touch interruption still needs device acceptance.

## Next work

Authorized cost-capped model adapter (only after explicit cost approval or a verified free endpoint), evidence-grounded multi-turn generation, stronger owner authentication, queued/asleep delivery, longer archival history and validated research/action dispatch. None are claimed implemented here.
