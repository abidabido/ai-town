import { findRooms, type Wall } from "../../data/genesisArchitecture";
import type { LotDesign } from "../../data/genesisBuild";
type Props = {
  design: LotDesign;
  selected: string;
  onSelect: (id: string) => void;
  tool: string;
  setTool: (tool: string) => void;
  change: (d: LotDesign) => void;
};
export default function BuildArchitecture(p: Props) {
  const walls = p.design.walls ?? [],
    rooms = findRooms(walls),
    wall = walls.find((w) => "wall:" + w.id === p.selected);
  const update = (w: Wall) =>
    p.change({
      ...p.design,
      walls: walls.map((old) => (old.id === w.id ? w : old)),
    });
  return (
    <section className="build-architecture" aria-label="Walls and rooms">
      <h3>Build your rooms</h3>
      <div className="build-toolbar">
        {[
          ["wall", "Draw wall"],
          ["room", "Draw room"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={p.tool === key}
            onClick={() => p.setTool(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <p>
        Drag across the lot to draw. Walls snap to a half-metre grid. Closed
        rooms get a floor automatically.
      </p>
      <label>
        Choose a wall
        <select
          aria-label="Selected wall"
          value={wall?.id ?? ""}
          onChange={(e) => {
            p.onSelect(e.target.value ? "wall:" + e.target.value : "");
            p.setTool("select");
          }}
        >
          <option value="">Select a wall</option>
          {walls.map((w, i) => (
            <option key={w.id} value={w.id}>
              Wall {i + 1}
              {w.door ? " · doorway" : ""}
            </option>
          ))}
        </select>
      </label>
      {wall && (
        <div>
          <p>
            Wall {walls.indexOf(wall) + 1} · {wall.height.toFixed(1)} m tall
          </p>
          <label>
            Wall colour
            <input
              aria-label="Wall colour"
              type="color"
              value={wall.color}
              onChange={(e) => update({ ...wall, color: e.target.value })}
            />
          </label>
          <label>
            Wall height
            <select
              aria-label="Wall height"
              value={wall.height}
              onChange={(e) =>
                update({ ...wall, height: Number(e.target.value) })
              }
            >
              {[2.4, 2.8, 3.2, 3.6].map((h) => (
                <option key={h} value={h}>
                  {h} m
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => update({ ...wall, door: !wall.door })}>
            {wall.door ? "Remove doorway" : "Add doorway"}
          </button>
          <p>
            A doorway is a 1 m wide open passage. Doors that open and close come
            later.
          </p>
          <div className="build-toolbar">
            {[
              ["North", 0, -0.5],
              ["South", 0, 0.5],
              ["West", -0.5, 0],
              ["East", 0.5, 0],
            ].map(([name, x, z]) => (
              <button
                key={String(name)}
                onClick={() =>
                  update({
                    ...wall,
                    x1: wall.x1 + Number(x),
                    x2: wall.x2 + Number(x),
                    z1: wall.z1 + Number(z),
                    z2: wall.z2 + Number(z),
                  })
                }
              >
                Wall {name}
              </button>
            ))}
            <button
              onClick={() => {
                p.change({
                  ...p.design,
                  walls: walls.filter((w) => w.id !== wall.id),
                });
                p.onSelect("");
              }}
            >
              Delete wall
            </button>
          </div>
        </div>
      )}
      <p>
        {walls.length}/64 walls · {rooms.length} enclosed{" "}
        {rooms.length === 1 ? "room" : "rooms"}
      </p>
      {rooms.map((r, i) => (
        <p key={r.id}>
          Room {i + 1}: {r.area} m²
          {r.hasDoor ? " · doorway present" : " · needs a doorway"}
        </p>
      ))}
      <label>
        Floor colour
        <input
          aria-label="Floor colour"
          type="color"
          value={p.design.floorColor ?? "#bb946d"}
          onChange={(e) =>
            p.change({ ...p.design, floorColor: e.target.value })
          }
        />
      </label>
      <p>
        This remains a design lot. Villagers and Street View do not enter these
        rooms yet.
      </p>
    </section>
  );
}
