import type { VenueModule } from '../engine/types';

/**
 * Every venue the engine can show, by the id that `?venue=` takes. Each is loaded only when
 * asked for, so a venue costs nothing until someone opens it.
 */
export const venues: Record<string, () => Promise<VenueModule>> = {
  mos: () => import('./mos').then((m) => m.venue),
  berghain: () => import('./berghain').then((m) => m.venue),
};

export const DEFAULT_VENUE = 'mos';

/** True for a venue id this build knows. Inherited names such as `constructor` are not venues. */
export const isVenue = (id: string | null | undefined): id is string => !!id && Object.hasOwn(venues, id);
