const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert/strict");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "genesis-touch-"));
fs.writeFileSync(
  root + "/touch.js",
  ts.transpileModule(
    fs.readFileSync("src/components/GenesisTouch.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
);
const { VillageTouch, SavedWalker } = require(root + "/touch.js");
const p = (
  id = 1,
  x = 100,
  y = 100,
  time = 0,
  right = false,
  interactive = false,
) => ({ id, x, y, time, right, interactive });
function fixture(mode = true, joystick = false) {
  const logs = [];
  const h = new VillageTouch({
    mode: () => mode,
    joystick: () => joystick,
    walk: (...x) => logs.push(["walk", ...x]),
    stop: () => logs.push(["stop"]),
    look: (...x) => logs.push(["look", ...x]),
    pinch: (...x) => logs.push(["pinch", ...x]),
    tap: (id) => logs.push(["tap", id]),
    focus: (id) => logs.push(["focus", id]),
    feedback: (...x) => logs.push(["feedback", ...x]),
  });
  return { h, logs };
}
let { h, logs } = fixture();
h.down(p());
h.tick(279);
assert.equal(logs.filter((x) => x[0] === "walk").length, 0);
h.up(1, 200);
assert.ok(logs.some((x) => x[0] === "tap"));
assert.equal(
  logs.filter((x) => x[0] === "walk").length,
  0,
  "Quick taps cannot start walking",
);
({ h, logs } = fixture());
h.down(p());
h.tick(280);
assert.deepEqual(
  logs.find((x) => x[0] === "walk"),
  ["walk", 0, -1],
);
h.move(p(1, 160, 100, 400));
assert.ok(
  logs.filter((x) => x[0] === "walk").at(-1)[1] > 0.5,
  "Drag steers held movement",
);
h.up(1, 700);
const count = logs.length;
h.tick(2000);
assert.equal(logs.length, count, "Release ends held intent");
assert.ok(!h.held);
assert.ok(
  !logs.some((x) => x[0] === "tap"),
  "A walk release is not a selection",
);
({ h, logs } = fixture());
h.down(p(1, 100, 100, 0, false, true));
h.tick(500);
h.up(1, 600);
assert.ok(
  !logs.some((x) => x[0] === "walk"),
  "Holding an interactive citizen never walks",
);
({ h, logs } = fixture());
h.down(p(1, 800, 100, 0, true));
h.move(p(1, 830, 120, 100, true));
h.tick(1000);
assert.ok(logs.some((x) => x[0] === "look"));
assert.ok(
  !logs.some((x) => x[0] === "walk"),
  "Right-side looking is distinct from walking",
);
({ h, logs } = fixture());
h.down(p());
h.tick(300);
h.down(p(2, 200, 100, 310));
h.move(p(2, 250, 120, 350));
assert.ok(logs.some((x) => x[0] === "pinch" && x[1] > 1 && x[2] !== 0));
h.up(2, 400);
const n = logs.filter((x) => x[0] === "walk").length;
h.tick(1000);
assert.equal(
  logs.filter((x) => x[0] === "walk").length,
  n,
  "A remaining finger after pinch cannot restart walking",
);
h.up(1, 1100);
({ h, logs } = fixture(false));
h.down(p());
h.tick(200);
h.up(1, 220);
h.down(p(2, 105, 102, 300));
h.up(2, 400);
assert.ok(
  logs.some((x) => x[0] === "focus"),
  "Two clear taps focus a road",
);
assert.ok(!logs.some((x) => x[0] === "walk"), "Sky gestures cannot walk");
({ h, logs } = fixture());
h.down(p());
h.tick(300);
h.cancel();
h.tick(5000);
assert.equal(h.points.size, 0);
assert.equal(h.held, false);
assert.equal(
  logs.at(-1).at(-1),
  false,
  "Blur/menu/cancel hides the touch indicator",
);
({ h, logs } = fixture(true, true));
h.down(p());
h.tick(0);
assert.ok(
  logs.some((x) => x[0] === "walk"),
  "Optional pad activates without long press",
);
h.move(p(1, 100, 40, 100));
assert.ok(logs.some((x) => x[0] === "walk" && x[2] < 0));
h.cancel();
({ h, logs } = fixture());
h.down({ ...p(), aimX: 0.75 });
h.tick(300);
assert.ok(
  logs.find((x) => x[0] === "walk")[1] > 0.4,
  "Touch position indicates the initial walking direction",
);
h.cancel();
console.log(
  "PASS: tap/hold threshold, continuous intent, steering, release, protected selection, right-side look, pinch/twist, double tap, interruption and optional pad",
);
async function main() {
  let saved = { x: 32, y: 58 },
    writes = [],
    failures = [],
    manual = 0;
  const make = (
    persist = async (x) => {
      saved = { ...x };
      writes.push({ ...x });
    },
    canMove = (a, b) => b.y >= 50 && b.y <= 60,
  ) =>
    new SavedWalker({
      position: () => saved,
      heading: () => 0,
      speed: () => 3,
      canMove,
      persist,
      changed: () => {},
      failed: (x) => failures.push(x),
      manual: () => manual++,
    });
  const settle = async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  };
  let w = make();
  w.inputMove(0, -1);
  for (let t = 1000; t <= 2000; t += 16) w.tick(t);
  const held = { ...w.position };
  assert.ok(held.y < 57, "Holding advances without repeated tap input");
  assert.equal(writes.length, 1, "Only one save may be in flight");
  w.stop();
  const stop = { ...w.position };
  await settle();
  w.tick(9000);
  assert.deepEqual(w.position, stop, "Release stops position immediately");
  assert.deepEqual(saved, stop, "Release flushes the last accepted position");
  assert.ok(writes.length <= 3, "Writes are bounded, including final stop");
  assert.equal(manual, 1, "Manual walking exits following once");
  w.dispose();
  saved = { x: 32, y: 58 };
  writes = [];
  w = make(undefined, (a, b) => b.y >= 57.5);
  w.inputMove(0, -1);
  for (let t = 1000; t < 3000; t += 16) w.tick(t);
  assert.ok(w.position.y >= 57.5, "Repeated held steps cannot cross a wall");
  w.stop();
  await settle();
  w.dispose();
  saved = { x: 32, y: 58 };
  writes = [];
  let reject;
  w = make(() => new Promise((a, b) => (reject = b)));
  w.inputMove(0, -1);
  for (let t = 1000; t < 1300; t += 16) w.tick(t);
  assert.ok(w.pending);
  reject(Error("refused"));
  await settle();
  assert.equal(w.active, false);
  assert.deepEqual(
    w.position,
    saved,
    "Rejected persistence rolls back to saved position",
  );
  assert.ok(failures.some((x) => x.includes("did not save")));
  const old = { ...w.position };
  w.tick(10000);
  assert.deepEqual(w.position, old, "Failure does not silently resume");
  w.dispose();
  saved = { x: 32, y: 58 };
  w = make();
  w.inputMove(0, -1);
  w.tick(1000);
  w.tick(20000);
  assert.ok(58 - w.position.y < 1, "Long browser stalls cannot teleport");
  w.dispose();
  await settle();
  fs.rmSync(root, { recursive: true, force: true });
  console.log(
    "PASS: held motion, acceleration, immediate stop, one in-flight save, bounded writes, final flush, collision, rollback, stall clamp and follow exit",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
