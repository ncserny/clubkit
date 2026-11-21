import type { MapData } from '../../engine/city';
import type { VenueModule } from '../../engine/types';
import { build } from './build';
import osm from './osm.json';
import { plan } from './plan';
import { surroundings } from './surroundings';

// On the phone level every painted texture is made at half size, as in the other clubs: a quarter of the memory.
export const venue: VenueModule = { plan, map: osm as unknown as MapData, surroundings, build, textureScale: { lite: 0.5 } };
