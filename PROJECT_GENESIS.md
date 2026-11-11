# Project Genesis

Branch: genesis/setup-20261111

Genesis now opens as a separate rules-based civilization preview using the existing Convex development backend. The original AI Town remains available at ?view=legacy; its five citizens and records have not been wiped, archived, or replaced.

Implemented: twelve citizens across six philosophical factions; six-hour clock steps and day advancement; visible-page autoplay and pause; persistent events, relationship trust, belief-commitment and openness scores; alliances, conflicts, supplies, a shared archive and a voluntary council; SVG village map without WebGL; citizen selection and history filters; responsive layouts.

Important limits: this is an explicit programmed-rules simulation, not LLM inference. No model API is connected; no invented dialogue is presented as AI conversation. Faction membership does not evolve automatically from scores. Map movement illustrates activity rather than pathfinding. Autoplay advances only while the page is visible, and resumes from saved state rather than catching up while closed. All events are retained; the UI shows up to 100 matching events among the latest 1000. No new paid services or public port forwarding were enabled. Codespaces must be running to serve the private frontend. Existing Convex usage remains subject to its current plan.

Storage: genesisSessions and genesisEvents, isolated from the original world tables. begin is idempotent and advance checks expectedTick to avoid duplicate multi-tab advancement. These functions follow the existing app's unauthenticated Convex API pattern; private Codespaces forwarding gates the frontend, not direct backend API access. Add proper backend authorization before storing personal information or sharing the service beyond its owner.

Validation: npm run build succeeds; node scripts/verify-genesis.cjs exercises 2000 simulated steps for immutability, reproducibility, bounds, unique actors and social milestones. Browser verification: initialized 12 citizens; advanced one day; reloaded and observed the same tick and four events; selected Ada and observed her stored relationship/history; autoplay advanced and paused. IPv4 listener on 5173 returns HTTP 200. Actual iPhone/iPad rendering has not been tested.

Next for full AI: select an inference service within the owner's no-paid-services constraint; use stored state as grounded context for generated proposals and memories; validate model outputs before applying state transitions; add backend authorization and private durable hosting. Do not claim autonomous language-model reasoning or always-on operation until verified.

Command bar: supports named-citizen movement, meetings, gathering all citizens, six-hour/day advancement, and device-local pause/play. Matching is case-insensitive and limited to listed names/locations. Server validates instructions and saves accepted world commands as Command events; unknown orders do not mutate state. Movement/meeting orders never invent dialogue or trust changes. Autoplay pauses before submission. Tests: node scripts/verify-genesis-commands.cjs.
