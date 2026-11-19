// Which rooms are drawn from which, as the Ministry venue works it out: for each whole room, and from each viewpoint. env: BASE
const BASE = process.env.BASE ?? 'http://127.0.0.1:5174/';

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
  await page.goto(`${BASE}?detail=lite&ui=0&venue=mos`);
  await page.waitFor(`document.documentElement.dataset.cwState === 'ready'`, 600000);
  await page.waitFor(`!!window.__club`, 20000);
  await page.eval(`(() => {
    window.__vis = null;
    __club.draw(false);
    const at = [];
    const f = __club.plan.frame; const C = Math.cos(f.rotation), S = Math.sin(f.rotation);
    for (let i = 0; i < __club.plan.viewpoints.length; i++) {
      __club.go(i); __step(40, 50);
      const w = __club.where();
      const dx = w[0] - f.centre[0], dz = w[2] - f.centre[1];
      at.push({ id: __club.plan.viewpoints[i].id, zone: __club.zone(), x: dx * C - dz * S, z: dx * S + dz * C });
    }
    Promise.all([import('/src/engine/visibility.ts'), import('/src/venues/ministry/plan.ts')]).then(([v, p]) => {
      const t0 = Date.now();
      const vis = v.buildVisibility(p.plan, { windows: p.SIGHT_LINES, sees: p.HANGS_IN });
      const built = Date.now() - t0;
      const t1 = Date.now();
      for (let k = 0; k < 2000; k++) { const a = at[k % at.length]; vis.from(a.zone, a.x + (k % 40) * 0.2, a.z + (k % 7) * 0.2); }
      const each = (Date.now() - t1) / 2000;
      const rooms = {};
      for (const r of p.plan.rooms) rooms[r.id] = vis.of(r.id).size;
      const ids = new Set(p.plan.rooms.map((r) => r.id));
      // POINTS: [[room, right, in], ...] asks about other places too
      for (const [room, right, inn] of ${process.env.POINTS ?? '[]'}) at.push({ id: right + ',' + inn, zone: room, x: right, z: -inn });
      const views = at.map((a) => ({ ...a, sees: [...vis.from(ids.has(a.zone) ? a.zone : null, a.x, a.z)] }));
      window.__vis = { count: p.plan.rooms.length, rooms, views, built, each };
    }).catch((e) => { window.__vis = { error: String(e) }; });
    return 0;
  })()`);
  await page.waitFor(`window.__vis !== null`, 60000);
  const r = await page.eval(`window.__vis`);
  if (r.error) return console.log(r.error);
  console.log('rooms', r.count, 'seen from anywhere in each:', JSON.stringify(r.rooms));
  console.log('built in', r.built, 'ms; one answer takes', r.each, 'ms');
  for (const v of r.views) console.log(v.id.padEnd(10), v.zone.padEnd(10), String(v.sees.length).padStart(2), v.sees.join(' '));
};
