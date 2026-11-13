// Opt-in: sends three real in-world messages to Sage through the normal UI.
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const { chromium } = require(
  process.env.GENESIS_PLAYWRIGHT_MODULE || "playwright",
);
const { ConvexHttpClient } = require("convex/browser"),
  { anyApi } = require("convex/server");
const directory = ".genesis-test-artifacts";
fs.mkdirSync(directory, { recursive: true });
const report = {
  result: "RUNNING",
  steps: [],
  engine: "rules-v1",
  languageModelUsed: false,
  physicalDeviceTest: false,
};
let browser, page;
const pass = (s) => {
  report.steps.push(s);
  console.log("PASS", s);
};
(async () => {
  try {
    const line = fs
      .readFileSync(".env.local", "utf8")
      .split(String.fromCharCode(10))
      .find((l) => l.startsWith("VITE_CONVEX_URL="));
    let url = line.slice(line.indexOf("=") + 1).trim();
    if (url.startsWith('"')) url = JSON.parse(url);
    const client = new ConvexHttpClient(url),
      before = await client.query(anyApi.genesis.current, {}),
      citizen = before.state.citizens.find((c) => c.name === "Sage");
    assert.ok(citizen);
    const old = await client.query(anyApi.citizenTalk.thread, {
      worldId: before.id,
      citizen: citizen.id,
    });
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:5173/ai-town");
    await page
      .getByRole("button", { name: "Play village", exact: true })
      .waitFor();
    const open = async () => {
      await page
        .locator("button[aria-pressed]")
        .filter({ hasText: "Sage" })
        .first()
        .click();
      await page
        .getByRole("region", { name: "Sage's profile", exact: true })
        .getByRole("button", { name: "TALK TO CITIZEN", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "You & Sage", exact: true })
        .waitFor();
      await page
        .getByText("Limited rules-based replies", { exact: true })
        .waitFor();
    };
    await open();
    pass("Sage profile opens a clearly labelled limited conversation dialog.");
    if (process.argv.includes("--read-only")) {
      assert.ok(old.length > 0);
      report.mode = "read-only";
      await page.reload();
      await open();
      await page.waitForFunction(
        (n) => document.querySelectorAll(".talk-history article").length === n,
        old.length,
      );
      assert.deepEqual(
        await client.query(anyApi.citizenTalk.thread, {
          worldId: before.id,
          citizen: citizen.id,
        }),
        old,
      );
      assert.deepEqual(
        (await client.query(anyApi.genesis.current, {})).state,
        before.state,
      );
      assert.equal(errors.length, 0);
      await page.screenshot({
        path: path.join(directory, "citizen-talk-saved.png"),
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Send message", exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(directory, "citizen-talk-phone.png"),
      });
      pass(
        "Existing conversation survives a full refresh with no database or village changes.",
      );
      report.messages = old.length;
      report.browser = browser.version();
      report.result = "PASS";
      return;
    }
    const send = async (text) => {
      await page
        .getByRole("textbox", { name: "Message to Sage", exact: true })
        .fill(text);
      await page
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await page
        .getByText(
          "Message and reply saved. Limited rules-based response; no language model was used.",
          { exact: true },
        )
        .waitFor();
    };
    await send("What are you doing?");
    let entries = await client.query(anyApi.citizenTalk.thread, {
      worldId: before.id,
      citizen: citizen.id,
    });
    assert.equal(entries.length, Math.min(60, old.length + 2));
    assert.ok(
      entries
        .at(-1)
        .body.includes(
          before.state.life.people[citizen.id].activity.toLowerCase(),
        ),
    );
    assert.equal(entries.at(-2).identity, "Unknown correspondent");
    pass(
      "Two-way exchange saves to actual Convex and uses Sage’s recorded activity without revealing Abby.",
    );
    await page.waitForTimeout(2100);
    await send("What did I tell you last time?");
    entries = await client.query(anyApi.citizenTalk.thread, {
      worldId: before.id,
      citizen: citizen.id,
    });
    assert.ok(entries.at(-1).body.includes("What are you doing?"));
    pass("Follow-up response recalls the actual preceding player message.");
    if (
      before.state.life.observer?.mode === "The Feeling" ||
      !before.state.life.observer
    ) {
      await page.waitForTimeout(2100);
      await page
        .getByRole("combobox", { name: "Communication method", exact: true })
        .selectOption("Observer Communication");
      await send("What do you enjoy?");
      entries = await client.query(anyApi.citizenTalk.thread, {
        worldId: before.id,
        citizen: citizen.id,
      });
      assert.equal(entries.at(-2).identity, "Unexplained communication");
      pass(
        "The Feeling produces unidentified communication, not automatic creator recognition.",
      );
    }
    const snapshot = JSON.parse(JSON.stringify(entries));
    await page.screenshot({
      path: path.join(directory, "citizen-talk-saved.png"),
    });
    await page.reload();
    await open();
    await page
      .getByRole("region", { name: "Conversation history", exact: true })
      .count()
      .then(async (n) => {
        const h = n
          ? page.getByRole("region", {
              name: "Conversation history",
              exact: true,
            })
          : page.locator(".talk-history");
        await h
          .getByText("What did I tell you last time?", { exact: true })
          .last()
          .waitFor();
      });
    assert.deepEqual(
      await client.query(anyApi.citizenTalk.thread, {
        worldId: before.id,
        citizen: citizen.id,
      }),
      snapshot,
    );
    pass(
      "Full page refresh restores the persistent conversation and its timestamps/channel metadata.",
    );
    const after = await client.query(anyApi.genesis.current, {});
    assert.equal(after.state.tick, before.state.tick);
    assert.deepEqual(after.state.life.accounts, before.state.life.accounts);
    assert.deepEqual(after.state.trust, before.state.trust);
    assert.deepEqual(after.state.life.observer, before.state.life.observer);
    for (const c of before.state.citizens.filter((c) => c.id !== citizen.id))
      assert.deepEqual(
        after.state.citizens.find((d) => d.id === c.id),
        c,
      );
    assert.ok(
      after.state.citizens
        .find((c) => c.id === citizen.id)
        .memories.some((m) => m.includes("What are you doing?")),
    );
    assert.equal(errors.length, 0);
    pass(
      "Only Sage gains conversation memories; time, funds, trust, Observer awareness and other citizens stay unchanged.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .scrollIntoViewIfNeeded();
    const bounds = await page
      .getByRole("button", { name: "Send message", exact: true })
      .boundingBox();
    assert.ok(bounds.width >= 44 && bounds.height >= 44);
    await page.screenshot({
      path: path.join(directory, "citizen-talk-phone.png"),
    });
    pass("Phone-size dialog has a reachable touch-sized send control.");
    report.result = "PASS";
    report.messages = entries.length;
    report.browser = browser.version();
  } catch (e) {
    report.result = "FAIL";
    report.error = e.stack;
    console.error(e.stack);
    process.exitCode = 1;
    if (page)
      await page
        .screenshot({ path: path.join(directory, "citizen-talk-failure.png") })
        .catch(() => {});
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(
      path.join(
        directory,
        report.mode === "read-only"
          ? "citizen-talk-reload-report.json"
          : "citizen-talk-report.json",
      ),
      JSON.stringify(report, null, 2),
    );
  }
})();
