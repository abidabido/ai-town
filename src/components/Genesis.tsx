import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  BUILDING_TYPES,
  calendar,
  money,
  type Building,
  type LifeEvent,
} from "../../data/genesisLife";
import { factionColors, Portrait } from "./GenesisWorld";
import GenesisWorld from './GenesisWorld3D';
import {
  CitizenPanel,
  EventList,
  ChatPanel,
  ObserverPanel,
  BuildingPanel,
  stamp,
} from "./GenesisPanels";
import FamilyLegacyArchive from './FamilyLegacyArchive';
import CreationStudio from './CreationStudio';
import CharacterStudio from './CharacterStudio';
import "./Genesis.css";
import "./GenesisLiving.css";
type Pending = {
  text: string;
  x?: number;
  y?: number;
  restore?: Id<"genesisCheckpoints">;
  month?: boolean;
  message: string;
};
export default function Genesis() {
  const current = useQuery(api.genesis.current),
    state = current?.state;
  const [selected, setSelected] = useState<number>(),
    [building, setBuilding] = useState<
      Building | { id: string; type: string; x: number; y: number }
    >();
  const events = useQuery(
    api.genesis.history,
    selected === undefined ? {} : { citizen: selected },
  );
  const [search, setSearch] = useState(""),
    [faction, setFaction] = useState(""),
    [follow, setFollow] = useState(false);
  const messages = useQuery(api.genesis.chat, {
    ...(follow && selected !== undefined ? { citizen: selected } : {}),
    ...(search ? { search } : {}),
    ...(faction ? { faction } : {}),
  });
  const ledger = useQuery(
      api.genesis.ledger,
      selected === undefined ? {} : { citizen: selected },
    ),
    saves = useQuery(api.genesis.checkpoints);
  const begin = useMutation(api.genesis.begin),
    advance = useMutation(api.genesis.advance),
    command = useMutation(api.genesis.command),
    save = useMutation(api.genesis.checkpoint),
    restore = useMutation(api.genesis.restore),
    catchUp = useMutation(api.genesis.catchUp);
  const [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(4000),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    [failed, setFailed] = useState(false),
    [text, setText] = useState(""),
    [pending, setPendingState] = useState<Pending>(),
    [placement, setPlacement] = useState(""),
    [buildType, setBuildType] = useState("hospital"),
    [saveId, setSaveId] = useState<Id<"genesisCheckpoints"> | "">(""),
    [historyDays, setHistoryDays] = useState(0);
  const setPending = (value?: Pending) => {
    setPendingState(value);
    if (value)
      document
        .getElementById("genesis-command-center")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const lock = useRef(false),
    refs = useRef({ tick: 0, revision: 0 });
  useEffect(() => {
    if (current)
      refs.current = { tick: current.state.tick, revision: current.revision };
  }, [current?.revision, current?.state.tick]);
  useEffect(() => {
    if (state?.life.paused) setPlaying(false);
  }, [state?.life.paused]);
  const report = (message: string, error = false) => {
    setFeedback(message);
    setFailed(error);
  };
  const step = async (steps: number, automatic = false) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    if (!automatic) setPlaying(false);
    let done = 0;
    try {
      let cursor = { ...refs.current };
      if (steps > 40) await save({ label: "Before 30-day advance" });
      while (done < steps) {
        const result = await advance({
          expectedTick: cursor.tick,
          expectedRevision: cursor.revision,
          steps: Math.min(40, steps - done),
          automatic,
        });
        cursor = { tick: result.tick, revision: result.revision };
        refs.current = cursor;
        done += Math.min(40, steps - done);
      }
      if (!automatic)
        report(
          "Advanced " +
            done / 4 +
            " " +
            (done === 4 ? "day" : "days") +
            ". All decisions and transactions saved.",
        );
    } catch (e) {
      setPlaying(false);
      report(
        (done ? "Saved " + done / 4 + " days before stopping. " : "") +
          (e instanceof Error ? e.message : String(e)),
        true,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void step(1, true);
    }, speed);
    return () => clearInterval(timer);
  }, [playing, speed]);
  const send = async (
    input: string,
    confirmed = false,
    x?: number,
    y?: number,
  ) => {
    if (lock.current || !state) return;
    const value = input.trim();
    if (!value) return;
    setPlaying(false);
    setPending(undefined);
    const observation = value.toLowerCase().replace(/[.!?]+$/, "");
    const match = observation.match(
      /^show(?: me)? ([a-z]+)(?:'s|’s)? (?:relationships|profile|memories)$/,
    );
    if (match) {
      const c = state.citizens.find((c) => c.name.toLowerCase() === match[1]);
      if (c) {
        setSelected(c.id);
        setBuilding(undefined);
        if (window.innerWidth < 850)
          document
            .getElementById("genesis-inspector")
            ?.scrollIntoView({ behavior: "smooth" });
        report("Showing " + c.name + ". No world state changed.");
        return;
      }
    }
    if (/^show(?: me)? (?:the )?wealthiest households$/.test(observation)) {
      document
        .getElementById("genesis-observer")
        ?.scrollIntoView({ behavior: "smooth" });
      report(
        "Household cash balances are sorted wealthiest first in Observer dashboard. No state changed.",
      );
      return;
    }
    if (
      observation.includes("committed a crime") ||
      observation.includes("legal history")
    ) {
      report(
        "Crime and court mechanics are not implemented yet. No criminal history can be inferred from the current data.",
        true,
      );
      return;
    }
    const days = observation.match(
      /^show(?: me)? what changed in the last (\d+) days$/,
    );
    if (days) {
      setHistoryDays(Math.min(365, Number(days[1])));
      setSelected(undefined);
      setBuilding(undefined);
      report(
        "Showing the latest recorded events within that period, up to 100. No state changed.",
      );
      return;
    }
    if (
      /^(?:advance|skip)(?: the simulation| simulation| time)?(?: by)? (?:1 month|30 days)$/.test(
        observation,
      )
    ) {
      if (!confirmed) {
        setPending({
          text: value,
          month: true,
          message:
            "Advance 30 simulated days in three bounded batches? A checkpoint will be saved first.",
        });
        return;
      }
      await step(120);
      setText("");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const result = await command({
        text: value,
        expectedTick: refs.current.tick,
        expectedRevision: refs.current.revision,
        confirmed,
        ...(x !== undefined ? { x } : {}),
        ...(y !== undefined ? { y } : {}),
      });
      if ("pending" in result && result.pending) {
        setPending({ text: value, x, y, message: result.message });
        report("Pending confirmation. Nothing has changed yet.");
      } else {
        report(result.message, !result.ok);
        if (result.ok) {
          if (
            "revision" in result &&
            typeof result.revision === "number" &&
            "tick" in result &&
            typeof result.tick === "number"
          )
            refs.current = { revision: result.revision, tick: result.tick };
          setText("");
          setPlacement("");
          if (/^(play|watch|resume)$/i.test(value)) setPlaying(true);
        }
      }
    } catch (e) {
      report(e instanceof Error ? e.message : String(e), true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const checkpoint = async () => {
    if (lock.current || !state) return;
    lock.current = true;
    setBusy(true);
    setPlaying(false);
    try {
      const id = await save({ label: "Manual save · " + stamp(state.tick) });
      setSaveId(id);
      report("Checkpoint saved.");
    } catch (e) {
      report(String(e), true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const confirm = async () => {
    const action = pending;
    if (!action) return;
    setPending(undefined);
    if (action.restore) {
      lock.current = true;
      setBusy(true);
      setPlaying(false);
      try {
        const result = await restore({ id: action.restore, confirmed: true });
        refs.current = { tick: result.tick, revision: result.revision };
        setSelected(undefined);
        setBuilding(undefined);
        report(
          "Checkpoint restored into a new timeline; a before-restore checkpoint was saved.",
        );
      } catch (e) {
        report(String(e), true);
      } finally {
        lock.current = false;
        setBusy(false);
      }
      return;
    }
    await send(action.text, true, action.x, action.y);
  };
  const catchUpNow = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setPlaying(false);
    try {
      const result = await catchUp({ expectedRevision: refs.current.revision });
      refs.current = { tick: result.tick, revision: result.revision };
      report(result.message);
    } catch (e) {
      report(String(e), true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const selectedBuilding =
    building && state
      ? state.life.buildings.find((b) => b.id === building.id) || building
      : undefined;
  return (
    <main className="genesis living">
      <div className="top">
        <header>
          <div className="eyebrow">Civilization observatory · saved world</div>
          <h1>
            Project Genesis <span>The Chaos Village</span>
          </h1>
          <div className="notice">
            <strong>Rules-based mode · progress saved.</strong> Dialogue uses
            labeled templates. Autoplay runs while open; catch-up is available
            when you return.
          </div>
        </header>
        {current === undefined ? (
          <p role="status">Connecting to your saved world…</p>
        ) : !state ? (
          <section className="panel empty">
            <h2>Begin the Genesis civilization</h2>
            <p className="muted">
              Twelve adult citizens. Your original AI Town remains preserved.
            </p>
            <button className="primary" onClick={() => void begin()}>
              Begin Genesis
            </button>
          </section>
        ) : (
          <>
            {!current.migrated && (
              <section className="notice">
                <strong>Daily-life update ready.</strong> Your existing world
                will be checkpointed before adding needs and opening balances.{" "}
                <button onClick={() => void begin()}>Enable daily life</button>
              </section>
            )}
            <div className="toolbar">
              <div className="clock">
                <strong>{stamp(state.tick)}</strong>
                <small>
                  Week {calendar(state.tick).week} · total day{" "}
                  {Math.floor(state.tick / 4) + 1} ·{" "}
                  {calendar(state.tick).season} · timeline{" "}
                  {state.life.timeline + 1}
                </small>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void send(playing ? "pause" : "play")}
              >
                {playing ? "Pause all" : "Watch civilization"}
              </button>
              <select
                aria-label="Simulation speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={8000}>Slow</option>
                <option value={4000}>Normal</option>
                <option value={2000}>Fast</option>
              </select>
              <button
                onClick={() =>
                  document
                    .getElementById("genesis-village")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Village view
              </button>
              <button disabled={busy || playing} onClick={() => void step(4)}>
                + 1 day
              </button>
              <button
                disabled={busy || playing}
                onClick={() =>
                  setPending({
                    text: "advance 1 month",
                    month: true,
                    message:
                      "Advance 30 days in bounded batches? A checkpoint will be saved first.",
                  })
                }
              >
                + 1 month
              </button>
              <button
                disabled={busy || playing}
                onClick={() => void catchUpNow()}
              >
                Catch up
              </button>
            </div>
            <section
              id="genesis-command-center"
              className="panel command-panel"
              aria-label="Genesis Command Center"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(text);
                }}
              >
                <label htmlFor="genesis-command">GENESIS GOD MODE</label>
                <div className="command-row">
                  <input
                    id="genesis-command"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    list="genesis-suggestions"
                    maxLength={240}
                    autoComplete="off"
                    placeholder="Build a hospital. Show me Sage's relationships. Advance 10 days."
                    disabled={busy}
                  />
                  <button
                    className="primary"
                    type="submit"
                    disabled={busy || !text.trim()}
                  >
                    {busy ? "Saving…" : "Send command"}
                  </button>
                </div>
                <datalist id="genesis-suggestions">
                  {[
                    "Build a hospital",
                    "Advance the simulation by 10 days",
                    "Show me Sage’s relationships",
                    "Show the wealthiest households",
                    "Create a food shortage",
                    "Introduce a mysterious light over the village",
                    "Pause all citizen activities",
                    "Show me what changed in the last 30 days",
                    "Research: compare food yields during rain",
                  ].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </form>
              <details>
                <summary>Supported commands & examples</summary>
                <p className="muted">
                  Movement: Mara go to gardens · Meeting: Mara meet Nyra at
                  observatory · Everyone gather at council · Build a hospital ·
                  Create a food shortage · Introduce a mysterious light ·
                  Research: [problem] · Advance 1–10 days · Show me Sage's
                  relationships · Show the wealthiest households · Pause all
                  citizen activities.
                </p>
                <p className="muted">
                  Unknown commands do not change state. World events and funded
                  construction require confirmation.
                </p>
              </details>
              {pending && (
                <div className="confirm-box" role="alert">
                  <strong>Confirm world change</strong>
                  <p>{pending.message}</p>
                  <div>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void confirm()}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setPending(undefined);
                        setPlacement("");
                        report("Cancelled. No changes made.");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {feedback && (
                <p
                  className={"command-feedback " + (failed ? "error" : "")}
                  role={failed ? "alert" : "status"}
                >
                  {feedback}
                </p>
              )}
            </section>
            <div className="stats">
              <div className="stat">
                <span className="muted">Adult population</span>
                <strong>{state.citizens.length}</strong>
              </div>
              <div className="stat">
                <span className="muted">Food servings</span>
                <strong>{state.supplies}</strong>
              </div>
              <div className="stat">
                <span className="muted">Treasury</span>
                <strong>{money(state.life.accounts.treasury)}</strong>
              </div>
              <div className="stat">
                <span className="muted">Alliances / conflicts</span>
                <strong>
                  {Object.values(state.trust).filter((v) => v >= 30).length} /{" "}
                  {Object.values(state.trust).filter((v) => v <= -20).length}
                </strong>
              </div>
              <div className="stat">
                <span className="muted">Active construction</span>
                <strong>
                  {state.life.buildings.filter((b) => b.progress < 100).length}
                </strong>
              </div>
              <div className="stat">
                <span className="muted">Research observations</span>
                <strong>{state.life.research}</strong>
              </div>
            </div>
            <div className="build-tools">
              <label>
                Build type{" "}
                <select
                  aria-label="Building type"
                  value={buildType}
                  onChange={(e) => setBuildType(e.target.value)}
                >
                  {Object.entries(BUILDING_TYPES).map(([name, spec]) => (
                    <option key={name} value={name}>
                      {name} · {money(spec.cost)} · {spec.materials} materials
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy}
                onClick={() => {
                  setPlaying(false);
                  setPlacement(placement ? "" : buildType);
                  setPending(undefined);
                  if (!placement)
                    document
                      .getElementById("genesis-village")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {placement ? "Cancel placement" : "Place a building"}
              </button>
              <span className="muted">
                Completed farms increase yields; hospitals improve care; labs
                increase observations.
              </span>
            </div>
            <div className="layout">
              <div>
                <CharacterStudio state={state} selected={selected} revision={current.revision??0} onSelect={setSelected}/><GenesisWorld
                  state={state}
                  selected={selected}
                  playing={playing}
                  placement={placement}
                  onPlace={(x, y) =>
                    void send("build a " + placement, false, x, y)
                  }
                  onCitizen={(id) => {
                    setSelected(id);
                    setBuilding(undefined);
                    if (window.innerWidth < 850)
                      document
                        .getElementById("genesis-inspector")
                        ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  onBuilding={(b) => {
                    setBuilding(b);
                    setSelected(undefined);
                  }}
                />
                <FamilyLegacyArchive state={state}/><CreationStudio state={state}/><div className="panel roster-panel">
                  <h2>Citizen directory</h2>
                  <div className="roster">
                    {state.citizens.map((c) => (
                      <button
                        key={c.id}
                        className={selected === c.id ? "selected" : ""}
                        aria-pressed={selected === c.id}
                        onClick={() => {
                          setSelected(c.id);
                          setBuilding(undefined);
                          if (window.innerWidth < 850)
                            document
                              .getElementById("genesis-inspector")
                              ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <Portrait
                          name={c.name}
                          color={
                            factionColors[
                              state.life.people[c.id].initialFaction
                            ]
                          }
                          size={32}
                        />
                        <span>
                          {c.name}
                          <small>
                            {state.life.people[c.id].job} · {c.faction}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div id="genesis-inspector">
                {selected !== undefined ? (
                  <CitizenPanel
                    state={state}
                    id={selected}
                    events={(events || []) as LifeEvent[]}
                    onClose={() => setSelected(undefined)}
                  />
                ) : selectedBuilding ? (
                  <BuildingPanel
                    building={selectedBuilding}
                    onClose={() => setBuilding(undefined)}
                  />
                ) : (
                  <section className="panel">
                    <div className="section-head">
                      <h2>World timeline</h2>
                      <button onClick={() => setHistoryDays(0)}>
                        All recent
                      </button>
                    </div>
                    <p className="muted">
                      {historyDays ? "Last " + historyDays + " days · " : ""}
                      Latest recorded decisions in this timeline. Select a
                      citizen to follow their life.
                    </p>
                    <EventList
                      events={((events || []) as LifeEvent[]).filter(
                        (e) =>
                          !historyDays ||
                          e.tick >= state.tick - historyDays * 4,
                      )}
                    />
                    <p className="muted">
                      Shows up to 100 events among the latest 1,000. Earlier
                      records remain saved.
                    </p>
                  </section>
                )}
              </div>
            </div>
            <div className="lower-layout">
              <ChatPanel
                state={state}
                messages={messages}
                follow={follow}
                setFollow={setFollow}
                search={search}
                setSearch={setSearch}
                faction={faction}
                setFaction={setFaction}
              />
              <div id="genesis-observer">
                <ObserverPanel state={state} ledger={ledger} />
              </div>
            </div>
            <section className="panel save-panel">
              <h2>Save, restore & observation</h2>
              <div className="toolbar">
                <button disabled={busy} onClick={() => void checkpoint()}>
                  Save checkpoint
                </button>
                <select
                  aria-label="Saved checkpoint"
                  value={saveId}
                  onChange={(e) =>
                    setSaveId(e.target.value as Id<"genesisCheckpoints">)
                  }
                >
                  <option value="">Choose a checkpoint</option>
                  {saves?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label.includes("Y")
                        ? s.label
                        : s.label + " · " + stamp(s.tick)}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!saveId || busy}
                  onClick={() =>
                    setPending({
                      text: "restore",
                      restore: saveId as Id<"genesisCheckpoints">,
                      message:
                        "Restore the selected saved state into a new timeline? Current state will be checkpointed first; earlier events remain archived.",
                    })
                  }
                >
                  Restore checkpoint
                </button>
              </div>
              <p className="muted">
                Every accepted action is saved automatically. Manual checkpoints
                are limited to 50. Catch-up simulates one six-hour step per
                elapsed real minute, capped at 10 days per request. It runs only
                when you press Catch up. No language-model calls are made by
                this engine. Severe survival outcomes are off.
              </p>
            </section>
          </>
        )}
        <footer>
          <a href="?view=legacy">Open preserved original AI Town</a> · Private
          Codespaces frontend · Existing Convex backend · No new paid services
          enabled
        </footer>
      </div>
    </main>
  );
}
