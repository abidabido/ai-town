const fs = require("fs"), os = require("os"), ts = require("typescript"), assert = require("assert/strict");
const dir = fs.mkdtempSync(os.tmpdir() + "/genesis-walk-");
for (const name of ["genesis","genesisEngine","genesisLife","genesisProfiles","genesisFamilies"])
  fs.writeFileSync(dir+"/"+name+".js", ts.transpileModule(fs.readFileSync("data/"+name+".ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
const { initialState } = require(dir+"/genesisEngine.js");
const {
  upgradeLiving, cookAtHome, addIngredient, householdKey, ensureCooking,
  canStandInCottage, canWalkInCottage, doorwayClear, COTTAGE_INTERIOR
} = require(dir+"/genesisLife.js");

// Collision
assert.ok(canStandInCottage(0, 0));
assert.ok(!canStandInCottage(-3.2, -2.2)); // fridge
assert.ok(!canStandInCottage(1.2, 0.5));   // table
assert.ok(doorwayClear(0, 3.1));
assert.ok(!doorwayClear(2, 3.1));

// Path from doorway to kitchen
const start = { x: 0, z: 2.6 };
const kitchen = COTTAGE_INTERIOR.kitchen;
assert.ok(canWalkInCottage(start, kitchen), "path to kitchen should be clear");

// Blocked path
assert.ok(!canWalkInCottage(start, { x: -3.2, z: -2.2 }));

// Full cook path
const s = upgradeLiving(initialState());
const c = s.citizens[0];
const hh = householdKey(c.id, s);
ensureCooking(s.life.people[c.id]);
s.life.people[c.id].cookingSkill = 30;
addIngredient(s, hh, "eggs", 3);
addIngredient(s, hh, "bread", 2);
const r = cookAtHome(s, c.id, "scrambled-eggs-toast");
assert.ok(r.ok);
assert.ok(r.position);
assert.equal(s.life.people[c.id].activity.includes("Eating") || s.life.people[c.id].location === "homes", true);

console.log("PASS: doorway, wall/furniture collision, clear kitchen path, blocked rejection, and real cooking transaction all verified.");
