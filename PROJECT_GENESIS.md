# PROJECT GENESIS — THE LIVING WORLD

## Working version — 11 November 2026

Built on the existing AI Town fork, branch genesis/living-world-20261111. The original five-citizen AI Town records remain separate and preserved. The default Genesis view has twelve adult citizens in six philosophical starting groups. This is a functioning, rules-based simulation; current conversation text uses labeled templates. No language model or paid API is enabled.

## Open and run

Open the private Codespaces port 5173 URL ending in /ai-town. Sign into the same GitHub account if asked. Keep port visibility Private. The legacy AI Town view is available with ?view=legacy.

From the repository: npm install, then npm run dev. The existing Convex development deployment is used; do not initialize a replacement world. For a one-off backend update use ./node_modules/.bin/convex dev --once. Environment values belong in .env.local, never source control.

Vite binds 0.0.0.0 on strict port 5173 with an explicit Codespaces host allowance. The original Pixi map now includes the matching pixi.js-legacy Canvas renderer so it can render without WebGL. The original renderer is loaded only for the legacy view.

## Implemented

- Twelve distinct adults, founding households, starting factions, personality traits, goals, numerical needs and emotional state, skills, job roles, memories, relationship scores and evolving belief weights.
- Four simulation steps per day, a 30-day month, 12-month year, seasons, schedules for rest, meals, work and social encounters. Hunger and other urgent needs can override activities. Severe survival outcomes are disabled; no deaths are currently simulated.
- Food production and consumption, scarcity scenarios, paid cooperative jobs, taxes, public relief, budget-limited grants, account balances and an append-only transaction ledger. Transfers debit and credit together; total issued money is conserved. Opening money is a fictional currency supply of 320000 cents (¤3200).
- Farmers produce food; builders collect materials and perform construction shifts; researchers record observations; teachers improve skills; doctors can treat poor health. Other named professions currently have generic paid shifts, not their complete professional systems.
- Recorded encounters change relationships and can influence beliefs. Saved chat messages carry a real encounter action ID, participants, place, time, topic and explicit rules-template source. Search, faction and citizen filters are available. Private means private within the fictional world, not hidden from the observer.
- Pan/zoom village map, animated citizen movement, day/night, weather, clickable citizens and buildings, citizen inspector, event history, observer summary, household wealth and ledger.
- Hospital, farm, school, house, laboratory and market construction proposals. Site, funding, materials and three-project limit are validated. Each project takes twelve builder shifts. Completed farms, hospitals and laboratories have simulation effects; school, market and new-house specialized operations remain pending. Maintenance is not yet simulated.
- A prominent GENESIS COMMAND CENTER with supported command suggestions, database-backed actions and visible success, failure or pending review. Building funding, disruptive scenarios and restoration require confirmation. Unsupported commands report that they made no change.
- Persistent Convex state, additive migration with a pre-migration checkpoint, manual checkpoints, bounded restoration into a new timeline, revision checks against stale actions and bounded catch-up. Earlier timeline events and ledger records are retained.
- Responsive CSS, 16px form text and touch-sized controls. Desktop browser behavior is verified. Actual iPhone/iPad Safari testing remains pending; browser developer tools were unavailable in this environment.

## Try these commands

- Pause all citizen activities.
- Advance the simulation by 2 days.
- Build a hospital. (Review cost, then confirm, or use placement mode to choose a site.)
- Show me Sage's relationships.
- Show the wealthiest households.
- Show me what changed in the last 30 days.
- Create a food shortage. (Confirmation required.)
- Introduce a mysterious light over the village. (Confirmation required.)
- Give the scientists a new research problem: investigate the light.

The movement/meeting commands from the earlier preview remain supported. Free-form language is recognized through a constrained parser; it is not arbitrary AI command interpretation.

## Time, saving and usage

Watch mode advances from an open browser tab. Pause stops automatic advancement for updated clients. Manual day/month advancement uses bounded server mutations. Catch-up is explicit: one six-hour step per real minute away, capped at forty steps (ten simulated days) per request; it does not promise unlimited recovery of elapsed time. The Codespace and browser may sleep. No always-on background worker is configured.

Checkpoints preserve state; restoring creates a new timeline and retains earlier records. The UI currently follows the active timeline. Event replay and an archive timeline browser remain pending. Logs and the maximum fifty checkpoints consume existing Convex storage; monitor the existing plan. No new paid service was activated.

This prototype follows the original repository's Convex access pattern. The frontend is behind the private GitHub Codespaces port, but this is not a completed backend authentication or production security audit. Store only fictional simulation data. Add backend authorization before any public deployment or real private data.

## Validation

Run:

    node scripts/verify-genesis.cjs
    node scripts/verify-genesis-commands.cjs
    node scripts/verify-genesis-life.cjs
    node scripts/verify-genesis-backend.cjs
    npm run build

The life suite checks six hundred deterministic steps, conserved money, ledger reconstruction, bounded needs, migration preservation, construction and event-linked messages. The isolated backend suite checks migration idempotence, pending confirmation without charges, stale revisions, paused automatic steps, step limits, construction funding, unsupported no-ops, archived restore and catch-up idempotence. Backend tests use a database double; live browser checks additionally exercised saving, advancing, meals, wages, taxes, conversation filtering, profiles, placement, confirmation and hospital progress. Original AI Town Canvas rendering was visually verified.

## Remaining work

1. Real model-assisted planning and dialogue with validated proposals, source attribution, usage accounting and a deterministic fallback. A small local model was investigated but has not been installed or connected; current model calls are zero.
2. Romantic partnerships, adult reproductive decisions, adoption, children, education life stages, family trees, aging consequences and mortality.
3. Independent businesses, household budgets, ownership transfers, hiring, unemployment, commerce and market pricing.
4. Complete building occupancy/maintenance, new-house assignment, road expansion and construction pathfinding. Current map movement interpolates between activity sites.
5. Written laws, crime decisions, evidence, investigations, courts, elections and civic reforms. The UI explicitly reports that crime queries are not implemented.
6. Experiment design, discoveries, institutions, generational culture, richer competing motivations, historical replay and period comparisons.
7. Backend authorization, production hosting, real iOS testing and plan-aware storage controls before broad deployment.

Do not describe the above remaining systems as implemented or simulate their outcomes only in prose.


## Usable 3D and Studio milestone

The 3D view and camera presets, persistent adult creation, source inspection, and sandboxed bakery basket were browser verified. Nova was added without replacing founding citizens. The current village advances with 13 adults and a balanced ledger. The first bakery build exposed a packaging issue; the corrected Nova-assigned build works. A source-only syntax check now runs before artifact packaging. The corrected artifact and ZIP are committed for reuse. No publication or payments were enabled. The worker uses a fixed template, not an autonomous model. It can run with node scripts/genesis-studio-worker.cjs; it stops after 30 minutes or three builds. Actual Safari touch testing and broader simulation systems remain pending.
