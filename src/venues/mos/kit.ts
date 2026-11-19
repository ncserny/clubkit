import * as THREE from 'three';
import type { Blockout } from '../../engine/blockout';
import { beamGeometry, beamMaterial, dustCloud } from '../../engine/fx';
import { Batch, boxAt } from '../../engine/geom';
import type { LightRig } from '../../engine/lights';
import type { Quality } from '../../engine/quality';
import type { BuildContext, FrameState, Pt, Stair } from '../../engine/types';
import { K, YARD } from './plan';
import type { Finishes } from './textures';

/**
 * What the files that dress the venue share: a batch of geometry for every room on either of
 * the plan's two grids, so that a room's dressing is hidden with the room, and the handful of
 * shapes that a club is mostly made of.
 *
 * Everything here is given on a grid, as (right, in) on the site grid or (along, in) on the
 * courtyard's. Both become x = first, z = -second in the group they are drawn into.
 */

export type G2 = [number, number];
type Animate = (f: FrameState, night: boolean) => void;

export interface Kit {
  ctx: BuildContext;
  Q: Quality;
  fin: Finishes;
  crest: THREE.Texture;
  /** The plan's lights, once they are built: for a room that animates its own. */
  rig: LightRig | null;
  /** Geometry in a room, on the site grid. */
  site(room: string): Batch;
  /** Geometry in a room, on the courtyard grid. */
  yard(room: string): Batch;
  /** The group of a room on either grid, for a mesh of its own (a sign, an instanced thing, a beam). */
  siteGroup(room: string): THREE.Group;
  yardGroup(room: string): THREE.Group;
  /** Called every frame while the venue is drawn, and when the time of day changes. */
  animate(fn: Animate): void;
  onTime(fn: (night: boolean) => void): void;
  /** A cone of lit haze from a fixture, in a room. Returned so that it can be swung about. */
  beam(room: string, at: THREE.Vector3, colour: string, radius: number, length: number): Beam;
  /** Dust in the air of a room, on the detail levels that have it. */
  dust(room: string, seed: number, count: number, x: G2, y: G2, z: G2, glow: number, tint?: string): void;
}

export interface Beam {
  mesh: THREE.Mesh;
  colour: THREE.Color;
  /** 0 to 1. */
  set(opacity: number): void;
}

export interface KitHandle {
  kit: Kit;
  /** Merge everything added so far into the rooms' groups. */
  finish(): void;
  update(f: FrameState, night: boolean): void;
  setTime(night: boolean): void;
}

export function makeKit(ctx: BuildContext, fin: Finishes, blockout: Blockout, crest: THREE.Texture): KitHandle {
  const siteBatches = new Map<string, Batch>();
  const yardBatches = new Map<string, Batch>();
  const yardGroups = new Map<string, THREE.Group>();
  const animations: Animate[] = [];
  const timers: ((night: boolean) => void)[] = [];
  const beams: { material: THREE.ShaderMaterial }[] = [];
  const dusts: { points: THREE.Points; glow: number }[] = [];

  const siteGroup = (room: string) => {
    const g = blockout.rooms.get(room);
    if (!g) throw new Error(`no room ${room}`);
    return g;
  };
  const yardGroup = (room: string) => {
    let g = yardGroups.get(room);
    if (!g) {
      g = new THREE.Group();
      const [ox, oz] = K(0, 0);
      g.position.set(ox, 0, oz);
      g.rotation.y = (YARD.turn * Math.PI) / 180;
      siteGroup(room).add(g);
      yardGroups.set(room, g);
    }
    return g;
  };
  const batchIn = (map: Map<string, Batch>, room: string) => {
    let b = map.get(room);
    if (!b) map.set(room, (b = new Batch()));
    return b;
  };

  const kit: Kit = {
    ctx,
    Q: ctx.quality,
    fin,
    crest,
    rig: null,
    site: (room) => batchIn(siteBatches, room),
    yard: (room) => batchIn(yardBatches, room),
    siteGroup,
    yardGroup,
    animate: (fn) => animations.push(fn),
    onTime: (fn) => timers.push(fn),
    beam(room, at, colour, radius, length) {
      const material = beamMaterial();
      const c = material.uniforms.uColor.value as THREE.Color;
      c.set(colour);
      const mesh = new THREE.Mesh(beamGeometry(radius, length), material);
      mesh.position.copy(at);
      mesh.frustumCulled = false;
      mesh.renderOrder = 3;
      siteGroup(room).add(mesh);
      beams.push({ material });
      return { mesh, colour: c, set: (o) => (material.uniforms.uOpacity.value = o) };
    },
    dust(room, seed, count, x, y, z, glow, tint) {
      if (!ctx.quality.dust) return;
      const points = dustCloud({ count, seed, x, y, z, tint });
      siteGroup(room).add(points);
      dusts.push({ points, glow });
    },
  };

  return {
    kit,
    finish() {
      for (const [room, b] of siteBatches) b.build(siteGroup(room));
      for (const [room, b] of yardBatches) b.build(yardGroup(room));
      siteBatches.clear();
      yardBatches.clear();
    },
    update(f, night) {
      for (const b of beams) b.material.uniforms.uTime.value = f.t;
      for (const d of dusts) {
        d.points.visible = night;
        const u = (d.points.material as THREE.ShaderMaterial).uniforms;
        u.uTime.value = f.t;
        u.uGlow.value = d.glow * (0.7 + 0.3 * f.pulse);
      }
      for (const fn of animations) fn(f, night);
    },
    setTime(night) {
      for (const fn of timers) fn(night);
    },
  };
}

