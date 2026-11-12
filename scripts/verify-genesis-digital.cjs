const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert/strict");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-digital-"));
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
  s.supplies = 2000;
  for (const c of s.citizens) {
    const p = s.life.people[c.id];
    Object.assign(p, {
      hunger: 0,
      fatigue: 10,
      health: 95,
      stress: 5,
      loneliness: 55,
    });
    p.profile.hobbies = ["Astronomy"];
    p.profile.traits.Sociability = 80;
    p.profile.traits.Confidence = 80;
    p.profile.traits["Romance interest"] = 0;
  }
  return life.configureDigital(s, { enabled: true }).state;
}
const original = life.upgradeLiving(initialState());
assert.equal(life.digitalLife(original).enabled, false);
const before = copy(original);
const installed = life.configureDigital(original, { enabled: true });
assert.deepEqual(original, before);
assert.ok(installed.state.life.digital.enabled);
assert.equal(
  Object.keys(installed.state.life.digital.profiles).length,
  original.citizens.length,
);
let s = fixture(),
  events = [];
const startMoney = life.totalMoney(s);
for (let i = 0; i < 140; i++) {
  const before = copy(s),
    out = life.advanceLiving(s);
  assert.deepEqual(s, before, "Advancing does not mutate prior state");
  recordMemories(out.state, out.events);
  events.push(...out.events);
  s = out.state;
}
const d = s.life.digital;
assert.ok(
  d.messages.some((m) => m.kind === "invite"),
  "Autonomous invitation exists",
);
assert.ok(
  d.messages.some((m) => m.kind === "reply"),
  "Another citizen independently replies",
);
assert.ok(
  events.some((e) => e.kind === "DigitalMeetup"),
  "A mutually accepted plan leads to attendance",
);
assert.ok(d.posts.length, "Real-event public post exists");
assert.ok(
  d.posts.some((p) => p.comments.length),
  "Another citizen responds to a public post",
);
assert.equal(
  life.totalMoney(s),
  startMoney,
  "Digital life does not mint or transfer money",
);
const byId = new Map(events.map((e) => [e.actionId, e]));
for (const post of d.posts) {
  const evidence = byId.get(post.evidence);
  assert.ok(evidence, "Original public-post source exists");
  assert.ok(
    evidence.actors.includes(post.author),
    "Author personally participated",
  );
  assert.ok(
    ["Work", "Hobby", "ResearchFinding", "ObserverNotice"].includes(
      evidence.kind,
    ),
  );
  assert.ok(!post.body.includes("secret-private-fixture"));
  for (const comment of post.comments) {
    assert.ok(byId.has(comment.id));
    assert.notEqual(comment.author, post.author);
  }
}
for (const message of d.messages) {
  assert.ok(byId.has(message.id));
  assert.ok(byId.get(message.id).actors.includes(message.from));
  const outsider = s.citizens.find(
    (c) => c.id !== message.from && c.id !== message.to,
  );
  assert.ok(
    !life.digitalView(s, outsider.id).messages.some((m) => m.id === message.id),
    "Unrelated citizen cannot read private thread",
  );
}
for (const [id, knowledge] of Object.entries(d.knowledge))
  for (const k of knowledge) {
    assert.equal(k.channel, "public");
    const source = byId.get(k.source);
    assert.ok(source && source.kind === "WhisperPost");
    assert.ok(!k.summary.includes("secret-private-fixture"));
  }
assert.ok(d.messages.length <= 120 && d.posts.length <= 40);
assert.ok(
  new Set(
    events
      .filter((e) => e.source === "digital-rule-engine")
      .map((e) => e.actionId),
  ).size === events.filter((e) => e.source === "digital-rule-engine").length,
  "No duplicate digital action IDs",
);
const restored = life.upgradeLiving(copy(s));
assert.deepEqual(
  restored.life.digital,
  d,
  "Texts, posts and meetings survive serialization and restart upgrade",
);
const fork = life.configureDigital(restored, { enabled: false });
assert.ok(restored.life.digital.enabled);
assert.ok(!fork.state.life.digital.enabled);
const disabled = life.emptyResult(copy(fork.state));
disabled.state.tick += 4;
life.digitalEvening(disabled, []);
assert.equal(disabled.events.length, 0);
const hungry = fixture();
hungry.tick = 3;
for (const p of Object.values(hungry.life.people)) p.hunger = 90;
const hungryOut = life.emptyResult(hungry);
assert.deepEqual(life.digitalEvening(hungryOut, []), []);
assert.equal(hungryOut.events.length, 0, "Hunger takes priority");
const reserve = fixture();
reserve.tick = 3;
const all = reserve.citizens.map((c) => c.id);
const reserveOut = life.emptyResult(reserve);
assert.deepEqual(life.digitalEvening(reserveOut, all), []);
assert.equal(
  reserveOut.events.length,
  0,
  "Existing research/other reservations take priority",
);
const privacy = fixture();
privacy.tick = 3;
privacy.life.memory = {
  version: 1,
  diaries: {
    0: [
      {
        id: "private",
        actionId: "private",
        timeline: privacy.life.timeline,
        tick: 2,
        kind: "DigitalRead",
        observation: "secret-private-fixture",
        reason: "private",
        source: "digital-rule-engine",
        participants: [0],
        perspective: "private",
        evidence: "participated",
      },
    ],
  },
};
const privacyOut = life.emptyResult(privacy);
life.digitalEvening(privacyOut, []);
assert.equal(
  privacy.life.digital.posts.length,
  0,
  "Private messages are not sources for public posts",
);
const blocked = copy(s);
for (const c of blocked.citizens)
  blocked.life.digital.profiles[c.id].blocked = blocked.citizens
    .filter((x) => x.id !== c.id)
    .map((x) => x.id);
