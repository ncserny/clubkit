import { pointInPolygon } from './geom';
import type { Area, Pt, Rect, VenuePlan } from './types';

/**
 * Which rooms can be seen from where, worked out from the plan, so that a venue can leave the
 * rest undrawn. Rooms are joined by their links and stairs, and each of those is a hole of a
 * known shape: from a point, what is seen through it is a wedge, and what is seen through the
 * next hole is that wedge narrowed again. `from` does this for the point the camera is at;
 * `of` is the same for a whole room, from a grid of points over its floor.
 *
 * Only the plan view is used, and the holes are taken a little wider than they are, so the
 * answer errs toward drawing too much. What the links do not say (a balcony over a hall, a
 * window between two rooms) the venue adds by hand: as `windows` where it can give the line
 * of the opening, which is then looked through like a door, or else in `sees`.
 */

export interface VisibilityOptions {
  /** Openings that are not links, each the line it makes on the plan: a balcony's edge, a window, a hatch. Looked through like a door. */
  windows?: { a: string; b: string; line: [Pt, Pt] }[];
  /** Rooms that look into each other through something with no line to give: for each room, the others, looked through in their turn. */
  sees?: Record<string, string[]>;
  /** How many holes in a row are looked through. */
  depth?: number;
  /** How much wider than drawn each hole is taken to be, in metres. */
  margin?: number;
  /** Spacing of the points tried in each room, in metres. */
  grid?: number;
  /** How far the camera may move before the answer is worked out again, in metres. Keep it under `margin`. */
  still?: number;
}

export interface Visibility {
  /**
   * The rooms to draw with the camera at a point of the venue frame, in `room` (null: out of doors).
   * Worked out for that point, so it is far fewer than `of(room)`. The set returned is the same
   * object as last time if the rooms are the same.
   */
  from(room: string | null, x: number, z: number): ReadonlySet<string>;
  /** Everything seen from anywhere in a room, itself included. */
  of(room: string): ReadonlySet<string>;
}

interface Portal {
  a: string;
  b: string;
  /** The hole's outline, already widened. */
  outline: Pt[];
}

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

function widened(area: Area, by: number): Pt[] {
  const pts = corners(area);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, z]) => {
    const d = Math.hypot(x - cx, z - cz) || 1;
    return [x + ((x - cx) / d) * by, z + ((z - cz) / d) * by];
  });
}

/** A wedge of directions: its middle and half its width, in radians. */
interface Wedge {
  mid: number;
  half: number;
}

/** The wedge a hole fills as seen from a point; null from inside it, where it hides nothing. */
function wedgeOf(outline: Pt[], x: number, z: number): Wedge | null {
  if (pointInPolygon(x, z, outline)) return null;
  const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length - x;
  const cz = outline.reduce((s, p) => s + p[1], 0) / outline.length - z;
  let lo = Infinity;
  let hi = -Infinity;
  for (const [px, pz] of outline) {
    const dx = px - x;
    const dz = pz - z;
    const a = Math.atan2(cx * dz - cz * dx, cx * dx + cz * dz);
    lo = Math.min(lo, a);
    hi = Math.max(hi, a);
  }
  const base = Math.atan2(cz, cx);
  return { mid: base + (lo + hi) / 2, half: (hi - lo) / 2 };
}

/** What two wedges share, or null. */
function narrow(w: Wedge, by: Wedge): Wedge | null {
  let d = by.mid - w.mid;
  d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
  const lo = Math.max(-w.half, d - by.half);
  const hi = Math.min(w.half, d + by.half);
  return hi <= lo ? null : { mid: w.mid + (lo + hi) / 2, half: (hi - lo) / 2 };
}

