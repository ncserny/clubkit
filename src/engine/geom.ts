import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Geometry helpers. Boxes carry UVs in metres (divided by a tile size) so a
 * texture keeps its scale whatever the size of the box, and everything that
 * shares a material is merged into one mesh at the end to keep draw calls low.
 */

export function box(w: number, h: number, d: number, tile = 4) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each)
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile);
    }
  }
  return g;
}

/** A box given by its min and max corners. */
export function boxAt(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 4) {
  const g = box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), tile);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

export class Batch {
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(material: THREE.Material, geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (g.attributes.color) g.deleteAttribute('color');
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    }
    if (matrix) g = g.clone().applyMatrix4(matrix);
    let list = this.parts.get(material);
    if (!list) this.parts.set(material, (list = []));
    list.push(g);
  }
  build(parent: THREE.Object3D, opts: { cast?: boolean; receive?: boolean } = {}) {
    const meshes: THREE.Mesh[] = [];
    for (const [material, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = opts.cast ?? true;
      mesh.receiveShadow = opts.receive ?? true;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}

/** Extrude a footprint into walls (UV in metres along the wall and up) and a flat roof. */
export function extrude(points: [number, number][], height: number, base = 0) {
  const pts = points.slice();
  // make it counter-clockwise seen from above (x right, z down the screen) so the walls face out
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % pts.length];
    area += x0 * z1 - x1 * z0;
  }
  if (area < 0) pts.reverse();
  const pos: number[] = [];
  const uv: number[] = [];
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x1 - x0, z1 - z0);
    // two triangles, wound so the face points away from the inside
    pos.push(x0, base, z0, x1, base, z1, x1, base + height, z1, x0, base, z0, x1, base + height, z1, x0, base + height, z0);
    uv.push(run, 0, run + len, 0, run + len, height, run, 0, run + len, height, run, height);
    run += len;
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  walls.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  walls.computeVertexNormals();
  // the winding above can come out inward depending on handedness; check one normal and flip if needed
  const n = new THREE.Vector3().fromBufferAttribute(walls.attributes.normal as THREE.BufferAttribute, 0);
  const [ax, az] = pts[0];
  const [bx, bz] = pts[1];
  const out = new THREE.Vector3(bz - az, 0, -(bx - ax));
  if (n.dot(out) < 0) flip(walls);

  const contour = pts.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const rp: number[] = [];
  const ruv: number[] = [];
  for (const t of tris) {
    for (const k of [t[0], t[2], t[1]]) {
      rp.push(contour[k].x, base + height, contour[k].y);
      ruv.push(contour[k].x, contour[k].y);
    }
  }
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  roof.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2));
  roof.computeVertexNormals();
  const rn = new THREE.Vector3().fromBufferAttribute(roof.attributes.normal as THREE.BufferAttribute, 0);
  if (rn.y < 0) flip(roof);
  return { walls, roof };
}

/** Flat polygon on the ground, UV in metres. */
export function groundPolygon(points: [number, number][], y: number) {
  const contour = points.map(([x, z]) => new THREE.Vector2(x, z));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const p: number[] = [];
  const u: number[] = [];
  for (const t of tris) {
    for (const k of [t[0], t[2], t[1]]) {
      p.push(contour[k].x, y, contour[k].y);
      u.push(contour[k].x, contour[k].y);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) flip(g);
  return g;
}

/** A ribbon along a polyline, for roads, paths and ballast. UV: u across (0..1), v along in metres. */
export function ribbon(points: [number, number][], width: number, y: number) {
  const p: number[] = [];
  const u: number[] = [];
  let run = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.01) continue;
    const nx = (-(z1 - z0) / len) * (width / 2);
    const nz = ((x1 - x0) / len) * (width / 2);
    // extend each segment by half a width so corners overlap instead of leaving wedges
    const ex = ((x1 - x0) / len) * (width / 2);
    const ez = ((z1 - z0) / len) * (width / 2);
    const a = [x0 - ex + nx, z0 - ez + nz];
    const b = [x0 - ex - nx, z0 - ez - nz];
    const c = [x1 + ex - nx, z1 + ez - nz];
    const d = [x1 + ex + nx, z1 + ez + nz];
    p.push(a[0], y, a[1], c[0], y, c[1], b[0], y, b[1], a[0], y, a[1], d[0], y, d[1], c[0], y, c[1]);
    u.push(0, run, 1, run + len, 1, run, 0, run, 0, run + len, 1, run + len);
    run += len;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
  g.computeVertexNormals();
  if (p.length && g.attributes.normal.getY(0) < 0) flip(g);
  return g;
}

export function flip(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
  for (let i = 0; i < p.count; i += 3) {
    const swap = (a: THREE.BufferAttribute, size: number) => {
      for (let k = 0; k < size; k++) {
        const t = a.array[(i + 1) * size + k];
        (a.array as Float32Array)[(i + 1) * size + k] = a.array[(i + 2) * size + k];
        (a.array as Float32Array)[(i + 2) * size + k] = t;
      }
      a.needsUpdate = true;
    };
    swap(p, 3);
    if (uv) swap(uv, 2);
  }
  g.computeVertexNormals();
}

export function polylineLength(points: [number, number][]) {
  let l = 0;
  for (let i = 0; i < points.length - 1; i++) l += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  return l;
}

/** Points every `step` metres along a polyline, with the heading there. */
export function along(points: [number, number][], step: number, offset = 0) {
  const out: { x: number; z: number; angle: number }[] = [];
  let carry = offset;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const angle = Math.atan2(x1 - x0, z1 - z0);
    let d = carry;
    while (d <= len) {
      const k = d / len;
      out.push({ x: x0 + (x1 - x0) * k, z: z0 + (z1 - z0) * k, angle });
      d += step;
    }
    carry = d - len;
  }
  return out;
}

export function centroid(points: [number, number][]) {
  let x = 0;
  let z = 0;
  for (const p of points) {
    x += p[0];
    z += p[1];
  }
  return [x / points.length, z / points.length] as [number, number];
}

export function pointInPolygon(x: number, z: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** A polyline moved sideways by d metres. */
export function offsetPath(path: [number, number][], d: number): [number, number][] {
  return path.map((p, i) => {
    const a = path[Math.min(i + 1, path.length - 1)];
    const b = path[Math.max(i - 1, 0)];
    const dx = a[0] - b[0];
    const dz = a[1] - b[1];
    const l = Math.hypot(dx, dz) || 1;
    return [p[0] + (-dz / l) * d, p[1] + (dx / l) * d];
  });
}

/** Several geometries as one, keeping only positions and normals. */
export function mergeParts(parts: THREE.BufferGeometry[]) {
  const geos = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}
