import type * as THREE from 'three';
import type { Batch } from '../engine/geom';
import type { Quality } from '../engine/quality';
import type { Pt } from '../engine/types';
import type { Mats } from './mats';
import { box, cyl, prism } from './shapes';

/** Which side of its rectangle a seat's back is on. */
export type Side = '-x' | '+x' | '-z' | '+z';

/** A sofa: a seat on a rectangle (x0 < x1, z0 < z1) standing on y, a back along one side, arms at the ends. */
export function sofa(batch: Batch, cloth: THREE.Material, x0: number, z0: number, x1: number, z1: number, y: number, back: Side) {
  const seat = 0.45;
  batch.add(cloth, box(x0, z0, x1, z1, y + 0.12, y + seat));
  const t = 0.18;
  const h = y + 0.85;
  if (back === '-z') batch.add(cloth, box(x0, z0, x1, z0 + t, y, h));
  if (back === '+z') batch.add(cloth, box(x0, z1 - t, x1, z1, y, h));
  if (back === '-x') batch.add(cloth, box(x0, z0, x0 + t, z1, y, h));
  if (back === '+x') batch.add(cloth, box(x1 - t, z0, x1, z1, y, h));
  const armH = y + 0.62;
  if (back === '-z' || back === '+z') {
    batch.add(cloth, box(x0, z0, x0 + 0.14, z1, y, armH));
    batch.add(cloth, box(x1 - 0.14, z0, x1, z1, y, armH));
  } else {
    batch.add(cloth, box(x0, z1 - 0.14, x1, z1, y, armH));
    batch.add(cloth, box(x0, z0, x1, z0 + 0.14, y, armH));
  }
}

/** A row of bottles on a shelf from a to b at height y: on the detail levels that have small props. */
export function bottles(stage: { quality: Quality; mats: Mats }, batch: Batch, a: Pt, b: Pt, y: number, every = 0.11, seed = 1) {
  if (!stage.quality.props) return;
  const { mats } = stage;
  const glass = [mats.plain('#2f5a3a', { rough: 0.2, metal: 0.1 }), mats.plain('#6a3a1a', { rough: 0.2, metal: 0.1 }), mats.plain('#c9ccd0', { rough: 0.15, metal: 0.2 }), mats.plain('#1b1b1e', { rough: 0.2, metal: 0.1 })];
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

/**
 * A bar: a counter along a line from a to b on the floor at y, the bar staff's side to the left
 * of a-to-b (seen from above, x right and z down), with a back bar of bottles against the wall
 * `depth` metres behind it if `backBar` is set.
 */
export function barCounter(
  stage: { quality: Quality; mats: Mats; batch: Batch },
  a: Pt,
  b: Pt,
  y: number,
  o: { colour?: string; top?: string; height?: number; width?: number; backBar?: number; seed?: number } = {},
) {
  const { mats, batch } = stage;
  const height = o.height ?? 1.1;
  const width = o.width ?? 0.6;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  // to the left of a-to-b
  const n: Pt = [d[1], -d[0]];
  const off = (p: Pt, k: number): Pt => [p[0] + n[0] * k, p[1] + n[1] * k];
  const body = mats.plain(o.colour ?? '#151517', { rough: 0.7 });
  const top = mats.plain(o.top ?? '#2a2a2e', { rough: 0.35, metal: 0.4 });
  const corners = (p: Pt, q: Pt, w0: number, w1: number) => [off(p, w0), off(q, w0), off(q, w1), off(p, w1)];
  batch.add(body, slab(corners(a, b, 0.04, width - 0.04), y, y + height - 0.04));
  batch.add(top, slab(corners(a, b, -0.06, width), y + height - 0.04, y + height));
  // a brass foot rail on the guests' side
  batch.add(mats.plain('#8a7a4a', { rough: 0.4, metal: 0.8 }), slab(corners(a, b, -0.16, -0.12), y + 0.18, y + 0.22));
  if (o.backBar) {
    const back = width + o.backBar;
    batch.add(body, slab(corners(a, b, back - 0.45, back), y, y + 0.9));
    for (const [k, h] of [
      [0, 0.9],
      [1, 1.35],
      [2, 1.8],
    ] as const) {
      batch.add(top, slab(corners(a, b, back - 0.3, back), y + h, y + h + 0.03));
      bottles(stage, batch, off(a, back - 0.15), off(b, back - 0.15), y + h + 0.03, 0.11, (o.seed ?? 1) + k);
    }
  }
}

/** A level slab over four corners on the floor, between two heights. */
function slab(c: Pt[], y0: number, y1: number) {
  const xs = c.map((p) => p[0]);
  const zs = c.map((p) => p[1]);
  // an axis-aligned counter is a plain box; otherwise build the eight corners
  if (new Set(xs.map((v) => v.toFixed(6))).size <= 2 && new Set(zs.map((v) => v.toFixed(6))).size <= 2) return box(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), y0, y1);
  return prism(c, y0, y1);
}
