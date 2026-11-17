const fs = require("fs"),
  os = require("os"),
  ts = require("typescript"),
  assert = require("assert/strict");
const dir = fs.mkdtempSync(os.tmpdir() + "/genesis-grocery-");
for (const name of [
  "genesis",
  "genesisEngine",
  "genesisLife",
  "genesisProfiles",
  "genesisFamilies",
])
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
  restockGrocery,
  shopForHousehold,
  getHouseholdFood,
  householdKey,
  totalMoney,
  advanceLiving,
} = require(dir + "/genesisLife.js");

const base = initialState();
const s = upgradeLiving(base);
assert.ok(s.life.grocery, "grocery store seeded");
assert.equal(s.life.grocery.name, "Willow Market");
assert.equal(s.life.grocery.inventory["basic-servings"], 0);

// 1-2. Cooperative supplies 5 servings to the store
s.supplies = 10;
assert.ok(restockGrocery(s, 5, s.tick));
assert.equal(s.supplies, 5);
assert.equal(s.life.grocery.inventory["basic-servings"], 5);
assert.equal(s.life.grocery.records.length, 1);
assert.equal(s.life.grocery.records[0].kind, "restock");

// 3-5. Citizen notices low pantry and buys 3
const citizen = s.citizens[0];
const hh = householdKey(citizen.id, s);
s.life.foodInventory[hh] = 1; // low
const beforeMoney = s.life.accounts["citizen:" + citizen.id];
const beforeStore = s.life.accounts["grocery:willow"];
const out = { events: [], transactions: [] };
const result = shopForHousehold(s, out, citizen.id, 3, s.tick);
assert.ok(result.ok, result.reason);
assert.equal(s.life.grocery.inventory["basic-servings"], 2);
assert.equal(getHouseholdFood(s, hh), 4); // 1 + 3
assert.equal(s.life.accounts["citizen:" + citizen.id], beforeMoney - 600);
assert.equal(s.life.accounts["grocery:willow"], beforeStore + 600);
assert.equal(totalMoney(s), totalMoney(upgradeLiving(initialState())) + 0); // conservation (new account was seeded)

// 9-10. Later consume one serving
const { consumeHouseholdFood } = require(dir + "/genesisLife.js");
assert.ok(consumeHouseholdFood(s, hh, 1));
assert.equal(getHouseholdFood(s, hh), 3);

// Failures
s.life.grocery.open = false;
const closed = shopForHousehold(s, out, citizen.id, 1, s.tick);
assert.equal(closed.ok, false);
s.life.grocery.open = true;
const broke = shopForHousehold(s, { events: [] }, citizen.id, 100, s.tick); // way more than stock
assert.equal(broke.ok, false);

console.log("PASS: full grocery restock → household purchase → consume chain, money conservation, failure cases, records preserved.");
