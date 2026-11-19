import type { Dress, Person } from '../../engine/people';
import type { Area, ByLevel, Caption, CrowdSpec, LightSpec, Link, Obstacle, Platform, Pt, Rect, Room, Shell, Stair, TimeState, TrackId, Vec3, VenuePlan, ZoneSettings } from '../../engine/types';
import { copy } from './copy';

/**
 * Ministry of Sound, 103 Gaunt Street, London SE1, as it stood in 2026: a block model.
 *
 * Everything is laid out on the site grid of the research document (section 1.4):
 *   origin  the centre of the main street gate, at pavement level
 *   right   plan-east, true bearing about 156 degrees: to your right as you face the building
 *   in      plan-north, true bearing about 66 degrees: away from the street, into the site
 * The venue frame is that grid with x = right and z = -in.
 *
 * The courtyard, the lobby and the entrance tunnel stand on a second grid turned 15 degrees
 * anticlockwise from the first, with its origin at the courtyard's left street corner:
 * `K(a, b)` is a metres along the street boundary and b metres in from it.
 *
 * Plan positions are the research's, scaled from the venue's 2026 plans to about half a metre
 * on the ground floor and a metre upstairs. Where two of its figures disagreed by less than
 * that, rooms were nudged so that walls have a thickness and doors line up.
 */

/** Where the origin is, and which way `right` points. From the research's overlay of the plan on the map: about 3 m and 3 degrees. */
export const GEO = { lat: 51.497696, lon: -0.099825, bearing: 156 };

/** Heights printed on the venue's plans. */
export const MEASURED = {
  /** The 103, floor to the underside of the truss. */
  hall103Truss: 5.03,
  boxCeiling: 4.8,
  loungeCeiling: 3.05,
  loftCeiling: 4.77,
  /** The Loft's ceiling drops to this over the alcove on its north side. */
  loftAlcove: 2.06,
  /** The opening from the walkway into The Loft. */
  loftDoor: 2.16,
  /** Clear height under the walkway. */
  underWalkway: 2.39,
  greenRoomCeiling: 1.92,
  tunnel: { length: 18.09, width: 4.61 },
};

/** Licensed capacities, as published. */
export const CAPACITY = { courtyard: 400, the103: 550, box: 565, babybox: 120, loft: 200, lounge: 140, loungeSeated: 65 };

/**
 * Values the research marks as guessed, or as read off photographs. None is measured.
 * They are gathered here so that each can be changed in one place.
 */
export const GUESS = {
  /** Floor of the walkway, The Lounge and The Loft above the ground floor. */
  upperLevel: 2.65,
  doorHeight: 2.1,
  doubleDoor: 1.8,
  lobbyCeiling: 2.7,
  tunnelCeiling: 2.7,
  boxTunnelCeiling: 2.4,
  backRoomCeiling: 2.4,
  toiletCeiling: 2.4,
  babyLobbyCeiling: 2.4,
  /** The 103, floor to the underside of the roof, above the measured truss. */
  hall103Roof: 7,
  vipBalconyCeiling: 2.3,
  backStairCeiling: 1.9,
  /** Railway arches: where the vault springs from the wall, and its crown. */
  archSpringing: 2.5,
  archCrown: 4.8,
  counterHeight: 1.05,
  balconyRail: 1.1,
  /** The Lounge's windows into The Box, above the Lounge floor. */
  windowSill: 0.85,
  windowHead: 1.95,
  /** The Box. */
  vipDeck: 0.9,
  boothFront: 1.1,
  speakerBlock: 2,
  /**
   * The lattice over the floor: two wings of square-grid metal that meet along a spine and tilt
   * up toward the side walls. Its width and centre are the research's; the heights and the size
   * of a cell are read off photographs.
   */
  lattice: { centre: [-24, 41] as [number, number], span: 9, spine: 3.2, edge: 4.2, cell: 0.75, diamond: 1.5 },
  /**
   * Loudspeakers. The plan marks ten points; six are the flown mains, and which six was not
   * found. These are the six furthest out, with the four nearest the west wall taken as fills.
   */
  boxMains: [[-25.6, 47.6], [-18, 46.3], [-17.2, 35.9], [-23.5, 33.2], [-31, 30.9], [-33.1, 47.1]] as [number, number][],
  boxFills: [[-34.9, 40.4], [-34.6, 36.4], [-21, 47.7], [-28.5, 31.6]] as [number, number][],
  /** The Box floor is drawn as black timber strips this wide. What replaced the sprung floor lifted in 2026 was not found. */
  boxFloorStrip: 0.1,
  /** The steps from the deck behind the booth up to the gantry: at the gantry's south end, rising north, 0.9 m wide. */
  gantrySteps: { foot: [-34.72, 42.8] as [number, number], top: [-34.72, 45] as [number, number], width: 0.9 },
  /**
   * The Lounge's seating: three tiers of 0.3 m, rising toward the landing on the north side.
   * The research gives the tiers and their rise; which way they climb, and their extent, are guesses.
   */
  loungeTiers: { right: [-14.9, -9.4] as [number, number], from: 43.6, to: 48.05, count: 3, rise: 0.3, aisle: 0.9 },
  /** The Lounge's one round column. Its position was not found. */
  loungeColumn: [-13.6, 42.2] as [number, number],
  /** The Loft's alcove: its ceiling height is measured, its width and depth are not. */
  loftAlcove: { right: [18.1, 21.9] as [number, number], depth: 1.8 },
  /** The Loft: the width of the aisle between the bar and the angled wall behind it. */
  loftBarAisle: 0.85,
  /** The Box by day: how bright the house lights are. No photograph shows the room with them on. */
  houseLight: 85,
  /** The 103: a small perforated counter against the east wall, under the walkway landing. Seen in photographs, placed by eye. */
  smallCounter: [10.6, 43, 11.15, 46.6] as [number, number, number, number],
  /** Arch80: the toilets, shower and prep rooms fill the near 7.5 m as two blocks either side of a passage. */
  arch80Rooms: { to: 58.5, passage: [-36.2, -33.6] as [number, number], height: 2.4 },
  /**
   * Furniture the research names without placing: each rectangle is right, in, right, in on the site grid.
   * The research gives the women's toilets two rows of cubicles along the side walls, Arch80 sofas,
   * a pool table and a timber worktop with stools, the green room a sofa and The Loft sofas.
   */
  fittings: {
    cubicles: [
      [-20.5, 53, -19.1, 66],
      [-14.6, 53, -13.2, 66],
    ] as [number, number, number, number][],
    arch80: {
      sofas: [
        [-39, 59.4, -38.15, 62],
        [-38.6, 65.3, -36, 66.2],
      ] as [number, number, number, number][],
      pool: [-36.3, 60.6, -34, 61.9] as [number, number, number, number],
      worktop: [-31.9, 59.4, -31.35, 63.6] as [number, number, number, number],
    },
    flightCases: [
      [[-11.6, 55, -10.5, 57.4], 1],
      [[-11.6, 58, -10.7, 59], 1.4],
      [[-11.5, 63.5, -9.9, 64.6], 0.7],
    ] as [[number, number, number, number], number][],
    techRacks: [-16.35, 39, -15.7, 44.5] as [number, number, number, number],
    greenRoomSofa: [-38.9, 46, -38.1, 48.4] as [number, number, number, number],
    loftSofas: [
      [15.05, 44, 15.85, 46.6],
      [15.3, 48.3, 17.8, 49.05],
    ] as [number, number, number, number][],
    /** The Baby Box's truss frame stands on four legs. */
    babyTruss: [
      [15.6, 50],
      [21.8, 50],
      [15.6, 54.1],
      [21.8, 54.1],
    ] as [number, number][],
  },
  /** Outside. */
  boundaryHeight: 2.4,
  overhangSoffit: 4.2,
  fasciaTop: 5.2,
  canopyBeams: 4.5,
  hedgeHeight: 2,
  /** The taller volume behind the single-storey front. */
  rearBlockHeight: 9,
  /** The blank brick flank of the neighbour on the left (map way 380605741): at least 20 m in a 2019 photograph. */
  leftFlankHeight: 22,
  /** The viaduct: track level, and how wide a mass to put under each of its four tracks. */
  viaductLevel: 7,
  viaductPerTrack: 7.5,
  /** Metres between street trees. The map has no trees; these streets have few, and every one costs triangles. */
  streetTreeSpacing: 45,
  /**
   * The arches drawn on the open faces of the viaduct: as wide as The Baby Box (measured), at the
   * spacing of the club's own four arches, the first centred on The Baby Box. How far the row runs is a guess.
   */
  viaductArches: { width: 7.6, pitch: 9, first: 18.7, reach: 140 },
  /** Which of the two Box tunnels has the bend with the warning sign. Not found. */
  signTunnel: 'tunnel1' as 'tunnel1' | 'tunnel2',
  /** The crest: sizes are estimates from photographs. */
  crest: {
    /** On the roller shutter: width, and height of its centre above the paving. */
    shutter: { width: 2.35, centre: 2 },
    /** Projected on the left flank at night. */
    projection: { width: 4.5, centre: 16.5, along: 6.6 },
    /** At the foot of the sound-level warning sign. */
    sign: { width: 0.1 },
  },
  /** The roller shutter in the building front: size, and how far along the front its centre is. */
  shutter: { width: 8, height: 4, along: 16.8 },
  /** The queue: which side, how long, where the staff stand. */
  queue: { generalLength: 34, guestLength: 12, fromBoundary: 1, barrier: 1.85 },
  /**
   * The two round queue signs (research 8.6): black discs with a yellow ring, on posts at the
   * main gate. Positions on the courtyard grid, from the research's own estimate; sizes from photographs.
   */
  queueSigns: { guest: [0.46, -0.23] as [number, number], tickets: [2.52, -0.26] as [number, number], centre: 2.2, disc: 0.6, crest: 0.15 },
  /** The banner on a temporary fence panel beside the gate: panel and crest sizes from photographs, position a guess. */
  banner: { along: [6.9, 9.1] as [number, number], out: 0.22, height: 2, crest: 0.9 },
  /** The orange "please respect our neighbours" boards on lamp posts. Number and positions were not found. */
  neighbourSigns: [[-9.5, -1.1], [24.5, -2.4]] as [number, number][],
  /** Four black bollards at the kerb in front of the gate (a 2012 photograph); spacing guessed. */
  bollards: { along: [0.9, 2.4, 4.8, 6.3], out: 1.72, height: 1 },
  /** The gates stand open (the research has that); how long each leaf is, and that they swing inward, are guesses. */
  gateLeaf: { main: 2.9, second: 2.6 },
  /** The truss portals of the entrance lane, with their blue tubes: where the legs stand, on the courtyard grid. */
  trussLane: { legs: [0.9, 4.2] as [number, number], at: [2.6, 5.4, 8.2], height: 3.1 },
  /** The pavement is drawn at least this wide along the frontage, so that the barriers stand on it. */
  pavement: 2.15,
  /** The guest-list host's table. */
  hostTable: [-1.2, -0.85, -0.3, -0.35] as [number, number, number, number],
  /** Walk-through search arches under the overhang. They exist; where was not found. */
  searchArches: { centres: [2.6, 3.85], at: 10.2, clear: 1 },
  /** The red wall with wall lights and a bench "beside the entrance lane": taken to be the left wall under the overhang. */
  redWall: { bench: [0.05, 9.3, 0.5, 11.7] as [number, number, number, number] },
  /** Planters along the courtyard's left wall. */
  planters: { from: 1.1, to: 8.3, depth: 0.5, height: 0.55 },
  /** The LED screen on the hedge, facing the building. */
  hedgeScreen: { along: [5.1, 9.7] as [number, number], foot: 0.45, top: 1.85 },
  /**
   * How full the rooms are at night on the three detail levels, as a share of each room's
   * licensed capacity. The research suggests these tiers; a floor takes no more than fit on it.
   */
  crowd: [0.25, 0.5, 0.75] as [number, number, number],
  /** How much of the echo is heard in each place: The Box was built dry, the brick arches and the tunnel ring. */
  echo: { box: 0.12, the103: 0.45, babybox: 0.6, loft: 0.35, lounge: 0.2, boxTunnel: 0.55, tunnel: 0.7, lobby: 0.5, toilets: 0.65, backOfHouse: 0.4 },
  /** Haze at night, as fog density. The Box is the only room the research describes as thick with it. */
  haze: { box: 0.044, the103: 0.016, babybox: 0.022, loft: 0.016, lounge: 0.007, boxTunnel: 0.02, tunnel: 0.008, other: 0.006 },
  /**
   * How loud each place is against The Box. Two published levels (The Box about 115 dBA,
   * The 103 at 106 dB) fix the first two; the rest are guesses.
   */
  loudness: { box: 1, the103: 0.4, babybox: 0.6, loft: 0.45, lounge: 0.2, boxTunnel: 0.5, tunnel: 0.2, lobby: 0.15, courtyard: 0.1, street: 0.03, toilets: 0.25, backOfHouse: 0.2 },
  /**
   * How much of the sound gets through to the places that only overhear a room: 0 is the low
   * end alone, 1 is the dance floor. The Lounge hears The Box through its floor and its
   * insulated windows; the entrance tunnel hears The 103 through the doors at its far end.
   */
  through: { lounge: 0.25, tunnel: 0.3, lobby: 0.12 },
  /** The building's tempo. The Baby Box does not keep to it: drum and bass runs at 160. */
  bpm: 126,
};

