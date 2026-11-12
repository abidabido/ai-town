import type { LivingState, LifeEvent } from "./genesisLife";
export type DiaryEntry = {
  id: string;
  actionId: string;
  timeline: number;
  tick: number;
  kind: string;
  observation: string;
  reason: string;
  source: string;
  participants: number[];
  perspective: string;
  evidence: "participated";
};
export type MemoryState = { version: 1; diaries: Record<string, DiaryEntry[]> };
// Actor-only access: world events and owner commands are not automatically citizen knowledge.
export function recordMemories(state: LivingState, events: LifeEvent[]): void {
  const allowed = new Set([
    "rule-engine",
    "family-rule-engine",
    "research-rule-engine",
  ]);
  const eligible = events.filter(
    (e) =>
      allowed.has(e.source) &&
      e.actionId &&
      Number.isInteger(e.tick) &&
      e.timeline === state.life.timeline,
  );
  if (!eligible.length) return;
  const memory = (state.life.memory ??= { version: 1, diaries: {} });
  for (const e of eligible)
    for (const id of new Set(e.actors)) {
      const person = state.life.people[id];
      if (!person || !state.citizens.some((c) => c.id === id)) continue;
      const diary = (memory.diaries[id] ??= []);
      const key = e.timeline + ":" + e.actionId;
      if (diary.some((m) => m.id === key)) continue;
      const curious = person.profile?.traits["Curiosity"] ?? person.curiosity;
      const empathy = person.profile?.traits["Empathy"] ?? person.empathy;
      const perspective =
        curious >= 70
          ? "Reflection prompt: what evidence could explain this outcome?"
          : empathy >= 70
            ? "Reflection prompt: how did this affect the people involved?"
            : "Reflection prompt: how does this relate to my goals?";
      diary.push({
        id: key,
        actionId: e.actionId,
        timeline: e.timeline,
        tick: e.tick,
        kind: e.kind,
        observation: e.text,
        reason: e.reason,
        source: e.source,
        participants: [...e.actors],
        perspective,
        evidence: "participated",
      });
      memory.diaries[id] = diary.slice(-240);
    }
  // Bound embedded state well below Convex's document limit; source events remain separate.
  let budget = JSON.stringify(memory).length;
  while (budget > 120000) {
    const lists = Object.values(memory.diaries).filter((list) => list.length);
    const oldest = lists.sort(
      (a, b) => a[0].tick - b[0].tick || a[0].timeline - b[0].timeline,
    )[0];
    if (!oldest) break;
    budget -= JSON.stringify(oldest.shift()).length;
  }
}
