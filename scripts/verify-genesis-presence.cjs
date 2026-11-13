const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert/strict");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-presence-"));
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
  life = require(root + "/genesisLife.js"),
  { recordMemories } = require(root + "/genesisMemory.js");
const copy = (x) => JSON.parse(JSON.stringify(x));
function fixture() {
  const s = life.upgradeLiving(initialState());
  s.tick = 1;
  s.life.weather = "Clear";
  for (const c of s.citizens) {
    c.x = 96;
    c.y = 96;
    const p = s.life.people[c.id];
    Object.assign(p, {
      activity: "Free time",
      fatigue: 10,
      health: 90,
      stress: 10,
      curiosity: 90,
    });
  }
  s.citizens[0].x = 48;
  s.citizens[0].y = 56;
  return s;
}
const fresh = fixture();
assert.equal(life.observerPresence(fresh).mode, "The Feeling");
assert.equal(life.observerPresence(fresh).active, false);
let entered;
for (let seed = 1; seed <= 1000; seed++) {
  const s = fixture();
  s.seed = seed;
  const before = copy(s),
    out = life.applyObserverPresence(s, { action: "enter" });
  assert.deepEqual(s, before);
  if (out.events.some((e) => e.kind === "ObserverNotice")) {
    entered = out;
    break;
  }
}
assert.ok(entered, "A nearby eligible citizen can notice a sensory event");
assert.deepEqual(
  entered.events
    .filter((e) => e.kind === "ObserverNotice")
    .flatMap((e) => e.actors),
  [0],
);
assert.equal(entered.state.life.observer.awareness[1], undefined);
assert.ok(
  !entered.events
    .filter((e) => e.actors.includes(0))
    .some((e) => /Abby|creator/i.test(e.text)),
  "Feeling does not disclose identity",
);
assert.equal(life.totalMoney(entered.state), life.totalMoney(fresh));
assert.equal(entered.state.supplies, fresh.supplies);
const repeat = life.applyObserverPresence(entered.state, { action: "notice" });
assert.equal(
  repeat.events.length,
  0,
  "No repeated pulse in the same simulated time",
);
const moved = life.applyObserverPresence(entered.state, {
  action: "move",
  x: 50,
  y: 56,
});
assert.equal(
  moved.events.filter((e) => e.kind === "ObserverNotice").length,
  0,
  "Movement cannot bypass tick deduplication",
);
const quiet = copy(entered.state);
quiet.tick++;
const quietOut = life.applyObserverPresence(quiet, { action: "notice" });
assert.equal(
  quietOut.events.filter(
    (e) => e.actors.includes(0) && e.kind === "ObserverNotice",
  ).length,
  0,
  "Witness cooldown holds",
);
let invisible = life.applyObserverPresence(entered.state, {
  action: "configure",
  mode: "Invisible",
}).state;
invisible.tick += 4;
const beforeMemory = copy(invisible.life.observer.awareness);
const hidden = life.applyObserverPresence(invisible, { action: "notice" });
assert.equal(hidden.events.length, 0);
assert.deepEqual(hidden.state.life.observer.awareness, beforeMemory);
assert.equal(life.observerDetectionChance(hidden.state, 0), 0);
const asleep = copy(entered.state);
asleep.life.people[0].activity = "Sleeping";
assert.equal(life.observerDetectionChance(asleep, 0), 0);
asleep.life.people[0].activity = "Free time";
asleep.tick = 4;
assert.equal(life.observerDetectionChance(asleep, 0), 0);
const different = fixture();
different.life.people[0].profile.traits.Skepticism = 95;
const skeptic = life.observerReaction(different, 0, "The Feeling");
different.life.people[0].profile.traits.Skepticism = 10;
const curious = life.observerReaction(different, 0, "The Feeling");
assert.notEqual(skeptic.interpretation, curious.interpretation);
different.life.people[0].stress = 90;
assert.notEqual(
  life.observerReaction(different, 0, "The Feeling").interpretation,
  curious.interpretation,
);
const visitor = copy(entered.state);
visitor.life.observer.mode = "The Visitor";
visitor.life.observer.x = 40;
visitor.life.observer.y = 51;
visitor.citizens[0].x = 56;
visitor.citizens[0].y = 51;
assert.equal(
  life.observerDetectionChance(visitor, 0),
  0,
  "Council building obstructs line of sight",
);
visitor.citizens[0].x = 40;
visitor.citizens[0].y = 54;
assert.ok(life.observerDetectionChance(visitor, 0) > 0);
const creator = life.applyObserverPresence(fixture(), {
  action: "configure",
  mode: "The Creator",
}).state;
const reveal = life.applyObserverPresence(creator, {
  action: "reveal",
  citizen: 1,
});
assert.equal(reveal.events.filter((e) => e.kind === "ObserverClaim").length, 1);
assert.equal(reveal.state.life.observer.awareness[1].claimReceived, true);
assert.equal(reveal.state.life.observer.awareness[0], undefined);
assert.equal(
  reveal.state.life.observer.awareness[1].confidence,
  0,
  "Claim does not force belief",
);
assert.throws(
  () => life.applyObserverPresence(creator, { action: "reveal" }),
  /Confirm/,
);
const broadcast = life.applyObserverPresence(fixture(), {
  action: "configure",
  mode: "The Announcement",
}).state;
assert.throws(
  () =>
    life.applyObserverPresence(broadcast, {
      action: "announce",
      message: "A visitor has arrived.",
    }),
  /Confirm/,
);
const announcement = life.applyObserverPresence(broadcast, {
  action: "announce",
  message: "A visitor has arrived.",
  confirmed: true,
});
assert.equal(
  announcement.events.filter((e) => e.kind === "ObserverAnnouncement").length,
  broadcast.citizens.length,
);
assert.ok(
  Object.values(announcement.state.life.observer.awareness).every(
    (a) => !a.claimReceived && a.confidence === 0,
  ),
);
recordMemories(entered.state, entered.events);
assert.ok(
  entered.state.life.memory.diaries[0].some((m) => m.kind === "ObserverNotice"),
);
assert.ok(
  !entered.state.life.memory.diaries[1]?.some(
    (m) => m.kind === "ObserverNotice",
  ),
);
recordMemories(reveal.state, reveal.events);
assert.ok(
  reveal.state.life.memory.diaries[1].some((m) => m.kind === "ObserverClaim"),
);
assert.ok(
  !reveal.state.life.memory.diaries[0]?.some((m) => m.kind === "ObserverClaim"),
);
const restored = life.upgradeLiving(copy(entered.state));
assert.deepEqual(restored.life.observer, entered.state.life.observer);
const departed = life.applyObserverPresence(restored, { action: "leave" });
assert.equal(departed.state.life.observer.active, false);
assert.deepEqual(
  departed.state.life.observer.awareness,
  restored.life.observer.awareness,
);
assert.ok(restored.life.observer.active, "Checkpoint original preserved");
for (const req of [
  { action: "configure", mode: "X" },
  { action: "configure", sensitivity: 101 },
  { action: "configure", color: "red" },
  { action: "move", x: NaN, y: 50 },
  { action: "move", x: 0, y: 50 },
  { action: "reveal", citizen: 999 },
  { action: "unsupported" },
])
  assert.throws(() => life.applyObserverPresence(fresh, req));
