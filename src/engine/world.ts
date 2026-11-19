import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCity } from './city';
import { buildCrowds } from './crowds';
import { makeFrame } from './frame';
import { buildLights, type LightRig } from './lights';
import { buildNav, type Nav } from './nav';
import { type Crowd, setCrowdBeat, setFigureDetail } from './people';
import type { Quality } from './quality';
import type { BuildContext, TimeState, VenueModule, VenuePlan, Viewpoint, Zone } from './types';
import { setTextureScale } from './util';

export type { Zone };

/** A viewpoint with its position and target in world coordinates. */
export interface View extends Omit<Viewpoint, 'position' | 'target' | 'frame'> {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface World {
  plan: VenuePlan;
  viewpoints: View[];
  nav: Nav;
  /** The time of day now showing. */
  time(): TimeState;
  setTime(index: number, instant?: boolean): void;
  /** `bpm` is the tempo `beat` is counted at, where it is not the venue's. */
  update(dt: number, t: number, beat: number, camera: THREE.Camera, zone: Zone, bpm?: number): void;
  /** Switch on exactly these sets of lights. */
  useLights(sets: string[]): void;
  /** Every combination of light sets a zone asks for. */
  lightCombos(): string[][];
  /** 1 while the strobe is lit at this beat, else 0. `bpm` is the tempo the beat is counted at; the venue's if left out. */
  strobeAt(beat: number, bpm?: number): number;
}

/** No strobe flashes faster than this, whatever a venue asks for. */
export const MAX_STROBE_HZ = 2.9;

/** Sun direction from compass azimuth (degrees from north, clockwise) and elevation. */
function sunDir(az: number, el: number) {
  const a = THREE.MathUtils.degToRad(az);
  const e = THREE.MathUtils.degToRad(el);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

/** Whether a thing and everything it hangs from is switched on. */
function shown(o: THREE.Object3D | null) {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/** Called between the stages of the build; resolves once the loader has had a frame to paint. */
export type Step = (label: string, progress: number) => Promise<void>;

export async function buildWorld(scene: THREE.Scene, renderer: THREE.WebGLRenderer, venue: VenueModule, opts: { coarse: boolean; quality: Quality; step: Step }): Promise<World> {
  const { plan } = venue;
  const frame = makeFrame(plan.frame);
  setTextureScale(venue.textureScale?.[opts.quality.level] ?? 1);
  await opts.step(plan.copy.loading.map, 0.12);
  const city = buildCity(venue.map, venue.surroundings);
  scene.add(city.group);
  await opts.step(plan.copy.loading.venue, 0.4);

  setFigureDetail(opts.quality.figureDetail);
  const root = new THREE.Group();
  root.name = 'site';
  const group = new THREE.Group();
  group.position.set(frame.centre.x, 0, frame.centre.y);
  group.rotation.y = frame.rotation;
  root.add(group);
  let crowds: Crowd[] | null = null;
  let rig: LightRig | null = null;
  const ctx: BuildContext = {
    plan,
    frame,
    quality: opts.quality,
    coarse: opts.coarse,
    map: venue.map,
    root,
    group,
    populate: () => (crowds ??= buildCrowds(plan.crowds, opts.quality, group, root)),
    light: () => (rig ??= buildLights(plan.lights, opts.quality, group, root)),
  };
  const hooks = venue.build(ctx);
  const people = ctx.populate();
  const lights = ctx.light();
  scene.add(root);
  const nav = buildNav(plan, frame, city.solids, city.obstacles);
  await opts.step(plan.copy.loading.lights, 0.72);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight('#4a5470', '#1a1612', 0.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.castShadow = true;
  const size = opts.quality.sunShadow;
  sun.shadow.mapSize.set(size, size);
  const reach = plan.outdoors.shadowReach;
  const sc = sun.shadow.camera;
  sc.left = -reach;
  sc.right = reach;
  sc.top = reach;
  sc.bottom = -reach;
  sc.near = 10;
  sc.far = 700;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  const focus = new THREE.Vector3(...plan.outdoors.shadowFocus);
  sun.target.position.copy(focus);
  scene.add(sun, sun.target);

  const fog = new THREE.FogExp2('#14141a', 0.0028);
  scene.fog = fog;

  const skyMat = city.sky.material as THREE.ShaderMaterial;
  const pools = city.group.getObjectByName('pools');

  let time = plan.times[0];
  function applyTime(instant = false) {
    const dir = sunDir(time.sun.azimuth, time.sun.elevation);
    sun.position.copy(focus).addScaledVector(dir, 400);
    sun.color.set(time.sun.colour);
    hemi.color.set(time.hemi.sky);
    hemi.groundColor.set(time.hemi.ground);
    hemi.intensity = time.hemi.intensity;
    skyMat.uniforms.top.value.set(time.sky.top);
    skyMat.uniforms.mid.value.set(time.sky.mid);
    skyMat.uniforms.horizon.value.set(time.sky.horizon);
    skyMat.uniforms.sunColor.value.set(time.sky.sun);
    if (time.night) {
      // the light in the sky is the moon
      skyMat.uniforms.sunDir.value.set(0, -1, 0);
      skyMat.uniforms.moon.value = 1;
      skyMat.uniforms.moonDir.value.copy(dir);
    } else {
      skyMat.uniforms.sunDir.value.copy(dir);
      skyMat.uniforms.moon.value = 0;
    }
    fog.color.set(time.fog.colour);
    scene.environmentIntensity = time.env.outdoors;
    city.skylineMaterial.map = time.night ? city.skylineNight : city.skylineDay;
    city.skylineMaterial.opacity = time.skylineOpacity;
    for (const m of city.nightMaterials) m.emissiveIntensity = time.windows;
    (city.lampHeads.material as THREE.MeshStandardMaterial).emissiveIntensity = time.lamps;
    city.skylineMaterial.needsUpdate = true;
    if (pools) pools.visible = time.night;
    for (const c of people) {
      const times = c.mesh.userData.times as string[] | undefined;
      if (times) c.mesh.visible = times.includes(time.id);
    }
    hooks.setTime?.(time, instant);
  }
  applyTime();

  const viewpoints: View[] = plan.viewpoints.map((v) => ({ id: v.id, label: v.label, title: v.title, text: v.text, position: frame.point(v.position, v.frame), target: frame.point(v.target, v.frame) }));

  /* ------------------------------------------------------------ show ---- */
  const { strobe } = plan.show;
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function strobeAt(beat: number, bpm = plan.show.bpm) {
    if (still) return 0;
    // beats from one flash to the next: what the venue asks for, but never faster than the limit at this tempo
    const strobePeriod = Math.max(1 / Math.max(strobe.flashesPerBeat, 1e-6), bpm / 60 / MAX_STROBE_HZ);
    const bar = Math.floor(beat / 4);
    if (bar % strobe.everyBars !== strobe.everyBars - 1 || beat % 4 <= 4 - strobe.beats) return 0;
    return (beat % strobePeriod) / strobePeriod < strobe.duty ? 1 : 0;
  }

  /* ---------------------------------------------------------- update ---- */
  function update(dt: number, t: number, beat: number, camera: THREE.Camera, zone: Zone, bpm?: number) {
    setCrowdBeat(beat);
    lights.use(zone.lightSets);
    lights.reset(time.outdoorLights);
    hooks.update?.({ dt, t, beat, bar: Math.floor(beat / 4), pulse: Math.pow(1 - (beat % 1), 3), strobe: strobeAt(beat, bpm), zone, time, camera });
    // a venue may have hidden the rooms that cannot be seen from here; nobody in them is moved
    for (const c of people) if (shown(c.mesh)) c.update(t, beat);
    // Deep inside nothing of the city can be seen, so it is not drawn (or put through the shadow passes).
    // A room with windows keeps it.
    city.group.visible = !zone.inside || !!zone.showCity;
    // no moonlight indoors; a morning sun still comes in through the windows
    const dark = zone.inside && !time.sun.indoors;
    sun.intensity = dark ? 0 : time.sun.intensity;
    sun.shadow.autoUpdate = !dark;
    city.update(t, time);
    hemi.intensity = zone.inside ? time.hemi.indoors : time.hemi.intensity;
    scene.environmentIntensity = zone.inside ? time.env.indoors : time.env.outdoors;
    if (zone.inside) {
      const h = zone.haze;
      const haze = typeof h === 'number' ? h : h ? (h[time.id] ?? h.default ?? 0.02) : 0.02;
      fog.density = THREE.MathUtils.damp(fog.density, haze, 3, dt);
      fog.color.set(zone.fog ?? '#120c0a');
    } else {
      fog.density = THREE.MathUtils.damp(fog.density, time.fog.density, 3, dt);
      fog.color.set(time.fog.colour);
    }
  }

  return {
    plan,
    viewpoints,
    nav,
    time: () => time,
    setTime(index, instant = false) {
      time = plan.times[index] ?? plan.times[0];
      applyTime(instant);
    },
    update,
    useLights: (sets) => lights.use(sets),
    lightCombos() {
      const seen = new Map<string, string[]>();
      for (const z of nav.zones()) seen.set(z.lightSets.join('|'), z.lightSets);
      return [...seen.values()];
    },
    strobeAt,
  };
}