/** A number from 0 to 1 that is always the same for the same k: for things that should look scattered. */
export const rnd = (k: number) => {
  const v = Math.sin(k * 12.9898 + 4.1) * 43758.5453;
  return v - Math.floor(v);
};

/** One of the plan's flights of stairs. */
export function stairOf(kit: Kit, id: string): Stair {
  const s = kit.ctx.plan.stairs.find((x) => x.id === id);
  if (!s) throw new Error(`no stair ${id}`);
  return s;
}

/* ----------------------------------------------------------------- shapes ---- */

/** A box on a grid, between two heights. UVs in metres. */
export const B = (r0: number, i0: number, r1: number, i1: number, y0: number, y1: number) => boxAt(Math.min(r0, r1), y0, -Math.max(i0, i1), Math.max(r0, r1), y1, -Math.min(i0, i1), 1);

/** A box lying along a line on a grid: from a to b, `width` across, between two heights. */
export function along(a: G2, b: G2, width: number, y0: number, y1: number) {
  const dx = b[0] - a[0];
  const dz = -(b[1] - a[1]);
  const len = Math.hypot(dx, dz) || 1;
  const g = boxAt(0, y0, -width / 2, len, y1, width / 2, 1);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx / len, 0, dz / len), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz / len, 0, dx / len));
  m.setPosition(a[0], 0, -a[1]);
  return g.applyMatrix4(m);
}

/** An upright cylinder on a grid. */
export const cyl = (r: number, i: number, radius: number, y0: number, y1: number, sides = 12) => new THREE.CylinderGeometry(radius, radius, y1 - y0, sides).translate(r, (y0 + y1) / 2, -i);

/** A tube between two points in space (x, y, z of the group it is drawn into). */
export function tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, sides = 6) {
  const d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(radius, radius, d.length(), sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}
export const V3 = (r: number, y: number, i: number) => new THREE.Vector3(r, y, -i);

/**
 * An upright flat panel on a grid from a to b, between two heights, with UVs that run 0 to 1
 * across it (for a sign or a screen) or in metres (for a finish). It faces to the left of a-to-b
 * as seen from above on the grid; drawn with a two-sided material that does not matter.
 */
export function panel(a: G2, b: G2, y0: number, y1: number, metres = false) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = new THREE.BufferGeometry();
  const [ax, az] = [a[0], -a[1]];
  const [bx, bz] = [b[0], -b[1]];
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

/** A level rectangle on a grid at a height, UVs 0 to 1. Faces up. */
export function flat(r0: number, i0: number, r1: number, i1: number, y: number) {
  return quad4([V3(r0, y, i0), V3(r1, y, i0), V3(r1, y, i1), V3(r0, y, i1)]);
}

/** A handrail on balusters along a line of points on a grid, standing on `level`. */
export function railing(batch: Batch, steel: THREE.Material, pts: G2[], level: number, height = 1.1, every = 0.14) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    batch.add(steel, along(a, b, 0.05, level + height - 0.05, level + height));
    batch.add(steel, along(a, b, 0.03, level + 0.08, level + 0.11));
    const n = Math.max(1, Math.round(len / every));
    for (let k = 0; k <= n; k++) {
      const r = a[0] + ((b[0] - a[0]) * k) / n;
      const inn = a[1] + ((b[1] - a[1]) * k) / n;
      const post = k % 8 === 0 || k === n;
      const w = post ? 0.02 : 0.006;
      batch.add(steel, B(r - w, inn - w, r + w, inn + w, level, level + height - 0.05));
    }
  }
}

