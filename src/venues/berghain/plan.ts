import { offsetPath } from '../../engine/geom';
import type { LightSpec, Obstacle, Pt, Rect, TimeState, VenuePlan, ZoneSettings } from '../../engine/types';
import { copy } from './copy';

/**
 * Berghain as data. The building is the former Heizkraftwerk Friedrichshain: two
 * near-identical blocks under one cornice, the Maschinenhaus (1953-55, now
 * Berghain) at the south-south-west end and the Kesselhaus (1952-53, now
 * Halle am Berghain) at the other. Footprint 76.5 x 37.9 m from
 * OpenStreetMap, rotated about 34 degrees east of north.
 *
 * Everything here is in the building's own frame: x runs along the long axis
 * from the Berghain end (x = -38.25, where the door is) to the Halle end, z
 * runs across it with +z on the east side (the substation) and -z on the west
 * side (the Kantine and the garden). y is up, in metres.
 */

export const CENTRE: Pt = [17.0, -18.6];
export const ROT = Math.atan2(0.8262, 0.5634);
export const L2 = 38.25;
export const W2 = 18.95;
export const H_MACHINE = 22.5;
export const H_KESSEL = 23.3;
export const T = 0.6; // wall thickness
export const IN_X = -L2 + T; // inner face of the SSW wall
export const IN_Z = W2 - T; // inner face of the long walls
export const CROSS = -24.5; // the wall between the front strip and the turbine hall
export const LADDER_TOP = 15;
export const DOOR_Z = -3.16; // the third bay from the west corner

export const BERGHAIN_ID = 25649554;
export const KANTINE_ID = 286165789;
export const BIERHOF_ID = 345217927;

/** The approach as mapped: a dirt path from Am Wriezener Bahnhof straight to the door. */
export const QUEUE_PATH: Pt[] = [
  [-L2 - 2.4, DOOR_Z],
  [-45.7, -3.3],
  [-99.5, -10.6],
  [-104.4, -17.1],
  [-106.1, -26.0],
];
export const FLOOD_POLES: Pt[] = [
  [-58, -0.8],
  [-84, -4.4],
];
/** Tall steel fence panels in front of the facade: x0, z0, x1, z1 of each run. */
export const FENCE_RUNS: [number, number, number, number][] = [
  // either side of the door, a few metres out
  [-L2 - 7, DOOR_Z + 4.2, -L2 - 7, W2 + 1],
  [-L2 - 7, W2 + 1, -L2, W2 + 1],
  [-L2 - 7, DOOR_Z - 4.2, -L2 - 7, -W2 - 1],
  [-L2 - 7, -W2 - 1, -L2, -W2 - 1],
  // and along part of the west side, by the garden
  [-L2, -W2 - 5, -14, -W2 - 5],
];
export const HALL_COLUMNS = [-19.125, -12.75, -6.375];
export const GROUND_COLUMN_Z = [-9.6, -3.2, 3.2, 9.6, 15.2];
export const GROUND_COLUMNS: Pt[] = HALL_COLUMNS.flatMap((x) => GROUND_COLUMN_Z.map((z) => [x, z] as Pt));
/** Heavy concrete benches under the main floor: x, z, turn. */
export const GROUND_BENCHES: [number, number, number][] = [
  [-22, -6, 0],
  [-15.9, 0, Math.PI / 2],
  [-9.5, -7, 0],
  [-3.2, 6.2, Math.PI / 2],
  [-16, 12.5, 0],
];
export const GROUND_WALLS: Rect[] = [
  [-23.4, 14.4, -18.4, 14.7],
  [-11.2, 11.6, -11.0, 17.5],
  [-8.6, 14.4, -2.5, 14.7],
  [-4.2, -13.8, -4.0, -8.8],
];
/** Dance podiums on the main floor: centres; each is 2.4 m square and 0.6 m high. */
export const PODIUMS: Pt[] = [
  [-16.5, -8],
  [-11.5, 8.5],
  [-21, 7],
  [-8, -9.5],
  [-13.5, 13],
];
export const SPEAKER_STACKS: Pt[] = [
  [-5.2, -12],
  [-5.2, 12],
  [-21.5, -12],
  [-21.5, 12],
];
/** Concrete pipe sections as seats in the bar. */
export const PIPE_SEATS: Pt[] = [
  [-27, -16],
  [-27, -6.5],
  [-27, -3.5],
  [-27, 4.5],
  [-30.5, 9],
  [-29, 12.2],
];
export const PANO_SEATS: Pt[] = [
  [-36.4, 6],
  [-36.4, 10],
  [-31, 12.6],
];
/** The beer garden, in world coordinates. */
export const GARDEN_BENCHES: [number, number, number][] = [];
for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) GARDEN_BENCHES.push([-16 + k * 4.2, -50 + i * 3.6, 0.6]);
export const BULB_POLES: Pt[] = [
  [-20, -53],
  [-2, -53],
  [-2, -35],
  [-20, -35],
];

