import * as THREE from 'three';
import type { Quality } from './quality';
import type { LightSpec } from './types';

/**
 * The plan's lights, switched in and out as sets. A surface pays for every light
 * the renderer knows about, lit or not, so nobody on the street computes the
 * dancefloor and nobody on the dancefloor computes the street.
 */
export interface LightRig {
  /** A light by its id, for a venue that wants to animate it. */
  get<L extends THREE.Light = THREE.PointLight>(id: string): L | null;
  /** Switch on exactly these sets. */
  use(sets: string[]): void;
  /** Put every light back to its base intensity; lights marked outdoor are scaled. */
  reset(outdoorFactor: number): void;
  isOn(set: string): boolean;
}

export function buildLights(specs: LightSpec[], quality: Quality, venue: THREE.Object3D, world: THREE.Object3D): LightRig {
  const all: { light: THREE.Light; spec: LightSpec }[] = [];
  const byId = new Map<string, THREE.Light>();
  const shadowed: THREE.SpotLight[] = [];
  for (const spec of specs) {
    if (spec.shadowLevelsOnly && !quality.interiorShadows) continue;
    const parent = spec.frame === 'world' ? world : venue;
    let light: THREE.Light;
    if (spec.type === 'spot') {
      const s = new THREE.SpotLight(spec.colour, 0, spec.range, spec.angle ?? 0.5, spec.penumbra ?? 0.5, spec.decay);
      s.position.set(...spec.at);
      if (spec.target) s.target.position.set(...spec.target);
      parent.add(s, s.target);
      if (spec.shadow && quality.interiorShadows) shadowed.push(s);
      light = s;
    } else {
      const p = new THREE.PointLight(spec.colour, 1, spec.range, spec.decay);
      p.position.set(...spec.at);
      parent.add(p);
      light = p;
    }
    light.intensity = spec.intensity;
    all.push({ light, spec });
    if (spec.id) byId.set(spec.id, light);
  }
  for (const l of shadowed) {
    l.shadow.mapSize.set(quality.interiorShadowSize, quality.interiorShadowSize);
    l.shadow.camera.near = 1.5;
    l.shadow.camera.far = 30;
    l.shadow.bias = -0.0015;
    l.shadow.normalBias = 0.03;
    l.castShadow = true;
  }

  let current = '\u0000';
  let on = new Set<string>();
  return {
    get: <L extends THREE.Light>(id: string) => (byId.get(id) as L | undefined) ?? null,
    use(sets) {
      const key = sets.join('|');
      if (key === current) return;
      current = key;
      on = new Set(sets);
      for (const { light, spec } of all) light.visible = on.has(spec.set);
      // shadow maps are only redrawn while their light is on
      for (const l of shadowed) l.shadow.autoUpdate = l.visible;
    },
    reset(outdoorFactor) {
      for (const { light, spec } of all) light.intensity = spec.outdoor ? spec.intensity * outdoorFactor : spec.intensity;
    },
    isOn: (set) => on.has(set),
  };
}