/** A square truss standing upright on a grid. */
export function trussLeg(batch: Batch, mat: THREE.Material, r: number, i: number, y0: number, y1: number, half = 0.14) {
  for (const dr of [-half, half]) for (const di of [-half, half]) batch.add(mat, cyl(r + dr, i + di, 0.022, y0, y1, 6));
  const n = Math.max(1, Math.round((y1 - y0) / 0.4));
  for (let k = 0; k < n; k++) {
    const ya = y0 + ((y1 - y0) * k) / n;
    const yb = y0 + ((y1 - y0) * (k + 1)) / n;
    const s = k % 2 ? 1 : -1;
    batch.add(mat, tube(V3(r - half * s, ya, i - half), V3(r + half * s, yb, i - half), 0.011, 4));
    batch.add(mat, tube(V3(r - half * s, ya, i + half), V3(r + half * s, yb, i + half), 0.011, 4));
    batch.add(mat, tube(V3(r - half, ya, i - half * s), V3(r - half, yb, i + half * s), 0.011, 4));
    batch.add(mat, tube(V3(r + half, ya, i - half * s), V3(r + half, yb, i + half * s), 0.011, 4));
  }
}

/** A square truss lying level between two points on a grid. */
export function trussRun(batch: Batch, mat: THREE.Material, a: G2, b: G2, y: number, half = 0.14) {
  const d = new THREE.Vector2(b[0] - a[0], b[1] - a[1]);
  const len = d.length();
  d.normalize();
  const nr = -d.y * half;
  const ni = d.x * half;
  for (const s of [-1, 1]) for (const dy of [-half, half]) batch.add(mat, tube(V3(a[0] + nr * s, y + dy, a[1] + ni * s), V3(b[0] + nr * s, y + dy, b[1] + ni * s), 0.022, 6));
  const n = Math.max(1, Math.round(len / 0.45));
  for (let k = 0; k < n; k++) {
    const p = (t: number): G2 => [a[0] + d.x * len * t, a[1] + d.y * len * t];
    const p0 = p(k / n);
    const p1 = p((k + 1) / n);
    const s = k % 2 ? 1 : -1;
    for (const side of [-1, 1]) batch.add(mat, tube(V3(p0[0] + nr * side, y - half * s, p0[1] + ni * side), V3(p1[0] + nr * side, y + half * s, p1[1] + ni * side), 0.011, 4));
    for (const dy of [-half, half]) batch.add(mat, tube(V3(p0[0] - nr * s, y + dy, p0[1] - ni * s), V3(p1[0] + nr * s, y + dy, p1[1] + ni * s), 0.011, 4));
  }
}

/**
 * A steel stair with open treads, drawn from the plan's flight: two stringers, the treads
 * between them, and a handrail on posts along each side that is asked for.
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

/** A sofa on a grid: a seat, a back along one side, arms at the ends. `back` says which side the back is on. */
export function sofa(batch: Batch, cloth: THREE.Material, r0: number, i0: number, r1: number, i1: number, y: number, back: 'n' | 's' | 'e' | 'w') {
  const seat = 0.45;
  batch.add(cloth, B(r0, i0, r1, i1, y + 0.12, y + seat));
  const t = 0.18;
  const h = y + 0.85;
  if (back === 'n') batch.add(cloth, B(r0, i1 - t, r1, i1, y, h));
  if (back === 's') batch.add(cloth, B(r0, i0, r1, i0 + t, y, h));
  if (back === 'w') batch.add(cloth, B(r0, i0, r0 + t, i1, y, h));
  if (back === 'e') batch.add(cloth, B(r1 - t, i0, r1, i1, y, h));
  const armH = y + 0.62;
  if (back === 'n' || back === 's') {
    batch.add(cloth, B(r0, i0, r0 + 0.14, i1, y, armH));
    batch.add(cloth, B(r1 - 0.14, i0, r1, i1, y, armH));
  } else {
    batch.add(cloth, B(r0, i0, r1, i0 + 0.14, y, armH));
    batch.add(cloth, B(r0, i1 - 0.14, r1, i1, y, armH));
  }
}

