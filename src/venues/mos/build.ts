import * as THREE from 'three';
import { buildBlockout, type Surface } from '../../engine/blockout';
import { pointInPolygon } from '../../engine/geom';
import type { BuildContext, Pt, VenueHooks } from '../../engine/types';
import { canvasTexture } from '../../engine/util';
import { buildVisibility } from '../../engine/visibility';
import crestUrl from './crest.webp';
import { dressArches } from './dress-arches';
import { dressBox } from './dress-box';
import { dressCourtyard, dressStreet } from './dress-exterior';
import { dress103, dressWayIn } from './dress-ground';
import { dressUpstairs } from './dress-upstairs';
import { makeKit } from './kit';
import { GUESS, HANGS_IN, P, SIGHT_LINES } from './plan';
import { makeFinishes, type Finishes, type Paint, type SurfaceOptions } from './textures';

/**
 * Ministry of Sound, dressed. The engine still draws the plan (rooms, doors, decks, the two
 * masses seen from outside), now in the finishes this file gives it and with each room in a
 * group of its own. The files beside this one add what a plan cannot say: the street and the
 * courtyard, and room by room the fixed things, the lights and the air.
 *
 * Rooms that cannot be seen from where the camera stands are not drawn, and nobody in them moves.
 */

/** The crest artwork is 1024 by 981 pixels: the club's own file, scaled down and cropped to its bounds. */
export const CREST_ASPECT = 1024 / 981;

/** A finish: a painting in a colour, a plain colour, or false for something a dressing file draws itself. */
type Finish = [Paint, string, SurfaceOptions?] | string | false;
interface RoomFinish {
  floor: Finish;
  walls: Finish;
  ceiling: Finish;
}

// The research's nominal colours (section 7.10). Its blacks are lifted a little, so that light can show what they are painted on.
const BLACK_BLOCK: Finish = ['block', '#161618', { relief: 0.6 }];
const BLACK_CEILING: Finish = '#0c0c0d';
const WAY_IN: RoomFinish = { floor: ['concrete', '#6f6a66', { relief: 0.5, rough: 0.7 }], walls: ['block', '#a8a39b', { relief: 0.8 }], ceiling: ['concrete', '#8a8580'] };
const BACK_OF_HOUSE: RoomFinish = { floor: ['concrete', '#4a4a4c', { relief: 0.5 }], walls: BLACK_BLOCK, ceiling: BLACK_CEILING };
const ARCH: RoomFinish = { floor: ['concrete', '#77726c', { relief: 0.5 }], walls: ['brick', '#8d7b64', { relief: 1 }], ceiling: ['brick', '#4a4a4c', { relief: 1 }] };
const ROOMS: Record<string, RoomFinish> = {
  // the courtyard's paving is laid on the courtyard's own grid, by the dressing
  courtyard: { floor: false, walls: false, ceiling: false },
  lobby: WAY_IN,
  tunnel: WAY_IN,
  boxoffice: { ...WAY_IN, walls: ['block', '#77726c', { relief: 0.8 }] },
  cloakroom: { ...WAY_IN, walls: ['block', '#77726c', { relief: 0.8 }] },
  // a dark floor with a shine on it, under black walls
  the103: { floor: ['concrete', '#2c2428', { rough: 0.32, metal: 0.15, relief: 0.25 }], walls: ['block', '#1b1b1e', { relief: 0.6 }], ceiling: BLACK_CEILING },
  tunnel1: { floor: ['boards', '#2a1a12', { relief: 0.6 }], walls: BLACK_BLOCK, ceiling: BLACK_CEILING },
  tunnel2: { floor: ['boards', '#2a1a12', { relief: 0.6 }], walls: BLACK_BLOCK, ceiling: BLACK_CEILING },
  techroom: { floor: ['concrete', '#4a4a4c'], walls: ['block', '#77726c', { relief: 0.8 }], ceiling: '#5a5a5c' },
  // The Box: black, matt to satin; the floor drawn as timber strips (see GUESS.boxFloorStrip)
  box: { floor: ['boards', '#141416', { rough: 0.55, relief: 0.4, scale: GUESS.boxFloorStrip / 0.1 }], walls: ['block', '#131315', { relief: 0.35 }], ceiling: '#0a0a0b' },
  boxcorridor: BACK_OF_HOUSE,
  arch80: { floor: ['concrete', '#9a958e', { relief: 0.5 }], walls: ['brick', '#8a6a54', { relief: 1 }], ceiling: ['brick', '#8a6a54', { relief: 1 }] },
  'wc-w': ARCH,
  loadin: ARCH,
  babylobby: { floor: ['concrete', '#3a3a3c', { relief: 0.4 }], walls: BLACK_BLOCK, ceiling: BLACK_CEILING },
  // stock brick under a ribbed black lining
  babybox: { floor: ['concrete', '#bfb9a1', { relief: 0.5 }], walls: ['brick', '#a58c66', { relief: 1 }], ceiling: ['ribbed', '#1d1a1c', { turn: true, scale: 1.6, relief: 0.8, rough: 0.6 }] },
  'wc-m': { floor: ['concrete', '#77726c'], walls: ['block', '#8a8a8c', { relief: 0.8 }], ceiling: '#5a5a5c' },
  lounge: { floor: ['boards', '#34302e', { relief: 0.5, rough: 0.6 }], walls: '#1a191b', ceiling: '#101012' },
  vipbalcony: { floor: ['boards', '#1c1a1a', { relief: 0.5 }], walls: BLACK_BLOCK, ceiling: BLACK_CEILING },
  greenroom: { floor: ['boards', '#34302e'], walls: ['concrete', '#6f6a66'], ceiling: '#2a2a2c' },
  backstair: BACK_OF_HOUSE,
  loft: { floor: ['boards', '#3a2a20', { relief: 0.6, rough: 0.6 }], walls: ['block', '#19191c', { relief: 0.6 }], ceiling: '#0f0f11' },
};

