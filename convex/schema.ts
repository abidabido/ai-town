import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { agentTables } from "./agent/schema";
import { aiTownTables } from "./aiTown/schema";
import { conversationId, playerId } from "./aiTown/ids";
import { engineTables } from "./engine/schema";

export default defineSchema({
  genesisProducts: defineTable({
    key: v.string(),
    revision: v.number(),
    title: v.string(),
    description: v.string(),
    base: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    sha: v.optional(v.string()),
    report: v.optional(v.string()),
    pageCount: v.optional(v.number()),
    logs: v.array(
      v.object({
        at: v.number(),
        role: v.string(),
        tool: v.string(),
        text: v.string(),
      }),
    ),
  }).index("revision", ["key", "revision"]),
  genesisStudioProjects: defineTable({
    title: v.string(),
    brief: v.string(),
    assignee: v.number(),
    assigneeName: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    logs: v.array(
      v.object({ at: v.number(), actor: v.string(), text: v.string() }),
    ),
    artifact: v.optional(v.string()),
    sha: v.optional(v.string()),
    testResult: v.optional(v.string()),
  }),
  genesisSessions: defineTable({
    key: v.string(),
    state: v.any(),
    revision: v.optional(v.number()),
    lastActive: v.optional(v.number()),
  }).index("key", ["key"]),
  genesisEvents: defineTable({
    tick: v.number(),
    kind: v.string(),
    actors: v.array(v.number()),
    text: v.string(),
    timeline: v.optional(v.number()),
    source: v.optional(v.string()),
    actionId: v.optional(v.string()),
    reason: v.optional(v.string()),
  })
    .index("tick", ["tick"])
    .index("action", ["actionId"]),
  genesisTransactions: defineTable({
    tick: v.number(),
    timeline: v.number(),
    actionId: v.string(),
    from: v.string(),
    to: v.string(),
    amount: v.number(),
    reason: v.string(),
  }).index("tick", ["tick"]),
  genesisChat: defineTable({
    tick: v.number(),
    timeline: v.number(),
    actionId: v.string(),
    speaker: v.number(),
    recipient: v.number(),
    location: v.string(),
    topic: v.string(),
    text: v.string(),
    source: v.string(),
    visibility: v.string(),
  }).index("tick", ["tick"]),
  genesisCheckpoints: defineTable({
    label: v.string(),
    state: v.any(),
    tick: v.number(),
    createdAt: v.number(),
  }),
  music: defineTable({
    storageId: v.string(),
    type: v.union(v.literal("background"), v.literal("player")),
  }),

  messages: defineTable({
    conversationId,
    messageUuid: v.string(),
    author: playerId,
    text: v.string(),
    worldId: v.optional(v.id("worlds")),
  })
    .index("conversationId", ["worldId", "conversationId"])
    .index("messageUuid", ["conversationId", "messageUuid"]),

  ...agentTables,
  ...aiTownTables,
  ...engineTables,
});
