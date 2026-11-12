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
