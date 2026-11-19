import * as THREE from 'three';
import { mergeParts } from '../../engine/geom';
import { boothGear } from './booth-gear';
import { CREST_ASPECT } from './build';
import { B, along, bottles, cabinet, cyl, ledScreen, movingHeads, openLeaves, openStair, panel, playScreens, railing, rnd, stairOf, trussRun, tube, V3, type G2, type Kit } from './kit';
import { BAR_103, BOOTH_103, BOOTH_COLUMNS, DESK_103, GUESS, MEASURED, SEATING_103, TECH_RACKS, TUNNEL } from './plan';

/**
 * The way in and the hub. Sources: research sections 3.3 and 3.4, 7.11 to 7.13.
 * The lobby, the tunnel and its two counters are on the courtyard grid; The 103 and the
 * two passages to The Box are on the site grid.
 */

const U = GUESS.upperLevel;

/** The lobby, the entrance tunnel, the box office and the cloakroom. */
export function dressWayIn(kit: Kit) {
  const { fin } = kit;
  const black = fin.plain('#0e0e10', { rough: 0.5, metal: 0.4 });
  const steel = fin.plain('#55585c', { rough: 0.4, metal: 0.8 });
  // bare block walls under layers of club posters
  const posters = fin.surface('posters', '#bdb6aa', { rough: 0.8 });
  const paste = (room: string, a: number, b0: number, b1: number, y0 = 0.55, y1 = 2.4) => kit.yard(room).add(posters, panel([a, b0], [a, b1], y0, y1, true));

  /* the lobby: doors, a small lobby, doors again */
  paste('lobby', 0.28, 14.95, 17.7, 0.7, 2.3);
  paste('lobby', 4.77, 14.95, 17.7, 0.7, 2.3);

  /* the tunnel */
  const t = kit.yard('tunnel');
  const { a0, a1, b0, b1 } = TUNNEL;
  paste('tunnel', a0 + 0.03, b0 + 0.3, b1 - 0.3);
  paste('tunnel', a1 - 0.03, b0 + 0.3, 21.4);
  paste('tunnel', a1 - 0.03, 24.8, 30);
  // a brick pier on the left
  t.add(fin.surface('brick', '#8a5a44', { relief: 1 }), B(a0, 27, a0 + 0.24, 27.7, 0, GUESS.tunnelCeiling));
  // a red line of light along one edge of the ceiling and a green one along the other
  const red = fin.glow('#ff2a1a', true);
  const green = fin.glow('#22e05a', true);
  t.add(red, B(a0 + 0.05, b0 + 0.1, a0 + 0.1, b1 - 0.1, GUESS.tunnelCeiling - 0.05, GUESS.tunnelCeiling - 0.01));
  t.add(green, B(a1 - 0.1, b0 + 0.1, a1 - 0.05, b1 - 0.1, GUESS.tunnelCeiling - 0.05, GUESS.tunnelCeiling - 0.01));
  kit.onTime((night) => {
    red.color.set(night ? '#ff2a1a' : '#6a2a26');
    green.color.set(night ? '#22e05a' : '#2a5a3a');
  });
  // black double doors at each end, standing open
  openLeaves(t, black, [2.8 - GUESS.doubleDoor / 2, b0], [2.8 + GUESS.doubleDoor / 2, b0], 1, 0.02, GUESS.doorHeight - 0.04);
  openLeaves(t, black, [3.2 - GUESS.doubleDoor / 2, b1], [3.2 + GUESS.doubleDoor / 2, b1], -1, 0.02, GUESS.doorHeight - 0.04);

  /* the two counters on the right: a worktop through the wall, and what stands behind it */
  const top = fin.plain('#2a2a2d', { rough: 0.4, metal: 0.3 });
  const hatch = (room: string, from: number, to: number) => kit.yard(room).add(top, B(a1 - 0.14, from, a1 + 0.4, to, GUESS.counterHeight, GUESS.counterHeight + 0.04));
  // the box office: glazed above the counter, with a slot to pay through
  const o = kit.yard('boxoffice');
  hatch('boxoffice', 21.6, 24.6);
  const glass = new THREE.MeshStandardMaterial({ color: '#a9c0cc', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false });
  o.add(glass, panel([a1 + 0.03, 21.6], [a1 + 0.03, 24.6], GUESS.counterHeight + 0.22, GUESS.doorHeight));
  for (const b of [22.6, 23.6]) o.add(black, B(a1 + 0.01, b - 0.02, a1 + 0.05, b + 0.02, GUESS.counterHeight + 0.04, GUESS.doorHeight));
  o.add(top, B(a1 + 0.42, 21.7, a1 + 0.55, 24.5, 0.72, 0.76));
  const monitor = fin.glow('#bfd4ff');
  for (const b of [22.5, 23.7]) {
    o.add(black, B(a1 + 0.3, b - 0.26, a1 + 0.33, b + 0.26, GUESS.counterHeight + 0.1, GUESS.counterHeight + 0.44));
    o.add(monitor, B(a1 + 0.33, b - 0.24, a1 + 0.335, b + 0.24, GUESS.counterHeight + 0.12, GUESS.counterHeight + 0.42));
  }
  // the cloakroom: rails of coats behind the counter, a shelf of bags over them
  const c = kit.yard('cloakroom');
  hatch('cloakroom', 30.2, 35.5);
  const coats = ['#111113', '#1d2230', '#2c2a26', '#3a2420', '#23302a', '#4a4a4e'].map((colour) => fin.plain(colour, { rough: 0.95 }));
  const step = kit.Q.props ? 0.13 : 0.26;
  [6.85, 7.25].forEach((a, rail) => {
    c.add(steel, tube(V3(a, 1.78, 30.25), V3(a, 1.78, 35.45), 0.016));
    for (const b of [30.3, 32.85, 35.4]) c.add(steel, cyl(a, b, 0.016, 0.02, 1.78, 6));
    for (let b = 30.45, k = rail * 97; b < 35.3; b += step, k++) {
      if (rnd(k) < 0.18) continue;
      c.add(coats[Math.floor(rnd(k + 0.5) * coats.length)], B(a - 0.21, b, a + 0.21, b + step * 0.6, 1.72 - 0.7 - rnd(k + 0.2) * 0.35, 1.72));
    }
  });
  c.add(top, B(6.7, 30.25, 7.48, 35.45, 1.98, 2.01));
  if (kit.Q.props) for (let k = 0; k < 14; k++) c.add(coats[k % coats.length], B(6.8, 30.4 + k * 0.36, 7.35, 30.4 + k * 0.36 + 0.2 + rnd(k) * 0.1, 2.01, 2.2 + rnd(k + 0.7) * 0.12));
}

