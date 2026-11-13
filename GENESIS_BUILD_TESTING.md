# Build & Decorate: verified tests and a quick try-it guide

## Private preview

https://redesigned-dollop-vgq5599rxw6hjpr-5173.app.github.dev/ai-town#genesis-build

Keep the Codespace awake. The forwarded port is PRIVATE, verified in the Codespace Ports panel. Sign in with your authorized GitHub account if asked. No authentication or visibility setting was changed. The cloud preview sign-in redirect is still inaccessible to this agent; local browser tests do not establish that the forwarded link works on your iPad.

## What you should see

Choose BUILD & DECORATE. Saved version 6 contains the five original objects plus a coffee table, four walls around a 12 m² room, an open doorway and saved wall/floor colours. This is the isolated Willow design lot, not an enterable village house. All older saved designs remain available.

## Simple manual check (not yet performed on a real iPad)

1. Open Build & Decorate. Check that the room and the original furniture appear.
2. Choose View / orbit to turn the lot and zoom. Choose Draw wall, then drag in clear space. Lift your finger to place it. Choose Undo to remove your test wall.
3. Choose Draw room and drag a rectangle in clear space. The editor should recognize a room and add a floor. Undo this trial if you want to keep the current design.
4. Choose a catalog item, drag it onto a clear spot and lift to place. Red previews mean the spot is invalid. Choose Undo to remove the trial item.
5. To keep an edit, press Save design and wait for “Your lot has been saved.” Refresh, reopen Build & Decorate, and check the same edit is there.
6. To inspect an earlier design safely, open Earlier saved designs, load a version as a draft, and use Undo to return. Loading a draft alone does not replace the saved design.

Manual acceptance remains pending: real iPad/iPhone Safari, actual touch drawing, two-finger pinch/rotation, portrait/landscape usability, GPU performance and visual comfort.

## Automated browser verification performed

Real Playwright Chromium 159.0.8154.6 ran INSIDE the Codespace against http://localhost:5173/ai-town#genesis-build. It used the actual React Build Mode, real Three.js WebGL canvas and normal UI events. The normal Save button wrote the real Convex development backend; it was not a mocked save or localStorage substitute.

Passed: open editor; draw wall; undo/redo; delete wall; draw room; 12 m² floor; add doorway; paint wall/floor; place coffee table; single real save from revision 5 to 6; preserve all five original object records and all prior saved versions; full page refresh; reconstruct saved design; load prior saved version as draft; Undo back to current design; phone-size 390×844 control reachability and minimum 44×44 target; no uncaught browser errors; exact village-state equality before/after.

A second --reload-only run passed without writing data, including room/doorway and saved colour checks. It is safe to repeat on the current acceptance fixture. The first run saves at most once and refuses to run the drawing scenario over a lot that already contains walls. Do not empty or overwrite an existing building merely to rerun that scenario.

All 17 existing scripts/verify-genesis*.cjs passed again, npm run build passed, and git diff --check passed. No application/simulation defect was found requiring a production-code change. The initial test guard incorrectly expected the persistent paused flag; source inspection showed playback is stopped by React's playing=false default. The runner now verifies the visible Play village button and checks exact world-state equality. It never presses Play or Advance.

## Reproducing automated checks in a future Codespace session

The runner is opt-in and does not add project dependencies. Install official Playwright/Chromium in a temporary test directory if absent:

    npm install --prefix /tmp/genesis-e2e playwright
    /tmp/genesis-e2e/node_modules/.bin/playwright install chromium
    /tmp/genesis-e2e/node_modules/.bin/playwright install-deps chromium

The last command installs standard system libraries, not application packages. The completed test environment used Playwright's normal headless configuration. No web-security, application authentication, firewall, port-visibility or production permission setting was modified.

Ensure the existing frontend is running on localhost:5173. Keep playback stopped. Run the current non-writing fixture:

    GENESIS_PLAYWRIGHT_MODULE=/tmp/genesis-e2e/node_modules/playwright node scripts/e2e-genesis-build.cjs --reload-only

Only on a preserved furniture-only acceptance lot with no walls, the one-save scenario is:

    GENESIS_PLAYWRIGHT_MODULE=/tmp/genesis-e2e/node_modules/playwright node scripts/e2e-genesis-build.cjs

The single-save test intentionally leaves its verified room and coffee table in the design lot. It refuses a nonempty-wall baseline and checks saved versions are retained. It does not create citizens, spend money or mutate village simulation state.

Local screenshots, before/after lot backups and full reports are in .genesis-test-artifacts/ (ignored by Git). Do not commit the private baseline-world backup. Public-safe aggregate reports are in docs/testing/. The downloaded Playwright package/browser lives outside the repository; package.json and package-lock.json are unchanged.

## Still unfinished

Walkable interiors, doors that open/close, household assignment, citizen furniture actions, roofs, shared-wall/T-junction topology and multi-storey construction remain outside this milestone. Browser automation passing does not make those features implemented.
