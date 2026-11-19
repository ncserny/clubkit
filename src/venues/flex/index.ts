import type { MapData } from '../../engine/city';
import type { VenueModule } from '../../engine/types';
import { build } from './build';
import osm from './osm.json';
import { plan } from './plan';
import { surroundings } from './surroundings';

/** The map is OpenStreetMap as fetched by tools/fetch-osm.mjs (48.2177763, 16.3709090, 450 m). */
export const venue: VenueModule = { plan, map: osm as unknown as MapData, surroundings, build, textureScale: { lite: 0.5 } };
