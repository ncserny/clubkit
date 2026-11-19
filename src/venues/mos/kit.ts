import * as THREE from 'three';
import type { Blockout } from '../../engine/blockout';
import type { Batch } from '../../engine/geom';
import type { LightRig } from '../../engine/lights';
import type { Quality } from '../../engine/quality';
import type { BuildContext, FrameState, Pt, Stair } from '../../engine/types';
import * as K from '../../kit';
import type { Beam, Stage } from '../../kit';
import { K as yardPoint, YARD } from './plan';
import type { Finishes } from './textures';

/**
 * What the files that dress the venue share: a stage (see kit/stage.ts) for every room, so
 * that a room's dressing is hidden with the room, and the components from the kit on the two
 * grids this venue is laid out on.
 *
 * Everything here is given on a grid, as (right, in) on the site grid or (along, in) on the
 * courtyard's. Both become x = first, z = -second in the group they are drawn into; the
 * wrappers below turn grid points into the stage's [x, z] and hand them to the kit.
 */

export type G2 = [number, number];
export type { Beam };
type Animate = (f: FrameState, night: boolean) => void;

export interface Kit {
  ctx: BuildContext;
  Q: Quality;
  fin: Finishes;
  crest: THREE.Texture;
  /** The plan's lights, once they are built: for a room that animates its own. */
  rig: LightRig | null;
  /** Geometry in a room, on the site grid. */
  site(room: string): Batch;
  /** Geometry in a room, on the courtyard grid. */
  yard(room: string): Batch;
  /** The group of a room on either grid, for a mesh of its own (a sign, an instanced thing, a beam). */
  siteGroup(room: string): THREE.Group;
  yardGroup(room: string): THREE.Group;
  /** A room as a kit stage, on the site grid: for the kit's components. */
  stage(room: string): Stage;
  /** Called every frame while the venue is drawn, and when the time of day changes. */
  animate(fn: Animate): void;
  onTime(fn: (night: boolean) => void): void;
  /** A cone of lit haze from a fixture, in a room. Returned so that it can be swung about. */
  beam(room: string, at: THREE.Vector3, colour: string, radius: number, length: number): Beam;
  /** Dust in the air of a room, on the detail levels that have it. */
  dust(room: string, seed: number, count: number, x: G2, y: G2, z: G2, glow: number, tint?: string): void;
}

export interface KitHandle {
  kit: Kit;
  /** Merge everything added so far into the rooms' groups. */
  finish(): void;
  update(f: FrameState, night: boolean): void;
  setTime(night: boolean): void;
}

export function makeKit(ctx: BuildContext, fin: Finishes, blockout: Blockout, crest: THREE.Texture): KitHandle {
  const stages = K.makeStages(ctx.quality, fin);
  const siteStages = new Map<string, Stage>();
  const yardStages = new Map<string, Stage>();
  const yardGroups = new Map<string, THREE.Group>();

  const siteGroup = (room: string) => {
    const g = blockout.rooms.get(room);
    if (!g) throw new Error(`no room ${room}`);
    return g;
  };
  const yardGroup = (room: string) => {
    let g = yardGroups.get(room);
    if (!g) {
      g = new THREE.Group();
      const [ox, oz] = yardPoint(0, 0);
      g.position.set(ox, 0, oz);
      g.rotation.y = (YARD.turn * Math.PI) / 180;
      siteGroup(room).add(g);
      yardGroups.set(room, g);
    }
    return g;
  };
  const stageIn = (map: Map<string, Stage>, room: string, group: () => THREE.Group) => {
    let s = map.get(room);
    if (!s) map.set(room, (s = stages.stage(group())));
    return s;
  };
  const siteStage = (room: string) => stageIn(siteStages, room, () => siteGroup(room));

  const kit: Kit = {
    ctx,
    Q: ctx.quality,
    fin,
    crest,
    rig: null,
    site: (room) => siteStage(room).batch,
    yard: (room) => stageIn(yardStages, room, () => yardGroup(room)).batch,
    siteGroup,
    yardGroup,
    stage: siteStage,
    animate: stages.animate,
    onTime: stages.onTime,
    beam: (room, at, colour, radius, length) => siteStage(room).beam(at, colour, radius, length),
    dust: (room, seed, count, x, y, z, glow, tint) => siteStage(room).dust(seed, count, x, y, z, glow, tint),
  };

  return {
    kit,
    finish: () => stages.finish(),
    update: (f, night) => stages.update(f, night),
    setTime: (night) => stages.setTime(night),
  };
}

/** A number from 0 to 1 that is always the same for the same k: for things that should look scattered. */
export const rnd = K.rnd;

/** One of the plan's flights of stairs. */
export function stairOf(kit: Kit, id: string): Stair {
  const s = kit.ctx.plan.stairs.find((x) => x.id === id);
  if (!s) throw new Error(`no stair ${id}`);
  return s;
}

