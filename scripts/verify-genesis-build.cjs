const assert = require("node:assert/strict"),
  fs = require("fs"),
  os = require("os"),
  path = require("path"),
  cp = require("child_process"),
  vm = require("vm"),
  ts = require("typescript"),
  T = require("three");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-build-"));
const compile = (p, modules) => {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(p, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (id) => modules[id] ?? require(id),
    Date,
    Error,
  });
  return exports;
};
(async () => {
  try {
    cp.execFileSync("node_modules/.bin/tsc", [
      "data/genesisBuild.ts",
      "--outDir",
      dir,
      "--target",
      "ES2021",
      "--module",
      "commonjs",
      "--skipLibCheck",
      "--strict",
    ]);
    const m = require(path.join(dir, "genesisBuild.js"));
    const item = {
        id: "one",
        kind: "sofa",
        x: 0,
        z: 0,
        rotation: 0,
        color: "#ac7e6d",
      },
      design = { schemaVersion: 1, name: "My room", items: [item] };
    assert.deepEqual(m.validateLot(design), design);
    assert.equal(
      m.validateLot({ ...design, unexpected: "dropped" }).unexpected,
      undefined,
    );
    for (const bad of [
      { ...item, x: NaN },
      { ...item, z: 6 },
      { ...item, rotation: 45 },
      { ...item, color: "red" },
      { ...item, kind: "unknown" },
      { ...item, id: "<script>" },
    ])
      assert.throws(() => m.validateLot({ ...design, items: [bad] }));
    assert.throws(() => m.validateLot({ ...design, items: [item, item] }));
    assert.throws(() =>
      m.validateLot({
        ...design,
        items: [item, { ...item, id: "two", x: 0.1 }],
      }),
    );
    assert.throws(() =>
      m.validateLot({ ...design, items: Array(61).fill(item) }),
    );
    assert.throws(() => m.validateLot(null));
    let h = { present: m.emptyLot(), past: [], future: [] };
    h = m.changeBuild(h, design);
    const original = JSON.stringify(h);
    h = m.changeBuild(h, {
      ...design,
      items: [{ ...item, x: 3, rotation: 90 }],
    });
    assert.equal(h.present.items[0].x, 3);
    h = m.undoBuild(h);
    assert.equal(h.present.items[0].x, 0);
    h = m.redoBuild(h);
    assert.equal(h.present.items[0].rotation, 90);
    h = m.changeBuild(h, { ...design, items: [] });
    assert.equal(h.present.items.length, 0);
    h = m.undoBuild(h);
    assert.equal(h.present.items.length, 1);
    assert.equal(JSON.parse(original).present.items[0].x, 0);
    assert.equal(m.footprint({ ...item, rotation: 90 }).w, 1);
    const objects = compile("src/components/BuildObjects.ts", { three: T });
    for (const c of m.BUILD_CATALOG) {
      const object = objects.buildObject({ ...item, kind: c.kind });
      object.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(object),
        size = bounds.getSize(new T.Vector3());
      assert.ok(size.x > 0 && size.y > 0 && size.z > 0);
      assert.ok(
        size.x <= c.w + 0.02 && size.z <= c.d + 0.02,
        c.kind + " footprint",
      );
      let meshes = 0;
      object.traverse((o) => {
        if (o.isMesh) {
          meshes++;
          assert.equal(o.userData.buildId, "one");
          assert.ok(o.geometry.attributes.position.count > 0);
        }
      });
      assert.ok(meshes >= 2);
      objects.disposeBuildObject(object);
    }
    const wrap = (x) => x,
      v = new Proxy({}, { get: () => () => ({}) });
    const backend = compile("convex/buildLots.ts", {
      "./_generated/server": { mutation: wrap, query: wrap },
      "convex/values": { v },
      "../data/genesisBuild": m,
    });
    let row = null;
    const world = {
      state: {
        citizens: [{ id: 1, name: "Existing citizen" }],
        relationships: ["unchanged"],
        money: 100,
      },
    };
    const worldBefore = JSON.stringify(world);
    const db = {
      get: async (id) => (id === "world" ? world : null),
      query: () => ({ withIndex: () => ({ unique: async () => row }) }),
      insert: async (t, x) => {
        row = JSON.parse(JSON.stringify({ ...x, _id: "lot" }));
        return "lot";
      },
      patch: async (id, x) => Object.assign(row, JSON.parse(JSON.stringify(x))),
    };
    const ctx = { db };
    let result = await backend.save.handler(ctx, {
      worldId: "world",
      expectedRevision: 0,
      design,
    });
    assert.equal(result.ok, true);
    assert.equal(row.revision, 1);
    row = JSON.parse(JSON.stringify(row));
    assert.equal(
      (await backend.current.handler(ctx, { worldId: "world" })).design.items[0]
        .kind,
      "sofa",
    );
    assert.equal(
      (
        await backend.save.handler(ctx, {
          worldId: "world",
          expectedRevision: 0,
          design,
        })
      ).ok,
      false,
    );
    assert.equal(row.revision, 1);
    assert.equal(
      (
        await backend.save.handler(ctx, {
          worldId: "world",
          expectedRevision: 1,
          design: { ...design, items: [{ ...item, x: 99 }] },
        })
      ).ok,
      false,
    );
    assert.equal(row.revision, 1);
    for (let n = 1; n <= 6; n++)
      assert.equal(
        (
          await backend.save.handler(ctx, {
            worldId: "world",
            expectedRevision: n,
            design: { ...design, name: "Version " + n },
          })
        ).ok,
        true,
      );
    assert.equal(row.history.length, 5);
    assert.equal(JSON.stringify(world), worldBefore);
    assert.equal(
      (
        await backend.save.handler(ctx, {
          worldId: "missing",
          expectedRevision: 0,
          design,
        })
      ).ok,
      false,
    );
    console.log(
      "PASS: lot validation, collisions/bounds, move/rotate/delete/undo/redo, original real 3D mesh footprints, saved geometry round trip, stale-save rejection, retained versions and unchanged citizens/world.",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
