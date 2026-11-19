import * as THREE from 'three';
import { boxAt } from '../engine/geom';
import type { Pt } from '../engine/types';

/**
 * The few shapes a club is mostly made of, in a stage's own coordinates: points on the floor
 * are [x, z], heights are y. UVs are in metres unless a shape says otherwise, so a painted
 * finish keeps its scale whatever it is laid on.
 */

/** A box between two corners on the floor and two heights. */
export const box = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number) => boxAt(Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1), 1);

/** A box lying along a line on the floor: from a to b, `width` across, between two heights. */
export function along(a: Pt, b: Pt, width: number, y0: number, y1: number) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  const g = boxAt(0, y0, -width / 2, len, y1, width / 2, 1);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx / len, 0, dz / len), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz / len, 0, dx / len));
  m.setPosition(a[0], 0, a[1]);
  return g.applyMatrix4(m);
}

/** An upright cylinder standing at x, z. */
export const cyl = (x: number, z: number, radius: number, y0: number, y1: number, sides = 12) => new THREE.CylinderGeometry(radius, radius, y1 - y0, sides).translate(x, (y0 + y1) / 2, z);

/** A tube between two points in space. */
export function tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, sides = 6) {
  const d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(radius, radius, d.length(), sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/**
 * An upright flat panel from a to b on the floor, between two heights, with UVs that run 0 to 1
 * across it (for a sign or a screen) or in metres (for a finish). Drawn with a two-sided
 * material, which way it faces does not matter.
 */
export function panel(a: Pt, b: Pt, y0: number, y1: number, metres = false) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = new THREE.BufferGeometry();
  const [ax, az] = a;
  const [bx, bz] = b;
  g.setAttribute('position', new THREE.Float32BufferAttribute([ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az], 3));
  const u = metres ? len : 1;
  const v0 = metres ? y0 : 0;
  const v1 = metres ? y1 : 1;
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, u, v0, u, v1, 0, v0, u, v1, 0, v1], 2));
  g.computeVertexNormals();
  return g;
}

/** A flat panel in space from its four corners, in order round it, with UVs 0 to 1 or scaled. */
export function quad4(p: THREE.Vector3[], us = 1, vs = 1) {
  const g = new THREE.BufferGeometry();
  const [a, b, c, d] = p;
  g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, us, 0, us, vs, 0, 0, us, vs, 0, vs], 2));
  g.computeVertexNormals();
  return g;
}

/** A slab over any outline on the floor, between two heights: for a counter that is not square, a step with a curved edge. */
export function prism(outline: Pt[], y0: number, y1: number) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  // the shape is drawn on x, -z and pushed out along z; standing it up puts it on the floor
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

/** A point at a height. */
export const at = ([x, z]: Pt, y: number) => new THREE.Vector3(x, y, z);

/** A transform that stands something at x, z on the floor, at height y, turned `facing` radians about the vertical. */
export function placed(x: number, y: number, z: number, facing = 0) {
  return new THREE.Matrix4().makeRotationY(facing).setPosition(x, y, z);
}

/** A number from 0 to 1 that is always the same for the same k: for things that should look scattered. */
export const rnd = (k: number) => {
  const v = Math.sin(k * 12.9898 + 4.1) * 43758.5453;
  return v - Math.floor(v);
};
