import * as THREE from 'three';
import type { FrameName, Pt, Vec3 } from './types';

/**
 * A venue is drawn in its own frame, with its walls along the axes, and set down
 * in the world (x east, z south, from the map) at a centre and a rotation.
 */
export interface VenueFrame {
  centre: THREE.Vector2;
  rotation: number;
  /** cos and sin of the rotation. */
  C: number;
  S: number;
  toWorld(x: number, y: number, z: number): THREE.Vector3;
  toLocal(p: THREE.Vector3): THREE.Vector3;
  /** A point given in either frame, as world coordinates. */
  point(v: Vec3, frame?: FrameName): THREE.Vector3;
  /** x and z only, without allocating. */
  localXZ(wx: number, wz: number): Pt;
  worldXZ(lx: number, lz: number): Pt;
  /** A direction on the floor, venue to world. */
  worldDir(dx: number, dz: number): Pt;
}

export function makeFrame(spec: { centre: Pt; rotation: number }): VenueFrame {
  const centre = new THREE.Vector2(spec.centre[0], spec.centre[1]);
  const C = Math.cos(spec.rotation);
  const S = Math.sin(spec.rotation);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(centre.x + x * C + z * S, y, centre.y - x * S + z * C);
  return {
    centre,
    rotation: spec.rotation,
    C,
    S,
    toWorld,
    toLocal(p) {
      const dx = p.x - centre.x;
      const dz = p.z - centre.y;
      return new THREE.Vector3(dx * C - dz * S, p.y, dx * S + dz * C);
    },
    point(v, frame) {
      return frame === 'world' ? new THREE.Vector3(v[0], v[1], v[2]) : toWorld(v[0], v[1], v[2]);
    },
    localXZ(wx, wz) {
      const dx = wx - centre.x;
      const dz = wz - centre.y;
      return [dx * C - dz * S, dx * S + dz * C];
    },
    worldXZ(lx, lz) {
      return [centre.x + lx * C + lz * S, centre.y - lx * S + lz * C];
    },
    worldDir(dx, dz) {
      return [dx * C + dz * S, -dx * S + dz * C];
    },
  };
}
