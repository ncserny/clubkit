import type { MapData } from '../../engine/city';
import type { VenueModule } from '../../engine/types';
import { build } from './build';
import osm from './osm.json';
import { plan } from './plan';
import { surroundings } from './surroundings';

export const venue: VenueModule = { plan, map: osm as unknown as MapData, surroundings, build };
