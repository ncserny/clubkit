import * as THREE from 'three';
import { extrude } from '../../engine/geom';
import { B, along, cabinet, cyl, ledScreen, movingHeads, openStair, panel, playScreens, quad4, railing, stairOf, swirlScreen, tube, V3, type G2, type Kit } from './kit';
import { boothGear } from './booth-gear';
import { BOX_BOOTH_SIDES, BOX_DESK, BOX_PINS, BOX_SPOTS, BOX_STACKS, BOX_WASHES, GUESS, MEASURED, latticeAt } from './plan';

/**
 * The Box as it reopened on 30 January 2026 (research 3.5): the booth in the crowd, the deck
 * behind it, the lattice of light and video over the floor, the screen that climbs the wall
 * behind the DJ and runs out overhead, six loudspeakers flown round the floor. No bar, no seats.
 */

const U = GUESS.upperLevel;
const TOP = MEASURED.boxCeiling;

export function dressBox(kit: Kit) {
  const { fin, Q } = kit;
  const s = kit.site('box');
  const group = kit.siteGroup('box');
  const black = fin.plain('#0b0b0c', { rough: 0.55, metal: 0.3 });
  const steel = fin.plain('#151517', { rough: 0.45, metal: 0.7 });

  /* -------------------------------------------------------------- the booth ---- */
  // a black island in the crowd: a desk with its front to the floor, a low wall down each side, open to the deck behind
  const deskTop = 0.95;
  const desk = extrude(BOX_DESK, deskTop);
  s.add(black, desk.walls);
  s.add(fin.plain('#1b1b1e', { rough: 0.45, metal: 0.3 }), desk.roof);
  const front: [G2, G2] = [BOX_BOOTH_SIDES[0][1], BOX_BOOTH_SIDES[1][1]];
  s.add(black, along(front[0], front[1], 0.08, 0, GUESS.boothFront));
  for (const [a, b] of BOX_BOOTH_SIDES) s.add(black, along(a, b, 0.1, 0, GUESS.boothFront));
  const mid = (t: number, back = 0.55): G2 => [front[0][0] + (front[1][0] - front[0][0]) * t - back * 0.99, front[0][1] + (front[1][1] - front[0][1]) * t - back * 0.134];
  // players, turntables and a mixer
  boothGear(kit, 'box', BOX_DESK, deskTop);
  // booth monitors on the deck side
  for (const t of [0.07, 0.93]) s.add(black, along(mid(t - 0.055, 0.8), mid(t + 0.055, 0.8), 0.4, deskTop, deskTop + 0.6));
  // a line of light along the top of the front
  const edge = fin.glow('#a8e8ff', true);
  s.add(edge, along([front[0][0] + 0.045, front[0][1]], [front[1][0] + 0.045, front[1][1]], 0.012, GUESS.boothFront - 0.05, GUESS.boothFront - 0.02));
  // eight white blinders along the edge of the deck behind
  const blinder = fin.glow('#ffffff', true);
  const deckEdge = (inn: number) => -32.5 + ((44.9 - inn) / 14.85) * 1.35;
  for (let k = 0; k < 8; k++) {
    const inn = 37.35 + k * 0.48;
    const r = deckEdge(inn) + 0.02;
    s.add(black, B(r - 0.22, inn - 0.17, r, inn + 0.17, GUESS.vipDeck, GUESS.vipDeck + 0.3));
    s.add(blinder, B(r, inn - 0.14, r + 0.012, inn + 0.14, GUESS.vipDeck + 0.04, GUESS.vipDeck + 0.26));
  }
  // the subs: a black block north and south of the booth
  for (const [r0, i0, r1, i1] of BOX_STACKS) {
    cabinet(s, fin, r0, i0, r1, (i0 + i1) / 2, 0, GUESS.speakerBlock / 2, 'ew');
    cabinet(s, fin, r0, (i0 + i1) / 2, r1, i1, 0, GUESS.speakerBlock / 2, 'ew');
    cabinet(s, fin, r0, i0, r1, (i0 + i1) / 2, GUESS.speakerBlock / 2, GUESS.speakerBlock, 'ew');
    cabinet(s, fin, r0, (i0 + i1) / 2, r1, i1, GUESS.speakerBlock / 2, GUESS.speakerBlock, 'ew');
  }

  /* ------------------------------------------------------------------ video ---- */
  // the screen behind the DJ: up the west wall and out over the crowd
  const wall = ledScreen(fin, '#2a8cff', 2.4);
  const w0 = 38.2;
  const w1 = 42.7;
  group.add(new THREE.Mesh(panel([-35.36, w1], [-35.36, w0], 1.7, TOP - 0.06, true), wall));
  group.add(new THREE.Mesh(quad4([V3(-35.36, TOP - 0.06, w1), V3(-35.36, TOP - 0.06, w0), V3(-30.6, TOP - 0.3, w0), V3(-30.6, TOP - 0.3, w1)], w1 - w0, 4.8), wall));
  s.add(black, B(-35.42, w0 - 0.06, -35.36, w1 + 0.06, 1.62, 1.7));
  // two video spans overhead, one down each side of the floor
  const spans = ledScreen(fin, '#14d8f0', 1.6);
  group.add(new THREE.Mesh(quad4([V3(-31, TOP - 0.1, 35.3), V3(-18.6, TOP - 0.1, 35.3), V3(-18.6, TOP - 0.5, 36.3), V3(-31, TOP - 0.5, 36.3)], 12.4, 1.1), spans));
  group.add(new THREE.Mesh(quad4([V3(-19, TOP - 0.1, 46.6), V3(-31, TOP - 0.1, 46.6), V3(-31, TOP - 0.5, 45.6), V3(-19, TOP - 0.5, 45.6)], 12, 1.1), spans));

  /* ------------------------------------------------------------ the lattice ---- */
  // Two wings of square-grid metal that meet along a spine and tilt up toward the side walls,
  // with a diamond-shaped opening in the middle framing an angled video panel; LED lines along the edges.
  const LT = GUESS.lattice;
  const [cr, ci] = LT.centre;
  const half = LT.span / 2;
  const d = LT.diamond;
  const lift = latticeAt;
  const at = (r: number, inn: number) => V3(r, lift(inn), inn);
  // the grid is lit by the LED strips that run along it: a material of its own, whose glow is turned up at night
  const wire = fin.mesh('#b8bcc4', LT.cell, 0.06).clone();
  /** Half the thickness of an LED strip: the tubes in the photographs, a little fattened so that they read from across the room. */
  const STRIP = 0.022;
  const line = fin.glow('#8fd0ff', true);
  const bars = [fin.glow('#5ce8ff', true), fin.glow('#3cc4f5', true), fin.glow('#8af6ff', true)];
  for (const side of [-1, 1]) {
    const out = ci + side * half;
    const pts: G2[] = [
      [cr - half, ci],
      [cr - d, ci],
      [cr, ci + side * d],
      [cr + d, ci],
      [cr + half, ci],
      [cr + half, out],
      [cr - half, out],
    ];
    const tris = [0, 1, 6, 1, 2, 6, 2, 5, 6, 2, 3, 5, 3, 4, 5];
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    const uv: number[] = [];
    for (const i of tris) {
      const [r, inn] = pts[i];
      const v = at(r, inn);
      pos.push(v.x, v.y, v.z);
      uv.push(r, inn);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    s.add(wire, g);
    // the frame the wing is made on, its lit edges, and the rods it hangs from
    for (const [a, b] of [
      [pts[4], pts[5]],
      [pts[5], pts[6]],
      [pts[6], pts[0]],
      [pts[1], pts[2]],
      [pts[2], pts[3]],
    ]) {
      s.add(steel, tube(at(...a), at(...b), 0.03));
      s.add(line, tube(at(...a).add(new THREE.Vector3(0, -0.055, 0)), at(...b).add(new THREE.Vector3(0, -0.055, 0)), STRIP, 6));
    }
    for (const r of [cr - half, cr, cr + half]) s.add(steel, cyl(r, out, 0.008, LT.edge, TOP, 4));
    // long LED strips lying across the wing
    for (let k = 1; k <= 4; k++) {
      const inn = ci + side * (d + 0.25 + k * ((half - d - 0.5) / 4));
      s.add(bars[k % 3], tube(at(cr - half + 0.3, inn).add(new THREE.Vector3(0, -0.04, 0)), at(cr + half - 0.3, inn).add(new THREE.Vector3(0, -0.04, 0)), STRIP, 6));
    }
  }
  // the spine, lit like the rest of the frame
  for (const [a, b] of [
    [cr - half, cr - d],
    [cr + d, cr + half],
  ]) {
    s.add(steel, tube(at(a, ci), at(b, ci), 0.03));
    s.add(line, tube(at(a, ci).add(new THREE.Vector3(0, -0.055, 0)), at(b, ci).add(new THREE.Vector3(0, -0.055, 0)), STRIP, 6));
  }
  for (const r of [cr - half, cr + half]) s.add(steel, cyl(r, ci, 0.008, LT.spine, TOP, 4));
  // The panel in the opening, tipped toward the floor in front of the booth. It plays slow liquid
  // video, as in the venue's own photograph of the room; its quad is laid out in metres.
  const eye = swirlScreen();
  group.add(new THREE.Mesh(quad4([V3(cr - d + 0.1, LT.spine - 0.25, ci), V3(cr, LT.spine + 0.05, ci - d + 0.1), V3(cr + d - 0.1, LT.spine + 0.35, ci), V3(cr, LT.spine + 0.05, ci + d - 0.1)], 2, 2), eye));

  /* ------------------------------------------------------------- the sound ---- */
  // six loudspeakers flown round the floor (two rear, two middle, two front), and four fills
  const hang = (pts: [number, number][], w: number, h: number, top: number) => {
    for (const [r, inn] of pts) {
      const faces = Math.abs(inn - ci) > Math.abs(r - cr) ? 'ns' : 'ew';
      cabinet(s, fin, r - (faces === 'ns' ? w : w * 0.8) / 2, inn - (faces === 'ns' ? w * 0.8 : w) / 2, r + (faces === 'ns' ? w : w * 0.8) / 2, inn + (faces === 'ns' ? w * 0.8 : w) / 2, top - h, top, faces);
      s.add(steel, cyl(r, inn, 0.01, top, TOP, 4));
    }
  };
  hang(GUESS.boxMains, 0.75, 1.05, TOP - 0.12);
  hang(GUESS.boxFills, 0.5, 0.6, TOP - 0.25);
  // columns of round LED fixtures in the upper corners
  const rounds = fin.glow('#62d4ff', true);
  for (const [r, inn] of [
    [-34.85, 47.75],
    [-19.75, 47.7],
    [-16.95, 38.1],
    [-31.9, 29.8],
  ]) {
    s.add(steel, cyl(r, inn, 0.03, 2.4, TOP, 6));
    for (let k = 0; k < 5; k++) s.add(rounds, new THREE.SphereGeometry(0.1, 10, 8).translate(r, 2.6 + k * 0.45, -inn));
  }

  /* --------------------------------------------- stairs, balcony and windows ---- */
  const tread = fin.plain('#19191c', { rough: 0.6, metal: 0.5 });
  const mesh = fin.mesh('#2c2e33', 0.06);
  // the black steel stair up the north side to the balcony, mesh panels in its balustrade
  openStair(s, { tread, steel }, stairOf(kit, 'box-north'), { right: true });
  s.add(mesh, quad4([V3(-32.2, 0.08, 46.85), V3(-27.1, U + 0.08, 46.85), V3(-27.1, U + 0.98, 46.85), V3(-32.2, 0.98, 46.85)], 5.7, 0.9));
  // and the steps from the deck up to the gantry on the west wall
  openStair(s, { tread, steel }, stairOf(kit, 'gantry-steps'), { right: true });
  const every = Q.props ? 0.14 : 0.28;
  railing(
    s,
    steel,
    [
      [-27.1, 46.85],
      [-25.8, 46.85],
      [-25.8, 47.75],
    ],
    U,
    GUESS.balconyRail,
    every,
  );
  railing(
    s,
    steel,
    [
      [-34.2, 45],
      [-34.2, 48.15],
    ],
    U,
    GUESS.balconyRail,
    every,
  );
  // the balcony along the north side: a railing, broken where the stair lands
  for (const [from, to] of [
    [-35.3, -27.05],
    [-25.85, -19.5],
  ]) {
    railing(
      s,
      steel,
      [
        [from, 48.22],
        [to, 48.22],
      ],
      U,
      GUESS.balconyRail,
      every,
    );
  }
  s.add(black, B(-35.3, 48.18, -19.5, 48.26, U - 0.25, U));
  // The Lounge's windows, glazed against the sound
  const glass = new THREE.MeshStandardMaterial({ color: '#8fa6b8', transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false });
  s.add(glass, panel([-16.69, 38.6], [-16.69, 45], U + GUESS.windowSill, U + GUESS.windowHead));
  for (let inn = 38.6; inn <= 45.01; inn += 1.6) s.add(black, B(-16.73, inn - 0.03, -16.65, inn + 0.03, U + GUESS.windowSill, U + GUESS.windowHead));
  for (const y of [U + GUESS.windowSill, U + GUESS.windowHead]) s.add(black, B(-16.73, 38.6, -16.65, 45, y - 0.03, y + 0.03));

  /* ------------------------------------------------------------ light and air ---- */
  // The strips on the lattice light the room. The spots, when the plan has them (BOX_SPOTS), shine
  // down through the grid from above it, where no fixture can be seen: one slow beam over each
  // quarter (the phone level keeps two, on a diagonal), and a narrow shaft at each corner of the
  // diamond to the pool it makes on the floor.
  const above = (inn: number) => lift(inn) + 0.3;
  const over = (a: number, b: number): [number, number, number] => [cr + a * 2.6, ci + b * 3, above(ci + b * 3)];
  if (BOX_SPOTS) movingHeads(kit, 'box', [over(-1, -1), over(1, -1), over(1, 1), over(-1, 1)], ['#2f62ff', '#3f7dff'], { length: 4.7, radius: 0.5, swing: 0.3, speed: 0.16, level: 0.24, hidden: true });
  const down = new THREE.Vector3(0, -1, 0);
  const shafts = BOX_SPOTS
    ? BOX_PINS.map((p) => {
        const [r, inn] = p.at;
        const from = V3(r, above(inn), inn);
        const to = V3(p.aim[0], 0, p.aim[1]);
        const shaft = kit.beam('box', from, '#8fb4ff', 0.45, from.distanceTo(to));
        shaft.mesh.quaternion.setFromUnitVectors(down, to.sub(from).normalize());
        return shaft;
      })
    : [];
  kit.dust('box', 5, 900, [-34, -17], [0.4, 4.6], [-48, -30], 0.92, '#a8dcff');

  playScreens(kit, [wall, spans], 0.6, 0.04, 0.34);
  const c = new THREE.Color();
  kit.onTime((night) => {
    if (night) return;
    line.color.set('#3a4046');
    for (const b of bars) b.color.set('#34363a');
    blinder.color.set('#55565a');
    rounds.color.set('#4a443c');
    edge.color.set('#3a3c44');
    wire.emissive.set('#b8bcc4');
    wire.emissiveIntensity = 0.06;
  });
  kit.animate(({ t, beat, pulse, strobe }, night) => {
    const rig = kit.rig;
    for (const shaft of shafts) shaft.mesh.visible = night;
    eye.uniforms.uNight.value = night ? 1 : 0;
    if (!night) {
      // by day the white fixture stands in for the house lights, and the pin spots are off
      if (rig?.isOn('box')) {
        const house = rig.get('box-strobe');
        if (house) house.intensity = GUESS.houseLight;
        BOX_PINS.forEach((_, k) => {
          const spot = rig.get(`box-pin-${k}`);
          if (spot) spot.intensity = 0;
        });
      }
      return;
    }
    // The strips are the light of the room, and the grid between them takes their colour. The frame
    // is bright enough to glow a little in the haze on the beat and no more. The strips across the
    // wings swell one after another, a step a beat, and none of them goes dark.
    const hue = 0.585 + 0.015 * Math.sin(t * 0.25);
    // the panel in the diamond plays in the strips' colour, kept under their brightness, and swells a little on the beat
    eye.uniforms.uTime.value = t;
    (eye.uniforms.uColor.value as THREE.Color).setHSL(hue + 0.02, 0.9, 0.5);
    eye.uniforms.uLevel.value = 0.6 + 0.12 * pulse;
    line.color.copy(c.setHSL(hue, 1, 0.62)).multiplyScalar(1 + 0.3 * pulse);
    wire.emissive.setHSL(hue + 0.025, 0.9, 0.5);
    wire.emissiveIntensity = 0.2 + 0.14 * pulse;
    const step = Math.floor(beat) % 3;
    bars.forEach((b, i) => {
      b.color.copy(c.setHSL(hue + 0.01, 1, 0.6)).multiplyScalar(i === step ? 0.75 + 0.4 * pulse : 0.5);
    });
    blinder.color.setScalar(strobe ? 0.75 : 0.04 + 0.12 * pulse);
    rounds.color.copy(c.setHSL(0.61, 0.85, 0.22 + 0.2 * pulse));
    edge.color.set('#88c8ff');
    for (const shaft of shafts) shaft.set(0.09 + 0.05 * pulse);
    if (rig?.isOn('box')) {
      // the washes are the strips' light, and move with them
      BOX_WASHES.forEach((_, k) => {
        const wash = rig.get(`box-wash-${k}`);
        if (wash) wash.intensity *= 0.7 + 0.3 * pulse;
      });
      const flash = rig.get('box-strobe');
      if (flash) flash.intensity = strobe * 360;
    }
  });
}
