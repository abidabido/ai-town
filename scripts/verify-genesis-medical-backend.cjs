const assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm"),
  ts = require("typescript");
const moduleExports = {};
const compiled = ts.transpileModule(
  fs.readFileSync("convex/medical.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
    },
  },
).outputText;
const wrap = (x) => x;
const values = new Proxy({}, { get: () => () => ({}) });
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require: (id) =>
    id.includes("_generated/server")
      ? { action: wrap, query: wrap, internalMutation: wrap }
      : id.includes("_generated/api")
        ? {
            api: { genesis: { current: "current" } },
            internal: { medical: { reserve: "reserve", finish: "finish" } },
          }
        : id === "convex/values"
          ? { v: values }
          : { MEDICAL_PROTOCOL: "early-ad-antibodies-v1" },
  Date,
  Error,
  setTimeout,
  clearTimeout,
  URL,
  AbortController,
});
(async () => {
  let rows = [],
    adult = true;
  const world = {
    state: {
      citizens: [{ id: 18, name: "Dr. Atlas" }],
      life: { people: { 18: { ageAtStart: 45 } } },
    },
  };
  const db = {
    get: async (id) =>
      id === "world"
        ? adult
          ? world
          : { state: { citizens: [] } }
        : rows.find((x) => x._id === id),
    query: () => ({
      withIndex: () => ({
        order: () => ({ take: async () => rows.slice().reverse() }),
      }),
    }),
    insert: async (table, x) => {
      const id = "run" + rows.length;
      rows.push({ ...x, _id: id });
      return id;
    },
    patch: async (id, x) =>
      Object.assign(
        rows.find((r) => r._id === id),
        x,
      ),
  };
  const ctx = { db };
  let r = await moduleExports.reserve.handler(ctx, { worldId: "world" });
  assert.equal(r.cached, false);
  assert.equal(rows.length, 1);
  await assert.rejects(
    () => moduleExports.reserve.handler(ctx, { worldId: "world" }),
    /already running/,
  );
  await moduleExports.finish.handler(ctx, {
    id: r.id,
    review: { papers: ["fixture"] },
  });
  assert.equal(rows[0].status, "ready");
  const cached = await moduleExports.reserve.handler(ctx, { worldId: "world" });
  assert.equal(cached.cached, true);
  assert.equal(rows.length, 1);
  await assert.rejects(
    () => moduleExports.finish.handler(ctx, { id: r.id, error: "overwrite" }),
    /no longer pending/,
  );
  const saved = JSON.parse(JSON.stringify(rows));
  rows = JSON.parse(JSON.stringify(saved));
  assert.equal(
    (await moduleExports.latest.handler(ctx, { worldId: "world" }))[0].status,
    "ready",
  );
  rows = [];
  r = await moduleExports.reserve.handler(ctx, { worldId: "world" });
  await moduleExports.finish.handler(ctx, {
    id: r.id,
    error: "Source mismatch",
  });
  assert.equal(rows[0].status, "failed");
  await assert.rejects(
    () => moduleExports.reserve.handler(ctx, { worldId: "world" }),
    /five minutes/,
  );
  rows = [
    { _id: "a", createdAt: Date.now() - 600000, status: "failed" },
    { _id: "b", createdAt: Date.now() - 900000, status: "failed" },
  ];
  await assert.rejects(
    () => moduleExports.reserve.handler(ctx, { worldId: "world" }),
    /daily research limit/,
  );
  rows = [];
  adult = false;
  await assert.rejects(
    () => moduleExports.reserve.handler(ctx, { worldId: "world" }),
    /adult Dr. Atlas/,
  );
  const failed = await moduleExports.runReview.handler({
    runQuery: async () => null,
  });
  assert.equal(failed.ok, false);
  assert.match(failed.message, /saved village/);
  console.log(
    "PASS: adult identity, saved review round trip, pending deduplication, cache reuse, failure backoff, daily quota, immutable terminal status and honest action errors.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
