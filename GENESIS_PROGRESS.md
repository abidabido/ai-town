# Current checkpoint — Human-friendly Genesis · November 12, 2026

Branch: genesis/human-friendly-20261112. Latest verified implementation: a7d1c20 (core upgrade 8990aa8). Inspected baseline 12c1315; existing untracked files preserved. This section supersedes older scope notes below.

## Completed
- Clear anchor navigation: My Village, The People, Love & Families, Town Talk, What’s Happening, The Observatory, Village History; plus Help and Creation Studio. All nine destinations verified against live DOM. Original AI Town remains available.
- Main page, camera help, loading/status wording, citizen editor, families, chat, money and product reviews use plainer language. Build logs, source IDs, file fingerprints, personality/needs/belief/trust scores and graphics information remain available in optional details. Creation Studio is expandable and keeps its actual preview/download/review features.
- Profiles introduce each person with their real age, job and hobbies. Sections cover activity, wellbeing, personality, hobbies, goals, friends, actual partnership, household, memories and story. Trust descriptions use existing thresholds; housemates are never inferred to be lovers or relatives.
- The Daily Tea uses real saved events. It offers Today and Since my last visit, ordinary-life counts, quiet states and expandable underlying events. A per-world/per-timeline localStorage visit cursor uses database creation time, so same-tick new events can appear. This is browser-local, not account-synced; only the latest 100 history results are available, with a coverage warning when older unseen news may be missing. It does not generate rumors or run background simulation.
- Friendly command aliases and nine clickable examples: activity, dating/families, tension, profile/personality, today, create form, saved conversations and one-week advancement. Weather selection and Observer beliefs return honest not-ready explanations. Creation opens a form; it never silently creates a record. Existing validated world-changing commands and confirmation remain.
- New saved conversation text varies by confidence, humor, empathy, sociability/hobby, current outlook and accessible prior shared diary participation. It is bounded written-pattern dialogue tied to existing meetings and their actual civil/disagreement outcome. No new meetings, facts, decisions, paid inference or historical transcript rewrites.
- Searchable How Genesis Works covers routines, personality, family limits, time, editing, commands, memory limits, the Observer, conversations, money/products and unfinished controls. Recap and chat reading size verified at 16 px; touch targets and mobile CSS improved.

## Verification
All eight suites passed: verify-genesis.cjs, verify-genesis-commands.cjs, verify-genesis-life.cjs, verify-genesis-backend.cjs, verify-genesis-families.cjs, verify-genesis-products.cjs, verify-genesis-memory.cjs, verify-genesis-friendly.cjs in scripts/. npm run build passed; convex dev --once succeeded. After final wording polish, friendly/backend tests, build and deploy passed again. Final CSS reading-size change verified in the browser; no simulation logic changed.
New suite checks truthful formatting, first/quiet/same-tick visit cursor, command classification and aliases, personality/memory-grounded voice, plus 80 deterministic steps against baseline 12c1315. All citizen state, events, balances/transfers and message metadata match baseline; only spoken text differs.
Browser checks: Sage profile command, create-form open/cancel, help search, Today recap and event expansion, quiet return after reload, unsupported rain with unchanged time, Creation Studio navigation and actual product controls, and all navigation targets. Saved recovery point at Year 1 Month 2 Day 28 18:00, then advanced exactly one day to Day 29 18:00. New lines appeared in saved Town Talk; all 13 existing adults retained. World left paused. No payments, paid model, visibility changes or public deployment.

## Run / preview
/workspaces/ai-town · npm run dev:frontend · existing private port 5173.
Private preview: https://redesigned-dollop-vgq5599rxw6hjpr-5173.app.github.dev/ai-town
Codespace: redesigned-dollop-vgq5599rxw6hjpr. Repository: https://github.com/abidabido/ai-town
Existing Convex deployment updated. Environment names only: CONVEX_DEPLOYMENT, VITE_CONVEX_URL. No new credentials/dependencies. Codespaces can sleep; no always-on worker is configured. Preserve private planner assets and recovery instructions below.

## Remaining limits
Real iPad/iPhone touch and WebGL hardware acceptance remains pending. Copy in the separate legacy AI Town view is preserved rather than rewritten. Deep historical/raw technical entries remain verbatim inside details. Dialogue is still bounded templates, not general language-model conversation; age/background vocabulary and richer ordinary-life topics remain future work. Full cross-device visit tracking and paginated older recaps are not implemented. Babies, pregnancy, adoption, rumor spread, creator discovery and advanced experiments remain unfinished and are explicitly described as such in Help. Next priority for this user request: physical-device UX audit and oldest-event pagination, then richer grounded conversation topics without changing simulation outcomes.

---
# Historical checkpoints

# Current checkpoint — The Awakening · November 12, 2026

Branch: genesis/awakening-memory-20261112. Latest verified implementation commit: e08b4d7. Baseline inspected: f972939. This section supersedes older status notes retained below.

## Working now
The private village loads with THE OBSERVER · Abby and The Awakening labels. Preserved all 13 existing adults (12 philosophical founders plus Nova); no population reset. Existing 3D/fallback renderer, character editing, needs, jobs, money, partnerships, conversations, checkpoints, bakery and private planner remain intact.

