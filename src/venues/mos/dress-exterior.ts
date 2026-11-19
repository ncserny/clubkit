import * as THREE from 'three';
import { mapBuilding } from '../../engine/city';
import { extrude, groundPolygon } from '../../engine/geom';
import { checkerPlate } from '../../engine/materials';
import { barrierGeometry } from '../../engine/props';
import type { Pt } from '../../engine/types';
import { CREST_ASPECT } from './build';
import { B, along, bottles, cyl, flat, mirrorBall, panel, quad4, trussLeg, trussRun, tube, V3, type Kit } from './kit';
import { ARCH_AT, COURT, COURT_BAR, GATE_LEAVES, GUESS, K, OVERHANG, PICNIC_BENCHES, QUEUE_BARRIERS, SEARCH_ARCHES } from './plan';
import { LEFT_FLANK_ID } from './surroundings';

/**
 * Gaunt Street and the courtyard. Sources: research sections 3 (the approach), 7.10 (finishes)
 * and 8.6 (what carries the name out here: the projection on the flank, the two round queue
 * signs, one banner at the gate, the crest on the shutter by day, the orange boards on the lamp posts).
 *
 * Everything in the courtyard and on the pavement is on the courtyard grid: `a` metres along
 * the street boundary, `b` metres in from it (negative out on the pavement).
 */

const FRONT = COURT.depth;
/** Paving is laid a little above the ground the city draws. */
const PAVED = 0.07;

/**
 * The street: the neighbour whose flank takes the projection, the pavement, and what stands on it.
 * Returns what is only seen from out of doors.
 */