const historical = copy(entered.state.life.observer.encounters);
let advanced = entered.state;
for (let i = 0; i < 8; i++) advanced = life.advanceLiving(advanced).state;
assert.deepEqual(
  advanced.life.observer.encounters.slice(0, historical.length),
  historical,
  "Earlier encounters are immutable",
);
assert.equal(life.totalMoney(advanced), life.totalMoney(entered.state));
console.log(
  "PASS: default, invisible, distance, awake/attention, traits, obstruction, cooldown/deduplication, selective claims, noticeboard broadcast, private memories, persistence, validation, conservation and immutable history",
);

assert.throws(
  () => life.applyObserverPresence(fresh, { action: "move", x: 48, y: 51 }),
  /crosses a building/,
);

const attention = copy(entered.state);
attention.life.people[0].activity = "Free time";
attention.life.people[0].stress = 0;
const relaxedChance = life.observerDetectionChance(attention, 0);
attention.life.people[0].activity = "Working";
assert.ok(life.observerDetectionChance(attention, 0) < relaxedChance);
attention.life.people[0].activity = "Free time";
attention.life.weather = "Rain";
assert.ok(life.observerDetectionChance(attention, 0) < relaxedChance);
attention.life.observer.sensitivity = 0;
assert.equal(life.observerDetectionChance(attention, 0), 0);

let newAreaNoticed = false;
for (let seed = 1; seed < 1000 && !newAreaNoticed; seed++) {
  const s = fixture();
  s.seed = seed;
  const first = life.applyObserverPresence(s, { action: "enter" });
  first.state.citizens[1].x = 79;
  first.state.citizens[1].y = 86;
  const later = life.applyObserverPresence(first.state, {
    action: "land",
    x: 77,
    y: 86,
  });
  newAreaNoticed = later.events.some(
    (e) => e.kind === "ObserverNotice" && e.actors.includes(1),
  );
}
assert.ok(
  newAreaNoticed,
  "A newly nearby citizen can notice after moving to another area in the same time step",
);
