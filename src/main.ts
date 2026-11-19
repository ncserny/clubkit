import { start } from './engine/app';
import { catalogue, isVenue, venues } from './venues';

/** The venue named by the last part of the path: /berghain/, /projects/clubs/flex. */
function fromPath() {
  const last = location.pathname.split('/').filter(Boolean).pop();
  return isVenue(last) ? last : null;
}

/**
 * Which venue: the one the path ends in (<site>/berghain/), else ?venue= (the older form, still
 * read), else the one the build was made for, else none: the visitor chooses.
 */
function chosen() {
  const path = fromPath();
  if (path) return path;
  const asked = new URLSearchParams(location.search).get('venue');
  if (isVenue(asked)) return asked;
  const built = import.meta.env.VITE_VENUE as string | undefined;
  return isVenue(built) ? built : null;
}

/** List the venues and wait for a choice. A choice is a link, so it can be opened in a new tab and shared. */
function choose() {
  const list = document.getElementById('cw-choose-list');
  if (!list) return;
  // the build may have written the cards already; these replace them
  list.replaceChildren();
  for (const v of catalogue) {
    const a = document.createElement('a');
    // a folder of its own under wherever the chooser is served from
    a.href = `${location.pathname.replace(/[^/]*$/, '')}${v.id}/`;
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
  // a link back to the site this is part of, if the build names one
  const site = document.getElementById('cw-site') as HTMLAnchorElement | null;
  const name = import.meta.env.VITE_SITE_NAME as string | undefined;
  const homeUrl = import.meta.env.VITE_SITE_HOME as string | undefined;
  if (site && name && homeUrl) {
    site.textContent = name;
    site.href = homeUrl;
    site.hidden = false;
  }
  document.documentElement.dataset.cwState = 'choose';
}

const venue = chosen();
// the way back to the chooser: one folder up from a venue's own address
const home = document.getElementById('cw-home') as HTMLAnchorElement | null;
if (home) home.href = fromPath() ? '../' : location.pathname;
if (venue) {
  venues[venue]()
    .then(start)
    .catch((error) => {
      console.error(error);
      document.documentElement.dataset.cwState = 'fallback';
    });
} else choose();
