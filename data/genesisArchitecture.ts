export type Wall = {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height: number;
  color: string;
  door?: boolean;
};
export type FloorRect = { x: number; z: number; w: number; d: number };
export type Room = {
  id: string;
  area: number;
  floors: FloorRect[];
  hasDoor: boolean;
};
export const wallLength = (w: Wall) => Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
export function wallParts(w: Wall): {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  y: number;
}[] {
  const horizontal = w.z1 === w.z2,
    len = wallLength(w),
    x = (w.x1 + w.x2) / 2,
    z = (w.z1 + w.z2) / 2;
  const part = (along: number, length: number, height: number, y: number) => ({
    x: x + (horizontal ? along : 0),
    z: z + (horizontal ? 0 : along),
    width: horizontal ? length : 0.16,
    depth: horizontal ? 0.16 : length,
    height,
    y,
  });
  if (!w.door) return [part(0, len, w.height, w.height / 2)];
  const side = (len - 1) / 2;
  return [
    part(-(len + 1) / 4, side, w.height, w.height / 2),
    part((len + 1) / 4, side, w.height, w.height / 2),
    part(0, 1, w.height - 2.1, (w.height + 2.1) / 2),
  ];
}
export function validateWalls(input: unknown, objects: FloorRect[]): Wall[] {
  if (!Array.isArray(input) || input.length > 64)
    throw Error("Use at most 64 wall segments.");
  const ids = new Set<string>();
  const walls = input.map((raw) => {
    const w = raw as Wall;
    if (
      !w ||
      typeof w.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,64}$/.test(w.id) ||
      ids.has(w.id) ||
      ![w.x1, w.z1, w.x2, w.z2].every(
        (n) =>
          Number.isFinite(n) && Math.abs(n) <= 5.5 && Number.isInteger(n * 2),
      ) ||
      !Number.isFinite(w.height) ||
      w.height < 2.4 ||
      w.height > 3.6 ||
      !/^#[0-9a-f]{6}$/i.test(w.color) ||
      !(w.x1 === w.x2 || w.z1 === w.z2) ||
      wallLength(w) < 0.5 ||
      (w.door !== undefined && typeof w.door !== "boolean") ||
      (w.door && wallLength(w) < 1.5)
    )
      throw Error(
        "Draw straight walls on the half-metre grid, inside the lot. Doors need a wall at least 1.5 m long.",
      );
    ids.add(w.id);
    const a = {
      id: w.id,
      x1: Math.min(w.x1, w.x2),
      z1: Math.min(w.z1, w.z2),
      x2: Math.max(w.x1, w.x2),
      z2: Math.max(w.z1, w.z2),
      height: w.height,
      color: w.color,
      ...(w.door ? { door: true } : {}),
    };
    for (const o of objects) {
      // Keep furniture out of wall footprints and the passage through a doorway.
      const blocks = wallParts(a).filter((p) => p.y - p.height / 2 < 0.1);
      if (a.door)
        blocks.push({
          x: (a.x1 + a.x2) / 2,
          z: (a.z1 + a.z2) / 2,
          width: a.z1 === a.z2 ? 1 : 1.2,
          depth: a.z1 === a.z2 ? 1.2 : 1,
          height: 2.1,
          y: 1.05,
        });
      if (
        blocks.some(
          (p) =>
            Math.abs(o.x - p.x) < (o.w + p.width) / 2 - 0.01 &&
            Math.abs(o.z - p.z) < (o.d + p.depth) / 2 - 0.01,
        )
      )
        throw Error("Move the furniture away from this wall or doorway first.");
    }
    return a;
  });
  for (let i = 0; i < walls.length; i++)
    for (let j = i + 1; j < walls.length; j++) {
      const a = walls[i],
        b = walls[j],
        ah = a.z1 === a.z2,
        bh = b.z1 === b.z2;
      if (ah === bh) {
        if (
          ah
            ? a.z1 === b.z1 && Math.max(a.x1, b.x1) < Math.min(a.x2, b.x2)
            : a.x1 === b.x1 && Math.max(a.z1, b.z1) < Math.min(a.z2, b.z2)
        )
          throw Error("Those walls overlap. Share a corner instead.");
      } else {
        const h = ah ? a : b,
          v = ah ? b : a;
        if (v.x1 >= h.x1 && v.x1 <= h.x2 && h.z1 >= v.z1 && h.z1 <= v.z2) {
          const ends =
            (v.x1 === h.x1 || v.x1 === h.x2) &&
            (h.z1 === v.z1 || h.z1 === v.z2);
          if (!ends)
            throw Error(
              "Join walls at their endpoints. Crossings and T-junctions are not supported yet.",
            );
        }
      }
    }
  return walls;
}
export function rectangleWalls(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  height = 2.8,
  color = "#e7dcc8",
  prefix = "room",
): Wall[] {
  const a = Math.min(x1, x2),
    b = Math.min(z1, z2),
    c = Math.max(x1, x2),
    d = Math.max(z1, z2);
  if (c - a < 1 || d - b < 1)
    throw Error("Draw a room at least 1 m wide and 1 m deep.");
  return [
    [a, b, c, b],
    [c, b, c, d],
    [a, d, c, d],
    [a, b, a, d],
  ].map((p, i) => ({
    id: prefix + "-" + i,
    x1: p[0],
    z1: p[1],
    x2: p[2],
    z2: p[3],
    height,
    color,
  }));
}
export function findRooms(walls: Wall[]): Room[] {
  const size = 24,
    seen = new Set<number>(),
    rooms: Room[] = [];
  const blocked = (x: number, z: number, nx: number, nz: number) => {
    const ax = -6 + x * 0.5 + 0.25,
      az = -6 + z * 0.5 + 0.25,
      bx = -6 + nx * 0.5 + 0.25,
      bz = -6 + nz * 0.5 + 0.25;
    return walls.some((w) =>
      w.x1 === w.x2
        ? ax !== bx && w.x1 === (ax + bx) / 2 && az > w.z1 && az < w.z2
        : az !== bz && w.z1 === (az + bz) / 2 && ax > w.x1 && ax < w.x2,
    );
  };
  for (let seed = 0; seed < size * size; seed++) {
    if (seen.has(seed)) continue;
    const queue = [seed],
      cells: number[] = [];
    seen.add(seed);
    let outside = false;
    for (let q = 0; q < queue.length; q++) {
      const id = queue[q],
        x = id % size,
        z = Math.floor(id / size);
      cells.push(id);
      if (x === 0 || z === 0 || x === size - 1 || z === size - 1)
        outside = true;
      for (const [nx, nz] of [
        [x - 1, z],
        [x + 1, z],
        [x, z - 1],
        [x, z + 1],
      ]) {
        if (
          nx < 0 ||
          nz < 0 ||
          nx >= size ||
          nz >= size ||
          blocked(x, z, nx, nz)
        )
          continue;
        const n = nz * size + nx;
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    if (outside) continue;
    const set = new Set(cells),
      floors: FloorRect[] = [];
    for (let z = 0; z < size; z++)
      for (let x = 0; x < size; x++) {
        if (!set.has(z * size + x)) continue;
        let end = x;
        while (end + 1 < size && set.has(z * size + end + 1)) end++;
        let last = z;
        while (
          last + 1 < size &&
          Array.from({ length: end - x + 1 }, (_, i) =>
            set.has((last + 1) * size + x + i),
          ).every(Boolean)
        )
          last++;
        for (let zz = z; zz <= last; zz++)
          for (let xx = x; xx <= end; xx++) set.delete(zz * size + xx);
        floors.push({
          x: -6 + (x + end + 1) * 0.25,
          z: -6 + (z + last + 1) * 0.25,
          w: (end - x + 1) * 0.5,
          d: (last - z + 1) * 0.5,
        });
      }
    const hasDoor = walls.some(
      (w) =>
        w.door &&
        cells.some((id) => {
          const x = -6 + (id % size) * 0.5 + 0.25,
            z = -6 + Math.floor(id / size) * 0.5 + 0.25;
          return w.x1 === w.x2
            ? Math.abs(x - w.x1) === 0.25 && z > w.z1 && z < w.z2
            : Math.abs(z - w.z1) === 0.25 && x > w.x1 && x < w.x2;
        }),
    );
    rooms.push({
      id: "room-" + Math.min(...cells),
      area: cells.length * 0.25,
      floors,
      hasDoor,
    });
  }
  return rooms;
}
