import * as T from "three";
import {
  wallParts,
  findRooms,
  type Wall,
} from "../../data/genesisArchitecture";
import type { LotDesign } from "../../data/genesisBuild";
export function buildWall(w: Wall, cutaway = false): T.Group {
  const g = new T.Group();
  for (const p of wallParts(w)) {
    const height = cutaway ? Math.min(p.height, 0.75) : p.height;
    if (cutaway && p.y - p.height / 2 > 0.1) continue;
    const m = new T.Mesh(
      new T.BoxGeometry(p.width, height, p.depth),
      new T.MeshLambertMaterial({ color: w.color }),
    );
    m.position.set(p.x, cutaway ? height / 2 : p.y, p.z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  if (w.door && !cutaway) {
    const horizontal = w.z1 === w.z2,
      x = (w.x1 + w.x2) / 2,
      z = (w.z1 + w.z2) / 2;
    for (const offset of [-0.5, 0.5]) {
      const m = new T.Mesh(
        new T.BoxGeometry(
          horizontal ? 0.07 : 0.2,
          2.1,
          horizontal ? 0.2 : 0.07,
        ),
        new T.MeshLambertMaterial({ color: "#815d43" }),
      );
      m.position.set(
        x + (horizontal ? offset : 0),
        1.05,
        z + (horizontal ? 0 : offset),
      );
      g.add(m);
    }
  }
  g.traverse((o) => (o.userData.buildId = "wall:" + w.id));
  return g;
}
export function buildFloors(d: LotDesign): T.Group {
  const g = new T.Group();
  for (const r of findRooms(d.walls ?? []))
    for (const p of r.floors) {
      const m = new T.Mesh(
        new T.BoxGeometry(p.w, 0.04, p.d),
        new T.MeshLambertMaterial({ color: d.floorColor ?? "#bb946d" }),
      );
      m.position.set(p.x, 0.035, p.z);
      m.receiveShadow = true;
      m.userData.buildId = "floor:" + r.id;
      g.add(m);
    }
  return g;
}
