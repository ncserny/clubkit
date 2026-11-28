import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './util';

/**
 * People: one figure, drawn many times with InstancedMesh. Mostly black
 * clothes, as anyone who has stood in that queue will tell you. Each figure
 * has a skin tone, hair, a build, bare or covered arms and its own way of
 * moving. The limbs are posed in the vertex shader, so a crowd of hundreds
 * dances for the cost of drawing it once: shoulders and elbows swing, heads
 * nod and the upper body sways on the beat.
 */

/** 0 legs and hips, 1/2 upper arms (left/right), 3 head and neck, 4 torso, 5/6 forearms and hands. */
function part(g: THREE.BufferGeometry, colour: THREE.Color, m: THREE.Matrix4 | undefined, id: number) {
  const geo = (g.index ? g.toNonIndexed() : g).clone();
  if (m) geo.applyMatrix4(m);
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < c.length; i += 3) {
    c[i] = colour.r;
    c[i + 1] = colour.g;
    c[i + 2] = colour.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  geo.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(id), 1));
  geo.deleteAttribute('uv');
  return geo;
}

const T = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));

const SHOULDER_Y = 1.42;
const ELBOW_Y = 1.14;
const SHOULDER_X = 0.19;
/** The middle of the head, where the ears are. */
const EAR_Y = 1.69;
const EAR_Z = 0.012;

/**
 * The figure stands with its arms hanging; the shader raises and bends them.
 * Vertex colours are markers as well as tints: white takes the clothes colour,
 * grey is the same cloth darker (trousers), red > 1 is skin, green > 1 is
 * hair, blue > 1 is an upper arm that is sleeve or skin depending on the person.
 * Red > 2 is kit that keeps a grey of its own whatever the person wears; the grey is in green.
 */