/* ---------------------------------------------------- the kit, on the grids ---- */

/** A grid point as the stage's [x, z]. */
const g = ([r, i]: G2): Pt => [r, -i];

/** A box on a grid, between two heights. UVs in metres. */
export const B = (r0: number, i0: number, r1: number, i1: number, y0: number, y1: number) => K.box(r0, -i0, r1, -i1, y0, y1);
/** A box lying along a line on a grid: from a to b, `width` across, between two heights. */
export const along = (a: G2, b: G2, width: number, y0: number, y1: number) => K.along(g(a), g(b), width, y0, y1);
/** An upright cylinder on a grid. */
export const cyl = (r: number, i: number, radius: number, y0: number, y1: number, sides = 12) => K.cyl(r, -i, radius, y0, y1, sides);
/** A tube between two points in space (x, y, z of the group it is drawn into). */
export const tube = K.tube;
export const V3 = (r: number, y: number, i: number) => new THREE.Vector3(r, y, -i);
/** An upright flat panel on a grid from a to b, between two heights, UVs 0 to 1 across it or in metres. */
export const panel = (a: G2, b: G2, y0: number, y1: number, metres = false) => K.panel(g(a), g(b), y0, y1, metres);
/** A flat panel in space from its four corners, in order round it, with UVs 0 to 1 or scaled. */
export const quad4 = K.quad4;
/** A level rectangle on a grid at a height, UVs 0 to 1. Faces up. */
export const flat = (r0: number, i0: number, r1: number, i1: number, y: number) => quad4([V3(r0, y, i0), V3(r1, y, i0), V3(r1, y, i1), V3(r0, y, i1)]);

/** A handrail on balusters along a line of points on a grid, standing on `level`. */
export const railing = (batch: Batch, steel: THREE.Material, pts: G2[], level: number, height = 1.1, every = 0.14) => K.railing(batch, steel, pts.map(g), level, height, every);
/** A square truss standing upright on a grid. */
export const trussLeg = (batch: Batch, mat: THREE.Material, r: number, i: number, y0: number, y1: number, half = 0.14) => K.trussLeg(batch, mat, r, -i, y0, y1, half);
/** A square truss lying level between two points on a grid. */
export const trussRun = (batch: Batch, mat: THREE.Material, a: G2, b: G2, y: number, half = 0.14) => K.trussRun(batch, mat, g(a), g(b), y, half);
/** A steel stair with open treads, drawn from the plan's flight. */
export const openStair = K.openStair;
/** A sofa on a grid: a seat, a back along one side, arms at the ends. `back` says which side of the grid the back is on. */
export function sofa(batch: Batch, cloth: THREE.Material, r0: number, i0: number, r1: number, i1: number, y: number, back: 'n' | 's' | 'e' | 'w') {
  K.sofa(batch, cloth, r0, -i1, r1, -i0, y, ({ n: '-z', s: '+z', w: '-x', e: '+x' } as const)[back]);
}
/** A row of bottles on a shelf: on the detail levels that have small props. */
export const bottles = (kit: Kit, batch: Batch, a: G2, b: G2, y: number, every = 0.11, seed = 1) => K.bottles({ quality: kit.Q, mats: kit.fin }, batch, g(a), g(b), y, every, seed);
/** What an LED wall is drawn with. `pitch` is metres per tile of the picture. */
export const ledScreen = (fin: Finishes, colour: string, pitch = 1) => K.ledScreen(fin, colour, pitch);
export const swirlScreen = K.swirlScreen;
/** Screens that drift through a band of hues at night and hold a dim grey by day. */
export const playScreens = (kit: Kit, screens: THREE.MeshBasicMaterial[], hue: number, range: number, level = 0.4) => K.playScreens(kit, screens, hue, range, level);
/** Moving lights hung in a room; each spot is right, in, height of the clamp. */
export function movingHeads(kit: Kit, room: string, spots: [number, number, number][], colours: string[], o: Parameters<typeof K.movingHeads>[3]) {
  K.movingHeads(kit.stage(room), spots.map(([r, i, y]) => [r, y, -i] as [number, number, number]), colours, o);
}
/** The two leaves of a double door standing open, flat against the wall either side of it. */
export const openLeaves = (batch: Batch, mat: THREE.Material, a: G2, b: G2, out: 1 | -1, y0: number, height: number) => K.openLeaves(batch, mat, g(a), g(b), out, y0, height);
/** A loudspeaker cabinet, or a stack of them, on a grid, with grilles on the side asked for (and the one opposite). */
export const cabinet = (batch: Batch, fin: Finishes, r0: number, i0: number, r1: number, i1: number, y0: number, y1: number, faces: 'ns' | 'ew') => K.speakerCabinet(batch, fin, r0, -i1, r1, -i0, y0, y1, faces);
/** A mirror ball: faceted, bright where it catches the light. */
export const mirrorBall = K.mirrorBallGeometry;
