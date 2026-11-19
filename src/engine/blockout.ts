import * as THREE from 'three';
import { Batch, boxAt, extrude, groundPolygon, pointInPolygon } from './geom';
import type { Area, BuildContext, Link, Obstacle, Pt, Rect, Room, Shell, Stair, Zone } from './types';

/**
 * A venue drawn straight from its plan, as plain blocks: a floor, walls and a ceiling for
 * every room, a hole in the wall wherever a link or a stair goes through it, steps for the
 * stairs, slabs for the platforms, boxes for the obstacles, and the shells as the masses seen
 * from outside. Nothing here knows about any one club. A venue that has only been measured,
 * not yet dressed, calls this from its build and adds what it wants on top.
 */

/** One thing the blockout is about to draw, handed to the venue so it can give it a finish. */
export interface Surface {
  kind: 'floor' | 'walls' | 'ceiling' | 'link' | 'reveal' | 'stair' | 'platform' | 'obstacle' | 'shell';
  /** The room it belongs to: the room itself, a platform's room, the room a stair starts in. */
  room?: string;
  /** The id of the link, stair, platform or shell; the label of the obstacle. */
  id?: string;
  /** For a wall, the edge of the room's outline it stands on. */
  edge?: [Pt, Pt];
  /** The plain colour it would get. */
  colour: string;
}

export interface BlockoutOptions {
  /** Clear height of a link that does not give one. */
  doorHeight: number;
  colours: { floor: string; walls: string; ceiling: string; stair: string; platform: string; obstacle: string; shell: string; reveal: string };
  /**
   * A dressed venue's say over each surface: a material to draw it in, `false` to leave it out
   * (the venue draws it), nothing to keep the plain colour. Everything carries UVs in metres:
   * floors by position, walls by distance along and height.
   */
  finish?(surface: Surface): THREE.Material | false | undefined;
  /** Draw each room into a group of its own, so that the venue can hide the ones that cannot be seen. */
  byRoom?: boolean;
}

const DEFAULTS: BlockoutOptions = {
  doorHeight: 2.1,
  colours: { floor: '#5d5d5f', walls: '#8a8a8c', ceiling: '#6a6a6c', stair: '#77777a', platform: '#707073', obstacle: '#9a9a9d', shell: '#77777a', reveal: '#4c4c4e' },
};

export interface Blockout {
  /** Rooms, links, stairs, platforms, obstacles. Venue frame. */
  interior: THREE.Group;
  /** The shells. Hidden while the camera is somewhere the city is not drawn from. */
  exterior: THREE.Group;
  /**
   * With `byRoom`: a group for each room, holding its floor, walls and ceiling, its platforms,
   * the stairs that start in it and the obstacles that stand in it. Links, and obstacles that
   * stand in no room, stay in `interior` itself. A venue adds its own dressing to these groups.
   */
  rooms: Map<string, THREE.Group>;
  /** A plain material in a colour; one per colour, shared with everything drawn here. */
  material(colour: string): THREE.MeshStandardMaterial;
  update(zone: Zone): void;
}

const STEP = 0.05;
const isRect = (a: Area): a is Rect => typeof a[0] === 'number';
const corners = (a: Area): Pt[] =>
  isRect(a)
    ? [
        [a[0], a[1]],
        [a[2], a[1]],
        [a[2], a[3]],
        [a[0], a[3]],
      ]
    : a;
const inside = (a: Area, x: number, z: number) => (isRect(a) ? x >= a[0] && x <= a[2] && z >= a[1] && z <= a[3] : pointInPolygon(x, z, a));

interface Gap {
  sill: number;
  head: number;
  /** Nothing is drawn below the sill either. */
  bare?: boolean;
}

/** A vertical wall from a to b, between two heights. `u0` is how far along its wall it starts, so a texture runs on through the pieces. */
export function quad(a: Pt, b: Pt, y0: number, y1: number, u0 = 0) {
  const g = new THREE.BufferGeometry();
  const u1 = u0 + Math.hypot(b[0] - a[0], b[1] - a[1]);
  g.setAttribute('position', new THREE.Float32BufferAttribute([a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y0, a[1], b[0], y1, b[1], a[0], y1, a[1]], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, y0, u1, y0, u1, y1, u0, y0, u1, y1, u0, y1], 2));
  g.computeVertexNormals();
  return g;
}

