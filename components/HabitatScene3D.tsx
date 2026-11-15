"use client";

/**
 * Exploration-atmosphere habitat: a fully 3D Mars surface base (geodesic glass
 * dome over connected modules) shown when the setup is on the
 * "Exploration atmosphere" preset (34 % O2, 56.5 kPa).
 *
 * Same props and interaction contract as CabinScene3D (see
 * claude/cabin_3d_contract.md): illustration only, no flame behaviour, no
 * agency insignia, render-on-demand, honours prefers-reduced-motion.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as THREE from "three";

export type SetupStep = "habitat" | "oxygen" | "pressure" | "airflow" | "material" | "review";
export type SampleMaterial = "plastic" | "fabric" | "liquid" | "gas" | "other" | "any";

export interface HabitatSceneProps {
  atmosphere: { oxygen_pct: number; pressure_kpa: number; flow_cm_s: number };
  material: SampleMaterial;
  step: SetupStep;
  onPick?: (step: SetupStep) => void;
  /** Zoom with the plain mouse wheel (enlarged dialog). Otherwise Ctrl/pinch only. */
  wheelZoom?: boolean;
  /** Shows an "Enlarge" button that calls this. */
  onEnlarge?: () => void;
  /** WebGL failed or was lost: the parent should switch to the 2D drawing. */
  onError?: () => void;
  /** Start at the step's view instead of flying in. */
  skipIntro?: boolean;
}

type Part = "habitat" | "air" | "airflow" | "sample";

const PART_NAME: Record<Part, string> = {
  habitat: "Habitat modules",
  air: "Cabin air",
  airflow: "Airflow",
  sample: "Test sample",
};

const MATERIAL_NAME: Record<SampleMaterial, string> = {
  plastic: "plastic slab",
  fabric: "fabric sheet",
  liquid: "fuel droplet",
  gas: "gas burner",
  other: "solid sample",
  any: "generic sample",
};

function partForStep(step: SetupStep): Part | null {
  if (step === "oxygen" || step === "pressure") return "air";
  if (step === "airflow") return "airflow";
  if (step === "material") return "sample";
  if (step === "habitat") return "habitat";
  return null;
}

function stepForPart(part: Part, step: SetupStep): SetupStep {
  if (part === "sample") return "material";
  if (part === "airflow") return "airflow";
  if (part === "air") return step === "pressure" ? "pressure" : "oxygen";
  return "habitat";
}

/* ------------------------------------------------------------------ layout */

const DOME_R = 8;
const BASE_Y = 0.5;
const FLOW_R = 5.4;
const FLOW_Y = 4.1;
const LAB = new THREE.Vector3(3.9, BASE_Y, 3.1);
const LAB_R = 1.4;
const LAB_H = 1.0;

interface View {
  tx: number;
  ty: number;
  tz: number;
  dist: number;
  theta: number;
  phi: number;
}

const WIDE: View = { tx: 0, ty: 2.4, tz: 0, dist: 38, theta: 0.55, phi: 0.3 };
const VIEWS: Record<SetupStep, View> = {
  habitat: WIDE,
  review: WIDE,
  oxygen: { tx: 0, ty: 3.4, tz: 0, dist: 26, theta: 0.35, phi: 0.27 },
  pressure: { tx: 0, ty: 3.4, tz: 0, dist: 26, theta: 0.35, phi: 0.27 },
  airflow: { tx: 0, ty: 3.4, tz: 0, dist: 23, theta: 0.2, phi: 0.62 },
  material: {
    tx: LAB.x,
    ty: LAB.y + LAB_H + 0.4,
    tz: LAB.z,
    dist: 8,
    theta: Math.atan2(LAB.x, LAB.z),
    phi: 0.36,
  },
};
const INTRO: View = { tx: 0, ty: 2, tz: 0, dist: 110, theta: -0.9, phi: 0.78 };
const PHI_MIN = 0.06;
const PHI_MAX = 1.25;
const DIST_MIN = 6;
const DIST_MAX = 80;

/* ------------------------------------------------------------------ helpers */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  let s = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    s += amp * vnoise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return s;
}
function groundHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const dunes = (fbm(x * 0.03 + 3, z * 0.03 - 7) - 0.45) * 6 * smoothstep(19, 34, r);
  const bumps = (fbm(x * 0.25, z * 0.25) - 0.5) * 0.4 * smoothstep(18, 23, r);
  const hills = Math.pow(smoothstep(90, 240, r), 1.5) * fbm(x * 0.012 + 11, z * 0.012) * 40;
  return dunes + bumps + hills;
}

/** Struts of a Goldberg (hexagon) dome: the dual of a geodesic sphere, upper half only. */
function geodesicStruts(radius: number, detail: number): [THREE.Vector3, THREE.Vector3][] {
  const ico = new THREE.IcosahedronGeometry(1, detail);
  ico.rotateZ(0.32);
  const p = ico.getAttribute("position");
  const ids = new Map<string, number>();
  const verts: THREE.Vector3[] = [];
  const vid = (i: number) => {
    const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    let id = ids.get(k);
    if (id === undefined) {
      id = verts.length;
      ids.set(k, id);
      verts.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    }
    return id;
  };
  const faces: number[][] = [];
  for (let i = 0; i < p.count; i += 3) faces.push([vid(i), vid(i + 1), vid(i + 2)]);
  ico.dispose();

  const centroid = faces.map((f) =>
    new THREE.Vector3().add(verts[f[0]]).add(verts[f[1]]).add(verts[f[2]]).normalize().multiplyScalar(radius),
  );
  const edgeFaces = new Map<string, number[]>();
  faces.forEach((f, fi) => {
    for (let e = 0; e < 3; e++) {
      const a = f[e];
      const b = f[(e + 1) % 3];
      const k = a < b ? `${a}_${b}` : `${b}_${a}`;
      const arr = edgeFaces.get(k);
      if (arr) arr.push(fi);
      else edgeFaces.set(k, [fi]);
    }
  });

  const out: [THREE.Vector3, THREE.Vector3][] = [];
  edgeFaces.forEach((fs) => {
    if (fs.length !== 2) return;
    let a = centroid[fs[0]].clone();
    let b = centroid[fs[1]].clone();
    if (a.y < 0 && b.y < 0) return;
    if (a.y < 0 || b.y < 0) {
      if (a.y < 0) [a, b] = [b, a];
      const t = a.y / (a.y - b.y);
      b = a.clone().lerp(b, t);
    }
    out.push([a, b]);
  });
  return out;
}

