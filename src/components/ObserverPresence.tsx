import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  OBSERVER_MODES,
  observerPresence,
  nearestObserverRoad,
  PLACES,
  calendar,
  type LivingState,
  type PresenceRequest,
} from "../../data/genesisLife";
const descriptions: Record<string, string> = {
  Invisible: "Explore your village without anyone knowing you’re here.",
  "The Feeling": "Some nearby villagers may sense an unexplained presence.",
  "The Visitor":
    "Appear as a visible visitor, without claiming to be the creator.",
  "The Creator": "Share the claim that Abby designed their simulated world.",
  "The Announcement": "Send a public village notice, using your own words.",
};
export default function ObserverPresencePanel({
  state,
  revision,
  selected,
}: {
  state: LivingState;
  revision: number;
  selected?: number;
}) {
  const o = observerPresence(state),
    act = useMutation(api.genesis.observerPresenceAction);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [recipient, setRecipient] = useState(""),
    [announcement, setAnnouncement] = useState(
      "An Observer has arrived in the village.",
    ),
    [confirmed, setConfirmed] = useState(false),
    [color, setColor] = useState(o.color),
    [label, setLabel] = useState(o.label);
  async function send(request: PresenceRequest) {
    setBusy(true);
    try {
      const result = await act({ ...request, expectedRevision: revision });
      setStatus(result.message);
      setConfirmed(false);
    } catch {
      setStatus("That change didn’t save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const nearby = state.citizens.filter(
      (c) => Math.hypot(c.x - o.x, c.y - o.y) <= 18,
    ),
    known = Object.entries(o.awareness),
    name = (id: number) =>
      state.citizens.find((c) => c.id === id)?.name ?? "Former villager";
  return (
    <section
      className="panel observer-presence"
      id="genesis-presence"
      aria-label="Observer Presence"
    >
      <span className="eyebrow">ABBY · THE OBSERVER</span>
      <h2>Observer Presence</h2>
      <p>Choose whether your visit leaves a trace in village life.</p>
      <label>
        Your presence
        <select
          aria-label="Observer presence mode"
          value={o.mode}
          disabled={busy}
          onChange={(e) =>
            void send({ action: "configure", mode: e.target.value })
          }
        >
          {OBSERVER_MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <p>{descriptions[o.mode]}</p>
      <p>
        <strong>{o.active ? "In the village" : "Outside the village"}</strong> ·
        Location {o.x}, {o.y}.{" "}
        {o.mode === "Invisible"
          ? "No presence signals are sent."
          : o.active
            ? "Local perception is checked when you enter, move, or advance village time."
            : "Enter when you’re ready to make your presence detectable."}
      </p>
      <div className="presence-actions">
        <button
          disabled={busy || o.active}
          onClick={() => void send({ action: "enter" })}
        >
          Enter the village
        </button>
        <button
          disabled={busy || !o.active}
          onClick={() => void send({ action: "leave" })}
        >
          Leave the village
        </button>
        <button
          disabled={busy || !o.active || o.mode === "Invisible"}
          onClick={() => void send({ action: "notice" })}
        >
          See who noticed
        </button>
      </div>
      <p className="muted">
        Noticing is a chance, not a guarantee. Sleeping or distant villagers do
        not receive a local signal. The Feeling does not reveal Abby’s identity.
        A quiet period prevents repeated notices.
      </p>
      <label>
        Visit a place
        <select
          aria-label="Observer destination"
          defaultValue=""
          disabled={busy}
          onChange={(e) => {
            const p = PLACES[e.target.value];
            if (p)
              void send({
                action: "land",
                ...nearestObserverRoad(state, p.x, p.y + 6),
              });
            e.target.value = "";
          }}
        >
          <option value="">Choose a public place</option>
          {Object.keys(PLACES).map((k) => (
            <option key={k} value={k}>
              {k === "archive" ? "Library & archive" : k}
            </option>
          ))}
        </select>
      </label>
      <div className="presence-actions">
        <button
          disabled={busy || o.y <= 2}
          onClick={() =>
            void send({ action: "move", x: o.x, y: Math.max(2, o.y - 5) })
          }
        >
          Walk north
        </button>
        <button
          disabled={busy || o.y >= 98}
          onClick={() =>
            void send({ action: "move", x: o.x, y: Math.min(98, o.y + 5) })
          }
        >
          Walk south
        </button>
        <button
          disabled={busy || o.x <= 2}
          onClick={() =>
            void send({ action: "move", x: Math.max(2, o.x - 5), y: o.y })
          }
        >
          Walk west
        </button>
        <button
          disabled={busy || o.x >= 98}
          onClick={() =>
            void send({ action: "move", x: Math.min(98, o.x + 5), y: o.y })
          }
        >
          Walk east
        </button>
        <button
          disabled={busy || selected === undefined}
          onClick={() => {
            const c = state.citizens.find((c) => c.id === selected);
            if (c)
              void send({
                action: "land",
                ...nearestObserverRoad(state, c.x + 2, c.y),
              });
          }}
        >
          Visit selected villager
        </button>
      </div>
      <p>
        Within 18 village steps:{" "}
        {nearby.map((c) => c.name).join(", ") || "Nobody right now"}. Being
        nearby does not mean they noticed.
      </p>
      <details>
        <summary>Appearance & sensitivity</summary>
        <label>
          Feeling sensitivity
          <input
            aria-label="Feeling sensitivity"
            type="range"
            min="0"
            max="100"
            value={o.sensitivity}
            disabled={busy}
            onChange={(e) =>
              void send({
                action: "configure",
                sensitivity: Number(e.target.value),
              })
            }
          />
        </label>
        <p>
          {o.sensitivity}% strength; attention, distance, stress and weather
          still matter. Visitor sightings also check building obstructions.
        </p>
        <label>
          Visitor clothing color
          <input
            aria-label="Visitor clothing color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label>
          Visitor name label
          <input
            aria-label="Visitor name label"
            maxLength={40}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <button
          disabled={busy}
          onClick={() => void send({ action: "configure", color, label })}
        >
          Save appearance
        </button>
        <p>
          Only Visitor and Creator modes show the avatar. Its saved position
          drives detection; moving the camera alone does not move the Observer.
        </p>
      </details>
      {o.mode === "The Creator" && (
        <div className="confirm-box">
          <h3>Reveal my identity</h3>
          <p>
            Recipients will hear “Abby says she designed this simulated world.”
            Receiving this claim does not make them believe it.
          </p>
          <label>
            Who receives the claim?
            <select
              aria-label="Creator claim recipient"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setConfirmed(false);
              }}
            >
              <option value="">Everyone</option>
              {state.citizens.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {recipient === "" && (
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I want everyone to receive this creator claim.
            </label>
          )}
          <button
            disabled={busy || (!recipient && !confirmed)}
            onClick={() =>
              void send({
                action: "reveal",
                ...(recipient ? { citizen: Number(recipient) } : { confirmed }),
              })
            }
          >
            Send creator claim
          </button>
        </div>
      )}
      {o.mode === "The Announcement" && (
        <div className="confirm-box">
          <h3>Announce your arrival</h3>
          <label>
            Your public message
            <textarea
              aria-label="Observer announcement"
              value={announcement}
              maxLength={240}
              onChange={(e) => {
                setAnnouncement(e.target.value);
                setConfirmed(false);
              }}
            />
          </label>
          <p>
            This is delivered to every villager’s public noticeboard record. It
            does not establish that its claims are true.
          </p>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Send this message to the whole village.
          </label>
          <button
            disabled={busy || !confirmed || !announcement.trim()}
            onClick={() =>
              void send({
                action: "announce",
                message: announcement,
                confirmed,
              })
            }
          >
            Send announcement
          </button>
        </div>
      )}
      <p role="status">{busy ? "Saving your Observer action…" : status}</p>
      <h3>Who noticed?</h3>
      {known.length ? (
        <ul>
          {known.map(([id, a]) => (
            <li key={id}>
              <strong>{name(Number(id))}</strong> · {a.status}
              <p>{a.interpretation}</p>
              <span className="muted">
                {a.evidence.length} saved evidence record(s).{" "}
                {a.claimReceived
                  ? "Received a creator identity claim."
                  : "No creator identity claim received."}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nobody has a recorded encounter yet.</p>
      )}
      <details>
        <summary>View encounter history</summary>
        {o.encounters.length ? (
          o.encounters
            .slice()
            .reverse()
            .map((e) => (
              <article key={e.id}>
                <h4>
                  {e.kind} · day {Math.floor(e.tick / 4) + 1},{" "}
                  {calendar(e.tick).hour}:00
                </h4>
                <p>
                  {e.mode} · {e.x}, {e.y}
                </p>
                {e.witnesses.map((w) => (
                  <p key={w.eventId}>
                    <strong>{name(w.citizen)}</strong>: {w.perception}{" "}
                    {w.interpretation}
                  </p>
                ))}
                <small>
                  Source: {e.id}. Original records remain in Village History.
                </small>
              </article>
            ))
        ) : (
          <p>
            No encounters have been recorded. Leaving or becoming Invisible
            keeps earlier memories.
          </p>
        )}
      </details>
      <details>
        <summary>What’s working, and what’s next?</summary>
        <p>
          Working: saved modes, local sensory notices, personality-based
          interpretations, witness memories, visible Visitor/Creator avatar,
          selective creator claims and public notices. Rules-based reactions do
          not prove awareness or consciousness.
        </p>
        <p>
          Working: first-person Street View with validated path movement and
          drag-to-look. Still being developed: automatic camera-linked movement,
          entering buildings, visitor conversations, rumors, Observer research,
          reputation, and a secure administrator-only archive. Creator claims
          have no proof mechanism yet. Existing harvest research is preserved.
        </p>
      </details>
    </section>
  );
}
