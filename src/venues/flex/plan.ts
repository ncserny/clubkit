import { bouncer, dancers, dj, doorStaff, group, person, queue, talkers, WARDROBE } from '../../kit/people';
import type { CrowdSpec, LightSpec, Link, Obstacle, Platform, Pt, Rect, Room, Stair, TimeState, Vec3, VenuePlan, Viewpoint } from '../../engine/types';
import { copy, TEXT } from './copy';

/**
 * Flex, Vienna: the plan. Built from docs/flex-research.md, which marks every fact as sourced
 * or guessed; the same split is kept here in MEASURED and GUESS.
 *
 * The venue frame: the origin is the north-west end of the club's frontage on the quay wall
 * (OpenStreetMap way 133677620). x runs along that wall downstream, to the south-east, toward
 * the stage. z runs across it: negative toward the Donaukanal, positive inland, under the road.
 * y is up from the street (Franz-Josefs-Kai), so the quay the club stands on is below zero.
 */

/** From the club's own hall plan and stage plot (flex.at/technik) and from the map. */
export const MEASURED = {
  /** The frontage on the quay wall, from the map. */
  frontage: 51.6,
  stageHeight: 1.02,
  stageWidth: 5.7,
  stageDepth: 3.7,
  /** Rear wall to stage front. */
  stageZone: 4.84,
  riser: { depth: 1.73, height: 0.5 },
  /** Stage front to the mixing desk; the desk is 1.67 m wide. */
  foh: 7.86,
  fohWidth: 1.67,
  ledWall: [5, 3] as const,
  /** The two speaker columns stand this far apart and are about this tall. */
  mainsApart: 4.88,
  mainsHeight: 3.3,
  /** The matrix of spots over the dance floor. */
  matrix: [19, 8] as const,
  cafeStage: 4,
  cafeLed: [3.84, 2.56] as const,
};

/** Estimated from drawings and photographs, or not known at all. Change a value and the model follows. */
export const GUESS = {
  /** Street level above the quay, and the quay above the water: from a coarse terrain model, give or take a metre. */
  quayBelowStreet: 6.5,
  waterBelowQuay: 2.5,
  /** The hall: its width is scaled from the plan, its length and height are estimates. */
  hallWidth: 10.5,
  hallLength: 40,
  hallHeight: 4.6,
  /** The dance strip on the inland side; the raised side of the hall takes the rest. */
  danceWidth: 5.8,
  platformRise: 0.45,
  /** The wall between the pavilion and the hall: the old quay wall. */
  wall: 0.6,
  cafeHeight: 3.2,
  cafeDepth: 9.1,
  foyerDepth: 7.5,
  /** Where the door is: the notch in the mapped outline. */
  door: [3.6, 5.6] as const,
  doorHeight: 2.3,
  /** Techno, at the pace Electric Indigo plays it. The café's house runs at the same tempo. */
  bpm: 134,
};

/** The quay, the water and the street, as heights. */
export const Q = -GUESS.quayBelowStreet;
export const WATER = Q - GUESS.waterBelowQuay;
export const EYE = 1.7;

const W = GUESS.wall;
/** The hall, behind the quay wall: x from its bar end to the wall behind the stage, z from the quay wall inland. */
export const HALL = { x0: 2, x1: 2 + GUESS.hallLength, z0: W, z1: W + GUESS.hallWidth };
/** The line between the raised side (toward the canal) and the dance strip (inland). */
export const SPLIT = HALL.z1 - GUESS.danceWidth;
export const STAGE = { x0: HALL.x1 - MEASURED.stageZone, x1: HALL.x1 - MEASURED.stageZone + MEASURED.stageDepth, z0: SPLIT + 0.05, z1: HALL.z1 - 0.05, y: Q + MEASURED.stageHeight };
export const STAGE_MID = (STAGE.z0 + STAGE.z1) / 2;
export const FOH = { x: STAGE.x0 - MEASURED.foh, z: SPLIT - 1.2 };
export const FOYER = { x0: 1, x1: 8.4, z0: -GUESS.foyerDepth - 0.3, z1: -0.3 };
export const CAFE = { x0: 8.9, x1: 36, z0: -GUESS.cafeDepth - 0.3, z1: -0.3 };
export const CAFE_STAGE = { x0: CAFE.x1 - MEASURED.cafeStage, x1: CAFE.x1, z0: -7, z1: -3, y: Q + 0.6 };
/** The backstage shed at the downstream end of the frontage: seen from outside only. */
export const SHED = { x0: 36.3, x1: MEASURED.frontage, z0: -4, z1: -0.3 };
/** The garden on the quay, toward the bridge. */
export const GARDEN: Rect = [-40, -15, -3, -2.5];