/**
 * What people wear. The venue asks for "dressed for a good night out" and turns away
 * tracksuits, sportswear and caps. The 2019 photographs show jeans, T-shirts, short-sleeved
 * shirts and dresses in black, white and denim blue, and few coats inside; how often each
 * colour is worn here is a guess. Staff are in black.
 */
const TOPS: [string, number][] = [
  ['#0d0d0f', 5],
  ['#e8e6e0', 2.4],
  ['#5f5f66', 0.8],
  ['#2a3a5c', 1],
  ['#7a1a22', 0.6],
  ['#c9b28a', 0.5],
  ['#3d5a3a', 0.4],
  ['#d6a3b0', 0.4],
  ['#b9b3d6', 0.3],
];
const LEGS: [string, number][] = [
  ['#0c0c0e', 4],
  ['#27344d', 3],
  ['#51607a', 1.2],
  ['#3a3a3e', 1],
  ['#b9ab94', 0.5],
];
export const DRESS = {
  /** Inside: jackets are in the cloakroom. */
  inside: { tops: TOPS, legs: LEGS, bareArms: 0.4, skirts: 0.22, shaved: 0.06 } as Dress,
  /** In the queue and the courtyard: coats on. */
  outside: { tops: [['#0d0d0f', 6], ['#2a2c33', 2], ['#3b3f36', 1], ['#5a4634', 0.8], ['#e8e6e0', 0.6], ['#7a1a22', 0.3]], legs: LEGS, bareArms: 0.04, skirts: 0.18, shaved: 0.06 } as Dress,
  /** Staff: black. */
  staff: { tops: [['#0c0c0d', 1]], legs: [['#0a0a0b', 1]], bareArms: 0.15, skirts: 0, shaved: 0.15 } as Dress,
};

const U = GUESS.upperLevel;
const EYE = 1.7;

/* ----------------------------------------------------------- the two grids ---- */
export const P = (right: number, inn: number): Pt => [right, -inn];
const R = (r0: number, i0: number, r1: number, i1: number): Rect => [Math.min(r0, r1), -Math.max(i0, i1), Math.max(r0, r1), -Math.min(i0, i1)];
const poly = (...p: [number, number][]): Pt[] => p.map(([r, i]) => P(r, i));
const V = (right: number, inn: number, h: number): Vec3 => [right, h, -inn];

export const YARD = { origin: [-3.5, -1.4] as [number, number], turn: 15 };
const kc = Math.cos((YARD.turn * Math.PI) / 180);
const ks = Math.sin((YARD.turn * Math.PI) / 180);
/** The courtyard grid: a along the street boundary from its left corner, b in from the street. */
export const K = (a: number, b: number): Pt => P(YARD.origin[0] + a * kc - b * ks, YARD.origin[1] + a * ks + b * kc);
const KR = (a0: number, b0: number, a1: number, b1: number): Pt[] => [K(a0, b0), K(a1, b0), K(a1, b1), K(a0, b1)];
const KV = (a: number, b: number, h: number): Vec3 => {
  const [x, z] = K(a, b);
  return [x, h, z];
};

/** The courtyard, on its own grid: 22.7 m along the street, 14.3 m deep. The gates are in its street side. */
export const COURT = { width: 22.7, depth: 14.3, mainGate: [0.67, 6.57] as [number, number], secondGate: [15, 20.4] as [number, number] };
/** The overhang covers the back of the courtyard: 5.7 m deep, from a plan. */
export const OVERHANG = { depth: 5.7 };
const FRONT = COURT.depth;
/** The entrance tunnel on the courtyard grid. */
export const TUNNEL = { a0: 0.9, a1: 0.9 + MEASURED.tunnel.width, b0: 18.3, b1: 18.3 + MEASURED.tunnel.length };

/* ----------------------------------------------------------------- zones ---- */
const dark = '#0c0a0c';
const L = GUESS.loudness;
/** `music` is how much of the sound gets through: 0 is the low end only, 1 is the dance floor. */
const indoors = (music: number, loudness: number, more: Partial<ZoneSettings> = {}): ZoneSettings => ({ inside: true, music, loudness, exposure: 1.25, haze: { default: 0.012, day: 0.002 }, fog: dark, lightSets: [], ...more });

/* --------------------------------------------------------------- captions ---- */
const TEXT = {
  street:
    'A short back street behind Elephant and Castle. Black gates open into the courtyard, guest list to the left. At night the crest is projected high on the brick wall next door.',
  courtyard:
    'Queue, search and smoking area in one: about 23 by 14 metres, open to the sky under a retractable canopy, with its own bar. The way in is the black double door in the far left corner.',
  tunnel:
    'Eighteen metres of straight corridor between the courtyard and the club. Box office first, cloakroom second, both on the right. Visitors describe a long dark tunnel with bass coming through the walls.',
  the103:
    'Named after the street number. Every room opens off this bar: a 16-metre counter under a wall-to-wall screen, a curved steel walkway overhead and 124 winches that raise and lower the lights.',
  // The quotation is from Daniel Sokolovskiy's account of a night at the club in 2019 (dsokolovskiy.com).
  sign: 'The last thing to read before The Box. Its first system, in 1991, was six stacks designed by Austen Derek on the model of Richard Long’s at the Paradise Garage in New York. Martin Audio replaced them from 2008, Dolby Atmos was added in 2016 and KV2 Audio took over in January 2026. Daniel Sokolovskiy, a visitor in 2019: “the Ministry Of Sound has the best sound system I’ve ever heard and felt.”',
  box: 'A room within a room, built in 1991 to hold the sound in. Five walls, none parallel, no bar and no seats. Since January 2026 the DJ booth stands in the crowd under a lattice of light and video.',
  booth:
    'From the raised deck behind the DJ. Six loudspeakers hang around the floor, the six-point layout the room has kept since 1991. The original sprung timber floor was lifted for the first time in 2026.',
  babybox:
    'A railway arch under the Thameslink viaduct, less than eight metres square, with stock-brick walls and a black vault. The DJ stands at floor level at the far end, facing a room that holds 120.',
  lounge:
    'The VIP room sits above the passages to The Box. Sound-insulated windows look down onto the dance floor on one side; a balcony overlooks The 103 on the other. Rebuilt in 2025 with its own back entrance.',
  loft: 'At the far end of the walkway: a small bar room with a 4.8-metre ceiling, a counter set on the diagonal and a red neon sign that reads THE HOME OF DANCE MUSIC SINCE 1991.',
};
const caption = (title: string, text: string): Caption => ({ title, text });

/* ------------------------------------------------------------------ rooms ---- */
// Finishes are the research's nominal colours, except that its blacks are lifted to dark greys so that a block model can be read.
const BLACK = { floor: '#2b2b2e', walls: '#3a3a3e', ceiling: '#252528' };
const BRICK = '#8d7b64';

