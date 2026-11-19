import type * as THREE from 'three';
import type { Behaviour, Crowd, Dress, Person } from './people';
import type { Level, Quality } from './quality';
import type { VenueFrame } from './frame';
import type { LightRig } from './lights';
import type { MapData } from './city';

/**
 * What a venue is, as data. The engine knows nothing about any one club: it is
 * handed a plan (rooms, links, stairs, obstacles, lights, crowds, viewpoints,
 * times of day, words) and a build function that dresses it.
 *
 * Coordinates are metres. Unless a thing says `frame: 'world'` it is in the
 * venue's own frame (see frame.ts): x and z on the floor, y up.
 */

export type Pt = [x: number, z: number];
export type Vec3 = [x: number, y: number, z: number];
/** An axis-aligned rectangle: x0, z0, x1, z1 with x0 < x1 and z0 < z1. */
export type Rect = [x0: number, z0: number, x1: number, z1: number];
/** A rectangle, or the corners of a polygon in order. */
export type Area = Rect | Pt[];
export type FrameName = 'venue' | 'world';
/** One number per detail level: lite, balanced, ultra. */
export type ByLevel = [lite: number, balanced: number, ultra: number];

export interface Caption {
  title: string;
  text: string;
}

/**
 * The loops `audio.ts` can play: `techno` hits hardest, `house` is the softer one with chords,
 * `beat` is a standard house beat with drums and bass only, and `dnb` is drum and bass at 160
 * beats a minute whatever the venue's tempo.
 */
export type TrackId = 'techno' | 'house' | 'beat' | 'dnb';

/** How a place looks and sounds while the camera is in it. */
export interface ZoneSettings {
  /** Under a roof: no sun or moon at night, the city is not drawn, interior haze and exposure apply. */
  inside: boolean;
  /** 0 = only the low end gets through the walls, 1 = on the dancefloor. */
  music: number;
  loudness: number;
  /** Which loop is heard here; `null` where no music carries. `techno` if left out. */
  track?: TrackId | null;
  exposure?: number;
  /** Walking speed in metres a second. */
  speed?: number;
  /** Fog density indoors; a record gives one per time of day, with `default` for the rest. */
  haze?: number | Record<string, number>;
  /** Fog colour indoors. */
  fog?: string;
  /** Keep drawing the city from in here (a room with windows). */
  showCity?: boolean;
  /** Which sets of lights are switched on. A surface pays for every light that is on, so each place names only what reaches it. */
  lightSets: string[];
  /** How much of the echo is heard here: 0 for a dead room, 1 for a long tail. The engine's own level if left out. */
  echo?: number;
}

/** A zone as the engine hands it out: the settings plus where they came from. */
export interface Zone extends ZoneSettings {
  /** Room id, or 'street', 'doorstep', 'aerial'. */
  id: string;
  name: string;
  /** The room, if this is one. */
  room: string | null;
  caption?: Caption;
}

export interface Room {
  id: string;
  name: string;
  /** Floor level. */
  level: number;
  /** Floor to ceiling. The room's volume, which decides the zone, runs from level to level + height. */
  height: number;
  /** The floor outline, to the inner faces of the walls. */
  areas: Area[];
  /** False for a volume that only sets a zone: its floor comes from a stair or another room. */
  floor?: false;
  /** Open to the ground outside (a yard): walked into from anywhere that is not walled off. */
  open?: boolean;
  /** Extra volume that belongs to this room, for the zone only (the air over a stair well, say). */
  also?: { area: Area; y0: number; y1: number }[];
  zone: ZoneSettings;
  caption?: Caption;
  /** The rest is for drawing the room as a block (blockout.ts); walking and zones do not read it. */
  /** Open to the sky: no ceiling. */
  sky?: boolean;
  /** How high the walls are drawn, if not to the ceiling. 0 for none: something else stands there. */
  wallHeight?: number;
  /** A barrel vault instead of a flat ceiling: the walls stop at `springing` above the floor, the crown is at the room's height, and the vault runs along this axis of the venue frame. */
  vault?: { springing: number; along: 'x' | 'z' };
  /**
   * Stretches of wall that are open above a sill: a balcony edge, a window into the next room. Heights above the room's floor.
   * `bare` leaves the wall below the sill undrawn as well, for a venue that puts a railing there.
   */
  openings?: { line: [Pt, Pt]; sill: number; head?: number; bare?: boolean }[];
  colours?: { floor?: string; walls?: string; ceiling?: string };
}

