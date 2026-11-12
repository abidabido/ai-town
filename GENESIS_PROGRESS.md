# Project Genesis progress

Current scope: THE CHAOS VILLAGE. Real-world business development is deferred; existing bakery files and studio code remain preserved.

Branch: genesis/family-foundation-20261112. Last browser-verified baseline before this session: 7342fa8 (genesis/3d-studio-20261111).

Repository: https://github.com/abidabido/ai-town
Codespace: redesigned-dollop-vgq5599rxw6hjpr
Private preview: https://redesigned-dollop-vgq5599rxw6hjpr-5173.app.github.dev/ai-town

This session inspected recent commits and uncommitted files, created a dedicated branch, fixed missing profile compilation in two test harnesses, then fixed a real initial-upgrade idempotence regression. Added the requested continuation documents and Chaos Village/God Mode/Whisper Network labels. No family system has been deployed.

Existing functionality: 13 adults (12 founders plus Nova), original five-person legacy town preserved separately, rules schedules and psychology, profiles, relationships, template chat, fictional balanced ledger, construction, map camera, bounded catch-up, checkpoints. The simulation is rules-based; no model provider enabled. Background progression is not configured.

Testing: verify-genesis-life.cjs passes 600 steps / 5400 transfers / 1800 messages. verify-genesis-backend.cjs passes isolated persistence, stale revisions, funding, pause, restore and catch-up tests. Legacy engine and parser tests plus production build are checked for the release. See commit history for final saved milestone.

Run frontend: npm run dev:frontend. Sync backend: ./node_modules/.bin/convex dev --once. npm run dev uses the repository's existing init hook; never run wipe/reset commands. Keep port 5173 Private. Existing secrets stay in .env.local; relevant variable names include VITE_CONVEX_URL and CONVEX_DEPLOYMENT. Do not copy values into these files.

Known limitations: only some personality traits affect decisions; there are no children or romantic relationships, no rumors, no real elections or courts, no authenticated Forbidden Archive. The frontend is private but backend auth still follows the original prototype; store fictional data only. The failed early bakery artifact remains untracked for preservation; do not add it accidentally. No native iOS verification. New 3D avatars are lightweight procedural models, not production character assets.

Highest priority next task: a small family engine with explicit adult eligibility and child-safe daily actions. Read GENESIS_NEXT_STEPS.md before adding child records to the adult-only daily loop.

Latest verified code commit: 57eab9c. All four Genesis suites and production build passed. Convex development functions deployed. Browser reload verified Chaos Village labels, preserved 13 citizens and saved world. Nova goal edit survived refresh. A live checkpoint was saved. No family records were added.


## Adult partnership milestone
Latest verified code commit: 5380755. Added data/genesisFamilies.ts and FamilyLegacyArchive.tsx. Evening rules evaluate adult eligibility, ancestor exclusion, existing partners, trust >=55, manageable needs and separate romance-interest willingness draws. Dating may progress to marriage after 28 days with trust >=65 and reciprocal family-interest draws. Negative trust or invalid eligibility can end partnerships. Stable IDs and causal events are retained. No household merges or money changes. Births remain disabled.
Verification: verify-genesis-families.cjs passed deterministic dating, marriage, separation, zero preference/minor/kin/self/missing-ID rejection, same-evening idempotence, JSON preservation and financial/population non-mutation. The four previous Genesis suites passed; production build passed; Convex dev update succeeded. Browser advanced to Y1 M2 D3 18:00 and reloaded. Direct Convex read confirmed family version 1 and evening lastTick 131 persisted, with zero current live couples; no romance was forced. Preserve this distinction from seeded test fixtures.
Highest-priority next task: child-safe life stages and resource/caregiver rules, then bounded birth mechanics. Pregnancy, adoption, offspring and genealogy are not implemented. Family preferences currently model willingness computationally; they do not establish consciousness. No API, paid service or public deployment was enabled.
