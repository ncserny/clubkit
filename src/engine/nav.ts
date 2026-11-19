import * as THREE from 'three';
import { pointInPolygon } from './geom';
import type { VenueFrame } from './frame';
import type { Area, Caption, Obstacle, Pt, Rect, VenuePlan, Zone, ZoneSettings } from './types';

/**
 * Where you can stand, and what you are standing in.
 *
 * The plan's rooms, links, stairs and platforms become surfaces. A step is allowed when
 * the whole body (a centre and a ring of points at shoulder width) stays on surfaces that
 * belong together: the same one, or two that share a room. Rooms only share with the links
 * and stairs that name them, so the only way through a wall is a link. Obstacles and, out
 * of doors, solid masses (buildings, fences, trees) stop you as well.
 */

export const EYE = 1.7;
/** The highest step that can be walked up or down. */
export const STEP = 0.75;
/** Half the width of a body. */
export const BODY = 0.3;
/** How close the centre of a body may come to an obstacle. */
const PAD = 0.25;
const SUBSTEP = 0.2;
const OUTSIDE = 'outside';

/** A mass standing on the ground, in world coordinates. */
export interface Solid {
  outline: Pt[];
  top: number;
}

export interface LadderHold {
  bottom: number;
  top: number;
  x: number;
  z: number;
  /** unit vector on the ground, pointing at the wall the ladder is fixed to */
  wallX: number;
  wallZ: number;
}

interface Shape {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  poly: Pt[] | null;
}

function isRect(a: Area): a is Rect {
  return typeof a[0] === 'number';
}

function bounds(pts: Pt[]): [number, number, number, number] {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const [x, z] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (z < z0) z0 = z;
    if (z > z1) z1 = z;
  }
  return [x0, z0, x1, z1];
}

export function toShape(area: Area): Shape {
  if (isRect(area)) return { x0: Math.min(area[0], area[2]), z0: Math.min(area[1], area[3]), x1: Math.max(area[0], area[2]), z1: Math.max(area[1], area[3]), poly: null };
  const [x0, z0, x1, z1] = bounds(area);
  return { x0, z0, x1, z1, poly: area };
}

export function inShape(s: Shape, x: number, z: number) {
  if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) return false;
  return s.poly ? pointInPolygon(x, z, s.poly) : true;
}

function segmentDistance(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

function pathDistance(x: number, z: number, pts: Pt[], closed: boolean) {
  let d = Infinity;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    d = Math.min(d, segmentDistance(x, z, a[0], a[1], b[0], b[1]));
  }
  return d;
}

/** Distance from a point to a shape; 0 inside it. */
export function shapeDistance(s: Shape, x: number, z: number) {
  if (s.poly) return pointInPolygon(x, z, s.poly) ? 0 : pathDistance(x, z, s.poly, true);
  const dx = Math.max(s.x0 - x, 0, x - s.x1);
  const dz = Math.max(s.z0 - z, 0, z - s.z1);
  return Math.hypot(dx, dz);
}

interface Surface {
  id: string;
  rooms: string[];
  shape: Shape;
  floor(x: number, z: number): number;
}

interface Support {
  s: Surface;
  y: number;
}

interface Block {
  world: boolean;
  y0: number;
  y1: number;
  /** distance from a point (in the obstacle's frame) to the obstacle; 0 inside */
  distance(x: number, z: number): number;
  box: [number, number, number, number];
}

interface SolidBox extends Solid {
  box: [number, number, number, number];
}

const compatible = (a: Surface, b: Surface) => a === b || a.rooms.some((r) => b.rooms.includes(r));

