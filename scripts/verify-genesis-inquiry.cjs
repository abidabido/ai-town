const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert/strict");
const root = fs.mkdtempSync(os.tmpdir() + "/genesis-inquiry-");
for (const name of [
  "genesis",
  "genesisEngine",
  "genesisProfiles",
  "genesisFamilies",
  "genesisLife",
  "genesisMemory",
])
  fs.writeFileSync(
    path.join(root, name + ".js"),
    ts.transpileModule(fs.readFileSync("data/" + name + ".ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
  );
const { initialState } = require(root + "/genesisEngine.js"),
  {
    upgradeLiving,
    advanceLiving,
    cropYield,
    evaluateInquiryTrials,
    totalMoney,
  } = require(root + "/genesisLife.js"),
  { recordMemories } = require(root + "/genesisMemory.js");
const copy = (x) => JSON.parse(JSON.stringify(x));
for (const weather of ["Clear", "Rain", "Overcast"])
  for (let farms = 0; farms < 5; farms++)
    for (const shortage of [true, false])
      for (const skill of [0, 100])
        assert.equal(
          cropYield(weather, farms, shortage, skill),
          shortage ? 2 : (weather === "Rain" ? 10 : 8) + 2 * farms,
        );
assert.throws(() => cropYield("impossible", 0, false));
assert.throws(() => cropYield("Clear", -1, false));
let state = upgradeLiving(initialState());
state.supplies = 500;
for (const p of Object.values(state.life.people)) {
  p.curiosity = 90;
  p.profile.traits.Curiosity = 90;
  p.profile.traits["Romance interest"] = 0;
}
const original = copy(state),
  all = [],
  messages = [];
let planned, tested, testOut, control;
for (let n = 0; n < 120; n++) {
  const before = copy(state),
    out = advanceLiving(state);
  assert.deepEqual(state, before);
  all.push(...out.events);
  messages.push(...out.messages);
  recordMemories(out.state, out.events);
  state = out.state;
  assert.equal(totalMoney(state), original.life.issued);
  if (!planned && state.life.inquiry?.projects[0]?.stage === "planned")
    planned = copy(state);
  if (!tested && out.events.some((e) => e.kind === "ResearchTest")) {
    tested = copy(state);
    testOut = out;
    control = advanceLiving(before, { inquiry: false });
  }
  if (state.life.inquiry?.projects[0]?.stage === "concluded") break;
}
const project = state.life.inquiry?.projects[0];
assert.ok(project, "curiosity should create a pilot question under this seed");
assert.equal(project.stage, "concluded");
assert.ok(planned && tested);
assert.equal(state.life.inquiry.projects.length, 1);
assert.equal(project.trials.length, 4);
assert.equal(project.result.weatherEffect, 2);
assert.equal(project.result.skillEffect, 0);
assert.equal(Object.keys(project.confidence).length, 2);
assert.ok(project.confidence[project.owner].weather > 0.55);
assert.ok(project.confidence[project.peer].skill < 0.55);
assert.deepEqual(
  state.citizens.map((c) => c.id),
  original.citizens.map((c) => c.id),
);
assert.equal(testOut.state.life.materials, control.state.life.materials - 2);
assert.equal(
  testOut.state.supplies,
  control.state.supplies,
  "virtual tests must not create food",
);
for (const kind of [
  "ResearchQuestion",
  "ResearchDiscussion",
  "ResearchPlan",
  "ResearchTest",
  "ResearchFinding",
])
  assert.equal(all.filter((e) => e.kind === kind).length, 1, kind);
for (const o of project.observations)
  assert.ok(
    all.some(
      (e) =>
        e.actionId === o.id &&
        e.kind === "Work" &&
        e.actors.includes(project.owner),
    ),
  );
for (const note of project.notebook)
  assert.ok(all.some((e) => e.actionId === note.actionId));
assert.ok(messages.some((m) => m.actionId === project.discussionAction));
assert.ok(messages.some((m) => m.actionId === project.findingAction));
for (const id of [project.owner, project.peer])
  assert.ok(
    state.life.memory.diaries[id].some(
      (m) => m.actionId === project.findingAction,
    ),
  );
for (const [id, entries] of Object.entries(state.life.memory.diaries))
  for (const e of entries.filter((e) => e.source === "research-rule-engine"))
    assert.ok(e.participants.includes(Number(id)));
const blocked = copy(planned);
blocked.tick = 4 * Math.floor(blocked.tick / 4) + 6;
blocked.life.materials = 0;
const noMaterials = advanceLiving(blocked);
assert.ok(!noMaterials.events.some((e) => e.kind === "ResearchTest"));
assert.equal(noMaterials.state.life.materials, 0);
const hungry = copy(planned);
hungry.tick = 4 * Math.floor(hungry.tick / 4) + 6;
hungry.life.people[project.owner].hunger = 90;
const foodFirst = advanceLiving(hungry);
assert.ok(!foodFirst.events.some((e) => e.kind === "ResearchTest"));
assert.ok(
  foodFirst.events.some(
    (e) => e.kind === "Food" && e.actors.includes(project.owner),
  ),
);
const noEffect = project.trials.map((t) => ({ ...t, yield: 8 }));
assert.equal(evaluateInquiryTrials(noEffect).weatherConfidence, 0.1);
assert.equal(evaluateInquiryTrials(noEffect).skillConfidence, 0.1);
const skillOnly = project.trials.map((t) => ({
  ...t,
  yield: t.skill === 75 ? 10 : 8,
}));
assert.equal(evaluateInquiryTrials(skillOnly).weatherConfidence, 0.1);
assert.equal(evaluateInquiryTrials(skillOnly).skillConfidence, 0.9);
const both = project.trials.map((t) => ({
  ...t,
  yield: 8 + (t.weather === "Rain" ? 1 : 0) + (t.skill === 75 ? 1 : 0),
}));
assert.equal(evaluateInquiryTrials(both).weatherConfidence, 0.9);
assert.equal(evaluateInquiryTrials(both).skillConfidence, 0.9);
assert.throws(() => evaluateInquiryTrials(project.trials.slice(1)));
assert.throws(() =>
  evaluateInquiryTrials(
    project.trials.map((t) => ({ ...t, farms: t.skill === 25 ? 0 : 1 })),
  ),
);
const fork = copy(planned),
  frozen = copy(planned);
fork.life.timeline++;
for (
  let n = 0;
  n < 24 && fork.life.inquiry.projects[0].stage !== "concluded";
  n++
) {
  const out = advanceLiving(fork);
  Object.assign(fork, out.state);
}
assert.deepEqual(planned, frozen);
assert.equal(fork.life.inquiry.projects[0].stage, "concluded");
assert.deepEqual(copy(state).life.inquiry, state.life.inquiry);
console.log(
  "PASS: crop-rule parity; spontaneous question, competing explanation, resource-bounded model test, results and belief update; exact event/chat/diary links; actor-only knowledge; hunger/material gates; no food/money creation; result-driven conclusions; immutable inputs and checkpoint-copy isolation.",
);

assert.equal(project.beliefHistory.length, 4);
for (const h of project.beliefHistory)
  assert.ok(
    all.some((e) => e.actionId === h.actionId && e.actors.includes(h.actor)),
  );
