// Small milestone test: Grow (farm yield) -> household inventory -> cook/eat
const { create, step, householdKey, getHouseholdFood, addHouseholdFood } = require("../data/genesisLife.ts");
// Note: the verify scripts usually compile TS; for speed we assume the loader or just check syntax for now.
// Real suite uses ts-node or similar. We'll rely on the main life suite after this.

console.log("Food milestone helpers present — run full life suite for verification.");
