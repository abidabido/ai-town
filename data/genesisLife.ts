import { evolveFamilies } from "./genesisFamilies";
import { profileFor } from "./genesisProfiles";
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
  profile?: import("./genesisProfiles").CitizenProfile;
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
  inquiry?: InquiryState;
  memory?: import("./genesisMemory").MemoryState;
  families?: import("./genesisFamilies").FamilyState;
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
    for (const c of s.citizens)
      s.life.people[c.id].profile = profileFor(c, s.life.people[c.id]);
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
  for (const c of s.citizens)
    s.life.people[c.id].profile = profileFor(c, s.life.people[c.id]);
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
export function advanceLiving(
  previous: GenesisState,
  options: { inquiry?: boolean } = {},
): LifeResult {
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
  const researchUsed = options.inquiry === false ? [] : inquiryEvening(out);
  const used = new Set<number>(researchUsed);
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
    if (researchUsed.includes(c.id)) continue;
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
        const yieldAmount = cropYield(
          s.life.weather,
          workingFarms(s),
          s.life.shortageUntil > s.tick,
          p.skill,
        );
        s.supplies += yieldAmount;
        move(s, c.id, "gardens", ((c.id % 4) - 1.5) * 4);
        out.events[out.events.length - 1].text +=
          " Produced " + yieldAmount + " food servings.";
        if (options.inquiry !== false)
          observeHarvest(out, c.id, yieldAmount, id);
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
          s.life.people[b.id].loneliness * 0.5 +
          (p.profile?.hobbies.filter((h) =>
            s.life.people[b.id].profile?.hobbies.includes(h),
          ).length ?? 0) *
            8 -
          ((s.trust[key(c.id, a.id)] || 0) +
            s.life.people[a.id].loneliness * 0.5 +
            (p.profile?.hobbies.filter((h) =>
              s.life.people[a.id].profile?.hobbies.includes(h),
            ).length ?? 0) *
              8),
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
            text: conversationLine({
              id: c.id,
              tick: s.tick,
              traits: p.profile?.traits,
              faction: c.faction,
              food: topic === "Food security",
              civil,
              responding: false,
              trust: old,
              hobby: p.profile?.hobbies[0],
              sharedMemory: !!s.life.memory?.diaries[c.id]?.some(
                (m) =>
                  m.kind === "Conversation" &&
                  m.participants.includes(partner.id),
              ),
            }),
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
            text: conversationLine({
              id: partner.id,
              tick: s.tick,
              traits: q.profile?.traits,
              faction: partner.faction,
              food: topic === "Food security",
              civil,
              responding: true,
              trust: old,
              hobby: q.profile?.hobbies[0],
              sharedMemory: !!s.life.memory?.diaries[partner.id]?.some(
                (m) =>
                  m.kind === "Conversation" && m.participants.includes(c.id),
              ),
            }),
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
  evolveFamilies(out);
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
export function conversationLine(context: {
  id: number;
  tick: number;
  traits?: Record<string, number>;
  faction: string;
  food: boolean;
  civil: boolean;
  responding: boolean;
  trust: number;
  hobby?: string;
  sharedMemory: boolean;
}): string {
  const t = context.traits ?? {},
    n = Math.abs(context.tick + context.id * 17),
    pick = (lines: string[]) => lines[n % lines.length];
  if (context.responding) {
    if (!context.civil)
      return (t.Skepticism ?? 0) >= 70
        ? "That’s a big leap. What would count as evidence?"
        : (t.Humor ?? 0) >= 70
          ? "I’m putting that in the “needs more convincing” pile."
          : pick([
              "I don’t see it that way. Can we look at it from another angle?",
              "I hear you, but I’m not convinced.",
              "We disagree on this one. What am I missing?",
            ]);
    return context.sharedMemory && context.trust >= 30
      ? "I’m glad we can keep talking about this, even when we see things differently."
      : (t.Empathy ?? 0) >= 70
        ? "I want to understand your point of view. Tell me a little more."
        : pick([
            "That’s a fair question. Let’s think it through.",
            "I’m listening. What makes you see it that way?",
            "We might learn something by comparing notes.",
          ]);
  }
  if (context.food)
    return pick([
      "Have you eaten? Maybe we should talk about keeping everyone fed.",
      "I’d feel better knowing there’s enough food for everyone. What could we do?",
    ]);
  const ideas: Record<string, string> = {
    Materialists: "what can we actually measure here?",
    Idealists: "how much does our experience shape what we call real?",
    Skeptics: "what would change your mind about this?",
    Neuroscientists: "how much of this comes down to the way a mind works?",
    Mystics: "have we really explained everything we experience?",
    Empiricists: "could we test the idea before deciding?",
  };
  const idea =
    ideas[context.faction] ??
    "how could we compare our ideas about village life?";
  const lead =
    (t.Confidence ?? 50) < 35
      ? "I might be wrong, but "
      : (t.Humor ?? 0) >= 70
        ? "Before we solve the entire universe: "
        : pick([
            "I’ve been wondering: ",
            "Here’s my question: ",
            "What do you think—",
          ]);
  const hobby =
    context.hobby && (t.Sociability ?? 0) >= 70
      ? "I could talk about " + context.hobby.toLowerCase() + " for hours. "
      : "";
  return hobby + lead + idea;
}

// Curiosity pilot: bounded in-world measurements and a shared production-rule test.
export type HarvestObservation = {
  id: string;
  tick: number;
  actor: number;
  weather: string;
  yield: number;
  skill: number;
  farms: number;
  shortage: boolean;
};
export type InquiryTrial = {
  weather: "Clear" | "Rain";
  skill: number;
  farms: number;
  shortage: false;
  yield: number;
  actionId: string;
};
export type InquiryProject = {
  id: string;
  owner: number;
  peer?: number;
  question: string;
  stage: "question" | "planned" | "tested" | "concluded";
  started: number;
  changed: number;
  observations: HarvestObservation[];
  questionAction: string;
  discussionAction?: string;
  planAction?: string;
  testAction?: string;
  findingAction?: string;
  trials: InquiryTrial[];
  beliefHistory?: {
    actor: number;
    tick: number;
    weather: number;
    skill: number;
    actionId: string;
  }[];
  confidence: Record<
    string,
    { weather: number; skill: number; evidence: string[] }
  >;
  notebook: { tick: number; actionId: string; text: string }[];
  result?: {
    weatherEffect: number;
    skillEffect: number;
    weatherConfidence: number;
    skillConfidence: number;
  };
};
export type InquiryState = {
  version: 1;
  observations: Record<string, HarvestObservation[]>;
  projects: InquiryProject[];
  lastTick: number;
  lastTimeline: number;
};
export function cropYield(
  weather: string,
  farms: number,
  shortage: boolean,
  skill = 0,
) {
  if (
    !["Clear", "Rain", "Overcast"].includes(weather) ||
    !Number.isInteger(farms) ||
    farms < 0 ||
    farms > 128 ||
    !Number.isFinite(skill) ||
    skill < 0 ||
    skill > 100
  )
    throw Error("Invalid crop-model conditions");
  return shortage ? 2 : (weather === "Rain" ? 10 : 8) + farms * 2;
}
export function evaluateInquiryTrials(trials: InquiryTrial[]) {
  if (trials.length !== 4) throw Error("Four controlled trials are required");
  const first = trials[0];
  if (
    trials.some(
      (t) =>
        t.farms !== first.farms ||
        t.shortage !== false ||
        !Number.isFinite(t.yield) ||
        t.yield < 0 ||
        !t.actionId,
    ) ||
    new Set(trials.map((t) => t.weather + ":" + t.skill)).size !== 4
  )
    throw Error("The trial conditions are not comparable");
  for (const weather of ["Clear", "Rain"])
    for (const skill of [25, 75])
      if (!trials.some((t) => t.weather === weather && t.skill === skill))
        throw Error("A planned condition is missing");
  const mean = (pick: (t: InquiryTrial) => boolean) =>
    trials.filter(pick).reduce((n, t) => n + t.yield, 0) / 2;
  const weatherEffect =
      mean((t) => t.weather === "Rain") - mean((t) => t.weather === "Clear"),
    skillEffect = mean((t) => t.skill === 75) - mean((t) => t.skill === 25);
  return {
    weatherEffect,
    skillEffect,
    weatherConfidence: weatherEffect > 0 ? 0.9 : 0.1,
    skillConfidence: skillEffect > 0 ? 0.9 : 0.1,
  };
}
function inquiryState(s: LivingState): InquiryState {
  return (s.life.inquiry ??= {
    version: 1,
    observations: {},
    projects: [],
    lastTick: -1,
    lastTimeline: s.life.timeline,
  });
}
function workingFarms(s: LivingState) {
  return s.life.buildings.filter(
    (b) => b.type === "farm" && b.progress === 100 && b.condition > 0,
  ).length;
}
function observeHarvest(
  out: LifeResult,
  id: number,
  amount: number,
  source: string,
) {
  const s = out.state,
    r = inquiryState(s),
    person = s.life.people[id];
  const observation: HarvestObservation = {
    id: source,
    tick: s.tick,
    actor: id,
    weather: s.life.weather,
    yield: amount,
    skill: person.skill,
    farms: workingFarms(s),
    shortage: s.life.shortageUntil > s.tick,
  };
  if ((r.observations[id] ?? []).some((o) => o.id === source)) return;
  r.observations[id] = [...(r.observations[id] ?? []), observation].slice(-12);
  if (
    r.projects.length ||
    person.curiosity < 40 ||
    person.stress >= 65 ||
    person.hunger >= 60
  )
    return;
  const prior = r.observations[id]
    .slice(0, -1)
    .reverse()
    .find(
      (o) =>
        !o.shortage &&
        !observation.shortage &&
        o.farms === observation.farms &&
        o.weather !== observation.weather &&
        o.yield !== observation.yield,
    );
  const draw = ((Math.imul(id + 1, 1103515245) ^ s.tick ^ s.seed) >>> 0) % 100;
  if (!prior || draw >= person.curiosity) return;
  const citizen = s.citizens.find((c) => c.id === id)!;
  const rainObservation = prior.weather === "Rain" ? prior : observation;
  const dryObservation = prior.weather === "Rain" ? observation : prior;
  const initialWeather =
    rainObservation.yield > dryObservation.yield ? 0.55 : 0.45;
  const initialSkill =
    prior.skill === observation.skill
      ? 0.5
      : (
            prior.skill > observation.skill
              ? prior.yield > observation.yield
              : observation.yield > prior.yield
          )
        ? 0.55
        : 0.45;
  const action = event(
    out,
    "ResearchQuestion",
    [id],
    citizen.name +
      " noticed that their harvest changed from " +
      prior.yield +
      " to " +
      amount +
      " servings and asked whether weather or experience explained the difference.",
    "Two personal harvest observations differed; curiosity outweighed current pressures.",
    "research-rule-engine",
  );
  r.projects.push({
    id: "harvest:" + s.life.timeline + ":" + s.tick + ":" + id,
    owner: id,
    question:
      "Why do my harvests change: weather, growing experience, or something else?",
    stage: "question",
    started: s.tick,
    changed: s.tick,
    observations: [{ ...prior }, { ...observation }],
    questionAction: action,
    trials: [],
    beliefHistory: [
      {
        actor: id,
        tick: s.tick,
        weather: initialWeather,
        skill: initialSkill,
        actionId: action,
      },
    ],
    confidence: {
      [id]: {
        weather: initialWeather,
        skill: initialSkill,
        evidence: [prior.id, observation.id],
      },
    },
    notebook: [
      {
        tick: s.tick,
        actionId: action,
        text: "A question from two personal harvests. Both weather and experience changed; this is correlation, not a conclusion.",
      },
    ],
  });
}
function researchReady(s: LivingState, id: number) {
  const p = s.life.people[id];
  return (
    !!p &&
    s.citizens.some((c) => c.id === id) &&
    p.ageAtStart + Math.floor((s.tick - s.life.startedTick) / 1440) >= 18 &&
    p.hunger + 12 < 45 &&
    p.fatigue + 15 < 85 &&
    p.health >= 65 &&
    p.stress < 65 &&
    p.loneliness < 70
  );
}
function inquiryEvening(out: LifeResult): number[] {
  const s = out.state;
  if (s.tick % 4 !== 3 || !s.life.inquiry) return [];
  const r = s.life.inquiry;
  if (r.lastTick === s.tick && r.lastTimeline === s.life.timeline) return [];
  r.lastTick = s.tick;
  r.lastTimeline = s.life.timeline;
  const project = r.projects.find((p) => p.stage !== "concluded");
  if (!project || s.supplies < 20 || !researchReady(s, project.owner))
    return [];
  const name = (id: number) =>
    s.citizens.find((c) => c.id === id)?.name ?? "A former villager";
  if (project.stage === "question") {
    const peer = s.citizens
      .filter(
        (c) =>
          c.id !== project.owner &&
          researchReady(s, c.id) &&
          s.life.people[c.id].curiosity >= 40 &&
          (s.trust[key(project.owner, c.id)] ?? 0) >= 0,
      )
      .sort(
        (a, b) =>
          s.life.people[b.id].curiosity +
            s.life.people[b.id].skill -
            s.life.people[a.id].curiosity -
            s.life.people[a.id].skill || a.id - b.id,
      )[0];
    if (!peer) return [];
    project.peer = peer.id;
    const a = project.observations[0],
      b = project.observations[1],
      actors = [project.owner, peer.id];
    for (const id of actors) {
      move(s, id, "observatory", id === project.owner ? -2 : 2);
      s.life.people[id].activity = "Comparing harvest explanations";
      s.life.people[id].fatigue = clamp(s.life.people[id].fatigue + 6);
      s.life.people[id].loneliness = clamp(s.life.people[id].loneliness - 12);
    }
    const discussion = event(
      out,
      "ResearchDiscussion",
      actors,
      name(project.owner) +
        " shared two harvest observations with " +
        name(peer.id) +
        ". They compared weather with a competing explanation: growing experience.",
      "An available, curious collaborator listened to the owner’s recorded measurements. No other citizen received these observations.",
      "research-rule-engine",
    );
    project.discussionAction = discussion;
    project.confidence[peer.id] = {
      weather: 0.5,
      skill: 0.5,
      evidence: [a.id, b.id, discussion],
    };
    (project.beliefHistory ??= []).push({
      actor: peer.id,
      tick: s.tick,
      weather: 0.5,
      skill: 0.5,
      actionId: discussion,
    });
    out.messages.push(
      {
        tick: s.tick,
        timeline: s.life.timeline,
        actionId: discussion,
        speaker: project.owner,
        recipient: peer.id,
        location: "observatory",
        topic: "Harvest investigation · correlation and cause",
        text:
          "I collected " +
          a.yield +
          " servings in " +
          a.weather.toLowerCase() +
          " weather and " +
          b.yield +
          " in " +
          b.weather.toLowerCase() +
          ". " +
          (a.skill !== b.skill
            ? "My experience changed too. "
            : "My recorded experience stayed the same. ") +
          "Is weather the cause, or am I just getting better?",
        source: "rule-template",
        visibility: "public",
      },
      {
        tick: s.tick,
        timeline: s.life.timeline,
        actionId: discussion,
        speaker: peer.id,
        recipient: project.owner,
        location: "observatory",
        topic: "Harvest investigation · competing explanation",
        text:
          (a.skill !== b.skill
            ? "Both things changed, so those harvests alone can’t tell us. "
            : "Your recorded experience stayed the same, which already challenges a skill-only explanation. ") +
          "Growing experience is another explanation worth testing. Let’s compare weather and experience separately, with the same number of farms and no shortage.",
        source: "rule-template",
        visibility: "public",
      },
    );
    const plan = event(
      out,
      "ResearchPlan",
      actors,
      name(project.owner) +
        " and " +
        name(peer.id) +
        " planned four controlled crop-model trials: clear or rainy conditions, each at experience 25 and 75.",
      "A two-factor comparison holds farms and shortage conditions fixed. It is a bounded game-model test, not an external scientific experiment.",
      "research-rule-engine",
    );
    project.planAction = plan;
    project.stage = "planned";
    project.changed = s.tick;
    project.notebook.push(
      {
        tick: s.tick,
        actionId: discussion,
        text: "Two people discussed two explanations; only the participants gained the shared evidence.",
      },
      {
        tick: s.tick,
        actionId: plan,
        text: "Prediction A: rain increases yield at fixed experience. Prediction B: greater experience increases yield at fixed weather. Test both independently. Equipment costs two village materials; no food will be created by virtual trials.",
      },
    );
    return actors;
  }
  if (project.peer === undefined || !researchReady(s, project.peer)) return [];
  const actors = [project.owner, project.peer];
  if (project.stage === "planned") {
    if (s.life.materials < 2) return [];
    const farms = workingFarms(s),
      trials: InquiryTrial[] = [];
    for (const weather of ["Clear", "Rain"] as const)
      for (const skill of [25, 75])
        trials.push({
          weather,
          skill,
          farms,
          shortage: false,
          yield: cropYield(weather, farms, false, skill),
          actionId: "",
        });
    s.life.materials -= 2;
    for (const id of actors) {
      move(s, id, "observatory", id === project.owner ? -2 : 2);
      s.life.people[id].activity = "Running controlled harvest-model tests";
      s.life.people[id].fatigue = clamp(s.life.people[id].fatigue + 6);
    }
    const action = event(
      out,
      "ResearchTest",
      actors,
      name(project.owner) +
        " and " +
        name(project.peer) +
        " used two materials to run four virtual crop-model trials. " +
        trials
          .map(
            (t) =>
              t.weather +
              ", experience " +
              t.skill +
              ": " +
              t.yield +
              " servings",
          )
          .join("; ") +
        ". Farms held at " +
        farms +
        "; shortages off; no food was created.",
      "The same cropYield function used by real farmer work produced these results. Both participants were available and observed the results.",
      "research-rule-engine",
    );
    for (const trial of trials) trial.actionId = action;
    project.trials = trials;
    project.testAction = action;
    project.stage = "tested";
    project.changed = s.tick;
    for (const id of actors) project.confidence[id].evidence.push(action);
    project.notebook.push({
      tick: s.tick,
      actionId: action,
      text: "Four measurements recorded from the shared game production rule. These test conditions are controlled model runs, not observations of a sudden weather change in the village.",
    });
    return actors;
  }
  const result = evaluateInquiryTrials(project.trials);
  project.result = result;
  for (const id of actors) {
    move(s, id, "observatory", id === project.owner ? -2 : 2);
    s.life.people[id].activity = "Reviewing harvest evidence";
    s.life.people[id].fatigue = clamp(s.life.people[id].fatigue + 6);
    project.confidence[id] = {
      weather: result.weatherConfidence,
      skill: result.skillConfidence,
      evidence: [...project.confidence[id].evidence],
    };
  }
  const finding = event(
    out,
    "ResearchFinding",
    actors,
    name(project.owner) +
      " and " +
      name(project.peer) +
      " recorded their finding: rain changed the trial yield by " +
      result.weatherEffect +
      " servings; greater experience changed it by " +
      result.skillEffect +
      ". They revised their two research beliefs and saved the notebook.",
    "Confidence follows the recorded contrasts, not charisma or faction. Findings apply to the tested game rule and conditions only.",
    "research-rule-engine",
  );
  project.findingAction = finding;
  project.stage = "concluded";
  project.changed = s.tick;
  for (const id of actors) {
    project.confidence[id].evidence.push(finding);
    (project.beliefHistory ??= []).push({
      actor: id,
      tick: s.tick,
      weather: project.confidence[id].weather,
      skill: project.confidence[id].skill,
      actionId: finding,
    });
  }
  project.notebook.push({
    tick: s.tick,
    actionId: finding,
    text:
      "Evidence review: weather confidence " +
      Math.round(result.weatherConfidence * 100) +
      "%; experience confidence " +
      Math.round(result.skillConfidence * 100) +
      "%. These are bounded model-belief scores, not statistical probabilities or proof about real crops.",
  });
  out.messages.push(
    {
      tick: s.tick,
      timeline: s.life.timeline,
      actionId: finding,
      speaker: project.peer,
      recipient: project.owner,
      location: "observatory",
      topic: "Harvest investigation · reviewing evidence",
      text:
        "Changing experience altered yield by " +
        result.skillEffect +
        " in the controlled trials. " +
        (result.skillEffect > 0
          ? "That supports an experience effect here."
          : "I’m lowering my confidence in the experience explanation. The results don’t support it here."),
      source: "rule-template",
      visibility: "public",
    },
    {
      tick: s.tick,
      timeline: s.life.timeline,
      actionId: finding,
      speaker: project.owner,
      recipient: project.peer,
      location: "observatory",
      topic: "Harvest investigation · limits of the finding",
      text:
        "The rain comparison changed yield by " +
        result.weatherEffect +
        ". " +
        (result.weatherEffect > 0
          ? "That supports a weather effect in these conditions."
          : "That doesn’t support our rain prediction here.") +
        " We should keep the limits of the test with the result.",
      source: "rule-template",
      visibility: "public",
    },
  );
  return actors;
}