Living Memory v1 is VERIFIED: data/genesisMemory.ts stores optional life.memory diaries on accepted simulation mutations in convex/genesis.ts. Only known rule-engine/family-rule-engine events with matching timeline and participating IDs are copied. Owner commands and global/nonparticipant events are excluded. Entries retain actionId, source, tick, timeline, participants, observation and reason. Up to 240 entries per citizen are retained with a shared 120,000-character budget (older entries evicted first); source events remain in genesisEvents. No backfill of old unlinked prose memories. UI shows latest 30 matching entries and searches all retained entries. Trait-based reflection prompts are explicitly templates; this is not metacognition or independent language reasoning. No rumor spread, evidence revision or behavior retrieval is implemented yet.

Browser acceptance: recovery checkpoint saved before advancing exactly one day, Y1 M2 D27 18:00 to D28 18:00; Sage showed five linked experiences. Search meal returned one linked meal memory; source inspection showed rule-engine and Sage. Reload and reselection retained five memories. Saved world reads/writes verified on existing Convex development deployment. No authentication, billing or visibility changes. World stays paused unless Watch is started by the user.

## Validation
All seven suites passed: scripts/verify-genesis.cjs, verify-genesis-commands.cjs, verify-genesis-life.cjs, verify-genesis-backend.cjs, verify-genesis-families.cjs, verify-genesis-products.cjs, verify-genesis-memory.cjs. npm run build passed. convex dev --once succeeded. Backend regression now asserts diary actor membership, underlying event existence and repeat-read persistence. Memory tests cover source restrictions, no owner/global leakage, duplicate prevention within retained history, trait-based prompts, input-event immutability, retention, JSON roundtrip and timeline-copy isolation. git diff --check passed.

## Run and preview
Repository: https://github.com/abidabido/ai-town
Codespace: redesigned-dollop-vgq5599rxw6hjpr
Private preview: https://redesigned-dollop-vgq5599rxw6hjpr-5173.app.github.dev/ai-town
In /workspaces/ai-town run npm run dev:frontend (existing Vite 0.0.0.0:5173, port Private). Codespaces may sleep; no always-on service is configured. Existing Convex deployment is already updated. Environment names only: CONVEX_DEPLOYMENT, VITE_CONVEX_URL. Preserve existing values; do not reinitialize the backend.

## Known limits / next task
Births, children, pregnancy, adoption and full aging controls remain NOT STARTED. Adult dating/marriage/separation already exist; do not duplicate. Next priority: child-safe needs, education, caregiver resources and age-appropriate actions in isolated tests before enabling births. Memory follow-up: explicit witness/claim provenance and bounded retrieval influencing one verified decision rule. Awakening protocol, self-models, creator hypotheses, Reveal the Designer and Messages to the Observer remain NOT STARTED. Admin-only secrets require real backend authorization first. WebGL hardware and actual iPad touch performance remain unverified; cloud browser uses projected-mesh compatibility renderer. No new paid model or public deployment. Private product assets remain gitignored; preserve Library recovery instructions below. Pre-existing untracked convex/README.md and failed bakery artifacts were left untouched.

---
# Historical checkpoint notes (older scope and statuses)

# Project Genesis progress

Current scope: THE CHAOS VILLAGE. Real-world business development is deferred; existing bakery files and studio code remain preserved.

Branch: genesis/products-first-20261112. Last browser-verified baseline before this session: 7342fa8 (genesis/3d-studio-20261111).

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


## Products before profit milestone
Current branch: genesis/products-first-20261112. Built The Ultimate Life Organizer revision 1: 156-page original undated US Letter PDF, 9-page sample PDF, cover thumbnail, four preview PNGs, accurate draft listing, print guide, work log and source generator. All 156 full pages and 9 sample pages opened and rendered; 163 internal links and text bounds checked. Artifact SHA-256 and missing/tampered file tests passed. Production build passed. Live app displays revision 1 awaiting-owner-review; sample selector works and actual PDF download hash matches 8653fec397ac8ca2c5960f16e2e9a066374605bae3b19e2e2f2839670111e21d.
Pipeline code: scripts/genesis-product-pipeline.cjs, scripts/validate-genesis-planner.py, scripts/verify-genesis-products.cjs. Product records: convex/genesisProducts.ts and genesisProducts schema table. UI: DigitalProducts.tsx inside CreationStudio. Roles are actual tool-execution labels, never autonomous labor claims. No storefront, payments or publication integration was added.
Privacy: this GitHub fork is public. Product binary files and original design source are deliberately excluded from Git via .gitignore. Private runtime files: public/genesis-products/life-organizer/v1. Durable complete bundle is in the owner ChatGPT Library as The_Ultimate_Life_Organizer_Package.zip. If the Codespace files are lost, restore that private bundle into the same folder, run validation, and recreate Product_Package.zip; do not create duplicate backend revision records. Do not push private product assets to the public fork.
Environment: GENESIS_PDF_PYTHON optionally selects Python; default /workspaces/.genesis-product-runtime/bin/python with reportlab and pymupdf installed in an isolated venv. Existing Convex environment variable names remain unchanged. No secrets belong here.
Limit: first product-specific artifact validation/packaging pipeline, not a general-purpose autonomous product designer. 31 reusable daily pages require duplication for a full year; budgets are manual; PDF is not a type-in form. Proposed $9 and fee scenario are assumptions, not researched platform rates or verified profit.

Latest verified product code commit: 77555bd. Browser now verifies artifact bytes against the recorded SHA before enabling downloads, and confirms preview and package availability. Both full PDF and complete package download controls were exercised. All five existing Genesis suites and product validation/negative tests passed; final production build and Convex dev update passed.
