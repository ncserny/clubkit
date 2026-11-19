// Ministry of Sound: the entrance walk from the Gaunt Street pavement to The Box with the real keys,
// collision probes, the ten viewpoints and both times of day. Virtual clock, so every run is the same.
// env: BASE, OUT (dir for screenshots), DETAIL
import { mkdirSync, writeFileSync, statSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5174/';
const OUT = process.env.OUT ?? 'out/moswalk';
const DETAIL = process.env.DETAIL ?? 'balanced';
// PARTS: walk (the entrance route, with screenshots), checks (collision, keys, strobe; no screenshots), views (viewpoints and crest screenshots)
const PARTS = (process.env.PARTS ?? 'walk,checks,views').split(',');
const part = (p) => PARTS.includes(p);

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

// Points are site metres [right, in], or the courtyard grid [a, b, 'k'].
const helpers = `(() => {
  const c = __club, f = c.plan.frame, C = Math.cos(f.rotation), S = Math.sin(f.rotation);
  const c15 = Math.cos(Math.PI / 12), s15 = Math.sin(Math.PI / 12);
  const site = (p) => (p[2] === 'k' ? [-3.5 + p[0] * c15 - p[1] * s15, -1.4 + p[0] * s15 + p[1] * c15] : [p[0], p[1]]);
  const W = (p) => { const [r, i] = site(p); const x = r, z = -i; return [f.centre[0] + x * C + z * S, f.centre[1] - x * S + z * C]; };
  const L = (wx, wz) => { const dx = wx - f.centre[0], dz = wz - f.centre[1]; const x = dx * C - dz * S, z = dx * S + dz * C; return [+x.toFixed(2), +(-z).toFixed(2)]; };
  const key = (type, k, mods = {}) => window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true, ...mods }));
  const here = () => { const w = c.where(); return { at: L(w[0], w[2]), feet: +(w[1] - 1.7).toFixed(2), zone: c.zone(), caption: c.state().caption }; };
  // Hold W and turn towards the point every frame, as someone steering with the mouse would.
  const walkTo = (p, opts = {}) => {
    const [tx, tz] = W(p);
    let n = 0, reached = false, best = Infinity, stall = 0;
    key('keydown', 'w');
    while (n++ < (opts.max ?? 900)) {
      const w = c.where();
      const d = Math.hypot(tx - w[0], tz - w[2]);
      if (d < (opts.near ?? 0.4)) { reached = true; break; }
      if (d < best - 0.01) { best = d; stall = 0; } else if (++stall > 40) break;
      c.pose(w[0], w[1], w[2], Math.atan2(-(tx - w[0]), -(tz - w[2])), 0);
      __step(1, 50);
    }
    key('keyup', 'w');
    __step(10, 50);
    return { reached, frames: n, ...here() };
  };
  const lookAt = (p, y = 1.7) => { const [tx, tz] = W(p); const w = c.where(); const dx = tx - w[0], dz = tz - w[2]; c.pose(w[0], w[1], w[2], Math.atan2(-dx, -dz), Math.atan2(y - w[1], Math.hypot(dx, dz))); __step(6, 50); };
  // Straight-line walk through the collision code alone; returns where it stops.
  const push = (from, to, feet = 0) => {
    let [x, z] = W(from);
    const [tx, tz] = W(to);
    let y = feet + 1.7;
    for (let i = 0; i < 3000; i++) {
      const d = Math.hypot(tx - x, tz - z);
      if (d < 0.05) break;
      const k = Math.min(0.1, d) / d;
      const r = c.move([x, y, z], [x + (tx - x) * k, y, z + (tz - z) * k]);
      if (Math.hypot(r[0] - x, r[2] - z) < 1e-4) break;
      x = r[0]; z = r[2];
      const fl = c.floor([x, y, z]);
      if (fl !== null && Math.abs(y - 1.7 - fl) < 0.76) y = fl + 1.7;
    }
    return { at: L(x, z), feet: +(y - 1.7).toFixed(2), zone: c.zone([x, y, z]), left: +Math.hypot(tx - x, tz - z).toFixed(2) };
  };
  const place = (p, feet = 0) => { const [x, z] = W(p); c.pose(x, feet + 1.7, z, 0, 0); __step(2, 50); };
  window.T = { W, L, key, walkTo, lookAt, push, place, here };
})()`;

const ROUTE = [
  { to: [6.5, -5.2, 'k'], name: 'Gaunt Street, the far kerb', shot: '01-gaunt-street-pavement', look: [[6, 8, 'k'], 5] },
  { to: [3.6, -1.6, 'k'], name: 'the near pavement, at the main gate', shot: '02-main-gate', look: [[3, 14, 'k'], 2.4] },
  { to: [3.4, 0.9, 'k'], name: 'through the gate' },
  { to: [2.6, 3.4, 'k'], name: 'the entrance lane', shot: '03-courtyard-entrance-lane', look: [[2.6, 14.3, 'k'], 1.8] },
  { to: [2.6, 8.4, 'k'], name: 'under the overhang' },
  { to: [2.6, 11.6, 'k'], name: 'at the entrance doors', shot: '04-entrance-doors', look: [[2.7, 18, 'k'], 1.7] },
  { to: [2.7, 16.2, 'k'], name: 'the lobby' },
  { to: [2.9, 19.6, 'k'], name: 'the head of the tunnel', shot: '05-entrance-tunnel', look: [[3.2, 36, 'k'], 1.5] },
  { to: [3.2, 27.5, 'k'], name: 'half way down the tunnel' },
  { to: [3.2, 35.4, 'k'], name: 'the end of the tunnel' },
  { to: [3.2, 38.8, 'k'], name: 'into The 103', shot: '06-the-103', look: [[3, 46], 2.8] },
  { to: [-9.6, 42], name: 'along the west wall of The 103' },
  { to: [-9.8, 46.8], name: 'at the mouth of Box Tunnel 1', shot: '07-box-tunnel-1-mouth', look: [[-16.3, 46.9], 1.6] },
  { to: [-12.8, 46.8], name: 'in Box Tunnel 1' },
  { to: [-14.6, 46.4], name: 'at the bend, by the warning sign', shot: '08-warning-sign-crest', look: [[-16.28, 47.5], 1.55] },
  { to: [-15.4, 46.28], name: 'at the door to The Box' },
  { to: [-18.3, 46.28], name: 'into The Box', shot: '09-the-box-arrival', look: [[-30.3, 39.5], 2.2] },
  { to: [-19.3, 43.6], name: 'onto the floor' },
  { to: [-19.4, 41], name: 'the dance floor, at the edge of the crowd', shot: '10-the-box-dance-floor', look: [[-33, 39.5], 2.6] },
];

export default async (page) => {
  mkdirSync(OUT, { recursive: true });
  const results = {};
  const check = (name, pass, detail) => {
    results[name] = { pass: !!pass, detail };
    console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail));
  };
  const files = [];
  // Frames are drawn in software here, which is slow. The walk itself runs with drawing switched
  // off (controls, collision, zones and captions all carry on); only the frames that are kept are drawn.
  const shot = async (name) => {
    const file = `${OUT}/${name}.png`;
    await page.eval(`(() => { __club.draw(true); __step(3, 50); })()`);
    await page.shot(file);
    files.push(file);
    await page.eval(`__club.draw(false)`);
  };
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: inject });
  await page.goto(`${BASE}?detail=${DETAIL}&venue=mos`);
  await page.waitFor(`document.documentElement.dataset.cwState === 'ready'`, 600000);
  await page.waitFor(`!!window.__club`, 20000);
  await page.eval(`__step(1)`);
  await page.eval(helpers);
  await page.eval(`__club.draw(false)`);
  const ev = (js) => page.eval(`JSON.stringify((() => { ${js} })())`).then((s) => (s === undefined ? undefined : JSON.parse(s)));

  /* ---- the intro card ---- */
  await ev(`__step(20, 50); return 0`);
  const intro = await ev(`return { ...__club.state(), title: document.title }`);
  await shot('00-intro-card');
  check('opens on the intro card at Gaunt Street', intro.intro && !intro.begun && /Ministry of Sound/.test(intro.title), intro);

  let route = [];
  if (part('walk')) {
  /* ---- the walk in ---- */
  await ev(`__club.go(0); __step(2, 50); return 0`);
  const start = await ev(`return T.here()`);
  route = [{ name: 'start: Gaunt Street viewpoint', reached: true, ...start }];
  for (const leg of ROUTE) {
    const r = await ev(`return T.walkTo(${JSON.stringify(leg.to)})`);
    route.push({ name: leg.name, ...r });
    console.log(r.reached ? '  ok ' : '  STOPPED', leg.name, JSON.stringify(r));
    if (!r.reached) break;
    if (leg.shot) {
      await ev(`T.lookAt(${JSON.stringify(leg.look[0])}, ${leg.look[1]}); return 0`);
      await shot(leg.shot);
    }
  }
  const zones = route.map((r) => r.zone).filter((z, i, a) => z !== a[i - 1]);
  const captions = route.map((r) => r.caption).filter((z, i, a) => z !== a[i - 1]);
  check('walked every leg from the pavement to the dance floor of The Box', route.length === ROUTE.length + 1 && route.every((r) => r.reached) && route[route.length - 1].zone === 'box', route.map((r) => [r.name, r.reached, r.zone, r.at]));
  check('zones in order along the walk', JSON.stringify(zones) === JSON.stringify(['doorstep', 'courtyard', 'lobby', 'tunnel', 'the103', 'tunnel1', 'box']), zones);
  check('captions follow the room along the walk', captions.length === 7 && captions.every((c) => !!c), captions);
  check('feet stay on the ground floor all the way', route.every((r) => Math.abs(r.feet) < 0.12), route.map((r) => r.feet));

  }
  if (part('checks')) {
  /* ---- collision, through the collision code alone ---- */
  const col = await ev(`return {
    boundaryFromStreet: T.push([10, -1.2, 'k'], [10, 3, 'k']),
    boundaryFromYard: T.push([10, 1.2, 'k'], [10, -3, 'k']),
    mainGate: T.push([3.6, -1.5, 'k'], [3.6, 2, 'k']),
    secondGate: T.push([17.7, -1.5, 'k'], [17.7, 2, 'k']),
    leftFlank: T.push([2, 5, 'k'], [-3, 5, 'k']),
    rightFlank: T.push([20, 5, 'k'], [26, 5, 'k']),
    frontWall: T.push([14, 12, 'k'], [14, 17, 'k']),
    shutter: T.push([16.8, 12, 'k'], [16.8, 17, 'k']),
    courtyardBar: T.push([12, 0.8, 'k'], [12, 6, 'k']),
    hedge: T.push([3, 4, 'k'], [7, 4, 'k']),
    queueBarrier: T.push([12, -1.0, 'k'], [12, -4, 'k']),
    pier: T.push([10.27, 8, 'k'], [10.27, 12, 'k']),
    tunnelLeftWall: T.push([3.2, 27, 'k'], [-1, 27, 'k']),
    tunnelRightWall: T.push([3.2, 27, 'k'], [7, 27, 'k']),
    boxOfficeCounter: T.push([3.2, 23, 'k'], [7, 23, 'k']),
    bar103: T.push([1, 45], [1, 50]),
    djBooth103: T.push([1, 44], [1, 40]),
    column103: T.push([-6.9, 45], [-6.9, 42]),
    wall103West: T.push([-9, 42], [-14, 42]),
    tunnel1EndWall: T.push([-13, 47.4], [-18, 47.4]),
    boxDoor: T.push([-13, 46.28], [-19, 46.28]),
    boxBooth: T.push([-25, 39.3], [-32, 39.3]),
    boxWest: T.push([-25, 42.5], [-40, 42.5]),
    boxNorth: T.push([-22, 44], [-22, 52]),
    stairA: T.push([-6, 39.6], [-0.6, 39.6]),
    walkwayEdge: T.push([-3, 41.2], [-3, 44], 2.65),
    outsideIntoRear: T.push([-20, 20], [-20, 40]),
    outsideIntoFront: T.push([30, 25], [8, 25]),
    viaduct: T.push([-50, 45], [-50, 62]),
    gateLeaf: T.push([2, 1.5, 'k'], [-0.5, 1.5, 'k']),
    trussLeg: T.push([2.2, 2.6, 'k'], [0.2, 2.6, 'k']),
    searchArch: T.push([2.6, 9, 'k'], [2.6, 11.6, 'k']),
    searchArchPanel: T.push([3.22, 9, 'k'], [3.22, 11.6, 'k']),
    gantrySteps: T.push([-34.72, 42.4], [-34.72, 46], 0.9),
    gantryRail: T.push([-34.8, 46.5], [-32, 46.5], 2.65),
    loungeTiers: T.push([-12.15, 43], [-12.15, 47.6], 2.65),
    loungeBench: T.push([-13.7, 43.3], [-13.7, 47], 2.65),
    loftAlcove: T.push([16.6, 47.8], [20, 47.8], 2.65),
    loftBooth: T.push([20, 45], [20, 49], 2.65),
    loftBar: T.push([20.5, 44.5], [25.5, 40.5], 2.65),
    boothColumn103: T.push([-0.75, 44], [-0.75, 40]),
  }`);
  const U = 2.65;
  check('street boundary holds from the pavement', col.boundaryFromStreet.zone !== 'courtyard' && col.boundaryFromStreet.left > 2.5, col.boundaryFromStreet);
  check('street boundary holds from the courtyard', col.boundaryFromYard.zone === 'courtyard' && col.boundaryFromYard.left > 2.5, col.boundaryFromYard);
  check('main gate lets a walker in', col.mainGate.zone === 'courtyard' && col.mainGate.left < 0.1, col.mainGate);
  check('second gate lets a walker in', col.secondGate.zone === 'courtyard' && col.secondGate.left < 0.1, col.secondGate);
  check('left flank wall holds', col.leftFlank.zone === 'courtyard' && col.leftFlank.left > 2.5, col.leftFlank);
  check('right flank wall holds', col.rightFlank.zone === 'courtyard' && col.rightFlank.left > 2.5, col.rightFlank);
  check('building front holds beside the doors', col.frontWall.zone === 'courtyard' && col.frontWall.left > 2.5, col.frontWall);
  check('roller shutter is shut', col.shutter.zone === 'courtyard' && col.shutter.left > 2.5, col.shutter);
  check('courtyard bar stops a walker', col.courtyardBar.left > 3.5, col.courtyardBar);
  check('hedge stops a walker', col.hedge.left > 2.2, col.hedge);
  check('queue barrier stops a walker', col.queueBarrier.left > 1.8, col.queueBarrier);
  check('overhang pier stops a walker', col.pier.left > 1, col.pier);
  check('tunnel walls hold', col.tunnelLeftWall.zone === 'tunnel' && col.tunnelLeftWall.left > 1.5 && col.tunnelRightWall.zone === 'tunnel' && col.tunnelRightWall.left > 1.2, [col.tunnelLeftWall, col.tunnelRightWall]);
  check('box office counter keeps a walker in the tunnel', col.boxOfficeCounter.zone === 'tunnel' && col.boxOfficeCounter.left > 1.2, col.boxOfficeCounter);
  check('bar of The 103 stops a walker', col.bar103.zone === 'the103' && col.bar103.left > 1.5, col.bar103);
  check('DJ booth of The 103 stops a walker', col.djBooth103.left > 1, col.djBooth103);
  check('walkway column stops a walker', col.column103.left > 0.5, col.column103);
  check('west wall of The 103 holds', col.wall103West.zone === 'the103' && col.wall103West.left > 2, col.wall103West);
  check('end wall of Box Tunnel 1 holds beside the door', col.tunnel1EndWall.zone === 'tunnel1' && col.tunnel1EndWall.left > 1.5, col.tunnel1EndWall);
  check('the door from Tunnel 1 lets a walker into The Box', col.boxDoor.zone === 'box' && col.boxDoor.left < 0.1, col.boxDoor);
  check('DJ desk of The Box stops a walker', col.boxBooth.zone === 'box' && col.boxBooth.left > 1, col.boxBooth);
  check('west wall of The Box holds', col.boxWest.zone === 'box' && col.boxWest.left > 4, col.boxWest);
  check('north wall of The Box holds', col.boxNorth.zone === 'box' && col.boxNorth.left > 3, col.boxNorth);
  check('Stair A climbs to the walkway', Math.abs(col.stairA.feet - U) < 0.01 && col.stairA.left < 0.1, col.stairA);
  check('no walking off the walkway', Math.abs(col.walkwayEdge.feet - U) < 0.01 && col.walkwayEdge.left > 1.5, col.walkwayEdge);
  check('club walls hold from outside', !['box', 'the103', 'tunnel', 'lobby'].includes(col.outsideIntoRear.zone) && col.outsideIntoRear.left > 3 && col.outsideIntoFront.left > 3 && !['tunnel', 'boxoffice', 'cloakroom', 'lobby'].includes(col.outsideIntoFront.zone), [col.outsideIntoRear, col.outsideIntoFront]);
  check('the viaduct is solid', col.viaduct.left > 2, col.viaduct);
  // what the dressing added
  check('an open gate leaf stops a walker', col.gateLeaf.zone === 'courtyard' && col.gateLeaf.left > 1, col.gateLeaf);
  check('a leg of the truss lane stops a walker', col.trussLeg.left > 1, col.trussLeg);
  check('a search arch lets a walker through, and its side does not', col.searchArch.left < 0.1 && col.searchArchPanel.left > 1, [col.searchArch, col.searchArchPanel]);
  check('the gantry steps climb from the deck of The Box', Math.abs(col.gantrySteps.feet - U) < 0.01 && col.gantrySteps.left < 0.1 && col.gantrySteps.zone === 'box', col.gantrySteps);
  check('no walking off the gantry', Math.abs(col.gantryRail.feet - U) < 0.01 && col.gantryRail.left > 1.5, col.gantryRail);
  check("the aisle climbs the Lounge's three tiers", Math.abs(col.loungeTiers.feet - (U + 0.9)) < 0.01 && col.loungeTiers.left < 0.1 && col.loungeTiers.zone === 'lounge', col.loungeTiers);
  check('a Lounge bench stops a walker', col.loungeBench.left > 2, col.loungeBench);
  check("the cheek of the Loft's alcove stops a walker", col.loftAlcove.zone === 'loft' && col.loftAlcove.left > 1.5, col.loftAlcove);
  check("the Loft's booth and bar stop a walker", col.loftBooth.left > 1 && col.loftBar.left > 1.5 && col.loftBar.zone === 'loft', [col.loftBooth, col.loftBar]);
  check('a column beside the booth of The 103 stops a walker', col.boothColumn103.left > 1, col.boothColumn103);

  /* ---- upstairs: Stair A, the walkway, the Lounge and its window over The Box, the Loft ---- */
  await ev(`T.place([-7, 39.6]); return 0`);
  const up = [];
  for (const [to, name] of [
    [[-5.3, 39.6], 'foot of Stair A'],
    [[-0.8, 39.6], 'top of Stair A'],
    [[-0.8, 41.25], 'the walkway'],
    [[-4.2, 41.3], 'the walkway, west'],
    [[-6.5, 41.3], 'through the Lounge door'],
    [[-11.8, 43], 'the Lounge'],
  ]) {
    const r = await ev(`return T.walkTo(${JSON.stringify(to)})`);
    up.push({ name, ...r });
    if (!r.reached) break;
  }
  check('walk up Stair A and along the walkway into the Lounge', up.length === 6 && up.every((r) => r.reached) && up[5].zone === 'lounge' && Math.abs(up[5].feet - U) < 0.05, up.map((r) => [r.name, r.reached, r.zone, r.at, r.feet]));

  /* ---- the ten viewpoints, the number keys 0 to 9, and the time of day ---- */
  const views = await ev(`
    const out = [];
    const first = __club.plan.firstViewKey ?? 1;
    for (let i = 0; i < __club.plan.viewpoints.length; i++) {
      T.key('keydown', String(i + first)); T.key('keyup', String(i + first)); __step(95, 50);
      const s = __club.state();
      out.push({ id: __club.plan.viewpoints[i].id, zone: __club.zone(), caption: s.caption, pressed: s.pressed });
    }
    return out;`);
  check('each number key flies to its viewpoint, in a room that has a caption', views.length === 10 && views.every((v) => v.pressed === v.id && !!v.caption), views);
  const want = { street: 'doorstep', courtyard: 'courtyard', tunnel: 'tunnel', the103: 'the103', sign: 'tunnel1', box: 'box', booth: 'box', babybox: 'babybox', lounge: 'lounge', loft: 'loft' };
  check('each viewpoint stands in the room it names', views.every((v) => want[v.id] === v.zone), views.map((v) => [v.id, v.zone]));
  const t0 = await ev(`return __club.state().time`);
  await ev(`T.key('keydown', 'l'); T.key('keyup', 'l'); __step(60, 50); return 0`);
  const t1 = await ev(`return __club.state().time`);
  check('L changes the time of day', t0 === 'night' && t1 === 'day', { t0, t1 });
  await ev(`T.key('keydown', 'l'); T.key('keyup', 'l'); __step(4, 50); return 0`);

  /* ---- Q and E, and the strobe ---- */
  const qe = await ev(`
    const out = {};
    __club.go(__club.plan.viewpoints.findIndex((v) => v.id === 'box')); __step(2, 50);
    out.before = __club.where()[1];
    T.key('keydown', 'q'); __step(120, 50); T.key('keyup', 'q');
    out.afterQ = __club.where()[1]; out.zone = __club.zone();
    __club.go(0); __step(2, 50);
    T.key('keydown', 'q'); __step(120, 50); T.key('keyup', 'q');
    out.streetAfterQ = __club.where()[1];
    return out;`);
  check('Q does nothing indoors and rises out of doors', qe.before === qe.afterQ && qe.zone === 'box' && qe.streetAfterQ > 20, qe);
  const strobe = await ev(`
    const bpm = __club.plan.show.bpm, per = 60 / bpm, N = 64 * 400;
    const on = []; let last = 0;
    for (let i = 0; i < N; i++) { const b = i / 400; const v = __club.strobe(b); if (v && !last) on.push(b * per); last = v; }
    let worst = 0;
    for (let i = 0; i < on.length; i++) { let n = 0; for (let j = i; j < on.length && on[j] < on[i] + 1; j++) n++; if (n > worst) worst = n; }
    const gaps = on.slice(1).map((t, i) => t - on[i]).filter((g) => g < 2);
    return { bpm, flashesIn64Beats: on.length, mostInAnySecond: worst, rateHz: gaps.length ? +(1 / Math.min(...gaps)).toFixed(2) : 0 };`);
  check('strobe stays under three flashes a second', strobe.flashesIn64Beats > 0 && strobe.mostInAnySecond < 3 && strobe.rateHz < 3, strobe);

  }
  if (part('views')) {
    const ids = await ev(`return __club.plan.viewpoints.map((v) => v.id)`);
    await ev(`__club.at('night'); __step(3, 50); return 0`);
    for (let i = 0; i < ids.length; i++) {
      await ev(`__club.go(${i}); __step(8, 50); return 0`);
      await shot(`view-${i + 1}-${ids[i]}-night`);
    }
    /* what the blockout left out */
    for (const [name, at, feet, look, y] of [
      ['detail-queue-signs-night', [1.5, -2.6, 'k'], 0, [1.5, 0, 'k'], 2.1],
      ['detail-box-lattice-night', [-20.5, 44.8], 0, [-26, 40], 4.2],
      ['detail-lounge-tiers-night', [-15.6, 42.4], 2.65, [-11, 47], 3.6],
    ]) {
      await ev(`T.place(${JSON.stringify(at)}, ${feet}); T.lookAt(${JSON.stringify(look)}, ${y}); return 0`);
      await shot(name);
    }
    /* the crest, in the three places it really appears */
    await ev(`T.place([12, -9.5, 'k']); T.lookAt([0, 5.5, 'k'], 15); return 0`);
    await shot('crest-2-projection-on-flank-night');
    await ev(`T.place([-14.4, 46.6]); T.lookAt([-16.28, 47.5], 1.5); return 0`);
    await shot('crest-3-warning-sign');
    await ev(`T.place([8, -20, 'k']); const w = __club.where(); __club.pose(w[0], 60, w[2], w[3], 0); T.lookAt([9, 20, 'k'], 0); return 0`);
    await shot('from-above-night');
    await ev(`__club.at('day'); __step(3, 50); return 0`);
    await shot('from-above-day');
    await ev(`T.place([15.5, 7.5, 'k']); T.lookAt([16.8, 14.3, 'k'], 2); return 0`);
    await shot('crest-1-roller-shutter-day');
    for (const i of [0, 1, 3, 4]) {
      await ev(`__club.go(${i}); __step(8, 50); return 0`);
      await shot(`view-${i + 1}-${ids[i]}-day`);
    }
    /* the rest of what the blockout left out, with nobody in the way */
    for (const [name, at, feet, look, y] of [
      ['detail-box-gantry-steps-day', [-33.2, 40.6], 0.9, [-34.7, 45.6], 2.4],
      ['detail-lounge-tiers-day', [-15.6, 42.4], 2.65, [-11, 47], 3.6],
      ['detail-loft-alcove-day', [21, 43.3], 2.65, [19.6, 49], 4],
    ]) {
      await ev(`T.place(${JSON.stringify(at)}, ${feet}); T.lookAt(${JSON.stringify(look)}, ${y}); __step(4, 50); return 0`);
      await shot(name);
    }
  }

  const errs = page.console.filter((c) => c.type === 'exception' || c.type === 'error');
  check('no console errors', errs.length === 0, errs.slice(0, 5));
  const failed = Object.entries(results).filter(([, r]) => !r.pass).map(([n]) => n);
  writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, route, files }, null, 1));
  for (const f of files) console.log(f, statSync(f).size);
  console.log(failed.length ? `FAILED: ${failed.length}` : `ALL ${Object.keys(results).length} CHECKS PASSED`);
};