/** A row of bottles on a shelf: on the detail levels that have small props. */
export function bottles(kit: Kit, batch: Batch, a: G2, b: G2, y: number, every = 0.11, seed = 1) {
  if (!kit.Q.props) return;
  const glass = [kit.fin.plain('#2f5a3a', { rough: 0.2, metal: 0.1 }), kit.fin.plain('#6a3a1a', { rough: 0.2, metal: 0.1 }), kit.fin.plain('#c9ccd0', { rough: 0.15, metal: 0.2 }), kit.fin.plain('#1b1b1e', { rough: 0.2, metal: 0.1 })];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.floor(len / every);
  for (let k = 0; k < n; k++) {
    const h = Math.sin(k * 12.9898 + seed) * 43758.5453;
    const f = h - Math.floor(h);
    if (f < 0.12) continue;
    const t = (k + 0.5) / n;
    const height = 0.22 + f * 0.1;
    batch.add(glass[Math.floor(f * 97) % glass.length], cyl(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.032, y, y + height, 6));
  }
}

/** What an LED wall is drawn with: its own material, so that its colour and picture can move. `pitch` is metres per tile of the picture. */
export function ledScreen(fin: Finishes, colour: string, pitch = 1) {
  const map = fin.painting('led').clone();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1 / pitch, 1 / pitch);
  map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map, color: colour, side: THREE.DoubleSide });
}

/**
 * A screen that plays slow liquid video: folds of light that turn over one another, seen through
 * the grid of its pixels. Whoever animates it sets `uTime`, `uColor` (what the liquid is tinted),
 * `uLevel` (how bright) and `uNight`; at 0 that leaves the screen off, a dim grey. The panel's UVs
 * are taken as metres, and `pitch` is the size of a pixel.
 */
export function swirlScreen(pitch = 0.03) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#3d7dff') },
        uLevel: { value: 1 },
        uNight: { value: 1 },
        uOff: { value: new THREE.Color('#17181f') },
        uPitch: { value: pitch },
      },
    ]),
    vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
    fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime; uniform vec3 uColor; uniform float uLevel; uniform float uNight; uniform vec3 uOff; uniform float uPitch;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float a = 0.5; float s = 0.0;
          for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.02 + vec2(17.3, 9.1); a *= 0.5; }
          return s;
        }
        void main() {
          // the picture is made of pixels: every point shows what is at the centre of its own
          vec2 cell = vUv / uPitch;
          vec2 p = (floor(cell) + 0.5) * uPitch * 1.1;
          float t = uTime * 0.06;
          // a field pushed about by itself, twice over: slow folds that turn over one another
          vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t, 0.0)));
          vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + 0.7 * t), fbm(p + 3.2 * q + vec2(8.3, 2.8) - 0.5 * t));
          float f = fbm(p + 3.2 * r);
          // mostly dark, as the content in the photograph is, with the folds picked out pale
          float body = smoothstep(0.38, 0.8, f);
          float fold = smoothstep(0.6, 0.98, f + 0.5 * (length(r) - 0.6));
          vec3 col = uColor * (0.03 + 0.6 * body) + vec3(0.75, 0.88, 1.0) * fold * fold * 0.7;
          col = mix(uOff, col * uLevel, uNight);
          // the gaps between the pixels, evened out where they are too small to draw
          vec2 g = abs(fract(cell) - 0.5);
          float gap = smoothstep(0.36, 0.48, max(g.x, g.y));
          float fine = clamp(1.0 - max(fwidth(cell.x), fwidth(cell.y)) * 1.5, 0.0, 1.0);
          col *= 1.0 - 0.55 * mix(0.3, gap, fine);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
  });
}

/** Screens that drift through a band of hues at night and hold a dim grey by day. */
export function playScreens(kit: Kit, screens: THREE.MeshBasicMaterial[], hue: number, range: number, level = 0.4) {
  const c = new THREE.Color();
  kit.onTime((night) => {
    if (!night) for (const s of screens) s.color.set('#17181f');
  });
  kit.animate(({ t, pulse }, night) => {
    if (!night) return;
    screens.forEach((s, i) => {
      s.color.copy(c.setHSL((hue + range * Math.sin(t * 0.21 + i * 1.3) + 1) % 1, 0.85, level + 0.1 * pulse));
      if (s.map) s.map.offset.x = t * 0.05 * (i % 2 ? -1 : 1);
    });
  });
}