/** The stair from the street down to the quay ("Abgang Augartenbrücke"), along the wall. */
export const STEPS = { top: -60.5, bottom: -45.5, z0: -10.4, z1: -7.6 };
/** The Augartenbrücke, where it crosses the cut. */
export const BRIDGE: Rect = [-95.2, -97, -65.1, -16.5];

/**
 * The two walls of the canal's cut, from the map, in venue coordinates and in order downstream.
 * `RIGHT` is the club's bank (the wall the street stands on), `LEFT` the far one; the EDGE
 * lines are where each quay meets the water.
 */
export const RIGHT_WALL: Pt[] = [[-400, -165], [-340, -110], [-300, -78], [-250, -50], [-213, -30.1], [-174, -22.4], [-108, -13.9], [-95, -17], [-65, -17], [STEPS.top, STEPS.z0 - 0.1], [STEPS.top, -7.5], [STEPS.bottom, -7.5], [-42, -5.4], [0, 0], [60, 0], [100, 3], [160, 14], [260, 30], [330, 54], [420, 93]];
export const RIGHT_EDGE: Pt[] = [[-400, -185], [-340, -127.6], [-300.8, -93.7], [-250.4, -67.5], [-196.5, -49.1], [-171.6, -43.8], [-123.2, -37.6], [-110.7, -29.6], [-67.5, -29.3], [-47.1, -27.6], [-24.5, -24.5], [18.3, -17.4], [61.5, -10.5], [95, -6.1], [133.4, -0.1], [203.3, 11.8], [261.8, 21.4], [329, 44.5], [420, 86]];
export const LEFT_EDGE: Pt[] = [[-400, -240], [-357.5, -198.4], [-295.3, -147.8], [-230.9, -105.1], [-195.6, -90.4], [-140.9, -78.8], [-95.1, -79.1], [107.7, -77.6], [145.9, -73.2], [185.8, -65.6], [241.7, -49.2], [290.2, -28.6], [341.6, -4.4], [420, 32.3]];
export const LEFT_WALL: Pt[] = [[-400, -262], [-357, -215], [-295, -165], [-231, -122], [-196, -107], [-141, -96], [108, -96], [146, -90], [186, -82.5], [242, -66], [290, -45.5], [342, -21.5], [420, 15]];

const caption = (title: string, text: string) => ({ title, text });
const V = (x: number, z: number, y: number): Vec3 => [x, y, z];
const NIGHT = ['night'];

