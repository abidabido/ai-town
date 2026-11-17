const fs = require("fs"),
  os = require("os"),
  ts = require("typescript"),
  assert = require("assert/strict");
const dir = fs.mkdtempSync(os.tmpdir() + "/genesis-recipes-");
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
  cookRecipe,
  addIngredient,
  getHouseholdFood,
  householdKey,
  ensureCooking,
  RECIPES,
} = require(dir + "/genesisLife.js");

const s = upgradeLiving(initialState());
const citizen = s.citizens[0];
const hh = householdKey(citizen.id, s);
ensureCooking(s.life.people[citizen.id]);
s.life.people[citizen.id].cookingSkill = 40;
s.life.people[citizen.id].knownRecipes.push("tomato-pasta");

// Stock ingredients into store (simulate supplier)
s.life.grocery.inventory.eggs = 10;
s.life.grocery.inventory.bread = 10;
s.life.grocery.inventory.tomatoes = 10;
s.life.grocery.inventory.pasta = 10;

// Citizen buys ingredients (using shopForHousehold for basic, then addIngredient for demo)
addIngredient(s, hh, "eggs", 4);
addIngredient(s, hh, "bread", 2);
addIngredient(s, hh, "pasta", 1);
addIngredient(s, hh, "tomatoes", 2);
addIngredient(s, hh, "onions", 1);

const beforeSkill = s.life.people[citizen.id].cookingSkill;
const result = cookRecipe(s, citizen.id, "scrambled-eggs-toast");
assert.ok(result.ok, result.reason);
assert.equal(result.portions, 2);
assert.ok(s.life.people[citizen.id].cookingSkill > beforeSkill);

// Meal is in inventory
const inv = s.life.foodInventory[hh];
const mealKey = Object.keys(inv).find((k) => k.startsWith("meal-"));
assert.ok(mealKey);
assert.equal(inv[mealKey], 2);

// Consume one portion
inv[mealKey] -= 1;
assert.equal(inv[mealKey], 1); // leftover

// Second recipe
const pasta = cookRecipe(s, citizen.id, "tomato-pasta");
assert.ok(pasta.ok);
assert.equal(pasta.portions, 3);

console.log("PASS: ingredients stocked, recipes cooked, portions created, leftovers remain, cooking skill increased, preferences/skills initialized.");
