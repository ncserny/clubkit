import * as THREE from 'three';
import type { Batch } from '../engine/geom';
import type { Vec3 } from '../engine/types';
import type { Mats } from './mats';
import { box, cyl } from './shapes';
import type { Beam, Stage } from './stage';

/**
 * Club lighting: moving heads that throw beams through the haze, mirror balls, strobes, LED
 * walls. Each moves with the music through the stage's `animate` hook and goes dark while the club is closed.
 *
 * The flash of the room itself (the strobe light that lights the walls) belongs to the engine:
 * `plan.show.strobe` says when it fires, and the engine caps it at 2.9 flashes a second and
 * switches it off for visitors whose system asks for reduced motion. A strobe fixture here only
 * shows the lamp, lit whenever that flash is.
 */

/**
 * Moving lights hung at points, each throwing a beam through the haze that swings about. The
 * phone level keeps every other beam. Each spot is [x, y, z] of the clamp. `hidden` is for
 * fixtures out of sight above something: no fixture is drawn, and the beam starts at the height given.
 */
export function movingHeads(stage: Stage, spots: Vec3[], colours: string[], o: { length: number; radius?: number; swing?: number; speed?: number; level?: number; hidden?: boolean }) {
  const { batch, mats } = stage;
  const body = mats.plain('#0b0b0c', { rough: 0.5, metal: 0.4 });
  const beams: { beam: Beam; phase: number }[] = [];
  spots.forEach(([x, y, z], k) => {
    const colour = colours[k % colours.length];
    if (!o.hidden) {
      batch.add(body, box(x - 0.11, z - 0.11, x + 0.11, z + 0.11, y - 0.1, y));
      batch.add(body, cyl(x, z, 0.1, y - 0.4, y - 0.12, 10));
      batch.add(mats.glow(colour), cyl(x, z, 0.08, y - 0.41, y - 0.4, 10));
    }
    if (stage.quality.level === 'lite' && k % 2) return;
    beams.push({ beam: stage.beam(new THREE.Vector3(x, o.hidden ? y : y - 0.4, z), colour, o.radius ?? 0.7, o.length), phase: k * 2.399 });
  });
  const swing = o.swing ?? 0.5;
  const speed = o.speed ?? 0.35;
  const level = o.level ?? 0.5;
  stage.animate(({ t, pulse }, open) => {
    for (const { beam, phase } of beams) {
      beam.mesh.visible = open;
      if (!open) continue;
      beam.mesh.rotation.x = swing * Math.sin(t * speed + phase);
      beam.mesh.rotation.z = swing * Math.cos(t * speed * 0.8 + phase * 1.7);
      beam.set(level * (0.65 + 0.35 * pulse));
    }
  });
  return beams.map((b) => b.beam);
}

/** The faceted sphere of a mirror ball, for a venue that hangs and lights its own. */
export function mirrorBallGeometry(radius: number) {
  return new THREE.IcosahedronGeometry(radius, 2);
}

/**
 * A mirror ball hung from the ceiling on a rod, turning slowly while the club is open. `at` is the centre of
 * the ball; `ceiling` the height the rod hangs from (a metre above the ball if left out).
 * `spots` adds that many specks of light thrown off it, drifting round the room on the walls
 * of an invisible sphere `reach` metres across (on the levels that have dust in the air).
 */
export function mirrorBall(stage: Stage, o: { at: Vec3; radius?: number; ceiling?: number; spin?: number; spots?: number; reach?: number; colour?: string }) {
  const [x, y, z] = o.at;
  const radius = o.radius ?? 0.3;
  const mirror = stage.mats.plain('#d5dae2', { rough: 0.12, metal: 1 });
  const ball = new THREE.Mesh(mirrorBallGeometry(radius), mirror);
  ball.position.set(x, y, z);
  stage.group.add(ball);
  const ceiling = o.ceiling ?? y + radius + 0.7;
  stage.batch.add(stage.mats.plain('#0b0b0c', { rough: 0.5, metal: 0.4 }), cyl(x, z, 0.008, y + radius * 0.9, ceiling, 4));
  const spin = o.spin ?? 0.35;

  let specks: THREE.Points | null = null;
  const count = o.spots ?? 0;
  if (count && stage.quality.dust) {
    const reach = o.reach ?? 6;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // even directions over the lower part of a sphere: specks land on the floor and the walls
      const u = (i + 0.5) / count;
      const lat = -Math.asin(0.15 + 0.8 * u);
      const lon = i * 2.39996;
      pos.set([Math.cos(lat) * Math.cos(lon) * reach, Math.sin(lat) * reach * 0.6, Math.cos(lat) * Math.sin(lon) * reach], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    specks = new THREE.Points(g, new THREE.PointsMaterial({ color: o.colour ?? '#ffffff', size: 0.07, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    specks.position.copy(ball.position);
    specks.frustumCulled = false;
    stage.group.add(specks);
  }
  stage.onTime((open) => {
    if (specks) specks.visible = open;
  });
  stage.animate(({ t, pulse }, open) => {
    if (!open) return;
    ball.rotation.y = t * spin;
    if (specks) {
      specks.rotation.y = t * spin;
      (specks.material as THREE.PointsMaterial).opacity = 0.55 + 0.45 * pulse;
    }
  });
  return ball;
}

/**
 * A strobe: a flat box with a frosted face, lit in white whenever the engine's strobe fires and
 * dark otherwise. `at` is the middle of its back, `facing` radians about the vertical (0 faces +z),
 * `tilt` radians down. Several strobes share one material, so they flash together.
 */
export function strobe(stage: Stage, o: { at: Vec3; facing?: number; tilt?: number; size?: [number, number] }) {
  const [w, h] = o.size ?? [0.55, 0.22];
  const g = new THREE.Group();
  g.position.set(...o.at);
  g.rotation.set(0, o.facing ?? 0, 0, 'YXZ');
  g.rotateX(o.tilt ?? 0.3);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.14).translate(0, 0, 0.07), stage.mats.plain('#111113', { rough: 0.5, metal: 0.5 }));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, 0, 0.142), strobeFace(stage));
  g.add(shell, face);
  stage.group.add(g);
  return g;
}

