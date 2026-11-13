const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert/strict");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-graphics-"));
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
const life = require(root + "/genesisLife.js"),
  { initialState } = require(root + "/genesisEngine.js");
const s = life.upgradeLiving(initialState()),
  original = JSON.stringify(s);
assert.equal(life.observerCanStand(s, NaN, 20), false);
assert.equal(life.observerCanStand(s, 0, 20), false);
assert.equal(life.observerCanStand(s, 50, 72), false, "River blocks walking");
assert.equal(
  life.observerCanWalk(s, { x: 50, y: 67 }, { x: 50, y: 77 }),
  false,
  "Cannot jump across river",
);
for (const x of [32, 77])
  assert.ok(
    life.observerCanWalk(s, { x, y: 67 }, { x, y: 77 }),
    "Bridge crossing stays open",
  );
const b = life
  .villageBuildings(s)
  .find(
    (b) =>
      b.type !== "gardens" &&
      life.observerCanStand(s, b.x - 5, b.y) &&
      life.observerCanStand(s, b.x + 5, b.y),
  );
assert.ok(b, "Fixture has clear endpoints on opposite sides of a building");
assert.equal(
  life.observerCanWalk(s, { x: b.x - 5, y: b.y }, { x: b.x + 5, y: b.y }),
  false,
  "Sweep catches wall between clear endpoints",
);
assert.equal(life.observerCanStand(s, b.x, b.y), false);
for (const place of life.villageBuildings(s)) {
  const p = life.nearestObserverRoad(s, place.x, place.y);
  assert.ok(
    life.observerRoadSurface(s, p.x, p.y),
    "Every actual venue has a valid nearby landing",
  );
}
const p = life.nearestObserverRoad(s, 48, 56),
  landed = life.applyObserverPresence(s, { action: "land", ...p });
assert.ok(landed.events.some((e) => e.kind === "ObserverControl"));
assert.equal(landed.state.life.observer.x, p.x);
assert.equal(landed.state.tick, s.tick);
assert.equal(life.totalMoney(landed.state), life.totalMoney(s));
const invisible = life.applyObserverPresence(s, {
    action: "configure",
    mode: "Invisible",
  }).state,
  quiet = life.applyObserverPresence(invisible, { action: "land", ...p });
assert.equal(quiet.events.filter((e) => e.kind === "ObserverNotice").length, 0);
assert.throws(() =>
  life.applyObserverPresence(s, { action: "land", x: b.x, y: b.y }),
);
assert.throws(() =>
  life.applyObserverPresence(s, { action: "land", x: NaN, y: 50 }),
);
assert.equal(
  JSON.stringify(s),
  original,
  "Geometry and presence functions do not mutate original state",
);
const restored = life.upgradeLiving(JSON.parse(JSON.stringify(landed.state)));
assert.deepEqual(restored.life.observer, landed.state.life.observer);
const threePath = JSON.stringify(path.resolve("node_modules/three"));
let geometrySource = ts
  .transpileModule(
    fs.readFileSync("src/components/GenesisEnvironment.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  )
  .outputText.replace('require("three")', "require(" + threePath + ")")
  .replace('require("../../data/genesisLife")', 'require("./genesisLife.js")');
fs.writeFileSync(root + "/environment.js", geometrySource);
const T = require("three"),
  environment = require(root + "/environment.js"),
  cache = new Map(),
  mats = new Map();
const tools = {
  gpu: true,
  detail: true,
  windows: [],
  geo: (k, make) => {
    if (!cache.has(k)) cache.set(k, make());
    return cache.get(k);
  },
  material: (c) => {
    if (!mats.has(c)) mats.set(c, new T.MeshLambertMaterial({ color: c }));
    return mats.get(c);
  },
};
tools.mesh = (parent, g, c, x, y, z) => {
  const m = new T.Mesh(g, tools.material(c));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};
tools.box = (p, w, h, d, c, x, y, z) =>
  tools.mesh(p, new T.BoxGeometry(w, h, d), c, x, y, z);
const house = new T.Group(),
  roof = environment.buildArchitecture(tools, house, {
    id: "visual-test",
    type: "house",
    x: 20,
    y: 20,
  });
assert.ok(roof instanceof T.Mesh);
roof.geometry.computeBoundingBox();
assert.ok(Math.abs(roof.geometry.boundingBox.max.y - 1.55) < 1e-5);
const positions = roof.geometry.attributes.position,
  indices = roof.geometry.index;
for (let i = 0; i < indices.count; i += 3) {
  const points = [0, 1, 2].map((n) =>
    new T.Vector3().fromBufferAttribute(positions, indices.getX(i + n)),
  );
  if (points.some((p) => p.y > 0) && new Set(points.map((p) => p.z)).size > 1) {
    const normal = points[1]
      .clone()
      .sub(points[0])
      .cross(points[2].clone().sub(points[0]));
    assert.ok(normal.y > 0, "Roof slopes face outward and upward");
  }
}
const human = new T.Group(),
  profile = s.life.people[s.citizens[0].id],
  before = JSON.stringify(profile),
  model = environment.buildCitizen(tools, human, profile, 0);
assert.equal(JSON.stringify(profile), before);
const bounds = new T.Box3().setFromObject(human);
assert.ok(
  bounds.max.y > 1.7 && bounds.max.y < 2.1,
  "Citizens retain human scale",
);
assert.ok(bounds.min.y > -0.1);
assert.equal(model.limbs.length, 4);
assert.equal(model.phone.visible, false);
assert.equal(model.book.visible, false);
const scene = new T.Scene();
environment.buildVillageEnvironment(tools, scene, s);
assert.ok(
  scene.children.some((o) => o.isInstancedMesh),
  "GPU scenery batches repeated road geometry",
);
assert.ok(tools.windows.length >= 4);
console.log(
  "PASS: original architecture, outward roofs, human scale, hidden activity props, profile preservation and instanced road geometry",
);

fs.rmSync(root, { recursive: true, force: true });
console.log(
  "PASS: swept building collision, river/bridges, finite bounds, safe landings, invisible suppression, persistence, immutability and conservation",
);

assert.equal(life.observerCanStand(s, 39, 55), false, "Park bench is solid");
assert.equal(
  life.observerCanStand(s, 60, 66),
  false,
  "Raised planter is solid",
);
assert.equal(
  life.observerCanStand(s, 34.8, 72),
  false,
  "Bridge railing keeps walkers on deck",
);
console.log(
  "PASS: existing furniture, raised planters and bridge-rail clearance",
);