const rooms: Room[] = [
  /* upper level first: where a room upstairs hangs inside a taller one, it wins */
  {
    id: 'lounge',
    name: 'The Lounge',
    level: U,
    height: MEASURED.loungeCeiling,
    areas: [poly([-16.65, 37.6], [-5.1, 40.7], [-5.1, 41.9], [-8, 48.05], [-16.65, 48.05])],
    zone: indoors(GUESS.through.lounge, L.lounge),
    caption: caption('The Lounge, upstairs', TEXT.lounge),
    openings: [
      // the balcony over The 103
      { line: [P(-5.1, 41.9), P(-8, 48.05)], sill: GUESS.balconyRail, bare: true },
      // the windows down into The Box
      { line: [P(-16.65, 38.6), P(-16.65, 45)], sill: GUESS.windowSill, head: GUESS.windowHead },
    ],
    colours: { floor: '#34302e', walls: '#8b8985', ceiling: '#2a2a2c' },
  },
  {
    id: 'vipbalcony',
    name: 'VIP balcony',
    level: U,
    height: GUESS.vipBalconyCeiling,
    areas: [R(-35.3, 48.25, -15.2, 50.7)],
    zone: indoors(0.8, 0.7),
    caption: caption('The VIP balcony', 'A mezzanine along the north side of The Box, part of the 2025 rebuild of the VIP rooms. In 2003 a glass Green Room looked over the dance floor; in 2014 two new balconies were added over The 103 and The Box.'),
    openings: [{ line: [P(-35.3, 48.25), P(-19.5, 48.25)], sill: GUESS.balconyRail, bare: true }],
    colours: BLACK,
  },
  {
    id: 'greenroom',
    name: 'Green room',
    level: U,
    height: MEASURED.greenRoomCeiling,
    areas: [R(-39, 45.7, -35.7, 50.7)],
    zone: indoors(0.4, L.backOfHouse),
    caption: caption('The green room', "The artists' room off the west end of the balcony, with a ceiling under two metres. Larry Levan came to play for a few days in 1991 and stayed about three months."),
    colours: { floor: '#34302e', walls: '#6f6a66', ceiling: '#2a2a2c' },
  },
  {
    id: 'backstair',
    name: 'Back stair',
    level: U,
    height: GUESS.backStairCeiling,
    areas: [R(-8.7, 48.4, -7, 58.8)],
    zone: indoors(0.2, L.backOfHouse),
    caption: caption('The back stair', 'A narrow corridor from the VIP landing to a stair down into the load-in arch. Since July 2025 VIP guests have had a back-alley entrance; that this is the way it comes in is a reading of the plans, not a published fact.'),
    colours: BLACK,
  },
  {
    id: 'loft',
    name: 'The Loft',
    level: U,
    height: MEASURED.loftCeiling,
    areas: [poly([15, 38.7], [21.5, 38.7], [27.7, 44.5], [27.7, 49.1], [15, 49.1])],
    zone: indoors(0.8, L.loft),
    caption: caption('The Loft', TEXT.loft),
    colours: { floor: '#3a2a20', walls: '#3a3a3e', ceiling: '#252528' },
  },

  /* the way in */
  {
    id: 'courtyard',
    name: 'The Courtyard',
    level: 0,
    height: 4,
    areas: [KR(0, 0, COURT.width, COURT.depth)],
    open: true,
    sky: true,
    wallHeight: 0,
    zone: { inside: false, music: 0.05, loudness: L.courtyard, speed: 3.2, lightSets: [] },
    caption: caption('The Courtyard', TEXT.courtyard),
    colours: { floor: '#938986' },
  },
  {
    id: 'lobby',
    name: 'Entrance lobby',
    level: 0,
    height: GUESS.lobbyCeiling,
    areas: [KR(0.25, FRONT + 0.5, 4.8, 17.8)],
    zone: indoors(GUESS.through.lobby, L.lobby, { showCity: true }),
    caption: caption('The entrance lobby', 'Double doors, a small lobby, double doors again. In 1991 the door was shielded by industrial sheet-metal panels, and the staff on it wore claret flight jackets with the crest.'),
    colours: { floor: '#6f6a66', walls: '#a8a39b', ceiling: '#8a8580' },
  },
  {
    id: 'tunnel',
    name: 'Entrance tunnel',
    level: 0,
    height: GUESS.tunnelCeiling,
    areas: [KR(TUNNEL.a0, TUNNEL.b0, TUNNEL.a1, TUNNEL.b1)],
    zone: indoors(GUESS.through.tunnel, L.tunnel, { showCity: true }),
    caption: caption('The entrance tunnel', TEXT.tunnel),
    openings: [
      { line: [K(TUNNEL.a1, 21.6), K(TUNNEL.a1, 24.6)], sill: GUESS.counterHeight, head: GUESS.doorHeight },
      { line: [K(TUNNEL.a1, 30.2), K(TUNNEL.a1, 35.5)], sill: GUESS.counterHeight, head: GUESS.doorHeight },
    ],
    colours: { floor: '#6f6a66', walls: '#a8a39b', ceiling: '#8a8580' },
  },
  {
    id: 'boxoffice',
    name: 'Box office',
    level: 0,
    height: GUESS.tunnelCeiling,
    areas: [KR(TUNNEL.a1 + 0.05, 21.5, 7, 24.7)],
    zone: indoors(GUESS.through.tunnel, L.tunnel),
    caption: caption('The box office', 'The first hatch on the right. Identity documents are scanned at the door, a condition of the licence. There is no re-entry, and last entry on Fridays and Saturdays is three in the morning.'),
    openings: [{ line: [K(TUNNEL.a1 + 0.05, 21.6), K(TUNNEL.a1 + 0.05, 24.6)], sill: GUESS.counterHeight, head: GUESS.doorHeight }],
    colours: { floor: '#6f6a66', walls: '#77726c', ceiling: '#8a8580' },
  },
  {
    id: 'cloakroom',
    name: 'Cloakroom',
    level: 0,
    height: GUESS.tunnelCeiling,
    areas: [KR(TUNNEL.a1 + 0.05, 30.1, 7.5, 35.6)],
    zone: indoors(GUESS.through.tunnel, L.tunnel),
    caption: caption('The cloakroom', 'The second counter on the right, near the far doors. No photograph of it was found, so only its place and length on the plan are modelled.'),
    openings: [{ line: [K(TUNNEL.a1 + 0.05, 30.2), K(TUNNEL.a1 + 0.05, 35.5)], sill: GUESS.counterHeight, head: GUESS.doorHeight }],
    colours: { floor: '#6f6a66', walls: '#77726c', ceiling: '#8a8580' },
  },

  /* the hub */
  {
    id: 'the103',
    name: 'The 103',
    level: 0,
    height: GUESS.hall103Roof,
    areas: [
      poly([-11.5, 35.6], [-1.5, 35.5], [9.5, 37.9], [11.2, 41.6], [11.2, 48.1], [-11.5, 48.1]),
      // behind the counter
      R(-6.8, 48.1, 9.2, 50.3),
    ],
    zone: indoors(0.85, L.the103),
    caption: caption('The 103, the hub', TEXT.the103),
    openings: [
      // The Lounge hangs in the west end of the room
      { line: [P(-11.5, 38.9), P(-11.5, 48.1)], sill: U, head: U + MEASURED.loungeCeiling },
      { line: [P(-11.5, 48.1), P(-7.95, 48.1)], sill: U, head: U + MEASURED.loungeCeiling },
    ],
    colours: { floor: '#3a2f32', walls: '#3a3a3e', ceiling: '#252528' },
  },
  {
    id: 'tunnel1',
    name: 'Box Tunnel 1',
    level: 0,
    height: GUESS.boxTunnelCeiling,
    areas: [R(-16.3, 45.6, -11.8, 48.1)],
    zone: indoors(0.3, L.boxTunnel),
    caption: caption('Box Tunnel 1', 'One of two short passages to The Box. Visitors describe a darkened bend, red light and a yellow sign warning of excessive sound levels. Early in the night the doors and heavy curtains stay shut.'),
    colours: { floor: '#2a1a12', walls: '#3a3a3e', ceiling: '#252528' },
  },
  {
    id: 'tunnel2',
    name: 'Box Tunnel 2',
    level: 0,
    height: GUESS.boxTunnelCeiling,
    areas: [R(-15.3, 35.1, -11.8, 37.9)],
    zone: indoors(0.3, L.boxTunnel),
    caption: caption('Box Tunnel 2', 'The south passage to The Box. The room beyond was built as a box inside the building, so that the system could run loud all night without being heard in the street.'),
    colours: { floor: '#2a1a12', walls: '#3a3a3e', ceiling: '#252528' },
  },
  {
    id: 'techroom',
    name: 'Tech room',
    level: 0,
    height: GUESS.backRoomCeiling,
    areas: [R(-16.4, 38.2, -14, 45.3)],
    zone: indoors(0.3, L.backOfHouse),
    caption: caption('The tech room', 'Staff only, between the two tunnels. Of the roughly £750,000 it is said to have cost to open the club in 1991, about £500,000 went on the sound system.'),
    colours: { floor: '#4a4a4c', walls: '#77726c', ceiling: '#5a5a5c' },
  },
  {
    id: 'box',
    name: 'The Box',
    level: 0,
    height: MEASURED.boxCeiling,
    areas: [poly([-35.3, 48.2], [-19.5, 48.2], [-17.5, 46.9], [-16.7, 46.9], [-16.7, 37.8], [-15.8, 35.1], [-32.2, 29.1], [-35.5, 38])],
    zone: indoors(1, L.box, { exposure: 0.88, fog: '#03070f' }),
    caption: caption('The Box, main room', TEXT.box),
    openings: [
      // the VIP balcony along the north side
      { line: [P(-35.3, 48.2), P(-19.5, 48.2)], sill: U },
      // The Lounge's windows
      { line: [P(-16.7, 38.6), P(-16.7, 45)], sill: U + GUESS.windowSill, head: U + GUESS.windowHead },
    ],
    colours: BLACK,
  },
  {
    id: 'boxcorridor',
    name: 'Corridor behind The Box',
    level: 0,
    height: GUESS.backRoomCeiling,
    areas: [R(-35.5, 48.6, -22, 50.6)],
    zone: indoors(0.3, L.backOfHouse),
    caption: caption('The corridor behind The Box', 'Staff and artists. It runs along the north wall of The Box from its double doors to Arch80.'),
    colours: BLACK,
  },
  {
    id: 'arch80',
    name: 'Arch80',
    level: 0,
    height: GUESS.archCrown,
    areas: [R(-39.1, 51, -31.3, 66.3)],
    vault: { springing: GUESS.archSpringing, along: 'z' },
    zone: indoors(0.2, L.backOfHouse),
    caption: caption('Arch80', "A railway arch used as the artists' and VIP room: sofas, a pool table, bare brick. Four of the club's rooms are arches under the viaduct behind it."),
    colours: { floor: '#9a958e', walls: '#7a5a48', ceiling: '#7a5a48' },
  },
  {
    id: 'wc-w',
    name: "Women's toilets",
    level: 0,
    height: GUESS.archCrown,
    areas: [R(-20.5, 51, -13.2, 66.9)],
    vault: { springing: GUESS.archSpringing, along: 'z' },
    zone: indoors(0.25, L.toilets),
    caption: caption("The women's toilets", 'In a railway arch off the north-west corner of The 103, with a wash trough down the middle. The 2003 refurbishment refitted the toilets; no photograph of them today was found.'),
    colours: { floor: '#77726c', walls: BRICK, ceiling: '#4a4a4c' },
  },
  {
    id: 'loadin',
    name: 'Load-in arch',
    level: 0,
    height: GUESS.archCrown,
    areas: [R(-11.8, 51, -6.1, 66.9)],
    vault: { springing: GUESS.archSpringing, along: 'z' },
    zone: indoors(0.2, L.backOfHouse),
    caption: caption('The load-in arch', 'Staff. Equipment comes in through this arch from the far side of the viaduct. In January 2026 the old speaker stacks and the two mirror balls of The Box went out this way, and a new system came in.'),
    colours: { floor: '#77726c', walls: BRICK, ceiling: '#4a4a4c' },
  },
  {
    id: 'babylobby',
    name: 'Baby Box lobby',
    level: 0,
    height: GUESS.babyLobbyCeiling,
    areas: [R(12, 43.1, 14.5, 49.1), R(14.5, 47, 19.9, 49.1)],
    zone: indoors(0.4, 0.4),
    caption: caption('To The Baby Box', 'A low lobby off the north-east corner of The 103, under The Loft, leading to the arch.'),
    colours: BLACK,
  },
  {
    id: 'babybox',
    name: 'The Baby Box',
    level: 0,
    height: GUESS.archCrown,
    areas: [R(14.9, 49.5, 22.5, 57.2)],
    vault: { springing: GUESS.archSpringing, along: 'z' },
    zone: indoors(0.9, L.babybox, { haze: { default: 0.02, day: 0.002 } }),
    caption: caption('The Baby Box', TEXT.babybox),
    colours: { floor: '#bfb9a1', walls: BRICK, ceiling: '#2c282b' },
  },
  {
    id: 'wc-m',
    name: "Men's toilets",
    level: 0,
    height: GUESS.toiletCeiling,
    areas: [poly([12.5, 42.6], [25.5, 42.1], [19.5, 36.1], [15.5, 36.1])],
    zone: indoors(0.25, L.toilets),
    caption: caption("The men's toilets", 'An angled room at the east end of The 103, under The Loft. Not documented in any photograph; only its outline on the plan is modelled.'),
    colours: { floor: '#77726c', walls: '#8a8a8c', ceiling: '#5a5a5c' },
  },
];

/* ------------------------------------------------------------------ links ---- */
const door = (id: string, from: string, to: string, area: Rect | Pt[], level = 0, height = GUESS.doorHeight): Link => ({ id, from, to, area, level, height });
const D2 = GUESS.doubleDoor / 2;
const links: Link[] = [
  // the way in: courtyard, lobby, tunnel, The 103
  door('courtyard-lobby', 'courtyard', 'lobby', KR(2.6 - D2, FRONT - 0.4, 2.6 + D2, FRONT + 0.9)),
  door('lobby-tunnel', 'lobby', 'tunnel', KR(2.8 - D2, 17.4, 2.8 + D2, 18.7)),
  door('tunnel-103', 'tunnel', 'the103', KR(3.2 - D2, TUNNEL.b1 - 0.4, 3.2 + D2, 38.1)),
  // The 103 to The Box, by either tunnel
  door('103-tunnel1', 'the103', 'tunnel1', R(-12.2, 45.7, -11.1, 48), 0, GUESS.boxTunnelCeiling - 0.1),
  door('tunnel1-box', 'tunnel1', 'box', R(-17.2, 45.7, -15.9, 46.85)),
  door('103-tunnel2', 'the103', 'tunnel2', R(-12.2, 35.75, -11.1, 37.8), 0, GUESS.boxTunnelCeiling - 0.1),
  door('tunnel2-box', 'tunnel2', 'box', R(-17.3, 35.55, -14.9, 37.6)),
  // the rest of the ground floor
  door('103-babylobby', 'the103', 'babylobby', R(10.8, 47, 12.4, 48)),
  door('babylobby-babybox', 'babylobby', 'babybox', R(16.65, 48.7, 18.45, 49.9)),
  door('103-wcm', 'the103', 'wc-m', R(10.8, 41.65, 13.6, 42.55)),
  door('tunnel1-wcw', 'tunnel1', 'wc-w', R(-15.6, 47.7, -14.1, 51.4)),
  // staff and artists
  door('tunnel2-tech', 'tunnel2', 'techroom', R(-15.2, 37.5, -14.2, 38.6)),
  door('tunnel1-tech', 'tunnel1', 'techroom', R(-15.2, 44.9, -14.2, 46)),
  door('103-loadin', 'the103', 'loadin', R(-10.4, 47.7, -8.9, 51.4)),
  door('box-corridor', 'box', 'boxcorridor', R(-23.75, 47.8, -22.25, 49)),
  door('corridor-arch80', 'boxcorridor', 'arch80', R(-35.4, 50.2, -34.3, 51.4)),
  // upstairs
  door('walkway-lounge', 'the103', 'lounge', R(-5.5, 40.8, -4.3, 41.8), U),
  door('walkway-loft', 'the103', 'loft', R(10.6, 42.5, 15.4, 43.7), U, MEASURED.loftDoor),
  door('lounge-balcony', 'lounge', 'vipbalcony', R(-16.45, 47.65, -15.35, 48.65), U),
  door('lounge-backstair', 'lounge', 'backstair', R(-8.6, 47.6, -7.6, 48.8), U, GUESS.backStairCeiling),
  door('balcony-greenroom', 'vipbalcony', 'greenroom', R(-36.1, 49.2, -34.9, 50.4), U, 1.9),
  door('boxstair-balcony', 'box', 'vipbalcony', R(-27, 47.75, -25.9, 48.65), U),
  door('gantry-greenroom', 'box', 'greenroom', R(-36.1, 46, -34.85, 47), U, 1.9),
];

