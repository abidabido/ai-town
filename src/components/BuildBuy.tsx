import BuildArchitecture from "./BuildArchitecture";
import { upgradeLot } from "../../data/genesisBuild";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  BUILD_CATALOG,
  emptyLot,
  changeBuild,
  undoBuild,
  redoBuild,
  validateLot,
  type BuildHistory,
  type BuildItem,
  type BuildKind,
  type LotDesign,
} from "../../data/genesisBuild";
import BuildScene from "./BuildScene";
import "./BuildBuy.css";
export default function BuildBuy({
  worldId,
}: {
  worldId: Id<"genesisSessions">;
}) {
  const row = useQuery(api.buildLots.current, { worldId }),
    save = useMutation(api.buildLots.save);
  const [open, setOpen] = useState(false),
    [h, setH] = useState<BuildHistory>({
      present: emptyLot(),
      past: [],
      future: [],
    }),
    [base, setBase] = useState(0),
    [saved, setSaved] = useState(""),
    [selected, setSelected] = useState(""),
    [tool, setTool] = useState("select"),
    [kind, setKind] = useState<BuildKind>("sofa"),
    [color, setColor] = useState("#ac7e6d"),
    [snap, setSnap] = useState(true),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [warning, setWarning] = useState(false),
    [search, setSearch] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [open]);
  const item = h.present.items.find((i) => i.id === selected),
    dirty = JSON.stringify(h.present) !== saved;
  const change = (design: LotDesign) => {
    try {
      const valid = validateLot(design);
      setH((old) => changeBuild(old, valid));
      setStatus("Draft updated. Save when you’re ready.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "That edit did not work.");
    }
  };
  const commit = (i: BuildItem) => {
    change({
      ...h.present,
      items: h.present.items.some((x) => x.id === i.id)
        ? h.present.items.map((x) => (x.id === i.id ? i : x))
        : [...h.present.items, i],
    });
    setSelected(i.id);
  };
  const enter = () => {
    const design = upgradeLot(row?.design ?? emptyLot());
    setH({ present: design, past: [], future: [] });
    setBase(row?.revision ?? 0);
    setSaved(JSON.stringify(design));
    setSelected("");
    setWarning(false);
    setTool("select");
    setOpen(true);
  };
  const exit = () => {
    if (busy) return;
    if (dirty) setWarning(true);
    else setOpen(false);
  };
  const persist = async () => {
    setBusy(true);
    try {
      const result = await save({
        worldId,
        expectedRevision: base,
        design: h.present,
      });
      setStatus(result.message);
      if (result.ok && result.revision) {
        setBase(result.revision);
        setSaved(JSON.stringify(h.present));
      }
    } catch {
      setStatus(
        "Your lot did not save. Your draft is still here; please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const duplicate = () => {
    if (!item) return;
    const copy = { ...item, id: crypto.randomUUID() };
    for (let z = -5; z <= 5; z += 0.5)
      for (let x = -5; x <= 5; x += 0.5) {
        try {
          const next = validateLot({
            ...h.present,
            items: [...h.present.items, { ...copy, x, z }],
          });
          change(next);
          setSelected(copy.id);
          return;
        } catch {}
      }
    setStatus("There isn’t enough clear space for another copy.");
  };
  return (
    <section className="panel build-launch" id="genesis-build">
      <div>
        <span>MAKE ROOM FOR YOUR IDEAS</span>
        <h2>Build &amp; Decorate</h2>
        <p>
          Your first creative lot. Arrange original 3D furniture and save your
          design.
        </p>
      </div>
      <button disabled={row === undefined} onClick={enter}>
        BUILD &amp; DECORATE
      </button>
      <small>
        {row
          ? "Willow lot · saved version " + row.revision
          : "Willow lot · 12 × 12 m · ready for your first design"}
      </small>
      {open && (
        <dialog
          className="build-dialog"
          ref={dialog}
          onCancel={(e) => {
            e.preventDefault();
            exit();
          }}
          aria-labelledby="build-title"
        >
          <div className="build-editor">
            <header>
              <div>
                <span>BUILD &amp; DECORATE · CREATIVE MODE</span>
                <h2 id="build-title">Willow design lot</h2>
                <small>
                  12 × 12 m · ground floor · unoccupied ·{" "}
                  {dirty
                    ? "Unsaved changes"
                    : base
                      ? "Saved design"
                      : "New unsaved lot"}
                </small>
              </div>
              <div>
                <button
                  disabled={busy || (!dirty && base > 0)}
                  onClick={persist}
                >
                  {busy ? "Saving…" : "Save design"}
                </button>
                <button disabled={busy} onClick={exit}>
                  Exit Build Mode
                </button>
              </div>
            </header>
            <div className="build-workspace">
              <aside aria-label="Furniture catalog">
                <label>
                  Choose a property
                  <select aria-label="Build lot">
                    <option>Willow design lot · 12 × 12 m</option>
                  </select>
                </label>
                <label>
                  Find something
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Sofa, garden, office…"
                  />
                </label>
                <div className="build-catalog">
                  {BUILD_CATALOG.filter((c) =>
                    (c.name + " " + c.category)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  ).map((c) => (
                    <button
                      key={c.kind}
                      aria-pressed={kind === c.kind && tool === "place"}
                      onClick={() => {
                        setKind(c.kind);
                        setColor(c.color);
                        setTool("place");
                        setSelected("");
                        setStatus(
                          "Drag onto a clear square. Green fits; coral means it won’t fit.",
                        );
                      }}
                    >
                      <span
                        className={"catalog-icon icon-" + c.kind}
                        aria-hidden="true"
                      >
                        {
                          {
                            sofa: "▰",
                            bed: "▱",
                            desk: "▤",
                            shelf: "▥",
                            table: "▰",
                            planter: "♧",
                            bench: "▱",
                          }[c.kind]
                        }
                      </span>
                      <strong>{c.name}</strong>
                      <small>
                        {c.category} · {c.w} × {c.d} m
                      </small>
                    </button>
                  ))}
                </div>
                <p className="build-note">
                  This unoccupied design lot is isolated from village routines.
                  No residents are moved and no village money is spent.
                </p>
              </aside>
              <main>
                <div className="build-toolbar" aria-label="Build tools">
                  {[
                    ["select", "Select"],
                    ["move", "Move"],
                    ["view", "View / orbit"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      aria-pressed={tool === key}
                      onClick={() => setTool(key)}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    disabled={!item}
                    onClick={() =>
                      item &&
                      commit({ ...item, rotation: (item.rotation + 90) % 360 })
                    }
                  >
                    Rotate 90°
                  </button>
                  <button disabled={!item} onClick={duplicate}>
                    Duplicate
                  </button>
                  <button
                    disabled={!item}
                    onClick={() => {
                      change({
                        ...h.present,
                        items: h.present.items.filter((i) => i.id !== selected),
                      });
                      setSelected("");
                    }}
                  >
                    Delete
                  </button>
                  <button
                    disabled={!h.past.length}
                    onClick={() => {
                      setH(undoBuild);
                      setSelected("");
                      setStatus("Last edit undone.");
                    }}
                  >
                    Undo
                  </button>
                  <button
                    disabled={!h.future.length}
                    onClick={() => {
                      setH(redoBuild);
                      setSelected("");
                      setStatus("Edit restored.");
                    }}
                  >
                    Redo
                  </button>
                </div>
                <BuildScene
                  design={h.present}
                  selected={selected}
                  tool={tool}
                  kind={kind}
                  color={color}
                  snap={snap}
                  onSelect={setSelected}
                  onCommit={commit}
                  onStatus={setStatus}
                  onDesign={change}
                />
                <div className="build-hint">
                  {tool === "wall" || tool === "room"
                    ? "Drag on the lot to draw. Lift to place; pinch cancels the drawing."
                    : tool === "view"
                      ? "Drag to orbit. Two fingers pan and pinch to zoom."
                      : tool === "place"
                        ? "Drag your new object onto the grid. Lift to place it."
                        : "Tap an object to select it. Choose Move, then drag it to a new spot."}{" "}
                  Two fingers zoom while editing. Walking is unavailable inside
                  this editor.
                </div>
                <p role="status" aria-live="polite">
                  {status}
                </p>
              </main>
              <aside aria-label="Object details">
                <BuildArchitecture
                  design={h.present}
                  selected={selected}
                  onSelect={setSelected}
                  tool={tool}
                  setTool={setTool}
                  change={change}
                />
                <h3>Your design</h3>
                <label>
                  Lot name
                  <input
                    maxLength={60}
                    value={h.present.name}
                    onChange={(e) =>
                      change({ ...h.present, name: e.target.value })
                    }
                  />
                </label>
                <label className="build-check">
                  <input
                    type="checkbox"
                    checked={snap}
                    onChange={(e) => setSnap(e.target.checked)}
                  />
                  Snap to half-meter grid
                </label>
                <label>
                  Placed objects
                  <select
                    aria-label="Selected build object"
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setTool("select");
                    }}
                  >
                    <option value="">Choose an object</option>
                    {h.present.items.map((i, n) => (
                      <option value={i.id} key={i.id}>
                        {n + 1}.{" "}
                        {BUILD_CATALOG.find((c) => c.kind === i.kind)?.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>{h.present.items.length} / 60 objects</p>
                {item && (
                  <>
                    <h3>
                      {BUILD_CATALOG.find((c) => c.kind === item.kind)?.name}
                    </h3>
                    <p>
                      Position {item.x.toFixed(2)}, {item.z.toFixed(2)} m ·{" "}
                      {item.rotation}°
                    </p>
                    <label>
                      Paint this object
                      <input
                        type="color"
                        value={item.color}
                        onChange={(e) =>
                          commit({ ...item, color: e.target.value })
                        }
                      />
                    </label>
                    <div className="build-swatches" aria-label="Paint swatches">
                      {[
                        ["Forest", "#617e61"],
                        ["Clay", "#ac7e6d"],
                        ["Linen", "#d8cbb2"],
                        ["Midnight", "#465b61"],
                      ].map(([name, paint]) => (
                        <button
                          key={name}
                          title={name}
                          aria-label={"Paint " + name}
                          onClick={() => commit({ ...item, color: paint })}
                        >
                          <span
                            style={{ background: paint }}
                            aria-hidden="true"
                          />
                          {name}
                        </button>
                      ))}
                    </div>
                    <div className="build-nudge">
                      {[
                        [0, -0.5, "Move north"],
                        [-0.5, 0, "Move west"],
                        [0.5, 0, "Move east"],
                        [0, 0.5, "Move south"],
                      ].map(([x, z, label]) => (
                        <button
                          key={String(label)}
                          onClick={() =>
                            commit({
                              ...item,
                              x: item.x + Number(x),
                              z: item.z + Number(z),
                            })
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <details>
                  <summary>What works in this first version?</summary>
                  <p>
                    Place, move, rotate, paint, duplicate, delete, undo, redo,
                    and save original 3D objects. Draw walls and rectangular
                    rooms with open doorways. This is a single-floor design
                    editor; village navigation is not connected yet.
                  </p>
                  <p>
                    Household assignment, opening doors and walkable interiors
                    are next. Walls, enclosed floors and open doorways can now
                    be designed here. Furniture is decorative until its citizen
                    actions are connected.
                  </p>
                </details>
                {!!row?.history.length && (
                  <details>
                    <summary>Earlier saved designs</summary>
                    {row.history.map((v) => (
                      <button
                        key={v.revision}
                        onClick={() => change(upgradeLot(v.design))}
                      >
                        Load version {v.revision} as a draft
                      </button>
                    ))}
                  </details>
                )}
              </aside>
            </div>
            {warning && (
              <div className="build-warning" role="alert">
                <h3>Keep your changes?</h3>
                <p>Your latest edits haven’t been saved.</p>
                <button onClick={() => setWarning(false)}>Keep editing</button>
                <button
                  onClick={() => {
                    setWarning(false);
                    setOpen(false);
                  }}
                >
                  Discard draft &amp; exit
                </button>
              </div>
            )}
          </div>
        </dialog>
      )}
    </section>
  );
}
