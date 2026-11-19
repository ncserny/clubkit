import type { Surroundings } from '../../engine/types';

/** OpenStreetMap way of the club itself. It stands on the sunken quay, which the venue draws. */
export const FLEX_ID = 133677620;

/**
 * The inner city: paved from wall to wall, trees along the Ring and the quay road. The canal
 * and its quays are a cut in the plan (`outdoors.cut`), so the city leaves them alone.
 */
export const surroundings: Surroundings = {
  own: [FLEX_ID],
  venueIds: [],
  paved: true,
  streetTreeSpacing: 14,
};
