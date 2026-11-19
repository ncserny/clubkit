import * as THREE from 'three';
import { buildBlockout, type Surface } from '../../engine/blockout';
import { groundPolygon } from '../../engine/geom';
import { checkerPlate, rawConcrete, tiled } from '../../engine/materials';
import type { BuildContext, Pt, VenueHooks, Vec3 } from '../../engine/types';
import { canvasTexture } from '../../engine/util';
import * as K from '../../kit';
import logoUrl from './logo.svg';
import { BRIDGE, CAFE, CAFE_BAR, CAFE_COLUMNS, CAFE_DUCT, CAFE_RAISED, CAFE_STAGE, CLOAK, COLUMN, COLUMNS, CUBICLES, DESK, FOH, FOYER, GARDEN, GUESS, HALL, HALL_BAR, LEFT_EDGE, LEFT_WALL, MEASURED, MERCH, PILLAR, PILLARS, PLATFORM_X, Q, RAILS, RIGHT_EDGE, RIGHT_WALL, SHED, SOFAS, SPLIT, STAGE, STAGE_MID, STEP_BAY, STEPS, STOOLS, TABLES, WATER, WC } from './plan';
import { bulbSign, cocktails, makeFinishes, mural, notice, ticker, type Finishes } from './textures';

/**
 * Flex, built almost entirely from the kit: the plan is drawn as blocks (engine/blockout.ts),
 * and everything that makes it a club (the decks, the speaker columns, the lights, the bars)
 * is a component from src/kit. What is written out here is only what Flex alone has: the canal
 * and its quays below the street, the pavilion's front, and the sign.
 *
 * The surfaces come from textures.ts, painted from what the club's photographs of its empty
 * rooms show (docs/flex-research.md): black tagged masonry, worn screed, a wire mesh down one
 * wall, beams and silver ducts overhead, a red ceiling in the café, sweets on a wall of the toilets.
 */

/** What each surface of the block model is finished in. */
function finishes(fin: Finishes, mats: K.Mats) {
  const walls: Record<string, 'tagged' | 'tagged2' | 'tagged3'> = { hall: 'tagged', cafe: 'tagged2', foyer: 'tagged3' };
  return (s: Surface): THREE.Material | false | undefined => {
    switch (s.kind) {
      case 'floor':
        // the venue draws both quays itself, edge to edge
        if (s.room === 'quay' || s.room === 'far-quay') return false;
        if (s.room === 'wc') return fin.surface('tiles', '#6d7172', { rough: 0.45, relief: 0.5 });
        // the café's floor is dark and worn smooth; the hall's is pale
        return s.room === 'cafe' ? fin.surface('screed', '#4b4947', { rough: 0.45, relief: 0.3 }) : fin.surface('screed', '#8f8a82', { rough: 0.75, relief: 0.5 });
      case 'walls':
        if (s.room === 'wc') {
          // the long wall on the hall's side is the wall of sweets
          const sweets = !!s.edge && s.edge.every(([, z]) => Math.abs(z - WC.z1) < 0.01);
          return sweets ? fin.surface('candy', '#ffffff', { rough: 0.4, wall: true }) : fin.surface('tiles', '#e2e4e0', { rough: 0.4, relief: 0.4, wall: true });
        }
        return s.room && walls[s.room] ? fin.surface(walls[s.room], '#ffffff', { relief: 0.7, wall: true }) : undefined;
      case 'platform':
        // the hall's stage is open underneath, where the bass horns are: the venue draws it
        if (s.id === 'stage' || s.id === 'cafe-stage') return false;
        if (s.id === 'cafe-bar') return fin.surface('screed', '#a39e95', { rough: 0.7, relief: 0.5 });
        return fin.surface('screed', s.id === 'hall-side' ? '#7a756e' : '#99948b', { rough: 0.75, relief: 0.5 });
      case 'stair':
        return fin.surface('slabs', '#9a958c', { relief: 0.6 });
      case 'link':
        return fin.surface('screed', '#8f8a82', { rough: 0.75 });
      case 'reveal':
        return mats.plain('#0c0c0d');
      case 'obstacle':
        return s.id === 'column' || s.id === 'pillar' ? fin.surface('tagged', '#ffffff', { relief: 0.7, wall: true }) : undefined;
    }
    return undefined;
  };
}

const UP = -Math.PI / 2; // facing upstream, toward the bar end of the hall: where both stages look

