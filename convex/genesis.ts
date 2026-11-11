import {
  mutation,
  query,
  type MutationCtx,
  type DatabaseReader,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { initialState, type GenesisState } from "../data/genesisEngine";
import { applyCommand } from "../data/genesisCommands";
import {
  advanceLiving,
  upgradeLiving,
  emptyResult,
  fundBuilding,
  scenario,
  type LivingState,
  type LifeResult,
  type LifeEvent,
  BUILDING_TYPES,
  money,
} from "../data/genesisLife";
const load = (ctx: { db: DatabaseReader }) =>
  ctx.db
    .query("genesisSessions")
    .withIndex("key", (q) => q.eq("key", "genesis-v1"))
    .unique();
async function opening(ctx: MutationCtx, state: LivingState, reason: string) {
  for (const [account, amount] of Object.entries(state.life.accounts))
    if (amount > 0)
      await ctx.db.insert("genesisTransactions", {
        tick: state.tick,
        timeline: state.life.timeline,
        actionId: "opening:" + state.life.timeline,
        from: "opening-balance",
        to: account,
        amount,
        reason,
      });
}
async function ensure(ctx: MutationCtx, doc: Doc<"genesisSessions">) {
  if (!(doc.state as LivingState).life) {
    await ctx.db.insert("genesisCheckpoints", {
      label: "Before daily-life migration",
      state: doc.state,
      tick: doc.state.tick,
      createdAt: Date.now(),
    });
    const state = upgradeLiving(doc.state);
    await opening(ctx, state, "Initial daily-life allocation");
    await ctx.db.patch(doc._id, {
      state,
      revision: doc.revision ?? 0,
      lastActive: Date.now(),
    });
    await ctx.db.insert("genesisEvents", {
      tick: state.tick,
      kind: "Migration",
      actors: [],
      text: "Daily-life systems enabled. Opening balances were allocated; earlier people, relationships and events were preserved.",
      source: "migration",
      reason: "Version 1 to 2 additive migration",
      actionId: "migration:2",
      timeline: 0,
    });
    return { ...doc, state, revision: doc.revision ?? 0 };
  }
  return doc;
}
async function persist(
  ctx: MutationCtx,
  doc: Doc<"genesisSessions">,
  out: LifeResult,
) {
  await ctx.db.patch(doc._id, {
    state: out.state,
    revision: (doc.revision ?? 0) + 1,
    lastActive: Date.now(),
  });
  for (const e of out.events) await ctx.db.insert("genesisEvents", e);
  for (const t of out.transactions)
    await ctx.db.insert("genesisTransactions", t);
  for (const m of out.messages) await ctx.db.insert("genesisChat", m);
  return {
    ok: true,
    message: "Saved.",
    tick: out.state.tick,
    revision: (doc.revision ?? 0) + 1,
  };
}
function commandEvent(
  s: LivingState,
  revision: number,
  text: string,
  actors: number[] = [],
): LifeEvent {
  return {
    tick: s.tick,
    kind: "Command",
    actors,
    text,
    reason: "Validated owner command",
    source: "user-command",
    actionId: "command:" + s.life.timeline + ":" + revision,
    timeline: s.life.timeline,
  };
}
function batch(state: GenesisState, steps: number) {
  let s = upgradeLiving(state);
  const all = emptyResult(s);
  for (let i = 0; i < steps; i++) {
    const result = advanceLiving(s);
    s = result.state;
    all.events.push(...result.events);
    all.transactions.push(...result.transactions);
    all.messages.push(...result.messages);
  }
  all.state = s;
  return all;
}
export const current = query({
  args: {},
  handler: async (ctx) => {
    const doc = await load(ctx);
    if (!doc) return null;
    return {
      id: doc._id,
      state: upgradeLiving(doc.state),
      revision: doc.revision ?? 0,
      migrated: !!doc.state.life,
      lastActive: doc.lastActive ?? Date.now(),
    };
  },
});
export const history = query({
  args: { citizen: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const doc = await load(ctx),
      timeline = doc?.state.life?.timeline ?? 0;
    return (await ctx.db.query("genesisEvents").order("desc").take(1000))
      .filter(
        (e) =>
          (e.timeline ?? 0) === timeline &&
          (args.citizen === undefined || e.actors.includes(args.citizen)),
      )
      .slice(0, 100);
  },
});
export const chat = query({
  args: {
    citizen: v.optional(v.number()),
    search: v.optional(v.string()),
    faction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doc = await load(ctx);
    if (!doc) return [];
    const s = upgradeLiving(doc.state);
    return (await ctx.db.query("genesisChat").order("desc").take(500))
      .filter(
        (m) =>
          m.timeline === s.life.timeline &&
          (args.citizen === undefined ||
            m.speaker === args.citizen ||
            m.recipient === args.citizen) &&
          (!args.faction ||
            s.citizens.find((c) => c.id === m.speaker)?.faction ===
              args.faction) &&
          (!args.search ||
            m.text
              .toLowerCase()
              .includes(args.search.slice(0, 100).toLowerCase())),
      )
      .slice(0, 60);
  },
});
export const ledger = query({
  args: { citizen: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const doc = await load(ctx),
      timeline = doc?.state.life?.timeline ?? 0;
    return (await ctx.db.query("genesisTransactions").order("desc").take(1000))
      .filter(
        (t) =>
          t.timeline === timeline &&
          (args.citizen === undefined ||
            t.from === "citizen:" + args.citizen ||
            t.to === "citizen:" + args.citizen),
      )
      .slice(0, 100);
  },
});
export const checkpoints = query({
  args: {},
  handler: async (ctx) =>
    (await ctx.db.query("genesisCheckpoints").order("desc").take(50)).map(
      (c) => ({
        id: c._id,
        label: c.label,
        tick: c.tick,
        createdAt: c.createdAt,
      }),
    ),
});
export const begin = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await load(ctx);
    if (existing) {
      await ensure(ctx, existing);
      return existing._id;
    }
    const state = upgradeLiving(initialState());
    const id = await ctx.db.insert("genesisSessions", {
      key: "genesis-v1",
      state,
      revision: 0,
      lastActive: Date.now(),
    });
    await opening(ctx, state, "Initial daily-life allocation");
    return id;
  },
});
export const advance = mutation({
  args: {
    expectedTick: v.number(),
    expectedRevision: v.optional(v.number()),
    steps: v.number(),
    automatic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let doc = await load(ctx);
    if (!doc) throw Error("Begin Genesis first.");
    if (
      doc.state.tick !== args.expectedTick ||
      (args.expectedRevision !== undefined &&
        (doc.revision ?? 0) !== args.expectedRevision)
    )
      throw Error("World changed in another window; refresh and retry.");
    if (!Number.isInteger(args.steps) || args.steps < 1 || args.steps > 40)
      throw Error("Advance between 1 and 40 six-hour steps per request.");
    doc = await ensure(ctx, doc);
    if (args.automatic && doc.state.life.paused)
      throw Error("Civilization is globally paused.");
    const out = batch(doc.state, args.steps);
    if (!args.automatic)
      out.events.push(
        commandEvent(
          out.state,
          (doc.revision ?? 0) + 1,
          "Manually advanced " + args.steps + " six-hour steps.",
        ),
      );
    return await persist(ctx, doc, out);
  },
});
export const command = mutation({
  args: {
    text: v.string(),
    expectedTick: v.number(),
    expectedRevision: v.optional(v.number()),
    confirmed: v.optional(v.boolean()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let doc = await load(ctx);
    if (!doc) return { ok: false, message: "Begin Genesis first." };
    if (
      doc.state.tick !== args.expectedTick ||
      (args.expectedRevision !== undefined &&
        (doc.revision ?? 0) !== args.expectedRevision)
    )
      return { ok: false, message: "The world changed. Please submit again." };
    if (args.text.length > 240)
      return { ok: false, message: "Keep instructions under 240 characters." };
    const text = args.text
      .trim()
      .toLowerCase()
      .replace(/[.!]+$/, "")
      .replace(/\s+/g, " ");
    let out: LifeResult | undefined,
      message = "";
    if (/^(pause|pause all citizen activities|play|resume|watch)$/.test(text)) {
      doc = await ensure(ctx, doc);
      out = emptyResult(upgradeLiving(doc.state));
      out.state.life.paused = text.startsWith("pause");
      message = out.state.life.paused
        ? "All citizen autoplay paused. Manual time steps remain available."
        : "Citizen autoplay enabled while an observer page is visible.";
    }
    const problem = text.match(
      /^(?:give (?:the )?scientists (?:a )?(?:new )?research problem|research)(?::| )+(.+)$/,
    );
    if (problem) {
      doc = await ensure(ctx, doc);
      out = emptyResult(upgradeLiving(doc.state));
      out.state.life.researchProblem = problem[1].slice(0, 180);
      message = "Research problem saved: " + out.state.life.researchProblem;
    }
    const time = text.match(
      /^(?:advance|skip)(?: the simulation| simulation| time)?(?: by)? (\d+) (day|days|month|months|hours)$/,
    );
    if (time) {
      const n = Number(time[1]),
        steps =
          n *
          (time[2].startsWith("day")
            ? 4
            : time[2].startsWith("month")
              ? 120
              : 1 / 6);
      if (!Number.isInteger(steps) || steps < 1 || steps > 40)
        return {
          ok: false,
          message:
            "Use up to 10 days per command, or the month button for a bounded multi-batch advance.",
        };
      doc = await ensure(ctx, doc);
      out = batch(doc.state, steps);
      message = "Advanced " + n + " " + time[2] + ".";
    }
    const build = text.match(
      /^(?:build|construct|place)(?: a| an| the)? (hospital|farm|school|house|laboratory|market)$/,
    );
    if (build) {
      if (!args.confirmed)
        return {
          ok: false,
          pending: true,
          message:
            "Fund a " +
            build[1] +
            " for " +
            money(BUILDING_TYPES[build[1]].cost) +
            " and " +
            BUILDING_TYPES[build[1]].materials +
            " materials? Construction takes 12 builder shifts. Confirm to proceed.",
        };
      doc = await ensure(ctx, doc);
      const state = upgradeLiving(doc.state);
      const index = state.life.buildings.filter(
        (b) => b.type !== "House",
      ).length;
      const result = fundBuilding(
        state,
        build[1],
        args.x ?? 18 + (index % 4) * 21,
        args.y ?? 38 + Math.floor(index / 4) * 18,
      );
      if ("error" in result) return { ok: false, message: result.error };
      out = result;
      message =
        "Funded " +
        build[1] +
        ". Builders will construct it during work shifts.";
    }
    const shortage = /^(?:create|introduce)(?: a)? food shortage$/.test(text),
      light =
        /^(?:introduce|create)(?: a)? mysterious light(?: over the village)?$/.test(
          text,
        );
    if (shortage || light) {
      if (!args.confirmed)
        return {
          ok: false,
          pending: true,
          message: shortage
            ? "Reduce the pantry to 25% and lower harvests for three simulated days?"
            : "Introduce a one-day unexplained light and apply personality-based stress responses?",
        };
      doc = await ensure(ctx, doc);
      out = scenario(doc.state, shortage ? "shortage" : "light");
      message = "World event introduced and saved.";
    }
    if (!out) {
      const advanced = /^(?:advance|skip)/.test(text);
      if (advanced)
        return {
          ok: false,
          message: "Try “advance the simulation by 10 days”.",
        };
      const result = applyCommand(upgradeLiving(doc.state), args.text);
      if (!result.ok) return { ok: false, message: result.error };
      doc = await ensure(ctx, doc);
      out = emptyResult(upgradeLiving(result.state));
      for (const e of result.events)
        out.events.push({
          ...e,
          source: "user-command",
          reason: "Validated movement or meeting order",
          actionId: "command:" + (doc.revision ?? 0) + ":" + out.events.length,
          timeline: out.state.life.timeline,
        });
      for (const id of out.events.flatMap((e) => e.actors)) {
        const p = out.state.life.people[id];
        if (p) {
          p.activity = "Following your instruction";
          p.location =
            [
              "gardens",
              "observatory",
              "archive",
              "council",
              "homes",
              "workshop",
            ].find((place) => new RegExp("\\b" + place + "\\b").test(text)) ??
            "council";
        }
      }
      message = result.message;
    }
    if (!/^(play|resume|watch)$/.test(text)) out.state.life.paused = true;
    if (!out.events.some((e) => e.kind === "Command" && e.text === message))
      out.events.push(
        commandEvent(out.state, (doc.revision ?? 0) + 1, message),
      );
    const saved = await persist(ctx, doc, out);
    return { ...saved, message };
  },
});
export const checkpoint = mutation({
  args: { label: v.string() },
  handler: async (ctx, args) => {
    const doc = await load(ctx);
    if (!doc) throw Error("No world yet");
    if ((await ctx.db.query("genesisCheckpoints").take(50)).length >= 50)
      throw Error("Checkpoint limit reached (50).");
    return await ctx.db.insert("genesisCheckpoints", {
      label: args.label.slice(0, 80) || "Manual save",
      state: doc.state,
      tick: doc.state.tick,
      createdAt: Date.now(),
    });
  },
});
export const restore = mutation({
  args: { id: v.id("genesisCheckpoints"), confirmed: v.boolean() },
  handler: async (ctx, args) => {
    if (!args.confirmed) throw Error("Restore requires confirmation");
    let doc = await load(ctx);
    const checkpoint = await ctx.db.get(args.id);
    if (!doc || !checkpoint) throw Error("World or checkpoint missing");
    if ((await ctx.db.query("genesisCheckpoints").take(50)).length >= 50)
      throw Error("Checkpoint limit reached (50).");
    doc = await ensure(ctx, doc);
    await ctx.db.insert("genesisCheckpoints", {
      label: "Before restore",
      state: doc.state,
      tick: doc.state.tick,
      createdAt: Date.now(),
    });
    const state = upgradeLiving(checkpoint.state);
    state.life.timeline = (doc.state.life?.timeline ?? 0) + 1;
    const out = emptyResult(state);
    out.events.push(
      commandEvent(
        state,
        (doc.revision ?? 0) + 1,
        "Restored checkpoint: " +
          checkpoint.label +
          ". Earlier timelines remain archived.",
      ),
    );
    await opening(ctx, state, "Restored timeline opening balances");
    return await persist(ctx, doc, out);
  },
});
export const catchUp = mutation({
  args: { expectedRevision: v.number() },
  handler: async (ctx, args) => {
    let doc = await load(ctx);
    if (!doc) throw Error("Begin Genesis first");
    if ((doc.revision ?? 0) !== args.expectedRevision)
      throw Error("World changed; retry catch-up");
    const steps = Math.min(
      40,
      Math.max(
        0,
        Math.floor((Date.now() - (doc.lastActive ?? Date.now())) / 60000),
      ),
    );
    if (!steps)
      return {
        ok: true,
        message:
          "No away time to catch up yet (one six-hour step per real minute).",
        tick: doc.state.tick,
        revision: doc.revision ?? 0,
      };
    doc = await ensure(ctx, doc);
    const out = batch(doc.state, steps);
    out.events.push(
      commandEvent(
        out.state,
        (doc.revision ?? 0) + 1,
        "Caught up " +
          steps +
          " six-hour steps after time away; capped at ten days.",
      ),
    );
    const saved = await persist(ctx, doc, out);
    return {
      ...saved,
      message: "Catch-up saved: " + steps + " six-hour steps.",
    };
  },
});
