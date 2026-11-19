import * as THREE from 'three';
import { beamGeometry, beamMaterial, dustCloud } from '../engine/fx';
import { Batch } from '../engine/geom';
import type { Quality } from '../engine/quality';
import type { FrameState } from '../engine/types';
import type { Mats } from './mats';

/**
 * A stage is where components are put: a group in the scene, a batch that merges their solid
 * parts into a few meshes, the materials they are drawn in, and hooks to move them with the
 * music and switch them with the time of day.
 *
 * Every component takes a stage first and works in the stage group's own coordinates: x and z
 * on the floor, y up, metres. A venue usually makes one stage per room, so that a room's
 * dressing is shown and hidden with the room.
 *
 *   const stages = makeStages(ctx.quality, makeMats(ctx.quality));
 *   const floor = stages.stage(roomGroup);
 *   mirrorBall(floor, { at: [0, 5.5, -4] });
 *   stages.finish();                       // after the last component
 *   return { update: (f) => stages.update(f, f.time.night), setTime: (t) => stages.setTime(t.night) };
 */

/** Called every frame; `night` is false while the time of day has the club empty. */
export type Animate = (f: FrameState, night: boolean) => void;

export interface Beam {
  mesh: THREE.Mesh;
  colour: THREE.Color;
  /** 0 to 1. */
  set(opacity: number): void;
}

export interface Stage {
  quality: Quality;
  mats: Mats;
  /** Where meshes of a component's own go (anything that moves or has a material of its own). */
  group: THREE.Group;
  /** Solid geometry, merged by material into `group` when the stages are finished. */
  batch: Batch;
  animate(fn: Animate): void;
  onTime(fn: (night: boolean) => void): void;
  /** A cone of lit haze hanging down from `at`. Returned so that it can be swung about. */
  beam(at: THREE.Vector3, colour: string, radius: number, length: number): Beam;
  /** Dust in the air of a box, on the detail levels that have it; shown at night only. */
  dust(seed: number, count: number, x: [number, number], y: [number, number], z: [number, number], glow: number, tint?: string): void;
}

export interface Stages {
  /** A stage in a group. Pass a batch to share one the venue already merges into that group. */
  stage(group: THREE.Group, batch?: Batch): Stage;
  animate(fn: Animate): void;
  onTime(fn: (night: boolean) => void): void;
  /** Merge everything added so far into the groups. Call once the components are placed. */
  finish(): void;
  update(f: FrameState, night: boolean): void;
  setTime(night: boolean): void;
}

export function makeStages(quality: Quality, mats: Mats): Stages {
  const batches = new Map<Batch, THREE.Group>();
  const animations: Animate[] = [];
  const timers: ((night: boolean) => void)[] = [];
  const beams: THREE.ShaderMaterial[] = [];
  const dusts: { points: THREE.Points; glow: number }[] = [];
  const animate = (fn: Animate) => void animations.push(fn);
  const onTime = (fn: (night: boolean) => void) => void timers.push(fn);

  return {
    animate,
    onTime,
    stage(group, batch = new Batch()) {
      batches.set(batch, group);
      return {
        quality,
        mats,
        group,
        batch,
        animate,
        onTime,
        beam(at, colour, radius, length) {
          const material = beamMaterial();
          const c = material.uniforms.uColor.value as THREE.Color;
          c.set(colour);
          const mesh = new THREE.Mesh(beamGeometry(radius, length), material);
          mesh.position.copy(at);
          mesh.frustumCulled = false;
          mesh.renderOrder = 3;
          group.add(mesh);
          beams.push(material);
          return { mesh, colour: c, set: (o) => (material.uniforms.uOpacity.value = o) };
        },
        dust(seed, count, x, y, z, glow, tint) {
          if (!quality.dust) return;
          const points = dustCloud({ count, seed, x, y, z, tint });
          group.add(points);
          dusts.push({ points, glow });
        },
      };
    },
    finish() {
      for (const [batch, group] of batches) batch.build(group);
      batches.clear();
    },
    update(f, night) {
      for (const b of beams) b.uniforms.uTime.value = f.t;
      for (const d of dusts) {
        d.points.visible = night;
        const u = (d.points.material as THREE.ShaderMaterial).uniforms;
        u.uTime.value = f.t;
        u.uGlow.value = d.glow * (0.7 + 0.3 * f.pulse);
      }
      for (const fn of animations) fn(f, night);
    },
    setTime(night) {
      for (const fn of timers) fn(night);
    },
  };
}
