import * as THREE from 'three';
import { boothGear } from './booth-gear';
import { B, cabinet, cyl, movingHeads, openStair, panel, rnd, sofa, stairOf, trussRun, tube, V3, type Kit } from './kit';
import { ARCH80, BABY_BOOTH, BABY_DESK, BABY_STACKS, BABY_TRUSS, CUBICLES, FLIGHT_CASES, GUESS, WASH_TROUGH } from './plan';

/**
 * The rooms under the railway: The Baby Box, Arch80, the women's toilets and the load-in arch.
 * Sources: research 3.6, 3.9, 3.10. The Baby Box and Arch80 are from the venue's photographs;
 * no photograph of the toilets or the load-in arch was found, so those are furnished from the plan alone.
 */

export function dressArches(kit: Kit) {
  babyBox(kit);
  arch80(kit);
  toilets(kit);
  loadIn(kit);
}

function babyBox(kit: Kit) {
  const { fin } = kit;
  const s = kit.site('babybox');
  const black = fin.plain('#0d0d0e', { rough: 0.55, metal: 0.3 });
  const alu = fin.plain('#b4b8be', { rough: 0.35, metal: 0.85 });

  // a free-standing black booth at the far end, a speaker stack either side
  const [r0, i0, r1, i1] = BABY_BOOTH;
  const deskTop = 0.97;
  s.add(black, B(r0, i0, r1, i0 + 0.08, 0, 1.1));
  s.add(black, B(r0, i0 + 0.08, r1, i1, 0, 0.94));
  s.add(fin.plain('#1b1b1e', { rough: 0.45, metal: 0.3 }), B(r0, i0 + 0.08, r1, i1, 0.94, deskTop));
  s.add(black, B(r0, i1, r0 + 0.12, i1 + 1.2, 0, 1.1));
  s.add(black, B(r1 - 0.12, i1, r1, i1 + 1.2, 0, 1.1));
  // the same CDJ-3000 and mixer as The Box: two players with the mixer between them
  boothGear(kit, 'babybox', BABY_DESK, deskTop, 'cdjs');
  for (const [a, b, c, d] of BABY_STACKS) {
    cabinet(s, fin, a, b, c, d, 0, 1.1, 'ns');
    cabinet(s, fin, a, b, c, d, 1.1, 2, 'ns');
  }
  // an aluminium truss frame under the vault, on the four legs the plan gives, with moving lights
  const y = GUESS.archSpringing + 0.8;
  const [a, b, c, d] = BABY_TRUSS;
  trussRun(s, alu, a, b, y, 0.12);
  trussRun(s, alu, c, d, y, 0.12);
  trussRun(s, alu, a, c, y, 0.12);
  trussRun(s, alu, b, d, y, 0.12);
  movingHeads(
    kit,
    'babybox',
    [
      [16.8, a[1], y - 0.12],
      [20.6, c[1], y - 0.12],
      [20.6, a[1], y - 0.12],
      [16.8, c[1], y - 0.12],
    ],
    ['#035bca', '#603dde', '#2aa0ff', '#8a3cff'],
    { length: 3.1, radius: 0.55, swing: 0.4, level: 0.4 },
  );
  // a block of LED battens over the booth
  const battens = [0, 1, 2].map(() => fin.glow('#6a8cff', true));
  for (let k = 0; k < 6; k++) {
    const r = r0 + 0.25 + k * 0.5;
    s.add(black, B(r - 0.05, i0 - 0.2, r + 0.05, i0 + 0.9, y - 0.17, y - 0.12));
    s.add(battens[k % 3], B(r - 0.035, i0 - 0.18, r + 0.035, i0 + 0.88, y - 0.19, y - 0.17));
  }
  for (const r of [r0 + 0.25, r0 + 2.75]) for (const inn of [i0 - 0.15, i0 + 0.85]) s.add(black, cyl(r, inn, 0.006, y - 0.12, y + 0.9, 4));
  // black spiral ducts with grilles along both sides, where the vault springs
  const duct = fin.plain('#19191b', { rough: 0.5, metal: 0.6 });
  const grille = fin.plain('#3a3a3e', { rough: 0.5, metal: 0.6 });
  for (const [r, face] of [
    [15.15, 1],
    [22.25, -1],
  ]) {
    s.add(duct, tube(V3(r, GUESS.archSpringing + 0.28, 49.7), V3(r, GUESS.archSpringing + 0.28, 57), 0.18, 12));
    for (let inn = 50.6; inn < 57; inn += 1.5) s.add(grille, B(r + face * 0.15, inn - 0.25, r + face * 0.2, inn + 0.25, GUESS.archSpringing + 0.2, GUESS.archSpringing + 0.36));
  }
  kit.dust('babybox', 7, 260, [15.2, 22.2], [0.4, 4], [-57, -49.7], 0.6);

  const c3 = new THREE.Color();
  kit.onTime((night) => {
    if (!night) for (const m of battens) m.color.set('#34363c');
  });
  kit.animate(({ t, beat, pulse }, night) => {
    if (!night) return;
    const step = Math.floor(beat * 2) % 3;
    battens.forEach((m, i) => m.color.copy(c3.setHSL(0.62 + 0.06 * Math.sin(t * 0.2), 0.8, i === step ? 0.45 + 0.25 * pulse : 0.08)));
  });
}

