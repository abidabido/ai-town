import { eventKindLabel } from "../../data/genesisFriendly";
import {
  readableEvent,
  relationshipLabel,
  placeName,
} from "../../data/genesisFriendly";
import { profileFor } from "../../data/genesisProfiles";
import { CitizenDiary } from "./CitizenDiary";
import { useState } from "react";
import type {
  LivingState,
  VillageMessage,
  Transaction,
  LifeEvent,
  Building,
} from "../../data/genesisLife";
import { calendar, money, totalMoney, FACTIONS } from "../../data/genesisLife";
import { pairKey } from "../../data/genesisEngine";
import { Portrait, factionColors } from "./GenesisWorld";
export const stamp = (tick: number) => {
  const c = calendar(tick);
  return (
    "Year " +
    c.year +
    " · Month " +
    c.month +
    " · Day " +
    c.day +
    " · " +
    String(c.hour).padStart(2, "0") +
    ":00"
  );
};
const Meter = ({
  label,
  value,
  inverse = false,
}: {
  label: string;
  value: number;
  inverse?: boolean;
}) => (
  <div className="need">
    <div>
      <span>{label}</span>
      <strong>{Math.round(value)}</strong>
    </div>
    <div className="bar">
      <span
        style={{
          width: value + "%",
          background:
            (inverse ? 100 - value : value) < 30 ? "#ed9d94" : "#ace2bd",
        }}
      />
    </div>
  </div>
);
export function CitizenPanel({
  state,
  id,
  events,
  onClose,
  onTalk,
}: {
  state: LivingState;
  onTalk: () => void;
  id: number;
  events: LifeEvent[];
  onClose: () => void;
}) {
  const c = state.citizens.find((c) => c.id === id),
    p = state.life.people[id];
  if (!c || !p)
    return (
      <section className="panel">
        <p>We couldn’t find that villager.</p>
        <button onClick={onClose}>Close</button>
      </section>
    );
  const profile = profileFor(c, p),
    age =
      p.ageAtStart + Math.floor((state.tick - state.life.startedTick) / 1440);
  const relations = state.citizens
    .filter((d) => d.id !== id)
    .map((d) => ({
      id: d.id,
      name: d.name,
      value: state.trust[pairKey(id, d.id)] ?? 0,
    }))
    .sort((a, b) => b.value - a.value);
  const active = state.life.families?.partnerships.find(
    (r) => (r.a === id || r.b === id) && r.status !== "separated",
  );
  const partner = active
    ? state.citizens.find(
        (other) => other.id === (active.a === id ? active.b : active.a),
      )
    : undefined;
  const mates = state.citizens.filter(
    (other) => other.id !== id && state.life.people[other.id].home === p.home,
  );
  const traits = Object.entries(profile.traits)
    .filter(([, v]) => v >= 70)
    .slice(0, 3)
    .map(([name]) => name.toLowerCase());
  return (
    <section className="panel inspector" aria-label={c.name + "'s profile"}>
      <div className="section-head">
        <div className="identity">
          <Portrait
            name={c.name}
            color={factionColors[p.initialFaction]}
            size={54}
          />
          <div>
            <div className="eyebrow">Get to know them</div>
            <h2>Meet {c.name}</h2>
          </div>
        </div>
        <button onClick={onClose}>Close</button>
      </div>
      <button className="talk-to-citizen" onClick={onTalk}>
        TALK TO CITIZEN
      </button>
      <h3>About Me</h3>
      <p>
        {c.name} is a {age}-year-old {p.job.toLowerCase()}
        {profile.hobbies.length
          ? " who enjoys " + profile.hobbies.slice(0, 3).join(", ")
          : ""}
        .
      </p>
      <p className="muted">{profile.biography}</p>
      <p>Village savings: {money(state.life.accounts["citizen:" + id] ?? 0)}</p>
      <h3>What I’m Doing</h3>
      <p className="activity">
        {p.activity} · {placeName(p.location)}
      </p>
      <h3>How I’m Feeling</h3>
      <p>
        {p.hunger >= 70
          ? "Needs a meal"
          : p.hunger >= 40
            ? "Could use a bite"
            : "Well fed"}{" "}
        ·{" "}
        {p.fatigue >= 70
          ? "Ready for some rest"
          : p.fatigue >= 40
            ? "A little tired"
            : "Rested"}{" "}
        ·{" "}
        {p.stress >= 60
          ? "Under pressure"
          : p.happiness >= 65
            ? "In good spirits"
            : "Taking the day as it comes"}
        {p.loneliness >= 60 ? " · Could use some company" : ""}.
      </p>
      <h3>My Personality</h3>
      <p>
        {traits.length
          ? "Strong tendencies: " + traits.join(", ") + "."
          : "Still getting to know them? Their personality has a mix of strengths and preferences."}
      </p>
      <h3>Things I Love</h3>
      <p>{profile.hobbies.join(" · ") || "No hobbies chosen yet."}</p>
      <h3>What I’m Thinking About</h3>
      <p>Current goal: {p.goal}</p>
      <p>Outlook: {c.faction}. Their views can change after conversations.</p>
      <h3>My Friends</h3>
      <div className="relationship-list">
        {relations.map((r) => (
          <span
            key={r.id}
            className={
              r.value >= 30 ? "ally" : r.value <= -20 ? "conflict" : ""
            }
          >
            {r.name} · {relationshipLabel(r.value)}
          </span>
        ))}
      </div>
      <p className="muted">
        These descriptions come from recorded trust. They do not imply romance.
      </p>
      <h3>My Love Life</h3>
      <p>
        {active && partner
          ? (active.status === "married" ? "Married to " : "Dating ") +
            partner.name +
            "."
          : "Not in a recorded partnership right now."}
      </p>
      <h3>My Family</h3>
      <p>
        {mates.length
          ? "Sharing a home with " + mates.map((m) => m.name).join(", ") + "."
          : "Living independently."}{" "}
        Housemates aren’t automatically partners or relatives. Babies and family
        trees are still on the way.
      </p>
      <details>
        <summary>Personality scores & detailed information</summary>
        <p>
          Age {age} · {p.job} · home {p.home} · skill {p.skill.toFixed(1)}/100
        </p>
        <div className="needs-grid">
          <Meter label="Hunger" value={p.hunger} inverse />
          <Meter label="Tiredness" value={p.fatigue} inverse />
          <Meter label="Health" value={p.health} />
          <Meter label="Stress" value={p.stress} inverse />
          <Meter label="Happiness" value={p.happiness} />
          <Meter label="Loneliness" value={p.loneliness} inverse />
        </div>
        {Object.entries(profile.traits).map(([trait, value]) => (
          <p key={trait}>
            {trait}: {value}/100
          </p>
        ))}
        <h4>Beliefs in detail</h4>
        {Object.entries(p.beliefs).map(([name, value]) => (
          <p key={name}>
            {name}: {value}%
          </p>
        ))}
        <h4>Trust scores</h4>
        {relations.map((r) => (
          <p key={r.id}>
            {r.name}: {r.value}
          </p>
        ))}
      </details>
      <h3>What I’m Investigating</h3>
      {(state.life.inquiry?.projects ?? [])
        .filter((p) => p.owner === id || p.peer === id)
        .map((p) => (
          <div key={p.id}>
            <p>{p.question}</p>
            <p>
              {p.stage === "concluded"
                ? "A finding is saved."
                : "Still exploring the evidence."}
            </p>
            <a href="#genesis-research">Open this investigation</a>
          </div>
        ))}
      {!(state.life.inquiry?.projects ?? []).some(
        (p) => p.owner === id || p.peer === id,
      ) && <p>No personal investigation is recorded yet.</p>}
      <CitizenDiary state={state} id={id} />
      <h3>My Story So Far</h3>
      <EventList events={events.slice(0, 30)} />
      <p className="muted">
        Showing up to 30 recent experiences. Village History has more saved
        updates.
      </p>
    </section>
  );
}
export function EventList({ events }: { events: LifeEvent[] }) {
  return (
    <div className="events">
      {events.length === 0 ? (
        <p className="muted">
          Nothing to show here yet. Village updates will appear as life unfolds.
        </p>
      ) : (
        events.map((e, i) => (
          <article className="event" key={e.actionId + "-" + i}>
            <small>
              {stamp(e.tick)} · {eventKindLabel(e.kind)}
            </small>
            <p>{readableEvent(e)}</p>
            {e.reason && (
              <details>
                <summary>Why did that happen?</summary>
                <p className="muted">{e.reason}</p>
                <details>
                  <summary>Technical details</summary>
                  <p>{e.text}</p>
                  <small>{e.source}</small>
                  <code>{e.actionId}</code>
                </details>
              </details>
            )}
          </article>
        ))
      )}
    </div>
  );
}
export function ChatPanel({
  state,
  messages,
  follow,
  setFollow,
  search,
  setSearch,
  faction,
  setFaction,
}: {
  state: LivingState;
  messages: VillageMessage[] | undefined;
  follow: boolean;
  setFollow: (b: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
  faction: string;
  setFaction: (s: string) => void;
}) {
  return (
    <section id="genesis-talk" className="panel chat-panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> Around the village
          </div>
          <h2>Town Talk</h2>
        </div>
        <span className="badge">Saved conversations</span>
      </div>
      <div className="muted">
        Read conversations from real village meetings. You can see private chats
        as the Observer.{" "}
        <details>
          <summary>How Town Talk works</summary>
          <p>
            Dialogue uses written patterns tied to the participants and their
            real interaction, not a connected language model. Private chats are
            not automatically shared with other villagers.
          </p>
        </details>
      </div>
      <div className="filter-row">
        <input
          aria-label="Search conversations"
          placeholder="Search conversation text"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filter conversation faction"
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
        >
          <option value="">All outlooks</option>
          {[
            ...new Set([...FACTIONS, ...state.citizens.map((c) => c.faction)]),
          ].map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={follow}
          onChange={(e) => setFollow(e.target.checked)}
        />{" "}
        Follow this villager
      </label>
      <div className="chat-feed" aria-label="Recorded village conversations">
        {messages === undefined ? (
          <p role="status">Gathering the latest town conversations…</p>
        ) : messages.length === 0 ? (
          <p className="empty muted">
            No conversations here yet. Villagers often chat in the evening when
            they have time and energy.
          </p>
        ) : (
          messages.map((m, i) => {
            const speaker = state.citizens.find((c) => c.id === m.speaker),
              other = state.citizens.find((c) => c.id === m.recipient);
            return (
              <article
                className="chat-message"
                key={m.actionId + "-" + m.speaker + "-" + i}
              >
                <Portrait
                  name={speaker?.name || "Citizen"}
                  color={
                    factionColors[state.life.people[m.speaker].initialFaction]
                  }
                />
                <div>
                  <strong>
                    {speaker?.name}{" "}
                    <span className="muted">→ {other?.name}</span>
                  </strong>
                  <small>
                    {stamp(m.tick)} · {placeName(m.location)} ·{" "}
                    {m.visibility === "public"
                      ? "Public chat"
                      : "Private chat · visible to you"}
                  </small>
                  <p>{m.text}</p>
                  <details>
                    <summary>About this conversation</summary>
                    <p>{m.topic}</p>
                    <details>
                      <summary>Technical details</summary>
                      <code>{m.actionId}</code>
                    </details>
                  </details>
                </div>
              </article>
            );
          })
        )}
      </div>
      <p className="muted">
        Showing up to 60 matching messages. Older conversations are saved too.
      </p>
    </section>
  );
}
export function ObserverPanel({
  state,
  ledger,
}: {
  state: LivingState;
  ledger: Transaction[] | undefined;
}) {
  const [tab, setTab] = useState("economy");
  const accountName = (id: string) =>
    id.startsWith("citizen:")
      ? (state.citizens.find((c) => c.id === Number(id.slice(8)))?.name ??
        "Former villager")
      : id === "treasury"
        ? "Village funds"
        : id === "cooperative"
          ? "Village cooperative"
          : id;
  const households = state.life.buildings
    .filter((b) => b.type === "House")
    .map((b) => ({
      name: b.id,
      people: state.citizens.filter(
        (c) => state.life.people[c.id].home === b.id,
      ),
    }))
    .map((h) => ({
      ...h,
      balance: h.people.reduce(
        (n, c) => n + state.life.accounts["citizen:" + c.id],
        0,
      ),
    }))
    .sort((a, b) => b.balance - a.balance);
  return (
    <section className="panel observer">
      <div className="section-head">
        <h2>Village Money</h2>
        <select
          aria-label="Observer view"
          value={tab}
          onChange={(e) => setTab(e.target.value)}
        >
          <option value="economy">Money & households</option>
          <option value="ledger">Money coming and going</option>
          <option value="systems">Technical details</option>
        </select>
      </div>
      {tab === "economy" ? (
        <>
          <dl className="profile-grid">
            <div>
              <dt>Village funds</dt>
              <dd>{money(state.life.accounts.treasury)}</dd>
            </div>
            <div>
              <dt>Cooperative business</dt>
              <dd>{money(state.life.accounts.cooperative)}</dd>
            </div>
            <div>
              <dt>Money in circulation</dt>
              <dd>{money(totalMoney(state))}</dd>
            </div>
            <div>
              <dt>Money check</dt>
              <dd>
                {totalMoney(state) === state.life.issued
                  ? "Everything adds up ✓"
                  : "Something needs checking"}
              </dd>
            </div>
            <div>
              <dt>Construction materials</dt>
              <dd>{state.life.materials}</dd>
            </div>
            <div>
              <dt>Research notes</dt>
              <dd>{state.life.research}</dd>
            </div>
          </dl>
          <h3>Household savings</h3>
          {households.map((h) => (
            <div className="household" key={h.name}>
              <span>
                {h.people.map((c) => c.name).join(" & ")}
                <small>Sharing a home</small>
              </span>
              <strong>{money(h.balance)}</strong>
            </div>
          ))}
          <p className="muted">
            Opening allocation: ¤100 per citizen, ¤1,000 treasury, ¤1,000
            cooperative. Money then moves through actual ledger entries. Wages:
            ¤3 gross; 10% wage tax; meals: ¤3. The current prototype has one
            cooperative employer and market.
          </p>
        </>
      ) : tab === "ledger" ? (
        <div className="ledger-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Transfer</th>
                <th>Amount</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {ledger?.map((t, i) => (
                <tr key={i}>
                  <td>{stamp(t.tick)}</td>
                  <td>
                    {accountName(t.from)} → {accountName(t.to)}
                  </td>
                  <td>{money(t.amount)}</td>
                  <td>
                    {t.reason}
                    <details>
                      <summary>Transfer details</summary>
                      <small>{t.actionId}</small>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            Latest 100 matching transfers from the latest 1,000. Earlier
            transfers remain stored.
          </p>
        </div>
      ) : (
        <>
          <p className="muted">
            Implemented: adult daily schedules, bounded needs, conserved money,
            food production/consumption, trust, belief weights, construction
            labor, templates tied to interactions, checkpoints and explicit
            catch-up.
          </p>
          <p className="muted">
            Not implemented yet: language-model planning, births, inheritance,
            crime/courts, elections, business competition, and scientifically
            meaningful experiment design. Model calls in this engine: 0. Severe
            survival outcomes are disabled; health has a floor of 25.
          </p>
          <p className="muted">
            Calendar: 30 days/month, 12 months/year. Catch-up runs only when
            requested; no always-on background process is configured. Convex
            usage is subject to the account's existing plan.
          </p>
        </>
      )}
    </section>
  );
}
export function BuildingPanel({
  building,
  onClose,
}: {
  building: Building | { id: string; type: string; x: number; y: number };
  onClose: () => void;
}) {
  const full = "progress" in building ? (building as Building) : undefined;
  return (
    <section className="panel">
      <div className="section-head">
        <h2>{building.type}</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <p className="muted">
        Map position: {building.x.toFixed(1)}, {building.y.toFixed(1)}
      </p>
      {full ? (
        <dl className="profile-grid">
          <div>
            <dt>Owner</dt>
            <dd>{full!.owner}</dd>
          </div>
          <div>
            <dt>Room for</dt>
            <dd>{full!.capacity}</dd>
          </div>
          <div>
            <dt>Construction</dt>
            <dd>{full!.progress}%</dd>
          </div>
          <div>
            <dt>Condition</dt>
            <dd>{full!.condition}%</dd>
          </div>
          <div>
            <dt>Construction cost</dt>
            <dd>{money(full!.cost)}</dd>
          </div>
          <div>
            <dt>Work completed</dt>
            <dd>
              {full!.labor} / {full!.cost ? 12 : 0}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="muted">
          One of the village’s original public places. Villagers come here for
          their daily activities.
        </p>
      )}
    </section>
  );
}
