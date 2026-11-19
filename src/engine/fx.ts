import * as THREE from 'three';
import { rng } from './util';

/**
 * A beam is a cone of lit haze: densest where you look along it, thinning to nothing
 * at its edge and down its length, and never quite even.
 */
export function beamMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color('#ffffff') }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vW;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vW = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * mv;
        }`,
    fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
        varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec3 vW;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float noise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        void main() {
          float facing = abs(dot(normalize(vN), normalize(vV)));
          float core = pow(facing, 1.6);
          float along = pow(vUv.y, 1.3) * smoothstep(0.0, 0.06, 1.0 - vUv.y);
          float smoke = 0.55 + 0.75 * noise(vW * 0.55 + vec3(uTime * 0.12, -uTime * 0.05, uTime * 0.08));
          gl_FragColor = vec4(uColor * core * along * smoke * uOpacity * 4.0, 1.0);
        }`,
  });
}

/** The cone a beam is drawn on: its tip at the fixture, opening downwards. */
export function beamGeometry(radius = 1.1, length = 14) {
  return new THREE.ConeGeometry(radius, length, 24, 1, true).translate(0, -length / 2, 0);
}

/** Dust and smoke drifting through a box of air, catching the light. Hidden until shown. */
export function dustCloud(opts: { count: number; seed: number; x: [number, number]; y: [number, number]; z: [number, number]; tint?: string }) {
  const r = rng(opts.seed);
  const n = opts.count;
  const posArr = new Float32Array(n * 3);
  const seedArr = new Float32Array(n);
  const h = opts.y[1] - opts.y[0];
  for (let i = 0; i < n; i++) {
    posArr.set([opts.x[0] + r() * (opts.x[1] - opts.x[0]), opts.y[0] + r() * h, opts.z[0] + r() * (opts.z[1] - opts.z[0])], i * 3);
    seedArr[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seedArr, 1));
  const dust = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uGlow: { value: 0.5 },
        uY0: { value: opts.y[0] },
        uH: { value: h },
        uTint: { value: new THREE.Color(opts.tint ?? '#ffe8d8') },
      },
      vertexShader: /* glsl */ `
          attribute float aSeed; uniform float uTime; uniform float uY0; uniform float uH; varying float vA;
          void main() {
            vec3 p = position;
            p.x += sin(uTime * 0.11 + aSeed * 40.0) * 0.9;
            p.y = uY0 + mod(position.y - uY0 + uTime * (0.03 + aSeed * 0.05), uH);
            p.z += cos(uTime * 0.09 + aSeed * 31.0) * 0.9;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (6.0 + aSeed * 14.0) / max(1.0, -mv.z);
            vA = (0.25 + aSeed * 0.75) * smoothstep(1.5, 5.0, -mv.z);
          }`,
      fragmentShader: /* glsl */ `
          uniform float uGlow; uniform vec3 uTint; varying float vA;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vA * uGlow * 0.16;
            gl_FragColor = vec4(uTint * a, 1.0);
          }`,
    }),
  );
  dust.frustumCulled = false;
  dust.visible = false;
  return dust;
}