const STAIR_SLOT: Rect = [CROSS + 0.25, -IN_Z, -16.75, -14.4];
const STAIR_2: Rect = [-35.5, 14.4, -26, IN_Z];

const dim = '#120c0a';
const low: ZoneSettings = { inside: true, music: 0.32, loudness: 0.7, exposure: 1.35, haze: 0.02, fog: dim, lightSets: ['low'] };

/* ------------------------------------------------------------ lights ---- */
const point = (set: string, colour: string, range: number, decay: number, at: [number, number, number], intensity: number, id?: string): LightSpec => ({ id, set, type: 'point', colour, range, decay, at, intensity });
const lights: LightSpec[] = [
  point('low', '#ffb26b', 13, 2, [-33, 3.4, -9], 20),
  point('low', '#ffcf9a', 12, 2, [-26.0, 3.6, 2], 16),
  point('low', '#ffcf9a', 12, 2, [-26.0, 3.6, 11], 16),
  point('low', '#ff9a5a', 12, 2, [-32, 3.6, 8], 7),
  point('low', '#d6dcff', 12, 2, [-20, 4.2, -16.5], 8),
  point('low', '#ffc98a', 16, 1.8, [-17, 2.4, -3], 16),
  point('low', '#ffc98a', 16, 1.8, [-8, 2.4, 8], 16),
  point('hall', '#ff2a1a', 26, 1.6, [-13, 12, 0], 60, 'hall-red'),
  point('hall', '#e8eeff', 30, 1.6, [-8, 13, 0], 0, 'hall-white'),
  point('hall', '#3a4dff', 20, 1.6, [-20, 10, 0], 20, 'hall-blue'),
  // a warm working light over the decks, so the hands and the records can be seen
  point('hall', '#ffc9a0', 5, 2, [-4.75, 7.5, 0], 5),
  point('hall', '#c8b8a8', 22, 1.8, [-12.75, 19.5, -15.5], 22),
  point('hall', '#c8b8a8', 22, 1.8, [-12.75, 19.5, 15.5], 22),
  point('hall', '#ff2a1a', 14, 2, [-1.4, 9, 0], 18),
  point('hall', '#ff8a3a', 12, 2, [-34, 7.5, -3], 12),
  point('hall', '#ff7f40', 12, 2, [-30, 7.5, 10], 10),
  point('pano', '#ff6a2a', 16, 1.8, [-31, 17.5, -8], 26, 'pano-a'),
  point('pano', '#ff3f8a', 16, 1.8, [-31, 17.5, 4], 18, 'pano-b'),
  point('pano', '#ffb35a', 10, 2, [-26, 15, -2], 10),
  // two moving spots over the floor
  { id: 'spot-0', set: 'hall', type: 'spot', colour: '#ffffff', range: 40, angle: 0.12, penumbra: 0.5, decay: 1.2, at: [-13, 13.2, -6], intensity: 900, shadow: true },
  { id: 'spot-1', set: 'hall', type: 'spot', colour: '#ffffff', range: 40, angle: 0.12, penumbra: 0.5, decay: 1.2, at: [-13, 13.2, 6], intensity: 900, shadow: true },
  // On the highest level a broad key light hangs under the roof and throws real shadows:
  // dancers on the floor, columns on the walls, the rig across the crowd.
  { id: 'hall-key', set: 'hall', type: 'spot', colour: '#ff5a3a', range: 34, angle: 1.02, penumbra: 0.7, decay: 1.1, at: [-12.5, 20.5, 0], target: [-12.5, 4.5, 0], intensity: 420, shadow: true, shadowLevelsOnly: true },
  // the lamp over the door, and the floodlights on poles over the forecourt
  { set: 'exterior', type: 'spot', colour: '#ffe6c2', range: 16, angle: 0.9, penumbra: 0.6, decay: 1.5, at: [-L2 - 0.5, 4.2, DOOR_Z], target: [-L2 - 3, 0, DOOR_Z], intensity: 70, outdoor: true },
  ...FLOOD_POLES.map(([x, z]): LightSpec => ({ set: 'exterior', type: 'spot', colour: '#dfe6ff', range: 60, angle: 0.75, penumbra: 0.8, decay: 1.4, at: [x, 6.8, z], target: [x + 6, 0, z - 4], intensity: 110, outdoor: true })),
  // the Kantine and the beer garden
  { set: 'exterior', type: 'point', colour: '#ffb36a', range: 18, decay: 2, at: [-24, 3.2, -40], intensity: 30, outdoor: true, frame: 'world' },
  { set: 'exterior', type: 'point', colour: '#ffc47a', range: 20, decay: 2, at: [-11, 3.5, -44], intensity: 26, outdoor: true, frame: 'world' },
];