/* ------------------------------------------------------------------ rooms ---- */
const BLACK = { floor: '#77736c', walls: '#141416', ceiling: '#0c0c0d' };
const rooms: Room[] = [
  {
    id: 'hall',
    name: 'The hall',
    level: Q,
    height: GUESS.hallHeight,
    areas: [[HALL.x0, HALL.z0, HALL.x1, HALL.z1]],
    zone: { inside: true, music: 1, loudness: 1, track: 'techno', exposure: 1.05, speed: 2.6, haze: { default: 0.03, day: 0.006 }, fog: '#0b0a10', lightSets: ['hall'], echo: 0.5 },
    caption: caption('The hall', TEXT.rooms.hall),
    colours: BLACK,
  },
  {
    id: 'cafe',
    name: 'Flex Café',
    level: Q,
    height: GUESS.cafeHeight,
    areas: [[CAFE.x0, CAFE.z0, CAFE.x1, CAFE.z1]],
    zone: { inside: true, music: 0.85, loudness: 0.6, track: 'house', exposure: 1.1, speed: 2.8, haze: { default: 0.014, day: 0.004 }, fog: '#12080a', lightSets: ['cafe'], echo: 0.2 },
    caption: caption('Flex Café', TEXT.rooms.cafe),
    colours: { floor: '#6f6b66', walls: '#161416', ceiling: '#5a1216' },
  },
  {
    id: 'foyer',
    name: 'The door',
    level: Q,
    height: GUESS.cafeHeight,
    areas: [[FOYER.x0, FOYER.z0, FOYER.x1, FOYER.z1]],
    zone: { inside: true, music: 0.35, loudness: 0.55, track: 'techno', exposure: 1.1, speed: 2.8, haze: 0.006, fog: '#0d0c10', lightSets: ['foyer'], echo: 0.15 },
    caption: caption('The door', TEXT.rooms.foyer),
    colours: { floor: '#6f6b66', walls: '#18181a', ceiling: '#101012' },
  },
  {
    id: 'quay',
    name: 'The quay',
    level: Q,
    height: 5,
    // the lower quay from the bridge to the lock, round the stair and round the club's frontage
    areas: [
      [
        [-95, -17.3],
        [-65.2, -17.3],
        [STEPS.top - 0.2, STEPS.z0 - 0.15],
        [STEPS.bottom + 0.3, STEPS.z0 - 0.15],
        [STEPS.bottom + 0.3, -7.8],
        [-42, -5.9],
        [0.6, -0.35],
        [0.6, FOYER.z0 - 0.3],
        [FOYER.x1 + 0.2, FOYER.z0 - 0.3],
        [FOYER.x1 + 0.2, CAFE.z0 - 0.3],
        [CAFE.x1 + 0.3, CAFE.z0 - 0.3],
        [CAFE.x1 + 0.3, SHED.z0 - 0.3],
        [SHED.x1 + 0.3, SHED.z0 - 0.3],
        [SHED.x1 + 0.3, -0.35],
        [60, -0.35],
        [95, 2.3],
        [95, -5.9],
        [61.5, -10.2],
        [18.3, -17.1],
        [-24.5, -24.2],
        [-47.1, -27.3],
        [-67.5, -29],
        [-95, -29.2],
      ],
    ],
    open: true,
    sky: true,
    wallHeight: 0,
    zone: { inside: false, music: 0.12, loudness: 0.4, track: 'techno', speed: 3.4, lightSets: ['quay'] },
    caption: caption('The quay', TEXT.rooms.quay),
    colours: { floor: '#77736c' },
  },
  {
    id: 'far-quay',
    name: 'The far bank',
    level: Q,
    height: 5,
    areas: [[-60, -95.4, 100, -79.6]],
    open: true,
    sky: true,
    wallHeight: 0,
    zone: { inside: false, music: 0.04, loudness: 0.2, track: 'techno', speed: 3.4, lightSets: ['quay'] },
    caption: caption('The far bank', TEXT.views.canal),
    colours: { floor: '#77736c' },
  },
];

/* ------------------------------------------------------- ways through ---- */
const links: Link[] = [
  { id: 'door', from: 'quay', to: 'foyer', area: [GUESS.door[0], FOYER.z0 - 0.5, GUESS.door[1], FOYER.z0 + 0.3], level: Q, height: GUESS.doorHeight },
  { id: 'foyer-cafe', from: 'foyer', to: 'cafe', area: [FOYER.x1 - 0.3, -5.2, CAFE.x0 + 0.3, -2.8], level: Q, height: GUESS.doorHeight },
  { id: 'foyer-hall', from: 'foyer', to: 'hall', area: [3.2, FOYER.z1 - 0.3, 5.8, HALL.z0 + 0.3], level: Q, height: GUESS.doorHeight },
  // further down the wall, a second way between the café and the hall's raised side
  { id: 'cafe-hall', from: 'cafe', to: 'hall', area: [20, CAFE.z1 - 0.3, 22, HALL.z0 + 0.3], level: Q, height: GUESS.doorHeight },
];

const stairs: Stair[] = [
  {
    id: 'abgang',
    from: 'outside',
    to: 'quay',
    area: [
      [STEPS.top, STEPS.z0],
      [STEPS.bottom + 0.3, STEPS.z0],
      [STEPS.bottom + 0.3, STEPS.z1],
      [STEPS.top, STEPS.z1],
    ],
    line: [
      [STEPS.top, (STEPS.z0 + STEPS.z1) / 2],
      [STEPS.bottom, (STEPS.z0 + STEPS.z1) / 2],
    ],
    y: [0, Q],
  },
];