function makeBlock(o: Obstacle): Block | null {
  const world = o.frame === 'world';
  const pad = PAD + 0.01;
  if (o.rect) {
    const s = toShape(o.rect);
    return { world, y0: o.y0, y1: o.y1, distance: (x, z) => shapeDistance(s, x, z), box: [s.x0 - pad, s.z0 - pad, s.x1 + pad, s.z1 + pad] };
  }
  if (o.circle) {
    const [cx, cz, r] = o.circle;
    return { world, y0: o.y0, y1: o.y1, distance: (x, z) => Math.max(0, Math.hypot(x - cx, z - cz) - r), box: [cx - r - pad, cz - r - pad, cx + r + pad, cz + r + pad] };
  }
  if (o.path && o.path.length > 1) {
    const pts = o.path;
    const half = (o.width ?? 0.1) / 2;
    const [x0, z0, x1, z1] = bounds(pts);
    return { world, y0: o.y0, y1: o.y1, distance: (x, z) => Math.max(0, pathDistance(x, z, pts, o.closed ?? false) - half), box: [x0 - half - pad, z0 - half - pad, x1 + half + pad, z1 + half + pad] };
  }
  if (o.poly && o.poly.length > 2) {
    const s = toShape(o.poly);
    return { world, y0: o.y0, y1: o.y1, distance: (x, z) => shapeDistance(s, x, z), box: [s.x0 - pad, s.z0 - pad, s.x1 + pad, s.z1 + pad] };
  }
  return null;
}