/* --------------------------------------------------------- obstacles ---- */
const box = (label: string, rect: Rect, y0: number, y1: number): Obstacle => ({ label, rect, y0, y1 });
const centred = (label: string, [x, z]: Pt, hx: number, hz: number, y0: number, y1: number): Obstacle => box(label, [x - hx, z - hz, x + hx, z + hz], y0, y1);
const obstacles: Obstacle[] = [
  // the portal: its reveals and back wall stand inside the cloakroom, and the door leaves are swung in
  box('portal reveal', [IN_X, DOOR_Z - 2.05, -L2 + 2.1, DOOR_Z - 1.8], 0, 3.7),
  box('portal reveal', [IN_X, DOOR_Z + 1.8, -L2 + 2.1, DOOR_Z + 2.05], 0, 3.7),
  box('portal back wall', [-L2 + 1.8, DOOR_Z - 1.8, -L2 + 2.1, DOOR_Z - 1.5], 0, 3.7),
  box('portal back wall', [-L2 + 1.8, DOOR_Z + 1.5, -L2 + 2.1, DOOR_Z + 1.8], 0, 3.7),
  ...[-1, 1].map((s): Obstacle => ({ label: 'door leaf', y0: 0, y1: 3, width: 0.06, path: [[-L2 + 2.65 - 0.617, DOOR_Z + s * (1.25 - 0.205)], [-L2 + 2.65 + 0.617, DOOR_Z + s * (1.25 + 0.205)]] })),
  // cloakroom
  box('door desk', [-35.5, -12.7, -34.5, -9.1], 0, 1.1),
  box('cloakroom counter', [-29.5, -4.1, -28.5, 14.1], 0, 1.15),
  box('coat rails', [-27.75, -3.6, -26.05, 13.6], 0, 2.2),
  // under the main floor
  ...GROUND_COLUMNS.map((p) => centred('column', p, 0.55, 0.55, 0, 3.35)),
  ...GROUND_BENCHES.map(([x, z, a]) => (a ? centred('bench', [x, z], 0.32, 1.3, 0, 0.5) : centred('bench', [x, z], 1.3, 0.32, 0, 0.5))),
  ...GROUND_WALLS.map((r) => box('low wall', r, 0, 1.35)),
  // the bar behind the glass
  box('bar counter', [-34.0, -12.1, -33.0, 6.1], 4.5, 5.68),
  box('back bar', [-37.6, -12, -37.0, 6], 4.5, 7.2),
  ...PIPE_SEATS.map(([x, z]): Obstacle => ({ label: 'pipe seat', circle: [x, z, 0.72], y0: 4.5, y1: 5.45 })),
  // a mullion of the glass wall stands in the second opening
  { label: 'mullion', circle: [CROSS, 10.25, 0.07], y0: 4.5, y1: 11 },
  // the stairs: the wall and railing beside the first, the sheet sides and railings of the second
  { label: 'stair railing', path: [[CROSS + 0.25, -14.4], [-16.75, -14.4]], width: 0.06, y0: 4.5, y1: 5.6 },
  { label: 'stair side', path: [[-35.5, 14.45], [-26, 14.45]], width: 0.1, y0: 4.5, y1: 12.6 },
  { label: 'stair railing', path: [[-26, 14.4], [-26, IN_Z]], width: 0.06, y0: 11.5, y1: 12.6 },
  // main floor
  box('DJ booth', [-4.6, -3.1, -0.6, 3.1], 4.5, 6.8),
  ...HALL_COLUMNS.flatMap((x) => [box('column', [x - 0.6, IN_Z - 1.4, x + 0.6, IN_Z], 4.5, 21.6), box('column', [x - 0.6, -IN_Z, x + 0.6, -IN_Z + 1.4], 4.5, 21.6)]),
  ...SPEAKER_STACKS.map(([x, z]): Obstacle => ({ label: 'speaker stack', circle: [x, z, 0.9], y0: 4.5, y1: 9 })),
  // the gallery's balustrade and the platform's rail are edges already; the gallery's end sheet is not
  box('gallery end', [-2.25, -IN_Z + 1.45, -2.2, -IN_Z + 2.95], 11.5, 12.55),
  // Panorama Bar
  box('Panorama counter', [-27.4, -10.1, -26.4, 7.1], 11.5, 12.68),
  box('Panorama back bar', [-25.4, -10, -24.75, 7], 11.5, 14.4),
  box('Panorama booth', [-33.5, -IN_Z, -28.5, -15.6], 11.5, 13.2),
  ...[-35, -27].map((x) => box('speaker', [x - 0.6, -16.6, x + 0.6, -15.5], 11.5, 12.6)),
  ...PANO_SEATS.map((p) => centred('seat', p, 0.6, 1.6, 11.5, 11.95)),
  // outside: fence panels, the mesh fence along the path, the queue's barriers
  ...FENCE_RUNS.map(([x0, z0, x1, z1]): Obstacle => ({ label: 'fence panels', path: [[x0, z0], [x1, z1]], width: 0.08, y0: 0, y1: 3.1 })),
  { label: 'mesh fence', path: offsetPath(QUEUE_PATH.slice(1, 3), 3.8), width: 0.06, y0: 0, y1: 2.2 },
  ...[-0.6, -2.2].map((side): Obstacle => ({ label: 'crowd barriers', path: offsetPath(QUEUE_PATH.slice(0, 3), side), width: 0.06, y0: 0, y1: 1.2 })),
  ...FLOOD_POLES.map(([x, z]): Obstacle => ({ label: 'floodlight pole', circle: [x, z, 0.12], y0: 0, y1: 7 })),
  { label: 'sculpture', circle: [-L2 + 9.7, -W2 - 8.5, 2.9], y0: 0, y1: 5.5 },
  // the fire escape on the west side, the smokers' lounge on stilts on the east
  box('fire escape', [-21.4, -W2 - 3.7, -12.6, -W2 - 1.5], 0, 13.8),
  ...[W2 + 6, W2 + 12.5].flatMap((z) => [-33.7, -26.8].map((x) => centred('stilt', [x, z], 0.15, 0.15, 0, 11.2))),
  box('steel gates', [-38, W2 + 12.4, -22.5, W2 + 12.5], 0, 3.3),
  box('garden wall', [-20, -W2 - 16.15, 8, -W2 - 15.85], 0, 2.4),
  // the beer garden, in world coordinates
  ...GARDEN_BENCHES.map(([x, z]): Obstacle => ({ label: 'garden bench', frame: 'world', circle: [x, z, 0.9], y0: 0, y1: 0.8 })),
  ...BULB_POLES.map(([x, z]): Obstacle => ({ label: 'bulb pole', frame: 'world', circle: [x, z, 0.06], y0: 0, y1: 4.2 })),
];