const platforms: Platform[] = [
  // the raised side of the hall, toward the canal: the bar, the mixing desk, the way to the stage
  { id: 'hall-side', room: 'hall', area: [9, HALL.z0, HALL.x1, SPLIT], level: Q + GUESS.platformRise },
  { id: 'stage', room: 'hall', area: [STAGE.x0, STAGE.z0 - 0.05, HALL.x1, HALL.z1], level: STAGE.y },
  { id: 'cafe-stage', room: 'cafe', area: [CAFE_STAGE.x0, CAFE_STAGE.z0, CAFE_STAGE.x1, CAFE_STAGE.z1], level: CAFE_STAGE.y },
  // the stepped seating in the café: two low tiers along the canal side
  { id: 'cafe-tier-1', room: 'cafe', area: [12, CAFE.z0, 30, CAFE.z0 + 2.6], level: Q + 0.3 },
  { id: 'cafe-tier-2', room: 'cafe', area: [12, CAFE.z0, 30, CAFE.z0 + 1.3], level: Q + 0.6 },
];

/** Columns along the edge of the raised side, one every five metres. */
export const COLUMNS: Pt[] = [12, 17, 22, 27, 32].map((x): Pt => [x, SPLIT - 0.25]);
export const HALL_BAR: [Pt, Pt] = [
  [9.6, HALL.z0 + 1.5],
  [18.6, HALL.z0 + 1.5],
];
export const CAFE_BAR: [Pt, Pt] = [
  [18.5, CAFE.z1 - 1.5],
  [10.5, CAFE.z1 - 1.5],
];
export const DESK: Rect = [STAGE.x0 + 0.5, STAGE_MID - 1.3, STAGE.x0 + 1.3, STAGE_MID + 1.3];

const obstacles: Obstacle[] = [
  ...COLUMNS.map(([x, z]): Obstacle => ({ label: 'column', circle: [x, z, 0.22], y0: Q, y1: Q + GUESS.hallHeight, draw: '#0e0e10' })),
  { label: 'hall bar', rect: [HALL_BAR[0][0], HALL.z0, HALL_BAR[1][0], HALL_BAR[0][1] + 0.1], y0: Q, y1: Q + 1.6, draw: false },
  { label: 'mixing desk', rect: [FOH.x - MEASURED.fohWidth / 2, FOH.z - 0.5, FOH.x + MEASURED.fohWidth / 2, FOH.z + 0.5], y0: Q, y1: Q + 1.7, draw: false },
  { label: 'dj desk', rect: DESK, y0: STAGE.y, y1: STAGE.y + 1.1, draw: false },
  { label: 'speaker column', circle: [STAGE.x0 + 0.35, STAGE_MID - MEASURED.mainsApart / 2, 0.4], y0: STAGE.y, y1: STAGE.y + 3.4, draw: false },
  { label: 'speaker column', circle: [STAGE.x0 + 0.35, STAGE_MID + MEASURED.mainsApart / 2, 0.4], y0: STAGE.y, y1: STAGE.y + 3.4, draw: false },
  { label: 'café bar', rect: [CAFE_BAR[1][0], CAFE_BAR[0][1] - 0.1, CAFE_BAR[0][0], CAFE.z1], y0: Q, y1: Q + 1.6, draw: false },
  { label: 'cashier', rect: [FOYER.x0, -3.2, FOYER.x0 + 1.1, -1], y0: Q, y1: Q + 1.2, draw: false },
  // nobody walks off the quay into the canal
  { label: 'quay edge', path: [[-95, -29.2], [-67.5, -29], [-47.1, -27.3], [-24.5, -24.2], [18.3, -17.1], [61.5, -10.2], [95, -5.9]], width: 0.2, y0: Q, y1: Q + 1, draw: false },
];

