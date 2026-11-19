import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

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
      out = config.build.outDir;
    },
    closeBundle() {
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      const catalogue = readFileSync('src/venues/index.ts', 'utf8');
      for (const id of readdirSync('src/venues').filter((name) => statSync(join('src/venues', name)).isDirectory())) {
        // the name and city the chooser gives it, for a title that reads without JavaScript
        const entry = new RegExp(`id: '${id}', name: '([^']+)', city: '([^']+)'`).exec(catalogue);
        let page = html.replaceAll('"./assets/', '"../assets/');
        if (entry) page = page.replace(/<title>[^<]*<\/title>/, `<title>${entry[1]}, ${entry[2]}: 3D Virtual Tour | Clubs Worldwide</title>`);
        mkdirSync(join(out, id), { recursive: true });
        writeFileSync(join(out, id, 'index.html'), page);
      }
    },
  };
}

// Relative paths, so the built site works from any folder on any host.
export default defineConfig({ base: './', plugins: [venuePages()] });