/* -------------------------------------------------------------- times ---- */
const times: TimeState[] = [
  {
    id: 'night',
    label: 'Saturday 01:00',
    night: true,
    open: true,
    sun: { azimuth: 150, elevation: 32, colour: '#9fb0d8', intensity: 0.22, indoors: false },
    hemi: { sky: '#3a4258', ground: '#2a1d14', intensity: 0.32, indoors: 0.02 },
    sky: { top: '#04050a', mid: '#0f1019', horizon: '#4a2e22', sun: '#000000' },
    fog: { colour: '#16151a', density: 0.0024 },
    env: { outdoors: 0.12, indoors: 0.03 },
    skylineOpacity: 1,
    windows: 1,
    lamps: 6,
    bloom: 0.6,
    outdoorLights: 1,
  },
  {
    id: 'morning',
    label: 'Sunday 11:00',
    night: false,
    // Sunday morning: daylight, and the club still running
    open: true,
    sun: { azimuth: 160, elevation: 42, colour: '#fff1dc', intensity: 3.2, indoors: true },
    hemi: { sky: '#b9cde6', ground: '#6b6358', intensity: 1.1, indoors: 0.04 },
    sky: { top: '#4b78b8', mid: '#8db0d8', horizon: '#d9dfe2', sun: '#fff2d8' },
    fog: { colour: '#c3ccd4', density: 0.0006 },
    env: { outdoors: 0.9, indoors: 0.03 },
    skylineOpacity: 0.45,
    windows: 0,
    lamps: 0.2,
    bloom: 0.25,
    outdoorLights: 0.05,
  },
];