/**
 * A wall along a line, from `base` up to `top`, left out wherever `gapAt` says there is an
 * opening. The line is walked in small steps, and runs of steps with the same answer become
 * one piece of wall each: solid, or a strip below the sill and a strip above the head.
 */
function wall(batch: Batch, material: THREE.Material, a: Pt, b: Pt, base: number, top: number, gapAt: (x: number, z: number) => Gap | null) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 1e-6 || top - base < 1e-6) return;
  const n = Math.max(1, Math.round(len / STEP));
  const at = (k: number): Pt => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
  const same = (p: Gap | null, q: Gap | null) => (p === null || q === null ? p === q : Math.abs(p.sill - q.sill) < 1e-6 && Math.abs(p.head - q.head) < 1e-6 && !p.bare === !q.bare);
  const emit = (k0: number, k1: number, gap: Gap | null) => {
    const p = at(k0);
    const q = at(k1);
    const u = (len * k0) / n;
    if (!gap) {
      batch.add(material, quad(p, q, base, top, u));
      return;
    }
    if (gap.sill > base + 1e-3 && !gap.bare) batch.add(material, quad(p, q, base, Math.min(gap.sill, top), u));
    if (gap.head < top - 1e-3) batch.add(material, quad(p, q, Math.max(gap.head, base), top, u));
  };
  let start = 0;
  let current: Gap | null = null;
  for (let k = 0; k < n; k++) {
    const [x, z] = at(k + 0.5);
    const g = gapAt(x, z);
    if (k === 0) current = g;
    else if (!same(g, current)) {
      emit(start, k, current);
      start = k;
      current = g;
    }
  }
  emit(start, n, current);
}

/** The union of the openings that cover a point. */
function widen(g: Gap | null, sill: number, head: number, bare = false): Gap {
  return g ? { sill: Math.min(g.sill, sill), head: Math.max(g.head, head), bare: g.bare || bare } : { sill, head, bare };
}

function segmentDistance(x: number, z: number, a: Pt, b: Pt) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0;
  return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
}

/** A box lying along a line on the floor: from a to b, `width` across, between two heights. */
function boxAlong(a: Pt, b: Pt, width: number, y0: number, y1: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const g = boxAt(0, y0, -width / 2, len, y1, width / 2, 1);
  const dx = (b[0] - a[0]) / (len || 1);
  const dz = (b[1] - a[1]) / (len || 1);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz, 0, dx));
  m.setPosition(a[0], 0, a[1]);
  return g.applyMatrix4(m);
}

/** A flat polygon with both faces at one height, plus its edge down to `y0` if that is lower. */
function slab(batch: Batch, material: THREE.Material, pts: Pt[], y0: number, y1: number) {
  if (y1 - y0 > 1e-3) {
    const { walls, roof } = extrude(pts, y1 - y0, y0);
    batch.add(material, walls);
    batch.add(material, roof);
    batch.add(material, groundPolygon(pts, y0));
  } else {
    batch.add(material, groundPolygon(pts, y1));
  }
}

