import {profileFor} from './genesisProfiles';
import type { GenesisState, GenesisEvent } from "./genesisEngine";
export const FACTIONS = [
  "Materialists",
  "Idealists",
  "Skeptics",
  "Neuroscientists",
  "Mystics",
  "Empiricists",
];
export const PLACES: Record<string, { x: number; y: number }> = {
  gardens: { x: 17, y: 22 },
  observatory: { x: 44, y: 23 },
  archive: { x: 85, y: 23 },
  council: { x: 48, y: 51 },
  homes: { x: 17, y: 84 },
  workshop: { x: 85, y: 74 },
  clinic: { x: 69, y: 76 },
};
export type LifePerson = {
  profile?: import('./genesisProfiles').CitizenProfile;
  ageAtStart: number;
  home: string;
  job: string;
  skill: number;
  hunger: number;
  fatigue: number;
  health: number;
  stress: number;
  happiness: number;
  loneliness: number;
  curiosity: number;
  ambition: number;
  empathy: number;
  risk: number;
  activity: string;
  location: string;
  goal: string;
  initialFaction: string;
  beliefs: Record<string, number>;
};
export type Building = {
  id: string;
  type: string;
  x: number;
  y: number;
  owner: string;
  capacity: number;
  condition: number;
  progress: number;
  labor: number;
  cost: number;
  started: number;
};
export type LifeState = {
  version: 2;
  paused: boolean;
  startedTick: number;
  timeline: number;
  accounts: Record<string, number>;
  issued: number;
  materials: number;
  weather: string;
  people: Record<string, LifePerson>;
  buildings: Building[];
  research: number;
  researchProblem: string;
  severeOutcomes: boolean;
  shortageUntil: number;
  lightUntil: number;
};
export type LivingState = GenesisState & { life: LifeState };
export type LifeEvent = GenesisEvent & {
  actionId: string;
  source: string;
  reason: string;
  timeline: number;
};
export type Transaction = {
  tick: number;
  timeline: number;
  actionId: string;
  from: string;
  to: string;
  amount: number;
  reason: string;
};
export type VillageMessage = {
  tick: number;
  timeline: number;
  actionId: string;
  speaker: number;
  recipient: number;
  location: string;
  topic: string;
  text: string;
  source: string;
  visibility: string;
};
export type LifeResult = {
  state: LivingState;
  events: LifeEvent[];
  transactions: Transaction[];
  messages: VillageMessage[];
};
export const clamp = (v: number) => Math.max(0, Math.min(100, v));
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export const money = (v: number) => "¤" + (v / 100).toFixed(2);
export function calendar(tick: number) {
  const day = Math.floor(tick / 4);
  return {
    year: Math.floor(day / 360) + 1,
    month: Math.floor((day % 360) / 30) + 1,
    day: (day % 30) + 1,
    week: Math.floor(day / 7) + 1,
    hour: (tick % 4) * 6,
    season: ["Spring", "Summer", "Autumn", "Winter"][
      Math.floor((day % 360) / 90)
    ],
  };
}
export function upgradeLiving(input: GenesisState): LivingState {
  const s = clone(input) as LivingState;
  if (s.life) {
    if (s.life.version !== 2) throw Error("Unsupported Genesis save version");
    for(const c of s.citizens) s.life.people[c.id].profile=profileFor(c,s.life.people[c.id]);
    return s;
  }
  const jobs = [
    "Farmer",
    "Builder",
    "Teacher",
    "Trader",
    "Researcher",
    "Lawyer",
    "Doctor",
    "Researcher",
    "Counselor",
    "Builder",
    "Farmer",
    "Safety officer",
  ];
  const accounts: Record<string, number> = {
    cooperative: 100000,
    treasury: 100000,
  };
  const people: Record<string, LifePerson> = {};
  for (const c of s.citizens) {
    accounts["citizen:" + c.id] = 10000;
    const beliefs: Record<string, number> = {};
    for (const f of FACTIONS) beliefs[f] = f === c.faction ? 70 : 6;
    people[c.id] = {
      ageAtStart: 24 + c.id * 2,
      home: "home-" + Math.floor(c.id / 2),
      job: jobs[c.id % jobs.length],
      skill: 20 + (c.id % 5) * 8,
      hunger: 20,
      fatigue: 15,
      health: 100,
      stress: 15,
      happiness: 65,
      loneliness: 25,
      curiosity: 40 + ((c.id * 17) % 55),
      ambition: 30 + ((c.id * 13) % 60),
      empathy: 35 + ((c.id * 11) % 60),
      risk: 15 + ((c.id * 19) % 65),
      activity: "Settling in",
      location: "homes",
      goal: "Find a sustainable balance between work, needs and community.",
      initialFaction: c.faction,
      beliefs,
    };
  }
  s.life = {
    version: 2,
    paused: true,
    startedTick: s.tick,
    timeline: 0,
    accounts,
    issued: Object.values(accounts).reduce((a, b) => a + b, 0),
    materials: 120,
    weather: "Clear",
    people,
    buildings: Array.from({ length: 6 }, (_, i) => ({
      id: "home-" + i,
      type: "House",
      x: 8 + i * 15,
      y: 86,
      owner: s.citizens
        .filter((c) => Math.floor(c.id / 2) === i)
        .map((c) => c.name)
        .join(" & "),
      capacity: 2,
      condition: 100,
      progress: 100,
      labor: 0,
      cost: 0,
      started: s.tick,
    })),
    research: 0,
    researchProblem: "Compare food yields across weather conditions.",
    severeOutcomes: false,
    shortageUntil: 0,
    lightUntil: 0,
  };
  for(const c of s.citizens) s.life.people[c.id].profile=profileFor(c,s.life.people[c.id]);
  return s;
}
export function totalMoney(s: LivingState) {
  return Object.values(s.life.accounts).reduce((a, b) => a + b, 0);
}
export function transfer(
  s: LivingState,
  out: LifeResult,
  from: string,
  to: string,
  amount: number,
  reason: string,
  actionId: string,
) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    from === to ||
    !(from in s.life.accounts) ||
    !(to in s.life.accounts) ||
    s.life.accounts[from] < amount
  )
    return false;
  s.life.accounts[from] -= amount;
  s.life.accounts[to] += amount;
  out.transactions.push({
    tick: s.tick,
    timeline: s.life.timeline,
    actionId,
    from,
    to,
    amount,
    reason,
  });
  return true;
}
function event(
  out: LifeResult,
  kind: string,
  actors: number[],
  text: string,
  reason: string,
  source = "rule-engine",
) {
  const s = out.state,
    actionId = "t" + s.life.timeline + ":" + s.tick + ":" + out.events.length;
  out.events.push({
    tick: s.tick,
    kind,
    actors,
    text,
    reason,
    source,
    actionId,
    timeline: s.life.timeline,
  });
  for (const c of s.citizens.filter((c) => actors.includes(c.id)))
    c.memories = [...c.memories, text].slice(-60);
  return actionId;
}
const key = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(":");
function move(s: LivingState, id: number, location: string, offset = 0) {
  const c = s.citizens.find((c) => c.id === id)!;
  let p = PLACES[location] || PLACES.homes;
  if (location === "homes") {
    const home = s.life.buildings.find((b) => b.id === s.life.people[id].home);
    if (home) p = { x: home.x, y: home.y };
  }
  c.x = Math.max(2, Math.min(98, p.x + offset));
  c.y = p.y;
  s.life.people[id].location = location;
}
export function emptyResult(s: LivingState): LifeResult {
  return { state: s, events: [], transactions: [], messages: [] };
}
export function advanceLiving(previous: GenesisState): LifeResult {
  const s = upgradeLiving(previous),
    out = emptyResult(s);
  s.tick++;
  const hour = (s.tick % 4) * 6;
  const random = () => {
    s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
    return s.seed / 4294967296;
  };
  if (hour === 0)
    s.life.weather = ["Clear", "Rain", "Overcast", "Clear"][
      Math.floor(random() * 4)
    ];
  const used = new Set<number>();
  for (const c of [
    ...s.citizens.slice(s.tick % s.citizens.length),
    ...s.citizens.slice(0, s.tick % s.citizens.length),
  ]) {
    const p = s.life.people[c.id],
      account = "citizen:" + c.id;
    p.hunger = clamp(p.hunger + 12);
    p.fatigue = clamp(p.fatigue + 9);
    p.loneliness = clamp(p.loneliness + 4);
    p.stress = clamp(p.stress + (p.hunger > 75 ? 6 : -1));
    p.happiness = clamp(
      85 - p.stress * 0.4 - p.loneliness * 0.25 - p.hunger * 0.2,
    );
    if (p.hunger > 85) p.health = Math.max(25, p.health - 3);
    if (hour === 0 || p.fatigue >= 85) {
      p.fatigue = clamp(p.fatigue - 55);
      p.activity = "Sleeping";
      move(s, c.id, "homes", ((c.id % 4) - 1.5) * 4);
      event(
        out,
        "Rest",
        [c.id],
        c.name + " rested at home. Fatigue fell to " + p.fatigue + ".",
        hour === 0 ? "Night schedule" : "Fatigue reached priority threshold",
      );
      continue;
    }
    if (p.hunger >= 45 || (hour === 6 && p.hunger >= 25)) {
      const id = event(
        out,
        "Food",
        [c.id],
        c.name + " sought a meal.",
        "Hunger " + p.hunger + "; morning meal schedule or hunger priority",
      );
      if (s.life.accounts[account] < 300 && s.life.accounts.treasury >= 300)
        transfer(s, out, "treasury", account, 300, "Food relief", id);
      if (
        s.supplies >= 1 &&
        transfer(s, out, account, "cooperative", 300, "Meal purchase", id)
      ) {
        s.supplies--;
        p.hunger = clamp(p.hunger - 48);
        p.activity = "Eating";
        move(s, c.id, "gardens", ((c.id % 4) - 1.5) * 3);
        out.events[out.events.length - 1].text =
          c.name +
          " bought a meal for ¤3.00. Food stock decreased by one serving.";
      } else if (s.supplies < 1) {
        p.activity = "Emergency food growing";
        s.supplies += 2;
        p.fatigue = clamp(p.fatigue + 8);
        move(s, c.id, "gardens");
        out.events[out.events.length - 1].text =
          c.name +
          " could not buy food because the pantry was empty and grew two emergency servings instead.";
      } else {
        p.activity = "Seeking food assistance";
        p.stress = clamp(p.stress + 8);
        move(s, c.id, "council");
        out.events[out.events.length - 1].text =
          c.name + " could not afford a meal; public relief was unavailable.";
      }
      continue;
    }
    if (p.health < 65) {
      const doctor = s.citizens.find(
        (d) =>
          s.life.people[d.id].job === "Doctor" &&
          s.life.people[d.id].health > 50,
      );
      if (doctor) {
        const id = event(
          out,
          "Healthcare",
          [c.id, doctor.id],
          c.name +
            " received simulated care from " +
            doctor.name +
            ". Health improved by 12.",
          "Health below 65",
        );
        if (s.life.accounts[account] >= 100)
          transfer(s, out, account, "cooperative", 100, "Clinic treatment", id);
        p.health = clamp(
          p.health +
            12 +
            s.life.buildings.filter(
              (b) =>
                b.type === "hospital" && b.progress === 100 && b.condition > 0,
            ).length *
              8,
        );
        p.activity = "Receiving care";
        move(s, c.id, "clinic");
        continue;
      }
    }
    if (hour === 12) {
      const id = event(
        out,
        "Work",
        [c.id],
        c.name + " worked as " + p.job + ".",
        "Daytime work schedule; hunger and fatigue below priority thresholds",
      );
      if (
        s.life.accounts.cooperative < 3600 &&
        s.life.accounts.treasury >= 6000
      )
        transfer(
          s,
          out,
          "treasury",
          "cooperative",
          6000,
          "Cooperative operating grant",
          id,
        );
      const paid = transfer(
        s,
        out,
        "cooperative",
        account,
        300,
        "Gross wage: " + p.job,
        id,
      );
      if (paid) transfer(s, out, account, "treasury", 30, "Wage tax 10%", id);
      p.activity = (paid ? "Working: " : "Unpaid shift: ") + p.job;
      p.fatigue = clamp(p.fatigue + 12);
      p.skill = clamp(p.skill + 0.2);
      if (p.job === "Farmer") {
        const yieldAmount =
          s.life.shortageUntil > s.tick
            ? 2
            : (s.life.weather === "Rain" ? 10 : 8) +
              s.life.buildings.filter(
                (b) =>
                  b.type === "farm" && b.progress === 100 && b.condition > 0,
              ).length *
                2;
        s.supplies += yieldAmount;
        move(s, c.id, "gardens", ((c.id % 4) - 1.5) * 4);
        out.events[out.events.length - 1].text +=
          " Produced " + yieldAmount + " food servings.";
      } else if (p.job === "Builder") {
        move(s, c.id, "workshop");
        s.life.materials += 2;
        out.events[out.events.length - 1].text +=
          " Recovered two construction materials.";
        const building = s.life.buildings.find((b) => b.progress < 100);
        if (building) {
          building.labor++;
          building.progress = Math.min(
            100,
            Math.floor((building.labor / 12) * 100),
          );
          out.events[out.events.length - 1].text +=
            " Added one construction shift to " + building.type + ".";
          if (building.progress === 100)
            event(
              out,
              "Construction",
              [c.id],
              building.type + " " + building.id + " completed and opened.",
              "12 construction shifts fulfilled",
            );
        }
      } else if (p.job === "Researcher") {
        move(s, c.id, "observatory");
        s.life.research +=
          1 +
          s.life.buildings.filter(
            (b) =>
              b.type === "laboratory" && b.progress === 100 && b.condition > 0,
          ).length;
        out.events[out.events.length - 1].text +=
          " Logged one research observation for: " + s.life.researchProblem;
      } else if (p.job === "Teacher") {
        move(s, c.id, "archive");
        const learner = s.citizens
          .filter((d) => d.id !== c.id)
          .sort(
            (a, b) => s.life.people[a.id].skill - s.life.people[b.id].skill,
          )[0];
        s.life.people[learner.id].skill = clamp(
          s.life.people[learner.id].skill + 1,
        );
        out.events[out.events.length - 1].text +=
          " Taught " + learner.name + "; their skill increased by one.";
      } else
        move(
          s,
          c.id,
          p.job === "Doctor" ? "clinic" : "council",
          ((c.id % 4) - 1.5) * 4,
        );
      out.events.find((e) => e.actionId === id)!.text += paid
        ? " Gross wage ¤3.00, tax ¤0.30."
        : " No wage paid: cooperative funds exhausted.";
      continue;
    }
    if (hour === 18 && !used.has(c.id)) {
      const candidates = s.citizens.filter(
        (d) =>
          d.id !== c.id &&
          !used.has(d.id) &&
          s.life.people[d.id].hunger < 70 &&
          s.life.people[d.id].fatigue < 80,
      );
      const partner = candidates.sort(
        (a, b) =>
          (s.trust[key(c.id, b.id)] || 0) +
          s.life.people[b.id].loneliness * 0.5 + (p.profile?.hobbies.filter(h=>s.life.people[b.id].profile?.hobbies.includes(h)).length??0)*8 -
          ((s.trust[key(c.id, a.id)] || 0) +
            s.life.people[a.id].loneliness * 0.5 + (p.profile?.hobbies.filter(h=>s.life.people[a.id].profile?.hobbies.includes(h)).length??0)*8),
      )[Math.floor(random() * Math.min(3, candidates.length))];
      if (partner) {
        const q = s.life.people[partner.id];
        used.add(c.id);
        used.add(partner.id);
        const trustKey = key(c.id, partner.id),
          old = s.trust[trustKey] || 0;
        const civil =
          random() <
          (p.empathy + q.empathy + c.openness + partner.openness) / 400;
        const delta = civil ? 4 : -5;
        s.trust[trustKey] = Math.max(-100, Math.min(100, old + delta));
        p.loneliness = clamp(p.loneliness - 24);
        q.loneliness = clamp(q.loneliness - 24);
        p.stress = clamp(p.stress + (civil ? -3 : 4));
        q.stress = clamp(q.stress + (civil ? -3 : 4));
        p.activity = "Talking with " + partner.name;
        q.activity = "Talking with " + c.name;
        move(s, c.id, "council", -3);
        move(s, partner.id, "council", 3);
        const angle = ((used.size / 2 - 1) * Math.PI) / 3;
        c.x = 48 + Math.cos(angle) * 11 - 2;
        partner.x = c.x + 4;
        c.y = partner.y = 51 + Math.sin(angle) * 12;
        const topic =
          s.supplies < 15 ? "Food security" : "Beliefs and community";
        const id = event(
          out,
          "Conversation",
          [c.id, partner.id],
          c.name +
            " and " +
            partner.name +
            " discussed " +
            topic.toLowerCase() +
            ". Trust changed " +
            (delta > 0 ? "+" : "") +
            delta +
            ".",
          "Social needs and partner affinity selected a recorded encounter",
        );
        out.messages.push(
          {
            tick: s.tick,
            timeline: s.life.timeline,
            actionId: id,
            speaker: c.id,
            recipient: partner.id,
            location: "council",
            topic,
            text:
              topic === "Food security"
                ? "The pantry has " +
                  s.supplies +
                  " servings. Food needs our attention."
                : "My current outlook is " +
                  c.faction +
                  ". I want to compare perspectives.",
            source: "rule-template",
            visibility: old >= 30 ? "private in-world" : "public",
          },
          {
            tick: s.tick,
            timeline: s.life.timeline,
            actionId: id,
            speaker: partner.id,
            recipient: c.id,
            location: "council",
            topic,
            text: civil
              ? "I am willing to hear you out. We can keep comparing our views."
              : "We disagree. I am not convinced by this discussion.",
            source: "rule-template",
            visibility: old >= 30 ? "private in-world" : "public",
          },
        );
        if (old < 30 && s.trust[trustKey] >= 30)
          event(
            out,
            "Alliance",
            [c.id, partner.id],
            c.name +
              " and " +
              partner.name +
              " formed an alliance after repeated interactions.",
            "Trust crossed +30",
          );
        if (old > -20 && s.trust[trustKey] <= -20)
          event(
            out,
            "Conflict",
            [c.id, partner.id],
            c.name + " and " + partner.name + " entered an ongoing dispute.",
            "Trust crossed -20",
          );
        if (
          civil &&
          s.trust[trustKey] >= 10 &&
          c.faction !== partner.faction &&
          p.curiosity + c.openness > 100 &&
          random() < 0.35
        ) {
          const destination = Object.entries(q.beliefs).sort(
              (a, b) => b[1] - a[1],
            )[0][0],
            origin = Object.entries(p.beliefs).sort(
              (a, b) => b[1] - a[1],
            )[0][0];
          if (destination !== origin && p.beliefs[origin] > 0) {
            p.beliefs[origin]--;
            p.beliefs[destination]++;
            const ranked = Object.entries(p.beliefs).sort(
              (a, b) => b[1] - a[1],
            );
            c.conviction = ranked[0][1];
            c.faction =
              ranked[1][1] >= 25 && ranked[0][1] - ranked[1][1] <= 10
                ? ranked[0][0] + " / " + ranked[1][0] + " hybrid"
                : ranked[0][0];
            event(
              out,
              "Belief",
              [c.id, partner.id],
              c.name +
                " shifted one belief point from " +
                origin +
                " to " +
                destination +
                ".",
              "Trusted civil discussion, curiosity and openness",
            );
          }
        }
        continue;
      }
    }
    if (used.has(c.id)) continue;
    p.activity = "Studying";
    p.skill = clamp(p.skill + 0.3);
    c.openness = clamp(c.openness + 0.1);
    move(s, c.id, "archive", ((c.id % 4) - 1.5) * 4);
    event(
      out,
      "Study",
      [c.id],
      c.name + " studied in the archive. Skill increased.",
      "No higher-priority need or available social encounter",
    );
  }
  if (s.supplies > 1000)
    event(
      out,
      "Storage",
      [],
      "Discarded " +
        (s.supplies - 1000) +
        " surplus servings at the pantry capacity.",
      "Pantry storage cap is 1000 servings",
    );
  s.supplies = Math.max(0, Math.min(1000, s.supplies));
  if (
    Object.values(s.trust).filter((t) => t >= 30).length >= 4 &&
    s.governance === "Informal gathering"
  ) {
    s.governance = "Voluntary council";
    event(
      out,
      "Society",
      s.citizens.map((c) => c.id),
      "Repeated alliances supported a voluntary council.",
      "At least four trust-based alliances",
    );
  }
  if (
    totalMoney(s) !== s.life.issued ||
    Object.values(s.life.accounts).some(
      (n) => !Number.isSafeInteger(n) || n < 0,
    )
  )
    throw Error("Money conservation invariant failed");
  return out;
}
export const BUILDING_TYPES: Record<
  string,
  { cost: number; materials: number; capacity: number }
