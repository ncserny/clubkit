import * as THREE from 'three';
import { type Batch, boxAt, mergeParts } from './geom';

/** Things most clubs have: steel stairs, railings, lighting truss, crowd barriers. All add to a batch. */

/** A straight steel stair rising along x from (xa, ya) to (xb, yb), between z0 and z1. */
export function steelStair(
  batch: Batch,
  mats: { tread: THREE.Material; steel: THREE.Material; sheet: THREE.Material },
  xa: number,
  ya: number,
  xb: number,
  yb: number,
  z0: number,
  z1: number,
  rails: boolean,
) {
  const steps = Math.round((yb - ya) / 0.18);
  const run = (xb - xa) / steps;
  const rise = (yb - ya) / steps;
  for (let i = 0; i < steps; i++) {
    const x = xa + run * i;
    batch.add(mats.tread, boxAt(Math.min(x, x + run), ya + rise * (i + 1) - 0.05, z0 + 0.15, Math.max(x, x + run), ya + rise * (i + 1), z1 - 0.15));
  }
  const len = Math.hypot(xb - xa, yb - ya);
  const ang = Math.atan2(yb - ya, xb - xa);
  for (const z of [z0 + 0.1, z1 - 0.1]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3((xa + xb) / 2, (ya + yb) / 2 - 0.05, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, ang)), new THREE.Vector3(1, 1, 1));
    batch.add(mats.steel, boxAt(-len / 2, -0.2, -0.04, len / 2, 0.1, 0.04), m);
    if (rails) {
      // solid steel sheet sides with a flat handrail
      batch.add(mats.sheet, boxAt(-len / 2, -0.25, -0.025, len / 2, 1.0, 0.025), m);
      batch.add(mats.steel, boxAt(-len / 2, 1.0, -0.06, len / 2, 1.04, 0.06), m);
    }
  }
}

/** A railing of thin balusters under a top rail, from one point to another at floor height y. */
export function railLine(batch: Batch, steel: THREE.Material, x0: number, z0: number, x1: number, z1: number, y: number) {
  batch.add(steel, boxAt(Math.min(x0, x1) - 0.03, y + 1.0, Math.min(z0, z1) - 0.03, Math.max(x0, x1) + 0.03, y + 1.06, Math.max(z0, z1) + 0.03));
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.15));
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    const z = z0 + ((z1 - z0) * k) / n;
    batch.add(steel, boxAt(x - 0.015, y, z - 0.015, x + 0.015, y + 1.0, z + 0.015));
  }
}

/** A run of square box truss between two points at height y; `half` is half its section. */
export function boxTruss(batch: Batch, mat: THREE.Material, ax: number, az: number, bx: number, bz: number, y: number, half = 0.2) {
  const len = Math.hypot(bx - ax, bz - az);
  const m = new THREE.Matrix4().compose(new THREE.Vector3((ax + bx) / 2, y, (az + bz) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(bx - ax, bz - az) + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
  for (const dy of [-half, half]) for (const dz of [-half, half]) batch.add(mat, new THREE.CylinderGeometry(0.025, 0.025, len, 6).rotateZ(Math.PI / 2).translate(0, dy, dz), m);
  const n = Math.round(len / 0.4);
  for (let i = 0; i < n; i++) {
    const x0 = -len / 2 + i * 0.4;
    const up = i % 2 === 0;
    for (const dz of [-half, half]) {
      const g = new THREE.CylinderGeometry(0.012, 0.012, Math.hypot(0.4, 2 * half), 4).rotateZ(up ? -Math.PI / 4 : Math.PI / 4).translate(x0 + 0.2, 0, dz);
      batch.add(mat, g, m);
    }
    for (const dy of [-half, half]) {
      const g = new THREE.CylinderGeometry(0.012, 0.012, Math.hypot(0.4, 2 * half), 4).rotateX(Math.PI / 2).rotateY(up ? Math.PI / 4 : -Math.PI / 4).translate(x0 + 0.2, dy, 0);
      batch.add(mat, g, m);
    }
  }
}

/** One crowd barrier, 2.45 m long, as a single geometry for instancing. */
export function barrierGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const L = 2.45;
  const tube = (x0: number, y0: number, x1: number, y1: number, r = 0.022) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.CylinderGeometry(r, r, len, 6);
    g.rotateZ(-Math.atan2(x1 - x0, y1 - y0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
    parts.push(g);
  };
  tube(-L / 2, 0.12, -L / 2, 1.1);
  tube(L / 2, 0.12, L / 2, 1.1);
  tube(-L / 2, 1.1, L / 2, 1.1);
  tube(-L / 2, 0.22, L / 2, 0.22);
  for (let x = -L / 2 + 0.12; x < L / 2; x += 0.13) tube(x, 0.22, x, 1.1, 0.008);
  for (const x of [-L / 2 + 0.1, L / 2 - 0.1]) {
    const foot = new THREE.BoxGeometry(0.06, 0.04, 0.7);
    foot.translate(x, 0.02, 0);
    parts.push(foot);
    tube(x, 0.04, x, 0.18);
  }
  return mergeParts(parts);
}
