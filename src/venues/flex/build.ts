import * as THREE from 'three';
import { buildBlockout } from '../../engine/blockout';
import { groundPolygon } from '../../engine/geom';
import { asphalt, rawConcrete, tiled } from '../../engine/materials';
import type { BuildContext, Pt, VenueHooks, Vec3 } from '../../engine/types';
import { canvasTexture } from '../../engine/util';
import * as K from '../../kit';
import { BRIDGE, CAFE, CAFE_BAR, CAFE_STAGE, DESK, FOH, FOYER, GARDEN, GUESS, HALL, HALL_BAR, LEFT_EDGE, LEFT_WALL, MEASURED, Q, RIGHT_EDGE, RIGHT_WALL, SHED, SPLIT, STAGE, STAGE_MID, STEPS, WATER } from './plan';

/**
 * Flex, built almost entirely from the kit: the plan is drawn as blocks (engine/blockout.ts),
 * and everything that makes it a club (the decks, the speaker columns, the lights, the bars)
 * is a component from src/kit. What is written out here is only what Flex alone has: the canal
 * and its quays below the street, the pavilion's front, and the sign.
 *
 * It is a first pass. Surfaces are plain colours; see docs/flex-research.md for what a second
 * pass would dress them from.
 */

const UP = -Math.PI / 2; // facing upstream, toward the bar end of the hall: where both stages look

/** The wordmark: bold, heavily slanted, condensed capitals, widely spaced. Drawn, not copied from a file. */
function sign() {
  return canvasTexture(1024, 224, (c, w, h) => {
    c.fillStyle = '#0b0b0c';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#f4f4f0';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = "italic 900 190px 'Arial Narrow', 'Helvetica Neue', Impact, sans-serif";
    c.transform(1, 0, -0.18, 1, 0, 0);
    'FLEX'.split('').forEach((letter, i) => c.fillText(letter, w / 2 + (i - 1.5) * 215 + 22, h / 2 + 8));
  });
}

