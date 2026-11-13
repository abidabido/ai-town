const assert = require("node:assert/strict"),
  fs = require("fs"),
  os = require("os"),
  path = require("path"),
  cp = require("child_process"),
  vm = require("vm"),
  ts = require("typescript");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-talk-"));
(async () => {
  try {
    cp.execFileSync(
      "./node_modules/.bin/tsc",
      [
        "data/genesisTalk.ts",
        "--outDir",
        tmp,
        "--module",
        "commonjs",
        "--target",
        "es2021",
        "--skipLibCheck",
      ],
      { stdio: "pipe" },
    );
    const { talkExchange } = require(path.join(tmp, "genesisTalk.js")),
      { upgradeLiving, observerPresence } = require(
        path.join(tmp, "genesisLife.js"),
      ),
      { initialState } = require(path.join(tmp, "genesisEngine.js"));
    let s = upgradeLiving(initialState()),
      c = s.citizens[0],
      other = s.citizens[1];
    s.tick = 1;
    s.life.observer = observerPresence(s);
    s.life.people[c.id].activity = "Reading a notebook";
    const request = {
        citizen: c.id,
        channel: "Messages",
        message: "What are you doing?",
        identify: false,
      },
      before = JSON.stringify(s);
    const one = talkExchange(s, request, [], "first", 10000);
    assert.equal(JSON.stringify(s), before);
    assert.equal(one.entries.length, 2);
    assert.ok(one.entries[1].body.includes("reading a notebook"));
    assert.equal(one.entries[0].identity, "Unknown correspondent");
    assert.deepEqual(
      one.state.citizens.find((x) => x.id === other.id),
      other,
    );
    assert.ok(
      one.state.citizens[0].memories.at(-1).includes("received message"),
    );
    const two = talkExchange(
      one.state,
      { ...request, message: "What did I tell you last time?" },
      one.entries,
      "second",
      13000,
    );
    assert.ok(two.entries[1].body.includes(request.message));
    assert.ok(two.entries[1].facts.includes("message:first-player"));
    assert.throws(() =>
      talkExchange(s, { ...request, citizen: 999 }, [], "bad", 10000),
    );
    assert.throws(() =>
      talkExchange(s, { ...request, message: "" }, [], "bad", 10000),
    );
    assert.throws(() =>
      talkExchange(
        s,
        { ...request, message: "x".repeat(1001) },
        [],
        "bad",
        10000,
      ),
    );
    const invisible = structuredClone(s);
    invisible.life.observer.mode = "Invisible";
    assert.throws(() =>
      talkExchange(
        invisible,
        { ...request, channel: "Observer Communication" },
        [],
        "bad",
        10000,
      ),
    );
    assert.throws(() =>
      talkExchange(
        invisible,
        { ...request, channel: "Face-to-Face" },
        [],
        "bad",
        10000,
      ),
    );
    assert.equal(
      talkExchange(invisible, request, [], "private", 10000).entries[0]
        .identity,
      "Unknown correspondent",
    );
    assert.equal(
      talkExchange(
        s,
        { ...request, channel: "Observer Communication" },
        [],
        "feeling",
        10000,
      ).entries[0].identity,
      "Unexplained communication",
    );
    assert.equal(
      talkExchange(s, { ...request, identify: true }, [], "identify", 10000)
        .entries[0].identity,
      "Abby (self-identified)",
    );
    assert.equal(s.life.observer.awareness[c.id]?.claimReceived, undefined);
    const near = structuredClone(s);
    near.life.observer = {
      ...near.life.observer,
      mode: "The Visitor",
      active: true,
      x: 5,
      y: 5,
    };
    near.citizens[0].x = 5;
    near.citizens[0].y = 5;
    near.life.people[c.id].activity = "Walking";
    near.life.people[c.id].fatigue = 10;
    near.life.people[c.id].health = 100;
    assert.equal(
      talkExchange(
        near,
        { ...request, channel: "Face-to-Face" },
        [],
        "near",
        10000,
      ).entries[0].identity,
      "The Visitor",
    );
    near.life.observer.x = 90;
    assert.throws(() =>
      talkExchange(
        near,
        { ...request, channel: "Face-to-Face" },
        [],
        "far",
        10000,
      ),
    );
    const high = structuredClone(s),
      low = structuredClone(s);
    high.life.people[c.id].profile.traits.Skepticism = 90;
    low.life.people[c.id].profile.traits.Skepticism = 10;
    assert.notEqual(
      talkExchange(
        high,
        { ...request, message: "I am your creator" },
        [],
        "h",
        1,
      ).entries[1].body,
      talkExchange(
        low,
        { ...request, message: "I am your creator" },
        [],
        "l",
        1,
      ).entries[1].body,
    );
    const code = ts.transpileModule(
      fs.readFileSync("convex/citizenTalk.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2021,
        },
      },
    ).outputText;
    const mod = { exports: {} },
      v = new Proxy({}, { get: () => () => ({}) });
    vm.runInNewContext(code, {
      exports: mod.exports,
      module: mod,
      Date,
      require: (n) =>
        n === "convex/values"
          ? { v }
          : n === "./_generated/server"
            ? { query: (x) => x, mutation: (x) => x }
            : n.includes("genesisTalk")
              ? { talkExchange }
              : n.includes("genesisLife")
                ? { upgradeLiving }
                : require(n),
    });
    let row = null;
    const world = { _id: "world", key: "genesis-v1", state: s, revision: 2 },
      events = [];
    const ctx = {
      db: {
        get: async (id) => (id === "world" ? world : null),
        query: () => ({ withIndex: () => ({ unique: async () => row }) }),
        insert: async (t, x) => {
          if (t === "genesisCitizenTalks")
            row = JSON.parse(JSON.stringify({ ...x, _id: "thread" }));
          else events.push(x);
          return "thread";
        },
        patch: async (id, x) => {
          Object.assign(
            id === "world" ? world : row,
            JSON.parse(JSON.stringify(x)),
          );
        },
      },
    };
    const args = { worldId: "world", ...request, requestId: "request-one" };
    assert.equal((await mod.exports.send.handler(ctx, args)).ok, true);
    assert.equal(world.revision, 3);
    assert.equal((await mod.exports.send.handler(ctx, args)).ok, true);
    assert.equal(world.revision, 3);
    assert.equal(row.entries.length, 2);
    assert.equal(events.length, 1);
    row = JSON.parse(JSON.stringify(row));
    assert.equal(
      (
        await mod.exports.thread.handler(ctx, {
          worldId: "world",
          citizen: c.id,
        })
      ).length,
      2,
    );
    assert.equal(
      (
        await mod.exports.thread.handler(ctx, {
          worldId: "world",
          citizen: 999,
        })
      ).length,
      0,
    );
    assert.equal(
      (await mod.exports.send.handler(ctx, { ...args, requestId: "new-fast" }))
        .ok,
      false,
    );
    const named = talkExchange(
      s,
      { ...request, identify: true },
      [],
      "named",
      10000,
    );
    assert.equal(
      talkExchange(named.state, request, named.entries, "later", 13000)
        .entries[0].identity,
      "Abby (self-identified)",
    );
    assert.equal(
      (
        await mod.exports.send.handler(ctx, {
          ...args,
          message: "different payload",
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await mod.exports.thread.handler(ctx, {
          worldId: "world",
          citizen: other.id,
        })
      ).length,
      0,
    );
    console.log(
      "PASS: grounded context, prior-message recall, actor-only memory, invisible/feeling/identity rules, real proximity checks, trait variation, validation, backend persistence, deduplication and rate limit.",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