/* ----------------------------------------------------------------- stairs ---- */
/**
 * A straight flight from its foot to its top, `width` wide, and the blocks that stop anyone
 * walking through the space under it: each stands a little lower than the lowest tread above it.
 */
function flight(id: string, from: string, to: string, foot: [number, number], top: [number, number], width: number, y0: number, y1: number): { stair: Stair; under: Obstacle[] } {
  const len = Math.hypot(top[0] - foot[0], top[1] - foot[1]);
  const dx = (top[0] - foot[0]) / len;
  const dz = (top[1] - foot[1]) / len;
  const at = (t: number, side: number): [number, number] => [foot[0] + dx * len * t - dz * side * (width / 2), foot[1] + dz * len * t + dx * side * (width / 2)];
  const stair: Stair = { id, from, to, area: poly(at(0, -1), at(1, -1), at(1, 1), at(0, 1)), line: [P(...foot), P(...top)], y: [y0, y1] };
  const under: Obstacle[] = [];
  const n = 8;
  for (let k = 1; k < n; k++) {
    const top0 = y0 + ((y1 - y0) * k) / n - 0.1;
    if (top0 - y0 < 0.25) continue;
    under.push({ label: `under ${id}`, poly: poly(at(k / n, -1), at((k + 1) / n, -1), at((k + 1) / n, 1), at(k / n, 1)), y0, y1: top0, draw: false });
  }
  return { stair, under };
}

const flights = [
  // Stair A, at the west end of The 103, up to the walkway
  flight('stair-a', 'the103', 'the103', [-5, 39.6], [-1.3, 39.6], 1.3, 0, U),
  // Stair B, at the east end
  flight('stair-b', 'the103', 'the103', [6.2, 45.2], [9.9, 45.2], 1.2, 0, U),
  // The Box: up the north wall to the VIP balcony, and three steps onto the deck behind the booth
  flight('box-north', 'box', 'box', [-32.2, 47.5], [-27.1, 47.5], 1.3, 0, U),
  flight('box-deck', 'box', 'box', [-33.4, 46.4], [-33.4, 44.9], 1.2, 0, GUESS.vipDeck),
  // and from the deck up to the gantry on the west wall
  flight('gantry-steps', 'box', 'box', GUESS.gantrySteps.foot, GUESS.gantrySteps.top, GUESS.gantrySteps.width, GUESS.vipDeck, U),
  // from the load-in arch up to the back stair corridor
  flight('back-stair', 'loadin', 'backstair', [-7.85, 61.8], [-7.85, 58.8], 1.7, 0, U),
];
const stairs: Stair[] = flights.map((f) => f.stair);

/* -------------------------------------------------------------- platforms ---- */
export const DECK = poly([-32.5, 44.9], [-31.15, 30.05], [-32.15, 29.3], [-35.4, 38], [-35.26, 44.9]);
const TIERS = GUESS.loungeTiers;
/** The Lounge's tiers, lowest first: where each begins and ends (metres in), and its floor level. */
export const LOUNGE_TIERS = Array.from({ length: TIERS.count }, (_, i) => {
  const depth = (TIERS.to - TIERS.from) / TIERS.count;
  return { from: TIERS.from + depth * i, to: TIERS.from + depth * (i + 1), level: U + TIERS.rise * (i + 1) };
});
const platforms: Platform[] = [
  // the 103 Walkway: a strip to The Lounge's door, and the band along the south side to The Loft
  { id: 'walkway-west', room: 'the103', area: R(-4.7, 40.6, -1.3, 41.9), level: U },
  { id: 'walkway', room: 'the103', area: poly([-1.3, 38.3], [11, 41.9], [11, 46.1], [9.9, 46.1], [9.9, 44.3], [7.2, 42.6], [-1.3, 41.9]), level: U },
  // The Box: the raised deck behind the booth, the landing of the north stair, the gantry on the west wall
  { id: 'vip-deck', room: 'box', area: DECK, level: GUESS.vipDeck },
  { id: 'box-landing', room: 'box', area: R(-27.1, 46.85, -25.8, 48.15), level: U },
  { id: 'gantry', room: 'box', area: R(-35.25, 45, -34.2, 48.15), level: U },
  // The Lounge: three tiers of booth seating
  ...LOUNGE_TIERS.map((t, i): Platform => ({ id: `lounge-tier-${i + 1}`, room: 'lounge', area: R(TIERS.right[0], t.from, TIERS.right[1], t.to), level: t.level })),
];

/* --------------------------------------------------------------- fittings ---- */
// Where the fixed things stand. The build draws them from these; the obstacles below keep a walker out of them.
type R4 = [number, number, number, number];
/** The courtyard bar, a container: on the courtyard grid. It serves toward the building. */
export const COURT_BAR: R4 = [9.2, 1.94, 15.2, 4.34];
/** The four gate leaves, swung in: how far along the courtyard each stands, and its length. The bar stands hard by the second gate. */
export const GATE_LEAVES: [number, number][] = [
  [COURT.mainGate[0] + 0.05, GUESS.gateLeaf.main],
  [COURT.mainGate[1] - 0.05, GUESS.gateLeaf.main],
  [COURT.secondGate[0] + 0.28, GUESS.gateLeaf.second],
  [COURT.secondGate[1] - 0.05, GUESS.gateLeaf.second],
];
/** Picnic benches under the overhang: metres along the courtyard, each 1.8 m wide, from 11.6 to 13.6 m in. */
export const PICNIC_BENCHES = [7.6, 10.2, 12.8, 15.4, 18];
/** The search arches: the clear opening of each, along the courtyard, and how far in they stand. */
export const SEARCH_ARCHES = GUESS.searchArches.centres.map((c): [number, number] => [c - GUESS.searchArches.clear / 2, c + GUESS.searchArches.clear / 2]);
export const ARCH_AT = GUESS.searchArches.at;
/** The 103: the DJ booth and the booth seating behind it. */
export const BOOTH_103: R4 = [-0.2, 39.6, 2.2, 41.3];
/** The flat of The 103's desk, where the two players and the mixer stand: the crowd's edge of the top, then back to the DJ. */
export const DESK_103 = (() => {
  const [r0, , r1, i1] = BOOTH_103;
  return poly([r0 + 0.06, i1 - 0.08], [r1 - 0.06, i1 - 0.08], [r1 - 0.06, i1 - 0.72], [r0 + 0.06, i1 - 0.72]);
})();
export const BOOTH_COLUMNS: R4[] = [
  [BOOTH_103[0] - 0.4, BOOTH_103[3] - 0.4, BOOTH_103[0], BOOTH_103[3]],
  [BOOTH_103[2], BOOTH_103[3] - 0.4, BOOTH_103[2] + 0.4, BOOTH_103[3]],
];
export const SEATING_103: [[number, number], [number, number]] = [
  [-0.9, 38],
  [9, 40.1],
];
export const BAR_103 = { counter: 48.45, back: 50, right: [-6.8, 9.2] as [number, number] };
export const WALKWAY_COLUMNS: [number, number][] = [
  [-6.9, 43.2],
  [-4.7, 41.9],
  [-2.4, 41],
  [4.9, 41.6],
  [7.1, 42.8],
  [9.4, 43.8],
];
/** The Box: the DJ desk, the two sides of the booth, and the two blocks of subs on the floor. */
export const BOX_DESK = poly([-28.7, 41.1], [-28.2, 37.4], [-29.31, 37.25], [-29.81, 40.95]);
export const BOX_BOOTH_SIDES: [[number, number], [number, number]][] = [
  [
    [-32.4, 40.6],
    [-28.7, 41.1],
  ],
  [
    [-31.9, 36.9],
    [-28.2, 37.4],
  ],
];
export const BOX_STACKS: R4[] = [
  [-32.7, 42, -31.3, 44.2],
  [-31.6, 33.5, -30.2, 35.7],
];
export const WASH_TROUGH: R4 = [-17.6, 56.4, -16.4, 62.6];
export const CUBICLES = GUESS.fittings.cubicles;
export const BABY_BOOTH: R4 = [16.8, 54.4, 19.8, 55.2];
/** The flat of The Baby Box's desk, where the two players and the mixer stand: the crowd's edge of the top, then back to the DJ. */
export const BABY_DESK = (() => {
  const [r0, i0, r1, i1] = BABY_BOOTH;
  return poly([r0, i0 + 0.08], [r1, i0 + 0.08], [r1, i1], [r0, i1]);
})();
export const BABY_STACKS: R4[] = [
  [15, 56, 15.8, 56.8],
  [21.3, 55.9, 22.1, 56.7],
];
export const BABY_TRUSS = GUESS.fittings.babyTruss;
export const ARCH80 = GUESS.fittings.arch80;
export const FLIGHT_CASES = GUESS.fittings.flightCases;
export const TECH_RACKS = GUESS.fittings.techRacks;
export const GREEN_ROOM_SOFA = GUESS.fittings.greenRoomSofa;
export const LOUNGE_BAR: [[number, number], [number, number]] = [
  [-15.9, 38.8],
  [-7.5, 41.05],
];
/** The Lounge's benches: two to a tier, either side of a middle aisle, backs to the next tier up. */
export const LOUNGE_BENCHES = LOUNGE_TIERS.flatMap((t) => {
  const [x0, x1] = TIERS.right;
  const mid = (x0 + x1) / 2;
  return [
    { x0: x0 + 0.15, x1: mid - TIERS.aisle / 2, back: t.to - 0.04, level: t.level },
    { x0: mid + TIERS.aisle / 2, x1: x1 - 0.15, back: t.to - 0.04, level: t.level },
  ];
});
/**
 * The Loft's bar runs along the angled south-east wall, 7.38 m long on the plan. It is drawn
 * parallel to that wall, with an aisle behind it for the staff (GUESS.loftBarAisle).
 */
const LOFT_WALL: [[number, number], [number, number]] = [
  [21.5, 38.7],
  [27.7, 44.5],
];
/** A point `t` metres along the Loft's angled wall and `off` metres into the room from it. */
export const loftWall = (t: number, off: number): [number, number] => {
  const [a, b] = LOFT_WALL;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  return [a[0] + d[0] * t - d[1] * off, a[1] + d[1] * t + d[0] * off];
};
export const LOFT_BAR: [[number, number], [number, number]] = [loftWall(0.3, GUESS.loftBarAisle + 0.3), loftWall(7.68, GUESS.loftBarAisle + 0.3)];
export const ALCOVE = GUESS.loftAlcove;
export const ALCOVE_FRONT = 49.1 - ALCOVE.depth;
/** The Loft's DJ booth stands in the mouth of the alcove; the DJ faces south, into the room. */
export const LOFT_BOOTH: R4 = [18.8, ALCOVE_FRONT + 0.35, 21.2, ALCOVE_FRONT + 0.9];
/** The flat of The Loft's desk, where the two players and the mixer stand: the crowd's edge of the top, then back to the DJ. */
export const LOFT_DESK = (() => {
  const [r0, i0, r1, i1] = LOFT_BOOTH;
  return poly([r0, i0 + 0.08], [r1, i0 + 0.08], [r1, i1], [r0, i1]);
})();
export const LOFT_SOFAS = GUESS.fittings.loftSofas;

/* -------------------------------------------------------------- obstacles ---- */
// (the build draws every rail, as a handrail on balusters)
const rail = (label: string, pts: [number, number][], level = U): Obstacle => ({ label, path: poly(...pts), width: 0.06, y0: level, y1: level + GUESS.balconyRail, draw: false });
const post = (label: string, at: Pt, r: number, y1: number): Obstacle => ({ label, circle: [at[0], at[1], r], y0: 0, y1, draw: false });
const block = (label: string, area: Rect | Pt[], y0: number, y1: number, draw?: string | false): Obstacle => (typeof area[0] === 'number' ? { label, rect: area as Rect, y0, y1, draw } : { label, poly: area as Pt[], y0, y1, draw });
const line = (label: string, pts: Pt[], width: number, y0: number, y1: number, draw?: string | false): Obstacle => ({ label, path: pts, width, y0, y1, draw });
const column = (label: string, at: [number, number], r: number, y0: number, y1: number, draw: string | false = false): Obstacle => ({ label, circle: [at[0], -at[1], r], y0, y1, draw });

