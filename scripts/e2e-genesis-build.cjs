// Opt-in real-browser test. Uses only localhost and normal UI mutations.
// Requires stopped UI playback. Preserves existing items and saves at most once.
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const root = process.cwd();
const { chromium } = require(
  process.env.GENESIS_PLAYWRIGHT_MODULE || "playwright",
);
const T = require(require.resolve("three", { paths: [root] }));
const { ConvexHttpClient } = require(
  require.resolve("convex/browser", { paths: [root] }),
);
const { anyApi } = require(require.resolve("convex/server", { paths: [root] }));
const artifact = path.resolve(
  process.env.GENESIS_E2E_ARTIFACTS || ".genesis-test-artifacts",
);
const reloadMode = process.argv.includes("--reload-only");
const report = {
  steps: [],
  manualBrowserVerification: false,
  physicalDeviceTest: false,
  mode: reloadMode ? "read-only reload" : "single-save construction",
};
let browser, page;
const pass = (s) => {
  report.steps.push(s);
  console.log("PASS", s);
};
async function reloadOnly(client, world, original) {
  fs.mkdirSync(artifact, { recursive: true });
  browser = await chromium.launch();
  report.browserVersion = browser.version();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173/ai-town#genesis-build");
  await page
    .getByRole("button", { name: "Play village", exact: true })
    .waitFor();
  const open = async () => {
    await page
      .getByRole("button", { name: "BUILD & DECORATE", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.waitForFunction(
      (n) =>
        document.querySelectorAll('select[aria-label="Selected wall"] option')
          .length === n,
      (original.design.walls?.length ?? 0) + 1,
    );
    assert.equal(
      await page
        .locator('select[aria-label="Selected build object"] option')
        .count(),
      original.design.items.length + 1,
    );
  };
  await open();
  pass(
    "Existing building and furniture reconstruct in actual localhost Build Mode.",
  );
  await page.reload();
  await open();
  pass("Second full page load restores the same wall and furniture counts.");
  await page
    .getByText("Room 1: 12 m² · doorway present", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Floor colour", { exact: true }).inputValue(),
    "#c49b70",
  );
  await page
    .getByRole("combobox", { name: "Selected wall", exact: true })
    .selectOption({ index: 1 });
  assert.equal(
    await page.getByLabel("Wall colour", { exact: true }).inputValue(),
    "#e9d6bb",
  );
  pass("Saved room, doorway and wall/floor finishes restore correctly.");
  report.renderer = await page
    .locator(".build-scene")
    .evaluate((el) => el.firstElementChild?.tagName);
  await page.screenshot({ path: path.join(artifact, "build-restored.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  const control = page.getByRole("button", { name: "Draw room", exact: true });
  await control.scrollIntoViewIfNeeded();
  const box = await control.boundingBox();
  assert.ok(box.width >= 44 && box.height >= 44);
  await page.screenshot({ path: path.join(artifact, "build-phone.png") });
  pass("390×844 layout keeps construction controls reachable and touch-sized.");
  assert.deepEqual(
    await client.query(anyApi.buildLots.current, { worldId: world.id }),
    original,
  );
  assert.deepEqual(
    (await client.query(anyApi.genesis.current, {})).state,
    world.state,
  );
  assert.equal(errors.length, 0);
  report.savedRevision = original.revision;
  report.result = "PASS";
  pass(
    "Read-only retest changes neither the saved lot nor village state; no browser errors.",
  );
}
async function main() {
  const line = fs
    .readFileSync(".env.local", "utf8")
    .split(String.fromCharCode(10))
    .find((l) => l.startsWith("VITE_CONVEX_URL="));
  assert.ok(line, "VITE_CONVEX_URL required");
  let url = line.slice(line.indexOf("=") + 1).trim();
  if (url.startsWith('"')) url = JSON.parse(url);
  const client = new ConvexHttpClient(url),
    world = await client.query(anyApi.genesis.current, {});
  assert.ok(world?.state, "An existing village is required.");
  const original = await client.query(anyApi.buildLots.current, {
    worldId: world.id,
  });
  assert.ok(original, "An existing lot is required.");
  if (process.argv.includes("--reload-only"))
    return reloadOnly(client, world, original);
  assert.equal(
    original.design.walls?.length ?? 0,
    0,
    "This first-save acceptance test expects the preserved furniture-only lot. It refuses to overwrite an existing building.",
  );
  fs.mkdirSync(artifact, { recursive: true });
  fs.writeFileSync(
    path.join(artifact, "lot-before-rev-" + original.revision + ".json"),
    JSON.stringify(original, null, 2),
  );
  report.baselineRevision = original.revision;
  report.baselineItems = original.design.items.length;
  browser = await chromium.launch();
  report.browserVersion = browser.version();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173/ai-town#genesis-build");
  const open = async () => {
    await page
      .getByRole("button", { name: "BUILD & DECORATE", exact: true })
      .click();
    await page.getByRole("dialog").waitFor();
    await page.locator(".build-scene").waitFor();
  };
  await page
    .getByRole("button", { name: "Play village", exact: true })
    .waitFor();
  report.playback = "Stopped in UI; no Play/Advance command executed";
  await open();
  pass(
    "Actual Build Mode opens on localhost with the saved furniture; playback is stopped.",
  );
  const count = async (w, r) => {
    await page.waitForFunction(
      ([w, r]) =>
        Array.from(document.querySelectorAll(".build-architecture p")).some(
          (p) =>
            p.textContent.includes(w + "/64 walls") &&
            p.textContent.includes(r + " enclosed"),
        ),
      [w, r],
    );
  };
  const project = async (x, z) => {
    const b = await page.locator(".build-scene").boundingBox();
    assert.ok(b && b.width > 100 && b.height > 100);
    const c = new T.PerspectiveCamera(45, b.width / b.height, 0.1, 100);
    c.position.set(10, 11, 12);
    c.lookAt(0, 0, 0);
    c.updateMatrixWorld(true);
    const p = new T.Vector3(x, 0, z).project(c);
    return {
      x: b.x + ((p.x + 1) * b.width) / 2,
      y: b.y + ((1 - p.y) * b.height) / 2,
    };
  };
  const drag = async (a, b) => {
    const p = await project(...a),
      q = await project(...b);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(q.x, q.y, { steps: 20 });
    await page.mouse.up();
  };
  await page.getByRole("button", { name: "Draw wall", exact: true }).click();
  await drag([2.5, -4.5], [4.5, -4.5]);
  await count(1, 0);
  pass("Pointer drag creates an actual wall.");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await count(0, 0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await count(1, 0);
  pass("Wall drawing supports undo and redo.");
  await page
    .getByRole("combobox", { name: "Selected wall", exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Delete wall", exact: true }).click();
  await count(0, 0);
  pass("Selected wall can be deleted.");
  await page.getByRole("button", { name: "Draw room", exact: true }).click();
  await drag([-2.5, -5], [1.5, -2]);
  await count(4, 1);
  await page
    .getByText("Room 1: 12 m² · needs a doorway", { exact: true })
    .waitFor();
  pass("Rectangle drag creates four walls and a 12 m² enclosed floor.");
  await page
    .getByRole("combobox", { name: "Selected wall", exact: true })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add doorway", exact: true }).click();
  await page
    .getByText("Room 1: 12 m² · doorway present", { exact: true })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Wall colour", exact: true })
    .count()
    .then(async (n) => {
      if (n)
        await page
          .getByRole("textbox", { name: "Wall colour", exact: true })
          .fill("#e9d6bb");
      else
        await page.getByLabel("Wall colour", { exact: true }).fill("#e9d6bb");
    });
  await page.getByLabel("Floor colour", { exact: true }).fill("#c49b70");
  pass("Valid doorway and wall/floor colours update through the UI.");
  await page.getByRole("button", { name: /Coffee table/ }).click();
  await drag([-0.5, -3.5], [-0.5, -3.5]);
  await page.waitForFunction(
    (n) =>
      Array.from(
        document.querySelectorAll(
          'select[aria-label="Selected build object"] option',
        ),
      ).filter((o) => o.value).length === n,
    original.design.items.length + 1,
  );
  pass("Furniture can be placed inside the room.");
  assert.equal(
    errors.length,
    0,
    "No uncaught browser errors before save: " + errors.join("; "),
  );
  await page.getByRole("button", { name: "Save design", exact: true }).click();
  await page.getByText("Your lot has been saved.", { exact: true }).waitFor();
  const saved = await client.query(anyApi.buildLots.current, {
    worldId: world.id,
  });
  assert.equal(saved.revision, original.revision + 1);
  assert.equal(saved.design.walls.length, 4);
  assert.equal(saved.design.items.length, original.design.items.length + 1);
  assert.equal(saved.design.floorColor, "#c49b70");
  assert.equal(saved.design.walls.filter((w) => w.door).length, 1);
  for (const i of original.design.items)
    assert.deepEqual(
      saved.design.items.find((j) => i.id === j.id),
      i,
      "Existing furniture must be unchanged",
    );
  for (const old of original.history)
    assert.ok(
      saved.history.some((h) => h.revision === old.revision),
      "Retain previous saved versions",
    );
  fs.writeFileSync(
    path.join(artifact, "lot-after-rev-" + saved.revision + ".json"),
    JSON.stringify(saved, null, 2),
  );
  pass(
    "Normal Save writes the real Convex development backend and preserves existing furniture/history.",
  );
  report.savedRevision = saved.revision;
  report.renderer = await page
    .locator(".build-scene")
    .evaluate((el) => el.firstElementChild?.tagName);
  await page.screenshot({ path: path.join(artifact, "build-saved.png") });
  await page.reload();
  await open();
  await count(4, 1);
  const reloaded = await client.query(anyApi.buildLots.current, {
    worldId: world.id,
  });
  assert.deepEqual(reloaded.design, saved.design);
  pass("Page refresh reconstructs the same saved building and furniture.");
  await page.getByText("Earlier saved designs", { exact: true }).click();
  await page
    .getByRole("button", {
      name: "Load version " + original.revision + " as a draft",
      exact: true,
    })
    .click();
  await count(0, 0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await count(4, 1);
  pass(
    "A prior saved design can be loaded as a draft; Undo restores the current building without another save.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Draw room", exact: true })
    .scrollIntoViewIfNeeded();
  assert.ok(
    await page
      .getByRole("button", { name: "Draw room", exact: true })
      .isVisible(),
  );
  const button = await page
    .getByRole("button", { name: "Draw room", exact: true })
    .boundingBox();
  assert.ok(button.width >= 44 && button.height >= 44);
  report.responsiveViewport = "390x844";
  await page.screenshot({ path: path.join(artifact, "build-phone.png") });
  pass(
    "Phone-size layout exposes touch-sized construction controls (not a physical-device test).",
  );
  const finalWorld = await client.query(anyApi.genesis.current, {});
  assert.deepEqual(
    finalWorld.state,
    world.state,
    "Village simulation must remain unchanged",
  );
  assert.equal(
    errors.length,
    0,
    "Uncaught browser errors: " + errors.join("; "),
  );
  pass("Village simulation state stays unchanged; no uncaught browser errors.");
  report.result = "PASS";
}
main()
  .catch(async (e) => {
    report.result = "FAIL";
    report.error = e.stack;
    console.error(e.stack);
    process.exitCode = 1;
    if (page)
      await page
        .screenshot({ path: path.join(artifact, "build-failure.png") })
        .catch(() => {});
  })
  .finally(async () => {
    if (browser) await browser.close();
    fs.mkdirSync(artifact, { recursive: true });
    fs.writeFileSync(
      path.join(
        artifact,
        reloadMode ? "build-reload-report.json" : "build-e2e-report.json",
      ),
      JSON.stringify(report, null, 2),
    );
  });