export function dressStreet(kit: Kit) {
  const { ctx, fin } = kit;
  const outside = new THREE.Group();
  outside.name = 'ministry-outside';
  ctx.root.add(outside);
  const y = kit.yard('courtyard');
  const group = kit.yardGroup('courtyard');

  /* ------------------------------------------------ the left neighbour ---- */
  // The map has its outline. Toward the courtyard it is blank brick, many storeys high; on the
  // street it has windows over a cream-rendered ground floor with a rounded red fascia.
  const flank = mapBuilding(ctx.map, LEFT_FLANK_ID);
  if (flank) {
    const { walls, roof } = extrude(flank.p, flank.h);
    for (const [g, m] of [
      [walls, fin.surface('brick', '#6f5140', { relief: 1, side: THREE.FrontSide })],
      [roof, fin.plain('#3f3d3a')],
    ] as const) {
      const mesh = new THREE.Mesh(g, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      outside.add(mesh);
    }
  }
  // its street face runs from a = -12 to the courtyard's corner
  const face = fin.surface('lancaster', '#b08c70', { emissive: '#ffffff', glow: 0 });
  face.emissiveMap = fin.painting('lancasterNight');
  y.add(face, panel([-12, -0.03], [-0.03, -0.03], 3.6, GUESS.leftFlankHeight - 0.4, true));
  y.add(fin.surface('concrete', '#e6dfcf', { relief: 0.3 }), B(-12, -0.1, -0.03, 0.05, 0, 3.1));
  const red = fin.plain('#b3261e', { rough: 0.5 });
  y.add(red, B(-12, -0.2, -0.03, 0.05, 3.1, 3.6));
  y.add(red, new THREE.CylinderGeometry(0.25, 0.25, 11.97, 14).rotateZ(Math.PI / 2).translate(-6.015, 3.35, 0.2));
  const glass = fin.plain('#14181c', { rough: 0.15, metal: 0.4 });
  for (let a = -11.3; a < -1; a += 2.6) y.add(glass, B(a, -0.12, a + 2.1, -0.08, 0.5, 2.7));
  kit.onTime((night) => (face.emissiveIntensity = night ? 0.55 : 0));

  /* ---------------------------------------------------- the projection ---- */
  // The crest at night: thrown on the neighbour's flank, high above the courtyard's left side.
  const projection = new THREE.Group();
  if (flank) {
    const local = flank.p.map(([x, z]) => ctx.frame.localXZ(x, z));
    const [tx, tz] = K(0, 4);
    // the flank is the side of the neighbour's outline nearest the courtyard
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < local.length; i++) {
      const p = local[i];
      const q = local[(i + 1) % local.length];
      const d = Math.hypot((p[0] + q[0]) / 2 - tx, (p[1] + q[1]) / 2 - tz);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    let a: Pt = local[best];
    let b: Pt = local[(best + 1) % local.length];
    // measure along it from the street end
    if (a[1] < b[1]) [a, b] = [b, a];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / len;
    const dz = (b[1] - a[1]) / len;
    // the normal that points over the courtyard
    let nx = -dz;
    let nz = dx;
    const [cx, cz] = K(COURT.width / 2, 4);
    if (nx * (cx - a[0]) + nz * (cz - a[1]) < 0) {
      nx = -nx;
      nz = -nz;
    }
    const proj = GUESS.crest.projection;
    const at = Math.min(proj.along, len - proj.width / 2);
    projection.position.set(a[0] + dx * at + nx * 0.08, proj.centre, a[1] + dz * at + nz * 0.08);
    projection.rotation.y = Math.atan2(nx, nz);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(proj.width * 1.5, proj.width * 1.5), new THREE.MeshBasicMaterial({ map: fin.sign('halo'), color: '#e8ead8', transparent: true, opacity: 0.22, depthWrite: false }));
    const image = new THREE.Mesh(new THREE.PlaneGeometry(proj.width, proj.width / CREST_ASPECT), new THREE.MeshBasicMaterial({ map: kit.crest, color: '#e8ead8', transparent: true, opacity: 0.82, depthWrite: false }));
    image.position.z = 0.02;
    image.renderOrder = 2;
    beam.renderOrder = 1;
    projection.add(beam, image);
  }
  ctx.group.add(projection);
  // the group of the venue is always drawn, so the projection follows what is seen from out of doors
  kit.animate((_, night) => (projection.visible = night && outside.visible));

  /* ------------------------------------------------------ the pavement ---- */
  // From the building line to the kerb. The road in the map is a little nearer than the
  // barriers allow, so the pavement is drawn at least GUESS.pavement wide.
  const kerbAt = (a: number) => Math.min(-1.1 - 0.0487 * (a + 13.6), -GUESS.pavement);
  const bend = (GUESS.pavement - 1.1) / 0.0487 - 13.6;
  const XZ = (a: number, b: number): Pt => [a, -b];
  y.add(fin.surface('paving', '#8f8a86', { relief: 0.8 }), groundPolygon([XZ(-13.5, 0.1), XZ(-13.5, kerbAt(-13.5)), XZ(bend, kerbAt(bend)), XZ(41.5, kerbAt(41.5)), XZ(41.5, -0.35), XZ(COURT.width, 0.1)], PAVED));
  const kerb = fin.surface('concrete', '#9a9893', { relief: 0.3 });
  y.add(kerb, along([-13.5, kerbAt(-13.5) - 0.07], [bend, kerbAt(bend) - 0.07], 0.15, 0.03, PAVED + 0.012));
  y.add(kerb, along([bend, kerbAt(bend) - 0.07], [41.5, kerbAt(41.5) - 0.07], 0.15, 0.03, PAVED + 0.012));
  // "BUS STAND" in yellow on the road
  const marking = new THREE.Mesh(flat(13.6, -3.5, 19.4, -4.6, 0.068), new THREE.MeshStandardMaterial({ map: fin.sign('busStand'), transparent: true, opacity: 0.8, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
  marking.receiveShadow = true;
  group.add(marking);

  const black = fin.plain('#0e0e10', { rough: 0.5, metal: 0.4 });
  const dark = fin.plain('#2a2c2e', { rough: 0.5, metal: 0.6 });
  // four black bollards at the kerb in front of the gate
  for (const a of GUESS.bollards.along) {
    y.add(black, cyl(a, -GUESS.bollards.out, 0.075, PAVED, PAVED + GUESS.bollards.height - 0.06, 10));
    y.add(black, new THREE.SphereGeometry(0.085, 10, 6).translate(a, PAVED + GUESS.bollards.height - 0.06, GUESS.bollards.out));
  }

  /* --------------------------------------------- what carries the name ---- */
  const signMat = (name: 'guestList' | 'tickets' | 'neighbours') => new THREE.MeshStandardMaterial({ map: fin.sign(name), transparent: true, alphaTest: 0.5, roughness: 0.7, emissiveMap: fin.sign(name), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.18 });
  const crestMat = (colour: string) => new THREE.MeshBasicMaterial({ map: kit.crest, color: colour, transparent: true, alphaTest: 0.35 });
  const whiteCrest = crestMat('#e9e9e4');
  // the two round queue signs: a black disc with a yellow ring on a post, read from the pavement and from the gate
  const S = GUESS.queueSigns;
  for (const [at, name] of [
    [S.guest, 'guestList'],
    [S.tickets, 'tickets'],
  ] as const) {
    y.add(black, cyl(at[0], at[1], 0.022, PAVED, S.centre + S.disc / 2, 8));
    y.add(black, B(at[0] - 0.2, at[1] - 0.2, at[0] + 0.2, at[1] + 0.2, PAVED, PAVED + 0.03));
    const mat = signMat(name);
    for (const turn of [0, Math.PI]) {
      const side = turn ? -1 : 1;
      const disc = new THREE.Mesh(new THREE.CircleGeometry(S.disc / 2, 32), mat);
      disc.position.set(at[0], S.centre, -at[1] + 0.03 * side);
      disc.rotation.y = turn;
      const crest = new THREE.Mesh(new THREE.PlaneGeometry(S.crest, S.crest / CREST_ASPECT), whiteCrest);
      crest.position.set(at[0], S.centre - S.disc * 0.26, -at[1] + 0.034 * side);
      crest.rotation.y = turn;
      group.add(disc, crest);
    }
  }
  // the banner: grey mesh on a temporary fence panel beside the gate, the crest on it in white
  const N = GUESS.banner;
  const galv = fin.plain('#8f949a', { rough: 0.45, metal: 0.8 });
  for (const a of N.along) {
    y.add(galv, cyl(a, -N.out, 0.02, PAVED, N.height, 6));
    y.add(fin.plain('#5a5a58'), B(a - 0.11, -N.out - 0.3, a + 0.11, -N.out + 0.3, PAVED, PAVED + 0.12));
  }
  for (const h of [0.2, N.height - 0.02]) y.add(galv, along([N.along[0], -N.out], [N.along[1], -N.out], 0.03, h, h + 0.03));
  y.add(fin.mesh('#9aa0a6', 0.1), panel([N.along[0], -N.out], [N.along[1], -N.out], 0.22, N.height - 0.02, true));
  const cloth = new THREE.MeshStandardMaterial({ color: '#7d8084', roughness: 0.95, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
  const mid = (N.along[0] + N.along[1]) / 2;
  const banner = new THREE.Mesh(panel([N.along[0] + 0.1, -N.out - 0.025], [N.along[1] - 0.1, -N.out - 0.025], 0.4, N.height - 0.2), cloth);
  const bannerCrest = new THREE.Mesh(new THREE.PlaneGeometry(N.crest, N.crest / CREST_ASPECT), whiteCrest);
  bannerCrest.position.set(mid, (0.4 + N.height - 0.2) / 2, N.out + 0.04);
  group.add(banner, bannerCrest);
  // lamp posts, each with an orange board asking people to respect the neighbours
  const lamp = fin.glow('#ffd9a0', true);
  const darkCrest = crestMat('#3a3a3a');
  const board = signMat('neighbours');
  for (const [a, b] of GUESS.neighbourSigns) {
    y.add(dark, cyl(a, b, 0.07, PAVED, 6, 10));
    y.add(dark, along([a, b], [a, b - 1.3], 0.06, 5.94, 6));
    y.add(lamp, B(a - 0.12, b - 1.45, a + 0.12, b - 0.95, 5.88, 5.94));
    // the board faces along the pavement, both ways
    for (const side of [-1, 1]) {
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.6), board);
      face.position.set(a + 0.085 * side, 1.8, -b);
      face.rotation.y = (Math.PI / 2) * side;
      const crest = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07 / CREST_ASPECT), darkCrest);
      crest.position.set(a + 0.089 * side, 1.58, -b);
      crest.rotation.y = (Math.PI / 2) * side;
      group.add(face, crest);
    }
  }
  kit.onTime((night) => lamp.color.set(night ? '#ffd9a0' : '#8a8478'));

  /* ----------------------------------------------- the queue and the gate ---- */
  // crowd barriers along the kerb: general admission to the right of the gate, the guest list to the left
  const spots: [number, number, number][] = [];
  for (const [a0, a1] of [QUEUE_BARRIERS.general, QUEUE_BARRIERS.guest]) {
    const n = Math.max(1, Math.round((a1 - a0) / 2.5));
    for (let i = 0; i < n; i++) spots.push([a0 + ((a1 - a0) * (i + 0.5)) / n, -GUESS.queue.barrier, 0]);
  }
  // and one closing the gap beside the search arches
  spots.push([(0.55 + SEARCH_ARCHES[0][0] - 0.1) / 2, ARCH_AT, (SEARCH_ARCHES[0][0] - 0.65) / 2.45]);
  const barriers = new THREE.InstancedMesh(barrierGeometry(), galv, spots.length);
  const m4 = new THREE.Matrix4();
  spots.forEach(([a, b, scale], i) => barriers.setMatrixAt(i, m4.makeScale(scale || 1, 1, 1).setPosition(a, PAVED, -b)));
  barriers.castShadow = true;
  group.add(barriers);
  // the host's table at the guest-list gate
  const T = GUESS.hostTable;
  y.add(black, B(T[0], T[1], T[2], T[3], 0.72, 0.76));
  y.add(fin.plain('#0b0b0c', { rough: 0.95 }), B(T[0] + 0.02, T[1] + 0.02, T[2] - 0.02, T[3] - 0.02, PAVED, 0.72));
  y.add(fin.plain('#e8e6e0'), B(T[0] + 0.2, T[1] + 0.12, T[0] + 0.42, T[1] + 0.42, 0.76, 0.775));
  // the gates stand open: black leaves swung in, a frame and a sheet of ribbed steel each
  const sheet = fin.surface('ribbed', '#17171a', { turn: true, scale: 0.6, relief: 0.6, rough: 0.6, metal: 0.3 });
  for (const [a, len] of GATE_LEAVES) {
    y.add(sheet, B(a - 0.02, 0.1, a + 0.02, 0.1 + len, 0.12, GUESS.boundaryHeight - 0.05));
    for (const b of [0.1, 0.1 + len]) y.add(black, B(a - 0.04, b - 0.04, a + 0.04, b + 0.04, PAVED, GUESS.boundaryHeight));
    y.add(black, B(a - 0.035, 0.1, a + 0.035, 0.1 + len, GUESS.boundaryHeight - 0.08, GUESS.boundaryHeight));
  }
  // a capping along the boundary panels, and a jamb at each side of each gate
  for (const [a0, a1] of [
    [-0.2, COURT.mainGate[0]],
    [COURT.mainGate[1], COURT.secondGate[0]],
    [COURT.secondGate[1], COURT.width + 0.2],
  ]) {
    y.add(black, B(a0, -0.1, a1, 0.1, GUESS.boundaryHeight, GUESS.boundaryHeight + 0.06));
    for (const a of [a0, a1]) y.add(black, B(a - 0.09, -0.11, a + 0.09, 0.11, PAVED, GUESS.boundaryHeight + 0.12));
  }

  return outside;
}

/** The courtyard: paving, the lane of truss portals, the hedge and its screen, the bar, the overhang and what hangs under it, the building front. */
export function dressCourtyard(kit: Kit) {
  const { fin } = kit;
  const y = kit.yard('courtyard');
  const group = kit.yardGroup('courtyard');
  const black = fin.plain('#0e0e10', { rough: 0.5, metal: 0.4 });
  const steel = fin.plain('#1c1c1f', { rough: 0.5, metal: 0.6 });
  const alu = fin.plain('#b4b8be', { rough: 0.35, metal: 0.85 });
  const timber = fin.surface('boards', '#8a6a48', { relief: 0.8, scale: 0.6 });

  y.add(fin.surface('paving', '#938986', { relief: 0.8 }), groundPolygon([[0, 0], [COURT.width, 0], [COURT.width, -FRONT], [0, -FRONT]], 0.06));

  /* ---------------------------------------------------- the entrance lane ---- */
  // truss portals from the main gate to the doors, each leg carrying a blue tube
  const L = GUESS.trussLane;
  const blue = fin.glow('#3a5cff', true);
  for (const b of L.at) {
    for (const a of L.legs) {
      trussLeg(y, alu, a, b, 0.06, L.height);
      y.add(blue, cyl(a + (a < 2 ? 0.2 : -0.2), b, 0.022, 0.4, L.height - 0.3, 6));
    }
    trussRun(y, alu, [L.legs[0], b], [L.legs[1], b], L.height + 0.14);
    y.add(blue, tube(V3(L.legs[0] + 0.3, L.height - 0.05, b), V3(L.legs[1] - 0.3, L.height - 0.05, b), 0.022));
  }
  kit.onTime((night) => blue.color.set(night ? '#3a5cff' : '#59607a'));
  // planters along the left wall
  const P = GUESS.planters;
  const leaves = fin.surface('hedge', '#557a44', { relief: 1.2 });
  const n = Math.round((P.to - P.from) / 1.8);
  for (let k = 0; k < n; k++) {
    const b0 = P.from + ((P.to - P.from) * k) / n + 0.06;
    const b1 = P.from + ((P.to - P.from) * (k + 1)) / n - 0.06;
    y.add(fin.surface('boards', '#3b2f26', { relief: 0.8, scale: 0.6, turn: true }), B(0.1, b0, 0.1 + P.depth, b1, 0.06, P.height));
    y.add(leaves, B(0.15, b0 + 0.06, 0.05 + P.depth, b1 - 0.06, P.height, P.height + 0.55));
  }
  // the search arches under the overhang
  const arch = fin.plain('#c9ccd0', { rough: 0.5 });
  const ready = fin.glow('#22e05a');
  for (const [a0, a1] of SEARCH_ARCHES) {
    y.add(arch, B(a0 - 0.08, ARCH_AT - 0.25, a0, ARCH_AT + 0.25, 0.06, 2.2));
    y.add(arch, B(a1, ARCH_AT - 0.25, a1 + 0.08, ARCH_AT + 0.25, 0.06, 2.2));
    y.add(arch, B(a0 - 0.08, ARCH_AT - 0.25, a1 + 0.08, ARCH_AT + 0.25, 2.2, 2.36));
    y.add(ready, B(a0 + 0.1, ARCH_AT - 0.26, a0 + 0.3, ARCH_AT - 0.25, 2.25, 2.31));
  }
  // the red wall under the overhang: wall lights over a slatted bench
  const R = GUESS.redWall.bench;
  const warm = fin.glow('#ffd9a0', true);
  for (const b of [9.7, 11.5, 13.3]) {
    y.add(black, B(0.0, b - 0.09, 0.07, b + 0.09, 2.0, 2.3));
    y.add(warm, B(0.07, b - 0.07, 0.09, b + 0.07, 2.02, 2.28));
  }
  y.add(timber, B(R[0], R[1], R[2], R[3], 0.4, 0.45));
  for (const b of [R[1] + 0.15, (R[1] + R[3]) / 2, R[3] - 0.15]) y.add(black, B(R[0] + 0.04, b - 0.03, R[2] - 0.04, b + 0.03, 0.06, 0.4));

  /* -------------------------------------------- the hedge and the bar ---- */
  // an LED screen on the hedge's long leg, facing the building
  const H = GUESS.hedgeScreen;
  const led = new THREE.MeshBasicMaterial({ map: fin.painting('led').clone(), color: '#5a6cff' });
  led.map!.wrapS = led.map!.wrapT = THREE.RepeatWrapping;
  led.map!.repeat.set(1.5, 1);
  led.map!.needsUpdate = true;
  y.add(black, B(H.along[0] - 0.06, 6.87, H.along[1] + 0.06, 6.93, H.foot - 0.06, H.top + 0.06));
  group.add(new THREE.Mesh(panel([H.along[1], 6.94], [H.along[0], 6.94], H.foot, H.top), led));
  // the bar is a container that serves toward the building through a hatch
  const [c0, d0, c1, d1] = COURT_BAR;
  const container = fin.surface('ribbed', '#1c1d20', { turn: true, scale: 0.35, relief: 0.9, rough: 0.55, metal: 0.4 });
  y.add(container, B(c0, d0, c1, d0 + 0.06, 0.06, 2.6));
  y.add(container, B(c0, d0, c0 + 0.06, d1, 0.06, 2.6));
  y.add(container, B(c1 - 0.06, d0, c1, d1, 0.06, 2.6));
  y.add(container, B(c0, d0, c1, d1, 2.52, 2.6));
  y.add(container, B(c0, d1 - 0.06, c1, d1, 0.06, 1));
  y.add(container, B(c0, d1 - 0.06, c1, d1, 2.1, 2.6));
  y.add(container, B(c0, d1 - 0.06, c0 + 0.5, d1, 1, 2.1));
  y.add(container, B(c1 - 0.5, d1 - 0.06, c1, d1, 1, 2.1));
  y.add(fin.plain('#111113'), B(c0 + 0.06, d0 + 0.06, c1 - 0.06, d1 - 0.06, 0.06, 0.1));
  y.add(timber, B(c0 + 0.4, d1 - 0.14, c1 - 0.4, d1 + 0.3, 1, 1.06));
  const strip = fin.glow('#ffc890', true);
  y.add(strip, B(c0 + 0.5, d1 - 0.1, c1 - 0.5, d1 - 0.07, 2.05, 2.09));
  for (const h of [1.25, 1.7]) {
    y.add(timber, B(c0 + 0.2, d0 + 0.06, c1 - 0.2, d0 + 0.3, h, h + 0.03));
    bottles(kit, y, [c0 + 0.3, d0 + 0.18], [c1 - 0.3, d0 + 0.18], h + 0.03, 0.12, h * 7);
  }
  y.add(fin.glow('#9fc4ff'), B(c0 + 0.3, d0 + 0.06, c0 + 2.2, d0 + 0.09, 0.25, 1.05));
  // an awning over the hatch
  group.add(new THREE.Mesh(quad4([V3(c0, 2.6, d1), V3(c1, 2.6, d1), V3(c1, 2.32, d1 + 1.25), V3(c0, 2.32, d1 + 1.25)]), fin.plain('#141416', { rough: 0.9 })));

  /* -------------------------------------------------------- the overhang ---- */
  const b0 = FRONT - OVERHANG.depth;
  const soffit = GUESS.overhangSoffit;
  // a deep black fascia with a pale soffit, on the two piers the plan gives
  y.add(fin.surface('block', '#1d1c1f', { relief: 0.5 }), B(0, b0, COURT.width, FRONT, soffit, GUESS.fasciaTop));
  y.add(fin.surface('concrete', '#cfcac4', { relief: 0.3 }), B(0.1, b0 + 0.1, COURT.width - 0.1, FRONT - 0.1, soffit - 0.03, soffit - 0.005));
  // black chequer-plate kick bands round the piers
  const plate = checkerPlate();
  plate.wrapS = plate.wrapT = THREE.RepeatWrapping;
  plate.repeat.set(2.5, 2.5);
  const kick = new THREE.MeshStandardMaterial({ map: plate, color: '#5c5c60', roughness: 0.45, metalness: 0.7 });
  for (const [a0, a1, p0, p1] of [
    [10.02, 10.52, 10.25, 10.75],
    [11.75, 12.25, 10.2, 10.7],
  ]) {
    y.add(kick, B(a0 - 0.012, p0 - 0.012, a1 + 0.012, p1 + 0.012, 0.06, 0.55));
  }
  // under it: a truss with five mirror balls, LED battens, infra-red heaters over the benches
  const trussAt = b0 + 0.75;
  trussRun(y, alu, [5.6, trussAt], [21.6, trussAt], soffit - 0.32);
  for (const a of [5.6, 13.6, 21.6]) y.add(steel, cyl(a, trussAt, 0.012, soffit - 0.18, soffit, 4));
  const mirror = fin.plain('#d5dae2', { rough: 0.12, metal: 1 });
  const ball = new THREE.InstancedMesh(mirrorBall(0.23), mirror, 5);
  [7, 10, 13, 16, 19].forEach((a, i) => {
    ball.setMatrixAt(i, new THREE.Matrix4().makeTranslation(a, soffit - 0.85, -trussAt));
    y.add(steel, cyl(a, trussAt, 0.006, soffit - 0.62, soffit - 0.46, 4));
  });
  group.add(ball);
  const batten = fin.glow('#6a4cff', true);
  for (const a of [6, 9, 15, 18, 21]) y.add(batten, B(a - 0.03, b0 + 1.7, a + 0.03, FRONT - 0.6, soffit - 0.07, soffit - 0.035));
  const heat = fin.glow('#ff5a1a', true);
  for (const a of [8.9, 11.5, 14.1, 16.7]) {
    y.add(steel, B(a - 0.35, 12.45, a + 0.35, 12.7, soffit - 0.2, soffit - 0.06));
    y.add(heat, B(a - 0.3, 12.5, a + 0.3, 12.65, soffit - 0.215, soffit - 0.2));
  }
  // the retractable canopy: steel from the street side to the overhang over the right-hand two thirds,
  // its fabric out at night and drawn back by day
  for (const a of [8, 12.5, 17, 21.5]) {
    y.add(steel, B(a - 0.08, 1.5, a + 0.08, b0, GUESS.canopyBeams - 0.25, GUESS.canopyBeams));
    y.add(steel, B(a - 0.08, 1.5, a + 0.08, 1.66, 0.06, GUESS.canopyBeams));
  }
  y.add(steel, B(8, 1.5, 21.5, 1.66, GUESS.canopyBeams - 0.25, GUESS.canopyBeams));
  const reach = b0 - 1.6;
  // (drawn from the overhang's edge toward the street, so that it gathers against the overhang)
  const fabric = new THREE.Mesh(flat(8.1, 0, 21.4, -reach, 0), new THREE.MeshStandardMaterial({ color: '#d9d5cc', roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  fabric.position.set(0, GUESS.canopyBeams + 0.02, -b0);
  fabric.castShadow = true;
  group.add(fabric);
  kit.onTime((night) => fabric.scale.set(1, 1, night ? 1 : 0.1));

  /* ---------------------------------------------------- picnic benches ---- */
  for (const a of PICNIC_BENCHES) {
    y.add(timber, B(a - 0.9, 12.22, a + 0.9, 12.98, 0.72, 0.77));
    y.add(timber, B(a - 0.9, 11.64, a + 0.9, 11.94, 0.47, 0.51));
    y.add(timber, B(a - 0.9, 13.26, a + 0.9, 13.56, 0.47, 0.51));
    for (const e of [a - 0.68, a + 0.68]) {
      y.add(steel, B(e - 0.025, 11.66, e + 0.025, 13.54, 0.43, 0.47));
      y.add(steel, tube(V3(e, 0.06, 11.72), V3(e, 0.72, 12.4), 0.022));
      y.add(steel, tube(V3(e, 0.06, 13.48), V3(e, 0.72, 12.8), 0.022));
    }
  }

  /* ------------------------------------------------- the building front ---- */
  // Left to right under the overhang: the entrance doors (an opening in the plan), a black double door, the roller shutter.
  const proud = FRONT - 0.03;
  // the entrance: its two leaves stand open against the wall, a light over it
  const D = GUESS.doubleDoor / 2;
  for (const s of [-1, 1]) {
    y.add(black, B(2.6 + s * D, FRONT - 0.09, 2.6 + s * (D + 0.88), FRONT - 0.04, 0.06, GUESS.doorHeight));
    y.add(alu, B(2.6 + s * (D + 0.2), FRONT - 0.13, 2.6 + s * (D + 0.7), FRONT - 0.1, 1, 1.04));
  }
  y.add(black, B(2.6 - D - 0.08, FRONT - 0.06, 2.6 + D + 0.08, FRONT + 0.02, GUESS.doorHeight, GUESS.doorHeight + 0.1));
  y.add(warm, B(2.3, FRONT - 0.09, 2.9, FRONT - 0.05, GUESS.doorHeight + 0.2, GUESS.doorHeight + 0.26));
  // the black double door, with a green running-man sign over it
  y.add(fin.plain('#18181a', { rough: 0.6, metal: 0.3 }), B(6.4, proud, 8.2, FRONT, 0.06, 2.2));
  y.add(black, B(7.29, proud - 0.01, 7.31, FRONT, 0.06, 2.2));
  for (const a of [6.6, 7.4]) y.add(alu, B(a, proud - 0.04, a + 0.6, proud - 0.015, 1, 1.04));
  y.add(fin.glow('#22e05a'), B(7.05, proud, 7.55, FRONT, 2.25, 2.42));
  // the roller shutter, and on it the crest, tone on tone and unlit: by day this is the sign
  const S = GUESS.shutter;
  y.add(fin.surface('ribbed', '#17181c', { scale: 0.8, relief: 1, rough: 0.5, metal: 0.5 }), B(S.along - S.width / 2, proud, S.along + S.width / 2, FRONT, 0.06, S.height));
  y.add(black, B(S.along - S.width / 2 - 0.1, proud - 0.02, S.along + S.width / 2 + 0.1, FRONT, S.height, S.height + 0.3));
  for (const s of [-1, 1]) y.add(black, B(S.along + s * (S.width / 2), proud - 0.02, S.along + s * (S.width / 2 + 0.1), FRONT, 0.06, S.height));
  const onShutter = GUESS.crest.shutter;
  const shutterCrest = new THREE.Mesh(new THREE.PlaneGeometry(onShutter.width, onShutter.width / CREST_ASPECT), new THREE.MeshStandardMaterial({ map: kit.crest, color: '#2a2b30', roughness: 0.8, transparent: true, alphaTest: 0.4 }));
  shutterCrest.position.set(S.along, onShutter.centre, -proud + 0.012);
  group.add(shutterCrest);

  kit.onTime((night) => {
    warm.color.set(night ? '#ffd9a0' : '#8a8478');
    strip.color.set(night ? '#ffc890' : '#6a6258');
    heat.color.set(night ? '#ff5a1a' : '#3a2a24');
    if (!night) {
      batten.color.set('#3a3a44');
      led.color.set('#1c1e2a');
    }
  });
  const colour = new THREE.Color();
  kit.animate(({ t, pulse }, night) => {
    if (!night) return;
    batten.color.copy(colour.setHSL(0.7 + 0.08 * Math.sin(t * 0.17), 0.8, 0.5));
    led.color.copy(colour.setHSL(0.66 + 0.1 * Math.sin(t * 0.23), 0.8, 0.42 + 0.12 * pulse));
    led.map!.offset.x = t * 0.04;
  });
}