const BOUNDARY = '#1c1c1f';
/** Where the two runs of crowd barrier stand along the pavement, in metres along the street boundary. */
export const QUEUE_BARRIERS = {
  general: [COURT.mainGate[1] + 0.6, COURT.mainGate[1] + 0.6 + GUESS.queue.generalLength] as [number, number],
  guest: [COURT.mainGate[0] - 0.5 - GUESS.queue.guestLength, COURT.mainGate[0] - 0.5] as [number, number],
};
const obstacles: Obstacle[] = [
  ...flights.flatMap((f) => f.under),

  /* the street boundary: black panels about 2.4 m high, with the two gates standing open */
  line('boundary, left of the main gate', [K(-0.2, 0), K(COURT.mainGate[0], 0)], 0.15, 0, GUESS.boundaryHeight, BOUNDARY),
  line('boundary, between the gates', [K(COURT.mainGate[1], 0), K(COURT.secondGate[0], 0)], 0.15, 0, GUESS.boundaryHeight, BOUNDARY),
  line('boundary, right of the second gate', [K(COURT.secondGate[1], 0), K(COURT.width + 0.2, 0)], 0.15, 0, GUESS.boundaryHeight, BOUNDARY),
  // the neighbours' flank walls stand on either side; these keep a walker off them
  line('left flank', [K(0.05, 0), K(0.05, 8.9)], 0.1, 0, GUESS.leftFlankHeight, false),
  line('left wall under the overhang', [K(-0.1, 8.8), K(-0.1, FRONT)], 0.2, 0, GUESS.fasciaTop, '#b3261e'),
  line('right flank', [K(COURT.width - 0.05, 0), K(COURT.width - 0.05, FRONT)], 0.1, 0, 24, false),
  // the overhang itself, for anyone flying
  block('overhang', KR(0, FRONT - OVERHANG.depth, COURT.width, FRONT), GUESS.overhangSoffit, GUESS.fasciaTop, false),
  block('overhang pier', KR(10.02, 10.25, 10.52, 10.75), 0, GUESS.overhangSoffit, '#242226'),
  block('overhang pier', KR(11.75, 10.2, 12.25, 10.7), 0, GUESS.overhangSoffit, '#242226'),
  // the courtyard's fittings, from the plan
  // (from here on, whatever has `false` for a colour is drawn by the build, with its real shape)
  block('courtyard bar', KR(...COURT_BAR), 0, 2.6, false),
  line('hedge', [K(4.5, 2.1), K(4.5, 6.62), K(10.06, 6.62)], 0.5, 0, GUESS.hedgeHeight, '#2f4a25'),
  ...PICNIC_BENCHES.map((a) => block('picnic bench', KR(a - 0.9, 11.6, a + 0.9, 13.6), 0, 0.75, false)),
  // crowd barriers along the pavement: general admission to the right of the gate, guest list to the left
  line('queue barrier', [K(QUEUE_BARRIERS.general[0], -GUESS.queue.barrier), K(QUEUE_BARRIERS.general[1], -GUESS.queue.barrier)], 0.06, 0, 1.1, false),
  line('guest list barrier', [K(QUEUE_BARRIERS.guest[0], -GUESS.queue.barrier), K(QUEUE_BARRIERS.guest[1], -GUESS.queue.barrier)], 0.06, 0, 1.1, false),
  // at the gate: the two queue signs on their posts, the banner panel, the host's table, the bollards at the kerb
  post('queue sign', K(...GUESS.queueSigns.guest), 0.04, 2.6),
  post('queue sign', K(...GUESS.queueSigns.tickets), 0.04, 2.6),
  line('banner panel', [K(GUESS.banner.along[0], -GUESS.banner.out), K(GUESS.banner.along[1], -GUESS.banner.out)], 0.06, 0, GUESS.banner.height, false),
  block('host table', KR(...GUESS.hostTable), 0, 0.75, false),
  ...GUESS.bollards.along.map((a) => post('bollard', K(a, -GUESS.bollards.out), 0.09, GUESS.bollards.height)),
  ...GUESS.neighbourSigns.map((s) => post('lamp post', K(...s), 0.09, 6)),
  // the leaves of the two gates, swung in
  ...GATE_LEAVES.map(([a, len]) => line('gate leaf', [K(a, 0.1), K(a, 0.1 + len)], 0.06, 0, GUESS.boundaryHeight, false)),
  ...GUESS.trussLane.at.flatMap((b) => GUESS.trussLane.legs.map((a) => post('truss leg', K(a, b), 0.15, GUESS.trussLane.height))),
  // in the courtyard: planters along the left wall, the search arches and the bench by the red wall under the overhang
  line('planters', [K(0.1 + GUESS.planters.depth / 2, GUESS.planters.from), K(0.1 + GUESS.planters.depth / 2, GUESS.planters.to)], GUESS.planters.depth, 0, GUESS.planters.height, false),
  ...SEARCH_ARCHES.flatMap(([a0, a1]) => [block('search arch', KR(a0 - 0.08, ARCH_AT - 0.25, a0, ARCH_AT + 0.25), 0, 2.2, false), block('search arch', KR(a1, ARCH_AT - 0.25, a1 + 0.08, ARCH_AT + 0.25), 0, 2.2, false)]),
  line('search barrier', [K(0.55, ARCH_AT), K(SEARCH_ARCHES[0][0] - 0.1, ARCH_AT)], 0.06, 0, 1.1, false),
  block('bench by the red wall', KR(...GUESS.redWall.bench), 0, 0.45, false),

  /* The 103 */
  line('bar counter', [P(-6.8, 48.45), P(9.2, 48.45)], 0.7, 0, 1.1, false),
  line('back bar', [P(-6.6, 50), P(9, 50)], 0.5, 0, 2.2, false),
  block('DJ booth', R(...BOOTH_103), 0, 1.15, false),
  // the two square columns that flank it, each carrying a portrait screen
  ...BOOTH_COLUMNS.map((c) => block('booth column', R(...c), 0, U - 0.2, false)),
  block('speaker', R(3.4, 38.85, 4.4, 39.75), 0, 1.3, false),
  line('booth seating', [P(...SEATING_103[0]), P(...SEATING_103[1])], 0.6, 0, 0.45, false),
  block('small counter', R(...GUESS.smallCounter), 0, GUESS.counterHeight, false),
  ...WALKWAY_COLUMNS.map((c) => column('walkway column', c, 0.125, 0, U - 0.2, '#1f1f22')),
  rail('walkway rail, over the room', [[-1.3, 41.9], [7.2, 42.6], [9.9, 44.3]]),
  rail('walkway rail, south side', [[-1.3, 38.95], [-1.3, 38.3], [11, 41.9]]),
  rail('walkway rail, landing', [[9.9, 46.1], [11, 46.1]]),
  rail('walkway rail, west strip north', [[-4.7, 41.9], [-1.3, 41.9]]),
  rail('walkway rail, west strip south', [[-4.7, 40.6], [-1.3, 40.6], [-1.3, 40.3]]),

  /* The Box */
  block('DJ desk', BOX_DESK, 0, GUESS.boothFront, false),
  line('booth side', [P(...BOX_BOOTH_SIDES[0][0]), P(...BOX_BOOTH_SIDES[0][1])], 0.1, 0, GUESS.boothFront, false),
  line('booth side', [P(...BOX_BOOTH_SIDES[1][0]), P(...BOX_BOOTH_SIDES[1][1])], 0.1, 0, GUESS.boothFront, false),
  ...BOX_STACKS.map((s) => block('speaker block', R(...s), 0, GUESS.speakerBlock, false)),
  rail('landing rail', [[-27.1, 46.85], [-25.8, 46.85], [-25.8, 47.75]]),
  rail('gantry rail', [[-34.2, 45], [-34.2, 48.15]]),

  /* the arches */
  block('wash trough', R(...WASH_TROUGH), 0, 0.9, false),
  ...CUBICLES.map((c) => block('cubicles', R(...c), 0, 2, false)),
  block('Baby Box booth', R(...BABY_BOOTH), 0, 1.1, false),
  block('Baby Box booth side', R(BABY_BOOTH[0], BABY_BOOTH[3], BABY_BOOTH[0] + 0.12, BABY_BOOTH[3] + 1.2), 0, 1.1, false),
  block('Baby Box booth side', R(BABY_BOOTH[2] - 0.12, BABY_BOOTH[3], BABY_BOOTH[2], BABY_BOOTH[3] + 1.2), 0, 1.1, false),
  ...BABY_STACKS.map((s) => block('Baby Box stack', R(...s), 0, 2, false)),
  ...BABY_TRUSS.map((c) => column('Baby Box truss leg', c, 0.09, 0, GUESS.archSpringing + 0.9, '#9a9da3')),
  block('Baby Box column', R(16.2, 48.9, 16.6, 49.3), 0, GUESS.babyLobbyCeiling, '#1f1f22'),
  block('Baby Box column', R(18.5, 48.9, 18.9, 49.3), 0, GUESS.babyLobbyCeiling, '#1f1f22'),
  // Arch80: the block of small rooms either side of a passage, then the lounge
  block('Arch80 rooms', R(-39.1, 51.05, GUESS.arch80Rooms.passage[0], GUESS.arch80Rooms.to), 0, GUESS.arch80Rooms.height, false),
  block('Arch80 rooms', R(GUESS.arch80Rooms.passage[1], 51.05, -31.3, GUESS.arch80Rooms.to), 0, GUESS.arch80Rooms.height, false),
  ...ARCH80.sofas.map((s) => block('sofa', R(...s), 0, 0.45, false)),
  block('pool table', R(...ARCH80.pool), 0, 0.82, false),
  block('worktop', R(...ARCH80.worktop), 0, 0.92, false),
  // the load-in arch and the tech room
  ...FLIGHT_CASES.map(([r, h]) => block('flight case', R(...r), 0, h, false)),
  block('racks', R(...TECH_RACKS), 0, 2, false),

  /* upstairs */
  line('Lounge bar', [P(...LOUNGE_BAR[0]), P(...LOUNGE_BAR[1])], 0.6, U, U + 1.1, false),
  // (to the top of their backs, which stand above the tier behind)
  ...LOUNGE_BENCHES.map((b) => block('Lounge bench', R(b.x0, b.back - 0.55, b.x1, b.back), b.level, b.level + 0.95, false)),
  ...LOUNGE_BENCHES.map((b) => column('Lounge table', [(b.x0 + b.x1) / 2, b.back - 1.02], 0.27, b.level, b.level + 0.55)),
  column('Lounge column', GUESS.loungeColumn, 0.2, U, U + MEASURED.loungeCeiling, '#1b1b1d'),
  block('sofa', R(...GREEN_ROOM_SOFA), U, U + 0.45, false),
  line('Loft bar', [P(...LOFT_BAR[0]), P(...LOFT_BAR[1])], 0.6, U, U + 1.1, false),
  block('Loft booth', R(...LOFT_BOOTH), U, U + 1, false),
  // The Loft's alcove: two cheeks, and the ceiling that drops over it
  line('Loft alcove', [P(ALCOVE.right[0], ALCOVE_FRONT), P(ALCOVE.right[0], 49.1)], 0.15, U, U + MEASURED.loftAlcove, false),
  line('Loft alcove', [P(ALCOVE.right[1], ALCOVE_FRONT), P(ALCOVE.right[1], 49.1)], 0.15, U, U + MEASURED.loftAlcove, false),
  block('Loft alcove ceiling', R(ALCOVE.right[0] - 0.075, ALCOVE_FRONT, ALCOVE.right[1] + 0.075, 49.1), U + MEASURED.loftAlcove, U + MEASURED.loftCeiling, false),
  ...LOFT_SOFAS.map((s) => block('sofa', R(...s), U, U + 0.45, false)),
];

/* ----------------------------------------------------------------- shells ---- */
// The single-storey front that faces the courtyard, and the taller mass behind it. Their heights are guesses.
const LEFT = -0.2;
const shells: Shell[] = [
  { id: 'front', outline: [K(LEFT, FRONT), K(COURT.width, FRONT), P(11.4, 33.6), P(-13.05, 33.6)], height: GUESS.fasciaTop, colour: '#242226' },
  {
    id: 'rear',
    // its north side runs into the viaduct, where the arches begin
    outline: poly([-13.1, 33.7], [11.4, 33.7], [11.6, 39.6], [15.2, 35.5], [19.9, 35.5], [28.2, 43.9], [28.2, 52.6], [-39.5, 52.6], [-39.5, 45.2], [-36, 45.2], [-36, 37.9], [-32.5, 28.5]),
    height: GUESS.rearBlockHeight,
    colour: '#8f8777',
  },
];