function strutMesh(struts: [THREE.Vector3, THREE.Vector3][], thickness: number, material: THREE.Material) {
  const geo = new THREE.CylinderGeometry(thickness, thickness, 1, 6, 1);
  const mesh = new THREE.InstancedMesh(geo, material, struts.length);
  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const dir = new THREE.Vector3();
  struts.forEach(([a, b], i) => {
    dir.subVectors(b, a);
    const len = dir.length();
    dir.normalize();
    q.setFromUnitVectors(up, dir);
    mid.addVectors(a, b).multiplyScalar(0.5);
    s.set(1, len, 1);
    m.compose(mid, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

function radialTexture(stops: [number, string][]) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Resolves a CSS custom property (any colour syntax the browser knows) to a THREE.Color. */
function cssColor(el: HTMLElement, name: string, fallback: string) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  if (!raw) return new THREE.Color(fallback);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return new THREE.Color(fallback);
  ctx.fillStyle = fallback;
  ctx.fillStyle = raw;
  const v = String(ctx.fillStyle);
  const rgb = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return new THREE.Color(`rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})`);
  if (/^#[0-9a-f]{6}$/i.test(v)) return new THREE.Color(v);
  return new THREE.Color(fallback);
}

/* --------------------------------------------------------------- materials */

interface Mats {
  pod: THREE.MeshStandardMaterial;
  lab: THREE.MeshStandardMaterial;
  platform: THREE.MeshStandardMaterial;
  tunnel: THREE.MeshStandardMaterial;
  seam: THREE.MeshStandardMaterial;
  rim: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  grille: THREE.MeshStandardMaterial;
  strut: THREE.MeshStandardMaterial;
}

function makeMats(): Mats {
  const std = (color: number, metalness: number, roughness: number) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const pod = std(0xeef0f2, 0.25, 0.38);
  return {
    pod,
    lab: pod.clone(),
    platform: std(0x9aa0a6, 0.55, 0.5),
    tunnel: std(0xdfe3e7, 0.35, 0.45),
    seam: std(0x9aa1a8, 0.5, 0.4),
    rim: std(0xd5dadf, 0.65, 0.3),
    dark: std(0x1d2127, 0.2, 0.6),
    grille: std(0x3a4048, 0.4, 0.5),
    strut: std(0xd8dde2, 0.7, 0.32),
  };
}

/* ---------------------------------------------------------------- builders */

function addPort(g: THREE.Group, r: number, h: number, angle: number, m: Mats) {
  const size = Math.min(r * 0.32, h * 0.38);
  const sag = r - Math.sqrt(Math.max(r * r - size * size, 0));
  const p = new THREE.Group();
  const out = r + sag + 0.01;
  p.position.set(Math.sin(angle) * out, h * 0.55, Math.cos(angle) * out);
  p.rotation.y = angle;

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(size * 1.05, size * 1.05, sag + 0.05, 32), m.rim);
  housing.rotation.x = Math.PI / 2;
  housing.position.z = -(sag + 0.05) / 2;
  p.add(housing);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(size, size * 0.13, 10, 40), m.rim);
  p.add(rim);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(size * 0.98, 40), m.dark);
  disc.position.z = 0.005;
  p.add(disc);
  for (let i = -2; i <= 2; i++) {
    const w = size * 1.7 * Math.sqrt(1 - (i / 2.6) ** 2);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, size * 0.07, 0.03), m.grille);
    bar.position.set(0, i * size * 0.32, 0.02);
    p.add(bar);
  }
  g.add(p);
}

interface PodOpts {
  r: number;
  h: number;
  ports?: number[];
  door?: boolean;
  glassCap?: THREE.Material;
  skirt?: number;
  body?: THREE.MeshStandardMaterial;
}

