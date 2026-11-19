import * as THREE from 'three';
import { boxAt, type Batch } from '../engine/geom';
import type { Pt, Stair } from '../engine/types';
import { along, box, cyl, tube } from './shapes';

/**
 * What a club is built out of besides its walls: rails, truss, open steel stairs, doors that
 * stand open. All in a stage's coordinates, [x, z] on the floor, y up.
 */

/** A handrail on balusters along a line of points, standing on `level`. */
export function railing(batch: Batch, steel: THREE.Material, pts: Pt[], level: number, height = 1.1, every = 0.14) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    batch.add(steel, along(a, b, 0.05, level + height - 0.05, level + height));
    batch.add(steel, along(a, b, 0.03, level + 0.08, level + 0.11));
    const n = Math.max(1, Math.round(len / every));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n;
      const z = a[1] + ((b[1] - a[1]) * k) / n;
      const post = k % 8 === 0 || k === n;
      const w = post ? 0.02 : 0.006;
      batch.add(steel, box(x - w, z - w, x + w, z + w, level, level + height - 0.05));
    }
  }
}

/** A square truss standing upright at x, z, from y0 to y1. */
export function trussLeg(batch: Batch, mat: THREE.Material, x: number, z: number, y0: number, y1: number, half = 0.14) {
  for (const dx of [-half, half]) for (const dz of [-half, half]) batch.add(mat, cyl(x + dx, z - dz, 0.022, y0, y1, 6));
  const n = Math.max(1, Math.round((y1 - y0) / 0.4));
  const V = (vx: number, vy: number, vz: number) => new THREE.Vector3(vx, vy, vz);
  for (let k = 0; k < n; k++) {
    const ya = y0 + ((y1 - y0) * k) / n;
    const yb = y0 + ((y1 - y0) * (k + 1)) / n;
    const s = k % 2 ? 1 : -1;
    batch.add(mat, tube(V(x - half * s, ya, z + half), V(x + half * s, yb, z + half), 0.011, 4));
    batch.add(mat, tube(V(x - half * s, ya, z - half), V(x + half * s, yb, z - half), 0.011, 4));
    batch.add(mat, tube(V(x - half, ya, z + half * s), V(x - half, yb, z - half * s), 0.011, 4));
    batch.add(mat, tube(V(x + half, ya, z + half * s), V(x + half, yb, z - half * s), 0.011, 4));
  }
}

/** A square truss lying level between two points, at height y. */
export function trussRun(batch: Batch, mat: THREE.Material, a: Pt, b: Pt, y: number, half = 0.14) {
  const d = new THREE.Vector2(b[0] - a[0], b[1] - a[1]);
  const len = d.length();
  d.normalize();
  const nx = d.y * half;
  const nz = -d.x * half;
  const V = (vx: number, vy: number, vz: number) => new THREE.Vector3(vx, vy, vz);
  for (const s of [-1, 1]) for (const dy of [-half, half]) batch.add(mat, tube(V(a[0] + nx * s, y + dy, a[1] + nz * s), V(b[0] + nx * s, y + dy, b[1] + nz * s), 0.022, 6));
  const n = Math.max(1, Math.round(len / 0.45));
  for (let k = 0; k < n; k++) {
    const p = (t: number): Pt => [a[0] + d.x * len * t, a[1] + d.y * len * t];
    const p0 = p(k / n);
    const p1 = p((k + 1) / n);
    const s = k % 2 ? 1 : -1;
    for (const side of [-1, 1]) batch.add(mat, tube(V(p0[0] + nx * side, y - half * s, p0[1] + nz * side), V(p1[0] + nx * side, y + half * s, p1[1] + nz * side), 0.011, 4));
    for (const dy of [-half, half]) batch.add(mat, tube(V(p0[0] - nx * s, y + dy, p0[1] - nz * s), V(p1[0] + nx * s, y + dy, p1[1] + nz * s), 0.011, 4));
  }
}

/**
 * A steel stair with open treads, drawn from one of the plan's flights: two stringers, the
 * treads between them, and a handrail on posts along each side that is asked for.
 */