/** The 103 and the two passages off it to The Box. */
export function dress103(kit: Kit) {
  const { fin, Q } = kit;
  const s = kit.site('the103');
  const group = kit.siteGroup('the103');
  const black = fin.plain('#0e0e10', { rough: 0.5, metal: 0.4 });
  const blackSteel = fin.plain('#151517', { rough: 0.45, metal: 0.7 });

  /* --------------------------------------------------------------- the bar ---- */
  // a pale concrete-look counter with a light strip under its front edge, fridges in the back bar, the screen above
  const [r0, r1] = BAR_103.right;
  const front = BAR_103.counter - 0.35;
  s.add(fin.surface('concrete', '#a3a3a6', { relief: 0.4, rough: 0.7 }), B(r0, front + 0.05, r1, front + 0.7, 0, 1.04));
  s.add(fin.surface('concrete', '#b9b9bc', { rough: 0.45 }), B(r0 - 0.05, front - 0.04, r1, front + 0.74, 1.04, 1.1));
  const strip = fin.glow('#fff0d8', true);
  s.add(strip, B(r0 + 0.1, front - 0.03, r1 - 0.1, front + 0.01, 0.99, 1.03));
  s.add(blackSteel, tube(V3(r0 + 0.1, 0.18, front - 0.12), V3(r1 - 0.1, 0.18, front - 0.12), 0.02));
  for (let r = r0 + 0.3; r < r1; r += 1.9) s.add(blackSteel, tube(V3(r, 0.18, front - 0.12), V3(r, 0.18, front + 0.05), 0.014));
  const back = BAR_103.back;
  s.add(black, B(r0 + 0.2, back - 0.22, r1 - 0.2, back + 0.25, 0, 0.92));
  const fridge = fin.glow('#b7d4ff', true);
  for (let r = r0 + 0.3; r < r1 - 1.3; r += 1.3) s.add(fridge, B(r, back - 0.235, r + 1.2, back - 0.22, 0.1, 0.86));
  s.add(fin.plain('#8a8d92', { rough: 0.35, metal: 0.8 }), B(r0 + 0.2, back - 0.28, r1 - 0.2, back + 0.25, 0.92, 0.96));
  s.add(black, B(r0 + 0.2, back + 0.2, r1 - 0.2, back + 0.25, 0.96, 2.2));
  const shelfLight = fin.glow('#ffe2b8', true);
  for (const h of [1.3, 1.75]) {
    s.add(black, B(r0 + 0.2, back - 0.1, r1 - 0.2, back + 0.2, h, h + 0.03));
    s.add(shelfLight, B(r0 + 0.25, back + 0.17, r1 - 0.25, back + 0.195, h + 0.03, h + 0.05));
    bottles(kit, s, [r0 + 0.4, back + 0.05], [r1 - 0.4, back + 0.05], h + 0.03, 0.11, h * 5);
  }
  // the screen above the bar, wall to wall
  const barScreen = ledScreen(fin, '#5a3cff', 2.2);
  group.add(new THREE.Mesh(panel([r0, 50.27], [r1, 50.27], 2.4, MEASURED.hall103Truss, true), barScreen));
  s.add(black, B(r0, 50.2, r1, 50.3, 2.25, 2.4));
  // a line array flown each side of the middle of the bar
  for (const r of [-3.4, 5.6]) {
    for (let k = 0; k < 5; k++) cabinet(s, fin, r - 0.5, 47.3 + k * 0.035, r + 0.5, 47.8 + k * 0.035, 6.25 - (k + 1) * 0.33, 6.25 - k * 0.33 - 0.02, 'ns');
    for (const dr of [-0.4, 0.4]) s.add(blackSteel, cyl(r + dr, 47.55, 0.008, 6.25, GUESS.hall103Roof, 4));
  }

  /* -------------------------------------------------------------- the roof ---- */
  // exposed red-brown brick above the walkway on the south side
  s.add(fin.surface('brick', '#8a4a38', { relief: 1 }), panel([-1.506, 35.53], [9.494, 37.93], U, GUESS.hall103Roof, true));
  // black trusses across the room at the height the plan gives, clear of The Lounge at the west end
  const truss = MEASURED.hall103Truss + 0.2;
  const spans: [number, number, number][] = [
    [38.5, -11.3, 9.6],
    [42, -4.8, 11],
    [45.5, -6.4, 11],
  ];
  for (const [inn, from, to] of spans) {
    trussRun(s, blackSteel, [from, inn], [to, inn], truss, 0.17);
    for (const r of [from + 0.4, (from + to) / 2, to - 0.4]) s.add(blackSteel, cyl(r, inn, 0.008, truss + 0.17, GUESS.hall103Roof, 4));
  }
  // two ducts under the roof
  const duct = fin.plain('#222225', { rough: 0.45, metal: 0.7 });
  s.add(duct, tube(V3(-11.3, 6.35, 46.7), V3(11, 6.35, 46.7), 0.3, 14));
  s.add(duct, tube(V3(-11.3, 6.35, 40.3), V3(10.3, 6.35, 40.3), 0.26, 14));
  // moving lights on the trusses
  movingHeads(
    kit,
    'the103',
    [
      [-3, 42, truss - 0.17],
      [5, 42, truss - 0.17],
      [-5, 45.5, truss - 0.17],
      [3, 45.5, truss - 0.17],
      [1, 42, truss - 0.17],
      [9, 42, truss - 0.17],
      [-1, 45.5, truss - 0.17],
      [7, 45.5, truss - 0.17],
    ],
    ['#7a3cff', '#2b5cff', '#b04cff', '#3aa0ff'],
    { length: 5.2, radius: 0.75, swing: 0.45, level: 0.42 },
  );

  /* ------------------------------------------------------- the kinetic rig ---- */
  // 124 winches: 62 triangles of white tube, each hung by two and carrying a glowing sphere,
  // in a band down the middle of the room. They rise and fall in a wave.
  const COLS = 31;
  const side = 0.8;
  const high = side * 0.866;
  const tubes = mergeParts([
    tube(new THREE.Vector3(0, high / 3, -side / 2), new THREE.Vector3(0, high / 3, side / 2), 0.014, 5),
    tube(new THREE.Vector3(0, high / 3, -side / 2), new THREE.Vector3(0, (-high * 2) / 3, 0), 0.014, 5),
    tube(new THREE.Vector3(0, high / 3, side / 2), new THREE.Vector3(0, (-high * 2) / 3, 0), 0.014, 5),
  ]);
  const white = new THREE.MeshBasicMaterial({ color: '#dfe6ff' });
  const bright = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const triangles = new THREE.InstancedMesh(tubes, white, COLS * 2);
  const spheres = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), bright, COLS * 2);
  triangles.frustumCulled = spheres.frustumCulled = false;
  group.add(triangles, spheres);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const v = new THREE.Vector3();
  const hang = (t: number, moving: boolean) => {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < 2; r++) {
        const y = moving ? 3.85 + 0.85 * Math.sin(t * 0.7 + c * 0.32 + r * 1.4) : 3.4;
        const roll = moving ? 0.3 * Math.sin(t * 0.45 + c * 0.41 + r * 2) : 0;
        v.set(-5 + c * 0.4, y, -(43.5 + r * 1.1));
        m4.compose(v, q.setFromEuler(e.set(roll, 0, 0)), one);
        triangles.setMatrixAt(c * 2 + r, m4);
        spheres.setMatrixAt(c * 2 + r, m4);
      }
    }
    triangles.instanceMatrix.needsUpdate = spheres.instanceMatrix.needsUpdate = true;
  };
  hang(0, false);

  /* ----------------------------------------------------------- the walkway ---- */
  // black steel on round black columns, a balustrade of upright ribs between rails; a stair at each end
  const rails: G2[][] = [
    [
      [-1.3, 41.9],
      [7.2, 42.6],
      [9.9, 44.3],
      [9.9, 44.6],
    ],
    [
      [-1.3, 38.95],
      [-1.3, 38.3],
      [11, 41.9],
    ],
    [
      [9.9, 45.8],
      [9.9, 46.1],
      [11, 46.1],
    ],
    [
      [-4.7, 41.9],
      [-1.3, 41.9],
    ],
    [
      [-4.7, 40.6],
      [-1.3, 40.6],
      [-1.3, 40.3],
    ],
  ];
  for (const r of rails) railing(s, blackSteel, r, U, GUESS.balconyRail, Q.props ? 0.14 : 0.28);
  const tread = fin.plain('#1b1b1e', { rough: 0.6, metal: 0.5 });
  // the west stair has a pale stringer
  openStair(s, { tread, steel: fin.plain('#b9b4aa', { rough: 0.6, metal: 0.2 }) }, stairOf(kit, 'stair-a'));
  openStair(s, { tread, steel: blackSteel }, stairOf(kit, 'stair-b'));

  /* ---------------------------------------- under the walkway, the south side ---- */
  // the DJ booth: long and low with a black front, between two square columns that carry portrait screens
  const [x0, i0, x1, i1] = BOOTH_103;
  s.add(black, B(x0, i1 - 0.08, x1, i1, 0, 1.15));
  s.add(black, B(x0, i0, x0 + 0.06, i1, 0, 1.15));
  s.add(black, B(x1 - 0.06, i0, x1, i1, 0, 1.15));
  const deskTop = 0.97;
  s.add(fin.plain('#1c1c1f', { rough: 0.5 }), B(x0 + 0.06, i1 - 0.72, x1 - 0.06, i1 - 0.08, 0.92, deskTop));
  // the same CDJ-3000 and mixer as The Box: two players with the mixer between them
  boothGear(kit, 'the103', DESK_103, deskTop, 'cdjs');
  const portraits = BOOTH_COLUMNS.map(([c0, j0, c1, j1]) => {
    s.add(black, B(c0, j0, c1, j1, 0, U - 0.2));
    const screen = ledScreen(fin, '#b04cff', 0.7);
    group.add(new THREE.Mesh(panel([c0 + 0.03, j1 + 0.012], [c1 - 0.03, j1 + 0.012], 0.75, 2.25, true), screen));
    return screen;
  });
  // a floor speaker beside it
  cabinet(s, fin, 3.4, 38.85, 4.4, 39.75, 0, 1.3, 'ns');
  // booth seating along the curved south wall
  const [sa, sb] = SEATING_103;
  const len = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]);
  const off: G2 = [((sb[1] - sa[1]) / len) * 0.25, (-(sb[0] - sa[0]) / len) * 0.25];
  const leather = fin.surface('velvet', '#24242a', { relief: 0.8, rough: 0.7 });
  s.add(black, along(sa, sb, 0.56, 0, 0.14));
  s.add(leather, along(sa, sb, 0.6, 0.14, 0.45));
  s.add(leather, along([sa[0] + off[0], sa[1] + off[1]], [sb[0] + off[0], sb[1] + off[1]], 0.12, 0.14, 0.95));
  // a second, smaller counter with a perforated-metal front
  const [k0, l0, k1, l1] = GUESS.smallCounter;
  s.add(black, B(k0 + 0.03, l0, k1, l1, 0, 1));
  s.add(fin.plain('#8a8d92', { rough: 0.35, metal: 0.8 }), B(k0 - 0.05, l0, k1, l1, 1, GUESS.counterHeight));
  const amber = fin.glow('#c9772a', true);
  s.add(amber, panel([k0 + 0.02, l0 + 0.05], [k0 + 0.02, l1 - 0.05], 0.1, 0.96));
  s.add(fin.mesh('#3a3c40', 0.05), panel([k0, l0], [k0, l1], 0.04, 1, true));

  kit.dust('the103', 3, 500, [-11, 11], [0.6, 6.2], [-48, -36], 0.5);

  /* ------------------------------------------------- the passages to The Box ---- */
  // dark boards, red downlights, a heavy curtain drawn back at the door to The Box
  const lamp = fin.glow('#ff3a2a', true);
  const velvet = fin.surface('velvet', '#3a0d10', { relief: 1, rough: 0.95 });
  const pole = fin.plain('#2a2a2d', { rough: 0.4, metal: 0.8 });
  const ceiling = GUESS.boxTunnelCeiling;
  const t1 = kit.site('tunnel1');
  for (const r of [-15.3, -13.9, -12.6]) t1.add(lamp, cyl(r, 46.9, 0.06, ceiling - 0.012, ceiling - 0.004, 12));
  t1.add(velvet, B(-16.27, 46.9, -16.1, 47.14, 0.03, 2.28));
  t1.add(pole, tube(V3(-16.19, 2.3, 45.64), V3(-16.19, 2.3, 47.2), 0.018));
  const t2 = kit.site('tunnel2');
  for (const r of [-14.6, -13.4, -12.3]) t2.add(lamp, cyl(r, 36.5, 0.06, ceiling - 0.012, ceiling - 0.004, 12));
  t2.add(velvet, B(-15.27, 35.14, -15.1, 35.5, 0.03, 2.28));
  t2.add(velvet, B(-15.27, 37.64, -15.1, 37.88, 0.03, 2.28));
  t2.add(pole, tube(V3(-15.19, 2.3, 35.12), V3(-15.19, 2.3, 37.88), 0.018));
  // the yellow sign at the bend: caution, excessive sound levels, with a small crest at its foot
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshStandardMaterial({ map: fin.sign('warning'), roughness: 0.6, emissiveMap: fin.sign('warning'), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.22 }));
  const crestWidth = GUESS.crest.sign.width;
  const crest = new THREE.Mesh(new THREE.PlaneGeometry(crestWidth, crestWidth / CREST_ASPECT), new THREE.MeshBasicMaterial({ map: kit.crest, color: '#111111', transparent: true, alphaTest: 0.35 }));
  crest.position.set(0, -0.33, 0.004);
  sign.add(crest);
  if (GUESS.signTunnel === 'tunnel1') {
    sign.position.set(-16.28, 1.6, -47.62);
    sign.rotation.y = Math.PI / 2;
    kit.siteGroup('tunnel1').add(sign);
  } else {
    sign.position.set(-14.6, 1.6, -37.88);
    kit.siteGroup('tunnel2').add(sign);
  }

  /* --------------------------------------------------------- the tech room ---- */
  const racks = kit.site('techroom');
  const [q0, p0, q1, p1] = TECH_RACKS;
  const n = Math.round((p1 - p0) / 0.6);
  const leds = [fin.glow('#22e05a'), fin.glow('#ffb020'), fin.glow('#3a8cff')];
  for (let k = 0; k < n; k++) {
    const a = p0 + ((p1 - p0) * k) / n;
    const b = p0 + ((p1 - p0) * (k + 1)) / n;
    racks.add(fin.plain('#151517', { rough: 0.5, metal: 0.5 }), B(q0, a + 0.01, q1, b - 0.01, 0, 2));
    racks.add(fin.mesh('#4a4d52', 0.03), panel([q1 + 0.012, a + 0.04], [q1 + 0.012, b - 0.04], 0.1, 1.94, true));
    for (let j = 0; j < 7; j++) racks.add(leds[Math.floor(rnd(k * 9 + j) * leds.length)], B(q1 + 0.004, a + 0.1 + rnd(k * 7 + j + 0.3) * 0.35, q1 + 0.008, a + 0.13 + rnd(k * 7 + j + 0.3) * 0.35, 0.3 + j * 0.24, 0.32 + j * 0.24));
  }

  /* ------------------------------------------------------- night and day ---- */
  playScreens(kit, [barScreen, ...portraits], 0.72, 0.07);
  kit.onTime((night) => {
    strip.color.set(night ? '#fff0d8' : '#5a564e');
    fridge.color.set(night ? '#b7d4ff' : '#4a525e');
    shelfLight.color.set(night ? '#ffe2b8' : '#5a544a');
    amber.color.set(night ? '#c9772a' : '#3a2a1c');
    lamp.color.set(night ? '#ff3a2a' : '#5a2420');
    white.color.set(night ? '#dfe6ff' : '#77797e');
    bright.color.set(night ? '#ffffff' : '#8a8c90');
    if (!night) hang(0, false);
  });
  kit.animate(({ t }, night) => {
    if (night) hang(t, true);
  });
}