function makePod(o: PodOpts, m: Mats) {
  const g = new THREE.Group();
  const bodyMat = o.body ?? m.pod;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r * 1.02, o.h, 48), bodyMat);
  body.position.y = o.h / 2;
  g.add(body);

  if (o.glassCap) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(o.r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), o.glassCap);
    cap.position.y = o.h;
    cap.renderOrder = 2;
    g.add(cap);
    for (let k = 0; k < 4; k++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(o.r, 0.025, 6, 48, Math.PI), m.rim);
      arc.position.y = o.h;
      arc.rotation.y = (k * Math.PI) / 4;
      g.add(arc);
    }
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(o.r * 0.98, 40),
      new THREE.MeshStandardMaterial({ color: 0xcfd4d8, roughness: 0.7 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = o.h + 0.002;
    g.add(floor);
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(o.r, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
    cap.position.y = o.h;
    g.add(cap);
    for (const lat of [0.42, 0.85]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(o.r * Math.cos(lat) * 1.003, 0.022, 6, 64), m.seam);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = o.h + o.r * Math.sin(lat);
      g.add(ring);
    }
  }

  for (const y of [o.h, o.h * 0.15]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(o.r * 1.006, 0.035, 6, 64), m.seam);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  if (o.skirt) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(o.r * 0.92, o.r * 0.96, o.skirt, 40), m.platform);
    skirt.position.y = -o.skirt / 2;
    g.add(skirt);
  }
  (o.ports ?? []).forEach((a) => addPort(g, o.r, o.h, a, m));

  if (o.door) {
    const sag = o.r - Math.sqrt(o.r * o.r - 0.3);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.32, 0.12 + sag), m.rim);
    frame.position.set(0, 0.68, o.r - sag / 2 + 0.03);
    g.add(frame);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.16, 0.14 + sag), m.dark);
    panel.position.set(0, 0.64, o.r - sag / 2 + 0.04);
    g.add(panel);
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.2, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x9fd6ff, emissive: 0x6fb8ff, emissiveIntensity: 0.6 }),
    );
    win.position.set(0, 0.98, o.r + 0.12);
    g.add(win);
    if (o.skirt) {
      const len = Math.hypot(1.6, o.skirt);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, len), m.platform);
      ramp.rotation.x = Math.atan2(o.skirt, 1.6);
      ramp.position.set(0, -o.skirt / 2, o.r + 0.8);
      g.add(ramp);
    }
  }
  return g;
}

function makeSmallDome(r: number, m: Mats, portAngle: number) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.06, 0.3, 40), m.platform);
  base.position.y = 0.15;
  g.add(base);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), m.pod);
  shell.position.y = 0.3;
  g.add(shell);
  const frame = strutMesh(geodesicStruts(r * 1.012, 2), 0.03, m.seam);
  frame.position.y = 0.3;
  g.add(frame);
  addPort(g, r * 0.98, r * 0.9, portAngle, m);
  return g;
}

function makeTube(a: THREE.Vector3, b: THREE.Vector3, r: number, m: Mats) {
  const g = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 24), m.tunnel);
  tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  tube.position.addVectors(a, b).multiplyScalar(0.5);
  g.add(tube);
  const n = Math.max(2, Math.floor(len / 0.9));
  for (let i = 1; i < n; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(r * 1.04, 0.04, 6, 28), m.seam);
    rib.position.copy(a).lerp(b, i / n);
    rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    g.add(rib);
  }
  return g;
}

function makeRover(m: Mats) {
  const g = new THREE.Group();
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z);
    g.add(b);
  };
  box(2.6, 0.15, 1.0, m.dark, 0, 0.55);
  box(2.4, 0.5, 1.4, m.pod, 0, 0.85);
  box(1.1, 0.6, 1.2, m.pod, 0.5, 1.4);
  box(0.05, 0.34, 1.0, m.dark, 1.06, 1.45);
  for (const x of [-0.9, 0, 0.9])
    for (const z of [-0.82, 0.82]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.32, 18), m.dark);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.38, z);
      g.add(w);
    }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), m.rim);
  mast.position.set(-0.8, 1.55, 0.3);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3), m.rim);
  dish.position.set(-0.8, 2.0, 0.3);
  dish.rotation.z = 0.9;
  g.add(dish);
  return g;
}

function makeCrewMember(m: Mats) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 4, 10), m.pod);
  body.position.y = 0.55;
  g.add(body);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), m.pod);
  helmet.position.y = 1.02;
  g.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 10, -0.9, 1.8, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 0.9, roughness: 0.15 }),
  );
  visor.position.set(0, 1.02, 0.06);
  g.add(visor);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), m.rim);
  pack.position.set(0, 0.7, -0.19);
  g.add(pack);
  return g;
}

function makeSolarArray(m: Mats) {
  const g = new THREE.Group();
  const cell = new THREE.MeshStandardMaterial({ color: 0x1b2a44, metalness: 0.6, roughness: 0.25 });
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.9), cell);
      panel.position.set(col * 1.8, 0.9, row * 1.6);
      panel.rotation.x = -0.5;
      g.add(panel);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), m.platform);
      post.position.set(col * 1.8, 0.45, row * 1.6);
      g.add(post);
    }
  return g;
}

