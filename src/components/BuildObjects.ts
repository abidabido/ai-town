import * as T from "three";
import type { BuildItem } from "../../data/genesisBuild";
export function buildObject(item: BuildItem) {
  const group = new T.Group();
  const material = (c: string) => new T.MeshLambertMaterial({ color: c });
  const wood = "#936747",
    cream = "#eee6d9",
    dark = "#414b49";
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    c: string,
  ) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), material(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const leg = (x: number, z: number, h: number) =>
    box(0.09, h, 0.09, x, h / 2, z, wood);
  if (item.kind === "sofa") {
    box(2.4, 0.22, 1, 0, 0.25, 0, wood);
    box(2.4, 0.65, 0.18, 0, 0.57, -0.41, item.color);
    box(0.18, 0.45, 1, -1.11, 0.5, 0, item.color);
    box(0.18, 0.45, 1, 1.11, 0.5, 0, item.color);
    for (const x of [-0.51, 0.51]) {
      box(0.96, 0.2, 0.76, x, 0.47, 0.06, item.color);
      box(0.9, 0.3, 0.13, x, 0.69, -0.27, cream);
    }
    for (const x of [-1, 1]) for (const z of [-0.35, 0.35]) leg(x, z, 0.18);
  }
  if (item.kind === "bed") {
    box(2, 0.25, 2.2, 0, 0.22, 0, wood);
    box(2, 1, 0.13, 0, 0.5, -1.03, wood);
    box(1.88, 0.25, 2.02, 0, 0.48, 0, cream);
    box(1.9, 0.08, 1.45, 0, 0.64, 0.25, item.color);
    for (const x of [-0.47, 0.47])
      box(0.72, 0.13, 0.43, x, 0.68, -0.7, "#fffaf0");
  }
  if (item.kind === "desk" || item.kind === "table") {
    const desk = item.kind === "desk",
      w = desk ? 1.6 : 1.2,
      d = desk ? 0.8 : 0.6,
      h = desk ? 0.76 : 0.4;
    box(w, 0.09, d, 0, h - 0.045, 0, item.color);
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12])
      for (const z of [-d / 2 + 0.12, d / 2 - 0.12]) leg(x, z, h - 0.09);
    if (desk) {
      box(0.38, 0.32, 0.6, 0.48, 0.53, 0, item.color);
      box(0.16, 0.03, 0.025, 0.48, 0.56, 0.32, dark);
      box(0.38, 0.025, 0.26, -0.25, 0.82, 0, "#f8f1dd");
    }
  }
  if (item.kind === "shelf") {
    for (const x of [-0.55, 0.55]) box(0.1, 1.9, 0.4, x, 0.95, 0, item.color);
    box(1.2, 1.9, 0.05, 0, 0.95, -0.175, item.color);
    for (const y of [0.06, 0.64, 1.22, 1.84])
      box(1.2, 0.08, 0.4, 0, y, 0, item.color);
    for (let n = 0; n < 9; n++)
      box(
        0.12,
        0.34,
        0.24,
        -0.4 + (n % 3) * 0.2,
        0.27 + Math.floor(n / 3) * 0.58,
        0,
        ["#627f75", "#a76c5b", "#d0b96e"][n % 3],
      );
  }
  if (item.kind === "bench") {
    box(1.8, 0.1, 0.6, 0, 0.45, 0, item.color);
    for (const x of [-0.65, 0.65]) for (const z of [-0.2, 0.2]) leg(x, z, 0.4);
    box(1.8, 0.4, 0.08, 0, 0.73, -0.26, item.color);
  }
  if (item.kind === "planter") {
    const pot = new T.Mesh(
      new T.CylinderGeometry(0.26, 0.2, 0.4, 12),
      material("#bd9176"),
    );
    pot.position.y = 0.2;
    group.add(pot);
    box(0.05, 0.6, 0.05, 0, 0.65, 0, wood);
    const leaves = new T.Mesh(
      new T.IcosahedronGeometry(0.33, 1),
      material(item.color),
    );
    leaves.position.y = 0.82;
    group.add(leaves);
  }
  group.position.set(item.x, 0, item.z);
  group.rotation.y = (item.rotation * Math.PI) / 180;
  group.traverse((o) => (o.userData.buildId = item.id));
  return group;
}
export function disposeBuildObject(g: T.Object3D) {
  g.traverse((o) => {
    const m = o as T.Mesh;
    m.geometry?.dispose();
    const materials = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of materials) mat?.dispose();
  });
}
