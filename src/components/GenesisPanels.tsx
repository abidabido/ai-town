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
    "Y" +
    c.year +
    " · M" +
    c.month +
    " · D" +
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
}: {
  state: LivingState;
  id: number;
  events: LifeEvent[];
  onClose: () => void;
}) {
  const c = state.citizens.find((c) => c.id === id)!;
  const p = state.life.people[id],
    mates = state.citizens.filter(
      (other) => other.id !== id && state.life.people[other.id].home === p.home,
    );
  const age =
    p.ageAtStart + Math.floor((state.tick - state.life.startedTick) / 1440);
  const relations = state.citizens
    .filter((d) => d.id !== id)
    .map((d) => ({ name: d.name, value: state.trust[pairKey(id, d.id)] || 0 }))
    .sort((a, b) => b.value - a.value);
  return (
    <section className="panel inspector">
      <div className="section-head">
        <div className="identity">
          <Portrait
            name={c.name}
            color={factionColors[p.initialFaction]}
            size={54}
          />
          <div>
            <div className="eyebrow">{c.faction}</div>
            <h2>{c.name}</h2>
          </div>
        </div>
        <button onClick={onClose}>Close</button>
      </div>
      <p className="activity">
        {p.activity} · {p.location}
      </p>
      <dl className="profile-grid">
        <div>
          <dt>Age</dt>
          <dd>{age} · adult</dd>
        </div>
        <div>
          <dt>Occupation</dt>
          <dd>{p.job}</dd>
        </div>
        <div>
          <dt>Cash</dt>
          <dd>{money(state.life.accounts["citizen:" + id])}</dd>
        </div>
        <div>
          <dt>Skill</dt>
          <dd>{p.skill.toFixed(1)} / 100</dd>
        </div>
        <div>
          <dt>Home</dt>
          <dd>{p.home}</dd>
        </div>
        <div>
          <dt>Housemates</dt>
          <dd>{mates.map((d) => d.name).join(", ") || "None"}</dd>
        </div>
      </dl>
      <p className="muted">
        Housemates are not assumed to be romantic partners or family.
      </p>
      <h3>Needs & wellbeing</h3>
      <div className="needs-grid">
        <Meter label="Hunger" value={p.hunger} inverse />
        <Meter label="Fatigue" value={p.fatigue} inverse />
        <Meter label="Health" value={p.health} />
        <Meter label="Stress" value={p.stress} inverse />
        <Meter label="Happiness" value={p.happiness} />
        <Meter label="Loneliness" value={p.loneliness} inverse />
      </div>
      <h3>Personality & goal</h3>
      <p className="muted">
        Curiosity {p.curiosity} · Empathy {p.empathy} · Ambition {p.ambition} ·
        Risk tolerance {p.risk}
      </p>
      <p className="muted">{p.goal}</p>
      <h3>Philosophical outlook</h3>
      <p className="muted">
        Started: {p.initialFaction}. Current: {c.faction}. Belief weights change
        only through recorded persuasion actions.
      </p>
      {Object.entries(p.beliefs)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => (
          <div className="belief-row" key={name}>
            <span>{name}</span>
            <strong>{value}%</strong>
          </div>
        ))}
      <h3>Relationships</h3>
      <div className="relationship-list">
        {relations.map((r) => (
          <span
            key={r.name}
            className={
              r.value >= 30 ? "ally" : r.value <= -20 ? "conflict" : ""
            }
          >
            {r.name}{" "}
            <strong>
              {r.value > 0 ? "+" : ""}
              {r.value}
            </strong>
          </span>
        ))}
      </div>
      <h3>Recent decisions & experiences</h3>
      <EventList events={events} />
    </section>
  );
}
export function EventList({ events }: { events: LifeEvent[] }) {
  return (
    <div className="events">
      {events.length === 0 ? (
        <p className="muted">No matching decisions recorded yet.</p>
      ) : (
        events.map((e, i) => (
          <article className="event" key={e.actionId + "-" + i}>
            <small>
              {stamp(e.tick)} · {e.kind} · {e.source || "legacy rules"}
            </small>
            <p>{e.text}</p>
            {e.reason && (
              <details>
                <summary>Why it happened</summary>
                <p className="muted">{e.reason}</p>
                <code>{e.actionId}</code>
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
    <section className="panel chat-panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> Recorded encounters
          </div>
          <h2>THE VILLAGE WHISPER NETWORK</h2>
        </div>
        <span className="badge">Rules templates</span>
      </div>
      <p className="muted">
        Each message belongs to a saved encounter. These are template-based
        lines, not model-generated reasoning. In-world private conversations
        remain visible to you as observer.
      </p>
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
          <option value="">All factions</option>
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
        Follow selected citizen
      </label>
      <div className="chat-feed" aria-label="Recorded village conversations">
        {messages === undefined ? (
          <p role="status">Loading recorded conversations…</p>
        ) : messages.length === 0 ? (
          <p className="empty muted">
            No conversations match yet. Social encounters can occur at 18:00
            when needs allow.
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
                    {stamp(m.tick)} · {m.location} · {m.visibility}
                  </small>
                  <p>{m.text}</p>
                  <details>
                    <summary>{m.topic} · trace action</summary>
                    <code>{m.actionId}</code>
                  </details>
                </div>
              </article>
            );
          })
        )}
      </div>
      <p className="muted">
        Latest 60 matching messages from the most recent 500.
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
        <h2>Observer dashboard</h2>
        <select
          aria-label="Observer view"
          value={tab}
          onChange={(e) => setTab(e.target.value)}
        >
          <option value="economy">Economy & households</option>
          <option value="ledger">Transaction ledger</option>
          <option value="systems">System status</option>
        </select>
      </div>
      {tab === "economy" ? (
        <>
          <dl className="profile-grid">
            <div>
              <dt>Public treasury</dt>
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
              <dt>Conservation</dt>
              <dd>
                {totalMoney(state) === state.life.issued
                  ? "Balanced ✓"
                  : "ERROR"}
              </dd>
            </div>
            <div>
              <dt>Construction materials</dt>
              <dd>{state.life.materials}</dd>
            </div>
            <div>
              <dt>Research observations</dt>
              <dd>{state.life.research}</dd>
            </div>
          </dl>
          <h3>Household cash balances</h3>
          {households.map((h) => (
            <div className="household" key={h.name}>
              <span>
                {h.people.map((c) => c.name).join(" & ")}
                <small>{h.name} · housemates</small>
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
                    {t.from} → {t.to}
                  </td>
                  <td>{money(t.amount)}</td>
                  <td>
                    {t.reason}
                    <small>{t.actionId}</small>
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
            Not implemented yet: language-model planning, births, romantic
            relationships, inheritance, crime/courts, elections, business
            competition, and scientifically meaningful experiment design. Model
            calls in this engine: 0. Severe survival outcomes are disabled;
            health has a floor of 25.
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
        Site: {building.x.toFixed(1)}, {building.y.toFixed(1)}
      </p>
      {full ? (
        <dl className="profile-grid">
          <div>
            <dt>Owner</dt>
            <dd>{full!.owner}</dd>
          </div>
          <div>
            <dt>Capacity</dt>
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
            <dt>Funded cost</dt>
            <dd>{money(full!.cost)}</dd>
          </div>
          <div>
            <dt>Builder shifts</dt>
            <dd>
              {full!.labor} / {full!.cost ? 12 : 0}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="muted">
          Founding public infrastructure. Citizens use this location for their
          recorded activities.
        </p>
      )}
    </section>
  );
}
