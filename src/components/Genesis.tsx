import ResearchLibrary from "./ResearchLibrary";
import { DailyTea, GenesisHelp } from "./GenesisFriendly";
import { friendlyIntent } from "../../data/genesisFriendly";
import "./GenesisFriendly.css";
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
import GenesisWorld from "./GenesisWorld3D";
import {
  CitizenPanel,
  EventList,
  ChatPanel,
  ObserverPanel,
  BuildingPanel,
  stamp,
} from "./GenesisPanels";
import FamilyLegacyArchive from "./FamilyLegacyArchive";
import CreationStudio from "./CreationStudio";
import CharacterStudio from "./CharacterStudio";
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
  const allEvents = useQuery(api.genesis.history, {});
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
    if (
      error &&
      (message.includes("[CONVEX") ||
        message.includes("Server Error") ||
        message.includes("Mutation failed"))
    )
      message =
        "That change didn’t save as expected. Please try again. Any earlier saved progress is kept.";
    if (message === "Saved.") message = "Your changes have been saved.";
    if (message.startsWith("Catch-up saved:"))
      message = "Your village has caught up. The new updates are saved.";
    if (message.includes("No away time"))
      message = "There’s no missed time to catch up yet.";
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
            ". Your village progress is saved.",
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
    let value = input.trim();
    if (!value) return;
    setPlaying(false);
    setPending(undefined);
    const intent = friendlyIntent(value);
    const go = (id: string) =>
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (intent.kind === "citizen") {
      const person = state.citizens.find(
        (c) => c.name.toLowerCase() === intent.name,
      );
      if (!person) {
        report(
          "We couldn’t find that villager. Try their name from The People.",
          true,
        );
        return;
      }
      setSelected(person.id);
      setBuilding(undefined);
      requestAnimationFrame(() => go("genesis-inspector"));
      report("Here’s " + person.name + "’s profile.");
      return;
    }
    if (intent.kind === "research") {
      go("genesis-research");
      report(
        "Here are the village’s saved investigations, predictions and evidence. This first pilot studies harvest patterns.",
      );
      return;
    }
    if (intent.kind === "people") {
      go("genesis-people");
      report(
        "Here’s what everyone’s doing. Choose a villager to get to know them.",
      );
      return;
    }
    if (intent.kind === "couples" || intent.kind === "families") {
      go("genesis-families");
      report(
        intent.kind === "families"
          ? "Dating and marriage are working. Babies, adoption and family trees are still on the way."
          : "Here are the village’s recorded relationships.",
      );
      return;
    }
    if (intent.kind === "rivals") {
      const pairs = Object.entries(state.trust)
        .filter(([, n]) => n <= -20)
        .map(([key]) =>
          key
            .split(":")
            .map(
              (id) =>
                state.citizens.find((c) => c.id === Number(id))?.name ??
                "a former villager",
            )
            .join(" and "),
        );
      report(
        pairs.length
          ? "Strained relationships: " +
              pairs.join("; ") +
              ". Open a profile for their recent experiences."
          : "No strongly strained relationships are recorded right now. Smaller disagreements can still happen.",
      );
      return;
    }
    if (intent.kind === "today") {
      document.getElementById("genesis-tea-today")?.click();
      setHistoryDays(1);
      setSelected(undefined);
      setBuilding(undefined);
      go("genesis-news");
      report(
        "Today’s saved news is in The Daily Tea. Village History has the recent event list.",
      );
      return;
    }
    if (intent.kind === "talk") {
      go("genesis-talk");
      report(
        "Here are the latest saved conversations. Rumor tracking is still being developed.",
      );
      return;
    }
    if (intent.kind === "observer-beliefs") {
      report(
        "Beliefs about the Observer aren’t tracked yet. You can see each villager’s current outlook in their profile.",
        true,
      );
      return;
    }
    if (intent.kind === "weather-unavailable") {
      report(
        "Choosing the weather isn’t ready yet. Weather changes with village time. You can introduce a mysterious light instead—with confirmation.",
        true,
      );
      return;
    }
    if (intent.kind === "create") {
      go("genesis-people");
      document.getElementById("genesis-create-citizen")?.click();
      report(
        "Choose your new villager’s details, then save when you’re ready.",
      );
      return;
    }
    if (intent.text) value = intent.text;
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
        "Households are listed from most to least savings in Village Money.",
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
      report("Here are the saved updates from that period.");
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
            "Move village life ahead by 30 days? We’ll save a point you can return to first.",
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
        report("Take a look, then confirm if you’re happy with this change.");
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
      report("Your village save point is ready.");
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
          "Your village is back at that saved moment. The village you left has a save point too.",
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
          <div className="eyebrow">THE OBSERVER · Abby · saved world</div>
          <h1>
            Project Genesis <span>The Awakening</span>
          </h1>
          <div className="notice">
            <strong>Your village saves as you go.</strong> Press Play village to
            watch life unfold.{" "}
            <a href="#genesis-help">New here? Start with the quick guide.</a>
          </div>
        </header>
        {current === undefined ? (
          <p role="status">Opening your village…</p>
        ) : !state ? (
          <section className="panel empty">
            <h2>Welcome to your village</h2>
            <p className="muted">
              Meet twelve adult villagers and watch their lives unfold. Your
              original town is kept safe.
            </p>
            <button className="primary" onClick={() => void begin()}>
              Begin Genesis
            </button>
          </section>
        ) : (
          <>
            <nav className="genesis-nav" aria-label="Village navigation">
              {[
                ["My Village", "genesis-village"],
                ["The People", "genesis-people"],
                ["Love & Families", "genesis-families"],
                ["Town Talk", "genesis-talk"],
                ["Research Library", "genesis-research"],
                ["What’s Happening", "genesis-news"],
                ["The Observatory", "genesis-command-center"],
                ["Village History", "genesis-history"],
                ["How Genesis Works", "genesis-help"],
                ["Creation Studio", "genesis-creation-studio"],
              ].map(([name, id]) => (
                <a key={id} href={"#" + id}>
                  {name}
                </a>
              ))}
            </nav>
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
                {playing ? "Pause village" : "Play village"}
              </button>
              <select
                aria-label="Village speed"
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
                Back to my village
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
                      "Move village life ahead by 30 days? We’ll save a point you can return to first.",
                  })
                }
              >
                + 1 month
              </button>
              <button
                disabled={busy || playing}
                onClick={() => void catchUpNow()}
              >
                Catch up on village time
              </button>
            </div>
            <DailyTea
              key={current.id + ":" + state.life.timeline}
              state={state}
              events={allEvents as any}
              worldId={current.id}
            />
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
                    placeholder="What would you like to do in your village?"
                    disabled={busy}
                  />
                  <button
                    className="primary"
                    type="submit"
                    disabled={busy || !text.trim()}
                  >
                    {busy ? "Saving…" : "Let’s do it"}
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
                    "Pause village citizen activities",
                    "Show me what changed in the last 30 days",
                    "Research: compare food yields during rain",
                  ].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </form>
              <div
                className="command-examples"
                aria-label="Try a village command"
              >
                {[
                  "What’s everyone researching?",
                  "What’s everyone doing?",
                  "Who’s dating?",
                  "Has anyone had a baby?",
                  "Who’s fighting?",
                  "Show me Sage’s personality.",
                  "What happened today?",
                  "Create a new citizen.",
                  "Show me the latest gossip.",
                  "Advance one week.",
                ].map((example) => (
                  <button
                    disabled={busy}
                    key={example}
                    onClick={() => {
                      setText(example);
                      void send(example);
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
              <details>
                <summary>More things you can ask</summary>
                <p className="muted">
                  Movement: Mara go to gardens · Meeting: Mara meet Nyra at
                  observatory · Everyone gather at council · Build a hospital ·
                  Create a food shortage · Introduce a mysterious light ·
                  Research: [problem] · Advance 1–10 days · Show me Sage's
                  relationships · Show the wealthiest households · Pause village
                  citizen activities.
                </p>
                <p className="muted">
                  Unknown commands do not change state. World events and funded
                  construction require confirmation.
                </p>
              </details>
              {pending && (
                <div className="confirm-box" role="alert">
                  <strong>Ready to change your village?</strong>
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
                <span className="muted">Villagers</span>
                <strong>{state.citizens.length}</strong>
              </div>
              <div className="stat">
                <span className="muted">Meals available</span>
                <strong>{state.supplies}</strong>
              </div>
              <div className="stat">
                <span className="muted">Village funds</span>
                <strong>{money(state.life.accounts.treasury)}</strong>
              </div>
              <div className="stat">
                <span className="muted">Close friendships / tensions</span>
                <strong>
                  {Object.values(state.trust).filter((v) => v >= 30).length} /{" "}
                  {Object.values(state.trust).filter((v) => v <= -20).length}
                </strong>
              </div>
              <div className="stat">
                <span className="muted">Under construction</span>
                <strong>
                  {state.life.buildings.filter((b) => b.progress < 100).length}
                </strong>
              </div>
              <div className="stat">
                <span className="muted">Research notes</span>
                <strong>{state.life.research}</strong>
              </div>
            </div>
            <div className="build-tools">
              <label>
                Choose a building{" "}
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
                <GenesisWorld
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
                <FamilyLegacyArchive state={state} />
                <div id="genesis-people">
                  <CharacterStudio
                    state={state}
                    selected={selected}
                    revision={current.revision ?? 0}
                    onSelect={setSelected}
                  />
                  <div className="panel roster-panel">
                    <h2>The People</h2>
                    <p>
                      See what everyone is up to. Choose a name to open their
                      story.
                    </p>
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
                              {state.life.people[c.id].job} ·{" "}
                              {state.life.people[c.id].activity}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
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
                      <h2>What’s Happening</h2>
                      <button onClick={() => setHistoryDays(0)}>
                        Recent updates
                      </button>
                    </div>
                    <p className="muted">
                      {historyDays ? "Last " + historyDays + " days · " : ""}
                      Recent village news. Choose a villager to follow their
                      story.
                    </p>
                    <EventList
                      events={((events || []) as LifeEvent[]).filter(
                        (e) =>
                          !historyDays ||
                          e.tick >= state.tick - historyDays * 4,
                      )}
                    />
                    <p className="muted">
                      Earlier village updates are still saved in Village
                      History.
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
            <section id="genesis-history" className="panel">
              <h2>Village History</h2>
              <p>
                Explore the village’s recent saved events. Earlier records
                remain saved.
              </p>
              <EventList
                events={((allEvents ?? []) as LifeEvent[]).filter(
                  (e) => !historyDays || e.tick >= state.tick - historyDays * 4,
                )}
              />
              <button onClick={() => setHistoryDays(0)}>
                Show all recent events
              </button>
              <small>
                Up to 100 updates from the latest 1,000 saved events.
              </small>
            </section>
            <ResearchLibrary state={state} />
            <GenesisHelp />
            <details className="panel">
              <summary>
                Creation Studio · products &amp; website projects
              </summary>
              <CreationStudio state={state} />
            </details>
            <section className="panel save-panel">
              <h2>Save & revisit your village</h2>
              <div className="toolbar">
                <button disabled={busy} onClick={() => void checkpoint()}>
                  Save a point in time
                </button>
                <select
                  aria-label="Saved checkpoint"
                  value={saveId}
                  onChange={(e) =>
                    setSaveId(e.target.value as Id<"genesisCheckpoints">)
                  }
                >
                  <option value="">Choose a saved moment</option>
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
                        "Return to this saved moment? We’ll save your current village first and keep its earlier history.",
                    })
                  }
                >
                  Return to this moment
                </button>
              </div>
              <div className="muted">
                Your progress saves automatically. Keep a save point before a
                big change, or return to an earlier moment to explore a
                different future. Catch up only moves time forward when you ask.{" "}
                <details>
                  <summary>Time and save details</summary>
                  <p>
                    You can keep up to 50 manual save points. Catch up advances
                    six village hours per real minute away, up to 10 village
                    days per request. Severe survival outcomes are off. No
                    connected language model or always-on background simulation
                    is configured.
                  </p>
                </details>
              </div>
            </section>
          </>
        )}
        <footer>
          <a href="?view=legacy">Visit the original AI Town</a> · Your village
          is private. <a href="#genesis-help">How Genesis Works</a>
        </footer>
      </div>
    </main>
  );
}