export interface Nav {
  zoneAt(p: THREE.Vector3): Zone;
  /** The floor under a point: the highest surface at or below the feet, or a step above them. Null inside something solid. */
  floorAt(p: THREE.Vector3): number | null;
  /** Where a walk from one point towards another ends up. Height is left alone. */
  move(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3;
  ladderAt(p: THREE.Vector3): LadderHold | null;
  /** Every zone there is, for warming up shaders. */
  zones(): Zone[];
}

export function buildNav(plan: VenuePlan, frame: VenueFrame, solidsIn: Solid[], more: Obstacle[] = []): Nav {
  /* ------------------------------------------------------- surfaces ---- */
  const surfaces: Surface[] = [];
  const flat = (y: number) => () => y;
  for (const r of plan.rooms) {
    if (r.floor === false) continue;
    r.areas.forEach((a, i) => surfaces.push({ id: `${r.id}#${i}`, rooms: r.open ? [r.id, OUTSIDE] : [r.id], shape: toShape(a), floor: flat(r.level) }));
  }
  for (const l of plan.links) surfaces.push({ id: l.id, rooms: [l.from, l.to], shape: toShape(l.area), floor: flat(l.level) });
  for (const s of plan.stairs) {
    const [[ax, az], [bx, bz]] = s.line;
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const [y0, y1] = s.y;
    surfaces.push({
      id: s.id,
      rooms: [s.from, s.to],
      shape: toShape(s.area),
      floor: (x, z) => y0 + THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) * (y1 - y0),
    });
  }
  for (const p of plan.platforms) surfaces.push({ id: p.id, rooms: [p.room], shape: toShape(p.area), floor: flat(p.level) });
  const outside: Surface = { id: OUTSIDE, rooms: [OUTSIDE], shape: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity, poly: null }, floor: flat(0) };

  /* -------------------------------------------------- solids, blocks ---- */
  const solids: SolidBox[] = [];
  const addSolid = (outline: Pt[], top: number) => {
    if (outline.length > 2) solids.push({ outline, top, box: bounds(outline) });
  };
  for (const s of solidsIn) addSolid(s.outline, s.top);
  const shells = plan.shells.map((s) => {
    const world = s.frame === 'world' ? s.outline : s.outline.map(([x, z]) => frame.worldXZ(x, z));
    addSolid(world, s.height);
    return { outline: world, box: bounds(world), height: s.height };
  });
  // closed rooms are not open ground either, whether or not a shell covers them
  const roofed = plan.rooms.filter((r) => !r.open).map((r) => ({ shapes: r.areas.map(toShape), top: r.level + r.height }));

  const blocks: Block[] = [];
  for (const o of [...plan.obstacles, ...more]) {
    const b = makeBlock(o);
    if (b) blocks.push(b);
  }

  /** Open ground at a world point for someone whose feet are at `ref`: its height, or null where something solid stands. */
  function groundAt(wx: number, wz: number, lx: number, lz: number, ref: number): number | null {
    let y = 0;
    for (const s of solids) {
      if (wx < s.box[0] || wx > s.box[2] || wz < s.box[1] || wz > s.box[3]) continue;
      if (!pointInPolygon(wx, wz, s.outline)) continue;
      if (s.top > ref + STEP) return null;
      if (s.top > y) y = s.top;
    }
    for (const r of roofed) {
      if (ref >= r.top) continue;
      for (const sh of r.shapes) if (inShape(sh, lx, lz)) return null;
    }
    return y;
  }

  function supportsAt(wx: number, wz: number, ref: number): Support[] {
    const [lx, lz] = frame.localXZ(wx, wz);
    const out: Support[] = [];
    for (const s of surfaces) {
      if (!inShape(s.shape, lx, lz)) continue;
      const y = s.floor(lx, lz);
      if (Math.abs(y - ref) < STEP) out.push({ s, y });
    }
    const g = groundAt(wx, wz, lx, lz, ref);
    if (g !== null) out.push({ s: outside, y: g });
    return out;
  }

  /** How far into an obstacle's margin a body at this point is; 0 when clear. */
  function penetration(wx: number, wz: number, y0: number, y1: number) {
    const [lx, lz] = frame.localXZ(wx, wz);
    let worst = 0;
    for (const b of blocks) {
      if (b.y0 >= y1 || b.y1 <= y0) continue;
      const x = b.world ? wx : lx;
      const z = b.world ? wz : lz;
      if (x < b.box[0] || x > b.box[2] || z < b.box[1] || z > b.box[3]) continue;
      const d = b.distance(x, z);
      if (d < PAD && PAD - d > worst) worst = PAD - d;
    }
    return worst;
  }

  const RING: Pt[] = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4) * BODY, Math.sin((i * Math.PI) / 4) * BODY]);

  /**
   * Can a body go from a to b? Returns the floor it would stand on at b, or null.
   * `ref` is the floor at a for a walker, the height of the feet for someone in the air.
   */
  function step(ax: number, az: number, bx: number, bz: number, ref: number, flying: boolean): number | null {
    const sb = supportsAt(bx, bz, ref);
    if (!sb.length) return null;
    const sa = supportsAt(ax, az, ref);
    // somebody who is somehow standing nowhere is let out
    const centre = sa.length ? sb.filter((b) => sa.some((a) => compatible(a.s, b.s))) : sb;
    if (!centre.length) return null;
    for (const [dx, dz] of RING) {
      const ss = supportsAt(bx + dx, bz + dz, ref);
      if (!ss.some((s) => centre.some((c) => compatible(c.s, s.s)))) return null;
    }
    let floor = -Infinity;
    for (const c of centre) if (c.y > floor) floor = c.y;
    const feet = flying ? ref : floor;
    const pb = penetration(bx, bz, feet + 0.2, feet + EYE);
    // inside an obstacle's margin already: only moves that lead out of it
    if (pb > 0 && pb >= penetration(ax, az, feet + 0.2, feet + EYE)) return null;
    return floor;
  }

  function floorAt(p: THREE.Vector3): number | null {
    const feet = p.y - EYE;
    const [lx, lz] = frame.localXZ(p.x, p.z);
    let best: number | null = null;
    for (const s of surfaces) {
      if (!inShape(s.shape, lx, lz)) continue;
      const y = s.floor(lx, lz);
      if (y <= feet + STEP && (best === null || y > best)) best = y;
    }
    const g = groundAt(p.x, p.z, lx, lz, feet);
    if (g !== null && (best === null || g > best)) best = g;
    return best;
  }

  // sliding along a wall: the step is tried along the venue's own axes and the world's
  const axes: Pt[] = [frame.worldDir(1, 0), frame.worldDir(0, 1), [1, 0], [0, 1]];

  function move(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
    const out = from.clone();
    const f0 = floorAt(from);
    if (f0 === null) {
      out.x = to.x;
      out.z = to.z;
      return out;
    }
    const feet = from.y - EYE;
    const flying = feet - f0 > STEP;
    let ref = flying ? feet : f0;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-6) return out;
    const n = Math.max(1, Math.ceil(dist / SUBSTEP));
    const sx = dx / n;
    const sz = dz / n;
    let x = from.x;
    let z = from.z;
    for (let i = 0; i < n; i++) {
      let f = step(x, z, x + sx, z + sz, ref, flying);
      if (f !== null) {
        x += sx;
        z += sz;
      } else {
        const tries = axes
          .map(([ux, uz]) => {
            const k = sx * ux + sz * uz;
            return [ux * k, uz * k, Math.abs(k)] as [number, number, number];
          })
          .filter((t) => t[2] > 1e-4)
          .sort((a, b) => b[2] - a[2]);
        let moved = false;
        for (const [tx, tz] of tries) {
          f = step(x, z, x + tx, z + tz, ref, flying);
          if (f !== null) {
            x += tx;
            z += tz;
            moved = true;
            break;
          }
        }
        if (!moved) break;
      }
      if (!flying && f !== null) ref = f;
    }
    out.x = x;
    out.z = z;
    return out;
  }

  /* ---------------------------------------------------------- ladders ---- */
  const ladders = plan.ladders.map((l) => {
    const foot = frame.toWorld(l.at[0], 0, l.at[1]);
    const [wx, wz] = frame.worldDir(l.toward[0], l.toward[1]);
    return { reach: toShape(l.reach), hold: { bottom: l.bottom, top: l.top, x: foot.x, z: foot.z, wallX: wx, wallZ: wz } as LadderHold };
  });
  function ladderAt(p: THREE.Vector3) {
    if (!ladders.length) return null;
    const [lx, lz] = frame.localXZ(p.x, p.z);
    const feet = p.y - EYE;
    for (const l of ladders) {
      if (!inShape(l.reach, lx, lz)) continue;
      if (feet > l.hold.bottom - 0.3 && feet < l.hold.top + 0.3) return l.hold;
    }
    return null;
  }

  /* ------------------------------------------------------------ zones ---- */
  const zoneOf = (id: string, name: string, room: string | null, z: ZoneSettings, caption?: Caption): Zone => ({ ...z, id, name, room, caption });
  const volumes = plan.rooms.map((r) => ({
    zone: zoneOf(r.id, r.name, r.id, r.zone, r.caption),
    parts: [...r.areas.map((a) => ({ shape: toShape(a), y0: r.level, y1: r.level + r.height })), ...(r.also ?? []).map((v) => ({ shape: toShape(v.area), y0: v.y0, y1: v.y1 }))],
  }));
  const od = plan.outdoors;
  const street = zoneOf('street', od.street.name, null, { inside: false, music: od.street.music, loudness: 0, track: od.track, speed: od.street.speed, lightSets: od.street.lightSets }, od.street.caption);
  const doorstep = zoneOf('doorstep', od.doorstep.name, null, { inside: false, music: od.doorstep.music, loudness: 0, track: od.track, speed: od.doorstep.speed, lightSets: od.doorstep.lightSets }, od.doorstep.caption);
  const aerial = zoneOf('aerial', od.aerial.name, null, { inside: false, music: 0, loudness: 0, track: od.track, speed: od.aerial.speed, lightSets: od.aerial.lightSets }, od.aerial.caption);
  const door = frame.toWorld(od.door[0], 0, od.door[1]);
  const loud = od.loudness ?? { far: 0.15, near: 0.7, aerial: 0.4 };

  function zoneAt(p: THREE.Vector3): Zone {
    const [lx, lz] = frame.localXZ(p.x, p.z);
    for (const v of volumes) {
      for (const part of v.parts) if (p.y >= part.y0 && p.y < part.y1 && inShape(part.shape, lx, lz)) return v.zone;
    }
    // in a wall or a slab of the building: whatever room is nearest
    for (const s of shells) {
      if (p.y > s.height || p.x < s.box[0] || p.x > s.box[2] || p.z < s.box[1] || p.z > s.box[3] || !pointInPolygon(p.x, p.z, s.outline)) continue;
      let best: Zone | null = null;
      let bestD = Infinity;
      for (const v of volumes) {
        for (const part of v.parts) {
          const d = shapeDistance(part.shape, lx, lz) + Math.max(part.y0 - p.y, 0, p.y - part.y1);
          if (d < bestD) {
            bestD = d;
            best = v.zone;
          }
        }
      }
      if (best) return best;
    }
    const d = Math.hypot(p.x - door.x, p.z - door.z) + Math.max(0, p.y - 2) * 0.6;
    const near = THREE.MathUtils.clamp(1 - d / od.audible, 0, 1);
    if (p.y > od.aerial.above) {
      aerial.loudness = near * loud.aerial;
      return aerial;
    }
    const z = d < od.doorstep.radius ? doorstep : street;
    z.music = d < od.doorstep.musicRadius ? od.doorstep.music : od.street.music;
    z.loudness = loud.far + near * (loud.near - loud.far);
    return z;
  }

  return { zoneAt, floorAt, move, ladderAt, zones: () => [...volumes.map((v) => v.zone), street, doorstep, aerial] };
}
