import { useEffect, useState } from "react";
import type { LivingState, LifeEvent } from "../../data/genesisLife";
import {
  recapEvents,
  isNoteworthy,
  readableEvent,
  type NewsEvent,
  type VisitMark,
} from "../../data/genesisFriendly";
import { EventList, stamp } from "./GenesisPanels";
export function DailyTea({
  state,
  events,
  worldId,
}: {
  state: LivingState;
  events: NewsEvent[] | undefined;
  worldId: string;
}) {
  const key = "genesis-visit-v1:" + worldId + ":" + state.life.timeline;
  const [visit] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "null");
      return v && Number.isFinite(v.tick) && Number.isFinite(v.seenAt)
        ? (v as VisitMark)
        : null;
    } catch {
      return null;
    }
  });
  const [period, setPeriod] = useState("visit");
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    if (!events) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          tick: state.tick,
          seenAt: Math.max(
            visit?.seenAt ?? 0,
            ...events.map((e) => e._creationTime ?? 0),
          ),
        }),
      );
    } catch {
      setStorageFailed(true);
    }
  }, [events, state.tick, key]);
  const news = recapEvents(
      events ?? [],
      period === "today" ? null : visit,
      state.tick,
    ),
    notable = news.filter(isNoteworthy),
    ordinary = news.filter((e) => !isNoteworthy(e));
  const items = (notable.length ? notable : ordinary).slice(0, 5);
  const gap =
    !!visit &&
    events?.length === 100 &&
    (events[events.length - 1]._creationTime ?? 0) > visit.seenAt;
  return (
    <section
      id="genesis-news"
      className="panel daily-tea"
      aria-label="The Daily Tea"
    >
      <div className="eyebrow">Your village, caught up</div>
      <h2>The Daily Tea ☕</h2>
      <div className="toolbar">
        <button
          aria-pressed={period === "visit"}
          onClick={() => setPeriod("visit")}
        >
          Since my last visit
        </button>
        <button
          id="genesis-tea-today"
          aria-pressed={period === "today"}
          onClick={() => setPeriod("today")}
        >
          Today’s news
        </button>
      </div>
      <p>
        {period === "today"
          ? "Here’s what happened today."
          : visit
            ? "Here’s the news since your last visit on this browser."
            : "First time here? Here’s what happened today."}{" "}
        {news.length
          ? news.length + " saved updates to explore."
          : "No new village events to report."}
      </p>
      {events === undefined ? (
        <p role="status">Putting the kettle on… gathering your village news.</p>
      ) : (
        <>
          {!news.length && (
            <p className="muted">
              A quiet moment. Press Play village to let life unfold, or advance
              a day. The village only moves forward while you play or ask it to
              catch up.
            </p>
          )}
          {items.map((e) => (
            <details className="tea-item" key={e.actionId}>
              <summary>{readableEvent(e)}</summary>
              <EventList events={[e]} />
            </details>
          ))}
          {!!notable.length && !!ordinary.length && (
            <p className="muted">
              There were also {ordinary.length} everyday updates about meals,
              rest, work or other village activities.
            </p>
          )}
          {!!news.length && (
            <details>
              <summary>See all updates in this recap</summary>
              <EventList events={news} />
            </details>
          )}
          {gap && (
            <p className="muted">
              There’s more news than fits here. This recap covers the latest 100
              updates; earlier events are still saved.
            </p>
          )}
        </>
      )}
      {storageFailed && (
        <p className="muted">
          This browser couldn’t remember your visit. The recap may repeat next
          time.
        </p>
      )}
      <details>
        <summary>About this recap</summary>
        <p>
          These are confirmed saved events, not invented news or rumors. Visits
          are remembered only on this browser. The recap can show up to 100
          recent updates; it does not run the village in the background.{" "}
          {visit ? "Your previous visit was at " + stamp(visit.tick) + "." : ""}
        </p>
      </details>
    </section>
  );
}
export function GenesisHelp() {
  const [search, setSearch] = useState("");
  const topics = [
    [
      "How people choose what to do",
      "Working now: villagers follow daily routines, with choices influenced by hunger, rest, personality and relationships. New actions are saved as they happen. Their dialogue currently uses written patterns, not a connected language model.",
    ],
    [
      "Personality and hobbies",
      "Working now: use The People to create or edit a villager. Curiosity, empathy and shared hobbies can affect studying or social choices. Some other traits are saved for features still being developed.",
    ],
    [
      "Love and starting a family",
      "Working now: eligible adults can date, marry or separate when the relationship rules and both preferences allow. Living together does not make a couple. Babies, pregnancy, adoption and family trees are still being developed.",
    ],
    [
      "Village time",
      "Working now: Play village runs while this page is open and visible. Advance a day or week to move forward faster. Catch up calculates a limited amount of missed time only when you ask; it is not proof the village ran while closed. A month has 30 days.",
    ],
    [
      "Editing a villager",
      "Open The People, choose a villager, then Edit villager. Change their details and save. Changes are stored in the village. Creating a villager uses village funds, so you will see the cost before saving.",
    ],
    [
      "Commands and mysteries",
      "Use Genesis God Mode in The Observatory. Try a suggested command. Buildings and unusual events ask you to confirm first. Unsupported requests explain the limit instead of pretending they worked.",
    ],
    [
      "Memories and diaries",
      "Working now: villagers keep diary copies of experiences they took part in. Open a memory to inspect its saved event. Reflection questions are written prompts. Memory-driven planning, rumors and conflicting witness accounts are still being developed.",
    ],
    [
      "The Observer",
      "You are Abby, The Observer. You can watch, edit and introduce supported events. Citizens do not yet investigate who created their world. Creator discovery and messages to the Observer are still being developed.",
    ],
    [
      "Town Talk and privacy",
      "Conversations are saved when villagers actually meet. Public and private describe who knows the conversation inside the village. You can read both as the Observer. New dialogue uses personality-based written variations; old conversations keep their original wording.",
    ],
    [
      "Village money and products",
      "The ¤ symbol is fictional village money. Real downloadable products are in Creation Studio, separate from village cash. There are no connected payments or automatic publication.",
    ],
    [
      "Controls still being developed",
      "The Chaos Dial, Observer Effect experiments, Forbidden Archive and alternate-universe comparisons are not ready yet. Current save points let you restore an earlier village into a new history branch.",
    ],
  ];
  return (
    <section id="genesis-help" className="panel">
      <h2>How Genesis Works</h2>
      <p>A quick guide to what you can do today—and what’s still on the way.</p>
      <label>
        Find an answer
        <input
          aria-label="Search village help"
          placeholder="Try families, memories or time"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {topics
        .filter((t) => t.join(" ").toLowerCase().includes(search.toLowerCase()))
        .map(([title, body]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{body}</p>
          </details>
        ))}
      {!topics.some((t) =>
        t.join(" ").toLowerCase().includes(search.toLowerCase()),
      ) && (
        <p>
          No matching help topics. Try a shorter word, such as time or families.
        </p>
      )}
    </section>
  );
}
