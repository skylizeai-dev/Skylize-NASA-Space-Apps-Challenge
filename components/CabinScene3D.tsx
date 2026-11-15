"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Path,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Raycaster,
  PointsMaterial,
  Scene,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import { useState } from "react";
import { describeScene, type CabinSceneProps, type SetupStep } from "./CabinScene";

// 3D picture of the environment the setup is building: a generic pressurised
// module, cut open, with a burning sample at the centre.
//
// Illustration, not a simulation. Oxygen and pressure only change a light cue
// (gas dots: density follows pressure, the accent share follows oxygen). The
// flame glow is identical for every input and never implies size, spread or
// outcome. Airflow is drawn as moving arrows and drifting dots; nothing moves
// at 0 cm/s. The scene renders on demand: it animates for a few seconds after a
// change or while the pointer is on it, then stops, and never moves under
// prefers-reduced-motion.
//
// Interaction: drag (or arrow keys) to turn the module, Home to reset. Hovering
// a part names it; selecting it calls onPick with the setup step that edits it.

interface Props extends CabinSceneProps {
  onReady: () => void;
  onFail: () => void;
}

// Parts of the scene a user can select, and the setup step each one edits.
export type Part = "habitat" | "air" | "airflow" | "material";
export const PART_LABEL: Record<Part, string> = {
  habitat: "Habitat",
  air: "Cabin air: oxygen and pressure",
  airflow: "Airflow",
  material: "Burning sample: material",
};
export function stepForPart(part: Part, current: SetupStep): SetupStep {
  if (part === "air") return current === "pressure" ? "pressure" : "oxygen";
  return part;
}

interface SceneApi {
  update: (p: CabinSceneProps) => void;
  turn: (dYaw: number, dPitch: number) => void;
  reset: () => void;
  dispose: () => void;
}

interface SceneCallbacks {
  onContextLost: () => void;
  onHover: (part: Part | null) => void;
  onPick: (part: Part) => void;
}

export default function CabinScene3D({ atmosphere, material, step, onPick, onReady, onFail }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const { oxygen_pct, pressure_kpa, flow_cm_s } = atmosphere;

  const current = useEffectEvent((): CabinSceneProps => ({
    atmosphere: { oxygen_pct, pressure_kpa, flow_cm_s },
    material,
    step,
  }));
  const ready = useEffectEvent(() => onReady());
  const fail = useEffectEvent(() => onFail());
  const [hovered, setHovered] = useState<Part | null>(null);
  const hover = useEffectEvent((part: Part | null) => setHovered(onPick ? part : null));
  const pick = useEffectEvent((part: Part) => onPick?.(stepForPart(part, step)));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let api: SceneApi;
    try {
      api = createCabin(host, {
        onContextLost: () => fail(),
        onHover: (part) => hover(part),
        onPick: (part) => pick(part),
      });
    } catch {
      fail();
      return;
    }
    apiRef.current = api;
    api.update(current());
    ready();
    return () => {
      apiRef.current = null;
      api.dispose();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.update({ atmosphere: { oxygen_pct, pressure_kpa, flow_cm_s }, material, step });
  }, [oxygen_pct, pressure_kpa, flow_cm_s, material, step]);

  // Keyboard: arrow keys turn the module, Home resets the view.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const api = apiRef.current;
    if (!api) return;
    const keys: Record<string, [number, number]> = {
      ArrowLeft: [-0.12, 0],
      ArrowRight: [0.12, 0],
      ArrowUp: [0, -0.06],
      ArrowDown: [0, 0.06],
    };
    if (keys[e.key]) {
      e.preventDefault();
      api.turn(...keys[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      api.reset();
    }
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-md"
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-roledescription="3D illustration"
      aria-label={`${describeScene(atmosphere, material)} Drag or use the arrow keys to turn it; Home resets the view.`}
    >
      <div ref={hostRef} className="absolute inset-0" />
      {flow_cm_s === 0 && (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
          Still air
        </span>
      )}
      {hovered && (
        <span className="pointer-events-none absolute top-1 left-1 rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-accent shadow-sm">
          {PART_LABEL[hovered]}: select to edit
        </span>
      )}
      <button
        type="button"
        onClick={() => apiRef.current?.reset()}
        className="absolute right-1 bottom-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2 hover:text-ink"
      >
        Reset view
      </button>
    </div>
  );
}

// ---------- scene ----------

