import * as THREE from 'three';
import type { CityContext } from '../../engine/city';
import { makeFrame } from '../../engine/frame';
import { offsetPath } from '../../engine/geom';
import type { Surroundings } from '../../engine/types';
import { GUESS, plan } from './plan';
import { painting, type Paint } from './textures';

/** What only this corner of Elephant and Castle has: the viaduct behind the club, its trains, and The Shard on the skyline. */

/** OpenStreetMap ways. The club is three outlines; the plan's shells stand in for them. */
export const CLUB_IDS = [380605745, 380605737, 380605740];
/** The neighbour on the left, whose blank brick flank takes the projection. Drawn by the venue as a plain mass. */
export const LEFT_FLANK_ID = 380605741;
export const LANCASTER_HOUSE_ID = 76399649;
export const TWO_FIFTY_ONE_ID = 511760789;

const frame = makeFrame(plan.frame);

/** No trees or lamp posts on the site, the pavement in front of it or the viaduct behind it. */
function siteClear(x: number, z: number) {
  const [right, minusIn] = frame.localXZ(x, z);
  const inn = -minusIn;
  return right > -45 && right < 45 && inn > -6 && inn < 75;
}

/** The two neighbours that are looked at closely have facades of their own: a painting by day and its lit windows by night. */
const neighbours: THREE.MeshStandardMaterial[] = [];
function neighbour(day: Paint, night: Paint, colour: string) {
  const m = new THREE.MeshStandardMaterial({ map: painting(day), color: colour, roughness: 0.9, emissive: new THREE.Color('#ffffff'), emissiveMap: painting(night), emissiveIntensity: 0 });
  neighbours.push(m);
  return m;
}
let lancaster: THREE.Material | null = null;
let tower: THREE.Material | null = null;

/** The distance from a point to a line of points. */
function distanceTo(x: number, z: number, line: [number, number][]) {
  let best = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const l2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / l2));
    best = Math.min(best, Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t));
  }
  return best;
}

/**
 * The viaduct is a row of brick arches. The map only has the tracks, so the arches are drawn
 * on whatever face of the mass under them is open to the air, at the spacing of the club's own
 * four arches, and in step with them.
 */
function arches(ctx: CityContext) {
  const A = GUESS.viaductArches;
  const half = GUESS.viaductPerTrack / 2;
  const lines = ctx.map.rails.filter((r) => r.bridge).map((r) => r.p);
  const shape = new THREE.Shape();
  shape.moveTo(-A.width / 2, 0);
  shape.lineTo(A.width / 2, 0);
  shape.lineTo(A.width / 2, GUESS.archSpringing);
  shape.absellipse(0, GUESS.archSpringing, A.width / 2, GUESS.archCrown - GUESS.archSpringing, 0, Math.PI, false);
  shape.lineTo(-A.width / 2, 0);
  const opening = new THREE.ShapeGeometry(shape, 10);
  const dark = new THREE.MeshStandardMaterial({ color: '#15110f', roughness: 1 });
  const m = new THREE.Matrix4();
  for (const line of lines) {
    for (const side of [-1, 1]) {
      const face = offsetPath(line, side * (half + 0.05));
      for (let i = 0; i < face.length - 1; i++) {
        const [ax, az] = face[i];
        const [bx, bz] = face[i + 1];
        const [ar] = frame.localXZ(ax, az);
        const [br] = frame.localXZ(bx, bz);
        if (Math.abs(br - ar) < 1e-6) continue;
        // every arch whose centre line crosses this stretch of the face
        const k0 = Math.ceil((Math.min(ar, br) - A.first) / A.pitch);
        const k1 = Math.floor((Math.max(ar, br) - A.first) / A.pitch);
        for (let k = k0; k <= k1; k++) {
          const t = (A.first + k * A.pitch - ar) / (br - ar);
          const x = ax + (bx - ax) * t;
          const z = az + (bz - az) * t;
          const [right, minusIn] = frame.localXZ(x, z);
          if (Math.abs(right) > A.reach) continue;
          // not where the club stands against the viaduct, and not on a face buried in the mass of the next track
          if (right > -40.5 && right < 29.5 && -minusIn < 60) continue;
          if (lines.some((other) => other !== line && distanceTo(x, z, other) < half - 0.3)) continue;
          const len = Math.hypot(bx - ax, bz - az);
          const dx = (bx - ax) / len;
          const dz = (bz - az) / len;
          // the way out of the mass: away from the track
          const c = line[Math.min(i, line.length - 1)];
          const out = (x - c[0]) * -dz + (z - c[1]) * dx > 0 ? 1 : -1;
          m.makeBasis(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dz * out, 0, dx * out));
          m.setPosition(x - dz * out * 0.04, 0.02, z + dx * out * 0.04);
          ctx.batch.add(dark, opening, m);
        }
      }
    }
  }
}

export const surroundings: Surroundings = {
  own: [...CLUB_IDS, LEFT_FLANK_ID],
  venueIds: CLUB_IDS,
  keepClear: siteClear,
  // central London: paving from wall to wall
  streetTreeSpacing: GUESS.streetTreeSpacing,
  paved: true,
  viaduct: { level: GUESS.viaductLevel, width: GUESS.viaductPerTrack, colour: '#5a4a3c' },
  extras: {
    facade(b) {
      if (b.id === LANCASTER_HOUSE_ID) return 'brick';
      if (b.id === TWO_FIFTY_ONE_ID) return 'office';
      return null;
    },
    material(b) {
      // Lancaster House, on the courtyard's right: brown brick, seven storeys
      if (b.id === LANCASTER_HOUSE_ID) return (lancaster ??= neighbour('lancaster', 'lancasterNight', '#ffffff'));
      // Two Fifty One, across the street: pale frames round dark glass, 41 storeys
      if (b.id === TWO_FIFTY_ONE_ID) return (tower ??= neighbour('tower', 'towerNight', '#ffffff'));
      return null;
    },
    // London stock brick, darkened by a century and a half of trains
    viaduct: () => new THREE.MeshStandardMaterial({ map: painting('brick'), color: '#7a6450', roughness: 0.95 }),
    structures: arches,
    landmark() {
      // The Shard: 1,190 m away on a bearing of 51 degrees, 309.6 m high. Seen over the club's roof from Gaunt Street.
      const bearing = (51 * Math.PI) / 180;
      const shard = new THREE.Group();
      shard.position.set(Math.sin(bearing) * 1190, 0, -Math.cos(bearing) * 1190);
      const glass = new THREE.MeshStandardMaterial({ color: '#9fb4c4', roughness: 0.3, metalness: 0.4, emissive: new THREE.Color('#5a6f86'), emissiveIntensity: 0.25, fog: false });
      shard.add(new THREE.Mesh(new THREE.ConeGeometry(38, 309.6, 4).rotateY(Math.PI / 4).translate(0, 154.8, 0), glass));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a1a', fog: false }));
      tip.position.y = 306;
      shard.add(tip);
      return {
        object: shard,
        update(t, night) {
          tip.visible = night && Math.sin(t * 2) > 0;
          glass.emissiveIntensity = night ? 0.35 : 0.05;
          for (const m of neighbours) m.emissiveIntensity = night ? 0.7 : 0;
        },
      };
    },
    // Thameslink, on the viaduct
    train: { body: '#d9dce0', stripe: '#3a4a9a', windows: '#ffe9c0', cycle: 50 },
  },
};