/** A way through a wall. The only way from one room to another is across a link or a stair. */
export interface Link {
  id: string;
  /** Room ids, or 'outside'. */
  from: string;
  to: string;
  /** The floor of the opening: through the thickness of the wall, and at least a body's radius deep. */
  area: Area;
  level: number;
  /** Clear height of the opening. */
  height?: number;
}

export interface Stair {
  id: string;
  from: string;
  to: string;
  area: Area;
  /** The line the stair climbs along, and the floor height at each end of it. */
  line: [Pt, Pt];
  y: [number, number];
}

/** A raised floor inside a room: a podium, a gallery, a deck. */
export interface Platform {
  id: string;
  room: string;
  area: Area;
  level: number;
}

export interface Ladder {
  id: string;
  /** Where the ladder stands. */
  at: Pt;
  /** Standing inside this rectangle you can take hold of it. */
  reach: Rect;
  bottom: number;
  top: number;
  /** Unit vector on the floor from the climber to the wall the ladder is fixed to. */
  toward: Pt;
}

/** Something you cannot walk through. One of rect, circle, path or poly. */
export interface Obstacle {
  label?: string;
  frame?: FrameName;
  y0: number;
  y1: number;
  rect?: Rect;
  circle?: [x: number, z: number, r: number];
  /** A wall, fence or rail along a line, `width` thick. */
  path?: Pt[];
  width?: number;
  closed?: boolean;
  poly?: Pt[];
  /** For a block model: the colour it is drawn in, or false if the venue draws it itself. */
  draw?: string | false;
}

/** A solid mass seen from outside: it stops anyone on the ground or in the air below its top. */
export interface Shell {
  id: string;
  outline: Pt[];
  height: number;
  frame?: FrameName;
  colour?: string;
}

export interface LightSpec {
  id?: string;
  /** The set it is switched with. */
  set: string;
  type: 'point' | 'spot';
  at: Vec3;
  target?: Vec3;
  colour: string;
  intensity: number;
  range: number;
  decay: number;
  angle?: number;
  penumbra?: number;
  /** Casts shadows on the detail levels that have interior shadows. */
  shadow?: boolean;
  /** Only exists on the detail levels that have interior shadows. */
  shadowLevelsOnly?: boolean;
  /** Dimmed by the time of day's outdoorLights factor. */
  outdoor?: boolean;
  frame?: FrameName;
}

interface CrowdBase {
  id?: string;
  frame?: FrameName;
  /** Seed for looks: skin, hair, clothes, phase. */
  look?: number;
  armsUp?: boolean;
  /** The DJ wears headphones. Only for an entry that is a DJ on their own; it does nothing for anyone else. */
  headphones?: boolean;
  /** Only there at these times of day (ids from the plan's times). Always, if left out. */
  times?: string[];
  /** What they wear. The engine's own wardrobe (black, mostly) if left out. */
  dress?: Dress;
  /** The room they stand in, for a venue that hides the rooms that cannot be seen. */
  room?: string;
}
export type CrowdSpec =
  | (CrowdBase & {
      kind: 'scatter';
      count: number | ByLevel;
      rect: Rect;
      y: number;
      behaviour: Behaviour;
      seed: number;
      /** Everyone turns roughly to this point. */
      faceTo?: Pt;
      /** Or everyone faces this way. */
      facing?: number;
      gap?: number;
      /** Nobody stands outside this outline, */
      within?: Pt[];
      /** or inside, or within `clear` metres of, any of these. */
      avoid?: Area[];
      clear?: number;
    })
  | (CrowdBase & {
      kind: 'people';
      people: Person[];
      /** Only the first so many of them, per detail level. All of them if left out. */
      count?: ByLevel;
    })
  | (CrowdBase & {
      /** A line of people along a path, with a few gaps. */
      kind: 'queue';
      path: Pt[];
      offset: number;
      spacing: number;
      start: number;
      y: number;
      seed: number;
      /** People who are not in the line but belong to it: door staff. */
      staff?: Person[];
    });

