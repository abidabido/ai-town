import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { LivingState, LifeEvent } from "../../data/genesisLife";
import { EventList, stamp } from "./GenesisPanels";
function SourceEvent({ actionId }: { actionId: string }) {
  const [open, setOpen] = useState(false);
  const saved = useQuery(
    api.genesis.researchEvidence,
    open ? { actionId } : "skip",
  );
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Show the evidence</summary>
      {open &&
        (saved === undefined ? (
          <p>Finding the original village record…</p>
        ) : saved ? (
          <EventList events={[saved as LifeEvent]} />
        ) : (
          <p>The source record isn’t available. Reference: {actionId}</p>
        ))}
    </details>
  );
}
export default function ResearchLibrary({ state }: { state: LivingState }) {
  const [search, setSearch] = useState("");
  const projects = (state.life.inquiry?.projects ?? []).filter((p) =>
    (p.question + " " + p.stage + " " + p.notebook.map((n) => n.text).join(" "))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const name = (id: number) =>
    state.citizens.find((c) => c.id === id)?.name ?? "A former villager";
  return (
    <section
      id="genesis-research"
      className="panel research-library"
      aria-label="Research Library"
    >
      <div className="eyebrow">Curiosity, with receipts</div>
      <h2>Research Library</h2>
      <p>
        Follow a question from the first observation to the test—and see what
        changed their minds.
      </p>
      <p className="muted">
        Village research only. Real-world research and browsing are not
        connected. This first pilot studies harvest patterns; other subjects are
        still on the way.
      </p>
      <label>
        Find an investigation
        <input
          aria-label="Search research"
          value={search}
          placeholder="Try harvest, weather or experience"
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {!projects.length && (
        <p>
          {search
            ? "No investigations match that search."
            : "No investigation has opened yet. A curious farmer may notice different harvests and ask why. Let village life unfold; ordinary needs come first."}
        </p>
      )}
      {projects.map((p) => (
        <article className="research-case" key={p.id}>
          <div className="eyebrow">What are they questioning?</div>
          <h3>{p.question}</h3>
          <p>
            <strong>
              {
                {
                  question: "A question worth exploring",
                  planned: "An experiment is planned",
                  tested: "Results are ready to review",
                  concluded: "Finding saved",
                }[p.stage]
              }
            </strong>{" "}
            · {name(p.owner)}
            {p.peer !== undefined
              ? " & " + name(p.peer)
              : " · looking for a collaborator"}{" "}
            · began {stamp(p.started)}
          </p>
          <details open>
            <summary>Why this question came up</summary>
            <p>
              {name(p.owner)} personally recorded these harvests. Differences
              suggest a question; they do not establish a cause.
            </p>
            {p.observations.map((o) => (
              <div key={o.id}>
                <p>
                  {stamp(o.tick)} · {o.weather} · {o.yield} servings ·
                  experience {o.skill.toFixed(1)} · {o.farms} working farms
                  {o.shortage ? " · food shortage" : ""}
                </p>
                <SourceEvent actionId={o.id} />
              </div>
            ))}
            <SourceEvent actionId={p.questionAction} />
          </details>
          <h4>The Hypothesis Board</h4>
          <div className="research-hypotheses">
            {(["weather", "skill"] as const).map((kind) => (
              <section key={kind}>
                <h4>
                  {kind === "weather"
                    ? "Does rain improve harvests?"
                    : "Does experience explain the difference?"}
                </h4>
                <p>
                  {kind === "weather"
                    ? "Prediction: rainy conditions produce more food than clear conditions when experience stays the same."
                    : "Prediction: more growing experience produces more food when weather stays the same."}
                </p>
                <p>
                  {p.result
                    ? (kind === "weather"
                        ? p.result.weatherEffect
                        : p.result.skillEffect) > 0
                      ? "Supported by this controlled test."
                      : "Not supported by this controlled test."
                    : "Still a tentative explanation. No controlled result yet."}
                </p>
                {Object.entries(p.confidence).map(([id, belief]) => (
                  <p key={id}>
                    {name(Number(id))}: {Math.round(belief[kind] * 100)}%
                    confidence
                  </p>
                ))}
              </section>
            ))}
          </div>
          <p className="muted">
            Confidence is a game belief score, not a statistical probability.
            These research beliefs are separate from philosophical faction
            membership.
          </p>
          <details>
            <summary>How their confidence changed</summary>
            {(p.beliefHistory ?? []).map((h, i) => (
              <div key={i}>
                <p>
                  {stamp(h.tick)} · {name(h.actor)} · weather{" "}
                  {Math.round(h.weather * 100)}% · experience{" "}
                  {Math.round(h.skill * 100)}%
                </p>
                <SourceEvent actionId={h.actionId} />
              </div>
            ))}
          </details>
          {p.discussionAction && (
            <details>
              <summary>Deep Conversations · comparing explanations</summary>
              <p>
                The owner shared the two observations with their collaborator.
                They asked how to separate correlation from cause. Their exact
                recorded lines are in Town Talk.
              </p>
              <SourceEvent actionId={p.discussionAction} />
            </details>
          )}
          <details open={p.stage === "tested" || p.stage === "concluded"}>
            <summary>The Lab · plan and results</summary>
            {!p.planAction && <p>No experiment has been planned yet.</p>}
            {p.planAction && (
              <>
                <p>
                  The plan compares clear and rainy conditions at experience 25
                  and 75. Farm count and shortage conditions are held fixed. It
                  costs two village materials and an available evening for both
                  people.
                </p>
                <p>
                  These are four controlled virtual runs of the same game rule
                  used by working farmers. They do not change the village’s
                  weather or create food.
                </p>
                {p.planAction && <SourceEvent actionId={p.planAction} />}
                <div className="ledger-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Weather</th>
                        <th>Experience</th>
                        <th>Working farms</th>
                        <th>Yield</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.trials.map((t, i) => (
                        <tr key={i}>
                          <td>{t.weather}</td>
                          <td>{t.skill}</td>
                          <td>{t.farms}</td>
                          <td>{t.yield} servings</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!p.trials.length && (
                  <p>
                    No measurements yet. The experiment waits when needs or
                    supplies take priority.
                  </p>
                )}
                {p.testAction && <SourceEvent actionId={p.testAction} />}
              </>
            )}
          </details>
          {p.result && (
            <section>
              <h4>What did they learn?</h4>
              <p>
                Rain changed the test yield by {p.result.weatherEffect}{" "}
                servings. Higher experience changed it by {p.result.skillEffect}
                .
              </p>
              <p>
                Only the two participants updated these research beliefs. This
                finding applies to the tested game conditions, not to real-world
                farming or every possible future rule.
              </p>
              {p.findingAction && <SourceEvent actionId={p.findingAction} />}
            </section>
          )}
          <details>
            <summary>Investigator notebook · follow the whole trail</summary>
            {p.notebook.map((n) => (
              <article key={n.actionId}>
                <small>{stamp(n.tick)}</small>
                <p>{n.text}</p>
                <SourceEvent actionId={n.actionId} />
              </article>
            ))}
          </details>
        </article>
      ))}
      <details>
        <summary>What’s working, and what’s next?</summary>
        <p>
          Working: one autonomous harvest investigation, two competing
          explanations, a resource-limited controlled test, evidence-linked
          research beliefs, saved conversations, diaries and Daily Tea updates.
          This is bounded rules-based research—not a general reasoning agent.
          Multiple topics, real-world sources, public debates, research
          societies, mysteries, the Gazette and a secure Observer-only archive
          are still being developed.
        </p>
      </details>
    </section>
  );
}
