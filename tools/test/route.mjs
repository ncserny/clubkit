// Walk a venue along a list of waypoints through the collision code, and check that the things
// that should stop a walker do. Works for any venue: the route is a JSON file.
//
//   VENUE=flex ROUTE=tools/test/routes/flex.json node tools/test/cdp.mjs tools/test/route.mjs
//
// env: BASE (url of the dev server), VENUE (id), ROUTE (file), DETAIL (lite by default)
//
// The route file, all in the venue's own coordinates (x, z on the floor; `feet` is the floor height to start from):
//   { "walks":   [{ "name": "in from the street", "start": [x, z, feet], "to": [[x, z], [x, z, "the door"]] }],
//     "blocked": [{ "name": "the quay edge", "from": [x, z, feet], "to": [x, z] }] }
// A walk passes when every waypoint is reached; a `blocked` entry passes when the walker is stopped short of `to`.
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const VENUE = process.env.VENUE;
const DETAIL = process.env.DETAIL ?? 'lite';
if (!VENUE || !process.env.ROUTE) throw new Error('set VENUE and ROUTE');
const route = JSON.parse(readFileSync(process.env.ROUTE, 'utf8'));

const run = `((route) => {
  const c = __club, f = c.plan.frame, C = Math.cos(f.rotation), S = Math.sin(f.rotation);
  const W = (x, z) => [f.centre[0] + x * C + z * S, f.centre[1] - x * S + z * C];
  const L = (wx, wz) => { const dx = wx - f.centre[0], dz = wz - f.centre[1]; return [dx * C - dz * S, dx * S + dz * C]; };
  // Step toward each waypoint as the keys would, standing on whatever floor is underfoot after every step.
  const walk = (start, points) => {
    const [wx, wz] = W(start[0], start[1]);
    let p = [wx, start[2] + 1.7, wz];
    const legs = [];
    for (const t of points) {
      const [tx, tz] = W(t[0], t[1]);
      for (let i = 0; i < 4000; i++) {
        const dx = tx - p[0], dz = tz - p[2], d = Math.hypot(dx, dz);
        if (d < 0.25) break;
        const s = Math.min(0.2, d);
        const q = c.move(p, [p[0] + (dx / d) * s, p[1], p[2] + (dz / d) * s]);
        if (Math.hypot(q[0] - p[0], q[2] - p[2]) < 0.01) break;
        const floor = c.floor(q);
        p = [q[0], (floor === null ? p[1] - 1.7 : floor) + 1.7, q[2]];
      }
      const l = L(p[0], p[2]);
      legs.push({ to: t[2] ?? [t[0], t[1]], short: +Math.hypot(l[0] - t[0], l[1] - t[1]).toFixed(2), at: [+l[0].toFixed(1), +(p[1] - 1.7).toFixed(2), +l[1].toFixed(1)], zone: c.zone(p) });
    }
    return legs;
  };
  return {
    walks: (route.walks ?? []).map((w) => ({ name: w.name, legs: walk(w.start, w.to) })),
    blocked: (route.blocked ?? []).map((b) => ({ name: b.name, ...walk(b.from, [b.to])[0] })),
  };
})(${JSON.stringify(route)})`;

export default async (page) => {
  await page.goto(`${BASE}?detail=${DETAIL}&ui=0&venue=${VENUE}`);
  await page.waitFor("document.documentElement.dataset.cwState === 'ready' && !!window.__club");
  const result = await page.eval(run);
  let failed = 0;
  for (const w of result.walks) {
    for (const leg of w.legs) {
      const ok = leg.short < 0.4;
      if (!ok) failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${w.name}: to ${JSON.stringify(leg.to)} ${ok ? '' : `stopped ${leg.short} m short `}at ${JSON.stringify(leg.at)} in ${leg.zone}`);
    }
  }
  for (const b of result.blocked) {
    const ok = b.short > 0.5;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${b.name}: ${ok ? `stopped ${b.short} m short` : 'walked straight through'} at ${JSON.stringify(b.at)} in ${b.zone}`);
  }
  const errors = page.console.filter((m) => m.type === 'exception' || m.type === 'error');
  if (errors.length) {
    failed++;
    console.log('FAIL console errors', JSON.stringify(errors.slice(0, 3)));
  }
  console.log(failed ? `${failed} FAILED` : 'ALL ROUTE CHECKS PASSED');
  if (failed) throw new Error(`${failed} route checks failed`);
};
