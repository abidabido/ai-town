const fs = require("fs"),
  os = require("os"),
  ts = require("typescript"),
  assert = require("assert/strict");
const dir = fs.mkdtempSync(os.tmpdir() + "/genesis-life-");
for (const name of ["genesis", "genesisEngine", "genesisLife","genesisProfiles"])
  fs.writeFileSync(
    dir + "/" + name + ".js",
    ts.transpileModule(fs.readFileSync("data/" + name + ".ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
  );
const { initialState } = require(dir + "/genesisEngine.js");
const {
  upgradeLiving,
  advanceLiving,
  totalMoney,
  fundBuilding,
  scenario,
  calendar,
} = require(dir + "/genesisLife.js");
const old = initialState();
old.tick = 115;
old.trust["0:1"] = 31;
old.citizens[0].memories = ["Existing experience"];
const original = JSON.stringify(old),
  up = upgradeLiving(old);
assert.equal(up.tick, 115);
assert.equal(up.trust["0:1"], 31);
assert.deepEqual(up.citizens[0].memories, ["Existing experience"]);
assert.equal(JSON.stringify(old), original);
assert.deepEqual(upgradeLiving(up), up);
assert.equal(totalMoney(up), 320000);
let a = up,
  b = upgradeLiving(old);
const audit = { ...a.life.accounts };
let txCount = 0,
  chatCount = 0,
  workCount = 0;
for (let i = 0; i < 600; i++) {
  const r = advanceLiving(a);
  a = r.state;
  b = advanceLiving(b).state;
  assert.equal(a.tick, 116 + i);
  assert.equal(totalMoney(a), 320000);
  for (const t of r.transactions) {
    assert.ok(Number.isSafeInteger(t.amount) && t.amount > 0);
    assert.ok(r.events.some((e) => e.actionId === t.actionId));
    assert.ok(audit[t.from] >= t.amount);
    audit[t.from] -= t.amount;
    audit[t.to] += t.amount;
    txCount++;
  }
  assert.deepEqual(audit, a.life.accounts);
  for (const p of Object.values(a.life.people)) {
    for (const k of [
      "hunger",
      "fatigue",
      "health",
      "stress",
      "happiness",
      "loneliness",
    ])
      assert.ok(p[k] >= 0 && p[k] <= 100, k);
    assert.ok(p.health >= 25);
    assert.equal(
      Object.values(p.beliefs).reduce((x, y) => x + y, 0),
      100,
    );
  }
  for (const m of r.messages) {
    assert.equal(m.source, "rule-template");
    assert.ok(
      r.events.some(
        (e) => e.actionId === m.actionId && e.kind === "Conversation",
      ),
    );
    assert.notEqual(m.speaker, m.recipient);
    chatCount++;
  }
  workCount += r.events.filter((e) => e.kind === "Work").length;
  assert.ok(a.citizens.every((c) => c.memories.length <= 60));
}
assert.deepEqual(a, b);
assert.ok(txCount > 100);
assert.ok(chatCount > 0);
assert.ok(workCount > 100);
assert.equal(JSON.stringify(old), original);
const funded = fundBuilding(up, "hospital", 18, 38);
assert.ok(!funded.error);
assert.equal(funded.state.life.accounts.treasury, 80000);
assert.equal(funded.state.life.accounts.cooperative, 120000);
assert.equal(funded.state.life.materials, 90);
assert.equal(totalMoney(funded.state), 320000);
assert.ok(fundBuilding(up, "hospital", -1, 10).error);
assert.ok(fundBuilding(funded.state, "house", 18, 38).error);
let buildingState = funded.state;
for (let i = 0; i < 100; i++)
  buildingState = advanceLiving(buildingState).state;
assert.equal(
  buildingState.life.buildings.find((x) => x.type === "hospital").progress,
  100,
);
const poor = upgradeLiving(old);
for (const k of Object.keys(poor.life.accounts)) poor.life.accounts[k] = 0;
poor.life.issued = 0;
poor.supplies = 0;
for (const p of Object.values(poor.life.people)) {
  p.hunger = 100;
  p.health = 25;
}
let safe = poor;
for (let i = 0; i < 24; i++) safe = advanceLiving(safe).state;
assert.equal(totalMoney(safe), 0);
assert.ok(Object.values(safe.life.people).every((p) => p.health >= 25));
const light = scenario(up, "light");
assert.equal(light.state.life.people[0].stress - up.life.people[0].stress, 8);
assert.equal(light.state.life.people[5].stress - up.life.people[5].stress, 2);
assert.equal(
  scenario(up, "shortage").state.supplies,
  Math.floor(up.supplies / 4),
);
assert.equal(calendar(1440).year, 2);
console.log(
  "PASS: additive migration, reproducibility, 600 living steps, ledger reconstruction, money conservation, linked chat/actions, needs bounds, bankruptcy safety, construction funding/completion, personality reactions and calendar. " +
    txCount +
    " audited transfers; " +
    chatCount +
    " messages.",
);