/* ----------------------------------------------------------------- lights ---- */
/**
 * The Box is lit from its lattice. The photographs of the 2026 room show long LED strips on the
 * frame and across the grid as the brightest thing in it, a few narrow shafts coming down through
 * the grid, and the rest of the room left to what spills from them. No fixture hangs below the
 * grid. The washes here stand for the light of the strips; where they and the pin spots sit is
 * a guess.
 */
const LATTICE = GUESS.lattice;
/** How high the lattice is at a distance in from the street: lowest along its spine, rising to the side walls. */
export const latticeAt = (inn: number) => LATTICE.spine + ((LATTICE.edge - LATTICE.spine) * Math.abs(inn - LATTICE.centre[1])) / (LATTICE.span / 2);
/** The light of the strips, as a wash in each quarter of the grid. Each is in the plane of its wing, so it lights the room and neither face of the grid. */
export const BOX_WASHES: [number, number][] = [-1, 1].flatMap((a) => [-1, 1].map((b): [number, number] => [LATTICE.centre[0] + a * LATTICE.span * 0.25, LATTICE.centre[1] + b * LATTICE.span * 0.25]));
/** Whether The Box has spots at all: the pin spots here and the slow beams through the grid. Off for now, to see the room lit by the strips alone. */
export const BOX_SPOTS: boolean = false;
/** Pin spots in the frame at the four corners of the diamond, each tipped a little outward: where it is and where on the floor it points. */
export const BOX_PINS: { at: [number, number]; aim: [number, number] }[] = (
  [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ] as [number, number][]
).map(([a, b]) => ({
  at: [LATTICE.centre[0] + a * LATTICE.diamond, LATTICE.centre[1] + b * LATTICE.diamond],
  aim: [LATTICE.centre[0] + a * (LATTICE.diamond + 0.9), LATTICE.centre[1] + b * (LATTICE.diamond + 0.9)],
}));

const lamp = (set: string, right: number, inn: number, h: number, colour: string, intensity: number, range = 12, id?: string): LightSpec => ({ id, set, type: 'point', at: [right, h, -inn], colour, intensity, range, decay: 1.7 });
/** A narrow spot hung at a point and aimed at a point on the floor. */
const pin = (set: string, [right, inn]: [number, number], [toRight, toIn]: [number, number], h: number, colour: string, intensity: number, id?: string): LightSpec => ({ id, set, type: 'spot', at: [right, h, -inn], target: [toRight, 0, -toIn], colour, intensity, range: 8, decay: 1.7, angle: 0.17, penumbra: 0.6 });
const yardLamp = (set: string, a: number, b: number, h: number, colour: string, intensity: number, range = 12, more: Partial<LightSpec> = {}): LightSpec => ({ set, type: 'point', at: KV(a, b, h), colour, intensity, range, decay: 1.7, ...more });
const lights: LightSpec[] = [
  // the street: a white floodlight at the gate
  yardLamp('street', 3.6, -0.6, 4, '#fff1dc', 22, 20, { outdoor: true }),
  yardLamp('street', 17.7, -0.6, 4, '#fff1dc', 12, 16, { outdoor: true }),
  // the courtyard: blue tubes on the truss lane, heaters under the overhang, a light over the door
  yardLamp('courtyard', 2.6, 6, 3.2, '#2640b1', 30, 13, { outdoor: true }),
  yardLamp('courtyard', 12.5, 11.2, 3.6, '#ff7a2a', 18, 13, { outdoor: true }),
  yardLamp('courtyard', 2.6, 12.6, 3, '#ffe2c0', 9, 9, { outdoor: true }),
  yardLamp('courtyard', 17.5, 9.5, 3.8, '#ffb070', 14, 14, { outdoor: true }),
  yardLamp('courtyard', 12.2, 5.4, 2.3, '#ffc890', 7, 8, { outdoor: true }),
  yardLamp('lobby', 2.5, 16.3, 2.3, '#ffd9a0', 5, 8),
  yardLamp('boxoffice', 6.3, 23.1, 2.3, '#ffe2b8', 3, 6),
  yardLamp('cloakroom', 6.4, 32.8, 2.3, '#ffe2b8', 3, 7),
  // the tunnel: a red line along one edge of the ceiling, a green one along the other
  yardLamp('tunnel', 1.4, 21.5, 2.4, '#ff2a1a', 7, 11),
  yardLamp('tunnel', 5, 27.5, 2.4, '#22e05a', 6, 11),
  yardLamp('tunnel', 1.4, 33.5, 2.4, '#ff2a1a', 7, 11),
  // The 103: violet and blue washes, a bright bar wall
  lamp('the103', -4, 44, 5.6, '#5117dd', 60, 16),
  lamp('the103', 6, 44, 5.6, '#0638ab', 60, 16),
  lamp('the103', 1, 40.2, 2.2, '#8f0acd', 10, 8),
  lamp('the103', 1.2, 48, 3.4, '#cfd6ff', 22, 14, '103-bar'),
  lamp('the103', -8.5, 37.4, 2.2, '#ffd9a0', 5, 7),
  // the Box tunnels: small red downlights
  lamp('tunnel1', -14, 46.9, 2.2, '#c33532', 7, 8),
  lamp('tunnel2', -13.6, 36.5, 2.2, '#c33532', 7, 8),
  lamp('techroom', -15.2, 41.8, 2.2, '#bfc7d5', 4, 8),
  // The Box: everything is in the lattice. The light of its strips as four blue washes, four pale pin spots if it has spots, the strobe; a dim lamp over the desk
  ...BOX_WASHES.map(([r, i], k) => lamp('box', r, i, latticeAt(i), '#4f8cff', 22, 12, `box-wash-${k}`)),
  ...(BOX_SPOTS ? BOX_PINS.map((p, k) => pin('box', p.at, p.aim, latticeAt(p.at[1]), '#dbe8ff', 38, `box-pin-${k}`)) : []),
  lamp('box', -30.2, 39.6, 2.4, '#b9d2ff', 4, 5),
  lamp('box', -24, 41, 4.5, '#ffffff', 0, 24, 'box-strobe'),
  lamp('boxcorridor', -28.8, 49.6, 2.2, '#ffd9a0', 4, 9),
  lamp('arch80', -35.2, 55, 3.6, '#ffd9a0', 8, 10),
  lamp('arch80', -35.2, 62, 3.6, '#ffd9a0', 8, 10),
  lamp('wc-w', -16.9, 55, 3.6, '#dfe6ff', 8, 10),
  lamp('wc-w', -16.9, 62.5, 3.6, '#dfe6ff', 8, 10),
  lamp('loadin', -9, 57, 3.6, '#dfe6ff', 8, 12),
  lamp('babylobby', 13.6, 47.6, 2.1, '#3a55c8', 4, 7),
  lamp('babybox', 18.7, 51.8, 3.8, '#035bca', 22, 10),
  lamp('babybox', 18.5, 55.6, 3.4, '#603dde', 16, 8),
  lamp('wc-m', 17.5, 40.2, 2.1, '#dfe6ff', 7, 9),
  // upstairs
  lamp('lounge', -11.5, 44, U + 2.6, '#ffd2a1', 9, 10),
  lamp('lounge', -12, 40, U + 2.4, '#cc140c', 8, 8),
  lamp('vipbalcony', -26, 49.6, U + 2, '#ffd2a1', 3, 9),
  lamp('greenroom', -37.3, 48.2, U + 1.7, '#ffd9a0', 4, 6),
  lamp('backstair', -7.85, 54, U + 1.7, '#dfe6ff', 3, 8),
  lamp('loft', 19, 42.5, U + 3.6, '#e01a1f', 60, 13),
  lamp('loft', 23.5, 46.5, U + 3.6, '#d0121a', 55, 13),
  lamp('loft', 17, 47.5, U + 2.2, '#ffd2a1', 5, 7),
  // the strips under the Lounge's tiers
  lamp('lounge', -12.15, 45.4, U + 0.7, '#ff9a4a', 4, 6),
];

// Each room switches on its own lights and those of the rooms it opens into, or looks into.
const SEES: Record<string, string[]> = {
  courtyard: ['street'],
  lobby: ['street'],
  lounge: ['box'],
  vipbalcony: ['box'],
  tunnel: ['boxoffice', 'cloakroom'],
};
/**
 * Where two rooms look into each other without a door between them: over a balcony, through a
 * window or a hatch. Each is the line of the opening on the plan. The build uses them, with the
 * doors and stairs, to work out which rooms can be seen from where.
 */
export const SIGHT_LINES: { a: string; b: string; line: [Pt, Pt] }[] = [
  { a: 'lounge', b: 'the103', line: [P(-5.1, 41.9), P(-8, 48.05)] },
  { a: 'lounge', b: 'box', line: [P(-16.65, 38.6), P(-16.65, 45)] },
  { a: 'vipbalcony', b: 'box', line: [P(-35.3, 48.25), P(-19.5, 48.25)] },
  { a: 'tunnel', b: 'boxoffice', line: [K(TUNNEL.a1, 21.6), K(TUNNEL.a1, 24.6)] },
  { a: 'tunnel', b: 'cloakroom', line: [K(TUNNEL.a1, 30.2), K(TUNNEL.a1, 35.5)] },
];
/** A room that hangs inside a taller one is part of what that one looks like, from wherever it is seen: The Lounge is the ceiling of the west end of The 103. */
export const HANGS_IN: Record<string, string[]> = { the103: ['lounge'] };
function setsFor(room: string) {
  const sets = new Set<string>([room]);
  for (const l of links) {
    if (l.from === room) sets.add(l.to);
    if (l.to === room) sets.add(l.from);
  }
  for (const s of stairs) {
    if (s.from === room) sets.add(s.to);
    if (s.to === room) sets.add(s.from);
  }
  for (const s of SEES[room] ?? []) sets.add(s);
  // only sets that have a light
  return [...sets].filter((s) => lights.some((l) => l.set === s));
}
for (const r of rooms) r.zone.lightSets = setsFor(r.id);

// The air in each room: how thick the haze is at night, and how much of the echo is heard.
const H = GUESS.haze;
const E = GUESS.echo;
const AIR: Record<string, [haze: number, echo: number]> = {
  box: [H.box, E.box],
  vipbalcony: [H.box, E.box],
  the103: [H.the103, E.the103],
  babybox: [H.babybox, E.babybox],
  babylobby: [H.other, E.boxTunnel],
  loft: [H.loft, E.loft],
  lounge: [H.lounge, E.lounge],
  tunnel1: [H.boxTunnel, E.boxTunnel],
  tunnel2: [H.boxTunnel, E.boxTunnel],
  tunnel: [H.tunnel, E.tunnel],
  boxoffice: [H.tunnel, E.tunnel],
  cloakroom: [H.tunnel, E.tunnel],
  lobby: [H.other, E.lobby],
  'wc-w': [H.other, E.toilets],
  'wc-m': [H.other, E.toilets],
};
for (const r of rooms) {
  if (!r.zone.inside) continue;
  const [haze, echo] = AIR[r.id] ?? [H.other, E.backOfHouse];
  r.zone.haze = { default: haze, day: 0.002 };
  r.zone.echo = echo;
}

// What is heard where: four rooms, four DJs, four loops. The Box plays the hard loop and was
// built to keep it in: it carries only to the rooms built against it, The Lounge over its
// passages among them. The Baby Box plays drum and bass at 160 beats a minute, heard in its
// arch and, through the door, in the low lobby that leads to it. The Loft plays a plain
// house beat, drums and bass, and keeps it to itself. The 103 plays the softer loop with the
// chords, which is what the rest of the building hears, the entrance tunnel and the courtyard
// included. None reaches the street (`outdoors.track`).
const HEARS_BOX = new Set(['box', 'vipbalcony', 'lounge', 'tunnel1', 'tunnel2', 'techroom', 'greenroom', 'boxcorridor', 'arch80']);
const HEARS: Record<string, TrackId> = { babybox: 'dnb', babylobby: 'dnb', loft: 'beat' };
for (const r of rooms) r.zone.track = HEARS[r.id] ?? (HEARS_BOX.has(r.id) ? 'techno' : 'house');

