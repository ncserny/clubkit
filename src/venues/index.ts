import type { VenueModule } from '../engine/types';

/**
 * Every venue the engine can show, by the id that `?venue=` takes. Each is loaded only when
 * asked for, so a venue costs nothing until someone opens it.
 */
export const venues: Record<string, () => Promise<VenueModule>> = {
  mos: () => import('./mos').then((m) => m.venue),
  berghain: () => import('./berghain').then((m) => m.venue),
  flex: () => import('./flex').then((m) => m.venue),
};

/**
 * What the chooser says about each venue, in the order it lists them. Kept here so that choosing
 * loads no venue. `by` is who made the model; leave it out where no name goes with it.
 */
export const catalogue: { id: string; name: string; city: string; text: string; by?: string }[] = [
  { id: 'berghain', name: 'Berghain', city: 'Berlin', text: 'The former power station in Friedrichshain: the queue, the door, the main floor and Panorama Bar.', by: 'Nader Cserny' },
  { id: 'mos', name: 'Ministry of Sound', city: 'London', text: '103 Gaunt Street: courtyard, tunnel, The 103, The Box and the rooms upstairs.', by: 'Tim, Manchester' },
  { id: 'flex', name: 'Flex', city: 'Vienna', text: 'On the Donaukanal: down the steps from the bridge, through the café, into the hall under the road.', by: 'Nader Cserny' },
];

/** True for a venue id this build knows. Inherited names such as `constructor` are not venues. */
export const isVenue = (id: string | null | undefined): id is string => !!id && Object.hasOwn(venues, id);