export function buildBlockout(ctx: BuildContext, options: Partial<BlockoutOptions> = {}): Blockout {
  const opt: BlockoutOptions = { ...DEFAULTS, ...options, colours: { ...DEFAULTS.colours, ...options.colours } };
  const { plan, frame } = ctx;
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (colour: string) => {
    let m = materials.get(colour);
    if (!m) materials.set(colour, (m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.92, metalness: 0, side: THREE.DoubleSide })));
    return m;
  };
  const interior = new THREE.Group();
  interior.name = 'blockout';
  const exterior = new THREE.Group();
  exterior.name = 'shells';
  const batch = new Batch();
  const worldBatch = new Batch();
  const shellBatch = new Batch();
  const roomBatches = new Map<string, Batch>();
  /** Where a thing of this room is drawn: the room's own batch if rooms are kept apart. */
  const batchOf = (room?: string) => {
    if (!opt.byRoom || !room) return batch;
    let b = roomBatches.get(room);
    if (!b) roomBatches.set(room, (b = new Batch()));
    return b;
  };
  /** The material for a surface, or null if the venue draws it. */
  const finish = (s: Surface): THREE.Material | null => {
    const m = opt.finish?.(s);
    return m === false ? null : (m ?? material(s.colour));
  };

  const rooms = new Map(plan.rooms.map((r) => [r.id, r]));
  const inRoom = (r: Room | undefined, x: number, z: number) => !!r && r.areas.some((a) => inside(a, x, z));
  const headOf = (l: Link) => l.level + (l.height ?? opt.doorHeight);

  /* ----------------------------------------------------------- rooms ---- */
  for (const r of plan.rooms) {
    if (r.floor === false) continue;
    const c = r.colours ?? {};
    const into = batchOf(r.id);
    const floorMat = finish({ kind: 'floor', room: r.id, colour: c.floor ?? opt.colours.floor });
    const ceilMat = finish({ kind: 'ceiling', room: r.id, colour: c.ceiling ?? opt.colours.ceiling });
    const top = r.level + r.height;
    const wallTop = r.vault ? r.level + r.vault.springing : r.level + (r.wallHeight ?? r.height);
    // a yard lies on the ground the city draws, so its paving is lifted clear of it
    const lift = r.open ? 0.06 : 0;

    const gapAt = (x: number, z: number): Gap | null => {
      let g: Gap | null = null;
      for (const l of plan.links) if ((l.from === r.id || l.to === r.id) && inside(l.area, x, z)) g = widen(g, l.level, headOf(l));
      for (const s of plan.stairs) if ((s.from === r.id || s.to === r.id) && inside(s.area, x, z)) g = widen(g, Math.min(s.y[0], s.y[1]), Infinity);
      for (const o of r.openings ?? []) if (segmentDistance(x, z, o.line[0], o.line[1]) < STEP) g = widen(g, r.level + o.sill, o.head === undefined ? Infinity : r.level + o.head, o.bare);
      return g;
    };

    r.areas.forEach((area, index) => {
      const pts = corners(area);
      if (floorMat) into.add(floorMat, groundPolygon(pts, r.level + lift));
      if (ceilMat && !r.sky && !r.vault) into.add(ceilMat, groundPolygon(pts, top));
      const others = r.areas.filter((_, i) => i !== index);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const wallMat = finish({ kind: 'walls', room: r.id, edge: [a, b], colour: c.walls ?? opt.colours.walls });
        if (!wallMat) continue;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        // unit normal; which side is outward does not matter, both are tried
        const nx = (-(b[1] - a[1]) / len) * 0.04;
        const nz = ((b[0] - a[0]) / len) * 0.04;
        // no wall between two parts of the same room
        const joined = (x: number, z: number) => others.some((o) => inside(o, x + nx, z + nz) || inside(o, x - nx, z - nz));
        const vaultEnd = r.vault && (r.vault.along === 'z' ? Math.abs(a[1] - b[1]) < 1e-6 : Math.abs(a[0] - b[0]) < 1e-6);
        wall(into, wallMat, a, b, r.level, vaultEnd ? top : wallTop, (x, z) => (joined(x, z) ? { sill: -Infinity, head: Infinity } : gapAt(x, z)));
      }
      if (ceilMat && r.vault && isRect(area)) {
        // half an ellipse from one springing line over the crown to the other
        const [x0, z0, x1, z1] = area;
        const alongZ = r.vault.along === 'z';
        const span = alongZ ? x1 - x0 : z1 - z0;
        const length = alongZ ? z1 - z0 : x1 - x0;
        const rise = r.height - r.vault.springing;
        const n = 14;
        // the texture runs along the vault in u and round the curve in v, both in metres
        let v0 = 0;
        for (let k = 0; k < n; k++) {
          const t0 = (k / n) * Math.PI;
          const t1 = ((k + 1) / n) * Math.PI;
          const u0 = (1 - Math.cos(t0)) / 2;
          const u1 = (1 - Math.cos(t1)) / 2;
          const y0 = wallTop + Math.sin(t0) * rise;
          const y1 = wallTop + Math.sin(t1) * rise;
          const v1 = v0 + Math.hypot((u1 - u0) * span, y1 - y0);
          const p = alongZ ? [x0 + u0 * span, y0, z0, x0 + u0 * span, y0, z1, x0 + u1 * span, y1, z1, x0 + u1 * span, y1, z0] : [x0, y0, z0 + u0 * span, x1, y0, z0 + u0 * span, x1, y1, z0 + u1 * span, x0, y1, z0 + u1 * span];
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute([p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[0], p[1], p[2], p[6], p[7], p[8], p[9], p[10], p[11]], 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute([0, v0, length, v0, length, v1, 0, v0, length, v1, 0, v1], 2));
          g.computeVertexNormals();
          into.add(ceilMat, g);
          v0 = v1;
        }
      }
    });
  }

  /* ----------------------------------------------------------- links ---- */
  // Rooms are drawn to the inner faces of their walls, so a link crosses a gap as thick as the wall.
  // In that gap it gets a floor, two sides and a soffit; where it lies inside a room it gets nothing.
  const shellOutlines = plan.shells.map((s) => (s.frame === 'world' ? s.outline.map(([x, z]) => frame.localXZ(x, z)) : s.outline));
  for (const l of plan.links) {
    const reveal = finish({ kind: 'reveal', id: l.id, colour: opt.colours.reveal });
    const linkFloor = finish({ kind: 'link', id: l.id, colour: opt.colours.floor });
    const from = rooms.get(l.from);
    const to = rooms.get(l.to);
    const outdoors = !from || !to || from.open || to.open;
    const clear = (x: number, z: number) => {
      const fromIn = inRoom(from, x, z);
      const toIn = inRoom(to, x, z);
      if ((fromIn && !from?.open) || (toIn && !to?.open)) return true;
      // out of doors a link is clear wherever no building stands
      return outdoors && !shellOutlines.some((o) => pointInPolygon(x, z, o));
    };
    const pts = corners(l.area);
    const head = headOf(l);
    if (linkFloor) batch.add(linkFloor, groundPolygon(pts, l.level + 0.004));
    if (!reveal) continue;
    for (let i = 0; i < pts.length; i++) wall(batch, reveal, pts[i], pts[(i + 1) % pts.length], l.level, head, (x, z) => (clear(x, z) ? { sill: -Infinity, head: Infinity } : null));
    // The soffit, as strips of small cells kept only where the link is in the wall. The cells lie
    // along the link's own sides, which are the wall's, so a door in a wall that is not square to
    // the venue frame gets straight edges too.
    let o: Pt;
    let eu: Pt;
    let ev: Pt;
    if (pts.length === 4) {
      o = pts[0];
      eu = [pts[1][0] - o[0], pts[1][1] - o[1]];
      ev = [pts[3][0] - o[0], pts[3][1] - o[1]];
    } else {
      let x0 = Infinity;
      let z0 = Infinity;
      let x1 = -Infinity;
      let z1 = -Infinity;
      for (const [x, z] of pts) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        z0 = Math.min(z0, z);
        z1 = Math.max(z1, z);
      }
      o = [x0, z0];
      eu = [x1 - x0, 0];
      ev = [0, z1 - z0];
    }
    const cell = 0.06;
    const nu = Math.max(1, Math.ceil(Math.hypot(eu[0], eu[1]) / cell));
    const nv = Math.max(1, Math.ceil(Math.hypot(ev[0], ev[1]) / cell));
    const at = (i: number, j: number): Pt => [o[0] + (eu[0] * i) / nu + (ev[0] * j) / nv, o[1] + (eu[1] * i) / nu + (ev[1] * j) / nv];
    for (let j = 0; j < nv; j++) {
      let run: number | null = null;
      for (let i = 0; i <= nu; i++) {
        const [x, z] = at(i + 0.5, j + 0.5);
        const keep = i < nu && inside(l.area, x, z) && !clear(x, z);
        if (keep && run === null) run = i;
        if (!keep && run !== null) {
          batch.add(reveal, groundPolygon([at(run, j), at(i, j), at(i, j + 1), at(run, j + 1)], head));
          run = null;
        }
      }
    }
  }

  /* ---------------------------------------------------------- stairs ---- */
  const drawStair = (s: Stair) => {
    const stairMat = finish({ kind: 'stair', id: s.id, room: s.from, colour: opt.colours.stair });
    const into = batchOf(s.from);
    const [a, b] = s.line;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6 || !stairMat) return;
    const dx = (b[0] - a[0]) / len;
    const dz = (b[1] - a[1]) / len;
    // how far the stair reaches to either side of its line
    let w0 = Infinity;
    let w1 = -Infinity;
    for (const [x, z] of corners(s.area)) {
      const w = -(x - a[0]) * dz + (z - a[1]) * dx;
      w0 = Math.min(w0, w);
      w1 = Math.max(w1, w);
    }
    const rise = s.y[1] - s.y[0];
    const steps = Math.max(1, Math.round(Math.abs(rise) / 0.18));
    const low = Math.min(s.y[0], s.y[1]);
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz, 0, dx));
    m.setPosition(a[0], 0, a[1]);
    for (let i = 0; i < steps; i++) {
      // each tread stands on a block that goes down to the foot of the stair
      const top = s.y[0] + (rise * (rise > 0 ? i + 1 : i)) / steps;
      if (top - low < 1e-3) continue;
      into.add(stairMat, boxAt((len * i) / steps, low, w0, (len * (i + 1)) / steps, top, w1, 1), m);
    }
  };
  for (const s of plan.stairs) drawStair(s);

  /* ------------------------------------------------------- platforms ---- */
  for (const p of plan.platforms) {
    const platformMat = finish({ kind: 'platform', id: p.id, room: p.room, colour: opt.colours.platform });
    if (!platformMat) continue;
    const room = rooms.get(p.room);
    const base = room ? room.level : 0;
    // a low platform is a solid podium; a high one is a deck with space under it
    const y0 = p.level - base > 1.5 ? p.level - 0.2 : base;
    slab(batchOf(p.room), platformMat, corners(p.area), y0, p.level);
  }

  /* ------------------------------------------------------- obstacles ---- */
  /** The room an obstacle stands in: the first whose outline holds its middle and whose height holds its foot. */
  const roomOf = (o: Obstacle) => {
    let x: number;
    let z: number;
    if (o.rect) [x, z] = [(o.rect[0] + o.rect[2]) / 2, (o.rect[1] + o.rect[3]) / 2];
    else if (o.circle) [x, z] = o.circle;
    else {
      const pts = o.path ?? o.poly ?? [];
      if (!pts.length) return undefined;
      x = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
      z = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
    }
    const y = o.y0 + 0.05;
    return plan.rooms.find((r) => r.floor !== false && y >= r.level - 0.3 && y < r.level + r.height && inRoom(r, x, z))?.id;
  };
  const drawObstacle = (o: Obstacle) => {
    if (o.draw === false) return;
    const room = o.frame === 'world' ? undefined : roomOf(o);
    const mat = finish({ kind: 'obstacle', id: o.label, room, colour: o.draw ?? opt.colours.obstacle });
    if (!mat) return;
    const into = o.frame === 'world' ? worldBatch : batchOf(room);
    if (o.rect) into.add(mat, boxAt(o.rect[0], o.y0, o.rect[1], o.rect[2], o.y1, o.rect[3], 1));
    else if (o.circle) into.add(mat, new THREE.CylinderGeometry(o.circle[2], o.circle[2], o.y1 - o.y0, 20).translate(o.circle[0], (o.y0 + o.y1) / 2, o.circle[1]));
    else if (o.path) {
      const n = o.closed ? o.path.length : o.path.length - 1;
      for (let i = 0; i < n; i++) into.add(mat, boxAlong(o.path[i], o.path[(i + 1) % o.path.length], o.width ?? 0.1, o.y0, o.y1));
    } else if (o.poly) slab(into, mat, o.poly, o.y0, o.y1);
  };
  for (const o of plan.obstacles) drawObstacle(o);

  /* ---------------------------------------------------------- shells ---- */
  const drawShell = (s: Shell, outline: Pt[]) => {
    const mat = finish({ kind: 'shell', id: s.id, colour: s.colour ?? opt.colours.shell });
    if (!mat) return;
    // a shell is left open where a link goes through it, and where a room stands in its wall
    const gapAt = (x: number, z: number): Gap | null => {
      let g: Gap | null = null;
      for (const l of plan.links) if (inside(l.area, x, z)) g = widen(g, l.level, headOf(l));
      for (const r of plan.rooms) if (r.floor !== false && !r.open && inRoom(r, x, z)) g = widen(g, r.level, r.level + r.height);
      return g;
    };
    for (let i = 0; i < outline.length; i++) wall(shellBatch, mat, outline[i], outline[(i + 1) % outline.length], 0, s.height, gapAt);
    shellBatch.add(mat, groundPolygon(outline, s.height));
  };
  plan.shells.forEach((s, i) => drawShell(s, shellOutlines[i]));

  batch.build(interior);
  const groups = new Map<string, THREE.Group>();
  if (opt.byRoom) {
    for (const r of plan.rooms) {
      const g = new THREE.Group();
      g.name = `room:${r.id}`;
      roomBatches.get(r.id)?.build(g);
      groups.set(r.id, g);
      interior.add(g);
    }
  }
  shellBatch.build(exterior);
  ctx.group.add(interior, exterior);
  worldBatch.build(ctx.root);

  return {
    interior,
    exterior,
    rooms: groups,
    material,
    update(zone) {
      exterior.visible = !zone.inside || !!zone.showCity;
    },
  };
}
