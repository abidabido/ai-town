import { action, internalMutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  buildMedicalReview,
  medicalUrl,
  MEDICAL_PROTOCOL,
} from "../data/genesisMedical";
export const latest = query({
  args: { worldId: v.id("genesisSessions") },
  handler: async (ctx, a) =>
    ctx.db
      .query("genesisMedicalReviews")
      .withIndex("world", (q) => q.eq("worldId", a.worldId))
      .order("desc")
      .take(10),
});
export const reserve = internalMutation({
  args: { worldId: v.id("genesisSessions") },
  handler: async (ctx, a) => {
    const world = await ctx.db.get(a.worldId);
    if (!world) throw Error("Open your saved village first.");
    const atlas = world.state.citizens.find(
      (c: any) =>
        c.name.toLowerCase() === "dr. atlas" &&
        (world.state.life?.people?.[String(c.id)]?.ageAtStart ?? 0) >= 18,
    );
    if (!atlas) throw Error("Add adult Dr. Atlas to the village first.");
    const rows = await ctx.db
      .query("genesisMedicalReviews")
      .withIndex("world", (q) => q.eq("worldId", a.worldId))
      .order("desc")
      .take(10);
    const now = Date.now();
    const ready = rows.find(
      (r) => r.status === "ready" && now - r.createdAt < 86400000,
    );
    if (ready) return { cached: true, id: ready._id };
    if (rows.some((r) => r.status === "pending" && now - r.createdAt < 120000))
      throw Error("A review is already running. Please check back shortly.");
    if (rows.some((r) => r.status === "failed" && now - r.createdAt < 300000))
      throw Error(
        "The last search failed. Please wait five minutes before retrying.",
      );
    if (rows.filter((r) => now - r.createdAt < 86400000).length >= 2)
      throw Error("The daily research limit is reached. Try tomorrow.");
    return {
      cached: false,
      id: await ctx.db.insert("genesisMedicalReviews", {
        worldId: a.worldId,
        protocol: MEDICAL_PROTOCOL,
        atlas: atlas.id,
        createdAt: now,
        status: "pending",
      }),
    };
  },
});
export const finish = internalMutation({
  args: {
    id: v.id("genesisMedicalReviews"),
    review: v.optional(v.any()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const row = await ctx.db.get(a.id);
    if (!row || row.status !== "pending")
      throw Error("Research run is no longer pending.");
    if (a.review)
      await ctx.db.patch(a.id, { status: "ready", review: a.review });
    else
      await ctx.db.patch(a.id, {
        status: "failed",
        error: (a.error || "Research could not be completed.").slice(0, 300),
      });
  },
});
export const runReview = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; message: string }> => {
    let id: any;
    try {
      const world = await ctx.runQuery(api.genesis.current, {});
      if (!world) throw Error("Open your saved village first.");
      const run: any = await ctx.runMutation(internal.medical.reserve, {
        worldId: world.id,
      });
      id = run.id;
      if (run.cached)
        return {
          ok: true,
          message:
            "Your saved review is ready. Reused today's sources without another search.",
        };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(medicalUrl(), { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok)
        throw Error(
          "Europe PMC did not return the requested studies. Please try later.",
        );
      const raw = await response.text();
      if (raw.length > 250000)
        throw Error("Source response exceeded this review's limit.");
      const review = buildMedicalReview(
        JSON.parse(raw),
        new Date().toISOString(),
      );
      await ctx.runMutation(internal.medical.finish, { id, review });
      return {
        ok: true,
        message:
          "Two real source records checked. Your private draft is saved.",
      };
    } catch (e) {
      const detail = e instanceof Error ? e.message : "";
      const message = detail.includes("five minutes")
        ? "The last search failed. Please wait five minutes before retrying."
        : detail.includes("daily research limit")
          ? "Today’s research limit is reached. Your saved work is safe; try tomorrow."
          : detail.includes("already running")
            ? "A review is already running. Please check back shortly."
            : detail.includes("adult Dr. Atlas")
              ? "Add adult Dr. Atlas to the village first."
              : detail.includes("saved village")
                ? "Open your saved village first."
                : detail.includes("extraction anchors")
                  ? "These source records need manual review. No report was marked ready."
                  : "The source check did not finish. Your saved work is safe; please try later.";
      if (id)
        try {
          await ctx.runMutation(internal.medical.finish, {
            id,
            error: message,
          });
        } catch {}
      return { ok: false, message };
    }
  },
});
