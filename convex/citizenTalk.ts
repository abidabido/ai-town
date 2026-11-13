import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { upgradeLiving } from "../data/genesisLife";
import {
  talkExchange,
  type TalkEntry,
  type TalkChannel,
} from "../data/genesisTalk";
export const thread = query({
  args: { worldId: v.id("genesisSessions"), citizen: v.number() },
  handler: async (ctx, a) => {
    const world = await ctx.db.get(a.worldId);
    if (!world || world.key !== "genesis-v1") return [];
    const s = upgradeLiving(world.state);
    if (!s.citizens.some((c) => c.id === a.citizen)) return [];
    const row = await ctx.db
      .query("genesisCitizenTalks")
      .withIndex("thread", (q) =>
        q
          .eq("worldId", a.worldId)
          .eq("timeline", s.life.timeline)
          .eq("citizen", a.citizen),
      )
      .unique();
    return ((row?.entries ?? []) as TalkEntry[]).filter((e) =>
      e.participants.includes(a.citizen),
    );
  },
});
export const send = mutation({
  args: {
    worldId: v.id("genesisSessions"),
    citizen: v.number(),
    channel: v.string(),
    message: v.string(),
    identify: v.boolean(),
    requestId: v.string(),
  },
  handler: async (ctx, a) => {
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(a.requestId))
      return { ok: false, message: "Please retry your message." };
    const world = await ctx.db.get(a.worldId);
    if (!world || world.key !== "genesis-v1")
      return { ok: false, message: "Open the saved village first." };
    const s = upgradeLiving(world.state),
      timeline = s.life.timeline;
    const row = await ctx.db
      .query("genesisCitizenTalks")
      .withIndex("thread", (q) =>
        q
          .eq("worldId", a.worldId)
          .eq("timeline", timeline)
          .eq("citizen", a.citizen),
      )
      .unique();
    const history = (row?.entries ?? []) as TalkEntry[],
      id = "talk-" + a.requestId;
    const duplicate = history.find((e) => e.id === id + "-player");
    if (duplicate) {
      const same =
        duplicate.body === a.message.trim() && duplicate.channel === a.channel;
      return {
        ok: same,
        message: same
          ? "That message is already saved."
          : "That request belongs to an earlier message. Please send again.",
      };
    }
    const now = Date.now();
    if (row && now - row.updatedAt < 2000)
      return {
        ok: false,
        message: "Give them a moment before sending another message.",
      };
    let result: ReturnType<typeof talkExchange>;
    try {
      result = talkExchange(
        s,
        {
          citizen: a.citizen,
          channel: a.channel as TalkChannel,
          message: a.message,
          identify: a.identify,
        },
        history,
        id,
        now,
      );
    } catch (e) {
      return {
        ok: false,
        message:
          e instanceof Error
            ? e.message
            : "That message did not save. Please try again.",
      };
    }
    const record = {
      worldId: a.worldId,
      citizen: a.citizen,
      timeline,
      entries: [...history, ...result.entries].slice(-60),
      updatedAt: now,
    };
    if (row) await ctx.db.patch(row._id, record);
    else await ctx.db.insert("genesisCitizenTalks", record);
    await ctx.db.patch(world._id, {
      state: result.state,
      revision: (world.revision ?? 0) + 1,
      lastActive: now,
    });
    await ctx.db.insert("genesisEvents", {
      tick: s.tick,
      timeline,
      actionId: id,
      source: "citizen-talk-rule-engine",
      kind: "PrivateConversation",
      actors: [a.citizen],
      text:
        "A private conversation with " +
        s.citizens.find((c) => c.id === a.citizen)!.name +
        " was recorded.",
      reason:
        "Only the participant receives the message; original text is kept in the participant thread, not public village news.",
    });
    return {
      ok: true,
      message:
        "Message and reply saved. Limited rules-based response; no language model was used.",
    };
  },
});
