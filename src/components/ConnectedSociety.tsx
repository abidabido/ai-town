import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  digitalLife,
  digitalView,
  type LivingState,
} from "../../data/genesisLife";
import { Portrait, factionColors } from "./GenesisWorld";
import { stamp } from "./GenesisPanels";
function Evidence({ id }: { id: string }) {
  const [open, setOpen] = useState(false),
    e = useQuery(
      api.genesis.researchEvidence,
      open ? { actionId: id } : "skip",
    );
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>See the original record</summary>
      {open &&
        (e ? (
          <div>
            <p>
              {stamp(e.tick)} · {e.text}
            </p>
            <small>Source: {e.actionId}</small>
          </div>
        ) : (
          <p>
            {e === undefined
              ? "Opening the original record…"
              : "This original record is not available here."}
          </p>
        ))}
    </details>
  );
}
export default function ConnectedSociety({
  state,
  revision,
}: {
  state: LivingState;
  revision: number;
}) {
  const d = digitalLife(state),
    settings = useMutation(api.genesis.digitalSettings),
    [viewAs, setViewAs] = useState("observer"),
    [thread, setThread] = useState(""),
    [search, setSearch] = useState(""),
    [person, setPerson] = useState(state.citizens[0]?.id ?? 0),
    [block, setBlock] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const viewer = viewAs === "observer" ? "observer" : Number(viewAs),
    view = digitalView(state, viewer),
    name = (id: number) =>
      state.citizens.find((c) => c.id === id)?.name ?? "Former villager",
    citizen = (id: number) => state.citizens.find((c) => c.id === id),
    portrait = (id: number) => (
      <Portrait
        name={name(id)}
        color={factionColors[citizen(id)?.faction ?? ""] ?? "#ae9fdd"}
        size={36}
      />
    );
  async function save(values: {
    enabled?: boolean;
    citizen?: number;
    phone?: boolean;
    posting?: boolean;
    block?: number;
    unblock?: number;
    hidePost?: string;
  }) {
    setBusy(true);
    try {
      const r = await settings({ ...values, expectedRevision: revision });
      setStatus(r.message);
    } catch {
      setStatus("That change didn’t save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const threads = [...new Set(view.messages.map((m) => m.thread))],
    messages = view.messages.filter(
      (m) =>
        (!thread || m.thread === thread) &&
        (!search || m.body.toLowerCase().includes(search.toLowerCase())),
    ),
    prefs = d.profiles[person] ?? { phone: true, posting: true, blocked: [] };
  return (
    <>
      <section
        className="panel connected"
        id="genesis-messages"
        aria-label="Genesis Messages"
      >
        <span className="eyebrow">
          LITTLE SCREENS, REAL VILLAGE CONSEQUENCES
        </span>
        <h2>Messages</h2>
        <p>
          Citizens text one another as village time moves forward. You’re
          reading their saved conversations—not sending messages to real people.
        </p>
        <label className="phone-switch">
          <input
            type="checkbox"
            aria-label="Village phones are on"
            checked={d.enabled}
            disabled={busy}
            onChange={(e) => void save({ enabled: e.target.checked })}
          />
          Village phones are {d.enabled ? "on" : "off"}
        </label>
        {!d.enabled && (
          <p>
            Turn on village phones, then play or advance village time. Evening
            messages and posts wait until people have time; sleep, meals and
            urgent needs come first.
          </p>
        )}
        <label>
          Whose view?
          <select
            aria-label="Digital life viewpoint"
            value={viewAs}
            onChange={(e) => {
              setViewAs(e.target.value);
              setThread("");
            }}
          >
            <option value="observer">
              The Observer · all saved fictional conversations
            </option>
            {state.citizens.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · their own messages
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          {viewer === "observer"
            ? "This is your Observer inspection view. Citizen decision rules only read their own messages and permitted public posts."
            : "This view shows this villager’s own conversations and visible public posts. Inspecting it does not mark messages as read for them."}
        </p>
        <div className="digital-layout">
          <aside aria-label="Text conversations">
            <button aria-pressed={!thread} onClick={() => setThread("")}>
              All conversations
            </button>
            {threads.map((t) => (
              <button
                key={t}
                aria-pressed={thread === t}
                onClick={() => setThread(t)}
              >
                {t
                  .split(":")
                  .map((id) => name(Number(id)))
                  .join(" & ")}
              </button>
            ))}
          </aside>
          <div>
            <label>
              Find a text
              <input
                aria-label="Search saved texts"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search these conversations"
              />
            </label>
            {messages.length ? (
              messages.map((m) => (
                <article className="text-message" key={m.id}>
                  <header>
                    {portrait(m.from)}
                    <div>
                      <strong>
                        {name(m.from)} → {name(m.to)}
                      </strong>
                      <small>{stamp(m.tick)}</small>
                    </div>
                  </header>
                  <p>{m.body}</p>
                  <small>
                    {m.readTick === undefined
                      ? "Delivered · waiting for " +
                        name(m.to) +
                        " to check their phone"
                      : "Read at " + stamp(m.readTick)}
                  </small>
                  <Evidence id={m.id} />
                </article>
              ))
            ) : (
              <p>
                No saved texts match this view yet. Nobody is made to text just
                to fill the screen.
              </p>
            )}
          </div>
        </div>
        <details>
          <summary>Plans made by text</summary>
          {view.meetings.length ? (
            view.meetings
              .slice()
              .reverse()
              .map((m) => (
                <article key={m.id}>
                  <strong>
                    {name(m.organizer)} & {name(m.guest)} · {m.topic}
                  </strong>
                  <p>
                    {m.location} · {stamp(m.start)} ·{" "}
                    {
                      {
                        invited: "Waiting for an answer",
                        accepted: "Both agreed to meet",
                        declined: "Invitation declined",
                        attended: "They met",
                        missed: "The plan did not happen",
                      }[m.status]
                    }
                  </p>
                  {m.outcome && <p>{m.outcome}</p>}
                  <Evidence id={m.source} />
                </article>
              ))
          ) : (
            <p>No meetup invitations have been recorded yet.</p>
          )}
        </details>
        <details>
          <summary>Phone preferences & blocked contacts</summary>
          <label>
            Choose a villager
            <select
              aria-label="Phone preferences for"
              value={person}
              onChange={(e) => {
                setPerson(Number(e.target.value));
                setBlock("");
              }}
            >
              {state.citizens
                .filter((c) => state.life.people[c.id].ageAtStart >= 18)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.phone}
              disabled={busy}
              onChange={(e) =>
                void save({ citizen: person, phone: e.target.checked })
              }
            />
            May use village messages and WHISPER
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.posting}
              disabled={busy}
              onChange={(e) =>
                void save({ citizen: person, posting: e.target.checked })
              }
            />
            May share public posts
          </label>
          <label>
            Block a contact
            <select
              aria-label="Contact to block"
              value={block}
              onChange={(e) => setBlock(e.target.value)}
            >
              <option value="">Choose someone</option>
              {state.citizens
                .filter(
                  (c) =>
                    c.id !== person && state.life.people[c.id].ageAtStart >= 18,
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            disabled={busy || !block}
            onClick={() => void save({ citizen: person, block: Number(block) })}
          >
            Block contact
          </button>
          {prefs.blocked.map((id) => (
            <button
              disabled={busy}
              key={id}
              onClick={() => void save({ citizen: person, unblock: id })}
            >
              Unblock {name(id)}
            </button>
          ))}
          <p>
            Blocking stops new digital exchanges and hides the contact’s posts
            in that villager’s view. Earlier records remain available to The
            Observer.
          </p>
        </details>
        <p role="status">{busy ? "Saving your phone preferences…" : status}</p>
        <details>
          <summary>How this first version works</summary>
          <p>
            Adults can choose to invite someone to a shared-interest meetup,
            answer a text later, or spend an evening on WHISPER. An accepted
            plan can become a recorded gathering; urgent needs may prevent it.
            Replies and attended meetings can change trust, with the reason
            saved.
          </p>
          <p>
            Recent view: up to 120 texts, 40 posts and 40 plans. Original action
            records stay in village history. This is a rules-based pilot, with
            no paid AI calls, real social accounts or background activity while
            the village is stopped. Group chats, SPARK, business teams, citizen
            reports and real multi-user permissions are still being developed.
          </p>
        </details>
      </section>
      <section
        className="panel connected"
        id="genesis-whisper"
        aria-label="Whisper"
      >
        <span className="eyebrow">THE VILLAGE, IN THEIR OWN WORDS</span>
        <h2>WHISPER</h2>
        <p>
          Public posts come from recorded experiences. A post is what someone
          chose to share; it does not make every interpretation true.
        </p>
        <details>
          <summary>Meet the people on WHISPER</summary>
          <div className="whisper-accounts">
            {state.citizens
              .filter((c) => state.life.people[c.id].ageAtStart >= 18)
              .map((c) => (
                <article key={c.id}>
                  <header>
                    {portrait(c.id)}
                    <strong>{c.name}</strong>
                  </header>
                  <p>
                    {state.life.people[c.id].profile?.biography ||
                      "A villager building a life here."}
                  </p>
                  <small>
                    {state.life.people[c.id].profile?.hobbies.join(" · ")}
                  </small>
                  <p>
                    {d.profiles[c.id]?.phone === false
                      ? "Taking a break from village phones"
                      : d.enabled
                        ? "Village account · chooses when to participate"
                        : "Account ready · village phones are off"}
                  </p>
                </article>
              ))}
          </div>
        </details>
        {view.posts.length ? (
          view.posts
            .slice()
            .reverse()
            .map((post) => (
              <article className="whisper-post" key={post.id}>
                <header>
                  {portrait(post.author)}
                  <div>
                    <strong>{name(post.author)}</strong>
                    <small>
                      {stamp(post.tick)} · Public · {post.topic}
                    </small>
                  </div>
                </header>
                <p>{post.body}</p>
                <Evidence id={post.evidence} />
                <p className="muted">
                  {post.reactions.length
                    ? post.reactions.map(name).join(", ") + " reacted."
                    : "No reactions yet."}
                </p>
                {post.comments.map((comment) => (
                  <blockquote key={comment.id}>
                    <strong>{name(comment.author)}</strong> ·{" "}
                    {stamp(comment.tick)}
                    <p>{comment.body}</p>
                    <Evidence id={comment.id} />
                  </blockquote>
                ))}
                {viewer === "observer" && (
                  <button
                    disabled={busy}
                    onClick={() => void save({ hidePost: post.id })}
                  >
                    Hide this post from WHISPER
                  </button>
                )}
              </article>
            ))
        ) : (
          <p>
            Nobody has shared a visible post yet. Let village life unfold; the
            feed will stay quiet until someone chooses to share something they
            actually experienced.
          </p>
        )}
        <p className="muted">
          Comments and reactions are saved citizen actions. Reading a public
          post can pass its contents to that reader as an attributed report; it
          does not grant access to the author’s private texts or other memories.
          Followers, groups, businesses and rumor transformations are not part
          of this first pilot.
        </p>
      </section>
    </>
  );
}