const same = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.06;
const isEdge = (edge: [Pt, Pt] | undefined, a: Pt, b: Pt) => !!edge && ((same(edge[0], a) && same(edge[1], b)) || (same(edge[0], b) && same(edge[1], a)));

function finishes(fin: Finishes) {
  const use = (f: Finish) => (f === false ? false : typeof f === 'string' ? fin.plain(f) : fin.surface(f[0], f[1], f[2]));
  const steel = fin.plain('#19191c', { rough: 0.5, metal: 0.6 });
  // the stairs drawn as open steel flights by the dressing
  const openStairs = ['stair-a', 'stair-b', 'box-north', 'gantry-steps', 'back-stair'];
  const wayIn = ['courtyard-lobby', 'lobby-tunnel', 'tunnel-103'];
  return (s: Surface): THREE.Material | false | undefined => {
    switch (s.kind) {
      case 'floor':
      case 'ceiling':
        return s.room && ROOMS[s.room] ? use(ROOMS[s.room][s.kind]) : undefined;
      case 'walls':
        // The Lounge's bar stands against a concrete-look wall, on the south side
        if (s.room === 'lounge' && isEdge(s.edge, P(-16.65, 37.6), P(-5.1, 40.7))) return fin.surface('concrete', '#8b8985', { relief: 0.5 });
        return s.room && ROOMS[s.room] ? use(ROOMS[s.room].walls) : undefined;
      case 'link':
        return fin.surface('concrete', wayIn.includes(s.id ?? '') ? '#6f6a66' : '#232325', { relief: 0.4 });
      case 'reveal':
        return fin.plain(wayIn.includes(s.id ?? '') ? '#1c1c1f' : '#0e0e10');
      case 'stair':
        return openStairs.includes(s.id ?? '') ? false : fin.surface('boards', '#141416', { relief: 0.6 });
      case 'platform':
        if (s.id === 'vip-deck') return fin.surface('boards', '#141416', { rough: 0.55, relief: 0.4 });
        if (s.id?.startsWith('lounge-tier')) return fin.surface('boards', '#2b2725', { relief: 0.5, rough: 0.6 });
        return steel;
      case 'obstacle':
        if (s.id === 'hedge') return fin.surface('hedge', '#5d8a47', { relief: 1.2 });
        if (s.id?.startsWith('boundary')) return fin.surface('ribbed', '#17171a', { turn: true, scale: 0.6, relief: 0.6, rough: 0.6, metal: 0.3 });
        if (s.id === 'left wall under the overhang') return fin.surface('block', s.colour, { relief: 0.7 });
        if (s.id === 'overhang pier') return fin.surface('concrete', '#242226', { relief: 0.4 });
        if (s.id === 'Baby Box column') return fin.plain('#111113', { rough: 0.6 });
        return s.id?.includes('column') || s.id?.includes('leg') ? fin.plain(s.colour, { rough: 0.45, metal: 0.7 }) : undefined;
      case 'shell':
        // the black single-storey front, and the brick mass behind it
        return s.id === 'front' ? fin.surface('block', '#1d1c1f', { relief: 0.6 }) : fin.surface('brick', s.colour, { relief: 1 });
    }
  };
}