> = {
  hospital: { cost: 20000, materials: 30, capacity: 12 },
  farm: { cost: 12000, materials: 20, capacity: 4 },
  school: { cost: 16000, materials: 25, capacity: 12 },
  house: { cost: 10000, materials: 20, capacity: 4 },
  laboratory: { cost: 18000, materials: 25, capacity: 6 },
  market: { cost: 14000, materials: 20, capacity: 12 },
};
export function fundBuilding(
  previous: GenesisState,
  type: string,
  x: number,
  y: number,
): LifeResult | { error: string } {
  const s = upgradeLiving(previous),
    out = emptyResult(s),
    spec = BUILDING_TYPES[type];
  if (!spec)
    return {
      error:
        "Supported buildings: hospital, farm, school, house, laboratory, market.",
    };
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 6 ||
    x > 94 ||
    y < 10 ||
    y > 75
  )
    return { error: "Choose a site inside the buildable village area." };
  if (s.life.buildings.filter((b) => b.progress < 100).length >= 3)
    return { error: "At most three projects can be under construction." };
  if (s.life.buildings.some((b) => Math.hypot(b.x - x, b.y - y) < 11))
    return { error: "This site overlaps another building." };
  if (s.life.accounts.treasury < spec.cost || s.life.materials < spec.materials)
    return { error: "Insufficient public funds or construction materials." };
  const building: Building = {
    id: "building-" + s.tick + "-" + s.life.buildings.length,
    type,
    x,
    y,
    owner: "Village",
    capacity: spec.capacity,
    condition: 100,
    progress: 0,
    labor: 0,
    cost: spec.cost,
    started: s.tick,
  };
  const id = event(
    out,
    "Construction",
    [],
    type +
      " funded at (" +
      Math.round(x) +
      ", " +
      Math.round(y) +
      "). Builders need 12 shifts to complete it.",
    "Public funds, materials, site bounds and collision checks passed",
    "user-command",
  );
  transfer(
    s,
    out,
    "treasury",
    "cooperative",
    spec.cost,
    "Construction contract: " + type,
    id,
  );
  s.life.materials -= spec.materials;
  s.life.buildings.push(building);
  return out;
}
export function scenario(previous: GenesisState, kind: string): LifeResult {
  const s = upgradeLiving(previous),
    out = emptyResult(s);
  if (kind === "shortage") {
    s.supplies = Math.floor(s.supplies / 4);
    s.life.shortageUntil = s.tick + 12;
    event(
      out,
      "World event",
      s.citizens.map((c) => c.id),
      "A three-day food shortage reduced the pantry to " +
        s.supplies +
        " servings and temporarily lowered harvest yields.",
      "Player-confirmed scenario",
      "user-command",
    );
  } else {
    s.life.lightUntil = s.tick + 4;
    for (const p of Object.values(s.life.people))
      p.stress = clamp(p.stress + (p.risk < 40 ? 8 : 2));
    event(
      out,
      "World event",
      s.citizens.map((c) => c.id),
      "An unexplained light was introduced for one day. Stress responses varied with risk tolerance. No explanation has been established.",
      "Player-confirmed fictional scenario",
      "user-command",
    );
  }
  return out;
}
