import * as THREE from 'three';
import { B, along, bottles, cyl, mirrorBall, movingHeads, panel, railing, sofa, type G2, type Kit } from './kit';
import { boothGear } from './booth-gear';
import { ALCOVE, ALCOVE_FRONT, GREEN_ROOM_SOFA, GUESS, LOFT_BAR, LOFT_BOOTH, LOFT_DESK, LOFT_SOFAS, LOUNGE_BAR, LOUNGE_BENCHES, LOUNGE_TIERS, MEASURED } from './plan';

/**
 * The upper level: The Lounge with its tiers of booths, the green room off the balcony, and
 * The Loft at the far end of the walkway. Sources: research 3.7 and 3.8.
 * Sponsors' branding in The Loft (a sign and a neon on the back bar and the poster wall) is left out.
 */

const U = GUESS.upperLevel;

/** A point on the line from a to b, `t` metres from a and `off` metres to its left (toward higher `in` when it runs to the right). */
function onLine(a: G2, b: G2, t: number, off = 0): G2 {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d: G2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  return [a[0] + d[0] * t - d[1] * off, a[1] + d[1] * t + d[0] * off];
}
const lengthOf = (a: G2, b: G2) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function dressUpstairs(kit: Kit) {
  lounge(kit);
  greenRoom(kit);
  loft(kit);
}