/** The test sample form, sitting in the lab module. Static: no flame size or spread. */
function makeSample(material: SampleMaterial, glowMap: THREE.Texture, glowColor: THREE.Color) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8bec5, metalness: 0.85, roughness: 0.25 });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 28), metal);
  pedestal.position.y = 0.06;
  g.add(pedestal);
  let glowAt = new THREE.Vector3(0, 0.4, 0);
  let glowSize = 0.42;

  if (material === "fabric") {
    const geo = new THREE.PlaneGeometry(0.62, 0.42, 12, 8);
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 14) * 0.025);
    geo.computeVertexNormals();
    const sheet = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0xe3d3b4, roughness: 0.9, side: THREE.DoubleSide }),
    );
    sheet.position.y = 0.52;
    g.add(sheet);
    for (const x of [-0.34, 0.34]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.66, 8), metal);
      post.position.set(x, 0.45, 0);
      g.add(post);
    }
    glowAt = new THREE.Vector3(0, 0.3, 0.02);
  } else if (material === "plastic") {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.1, 0.34),
      new THREE.MeshPhysicalMaterial({ color: 0x6fb7d6, roughness: 0.25, clearcoat: 1 }),
    );
    slab.position.y = 0.17;
    g.add(slab);
    glowAt = new THREE.Vector3(-0.24, 0.27, 0);
  } else if (material === "liquid") {
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), metal);
    needle.position.y = 0.33;
    g.add(needle);
    const drop = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 24, 16),
      new THREE.MeshPhysicalMaterial({ color: 0xf0c75e, roughness: 0.08, clearcoat: 1 }),
    );
    drop.position.y = 0.62;
    g.add(drop);
    glowAt = new THREE.Vector3(0, 0.62, 0);
    glowSize = 0.5;
  } else if (material === "gas") {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.34, 20), metal);
    burner.position.y = 0.29;
    g.add(burner);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 0.08, 16), metal);
    nozzle.position.y = 0.5;
    g.add(nozzle);
    glowAt = new THREE.Vector3(0, 0.6, 0);
  } else if (material === "other") {
    const solid = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.16),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.6 }),
    );
    solid.position.y = 0.28;
    g.add(solid);
    glowAt = new THREE.Vector3(0, 0.46, 0);
  } else {
    const disk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.08, 28),
      new THREE.MeshStandardMaterial({ color: 0xa8aeb6, roughness: 0.55 }),
    );
    disk.position.y = 0.16;
    g.add(disk);
    glowAt = new THREE.Vector3(0, 0.3, 0);
  }

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowMap,
      color: glowColor,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.copy(glowAt);
  glow.scale.setScalar(glowSize);
  glow.renderOrder = 1;
  g.add(glow);
  return g;
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const any = o as THREE.Mesh;
    if (any.geometry) any.geometry.dispose();
    const mat = any.material as THREE.Material | THREE.Material[] | undefined;
    const list = Array.isArray(mat) ? mat : mat ? [mat] : [];
    list.forEach((mm) => {
      const withMap = mm as THREE.Material & { map?: THREE.Texture | null };
      if (withMap.map && !withMap.map.userData.shared) withMap.map.dispose();
      mm.dispose();
    });
  });
}

/* ----------------------------------------------------------------- the API */

interface SceneApi {
  setMaterial: (m: SampleMaterial) => void;
  setFlow: (cmPerS: number) => void;
  setAir: (o2: number, kpa: number) => void;
  setStep: (s: SetupStep) => void;
  resetView: () => void;
  key: (k: string) => boolean;
  dispose: () => void;
}

interface Callbacks {
  onPick: (part: Part) => void;
  onHover: (part: Part | null) => void;
  onDragging: (d: boolean) => void;
  onError: () => void;
  wheelZoom: () => boolean;
}

