const fs = require("fs"),
  os = require("os"),
  ts = require("typescript"),
  assert = require("assert/strict");
const dir = fs.mkdtempSync(os.tmpdir() + "/genesis-memory-");
fs.writeFileSync(
  dir + "/memory.cjs",
  ts.transpileModule(fs.readFileSync("data/genesisMemory.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
);
const { recordMemories } = require(dir + "/memory.cjs");
const state = {
  citizens: [{ id: 0 }, { id: 1 }, { id: 2 }],
  life: {
    timeline: 1,
    people: {
      0: { curiosity: 80, empathy: 20 },
      1: { curiosity: 20, empathy: 80 },
      2: { curiosity: 20, empathy: 20 },
    },
  },
};
const event = {
  actionId: "social:1:4",
  timeline: 1,
  tick: 4,
  kind: "Conversation",
  actors: [0, 1],
  text: "A and B discussed gardening.",
  reason: "Shared hobby and social need",
  source: "rule-engine",
};
const original = JSON.stringify(event);
recordMemories(state, [event]);
assert.equal(state.life.memory.diaries[0].length, 1);
assert.equal(state.life.memory.diaries[1].length, 1);
assert.equal(state.life.memory.diaries[2], undefined);
assert.notEqual(
  state.life.memory.diaries[0][0].perspective,
  state.life.memory.diaries[1][0].perspective,
);
assert.equal(state.life.memory.diaries[0][0].actionId, event.actionId);
assert.equal(JSON.stringify(event), original);
recordMemories(state, [event, event]);
assert.equal(state.life.memory.diaries[0].length, 1);
for (const source of [
  "user-command",
  "administrator",
  "untrusted",
  "rule-template",
])
  recordMemories(state, [{ ...event, actionId: source, source }]);
recordMemories(state, [
  { ...event, actionId: "global", actors: [] },
  { ...event, actionId: "wrong-branch", timeline: 2 },
  { ...event, actionId: "missing-person", actors: [99] },
]);
assert.equal(state.life.memory.diaries[0].length, 1);
recordMemories(state, [
  { ...event, actionId: "family", source: "family-rule-engine" },
]);
assert.equal(state.life.memory.diaries[0].length, 2);
for (let n = 0; n < 300; n++)
  recordMemories(state, [{ ...event, actionId: "next:" + n, tick: 5 + n }]);
assert.equal(state.life.memory.diaries[0].length, 240);
assert.deepEqual(
  JSON.parse(JSON.stringify(state)).life.memory,
  state.life.memory,
);
const branch = JSON.parse(JSON.stringify(state));
branch.life.timeline = 2;
recordMemories(branch, [{ ...event, timeline: 2 }]);
assert.equal(branch.life.memory.diaries[0].at(-1).timeline, 2);
assert.notDeepEqual(branch.life.memory, state.life.memory);
console.log(
  "PASS: actor-only provenance, no owner/global knowledge leak, source whitelist, same-action idempotence, trait-based prompts, immutable events, bounded retention, persistence and isolated restored timeline.",
);