/* ----------------------------------------------------------------- lights ---- */
const lights: LightSpec[] = [
  // the hall: a red and a blue wash down the dance strip, a white one on the stage, and the strobe
  { id: 'hall-wash-0', set: 'hall', type: 'point', at: [14, Q + 3.9, STAGE_MID], colour: '#ff2a3a', intensity: 26, range: 22, decay: 1.6 },
  { id: 'hall-wash-1', set: 'hall', type: 'point', at: [27, Q + 3.9, STAGE_MID], colour: '#2a5cff', intensity: 30, range: 22, decay: 1.6 },
  { id: 'hall-stage', set: 'hall', type: 'spot', at: [STAGE.x0 - 3, Q + 4.3, STAGE_MID], target: [STAGE.x0 + 1.5, STAGE.y + 1, STAGE_MID], colour: '#cfd8ff', intensity: 60, range: 14, decay: 1.5, angle: 0.75, penumbra: 0.6, shadow: true },
  { id: 'hall-bar', set: 'hall', type: 'point', at: [14, Q + 2.6, HALL.z0 + 1], colour: '#ffb070', intensity: 7, range: 9, decay: 1.8 },
  { id: 'hall-strobe', set: 'hall', type: 'point', at: [24, Q + 4.2, STAGE_MID], colour: '#f2f5ff', intensity: 0, range: 40, decay: 1.2 },
  // the café: red, low and warm
  { id: 'cafe-0', set: 'cafe', type: 'point', at: [15, Q + 2.7, -5], colour: '#ff3a30', intensity: 14, range: 14, decay: 1.7 },
  { id: 'cafe-1', set: 'cafe', type: 'point', at: [27, Q + 2.7, -5], colour: '#ff5a3a', intensity: 14, range: 14, decay: 1.7 },
  { id: 'cafe-bar', set: 'cafe', type: 'point', at: [17.5, Q + 2.3, CAFE.z1 - 1], colour: '#ffc890', intensity: 6, range: 8, decay: 1.8 },
  { id: 'foyer', set: 'foyer', type: 'point', at: [4.6, Q + 2.6, -4], colour: '#ffd9b0', intensity: 9, range: 9, decay: 1.7 },
  // the quay: lamps along the frontage and in the garden, the glow of the door
  { id: 'quay-door', set: 'quay', type: 'point', at: [4.6, Q + 2.9, FOYER.z0 - 1.5], colour: '#ffe2c0', intensity: 22, range: 16, decay: 1.6, outdoor: true },
  { id: 'quay-garden', set: 'quay', type: 'point', at: [-22, Q + 4, -9], colour: '#ffc58a', intensity: 30, range: 26, decay: 1.5, outdoor: true },
  { id: 'quay-front', set: 'quay', type: 'point', at: [24, Q + 4.2, -12.5], colour: '#ffd2a0', intensity: 30, range: 26, decay: 1.5, outdoor: true },
  { id: 'quay-steps', set: 'quay', type: 'point', at: [-52, Q + 6, -12], colour: '#ffd2a0', intensity: 26, range: 24, decay: 1.5, outdoor: true },
];

/* ----------------------------------------------------------------- people ---- */
const F = { upstream: -Math.PI / 2, downstream: Math.PI / 2, canal: Math.PI, inland: 0 };
/** Where the DJ stands: behind the desk, looking down the hall. */
export const DJ_AT = { x: DESK[2] + 0.45, y: STAGE.y, z: STAGE_MID, facing: F.upstream };

