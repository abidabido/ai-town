const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert/strict"),
  cp = require("child_process");
const root = fs.mkdtempSync(os.tmpdir() + "/genesis-friendly-");
function compile(target, baseline = false) {
  fs.mkdirSync(target, { recursive: true });
  for (const name of [
    "genesis",
    "genesisEngine",
    "genesisProfiles",
    "genesisFamilies",
    "genesisLife",
    "genesisFriendly",
  ]) {
    const source =
      baseline && name === "genesisLife"
        ? cp.execFileSync("git", ["show", "12c1315:data/genesisLife.ts"], {
            encoding: "utf8",
          })
        : fs.readFileSync("data/" + name + ".ts", "utf8");
    fs.writeFileSync(
      path.join(target, name + ".js"),
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
        },
      }).outputText,
    );
  }
}
compile(root + "/new");
compile(root + "/old", true);
const ui = require(root + "/new/genesisFriendly.js");
const e = {
  tick: 11,
  timeline: 0,
  actionId: "a",
  actors: [0, 1],
  source: "rule-engine",
  reason: "Shared interests",
  kind: "Conversation",
  text: "Mara and Dax discussed beliefs and community. Trust changed +4.",
  _creationTime: 200,
};
assert.equal(
  ui.readableEvent(e),
  "Mara and Dax talked about beliefs and community. They came away feeling a little closer.",
);
assert.match(
  ui.readableEvent({ ...e, text: e.text.replace("+4", "-5") }),
  /did not see eye to eye/,
);
assert.equal(
  ui.readableEvent({ kind: "Unknown", text: "No baby was born." }),
  "No baby was born.",
);
assert.equal(ui.relationshipLabel(-30), "A strained relationship");
assert.equal(ui.relationshipLabel(0), "No strong feelings yet");
assert.equal(ui.recapEvents([e], null, 11).length, 1);
assert.equal(ui.recapEvents([e], null, 12).length, 0);
assert.equal(ui.recapEvents([e], { tick: 11, seenAt: 200 }, 11).length, 0);
assert.equal(
  ui.recapEvents([{ ...e, _creationTime: 201 }], { tick: 11, seenAt: 200 }, 11)
    .length,
  1,
);
assert.equal(ui.recapEvents([], { tick: 11, seenAt: 200 }, 11).length, 0);
for (const [text, kind] of [
  ["What’s everyone doing?", "people"],
  ["Who’s dating?", "couples"],
  ["Has anyone had a baby?", "families"],
  ["Who’s fighting?", "rivals"],
  ["Show me Sage’s personality.", "citizen"],
  ["What happened today?", "today"],
  ["Create a new citizen.", "create"],
  ["Make it rain.", "weather-unavailable"],
  ["Who believes in the Observer?", "observer-beliefs"],
  ["Show me the latest gossip.", "talk"],
])
  assert.equal(ui.friendlyIntent(text).kind, kind, text);
assert.equal(ui.friendlyIntent("Show me Sage’s personality.").name, "sage");
assert.equal(ui.friendlyIntent("Advance one week.").text, "advance 7 days");
assert.equal(ui.friendlyIntent("Erase all citizens").kind, "forward");
const oldLife = require(root + "/old/genesisLife.js"),
  newLife = require(root + "/new/genesisLife.js"),
  initial = require(root + "/new/genesisEngine.js").initialState();
let oldState = oldLife.upgradeLiving(initial),
  newState = newLife.upgradeLiving(initial),
  different = 0;
for (let i = 0; i < 80; i++) {
  const a = oldLife.advanceLiving(oldState),
    b = newLife.advanceLiving(newState);
  assert.deepEqual(b.state, a.state);
  assert.deepEqual(b.events, a.events);
  assert.deepEqual(b.transactions, a.transactions);
  assert.deepEqual(
    b.messages.map(({ text, ...rest }) => rest),
    a.messages.map(({ text, ...rest }) => rest),
  );
  different += b.messages.filter(
    (m, j) => m.text !== a.messages[j].text,
  ).length;
  oldState = a.state;
  newState = b.state;
}
assert.ok(different > 0);
const ctx = {
  id: 1,
  tick: 7,
  traits: { Confidence: 10, Humor: 0 },
  faction: "Skeptics",
  food: false,
  civil: true,
  responding: false,
  trust: 0,
  hobby: "Gardening",
  sharedMemory: false,
};
assert.match(newLife.conversationLine(ctx), /I might be wrong/);
assert.notEqual(
  newLife.conversationLine(ctx),
  newLife.conversationLine({ ...ctx, traits: { Confidence: 90, Humor: 100 } }),
);
assert.match(
  newLife.conversationLine({
    ...ctx,
    responding: true,
    trust: 40,
    sharedMemory: true,
  }),
  /keep talking/,
);
assert.doesNotMatch(
  newLife.conversationLine({
    ...ctx,
    responding: true,
    trust: 40,
    sharedMemory: false,
  }),
  /keep talking/,
);
console.log(
  "PASS: truthful formatting, visit cursor, quiet/first-visit recaps, friendly commands, personality and memory-grounded dialogue. 80 baseline steps preserve state, events, balances and metadata; only spoken text changes.",
);