/* ----------------------------------------------------------------- crowds ---- */
// Counts are for the three detail levels: a quarter, a half and three quarters of each room's
// licensed capacity (GUESS.crowd), shared out between the places people stand in it. Scattering
// stops when a floor is full, so a small room at the top level holds fewer than it is asked for.
const NIGHT = ['night'];
const Q = GUESS.queue;
const share = (capacity: number, part = 1): ByLevel => GUESS.crowd.map((s) => Math.round(capacity * s * part)) as ByLevel;
const bounds = (pts: Pt[]): Rect => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
const at = (p: Pt, y: number, facing: number, behaviour: Person['behaviour']): Person => ({ x: p[0], y, z: p[1], facing, behaviour });
/** Which way to face: a figure looks along +z turned by this much. On the site grid, and on the courtyard's. */
const FACE = { south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2, yardIn: Math.atan2(-ks, -kc), yardOut: Math.atan2(ks, kc), yardRight: Math.atan2(kc, -ks), yardLeft: Math.atan2(-kc, ks) };
/** Spread a list so that the first few of it are not all at one end. */
const spread = <T>(list: T[]): T[] => list.map((item, i) => ({ item, k: (i * 0.618034) % 1 })).sort((p, q) => p.k - q.k).map((p) => p.item);
/** People in a row from a to b. */
const row = (a: Pt, b: Pt, n: number, y: number, facing: number, behaviour: Person['behaviour']): Person[] =>
  spread(Array.from({ length: n }, (_, i) => at([a[0] + ((b[0] - a[0]) * (i + 0.5)) / n, a[1] + ((b[1] - a[1]) * (i + 0.5)) / n], y, facing + Math.sin(i * 12.9898) * 0.25, behaviour)));

/** Paving is drawn a little above the ground the city draws. */
const YARD_Y = 0.07;
const SEAT = 0.45;
const YARD_KEEP_OUT: Area[] = [KR(...COURT_BAR), KR(4.25, 2.1, 4.75, 6.87), KR(4.25, 6.37, 10.06, 7.05), KR(10.02, 10.25, 10.52, 10.75), KR(11.75, 10.2, 12.25, 10.7), KR(COURT_BAR[0], COURT_BAR[3], COURT_BAR[2], COURT_BAR[3] + 0.5)];
// three a side at each picnic bench, facing the table
const PICNIC_SITTERS = spread(
  PICNIC_BENCHES.flatMap((a) => [-0.6, 0, 0.6].flatMap((da) => [at(K(a + da, 11.75), YARD_Y + SEAT, FACE.yardIn, 'sit'), at(K(a + da, 13.45), YARD_Y + SEAT, FACE.yardOut, 'sit')])),
);
// along the booth seating of The 103, backs to the south wall, leaving out the stretch the speaker stands in
const SEATING_BAND = poly([-0.9, 37.6], [9, 39.7], [9, 40.9], [-0.9, 38.8]);
const SEATED_103 = spread(
  Array.from({ length: 18 }, (_, i) => -0.6 + i * 0.55)
    .filter((x) => x < 3 || x > 4.8)
    .map((x) => at(P(x + 0.02, 38 + ((x + 0.9) / 9.9) * 2.1 - 0.1), SEAT, Math.atan2(-0.207, -0.978), 'sit')),
);
// The Box: the crowd comes up to the desk on three sides
const BOX_FRONT = R(-28.1, 34.4, -22, 45.4);
const BOX_KEEP_OUT: Area[] = [BOX_DESK, poly(BOX_BOOTH_SIDES[0][0], BOX_BOOTH_SIDES[0][1], BOX_BOOTH_SIDES[1][1], BOX_BOOTH_SIDES[1][0]), DECK, ...BOX_STACKS.map((s) => R(...s))];
// four to a bench in The Lounge, facing down the tiers; and on The Loft's two sofas
const LOUNGE_SITTERS = spread(LOUNGE_BENCHES.flatMap((b) => Array.from({ length: 4 }, (_, i) => at(P(b.x0 + ((b.x1 - b.x0) * (i + 0.5)) / 4, b.back - 0.24), b.level + SEAT, FACE.south, 'sit'))));
const LOFT_SITTERS = spread([...[44.4, 45, 45.6, 46.2].map((i) => at(P(15.33, i), U + SEAT, FACE.east, 'sit')), ...[15.7, 16.3, 16.9, 17.5].map((r) => at(P(r, 48.78), U + SEAT, FACE.south, 'sit'))]);

const staff = (a: number, b: number, facing: number): Person => at(K(a, b), YARD_Y, facing, 'bouncer');
const crowds: CrowdSpec[] = [
  /* Gaunt Street: two lines of general admission to the right of the gate, the guest list to the left */
  { id: 'queue', kind: 'queue', path: [K(COURT.mainGate[1] + 1, -Q.fromBoundary), K(COURT.mainGate[1] + 1 + Q.generalLength, -Q.fromBoundary)], offset: 0.36, spacing: 0.75, start: 0.4, y: YARD_Y, seed: 7, look: 3, times: NIGHT, dress: DRESS.outside },
  { id: 'queue-2', kind: 'queue', path: [K(COURT.mainGate[1] + 1, -Q.fromBoundary), K(COURT.mainGate[1] + 1 + Q.generalLength, -Q.fromBoundary)], offset: -0.36, spacing: 0.8, start: 0.7, y: YARD_Y, seed: 8, look: 36, times: NIGHT, dress: DRESS.outside },
  { id: 'guest-list', kind: 'queue', path: [K(COURT.mainGate[0] - 1.9, -Q.fromBoundary - 0.3), K(COURT.mainGate[0] - 1 - Q.guestLength, -Q.fromBoundary - 0.3)], offset: 0, spacing: 0.9, start: 0.4, y: YARD_Y, seed: 9, look: 4, times: NIGHT, dress: DRESS.outside },
  {
    // four to six at the gate line and two at the building door (research 7.19), a host at the table, two at the search arches
    id: 'door-staff',
    kind: 'people',
    people: [
      staff(0.15, -1.15, FACE.yardLeft),
      staff(1.6, -0.6, FACE.yardOut),
      staff(6.15, -0.6, FACE.yardOut),
      staff(7.05, -1.4, FACE.yardRight),
      staff(4.5, 0.9, FACE.yardOut),
      at(K(GUESS.hostTable[0] - 0.4, (GUESS.hostTable[1] + GUESS.hostTable[3]) / 2), YARD_Y, FACE.yardRight, 'stand'),
      staff(1.45, FRONT - 0.8, FACE.yardOut),
      staff(3.75, FRONT - 0.8, FACE.yardOut),
      staff(1.55, ARCH_AT + 0.75, FACE.yardRight),
      staff(4.8, ARCH_AT + 0.55, FACE.yardLeft),
    ],
    look: 5,
    times: NIGHT,
    dress: DRESS.staff,
  },
  { id: 'courtyard', room: 'courtyard', kind: 'scatter', count: share(CAPACITY.courtyard, 0.9), rect: bounds(KR(4.9, 0.5, 22.4, 11.35)), within: KR(4.9, 0.5, 22.4, 11.35), avoid: YARD_KEEP_OUT, clear: 0.35, y: YARD_Y, behaviour: 'talk', seed: 21, gap: 0.62, look: 6, times: NIGHT, dress: DRESS.outside },
  { id: 'courtyard-seated', room: 'courtyard', kind: 'people', people: PICNIC_SITTERS, count: [10, 20, 30], look: 14, times: NIGHT, dress: DRESS.outside },
  { id: 'courtyard-bar-staff', room: 'courtyard', kind: 'people', people: [at(K(10.8, 3.5), YARD_Y, FACE.yardIn, 'stand'), at(K(13.6, 3.5), YARD_Y, FACE.yardIn, 'talk')], look: 15, times: NIGHT, dress: DRESS.staff },

  /* the way in */
  { id: 'tunnel', room: 'tunnel', kind: 'scatter', count: [3, 6, 9], rect: bounds(KR(4.3, 26, 5.3, 35.3)), within: KR(4.3, 26, 5.3, 35.3), y: 0.02, behaviour: 'talk', seed: 25, gap: 0.8, facing: FACE.yardRight, look: 16, times: NIGHT, dress: DRESS.inside },
  { id: 'box-office-staff', room: 'boxoffice', kind: 'people', people: [at(K(6.3, 23.1), 0.02, FACE.yardLeft, 'stand')], look: 17, times: NIGHT, dress: DRESS.staff },
  { id: 'cloakroom-staff', room: 'cloakroom', kind: 'people', people: [at(K(6.3, 31.4), 0.02, FACE.yardLeft, 'stand'), at(K(6.4, 34.2), 0.02, FACE.yardLeft, 'talk')], look: 18, times: NIGHT, dress: DRESS.staff },

  /* The 103: a floor of people facing the booth, two deep at the bar, along the walkway rail, on the seating */
  {
    id: 'the103',
    room: 'the103',
    kind: 'scatter',
    count: share(CAPACITY.the103, 0.7),
    rect: R(-8, 38.4, 10.9, 47),
    within: poly([-8, 36.3], [-1.5, 35.5], [9.5, 37.9], [11.2, 41.6], [11.2, 47], [-8, 47]),
    avoid: [R(BOOTH_103[0] - 0.4, BOOTH_103[1] - 0.4, BOOTH_103[2] + 0.4, BOOTH_103[3] + 0.5), R(3.4, 38.85, 4.4, 39.75), SEATING_BAND, R(-5.2, 38.8, -1.1, 40.4), R(6, 44.5, 10.1, 45.9), R(...GUESS.smallCounter), R(10, 41.3, 11.2, 42.9), R(10, 46.7, 11.2, 48.1), ...WALKWAY_COLUMNS.map((c): Rect => R(c[0] - 0.15, c[1] - 0.15, c[0] + 0.15, c[1] + 0.15))],
    clear: 0.3,
    y: 0.02,
    behaviour: 'dance',
    seed: 31,
    faceTo: P(1, 40.4),
    gap: 0.58,
    look: 7,
    times: NIGHT,
    dress: DRESS.inside,
  },
  { id: 'the103-bar', room: 'the103', kind: 'people', people: [...row(P(-6.3, 47.72), P(8.7, 47.72), 30, 0.02, FACE.north, 'talk'), ...row(P(-6, 47.15), P(8.4, 47.15), 28, 0.02, FACE.north, 'stand')], count: share(CAPACITY.the103, 0.105), look: 19, times: NIGHT, dress: DRESS.inside },
  { id: 'the103-walkway', room: 'the103', kind: 'scatter', count: share(CAPACITY.the103, 0.09), rect: R(1.2, 39, 10.7, 45.8), within: poly([1.2, 39.5], [10.6, 42.3], [10.6, 45.8], [10.25, 45.8], [10.25, 44.1], [7.3, 42.25], [1.2, 41.75]), y: U + 0.02, behaviour: 'talk', seed: 33, gap: 0.6, look: 20, times: NIGHT, dress: DRESS.inside },
  { id: 'the103-seated', room: 'the103', kind: 'people', people: SEATED_103, count: [8, 14, 18], look: 21, times: NIGHT, dress: DRESS.inside },
  { id: 'the103-dj', room: 'the103', kind: 'people', people: [at(P(1, 40.25), 0.02, FACE.north, 'dj')], headphones: true, look: 22, times: NIGHT, dress: DRESS.inside },
  { id: 'the103-bar-staff', room: 'the103', kind: 'people', people: row(P(-5.6, 49.25), P(8, 49.25), 5, 0.02, FACE.south, 'stand'), look: 23, times: NIGHT, dress: DRESS.staff },

  /* The Box: densest in the five metres in front of the booth, thinner round the sides, a few on the deck behind */
  {
    id: 'box-front',
    room: 'box',
    kind: 'scatter',
    count: share(CAPACITY.box, 0.6),
    rect: BOX_FRONT,
    avoid: BOX_KEEP_OUT,
    clear: 0.3,
    y: 0.02,
    behaviour: 'dance',
    seed: 41,
    faceTo: P(-30.3, 39.2),
    gap: 0.52,
    look: 8,
    armsUp: true,
    times: NIGHT,
    dress: DRESS.inside,
  },
  {
    id: 'box-floor',
    room: 'box',
    kind: 'scatter',
    count: share(CAPACITY.box, 0.37),
    rect: R(-34.5, 29.5, -16.9, 47.9),
    within: poly([-35, 47.9], [-19.6, 47.9], [-17.7, 46.6], [-17, 46.6], [-17, 37.9], [-16.2, 35.4], [-32, 29.6], [-35.1, 38]),
    avoid: [BOX_FRONT, ...BOX_KEEP_OUT, R(-20.4, 40, -16.7, 46.9), R(-19.6, 35.2, -15.8, 38.6), R(-35.3, 44.7, -25.6, 48.2), R(-24, 47.3, -22, 48.2)],
    clear: 0.3,
    y: 0.02,
    behaviour: 'dance',
    seed: 43,
    faceTo: P(-30.3, 39.2),
    gap: 0.6,
    look: 24,
    times: NIGHT,
    dress: DRESS.inside,
  },
  { id: 'box-deck', room: 'box', kind: 'scatter', count: share(CAPACITY.box, 0.03), rect: bounds(DECK), within: DECK, avoid: [...BOX_STACKS.map((s) => R(...s)), R(-35.3, 42.6, -34.2, 45), R(-34.5, 38.4, -32.5, 40.6), R(-34.1, 44.2, -32.7, 45)], clear: 0.35, y: GUESS.vipDeck + 0.02, behaviour: 'dance', seed: 45, faceTo: P(-24, 40), gap: 0.7, look: 25, times: NIGHT, dress: DRESS.inside },
  { id: 'box-dj', room: 'box', kind: 'people', people: [at(P(-29.86, 39.1), 0.02, FACE.east, 'dj')], headphones: true, look: 9, times: NIGHT, dress: DRESS.inside },
  { id: 'vip-balcony', room: 'vipbalcony', kind: 'scatter', count: share(CAPACITY.lounge, 0.2), rect: R(-35, 48.5, -20, 49.5), y: U + 0.02, behaviour: 'talk', seed: 47, facing: FACE.south, gap: 0.6, look: 26, times: NIGHT, dress: DRESS.inside },

  /* The Baby Box */
  { id: 'babybox', room: 'babybox', kind: 'scatter', count: share(CAPACITY.babybox), rect: R(15.5, 51.2, 21.9, 54.2), avoid: BABY_TRUSS.map((c): Rect => R(c[0] - 0.1, c[1] - 0.1, c[0] + 0.1, c[1] + 0.1)), clear: 0.25, y: 0.02, behaviour: 'dance', seed: 51, faceTo: P(18.3, 56), gap: 0.5, look: 10, times: NIGHT, dress: DRESS.inside },
  { id: 'babybox-dj', room: 'babybox', kind: 'people', people: [at(P(18.3, 55.9), 0.02, FACE.south, 'dj')], headphones: true, look: 11, times: NIGHT, dress: DRESS.inside },

  /* The Lounge: its capacity of 140 has 65 seats */
  { id: 'lounge-seated', room: 'lounge', kind: 'people', people: LOUNGE_SITTERS, count: [12, 20, 24], look: 27, times: NIGHT, dress: DRESS.inside },
  {
    id: 'lounge',
    room: 'lounge',
    kind: 'scatter',
    count: share(CAPACITY.lounge, 0.4),
    rect: R(-16.3, 40.9, -13, 47.2),
    // the open floor between the bar and the tiers, and the aisle along the windows
    within: poly([-16.3, 40.9], [-13, 41.75], [-13, 43.3], [-15.2, 43.3], [-15.2, 47.2], [-16.3, 47.2]),
    avoid: [R(GUESS.loungeColumn[0] - 0.3, GUESS.loungeColumn[1] - 0.3, GUESS.loungeColumn[0] + 0.3, GUESS.loungeColumn[1] + 0.3)],
    clear: 0.25,
    y: U + 0.02,
    behaviour: 'talk',
    seed: 61,
    gap: 0.62,
    look: 12,
    times: NIGHT,
    dress: DRESS.inside,
  },
  { id: 'lounge-bar', room: 'lounge', kind: 'people', people: row(P(-14.9, 40.05), P(-9.7, 41.45), 8, U + 0.02, Math.atan2(0.26, 0.97), 'talk'), count: [3, 6, 8], look: 28, times: NIGHT, dress: DRESS.inside },
  { id: 'lounge-bar-staff', room: 'lounge', kind: 'people', people: [at(P(-13.2, 38.85), U + 0.02, FACE.north, 'stand'), at(P(-9.84, 39.72), U + 0.02, FACE.north, 'stand')], look: 29, times: NIGHT, dress: DRESS.staff },

  /* The Loft */
  { id: 'loft', room: 'loft', kind: 'scatter', count: share(CAPACITY.loft, 0.68), rect: R(16.1, 42.2, 27.4, 47.1), within: poly([16.1, 42.2], [20.6, 42.2], [22, 43.4], [26.2, 45.9], [27.4, 47.1], [16.1, 47.1]), y: U + 0.02, behaviour: 'dance', seed: 71, faceTo: P(20, 48.4), gap: 0.58, look: 13, times: NIGHT, dress: DRESS.inside },
  { id: 'loft-bar', room: 'loft', kind: 'people', people: row(P(...loftWall(0.8, GUESS.loftBarAisle + 1.05)), P(...loftWall(7.2, GUESS.loftBarAisle + 1.05)), 12, U + 0.02, Math.atan2(0.683, 0.73), 'talk'), count: [5, 9, 12], look: 30, times: NIGHT, dress: DRESS.inside },
  { id: 'loft-seated', room: 'loft', kind: 'people', people: LOFT_SITTERS, count: [3, 6, 8], look: 31, times: NIGHT, dress: DRESS.inside },
  { id: 'loft-dj', room: 'loft', kind: 'people', people: [at(P(20, LOFT_BOOTH[3] + 0.45), U + 0.02, FACE.south, 'dj')], headphones: true, look: 32, times: NIGHT, dress: DRESS.inside },
  { id: 'loft-bar-staff', room: 'loft', kind: 'people', people: [at(P(...loftWall(2.5, 0.52)), U + 0.02, Math.atan2(-0.683, -0.73), 'stand'), at(P(...loftWall(5.5, 0.52)), U + 0.02, Math.atan2(-0.683, -0.73), 'stand')], look: 33, times: NIGHT, dress: DRESS.staff },

  /* behind the scenes */
  { id: 'arch80', room: 'arch80', kind: 'scatter', count: [3, 5, 7], rect: R(-37.4, 59.2, -32.4, 64.8), avoid: [R(...ARCH80.pool)], clear: 0.5, y: 0.02, behaviour: 'talk', seed: 81, gap: 0.8, look: 34, times: NIGHT, dress: DRESS.inside },
  { id: 'wc-w', room: 'wc-w', kind: 'scatter', count: [2, 4, 6], rect: R(-18.9, 52.2, -16, 56), y: 0.02, behaviour: 'talk', seed: 83, gap: 0.8, look: 35, times: NIGHT, dress: DRESS.inside },
];

