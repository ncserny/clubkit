import type { Pt } from '../../engine/types';
import { djGear, type BoothLayout } from '../../kit';
import type { Kit } from './kit';

/**
 * The gear on the four DJ desks: the kit's DJ equipment (kit/dj.ts). The Box has the `full`
 * layout, four players, two turntables and a mixer; The Baby Box, The Loft and The 103 have
 * `cdjs`, two players and a mixer.
 */
export function boothGear(kit: Kit, room: string, desk: Pt[], top: number, layout: BoothLayout = 'full') {
  djGear(kit.stage(room), desk, top, layout);
}