const crowds: CrowdSpec[] = [
  // the queue along the café's frontage, the door staff at the head of it
  queue({
    id: 'queue',
    room: 'quay',
    path: [
      [30, CAFE.z0 - 1.5],
      [8.5, CAFE.z0 - 1.5],
      [6.6, FOYER.z0 - 1.5],
    ],
    y: Q + 0.02,
    seed: 5,
    spacing: 0.72,
    times: NIGHT,
    dress: WARDROBE.mixed,
    staff: [bouncer(3.1, FOYER.z0 - 0.9, Q + 0.02, F.canal + 0.4), bouncer(6.1, FOYER.z0 - 0.9, Q + 0.02, F.canal - 0.4)],
  }),
  talkers({ id: 'garden', room: 'quay', rect: GARDEN, y: Q + 0.02, count: [14, 34, 60], seed: 11, gap: 0.7, times: NIGHT, dress: WARDROBE.summer }),
  talkers({ id: 'quay-edge', room: 'quay', rect: [10, -13.4, 40, -12], y: Q + 0.02, count: [5, 12, 20], seed: 13, gap: 0.9, times: NIGHT, dress: WARDROBE.mixed }),
  // the door
  doorStaff({ id: 'cashier', room: 'foyer', people: [person(FOYER.x0 + 0.5, -2.1, Q + 0.02, F.downstream, 'stand'), bouncer(6.6, -1.6, Q + 0.02, F.canal)], times: NIGHT }),
  // the café
  talkers({ id: 'cafe', room: 'cafe', rect: [10, CAFE.z0 + 2.9, 31, CAFE.z1 - 2.2], y: Q + 0.02, count: [14, 34, 56], seed: 21, gap: 0.62, faceTo: [34, -5], times: NIGHT, dress: WARDROBE.mixed }),
  group({ id: 'cafe-bar-staff', room: 'cafe', people: [person(12.5, CAFE.z1 - 0.8, Q + 0.02, F.canal, 'stand'), person(16.5, CAFE.z1 - 0.8, Q + 0.02, F.canal, 'stand')], times: NIGHT, dress: WARDROBE.staff }),
  dj({ id: 'cafe-dj', room: 'cafe', at: { x: CAFE_STAGE.x0 + 2.2, y: CAFE_STAGE.y, z: -5, facing: F.upstream }, times: NIGHT }),
  // the hall: the dance strip packed and facing the stage, the raised side standing and talking
  dancers({ id: 'floor', room: 'hall', rect: [HALL.x0 + 4, SPLIT + 0.3, STAGE.x0 - 0.7, HALL.z1 - 0.3], y: Q + 0.02, count: [70, 170, 280], seed: 31, gap: 0.55, avoid: [[STAGE.x0 - 7.4, STAGE_MID - 0.8, STAGE.x0 - 2.6, STAGE_MID + 0.8], [HALL.x0 + 4, STAGE_MID - 1.6, HALL.x0 + 9, STAGE_MID - 0.2]], clear: 0.15, faceTo: [STAGE.x0 + 1, STAGE_MID], armsUp: true, times: NIGHT, dress: WARDROBE.black }),
  talkers({ id: 'side', room: 'hall', rect: [19.5, HALL.z0 + 0.4, STAGE.x0 - 1, SPLIT - 0.7], avoid: [[FOH.x - 1.2, FOH.z - 0.9, FOH.x + 1.2, FOH.z + 0.9]], clear: 0.2, y: Q + GUESS.platformRise + 0.02, count: [10, 24, 40], seed: 33, gap: 0.62, faceTo: [STAGE.x0, STAGE_MID], times: NIGHT, dress: WARDROBE.black }),
  group({
    id: 'hall-bar',
    room: 'hall',
    people: [10.5, 11.6, 12.8, 14.1, 15.3, 16.6, 17.8].map((x, i) => person(x, HALL_BAR[0][1] + 0.55, Q + GUESS.platformRise + 0.02, F.canal + (i % 2 ? 0.3 : -0.2), 'talk')),
    count: [3, 5, 7],
    times: NIGHT,
    dress: WARDROBE.black,
  }),
  group({ id: 'hall-staff', room: 'hall', people: [person(12, HALL.z0 + 0.8, Q + GUESS.platformRise + 0.02, F.inland, 'stand'), person(16, HALL.z0 + 0.8, Q + GUESS.platformRise + 0.02, F.inland, 'stand'), person(FOH.x, FOH.z - 0.9, Q + GUESS.platformRise + 0.02, F.downstream, 'stand')], times: NIGHT, dress: WARDROBE.staff }),
  dj({ id: 'dj', room: 'hall', at: DJ_AT, times: NIGHT }),
];

/* ------------------------------------------------------------- viewpoints ---- */
const viewpoints: Viewpoint[] = [
  { id: 'bridge', label: 'Bridge', title: 'From the Augartenbrücke', text: TEXT.views.bridge, position: V(-66.5, -44, EYE), target: V(10, -8, Q + 2) },
  { id: 'steps', label: 'Steps', title: 'Abgang Augartenbrücke', text: TEXT.views.steps, position: V(-63.5, -9, EYE), target: V(-40, -10, Q + 1) },
  { id: 'door', label: 'Door', title: 'The door', text: TEXT.views.door, position: V(1, -15.5, Q + EYE), target: V(5.5, FOYER.z0, Q + 2.2) },
  { id: 'cafe', label: 'Café', title: 'Flex Café', text: TEXT.rooms.cafe, position: V(10.5, -4.2, Q + EYE), target: V(34, -5, Q + 1.6) },
  { id: 'hall', label: 'Hall', title: 'The hall, from the bar end', text: TEXT.rooms.hall, position: V(4.6, STAGE_MID - 1, Q + EYE), target: V(STAGE.x0, STAGE_MID, Q + 2.2) },
  { id: 'floor', label: 'Floor', title: 'On the dance floor', text: TEXT.views.floor, position: V(STAGE.x0 - 6, STAGE_MID, Q + EYE), target: V(STAGE.x0 + 1, STAGE_MID, Q + 2.6) },
  { id: 'foh', label: 'Desk', title: 'At the mixing desk', text: TEXT.views.foh, position: V(FOH.x - 1.4, FOH.z - 0.3, Q + GUESS.platformRise + EYE), target: V(STAGE.x0 + 1, STAGE_MID, Q + 2.2) },
  { id: 'booth', label: 'Booth', title: 'Behind the decks', text: TEXT.views.booth, position: V(STAGE.x1 - 0.2, STAGE_MID + 0.9, STAGE.y + EYE), target: V(20, STAGE_MID - 0.5, Q + 1.4) },
  { id: 'canal', label: 'Canal', title: 'From the far bank', text: TEXT.views.canal, position: V(34, -86, Q + EYE), target: V(14, 0, Q + 2) },
];

