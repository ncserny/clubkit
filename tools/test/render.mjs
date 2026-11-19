// Deterministic render capture: virtual clock, manual animation frames, no audio.
// env: BASE (url), HOOK (__bh | __club), DETAIL (lite|balanced|ultra), OUT (dir), TIME (morning), EXTRA (query string)
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const HOOK = process.env.HOOK ?? '__bh';
const DETAIL = process.env.DETAIL ?? 'lite';
const OUT = process.env.OUT ?? 'out/render';
const TIME = process.env.TIME ?? '';
const EXTRA = process.env.EXTRA ?? '';
// how many viewpoints to capture; every one the venue has if not set
const VIEWS = process.env.VIEWS ? Number(process.env.VIEWS) : null;
const SEED = Number(process.env.SEED ?? 12345);

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
  let s = ${SEED};
  // PIN_NOISE: the ambient-occlusion pass builds its noise texture from Math.random. Give it a stream of
  // its own, so the texture does not depend on how many objects were created before it.
  let n = 4242;
  const pin = ${process.env.PIN_NOISE ? 'true' : 'false'};
  Math.random = () => {
    if (pin && /SimplexNoise/.test(new Error().stack)) { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }
    s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296;
  };
})();`;

export default async (page) => {
  mkdirSync(OUT, { recursive: true });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: inject });
  const url = `${BASE}?detail=${DETAIL}&ui=0${TIME ? `&time=${TIME}` : ''}${EXTRA ? `&${EXTRA}` : ''}`;
  await page.goto(url);
  const ms = await page.waitFor(`document.documentElement.dataset.bhState === 'ready' || document.documentElement.dataset.cwState === 'ready'`, 600000);
  console.log('ready after', ms, 'ms', url);
  await page.waitFor(`!!window.${HOOK}`, 20000);
  // one frame to start the loop and the clock
  await page.eval(`__step(1)`);
  const stamps = [
    ['a', 3, 1000 / 60],
    ['b', 1, 3300],
    ['c', 1, 9100],
  ];
  const views = VIEWS ?? (await page.eval(`${HOOK}.plan.viewpoints.length`));
  for (let i = 0; i < views; i++) {
    for (const [tag, n, dt] of stamps) {
      const data = await page.eval(`(() => { ${HOOK}.go(${i}); __step(${n}, ${dt}); return document.querySelector('canvas').toDataURL('image/png'); })()`);
      const file = `${OUT}/v${i}${tag}.png`;
      writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    }
    console.log('view', i, 'captured');
  }
  const errs = page.console.filter((c) => c.type === 'exception' || c.type === 'error');
  if (errs.length) console.log('console errors:', JSON.stringify(errs.slice(0, 5)));
};
