// Draw calls, triangles and texture memory at each viewpoint of a venue. Deterministic like render.mjs.
// env: BASE, DETAIL, VENUE
const BASE = process.env.BASE ?? 'http://127.0.0.1:5174/';
const DETAIL = process.env.DETAIL ?? 'lite';
const VENUE = process.env.VENUE ?? 'mos';

const inject = `(() => {
  let now = 0;
  let q = [];
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.__step = (n = 1, ms = 1000 / 60) => {
    for (let i = 0; i < n; i++) { now += ms; const cbs = q; q = []; for (const cb of cbs) cb(now); }
    return now;
  };
  window.AudioContext = function () { throw new Error('audio disabled for capture'); };
  let s = 12345;
  Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
})();`;

export default async (page) => {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: inject });
  await page.goto(`${BASE}?detail=${DETAIL}&ui=0&venue=${VENUE}`);
  await page.waitFor(`document.documentElement.dataset.cwState === 'ready'`, 600000);
  await page.waitFor(`!!window.__club`, 20000);
  await page.eval(`__step(1)`);
  const rows = await page.eval(`(() => {
    const out = [];
    const views = __club.plan.viewpoints;
    for (let i = 0; i < views.length; i++) {
      __club.draw(false);
      __club.go(i);
      __step(40, 50);
      __club.draw(true);
      __step(1, 50);
      const info = __club.info();
      out.push({ view: views[i].id, zone: __club.zone(), calls: info.calls, triangles: info.triangles });
    }
    return { detail: ${JSON.stringify(DETAIL)}, textures: __club.textureMemory(), views: out };
  })()`);
  console.log(JSON.stringify(rows));
  const errs = page.console.filter((c) => c.type === 'exception' || c.type === 'error');
  if (errs.length) console.log('console errors:', JSON.stringify(errs.slice(0, 5)));
};