function lounge(kit: Kit) {
  const { fin, Q } = kit;
  const s = kit.site('lounge');
  const black = fin.plain('#0e0e10', { rough: 0.5, metal: 0.3 });
  const steel = fin.plain('#151517', { rough: 0.45, metal: 0.7 });

  /* the bar on the south side: an underlit front, and a long lit shelf of bottles on the concrete-look wall behind */
  const [a, b] = LOUNGE_BAR;
  const len = lengthOf(a, b);
  s.add(fin.surface('concrete', '#3a3a3d', { relief: 0.4 }), along(a, b, 0.56, U + 0.1, U + 1.04));
  s.add(fin.plain('#1a1a1c', { rough: 0.3, metal: 0.4 }), along(onLine(a, b, -0.04), onLine(a, b, len + 0.04), 0.68, U + 1.04, U + 1.1));
  const under = fin.glow('#ff9a4a', true);
  s.add(under, along(onLine(a, b, 0.05, 0.27), onLine(a, b, len - 0.05, 0.27), 0.03, U + 0.02, U + 0.1));
  const w0: G2 = [-16.65, 37.6];
  const w1: G2 = [-5.1, 40.7];
  const shelf = fin.glow('#ffc27a', true);
  // (the aisle behind the bar is narrow, so the shelf is above the staff's shoulders)
  s.add(black, along(onLine(w0, w1, 1, 0.1), onLine(w0, w1, 10.4, 0.1), 0.18, U + 1.55, U + 1.58));
  s.add(shelf, along(onLine(w0, w1, 1, 0.025), onLine(w0, w1, 10.4, 0.025), 0.02, U + 1.58, U + 1.97));
  bottles(kit, s, onLine(w0, w1, 1.1, 0.11), onLine(w0, w1, 10.3, 0.11), U + 1.58, 0.1, 3);

  /* three tiers of booths: a strip of light under each step, benches in channelled velvet, a small round table to each */
  const strip = fin.glow('#ff9a4a', true);
  const [x0, x1] = GUESS.loungeTiers.right;
  for (const t of LOUNGE_TIERS) s.add(strip, B(x0, t.from - 0.02, x1, t.from - 0.004, t.level - 0.06, t.level - 0.02));
  const navy = fin.surface('velvet', '#1a2a5e', { relief: 1, rough: 0.9 });
  const red = fin.surface('velvet', '#7a1418', { relief: 1, rough: 0.95 });
  const top = LOUNGE_TIERS[LOUNGE_TIERS.length - 1].level;
  const table = fin.plain('#1c1c1f', { rough: 0.3, metal: 0.5 });
  for (const bench of LOUNGE_BENCHES) {
    // dark blue on the lower tiers, red crushed velvet at the top
    const cloth = bench.level === top ? red : navy;
    s.add(black, B(bench.x0, bench.back - 0.5, bench.x1, bench.back, bench.level, bench.level + 0.14));
    s.add(cloth, B(bench.x0, bench.back - 0.55, bench.x1, bench.back - 0.12, bench.level + 0.14, bench.level + 0.45));
    s.add(cloth, B(bench.x0, bench.back - 0.14, bench.x1, bench.back, bench.level + 0.14, bench.level + 0.95));
    const mid = (bench.x0 + bench.x1) / 2;
    s.add(table, cyl(mid, bench.back - 1.02, 0.03, bench.level, bench.level + 0.52, 8));
    s.add(table, cyl(mid, bench.back - 1.02, 0.17, bench.level, bench.level + 0.02, 12));
    s.add(table, cyl(mid, bench.back - 1.02, 0.27, bench.level + 0.52, bench.level + 0.55, 16));
  }

  /* a pale panel with two round lights, between the windows and the door to the balcony */
  s.add(fin.plain('#af8f7d', { rough: 0.7 }), panel([-16.62, 45.3], [-16.62, 47.4], U + 0.35, U + 2.5));
  const round = fin.glow('#ffe0b8', true);
  for (const inn of [45.9, 46.8]) s.add(round, new THREE.CircleGeometry(0.15, 20).rotateY(Math.PI / 2).translate(-16.6, U + 1.6, -inn));

  /* the edge over The 103: a railing of thin upright bars */
  railing(
    s,
    steel,
    [
      [-5.12, 41.9],
      [-8.02, 48.05],
    ],
    U,
    GUESS.balconyRail,
    Q.props ? 0.1 : 0.2,
  );
  // small downlights in the low ceiling
  const down = fin.glow('#ffd2a1', true);
  for (const [r, inn] of [
    [-14.6, 40.6],
    [-11.4, 41.5],
    [-8.4, 42.3],
    [-15.7, 44],
    [-15.7, 46.6],
    [-9, 45.6],
  ]) {
    s.add(down, cyl(r, inn, 0.05, U + MEASURED.loungeCeiling - 0.012, U + MEASURED.loungeCeiling - 0.004, 10));
  }
  // beyond the rail, two mirror balls hang in The 103
  const mirror = fin.plain('#d5dae2', { rough: 0.12, metal: 1 });
  const hall = kit.site('the103');
  for (const [r, inn] of [
    [-2, 42.95],
    [-3.3, 46.7],
  ]) {
    hall.add(mirror, mirrorBall(0.3).translate(r, 5.75, -inn));
    hall.add(steel, cyl(r, inn, 0.006, 6.05, GUESS.hall103Roof, 4));
  }

  /* the balcony over The Box: wall lights along the back */
  const b2 = kit.site('vipbalcony');
  for (let r = -33.5; r < -16; r += 3.5) {
    b2.add(black, B(r - 0.06, 50.6, r + 0.06, 50.69, U + 1.5, U + 1.7));
    b2.add(down, B(r - 0.045, 50.61, r + 0.045, 50.68, U + 1.494, U + 1.5));
  }

  kit.onTime((night) => {
    under.color.set(night ? '#ff9a4a' : '#5a4636');
    strip.color.set(night ? '#ff9a4a' : '#5a4636');
    shelf.color.set(night ? '#ffc27a' : '#6a5c48');
    round.color.set(night ? '#ffe0b8' : '#8a8074');
    down.color.set(night ? '#ffd2a1' : '#6a6258');
  });
}

function greenRoom(kit: Kit) {
  const { fin } = kit;
  const s = kit.site('greenroom');
  // a sofa, a mirror with bulbs round it, a wall of flyers
  sofa(s, fin.surface('velvet', '#1f6f6a', { relief: 1, rough: 0.9 }), ...GREEN_ROOM_SOFA, U, 'w');
  s.add(fin.plain('#cfd6dc', { rough: 0.04, metal: 1 }), panel([-38.4, 50.67], [-36.6, 50.67], U + 0.55, U + 1.7));
  const bulb = fin.glow('#ffe6c0', true);
  for (let r = -38.4; r <= -36.59; r += 0.3) s.add(bulb, new THREE.SphereGeometry(0.03, 8, 6).translate(r, U + 1.76, -50.66));
  for (const r of [-38.46, -36.54]) for (let y = U + 0.6; y < U + 1.72; y += 0.28) s.add(bulb, new THREE.SphereGeometry(0.03, 8, 6).translate(r, y, -50.66));
  s.add(fin.surface('posters', '#bdb6aa', { rough: 0.8, scale: 0.5 }), panel([-38.9, 45.73], [-36.2, 45.73], U + 0.3, U + 1.8, true));
  kit.onTime((night) => bulb.color.set(night ? '#ffe6c0' : '#8a8478'));
}

