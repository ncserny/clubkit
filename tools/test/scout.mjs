// Look at the Ministry venue from given places. Deterministic like render.mjs.
// env: BASE, DETAIL, OUT (dir), EXTRA (more of the query string), SHOTS (json file): [{ name, at:[right,in,y], look:[right,in,y], time?, k?, turns?, rise? }]
// Coordinates are site metres (right, in) unless k is set, when they are the courtyard grid (a, b).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5174/';
const DETAIL = process.env.DETAIL ?? 'balanced';
const OUT = process.env.OUT ?? 'out/scout';
const UI = process.env.UI ?? '0';
const EXTRA = process.env.EXTRA ? `&${process.env.EXTRA}` : '';
// a shot with "turns": n is taken n times from the same place, looking a full circle round
const shots = JSON.parse(readFileSync(process.env.SHOTS, 'utf8')).flatMap((s) =>
  s.turns
    ? Array.from({ length: s.turns }, (_, k) => {
        const a = (k / s.turns) * 2 * Math.PI + 0.3;
        return { ...s, name: `${s.name}-${k}`, look: [s.at[0] + 6 * Math.cos(a), s.at[1] + 6 * Math.sin(a), s.at[2] + (s.rise ?? 0)] };
      })
    : [s],
);

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
  // site (right, in) or courtyard grid (a, b) to world x, z
  window.__site = (r, i, k) => {
    if (k) { const c = Math.cos(Math.PI / 12), s = Math.sin(Math.PI / 12); [r, i] = [-3.5 + r * c - i * s, -1.4 + r * s + i * c]; }
    const f = __club.plan.frame; const C = Math.cos(f.rotation), S = Math.sin(f.rotation);
    const lx = r, lz = -i;
    return [f.centre[0] + lx * C + lz * S, f.centre[1] - lx * S + lz * C];
  };
  window.__look = (at, look, k) => {
    const [x, z] = __site(at[0], at[1], k); const [tx, tz] = __site(look[0], look[1], k);
    const dx = tx - x, dy = look[2] - at[2], dz = tz - z;
    __club.pose(x, at[2], z, Math.atan2(-dx, -dz), Math.atan2(dy, Math.hypot(dx, dz)));
  };
})();`;

export default async (page) => {
  mkdirSync(OUT, { recursive: true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: inject });
  await page.goto(`${BASE}?detail=${DETAIL}&ui=${UI}&venue=mos${EXTRA}`);
  const ms = await page.waitFor(`document.documentElement.dataset.cwState === 'ready'`, 600000);
  console.log('ready after', ms, 'ms');
  await page.waitFor(`!!window.__club`, 20000);
  await page.eval(`__step(1)`);
  let time = 'night';
  for (const s of shots) {
    const want = s.time ?? 'night';
    if (want !== time) {
      await page.eval(`(() => { __club.at(${JSON.stringify(want)}); __step(3); })()`);
      time = want;
    }
    const r = await page.eval(`(() => { __look(${JSON.stringify(s.at)}, ${JSON.stringify(s.look)}, ${s.k ? 'true' : 'false'}); __step(${s.steps ?? 20}, ${s.dt ?? 1000 / 60}); return { zone: __club.zone(), where: __club.where(), png: ${UI === '0' ? `document.querySelector('canvas').toDataURL('image/png')` : 'null'} }; })()`);
    const file = `${OUT}/${s.name}.png`;
    if (r.png) writeFileSync(file, Buffer.from(r.png.split(',')[1], 'base64'));
    else await page.shot(file);
    console.log(s.name, r.zone, r.where.map((v) => +v.toFixed(2)).join(' '));
  }
  const errs = page.console.filter((c) => c.type === 'exception' || c.type === 'error');
  if (errs.length) console.log('console errors:', JSON.stringify(errs.slice(0, 5)));
};