/** The crest, drawn into a canvas when the file arrives, so that it is halved on the phone level with the rest. */
function loadCrest() {
  const texture = canvasTexture(1024, 981, (c, w, h) => c.clearRect(0, 0, w, h));
  texture.anisotropy = 8;
  const image = new Image();
  image.onload = () => {
    const canvas = texture.image as HTMLCanvasElement;
    const c = canvas.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(image, 0, 0, canvas.width, canvas.height);
    texture.needsUpdate = true;
  };
  image.src = crestUrl;
  return texture;
}

export function build(ctx: BuildContext): VenueHooks {
  const fin = makeFinishes(ctx.quality);
  const blockout = buildBlockout(ctx, { doorHeight: GUESS.doorHeight, byRoom: true, finish: finishes(fin) });
  const { kit, finish, update, setTime } = makeKit(ctx, fin, blockout, loadCrest());

  /** The neighbours and the projection: seen only from out of doors, like the shells. */
  const outside = dressStreet(kit);
  dressCourtyard(kit);
  dressWayIn(kit);
  dress103(kit);
  dressBox(kit);
  dressArches(kit);
  dressUpstairs(kit);
  finish();

  // everybody stands in the group of their room, and is hidden with it
  for (const crowd of ctx.populate()) {
    const room = crowd.mesh.userData.room as string | undefined;
    if (room) blockout.rooms.get(room)?.add(crowd.mesh);
  }
  kit.rig = ctx.light();

  const visibility = buildVisibility(ctx.plan, { windows: SIGHT_LINES, sees: HANGS_IN });
  const shells = ctx.plan.shells.map((s) => ({ outline: s.frame === 'world' ? s.outline.map(([x, z]) => ctx.frame.localXZ(x, z)) : s.outline, height: s.height }));
  let shown: ReadonlySet<string> | null = null;
  let night = true;
  // ?cull=0 draws every room all the time, to check that the culling hides nothing that is in view
  const cull = new URLSearchParams(location.search).get('cull') !== '0';

  return {
    update(f) {
      const { zone, camera } = f;
      blockout.update(zone);
      outside.visible = !zone.inside || !!zone.showCity;
      const [x, z] = ctx.frame.localXZ(camera.position.x, camera.position.z);
      // between two rooms, inside a wall (a flight from one viewpoint to the next goes through them), what was drawn stays
      const inWall = !zone.room && shells.some((s) => camera.position.y < s.height && pointInPolygon(x, z, s.outline));
      if (cull && (!inWall || !shown)) {
        const set = visibility.from(zone.room, x, z);
        if (set !== shown) {
          shown = set;
          for (const [id, group] of blockout.rooms) group.visible = set.has(id);
        }
      }
      update(f, night);
    },
    setTime(time) {
      // the fittings follow whether the club is open, not what the light is
      night = time.open;
      setTime(night);
    },
  };
}