/* ------------------------------------------------------------------ times ---- */
const times: TimeState[] = [
  {
    id: 'night',
    label: 'Friday 01:30',
    night: true,
    sun: { azimuth: 150, elevation: 38, colour: '#9fb0d8', intensity: 0.3, indoors: false },
    hemi: { sky: '#46506c', ground: '#2a2420', intensity: 0.46, indoors: 0.14 },
    sky: { top: '#05060c', mid: '#14131d', horizon: '#5a3b2a', sun: '#000000' },
    fog: { colour: '#17161b', density: 0.002 },
    env: { outdoors: 0.16, indoors: 0.05 },
    skylineOpacity: 1,
    windows: 1,
    lamps: 6,
    bloom: 0.55,
    outdoorLights: 1,
  },
  {
    id: 'day',
    label: 'Afternoon, empty',
    night: false,
    sun: { azimuth: 215, elevation: 42, colour: '#fff3e0', intensity: 3, indoors: false },
    hemi: { sky: '#b9cde6', ground: '#6b6358', intensity: 1.1, indoors: 0.7 },
    sky: { top: '#4b78b8', mid: '#8db0d8', horizon: '#d9dfe2', sun: '#fff2d8' },
    fog: { colour: '#c3ccd4', density: 0.0006 },
    env: { outdoors: 0.9, indoors: 0.2 },
    skylineOpacity: 0.45,
    windows: 0,
    lamps: 0.2,
    bloom: 0.2,
    outdoorLights: 0.05,
  },
];

/* ------------------------------------------------------------------- plan ---- */
/** The venue's x axis in the world (x east, z south): along the quay wall, downstream. */
const ALONG: Pt = [39.6, 33.1];

export const plan: VenuePlan = {
  id: 'flex',
  frame: { centre: [-22.9, -13.4], rotation: Math.atan2(-ALONG[1], ALONG[0]) },
  rooms,
  links,
  stairs,
  platforms,
  ladders: [],
  obstacles,
  shells: [],
  lights,
  crowds,
  viewpoints,
  startView: 'door',
  times,

  outdoors: {
    door: [(GUESS.door[0] + GUESS.door[1]) / 2, FOYER.z0],
    audible: 70,
    loudness: { far: 0.05, near: 0.45, aerial: 0.2 },
    track: 'techno',
    street: { name: 'Franz-Josefs-Kai', music: 0.04, speed: 6, lightSets: ['quay'], caption: caption('Franz-Josefs-Kai', TEXT.views.street) },
    doorstep: { name: 'Above the Flex', radius: 30, musicRadius: 10, music: 0.08, speed: 6, lightSets: ['quay'], caption: caption('Above the Flex', TEXT.views.street) },
    aerial: { name: 'Above', above: 30, speed: 30, lightSets: ['quay'], caption: caption('The Donaukanal, from above', TEXT.views.above) },
    // the canal and both quays lie below the street: the venue draws them
    cut: [{ area: [...RIGHT_WALL, ...[...LEFT_WALL].reverse()] }],
    decks: [{ area: BRIDGE }],
    shadowFocus: [-22.9 + 10, 0, -13.4 - 10],
    shadowReach: 130,
  },

  show: {
    bpm: GUESS.bpm,
    strobe: { everyBars: 4, beats: 2, flashesPerBeat: 1, duty: 0.25 },
  },

  copy,
};
