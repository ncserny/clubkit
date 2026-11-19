// Walking, collision and input checks against the engine build of a venue (Berghain).
// Virtual clock and manual frames, so every run is the same. env: BASE, OUT
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5174/';
const OUT = process.env.OUT ?? 'out/navtest';

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

const helpers = `(() => {
  const c = __club, f = c.plan.frame, C = Math.cos(f.rotation), S = Math.sin(f.rotation);
  const W = (x, z) => [f.centre[0] + x * C + z * S, f.centre[1] - x * S + z * C];
  const L = (wx, wz) => { const dx = wx - f.centre[0], dz = wz - f.centre[1]; return [dx * C - dz * S, dx * S + dz * C]; };
  const key = (type, k, mods = {}) => window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true, ...mods }));
  // Walk with the real keys: hold W, turn towards each waypoint (venue coordinates) every frame.
  const walk = (points, opts = {}) => {
    const log = [];
    key('keydown', 'w');
    for (const [x, z, name] of points) {
      const [tx, tz] = W(x, z);
      let n = 0, reached = false, best = Infinity, stall = 0;
      while (n++ < (opts.max ?? 900)) {
        const w = c.where();
        const d = Math.hypot(tx - w[0], tz - w[2]);
        if (d < (opts.near ?? 0.45)) { reached = true; break; }
        if (d < best - 0.01) { best = d; stall = 0; } else if (++stall > 40) break;
        c.pose(w[0], w[1], w[2], Math.atan2(-(tx - w[0]), -(tz - w[2])), 0);
        __step(1, 50);
      }
      const w = c.where();
      const l = L(w[0], w[2]);
      log.push({ to: name ?? [x, z], reached, frames: n, at: [+l[0].toFixed(2), +(w[1] - 1.7).toFixed(2), +l[1].toFixed(2)], zone: c.zone() });
      if (!reached && !opts.keepGoing) break;
    }
    key('keyup', 'w');
    __step(12, 50);
    return log;
  };
  // Straight-line walk through the collision code alone, in venue coordinates; returns where it stops.
  const push = (from, to, feet) => {
    let [x, z] = W(from[0], from[1]);
    const [tx, tz] = W(to[0], to[1]);
    let y = feet + 1.7;
    for (let i = 0; i < 2000; i++) {
      const d = Math.hypot(tx - x, tz - z);
      if (d < 0.05) break;
      const k = Math.min(0.1, d) / d;
      const r = c.move([x, y, z], [x + (tx - x) * k, y, z + (tz - z) * k]);
      if (Math.hypot(r[0] - x, r[2] - z) < 1e-4) break;
      x = r[0]; z = r[2];
      const fl = c.floor([x, y, z]);
      if (fl !== null && y - 1.7 - fl < 0.76) y = fl + 1.7;
    }
    const l = L(x, z);
    return { at: [+l[0].toFixed(2), +(y - 1.7).toFixed(2), +l[1].toFixed(2)], zone: c.zone([x, y, z]) };
  };
  window.T = { W, L, key, walk, push };
})()`;

