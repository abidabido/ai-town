import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  calendar,
  observerPresence,
  type LivingState,
} from "../../data/genesisLife";
import type { TalkEntry, TalkChannel } from "../../data/genesisTalk";
import "./CitizenTalk.css";
export default function CitizenTalk({
  state,
  worldId,
  citizen,
  onClose,
}: {
  state: LivingState;
  worldId: Id<"genesisSessions">;
  citizen: number | undefined;
  onClose: () => void;
}) {
  const history = useQuery(
      api.citizenTalk.thread,
      citizen === undefined ? "skip" : { worldId, citizen },
    ),
    send = useMutation(api.citizenTalk.send);
  const [text, setText] = useState(""),
    [channel, setChannel] = useState<TalkChannel>("Messages"),
    [identify, setIdentify] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    request = useRef<string>();
  useEffect(() => {
    if (citizen !== undefined) {
      dialog.current?.showModal();
      setText("");
      setStatus("");
      request.current = undefined;
      const old = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = old;
      };
    }
  }, [citizen]);
  const person = state.citizens.find((c) => c.id === citizen),
    o = observerPresence(state);
  if (citizen === undefined || !person) return null;
  const deliver = async () => {
    setBusy(true);
    request.current ??= crypto.randomUUID();
    try {
      const result = await send({
        worldId,
        citizen,
        channel,
        message: text,
        identify,
        requestId: request.current,
      });
      setStatus(result.message);
      if (result.ok) {
        setText("");
        request.current = undefined;
      }
    } catch {
      setStatus(
        "That message did not save. Your text is still here; you can retry.",
      );
    } finally {
      setBusy(false);
    }
  };
  const entries = (history ?? []) as TalkEntry[];
  return (
    <dialog
      className="citizen-talk"
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="talk-heading"
    >
      <header>
        <div>
          <div className="eyebrow">A private in-world conversation</div>
          <h2 id="talk-heading">You & {person.name}</h2>
        </div>
        <button onClick={onClose} disabled={busy}>
          Close conversation
        </button>
      </header>
      <p className="talk-limit">
        <strong>Limited rules-based replies</strong> — no language model is
        connected. This can discuss recorded life, interests, beliefs and
        memories, and consider research goals. It cannot hold unrestricted
        conversations or run experiments from chat.
      </p>
      <label>
        How would you like to talk?
        <select
          aria-label="Communication method"
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value as TalkChannel);
            request.current = undefined;
          }}
          disabled={busy}
        >
          {["Messages", "Face-to-Face", "Observer Communication"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <p>
        Presence: {o.mode}.{" "}
        {channel === "Face-to-Face"
          ? "Your visible avatar must be nearby, with an awake citizen in view."
          : channel === "Observer Communication"
            ? "Invisible mode blocks this channel. The Feeling stays unexplained unless you identify yourself."
            : "An explicit text stays in this citizen’s conversation. It does not announce your presence to the village."}
      </p>
      <label className="talk-check">
        <input
          type="checkbox"
          checked={identify}
          onChange={(e) => {
            setIdentify(e.target.checked);
            request.current = undefined;
          }}
          disabled={busy}
        />
        Identify myself as Abby in this message (a claim, not proof of being the
        creator)
      </label>
      <div className="talk-history" aria-label="Conversation history">
        {history === undefined ? (
          <p>Opening your conversation…</p>
        ) : !entries.length ? (
          <p>
            No messages yet. Try “What are you doing?” or “What do you enjoy?”
          </p>
        ) : (
          entries.map((m) => {
            const time = calendar(m.tick);
            return (
              <article key={m.id} className={"talk-" + m.role}>
                <strong>
                  {m.role === "player" ? "You · " + m.identity : person.name}
                </strong>
                <small>
                  Year {time.year} · month {time.month} · day {time.day} ·{" "}
                  {String(time.hour).padStart(2, "0")}:00 · {m.channel} ·{" "}
                  {m.mode}
                </small>
                <p>{m.body}</p>
                <details>
                  <summary>Why this reply / record details</summary>
                  <p>
                    Engine: {m.engine}. Real recorded time:{" "}
                    {new Date(m.recordedAt).toLocaleString()}. Audience: you and{" "}
                    {person.name}; not other villagers.
                  </p>
                  {m.facts.length > 0 && <p>Used: {m.facts.join("; ")}</p>}
                </details>
              </article>
            );
          })
        )}
      </div>
      <div className="talk-suggestions">
        {[
          "What are you doing?",
          "What do you enjoy?",
          "What do you believe?",
          "What did I tell you last time?",
        ].map((s) => (
          <button
            key={s}
            disabled={busy}
            onClick={() => {
              setText(s);
              request.current = undefined;
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void deliver();
        }}
      >
        <label>
          Your message to {person.name}
          <textarea
            aria-label={"Message to " + person.name}
            maxLength={1000}
            value={text}
            disabled={busy}
            onChange={(e) => {
              setText(e.target.value);
              request.current = undefined;
            }}
            rows={3}
          />
        </label>
        <button type="submit" disabled={busy || !text.trim()}>
          {busy ? "Saving your exchange…" : "Send message"}
        </button>
      </form>
      <p role="status">{status}</p>
      <p className="talk-fine">
        The latest 60 messages are kept in this timeline. Meaningful received
        messages become this villager’s own memories; claims are not
        automatically verified or shared. Conversation privacy follows simulated
        participant rules; full multi-user administrator authentication is still
        unfinished, so keep Genesis private.
      </p>
    </dialog>
  );
}
