import { useState } from "react";
import type { LivingState } from "../../data/genesisLife";
import { calendar } from "../../data/genesisLife";
export function CitizenDiary({
  state,
  id,
}: {
  state: LivingState;
  id: number;
}) {
  const [search, setSearch] = useState("");
  const entries = (state.life.memory?.diaries[id] ?? [])
    .filter((e) =>
      (e.observation + " " + e.kind)
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .slice()
    .reverse();
  return (
    <section aria-label="Evidence-linked personal diary">
      <h3>My Memories</h3>
      <p className="muted">
        Experiences from their life, kept in their diary. Open a memory to see
        what really happened.
      </p>
      <details>
        <summary>About these memories</summary>
        <p>
          Only experiences they took part in are included. Reflection questions
          are written prompts. Older diary copies may be removed to keep the
          village running smoothly; original events stay saved.
        </p>
      </details>
      <label>
        Search this diary
        <input
          aria-label="Search citizen diary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <p>
        {entries.length} matching {entries.length === 1 ? "memory" : "memories"}
      </p>
      {entries.slice(0, 30).map((e) => {
        const date = calendar(e.tick);
        return (
          <article className="event" key={e.id}>
            <small>
              Y{date.year} · M{date.month} · D{date.day} · {date.hour}:00 ·
              timeline {e.timeline + 1} · {e.kind} · a personal experience
            </small>
            <p>{e.observation}</p>
            <p className="muted">{e.perspective}</p>
            <details>
              <summary>What happened behind this memory?</summary>
              <p>{e.reason}</p>
              <p>
                Recorded by {e.source}. Participants:{" "}
                {e.participants
                  .map((i) => state.citizens.find((c) => c.id === i)?.name ?? i)
                  .join(", ")}
              </p>
              <code>{e.actionId}</code>
            </details>
          </article>
        );
      })}
      {!entries.length && (
        <p>
          No matching linked memories yet. Advance a day to record new
          experiences.
        </p>
      )}
    </section>
  );
}
