const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  cp = require("node:child_process"),
  vm = require("node:vm");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-rooms-"));
try {
  cp.execFileSync(
    "./node_modules/.bin/tsc",
    [
      "data/genesisBuild.ts",
      "data/genesisArchitecture.ts",
      "--outDir",
      tmp,
      "--module",
      "commonjs",
      "--target",
      "es2021",
      "--strict",
      "--skipLibCheck",
    ],
    { stdio: "pipe" },
  );
  const b = require(path.join(tmp, "genesisBuild.js")),
    a = require(path.join(tmp, "genesisArchitecture.js"));
  const old = {
    schemaVersion: 1,
    name: "Saved furniture",
    items: [
      {
        id: "sofa-one",
        kind: "sofa",
        x: 4,
        z: 0,
        rotation: 90,
        color: "#617e61",
      },
    ],
  };
  assert.deepEqual(b.validateLot(old), old);
  const d = b.upgradeLot(old);
  assert.deepEqual(d.items, old.items);
  assert.equal(d.schemaVersion, 2);
  const walls = a.rectangleWalls(-4, -4, 0, 0),
    built = b.validateLot({ ...d, walls });
  const rooms = a.findRooms(built.walls);
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].area, 16);
  assert.equal(rooms[0].floors.length, 1);
  assert.equal(rooms[0].hasDoor, false);
  assert.equal(a.findRooms(walls.slice(0, 3)).length, 0);
  const withDoor = b.validateLot({
    ...built,
    walls: walls.map((w, i) => (i === 0 ? { ...w, door: true } : w)),
  });
  assert.equal(a.findRooms(withDoor.walls)[0].hasDoor, true);
  assert.deepEqual(
    b.validateLot(JSON.parse(JSON.stringify(withDoor))),
    withDoor,
  );
  for (const bad of [
    null,
    {},
    [{ ...walls[0], x2: NaN }],
    [{ ...walls[0], x1: 6 }],
    [{ ...walls[0], height: 1 }],
    [{ ...walls[0], door: "yes" }],
    [{ ...walls[0], x2: -3.5, door: true }],
    [walls[0], { ...walls[0], id: "duplicate" }],
    [
      walls[0],
      {
        id: "cross",
        x1: -2,
        z1: -5,
        x2: -2,
        z2: -3,
        height: 2.8,
        color: "#ffffff",
      },
    ],
  ])
    assert.throws(() => a.validateWalls(bad, []));
  assert.throws(() =>
    b.validateLot({ ...built, items: [{ ...old.items[0], x: -4, z: -2 }] }),
  );
  assert.throws(() =>
    b.validateLot({ ...withDoor, items: [{ ...old.items[0], x: -2, z: -4 }] }),
  );
  const manual = walls.map((w) => ({ ...w, id: "manual-" + w.id }));
  assert.equal(a.findRooms(manual)[0].area, 16);
  let h = { present: d, past: [], future: [] };
  h = b.changeBuild(h, built);
  assert.equal(b.undoBuild(h).present.walls.length, 0);
  assert.deepEqual(b.redoBuild(b.undoBuild(h)).present, built);
  const ts = require("typescript"),
    T = require("three");
  const code = ts.transpileModule(
    fs.readFileSync("src/components/BuildArchitectureObjects.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
      },
    },
  ).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, {
    exports: mod.exports,
    module: mod,
    require: (n) =>
      n === "three" ? T : n.includes("genesisArchitecture") ? a : require(n),
  });
  const model = mod.exports.buildWall(withDoor.walls[0]);
  model.updateMatrixWorld(true);
  const ray = new T.Raycaster(new T.Vector3(-2, 1, -5), new T.Vector3(0, 0, 1));
  assert.equal(
    ray.intersectObject(model, true).length,
    0,
    "Doorway must be an actual hole",
  );
  ray.set(new T.Vector3(-3.5, 1, -5), new T.Vector3(0, 0, 1));
  assert.ok(
    ray.intersectObject(model, true).length > 0,
    "Wall beside opening remains solid",
  );
  ray.set(new T.Vector3(-2, 2.5, -5), new T.Vector3(0, 0, 1));
  assert.ok(
    ray.intersectObject(model, true).length > 0,
    "Door lintel remains solid",
  );
  const floors = mod.exports.buildFloors(withDoor);
  assert.equal(floors.children.length, 1);
  const box = new T.Box3().setFromObject(floors),
    size = box.getSize(new T.Vector3());
  assert.equal(size.x * size.z, 16);
  console.log(
    "PASS Genesis rooms: v1 preservation; bounded walls; furniture/door clearance; enclosed room detection; floor area; real doorway raycasts; undo/redo; serialized geometry reload.",
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