// Module geometry in scene units (about metres, simplified).
const R = 1; // hull radius
const L = 3.4; // hull length
const AISLE = 0.52; // half-width of the square aisle
const DEPTH = 0.34; // rack depth
const SPAN = 0.42; // half-span of a rack face across the aisle wall
const BAYS = 5;
const BAY_W = 0.6;
const bayX = (i: number) => (i - (BAYS - 1) / 2) * (BAY_W + 0.04);
const DOTS_MAX = 220;
const FLOW_MAX = 50; // cm/s, top of the setup's range
const VIEW_DIR = new Vector3(0.34, 0.4, 1).normalize();
// The hull keeps the deck and back wall; the front and overhead are cut away to show the inside.
const HULL_FROM = 1.31;
const HULL_SWEEP = 2.75;

function createCabin(host: HTMLDivElement, callbacks: SceneCallbacks): SceneApi {
  const { onContextLost } = callbacks;
  const css = getComputedStyle(host);
  const token = (name: string, fallback: string) => {
    const v = css.getPropertyValue(name).trim();
    return /^#[0-9a-f]{3,8}$/i.test(v) ? v : fallback;
  };
  const C = {
    accent: token("--color-accent", "#0a6e96"),
    ink2: token("--color-ink-2", "#40506a"),
    muted: token("--color-muted", "#5a6880"),
    flameInner: token("--flame-micro-inner", "#7dbfdb"),
    flameRing: token("--flame-micro-ring", "#1d9bd1"),
  };

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  const world = new Group();
  scene.add(world);
  scene.add(new HemisphereLight(0xffffff, 0xc5cfdc, 2.4));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 4, 5);
  scene.add(sun);

  const textures: Texture[] = [];
  const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    if (g) draw(g);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    textures.push(t);
    return t;
  };

  const lineMat = new LineBasicMaterial({ color: C.ink2, transparent: true, opacity: 0.28 });
  const outline = (geo: BufferGeometry, mat: Material = lineMat) => new LineSegments(new EdgesGeometry(geo, 25), mat);

  // ----- hull: a cylinder, cut open, with flat bulkheads and hatches -----
  const hullMat = new MeshLambertMaterial({ color: 0xeef2f7, side: DoubleSide });
  const hullGeo = new CylinderGeometry(R, R, L, 64, 1, true, HULL_FROM, HULL_SWEEP);
  hullGeo.rotateZ(-Math.PI / 2);
  world.add(new Mesh(hullGeo, hullMat));
  const rimMat = new LineBasicMaterial({ color: C.ink2, transparent: true, opacity: 0.45 });
  for (const theta of [HULL_FROM, HULL_FROM + HULL_SWEEP]) {
    const y = -R * Math.sin(theta);
    const z = R * Math.cos(theta);
    const g = new BufferGeometry().setFromPoints([new Vector3(-L / 2, y, z), new Vector3(L / 2, y, z)]);
    world.add(new LineSegments(g, rimMat));
  }
  const bulkMat = new MeshLambertMaterial({ color: 0xe2e8f0, side: DoubleSide });
  const hatch = new Path();
  const s = 0.36;
  const r = 0.1;
  hatch.moveTo(-s + r, -s);
  hatch.lineTo(s - r, -s);
  hatch.quadraticCurveTo(s, -s, s, -s + r);
  hatch.lineTo(s, s - r);
  hatch.quadraticCurveTo(s, s, s - r, s);
  hatch.lineTo(-s + r, s);
  hatch.quadraticCurveTo(-s, s, -s, s - r);
  hatch.lineTo(-s, -s + r);
  hatch.quadraticCurveTo(-s, -s, -s + r, -s);
  const bulkShape = new Shape();
  bulkShape.absarc(0, 0, R, 0, Math.PI * 2, false);
  bulkShape.holes.push(hatch);
  const bulkGeo = new ShapeGeometry(bulkShape, 32);
  for (const side of [-1, 1]) {
    const b = new Mesh(bulkGeo, bulkMat);
    b.rotation.y = Math.PI / 2;
    b.position.x = (side * L) / 2;
    world.add(b);
    const e = outline(bulkGeo, rimMat);
    e.rotation.y = Math.PI / 2;
    e.position.x = (side * L) / 2;
    world.add(e);
  }

  // ----- racks on the back wall and deck; the front and overhead are cut away -----
  const rackFace = (seed: number) =>
    canvasTexture(128, 180, (g) => {
      let n = seed * 977 + 13;
      const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
      g.fillStyle = "#e4e9f0";
      g.fillRect(0, 0, 128, 180);
      let y = 8;
      while (y < 160) {
        const h = 20 + Math.floor(rnd() * 34);
        if (y + h > 172) break;
        const k = rnd();
        g.fillStyle = k < 0.2 ? "#7f8ea3" : k < 0.45 ? "#cfd7e2" : k < 0.75 ? "#f4f6f9" : "#b5c1d0";
        g.fillRect(8, y, 112, h - 4);
        g.fillStyle = "rgba(15,27,45,0.18)";
        g.fillRect(8, y + h - 5, 112, 1);
        for (let i = 0; i < 3; i++) {
          if (rnd() < 0.5) continue;
          g.fillStyle = rnd() < 0.35 ? C.accent : "#ffffff";
          g.fillRect(14 + rnd() * 80, y + 4 + rnd() * (h - 14), 10 + rnd() * 18, 4);
        }
        y += h;
      }
      g.fillStyle = "#c3cbd6";
      g.fillRect(0, 0, 4, 180);
      g.fillRect(124, 0, 4, 180);
    });
  const faces = [0, 1, 2, 3].map((v) => new MeshLambertMaterial({ map: rackFace(v) }));
  const rackSide = new MeshLambertMaterial({ color: 0xd3dae4 });
  const wallGeo = new BoxGeometry(BAY_W, SPAN * 2, DEPTH);
  const flatGeo = new BoxGeometry(BAY_W, DEPTH, SPAN * 2);
  const wallEdges = new EdgesGeometry(wallGeo);
  const flatEdges = new EdgesGeometry(flatGeo);
  const rows: { geo: BoxGeometry; edges: EdgesGeometry; pos: (x: number) => [number, number, number]; face: number }[] = [
    { geo: wallGeo, edges: wallEdges, pos: (x) => [x, 0, -(AISLE + DEPTH / 2)], face: 4 },
    { geo: flatGeo, edges: flatEdges, pos: (x) => [x, -(AISLE + DEPTH / 2), 0], face: 2 },
  ];
  rows.forEach((row, ri) => {
    for (let i = 0; i < BAYS; i++) {
      const mats: Material[] = Array(6).fill(rackSide);
      mats[row.face] = faces[(i * 3 + ri) % faces.length];
      const m = new Mesh(row.geo, mats);
      m.position.set(...row.pos(bayX(i)));
      world.add(m);
      const e = new LineSegments(row.edges, lineMat);
      e.position.copy(m.position);
      world.add(e);
    }
  });
  // Light strip along the upper back corner.
  const lampMat = new MeshBasicMaterial({ color: 0xffffff });
  const lamp = new Mesh(new BoxGeometry(L - 0.5, 0.025, 0.06), lampMat);
  lamp.position.set(0, AISLE - 0.005, -(SPAN + 0.06)); // back corner; the front one is cut away
  world.add(lamp);

  // ----- the cabin air: highlighted on the oxygen and pressure steps -----
  const airGeo = new BoxGeometry(L - 0.3, AISLE * 2, AISLE * 2);
  const airMat = new MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.08, depthWrite: false });
  const air = new Mesh(airGeo, airMat);
  const airEdgeMat = new LineBasicMaterial({ color: C.accent, transparent: true, opacity: 0.55 });
  const airEdges = outline(airGeo, airEdgeMat);
  air.add(airEdges);
  air.renderOrder = 1;
  world.add(air);

  // Invisible pick volumes: selection works even where the visible part is thin or hidden.
  const pickMat = new MeshBasicMaterial({ visible: false });
  const pickables: { obj: Object3D; part: Part; enabled: () => boolean }[] = [];
  const airPick = new Mesh(airGeo, pickMat);
  world.add(airPick);

  // Gas dots: density follows pressure, the accent share follows oxygen.
  const dotTex = canvasTexture(32, 32, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(16, 16, 14, 0, Math.PI * 2);
    g.fill();
  });
  const makeDots = (color: string) => {
    const pos = new Float32Array(DOTS_MAX * 3);
    for (let i = 0; i < DOTS_MAX; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (L - 0.4);
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * AISLE * 0.9;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * AISLE * 0.9;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    const mat = new PointsMaterial({ color, size: 3, sizeAttenuation: false, map: dotTex, alphaTest: 0.5, transparent: true });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    world.add(pts);
    return { pts, pos, geo, mat };
  };
  const o2Dots = makeDots(C.accent);
  const gasDots = makeDots(C.muted);

  // Airflow arrows along the module axis, left to right.
  const arrowMat = new MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.6 });
  const shaftGeo = new CylinderGeometry(0.012, 0.012, 1, 8);
  shaftGeo.rotateZ(-Math.PI / 2);
  shaftGeo.translate(-0.5, 0, 0);
  const headGeo = new ConeGeometry(0.035, 0.09, 12);
  headGeo.rotateZ(-Math.PI / 2);
  const arrowPickGeo = new BoxGeometry(0.55, 0.14, 0.14);
  const lanes: [number, number][] = [
    [0.3, 0.22],
    [-0.3, 0.26],
    [0.08, -0.3],
    [-0.28, -0.2],
    [0.34, -0.12],
    [-0.06, 0.36],
  ];
  const arrows = lanes.map(([y, z], i) => {
    const g = new Group();
    const shaft = new Mesh(shaftGeo, arrowMat);
    const grab = new Mesh(arrowPickGeo, pickMat);
    grab.position.x = -0.2;
    g.add(shaft, new Mesh(headGeo, arrowMat), grab);
    g.position.set(-L / 2 + 0.4 + ((i * 0.53) % 1) * (L - 0.8), y, z);
    world.add(g);
    return { g, shaft };
  });

  // ----- sample and flame glow (identical for every input) -----
  const sampleRoot = new Group();
  world.add(sampleRoot);
  const sampleMat = new MeshLambertMaterial({ color: 0xffffff, emissive: new Color(C.accent), emissiveIntensity: 0, side: DoubleSide });
  const sampleLine = new LineBasicMaterial({ color: C.ink2, transparent: true, opacity: 0.7 });
  const sampleDash = new LineDashedMaterial({ color: C.ink2, dashSize: 0.02, gapSize: 0.014, transparent: true, opacity: 0.85 });
  const holderMat = new MeshLambertMaterial({ color: 0x8a97aa });
  let sampleGeos: BufferGeometry[] = [];

  const flameTex = canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const inner = new Color(C.flameInner);
    const ring = new Color(C.flameRing);
    const rgba = (c: Color, a: number) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
    grad.addColorStop(0, rgba(inner, 0.25));
    grad.addColorStop(0.65, rgba(ring, 0.85));
    grad.addColorStop(1, rgba(ring, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });
  const flame = new Sprite(new SpriteMaterial({ map: flameTex, depthWrite: false, transparent: true }));
  flame.scale.setScalar(0.56);
  flame.renderOrder = 3;
  world.add(flame);
  const ringTex = canvasTexture(128, 128, (g) => {
    g.strokeStyle = C.accent;
    g.lineWidth = 6;
    g.setLineDash([14, 10]);
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.stroke();
  });
  const ring = new Sprite(new SpriteMaterial({ map: ringTex, depthWrite: false, transparent: true }));
  ring.scale.setScalar(0.74);
  ring.renderOrder = 4;
  world.add(ring);
  const samplePick = new Mesh(new SphereGeometry(0.22, 12, 8), pickMat);
  world.add(samplePick);

  let currentMaterial: CabinSceneProps["material"] | null = null;
  const buildSample = (m: CabinSceneProps["material"]) => {
    sampleRoot.clear();
    sampleGeos.forEach((g) => g.dispose());
    sampleGeos = [];
    const keep = <T extends BufferGeometry>(g: T) => {
      sampleGeos.push(g);
      return g;
    };
    const holder = (from: number, to: number) => {
      const g = keep(new CylinderGeometry(0.006, 0.006, Math.abs(to - from), 6));
      g.rotateX(Math.PI / 2);
      const rod = new Mesh(g, holderMat);
      rod.position.z = (from + to) / 2;
      sampleRoot.add(rod);
    };
    let flameAt = new Vector3(0, 0, 0);
    if (m === "fabric") {
      const g = keep(new PlaneGeometry(0.2, 0.26, 6, 10));
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, 0.018 * Math.sin(p.getY(i) * 26));
      g.computeVertexNormals();
      sampleRoot.add(new Mesh(g, sampleMat), new LineSegments(keep(new EdgesGeometry(g, 60)), sampleLine));
      holder(-AISLE, -0.02);
    } else if (m === "plastic") {
      const g = keep(new BoxGeometry(0.16, 0.24, 0.045));
      sampleRoot.add(new Mesh(g, sampleMat), new LineSegments(keep(new EdgesGeometry(g)), sampleLine));
      holder(-AISLE, -0.023);
    } else if (m === "liquid") {
      sampleRoot.add(new Mesh(keep(new SphereGeometry(0.04, 20, 14)), sampleMat));
      const fibre = keep(new CylinderGeometry(0.0045, 0.0045, 0.7, 6));
      fibre.rotateZ(Math.PI / 2);
      sampleRoot.add(new Mesh(fibre, holderMat));
    } else if (m === "gas") {
      // Burner tube rising from the deck; the flame sits at the nozzle.
      const tube = keep(new CylinderGeometry(0.03, 0.03, AISLE - 0.06, 16));
      const t = new Mesh(tube, holderMat);
      t.position.y = -(AISLE + 0.06) / 2;
      const nozzle = new Mesh(keep(new TorusGeometry(0.032, 0.009, 8, 20)), holderMat);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.y = -0.06;
      sampleRoot.add(t, nozzle, new LineSegments(keep(new EdgesGeometry(tube, 40)), sampleLine).translateY(-(AISLE + 0.06) / 2));
      flameAt = new Vector3(0, 0.04, 0);
    } else {
      const g = keep(new BoxGeometry(0.14, 0.14, 0.14));
      const edges = new LineSegments(keep(new EdgesGeometry(g)), m === "any" ? sampleDash : sampleLine);
      edges.computeLineDistances();
      sampleRoot.add(new Mesh(g, sampleMat), edges);
      holder(-AISLE, -0.07);
    }
    flame.position.copy(flameAt);
    ring.position.copy(flameAt);
    samplePick.position.copy(flameAt);
  };

  // A soft shadow disc on the deck under the sample anchors it in space.
  const shadow = new Mesh(new CircleGeometry(0.16, 24), new MeshBasicMaterial({ color: C.ink2, transparent: true, opacity: 0.08, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -AISLE + 0.004;
  world.add(shadow);

  // Priority order: the first part hit in this list wins.
  pickables.push({ obj: samplePick, part: "material", enabled: () => true });
  arrows.forEach((a) => pickables.push({ obj: a.g, part: "airflow", enabled: () => a.g.visible }));
  pickables.push({ obj: airPick, part: "air", enabled: () => true });
  world.children.forEach((o) => {
    const isHull = (o as Mesh).isMesh && o !== airPick && o !== samplePick && o !== air && o !== shadow;
    if (isHull) pickables.push({ obj: o, part: "habitat", enabled: () => true });
  });
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const pickAt = (clientX: number, clientY: number): Part | null => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    world.updateMatrixWorld();
    raycaster.setFromCamera(ndc, camera);
    for (const p of pickables) {
      if (!p.enabled()) continue;
      // The habitat is chosen on its own full-screen step, so the hull is not a target.
      if (raycaster.intersectObject(p.obj, true).length > 0) return p.part === "habitat" ? null : p.part;
    }
    return null;
  };

  // ----- state, sizing and the on-demand render loop -----
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let speed = 0; // scene units per second
  let raf = 0;
  let last = 0;
  let animateUntil = 0;
  let dragging = false;
  let yaw = 0;
  let pitch = 0;
  let px = 0;
  let py = 0;
  let downX = 0;
  let downY = 0;
  let hoverPart: Part | null = null;

  const render = () => renderer.render(scene, camera);
  const fit = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vf = (camera.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const dist = Math.max(1.12 / Math.tan(vf / 2), 2.08 / Math.tan(hf / 2)) + 0.65;
    camera.position.copy(VIEW_DIR).multiplyScalar(dist);
    camera.lookAt(0, -0.1, 0);
    camera.updateProjectionMatrix();
    render();
  };

  const wrap = (x: number, min: number, max: number) => (x > max ? min + (x - max) : x);
  const advance = (dt: number) => {
    if (speed === 0) return;
    const d = speed * dt;
    for (const dots of [o2Dots, gasDots]) {
      for (let i = 0; i < DOTS_MAX; i++) dots.pos[i * 3] = wrap(dots.pos[i * 3] + d, -(L - 0.4) / 2, (L - 0.4) / 2);
      dots.geo.attributes.position.needsUpdate = true;
    }
    for (const a of arrows) a.g.position.x = wrap(a.g.position.x + d, -L / 2 + 0.25 + a.shaft.scale.x, L / 2 - 0.2);
  };
  const frame = (now: number) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!reduced.matches) advance(dt);
    world.rotation.set(pitch, yaw, 0);
    render();
    if (dragging || now < animateUntil) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = (ms: number) => {
    animateUntil = Math.max(animateUntil, performance.now() + (reduced.matches ? 0 : ms));
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const update = ({ atmosphere, material, step }: CabinSceneProps) => {
    const flow = Math.max(0, Math.min(FLOW_MAX, atmosphere.flow_cm_s));
    const o2 = Math.max(0, Math.min(100, atmosphere.oxygen_pct));
    const p = Math.max(30, Math.min(110, atmosphere.pressure_kpa));
    const air_ = step === "oxygen" || step === "pressure";
    const flowStep = step === "airflow";
    const sampleStep = step === "material";

    speed = flow * 0.03;
    const shown = flow === 0 ? 0 : Math.min(arrows.length, 1 + Math.round(flow / 10));
    arrows.forEach((a, i) => {
      a.g.visible = i < shown;
      a.shaft.scale.x = 0.22 + 0.33 * (flow / FLOW_MAX);
      a.g.scale.set(1, flowStep ? 1.5 : 1, flowStep ? 1.5 : 1);
    });
    arrowMat.opacity = flowStep ? 1 : 0.55;

    const total = Math.round(50 + ((p - 30) / 80) * (DOTS_MAX - 50));
    const o2Count = Math.round((total * o2) / 100);
    o2Dots.geo.setDrawRange(0, o2Count);
    gasDots.geo.setDrawRange(0, total - o2Count);
    o2Dots.mat.size = air_ ? 4 : 3;
    gasDots.mat.size = air_ ? 3.4 : 2.6;
    gasDots.mat.opacity = air_ ? 0.75 : 0.45;
    air.visible = air_;

    if (material !== currentMaterial) {
      buildSample(material);
      currentMaterial = material;
    }
    sampleMat.emissiveIntensity = sampleStep ? 0.35 : 0;
    sampleLine.color.set(sampleStep ? C.accent : C.ink2);
    sampleDash.color.set(sampleStep ? C.accent : C.ink2);
    ring.visible = sampleStep;

    hullMat.emissive.set(step === "habitat" ? C.accent : 0x000000);
    hullMat.emissiveIntensity = step === "habitat" ? 0.12 : 0;
    rimMat.color.set(step === "habitat" ? C.accent : C.ink2);
    rimMat.opacity = step === "habitat" ? 0.9 : 0.45;

    kick(speed > 0 ? 6000 : 0);
  };

  // Drag to turn the module a little; vertical drags still scroll the page.
  const onDown = (e: PointerEvent) => {
    dragging = true;
    px = downX = e.clientX;
    py = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
    kick(0);
  };
  const onMove = (e: PointerEvent) => {
    if (dragging) {
      yaw = Math.max(-0.7, Math.min(0.7, yaw + (e.clientX - px) * 0.008));
      pitch = Math.max(-0.25, Math.min(0.3, pitch + (e.clientY - py) * 0.004));
      px = e.clientX;
      py = e.clientY;
    } else {
      const part = pickAt(e.clientX, e.clientY);
      if (part !== hoverPart) {
        hoverPart = part;
        canvas.style.cursor = part ? "pointer" : "grab";
        callbacks.onHover(part);
      }
    }
    if (speed > 0) kick(2500);
  };
  const onLeave = () => {
    if (hoverPart) {
      hoverPart = null;
      callbacks.onHover(null);
    }
  };
  const onUp = (e: PointerEvent) => {
    const wasClick = dragging && Math.hypot(e.clientX - downX, e.clientY - downY) < 5;
    dragging = false;
    canvas.style.cursor = hoverPart ? "pointer" : "grab";
    if (wasClick && e.type === "pointerup") {
      const part = pickAt(e.clientX, e.clientY);
      if (part) callbacks.onPick(part);
    }
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    kick(speed > 0 ? 2500 : 0);
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    onContextLost();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("webglcontextlost", onLost);
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  fit();

  const dispose = () => {
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("webglcontextlost", onLost);
    const mats = new Set<Material>();
    scene.traverse((o: Object3D) => {
      const m = o as Partial<Mesh>;
      m.geometry?.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((x) => mats.add(x));
      else if (mat) mats.add(mat);
    });
    mats.forEach((m) => m.dispose());
    sampleGeos.forEach((g) => g.dispose());
    textures.forEach((t) => t.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };

  const turn = (dYaw: number, dPitch: number) => {
    yaw = Math.max(-0.7, Math.min(0.7, yaw + dYaw));
    pitch = Math.max(-0.25, Math.min(0.3, pitch + dPitch));
    kick(0);
  };
  const reset = () => {
    yaw = 0;
    pitch = 0;
    kick(0);
  };

  return { update, turn, reset, dispose };
}
