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
