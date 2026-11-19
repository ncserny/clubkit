import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/** The repository, wherever the command was started from. */
const ROOT = fileURLToPath(new URL('.', import.meta.url));
const VENUES = join(ROOT, 'src/venues');

/** Where the built site will live, and the picture for link previews: both optional, both from the environment. */
const SITE_URL = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/?$/, '/') : '';
const SHARE_IMAGE = process.env.SHARE_IMAGE ?? '';

/** The venues as the chooser lists them, read from src/venues/index.ts without running it. */
function catalogue() {
  const source = readFileSync(join(VENUES, 'index.ts'), 'utf8');
  return [...source.matchAll(/\{ id: '([^']+)', name: '([^']+)', city: '([^']+)', text: '([^']+)'(?:, by: '([^']+)')? \}/g)].map(([, id, name, city, text, by]) => ({ id, name, city, text, by }));
}
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** The chooser's cards as markup: what the script draws, written into the page so that it reads without JavaScript. */
function cards(up: string) {
  return catalogue()
    .map((v) => `<a href="${up}${v.id}/"><span class="cw-choose-city">${escape(v.city)}</span><span class="cw-choose-name">${escape(v.name)}</span><span class="cw-choose-text">${escape(v.text)}</span>${v.by ? `<span class="cw-choose-by">Model by ${escape(v.by)}</span>` : ''}</a>`)
    .join('');
}
const LIST = '<div id="cw-choose-list" class="cw-choose-list">';

/** Canonical and Open Graph tags for the page, as far as the environment says where it lives. */
function siteMeta(): Plugin {
  return {
    name: 'clubkit-site-meta',
    transformIndexHtml(html) {
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
      const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
      const tags = [`<meta property="og:type" content="website" />`, `<meta property="og:title" content="${title}" />`, `<meta property="og:description" content="${description}" />`];
      if (SITE_URL) tags.push(`<link rel="canonical" href="${SITE_URL}" />`, `<meta property="og:url" content="${SITE_URL}" />`);
      if (SHARE_IMAGE) tags.push(`<meta property="og:image" content="${SHARE_IMAGE}" />`, `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`, `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:image" content="${SHARE_IMAGE}" />`);
      return html.replace('</head>', `  ${tags.join('\n    ')}\n  </head>`).replace(`${LIST}</div>`, `${LIST}${cards('./')}</div>`);
    },
  };
}

/**
 * Every venue has an address of its own: <site>/berghain/, <site>/flex/. The site is one page,
 * so after the build that page is copied into a folder per venue, with its links to the scripts
 * and styles pointed one folder up and the venue's name in its title. In development the server
 * answers any path with the page already.
 */
function venuePages(): Plugin {
  let out = 'dist';
  return {
    name: 'clubkit-venue-pages',
    apply: 'build',
    configResolved(config) {
      out = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      const listed = catalogue();
      for (const id of readdirSync(VENUES).filter((name) => statSync(join(VENUES, name)).isDirectory())) {
        // the cards lead one folder up from here
        let page = html.replaceAll('"./assets/', '"../assets/').replace(`${LIST}${cards('./')}`, `${LIST}${cards('../')}`);
        // the name, city and line the chooser gives it: a title and an opening that read without JavaScript
        const entry = listed.find((v) => v.id === id);
        if (entry) {
          const title = `${entry.name}, ${entry.city}: 3D Virtual Tour | Clubs Worldwide`;
          page = page
            .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
            .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
            .replace('<h1 id="cw-name"></h1>', `<h1 id="cw-name">${escape(entry.name)}</h1>`)
            .replace('<h2 id="cw-intro-name"></h2>', `<h2 id="cw-intro-name">${escape(entry.name)}, ${escape(entry.city)}</h2>`)
            .replace('<p id="cw-intro-text"></p>', `<p id="cw-intro-text">${escape(entry.text)}</p>`);
        }
        // the venue's own address, where the build was told where the site lives
        if (SITE_URL) page = page.replaceAll(`"${SITE_URL}"`, `"${SITE_URL}${id}/"`);
        mkdirSync(join(out, id), { recursive: true });
        writeFileSync(join(out, id, 'index.html'), page);
      }
    },
  };
}

// Relative paths, so the built site works from any folder on any host.
export default defineConfig({ base: './', plugins: [siteMeta(), venuePages()] });