function arch80(kit: Kit) {
  const { fin } = kit;
  const s = kit.site('arch80');
  const black = fin.plain('#111113', { rough: 0.6 });
  const R = GUESS.arch80Rooms;
  const h = R.height;

  // the toilets, shower and prep rooms: two black blocks either side of a passage, a door or two in each
  const wall = fin.surface('block', '#1c1c1f', { relief: 0.6 });
  const leaf = fin.plain('#2b2b2f', { rough: 0.5, metal: 0.2 });
  const handle = fin.plain('#9a9da3', { rough: 0.3, metal: 0.9 });
  s.add(wall, B(-39.1, 51.05, R.passage[0], R.to, 0, h));
  s.add(wall, B(R.passage[1], 51.05, -31.3, R.to, 0, h));
  for (const [r, face] of [
    [R.passage[0], 1],
    [R.passage[1], -1],
  ]) {
    for (const inn of [52.6, 55.1, 57.2]) {
      s.add(leaf, B(r, inn - 0.42, r + face * 0.02, inn + 0.42, 0.02, 2.05));
      s.add(handle, B(r + face * 0.02, inn + 0.28, r + face * 0.05, inn + 0.31, 0.95, 1.1));
    }
  }
  // the dressing room's wall of club flyers carries on round the corner, onto the block that faces the lounge
  s.add(fin.surface('posters', '#bdb6aa', { rough: 0.8, scale: 0.6 }), panel([-39.05, R.to + 0.012], [R.passage[0], R.to + 0.012], 0.4, 2.2, true));

  // the lounge: a red rug on polished concrete, grey sofas, a pool table, a timber worktop with stools
  s.add(fin.surface('velvet', '#7a1f1c', { rough: 0.95, scale: 2 }), B(-38, 59.3, -32.9, 64.7, 0, 0.012));
  const grey = fin.surface('velvet', '#6f7074', { relief: 0.6, rough: 0.9 });
  sofa(s, grey, ...ARCH80.sofas[0], 0, 'w');
  sofa(s, grey, ...ARCH80.sofas[1], 0, 'n');
  const [p0, q0, p1, q1] = ARCH80.pool;
  const timber = fin.surface('boards', '#6a4a30', { relief: 0.6, scale: 0.6 });
  s.add(timber, B(p0, q0, p1, q1, 0.6, 0.8));
  s.add(fin.plain('#1f6a45', { rough: 0.95 }), B(p0 + 0.1, q0 + 0.1, p1 - 0.1, q1 - 0.1, 0.8, 0.806));
  for (const [r, inn] of [
    [p0 + 0.15, q0 + 0.15],
    [p1 - 0.15, q0 + 0.15],
    [p0 + 0.15, q1 - 0.15],
    [p1 - 0.15, q1 - 0.15],
  ]) {
    s.add(timber, B(r - 0.07, inn - 0.07, r + 0.07, inn + 0.07, 0, 0.6));
  }
  s.add(timber, B(p0, q0, p1, q0 + 0.1, 0.8, 0.82));
  s.add(timber, B(p0, q1 - 0.1, p1, q1, 0.8, 0.82));
  s.add(timber, B(p0, q0, p0 + 0.1, q1, 0.8, 0.82));
  s.add(timber, B(p1 - 0.1, q0, p1, q1, 0.8, 0.82));
  if (kit.Q.props) {
    const balls = ['#e8e2d0', '#c9281e', '#e8c21a', '#1b4fa8', '#111111', '#c9281e', '#e8c21a'];
    balls.forEach((colour, k) => s.add(fin.plain(colour, { rough: 0.25 }), new THREE.SphereGeometry(0.028, 8, 6).translate(p0 + 0.4 + rnd(k) * (p1 - p0 - 0.8), 0.834, -(q0 + 0.3 + rnd(k + 0.4) * (q1 - q0 - 0.6)))));
  }
  const [w0, v0, w1, v1] = ARCH80.worktop;
  s.add(timber, B(w0, v0, w1, v1, 0.87, 0.92));
  const bracket = fin.plain('#19191b', { rough: 0.5, metal: 0.6 });
  for (let inn = v0 + 0.2; inn < v1; inn += 0.95) {
    s.add(bracket, B(w0 + 0.1, inn - 0.02, w1, inn + 0.02, 0.83, 0.87));
    // a stool pushed under it
    s.add(bracket, cyl(w0 + 0.22, inn + 0.45, 0.02, 0, 0.7, 6));
    s.add(timber, cyl(w0 + 0.22, inn + 0.45, 0.16, 0.7, 0.74, 12));
  }
  // black dome pendants, and up-and-down lights on the brick
  const warm = fin.glow('#ffd9a0', true);
  for (const inn of [55, 60.3, 63.6]) {
    s.add(black, cyl(-35.2, inn, 0.006, 3.05, GUESS.archCrown, 4));
    s.add(black, new THREE.SphereGeometry(0.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(-35.2, 2.85, -inn));
    s.add(warm, cyl(-35.2, inn, 0.1, 2.84, 2.86, 10));
  }
  for (const inn of [60.2, 63, 65.4]) {
    for (const [r, face] of [
      [-39.1, 1],
      [-31.3, -1],
    ]) {
      s.add(black, B(r, inn - 0.06, r + face * 0.09, inn + 0.06, 1.85, 2.05));
      s.add(warm, B(r + face * 0.01, inn - 0.045, r + face * 0.08, inn + 0.045, 2.05, 2.056));
      s.add(warm, B(r + face * 0.01, inn - 0.045, r + face * 0.08, inn + 0.045, 1.844, 1.85));
    }
  }
  // exposed ducts and an air-conditioning cassette
  s.add(fin.plain('#8a8d92', { rough: 0.4, metal: 0.8 }), tube(V3(-37.6, 3.55, 58.6), V3(-37.6, 3.55, 66.2), 0.17, 12));
  s.add(fin.plain('#d8d6d0', { rough: 0.6 }), B(-33.6, 61.4, -32.8, 62.2, 3.5, 3.75));
  // a black end wall with glazed double doors and windows
  const end = 66.22;
  s.add(black, B(-39.1, end, -31.3, end + 0.06, 0, GUESS.archCrown));
  const pane = fin.glow('#1a2433', true);
  s.add(pane, B(-36.1, end - 0.012, -35.25, end, 0.1, 2.1));
  s.add(pane, B(-35.15, end - 0.012, -34.3, end, 0.1, 2.1));
  for (const r of [-38, -32.4]) s.add(pane, B(r - 0.6, end - 0.012, r + 0.6, end, 1, 2.1));
  s.add(pane, B(-36.1, end - 0.012, -34.3, end, 2.2, 2.9));
  kit.onTime((night) => {
    warm.color.set(night ? '#ffd9a0' : '#7a7468');
    pane.color.set(night ? '#1a2433' : '#b9c8d6');
  });
}

function toilets(kit: Kit) {
  const { fin } = kit;
  const s = kit.site('wc-w');
  // two rows of cubicles along the side walls, facing a long wash trough down the middle
  const laminate = fin.plain('#34363b', { rough: 0.5 });
  const doorMat = fin.plain('#5d6066', { rough: 0.45 });
  const steel = fin.plain('#b4b8be', { rough: 0.3, metal: 0.9 });
  CUBICLES.forEach(([r0, i0, r1, i1], row) => {
    // the row's front is the side that faces the middle of the arch
    const front = row === 0 ? r1 : r0;
    const face = row === 0 ? 1 : -1;
    const n = Math.round((i1 - i0) / 0.93);
    s.add(laminate, B(r0, i0, r1, i1, 0, 2));
    for (let k = 0; k < n; k++) {
      const a = i0 + ((i1 - i0) * k) / n;
      const b = i0 + ((i1 - i0) * (k + 1)) / n;
      s.add(doorMat, B(front, a + 0.12, front + face * 0.02, b - 0.12, 0.15, 1.95));
      s.add(steel, B(front + face * 0.02, b - 0.24, front + face * 0.05, b - 0.2, 0.95, 1.05));
    }
    s.add(steel, B(front - 0.02, i0, front + 0.02, i1, 2, 2.04));
  });
  const [t0, j0, t1, j1] = WASH_TROUGH;
  const stone = fin.surface('concrete', '#c9c6c0', { rough: 0.5 });
  s.add(stone, B(t0 + 0.3, j0 + 0.2, t1 - 0.3, j1 - 0.2, 0, 0.7));
  s.add(stone, B(t0, j0, t1, j1, 0.7, 0.9));
  s.add(fin.plain('#8f9296', { rough: 0.3, metal: 0.4 }), B(t0 + 0.12, j0 + 0.12, t1 - 0.12, j1 - 0.12, 0.9, 0.904));
  const mid = (t0 + t1) / 2;
  s.add(steel, B(mid - 0.03, j0 + 0.2, mid + 0.03, j1 - 0.2, 0.9, 1.22));
  for (let inn = j0 + 0.5; inn < j1 - 0.3; inn += 0.75) {
    for (const side of [-1, 1]) s.add(steel, tube(V3(mid, 1.16, inn), V3(mid + side * 0.2, 1.1, inn), 0.012));
  }
  const strip = fin.glow('#eef2ff', true);
  s.add(strip, B(mid - 0.03, j0 + 0.2, mid + 0.03, j1 - 0.2, 2.42, 2.46));
  for (const inn of [j0 + 0.3, j1 - 0.3]) s.add(steel, cyl(mid, inn, 0.006, 2.46, GUESS.archCrown, 4));
  kit.onTime((night) => strip.color.set(night ? '#eef2ff' : '#8a8c92'));
}

function loadIn(kit: Kit) {
  const { fin } = kit;
  const s = kit.site('loadin');
  // flight cases, the stair up to the corridor behind The Lounge, and the doors to the far side of the viaduct
  const shell = fin.plain('#141416', { rough: 0.6 });
  const edge = fin.plain('#b4b8be', { rough: 0.35, metal: 0.85 });
  for (const [[r0, i0, r1, i1], h] of FLIGHT_CASES) {
    s.add(shell, B(r0 + 0.012, i0 + 0.012, r1 - 0.012, i1 - 0.012, 0.06, h - 0.012));
    for (const y of [0.06, h - 0.03]) {
      s.add(edge, B(r0, i0, r1, i0 + 0.03, y, y + 0.03));
      s.add(edge, B(r0, i1 - 0.03, r1, i1, y, y + 0.03));
      s.add(edge, B(r0, i0, r0 + 0.03, i1, y, y + 0.03));
      s.add(edge, B(r1 - 0.03, i0, r1, i1, y, y + 0.03));
    }
    for (const [r, inn] of [
      [r0, i0],
      [r1 - 0.03, i0],
      [r0, i1 - 0.03],
      [r1 - 0.03, i1 - 0.03],
    ]) {
      s.add(edge, B(r, inn, r + 0.03, inn + 0.03, 0.06, h));
      s.add(shell, cyl(r + 0.015, inn + 0.015, 0.04, 0, 0.06, 8));
    }
  }
  const steel = fin.plain('#19191c', { rough: 0.5, metal: 0.6 });
  openStair(s, { tread: fin.plain('#232326', { rough: 0.6, metal: 0.5 }), steel }, stairOf(kit, 'back-stair'));
  s.add(fin.surface('ribbed', '#2a2c30', { scale: 0.8, relief: 1, rough: 0.5, metal: 0.5 }), B(-10.9, 66.82, -7, 66.88, 0, 3.2));
  s.add(steel, B(-11, 66.8, -6.9, 66.88, 3.2, 3.45));
}
