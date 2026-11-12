# Current Awakening acceptance results — November 12, 2026

This section supersedes older scope labels below. Code checkpoint e08b4d7, branch genesis/awakening-memory-20261112.

| Feature | Status | Evidence / remaining work |
|---|---|---|
| Private launch and existing Convex state | VERIFIED | Existing village loaded; one-day advance saved; reload retained updated state. |
| Observer identity | VERIFIED | THE OBSERVER · Abby and The Awakening shown in browser. This does not reveal Abby to citizens. |
| Evidence-linked diary foundation | VERIFIED | Actor-only life.memory state; seven regression suites and build pass; Sage five entries persist after reload; search and source inspection tested. |
| Trait-based reflection prompts | VERIFIED | Deterministic prompts differ with curiosity/empathy; explicitly templates, not reasoning. |
| Broader Living Memory engine | IN PROGRESS | Diaries work; witness accounts, rumors, retrieval-driven decisions, forgetting/revision and contradictory beliefs not implemented. |
| Adult partnerships | VERIFIED | Existing deterministic tests cover dating, marriage, separation and eligibility. No live partnership guaranteed. |
| Child-safe life stages | NOT STARTED | Required before any live births. |
| Procreation, adoption, genealogy | NOT STARTED | No births or child records enabled by this session. |
| Awakening self-models / metacognition | NOT STARTED | Diary prompts do not satisfy this acceptance criterion. |
| Creator-discovery hypothesis engine | NOT STARTED | No automatic knowledge or forced acceptance of Abby. |
| Reveal the Designer | NOT STARTED | Admin label only; no revelation action implemented. |
| Messages to the Observer | NOT STARTED | No fabricated citizen requests. |
| Director Observatory modes / Forbidden Archive | NOT STARTED | Require backend admin authorization before private secrets. |
| Rumor Engine / Whisper Web | NOT STARTED | Existing conversation records are not a rumor-propagation model. |
| Timeline copying / comparison | IN PROGRESS | Existing checkpoint restore creates new timeline; full simultaneous universe comparison not implemented. |
| iPad/iPhone hardware acceptance | IN PROGRESS | Responsive interface exists; real touch/WebGL performance unverified. |
| Existing bakery and planner pipeline | VERIFIED | Preserved previous verified artifacts and UI; no public publication. |

---
# Historical feature records

# Genesis verified feature checklist

Statuses: NOT STARTED, IN PROGRESS, IMPLEMENTED, VERIFIED, BLOCKED.

| Feature | Status | Evidence / remaining acceptance |
|---|---|---|
| Application launch | VERIFIED | Private Codespaces browser load and saved world verified again after Chaos Village labels. |
| Convex persistence | VERIFIED | Adult creation, day advancement and checkpoint saved live; isolated backend regression suite passes. |
| Actual 3D village / camera | VERIFIED | Mesh geometry with Three.js; projected-mesh SVG fallback was visually tested with camera presets. WebGL hardware path is not tested here. |
| Animated citizens | IMPLEMENTED | Saved-position interpolation and activity-linked poses; continuous movement acceptance still needs a focused observation. |
| Founding twelve identities | VERIFIED | Twelve founders preserved. Nova is a thirteenth adult, intentionally retained. |
| Character Studio | VERIFIED | Adult creation saved live; Nova goal edit survived a browser refresh in this session. |
| Independent rules decisions | VERIFIED | Reproducible 600 steps, needs priorities and linked event records; no LLM autonomy claimed. |
| Hobbies | IMPLEMENTED | Stored, editable and included in social partner scoring; recreation/skill progression pending. |
| Conversation history | VERIFIED | Saved encounter messages; template source is explicit. No generated reasoning implied. |
| Trust and friendships | VERIFIED | Rules alter saved trust; core tests link actions and conversations. Romance absent. |
| Adult dating / marriage / separation | VERIFIED | Seeded rule tests passed; live backend persisted family metadata and browser archive rendered. No live couple formed during the one-day check. |
| Procreation | NOT STARTED | Must pass adult eligibility, simulated reciprocal consent, resource checks, child creation and restart consistency. |
| Aging | IN PROGRESS | Numeric calendar age exists; child stages, aging toggle and mortality absent. |
| Family trees | NOT STARTED | No parent-child graph yet. Do not invent family records. |
| God Mode | IN PROGRESS | Existing validated parser/time/build/scenario actions remain. Ten distinct commands have not yet been acceptance-tested as a catalog. |
| Chaos Dial | NOT STARTED | No probability setting yet. |
| Rumor Engine | NOT STARTED | Needs per-citizen knowledge and actual transmission records. |
| Observer Effect | IN PROGRESS | Existing light and food-shortage scenarios have state effects; witness accounts and evidence are absent. |
| Forbidden Archive | NOT STARTED | Requires backend administrator authorization before a secrets UI. |
| Village history | VERIFIED | Persistent events and checkpoint timelines; full replay pending. |
| iPad / iPhone | IN PROGRESS | Responsive UI and touch OrbitControls; actual Safari device acceptance not performed. |

Implementation: data/genesisLife.ts, data/genesisProfiles.ts, convex/genesis.ts, src/components/GenesisWorld3D.tsx, CharacterStudio.tsx, GenesisPanels.tsx.

Regression repair: both initial and existing-world upgrade paths now populate the same profiles, so repeated additive upgrades are idempotent. Isolated test harnesses now compile genesisProfiles.

| Actual downloadable planner | VERIFIED | 156-page PDF and 9-page preview rendered; download hash verified in browser. Private artifact bundle retained. |
| Product integrity pipeline | VERIFIED | All-file hashes, PDF open/render/bounds/links; negative missing/tampered tests pass. |
| Product revision / work log / review gate | VERIFIED | Revision 1 displayed awaiting-owner-review with real tool-role logs; public publishing is not connected. |
| General-purpose autonomous product generation | NOT STARTED | Current product is authored through development tools and validated by a product-specific pipeline. |