/**
 * Moving lights hung at points in a room, each throwing a beam through the haze that swings
 * about. The phone level keeps every other beam. Each spot is right, in, height of the clamp.
 * `hidden` is for fixtures out of sight above something: no fixture is drawn, and the beam
 * starts at the height given.
 */
export function movingHeads(kit: Kit, room: string, spots: [number, number, number][], colours: string[], o: { length: number; radius?: number; swing?: number; speed?: number; level?: number; hidden?: boolean }) {
  const batch = kit.site(room);
  const body = kit.fin.plain('#0b0b0c', { rough: 0.5, metal: 0.4 });
  const beams: { beam: Beam; phase: number }[] = [];
  spots.forEach(([r, i, y], k) => {
    const colour = colours[k % colours.length];
    if (!o.hidden) {
      batch.add(body, B(r - 0.11, i - 0.11, r + 0.11, i + 0.11, y - 0.1, y));
      batch.add(body, cyl(r, i, 0.1, y - 0.4, y - 0.12, 10));
      batch.add(kit.fin.glow(colour), cyl(r, i, 0.08, y - 0.41, y - 0.4, 10));
    }
    if (kit.Q.level === 'lite' && k % 2) return;
    beams.push({ beam: kit.beam(room, V3(r, o.hidden ? y : y - 0.4, i), colour, o.radius ?? 0.7, o.length), phase: k * 2.399 });
  });
  const swing = o.swing ?? 0.5;
  const speed = o.speed ?? 0.35;
  const level = o.level ?? 0.5;
  kit.animate(({ t, pulse }, night) => {
    for (const { beam, phase } of beams) {
      beam.mesh.visible = night;
      if (!night) continue;
      beam.mesh.rotation.x = swing * Math.sin(t * speed + phase);
      beam.mesh.rotation.z = swing * Math.cos(t * speed * 0.8 + phase * 1.7);
      beam.set(level * (0.65 + 0.35 * pulse));
    }
  });
}

/** The two leaves of a double door standing open, flat against the wall either side of it. `a` to `b` is the opening; `out` says which side of that line the leaves lie on. */
export function openLeaves(batch: Batch, mat: THREE.Material, a: G2, b: G2, out: 1 | -1, y0: number, height: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d: G2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const n: G2 = [-d[1] * out * 0.05, d[0] * out * 0.05];
  const leaf = len / 2 - 0.03;
  batch.add(mat, along([a[0] + n[0] - d[0] * leaf, a[1] + n[1] - d[1] * leaf], [a[0] + n[0], a[1] + n[1]], 0.045, y0, y0 + height));
  batch.add(mat, along([b[0] + n[0], b[1] + n[1]], [b[0] + n[0] + d[0] * leaf, b[1] + n[1] + d[1] * leaf], 0.045, y0, y0 + height));
}

/** A loudspeaker cabinet, or a stack of them: black, with grilles on the side asked for (and the one opposite). */
export function cabinet(batch: Batch, fin: Finishes, r0: number, i0: number, r1: number, i1: number, y0: number, y1: number, faces: 'ns' | 'ew') {
  const shell = fin.plain('#0a0a0b', { rough: 0.6 });
  const grille = fin.surface('speaker', '#3d3d42', { rough: 0.6, metal: 0.3 });
  batch.add(shell, B(r0, i0, r1, i1, y0, y1));
  const e = 0.012;
  if (faces === 'ns') {
    batch.add(grille, panel([r0 + 0.03, i0 - e], [r1 - 0.03, i0 - e], y0 + 0.03, y1 - 0.03, true));
    batch.add(grille, panel([r1 - 0.03, i1 + e], [r0 + 0.03, i1 + e], y0 + 0.03, y1 - 0.03, true));
  } else {
    batch.add(grille, panel([r0 - e, i1 - 0.03], [r0 - e, i0 + 0.03], y0 + 0.03, y1 - 0.03, true));
    batch.add(grille, panel([r1 + e, i0 + 0.03], [r1 + e, i1 - 0.03], y0 + 0.03, y1 - 0.03, true));
  }
}

/** A mirror ball: faceted, bright where it catches the light. */
export function mirrorBall(radius: number) {
  return new THREE.IcosahedronGeometry(radius, 2);
}
