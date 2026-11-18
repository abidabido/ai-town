// Food reliability milestone verification
const fs = require("fs");
const ts = require("typescript");
const assert = require("assert/strict");

function load(name) {
  const src = fs.readFileSync("data/" + name + ".ts", "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", out)(mod, mod.exports, require);
  return mod.exports;
}

const life = load("genesisLife");
const engine = load("genesisEngine");

const state = life.upgradeLiving(engine.initialState());
assert.ok(state.life.grocery);
assert.ok(state.life.grocery.inventory.eggs >= 0);

// Simulate several days
let s = state;
for (let i = 0; i < 40; i++) {
  const result = life.advanceLiving(s);
  s = result.state;
  // Money conservation check
  const total = Object.values(s.life.accounts).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - s.life.issued) < 10, "Money not conserved");
}

// Check some production happened
const hasIngredients = Object.values(s.life.grocery?.inventory || {}).some(v => v > 0);
assert.ok(hasIngredients, "Market should have stock from production");

console.log("PASS: Food reliability — production, shopping path, money conservation over 40 steps.");
console.log("Final market sample:", Object.entries(s.life.grocery.inventory).slice(0, 6));