export function build(ctx: BuildContext): VenueHooks {
  const mats = K.makeMats(ctx.quality);
  const stages = K.makeStages(ctx.quality, mats);
  const fin = makeFinishes(ctx.quality);
  const blockout = buildBlockout(ctx, { doorHeight: GUESS.doorHeight, byRoom: true, finish: finishes(fin, mats) });
  const room = (id: string) => blockout.rooms.get(id)!;

  /* ============================================================ outdoors ==== */
  const outside = new THREE.Group();
  outside.name = 'flex-outside';
  ctx.group.add(outside);
  const out = stages.stage(outside);
  const o = out.batch;

  const stone = new THREE.MeshStandardMaterial({ map: tiled(rawConcrete(5), 1 / 4, 1 / 4), color: '#9a9287', roughness: 0.95, side: THREE.DoubleSide });
  const paving = fin.surface('slabs', '#8f8a82', { relief: 0.6 });
  const canal = fin.water();
  const water = canal.material;
  const steel = mats.plain('#465650', { rough: 0.5, metal: 0.6 });
  const black = mats.plain('#151517', { rough: 0.8 });
  const sprayed = [3, 7, 19].map((seed) => {
    const map = K.graffitiWall(seed, '#77726a');
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    // one tile is the wall from the quay to the street
    map.repeat.set(1 / 6.5, 1 / -Q);
    map.offset.y = 1;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide });
  });

  // the two quays and the water between them
  const strip = (a: Pt[], b: Pt[]) => [...a, ...[...b].reverse()];
  o.add(paving, groundPolygon(strip(RIGHT_WALL, RIGHT_EDGE), Q - 0.02));
  o.add(paving, groundPolygon(strip(LEFT_EDGE, LEFT_WALL), Q - 0.02));
  o.add(water, groundPolygon(strip(RIGHT_EDGE, LEFT_EDGE), WATER));
  for (const edge of [RIGHT_EDGE, LEFT_EDGE]) for (let i = 0; i < edge.length - 1; i++) o.add(stone, K.panel(edge[i], edge[i + 1], WATER - 1, Q - 0.02, true));
  // the quay walls up to the street, with a parapet; sprayed from end to end near the club
  // Behind the pavilion the wall is the building's own (the rooms draw it, with their doorways),
  // so there it is drawn only above the pavilion's roof: a whole sheet would shut the way from
  // the foyer and the café into the hall.
  const behind: [number, number] = [FOYER.x0 - 0.3, SHED.x1 + 0.3];
  const roofLine = Q + GUESS.cafeHeight + 0.35;
  [RIGHT_WALL, LEFT_WALL].forEach((wall, side) => {
    for (let i = 0; i < wall.length - 1; i++) {
      const [a, b] = [wall[i], wall[i + 1]];
      const near = Math.abs(a[0]) <= 145 && Math.abs(b[0]) <= 145;
      const finish = near ? sprayed[(i + side) % sprayed.length] : stone;
      const along = side === 0 && a[1] === 0 && b[1] === 0 && a[0] < behind[1] && b[0] > behind[0];
      if (along) {
        // the wall in three pieces: before the pavilion, over it, after it
        if (a[0] < behind[0]) o.add(finish, K.panel(a, [behind[0], 0], Q - 0.02, 0, true));
        o.add(finish, K.panel([Math.max(a[0], behind[0]), 0], [Math.min(b[0], behind[1]), 0], roofLine, 0, true));
        if (b[0] > behind[1]) o.add(finish, K.panel([behind[1], 0], b, Q - 0.02, 0, true));
      } else o.add(finish, K.panel(a, b, Q - 0.02, 0, true));
      o.add(stone, K.along(a, b, 0.45, 0, 1.05));
    }
  });
  // the painted boards along the garden, standing against the quay wall
  const boards = mural(6);
  boards.wrapS = boards.wrapT = THREE.RepeatWrapping;
  boards.repeat.set(1 / 16, 1 / 5);
  boards.offset.y = -Q / 5;
  const wallAt = (x: number): Pt => [x, (-5.4 * -x) / 42 - 0.12];
  o.add(new THREE.MeshStandardMaterial({ map: boards, roughness: 0.8, side: THREE.DoubleSide }), K.panel(wallAt(-40), wallAt(-8), Q, Q + 5, true));
  // the wall along the canal side of the steps
  o.add(stone, K.along([STEPS.top, STEPS.z0 - 0.25], [STEPS.bottom + 0.3, STEPS.z0 - 0.25], 0.3, Q, 1.05));

  // the Augartenbrücke: a steel deck from wall to wall
  const [bx0, bz0, bx1, bz1] = BRIDGE;
  o.add(steel, K.box(bx0, bz0, bx1, bz1, -1.5, -0.02));
  for (const x of [bx0 + 0.2, bx1 - 0.2]) {
    // the main girders, riveted plate, with a flange top and bottom
    o.add(steel, K.box(x - 0.25, bz0, x + 0.25, bz1, -2.4, -1.5));
    o.add(steel, K.box(x - 0.4, bz0, x + 0.4, bz1, -2.5, -2.4));
    K.railing(o, steel, [[x, bz0], [x, bz1]], 0, 1.1, 0.5);
    for (let z = bz0 + 6; z < bz1 - 2; z += 16) K.lampPost(o, mats, [x, z], 0, 5.5, '#ffe2b0');
  }
  // cross girders under the deck
  for (let z = bz0 + 2; z < bz1; z += 4) o.add(steel, K.box(bx0 + 0.4, z - 0.12, bx1 - 0.4, z + 0.12, -2.1, -1.5));

  // along the quay: lamps, bollards at the water's edge, trees against the wall
  const onEdge = (x: number): number => {
    const i = Math.max(0, RIGHT_EDGE.findIndex((p, k) => k < RIGHT_EDGE.length - 1 && x >= p[0] && x <= RIGHT_EDGE[k + 1][0]));
    const [a, b] = [RIGHT_EDGE[i], RIGHT_EDGE[i + 1]];
    return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  };
  for (const x of [-80, -52, -26, 0, 26, 52, 78]) K.lampPost(o, mats, [x, onEdge(x) + 2.2], Q);
  // a railing along the water's edge
  const railPts: Pt[] = [];
  for (let x = -94; x <= 94; x += 4) railPts.push([x, onEdge(x) + 0.3]);
  K.railing(o, mats.plain('#2c2e31', { rough: 0.5, metal: 0.6 }), railPts, Q, 1.05, ctx.quality.props ? 0.5 : 2);
  ([[-37, -6.4], [-5, -2.4], [56, -1.9], [66, -1.3], [76, -0.6], [88, 0.4]] as Pt[]).forEach((p, i) => K.tree(o, mats, p, Q, 7.5 + (i % 3), i + 1));
  // the loading doors in the quay wall, past the end of the frontage
  const door = mats.plain('#2a2d30', { rough: 0.5, metal: 0.6 });
  for (const x of [54.4, 57.4]) {
    o.add(door, K.box(x, -0.09, x + 2.4, -0.03, Q, Q + 2.7));
    o.add(black, K.box(x + 1.17, -0.11, x + 1.23, -0.03, Q, Q + 2.7));
  }

  /* ---- the pavilion: door, café and the shed at the far end, as seen from the quay ---- */
  const H = Q + GUESS.cafeHeight + 0.35;
  const e = 0.22;
  const front = fin.surface('tagged2', '#ffffff', { relief: 0.6, wall: true });
  const roof = mats.plain('#19191c', { rough: 0.85 });
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
  o.add(roof, groundPolygon([[FOYER.x0 - e, 0], [FOYER.x0 - e, fz], [FOYER.x1 + e, fz], [FOYER.x1 + e, cz], [CAFE.x1 + e, cz], [CAFE.x1 + e, sz], [SHED.x1 + e, sz], [SHED.x1 + e, 0]], H));
  // the sign over the door: the club's logo in bulbs, on a frame that stands on the roof; and the red ticker beside the door
  const signW = 5.2;
  const signH = (signW * 156) / 992;
  const mid = (d0 + d1) / 2 + 0.6;
  const signMat = new THREE.MeshBasicMaterial({ map: bulbSign(logoUrl), transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, toneMapped: false });
  outside.add(new THREE.Mesh(K.panel([mid + signW / 2, fz - 0.05], [mid - signW / 2, fz - 0.05], H + 0.25, H + 0.25 + signH), signMat));
  for (const x of [mid - signW / 2 + 0.3, mid + signW / 2 - 0.3]) o.add(black, K.cyl(x, fz + 0.02, 0.02, H, H + 0.25 + signH, 6));
  outside.add(new THREE.Mesh(K.panel([FOYER.x1 + e - 0.2, fz - 0.03], [d1 + 0.3, fz - 0.03], Q + 2.42, Q + 2.42 + (FOYER.x1 + e - 0.5 - d1) * (96 / 512)), new THREE.MeshBasicMaterial({ map: ticker('EINTRITT'), side: THREE.DoubleSide })));
  // the café's long window, red from inside at night
  const glass = mats.glow('#000000', true);
  outside.add(new THREE.Mesh(K.panel([CAFE.x1 - 2, cz - 0.03], [CAFE.x0 + 2.5, cz - 0.03], Q + 1.05, Q + 2.45), glass));
  out.onTime((night) => glass.color.set(night ? '#8a1a1c' : '#1a2226'));
  for (let x = CAFE.x0 + 2.5; x <= CAFE.x1 - 2; x += 2.55) o.add(black, K.box(x - 0.04, cz - 0.06, x + 0.04, cz, Q + 1, Q + 2.5));
  // a canopy over the door, posters pasted beside it
  o.add(black, K.box(d0 - 0.4, fz - 1.3, d1 + 0.4, fz, Q + GUESS.doorHeight + 0.02, Q + GUESS.doorHeight + 0.1));
  o.add(fin.surface('posters', '#d8d2c6', { rough: 0.8 }), K.panel([FOYER.x1 + e - 0.1, fz - 0.02], [d1 + 0.25, fz - 0.02], Q + 0.35, Q + 2.25, true));

  /* ---- the queue, and the garden toward the bridge ---- */
  const rail = mats.plain('#8a8d90', { rough: 0.4, metal: 0.8 });
  K.barrierLine(o, rail, [30, CAFE.z0 - 0.95], [9.2, CAFE.z0 - 0.95], Q);
  K.barrierLine(o, rail, [30, CAFE.z0 - 2.1], [7.2, CAFE.z0 - 2.1], Q);
  const wood = mats.plain('#7a5a3a', { rough: 0.8 });
  const [gx0, gz0, gx1, gz1] = GARDEN;
  for (const [x, z] of TABLES) {
    o.add(wood, K.box(x - 0.9, z - 0.38, x + 0.9, z + 0.38, Q + 0.7, Q + 0.76));
    for (const d of [-0.75, 0.75]) o.add(wood, K.box(x - 0.9, z + d - 0.14, x + 0.9, z + d + 0.14, Q + 0.42, Q + 0.46));
    for (const d of [-0.7, 0.7]) o.add(wood, K.box(x + d - 0.04, z - 0.85, x + d + 0.04, z + 0.85, Q, Q + 0.42));
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
  // Laid out from the club's photographs of the empty room: the stage between two black pillars
  // that carry the speaker columns, two bass horns open under its deck, a ring of truss hung low
  // in front of it, and a raised side with curved steps and red handrails before the stage.
  const hall = stages.stage(room('hall'));
  const h = hall.batch;
  const hallGroup = room('hall');
  const side = Q + GUESS.platformRise;
  const top = Q + GUESS.hallHeight;
  const truss = mats.plain('#a3a6aa', { rough: 0.4, metal: 0.85 });
  const tagged = fin.surface('tagged', '#ffffff', { relief: 0.7, wall: true });
  const concrete = fin.surface('screed', '#8d877f', { rough: 0.8, relief: 0.5 });
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const sx = STAGE.x0;

  /* ---- the stage: a deck on legs, open underneath ---- */
  const deck = mats.plain('#151516', { rough: 0.55 });
  const edge = mats.plain('#4a4c4f', { rough: 0.45, metal: 0.7 });
  const under = STAGE.y - 0.18;
  h.add(deck, K.box(sx - 0.12, STAGE.z0 - 0.05, HALL.x1, STAGE.z1 + 0.05, under, STAGE.y));
  h.add(edge, K.box(sx - 0.14, STAGE.z0 - 0.05, sx - 0.12, STAGE.z1 + 0.05, under, STAGE.y + 0.005));
  // closed toward the raised side and behind the horns
  h.add(deck, K.panel([sx, STAGE.z0 - 0.05], [HALL.x1, STAGE.z0 - 0.05], Q, under, true));
  h.add(mats.plain('#040404', { rough: 1 }), K.panel([sx + 1.7, STAGE.z0], [sx + 1.7, STAGE.z1], Q, under, true));
  // the two bass horns: flares of cast concrete, mouth to the room, throat in the dark
  const horn = fin.surface('screed', '#3a3836', { rough: 0.9, relief: 0.4 });
  for (const s of [-1, 1]) {
    const c0 = STAGE_MID + s * 1.42;
    const mouth = { z0: c0 - 1.22, z1: c0 + 1.22, y0: Q + 0.04, y1: under - 0.02 };
    const throat = { z0: c0 - 0.3, z1: c0 + 0.3, y0: Q + 0.24, y1: Q + 0.56, x: sx + 1.6 };
    const m = (z: number, y: number) => V(sx, y, z);
    const t = (z: number, y: number) => V(throat.x, y, z);
    h.add(horn, K.quad4([m(mouth.z0, mouth.y0), m(mouth.z1, mouth.y0), t(throat.z1, throat.y0), t(throat.z0, throat.y0)], 2, 1.5));
    h.add(horn, K.quad4([m(mouth.z0, mouth.y1), m(mouth.z1, mouth.y1), t(throat.z1, throat.y1), t(throat.z0, throat.y1)], 2, 1.5));
    h.add(horn, K.quad4([m(mouth.z0, mouth.y0), m(mouth.z0, mouth.y1), t(throat.z0, throat.y1), t(throat.z0, throat.y0)], 1, 1.5));
    h.add(horn, K.quad4([m(mouth.z1, mouth.y0), m(mouth.z1, mouth.y1), t(throat.z1, throat.y1), t(throat.z1, throat.y0)], 1, 1.5));
    // the red ticker hung under the deck at the outer end of each mouth
    const tz = STAGE_MID + s * 1.95;
    const led = new THREE.Mesh(K.panel([sx - 0.16, tz - 0.42], [sx - 0.16, tz + 0.42], under - 0.2, under - 0.04), new THREE.MeshBasicMaterial({ map: ticker('RAUCHVERBOT'), side: THREE.DoubleSide }));
    hallGroup.add(led);
  }
  // the wedge between the horns, and the pole that stands in front of it
  h.add(horn, K.box(sx - 0.02, STAGE_MID - 0.2, sx + 1.6, STAGE_MID + 0.2, Q, under));
  h.add(mats.plain('#8d8b85', { rough: 0.7 }), K.cyl(sx - 0.2, STAGE_MID, 0.028, Q, STAGE.y + 0.72, 8));

  /* ---- the pillars and the speaker columns on their fronts ---- */
  const iron = mats.plain('#1e1f21', { rough: 0.5, metal: 0.5 });
  const dots = mats.glow('#ffffff', true);
  PILLARS.forEach((z, i) => {
    const s = i ? 1 : -1;
    K.speakerStack(hall, [sx - PILLAR.depth - 0.2, z], Q + 0.62, UP, { columns: 1, rows: 5, size: [0.6, MEASURED.mainsHeight / 5 - 0.015, 0.38] });
    // the frame the column hangs in, and its foot
    for (const dz of [-0.33, 0.33]) h.add(iron, K.box(sx - PILLAR.depth - 0.42, z + dz - 0.02, sx - PILLAR.depth, z + dz + 0.02, Q + 0.5, Q + 0.62 + MEASURED.mainsHeight));
    h.add(iron, K.box(sx - PILLAR.depth - 0.42, z - 0.35, sx - PILLAR.depth, z + 0.35, Q + 0.5, Q + 0.6));
    // a bar of LEDs up the outer side of each pillar
    const bz = z + s * (PILLAR.half + 0.06);
    h.add(iron, K.box(sx - PILLAR.depth - 0.1, bz - 0.05, sx - PILLAR.depth - 0.04, bz + 0.05, Q + 1.1, top - 0.5));
    if (ctx.quality.props) for (let y = Q + 1.2; y < top - 0.55; y += 0.14) h.add(dots, K.box(sx - PILLAR.depth - 0.11, bz - 0.018, sx - PILLAR.depth - 0.1, bz + 0.018, y, y + 0.036));
  });

  /* ---- on the stage: the decks, the riser, monitors, the LED wall ---- */
  K.djBooth(hall, { at: [(DESK[0] + DESK[2]) / 2, STAGE_MID], y: STAGE.y, facing: UP, width: DESK[3] - DESK[1], depth: DESK[2] - DESK[0] });
  for (const s of [-1, 1]) K.speakerStack(hall, [DESK[2] + 0.4, STAGE_MID + s * 1.95], STAGE.y, 0, { columns: 1, rows: 2, size: [0.5, 0.5, 0.5] });
  const riser = { x0: HALL.x1 - 0.35 - MEASURED.riser.depth, x1: HALL.x1 - 0.35, y: STAGE.y + MEASURED.riser.height };
  h.add(deck, K.box(riser.x0, STAGE_MID - 2.4, riser.x1, STAGE_MID + 2.4, riser.y - 0.06, riser.y));
  for (const x of [riser.x0 + 0.04, riser.x1 - 0.04]) for (let z = STAGE_MID - 2.36; z <= STAGE_MID + 2.37; z += 1.18) h.add(edge, K.box(x - 0.025, z - 0.025, x + 0.025, z + 0.025, STAGE.y, riser.y - 0.06));
  for (const s of [-1, 1]) {
    const z = STAGE_MID + s * 1.25;
    K.speakerCabinet(h, mats, riser.x0 + 0.1, z - 0.36, riser.x0 + 0.65, z + 0.36, riser.y, riser.y + 0.5, 'ew');
    K.speakerCabinet(h, mats, riser.x0 + 0.14, z - 0.33, riser.x0 + 0.6, z + 0.33, riser.y + 0.5, riser.y + 0.86, 'ew');
  }
  const led = K.ledScreen(mats, '#3d7dff', 1.6);
  const ledTop = Math.min(top - 0.25, riser.y + 0.1 + MEASURED.ledWall[1]);
  hallGroup.add(new THREE.Mesh(K.panel([HALL.x1 - 0.06, STAGE_MID + MEASURED.ledWall[0] / 2], [HALL.x1 - 0.06, STAGE_MID - MEASURED.ledWall[0] / 2], riser.y + 0.1, ledTop, true), led));
  K.playScreens(hall, [led], 0.66, 0.16, 0.45);
  // the walls of the stage, stickered from end to end
  const stickers = fin.surface('posters', '#6a665e', { rough: 0.8 });
  for (const z of [STAGE.z0 + 0.02, STAGE.z1 - 0.02]) h.add(stickers, K.panel([sx + 0.2, z], [HALL.x1 - 0.4, z], STAGE.y + 0.2, STAGE.y + 2.2, true));

  /* ---- overhead: the ring, the lens ball in it, pipes of lights, fans ---- */
  const ring: Pt = [sx - 1.0, STAGE_MID];
  const ringY = top - 0.85;
  const around = (r: number, n: number, turn = 0) => Array.from({ length: n }, (_, i): Pt => [ring[0] + r * Math.cos((i / n) * Math.PI * 2 + turn), ring[1] + r * Math.sin((i / n) * Math.PI * 2 + turn)]);
  const rim = around(2.25, 18);
  rim.forEach((p, i) => K.trussRun(h, truss, p, rim[(i + 1) % rim.length], ringY, 0.13));
  for (const [x, z] of around(2.25, 4, 0.4)) h.add(iron, K.cyl(x, z, 0.012, ringY + 0.13, top, 4));
  // the ball in the middle of the ring: a dark sphere set with lenses, turning
  const ball = new THREE.Group();
  ball.position.set(ring[0], ringY - 0.2, ring[1]);
  ball.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 2), mats.plain('#1a1b1d', { rough: 0.35, metal: 0.7 })));
  const lens = mats.glow('#ffffff', true);
  const lensGeo = new THREE.CircleGeometry(0.06, 12);
  new THREE.IcosahedronGeometry(0.305, 0).getAttribute('position').array.forEach((_, i, arr) => {
    if (i % 9) return;
    const dir = new THREE.Vector3(arr[i], arr[i + 1], arr[i + 2]).normalize();
    const disc = new THREE.Mesh(lensGeo, lens);
    disc.position.copy(dir).multiplyScalar(0.306);
    disc.lookAt(dir.clone().multiplyScalar(2));
    ball.add(disc);
  });
  hallGroup.add(ball);
  h.add(iron, K.cyl(ring[0], ring[1], 0.02, ringY + 0.1, top, 6));
  const ballBeams = ctx.quality.level === 'lite' ? [] : [0, 1, 2, 3, 4].map((i) => {
    const beam = hall.beam(V(0, 0, 0), '#ffffff', 0.22, 4.2);
    ball.add(beam.mesh);
    beam.mesh.position.set(0, 0, 0);
    beam.mesh.rotation.set(0.5 + 0.25 * (i % 2), 0, 0);
    const turn = new THREE.Group();
    turn.rotation.y = (i / 5) * Math.PI * 2;
    turn.add(beam.mesh);
    ball.add(turn);
    return beam;
  });
  // pipes across the stage with lights on them, and a row of small lamps upstage
  for (const x of [sx + 1.2, HALL.x1 - 1.2]) h.add(truss, new THREE.CylinderGeometry(0.03, 0.03, STAGE.z1 - STAGE.z0, 8).rotateX(Math.PI / 2).translate(x, top - 0.45, STAGE_MID));
  const acl = mats.glow('#ffe9c0', true);
  for (let k = 0; k < 8; k++) h.add(acl, new THREE.CircleGeometry(0.055, 10).rotateY(-Math.PI / 2).translate(HALL.x1 - 1.24, top - 0.62, STAGE_MID - 0.77 + k * 0.22));
  const heads: Vec3[] = [
    ...around(2.25, 8, 0.2).map(([x, z]): Vec3 => [x, ringY - 0.13, z]),
    ...[STAGE_MID - 1.6, STAGE_MID, STAGE_MID + 1.6].map((z): Vec3 => [sx + 1.2, top - 0.48, z]),
    ...[11, 16, 21, 26].map((x): Vec3 => [x, top - 0.4, HALL.z1 - 1.1]),
  ];
  K.movingHeads(hall, heads, ['#ff2a3a', '#3a6bff', '#f2f4ff', '#b04cff'], { length: 4.2, radius: 0.42, swing: 0.6, speed: 0.5, level: 0.34 });
  K.strobe(hall, { at: [sx - 7, top - 0.38, STAGE_MID - 1.4], tilt: Math.PI / 2 });
  K.strobe(hall, { at: [sx - 15, top - 0.38, STAGE_MID + 1.4], tilt: Math.PI / 2 });
  K.strobe(hall, { at: [HALL.x1 - 0.5, top - 0.9, STAGE_MID], facing: UP, tilt: 0.25 });
  // two fans up under the ceiling in front of the pillars
  for (const z of PILLARS) {
    const fan = new THREE.Group();
    fan.position.set(sx - PILLAR.depth - 0.5, top - 0.5, z);
    fan.rotation.y = Math.PI / 2;
    fan.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 20), iron), new THREE.Mesh(new THREE.CircleGeometry(0.28, 16), mats.plain('#2c2e31', { rough: 0.5, metal: 0.6 })));
    hallGroup.add(fan);
  }

  // steel beams across the hall, a silver duct along each long wall, a cable tray
  const beam = mats.plain('#1b1c1e', { rough: 0.7, metal: 0.4 });
  for (let x = HALL.x0 + 1.5; x < sx - 3.5; x += 2.5) h.add(beam, K.box(x - 0.09, HALL.z0, x + 0.09, HALL.z1, top - 0.3, top));
  const silver = mats.plain('#a4a8ab', { rough: 0.35, metal: 0.9 });
  const duct = (x0: number, x1: number, z: number, y: number, r: number) => new THREE.CylinderGeometry(r, r, x1 - x0, 14).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, y, z);
  const ducts: [number, number, number, number, number][] = [
    [HALL.x0 + 0.4, sx - 1.6, HALL.z1 - 0.5, top - 0.62, 0.3],
    [HALL.x0 + 0.4, PLATFORM_X + 6, HALL.z0 + 0.55, top - 0.6, 0.27],
  ];
  for (const [x0, x1, z, y, r] of ducts) {
    h.add(silver, duct(x0, x1, z, y, r));
    // the seam of the spiral, as rings
    if (ctx.quality.props) for (let x = x0 + 0.5; x < x1; x += 0.9) h.add(silver, duct(x - 0.02, x + 0.02, z, y, r + 0.014));
  }
  h.add(beam, K.box(HALL.x0 + 2, SPLIT - 0.2, sx - 3, SPLIT + 0.15, top - 0.42, top - 0.37));

  /* ---- the inland wall: a wire mesh over its upper part, a pilaster, a steel ramp at the foot ---- */
  h.add(fin.wire('#74787c', 0.11), K.panel([HALL.x0 + 1, HALL.z1 - 0.12], [sx - 1.4, HALL.z1 - 0.12], Q + 2.05, top - 0.95, true));
  h.add(iron, K.box(HALL.x0 + 1, HALL.z1 - 0.14, sx - 1.4, HALL.z1 - 0.1, Q + 2.02, Q + 2.06));
  h.add(tagged, K.box(23.6, HALL.z1 - 0.22, 24.3, HALL.z1, Q, top));
  const plate = new THREE.MeshStandardMaterial({ map: tiled(checkerPlate(), 2, 2), color: '#5d6063', roughness: 0.45, metalness: 0.75 });
  h.add(plate, K.box(19, HALL.z1 - 1.7, 22.9, HALL.z1 - 0.9, Q, Q + 0.07));
  h.add(deck, K.box(19, HALL.z1 - 0.85, 22.9, HALL.z1 - 0.05, Q, Q + 0.1));
  h.add(mats.plain('#8f1a1c', { rough: 0.6 }), K.box(19, HALL.z1 - 0.9, 22.9, HALL.z1 - 0.85, Q, Q + 0.11));

  /* ---- the raised side: curved steps round its corner, the mixing desk, steps between red rails ---- */
  const red = mats.plain('#b3161c', { rough: 0.45, metal: 0.3 });
  const rise = GUESS.platformRise / 3;
  for (let k = 1; k <= 2; k++) {
    const r = 0.42 * k;
    const y1 = side - rise * k;
    // across the end of the raised side, and a quarter round at its corner
    h.add(concrete, K.box(PLATFORM_X - r, HALL.z0 + 2.2, PLATFORM_X, SPLIT, Q, y1));
    h.add(concrete, new THREE.CylinderGeometry(r, r, y1 - Q, 20, 1, false, Math.PI, Math.PI / 2).rotateY(Math.PI / 2).translate(PLATFORM_X, (Q + y1) / 2, SPLIT));
    // down to the dance floor, in the bay with the handrails
    h.add(concrete, K.box(STEP_BAY[0], SPLIT, STEP_BAY[1], SPLIT + r, Q, y1));
  }
  // red tube handrails either side of those steps: a hoop from the edge down to the floor
  const hoop = (x: number) => {
    const pts = [V(x, side, SPLIT - 0.5), V(x, side + 0.95, SPLIT - 0.5), V(x, side + 0.95, SPLIT - 0.1), V(x, Q + 0.95, SPLIT + 0.95), V(x, Q, SPLIT + 0.95)];
    for (let i = 0; i < pts.length - 1; i++) h.add(red, K.tube(pts[i], pts[i + 1], 0.024, 8));
  };
  hoop(STEP_BAY[0] + 0.05);
  hoop(STEP_BAY[1] - 0.05);
  for (const [a, b] of RAILS) K.railing(h, red, [a, b], side, 1.05, 0.55);
  // the mixing desk in its box at the edge, the night's name chalked on the side that faces the floor
  h.add(black, K.box(FOH.x - MEASURED.fohWidth / 2, FOH.z - 0.4, FOH.x + MEASURED.fohWidth / 2, FOH.z + 0.45, side, side + 1.05));
  // the console on it: a dark slab with a strip of lit faders
  h.add(mats.plain('#232527', { rough: 0.5, metal: 0.4 }), K.box(FOH.x - 0.6, FOH.z - 0.3, FOH.x + 0.6, FOH.z + 0.25, side + 1.05, side + 1.13));
  h.add(mats.glow('#2a5f9e'), K.box(FOH.x - 0.5, FOH.z - 0.22, FOH.x + 0.5, FOH.z - 0.14, side + 1.13, side + 1.135));
  h.add(concrete, K.box(FOH.x - MEASURED.fohWidth / 2 - 0.1, SPLIT, FOH.x + MEASURED.fohWidth / 2 + 0.1, SPLIT + 0.12, Q, side));
  hallGroup.add(new THREE.Mesh(K.panel([FOH.x + 0.7, FOH.z + 0.46], [FOH.x - 0.7, FOH.z + 0.46], side + 0.1, side + 1.0), new THREE.MeshBasicMaterial({ map: notice(['HEUTE', 'ELECTRIC', 'INDIGO'], 77), transparent: true, alphaTest: 0.2, color: '#b9b8b2', side: THREE.DoubleSide })));
  // notices chalked on the columns, and a green exit sign on each
  COLUMNS.forEach(([x, z], i) => {
    const material = new THREE.MeshBasicMaterial({ map: notice(i % 2 ? ['VIP'] : ['RAUCHEN', 'VERBOTEN'], 50 + i), transparent: true, alphaTest: 0.2, color: '#b9b8b2', side: THREE.DoubleSide });
    hallGroup.add(new THREE.Mesh(K.panel([x - COLUMN - 0.006, z - 0.3], [x - COLUMN - 0.006, z + 0.3], Q + 1.45, Q + 2.05), material));
    hallGroup.add(new THREE.Mesh(K.panel([x + 0.3, z + COLUMN + 0.006], [x - 0.3, z + COLUMN + 0.006], Q + 1.45, Q + 2.05), material));
    h.add(mats.glow('#2fe07a'), K.box(x - COLUMN - 0.03, z + 0.12, x - COLUMN, z + 0.4, Q + 2.3, Q + 2.44));
  });
  // doors in the quay wall, and the merch table against it
  const steelDoor = mats.plain('#1d1f21', { rough: 0.55, metal: 0.5 });
  for (const x of [33.4, 34.65]) h.add(steelDoor, K.box(x, HALL.z0, x + 1.2, HALL.z0 + 0.04, side, side + 2.3));
  h.add(black, K.box(MERCH[0], MERCH[1], MERCH[2], MERCH[3], side + 0.72, side + 0.78));
  for (const x of [MERCH[0] + 0.05, MERCH[2] - 0.05]) h.add(black, K.box(x - 0.03, MERCH[1], x + 0.03, MERCH[3], side, side + 0.72));
  ['#e8e2d0', '#d92b2b', '#111111', '#f2c417'].forEach((colour, i) => h.add(mats.plain(colour, { rough: 0.9 }), K.box(MERCH[0] + 0.15 + i * 0.4, MERCH[1] + 0.15, MERCH[0] + 0.45 + i * 0.4, MERCH[3] - 0.15, side + 0.78, side + 0.8 + 0.02 * (i % 2))));

  /* ---- the bar, of steel, on its plinth against the quay wall ---- */
  h.add(concrete, K.box(HALL_BAR[0][0] - 0.25, HALL.z0, HALL_BAR[1][0] + 0.25, HALL_BAR[0][1] + 0.25, Q, Q + 0.12));
  K.barCounter(hall, HALL_BAR[0], HALL_BAR[1], Q + 0.12, { colour: '#34373a', top: '#8a8d90', height: 1.0, backBar: 0.75, seed: 9 });
  // crates lit blue under the shelves, and the sign over it all
  h.add(mats.glow('#3aa0ff'), K.box(HALL_BAR[0][0] + 0.3, HALL.z0 + 0.04, HALL_BAR[1][0] - 0.3, HALL.z0 + 0.1, Q + 1.06, Q + 1.1));
  const neon = new THREE.MeshBasicMaterial({ map: cocktails(), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, toneMapped: false });
  const barMid = (HALL_BAR[0][0] + HALL_BAR[1][0]) / 2;
  hallGroup.add(new THREE.Mesh(K.panel([barMid - 3.4, HALL.z0 + 0.5], [barMid + 3.4, HALL.z0 + 0.5], Q + 2.5, Q + 2.5 + (6.8 * 160) / 1024), neon));

  // the matrix: 19 by 8 spots in the ceiling over the dance iron, chasing with the beat
  const [cols, rows] = MEASURED.matrix;
  const spots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.07, 10).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff' }), cols * rows);
  const m4 = new THREE.Matrix4();
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) spots.setMatrixAt(c * rows + r, m4.makeTranslation(HALL.x0 + 4 + ((sx - 4.5 - HALL.x0 - 4) * c) / (cols - 1), top - 0.34, SPLIT + 0.45 + ((GUESS.danceWidth - 0.9) * r) / (rows - 1)));
  spots.frustumCulled = false;
  hallGroup.add(spots);
  const tint = new THREE.Color();
  hall.dust(7, 420, [HALL.x0 + 4, sx], [Q + 0.4, top - 0.4], [HALL.z0 + 2, HALL.z1], 0.55);

  /* ================================================================ café ==== */
  // From the club's photographs of it empty: a red ceiling with strips of tube light, the bar
  // on a raised side reached by three winding concrete steps edged in red light, leather sofas
  // on castors, a silver duct down the inner wall, and at the end a deck on scissor legs.
  const cafe = stages.stage(room('cafe'));
  const c = cafe.batch;
  const cafeGroup = room('cafe');
  const cTop = Q + GUESS.cafeHeight;
  const raised = CAFE_RAISED.y;

  // the winding steps: each a slab whose edge swings out and back along the room
  const redLine = mats.glow('#ff2a22');
  const pale = fin.surface('screed', '#a39e95', { rough: 0.7, relief: 0.5 });
  const wave = (x: number, k: number) => CAFE_RAISED.z1 + 0.42 * k + 0.5 * Math.sin((x - CAFE_RAISED.x0) * 0.62 + k * 0.5) * Math.min(1, (x - CAFE_RAISED.x0) / 1.5, (CAFE_RAISED.x1 - x) / 1.5);
  for (let k = 2; k >= 0; k--) {
    const edge: Pt[] = [];
    for (let x = CAFE_RAISED.x0; x <= CAFE_RAISED.x1 + 1e-6; x += 0.4) edge.push([x, wave(x, k)]);
    const y1 = raised - (GUESS.platformRise / 3) * k;
    c.add(pale, K.prism([[CAFE_RAISED.x0, CAFE_RAISED.z1 - 0.3], ...edge, [CAFE_RAISED.x1, CAFE_RAISED.z1 - 0.3]], Q, y1));
    for (let i = 0; i < edge.length - 1; i++) c.add(redLine, K.along(edge[i], edge[i + 1], 0.035, y1 - 0.012, y1 + 0.006));
  }

  // the bar on the raised side, pale and long, with red stools and blue crates behind
  K.barCounter(cafe, CAFE_BAR[0], CAFE_BAR[1], raised, { colour: '#b4b0a8', top: '#8a8d90', backBar: 0.7, seed: 2 });
  for (const p of STOOLS) K.stool(c, mats, p, raised, '#c0201c');
  const crate = mats.plain('#5fb4e6', { rough: 0.6 });
  for (let x = CAFE_BAR[0][0] + 0.4; x < CAFE_BAR[1][0] - 0.6; x += 1.3) c.add(crate, K.box(x, CAFE.z0 + 0.12, x + 0.55, CAFE.z0 + 0.5, raised + 0.02, raised + 0.36 + 0.34 * (Math.round(x * 3) % 2)));
  c.add(mats.glow('#dff0ff'), K.box(CAFE_BAR[0][0], CAFE.z0 + 0.3, CAFE_BAR[1][0], CAFE.z0 + 0.38, cTop - 0.5, cTop - 0.46));
  // a grab rail on each column
  const tubeGrey = mats.plain('#8a8d90', { rough: 0.4, metal: 0.8 });
  for (const [x, z] of CAFE_COLUMNS) c.add(tubeGrey, K.tube(new THREE.Vector3(x - 0.9, raised + 0.75, z + 0.32), new THREE.Vector3(x + 0.9, raised + 1.0, z + 0.32), 0.022, 8));

  // sofas on castors, red and black
  const leather = { red: mats.plain('#a81c18', { rough: 0.42 }), black: mats.plain('#141416', { rough: 0.42 }) };
  for (const { rect: [x0, z0, x1, z1], back, red } of SOFAS) {
    K.sofa(c, red ? leather.red : leather.black, x0, z0, x1, z1, Q + 0.08, back);
    for (const [x, z] of [[x0 + 0.08, z0 + 0.08], [x1 - 0.08, z0 + 0.08], [x0 + 0.08, z1 - 0.08], [x1 - 0.08, z1 - 0.08]]) c.add(tubeGrey, K.cyl(x, z, 0.035, Q, Q + 0.08, 6));
  }

  // overhead: tube lights in strips, black conduit, and the duct along the inner wall with its branch to the floor
  const tubes = mats.glow('#fff1e2', true);
  for (const z of [-5.6, -4.4, -3.2]) for (let x = 11; x < CAFE_STAGE.x0 - 2; x += 2.9) c.add(tubes, K.box(x, z - 0.05, x + 2.5, z + 0.05, cTop - 0.07, cTop - 0.03));
  const conduit = mats.plain('#0d0d0e', { rough: 0.6 });
  for (const z of [-7.6, -6.4, -2.2, -1.2]) c.add(conduit, K.box(CAFE.x0 + 0.3, z - 0.02, CAFE.x1 - 0.3, z + 0.02, cTop - 0.09, cTop - 0.05));
  for (let x = 11.5; x < CAFE.x1; x += 3.4) c.add(conduit, K.box(x - 0.02, CAFE.z0 + 0.2, x + 0.02, CAFE.z1 - 0.2, cTop - 0.13, cTop - 0.09));
  const silverC = mats.plain('#a4a8ab', { rough: 0.35, metal: 0.9 });
  const along = (x0: number, x1: number, z: number, y: number, r: number) => new THREE.CylinderGeometry(r, r, x1 - x0, 14).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, y, z);
  c.add(silverC, along(CAFE.x0 + 1.5, CAFE.x1 - 5, CAFE_DUCT[1], cTop - 0.42, 0.27));
  c.add(silverC, K.cyl(CAFE_DUCT[0], CAFE_DUCT[1], 0.27, Q, cTop - 0.42, 14));
  if (ctx.quality.props) {
    for (let x = CAFE.x0 + 2; x < CAFE.x1 - 5; x += 0.9) c.add(silverC, along(x - 0.02, x + 0.02, CAFE_DUCT[1], cTop - 0.42, 0.284));
    for (let y = Q + 0.4; y < cTop - 0.8; y += 0.6) c.add(silverC, K.cyl(CAFE_DUCT[0], CAFE_DUCT[1], 0.284, y, y + 0.04, 14));
  }

  /* ---- the café's stage: a deck of plywood on scissor legs ---- */
  const cs = CAFE_STAGE;
  const csMid = (cs.z0 + cs.z1) / 2;
  const ply = mats.plain('#5a4636', { rough: 0.8 });
  const alu = mats.plain('#b0b3b6', { rough: 0.4, metal: 0.8 });
  c.add(ply, K.box(cs.x0, cs.z0, cs.x1, cs.z1, cs.y - 0.05, cs.y));
  c.add(alu, K.box(cs.x0 - 0.015, cs.z0, cs.x0, cs.z1, cs.y - 0.07, cs.y + 0.004));
  for (let z = cs.z0 + 0.15; z < cs.z1 - 1; z += (cs.z1 - cs.z0 - 0.3) / 3) {
    const zb = z + (cs.z1 - cs.z0 - 0.3) / 3;
    for (const x of [cs.x0 + 0.15, cs.x1 - 0.3]) {
      c.add(alu, K.tube(new THREE.Vector3(x, Q + 0.02, z), new THREE.Vector3(x, cs.y - 0.06, zb), 0.02, 6));
      c.add(alu, K.tube(new THREE.Vector3(x, cs.y - 0.06, z), new THREE.Vector3(x, Q + 0.02, zb), 0.02, 6));
    }
  }
  K.djBooth(cafe, { at: [cs.x0 + 1.4, csMid], y: cs.y, facing: UP, layout: 'cdjs' });
  // a cabinet on the floor each side of the deck
  for (const z of [cs.z0 - 0.75, cs.z1 + 0.1]) K.speakerCabinet(c, mats, cs.x0 + 0.2, z, cs.x0 + 0.85, z + 0.65, Q, Q + 1.2, 'ew');
  const cafeLed = K.ledScreen(mats, '#ff3a30', 1.4);
  const cafeLedTop = Math.min(cTop - 0.25, cs.y + 0.1 + MEASURED.cafeLed[1]);
  cafeGroup.add(new THREE.Mesh(K.panel([CAFE.x1 - 0.06, csMid + MEASURED.cafeLed[0] / 2], [CAFE.x1 - 0.06, csMid - MEASURED.cafeLed[0] / 2], cs.y + 0.1, cafeLedTop, true), cafeLed));
  K.playScreens(cafe, [cafeLed], 0.0, 0.05, 0.4);
  // old par cans hung in a row before the deck, and two bars of LEDs over it
  for (let k = 0; k < 5; k++) K.parCan(cafe, c, { at: [cs.x0 - 1.2, cTop - 0.12, cs.z0 + ((cs.z1 - cs.z0) * (k + 0.5)) / 5], colour: k % 2 ? '#ff2a2a' : '#ff8a2a' });
  const bars = mats.glow('#ff6a3a', true);
  for (const x of [cs.x0 + 0.6, cs.x0 + 1.6]) {
    c.add(conduit, K.box(x - 0.05, cs.z0 + 0.3, x + 0.05, cs.z1 - 0.3, cTop - 0.4, cTop - 0.3));
    for (let z = cs.z0 + 0.4; z < cs.z1 - 0.35; z += 0.16) c.add(bars, K.box(x - 0.03, z, x + 0.03, z + 0.07, cTop - 0.41, cTop - 0.4));
  }
  // the glass doors beside the deck, on the canal side, and the red sign over them
  const glassDoor = new THREE.MeshStandardMaterial({ color: '#27343a', roughness: 0.1, metalness: 0.6 });
  c.add(glassDoor, K.panel([CAFE.x1 - 0.05, cs.z0 - 0.3], [CAFE.x1 - 0.05, CAFE.z0 + 0.35], Q + 0.05, Q + 2.2));
  for (const z of [cs.z0 - 0.3, (cs.z0 - 0.3 + CAFE.z0 + 0.35) / 2, CAFE.z0 + 0.35]) c.add(alu, K.box(CAFE.x1 - 0.09, z - 0.025, CAFE.x1 - 0.04, z + 0.025, Q, Q + 2.25));
  cafeGroup.add(new THREE.Mesh(K.panel([CAFE.x1 - 0.1, CAFE.z0 + 0.5], [CAFE.x1 - 0.1, cs.z0 - 0.45], Q + 2.32, Q + 2.5), new THREE.MeshBasicMaterial({ map: ticker('EXIT'), side: THREE.DoubleSide })));

  /* =============================================================== foyer ==== */
  const foyer = stages.stage(room('foyer'));
  // the way on: a red sign over each doorway, as the club's own signs are, and the hall's opening lit
  const overDoor = (map: THREE.Texture, a: Pt, b: Pt) => room('foyer').add(new THREE.Mesh(K.panel(a, b, Q + GUESS.doorHeight + 0.08, Q + GUESS.doorHeight + 0.08 + (Math.hypot(b[0] - a[0], b[1] - a[1]) * 96) / 512), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false })));
  // the word over the door it names; each panel runs so that it reads the right way from the foyer
  overDoor(ticker('HALLE'), [6.0, FOYER.z1 - 0.02], [3.0, FOYER.z1 - 0.02]);
  overDoor(ticker('CAF\u00c9'), [FOYER.x1 - 0.02, -5.4], [FOYER.x1 - 0.02, -2.6]);
  // a red glow on the floor of the passage through the wall, to draw the eye to it
  foyer.batch.add(mats.glow('#ff2a1c'), K.box(3.25, FOYER.z1 - 0.28, 5.75, FOYER.z1 - 0.25, Q + GUESS.doorHeight - 0.03, Q + GUESS.doorHeight));
  foyer.batch.add(black, K.box(FOYER.x0, -3.2, FOYER.x0 + 1.0, -1, Q, Q + 1.1));
  foyer.batch.add(mats.glow('#ffe9c8'), K.box(FOYER.x0 + 0.2, -2.6, FOYER.x0 + 0.8, -1.6, Q + 1.1, Q + 1.12));

  // the cloakroom: a counter across the corner, coats on a rail behind it
  for (let i = 0; i < CLOAK.length - 1; i++) foyer.batch.add(black, K.along(CLOAK[i], CLOAK[i + 1], 0.45, Q, Q + 1.1));
  foyer.batch.add(mats.plain('#8a8d90', { rough: 0.4, metal: 0.8 }), K.box(6.8, FOYER.z0 + 0.45, FOYER.x1 - 0.1, FOYER.z0 + 0.49, Q + 1.8, Q + 1.84));
  ['#1b1b1e', '#3a2a22', '#22303a', '#5a1a1a', '#1b1b1e', '#2c3a2a', '#444', '#1b1b1e', '#6a5a3a'].forEach((colour, i) => {
    const x = 6.9 + i * 0.16;
    foyer.batch.add(mats.plain(colour, { rough: 0.95 }), K.box(x, FOYER.z0 + 0.22, x + 0.1, FOYER.z0 + 0.72, Q + 0.85 + 0.05 * (i % 3), Q + 1.78));
  });

  /* ============================================================= toilets ==== */
  const wc = stages.stage(room('wc'));
  const laminate = mats.plain('#3a3d40', { rough: 0.6 });
  const doors = mats.plain('#b3161c', { rough: 0.5 });
  CUBICLES.forEach((x, i) => {
    wc.batch.add(laminate, K.along([x, WC.z0], [x, WC.z0 + 1.5], 0.04, Q + 0.15, Q + 2.1));
    if (i < CUBICLES.length - 1) wc.batch.add(doors, K.along([x + 0.06, WC.z0 + 1.5], [CUBICLES[i + 1] - 0.06, WC.z0 + 1.5], 0.03, Q + 0.15, Q + 2.05));
  });
  wc.batch.add(mats.plain('#e6e8e4', { rough: 0.3 }), K.box(WC.x1 - 0.5, WC.z0 + 0.5, WC.x1 - 0.02, WC.z1 - 0.5, Q + 0.7, Q + 0.88));
  wc.batch.add(mats.plain('#b4bcc0', { rough: 0.05, metal: 1 }), K.panel([WC.x1 - 0.03, WC.z0 + 0.5], [WC.x1 - 0.03, WC.z1 - 0.5], Q + 1.15, Q + 2));
  wc.batch.add(mats.glow('#eef4ff'), K.box(WC.x0 + 1, (WC.z0 + WC.z1) / 2 - 0.05, WC.x1 - 1, (WC.z0 + WC.z1) / 2 + 0.05, Q + 2.74, Q + 2.77));

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
      room('hall').visible = room('wc').visible = zone.inside;
      canal.flow(f.t);
      room('cafe').visible = !inHall;

      if (night) {
        // the matrix: a wave of colour that walks down the room, a step a beat, and flashes white with the strobe
        for (let col = 0; col < cols; col++) {
          const wave = 0.5 + 0.5 * Math.sin(col * 0.7 - beat * Math.PI * 0.5);
          for (let r = 0; r < rows; r++) {
            if (strobe) tint.setRGB(1, 1, 1);
            // amber, as the club runs it, swinging to red and back
            else tint.setHSL(0.075 + 0.045 * Math.sin(beat * 0.11 + r * 0.4), 1, 0.04 + 0.5 * wave * (0.5 + 0.5 * pulse));
            spots.setColorAt(col * rows + r, tint);
          }
        }
        spots.instanceColor!.needsUpdate = true;
        dots.color.setRGB(1, 0.62, 0.18).multiplyScalar(strobe ? 1.4 : 0.2 + 0.8 * pulse);
        acl.color.setScalar(0.25 + 0.75 * pulse);
        bars.color.setRGB(1, 0.42, 0.22).multiplyScalar(0.3 + 0.7 * pulse);
        lens.color.setHSL((f.t * 0.05) % 1, 0.6, 0.6 + 0.25 * pulse);
        ball.rotation.y = f.t * 0.6;
        for (const b of ballBeams) b.set(0.12 + 0.16 * pulse);
        if (rig.isOn('hall')) {
          const work = rig.get('hall-work');
          if (work) work.intensity = 0;
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
      // the fittings follow whether the club is open, not what the light is
      night = time.open;
      spots.visible = night;
      for (const b of ballBeams) b.mesh.visible = night;
      if (!night) for (const m of [dots, acl, lens, bars]) m.color.set('#2a2c30');
      // by day the café's tubes are on and the hall's sign is off
      tubes.color.set(night ? '#5a3a34' : '#fff1e2');
      neon.color.setScalar(night ? 1 : 0.25);
      signMat.color.setScalar(night ? 1 : 0.55);
      stages.setTime(night);
    },
  };
}