/* ------------------------------------------------------------------ times ---- */
const times: TimeState[] = [
  {
    id: 'night',
    label: 'Saturday 01:30',
    night: true,
    sun: { azimuth: 200, elevation: 35, colour: '#9fb0d8', intensity: 0.25, indoors: false },
    hemi: { sky: '#46506c', ground: '#2a2420', intensity: 0.42, indoors: 0.16 },
    sky: { top: '#05060c', mid: '#14131d', horizon: '#5a3b2a', sun: '#000000' },
    fog: { colour: '#17161b', density: 0.0022 },
    env: { outdoors: 0.14, indoors: 0.05 },
    skylineOpacity: 1,
    windows: 1,
    lamps: 6,
    bloom: 0.55,
    outdoorLights: 1,
  },
  {
    id: 'day',
    label: 'Daytime, empty',
    night: false,
    sun: { azimuth: 205, elevation: 40, colour: '#fff3e0', intensity: 3, indoors: false },
    hemi: { sky: '#b9cde6', ground: '#6b6358', intensity: 1.1, indoors: 0.75 },
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
const bearing = (GEO.bearing * Math.PI) / 180;
const STREET_TEXT =
  'The tower across the street is Two Fifty One, 41 storeys. From 2009 to 2014 the club fought the plan for it, fearing that complaints about noise would cost it its licence. It was approved with sealed acoustic glazing and a deed protecting the club\u2019s existing noise.';
const ABOVE_TEXT =
  'The club lies between Gaunt Street and the Thameslink viaduct, and four of its rooms are arches under the railway. What the building was before 1991 is disputed: a bus garage, a car park, a tubing factory, a warehouse.';

export const plan: VenuePlan = {
  id: 'mos',
  // the map's x is east and z is south; the venue's x axis points along `right`
  frame: { centre: [0, 0], rotation: Math.atan2(Math.cos(bearing), Math.sin(bearing)) },
  rooms,
  links,
  stairs,
  platforms,
  ladders: [],
  obstacles,
  shells,
  lights,
  crowds,

  viewpoints: [
    { id: 'street', label: 'Gaunt St', title: 'Gaunt Street, the gate', text: TEXT.street, position: KV(6.5, -10.6, EYE), target: V(-3, 3, 7) },
    { id: 'courtyard', label: 'Courtyard', title: 'The Courtyard', text: TEXT.courtyard, position: KV(2.6, 2.2, EYE), target: KV(4.5, FRONT, 1.9) },
    { id: 'tunnel', label: 'Tunnel', title: 'The entrance tunnel', text: TEXT.tunnel, position: KV(3.2, 19.2, EYE), target: KV(3.2, TUNNEL.b1, 1.5) },
    { id: 'the103', label: 'The 103', title: 'The 103, the hub', text: TEXT.the103, position: V(-8.5, 37, EYE), target: V(3, 46, 3) },
    // in the passage, facing the warning sign beside the door to The Box
    { id: 'sign', label: 'The sign', title: 'A step before The Box', text: TEXT.sign, position: V(-14.3, 46.95, EYE), target: V(-16.28, 47.55, 1.6) },
    { id: 'box', label: 'The Box', title: 'The Box, main room', text: TEXT.box, position: V(-17.6, 36.9, EYE), target: V(-30.3, 39, 2) },
    { id: 'booth', label: 'Booth', title: 'Behind the booth', text: TEXT.booth, position: V(-33.5, 39.5, GUESS.vipDeck + EYE), target: V(-20, 42, 2.2) },
    { id: 'babybox', label: 'Baby Box', title: 'The Baby Box', text: TEXT.babybox, position: V(17.5, 50.2, EYE), target: V(18.3, 55.8, 1.5) },
    { id: 'lounge', label: 'The Lounge', title: 'The Lounge, upstairs', text: TEXT.lounge, position: V(-11.8, 43, U + EYE), target: V(-16.6, 43.4, U + 1.3) },
    { id: 'loft', label: 'The Loft', title: 'The Loft', text: TEXT.loft, position: V(16, 40.4, U + EYE), target: V(26, 47, U + 1.9) },
  ],
  // ten of them, on the keys 0 to 9: the street is 0, and the rooms keep the numbers they had
  firstViewKey: 0,
  startView: 'street',

  times,

  outdoors: {
    door: K((COURT.mainGate[0] + COURT.mainGate[1]) / 2, 0),
    audible: 45,
    // the room was built so that it could not be heard outside
    loudness: { far: 0, near: GUESS.loudness.street * 2, aerial: GUESS.loudness.street },
    track: null,
    street: { name: 'Elephant and Castle', music: 0, speed: 6, lightSets: ['street', 'courtyard'], caption: { title: 'Elephant and Castle', text: STREET_TEXT } },
    doorstep: { name: 'Gaunt Street', radius: 26, musicRadius: 6, music: 0.03, speed: 6, lightSets: ['street', 'courtyard'], caption: { title: 'Gaunt Street, the gate', text: TEXT.street } },
    aerial: { name: 'Above', above: 30, speed: 30, lightSets: ['street', 'courtyard'], caption: { title: 'Gaunt Street, from above', text: ABOVE_TEXT } },
    shadowFocus: [9, 0, 1],
    shadowReach: 110,
  },

  show: {
    bpm: GUESS.bpm,
    // at 126 BPM one flash a beat is 2.1 flashes a second
    strobe: { everyBars: 8, beats: 2, flashesPerBeat: 1, duty: 0.25 },
  },

  copy,
};