export function build(ctx: BuildContext): VenueHooks {
  const mats = K.makeMats(ctx.quality);
  const stages = K.makeStages(ctx.quality, mats);
  // the venue draws both quays itself, edge to edge, so the rooms on them have no floor of their own
  const blockout = buildBlockout(ctx, { doorHeight: GUESS.doorHeight, byRoom: true, finish: (s) => (s.kind === 'floor' && (s.room === 'quay' || s.room === 'far-quay') ? false : undefined) });
  const room = (id: string) => blockout.rooms.get(id)!;

  /* ============================================================ outdoors ==== */
  const outside = new THREE.Group();
  outside.name = 'flex-outside';
  ctx.group.add(outside);
  const out = stages.stage(outside);
  const o = out.batch;

  const stone = new THREE.MeshStandardMaterial({ map: tiled(rawConcrete(5), 1 / 4, 1 / 4), color: '#9a9287', roughness: 0.95, side: THREE.DoubleSide });
  const paving = new THREE.MeshStandardMaterial({ map: tiled(asphalt(31), 1 / 8, 1 / 8), color: '#8f8a82', roughness: 0.95 });
  const water = new THREE.MeshStandardMaterial({ color: '#16252a', roughness: 0.12, metalness: 0.7 });
  const steel = mats.plain('#3d4a46', { rough: 0.5, metal: 0.6 });
  const black = mats.plain('#151517', { rough: 0.8 });
  const sprayed = [3, 7, 19].map((seed) => {
    const map = K.graffitiWall(seed, '#77726a');
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1 / 5, 1 / 5);
    // the foot of the picture stands on the quay
    map.offset.y = -Q / 5;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide });
  });

  // the two quays and the water between them
  const strip = (a: Pt[], b: Pt[]) => [...a, ...[...b].reverse()];
  o.add(paving, groundPolygon(strip(RIGHT_WALL, RIGHT_EDGE), Q - 0.02));
  o.add(paving, groundPolygon(strip(LEFT_EDGE, LEFT_WALL), Q - 0.02));
  o.add(water, groundPolygon(strip(RIGHT_EDGE, LEFT_EDGE), WATER));
  for (const edge of [RIGHT_EDGE, LEFT_EDGE]) for (let i = 0; i < edge.length - 1; i++) o.add(stone, K.panel(edge[i], edge[i + 1], WATER - 1, Q - 0.02, true));
  // the quay walls up to the street, with a parapet; sprayed as high as a ladder reaches near the club
  [RIGHT_WALL, LEFT_WALL].forEach((wall, side) => {
    for (let i = 0; i < wall.length - 1; i++) {
      const [a, b] = [wall[i], wall[i + 1]];
      const near = Math.abs(a[0]) <= 145 && Math.abs(b[0]) <= 145;
      if (near) o.add(sprayed[(i + side) % sprayed.length], K.panel(a, b, Q, Q + 5, true));
      o.add(stone, K.panel(a, b, near ? Q + 5 : Q - 0.02, 0, true));
      o.add(stone, K.along(a, b, 0.45, 0, 1.05));
    }
  });
  // the wall along the canal side of the steps
  o.add(stone, K.along([STEPS.top, STEPS.z0 - 0.25], [STEPS.bottom + 0.3, STEPS.z0 - 0.25], 0.3, Q, 1.05));

  // the Augartenbrücke: a steel deck from wall to wall
  const [bx0, bz0, bx1, bz1] = BRIDGE;
  o.add(steel, K.box(bx0, bz0, bx1, bz1, -1.5, -0.02));
  for (const x of [bx0 + 0.2, bx1 - 0.2]) {
    o.add(steel, K.box(x - 0.25, bz0, x + 0.25, bz1, -2.4, -1.5));
    K.railing(o, steel, [[x, bz0], [x, bz1]], 0, 1.1, 0.5);
  }

  // lamps along the quay
  const post = mats.plain('#1c1d1f', { rough: 0.6, metal: 0.5 });
  const bulb = mats.glow('#ffd9a0', true);
  for (const [x, z] of [[-80, -27], [-52, -25.5], [-26, -22], [0, -18], [26, -14], [52, -10], [78, -6]] as Pt[]) {
    o.add(post, K.cyl(x, z, 0.06, Q, Q + 4.4, 8));
    o.add(bulb, K.cyl(x, z, 0.22, Q + 4.4, Q + 4.7, 10));
  }

  /* ---- the pavilion: door, café and the shed at the far end, as seen from the quay ---- */
  const H = Q + GUESS.cafeHeight + 0.35;
  const e = 0.22;
  const front = mats.plain('#19191c', { rough: 0.85 });
  const [d0, d1] = GUESS.door;
  const fz = FOYER.z0 - e;
  const cz = CAFE.z0 - e;
  const sz = SHED.z0 - e;
  const walls: [Pt, Pt, number?][] = [
    [[FOYER.x0 - e, 0], [FOYER.x0 - e, fz]],
    [[FOYER.x0 - e, fz], [d0, fz]],
    [[d0, fz], [d1, fz], Q + GUESS.doorHeight],
    [[d1, fz], [FOYER.x1 + e, fz]],
    [[FOYER.x1 + e, fz], [FOYER.x1 + e, cz]],
    [[FOYER.x1 + e, cz], [CAFE.x1 + e, cz]],
    [[CAFE.x1 + e, cz], [CAFE.x1 + e, sz]],
    [[CAFE.x1 + e, sz], [SHED.x1 + e, sz]],
    [[SHED.x1 + e, sz], [SHED.x1 + e, 0]],
  ];
  for (const [a, b, from] of walls) o.add(front, K.panel(a, b, from ?? Q, H, true));
  o.add(front, groundPolygon([[FOYER.x0 - e, 0], [FOYER.x0 - e, fz], [FOYER.x1 + e, fz], [FOYER.x1 + e, cz], [CAFE.x1 + e, cz], [CAFE.x1 + e, sz], [SHED.x1 + e, sz], [SHED.x1 + e, 0]], H));
  // the sign over the door, read from the quay
  const signMesh = new THREE.Mesh(K.panel([7.4, fz - 0.03], [1.8, fz - 0.03], Q + GUESS.doorHeight + 0.12, H - 0.1), new THREE.MeshBasicMaterial({ map: sign(), side: THREE.DoubleSide }));
  outside.add(signMesh);
  // the café's long window, red from inside at night
  const glass = mats.glow('#000000', true);
  outside.add(new THREE.Mesh(K.panel([CAFE.x1 - 2, cz - 0.03], [CAFE.x0 + 2.5, cz - 0.03], Q + 1.05, Q + 2.45), glass));
  out.onTime((night) => glass.color.set(night ? '#8a1a1c' : '#1a2226'));

  /* ---- the queue, and the garden toward the bridge ---- */
  const rail = mats.plain('#8a8d90', { rough: 0.4, metal: 0.8 });
  K.barrierLine(o, rail, [30, CAFE.z0 - 0.95], [9.2, CAFE.z0 - 0.95], Q);
  K.barrierLine(o, rail, [30, CAFE.z0 - 2.1], [7.2, CAFE.z0 - 2.1], Q);
  const wood = mats.plain('#7a5a3a', { rough: 0.8 });
  const [gx0, gz0, gx1, gz1] = GARDEN;
  for (let i = 0; i < 6; i++) {
    const x = gx0 + 4 + (i % 3) * 11;
    const z = i < 3 ? gz0 + 2.5 : gz0 + 6.5;
    o.add(wood, K.box(x - 0.9, z - 0.38, x + 0.9, z + 0.38, Q + 0.7, Q + 0.76));
    for (const s of [-0.75, 0.75]) o.add(wood, K.box(x - 0.9, z + s - 0.14, x + 0.9, z + s + 0.14, Q + 0.42, Q + 0.46));
    for (const s of [-0.7, 0.7]) o.add(wood, K.box(x + s - 0.04, z - 0.85, x + s + 0.04, z + 0.85, Q, Q + 0.42));
  }
  K.barCounter(out, [-20, gz1 - 2.2], [-28, gz1 - 2.2], Q, { colour: '#1d1d20', backBar: 0.7, seed: 4 });
  // strings of bulbs over the garden
  const festoon = mats.glow('#ffcf8a');
  for (let line = 0; line < 3; line++) {
    for (let k = 0; k <= 18; k++) {
      const t = k / 18;
      const x = gx0 + 1 + (gx1 - gx0 - 2) * t;
      const z = gz0 + 1.5 + line * 4.2;
      const sag = 3.5 - 0.5 * Math.sin(Math.PI * t);
      o.add(festoon, K.box(x - 0.045, z - 0.045, x + 0.045, z + 0.045, Q + sag, Q + sag + 0.09));
    }
  }

  /* ================================================================ hall ==== */
  const hall = stages.stage(room('hall'));
  const h = hall.batch;
  const side = Q + GUESS.platformRise;
  const truss = mats.plain('#8f9296', { rough: 0.4, metal: 0.8 });

  // the stage: the decks, a speaker column on each front corner, the LED wall behind
  K.djBooth(hall, { at: [(DESK[0] + DESK[2]) / 2, STAGE_MID], y: STAGE.y, facing: UP, width: DESK[3] - DESK[1], depth: DESK[2] - DESK[0] });
  for (const s of [-1, 1]) K.speakerStack(hall, [STAGE.x0 + 0.35, STAGE_MID + (s * MEASURED.mainsApart) / 2], STAGE.y, UP, { columns: 1, rows: 5, size: [0.62, MEASURED.mainsHeight / 5 - 0.015, 0.6] });
  h.add(mats.plain('#1a1a1c', { rough: 0.8 }), K.box(HALL.x1 - MEASURED.riser.depth, STAGE.z0, HALL.x1, STAGE.z1, STAGE.y, STAGE.y + MEASURED.riser.height));
  const led = K.ledScreen(mats, '#3d7dff', 1.6);
  room('hall').add(new THREE.Mesh(K.panel([HALL.x1 - 0.06, STAGE_MID + MEASURED.ledWall[0] / 2], [HALL.x1 - 0.06, STAGE_MID - MEASURED.ledWall[0] / 2], Q + GUESS.hallHeight - 0.1 - MEASURED.ledWall[1], Q + GUESS.hallHeight - 0.1, true), led));
  K.playScreens(hall, [led], 0.66, 0.16, 0.45);
  // under the stage: the mouths of the two concrete bass horns, and the red ticker over them
  const mouth = mats.plain('#030303', { rough: 1 });
  for (const s of [-1, 1]) h.add(mouth, K.panel([STAGE.x0 - 0.01, STAGE_MID + s * 0.15], [STAGE.x0 - 0.01, STAGE_MID + s * 2.5], Q + 0.1, Q + 0.86));
  const ticker = mats.glow('#ff2018', true);
  room('hall').add(new THREE.Mesh(K.panel([STAGE.x0 - 0.02, STAGE.z0 + 0.3], [STAGE.x0 - 0.02, STAGE.z1 - 0.3], Q + 0.9, Q + 0.98), ticker));

  // over the stage and the floor: two trusses, a ring with a mirror ball in it, moving heads, strobes
  const top = Q + GUESS.hallHeight;
  for (const x of [STAGE.x0 + 0.3, STAGE.x1 - 0.3]) K.trussRun(h, truss, [x, STAGE.z0], [x, STAGE.z1], top - 0.45);
  const ring: Pt = [STAGE.x0 - 2.2, STAGE_MID];
  const around = (r: number, n: number, turn = 0) => Array.from({ length: n }, (_, i): Pt => [ring[0] + r * Math.cos((i / n) * Math.PI * 2 + turn), ring[1] + r * Math.sin((i / n) * Math.PI * 2 + turn)]);
  const rim = around(1.7, 10);
  rim.forEach((p, i) => K.trussRun(h, truss, p, rim[(i + 1) % rim.length], top - 0.45, 0.1));
  K.mirrorBall(hall, { at: [ring[0], top - 1.05, ring[1]], radius: 0.3, ceiling: top, spots: 70, reach: 5.5 });
  const heads: Vec3[] = [...around(1.7, 6, 0.3).map(([x, z]): Vec3 => [x, top - 0.6, z]), ...[10, 15, 20, 25, 30].map((x): Vec3 => [x, top - 0.15, HALL.z1 - 0.35]), ...[STAGE.z0 + 1, STAGE_MID, STAGE.z1 - 1].map((z): Vec3 => [STAGE.x1 - 0.3, top - 0.6, z])];
  K.movingHeads(hall, heads, ['#ff2a3a', '#3a6bff', '#f2f4ff', '#b04cff'], { length: 4.6, radius: 0.55, swing: 0.6, speed: 0.5, level: 0.5 });
  K.strobe(hall, { at: [STAGE.x0 - 6, top - 0.2, STAGE_MID - 1.4], tilt: Math.PI / 2 });
  K.strobe(hall, { at: [STAGE.x0 - 14, top - 0.2, STAGE_MID + 1.4], tilt: Math.PI / 2 });
  K.strobe(hall, { at: [STAGE.x1 - 0.1, STAGE.y + 2.6, STAGE_MID], facing: UP, tilt: 0.2 });

  // the matrix: 19 by 8 spots in the ceiling over the dance strip, chasing with the beat
  const [cols, rows] = MEASURED.matrix;
  const spots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.07, 10).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff' }), cols * rows);
  const m4 = new THREE.Matrix4();
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) spots.setMatrixAt(c * rows + r, m4.makeTranslation(HALL.x0 + 5 + ((STAGE.x0 - 1.5 - HALL.x0 - 5) * c) / (cols - 1), top - 0.06, SPLIT + 0.45 + ((GUESS.danceWidth - 0.9) * r) / (rows - 1)));
  spots.frustumCulled = false;
  room('hall').add(spots);
  const tint = new THREE.Color();

  // the raised side: the bar against the quay wall, the mixing desk at the stage end
  const sideStage = { ...hall };
  K.barCounter(sideStage, HALL_BAR[0], HALL_BAR[1], side, { backBar: 0.75, seed: 9 });
  h.add(black, K.box(FOH.x - MEASURED.fohWidth / 2, FOH.z - 0.4, FOH.x + MEASURED.fohWidth / 2, FOH.z + 0.4, side, side + 0.95));
  h.add(mats.glow('#3a8cff'), K.box(FOH.x - 0.6, FOH.z - 0.25, FOH.x + 0.6, FOH.z + 0.25, side + 0.95, side + 0.97));
  hall.dust(7, 420, [HALL.x0 + 4, STAGE.x0], [Q + 0.4, top - 0.4], [SPLIT, HALL.z1], 0.55);

  /* ================================================================ café ==== */
  const cafe = stages.stage(room('cafe'));
  const c = cafe.batch;
  K.barCounter(cafe, CAFE_BAR[0], CAFE_BAR[1], Q, { backBar: 0.7, top: '#5a1216', seed: 2 });
  const leather = mats.plain('#7a1418', { rough: 0.5 });
  for (const x of [13, 17.5, 22, 26.5]) K.sofa(c, leather, x, CAFE.z0 + 0.08, x + 2.4, CAFE.z0 + 1.0, Q + 0.6, '-z');
  // red lines along the edges of the steps
  const redLine = mats.glow('#ff1a1a');
  for (const [z, y] of [[CAFE.z0 + 2.6, Q + 0.3], [CAFE.z0 + 1.3, Q + 0.6]]) c.add(redLine, K.box(12, z - 0.02, 30, z + 0.02, y - 0.03, y + 0.005));
  // light strips along the red ceiling
  const stripLight = mats.glow('#ffd6c8');
  for (const z of [-7.2, -4.8, -2.4]) c.add(stripLight, K.box(11, z - 0.04, 30, z + 0.04, Q + GUESS.cafeHeight - 0.06, Q + GUESS.cafeHeight - 0.03));
  // the small stage: two players and a mixer, three boxes a side, the LED wall
  K.djBooth(cafe, { at: [CAFE_STAGE.x0 + 1.4, -5], y: CAFE_STAGE.y, facing: UP, layout: 'cdjs' });
  for (const z of [CAFE_STAGE.z0 + 0.35, CAFE_STAGE.z1 - 0.35]) K.speakerStack(cafe, [CAFE_STAGE.x0 + 0.3, z], CAFE_STAGE.y, UP, { columns: 1, rows: 3, size: [0.5, 0.5, 0.5] });
  const cafeLed = K.ledScreen(mats, '#ff3a30', 1.4);
  room('cafe').add(new THREE.Mesh(K.panel([CAFE.x1 - 0.06, -5 + MEASURED.cafeLed[0] / 2], [CAFE.x1 - 0.06, -5 - MEASURED.cafeLed[0] / 2], CAFE_STAGE.y + 0.15, Q + GUESS.cafeHeight - 0.1, true), cafeLed));
  K.playScreens(cafe, [cafeLed], 0.0, 0.05, 0.4);
  for (const x of [14, 20, 26]) for (const z of [CAFE.z0 + 0.5, CAFE.z1 - 0.5]) K.parCan(cafe, c, { at: [x, Q + GUESS.cafeHeight - 0.02, z], colour: '#ff2a2a' });

  /* =============================================================== foyer ==== */
  const foyer = stages.stage(room('foyer'));
  foyer.batch.add(black, K.box(FOYER.x0, -3.2, FOYER.x0 + 1.0, -1, Q, Q + 1.1));
  foyer.batch.add(mats.glow('#ffe9c8'), K.box(FOYER.x0 + 0.2, -2.6, FOYER.x0 + 0.8, -1.6, Q + 1.1, Q + 1.12));

  stages.finish();

  // everybody stands in the group of their room
  for (const crowd of ctx.populate()) {
    const id = crowd.mesh.userData.room as string | undefined;
    if (id) blockout.rooms.get(id)?.add(crowd.mesh);
  }
  const rig = ctx.light();
  let night = true;

  return {
    update(f) {
      const { zone, pulse, strobe, beat } = f;
      blockout.update(zone);
      // the hall has no window: from inside it nothing outside is drawn, and from outside it is not
      const inHall = zone.room === 'hall';
      outside.visible = !zone.inside || zone.room === 'foyer' || zone.room === 'cafe';
      room('quay').visible = room('far-quay').visible = outside.visible;
      room('hall').visible = zone.inside;
      room('cafe').visible = !inHall;

      if (night) {
        // the matrix: a wave of colour that walks down the room, a step a beat, and flashes white with the strobe
        for (let col = 0; col < cols; col++) {
          const wave = 0.5 + 0.5 * Math.sin(col * 0.7 - beat * Math.PI * 0.5);
          for (let r = 0; r < rows; r++) {
            if (strobe) tint.setRGB(1, 1, 1);
            else tint.setHSL((0.98 + 0.12 * Math.sin(beat * 0.11 + r * 0.4) + 1) % 1, 0.9, 0.05 + 0.5 * wave * (0.5 + 0.5 * pulse));
            spots.setColorAt(col * rows + r, tint);
          }
        }
        spots.instanceColor!.needsUpdate = true;
        ticker.color.setScalar(0.5 + 0.5 * pulse);
        if (rig.isOn('hall')) {
          const flash = rig.get('hall-strobe');
          if (flash) flash.intensity = strobe * 320;
          for (const k of [0, 1]) {
            const wash = rig.get(`hall-wash-${k}`);
            if (wash) wash.intensity *= 0.55 + 0.45 * (k ? pulse : 1 - pulse);
          }
        }
      }
      stages.update(f, night);
    },
    setTime(time) {
      night = time.night;
      spots.visible = night;
      stages.setTime(night);
    },
  };
}
