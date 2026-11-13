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
  observerCanWalk,
} from "../../data/genesisLife";
import "./Genesis3D.css";
import { VillageTouch, SavedWalker } from "./GenesisTouch";
import {
  buildArchitecture,
  buildVillageEnvironment,
  buildCitizen,
} from "./GenesisEnvironment";
type Props = ComponentProps<typeof GenesisWorld> & { revision: number };
const touchPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem("genesis-touch-settings") ?? "{}");
  } catch {
    return {};
  }
};
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
  const [autoStreet, setAutoStreet] = useState(
      () => touchPreferences().autoStreet !== false,
    ),
    [walkSpeed, setWalkSpeed] = useState(() =>
      Math.max(1, Math.min(5, Number(touchPreferences().walkSpeed) || 3)),
    ),
    [joystick, setJoystick] = useState(
      () => touchPreferences().joystick === true,
    );
  useEffect(() => {
    try {
      localStorage.setItem(
        "genesis-touch-settings",
        JSON.stringify({ autoStreet, walkSpeed, joystick }),
      );
    } catch {
      /* Safari private storage can be unavailable. */
    }
  }, [autoStreet, walkSpeed, joystick]);
  const options = useRef({ follow, cinema, autoStreet, walkSpeed, joystick });
  options.current = { follow, cinema, autoStreet, walkSpeed, joystick };
  const savedPosition = useRef({
    ...observerPresence(props.state),
    revision: props.revision,
  });
  if (props.revision > savedPosition.current.revision)
    savedPosition.current = {
      ...observerPresence(props.state),
      revision: props.revision,
    };
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
      const result = await presenceAction({
        action: "land",
        ...p,
        expectedRevision: Math.max(
          savedPosition.current.revision,
          latest.current.revision,
        ),
      });
      if (!result.ok) throw Error(result.message);
      savedPosition.current = {
        ...savedPosition.current,
        ...p,
        revision: result.revision ?? latest.current.revision + 1,
      };
      landingRef.current = false;
      setLanding(false);
      api.current?.view("street");
      setWalkStatus(
        "You’re on a village path. Hold a clear area to walk, drag on the right to look, and lift to stop.",
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
    const o = savedPosition.current;
    setFollow(false);
    setWalking(true);
    try {
      const result = await presenceAction({
        action: "move",
        x: Math.max(2, Math.min(98, o.x + dx)),
        y: Math.max(2, Math.min(98, o.y + dy)),
        expectedRevision: Math.max(
          savedPosition.current.revision,
          latest.current.revision,
        ),
      });
      if (!result.ok) throw Error(result.message);
      savedPosition.current = {
        ...savedPosition.current,
        x: Math.max(2, Math.min(98, o.x + dx)),
        y: Math.max(2, Math.min(98, o.y + dy)),
        revision: result.revision ?? latest.current.revision + 1,
      };
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
    const skyCamera = new T.PerspectiveCamera(
      45,
      root.clientWidth / root.clientHeight,
      0.1,
      500,
    );
    let camera = skyCamera,
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
    controls.minDistance = 6;
    controls.maxDistance = 240;
    controls.minZoom = 0.55;
    controls.maxZoom = 5;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = 0.08;
    controls.target.set(0, 0, 0);
    controls.touches.ONE = T.TOUCH.PAN;
    controls.touches.TWO = T.TOUCH.DOLLY_ROTATE;
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
      b.onpointerdown = (e) => {
        e.stopPropagation();
        cancel();
      };
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
      if (!street && !flight && camera.position.y < 8) camera.position.y = 8;
      dirty = true;
    });
    let down = { x: 0, y: 0 };
    const ring = document.createElement("div");
    ring.className = "world3d-touch-ring";
    ring.setAttribute("aria-hidden", "true");
    ring.textContent = "↑";
    root.appendChild(ring);
    const joystickMark = document.createElement("div");
    joystickMark.className = "world3d-joystick";
    joystickMark.setAttribute("aria-hidden", "true");
    root.appendChild(joystickMark);
    const events = new Map<number, PointerEvent>();
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
    const aim = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
    };
    const ground = (e: { clientX: number; clientY: number }) => {
      aim(e);
      return ray.ray.intersectPlane(
        new T.Plane(new T.Vector3(0, 1, 0), 0),
        new T.Vector3(),
      );
    };
    const interactive = (e: PointerEvent) => {
      aim(e);
      const hit = ray.intersectObjects(scene.children, true)[0];
      let o: T.Object3D | null = hit?.object ?? null;
      while (o) {
        if (o.userData.citizen !== undefined || o.userData.building)
          return true;
        o = o.parent;
      }
      return false;
    };
    const pick = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7) return;
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

    type Flight = {
      start: number;
      points: T.Vector3[];
      fromQ: T.Quaternion;
      toQ: T.Quaternion;
      fov: number;
      toFov: number;
    };
    let flight: Flight | undefined;
    const eye = (p: { x: number; y: number }) =>
      world(p.x, p.y).add(
        new T.Vector3(0, p.y > 67.5 && p.y < 76.5 ? 2.18 : 1.75, 0),
      );
    const fly = (enter: boolean, home = false) => {
      touch.cancel();
      walker.stop();
      setFollow(false);
      setCinema(false);
      controls.enabled = false;
      street = enter;
      setStreetView(enter);
      const p = savedPosition.current,
        from = camera.position.clone(),
        to = enter
          ? eye(p)
          : home
            ? new T.Vector3(105, 95, 115)
            : world(p.x, p.y).add(new T.Vector3(24, 32, 30));
      const roof = Math.max(12, Math.min(from.y, to.y) + 8),
        a = new T.Vector3(from.x, Math.max(from.y, roof), from.z),
        b = new T.Vector3(to.x, Math.max(to.y, roof), to.z),
        dest = new T.PerspectiveCamera();
      dest.position.copy(to);
      if (enter) {
        const d = camera.getWorldDirection(new T.Vector3());
        yaw = Math.atan2(-d.x, -d.z);
        pitch = 0;
        dest.lookAt(
          to.clone().add(new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))),
        );
        walker.position = { x: p.x, y: p.y };
      } else {
        controls.target.copy(home ? new T.Vector3() : world(p.x, p.y));
        dest.lookAt(controls.target);
      }
      flight = {
        start: performance.now(),
        points: [from, a, b, to],
        fromQ: camera.quaternion.clone(),
        toQ: dest.quaternion.clone(),
        fov: camera.fov,
        toFov: enter ? 65 : 45,
      };
      dirty = true;
    };
    const walker = new SavedWalker({
      position: () => ({
        x: savedPosition.current.x,
        y: savedPosition.current.y,
      }),
      heading: () => yaw,
      speed: () => options.current.walkSpeed,
      canMove: (a, b) => observerCanWalk(latest.current.state, a, b),
      changed: () => {
        dirty = true;
      },
      manual: () => {
        setFollow(false);
        setCinema(false);
      },
      failed: (text) => {
        setWalkStatus(text);
        if (text.includes("did not save")) touch.cancel();
      },
      persist: async (p) => {
        setWalking(true);
        try {
          const result = await presenceAction({
            action: "move",
            ...p,
            expectedRevision: Math.max(
              savedPosition.current.revision,
              latest.current.revision,
            ),
          });
          if (!result.ok) throw Error(result.message);
          savedPosition.current = {
            ...savedPosition.current,
            ...p,
            revision: result.revision ?? latest.current.revision + 1,
          };
          setWalkStatus("Your walk is saved.");
        } finally {
          setWalking(false);
        }
      },
    });
    let pinchOut = 1,
      autoEntering = false;
    const maybeEnter = () => {
      if (
        street ||
        flight ||
        autoEntering ||
        !options.current.autoStreet ||
        latest.current.placement ||
        camera.position.distanceTo(controls.target) > 12
      )
        return;
      autoEntering = true;
      void landAt(controls.target.x + 50, controls.target.z + 50).finally(
        () => {
          autoEntering = false;
        },
      );
    };
    controls.addEventListener("end", maybeEnter);
    const touch = new VillageTouch({
      mode: () => street && !flight,
      joystick: () => options.current.joystick,
      walk: (x, y) => {
        if (!flight) walker.inputMove(x, y);
      },
      stop: () => walker.stop(),
      look: (x, y) => {
        yaw -= x * 0.005;
        pitch = T.MathUtils.clamp(pitch - y * 0.005, -1.15, 1.15);
        look();
      },
      pinch: (ratio, angle) => {
        if (street && !flight) {
          pinchOut *= ratio;
          if (pinchOut < 0.8) fly(false);
        } else {
          dirty = true;
        }
      },
      tap: (id) => {
        const e = events.get(id);
        if (e) pick(e);
      },
      focus: (id) => {
        const e = events.get(id);
        if (!e) return;
        const p = ground(e);
        if (
          !p ||
          !observerRoadSurface(latest.current.state, p.x + 50, p.z + 50)
        )
          return;
        if (options.current.autoStreet) void landAt(p.x + 50, p.z + 50);
        else {
          const delta = p.clone().sub(controls.target);
          controls.target.copy(p);
          camera.position.add(delta);
          camera.position.sub(p).multiplyScalar(0.45).add(p);
          controls.update();
        }
      },
      feedback: (x, y, active) => {
        const r = root.getBoundingClientRect();
        if (active) {
          ring.style.left = x - r.left + "px";
          ring.style.top = y - r.top + "px";
        }
        ring.classList.toggle("active", active);
        ring.style.rotate =
          (Math.atan2(walker.input.x, -walker.input.y) * 180) / Math.PI + "deg";
      },
    });
    const point = (e: PointerEvent, check = false) => {
      const r = el.getBoundingClientRect();
      return {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
        right: e.clientX - r.left > r.width * 0.55,
        aimX: ((e.clientX - r.left) / r.width - 0.5) * 2,
        interactive: check ? interactive(e) : false,
      };
    };
    const start = (e: PointerEvent) => {
      if (e.button !== 0 || flight) return;
      events.set(e.pointerId, e);
      down = { x: e.clientX, y: e.clientY };
      if (touch.points.size === 0) pinchOut = 1;
      touch.down(point(e, true));
      if (street) el.setPointerCapture(e.pointerId);
    };
    const hover = (e: PointerEvent) => {
      events.set(e.pointerId, e);
      if (touch.points.has(e.pointerId)) touch.move(point(e));
      if (latest.current.placement) {
        const p = ground(e);
        if (p) ghost.position.set(Math.round(p.x), 0, Math.round(p.z));
      }
    };
    const release = (e: PointerEvent) => {
      events.set(e.pointerId, e);
      touch.up(e.pointerId, performance.now());
      events.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
    };
    const cancel = () => touch.cancel();
    const outside = (e: Event) => {
      if (!root.contains(e.target as Node)) cancel();
    };
    const wheel = (e: WheelEvent) => {
      if (street && e.deltaY > 0) {
        e.preventDefault();
        fly(false);
      }
    };
    el.addEventListener("pointerdown", start as EventListener);
    el.addEventListener("pointermove", hover as EventListener);
    el.addEventListener("pointerup", release as EventListener);
    el.addEventListener("pointercancel", cancel);
    el.addEventListener("lostpointercapture", cancel);
    el.addEventListener("wheel", wheel as EventListener, { passive: false });
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    document.addEventListener("pointerdown", outside, true);
    root.tabIndex = 0;
    const key = (e: KeyboardEvent) => {
      if (!street || flight) return;
      const keys: Record<string, [number, number]> = {
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const d = keys[e.key];
      if (d) {
        e.preventDefault();
        if (e.type === "keyup") walker.stop();
        else walker.inputMove(...d);
      }
    };
    root.addEventListener("keydown", key);
    root.addEventListener("keyup", key);
    api.current = {
      heading: () => yaw,
      view: (v) => {
        touch.cancel();
        if (v === "street") {
          fly(true);
          return;
        }
        if (v.startsWith("look-")) {
          if (street && !flight) {
            if (v === "look-left") yaw += 0.3;
            if (v === "look-right") yaw -= 0.3;
            if (v === "look-up") pitch = Math.min(1.15, pitch + 0.2);
            if (v === "look-down") pitch = Math.max(-1.15, pitch - 0.2);
            look();
          }
          return;
        }
        if (street || v === "home") {
          fly(false, v === "home");
          return;
        }
        if (v === "rotate")
          camera.position
            .sub(controls.target)
            .applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 4)
            .add(controls.target);
        else {
          controls.target.set(0, 0, 0);
          camera.position.set(
            v === "overhead" ? 0 : 105,
            v === "overhead" ? 150 : 95,
            v === "overhead" ? 0.1 : 115,
          );
        }
        controls.update();
        dirty = true;
      },
      zoom: (n) => {
        if (flight) return;
        if (street) {
          if (n < 1) fly(false);
          return;
        }
        camera.position
          .sub(controls.target)
          .multiplyScalar(1 / n)
          .add(controls.target);
        controls.update();
        dirty = true;
        maybeEnter();
      },
    };
    const resize = () => {
      dirty = true;
      const w = root.clientWidth,
        h = root.clientHeight;
      camera.aspect = w / h;
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
      if (!document.hidden) {
        touch.tick(now);
        walker.tick(now);
      } else walker.lastTime = now;
      joystickMark.classList.toggle(
        "shown",
        street && options.current.joystick,
      );
      if (flight) {
        const t = T.MathUtils.clamp((now - flight.start) / 1200, 0, 1),
          stage = Math.min(2, Math.floor(t * 3)),
          u = t === 1 ? 1 : t * 3 - stage,
          smooth = u * u * (3 - 2 * u);
        camera.position.lerpVectors(
          flight.points[stage],
          flight.points[stage + 1],
          smooth,
        );
        camera.quaternion.slerpQuaternions(
          flight.fromQ,
          flight.toQ,
          t * t * (3 - 2 * t),
        );
        camera.fov = T.MathUtils.lerp(flight.fov, flight.toFov, t);
        camera.updateProjectionMatrix();
        dirty = true;
        if (t === 1) {
          flight = undefined;
          controls.enabled = !street;
          controls.object = camera;
          if (!street) controls.update();
        }
      }
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
      if (street && !flight) {
        const p =
          walker.active || walker.pending || walker.dirty
            ? walker.position
            : savedPosition.current;
        camera.position.copy(eye(p));
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
        !flight &&
        options.current.follow &&
        selected !== undefined &&
        people.has(selected)
      ) {
        const p = people.get(selected)!.group.position,
          delta = p.clone().sub(controls.target).multiplyScalar(0.08);
        controls.target.add(delta);
        camera.position.add(delta);
      }
      controls.autoRotate = !street && !flight && options.current.cinema;
      controls.autoRotateSpeed = 0.45;
      if (!street && !flight) controls.update();
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
      touch.cancel();
      walker.dispose();
      controls.dispose();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
      document.removeEventListener("pointerdown", outside, true);
      root.removeEventListener("keydown", key);
      root.removeEventListener("keyup", key);
      el.removeEventListener("lostpointercapture", cancel);
      el.removeEventListener("wheel", wheel as EventListener);
      ring.remove();
      joystickMark.remove();
      el.removeEventListener("pointerup", release as EventListener);
      el.removeEventListener("pointercancel", cancel);
      el.removeEventListener("pointerdown", start as EventListener);

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
      <div className="world3d-tools" aria-label="Village camera controls">
        <button aria-pressed={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Close large view" : "Open large view"}
        </button>
        <button onClick={() => api.current?.view("iso")}>Sky View</button>
        <button
          disabled={walking}
          onClick={() => {
            const o = savedPosition.current;
            void landAt(o.x, o.y);
          }}
        >
          Walk Mode
        </button>
        <button
          disabled={props.selected === undefined}
          aria-pressed={follow}
          onClick={() => {
            if (streetView) api.current?.view("iso");
            setFollow(!follow);
          }}
        >
          Follow
        </button>
        <button onClick={() => api.current?.view("home")}>Return Home</button>
        <button aria-label="Zoom in" onClick={() => api.current?.zoom(1.25)}>
          +
        </button>
        <button aria-label="Zoom out" onClick={() => api.current?.zoom(0.8)}>
          −
        </button>
      </div>
      <details className="world3d-settings">
        <summary>Camera & touch settings</summary>
        <label>
          <input
            type="checkbox"
            checked={autoStreet}
            onChange={(e) => setAutoStreet(e.target.checked)}
          />{" "}
          Automatically enter Walk Mode when zooming close
        </label>
        <label>
          Walking speed{" "}
          <input
            aria-label="Walking speed"
            type="range"
            min="1"
            max="5"
            step=".5"
            value={walkSpeed}
            onChange={(e) => setWalkSpeed(Number(e.target.value))}
          />
          {walkSpeed} m/s
        </label>
        <label>
          <input
            type="checkbox"
            checked={joystick}
            onChange={(e) => setJoystick(e.target.checked)}
          />{" "}
          Show an optional movement pad
        </label>
        <div className="world3d-tools">
          <button
            aria-pressed={landing}
            onClick={() => {
              api.current?.view("iso");
              landingRef.current = !landingRef.current;
              setLanding(landingRef.current);
            }}
          >
            {landing ? "Cancel landing" : "Choose a road to land"}
          </button>
          {["left", "right", "up", "down"].map((d) => (
            <button key={d} onClick={() => api.current?.view("look-" + d)}>
              Look {d}
            </button>
          ))}
          <button onClick={() => api.current?.view("overhead")}>
            From above
          </button>
          <button onClick={() => api.current?.view("rotate")}>Rotate</button>
          <button aria-pressed={cinema} onClick={() => setCinema(!cinema)}>
            Slow camera tour
          </button>
        </div>
      </details>
      <p className="world3d-status" role="status">
        {walking ? "Saving your walk…" : walkStatus}
      </p>
      {streetView && (
        <details>
          <summary>Step buttons (optional)</summary>
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
          </div>
        </details>
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
            ? "Hold a clear area to walk; drag while holding to steer. Drag on the right to look. Lift to stop. Pinch inward to return to the sky. "
            : "Drag one finger to pan. Pinch to zoom, twist two fingers to rotate. Double-tap a road to explore it. "}{" "}
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
