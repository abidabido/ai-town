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
      <h3>Personal diary · Living Memory</h3>
      <p className="muted">
        Recorded participation, not omniscience. Reflection prompts are
        trait-based templates, not independent reasoning. Latest 240 memories
        retained; original events remain in the event archive. Earlier unlinked
        memories are not backfilled.
      </p>
      <label>
        Search this diary
        <input
          aria-label="Search citizen diary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <p>{entries.length} matching memories</p>
      {entries.slice(0, 30).map((e) => {
        const date = calendar(e.tick);
        return (
          <article className="event" key={e.id}>
            <small>
              Y{date.year} · M{date.month} · D{date.day} · {date.hour}:00 ·
              timeline {e.timeline + 1} · {e.kind} · participated
            </small>
            <p>{e.observation}</p>
            <p className="muted">{e.perspective}</p>
            <details>
              <summary>Inspect source event</summary>
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
