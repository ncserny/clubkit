import { start } from './engine/app';
import { catalogue, isVenue, venues } from './venues';

/** Which venue: ?venue= in the address, else the one the build was made for, else none: the visitor chooses. */
function chosen() {
  const asked = new URLSearchParams(location.search).get('venue');
  if (isVenue(asked)) return asked;
  const built = import.meta.env.VITE_VENUE as string | undefined;
  return isVenue(built) ? built : null;
}

/** List the venues and wait for a choice. A choice is a link, so it can be opened in a new tab and shared. */
function choose() {
  const list = document.getElementById('cw-choose-list');
  if (!list) return;
  for (const v of catalogue) {
    const a = document.createElement('a');
    const url = new URL(location.href);
    url.searchParams.set('venue', v.id);
    a.href = url.pathname + url.search;
    for (const [cls, text] of [
      ['cw-choose-city', v.city],
      ['cw-choose-name', v.name],
      ['cw-choose-text', v.text],
      ['cw-choose-by', v.by ? `Model by ${v.by}` : ''],
    ]) {
      if (!text) continue;
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      a.append(span);
    }
    list.append(a);
  }
  // the title the page came with stays: it names the collection, and every venue sets its own
  document.documentElement.dataset.cwState = 'choose';
}

const venue = chosen();
if (venue) {
  venues[venue]()
    .then(start)
    .catch((error) => {
      console.error(error);
      document.documentElement.dataset.cwState = 'fallback';
    });
} else choose();
