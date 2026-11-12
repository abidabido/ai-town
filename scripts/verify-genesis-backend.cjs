const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert/strict");
const root = fs.mkdtempSync(os.tmpdir() + "/genesis-backend-");
fs.symlinkSync(
  path.join(process.cwd(), "node_modules"),
  path.join(root, "node_modules"),
  "dir",
);
for (const file of [
  "data/genesis",
  "data/genesisEngine",
  "data/genesisCommands",
  "data/genesisLife",
  "data/genesisProfiles",
  "data/genesisFamilies",
  "data/genesisMemory",
  "convex/genesis",
]) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(
    path.join(root, file + ".js"),
    ts.transpileModule(fs.readFileSync(file + ".ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
  );
}
fs.mkdirSync(path.join(root, "convex/_generated"), { recursive: true });
fs.writeFileSync(
  path.join(root, "convex/_generated/server.js"),
  "exports.query=x=>x;exports.mutation=x=>x;",
);
const api = require(path.join(root, "convex/genesis.js"));
const { initialState } = require(path.join(root, "data/genesisEngine.js"));
let sequence = 0;
const rows = new Map();
const copy = (v) => JSON.parse(JSON.stringify(v));
const db = {
  query(table) {
    const filters = [];
    let descending = false;
    const list = () =>
      [...rows.values()]
        .filter(
          (r) =>
            r.table === table &&
            filters.every(([key, value]) => r.doc[key] === value),
        )
        .sort(
          (a, b) =>
            (descending ? -1 : 1) * (a.doc._creationTime - b.doc._creationTime),
        )
        .map((r) => copy(r.doc));
    const q = {
      withIndex(name, fn) {
        const builder = {
          eq(key, value) {
            filters.push([key, value]);
            return builder;
          },
        };
        if (fn) fn(builder);
        return q;
      },
      order(direction) {
        descending = direction === "desc";
        return q;
      },
      async take(n) {
        return list().slice(0, n);
      },
      async unique() {
        const all = list();
        if (all.length > 1) throw Error("Duplicate unique record");
        return all[0] || null;
      },
    };
    return q;
  },
  async insert(table, doc) {
    const id = table + ":" + ++sequence;
    rows.set(id, {
      table,
      doc: { ...copy(doc), _id: id, _creationTime: sequence },
    });
    return id;
  },
  async patch(id, patch) {
    const r = rows.get(id);
    if (!r) throw Error("Missing row");
    Object.assign(r.doc, copy(patch));
  },
  async get(id) {
    return rows.has(id) ? copy(rows.get(id).doc) : null;
  },
};
const ctx = { db };
const call = (name, args = {}) => api[name].handler(ctx, args);
const count = (t) => [...rows.values()].filter((r) => r.table === t).length;
(async () => {
  const original = initialState();
  original.tick = 115;
  original.trust["0:1"] = 31;
  original.citizens[0].memories = ["Existing memory"];
  await db.insert("genesisSessions", { key: "genesis-v1", state: original });
  await db.insert("genesisEvents", {
    tick: 100,
    kind: "Legacy",
    actors: [0],
    text: "Preserved event",
  });
  await call("begin");
  let current = await call("current");
  assert.equal(current.state.tick, 115);
  assert.equal(current.state.trust["0:1"], 31);
  assert.equal(current.migrated, true);
  assert.equal(count("genesisCheckpoints"), 1);
  assert.equal(count("genesisTransactions"), 14);
  await call("begin");
  assert.equal(count("genesisTransactions"), 14);
  const args = {
    text: "Build a hospital",
    expectedTick: current.state.tick,
    expectedRevision: current.revision,
  };
  const pending = await call("command", args);
  assert.equal(pending.pending, true);
  assert.equal(count("genesisTransactions"), 14);
  const built = await call("command", { ...args, confirmed: true });
  assert.equal(built.ok, true);
  current = await call("current");
  assert.equal(current.state.life.accounts.treasury, 80000);
  assert.equal(current.state.life.buildings.length, 7);
  const beforeBad = count("genesisEvents");
  assert.equal(
    (await call("command", { ...args, text: "Mara go to gardens" })).ok,
    false,
  );
  assert.equal(count("genesisEvents"), beforeBad);
  await assert.rejects(
    () =>
      call("advance", {
        expectedTick: current.state.tick,
        expectedRevision: current.revision,
        steps: 1,
        automatic: true,
      }),
    /paused/,
  );
  await assert.rejects(
    () =>
      call("advance", {
        expectedTick: current.state.tick,
        expectedRevision: current.revision,
        steps: 41,
      }),
    /between 1 and 40/,
  );
  const save = await call("checkpoint", { label: "Before test advance" });
  const stepped = await call("advance", {
    expectedTick: current.state.tick,
    expectedRevision: current.revision,
    steps: 4,
  });
  assert.equal(stepped.tick, 119);
  assert.ok(count("genesisChat") > 0);
  assert.ok((await call("ledger", {})).length > 14);
  current = await call("current");
  const savedMemory = current.state.life.memory;
  assert.ok(savedMemory);
  for (const [id, entries] of Object.entries(savedMemory.diaries)) {
    assert.ok(entries.length > 0);
    for (const entry of entries) {
      assert.ok(entry.participants.includes(Number(id)));
      assert.ok(
        (await call("history", {})).some((e) => e.actionId === entry.actionId),
      );
    }
  }
  assert.deepEqual((await call("current")).state.life.memory, savedMemory);
  const eventCount = count("genesisEvents");
  const unknown = await call("command", {
    text: "erase everything",
    expectedTick: current.state.tick,
    expectedRevision: current.revision,
  });
  assert.equal(unknown.ok, false);
  assert.equal(count("genesisEvents"), eventCount);
  await assert.rejects(
    () => call("restore", { id: save, confirmed: false }),
    /confirmation/,
  );
  const restored = await call("restore", { id: save, confirmed: true });
  current = await call("current");
  assert.equal(restored.tick, 115);
  assert.equal(current.state.life.timeline, 1);
  assert.equal(current.state.life.accounts.treasury, 80000);
  assert.ok(count("genesisEvents") > eventCount);
  assert.equal((await call("history", {})).length, 1);
  assert.equal((await call("ledger", {})).length, 14);
  assert.ok(count("genesisCheckpoints") >= 3);
  await db.patch(current.id, { lastActive: Date.now() - 180001 });
  const caught = await call("catchUp", { expectedRevision: current.revision });
  assert.equal(caught.tick, 118);
  const noDouble = await call("catchUp", { expectedRevision: caught.revision });
  assert.equal(noDouble.tick, 118);
  assert.ok(noDouble.message.includes("No away time"));
  console.log(
    "PASS: backend handlers with isolated database double: idempotent migration, preserved legacy state, reviewed funding, stale-command guard, global pause, bounded advance, linked chat/ledger, unsupported command no-op, checkpoint confirmation/restore timelines, and non-duplicating catch-up.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
