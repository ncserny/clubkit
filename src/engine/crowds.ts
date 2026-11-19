import type * as THREE from 'three';
import { along, offsetPath, pointInPolygon } from './geom';
import { shapeDistance, toShape } from './nav';
import { Crowd, scatter, type Dress, type Person } from './people';
import type { Quality } from './quality';
import { rng } from './util';
import type { CrowdSpec } from './types';

const LEVELS = ['lite', 'balanced', 'ultra'] as const;

/** The plan's crowds, in the order they are listed. */
export function buildCrowds(specs: CrowdSpec[], quality: Quality, venue: THREE.Object3D, world: THREE.Object3D): Crowd[] {
  const out: Crowd[] = [];
  const level = LEVELS.indexOf(quality.level);
  // Order matters to how a scene is drawn, so a crowd that is only there at some times is hidden at the others, not left out.
  for (const spec of specs) {
    let people: Person[];
    if (spec.kind === 'scatter') {
      const n = typeof spec.count === 'number' ? spec.count : spec.count[level];
      const to = spec.faceTo;
      const facing = spec.facing;
      const face = to ? (x: number, z: number) => Math.atan2(to[0] - x, to[1] - z) : facing !== undefined ? () => facing : undefined;
      const [x0, z0, x1, z1] = spec.rect;
      const within = spec.within;
      const avoid = spec.avoid?.map(toShape);
      const clear = spec.clear ?? 0;
      const allowed = within || avoid ? (x: number, z: number) => (!within || pointInPolygon(x, z, within)) && !avoid?.some((s) => shapeDistance(s, x, z) <= clear) : undefined;
      people = scatter(n, x0, x1, z0, z1, spec.y, spec.behaviour, spec.seed, face, spec.gap, allowed);
    } else if (spec.kind === 'queue') {
      const r = rng(spec.seed);
      people = [];
      for (const p of along(offsetPath(spec.path, spec.offset), spec.spacing, spec.start)) {
        if (r() < 0.12) continue;
        const lat = (r() - 0.5) * 0.6;
        people.push({ x: p.x + Math.cos(p.angle) * lat, y: spec.y, z: p.z - Math.sin(p.angle) * lat, facing: p.angle + Math.PI + (r() - 0.5) * 0.6, behaviour: r() < 0.35 ? 'talk' : 'stand' });
      }
      if (spec.staff) people.push(...spec.staff);
    } else {
      people = spec.count ? spec.people.slice(0, spec.count[level]) : spec.people;
    }
    const opts: { armsUp?: boolean; seed?: number; dress?: Dress; headphones?: boolean } = {};
    if (spec.armsUp) opts.armsUp = true;
    if (spec.headphones) opts.headphones = true;
    if (spec.look !== undefined) opts.seed = spec.look;
    if (spec.dress) opts.dress = spec.dress;
    const crowd = new Crowd(people, opts);
    if (spec.times) crowd.mesh.userData.times = spec.times;
    if (spec.room) crowd.mesh.userData.room = spec.room;
    (spec.frame === 'world' ? world : venue).add(crowd.mesh);
    out.push(crowd);
  }
  return out;
}
