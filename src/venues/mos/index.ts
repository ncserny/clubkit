import type { MapData } from '../../engine/city';
import type { VenueModule } from '../../engine/types';
import { build } from './build';
import osm from './osm.json';
import { GUESS, plan } from './plan';
import { LEFT_FLANK_ID, surroundings } from './surroundings';

/**
 * The map is OpenStreetMap as fetched by tools/fetch-osm.mjs, with two corrections:
 * the neighbour on the left has no height in the map, and the fence the map draws along the
 * courtyard's street side is the boundary the venue draws itself, gates and all.
 */
const map = osm as unknown as MapData;
const flank = map.buildings.find((b) => b.id === LEFT_FLANK_ID);
if (flank) flank.h = GUESS.leftFlankHeight;
const corner = plan.frame;
const onBoundary = (x: number, z: number) => {
  const dx = x - corner.centre[0];
  const dz = z - corner.centre[1];
  const right = dx * Math.cos(corner.rotation) - dz * Math.sin(corner.rotation);
  const inn = -(dx * Math.sin(corner.rotation) + dz * Math.cos(corner.rotation));
  return right > -6 && right < 20 && inn > -4 && inn < 7;
};
map.fences = map.fences.filter((f) => !f.p.every(([x, z]) => onBoundary(x, z)));

// On the phone level every painted texture is made at half size: a quarter of the memory.
export const venue: VenueModule = { plan, map, surroundings, build, textureScale: { lite: 0.5 } };
