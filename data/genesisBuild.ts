import { validateWalls, type Wall } from "./genesisArchitecture";
export const LOT_SIZE = 12;
export const BUILD_CATALOG = [
  {
    kind: "sofa",
    name: "Sunday sofa",
    category: "Living",
    w: 2.4,
    d: 1,
    h: 0.85,
    color: "#ac7e6d",
  },
  {
    kind: "bed",
    name: "Oak double bed",
    category: "Bedroom",
    w: 2,
    d: 2.2,
    h: 0.7,
    color: "#9caa92",
  },
  {
    kind: "desk",
    name: "Writing desk",
    category: "Office",
    w: 1.6,
    d: 0.8,
    h: 0.76,
    color: "#a77b54",
  },
  {
    kind: "shelf",
    name: "Little library",
    category: "Office",
    w: 1.2,
    d: 0.4,
    h: 1.9,
    color: "#926b4e",
  },
  {
    kind: "table",
    name: "Coffee table",
    category: "Living",
    w: 1.2,
    d: 0.6,
    h: 0.4,
    color: "#a77b54",
  },
  {
    kind: "planter",
    name: "Garden planter",
    category: "Garden",
    w: 0.7,
    d: 0.7,
    h: 1.1,
    color: "#617e61",
  },
  {
    kind: "bench",
    name: "Garden bench",
    category: "Garden",
    w: 1.8,
    d: 0.6,
    h: 0.9,
    color: "#a77b54",
  },
] as const;
export type BuildKind = (typeof BUILD_CATALOG)[number]["kind"];
export type BuildItem = {
  id: string;
  kind: BuildKind;
  x: number;
  z: number;
  rotation: number;
  color: string;
};
export type LotDesign = {
  schemaVersion: 1 | 2;
  name: string;
  items: BuildItem[];
  walls?: Wall[];
  floorColor?: string;
};
export type BuildHistory = {
  present: LotDesign;
  past: LotDesign[];
  future: LotDesign[];
};
export const emptyLot = (): LotDesign => ({
  schemaVersion: 1,
  name: "Willow design lot",
  items: [],
});
export const catalogItem = (kind: string) =>
  BUILD_CATALOG.find((x) => x.kind === kind);
export function footprint(item: BuildItem) {
  const c = catalogItem(item.kind);
  if (!c) throw Error("Choose an item from the catalog.");
  return item.rotation % 180 === 0 ? { w: c.w, d: c.d } : { w: c.d, d: c.w };
}
export function validateLot(input: unknown): LotDesign {
  const a = input as LotDesign;
  if (
    !a ||
    ![1, 2].includes(a.schemaVersion) ||
    typeof a.name !== "string" ||
    !a.name.trim() ||
    a.name.length > 60 ||
    /[<>]/.test(a.name) ||
    !Array.isArray(a.items) ||
    a.items.length > 60
  )
    throw Error("Use a lot name and at most 60 objects.");
  const seen = new Set<string>();
  const items = a.items.map((i) => {
    if (
      !i ||
      typeof i.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(i.id) ||
      seen.has(i.id) ||
      !catalogItem(i.kind) ||
      ![0, 90, 180, 270].includes(i.rotation) ||
      !Number.isFinite(i.x) ||
      !Number.isFinite(i.z) ||
      !/^#[0-9a-f]{6}$/i.test(i.color)
    )
      throw Error(
        "An object has an invalid identity, position, rotation or color.",
      );
    seen.add(i.id);
    const item = {
      id: i.id,
      kind: i.kind,
      x: Math.round(i.x * 100) / 100,
      z: Math.round(i.z * 100) / 100,
      rotation: i.rotation,
      color: i.color,
    };
    const f = footprint(item);
    if (Math.abs(item.x) + f.w / 2 > 6 || Math.abs(item.z) + f.d / 2 > 6)
      throw Error("Keep every object inside the lot boundary.");
    return item;
  });
  for (let n = 0; n < items.length; n++)
    for (let m = n + 1; m < items.length; m++) {
      const a = items[n],
        b = items[m],
        f = footprint(a),
        g = footprint(b);
      if (
        Math.abs(a.x - b.x) < (f.w + g.w) / 2 - 0.01 &&
        Math.abs(a.z - b.z) < (f.d + g.d) / 2 - 0.01
      )
        throw Error(
          "Those objects overlap. Leave a little space between them.",
        );
    }
  if (a.schemaVersion === 1)
    return { schemaVersion: 1, name: a.name.trim(), items };
  const walls = validateWalls(
    a.walls,
    items.map((i) => ({ ...footprint(i), x: i.x, z: i.z })),
  );
  if (typeof a.floorColor !== "string" || !/^#[0-9a-f]{6}$/i.test(a.floorColor))
    throw Error("Choose a valid floor colour.");
  return {
    schemaVersion: 2,
    name: a.name.trim(),
    items,
    walls,
    floorColor: a.floorColor,
  };
}
export function changeBuild(h: BuildHistory, next: LotDesign): BuildHistory {
  const valid = validateLot(next);
  if (JSON.stringify(valid) === JSON.stringify(h.present)) return h;
  return {
    present: valid,
    past: [...h.past, h.present].slice(-30),
    future: [],
  };
}
export function undoBuild(h: BuildHistory): BuildHistory {
  return h.past.length
    ? {
        present: h.past[h.past.length - 1],
        past: h.past.slice(0, -1),
        future: [h.present, ...h.future].slice(0, 30),
      }
    : h;
}
export function redoBuild(h: BuildHistory): BuildHistory {
  return h.future.length
    ? {
        present: h.future[0],
        past: [...h.past, h.present].slice(-30),
        future: h.future.slice(1),
      }
    : h;
}

export function upgradeLot(input: unknown): LotDesign {
  const a = validateLot(input);
  return {
    ...a,
    schemaVersion: 2,
    walls: a.walls ?? [],
    floorColor: a.floorColor ?? "#bb946d",
  };
}
