import { start } from './engine/app';
import { DEFAULT_VENUE, isVenue, venues } from './venues';

/** Which venue: ?venue= in the address, else the one the build was made for. */
function chosen() {
  const asked = new URLSearchParams(location.search).get('venue');
  if (isVenue(asked)) return asked;
  const built = import.meta.env.VITE_VENUE as string | undefined;
  return isVenue(built) ? built : DEFAULT_VENUE;
}

venues[chosen()]()
  .then(start)
  .catch((error) => {
    console.error(error);
    document.documentElement.dataset.cwState = 'fallback';
  });
