import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateLot } from "../data/genesisBuild";
export const current = query({
  args: { worldId: v.id("genesisSessions") },
  handler: async (ctx, a) =>
    ctx.db
      .query("genesisBuildLots")
      .withIndex("world", (q) => q.eq("worldId", a.worldId))
      .unique(),
});
export const save = mutation({
  args: {
    worldId: v.id("genesisSessions"),
    expectedRevision: v.number(),
    design: v.any(),
  },
  handler: async (ctx, a) => {
    if (!Number.isSafeInteger(a.expectedRevision) || a.expectedRevision < 0)
      return { ok: false, message: "This save version is invalid." };
    if (!(await ctx.db.get(a.worldId)))
      return { ok: false, message: "Open your saved village first." };
    try {
      const design = validateLot(a.design),
        row = await ctx.db
          .query("genesisBuildLots")
          .withIndex("world", (q) => q.eq("worldId", a.worldId))
          .unique();
      if ((row?.revision ?? 0) !== a.expectedRevision)
        return {
          ok: false,
          message:
            "This lot changed in another window. Keep your draft and reload the saved lot before trying again.",
        };
      const revision = a.expectedRevision + 1;
      const history = row
        ? [
            ...row.history,
            { revision: row.revision, design: row.design },
          ].slice(-5)
        : [];
      if (row)
        await ctx.db.patch(row._id, {
          design,
          revision,
          history,
          updatedAt: Date.now(),
        });
      else
        await ctx.db.insert("genesisBuildLots", {
          worldId: a.worldId,
          key: "willow",
          design,
          revision,
          history,
          updatedAt: Date.now(),
        });
      return { ok: true, message: "Your lot has been saved.", revision };
    } catch {
      return {
        ok: false,
        message:
          "The lot did not save. Check its objects, boundaries and spacing.",
      };
    }
  },
});
