import { useEffect, useRef, useState, type ComponentProps } from "react";
import * as T from "three";
import { useMutation } from "convex/react";
import { api as convexApi } from "../../convex/_generated/api";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGRenderer } from "three/examples/jsm/renderers/SVGRenderer.js";
import type GenesisWorld from "./GenesisWorld";
import { factionColors } from "./GenesisWorld";
import {
  calendar,
  PLACES,
  observerPresence,
  nearestObserverRoad,
  observerRoadSurface,
} from "../../data/genesisLife";
import "./Genesis3D.css";
import {
  buildArchitecture,
  buildVillageEnvironment,
  buildCitizen,
} from "./GenesisEnvironment";
type Props = ComponentProps<typeof GenesisWorld> & { revision: number };
export default function GenesisWorld3D(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props),
    api = useRef<{
      view: (mode: string) => void;
      zoom: (amount: number) => void;
      heading: () => number;
    }>();
  latest.current = props;
  const [quality, setQuality] = useState("auto"),
    [mode, setMode] = useState("Starting 3D renderer…"),
    [follow, setFollow] = useState(false),
    [cinema, setCinema] = useState(false),
    [expanded, setExpanded] = useState(false);
  const options = useRef({ follow, cinema });
  options.current = { follow, cinema };
  const presenceAction = useMutation(convexApi.genesis.observerPresenceAction);
  const [walking, setWalking] = useState(false),
    [walkStatus, setWalkStatus] = useState(""),
    [streetView, setStreetView] = useState(false);
  const landingRef = useRef(false),
    busy = useRef(false);
  const [landing, setLanding] = useState(false);
  async function landAt(x: number, y: number) {
    if (busy.current) return;
    busy.current = true;
    setWalking(true);
    try {
      const p = nearestObserverRoad(latest.current.state, x, y);
      await presenceAction({
        action: "land",
        ...p,
        expectedRevision: latest.current.revision,
      });
      landingRef.current = false;
      setLanding(false);
      api.current?.view("street");
      setWalkStatus(
        "You’re on a village path. Drag to look around, or use the walking buttons.",
      );
    } catch {
      setWalkStatus(
        "We couldn’t land there. Choose another clear path and try again.",
      );
    } finally {
      busy.current = false;
      setWalking(false);
    }
  }
  async function walk(dx: number, dy: number) {
    if (busy.current) return;
    busy.current = true;
    const heading = api.current?.heading() ?? 0;
    const rx = dx * Math.cos(heading) + dy * Math.sin(heading),
      ry = -dx * Math.sin(heading) + dy * Math.cos(heading);
    dx = rx;
    dy = ry;
    const o = observerPresence(latest.current.state);
    setWalking(true);
    try {
      const result = await presenceAction({
        action: "move",
        x: Math.max(2, Math.min(98, o.x + dx)),
        y: Math.max(2, Math.min(98, o.y + dy)),
        expectedRevision: latest.current.revision,
      });
      setWalkStatus(result.message);
    } catch {
      setWalkStatus(
        "That way is blocked, or the step didn’t save. Try a smaller step or walk around.",
      );
    } finally {
      busy.current = false;
      setWalking(false);
    }
  }
  useEffect(() => {
    const root = host.current!;
    setStreetView(false);
    const scene = new T.Scene();
    scene.background = new T.Color("#a8c6cc");
    const skyCamera = new T.OrthographicCamera(-72, 72, 48, -48, 0.1, 500);
    let camera: T.OrthographicCamera | T.PerspectiveCamera = skyCamera,
      street = false,
      yaw = 0,
      pitch = 0;
    camera.position.set(105, 95, 115);
    camera.lookAt(0, 0, 0);
    let renderer: T.WebGLRenderer | SVGRenderer;
    let gpu = false;
    try {
      renderer = new T.WebGLRenderer({
        antialias: quality !== "low",
        powerPreference: "low-power",
      });
      gpu = true;
      if (quality === "auto" && matchMedia("(max-width:700px)").matches)
        renderer.setPixelRatio(1);
      renderer.setPixelRatio(
        Math.min(
          devicePixelRatio,
          quality === "high"
            ? 1.75
            : quality === "low" ||
                (quality === "auto" && matchMedia("(max-width:700px)").matches)
              ? 1
              : 1.25,
        ),
      );
      renderer.shadowMap.enabled = quality === "high";
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      setMode("WebGL · actual 3D geometry");
    } catch {
      renderer = new SVGRenderer();
      renderer.setQuality("low");
      setMode("Compatibility 3D · projected mesh geometry");
    }
    const el = renderer.domElement;
    root.appendChild(el);
    el.setAttribute("aria-label", "Interactive 3D village");
    el.setAttribute("role", "img");
    const controls = new OrbitControls(camera, el as HTMLElement);
    controls.enableDamping = gpu;
    controls.dampingFactor = 0.12;
    controls.minZoom = 0.55;
    controls.maxZoom = 5;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0.08;
    controls.target.set(0, 0, 0);
    controls.touches.ONE = T.TOUCH.ROTATE;
    controls.touches.TWO = T.TOUCH.DOLLY_PAN;
    controls.update();
    const ambient = new T.HemisphereLight("#fff4d8", "#6f7b67", 2.3);
    scene.add(ambient);
    const fillLight = new T.AmbientLight("#e1e9e3", 0.8);
    scene.add(fillLight);
    const sun = new T.DirectionalLight("#fff1dc", 1.3);
    sun.position.set(-35, 70, 28);
    sun.castShadow = gpu && quality === "high";
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -65;
    sun.shadow.camera.right = 65;
    sun.shadow.camera.top = 65;
    sun.shadow.camera.bottom = -65;
    scene.add(sun);
    const mats = new Map<string, T.MeshLambertMaterial>();
    const material = (color: string) => {
      if (!mats.has(color))
        mats.set(color, new T.MeshLambertMaterial({ color }));
      return mats.get(color)!;
    };
    const mesh = (
      parent: T.Object3D,
      geo: T.BufferGeometry,
      color: string,
      x: number,
      y: number,
      z: number,
    ) => {
      const m = new T.Mesh(geo, material(color));
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const box = (
      p: T.Object3D,
      w: number,
      h: number,
      d: number,
      c: string,
      x: number,
      y: number,
      z: number,
    ) =>
      mesh(
        p,
        new T.BoxGeometry(
          w,
          h,
          d,
          w > 40 ? Math.ceil(w / 5) : 1,
          1,
          d > 40 ? Math.ceil(d / 5) : 1,
        ),
        c,
        x,
        y,
        z,
      );
    const geometryCache = new Map<string, T.BufferGeometry>();
    const geo = (key: string, make: () => T.BufferGeometry) => {
      if (!geometryCache.has(key)) geometryCache.set(key, make());
      return geometryCache.get(key)!;
    };
    const windows: T.Mesh[] = [];
    const tools = {
      box,
      mesh,
      material,
      geo,
      gpu,
      detail:
        gpu &&
        quality !== "low" &&
        !(quality === "auto" && matchMedia("(max-width:700px)").matches),
      windows,
    };
    const terrain = box(scene, 122, 3, 113, "#748765", 0, -1.6, 0);
    terrain.userData.ground = true;
    buildVillageEnvironment(tools, scene, latest.current.state);
    const lamps: T.Mesh[] = [];
    for (const x of [-14.5, 30.5])
      for (const z of [-17, 12, 34]) {
        box(scene, 0.25, 4, 0.25, "#4e5350", x, 2, z);
        lamps.push(
          mesh(scene, new T.SphereGeometry(0.6, 6, 4), "#ffe8a6", x, 4.1, z),
        );
      }
    type Item = {
      group: T.Group;
      label: HTMLButtonElement;
      target: T.Vector3;
      limbs?: T.Group[];
      body?: T.Mesh;
      head?: T.Mesh;
      hair?: T.Mesh;
      phone?: T.Group;
      book?: T.Group;
      bowl?: T.Mesh;
      longHair?: T.Mesh;
      pony?: T.Mesh;
      last?: string;
      movingUntil?: number;
    };
    const people = new Map<number, Item>(),
      buildings = new Map<string, Item>();
    const labels = document.createElement("div");
    labels.className = "world3d-labels";
    root.appendChild(labels);
    const label = (text: string, click: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.onpointerdown = (e) => e.stopPropagation();
      b.onclick = click;
      labels.appendChild(b);
      return b;
    };
    const world = (x: number, y: number) => new T.Vector3(x - 50, 0, y - 50);

    const observerAvatar = new T.Group();
    scene.add(observerAvatar);
    const observerBody = mesh(
      observerAvatar,
      new T.CylinderGeometry(0.48, 0.62, 1.35, 8),
      "#ae9fdd",
      0,
      1.4,
      0,
    );
    mesh(
      observerAvatar,
      new T.SphereGeometry(0.38, 10, 7),
      "#d9b79b",
      0,
      2.5,
      0,
    );
    mesh(observerAvatar, new T.ConeGeometry(0.62, 0.7, 8), "#544365", 0, 3, 0);
    const observerLabel = label("The Visitor", () =>
      document
        .getElementById("genesis-presence")
        ?.scrollIntoView({ behavior: "smooth" }),
    );
    const addBuilding = (b: {
      id: string;
      type: string;
      x: number;
      y: number;
      progress?: number;
    }) => {
      const g = new T.Group();
      g.position.copy(world(b.x, b.y));
      g.userData.building = b.id;
      scene.add(g);
      buildArchitecture(tools, g, b);
      const item: Item = {
        group: g,
        label: label(b.type, () => {
          const actual =
            latest.current.state.life.buildings.find((x) => x.id === b.id) ?? b;
          latest.current.onBuilding(actual);
          setExpanded(false);
        }),
        target: g.position.clone(),
      };
      buildings.set(b.id, item);
    };
    const civic = Object.entries(PLACES)
      .filter(([k]) => k !== "homes")
      .map(([type, p]) => ({ id: "civic-" + type, type, ...p }));
    civic.forEach(addBuilding);
    const addPerson = (c: Props["state"]["citizens"][number]) => {
      const p = latest.current.state.life.people[c.id];
      const g = new T.Group();
      g.position.copy(world(c.x, c.y));
      g.userData.citizen = c.id;
      scene.add(g);
      const human = buildCitizen(tools, g, p, c.id);
      people.set(c.id, {
        group: g,
        ...human,
        target: g.position.clone(),
        label: label(c.name, () => {
          latest.current.onCitizen(c.id);
          setExpanded(false);
        }),
      });
    };
    const ghost = new T.Group();
    box(ghost, 7, 5.3, 6, "#a7bd86", 0, 2.7, 0);
    ghost.visible = false;
    scene.add(ghost);
    const ray = new T.Raycaster(),
      pointer = new T.Vector2();
    let dirty = true,
      stillMoving = true,
      renderedProps: Props | undefined;
    controls.addEventListener("change", () => {
      dirty = true;
    });
    let down = { x: 0, y: 0 },
      dragging = false,
      lastPointer = { x: 0, y: 0 };
    const look = () => {
      dirty = true;
      camera.lookAt(
        camera.position
          .clone()
          .add(
            new T.Vector3(
              -Math.sin(yaw) * Math.cos(pitch),
              Math.sin(pitch),
              -Math.cos(yaw) * Math.cos(pitch),
            ),
          ),
      );
    };
    const aim = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
    };
    const pick = (e: PointerEvent) => {
      dragging = false;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) return;
      dragging = false;
      aim(e);
      if (landingRef.current && !latest.current.placement) {
        const p = ray.ray.intersectPlane(
          new T.Plane(new T.Vector3(0, 1, 0), 0),
          new T.Vector3(),
        );
        if (p && observerRoadSurface(latest.current.state, p.x + 50, p.z + 50))
          void landAt(p.x + 50, p.z + 50);
        else setWalkStatus("Tap a clear road, sidewalk or entrance path.");
        return;
      }
      if (latest.current.placement) {
        const v = ray.ray.intersectPlane(
          new T.Plane(new T.Vector3(0, 1, 0), 0),
          new T.Vector3(),
        );
        if (v)
          latest.current.onPlace(Math.round(v.x + 50), Math.round(v.z + 50));
        return;
      }
      for (const hit of ray.intersectObjects(scene.children, true)) {
        let o: T.Object3D | null = hit.object;
        while (o) {
          if (o.userData.citizen !== undefined) {
            latest.current.onCitizen(o.userData.citizen);
            setExpanded(false);
            return;
          }
          if (o.userData.building) {
            const b =
              latest.current.state.life.buildings.find(
                (b) => b.id === o!.userData.building,
              ) ?? civic.find((b) => b.id === o!.userData.building);
            if (b) {
              latest.current.onBuilding(b);
              setExpanded(false);
            }
            return;
          }
          o = o.parent;
        }
      }
    };
    const start = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
      lastPointer = { ...down };
      dragging = true;
    };
    const hover = (e: PointerEvent) => {
      if (street && dragging) {
        yaw -= (e.clientX - lastPointer.x) * 0.006;
        pitch = T.MathUtils.clamp(
          pitch - (e.clientY - lastPointer.y) * 0.006,
          -1.15,
          1.15,
        );
        lastPointer = { x: e.clientX, y: e.clientY };
        look();
      }
      if (!latest.current.placement) return;
      aim(e);
      const v = ray.ray.intersectPlane(
        new T.Plane(new T.Vector3(0, 1, 0), 0),
        new T.Vector3(),
      );
      if (v) {
        ghost.position.set(Math.round(v.x), 0, Math.round(v.z));
      }
    };
    el.addEventListener("pointerdown", start as EventListener);
    el.addEventListener("pointerup", pick as EventListener);
    el.addEventListener("pointermove", hover as EventListener);
    const release = () => {
      dragging = false;
    };
    el.addEventListener("pointerleave", release);
    el.addEventListener("pointercancel", release);
    api.current = {
      heading: () => yaw,
      view: (v) => {
        if (v === "street") {
          const o = observerPresence(latest.current.state);
          street = true;
          controls.enabled = false;
          yaw = 0;
          pitch = 0;
          setStreetView(true);
          camera = new T.PerspectiveCamera(
            65,
            root.clientWidth / root.clientHeight,
            0.1,
            500,
          );
          camera.position.copy(world(o.x, o.y)).add(new T.Vector3(0, 1.75, 0));
          controls.object = camera;
          controls.target.copy(camera.position).add(new T.Vector3(0, 0, -8));
          controls.enablePan = false;
          controls.enableRotate = false;
          controls.autoRotate = false;
          look();
          return;
        }
        if (v.startsWith("look-")) {
          if (street) {
            if (v === "look-left") yaw += 0.3;
            if (v === "look-right") yaw -= 0.3;
            if (v === "look-up") pitch = Math.min(1.15, pitch + 0.2);
            if (v === "look-down") pitch = Math.max(-1.15, pitch - 0.2);
            look();
          }
          return;
        }
        if (street) {
          street = false;
          controls.enabled = true;
          setStreetView(false);
          camera = skyCamera;
          controls.object = camera;
          controls.enablePan = true;
          controls.enableRotate = true;
        }
        if (v === "rotate") {
          camera.position
            .sub(controls.target)
            .applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 4)
            .add(controls.target);
        } else {
          controls.target.set(0, 0, 0);
          camera.position.set(
            v === "overhead" ? 0 : 105,
            v === "overhead" ? 150 : 95,
            v === "overhead" ? 0.1 : 115,
          );
          camera.zoom = 1;
          camera.updateProjectionMatrix();
        }
        controls.update();
      },
      zoom: (n) => {
        camera.zoom = T.MathUtils.clamp(camera.zoom * n, 0.55, 5);
        camera.updateProjectionMatrix();
      },
    };
    const resize = () => {
      dirty = true;
      const w = root.clientWidth,
        h = root.clientHeight;
      if (camera instanceof T.OrthographicCamera) {
        camera.left = (-55 * w) / h;
        camera.right = (55 * w) / h;
        camera.top = 55;
        camera.bottom = -55;
      } else {
        camera.aspect = w / h;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    resize();
    let frame = 0,
      last = 0,
      stopped = false;
    const animate = (now: number) => {
      if (stopped) return;
      frame = requestAnimationFrame(animate);
      if (
        document.hidden ||
        now - last < (gpu ? (quality === "low" ? 50 : 33) : 350)
      )
        return;
      if (
        !gpu &&
        !dirty &&
        !stillMoving &&
        renderedProps === latest.current &&
        !options.current.cinema
      )
        return;
      last = now;
      const { state, selected, playing, placement } = latest.current;
      ghost.visible = !!placement;
      const observerState = observerPresence(state);
      observerAvatar.position.copy(world(observerState.x, observerState.y));
      observerAvatar.visible =
        observerState.active &&
        ["The Visitor", "The Creator"].includes(observerState.mode) &&
        !street;
      (observerBody.material as T.MeshLambertMaterial).color.set(
        observerState.color,
      );
      observerLabel.textContent = observerState.label;
      observerLabel.hidden = !observerAvatar.visible || !observerState.label;
      const observerPoint = observerAvatar.position
        .clone()
        .add(new T.Vector3(0, 4, 0))
        .project(camera);
      observerLabel.style.transform =
        "translate(-50%,-50%) translate(" +
        ((observerPoint.x + 1) * root.clientWidth) / 2 +
        "px," +
        ((-observerPoint.y + 1) * root.clientHeight) / 2 +
        "px)";
      if (street) {
        const desired = world(observerState.x, observerState.y);
        const delta = new T.Vector3(
          desired.x - camera.position.x,
          (observerState.y > 67.5 && observerState.y < 76.5 ? 2.18 : 1.75) -
            camera.position.y,
          desired.z - camera.position.z,
        );
        camera.position.add(delta.multiplyScalar(0.3));
        look();
      }

      state.life.buildings.forEach((b) => {
        if (!buildings.has(b.id)) addBuilding(b);
        const it = buildings.get(b.id)!;
        it.group.scale.y = Math.max(0.18, b.progress / 100);
        it.label.textContent =
          b.type + (b.progress < 100 ? " " + b.progress + "%" : "");
      });
      for (const [id, it] of buildings) {
        if (
          !id.startsWith("civic-") &&
          !state.life.buildings.some((b) => b.id === id)
        ) {
          scene.remove(it.group);
          it.label.remove();
          buildings.delete(id);
        }
      }
      for (const c of state.citizens) {
        if (!people.has(c.id)) addPerson(c);
        const it = people.get(c.id)!,
          p = state.life.people[c.id];
        const target = world(c.x, c.y);
        if (it.target.distanceTo(target) > 0.01) {
          it.target.copy(target);
          it.movingUntil = now + 2300;
        }
        const moving = it.group.position.distanceTo(it.target) > 0.07;
        if (moving) {
          it.group.lookAt(it.target.x, 0, it.target.z);
          it.group.position.lerp(it.target, 0.12);
        }
        const sleeping = /rest|sleep/i.test(p.activity);
        it.group.rotation.z = 0;
        it.group.visible = !sleeping;
        it.group.position.y = 0;
        const phone = /text|phone|post|whisper|scroll/i.test(p.activity),
          reading = /read|study|research|investigat/i.test(p.activity),
          eating = /eat|meal|breakfast/i.test(p.activity);
        if (it.phone) it.phone.visible = !moving && phone;
        if (it.book) it.book.visible = !moving && reading && !phone;
        if (it.bowl) it.bowl.visible = !moving && eating;
        it.limbs!.forEach(
          (limb, i) =>
            (limb.rotation.x = moving
              ? Math.sin(now * 0.011 + i * Math.PI) * 0.7
              : !moving && i > 1 && (phone || reading || eating)
                ? -1.05
                : playing && /talk/i.test(p.activity) && i > 1
                  ? Math.sin(now * 0.004 + i) * 0.25
                  : playing && /work|farm/i.test(p.activity) && i > 1
                    ? -0.6 + Math.sin(now * 0.005) * 0.3
                    : 0),
        );
        (it.body!.material as T.MeshLambertMaterial).color.set(
          p.profile?.outfit ?? factionColors[c.faction] ?? "#b6b5a0",
        );
        (it.head!.material as T.MeshLambertMaterial).color.set(
          p.profile?.skin ?? "#c9a783",
        );
        (it.hair!.material as T.MeshLambertMaterial).color.set(
          p.profile?.hair ?? "#493c33",
        );
        if (it.longHair) {
          it.longHair.visible = /long|bob/i.test(p.profile?.hairstyle ?? "");
          (it.longHair.material as T.MeshLambertMaterial).color.set(
            p.profile?.hair ?? "#493c33",
          );
        }
        if (it.pony) {
          it.pony.visible = /pony|tied/i.test(p.profile?.hairstyle ?? "");
          (it.pony.material as T.MeshLambertMaterial).color.set(
            p.profile?.hair ?? "#493c33",
          );
        }
        it.hair!.visible = !/bald/i.test(p.profile?.hairstyle ?? "");
        it.label.textContent = c.name;
        it.label.classList.toggle("chosen", selected === c.id);
        it.label.title = p.activity;
      }
      for (const [id, it] of people)
        if (!state.citizens.some((c) => c.id === id)) {
          scene.remove(it.group);
          it.label.remove();
          people.delete(id);
        }
      if (
        !street &&
        options.current.follow &&
        selected !== undefined &&
        people.has(selected)
      ) {
        const p = people.get(selected)!.group.position,
          delta = p.clone().sub(controls.target).multiplyScalar(0.08);
        controls.target.add(delta);
        camera.position.add(delta);
      }
      controls.autoRotate = !street && options.current.cinema;
      controls.autoRotateSpeed = 0.45;
      if (!street) controls.update();
      const hour = calendar(state.tick).hour,
        daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI)),
        night = daylight < 0.1;
      ambient.intensity = 0.45 + daylight * 0.6;
      fillLight.intensity = night ? 0.28 : 0.7;
      sun.intensity = 0.12 + daylight * 1.25;
      sun.color.set(hour === 6 || hour === 18 ? "#f8cfa5" : "#fff1dc");
      sun.position.set(
        Math.cos(((hour - 6) / 12) * Math.PI) * 55,
        12 + daylight * 65,
        28,
      );
      scene.background = new T.Color(
        night
          ? "#293c54"
          : state.life.weather === "Rain"
            ? "#b6c7cd"
            : "#c5dade",
      );
      for (const m of [...lamps, ...windows]) {
        const mat = m.material as T.MeshLambertMaterial;
        mat.emissive.set(night ? "#f0bf75" : "#000000");
        mat.emissiveIntensity = night ? 0.65 : 0;
      }
      const occupied: { x: number; y: number; w: number; h: number }[] = [];
      for (const it of [...buildings.values(), ...people.values()]) {
        const pos = it.group.position
          .clone()
          .add(new T.Vector3(0, it.limbs ? 2.45 : 8.5, 0))
          .project(camera);
        let px = ((pos.x + 1) * root.clientWidth) / 2,
          py = ((-pos.y + 1) * root.clientHeight) / 2;
        const w = Math.max(50, it.label.offsetWidth),
          h = 31;
        let tries = 0;
        while (
          occupied.some(
            (r) =>
              Math.abs(r.x - px) < (r.w + w) / 2 + 3 &&
              Math.abs(r.y - py) < (r.h + h) / 2 + 2,
          ) &&
          tries++ < 10
        )
          py -= 33;
        it.label.style.transform =
          "translate(-50%,-50%) translate(" + px + "px," + py + "px)";
        it.label.hidden =
          pos.z < -1 ||
          pos.z > 1 ||
          Math.abs(pos.x) > 1.15 ||
          Math.abs(pos.y) > 1.15 ||
          py < 15 ||
          tries > 10;
        if (!it.label.hidden) occupied.push({ x: px, y: py, w, h });
      }
      if (!gpu) {
        const direction = camera.getWorldDirection(new T.Vector3());
        scene.traverse((o) => {
          if (o.userData.nearClipRadius !== undefined)
            o.visible =
              !street ||
              o.position.clone().sub(camera.position).dot(direction) >
                o.userData.nearClipRadius + 0.3;
        });
      }
      renderer.render(scene, camera);
      dirty = false;
      renderedProps = latest.current;
      stillMoving =
        [...people.values()].some(
          (it) => it.group.position.distanceTo(it.target) > 0.07,
        ) ||
        (street &&
          camera.position.distanceTo(
            world(observerState.x, observerState.y).add(
              new T.Vector3(
                0,
                observerState.y > 67.5 && observerState.y < 76.5 ? 2.18 : 1.75,
                0,
              ),
            ),
          ) > 0.02);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("pointercancel", release);
      el.removeEventListener("pointerdown", start as EventListener);
      el.removeEventListener("pointerup", pick as EventListener);
      el.removeEventListener("pointermove", hover as EventListener);
      scene.traverse((o) => {
        if (o instanceof T.Mesh) {
          o.geometry.dispose();
          if (!Array.isArray(o.material)) o.material.dispose();
        }
      });
      mats.forEach((m) => m.dispose());
      if (renderer instanceof T.WebGLRenderer) renderer.dispose();
      el.remove();
      labels.remove();
      api.current = undefined;
    };
  }, [quality]);
  return (
    <section
      className={"panel world3d" + (expanded ? " expanded" : "")}
      id="genesis-village"
    >
      <header>
        <div>
          <span className="eyebrow">Weather · {props.state.life.weather}</span>
          <h2>My Village</h2>
        </div>
        <select
          aria-label="3D graphics quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
        >
          <option value="auto">Auto graphics</option>
          <option value="low">Low graphics</option>
          <option value="balanced">Medium graphics</option>
          <option value="high">High graphics</option>
        </select>
      </header>
      <div className="world3d-tools">
        <button aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Close large view" : "Open large view"}
        </button>
        <button onClick={() => api.current?.view("iso")}>
          {streetView ? "Return to Sky" : "Sky view"}
        </button>
        <button
          disabled={walking}
          onClick={() => {
            const o = observerPresence(props.state);
            void landAt(o.x, o.y);
          }}
        >
          Enter Street View
        </button>
        <button
          aria-pressed={landing}
          onClick={() => {
            api.current?.view("iso");
            landingRef.current = !landingRef.current;
            setLanding(landingRef.current);
            setWalkStatus(
              "Tap a clear road or sidewalk in the village to land.",
            );
          }}
        >
          {landing ? "Cancel landing" : "Choose a road to land"}
        </button>
        <button onClick={() => api.current?.view("look-left")}>
          Look left
        </button>
        <button onClick={() => api.current?.view("look-right")}>
          Look right
        </button>
        {streetView && (
          <>
            <button onClick={() => api.current?.view("look-up")}>
              Look up
            </button>
            <button onClick={() => api.current?.view("look-down")}>
              Look down
            </button>
          </>
        )}
        <button onClick={() => api.current?.view("overhead")}>
          From above
        </button>
        <button onClick={() => api.current?.view("rotate")}>Rotate</button>
        <button aria-label="Zoom in" onClick={() => api.current?.zoom(1.25)}>
          +
        </button>
        <button aria-label="Zoom out" onClick={() => api.current?.zoom(0.8)}>
          −
        </button>
        <button
          disabled={props.selected === undefined}
          aria-pressed={follow}
          onClick={() => setFollow(!follow)}
        >
          Follow villager
        </button>
        <button aria-pressed={cinema} onClick={() => setCinema(!cinema)}>
          Slow camera tour
        </button>
      </div>
      {streetView && (
        <div className="world3d-tools" aria-label="Street walking controls">
          <button disabled={walking} onClick={() => void walk(0, -1.5)}>
            Walk forward
          </button>
          <button disabled={walking} onClick={() => void walk(0, 1.5)}>
            Walk backward
          </button>
          <button disabled={walking} onClick={() => void walk(-1.5, 0)}>
            Step left
          </button>
          <button disabled={walking} onClick={() => void walk(1.5, 0)}>
            Step right
          </button>
          <span role="status">
            {walking ? "Saving your step…" : walkStatus}
          </span>
        </div>
      )}
      {landing && (
        <p role="status">
          Tap a clear road, sidewalk or entrance path to land.
        </p>
      )}
      <div ref={host} className="world3d-stage" />
      <p className="world3d-help">
        {landing
          ? "Tap a road or sidewalk to land. "
          : streetView
            ? "Drag to look around. Walk with the buttons above; buildings and the river block your path. "
            : "Sky View: drag to rotate, pinch to zoom, or use two fingers to pan. "}{" "}
        Tap a villager or building to learn more.{" "}
        {props.placement ? "Tap a spot to review the building cost." : ""}
      </p>
      <details>
        <summary>Graphics details</summary>
        <p>
          {mode}. Movement follows saved village activities. Detailed animations
          inside buildings are still on the way.
        </p>
      </details>
    </section>
  );
}
