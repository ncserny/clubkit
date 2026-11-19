import type { Batch } from '../engine/geom';
import type { Pt } from '../engine/types';
import type { Mats } from './mats';
import { box, panel } from './shapes';

/**
 * Loudspeakers. A cabinet is a black box with a grille on two opposite faces; a stack is
 * cabinets piled into columns, the way a club's main system stands either side of the booth.
 */

/** A cabinet, or a block of them, on a rectangle (x0 < x1, z0 < z1) from y0 to y1, with grilles on the two faces across `faces`. */
export function speakerCabinet(batch: Batch, mats: Mats, x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, faces: 'ns' | 'ew') {
  const shell = mats.plain('#0a0a0b', { rough: 0.6 });
  const grille = mats.grille('#3d3d42', { rough: 0.6, metal: 0.3 });
  batch.add(shell, box(x0, z0, x1, z1, y0, y1));
  const e = 0.012;
  if (faces === 'ns') {
    batch.add(grille, panel([x0 + 0.03, z1 + e], [x1 - 0.03, z1 + e], y0 + 0.03, y1 - 0.03, true));
    batch.add(grille, panel([x1 - 0.03, z0 - e], [x0 + 0.03, z0 - e], y0 + 0.03, y1 - 0.03, true));
  } else {
    batch.add(grille, panel([x0 - e, z0 + 0.03], [x0 - e, z1 - 0.03], y0 + 0.03, y1 - 0.03, true));
    batch.add(grille, panel([x1 + e, z1 - 0.03], [x1 + e, z0 + 0.03], y0 + 0.03, y1 - 0.03, true));
  }
}

/**
 * A stack of cabinets standing at `at` on the floor at y, facing along `facing` (radians about
 * the vertical; 0 faces +z). `columns` across, `rows` high, each cabinet `size` [width, height, depth].
 * A small gap is left between cabinets so the stack reads as boxes, not a slab.
 */
export function speakerStack(stage: { batch: Batch; mats: Mats }, at: Pt, y: number, facing: number, o: { columns?: number; rows?: number; size?: [number, number, number] } = {}) {
  const [w, h, d] = o.size ?? [0.7, 0.7, 0.75];
  const columns = o.columns ?? 2;
  const rows = o.rows ?? 3;
  const across: Pt = [Math.cos(facing), -Math.sin(facing)];
  const square = Math.abs(across[0]) > 0.999 || Math.abs(across[1]) > 0.999;
  if (!square) throw new Error('speakerStack: facing must be a multiple of 90 degrees');
  // cabinets lie in a row across the facing direction
  const alongX = Math.abs(across[0]) > 0.5;
  for (let c = 0; c < columns; c++) {
    const offset = (c - (columns - 1) / 2) * (w + 0.02);
    const cx = at[0] + (alongX ? offset : 0);
    const cz = at[1] + (alongX ? 0 : offset);
    const hw = (alongX ? w : d) / 2;
    const hd = (alongX ? d : w) / 2;
    for (let r = 0; r < rows; r++) speakerCabinet(stage.batch, stage.mats, cx - hw, cz - hd, cx + hw, cz + hd, y + r * (h + 0.015), y + r * (h + 0.015) + h, alongX ? 'ns' : 'ew');
  }
}