export function openStair(batch: Batch, mats: { tread: THREE.Material; steel: THREE.Material }, s: Stair, rails: { left?: boolean; right?: boolean } = { left: true, right: true }) {
  const [a, b] = s.line;
  const run = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = (b[0] - a[0]) / run;
  const dz = (b[1] - a[1]) / run;
  let w0 = Infinity;
  let w1 = -Infinity;
  for (const [x, z] of s.area as Pt[]) {
    const w = -(x - a[0]) * dz + (z - a[1]) * dx;
    w0 = Math.min(w0, w);
    w1 = Math.max(w1, w);
  }
  const rise = s.y[1] - s.y[0];
  const steps = Math.max(1, Math.round(Math.abs(rise) / 0.18));
  // x along the flight on the ground, y up, z across it
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz, 0, dx));
  m.setPosition(a[0], 0, a[1]);
  for (let i = 0; i < steps; i++) {
    const top = s.y[0] + (rise * (i + 1)) / steps;
    batch.add(mats.tread, boxAt((run * i) / steps, top - 0.04, w0 + 0.05, (run * (i + 1)) / steps + 0.02, top, w1 - 0.05, 1), m);
  }
  const slope = Math.atan2(rise, run);
  const len = Math.hypot(rise, run);
  const tilt = new THREE.Matrix4().makeRotationZ(slope);
  for (const [w, wanted] of [
    [w0, rails.left],
    [w1, rails.right],
  ] as [number, boolean | undefined][]) {
    const side = new THREE.Matrix4().makeTranslation(0, s.y[0], w).multiply(tilt);
    batch.add(mats.steel, boxAt(0, -0.22, -0.03, len, 0.04, 0.03, 1), m.clone().multiply(side));
    if (!wanted) continue;
    batch.add(mats.steel, boxAt(0, 0.98, -0.025, len, 1.03, 0.025, 1), m.clone().multiply(side));
    batch.add(mats.steel, boxAt(0, 0.5, -0.012, len, 0.53, 0.012, 1), m.clone().multiply(side));
    const posts = Math.max(2, Math.round(run / 0.9) + 1);
    for (let k = 0; k < posts; k++) {
      const t = k / (posts - 1);
      const y = s.y[0] + rise * t;
      batch.add(mats.steel, boxAt(run * t - 0.02, y, w - 0.02, run * t + 0.02, y + 1 / Math.cos(slope) - 0.02, w + 0.02, 1), m);
    }
  }
}

/** The two leaves of a double door standing open, flat against the wall either side of it. `a` to `b` is the opening; `out` says which side of that line the leaves lie on. */
export function openLeaves(batch: Batch, mat: THREE.Material, a: Pt, b: Pt, out: 1 | -1, y0: number, height: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const n: Pt = [d[1] * out * 0.05, -d[0] * out * 0.05];
  const leaf = len / 2 - 0.03;
  batch.add(mat, along([a[0] + n[0] - d[0] * leaf, a[1] + n[1] - d[1] * leaf], [a[0] + n[0], a[1] + n[1]], 0.045, y0, y0 + height));
  batch.add(mat, along([b[0] + n[0], b[1] + n[1]], [b[0] + n[0] + d[0] * leaf, b[1] + n[1] + d[1] * leaf], 0.045, y0, y0 + height));
}

/** A line of crowd barriers (the steel kind a queue stands between), from a to b, standing on y. */
export function barrierLine(batch: Batch, steel: THREE.Material, a: Pt, b: Pt, y: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(len / 2.3));
  for (let k = 0; k < n; k++) {
    const p0: Pt = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
    const p1: Pt = [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n];
    const g = 0.04;
    const dx = (p1[0] - p0[0]) / len * n;
    const dz = (p1[1] - p0[1]) / len * n;
    const q0: Pt = [p0[0] + dx * g, p0[1] + dz * g];
    const q1: Pt = [p1[0] - dx * g, p1[1] - dz * g];
    batch.add(steel, along(q0, q1, 0.035, y + 1.02, y + 1.06));
    batch.add(steel, along(q0, q1, 0.03, y + 0.12, y + 0.15));
    for (const [x, z] of [q0, q1]) batch.add(steel, cyl(x, z, 0.02, y + 0.05, y + 1.06, 6));
    const bars = Math.round(Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) / 0.12);
    for (let j = 1; j < bars; j++) {
      const t = j / bars;
      batch.add(steel, cyl(q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t, 0.007, y + 0.15, y + 1.02, 4));
    }
    // feet
    const fx = -dz * 0.3;
    const fz = dx * 0.3;
    for (const [x, z] of [q0, q1]) batch.add(steel, along([x - fx, z - fz], [x + fx, z + fz], 0.04, y, y + 0.05));
  }
}