const QUEUE_TEXT = 'The dirt path from Am Wriezener Bahnhof, fenced and lined with trees, straight at the short end of the building. Crowd barriers and a long wait. No sign, no logo.';
const DOOR_TEXT = 'A deep portal in a ground floor sprayed from end to end, under a grid of narrow steel windows. Panorama Bar is behind the tall upper row, shutters down. Walk in with W.';
const ABOVE_TEXT = 'The former Heizkraftwerk Friedrichshain: the Maschinenhaus (Berghain) nearest, the Kesselhaus (Halle am Berghain) behind it. The Kantine and the beer garden sit to the west, the 110 kV substation to the east, old freight tracks to the south.';
const CLOAK_TEXT = 'Inside the door: the desk, then the long cloakroom counter. The steel stairs to the main floor are to the left.';
const STAIR_TEXT = 'A steel staircase climbs out of the cloakroom into the old turbine hall.';
const GROUND_TEXT = 'Rows of raw concrete columns carrying the turbine hall above: board marks, rain-dark streaks, ducts, enamel lamps and benches cast in concrete.';
const MAIN_TEXT = 'The former turbine hall: raw concrete, a crane runway along the walls, about 17 m to the roof. DJ booth at the far end, a stack of speakers at each corner. Walk into the ladder on the end wall to climb above it all.';
const PANO_TEXT = 'Upstairs in the old control room. The tall windows have roller shutters; on a Sunday morning they go up. Press L.';

