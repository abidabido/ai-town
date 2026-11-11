import { useRef, useState } from "react";
import type { LivingState, Building } from "../../data/genesisLife";
import { calendar, PLACES } from "../../data/genesisLife";
export const factionColors: Record<string, string> = {
  Materialists: "#f1b679",
  Idealists: "#c6a8ef",
  Skeptics: "#f1d17a",
  Neuroscientists: "#80c6e8",
  Mystics: "#e4a5ce",
  Empiricists: "#9ed8b0",
};
export function Portrait({
  name,
  color,
  size = 38,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={name + " portrait"}
    >
      <rect width="40" height="40" rx="13" fill="#283847" />
      <path d="M7 40 Q8 25 20 25 Q32 25 33 40" fill={color} />
      <circle cx="20" cy="17" r="9" fill="#efc5a6" />
      <path d="M11 16 Q10 4 21 6 Q31 7 29 17 L25 11 L13 14" fill="#473d43" />
      <circle cx="17" cy="18" r="1" />
      <circle cx="23" cy="18" r="1" />
    </svg>
  );
}
const civic = [
  { id: "gardens", type: "Gardens", x: 17, y: 22 },
  { id: "observatory", type: "Observatory", x: 44, y: 23 },
  { id: "archive", type: "Archive", x: 85, y: 23 },
  { id: "council", type: "Council", x: 48, y: 51 },
  { id: "workshop", type: "Workshop", x: 85, y: 74 },
  { id: "clinic", type: "Basic clinic", x: 69, y: 76 },
];
export default function GenesisWorld({
  state,
  selected,
  onCitizen,
  onBuilding,
  placement,
  onPlace,
  playing,
}: {
  state: LivingState;
  selected?: number;
  onCitizen: (id: number) => void;
  onBuilding: (
    b: Building | { id: string; type: string; x: number; y: number },
  ) => void;
  placement: string;
  onPlace: (x: number, y: number) => void;
  playing: boolean;
}) {
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  }>();
  const night = calendar(state.tick).hour === 0;
  const buildings = [...civic, ...state.life.buildings];
  return (
    <section id="genesis-village" className="panel world-panel">
      <div className="section-head">
        <div>
          <div className="eyebrow">
            {calendar(state.tick).season} · {state.life.weather}
          </div>
          <h2>The living commons</h2>
        </div>
        <div className="camera">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.2))}
          >
            −
          </button>
          <button
            aria-label="Reset camera"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Center
          </button>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          >
            +
          </button>
        </div>
      </div>
      {placement && (
        <p role="status" className="map-hint">
          Placement mode: tap a clear site for a {placement}. Funding is
          confirmed before construction.
        </p>
      )}
      <svg
        className={"village-map " + (playing ? "is-playing" : "")}
        viewBox="0 0 800 500"
        aria-label="Interactive Genesis village"
        role="group"
        onPointerDown={(e) => {
          if (!placement && (e.target as Element).closest("[role=button]"))
            return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y,
            moved: false,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || placement) return;
          const r = e.currentTarget.getBoundingClientRect(),
            dx = ((e.clientX - d.x) * 800) / r.width,
            dy = ((e.clientY - d.y) * 500) / r.height;
          if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
          if (d.moved)
            setPan({
              x: Math.max(-300, Math.min(300, d.panX + dx)),
              y: Math.max(-200, Math.min(200, d.panY + dy)),
            });
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = undefined;
          if (placement && !d?.moved) {
            const r = e.currentTarget.getBoundingClientRect();
            onPlace(
              ((((e.clientX - r.left) / r.width) * 800 - 400 - pan.x) / zoom +
                400) /
                8,
              ((((e.clientY - r.top) / r.height) * 500 - 250 - pan.y) / zoom +
                250) /
                5,
            );
          }
        }}
        onPointerCancel={() => {
          drag.current = undefined;
        }}
      >
        <defs>
          <pattern
            id="genesis-grass"
            width="38"
            height="38"
            patternUnits="userSpaceOnUse"
          >
            <rect width="38" height="38" fill={night ? "#17332f" : "#2e5145"} />
            <path
              d="M5 11l3-4 2 4M27 29l2-3 2 3"
              fill="none"
              stroke="#77956b"
              strokeOpacity=".25"
            />
          </pattern>
          <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#305d70" />
            <stop offset="1" stopColor="#417f88" />
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#genesis-grass)" />
        <g
          transform={
            "translate(" +
            (400 + pan.x) +
            "," +
            (250 + pan.y) +
            ") scale(" +
            zoom +
            ") translate(-400,-250)"
          }
        >
          <path
            d="M-40 367 Q165 310 320 365 T850 342"
            fill="none"
            stroke="url(#water)"
            strokeWidth="54"
          />
          <path
            d="M-40 364 Q165 307 320 362 T850 339"
            fill="none"
            stroke="#82bbc1"
            strokeOpacity=".25"
            strokeWidth="2"
          />
          <path
            d="M110 90H700M110 260H700M185 80V450M530 80V450M80 425H720"
            stroke="#8c8067"
            strokeWidth="22"
            fill="none"
          />
          <path
            d="M185 336V391M530 336V391"
            stroke="#bc9d76"
            strokeWidth="30"
          />
          {Array.from({ length: 18 }, (_, i) => {
            const x = 18 + ((i * 137) % 770),
              y = 12 + ((i * 71) % 470);
            return (
              <g
                key={i}
                transform={"translate(" + x + "," + y + ")"}
                opacity=".8"
              >
                <rect x="-2" y="4" width="5" height="17" fill="#715e45" />
                <ellipse cy="-2" rx="14" ry="21" fill="#1c3c33" />
                <ellipse cx="-3" cy="-6" rx="9" ry="16" fill="#416b4a" />
              </g>
            );
          })}
          {buildings.map((b) => {
            const progress = "progress" in b ? Number(b.progress) : 100;
            return (
              <g
                key={b.id}
                role="button"
                tabIndex={0}
                aria-label={"Inspect " + b.type}
                onClick={(e) => {
                  if (!placement) {
                    e.stopPropagation();
                    onBuilding(b);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onBuilding(b);
                }}
                transform={"translate(" + b.x * 8 + "," + b.y * 5 + ")"}
                className="map-building"
              >
                <ellipse cy="19" rx="42" ry="12" fill="#112e28" opacity=".3" />
                {progress < 100 ? (
                  <>
                    <rect
                      x="-34"
                      y="-28"
                      width="68"
                      height="51"
                      fill="#b28d5a"
                      fillOpacity=".4"
                      stroke="#c9b08a"
                      strokeDasharray="5 3"
                    />
                    <path
                      d="M-31 23V-37H31V23M-31-12H31"
                      stroke="#c1a57c"
                      strokeWidth="5"
                    />
                    <rect x="-28" y="30" width="56" height="5" fill="#293a34" />
                    <rect
                      x="-28"
                      y="30"
                      width={progress * 0.56}
                      height="5"
                      fill="#bcf0c3"
                    />
                  </>
                ) : (
                  <>
                    <rect
                      x="-32"
                      y="-26"
                      width="64"
                      height="51"
                      rx="4"
                      fill={b.type === "House" ? "#b4a489" : "#b7ad90"}
                    />
                    <path
                      d="M-42-26L0-57L42-26Z"
                      fill={b.type === "hospital" ? "#7c5b69" : "#746269"}
                    />
                    <rect x="-8" y="1" width="16" height="24" fill="#54473c" />
                    <rect
                      x="-25"
                      y="-15"
                      width="12"
                      height="14"
                      fill={night ? "#f1cb76" : "#9bc1c2"}
                    />
                    <rect
                      x="13"
                      y="-15"
                      width="12"
                      height="14"
                      fill={night ? "#f1cb76" : "#9bc1c2"}
                    />
                    {b.type === "hospital" && (
                      <path
                        d="M-7-12H7M0-19V-5"
                        stroke="#b24a58"
                        strokeWidth="5"
                      />
                    )}
                  </>
                )}
                <text
                  y="49"
                  textAnchor="middle"
                  fill="#f1ecdc"
                  fontSize="11"
                  stroke="#243b33"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {b.type}
                  {progress < 100 ? " " + progress + "%" : ""}
                </text>
              </g>
            );
          })}
          {state.citizens.map((c) => {
            const p = state.life.people[c.id],
              color = factionColors[p.initialFaction] || "#c6c6df";
            return (
              <g
                key={c.id}
                className="village-person"
                transform={"translate(" + c.x * 8 + "," + c.y * 5 + ")"}
                role="button"
                tabIndex={0}
                aria-label={"Inspect " + c.name + ", " + p.activity}
                onClick={(e) => {
                  if (!placement) {
                    e.stopPropagation();
                    onCitizen(c.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCitizen(c.id);
                }}
              >
                <ellipse cy="12" rx="9" ry="4" fill="#092c28" opacity=".5" />
                {selected === c.id && (
                  <circle
                    cy="1"
                    r="18"
                    fill="none"
                    stroke="#e8f8d9"
                    strokeWidth="2"
                  />
                )}
                <path
                  className="legs"
                  d="M-3 4L-5 13M3 4L5 13"
                  stroke="#263039"
                  strokeWidth="4"
                />
                <rect
                  x="-7"
                  y="-7"
                  width="14"
                  height="14"
                  rx="4"
                  fill={color}
                />
                <circle cy="-12" r="6" fill="#e8c5ab" />
                <path d="M-6-14Q0-23 6-14" fill="#55434a" />
                <text
                  y="30"
                  textAnchor="middle"
                  fill="#fff7dc"
                  fontSize="11"
                  stroke="#15392e"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {c.name}
                </text>
                <text y="-27" textAnchor="middle" fontSize="12">
                  {p.activity === "Sleeping"
                    ? "☾"
                    : p.activity === "Eating"
                      ? "●"
                      : p.activity.startsWith("Talking")
                        ? "···"
                        : p.activity.includes("Working")
                          ? "⚒"
                          : "·"}
                </text>
              </g>
            );
          })}
        </g>
        {state.life.lightUntil > state.tick && (
          <g pointerEvents="none">
            <path d="M620 5L530 210H710Z" fill="#efd895" opacity=".13" />
            <ellipse
              cx="620"
              cy="24"
              rx="38"
              ry="9"
              fill="#fff1bf"
              opacity=".9"
            />
          </g>
        )}
        {night && (
          <rect
            width="800"
            height="500"
            fill="#151a45"
            opacity=".28"
            pointerEvents="none"
          />
        )}
        {state.life.weather === "Rain" && (
          <path
            d="M50 20l-18 45M180 70l-18 45M320 15l-18 45M470 90l-18 45M650 25l-18 45M760 190l-18 45M130 250l-18 45M400 330l-18 45M620 390l-18 45"
            stroke="#b5d6e8"
            strokeWidth="2"
            opacity=".45"
            pointerEvents="none"
          />
        )}
      </svg>
      <p className="muted map-note">
        Drag to explore · tap people or buildings · movement interpolates
        between recorded activity sites
      </p>
    </section>
  );
}