export interface Viewpoint {
  id: string;
  label: string;
  title: string;
  text: string;
  position: Vec3;
  target: Vec3;
  frame?: FrameName;
}

export interface TimeState {
  id: string;
  /** What the button says while this time is showing. */
  label: string;
  /** Moon and stars, lit windows, street lamps, the night skyline. */
  night: boolean;
  /** The sun, or at night the moon: compass azimuth (degrees from north, clockwise) and elevation. */
  sun: { azimuth: number; elevation: number; colour: string; intensity: number; indoors: boolean };
  hemi: { sky: string; ground: string; intensity: number; indoors: number };
  sky: { top: string; mid: string; horizon: string; sun: string };
  fog: { colour: string; density: number };
  env: { outdoors: number; indoors: number };
  skylineOpacity: number;
  /** Emissive strength of lit windows and of street lamp heads. */
  windows: number;
  lamps: number;
  /** Bloom strength outdoors. */
  bloom: number;
  /** Factor on lights marked `outdoor`. */
  outdoorLights: number;
}

export interface OutdoorZone {
  music: number;
  speed: number;
  lightSets: string[];
  caption?: Caption;
}

export interface Outdoors {
  /** The music is heard from here: distance to this point sets how loud it is outside. */
  door: Pt;
  /** Metres at which the club can no longer be heard. */
  audible: number;
  /** How loud it is out of doors: at that distance, at the door, and at the door seen from the air. Default 0.15, 0.7, 0.4. */
  loudness?: { far: number; near: number; aerial: number };
  /** Which loop is heard on the street, at the door and from the air; `null` if the building lets none out. `techno` if left out. */
  track?: TrackId | null;
  street: OutdoorZone & { name: string };
  doorstep: OutdoorZone & { name: string; radius: number; musicRadius: number };
  aerial: { name: string; above: number; speed: number; lightSets: string[]; caption?: Caption };
  /**
   * Ground that is not there: a canal, a sunken quay, a cutting. Nobody walks off the street into
   * it, and the city draws no ground, road, rail, tree, lamp or building in it: the venue draws
   * what is down there, and its rooms (open ones for a quay) are the only floor. A walker gets in
   * and out by a stair from `outside`. Someone flying stays above street level over it.
   */
  cut?: { area: Area; frame?: FrameName }[];
  /** Parts of a cut that are bridged at street level: the ground is there again, to walk on. */
  decks?: { area: Area; frame?: FrameName }[];
  /** Where the sun's shadow map is centred, in world coordinates, and how far it reaches. */
  shadowFocus: Vec3;
  shadowReach: number;
}

export interface Show {
  /** The venue's tempo. A place that hears a loop with a tempo of its own (`dnb`) runs its lights and its crowd at that. */
  bpm: number;
  /** The strobe runs for the last `beats` beats of every `everyBars`-th bar, at most `flashesPerBeat` flashes a beat. */
  strobe: { everyBars: number; beats: number; flashesPerBeat: number; duty: number };
}