function createScene(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  init: HabitatSceneProps,
  cb: Callbacks,
): SceneApi {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const accent = cssColor(host, "--color-accent", "#0ea5e9");
  const glowColor = cssColor(host, "--flame-micro-ring", "#60a5fa");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1200);

  /* sky + environment */
  const horizon = new THREE.Color("#d29f78");
  const sunDir = new THREE.Vector3(-30, 26, 24).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uHorizon: { value: horizon },
      uZenith: { value: new THREE.Color("#5e3f2c") },
      uGround: { value: new THREE.Color("#a8693f") },
      uSun: { value: new THREE.Color("#fff0d8") },
      uSunDir: { value: sunDir },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uGround; uniform vec3 uSun; uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.65, d.y));
        col = mix(col, uGround, smoothstep(0.0, -0.25, d.y));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), skyMat);
  sky.frustumCulled = false;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky);
  const envTex = pmrem.fromScene(envScene, 0.04, 1, 1000).texture;
  envScene.remove(sky);
  scene.add(sky);
  scene.environment = envTex;
  scene.environmentIntensity = 0.75;
  scene.fog = new THREE.Fog(horizon, 70, 360);

  scene.add(new THREE.HemisphereLight(0xe8b08a, 0x5a2e1c, 0.55));
  const sun = new THREE.DirectionalLight(0xffe0bd, 2.4);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -26;
  sc.right = 26;
  sc.top = 26;
  sc.bottom = -26;
  sc.near = 1;
  sc.far = 140;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);

  /* ground */
  const groundGeo = new THREE.PlaneGeometry(760, 760, 220, 220);
  groundGeo.rotateX(-Math.PI / 2);
  {
    const pos = groundGeo.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const c1 = new THREE.Color("#a9502b");
    const c2 = new THREE.Color("#d9905e");
    const pad = new THREE.Color("#c98257");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z));
      c.copy(c1).lerp(c2, fbm(x * 0.07 + 5, z * 0.07));
      c.multiplyScalar(0.85 + 0.25 * vnoise(x * 0.9, z * 0.9));
      c.lerp(pad, 0.5 * (1 - smoothstep(10, 20, Math.hypot(x, z))));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }));
  ground.receiveShadow = true;
  scene.add(ground);

  /* rocks */
  {
    const n = 260;
    const rocks = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x7c3b22, roughness: 0.9 }),
      n,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = hash(i, 1.7) * Math.PI * 2;
      const r = 13 + Math.pow(hash(i, 9.1), 1.6) * 110;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const k = 0.12 + Math.pow(hash(i, 3.3), 3) * 1.1;
      s.set(k * (0.8 + hash(i, 4) * 0.6), k * (0.5 + hash(i, 5) * 0.5), k);
      p.set(x, groundHeight(x, z) + s.y * 0.35, z);
      q.setFromEuler(e.set(hash(i, 6) * 3, hash(i, 7) * 3, hash(i, 8) * 3));
      m.compose(p, q, s);
      rocks.setMatrixAt(i, m);
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    scene.add(rocks);
  }

  /* the base */
  const mats = makeMats();
  const habitatRoot = new THREE.Group();
  const decorRoot = new THREE.Group();
  const labRoot = new THREE.Group();
  const flowRoot = new THREE.Group();
  scene.add(habitatRoot, decorRoot, labRoot, flowRoot);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(8.7, 9.0, BASE_Y, 72), mats.platform);
  platform.position.y = BASE_Y / 2;
  habitatRoot.add(platform);
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(DOME_R, 0.16, 8, 96), mats.rim);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = BASE_Y;
  habitatRoot.add(baseRing);

  const domeFrame = strutMesh(geodesicStruts(DOME_R, 4), 0.07, (mats.strut = mats.strut.clone()));
  domeFrame.position.y = BASE_Y;
  decorRoot.add(domeFrame);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_R * 0.995, 72, 28, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.06,
      transparent: true,
      opacity: 0.1,
      envMapIntensity: 2,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glass.position.y = BASE_Y;
  glass.renderOrder = 3;
  decorRoot.add(glass);

  const airMat = new THREE.MeshBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const air = new THREE.Mesh(new THREE.SphereGeometry(DOME_R * 0.97, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), airMat);
  air.position.y = BASE_Y;
  air.renderOrder = 1;
  scene.add(air);

  const pod = (o: PodOpts, x: number, z: number, rotY = 0, root: THREE.Group = habitatRoot) => {
    const g = makePod(o, mats);
    g.position.set(x, BASE_Y, z);
    g.rotation.y = rotY;
    root.add(g);
    return g;
  };
  pod({ r: 2.4, h: 1.2, ports: [0.3, 2.2, 4.2] }, 0, -0.4);
  pod({ r: 1.8, h: 1.3, ports: [0.6, 5.4] }, -4.3, -0.6);
  pod({ r: 1.9, h: 1.3, ports: [0.2, 1.2] }, 4.1, -1.8);
  pod({ r: 2.0, h: 1.1, ports: [3.4] }, -1.6, -4.7);
  pod({ r: 1.5, h: 1.2, ports: [], door: true, skirt: BASE_Y }, 0, 7.9);
  pod({ r: 1.2, h: 1.0, ports: [0.8] }, -3.6, 3.6);

  const labGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    transparent: true,
    opacity: 0.16,
    envMapIntensity: 2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const lab = makePod({ r: LAB_R, h: LAB_H, ports: [Math.PI + 0.9], glassCap: labGlass, body: mats.lab }, mats);
  lab.position.copy(LAB);
  labRoot.add(lab);
  const focusRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.025, 8, 48),
    new THREE.MeshBasicMaterial({ color: accent }),
  );
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(LAB.x, LAB.y + LAB_H + 0.02, LAB.z);
  focusRing.visible = false;
  labRoot.add(focusRing);
  const glowMap = radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.25, "rgba(255,255,255,0.75)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  glowMap.userData.shared = true;
  let sample = makeSample(init.material, glowMap, glowColor);
  sample.position.set(LAB.x, LAB.y + LAB_H, LAB.z);
  labRoot.add(sample);

  /* outer modules + tunnels */
  const outer: [number, number, number, number][] = [
    [-13, -3, 2.6, 1.2],
    [-17.4, 2.6, 1.7, 2.4],
    [13.4, -2, 2.3, -1.2],
    [16.4, 4.2, 1.5, -2.2],
    [-3, -14.5, 2.0, 0.2],
  ];
  outer.forEach(([x, z, r, port]) => {
    const d = makeSmallDome(r, mats, port);
    d.position.set(x, 0, z);
    habitatRoot.add(d);
  });
  const toEdge = (x: number, z: number) => new THREE.Vector3(x, 0, z).normalize().multiplyScalar(8.75);
  const tubeY = 0.72;
  const link = (a: THREE.Vector3, b: THREE.Vector3) => habitatRoot.add(makeTube(a, b, 0.5, mats));
  const at = (x: number, z: number, y = tubeY) => new THREE.Vector3(x, y, z);
  link(toEdge(-13, -3).setY(tubeY), at(-13 + 2.4, -3 + 0.55));
  link(at(-13 - 1.8, -3 + 1.6), at(-17.4 + 1.2, 2.6 - 1.15));
  link(toEdge(13.4, -2).setY(tubeY), at(13.4 - 2.1, -2 + 0.3));
  link(at(13.4 + 1.3, -2 + 1.8), at(16.4 - 0.9, 4.2 - 1.15));
  link(toEdge(-3, -14.5).setY(tubeY), at(-3 + 0.4, -14.5 + 1.85));

  /* decor */
  const rover = makeRover(mats);
  rover.position.set(-8.6, 0, 11.4);
  rover.rotation.y = 0.65;
  decorRoot.add(rover);
  const crew = makeCrewMember(mats);
  crew.position.set(2.1, 0, 10.9);
  crew.rotation.y = -0.4;
  decorRoot.add(crew);
  const solar = makeSolarArray(mats);
  solar.position.set(9, 0, -13);
  solar.rotation.y = -0.5;
  decorRoot.add(solar);
  [
    [-10.2, 6.4, 0.8],
    [-11.1, 7.1, 0.6],
    [-10.6, 7.6, 0.5],
    [10.2, 7.4, 0.7],
    [9.4, 8.2, 0.55],
  ].forEach(([x, z, k], i) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(k * 1.3, k, k), i % 2 ? mats.rim : mats.pod);
    crate.position.set(x, k / 2, z);
    crate.rotation.y = i * 0.7;
    decorRoot.add(crate);
  });

  /* airflow: a circulation loop inside the dome */
  const pathPoint = (a: number, out: THREE.Vector3) =>
    out.set(Math.cos(a) * FLOW_R, BASE_Y + FLOW_Y + Math.sin(a * 2) * 0.45, Math.sin(a) * FLOW_R);
  const ringPts: THREE.Vector3[] = [];
  for (let i = 0; i < 160; i++) ringPts.push(pathPoint((i / 160) * Math.PI * 2, new THREE.Vector3()));
  const ring = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineDashedMaterial({ color: accent, dashSize: 0.35, gapSize: 0.25, transparent: true, opacity: 0.9 }),
  );
  ring.computeLineDistances();
  ring.visible = false;
  flowRoot.add(ring);

  const arrowMat = new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.4 });
  const arrows: THREE.Mesh[] = [];
  const arrowGeo = new THREE.ConeGeometry(0.17, 0.5, 14);
  arrowGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const a = new THREE.Mesh(arrowGeo, arrowMat);
    const t = (i / 10) * Math.PI * 2;
    const p0 = pathPoint(t, new THREE.Vector3());
    const p1 = pathPoint(t + 0.01, new THREE.Vector3());
    a.position.copy(p0);
    a.lookAt(p1);
    a.userData.t = t;
    flowRoot.add(a);
    arrows.push(a);
  }

  const N = 180;
  const pPos = new Float32Array(N * 3);
  const pT = new Float32Array(N);
  const pJ = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    pT[i] = hash(i, 2.2) * Math.PI * 2;
    pJ[i * 2] = (hash(i, 3.1) - 0.5) * 0.9;
    pJ[i * 2 + 1] = (hash(i, 4.7) - 0.5) * 0.7;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const dotMap = radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.5, "rgba(255,255,255,0.6)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  const pMat = new THREE.PointsMaterial({
    color: accent,
    size: 0.2,
    map: dotMap,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const particles = new THREE.Points(pGeo, pMat);
  particles.frustumCulled = false;
  particles.renderOrder = 2;
  flowRoot.add(particles);

  const flowPick = new THREE.Mesh(
    new THREE.TorusGeometry(FLOW_R, 0.75, 8, 64),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  flowPick.rotation.x = Math.PI / 2;
  flowPick.position.y = BASE_Y + FLOW_Y;
  flowRoot.add(flowPick);

  let flow = init.atmosphere.flow_cm_s;
  let phase = 0;
  const tmp = new THREE.Vector3();
  const updateParticles = () => {
    for (let i = 0; i < N; i++) {
      const a = pT[i] + phase;
      pathPoint(a, tmp);
      const rx = Math.cos(a);
      const rz = Math.sin(a);
      pPos[i * 3] = tmp.x + rx * pJ[i * 2];
      pPos[i * 3 + 1] = tmp.y + pJ[i * 2 + 1];
      pPos[i * 3 + 2] = tmp.z + rz * pJ[i * 2];
    }
    pGeo.getAttribute("position").needsUpdate = true;
    arrows.forEach((ar) => {
      const t = (ar.userData.t as number) + phase;
      pathPoint(t, ar.position);
      ar.lookAt(pathPoint(t + 0.01, tmp));
    });
  };

  /* shadows */
  [habitatRoot, decorRoot, labRoot].forEach((root) =>
    root.traverse((o) => {
      const mm = o as THREE.Mesh;
      if (!mm.isMesh) return;
      const mat = mm.material as THREE.Material;
      if (mat.transparent) return;
      mm.castShadow = true;
      mm.receiveShadow = true;
    }),
  );

  /* picking */
  const pickables: THREE.Object3D[] = [];
  const tag = (root: THREE.Object3D, part: Part) =>
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.userData.part = part;
        pickables.push(o);
      }
    });
  tag(habitatRoot, "habitat");
  tag(labRoot, "sample");
  flowPick.userData.part = "airflow";
  pickables.push(flowPick);
  air.userData.part = "air";
  pickables.push(air);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickAt = (clientX: number, clientY: number): Part | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, false);
    let sawAir = false;
    for (const h of hits) {
      const part = h.object.userData.part as Part | undefined;
      if (!part) continue;
      if (part === "air") {
        sawAir = true;
        continue;
      }
      // The habitat is chosen on its own full-screen step, so its modules block
      // the ray but are not a target themselves.
      return part === "habitat" ? null : part;
    }
    return sawAir ? "air" : null;
  };

  /* state + highlight */
  let step = init.step;
  let hovered: Part | null = null;
  let airBase = 0.04;
  const habitatMats = [mats.pod, mats.platform, mats.tunnel];
  const applyHighlight = () => {
    const active = partForStep(step);
    const lvl = (p: Part) => (hovered === p ? 2 : active === p ? 1 : 0);
    const glowLvl = [0, 0.14, 0.3];
    const em = (m: THREE.MeshStandardMaterial, l: number) => {
      m.emissive.copy(accent);
      m.emissiveIntensity = glowLvl[l];
    };
    habitatMats.forEach((m) => em(m, lvl("habitat")));
    em(mats.lab, lvl("sample"));
    focusRing.visible = lvl("sample") > 0;
    airMat.opacity = airBase + [0, 0.05, 0.09][lvl("air")];
    const fl = lvl("airflow");
    arrowMat.emissiveIntensity = 0.4 + [0, 0.35, 0.7][fl];
    ring.visible = fl > 0;
    pMat.opacity = fl > 0 ? 1 : 0.8;
    // Close-up on the sample: fade the dome frame so it does not block the view.
    const close = step === "material";
    mats.strut.transparent = close;
    mats.strut.opacity = close ? 0.16 : 1;
    mats.strut.depthWrite = !close;
    domeFrame.castShadow = !close;
    mats.strut.needsUpdate = true;
    requestRender();
  };

  const setFlowVisuals = () => {
    const on = flow > 0;
    particles.visible = on;
    arrows.forEach((a) => {
      a.visible = on;
      a.scale.setScalar(0.65 + 0.9 * clamp(flow / 50, 0, 1));
    });
    const count = on ? Math.round(40 + (N - 40) * clamp(flow / 50, 0, 1)) : 0;
    pGeo.setDrawRange(0, count);
    updateParticles();
  };

  /* camera rig */
  const cur: View = { ...(init.skipIntro || reduced ? VIEWS[step] : INTRO) };
  const goal: View = { ...VIEWS[step] };
  let dragging = false;
  const applyCamera = () => {
    const cp = Math.cos(cur.phi);
    camera.position.set(
      cur.tx + cur.dist * Math.sin(cur.theta) * cp,
      cur.ty + cur.dist * Math.sin(cur.phi),
      cur.tz + cur.dist * Math.cos(cur.theta) * cp,
    );
    camera.lookAt(cur.tx, cur.ty, cur.tz);
  };
  const keys: (keyof View)[] = ["tx", "ty", "tz", "dist", "theta", "phi"];
  const stepCamera = (dt: number) => {
    const k = reduced ? 1 : 1 - Math.exp(-dt * (dragging ? 16 : 2.6));
    let moving = false;
    for (const key of keys) {
      const d = goal[key] - cur[key];
      const eps = key === "dist" ? 0.002 : 0.0004;
      if (Math.abs(d) > eps) {
        cur[key] += d * k;
        moving = true;
      } else cur[key] = goal[key];
    }
    applyCamera();
    return moving;
  };
  const goTo = (v: View) => {
    goal.tx = v.tx;
    goal.ty = v.ty;
    goal.tz = v.tz;
    goal.dist = v.dist;
    goal.phi = v.phi;
    goal.theta = cur.theta + wrapAngle(v.theta - cur.theta);
    requestRender();
  };

  /* render loop: on demand only */
  let raf = 0;
  let last = performance.now();
  let visible = true;
  let pendingHover: { x: number; y: number } | null = null;
  let disposed = false;
  function requestRender() {
    if (!raf && !disposed) raf = requestAnimationFrame(frame);
  }
  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const moving = stepCamera(dt);
    if (pendingHover) {
      const h = pickAt(pendingHover.x, pendingHover.y);
      pendingHover = null;
      if (h !== hovered) {
        hovered = h;
        cb.onHover(h);
        applyHighlight();
      }
    }
    const animFlow = flow > 0 && !reduced && visible;
    if (animFlow) {
      phase += dt * (0.12 + clamp(flow / 50, 0, 1) * 1.1);
      updateParticles();
    }
    renderer.render(scene, camera);
    if ((moving || animFlow) && visible) requestRender();
  }

  /* sizing + visibility */
  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    requestRender();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && document.visibilityState === "visible";
    if (visible) {
      last = performance.now();
      requestRender();
    }
  });
  io.observe(host);
  const onVis = () => {
    visible = document.visibilityState === "visible";
    if (visible) {
      last = performance.now();
      requestRender();
    }
  };
  document.addEventListener("visibilitychange", onVis);

  /* pointer */
  let down: { x: number; y: number; lx: number; ly: number; id: number } | null = null;
  let moved = false;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, id: e.pointerId };
    moved = false;
  };
  const onMove = (e: PointerEvent) => {
    if (down && e.pointerId === down.id) {
      const dx = e.clientX - down.lx;
      const dy = e.clientY - down.ly;
      down.lx = e.clientX;
      down.ly = e.clientY;
      if (!moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
        moved = true;
        dragging = true;
        cb.onDragging(true);
      }
      if (moved) {
        goal.theta -= dx * 0.0075;
        goal.phi = clamp(goal.phi + dy * 0.006, PHI_MIN, PHI_MAX);
        requestRender();
      }
      return;
    }
    pendingHover = { x: e.clientX, y: e.clientY };
    requestRender();
  };
  const onUp = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (!moved) {
      const part = pickAt(e.clientX, e.clientY);
      if (part) cb.onPick(part);
    }
    down = null;
    if (dragging) {
      dragging = false;
      cb.onDragging(false);
    }
  };
  const onLeave = () => {
    if (hovered) {
      hovered = null;
      cb.onHover(null);
      applyHighlight();
    }
  };
  const onWheel = (e: WheelEvent) => {
    if (!cb.wheelZoom() && !e.ctrlKey) return;
    e.preventDefault();
    goal.dist = clamp(goal.dist * Math.exp(e.deltaY * 0.0012), DIST_MIN, DIST_MAX);
    requestRender();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    cb.onError();
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("webglcontextlost", onLost);

  /* initial state */
  const setAir = (o2: number, kpa: number) => {
    const o2n = clamp((o2 - 10) / 30, 0, 1);
    const pn = clamp((kpa - 30) / 80, 0, 1);
    airBase = 0.02 + 0.03 * o2n + 0.015 * pn;
    applyHighlight();
  };
  setAir(init.atmosphere.oxygen_pct, init.atmosphere.pressure_kpa);
  setFlowVisuals();
  resize();

  return {
    setMaterial(m) {
      labRoot.remove(sample);
      disposeTree(sample);
      sample = makeSample(m, glowMap, glowColor);
      sample.position.set(LAB.x, LAB.y + LAB_H, LAB.z);
      sample.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.userData.part = "sample";
          pickables.push(o);
        }
      });
      labRoot.add(sample);
      for (let i = pickables.length - 1; i >= 0; i--) if (!pickables[i].parent) pickables.splice(i, 1);
      requestRender();
    },
    setFlow(v) {
      flow = Math.max(0, v);
      setFlowVisuals();
      requestRender();
    },
    setAir,
    setStep(s) {
      step = s;
      goTo(VIEWS[s]);
      applyHighlight();
    },
    resetView() {
      goTo(VIEWS[step]);
    },
    key(k) {
      if (k === "ArrowLeft") goal.theta += 0.15;
      else if (k === "ArrowRight") goal.theta -= 0.15;
      else if (k === "ArrowUp") goal.phi = clamp(goal.phi + 0.08, PHI_MIN, PHI_MAX);
      else if (k === "ArrowDown") goal.phi = clamp(goal.phi - 0.08, PHI_MIN, PHI_MAX);
      else if (k === "+" || k === "=") goal.dist = clamp(goal.dist * 0.88, DIST_MIN, DIST_MAX);
      else if (k === "-" || k === "_") goal.dist = clamp(goal.dist / 0.88, DIST_MIN, DIST_MAX);
      else if (k === "Home") goTo(VIEWS[step]);
      else return false;
      requestRender();
      return true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("webglcontextlost", onLost);
      disposeTree(scene);
      glowMap.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

/* --------------------------------------------------------------- component */

const glassChip: React.CSSProperties = {
  background: "color-mix(in srgb, var(--color-surface, #ffffff) 74%, transparent)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid var(--color-line, rgba(15, 23, 42, 0.12))",
  color: "var(--color-ink, #0f172a)",
  borderRadius: 8,
  fontSize: 12,
  lineHeight: 1.3,
};

export default function HabitatScene3D(props: HabitatSceneProps) {
  const { atmosphere, material, step, onPick, wheelZoom, onEnlarge, onError, skipIntro } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const live = useRef({ onPick, onError, step, wheelZoom });
  useEffect(() => {
    live.current = { onPick, onError, step, wheelZoom };
  });
  const [hovered, setHovered] = useState<Part | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    try {
      apiRef.current = createScene(
        canvas,
        host,
        { atmosphere, material, step, skipIntro },
        {
          onPick: (part) => live.current.onPick?.(stepForPart(part, live.current.step)),
          onHover: setHovered,
          onDragging: setDragging,
          onError: () => live.current.onError?.(),
          wheelZoom: () => !!live.current.wheelZoom,
        },
      );
    } catch {
      live.current.onError?.();
      return;
    }
    return () => {
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // Built once; prop changes are pushed through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => apiRef.current?.setMaterial(material), [material]);
  useEffect(() => apiRef.current?.setFlow(atmosphere.flow_cm_s), [atmosphere.flow_cm_s]);
  useEffect(
    () => apiRef.current?.setAir(atmosphere.oxygen_pct, atmosphere.pressure_kpa),
    [atmosphere.oxygen_pct, atmosphere.pressure_kpa],
  );
  useEffect(() => apiRef.current?.setStep(step), [step]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (apiRef.current?.key(e.key)) e.preventDefault();
  };

  const flowText = atmosphere.flow_cm_s > 0 ? `${atmosphere.flow_cm_s} cm/s airflow` : "still air";
  const label = hovered
    ? `${PART_NAME[hovered]}: select to edit`
    : `Exploration habitat, ${atmosphere.oxygen_pct} % O₂, ${atmosphere.pressure_kpa} kPa`;
  const ariaLabel =
    `3D illustration of an exploration habitat on the Martian surface: a geodesic glass dome over ` +
    `connected modules, cabin air at ${atmosphere.oxygen_pct} % oxygen and ${atmosphere.pressure_kpa} kPa, ` +
    `${flowText}, and a ${MATERIAL_NAME[material]} in the glass-topped lab module. ` +
    `Drag or use arrow keys to turn, plus and minus to zoom, Home to reset. Illustration, not a simulation.`;

  return (
    <div
      ref={hostRef}
      tabIndex={0}
      role="group"
      aria-roledescription="3D illustration"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        outlineOffset: -2,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: dragging ? "grabbing" : hovered ? "pointer" : "grab",
        }}
      />
      <div
        aria-hidden
        style={{ ...glassChip, position: "absolute", top: 8, left: 8, padding: "4px 8px", pointerEvents: "none" }}
      >
        {label}
      </div>
      <div
        style={{
          ...glassChip,
          position: "absolute",
          bottom: 8,
          left: 8,
          padding: "3px 7px",
          color: "var(--color-ink-2, #475569)",
          pointerEvents: "none",
        }}
      >
        Illustration, not a simulation.
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => apiRef.current?.key("+")}
          style={{ ...glassChip, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => apiRef.current?.key("-")}
          style={{ ...glassChip, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => apiRef.current?.resetView()}
          style={{ ...glassChip, padding: "3px 8px", cursor: "pointer" }}
        >
          Reset view
        </button>
        {onEnlarge && (
          <button type="button" onClick={onEnlarge} style={{ ...glassChip, padding: "3px 8px", cursor: "pointer" }}>
            Enlarge
          </button>
        )}
      </div>
    </div>
  );
}
