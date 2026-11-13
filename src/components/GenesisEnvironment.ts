import * as T from "three";
import {
  VILLAGE_ROADS,
  villagePaths,
  villageBuildings,
  observerCanStand,
  type LivingState,
} from "../../data/genesisLife";
export type VisualTools = {
  box: (
    p: T.Object3D,
    w: number,
    h: number,
    d: number,
    c: string,
    x: number,
    y: number,
    z: number,
  ) => T.Mesh;
  mesh: (
    p: T.Object3D,
    g: T.BufferGeometry,
    c: string,
    x: number,
    y: number,
    z: number,
  ) => T.Mesh;
  material: (c: string) => T.MeshLambertMaterial;
  geo: (key: string, make: () => T.BufferGeometry) => T.BufferGeometry;
  gpu: boolean;
  detail: boolean;
  windows: T.Mesh[];
};
const roofGeo = (w: number, d: number, h: number) => {
  const a = w / 2,
    b = d / 2;
  const points = [-a, 0, -b, a, 0, -b, 0, h, -b, -a, 0, b, a, 0, b, 0, h, b];
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(points, 3));
  g.setIndex([
    0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4,
  ]);
  g.computeVertexNormals();
  return g;
};
export function buildArchitecture(
  t: VisualTools,
  g: T.Group,
  b: { id: string; type: string; x: number; y: number },
) {
  const { box, mesh, material, geo } = t,
    h = b.type.toLowerCase(),
    house = h === "house",
    hash = [...b.id].reduce((n, c) => n + c.charCodeAt(0), 0),
    height = house ? (hash % 3 === 0 ? 4.9 : 3.2) : h === "archive" ? 4.1 : 3.7;
  const wall = ["#d8cbb8", "#ccd3c6", "#d8c4ad", "#c8d0d4"][hash % 4],
    roofColor = ["#66584e", "#705b50", "#59666a", "#7b6255"][hash % 4];
  if (h === "gardens") {
    for (const x of [-2.3, 2.3])
      for (const z of [-1.8, 1.8]) {
        box(g, 2.4, 0.38, 1.3, "#856c50", x, 0.2, z);
        box(g, 2.1, 0.1, 1, "#596e43", x, 0.45, z);
        for (let i = 0; i < 3; i++)
          mesh(
            g,
            geo("garden-plant", () => new T.SphereGeometry(0.28, 6, 4)),
            i % 2 ? "#c9b36d" : "#72936b",
            x - 0.7 + i * 0.7,
            0.7,
            z,
          );
      }
    box(g, 1.6, 1.1, 0.18, "#718575", 0, 1, -2.6);
    return;
  }
  box(g, 7.5, 0.25, 6.5, "#a6a29b", 0, 0.12, 0);
  box(g, 7, height, 6, wall, 0, height / 2 + 0.2, 0);
  box(g, 7.1, 0.22, 6.1, "#b4b1a5", 0, 0.42, 0);
  box(g, 7.25, 0.18, 6.2, "#e4dfcf", 0, height + 0.12, 0);
  const roof = mesh(
    g,
    geo("gable-" + height, () => roofGeo(7.8, 6.8, 1.55)),
    roofColor,
    0,
    height + 0.2,
    0,
  );
  box(g, 0.42, 1.8, 0.65, "#887365", 2.2, height + 1, -1.7);
  box(g, 0.65, 0.18, 0.86, "#b7b0a3", 2.2, height + 1.9, -1.7);
  // Doors are sized for the approximately 1.8m citizen models.
  box(g, 1.18, 2.24, 0.12, "#6f8177", 0, 1.32, 3.07);
  box(g, 1.42, 0.12, 0.18, "#eee4ce", 0, 2.48, 3.13);
  for (const x of [-0.66, 0.66])
    box(g, 0.12, 2.35, 0.18, "#eee4ce", x, 1.27, 3.13);
  mesh(
    g,
    geo("doorknob", () => new T.SphereGeometry(0.055, 6, 4)),
    "#d1b06b",
    0.4,
    1.28,
    3.18,
  );
  box(g, 2.7, 0.24, 1.15, "#b6b0a0", 0, 0.24, 3.5);
  box(g, 2.9, 0.12, 0.45, "#c6beac", 0, 0.11, 4.1);
  box(g, 2.8, 0.14, 1.5, roofColor, 0, 2.68, 3.48);
  for (const x of [-1.2, 1.2]) box(g, 0.13, 2.4, 0.13, "#eee5d3", x, 1.4, 4.03);
  function window(x: number, y: number, z: number, side = false) {
    const pane = box(
      g,
      side ? 0.08 : 1.25,
      1.25,
      side ? 1.25 : 0.08,
      "#a8c7ca",
      x,
      y,
      z,
    );
    t.windows.push(pane);
    if (side) {
      for (const dz of [-0.68, 0.68])
        box(g, 0.16, 1.5, 0.1, "#f0eadb", x, y, z + dz);
      for (const dy of [-0.69, 0, 0.69])
        box(g, 0.16, 0.1, 1.5, "#f0eadb", x, y + dy, z);
    } else {
      for (const dx of [-0.68, 0, 0.68])
        box(g, 0.1, 1.48, 0.16, "#f0eadb", x + dx, y, z + 0.03);
      for (const dy of [-0.69, 0.69])
        box(g, 1.5, 0.1, 0.16, "#f0eadb", x, y + dy, z + 0.03);
      box(g, 1.7, 0.16, 0.35, "#aaa69b", x, y - 0.82, z + 0.12);
    }
  }
  for (const x of [-2.25, 2.25]) window(x, 1.72, 3.08);
  if (height > 4.5) for (const x of [-2.25, 2.25]) window(x, 3.85, 3.08);
  if (t.detail) {
    for (const z of [-1.45, 1.45]) window(3.55, 1.72, z, true);
    box(g, 0.8, 0.85, 0.2, "#7d8c82", -2.5, 0.88, -3.08);
  }
  if (h === "observatory" || h === "laboratory") {
    mesh(
      g,
      geo(
        "observatory-dome",
        () => new T.SphereGeometry(2.05, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2),
      ),
      "#8bafb6",
      0,
      height + 1.4,
      0,
    );
    box(g, 0.3, 0.3, 3, "#536b72", 0, height + 2.65, 0.7);
  }
  if (h === "clinic" || h === "hospital") {
    box(g, 0.25, 1.1, 0.18, "#a85c58", 0, height - 0.5, 3.22);
    box(g, 1.1, 0.25, 0.18, "#a85c58", 0, height - 0.5, 3.22);
  }
  if (h === "archive") {
    box(g, 2.8, 0.46, 0.18, "#647e75", 0, 3.35, 3.21);
    for (let i = 0; i < 4; i++)
      box(
        g,
        0.21,
        0.28,
        0.05,
        ["#c8a481", "#b8c3a6", "#d2c0a0", "#92b0b7"][i],
        -0.5 + i * 0.33,
        3.36,
        3.33,
      );
  }
  if (house) {
    box(g, 0.12, 0.8, 0.12, "#776e5d", -3.25, 0.5, 4.4);
    box(g, 0.55, 0.36, 0.35, roofColor, -3.25, 1.03, 4.4);
    for (const x of [-2.5, 2.5]) {
      box(g, 1.4, 0.36, 0.7, "#9c8564", x, 0.3, 3.6);
      mesh(
        g,
        geo("front-shrub", () => new T.SphereGeometry(0.53, 7, 4)),
        "#6e8d68",
        x,
        0.78,
        3.6,
      );
    }
  }
  return roof;
}
export function buildVillageEnvironment(
  t: VisualTools,
  scene: T.Scene,
  s: LivingState,
) {
  const { box, mesh, geo } = t,
    parts = new Map<
      string,
      { w: number; h: number; d: number; x: number; y: number; z: number }[]
    >();
  const add = (
    c: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ) => {
    if (!parts.has(c)) parts.set(c, []);
    parts.get(c)!.push({ w, h, d, x, y, z });
  };
  const solid = (x: number, y: number) =>
    villageBuildings(s).some(
      (b) =>
        b.type.toLowerCase() !== "gardens" &&
        Math.abs(b.x - x) < 4.3 &&
        Math.abs(b.y - y) < 4.05,
    );
  for (const r of VILLAGE_ROADS) {
    const vertical = r.y2 - r.y1 > r.x2 - r.x1,
      length = vertical ? r.y2 - r.y1 : r.x2 - r.x1;
    for (let d = 0; d < length; d += 2.5) {
      const mid = d + Math.min(2.5, length - d) / 2,
        x = vertical ? (r.x1 + r.x2) / 2 : r.x1 + mid,
        y = vertical ? r.y1 + mid : (r.y1 + r.y2) / 2;
      if (solid(x, y)) continue;
      const span = Math.min(2.5, length - d);
      add(
        "#7b8381",
        vertical ? 5 : span,
        0.12,
        vertical ? span : 5,
        x - 50,
        0.06,
        y - 50,
      );
      for (const side of [-1, 1]) {
        const xx = x + (vertical ? side * 3.15 : 0),
          yy = y + (vertical ? 0 : side * 3.15);
        if (!solid(xx, yy)) {
          add(
            "#c2c4b7",
            vertical ? 1.2 : span,
            0.16,
            vertical ? span : 1.2,
            xx - 50,
            0.1,
            yy - 50,
          );
          add(
            "#e0dfd2",
            vertical ? 0.18 : span,
            0.22,
            vertical ? span : 0.18,
            x - 50 + (vertical ? side * 2.55 : 0),
            0.13,
            y - 50 + (vertical ? 0 : side * 2.55),
          );
        }
      }
      if (Math.floor(d / 2.5) % 2 === 0)
        add(
          "#e5dfb9",
          vertical ? 0.11 : 1.1,
          0.02,
          vertical ? 1.1 : 0.11,
          x - 50,
          0.135,
          y - 50,
        );
    }
  }
  for (const r of villagePaths(s)) {
    const vertical = r.y2 - r.y1 > r.x2 - r.x1,
      len = vertical ? r.y2 - r.y1 : r.x2 - r.x1;
    for (let n = 0; n < len; n += 1) {
      const x = vertical ? (r.x1 + r.x2) / 2 : r.x1 + n + 0.5,
        y = vertical ? r.y1 + n + 0.5 : (r.y1 + r.y2) / 2;
      if (!observerCanStand(s, x, y) || solid(x, y)) continue;
      add(
        "#b9b5a4",
        vertical ? 1.2 : 1,
        0.08,
        vertical ? 1 : 1.2,
        x - 50,
        0.045,
        y - 50,
      );
    }
  }
  for (const x of [32, 77])
    for (const y of [32, 58, 92])
      for (let i = -2; i <= 2; i++)
        add("#e7e4d3", 0.38, 0.025, 3.2, x - 50 + i * 0.8, 0.15, y - 50);
  // Static road geometry is instanced on WebGL; SVG receives the same individual meshes.
  for (const [color, list] of parts) {
    if (t.gpu) {
      const batch = new T.InstancedMesh(
          geo("unit-box", () => new T.BoxGeometry(1, 1, 1)),
          t.material(color),
          list.length,
        ),
        q = new T.Quaternion();
      list.forEach((p, i) =>
        batch.setMatrixAt(
          i,
          new T.Matrix4().compose(
            new T.Vector3(p.x, p.y, p.z),
            q,
            new T.Vector3(p.w, p.h, p.d),
          ),
        ),
      );
      batch.instanceMatrix.needsUpdate = true;
      batch.receiveShadow = true;
      batch.userData.walkable = true;
      scene.add(batch);
    } else
      for (const p of list) {
        const m = box(scene, p.w, p.h, p.d, color, p.x, p.y, p.z);
        m.userData.walkable = true;
        m.userData.nearClipRadius = Math.hypot(p.w, p.d) / 2;
      }
  }
  // A single consistent river, with two real crossing decks matching movement validation.
  box(scene, 120, 0.12, 8, "#79a8b0", 0, 0.04, 22);
  for (const x of [32, 77]) {
    box(scene, 6, 0.42, 9, "#9f9279", x - 50, 0.25, 22);
    for (const side of [-1, 1]) {
      box(scene, 0.12, 0.7, 9, "#cbc6b3", x - 50 + side * 2.8, 0.85, 22);
      for (let z = -4; z <= 4; z += 2)
        box(
          scene,
          0.13,
          0.85,
          0.13,
          "#bcb7a5",
          x - 50 + side * 2.8,
          0.65,
          22 + z,
        );
    }
  }
  const treeCount = t.detail ? 34 : 20;
  for (let i = 0; i < treeCount; i++) {
    const a = i * 2.399,
      x = Math.cos(a) * (43 + (i % 4) * 2.5),
      z = Math.sin(a) * (39 + (i % 3) * 2);
    if (
      Math.abs(z - 22) < 5 ||
      solid(x + 50, z + 50) ||
      VILLAGE_ROADS.some(
        (r) =>
          x + 50 > r.x1 - 2 &&
          x + 50 < r.x2 + 2 &&
          z + 50 > r.y1 - 2 &&
          z + 50 < r.y2 + 2,
      )
    )
      continue;
    const tree = new T.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(0.85 + (i % 4) * 0.12);
    scene.add(tree);
    mesh(
      tree,
      geo("tree-trunk", () => new T.CylinderGeometry(0.15, 0.25, 3, 7)),
      "#806d55",
      0,
      1.5,
      0,
    );
    for (let j = 0; j < (t.detail ? 3 : 2); j++)
      mesh(
        tree,
        geo("leaf-cluster", () => new T.SphereGeometry(1.45, 8, 5)),
        ["#65856c", "#759479", "#597d69"][j % 3],
        Math.sin(j * 2) * 0.65,
        3.3 + j * 0.5,
        Math.cos(j * 2) * 0.55,
      );
  }
  for (const x of [-56, 56])
    for (let i = 0; i < 5; i++) {
      const hill = mesh(
        scene,
        geo("outer-hill", () => new T.SphereGeometry(1, 10, 5)),
        "#7e9278",
        x,
        0,
        -65 + i * 28,
      );
      hill.scale.set(8, 3 + (i % 2) * 2, 12);
    }
  // Park planting and benches are scenery, not new unimplemented businesses.
  for (const [x, z] of [
    [-9, -8],
    [10, -8],
    [-9, 16],
    [10, 16],
  ]) {
    box(scene, 4.3, 0.17, 2.2, "#adab96", x, 0.08, z);
    box(scene, 3.6, 0.38, 1.5, "#819675", x, 0.28, z);
    for (let i = 0; i < (t.detail ? 5 : 2); i++)
      mesh(
        scene,
        geo("flower", () => new T.SphereGeometry(0.16, 5, 3)),
        ["#d0ae9c", "#dfd1a5", "#acb6cc"][i % 3],
        x - 1.4 + i * 0.6,
        0.62,
        z,
      );
  }
  for (const [x, z] of [
    [-11, 5],
    [12, 5],
    [-6, -10],
    [9, -10],
  ]) {
    box(scene, 2, 0.12, 0.6, "#9b805d", x, 0.6, z);
    box(scene, 2, 0.6, 0.12, "#9b805d", x, 0.95, z - 0.3);
    for (const xx of [-0.75, 0.75])
      box(scene, 0.1, 0.6, 0.4, "#526463", x + xx, 0.3, z);
  }
}
export function buildCitizen(
  t: VisualTools,
  g: T.Group,
  p: LivingState["life"]["people"][string],
  id: number,
) {
  const { box, mesh, geo } = t,
    skin = p.profile?.skin ?? "#d2ae91",
    outfit = p.profile?.outfit ?? "#7e9b91",
    hairColor = p.profile?.hair ?? "#52463b",
    width = 0.21 + (id % 3) * 0.025;
  const body = mesh(
    g,
    geo(
      "human-body-" + width,
      () => new T.CylinderGeometry(width + 0.035, width, 0.58, 9),
    ),
    outfit,
    0,
    1.12,
    0,
  );
  mesh(
    g,
    geo("neck", () => new T.CylinderGeometry(0.075, 0.085, 0.16, 7)),
    skin,
    0,
    1.47,
    0,
  );
  const head = mesh(
    g,
    geo("human-head", () => new T.SphereGeometry(0.19, 10, 7)),
    skin,
    0,
    1.67,
    0,
  );
  head.scale.z = 0.91;
  const hair = mesh(
    g,
    geo("human-hair", () => new T.SphereGeometry(0.201, 10, 6)),
    hairColor,
    0,
    1.76,
    -0.025,
  );
  hair.scale.y = 0.55;
  for (const x of [-0.068, 0.068]) {
    mesh(
      g,
      geo("eye", () => new T.SphereGeometry(0.022, 6, 4)),
      "#333d3a",
      x,
      1.69,
      0.164,
    );
    box(g, 0.065, 0.014, 0.018, hairColor, x, 1.745, 0.164);
  }
  mesh(
    g,
    geo("nose", () => new T.SphereGeometry(0.026, 6, 4)),
    skin,
    0,
    1.655,
    0.184,
  );
  box(g, 0.065, 0.012, 0.012, "#956e62", 0, 1.59, 0.174);
  for (let i = 0; i < 3; i++)
    box(g, 0.025, 0.025, 0.02, "#d8d6bf", 0, 1.24 - i * 0.13, width + 0.024);
  const longHair = box(g, 0.36, 0.36, 0.15, hairColor, 0, 1.58, -0.13),
    pony = mesh(
      g,
      geo("pony", () => new T.SphereGeometry(0.13, 7, 5)),
      hairColor,
      0,
      1.66,
      -0.23,
    );
  longHair.visible = /long|bob/i.test(p.profile?.hairstyle ?? "");
  pony.visible = /pony|tied/i.test(p.profile?.hairstyle ?? "");
  hair.visible = !/bald/i.test(p.profile?.hairstyle ?? "");
  const limbs: T.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const pivot = new T.Group();
    pivot.position.set(
      i < 2 ? (i ? 0.12 : -0.12) : i === 2 ? -width - 0.085 : width + 0.085,
      i < 2 ? 0.84 : 1.36,
      0,
    );
    g.add(pivot);
    mesh(
      pivot,
      geo(
        "limb-" + i,
        () =>
          new T.CylinderGeometry(
            i < 2 ? 0.085 : 0.065,
            i < 2 ? 0.09 : 0.06,
            i < 2 ? 0.73 : 0.54,
            7,
          ),
      ),
      i < 2 ? "#526064" : outfit,
      0,
      i < 2 ? -0.36 : -0.27,
      0,
    );
    if (i < 2) box(pivot, 0.19, 0.13, 0.31, "#414c4b", 0, -0.76, 0.05);
    else
      mesh(
        pivot,
        geo("hand", () => new T.SphereGeometry(0.075, 7, 4)),
        skin,
        0,
        -0.56,
        0,
      );
    limbs.push(pivot);
  }
  const phone = new T.Group();
  limbs[3].add(phone);
  box(phone, 0.11, 0.2, 0.025, "#384b51", 0, -0.53, 0.04);
  box(phone, 0.085, 0.155, 0.006, "#a7ccd0", 0, -0.53, 0.056);
  phone.visible = false;
  const book = new T.Group();
  limbs[2].add(book);
  box(book, 0.28, 0.035, 0.2, "#ad8b6a", 0.1, -0.51, 0.1);
  box(book, 0.25, 0.012, 0.18, "#e1dbc8", 0.1, -0.485, 0.1);
  book.visible = false;
  const bowl = mesh(
    limbs[2],
    geo("meal-bowl", () => new T.SphereGeometry(0.12, 8, 5)),
    "#d5c8a8",
    0,
    -0.53,
    0.06,
  );
  bowl.scale.y = 0.5;
  bowl.visible = false;
  for (const m of [body, head, hair, longHair, pony])
    m.material = (m.material as T.MeshLambertMaterial).clone();
  g.scale.setScalar(0.95 + (id % 4) * 0.025);
  return { body, head, hair, limbs, phone, book, bowl, longHair, pony };
}