export function buildVisibility(plan: VenuePlan, options: VisibilityOptions = {}): Visibility {
  const depth = options.depth ?? 6;
  const margin = options.margin ?? 0.35;
  const grid = options.grid ?? 1.25;

  const portals: Portal[] = [];
  for (const l of plan.links) if (l.from !== l.to) portals.push({ a: l.from, b: l.to, outline: widened(l.area, margin) });
  for (const s of plan.stairs) if (s.from !== s.to) portals.push({ a: s.from, b: s.to, outline: widened(s.area, margin) });
  for (const w of options.windows ?? []) {
    const [[px, pz], [qx, qz]] = w.line;
    const l = Math.hypot(qx - px, qz - pz) || 1;
    const dx = ((qx - px) / l) * margin;
    const dz = ((qz - pz) / l) * margin;
    // a strip along the line, as thick as a doorway is taken to be
    portals.push({
      a: w.a,
      b: w.b,
      outline: [
        [px - dx + dz, pz - dz - dx],
        [qx + dx + dz, qz + dz - dx],
        [qx + dx - dz, qz + dz + dx],
        [px - dx - dz, pz - dz + dx],
      ],
    });
  }
  const ofRoom = new Map<string, Portal[]>();
  for (const p of portals) for (const id of [p.a, p.b]) ofRoom.set(id, [...(ofRoom.get(id) ?? []), p]);

  // the rooms being looked through, nearest first. One of them seen again further on would be seen
  // through a narrower wedge than the first time, and could add nothing.
  const path: string[] = [];
  const look = (room: string, x: number, z: number, wedge: Wedge | null, left: number, seen: Set<string>, via: Portal | null) => {
    seen.add(room);
    if (left === 0) return;
    path.push(room);
    for (const p of ofRoom.get(room) ?? []) {
      if (p === via) continue;
      const other = p.a === room ? p.b : p.a;
      if (path.includes(other)) continue;
      const w = wedgeOf(p.outline, x, z);
      const next = w === null ? wedge : wedge === null ? w : narrow(wedge, w);
      if (w !== null && next === null) continue;
      look(other, x, z, next, left - 1, seen, p);
    }
    // what is only named in `sees` has no outline, so nothing narrows there: the room beyond is
    // looked through in the wedge this room was seen in
    for (const other of options.sees?.[room] ?? []) if (!path.includes(other)) look(other, x, z, wedge, left - 1, seen, null);
    path.pop();
  };

  const sets = new Map<string, Set<string>>();
  for (const r of plan.rooms) {
    const seen = new Set<string>([r.id]);
    for (const area of r.areas) {
      const pts = corners(area);
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (const [x, z] of pts) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        z0 = Math.min(z0, z);
        z1 = Math.max(z1, z);
      }
      const nx = Math.max(1, Math.ceil((x1 - x0) / grid));
      const nz = Math.max(1, Math.ceil((z1 - z0) / grid));
      // the points include the edges of the floor: someone against a wall sees furthest round a door
      for (let i = 0; i <= nx; i++) {
        for (let j = 0; j <= nz; j++) {
          const x = x0 + ((x1 - x0) * i) / nx;
          const z = z0 + ((z1 - z0) * j) / nz;
          const inset = 0.05;
          const px = Math.min(x1 - inset, Math.max(x0 + inset, x));
          const pz = Math.min(z1 - inset, Math.max(z0 + inset, z));
          if (!isRect(area) && !pointInPolygon(px, pz, pts)) continue;
          look(r.id, px, pz, null, depth, seen, null);
        }
      }
    }
    sets.set(r.id, seen);
  }

  const open = plan.rooms.filter((r) => r.open).map((r) => r.id);
  const empty: ReadonlySet<string> = new Set();
  const still = options.still ?? 0.15;
  let last: { room: string | null; x: number; z: number; set: ReadonlySet<string> } | null = null;

  return {
    of: (room) => sets.get(room) ?? empty,
    from(room, x, z) {
      // the answer holds for a short step: the holes are taken wider than that
      if (last && last.room === room && Math.hypot(x - last.x, z - last.z) < still) return last.set;
      const seen = new Set<string>();
      // out of doors, or in a room the plan does not know: looking in through the rooms that are open to the sky
      for (const start of room !== null && sets.has(room) ? [room] : open) look(start, x, z, null, depth, seen, null);
      // the same rooms as before are the same set, so a caller can tell that nothing changed
      const set = last && last.set.size === seen.size && [...seen].every((id) => last!.set.has(id)) ? last.set : seen;
      last = { room, x, z, set };
      return set;
    },
  };
}