export default async (page) => {
  mkdirSync(OUT, { recursive: true });
  const results = {};
  const check = (name, pass, detail) => {
    results[name] = { pass: !!pass, detail };
    console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail));
  };
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: inject });
  await page.goto(`${BASE}?detail=lite&venue=berghain`);
  await page.waitFor(`document.documentElement.dataset.cwState === 'ready'`, 600000);
  await page.waitFor(`!!window.__club`, 20000);
  await page.eval(`__step(1)`);
  await page.eval(helpers);
  // frames are drawn in software here; nothing below looks at them, so they are not drawn
  await page.eval(`__club.draw?.(false)`);
  const ev = (js) => page.eval(`JSON.stringify((() => { ${js} })())`).then((s) => (s === undefined ? undefined : JSON.parse(s)));

  /* ---- the intro card and the number keys ---- */
  const s0 = await ev(`return __club.state()`);
  await ev(`T.key('keydown', '5'); T.key('keyup', '5'); __step(3); return 0`);
  const s1 = await ev(`return __club.state()`);
  check('number key behind the intro card starts the visit', s0.intro && !s0.begun && !s1.intro && s1.begun && s1.pressed === 'cloak', { before: s0, after: s1 });

  /* ---- Ctrl+L, Cmd+L, Alt+L are the browser's ---- */
  const t0 = await ev(`return __club.state().time`);
  await ev(`T.key('keydown', 'l', { ctrlKey: true }); T.key('keyup', 'l', { ctrlKey: true }); T.key('keydown', 'l', { metaKey: true }); T.key('keydown', 'l', { altKey: true }); T.key('keydown', '3', { ctrlKey: true }); __step(2); return 0`);
  const t1 = await ev(`return __club.state()`);
  await ev(`T.key('keydown', 'l'); T.key('keyup', 'l'); __step(2); return 0`);
  const t2 = await ev(`return __club.state().time`);
  await ev(`T.key('keydown', 'l'); T.key('keyup', 'l'); __step(2); return 0`);
  const t3 = await ev(`return __club.state().time`);
  check('Ctrl/Cmd/Alt+L leave the time alone, plain L changes it', t0 === 'night' && t1.time === 'night' && t1.pressed === 'cloak' && t2 === 'morning' && t3 === 'night', { t0, afterModified: t1.time, afterL: t2, afterLAgain: t3 });

  /* ---- Q and E ---- */
  const qe = await ev(`
    const out = {};
    __club.go(7); __step(2);
    out.mainBefore = __club.where()[1];
    T.key('keydown', 'q'); __step(120, 50); T.key('keyup', 'q');
    out.mainAfterQ = __club.where()[1];
    T.key('keydown', 'e'); __step(120, 50); T.key('keyup', 'e');
    out.mainAfterE = __club.where()[1]; out.mainZone = __club.zone();
    __club.go(8); __step(2);
    out.panoBefore = __club.where()[1];
    T.key('keydown', 'e'); __step(120, 50); T.key('keyup', 'e');
    T.key('keydown', 'q'); __step(120, 50); T.key('keyup', 'q');
    out.panoAfter = __club.where()[1]; out.panoZone = __club.zone();
    __club.go(1); __step(2);
    T.key('keydown', 'q'); __step(20, 50); T.key('keyup', 'q');
    out.queueAfterQ = __club.where()[1];
    T.key('keydown', 'e'); __step(200, 50); T.key('keyup', 'e');
    out.queueAfterE = __club.where()[1];
    return out;`);
  check('Q and E do nothing indoors', qe.mainBefore === qe.mainAfterQ && qe.mainBefore === qe.mainAfterE && qe.mainZone === 'main' && qe.panoBefore === qe.panoAfter && qe.panoZone === 'panorama', qe);
  check('Q rises and E lands at eye height outdoors', qe.queueAfterQ > 9 && Math.abs(qe.queueAfterE - 1.7) < 1e-6, qe);

  /* ---- E over a roof stops on the roof, and flying low into the building is stopped ---- */
  const roof = await ev(`
    const [x, z] = T.W(-12, 0);
    __club.pose(x, 60, z, 0, -0.4); __step(2);
    T.key('keydown', 'e'); __step(200, 50); T.key('keyup', 'e');
    const y = __club.where()[1];
    return { y, zone: __club.zone() };`);
  check('E over the roof lands on the roof, not in the hall', Math.abs(roof.y - (22.5 + 1.7)) < 1e-6 && roof.zone !== 'main', roof);

  /* ---- the walk: queue, door, cloakroom, stairs, main floor, bar, Panorama Bar ---- */
  const L2 = 38.25, DOOR_Z = -3.16, CROSS = -24.5, IN_X = -37.65;
  await ev(`__club.go(1); __step(2); return 0`);
  const route = await ev(`return T.walk([
    [-50, -5.8, 'door viewpoint'],
    [${-L2 - 3}, ${DOOR_Z}, 'in front of the door'],
    [${IN_X + 1.6}, ${DOOR_Z}, 'inside the door'],
    [-33.5, -16.5, 'cloakroom, by the foot of the stairs'],
    [${CROSS - 0.8}, -16.5, 'foot of the stairs'],
    [-16.2, -16.5, 'top of the stairs'],
    [-14, -12, 'main floor'],
    [-22, -10.75, 'main floor by the west opening'],
    [-27.5, -10.75, 'bar'],
    [-28.5, 10, 'bar, between the pipe seats'],
    [-25.4, 13.5, 'bar, east end'],
    [-25.4, 16.4, 'foot of the Panorama stairs'],
    [-36.3, 16.4, 'top of the Panorama stairs'],
    [-36.3, 14, 'landing, clear of the stair well'],
    [-34, 12, 'Panorama Bar'],
    [-33, 0, 'Panorama Bar floor'],
    [-30, -13, 'in front of the booth'],
    [-25.6, -13, 'past the end of the counter'],
    [-25.6, -16.15, 'door to the gallery'],
    [-12, -16.15, 'gallery over the main floor'],
  ])`);
  const last = route[route.length - 1];
  const zones = route.map((r) => r.zone);
  check('walk from the queue to Panorama Bar and the gallery', route.length === 20 && route.every((r) => r.reached) && last.at[1] === 11.5, route);
  check('zones along the walk', ['doorstep', 'cloak', 'main', 'bar', 'panorama'].every((z) => zones.includes(z)), zones);
  await page.eval(`(() => { __club.draw?.(true); __step(3, 50); })()`);
  await page.shot(`${OUT}/walk-end-gallery.png`);
  await page.eval(`__club.draw?.(false)`);

  /* ---- and the other way down to the ground floor ---- */
  await ev(`__club.go(4); __step(2); return 0`);
  // the counter and the coat rails are in the way: round the end of the counter, then behind the rails
  const down = await ev(`return T.walk([[-31, -5.5, 'end of the counter'], [-25.4, -5, 'behind the coat rails'], [-25.4, 3, 'at the opening'], [-22, 3, 'ground floor'], [-9.5, 1, 'between the columns']])`);
  check('walk from the cloakroom to the ground floor', down.every((r) => r.reached) && down[down.length - 1].zone === 'ground', down);

  /* ---- captions follow the room ---- */
  const cap = await ev(`
    const out = [];
    __club.go(4); __step(2); out.push(__club.state());
    T.walk([[-31, -5.5], [-25.4, -5], [-25.4, 3], [-21, 3]]); out.push(__club.state());
    __club.go(7); __step(2); out.push(__club.state());
    T.walk([[-22, -10.75], [-28, -10.75]]); out.push(__club.state());
    __club.go(2); __step(2); out.push(__club.state());
    T.walk([[${-L2 - 3}, ${DOOR_Z}], [${IN_X + 1.6}, ${DOOR_Z}]]); out.push(__club.state());
    return out.map((s) => [s.caption, s.pressed]);`);
  check(
    'captions follow the room, and a viewpoint button is unpressed once you leave it',
    JSON.stringify(cap) === JSON.stringify([['Cloakroom', 'cloak'], ['Under the main floor', null], ['Berghain main floor', 'main'], ['The bar behind the glass', null], ['The door', 'door'], ['Cloakroom', null]]),
    cap,
  );

  /* ---- collision, through the collision code alone ---- */
  const col = await ev(`return {
    booth: T.push([-12, 0], [-0.8, 0], 4.5),
    column: T.push([-10, 3], [-12.75, 3.0], 4.5),
    hallColumn: T.push([-19.125, 10], [-19.125, 17.9], 4.5),
    speaker: T.push([-9, -12], [-5.2, -12], 4.5),
    crossWall: T.push([-12, 0], [-30, 0], 4.5),
    crossWallFromBar: T.push([-28, 0], [-12, 0], 4.5),
    endWall: T.push([-12, 6], [10, 6], 4.5),
    longWall: T.push([-12, 6], [-12, 30], 4.5),
    facadeFromOutside: T.push([-42, 8], [-30, 8], 0),
    facadeFromInside: T.push([-33, 8], [-50, 8], 0),
    doorFromOutside: T.push([-50, ${DOOR_Z}], [-33, ${DOOR_Z}], 0),
    groundColumn: T.push([-16, -3.2], [-10, -3.2], 0),
    cloakCounter: T.push([-33, 6], [-25.5, 6], 0),
    fence: T.push([-50, 8], [-42, 10], 0),
    barrier: T.push([-70, -8.2], [-70, 0], 0),
    sculpture: T.push([-28.5, -40], [-28.5, -20], 0),
    galleryEdge: T.push([-12, -16.15], [-12, -10], 11.5),
    podiumUp: T.push([-16.5, -5], [-16.5, -8], 4.5),
    stairUnderside: T.push([-20, -16.5], [-22.5, -16.5], 4.5),
  }`);
  const within = (v, a, b) => v >= a && v <= b;
  check('DJ booth stops a walker', col.booth.at[0] < -2 && col.booth.zone === 'main', col.booth);
  check('speaker stack stops a walker', col.speaker.at[0] < -6.3, col.speaker);
  check('hall column stops a walker', col.hallColumn.at[2] < 17.6, col.hallColumn);
  check('cross wall holds from the hall', col.crossWall.at[0] > CROSS + 0.5 && col.crossWall.zone === 'main', col.crossWall);
  check('cross wall holds from the bar', col.crossWallFromBar.at[0] < CROSS - 0.5 && col.crossWallFromBar.zone === 'bar', col.crossWallFromBar);
  check('end wall of the hall holds', col.endWall.at[0] < -0.85 && col.endWall.zone === 'main', col.endWall);
  check('long wall of the hall holds', col.longWall.at[2] < 18.1 && col.longWall.zone === 'main', col.longWall);
  check('facade holds from outside', within(col.facadeFromOutside.at[0], -L2 - 1, -L2 - 0.25) && col.facadeFromOutside.zone !== 'cloak', col.facadeFromOutside);
  check('facade holds from inside', col.facadeFromInside.at[0] > IN_X + 0.25 && col.facadeFromInside.zone === 'cloak', col.facadeFromInside);
  check('the door lets a walker in', col.doorFromOutside.zone === 'cloak' && col.doorFromOutside.at[0] > -34, col.doorFromOutside);
  check('ground floor column stops a walker', col.groundColumn.at[0] < -13.2, col.groundColumn);
  check('cloakroom counter stops a walker', col.cloakCounter.at[0] < -26, col.cloakCounter);
  check('forecourt fence stops a walker', col.fence.at[0] < -45.4, col.fence);
  check('crowd barrier stops a walker', col.barrier.at[2] < -5, col.barrier);
  check('sculpture stops a walker', col.sculpture.at[2] < -29, col.sculpture);
  check('no walking off the gallery', col.galleryEdge.at[1] === 11.5 && col.galleryEdge.at[2] < -15.1, col.galleryEdge);
  check('a podium can be stepped onto', col.podiumUp.at[1] === 5.1, col.podiumUp);

  /* ---- city buildings, trees and fences out of doors ---- */
  const city = await ev(`
    const c = __club, f = c.plan.frame;
    const solid = (x, z) => c.floor([x, 1.7, z]) === null;
    const found = [];
    for (let x = -300; x <= 300 && found.length < 6; x += 12) for (let z = -300; z <= 300 && found.length < 6; z += 12) {
      if (Math.hypot(x - f.centre[0], z - f.centre[1]) < 110 || !solid(x, z)) continue;
      // open ground 25 m to one side?
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let free = null;
        for (let k = 1; k <= 40; k++) if (!solid(x + dx * k, z + dz * k)) { free = [x + dx * (k + 6), z + dz * (k + 6)]; break; }
        if (!free || solid(free[0], free[1])) continue;
        let p = [free[0], 1.7, free[1]];
        for (let i = 0; i < 800; i++) {
          const d = Math.hypot(x - p[0], z - p[2]);
          if (d < 0.3) break;
          const r = c.move(p, [p[0] + (x - p[0]) / d * 0.15, 1.7, p[2] + (z - p[2]) / d * 0.15]);
          if (Math.hypot(r[0] - p[0], r[2] - p[2]) < 1e-4) break;
          p = r;
        }
        // the same line flown at 5 m and at 120 m
        const fly = (y) => { let q = [free[0], y, free[1]]; for (let i = 0; i < 800; i++) { const d = Math.hypot(x - q[0], z - q[2]); if (d < 0.3) return true; const r = c.move(q, [q[0] + (x - q[0]) / d * 0.15, y, q[2] + (z - q[2]) / d * 0.15]); if (Math.hypot(r[0] - q[0], r[2] - q[2]) < 1e-4) return false; q = r; } return false; };
        found.push({ building: [x, z], from: free.map((v) => +v.toFixed(1)), stoppedAt: [+p[0].toFixed(2), +p[2].toFixed(2)], stopped: !solid(p[0], p[2]) && Math.hypot(x - p[0], z - p[2]) > 0.5, lowFlightStopped: !fly(5), highFlightPasses: fly(120) });
        break;
      }
    }
    return found;`);
  check('city buildings stop walkers and low fliers; high flight passes over', city.length >= 4 && city.every((c) => c.stopped && c.highFlightPasses) && city.filter((c) => c.lowFlightStopped).length >= city.length - 1, city);

  /* ---- the wheel ---- */
  const wheel = await ev(`
    const canvas = document.getElementById('cw-canvas');
    const roll = (n, dy) => { for (let i = 0; i < n; i++) { canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true })); } __step(2); };
    const out = {};
    // on the forecourt, looking square at the facade, well away from the door
    let [x, z] = T.W(-42, 9);
    const yawTo = (tx, tz) => { const [a, b] = T.W(tx, tz); const w = __club.where(); return Math.atan2(-(a - w[0]), -(b - w[2])); };
    __club.pose(x, 1.7, z, 0, 0); __club.pose(x, 1.7, z, yawTo(-30, 9), 0); __step(2);
    roll(40, -100);
    let w = __club.where(); out.facade = { at: T.L(w[0], w[2]).map((v) => +v.toFixed(2)), y: w[1], zone: __club.zone() };
    // on the main floor, looking down at 45 degrees and rolling forwards
    __club.go(7); __step(2);
    [x, z] = T.W(-12, 0);
    __club.pose(x, 6.2, z, 0, -0.8); __club.pose(x, 6.2, z, yawTo(-3, 0), -0.8); __step(2);
    roll(40, -100);
    w = __club.where(); out.floor = { at: T.L(w[0], w[2]).map((v) => +v.toFixed(2)), y: +w[1].toFixed(3), zone: __club.zone() };
    // and up at the ceiling
    __club.go(8); __step(2);
    w = __club.where(); __club.pose(w[0], w[1], w[2], w[3], 1.2); __step(2);
    roll(60, -100);
    w = __club.where(); out.ceiling = { y: +w[1].toFixed(3), zone: __club.zone() };
    // out of doors, diving at the ground
    [x, z] = T.W(-70, -20);
    __club.pose(x, 20, z, 0, -1.2); __step(2);
    roll(40, -100);
    w = __club.where(); out.dive = { y: +w[1].toFixed(3), zone: __club.zone() };
    return out;`);
  check('wheel does not pass the facade', within(wheel.facade.at[0], -L2 - 1, -L2 - 0.25) && wheel.facade.zone !== 'cloak', wheel.facade);
  check('wheel does not pass the floor or the booth indoors', wheel.floor.y === 6.2 && wheel.floor.at[0] < -2 && wheel.floor.zone === 'main', wheel.floor);
  check('wheel does not pass the ceiling', wheel.ceiling.y === 13.2 && wheel.ceiling.zone === 'panorama', wheel.ceiling);
  check('wheel dive stops at eye height', Math.abs(wheel.dive.y - 1.7) < 1e-6, wheel.dive);

  /* ---- strobe ---- */
  const strobe = await ev(`
    const bpm = __club.plan.show.bpm, per = 60 / bpm, N = 64 * 400;
    const on = []; let last = 0;
    for (let i = 0; i < N; i++) { const b = i / 400; const v = __club.strobe(b); if (v && !last) on.push(b * per); last = v; }
    let worst = 0;
    for (let i = 0; i < on.length; i++) { let n = 0; for (let j = i; j < on.length && on[j] < on[i] + 1; j++) n++; if (n > worst) worst = n; }
    const gaps = on.slice(1).map((t, i) => t - on[i]).filter((g) => g < 2);
    return { bpm, flashesIn64Beats: on.length, mostInAnySecond: worst, shortestGap: gaps.length ? +Math.min(...gaps).toFixed(3) : null, rateHz: gaps.length ? +(1 / Math.min(...gaps)).toFixed(2) : 0, show: __club.plan.show.strobe };`);
  check('strobe stays under three flashes a second', strobe.flashesIn64Beats > 0 && strobe.mostInAnySecond < 3 && strobe.rateHz < 3, strobe);

  const errs = page.console.filter((c) => c.type === 'exception' || c.type === 'error');
  check('no console errors', errs.length === 0, errs.slice(0, 5));
  const failed = Object.entries(results).filter(([, r]) => !r.pass).map(([n]) => n);
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  console.log(failed.length ? `FAILED: ${failed.length}` : `ALL ${Object.keys(results).length} CHECKS PASSED`);
};