export const plan: VenuePlan = {
  id: 'berghain',
  frame: { centre: CENTRE, rotation: ROT },

  rooms: [
    {
      id: 'stair',
      name: 'Stairs',
      level: 0,
      height: 5.7,
      areas: [STAIR_SLOT],
      floor: false,
      zone: { inside: true, music: 0.5, loudness: 0.85, exposure: 1.4, haze: 0.02, fog: dim, lightSets: ['low', 'hall'] },
      caption: { title: 'The stairs up', text: STAIR_TEXT },
    },
    {
      id: 'cloak',
      name: 'Cloakroom',
      level: 0,
      height: 4.5,
      areas: [[IN_X, -IN_Z, CROSS - 0.25, IN_Z]],
      zone: low,
      caption: { title: 'Cloakroom', text: CLOAK_TEXT },
    },
    {
      id: 'ground',
      name: 'Ground floor',
      level: 0,
      height: 4.5,
      areas: [[CROSS + 0.25, -14.4, -0.6, IN_Z]],
      zone: { ...low, music: 0.4, loudness: 0.8, exposure: 1.45 },
      caption: { title: 'Under the main floor', text: GROUND_TEXT },
    },
    {
      id: 'bar',
      name: 'Bar',
      level: 4.5,
      height: 7,
      areas: [
        [IN_X, -IN_Z, CROSS - 0.25, 14.4],
        [-26, 14.4, CROSS - 0.25, IN_Z],
      ],
      also: [{ area: STAIR_2, y0: 4.5, y1: 11.5 }],
      zone: { inside: true, music: 0.62, loudness: 0.85, exposure: 1.5, haze: 0.02, fog: dim, lightSets: ['hall'] },
      caption: { title: 'The bar behind the glass', text: 'On the level of the main floor, behind a wall of steel and glass: a long counter, and sections of concrete pipe for seats. The steel stairs at the east end go up to Panorama Bar.' },
    },
    {
      id: 'main',
      name: 'Main floor',
      level: 4.5,
      height: 17.1,
      areas: [
        [CROSS + 0.25, -14.4, -0.6, IN_Z],
        [-16.75, -IN_Z, -0.6, -14.4],
      ],
      also: [{ area: STAIR_SLOT, y0: 5.7, y1: 21.6 }],
      zone: { inside: true, music: 1, loudness: 1, exposure: 1.55, haze: 0.028, fog: '#0b0a0c', lightSets: ['hall'] },
      caption: { title: 'Berghain main floor', text: MAIN_TEXT },
    },
    {
      id: 'panorama',
      name: 'Panorama Bar',
      level: 11.5,
      height: 7.9,
      areas: [
        [IN_X, -IN_Z, CROSS - 0.25, 14.4],
        [IN_X, 14.4, -35.5, IN_Z],
      ],
      also: [{ area: STAIR_2, y0: 11.5, y1: 19.4 }],
      zone: { inside: true, music: 0.72, loudness: 0.9, exposure: 1.45, haze: { default: 0.03, morning: 0.012 }, fog: dim, showCity: true, lightSets: ['pano'] },
      caption: { title: 'Panorama Bar', text: PANO_TEXT },
    },
  ],

  links: [
    // the portal, through the facade and into the cloakroom
    { id: 'door', from: 'outside', to: 'cloak', area: [-L2 - 0.5, DOOR_Z - 1.8, IN_X + 0.4, DOOR_Z + 1.8], level: 0, height: 3.1 },
    // an opening in the cross wall, behind the coat rails, to the ground floor under the hall
    { id: 'cloak-ground', from: 'cloak', to: 'ground', area: [CROSS - 0.25, 1.5, CROSS + 0.25, 4.5], level: 0, height: 3 },
    // two openings in the steel and glass between the bar and the main floor
    { id: 'bar-main-west', from: 'bar', to: 'main', area: [CROSS - 0.25, -11.7, CROSS + 0.25, -9.8], level: 4.5, height: 3.1 },
    { id: 'bar-main-east', from: 'bar', to: 'main', area: [CROSS - 0.25, 9.8, CROSS + 0.25, 11.7], level: 4.5, height: 3.1 },
    // out of Panorama Bar onto the gallery along the west wall of the hall
    { id: 'panorama-gallery', from: 'panorama', to: 'main', area: [CROSS - 0.25, -IN_Z + 1.5, CROSS + 0.25, -IN_Z + 2.9], level: 11.5, height: 2.5 },
  ],

  stairs: [
    // the big steel staircase from the cloakroom up to the main floor, through the cross wall
    { id: 'stair-main', from: 'cloak', to: 'main', area: [CROSS - 0.25, -IN_Z, -16.75, -14.6], line: [[CROSS + 0.25, -16.5], [-16.75, -16.5]], y: [0, 4.5] },
    // and the one from the bar up to Panorama Bar
    { id: 'stair-panorama', from: 'bar', to: 'panorama', area: STAIR_2, line: [[-26, 16.4], [-35.5, 16.4]], y: [4.5, 11.5] },
  ],

  platforms: [
    // the platform at the top of the service ladder, above the booth
    { id: 'ladder-platform', room: 'main', area: [-2.6, 1.6, -0.6, 5.4], level: LADDER_TOP },
    // the gallery along the west wall of the hall, at Panorama Bar level
    { id: 'gallery', room: 'main', area: [CROSS + 0.25, -IN_Z + 1.45, -2.2, -IN_Z + 2.95], level: 11.5 },
    ...PODIUMS.map(([x, z], i) => ({ id: `podium-${i}`, room: 'main', area: [x - 1.2, z - 1.2, x + 1.2, z + 1.2] as Rect, level: 5.1 })),
  ],

  ladders: [{ id: 'service-ladder', at: [-1.25, 3.45], reach: [-1.95, 2.95, -0.85, 3.95], bottom: 4.5, top: LADDER_TOP, toward: [1, 0] }],

  obstacles,

  shells: [
    { id: 'maschinenhaus', outline: [[-L2, -W2], [0, -W2], [0, W2], [-L2, W2]], height: H_MACHINE },
    { id: 'kesselhaus', outline: [[0, -W2], [L2, -W2], [L2, W2], [0, W2]], height: H_KESSEL },
  ],

  lights,

  crowds: [
    {
      id: 'queue',
      kind: 'queue',
      path: QUEUE_PATH.slice(0, 3),
      offset: -1.4,
      spacing: 0.72,
      start: 4.5,
      y: 0.075,
      seed: 17,
      // the door: two at the door, one at the gate in the barriers
      staff: [
        { x: -L2 - 1.0, y: 0.085, z: DOOR_Z - 2.3, facing: -Math.PI / 2 + 0.5, behaviour: 'bouncer' },
        { x: -L2 - 0.8, y: 0.085, z: DOOR_Z + 2.4, facing: -Math.PI / 2 - 0.4, behaviour: 'bouncer' },
        { x: -L2 - 4.2, y: 0.085, z: DOOR_Z + 2.2, facing: -Math.PI / 2, behaviour: 'bouncer' },
      ],
      look: 4,
    },
    { id: 'garden', kind: 'scatter', frame: 'world', count: 26, rect: [-20, -54, -2, -34], y: 0, behaviour: 'talk', seed: 9, gap: 0.9 },
    { id: 'main', kind: 'scatter', count: [120, 260, 380], rect: [-23.5, -13.8, -5.8, 16.2], y: 4.52, behaviour: 'dance', seed: 21, faceTo: [-3, 0], gap: 0.62, look: 2 },
    { id: 'main-arms', kind: 'scatter', count: [20, 45, 60], rect: [-15, -9, -6, 9], y: 4.52, behaviour: 'dance', seed: 33, faceTo: [-3, 0], gap: 0.7, armsUp: true, look: 6 },
    { id: 'panorama-dj', kind: 'people', people: [{ x: -30.5, y: 12.1, z: -17, facing: 0, behaviour: 'dj' }], look: 12 },
    { id: 'panorama', kind: 'scatter', count: [40, 90, 120], rect: [-36.6, -14.5, -28, 6], y: 11.52, behaviour: 'dance', seed: 44, faceTo: [-31, -17], gap: 0.6, look: 7 },
    { id: 'panorama-bar', kind: 'scatter', count: 16, rect: [-32.6, -11, -27.8, 6], y: 11.52, behaviour: 'talk', seed: 46, facing: Math.PI / 2, gap: 0.7, look: 8 },
    { id: 'bar', kind: 'scatter', count: 22, rect: [-33, -15, -25.5, 12], y: 4.52, behaviour: 'talk', seed: 51, gap: 0.8, look: 9 },
    { id: 'cloakroom', kind: 'scatter', count: 5, rect: [-36.5, -14, -30, 0], y: 0.04, behaviour: 'stand', seed: 61, gap: 0.9, look: 10 },
    {
      id: 'staff',
      kind: 'people',
      people: [
        { x: -27.0, y: 0.04, z: 4, facing: -Math.PI / 2, behaviour: 'talk' },
        { x: -27.4, y: 0.04, z: 9.5, facing: -Math.PI / 2, behaviour: 'talk' },
        { x: -35.8, y: 0.04, z: -11, facing: -Math.PI / 2, behaviour: 'talk' },
      ],
      look: 13,
    },
  ],

  viewpoints: [
    { id: 'aerial', label: 'Above', title: 'Am Wriezener Bahnhof, from above', text: ABOVE_TEXT, position: [-150, 95, -120], target: [0, 8, 0] },
    { id: 'queue', label: 'The queue', title: 'The queue', text: QUEUE_TEXT, position: [-70, 1.7, -8.2], target: [-L2, 8, DOOR_Z + 1] },
    { id: 'door', label: 'The door', title: 'The door', text: DOOR_TEXT, position: [-50, 1.7, -5.8], target: [-L2, 3.5, DOOR_Z] },
    {
      id: 'garden',
      label: 'Kantine',
      title: 'Kantine am Berghain and the beer garden',
      text: 'The one-storey Kantine and the two-storey Bierhof, a former heat-transfer station, on the west side of the plot.',
      position: [-3, 2.2, -28],
      target: [-30, 2.5, -42],
      frame: 'world',
    },
    { id: 'cloak', label: 'Cloakroom', title: 'Cloakroom', text: CLOAK_TEXT, position: [-35, 1.7, DOOR_Z + 0.6], target: [-27, 1.6, 6] },
    { id: 'stairs', label: 'Stairs', title: 'The stairs up', text: STAIR_TEXT, position: [-25.6, 1.7, -16.4], target: [-12, 9, -15] },
    { id: 'ground', label: 'Ground floor', title: 'Under the main floor', text: GROUND_TEXT, position: [-23, 1.7, 3], target: [-6, 1.9, 5.5] },
    { id: 'main', label: 'Main floor', title: 'Berghain main floor', text: MAIN_TEXT, position: [-21.5, 6.4, 6], target: [-3, 7.5, 0] },
    { id: 'panorama', label: 'Panorama Bar', title: 'Panorama Bar', text: PANO_TEXT, position: [-26.5, 13.4, 10], target: [-36.5, 14.6, -6] },
  ],
  startView: 'queue',

  times,

  outdoors: {
    door: [-L2, DOOR_Z],
    audible: 140,
    street: { name: 'Outside', music: 0.02, speed: 6, lightSets: ['exterior'], caption: { title: 'Am Wriezener Bahnhof', text: QUEUE_TEXT } },
    doorstep: { name: 'The door', radius: 6, musicRadius: 4, music: 0.12, speed: 6, lightSets: ['exterior', 'low'], caption: { title: 'The door', text: DOOR_TEXT } },
    aerial: { name: 'Above', above: 30, speed: 30, lightSets: ['exterior'], caption: { title: 'Am Wriezener Bahnhof, from above', text: ABOVE_TEXT } },
    shadowFocus: [-10, 0, 0],
    shadowReach: 150,
  },

  show: {
    bpm: 134,
    // at 134 BPM one flash a beat is 2.2 flashes a second
    strobe: { everyBars: 8, beats: 2, flashesPerBeat: 1, duty: 0.25 },
  },

  copy,
};
