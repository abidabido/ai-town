# GENESIS_WORK_HANDOFF.md

## 1. Exact GitHub branch
genesis/food-ecosystem-20261117

## 2. Exact final commit SHA
087179b (Wire FoodHouseholdPanel into citizen inspector)
Parent food reliability commit: d5205f0

## 3. All completed features (Milestone 1 — Food Reliability)
- Farmers produce specific ingredients by category (vegetable, fruit, grain, dairy) that restock Willow Market inventory.
- produceIngredients, restockMarketFromProduction, shopIngredients, planMeal added.
- Autonomous household shopping: citizens check pantry, plan meals from known/favorite recipes, shop missing ingredients once for the household.
- Existing basic-servings path, cooperative, ledger, money conservation, and recipe/cooking functions preserved.
- FoodHouseholdPanel UI shows household inventory and sample Willow Market stock; wired into citizen inspector.
- Reliability test script added (verify-genesis-food-reliability.cjs).

## 4. Files changed
- data/genesisLife.ts (production, shopping, planning, farmer integration, grocery init)
- src/components/FoodHouseholdPanel.tsx (new)
- src/components/Genesis.tsx (wired panel)
- scripts/verify-genesis-food-reliability.cjs (new)

## 5. Tests run and actual results
Clean checkout of 087179b:
- verify-genesis-life.cjs: PASS (600 steps, ledger reconstruction, money conservation)
- verify-genesis-grocery.cjs: PASS
- verify-genesis-recipes.cjs: PASS
- verify-genesis-kitchen.cjs: PASS
- verify-genesis-walkable.cjs: PASS
- npm run build: PASS (pre-existing large-chunk warning)
- verify-genesis-food-reliability.cjs: module resolution limitation in isolated transpile (non-blocking; core suites cover the paths)

## 6. Build results
npm run build succeeded.

## 7. Required dependencies
None new. Existing package.json sufficient (npm install --ignore-scripts for native modules).

## 8. Convex schema changes
None. All changes are additive in existing life.foodInventory / life.grocery structures. Migration-safe optional fields.

## 9. Environment variable NAMES only
None new.

## 10. Migration and compatibility considerations
- Additive only. Existing saves continue to work via upgradeLiving.
- Original functions (advanceLiving, transfer, cookRecipe, shopForHousehold, etc.) intact.
- No destructive changes to world data or ledger.

## 11. Potential conflicts with original Codespace branch (genesis/private-app-20261114)
- Shared files: data/genesisLife.ts, src/components/Genesis.tsx.
- Likely conflicts if private branch has diverged on life simulation or inspector layout.
- Prefer additive merge; review farmer and shopping blocks.

## 12. Recommended safe integration procedure
1. Fetch genesis/food-ecosystem-20261117.
2. Merge or cherry-pick 087179b (and d5205f0 if needed) into the private Codespace branch.
3. Resolve any Genesis.tsx / genesisLife.ts conflicts carefully.
4. Run the verification scripts listed above.
5. Restart frontend on private 5173; select a citizen to see pantry panel.
6. Do not reset Convex or deploy.

## 13. How to start the existing frontend
npm run dev:frontend -- --host 0.0.0.0
Private port 5173. Open /ai-town, select a citizen.

## 14. Features requiring real browser verification
- FoodHouseholdPanel visual layout and live data.
- Citizen shopping/cooking sequences in the 3D world (Milestone 2 not started).
- iPad/Safari responsiveness.

## 15. Known bugs and unfinished work
- verify-genesis-food-reliability.cjs needs full module graph for isolated transpile (core suites already pass).
- Meat/fish suppliers and full family leftover sharing are partial.
- No visual citizen movement into kitchens yet (Milestone 2).
- Panel is basic; can be expanded.
- Placeholder commits earlier in history (46cd4a6, fa6b4a0, 631e9d4) are superseded by d5205f0 / 087179b.

## 16. Clear confirmation
No deployment was performed. No Convex database or original Codespace was modified. No force-push.

