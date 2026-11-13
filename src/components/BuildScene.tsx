import { buildWall, buildFloors } from "./BuildArchitectureObjects";
import { rectangleWalls, type Wall } from "../../data/genesisArchitecture";
import { useEffect, useRef } from "react";
import * as T from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";
import { buildObject, disposeBuildObject } from "./BuildObjects";
import {
  validateLot,
  type LotDesign,
  type BuildItem,
  type BuildKind,
} from "../../data/genesisBuild";
type Props = {
  design: LotDesign;
  selected: string;
  tool: string;
  kind: BuildKind;
  color: string;
  snap: boolean;
  onSelect: (id: string) => void;
  onCommit: (item: BuildItem) => void;
  onStatus: (s: string) => void;
  onDesign: (d: LotDesign) => void;
};
export default function BuildScene(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    refresh = useRef<() => void>();
  latest.current = props;
  useEffect(() => {
    const el = host.current!;
    const scene = new T.Scene();
    scene.background = new T.Color("#edf0e5");
    let renderer: T.WebGLRenderer | SVGRenderer;
    let webgl = true;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
    } catch {
      renderer = new SVGRenderer();
      renderer.setQuality("low");
      webgl = false;
    }
    const surface = renderer.domElement;
    surface.setAttribute("aria-label", "Editable 3D Willow lot");
    surface.setAttribute("role", "img");
    el.appendChild(surface);
    const camera = new T.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(10, 11, 12);
    const controls = new OrbitControls(camera, el);
    controls.target.set(0, 0, 0);
    controls.maxDistance = 34;
    controls.minDistance = 9;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.enableDamping = true;
    scene.add(new T.AmbientLight("#fff8ee", 0.7));
    const sun = new T.DirectionalLight("#fff1d1", 0.45);
    sun.position.set(8, 15, 7);
    sun.castShadow = webgl;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);
    const ground = new T.Mesh(
      new T.BoxGeometry(12, 0.12, 12),
      new T.MeshLambertMaterial({ color: "#c4cfb5" }),
    );
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new T.GridHelper(12, 24, "#728a71", "#a9b79a");
    grid.position.y = 0.02;
    grid.renderOrder = 1;
    scene.add(grid);
    const objects = new T.Group();
    scene.add(objects);
    let ghost: T.Group | undefined;
    let outline: T.Box3Helper | undefined;
    let draft: BuildItem | undefined;
    let architectural: Wall[] | undefined;
    let start: { x: number; z: number } | undefined;
    let error = "Draw inside the lot, clear of furniture and other walls.";
    let valid = false;
    let gesture = false;
    let pinch = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    const clearGhost = () => {
      if (ghost) {
        scene.remove(ghost);
        disposeBuildObject(ghost);
        ghost = undefined;
      }
      draft = undefined;
      architectural = undefined;
      start = undefined;
    };
    const draw = () => {
      for (const g of [...objects.children]) {
        objects.remove(g);
        disposeBuildObject(g);
      }
      const floor = buildFloors(latest.current.design);
      floor.traverse((o) => (o.renderOrder = 2));
      objects.add(floor);
      for (const w of latest.current.design.walls ?? []) {
        const model = buildWall(w);
        model.traverse((o) => (o.renderOrder = 3));
        objects.add(model);
      }
      for (const i of latest.current.design.items) {
        const model = buildObject(i);
        model.traverse((o) => (o.renderOrder = 2));
        objects.add(model);
      }
      if (outline) {
        scene.remove(outline);
        outline.dispose();
        outline = undefined;
      }
      const target = objects.children.find(
        (x) => x.userData.buildId === latest.current.selected,
      );
      if (target) {
        target.updateMatrixWorld(true);
        outline = new T.Box3Helper(
          new T.Box3().setFromObject(target),
          "#b67e38",
        );
        scene.add(outline);
      }
      controls.enabled = latest.current.tool === "view";
    };
    refresh.current = draw;
    draw();
    const ray = new T.Raycaster(),
      plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    const point = (e: PointerEvent) => {
      const r = surface.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          (-(e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      return ray.ray.intersectPlane(plane, new T.Vector3());
    };
    const hit = (e: PointerEvent) => {
      point(e);
      objects.updateMatrixWorld(true);
      return ray.intersectObjects(objects.children, true)[0]?.object.userData
        .buildId as string | undefined;
    };
    const preview = (e: PointerEvent) => {
      const p = point(e);
      if (!p || !draft) return;
      const step = latest.current.snap ? 0.5 : 0.05;
      draft = {
        ...draft,
        x: Math.round(p.x / step) * step,
        z: Math.round(p.z / step) * step,
      };
      try {
        validateLot({
          ...latest.current.design,
          items: [
            ...latest.current.design.items.filter((i) => i.id !== draft!.id),
            draft,
          ],
        });
        valid = true;
      } catch {
        valid = false;
      }
      if (!ghost) {
        ghost = buildObject(draft);
        ghost.traverse((o) => {
          const m = o as T.Mesh;
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) {
              mat.transparent = true;
              mat.opacity = 0.6;
            }
          }
        });
        scene.add(ghost);
      }
      ghost.position.set(draft.x, 0.03, draft.z);
      ghost.traverse((o) => {
        const m = o as T.Mesh;
        const mat = m.material as T.MeshLambertMaterial;
        if (mat?.color) mat.color.set(valid ? "#6bba9d" : "#df7767");
      });
    };
    const architecturePreview = (e: PointerEvent) => {
      const p = point(e);
      if (!p || !start) return;
      const x = Math.round(p.x * 2) / 2,
        z = Math.round(p.z * 2) / 2;
      const prefix = "wall-" + e.pointerId + "-" + Date.now();
      try {
        architectural =
          latest.current.tool === "room"
            ? rectangleWalls(start.x, start.z, x, z, 2.8, "#e7dcc8", prefix)
            : [
                {
                  id: prefix,
                  x1: start.x,
                  z1: start.z,
                  x2:
                    Math.abs(x - start.x) >= Math.abs(z - start.z)
                      ? x
                      : start.x,
                  z2:
                    Math.abs(x - start.x) >= Math.abs(z - start.z)
                      ? start.z
                      : z,
                  height: 2.8,
                  color: "#e7dcc8",
                },
              ];
        validateLot({
          ...latest.current.design,
          walls: [...(latest.current.design.walls ?? []), ...architectural],
        });
        valid = true;
      } catch (e) {
        valid = false;
        error =
          e instanceof Error ? e.message : "Try drawing in a clear space.";
      }
      if (ghost) {
        scene.remove(ghost);
        disposeBuildObject(ghost);
      }
      ghost = new T.Group();
      for (const w of architectural ?? []) {
        if (!Math.hypot(w.x2 - w.x1, w.z2 - w.z1)) continue;
        const model = buildWall(w);
        model.traverse((o) => {
          const m = o as T.Mesh;
          const mat = m.material as T.MeshLambertMaterial;
          if (mat) {
            mat.color.set(valid ? "#6bba9d" : "#df7767");
            mat.transparent = true;
            mat.opacity = 0.55;
          }
          o.renderOrder = 4;
        });
        ghost.add(model);
      }
      scene.add(ghost);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pointers.size > 1) {
        gesture = true;
        clearGhost();
        pinch = 0;
        return;
      }
      gesture = false;
      if (latest.current.tool === "view") return;
      e.preventDefault();
      if (latest.current.tool === "wall" || latest.current.tool === "room") {
        const p = point(e);
        if (p)
          start = { x: Math.round(p.x * 2) / 2, z: Math.round(p.z * 2) / 2 };
        valid = false;
        architecturePreview(e);
        return;
      }
      const id = hit(e);
      if (latest.current.tool === "select") {
        latest.current.onSelect(id ?? "");
        return;
      }
      if (latest.current.tool === "move") {
        const item = latest.current.design.items.find(
          (i) => i.id === (id || latest.current.selected),
        );
        if (!item) return;
        latest.current.onSelect(item.id);
        draft = { ...item };
      } else
        draft = {
          id: crypto.randomUUID(),
          kind: latest.current.kind,
          color: latest.current.color,
          rotation: 0,
          x: 0,
          z: 0,
        };
      preview(e);
    };
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1) {
        if (latest.current.tool !== "view") {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch && d > 5) {
            const offset = camera.position.clone().sub(controls.target);
            offset.multiplyScalar(pinch / d);
            offset.setLength(Math.max(9, Math.min(34, offset.length())));
            camera.position.copy(controls.target).add(offset);
            controls.update();
          }
          pinch = d;
        }
        return;
      }
      if (!gesture && start) architecturePreview(e);
      else if (!gesture && draft) preview(e);
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (!gesture && start) {
        if (valid && architectural)
          latest.current.onDesign({
            ...latest.current.design,
            walls: [...(latest.current.design.walls ?? []), ...architectural],
          });
        else latest.current.onStatus(error);
      }
      if (!gesture && draft) {
        if (valid) latest.current.onCommit(draft);
        else
          latest.current.onStatus(
            "That spot is outside the lot or overlaps another object. Try a clear space.",
          );
      }
      clearGhost();
      if (!pointers.size) {
        gesture = false;
        pinch = 0;
      }
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
    };
    const cancel = () => {
      pointers.clear();
      gesture = false;
      pinch = 0;
      clearGhost();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("lostpointercapture", cancel);
    window.addEventListener("blur", cancel);
    const visibility = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", visibility);
    const resize = () => {
      const r = el.getBoundingClientRect();
      renderer.setSize(r.width, r.height);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    latest.current.onStatus(
      webgl
        ? "3D lot ready. Choose an object, then drag it onto the grid."
        : "3D geometry is using the lightweight renderer in this browser. Choose an object and drag onto the grid.",
    );
    return () => {
      cancelAnimationFrame(frame);
      cancel();
      observer.disconnect();
      controls.dispose();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
      scene.traverse((o) => {
        const m = o as T.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((x) => x?.dispose());
      });
      if (renderer instanceof T.WebGLRenderer) renderer.dispose();
      surface.remove();
      refresh.current = undefined;
    };
  }, []);
  useEffect(
    () => refresh.current?.(),
    [props.design, props.selected, props.tool],
  );
  return <div ref={host} className="build-scene" />;
}