export interface Copy {
  /** Short name, used in the header, the intro and the loader. */
  name: string;
  address: string;
  documentTitle: string;
  canvasLabel: string;
  kicker: string;
  intro: string;
  start: string;
  hintKeys: string;
  hintTouch: string;
  /** HTML. */
  credit: string;
  aboutHeading: string;
  /** HTML blocks. */
  about: string[];
  infoTitle: string;
  infoMeta: string;
  /** HTML paragraphs. */
  info: string[];
  /** HTML. Says who the model is not affiliated with. */
  infoFoot: string;
  loaderNote: string;
  loading: { map: string; venue: string; lights: string; warm: string; open: string };
  fallbackTitle: string;
  fallbackText: string;
  noscript: string;
}

export interface VenuePlan {
  id: string;
  /** Where the venue frame sits in the world: its origin, and its rotation about the vertical. */
  frame: { centre: Pt; rotation: number };
  /** Rooms in order of priority: where two volumes overlap, the first wins. */
  rooms: Room[];
  links: Link[];
  stairs: Stair[];
  platforms: Platform[];
  ladders: Ladder[];
  obstacles: Obstacle[];
  shells: Shell[];
  lights: LightSpec[];
  crowds: CrowdSpec[];
  viewpoints: Viewpoint[];
  /** The number key of the first viewpoint; the rest follow in order. 1 if left out. A venue with ten viewpoints counts from 0. */
  firstViewKey?: 0 | 1;
  /** The view the intro's button flies to. */
  startView: string;
  times: TimeState[];
  outdoors: Outdoors;
  show: Show;
  copy: Copy;
}

/** What the engine tells a venue each frame. */
export interface FrameState {
  dt: number;
  t: number;
  beat: number;
  bar: number;
  /** 1 on the beat, falling to 0 before the next. */
  pulse: number;
  /** 1 while the strobe is lit. */
  strobe: number;
  zone: Zone;
  time: TimeState;
  camera: THREE.Camera;
}

export interface BuildContext {
  plan: VenuePlan;
  frame: VenueFrame;
  quality: Quality;
  coarse: boolean;
  map: MapData;
  /** World frame. */
  root: THREE.Group;
  /** Venue frame. */
  group: THREE.Group;
  /**
   * Put the plan's crowds, or its lights, into the scene now. A build calls these where it
   * wants them in the drawing order; if it does not, the engine adds them when it returns.
   */
  populate(): Crowd[];
  light(): LightRig;
}

export interface VenueHooks {
  update?(state: FrameState): void;
  setTime?(time: TimeState, instant: boolean): void;
}

/** Where trees may not stand, extra trees, and the things only this neighbourhood has. */
export interface Surroundings {
  /** Buildings the venue draws itself: left out of the generic city. */
  own: number[];
  /** Of those, the ones the plan's shells stand in for when it comes to walking into them. */
  venueIds: number[];
  clear?(x: number, z: number): boolean;
  trees?: { x: number; z: number }[];
  /** Scrub trees scattered round a point, and a few placed by hand. */
  scatterTrees?: { count: number; centre: Pt; near: number; spread: number; clearOfBuildings: number };
  placedTrees?: Pt[];
  /** Nothing the city scatters (trees, lamp posts) stands where this says so. */
  keepClear?(x: number, z: number): boolean;
  /** False for no trees along the roads. */
  streetTrees?: boolean;
  /** Metres from one tree to the next along a road; 11 if left out. */
  streetTreeSpacing?: number;
  /** The open ground is paving, not scrub. */
  paved?: boolean;
  /** Railway lines the map marks as bridges run on a viaduct: a mass `width` wide under each track, up to `level`. */
  viaduct?: { level: number; width: number; colour: string };
  extras?: import('./city').CityExtras;
}

export interface VenueModule {
  plan: VenuePlan;
  map: MapData;
  surroundings: Surroundings;
  build(ctx: BuildContext): VenueHooks;
  /** Painted textures are made at this fraction of their size on a detail level; full size where a level is left out. */
  textureScale?: Partial<Record<Level, number>>;
}
