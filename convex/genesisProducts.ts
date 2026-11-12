import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("genesisProducts").order("desc").take(30),
});
export const begin = internalMutation({
  args: {
    key: v.string(),
    revision: v.number(),
    title: v.string(),
    description: v.string(),
    base: v.string(),
  },
  handler: async (ctx, a) => {
    if (
      !/^[a-z0-9-]{1,60}$/.test(a.key) ||
      !Number.isInteger(a.revision) ||
      a.revision < 1 ||
      a.revision > 100 ||
      a.base !== "genesis-products/" + a.key + "/v" + a.revision
    )
      throw Error("Invalid product revision");
    const previous = await ctx.db
      .query("genesisProducts")
      .withIndex("revision", (q) =>
        q.eq("key", a.key).eq("revision", a.revision),
      )
      .unique();
    if (previous)
      throw Error(
        "Revision already exists; use a new revision instead of overwriting history.",
      );
    return ctx.db.insert("genesisProducts", {
      ...a,
      status: "validating",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      logs: [
        {
          at: Date.now(),
          role: "Nova",
          tool: "Authorized artifact import",
          text: "Actual product files imported; validation is pending. No autonomous citizen work or public publication is claimed.",
        },
      ],
    });
  },
});
export const finish = internalMutation({
  args: {
    id: v.id("genesisProducts"),
    passed: v.boolean(),
    sha: v.string(),
    report: v.string(),
    pageCount: v.number(),
  },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.id);
    if (!p || p.status !== "validating")
      throw Error("Revision is not awaiting validation");
    if (
      a.passed &&
      (!/^[a-f0-9]{64}$/.test(a.sha) || a.pageCount < 1 || a.report.length < 10)
    )
      throw Error("Verified artifact evidence required");
    await ctx.db.patch(a.id, {
      status: a.passed ? "awaiting-owner-review" : "validation-failed",
      sha: a.sha,
      report: a.report,
      pageCount: a.pageCount,
      updatedAt: Date.now(),
      logs: [
        ...p.logs,
        {
          at: Date.now(),
          role: "Sage",
          tool: "Python / PyMuPDF + SHA-256 validator",
          text: a.report.slice(0, 3000),
        },
        {
          at: Date.now(),
          role: "Theo",
          tool: "Draft listing / arithmetic",
          text: "Prepared listing and illustrative $9 price. Assumed 10% plus $0.50 costs leave $7.60 before other expenses; not verified platform fees or profit. No payments or revenue connection.",
        },
      ],
    });
    return { ok: true };
  },
});
export const review = mutation({
  args: {
    id: v.id("genesisProducts"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
  },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.id);
    if (
      !p ||
      !["awaiting-owner-review", "approved-not-published", "rejected"].includes(
        p.status,
      )
    )
      throw Error("Only validated revisions may be reviewed");
    await ctx.db.patch(a.id, {
      status: a.decision === "approve" ? "approved-not-published" : "rejected",
      updatedAt: Date.now(),
      logs: [
        ...p.logs,
        {
          at: Date.now(),
          role: "Owner",
          tool: "Explicit review",
          text:
            a.decision === "approve"
              ? "Owner approved this revision. Publishing is not connected; no public deployment occurred."
              : "Owner rejected publication. Artifacts and history retained.",
        },
      ],
    });
    return { ok: true };
  },
});
