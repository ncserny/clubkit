// What the triangles are at chosen viewpoints. env: BASE, DETAIL, VENUE, VIEWS (comma-separated indices)
const BASE = process.env.BASE ?? 'http://127.0.0.1:5174/';
const DETAIL = process.env.DETAIL ?? 'lite';
const VENUE = process.env.VENUE ?? 'mos';
const VIEWS = (process.env.VIEWS ?? '0,3,4').split(',').map(Number);

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
})();`;

export default async (page) => {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: inject });
  await page.goto(`${BASE}?detail=${DETAIL}&ui=0&venue=${VENUE}`);
  await page.waitFor(`document.documentElement.dataset.cwState === 'ready'`, 600000);
  await page.waitFor(`!!window.__club`, 20000);
  await page.eval(`__step(1)`);
  for (const i of VIEWS) {
    const r = await page.eval(`(() => { __club.draw(false); __club.go(${i}); __step(40, 50); __club.draw(true); __step(1, 50); return { view: __club.plan.viewpoints[${i}].id, info: __club.info(), heaviest: __club.heaviest(14) }; })()`);
    console.log(r.view, JSON.stringify(r.info), 'scene total', r.heaviest.total);
    for (const m of r.heaviest.meshes) console.log('  ', m.triangles, 'x' + m.instances, m.name, m.material, m.at.join(','));
  }
};