function figure(detail: number, jointed = false, headphones = false) {
  const cloth = new THREE.Color(1, 1, 1);
  const trousers = new THREE.Color(0.62, 0.62, 0.62);
  const skin = new THREE.Color(2, 0, 0);
  const sleeve = new THREE.Color(0, 0, 2);
  const shoe = new THREE.Color(0.2, 0.2, 0.2);
  const round = Math.max(5, detail);
  const cap = Math.max(2, Math.round(detail / 3));
  const parts: THREE.BufferGeometry[] = [];
  // a figure that can sit has its thighs (7) and its shins and shoes (8) marked apart from the hips
  const thigh = jointed ? 7 : 0;
  const shin = jointed ? 8 : 0;
  for (const s of [-1, 1]) {
    parts.push(part(new THREE.CapsuleGeometry(0.068, 0.34, cap, round), trousers, T(s * 0.095, 0.67, 0), thigh));
    parts.push(part(new THREE.CapsuleGeometry(0.054, 0.36, cap, round), trousers, T(s * 0.095, 0.27, 0.004), shin));
    const sh = new THREE.CapsuleGeometry(0.05, 0.15, cap, round).rotateX(Math.PI / 2);
    sh.scale(1, 0.72, 1);
    parts.push(part(sh, shoe, T(s * 0.095, 0.04, 0.05), shin));
  }
  const hips = new THREE.SphereGeometry(0.16, round + 2, Math.max(4, round - 2));
  hips.scale(1, 0.68, 0.72);
  parts.push(part(hips, trousers, T(0, 0.93, 0), 0));
  const torso = new THREE.LatheGeometry(
    [
      [0, -0.02],
      [0.135, -0.02],
      [0.134, 0.12],
      [0.146, 0.27],
      [0.166, 0.4],
      [0.172, 0.47],
      [0.15, 0.53],
      [0.08, 0.565],
      [0, 0.57],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    round + 4,
  );
  torso.scale(1.1, 1, 0.68);
  parts.push(part(torso, cloth, T(0, 0.92, 0), 4));
  parts.push(part(new THREE.CylinderGeometry(0.05, 0.056, 0.1, round), skin, T(0, 1.53, 0), 3));
  const head = new THREE.SphereGeometry(0.1, round + 4, round);
  head.scale(0.88, 1.13, 1);
  parts.push(part(head, skin, T(0, 1.69, 0.012), 3));
  const hair = new THREE.SphereGeometry(0.107, round + 4, Math.max(4, round - 2), 0, Math.PI * 2, 0, Math.PI * 0.56);
  hair.scale(0.9, 1.12, 1.03);
  parts.push(part(hair, new THREE.Color(0, 2, 0), T(0, 1.702, -0.002, -0.28), 3));
  for (const s of [-1, 1]) {
    const up = s < 0 ? 1 : 2;
    const fore = s < 0 ? 5 : 6;
    parts.push(part(new THREE.SphereGeometry(0.052, round, Math.max(4, round - 2)), cloth, T(s * SHOULDER_X, SHOULDER_Y, 0), up));
    parts.push(part(new THREE.CapsuleGeometry(0.043, 0.2, cap, round), sleeve, T(s * SHOULDER_X, SHOULDER_Y - 0.14, 0), up));
    parts.push(part(new THREE.CapsuleGeometry(0.033, 0.2, cap, round), skin, T(s * SHOULDER_X, ELBOW_Y - 0.13, 0), fore));
    const hand = new THREE.SphereGeometry(0.04, round, Math.max(4, round - 2));
    hand.scale(0.8, 1.25, 0.55);
    parts.push(part(hand, skin, T(s * SHOULDER_X, ELBOW_Y - 0.3, 0), fore));
  }
  if (headphones) {
    // part of the head, so they nod with it: a band over the hair, a pad on each ear and a paler shell outside it
    const kit = (grey: number) => new THREE.Color(3, grey, grey);
    const band = new THREE.TorusGeometry(0.105, 0.008, 6, round + 6, Math.PI);
    band.scale(1, 1.39, 2.4);
    parts.push(part(band, kit(0.04), T(0, EAR_Y, EAR_Z), 3));
    for (const s of [-1, 1]) {
      const pad = new THREE.CylinderGeometry(0.043, 0.043, 0.022, round + 4).rotateZ((-s * Math.PI) / 2);
      pad.scale(1, 1.15, 1);
      parts.push(part(pad, kit(0.015), T(s * 0.098, EAR_Y - 0.004, EAR_Z), 3));
      const shell = new THREE.CylinderGeometry(0.029, 0.04, 0.02, round + 4).rotateZ((-s * Math.PI) / 2);
      shell.scale(1, 1.15, 1);
      parts.push(part(shell, kit(0.34), T(s * 0.118, EAR_Y - 0.004, EAR_Z), 3));
    }
  }
  // the parts keep their own smooth normals; recomputing on the merged, unindexed mesh would facet them
  return mergeGeometries(parts, false)!;
}

const SKIN = ['#f1c9a5', '#e0ac8a', '#c68863', '#a86b48', '#7a4a32', '#5a3826', '#f5d6bd'].map((c) => new THREE.Color(c));
const HAIR = ['#0d0b0a', '#1a1410', '#2b1d14', '#3d2b1c', '#0a0a0a', '#6b5a44', '#b9a27d', '#1c1c1c'].map((c) => new THREE.Color(c));
const CLOTH = ['#0b0b0c', '#111112', '#0d0d0f', '#151515', '#1b1b1d', '#0a0a0a', '#222326', '#2b2b2b', '#3a3634', '#1a1d22', '#4a4644'].map((c) => new THREE.Color(c));

/** How round the figures are; set once from the detail level before any crowd is made. */
let figureDetail = 8;
export function setFigureDetail(detail: number) {
  figureDetail = detail;
}

/** The beat, shared by every crowd. Set once a frame. */
const beatUniform = { value: 0 };
export function setCrowdBeat(beat: number) {
  beatUniform.value = beat;
}

/** How far apart in time dancers hit the kick, in beats, and how long the drop into it takes. */
const KICK_SPREAD = 0.08;
const KICK_ATTACK = 0.14;
/** The shape of a dancer's move on each beat: 0 on the kick, 1 a moment after it, back to near 0 by the next. */
function kickAt(beat: number) {
  const x = (((beat % 1) + 1) % 1) / KICK_ATTACK;
  return x * Math.exp(1 - x);
}

const POSE = /* glsl */ `
attribute float aPart;
attribute vec3 aMove; // phase, how much they move, how high the arms are held
attribute vec3 skinTone;
attribute vec3 hairTone;
attribute float aBare;
uniform float uBeat;
varying vec3 vSkin;
varying vec3 vHair;
varying vec3 vCloth;
varying float vIsSkin;
varying float vIsHair;
varying float vIsSleeve;
varying float vIsKit;
varying float vKit;
vec3 bhRotX(vec3 p, float a) { float c = cos(a); float s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 bhRotZ(vec3 p, float a) { float c = cos(a); float s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
vec3 bhPose(vec3 p, float w) {
  float amp = aMove.y;
  // Everyone moves to the same kick, each a few milliseconds early or late, not on a wave of their own.
  float beat = uBeat + (aMove.x / 6.2831853 - 0.5) * ${KICK_SPREAD.toFixed(3)};
  float k = fract(beat);
  // the kick: a quick drop in the first part of the beat, eased back up by the next one
  float x = k / ${KICK_ATTACK.toFixed(3)};
  float kick = x * exp(1.0 - x);
  // the weight steps from one foot to the other on every beat
  float foot = mod(floor(beat), 2.0) * 2.0 - 1.0;
  float shift = foot * (2.0 * smoothstep(0.0, 0.35, k) - 1.0);
  bool upper = aPart > 0.5 && aPart < 2.5;
  bool fore = aPart > 4.5;
  if (upper || fore) {
    float side = (aPart < 1.5 || (fore && aPart < 5.5)) ? -1.0 : 1.0;
    // the arm on the side the weight goes to pumps harder; the elbows stay bent
    float pump = kick * (0.6 + 0.4 * step(0.0, side * foot));
    float raise = aMove.z + (pump * 0.34 - 0.08) * amp;
    float bend = 0.4 + (0.75 + 0.45 * pump) * min(1.0, amp + 0.15);
    vec3 elbow = vec3(side * ${SHOULDER_X.toFixed(2)}, ${ELBOW_Y.toFixed(2)}, 0.0);
    vec3 shoulder = vec3(side * ${SHOULDER_X.toFixed(2)}, ${SHOULDER_Y.toFixed(2)}, 0.0);
    if (fore) p = bhRotX(p - elbow * w, -bend) + elbow * w;
    p = bhRotX(p - shoulder * w, -raise) + shoulder * w;
    p = bhRotZ(p - shoulder * w, side * (0.05 + 0.05 * amp)) + shoulder * w;
  } else if (aPart > 2.5 && aPart < 3.5) {
    // a sharp nod on the kick
    vec3 neck = vec3(0.0, 1.5, 0.0);
    p = bhRotX(p - neck * w, 0.04 + kick * 0.26 * amp) + neck * w;
  }
  // only dancers bounce and step; people standing or sitting just nod along
  float dancing = smoothstep(0.45, 0.6, amp);
  // the knees give on the kick: the body drops over feet that stay put
  p.y -= kick * 0.05 * amp * dancing * smoothstep(0.2, 0.55, p.y) * w;
  float h = max(0.0, p.y - 0.9) * w;
  p.x += shift * 0.025 * h * amp * dancing;
  p.z += kick * 0.03 * h * amp * dancing;
  return p;
}
`;

/**
 * What a crowd wears, for a venue where it is not all black. Each colour comes with how often
 * it is worn. Tops and legs are chosen apart; a skirt or dress takes the colour of the top and
 * leaves the legs bare below the hem.
 */
export interface Dress {
  tops: [colour: string, weight: number][];
  legs: [colour: string, weight: number][];
  /** How many, 0 to 1, have bare upper arms, wear a skirt or dress, have a shaved head. */
  bareArms: number;
  skirts: number;
  shaved: number;
}

/**
 * A dressed crowd has more to its shader: trousers of their own colour, hems, and a seat.
 * Someone sitting has their thighs swung forward at the hip and their shins hung from the knee.
 */
const POSE_DRESSED = POSE.replace(
  'uniform float uBeat;',
  'uniform float uBeat;\nattribute vec3 legTone;\nattribute vec2 aWear; // skirt, seated\nvarying vec3 vLegs;\nvarying vec3 vTop;\nvarying float vIsLeg;\nvarying float vIsShoe;\nvarying float vHem;',
)
  .replace('bool fore = aPart > 4.5;', 'bool fore = aPart > 4.5 && aPart < 6.5;')
  .replace(
    'float amp = aMove.y;',
    `if (aWear.y > 0.5) {
    vec3 hip = vec3(0.0, 0.9, 0.0);
    if (aPart > 6.5 && aPart < 7.5) p = bhRotX(p - hip * w, -1.5708) + hip * w;
    else if (aPart > 7.5) p += vec3(0.0, 0.43, 0.43) * w;
  }
  float amp = aMove.y;`,
  );
/** How far below the top of a seat the feet of someone sitting on it are, for a figure of height 1. */
const SEAT = 0.83;

function material(dressed = false) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBeat = beatUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${dressed ? POSE_DRESSED : POSE}`)
      .replace(
        '#include <color_vertex>',
        '#include <color_vertex>\nvSkin = skinTone;\nvHair = hairTone;\nvIsSkin = step(1.5, color.r);\nvIsHair = step(1.5, color.g);\nvIsSleeve = step(1.5, color.b) * (1.0 - vIsSkin);\nvIsKit = step(2.5, color.r);\nvKit = color.g;\nvCloth = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\nvCloth = instanceColor.rgb;\n#endif\nvCloth = mix(vCloth, skinTone, aBare);' +
          (dressed
            ? '\nvLegs = legTone;\nvTop = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\nvTop = instanceColor.rgb;\n#endif\nfloat bhLower = (aPart < 0.5 || aPart > 6.5) ? 1.0 : 0.0;\nvIsLeg = bhLower * step(0.4, color.r) * (1.0 - step(0.9, color.r));\nvIsShoe = bhLower * (1.0 - step(0.4, color.r));\nvHem = aWear.x > 0.5 ? position.y : 10.0;'
            : ''),
      )
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = bhPose(objectNormal, 0.0);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = bhPose(transformed, 1.0);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vSkin;\nvarying vec3 vHair;\nvarying vec3 vCloth;\nvarying float vIsSkin;\nvarying float vIsHair;\nvarying float vIsSleeve;\nvarying float vIsKit;\nvarying float vKit;' +
          (dressed ? '\nvarying vec3 vLegs;\nvarying vec3 vTop;\nvarying float vIsLeg;\nvarying float vIsShoe;\nvarying float vHem;' : ''),
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vSkin, vIsSkin);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vHair, vIsHair);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vCloth, vIsSleeve);' +
          (dressed
            ? '\nvec3 bhLeg = vHem < 9.0 ? (vHem > 0.6 ? vTop : vSkin) : vLegs;\ndiffuseColor.rgb = mix(diffuseColor.rgb, bhLeg, step(0.5, vIsLeg));\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), step(0.5, vIsShoe));'
            : '') +
          '\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(vKit), step(0.5, vIsKit));',
      );
  };
  // the two kinds of crowd must not be handed each other's compiled shader
  if (dressed) m.customProgramCacheKey = () => 'crowd-dressed';
  return m;
}

export type Behaviour = 'stand' | 'dance' | 'talk' | 'bouncer' | 'dj' | 'sit';

export interface Person {
  x: number;
  y: number;
  z: number;
  facing: number;
  behaviour: Behaviour;
}

/** A crowd of figures in one InstancedMesh, moving to the beat. */
export class Crowd {
  readonly mesh: THREE.InstancedMesh;
  private people: (Person & { phase: number; scale: number; amp: number })[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(people: Person[], opts: { armsUp?: boolean; seed?: number; detail?: number; dress?: Dress; headphones?: boolean } = {}) {
    const rand = rng(opts.seed ?? 1);
    const dress = opts.dress;
    // headphones are for a DJ and nobody else: an entry with anyone else in it does not get them
    const headphones = !!opts.headphones && people.length > 0 && people.every((p) => p.behaviour === 'dj');
    const geometry = figure(opts.detail ?? figureDetail, !!dress, headphones);
    const move = new Float32Array(people.length * 3);
    const bare = new Float32Array(people.length);
    const skin = new Float32Array(people.length * 3);
    const hair = new Float32Array(people.length * 3);
    this.people = people.map((p, i) => {
      const s = SKIN[Math.floor(rand() * SKIN.length)];
      skin.set([s.r * 0.8, s.g * 0.8, s.b * 0.8], i * 3);
      // shaved heads are common at this door: those get the skin colour, a bit darker
      const shaved = p.behaviour === 'bouncer' || rand() < (dress ? dress.shaved : 0.18);
      const h = shaved ? s.clone().multiplyScalar(0.62) : HAIR[Math.floor(rand() * HAIR.length)];
      hair.set([h.r, h.g, h.b], i * 3);
      const phase = rand() * Math.PI * 2;
      const amp = 0.6 + rand() * 0.8;
      // how much the limbs move, and where the arms are held: down, working the air, or up
      const lively = p.behaviour === 'dance' ? amp : p.behaviour === 'bouncer' ? 0 : p.behaviour === 'talk' ? 0.22 : p.behaviour === 'sit' ? 0.14 : 0.08;
      const hold = opts.armsUp
        ? 2.3 + rand() * 0.6
        : p.behaviour === 'dance'
          ? rand() < 0.14
            ? 0.8 + rand() * 0.5
            : 0.12 + rand() * 0.3
          : p.behaviour === 'bouncer'
            ? 0.05
            : p.behaviour === 'sit'
              ? 0.35 + rand() * 0.35
              : 0.1 + rand() * 0.25;
      move.set([phase, lively, hold], i * 3);
      // vests and bare arms inside; coats on in the queue
      bare[i] = dress ? (p.behaviour !== 'bouncer' && rand() < dress.bareArms ? 1 : 0) : p.behaviour === 'dance' && rand() < 0.45 ? 1 : 0;
      return { ...p, phase, scale: p.behaviour === 'bouncer' ? 1.12 : 0.9 + rand() * 0.18, amp };
    });
    geometry.setAttribute('skinTone', new THREE.InstancedBufferAttribute(skin, 3));
    geometry.setAttribute('hairTone', new THREE.InstancedBufferAttribute(hair, 3));
    geometry.setAttribute('aMove', new THREE.InstancedBufferAttribute(move, 3));
    geometry.setAttribute('aBare', new THREE.InstancedBufferAttribute(bare, 1));
    this.mesh = new THREE.InstancedMesh(geometry, material(!!dress), people.length);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    const c = new THREE.Color();
    if (dress) {
      const pick = (list: [string, number][]) => {
        let k = rand() * list.reduce((sum, [, w]) => sum + w, 0);
        for (const [colour, w] of list) if ((k -= w) <= 0) return colour;
        return list[list.length - 1][0];
      };
      const legs = new Float32Array(people.length * 3);
      const wear = new Float32Array(people.length * 2);
      this.people.forEach((p, i) => {
        const staff = p.behaviour === 'bouncer';
        this.mesh.setColorAt(i, c.set(staff ? '#0c0c0d' : pick(dress.tops)));
        c.set(staff ? '#0a0a0b' : pick(dress.legs));
        legs.set([c.r, c.g, c.b], i * 3);
        wear.set([!staff && rand() < dress.skirts ? 1 : 0, p.behaviour === 'sit' ? 1 : 0], i * 2);
      });
      geometry.setAttribute('legTone', new THREE.InstancedBufferAttribute(legs, 3));
      geometry.setAttribute('aWear', new THREE.InstancedBufferAttribute(wear, 2));
    } else {
      this.people.forEach((p, i) => {
        c.copy(CLOTH[Math.floor(rand() * CLOTH.length)]);
        if (p.behaviour !== 'bouncer' && rand() < 0.08) c.set(['#5b1218', '#d8d6d0', '#2d3b2a', '#6e6a62'][Math.floor(rand() * 4)]);
        this.mesh.setColorAt(i, c);
      });
    }
    this.update(0, 0);
  }

  update(t: number, beat: number) {
    this.people.forEach((p, i) => {
      let y = p.y;
      let rx = 0;
      let rz = 0;
      let ry = p.facing;
      const b = beat + p.phase * 0.08;
      switch (p.behaviour) {
        case 'dance': {
          // on the kick, the same timing as the shader: lean into it, feet on the floor, and turn only a little
          const own = beat + (p.phase / (2 * Math.PI) - 0.5) * KICK_SPREAD;
          const kick = kickAt(own);
          const k = own - Math.floor(own);
          const foot = Math.floor(own) % 2 === 0 ? -1 : 1;
          rx = (0.03 + kick * 0.04) * p.amp;
          const step = Math.min(1, k / 0.35);
          rz = foot * (2 * step * step * (3 - 2 * step) - 1) * 0.02 * p.amp;
          ry += Math.sin(t * 0.13 + p.phase) * 0.18;
          break;
        }
        case 'dj':
          rx = 0.12 + Math.abs(Math.sin(b * Math.PI)) * 0.1;
          break;
        case 'talk':
          ry += Math.sin(t * 0.7 + p.phase) * 0.2;
          rz = Math.sin(t * 1.3 + p.phase) * 0.02;
          break;
        case 'bouncer':
          ry += Math.sin(t * 0.2 + p.phase) * 0.15;
          break;
        case 'sit':
          // `y` is the top of the seat
          y -= SEAT * p.scale;
          ry += Math.sin(t * 0.4 + p.phase) * 0.12;
          rz = Math.sin(t * 0.9 + p.phase) * 0.02;
          break;
        default:
          rz = Math.sin(t * 0.8 + p.phase) * 0.025;
          ry += Math.sin(t * 0.25 + p.phase) * 0.12;
      }
      this.e.set(rx, ry, rz);
      this.q.setFromEuler(this.e);
      this.v.set(p.x, y, p.z);
      this.s.setScalar(p.scale);
      if (p.behaviour === 'bouncer') this.s.set(p.scale * 1.15, p.scale, p.scale * 1.1);
      this.m.compose(this.v, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Scatter people in a rectangle, keeping them apart, and out of wherever `allowed` says no. */
export function scatter(n: number, x0: number, x1: number, z0: number, z1: number, y: number, behaviour: Behaviour, seed: number, face?: (x: number, z: number) => number, gap = 0.55, allowed?: (x: number, z: number) => boolean) {
  const rand = rng(seed);
  const out: Person[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 40) {
    const x = x0 + rand() * (x1 - x0);
    const z = z0 + rand() * (z1 - z0);
    if (allowed && !allowed(x, z)) continue;
    if (out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < gap * gap)) continue;
    out.push({ x, y, z, behaviour, facing: face ? face(x, z) + (rand() - 0.5) * 0.9 : rand() * Math.PI * 2 });
  }
  return out;
}