const faces = new WeakMap<Stage['animate'], THREE.MeshBasicMaterial>();
function strobeFace(stage: Stage) {
  let m = faces.get(stage.animate);
  if (!m) {
    const lit = new THREE.Color('#f4f7ff').multiplyScalar(3);
    const off = new THREE.Color('#2a2c30');
    const mat = new THREE.MeshBasicMaterial({ color: off.clone(), toneMapped: false });
    stage.animate(({ strobe }, open) => mat.color.copy(open && strobe > 0 ? lit : off));
    faces.set(stage.animate, (m = mat));
  }
  return m;
}

/** What an LED wall is drawn with: its own material, so that its colour and picture can move. `pitch` is metres per tile of the picture. */
export function ledScreen(mats: Mats, colour: string, pitch = 1) {
  const map = mats.led().clone();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1 / pitch, 1 / pitch);
  map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map, color: colour, side: THREE.DoubleSide });
}

/** Screens that drift through a band of hues while the club is open and hold a dim grey while it is closed. */
export function playScreens(stage: Pick<Stage, 'animate' | 'onTime'>, screens: THREE.MeshBasicMaterial[], hue: number, range: number, level = 0.4) {
  const c = new THREE.Color();
  stage.onTime((open) => {
    if (!open) for (const s of screens) s.color.set('#17181f');
  });
  stage.animate(({ t, pulse }, open) => {
    if (!open) return;
    screens.forEach((s, i) => {
      s.color.copy(c.setHSL((hue + range * Math.sin(t * 0.21 + i * 1.3) + 1) % 1, 0.85, level + 0.1 * pulse));
      if (s.map) s.map.offset.x = t * 0.05 * (i % 2 ? -1 : 1);
    });
  });
}

/**
 * A screen that plays slow liquid video: folds of light that turn over one another, seen through
 * the grid of its pixels. Whoever animates it sets `uTime`, `uColor` (what the liquid is tinted),
 * `uLevel` (how bright) and `uNight`; at 0 that leaves the screen off, a dim grey. The panel's UVs
 * are taken as metres, and `pitch` is the size of a pixel.
 */
export function swirlScreen(pitch = 0.03) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#3d7dff') },
        uLevel: { value: 1 },
        uNight: { value: 1 },
        uOff: { value: new THREE.Color('#17181f') },
        uPitch: { value: pitch },
      },
    ]),
    vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
    fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        uniform float uTime; uniform vec3 uColor; uniform float uLevel; uniform float uNight; uniform vec3 uOff; uniform float uPitch;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float a = 0.5; float s = 0.0;
          for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.02 + vec2(17.3, 9.1); a *= 0.5; }
          return s;
        }
        void main() {
          // the picture is made of pixels: every point shows what is at the centre of its own
          vec2 cell = vUv / uPitch;
          vec2 p = (floor(cell) + 0.5) * uPitch * 1.1;
          float t = uTime * 0.06;
          // a field pushed about by itself, twice over: slow folds that turn over one another
          vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t, 0.0)));
          vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + 0.7 * t), fbm(p + 3.2 * q + vec2(8.3, 2.8) - 0.5 * t));
          float f = fbm(p + 3.2 * r);
          // mostly dark, with the folds picked out pale
          float body = smoothstep(0.38, 0.8, f);
          float fold = smoothstep(0.6, 0.98, f + 0.5 * (length(r) - 0.6));
          vec3 col = uColor * (0.03 + 0.6 * body) + vec3(0.75, 0.88, 1.0) * fold * fold * 0.7;
          col = mix(uOff, col * uLevel, uNight);
          // the gaps between the pixels, evened out where they are too small to draw
          vec2 g = abs(fract(cell) - 0.5);
          float gap = smoothstep(0.36, 0.48, max(g.x, g.y));
          float fine = clamp(1.0 - max(fwidth(cell.x), fwidth(cell.y)) * 1.5, 0.0, 1.0);
          col *= 1.0 - 0.55 * mix(0.3, gap, fine);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
  });
}

/** A par can: a short black cylinder hung at `at`, its lens lit in a colour that pulses with the beat while the club is open. */
export function parCan(stage: Stage, batch: Batch, o: { at: Vec3; colour: string }) {
  const [x, y, z] = o.at;
  batch.add(stage.mats.plain('#0b0b0c', { rough: 0.5, metal: 0.4 }), cyl(x, z, 0.1, y - 0.3, y, 10));
  const lens = stage.mats.glow(o.colour, true);
  const base = new THREE.Color(o.colour);
  const lensMesh = new THREE.Mesh(new THREE.CircleGeometry(0.085, 14).rotateX(Math.PI / 2).translate(x, y - 0.301, z), lens);
  stage.group.add(lensMesh);
  stage.animate(({ pulse }, open) => lens.color.copy(base).multiplyScalar(open ? 0.35 + 0.65 * pulse : 0.05));
  return lensMesh;
}