function loft(kit: Kit) {
  const { fin } = kit;
  const s = kit.site('loft');
  const group = kit.siteGroup('loft');
  const black = fin.plain('#0e0e10', { rough: 0.5, metal: 0.3 });
  const block = fin.surface('block', '#19191c', { relief: 0.6 });
  const ceiling = U + MEASURED.loftCeiling;

  /* the alcove on the north side, where the ceiling drops to two metres: the booth stands in its mouth */
  const low = U + MEASURED.loftAlcove;
  for (const r of ALCOVE.right) s.add(block, B(r - 0.075, ALCOVE_FRONT, r + 0.075, 49.1, U, low));
  s.add(block, B(ALCOVE.right[0] - 0.075, ALCOVE_FRONT, ALCOVE.right[1] + 0.075, 49.1, low, ceiling));
  // a small booth with a black slatted front
  const [r0, i0, r1, i1] = LOFT_BOOTH;
  const deskTop = U + 0.93;
  s.add(fin.surface('ribbed', '#17171a', { scale: 0.5, relief: 1, rough: 0.6 }), B(r0, i0, r1, i0 + 0.08, U, U + 1));
  s.add(black, B(r0, i0 + 0.08, r1, i1, U, U + 0.9));
  s.add(fin.plain('#1b1b1e', { rough: 0.45, metal: 0.3 }), B(r0, i0 + 0.08, r1, i1, U + 0.9, deskTop));
  // the same CDJ-3000 and mixer as The Box: two players with the mixer between them
  boothGear(kit, 'loft', LOFT_DESK, deskTop, 'cdjs');
  const glowStrip = fin.glow('#ff3030', true);
  s.add(glowStrip, B(ALCOVE.right[0] + 0.1, 49.04, ALCOVE.right[1] - 0.1, 49.07, low - 0.08, low - 0.04));

  /* the bar on the diagonal: square panels of red back-lit metal mesh, a black back bar */
  const [a, b] = LOFT_BAR;
  const len = lengthOf(a, b);
  s.add(black, along(a, b, 0.5, U, U + 1.04));
  s.add(fin.plain('#151517', { rough: 0.3, metal: 0.4 }), along(onLine(a, b, -0.04), onLine(a, b, len + 0.04), 0.7, U + 1.04, U + 1.1));
  const lit = fin.glow('#d0161c', true);
  s.add(lit, along(onLine(a, b, 0.04, 0.27), onLine(a, b, len - 0.04, 0.27), 0.02, U + 0.1, U + 1));
  s.add(fin.mesh('#111113', 0.05), panel(onLine(a, b, 0, 0.295), onLine(a, b, len, 0.295), U + 0.08, U + 1.02, true));
  const panels = Math.round(len / 0.9);
  for (let k = 0; k <= panels; k++) s.add(black, along(onLine(a, b, (len * k) / panels - 0.025, 0.3), onLine(a, b, (len * k) / panels + 0.025, 0.3), 0.03, U + 0.06, U + 1.04));
  for (const y of [U + 0.06, U + 0.98]) s.add(black, along(onLine(a, b, 0, 0.3), onLine(a, b, len, 0.3), 0.03, y, y + 0.06));
  // the back bar, on the angled wall behind
  const w0: G2 = [21.5, 38.7];
  const w1: G2 = [27.7, 44.5];
  const wall = lengthOf(w0, w1);
  s.add(black, along(onLine(w0, w1, 0.7, 0.15), onLine(w0, w1, wall - 0.7, 0.15), 0.26, U, U + 0.92));
  s.add(black, along(onLine(w0, w1, 0.7, 0.04), onLine(w0, w1, wall - 0.7, 0.04), 0.04, U + 0.92, U + 2.4));
  const warm = fin.glow('#ffb48a', true);
  for (const h of [U + 1.5, U + 1.9]) {
    s.add(black, along(onLine(w0, w1, 0.7, 0.14), onLine(w0, w1, wall - 0.7, 0.14), 0.18, h, h + 0.03));
    s.add(warm, along(onLine(w0, w1, 0.75, 0.07), onLine(w0, w1, wall - 0.75, 0.07), 0.015, h + 0.03, h + 0.05));
    bottles(kit, s, onLine(w0, w1, 0.85, 0.15), onLine(w0, w1, wall - 0.85, 0.15), h + 0.03, 0.1, h * 3);
  }

  /* the neon behind a metal grid, on the east wall */
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.05), new THREE.MeshBasicMaterial({ map: fin.sign('neon'), transparent: true, depthWrite: false }));
  neon.position.set(27.66, U + 2.55, -46.8);
  neon.rotation.y = -Math.PI / 2;
  neon.renderOrder = 1;
  group.add(neon);
  s.add(fin.mesh('#4a4d52', 0.12), panel([27.6, 45.45], [27.6, 48.15], U + 1.8, U + 3.3, true));
  s.add(black, B(27.58, 45.45, 27.62, 48.15, U + 1.76, U + 1.8));
  s.add(black, B(27.58, 45.45, 27.62, 48.15, U + 3.3, U + 3.34));

  /* a wall collaged with old posters, over the sofa */
  s.add(fin.surface('posters', '#c4bdb0', { rough: 0.8 }), panel([15.03, 43.9], [15.03, 48.95], U + 0.95, U + 3.3, true));
  const cloth = fin.surface('velvet', '#2a2326', { relief: 0.8, rough: 0.9 });
  sofa(s, cloth, ...LOFT_SOFAS[0], U, 'w');
  sofa(s, cloth, ...LOFT_SOFAS[1], U, 'n');

  /* two mirror balls, and a line of small white pin spots round the edge of the ceiling */
  const mirror = fin.plain('#d5dae2', { rough: 0.12, metal: 1 });
  const balls = [
    [19.2, 44.3],
    [23.2, 45.9],
  ].map(([r, inn]) => {
    const ball = new THREE.Mesh(mirrorBall(0.26), mirror);
    ball.position.set(r, ceiling - 0.75, -inn);
    group.add(ball);
    s.add(black, cyl(r, inn, 0.006, ceiling - 0.49, ceiling, 4));
    return ball;
  });
  const pin = fin.glow('#ffffff', true);
  const outline: G2[] = [
    [15, 38.7],
    [21.5, 38.7],
    [27.7, 44.5],
    [27.7, 49.1],
    [15, 49.1],
  ];
  outline.forEach((p, k) => {
    const q = outline[(k + 1) % outline.length];
    const n = Math.max(1, Math.round(lengthOf(p, q) / 0.9));
    for (let j = 0; j < n; j++) {
      const [r, inn] = onLine(p, q, (lengthOf(p, q) * (j + 0.5)) / n);
      // a little in from the wall, toward the middle of the room
      const m = Math.hypot(20 - r, 44.6 - inn);
      const [pr, pi] = [r + ((20 - r) / m) * 0.3, inn + ((44.6 - inn) / m) * 0.3];
      if (pr > ALCOVE.right[0] - 0.2 && pr < ALCOVE.right[1] + 0.2 && pi > ALCOVE_FRONT) continue;
      s.add(pin, cyl(pr, pi, 0.03, ceiling - 0.03, ceiling - 0.004, 8));
    }
  });
  movingHeads(
    kit,
    'loft',
    [
      [18, 43, ceiling],
      [24.6, 46.4, ceiling],
      [17, 46.6, ceiling],
      [22, 44.8, ceiling],
    ],
    ['#e01a1f', '#ff3a2a', '#d0121a', '#ff5a3a'],
    { length: 4.3, radius: 0.6, swing: 0.4, level: 0.4 },
  );
  kit.dust('loft', 9, 240, [15.5, 27.2], [U + 0.4, U + 4.4], [-48.8, -39.2], 0.55);

  kit.onTime((night) => {
    lit.color.set(night ? '#d0161c' : '#4a1c1e');
    warm.color.set(night ? '#ffb48a' : '#6a5a50');
    glowStrip.color.set(night ? '#ff3030' : '#4a2022');
    pin.color.set(night ? '#ffffff' : '#77787c');
    (neon.material as THREE.MeshBasicMaterial).color.set(night ? '#ffffff' : '#6a4a48');
  });
  kit.animate(({ t, pulse }, night) => {
    for (const ball of balls) ball.rotation.y = night ? t * 0.3 : 0;
    if (night) lit.color.setRGB(0.72 + 0.1 * pulse, 0.06, 0.08);
  });
}
