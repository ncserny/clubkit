import * as THREE from 'three';
import type { Batch } from '../engine/geom';
import type { Pt } from '../engine/types';
import type { Mats } from './mats';
import { cyl, rnd } from './shapes';

/** What stands in the open round a club: trees, bollards, lamp posts. */

/** A tree standing at x, z on y: a trunk and a crown of a few rough lumps. `seed` varies its shape. */
export function tree(batch: Batch, mats: Mats, at: Pt, y: number, height = 7, seed = 1) {
  const [x, z] = at;
  const trunk = mats.plain('#3a2f26', { rough: 1 });
  const leaf = [mats.plain('#2f4a2c', { rough: 1 }), mats.plain('#3a5a33', { rough: 1 })];
  batch.add(trunk, cyl(x, z, 0.16 + height * 0.012, y, y + height * 0.5, 7));
  const lumps = 4 + Math.floor(rnd(seed) * 3);
  for (let i = 0; i < lumps; i++) {
    const a = rnd(seed + i * 3.1) * Math.PI * 2;
    const r = height * (0.2 + 0.1 * rnd(seed + i * 7.7));
    const d = i === 0 ? 0 : height * 0.16;
    batch.add(leaf[i % 2], new THREE.IcosahedronGeometry(r, 1).translate(x + Math.cos(a) * d, y + height * (0.62 + 0.22 * rnd(seed + i * 1.3)), z + Math.sin(a) * d));
  }
}

/** A bollard: a short post with a cap. */
export function bollard(batch: Batch, mats: Mats, at: Pt, y: number, height = 0.6) {
  const iron = mats.plain('#1d1e20', { rough: 0.6, metal: 0.5 });
  batch.add(iron, cyl(at[0], at[1], 0.09, y, y + height, 8));
  batch.add(iron, cyl(at[0], at[1], 0.12, y + height, y + height + 0.06, 8));
}

/** A lamp post with a lit head. Returns nothing: the head is drawn in a shared glow, so light the ground with a light of the plan's. */
export function lampPost(batch: Batch, mats: Mats, at: Pt, y: number, height = 4.4, colour = '#ffd9a0') {
  batch.add(mats.plain('#1c1d1f', { rough: 0.6, metal: 0.5 }), cyl(at[0], at[1], 0.06, y, y + height, 8));
  batch.add(mats.glow(colour), cyl(at[0], at[1], 0.2, y + height, y + height + 0.28, 10));
}

/** A bar stool: a foot, a post, a round seat in a colour. The seat is 0.75 m up. */
export function stool(batch: Batch, mats: Mats, at: Pt, y: number, colour = '#7a1418') {
  const chrome = mats.plain('#8a8d90', { rough: 0.35, metal: 0.9 });
  batch.add(chrome, cyl(at[0], at[1], 0.2, y, y + 0.03, 12));
  batch.add(chrome, cyl(at[0], at[1], 0.03, y + 0.03, y + 0.7, 6));
  batch.add(mats.plain(colour, { rough: 0.5 }), cyl(at[0], at[1], 0.18, y + 0.7, y + 0.76, 14));
}