blocked.tick = Math.floor(blocked.tick / 4) * 4 + 3;
for (const p of Object.values(blocked.life.people))
  Object.assign(p, { hunger: 0, fatigue: 10, health: 95, stress: 0 });
const count = blocked.life.digital.messages.length,
  blockedOut = life.emptyResult(blocked);
life.digitalEvening(blockedOut, []);
assert.equal(
  blockedOut.events.filter((e) =>
    [
      "DigitalMessage",
      "WhisperComment",
      "WhisperReaction",
      "DigitalMeetup",
    ].includes(e.kind),
  ).length,
  0,
);
assert.ok(life.digitalView(blocked, 0).posts.every((p) => p.author === 0));
assert.ok(
  life.digitalView(blocked, "observer").messages.length > 0,
  "Observer history retained despite citizen blocking",
);
const post = d.posts[0];
const hidden = life.configureDigital(s, { hidePost: post.id }).state;
assert.ok(
  !life.digitalView(hidden, "observer").posts.some((p) => p.id === post.id),
);
assert.ok(
  s.life.digital.posts.find((p) => p.id === post.id).hidden === false,
  "Moderation keeps prior checkpoint unchanged",
);
const child = fixture();
child.life.people[0].ageAtStart = 10;
assert.throws(
  () => life.configureDigital(child, { citizen: 0, phone: true }),
  /adults/,
);
assert.throws(
  () => life.configureDigital(s, { citizen: 0, block: 0 }),
  /another adult/,
);
assert.throws(
  () => life.configureDigital(s, { citizen: 999, phone: true }),
  /adults/,
);
assert.throws(() => life.digitalView(s, 999), /find/);
// A newly delivered text is not a read diary entry for the recipient.
let delivered;
for (let seed = 1; seed < 100 && !delivered; seed++) {
  const f = fixture();
  f.seed = seed;
  f.tick = 3;
  const result = life.emptyResult(f);
  life.digitalEvening(result, []);
  if (result.state.life.digital.messages.length) delivered = result;
}
assert.ok(delivered);
recordMemories(delivered.state, delivered.events);
const invitation = delivered.state.life.digital.messages.find(
  (m) => m.kind === "invite",
);
assert.ok(invitation);
assert.equal(invitation.readTick, undefined);
assert.ok(
  !delivered.state.life.memory.diaries[invitation.to]?.some(
    (e) => e.actionId === invitation.id,
  ),
  "Private content reaches diary when read, not from global knowledge",
);
const beforeRepeat = delivered.events.length;
assert.deepEqual(life.digitalEvening(delivered, []), []);
assert.equal(
  delivered.events.length,
  beforeRepeat,
  "Evening processing deduplicates",
);
console.log(
  "PASS: autonomous two-way texting, scheduled attendance, evidence-based WHISPER post/comment, public knowledge transfer, private selectors/read receipts, needs/reservations, blocking, moderation, adults-only pilot, restart/checkpoint isolation, bounded caches and conserved money",
);

for (const meetup of events.filter((e) => e.kind === "DigitalMeetup")) {
  const invitationId = meetup.reason.match(
    /Scheduled invitation ([^;]+);/,
  )?.[1];
  assert.ok(invitationId);
  assert.ok(
    events.some(
      (e) =>
        e.kind === "DigitalPlan" &&
        e.tick < meetup.tick &&
        e.reason.includes("invitation " + invitationId + ";") &&
        meetup.actors.every((id) => e.actors.includes(id)),
    ),
    "Attendees received the shared calendar update before the gathering",
  );
}
const offline = fixture();
offline.tick = 3;
offline.life.digital.enabled = false;
offline.life.digital.profiles[0].phone = false;
offline.life.digital.profiles[1].phone = false;
offline.life.digital.meetings = [
  {
    id: "fixture-plan",
    organizer: 0,
    guest: 1,
    topic: "astronomy",
    location: "observatory",
    start: 3,
    status: "accepted",
    source: "fixture-mutually-accepted-invitation",
  },
];
const offlineOut = life.emptyResult(offline);
life.digitalEvening(offlineOut, []);
assert.ok(
  offlineOut.events.some((e) => e.kind === "DigitalMeetup"),
  "Turning phones off does not erase an already agreed offline meeting",
);
assert.ok(!offlineOut.events.some((e) => e.kind === "DigitalMessage"));
