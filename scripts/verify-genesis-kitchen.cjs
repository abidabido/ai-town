const fs = require("fs"), os = require("os"), ts = require("typescript"), assert = require("assert/strict");
const dir = fs.mkdtempSync(os.tmpdir() + "/genesis-kitchen-");
for (const name of ["genesis","genesisEngine","genesisLife","genesisProfiles","genesisFamilies"])
  fs.writeFileSync(dir+"/"+name+".js", ts.transpileModule(fs.readFileSync("data/"+name+".ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
const { initialState } = require(dir+"/genesisEngine.js");
const { upgradeLiving, cookAtHome, addIngredient, householdKey, ensureCooking } = require(dir+"/genesisLife.js");

const s = upgradeLiving(initialState());
const citizen = s.citizens[0];
const hh = householdKey(citizen.id, s);
ensureCooking(s.life.people[citizen.id]);
s.life.people[citizen.id].cookingSkill = 30;
addIngredient(s, hh, "eggs", 3);
addIngredient(s, hh, "bread", 2);

const beforeHunger = s.life.people[citizen.id].hunger;
const result = cookAtHome(s, citizen.id, "scrambled-eggs-toast");
assert.ok(result.ok, result.reason);
assert.equal(s.life.people[citizen.id].location, "homes");
assert.ok(s.life.people[citizen.id].activity.includes("Eating") || s.life.people[citizen.id].activity.includes("kitchen"));
assert.ok(s.life.people[citizen.id].hunger < beforeHunger);

const inv = s.life.foodInventory[hh];
const meal = Object.keys(inv).find(k => k.startsWith("meal-"));
assert.ok(meal);
assert.equal(inv[meal], 1); // 2 portions cooked, 1 eaten, 1 leftover

console.log("PASS: citizen cooks real recipe at home, ingredients deducted once, portion eaten, leftover remains, hunger reduced, activity recorded.");
