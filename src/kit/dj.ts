import * as THREE from 'three';
import { Batch } from '../engine/geom';
import type { Pt } from '../engine/types';
import { canvasTexture, rng } from '../engine/util';
import type { Stage } from './stage';

/**
 * DJ equipment: what stands on a DJ desk. The pieces are the size and layout of a CDJ-3000, an
 * SL-1210 and a DJM-A9; no maker's name or logo is drawn.
 *
 * Two layouts: `full` is four players on a raked shelf with a turntable either side of the
 * mixer (Ministry of Sound's Box), and `cdjs` is two players with the mixer between them, flat
 * on the desk (The Baby Box, The Loft, The 103).
 *
 * Everything is built in the desk's own frame: x to the DJ's right, y up from the desk top,
 * z toward the DJ. Solid parts are merged by material and everything that gives light shares
 * one painted sheet, so the whole desk costs about fifteen draw calls. The screens scroll and
 * the platters turn while the music plays; by day the desk is switched off.
 */

/** How the desk is dressed. */
export type BoothLayout = 'full' | 'cdjs';

/** Sizes in metres. `top` is the height of the control surface. */
const PLAYER = { w: 0.329, d: 0.453, top: 0.093 };
const DECK = { w: 0.453, d: 0.36, top: 0.085 };
const MIXER = { w: 0.407, d: 0.458, top: 0.103 };
/** The players' shelf: how far it lifts their near edge off the desk, and its rake. */
const SHELF = { lift: 0.06, rake: 0.21 };
/** A record at 33 1/3, radians a second. */
const SPIN = (100 / 3 / 60) * Math.PI * 2;

/* ------------------------------------------------------------ the painted sheet ---- */
// Two player screens, the display in a jog wheel, the mixer's effects display, and a square
// of each lamp colour: a lamp is a small shape whose every corner looks at its square.
const SHEET = { w: 1024, h: 512 };
const LAMPS = { white: '#eef3ff', green: '#35e06a', amber: '#ffa02a', red: '#ff3524', blue: '#3a8cff', pink: '#ff3a8a', cyan: '#5ad0ff', violet: '#a45cff' };
type Lamp = keyof typeof LAMPS;
type Cell = [u0: number, v0: number, u1: number, v1: number];
const cell = (x: number, y: number, w: number, h: number): Cell => [x / SHEET.w, 1 - (y + h) / SHEET.h, (x + w) / SHEET.w, 1 - y / SHEET.h];
const SCREEN = { w: 512, h: 288 };
const SCREENS = [cell(1, 1, SCREEN.w - 2, SCREEN.h - 2), cell(SCREEN.w + 1, 1, SCREEN.w - 2, SCREEN.h - 2)];
/** The enlarged waveform within a screen: on a deck that is playing, a moving strip lies over it. */
const WAVE = { y: 34, h: 116 };
const JOG = cell(0, 296, 160, 160);
const FX = cell(176, 296, 160, 80);
const lampAt = (name: Lamp): [number, number] => {
  const k = Object.keys(LAMPS).indexOf(name);
  return [352 + (k % 4) * 40, 296 + Math.floor(k / 4) * 40];
};

type C2 = CanvasRenderingContext2D;

/** A stretch of waveform: blue for the low end, amber and white inside it, a kick every `beat` pixels. */
function waveform(c: C2, x0: number, y0: number, w: number, h: number, rand: () => number, beat = 32) {
  const mid = y0 + h / 2;
  let level = 0.6;
  for (let x = 0; x < w; x += 3) {
    level = Math.min(1, Math.max(0.3, level + (rand() - 0.5) * 0.2));
    const kick = Math.pow(1 - (x % beat) / beat, 2);
    const a = (h / 2) * level * (0.3 + 0.7 * kick) * (0.8 + 0.2 * rand());
    c.fillStyle = '#1f6fe0';
    c.fillRect(x0 + x, mid - a, 2, a * 2);
    c.fillStyle = '#ff9a2a';
    c.fillRect(x0 + x, mid - a * 0.5, 2, a);
    c.fillStyle = '#ffffff';
    c.fillRect(x0 + x, mid - a * 0.18, 2, a * 0.36);
  }
}

/** The enlarged waveform with its beat marks, every fourth one red. */
function paintWave(c: C2, x: number, y: number, w: number, h: number, rand: () => number) {
  c.fillStyle = '#080c12';
  c.fillRect(x, y, w, h);
  waveform(c, x, y + 8, w, h - 16, rand);
  for (let k = 0; k * 32 < w; k++) {
    c.fillStyle = k % 4 ? '#8a94a0' : '#ff3524';
    c.fillRect(x + k * 32, y, 2, 6);
    c.fillRect(x + k * 32, y + h - 6, 2, 6);
  }
}

/** A player's screen: title bar, the enlarged waveform with the playhead, time and tempo, the whole track. */
function paintScreen(c: C2, x0: number, seed: number, time: string, deck: number) {
  const rand = rng(seed);
  const W = SCREEN.w;
  c.save();
  c.translate(x0, 0);
  c.fillStyle = '#04060a';
  c.fillRect(0, 0, W, SCREEN.h);
  c.fillStyle = '#10151c';
  c.fillRect(0, 0, W, 26);
  c.fillStyle = '#2f7de8';
  c.fillRect(6, 5, 22, 16);
  // the title, as blocks: nothing here is meant to be read
  c.fillStyle = '#c9d2dc';
  for (let x = 40; x < 300; ) {
    const w = 12 + rand() * 34;
    c.fillRect(x, 9, w, 8);
    x += w + 6;
  }
  c.fillStyle = '#ffa02a';
  c.fillRect(440, 6, 30, 14);
  c.fillStyle = '#35e06a';
  c.fillRect(476, 6, 30, 14);
  paintWave(c, 0, WAVE.y, W, WAVE.h, rand);
  c.fillStyle = '#ffffff';
  c.fillRect(W / 2 - 1, WAVE.y, 2, WAVE.h);
  c.textBaseline = 'top';
  c.fillStyle = '#e8eef5';
  c.font = 'bold 40px monospace';
  c.fillText(time, 10, 162);
  c.font = 'bold 34px monospace';
  c.fillText('128.0', 386, 167);
  c.strokeStyle = '#2f7de8';
  c.lineWidth = 2;
  c.strokeRect(374, 160, 128, 48);
  c.fillStyle = '#8a94a0';
  c.font = 'bold 18px monospace';
  c.fillText('+0.00%', 270, 182);
  // the whole track along the bottom, what has been played dimmer
  c.fillStyle = '#080c12';
  c.fillRect(0, 222, W, 44);
  const played = 60 + rand() * 300;
  for (let x = 0; x < W; x += 2) {
    const a = 4 + 16 * (0.4 + 0.6 * rand()) * (x % 128 < 96 ? 1 : 0.35);
    c.fillStyle = x < played ? '#1b3d70' : '#2f7de8';
    c.fillRect(x, 244 - a, 1.5, a * 2);
  }
  c.fillStyle = '#ffffff';
  c.fillRect(played, 220, 2, 48);
  for (let k = 0; k < 4; k++) {
    c.fillStyle = k === deck ? '#2f7de8' : '#18222e';
    c.fillRect(196 + k * 30, 272, 26, 10);
  }
  c.restore();
}

function sheet() {
  return canvasTexture(SHEET.w, SHEET.h, (c) => {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, SHEET.w, SHEET.h);
    paintScreen(c, 0, 71, '03:42', 1);
    paintScreen(c, SCREEN.w, 72, '01:17', 2);
    // the display in the middle of a jog wheel: a ring that fills as the track plays, the cover in the middle
    c.save();
    c.translate(80, 376);
    c.fillStyle = '#020304';
    c.fillRect(-80, -80, 160, 160);
    c.lineWidth = 9;
    c.strokeStyle = '#1a2633';
    c.beginPath();
    c.arc(0, 0, 66, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#5ad0ff';
    c.beginPath();
    c.arc(0, 0, 66, -Math.PI / 2, Math.PI * 0.7);
    c.stroke();
    const cover = c.createLinearGradient(-30, -30, 30, 30);
    cover.addColorStop(0, '#ff9a2a');
    cover.addColorStop(1, '#7a2cff');
    c.fillStyle = cover;
    c.fillRect(-30, -30, 60, 60);
    c.restore();
    // the mixer's effects display: the tempo, which effect, which beat
    c.fillStyle = '#04060a';
    c.fillRect(176, 296, 160, 80);
    c.textBaseline = 'top';
    c.fillStyle = '#e8eef5';
    c.font = 'bold 46px monospace';
    c.fillText('128', 184, 308);
    c.fillStyle = '#2f7de8';
    c.fillRect(276, 306, 52, 14);
    for (let k = 0; k < 4; k++) {
      c.fillStyle = k === 0 ? '#ffa02a' : '#18222e';
      c.fillRect(276 + k * 13.5, 330, 11, 11);
    }
    c.fillStyle = '#8a94a0';
    c.fillRect(276, 352, 40, 8);
    for (const name of Object.keys(LAMPS) as Lamp[]) {
      const [x, y] = lampAt(name);
      c.fillStyle = LAMPS[name];
      c.fillRect(x, y, 40, 40);
    }
  });
}

/** A record: grooves, a sheen across them so that the spin reads, a plain label. After Berghain's. */
function recordTexture(hue: number) {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#060606';
    c.fillRect(0, 0, w, h);
    c.translate(w / 2, h / 2);
    for (let r = 46; r < 124; r += 2) {
      c.strokeStyle = `rgba(255,255,255,${r % 14 === 0 ? 0 : 0.035 + (r % 6) * 0.006})`;
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.stroke();
    }
    const sheen = c.createLinearGradient(-120, -120, 120, 120);
    sheen.addColorStop(0.35, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.16)');
    sheen.addColorStop(0.65, 'rgba(255,255,255,0)');
    c.fillStyle = sheen;
    c.beginPath();
    c.arc(0, 0, 124, 0, Math.PI * 2);
    c.arc(0, 0, 46, 0, Math.PI * 2, true);
    c.fill();
    c.fillStyle = `hsl(${hue},45%,40%)`;
    c.beginPath();
    c.arc(0, 0, 42, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(-30, -16, 34, 5);
    c.fillRect(-30, -6, 22, 3);
    c.fillStyle = '#0a0a0a';
    c.beginPath();
    c.arc(0, 0, 3.5, 0, Math.PI * 2);
    c.fill();
  });
}

/* ----------------------------------------------------------------- shapes ---- */
const T = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
/** A box standing on y = 0. */
const slab = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
/** An upright cylinder standing on y = 0. */
const drum = (r: number, h: number, sides = 12) => new THREE.CylinderGeometry(r, r, h, sides).translate(0, h / 2, 0);
/** A cylinder lying along x, centred. */
const rod = (r: number, length: number, sides = 8) => new THREE.CylinderGeometry(r, r, length, sides).rotateZ(Math.PI / 2);
// flat shapes facing up; a picture on them reads the right way up from the DJ's side
const disc = (r: number, sides = 32) => new THREE.CircleGeometry(r, sides).rotateX(-Math.PI / 2);
const plate = (w: number, d: number) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
const ring = (r0: number, r1: number, sides = 40) => new THREE.RingGeometry(r0, r1, sides).rotateX(-Math.PI / 2);

/** Show a part of the sheet on a shape. */
function onSheet<G extends THREE.BufferGeometry>(g: G, [u0, v0, u1, v1]: Cell) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return g;
}
const lamp = <G extends THREE.BufferGeometry>(name: Lamp, g: G) => {
  const [x, y] = lampAt(name);
  return onSheet(g, cell(x + 20, y + 20, 0, 0));
};

/** A shelf that rises away from the DJ: `near` and `far` are its two edges in z, with the height at each. */
function wedge(w: number, near: number, nearH: number, far: number, farH: number) {
  const x = w / 2;
  const v = {
    nl: [-x, 0, near], nr: [x, 0, near], nlt: [-x, nearH, near], nrt: [x, nearH, near],
    fl: [-x, 0, far], fr: [x, 0, far], flt: [-x, farH, far], frt: [x, farH, far],
  };
  const quads = [
    [v.nl, v.nr, v.nrt, v.nlt],
    [v.fr, v.fl, v.flt, v.frt],
    [v.nlt, v.nrt, v.frt, v.flt],
    [v.fl, v.nl, v.nlt, v.flt],
    [v.nr, v.fr, v.frt, v.nrt],
  ];
  const pos: number[] = [];
  for (const [a, b, c, d] of quads) pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

type Place = (material: THREE.Material, geometry: THREE.BufferGeometry, x?: number, y?: number, z?: number) => void;
const into = (batch: Batch, m: THREE.Matrix4): Place => (material, geometry, x = 0, y = 0, z = 0) => batch.add(material, geometry, m.clone().multiply(T(x, y, z)));

interface Gear {
  root: THREE.Group;
  solid: Batch;
  glow: Batch;
  /** Small knobs and buttons, on the detail levels that have small props. */
  detail: boolean;
  mat: {
    body: THREE.Material;
    face: THREE.Material;
    rubber: THREE.Material;
    knob: THREE.Material;
    silver: THREE.Material;
    plinth: THREE.Material;
    /** The sheet, steady; and two copies that follow the beat, for the meters. */
    lit: THREE.MeshBasicMaterial;
    beat: THREE.MeshBasicMaterial;
    peak: THREE.MeshBasicMaterial;
    waves: THREE.MeshBasicMaterial[];
  };
  /** Things that turn while the music plays. */
  spin: THREE.Object3D[];
}

/* ------------------------------------------------------------ media player ---- */
// From the back: the screen in a hood that tips it toward the DJ, a row of eight hot cues, the
// jog wheel with its ring of light and a display in the middle, play and cue at the lower left,
// the tempo slider down the right.
function player(g: Gear, m: THREE.Matrix4, n: number, live: boolean) {
  const { body, face, rubber, knob, lit } = g.mat;
  const s = into(g.solid, m);
  const l = into(g.glow, m);
  const top = PLAYER.top;
  const rand = rng(40 + n);
  s(rubber, slab(PLAYER.w - 0.02, 0.012, PLAYER.d - 0.02));
  s(body, slab(PLAYER.w, top - 0.015, PLAYER.d), 0, 0.012);
  s(face, slab(PLAYER.w - 0.008, 0.003, PLAYER.d - 0.008), 0, top - 0.003);

  const hood = m.clone().multiply(T(0, top - 0.004, -PLAYER.d / 2 + 0.072)).multiply(new THREE.Matrix4().makeRotationX(0.17));
  const hs = into(g.solid, hood);
  const hl = into(g.glow, hood);
  hs(body, slab(0.305, 0.04, 0.135), 0, -0.018);
  const sw = 0.2;
  const sd = (sw * SCREEN.h) / SCREEN.w;
  hl(lit, onSheet(plate(sw, sd), SCREENS[n % 2]), 0, 0.0225);
  if (live) {
    // the waveform runs under a playhead that stays where it is
    const wd = (sd * WAVE.h) / SCREEN.h;
    const wz = -sd / 2 + (sd * (WAVE.y + WAVE.h / 2)) / SCREEN.h;
    hl(g.mat.waves[n % 2], plate(sw, wd), 0, 0.0228, wz);
    hl(lit, lamp('white', plate(0.0012, wd)), 0, 0.0231, wz);
  }
  if (g.detail) {
    hs(knob, drum(0.011, 0.012), 0.13, 0.022, 0.012);
    for (const z of [-0.03, -0.012]) hs(knob, slab(0.02, 0.003, 0.01), 0.13, 0.022, z);
    for (const z of [-0.03, -0.012, 0.006]) hs(knob, slab(0.02, 0.003, 0.01), -0.13, 0.022, z);
  }
  hl(lit, lamp('red', slab(0.005, 0.003, 0.005)), -0.13, 0.022, 0.03);

  const cues: Lamp[] = ['green', 'green', 'pink', 'blue', 'amber', 'green', 'violet', 'cyan'];
  cues.forEach((c, k) => l(lit, lamp(c, slab(0.022, 0.004, 0.012)), -0.105 + k * 0.03, top, -0.07));
  // loop in and out, lit while a loop is set
  for (const x of [-0.132, -0.104]) l(lit, lamp('amber', slab(0.022, 0.004, 0.011)), x, top, -0.045);
  if (g.detail) for (const x of [0.104, 0.132]) s(knob, slab(0.022, 0.004, 0.011), x, top, -0.045);

  const jz = 0.075;
  // The wheel stands on a collar that carries the ring of light, and its edge is bevelled, so
  // the whole ring shows from where the DJ stands and not only the near half.
  s(body, drum(0.113, 0.007, 40), 0, top, jz);
  l(lit, lamp('white', ring(0.1065, 0.1105, 48)), 0, top + 0.0073, jz);
  s(rubber, new THREE.CylinderGeometry(0.097, 0.103, 0.007, 40).translate(0, 0.0035, 0), 0, top + 0.007, jz);
  s(face, drum(0.09, 0.0015, 36), 0, top + 0.014, jz);
  const jogTop = top + 0.0155;
  l(lit, onSheet(disc(0.037, 28), JOG), 0, jogTop + 0.0004, jz);
  // the mark that goes round the display as the track plays
  const mark = lamp('white', slab(0.004, 0.0004, 0.012).translate(0, 0, -0.03));
  if (live) {
    const pivot = new THREE.Group();
    pivot.applyMatrix4(m.clone().multiply(T(0, jogTop + 0.0007, jz)));
    const hand = new THREE.Mesh(mark, lit);
    pivot.add(hand);
    g.root.add(pivot);
    g.spin.push(hand);
  } else {
    into(g.glow, m.clone().multiply(T(0, jogTop + 0.0007, jz)).multiply(new THREE.Matrix4().makeRotationY(rand() * 6)))(lit, mark);
  }

  for (const [z, colour] of [
    [0.152, 'amber'],
    [0.195, 'green'],
  ] as [number, Lamp][]) {
    s(rubber, drum(0.015, 0.006, 16), -0.132, top, z);
    l(lit, lamp(colour, ring(0.0155, 0.019, 20)), -0.132, top + 0.0006, z);
  }
  const tz = 0.1 + (rand() - 0.5) * 0.05;
  s(rubber, slab(0.012, 0.0015, 0.115), 0.138, top, 0.1);
  s(knob, slab(0.022, 0.011, 0.013), 0.138, top, tz);
  l(lit, lamp('white', slab(0.016, 0.0004, 0.0015)), 0.138, top + 0.011, tz);
  l(lit, lamp('red', slab(0.004, 0.0035, 0.004)), 0.124, top, 0.012);
  if (g.detail) {
    for (const z of [-0.006, 0.012]) s(knob, slab(0.02, 0.003, 0.009), 0.14, top, z);
    for (const z of [-0.01, 0.008, 0.035, 0.053]) s(knob, slab(0.022, 0.003, 0.011), -0.14, top, z);
    for (const z of [0.185, 0.207]) s(knob, drum(0.007, 0.01, 10), 0.138, top, z);
  }
}

/* --------------------------------------------------------------- turntable ---- */
// The platter left of centre with the record on it, the tonearm from the far right corner, the
// pitch fader down the right, start/stop and the strobe light at the near left corner.
function turntable(g: Gear, m: THREE.Matrix4, hue: number) {
  const { body, rubber, knob, silver, plinth, lit } = g.mat;
  const s = into(g.solid, m);
  const l = into(g.glow, m);
  const top = DECK.top;
  for (const fx of [-1, 1]) for (const fz of [-1, 1]) s(rubber, drum(0.028, 0.02), fx * (DECK.w / 2 - 0.045), 0, fz * (DECK.d / 2 - 0.045));
  s(plinth, slab(DECK.w, top - 0.018, DECK.d), 0, 0.018);

  const px = -0.05;
  const pz = -0.005;
  s(silver, drum(0.166, 0.02, 48), px, top, pz);
  // the dark band of strobe dots round the rim
  s(body, new THREE.CylinderGeometry(0.168, 0.168, 0.008, 48, 1, true), px, top + 0.008, pz);
  s(rubber, drum(0.151, 0.003, 40), px, top + 0.02, pz);
  s(silver, drum(0.0036, 0.016, 8), px, top + 0.02, pz);
  const record = new THREE.Mesh(disc(0.15, 40), new THREE.MeshStandardMaterial({ map: recordTexture(hue), roughness: 0.28, metalness: 0.2 }));
  record.position.set(px, top + 0.0238, pz).applyMatrix4(m);
  g.root.add(record);
  g.spin.push(record);

  // the tonearm, turned so that the stylus sits in the outer third of the record
  const ax = 0.168;
  const az = -0.095;
  const length = 0.24;
  const reach = Math.hypot(px - ax, pz - az);
  const turn = Math.atan2(pz - az, px - ax) - Math.acos((reach * reach + length * length - 0.125 * 0.125) / (2 * reach * length));
  s(silver, drum(0.03, 0.014, 20), ax, top, az);
  s(body, drum(0.024, 0.03, 16), ax, top + 0.014, az);
  const arm = into(g.solid, m.clone().multiply(T(ax, top + 0.048, az)).multiply(new THREE.Matrix4().makeRotationY(-turn)));
  arm(silver, rod(0.004, 0.25), 0.095);
  arm(body, rod(0.016, 0.035, 12), -0.045);
  arm(body, slab(0.04, 0.005, 0.018), length - 0.005, -0.004);
  arm(rubber, slab(0.014, 0.014, 0.014), length, -0.018);
  s(silver, drum(0.004, 0.03, 6), 0.205, top, -0.02);

  s(rubber, slab(0.022, 0.002, 0.118), 0.192, top, 0.1);
  s(knob, slab(0.03, 0.01, 0.014), 0.192, top, 0.1);
  l(lit, lamp('green', slab(0.004, 0.0025, 0.004)), 0.176, top, 0.1);
  s(silver, drum(0.017, 0.028, 16), -0.2, top, 0.142);
  l(lit, lamp('red', slab(0.006, 0.006, 0.003)), -0.188, top + 0.012, 0.13);
  s(knob, slab(0.044, 0.006, 0.03), -0.15, top, 0.162);
  for (const x of [-0.108, -0.084]) s(knob, slab(0.02, 0.005, 0.01), x, top, 0.168);
  l(lit, lamp('red', slab(0.004, 0.0052, 0.003)), -0.108, top, 0.1755);
  s(silver, drum(0.007, 0.028, 8), 0.118, top, 0.158);
  s(silver, drum(0.019, 0.006, 16), -0.19, top, -0.145);
}

/* ------------------------------------------------------------------- mixer ---- */
// Four channels side by side, each from the back: trim, three bands of EQ with a level meter
// beside them, colour, cue, the fader. Microphone and headphones down the left; master, the
// effects display and its controls down the right; the crossfader along the front.
function mixer(g: Gear, m: THREE.Matrix4) {
  const { body, face, rubber, knob, silver, lit, beat, peak } = g.mat;
  const s = into(g.solid, m);
  const l = into(g.glow, m);
  const top = MIXER.top;
  s(rubber, slab(MIXER.w - 0.02, 0.012, MIXER.d - 0.02));
  s(body, slab(MIXER.w, top - 0.015, MIXER.d), 0, 0.012);
  s(face, slab(MIXER.w - 0.008, 0.003, MIXER.d - 0.008), 0, top - 0.003);

  /** A column of twelve lamps: so many always lit, so many that come on with the beat, so many that only flash. */
  const meter = (x: number, steady: number, beats: number, peaks: number) => {
    for (let k = 0; k < steady + beats + peaks; k++) {
      const material = k < steady ? lit : k < steady + beats ? beat : peak;
      l(material, lamp(k < 8 ? 'green' : k < 10 ? 'amber' : 'red', slab(0.006, 0.0015, 0.0055)), x, top, -0.07 - k * 0.0085);
    }
  };
  // the two middle channels carry the players that are running; the outer two are down
  const channels = [-0.1, -0.048, 0.004, 0.056];
  const up = [0.1, 0.95, 0.8, 0];
  channels.forEach((x, k) => {
    const playing = k === 1 || k === 2;
    if (g.detail) {
      s(knob, drum(0.008, 0.014, 10), x, top, -0.19);
      for (const z of [-0.152, -0.114, -0.076]) s(knob, drum(0.0095, 0.016, 10), x, top, z);
      s(knob, drum(0.012, 0.016), x, top, -0.03);
    }
    if (playing) meter(x + 0.02, 7, 3, 1);
    if (k === 0) l(lit, lamp('amber', slab(0.022, 0.004, 0.012)), x, top, 0.012);
    else if (g.detail) s(knob, slab(0.022, 0.004, 0.012), x, top, 0.012);
    const fz = 0.135 - 0.08 * up[k];
    s(rubber, slab(0.005, 0.0012, 0.1), x, top, 0.095);
    s(knob, slab(0.02, 0.012, 0.011), x, top, fz);
    l(lit, lamp('white', slab(0.016, 0.0004, 0.0015)), x, top + 0.012, fz);
  });
  for (const x of [0.094, 0.103]) meter(x, 8, 2, 1);
  s(rubber, slab(0.09, 0.0012, 0.005), -0.022, top, 0.2);
  s(knob, slab(0.011, 0.012, 0.02), -0.022, top, 0.2);

  l(lit, onSheet(plate(0.07, 0.035), FX), 0.158, top + 0.0006, -0.1);
  s(rubber, drum(0.015, 0.006, 16), 0.158, top, 0.165);
  l(lit, lamp('blue', disc(0.0125, 16)), 0.158, top + 0.0064, 0.165);
  if (g.detail) {
    for (const z of [-0.19, -0.155, -0.12, -0.085]) s(knob, drum(0.008, 0.014, 10), -0.168, top, z);
    for (const z of [0.1, 0.15]) s(knob, drum(0.0105, 0.016), -0.168, top, z);
    s(silver, drum(0.006, 0.004, 10), -0.168, top, 0.195);
    s(knob, drum(0.012, 0.016), 0.158, top, -0.19);
    s(knob, drum(0.0095, 0.016, 10), 0.158, top, -0.15);
    for (const x of [0.146, 0.17]) s(knob, slab(0.02, 0.004, 0.011), x, top, -0.065);
    for (const [z, r] of [
      [-0.03, 0.011],
      [0.01, 0.0095],
      [0.06, 0.013],
      [0.11, 0.011],
    ]) s(knob, drum(r, 0.016), 0.158, top, z);
  }
}

/** The materials and batches a desk's pieces are built from. */
function makeGear(stage: Stage, root: THREE.Group): Gear {
  const fin = stage.mats;
  const map = sheet();
  const lit = () => new THREE.MeshBasicMaterial({ map });
  const strip = canvasTexture(512, 128, (c, w, h) => paintWave(c, 0, 0, w, h, rng(73)), { repeat: [1, 1] });
  return {
    root,
    solid: new Batch(),
    glow: new Batch(),
    detail: stage.quality.props,
    mat: {
      body: fin.plain('#141416', { rough: 0.5, metal: 0.4 }),
      face: fin.plain('#0b0b0c', { rough: 0.35, metal: 0.2 }),
      rubber: fin.plain('#0a0a0a', { rough: 0.95 }),
      knob: fin.plain('#3a3c42', { rough: 0.55, metal: 0.3 }),
      // kept below the level at which bloom takes hold under the house lights
      silver: fin.plain('#7d7f83', { rough: 0.5, metal: 0.55 }),
      plinth: fin.plain('#2b2c30', { rough: 0.45, metal: 0.6 }),
      lit: lit(),
      beat: lit(),
      peak: lit(),
      // the two decks that are playing show different stretches of the same strip
      waves: [0, 0.37].map((offset) => {
        const t = strip.clone();
        t.offset.x = offset;
        t.needsUpdate = true;
        return new THREE.MeshBasicMaterial({ map: t });
      }),
    },
    spin: [],
  };
}

/** Merge what was built, and keep it alive: meters on the beat, screens scrolling, records turning; dark while the club is closed. */
function finishGear(stage: Stage, g: Gear) {
  g.solid.build(g.root);
  g.glow.build(g.root, { cast: false, receive: false });

  const lamps = [g.mat.lit, g.mat.beat, g.mat.peak, ...g.mat.waves];
  // while the club is closed the desk is switched off
  stage.onTime((open) => {
    for (const m of lamps) m.color.setScalar(open ? 1 : 0.04);
  });
  stage.animate(({ t, pulse }, open) => {
    if (!open) return;
    g.mat.beat.color.setScalar(0.15 + 0.85 * pulse);
    g.mat.peak.color.setScalar(pulse > 0.7 ? 1 : 0.05);
    g.mat.waves.forEach((w, i) => (w.map!.offset.x = (t * 0.22 + i * 0.37) % 1));
    for (const o of g.spin) o.rotation.y = -t * SPIN;
  });
}

/** How big each piece is, in metres: `w` across the DJ, `d` away from them, `top` the height of its control surface. */
export const DJ_SIZES = { player: PLAYER, turntable: DECK, mixer: MIXER };

/** One piece on a desk, placed by its centre in the desk's frame: x to the DJ's right, z toward the DJ. */
export type DeskPiece =
  | { kind: 'turntable'; x: number; z?: number; /** The colour of the record's label, as a hue in degrees. */ hue?: number }
  | { kind: 'player'; x: number; z?: number; /** Whether a track is running on it. */ live?: boolean }
  | { kind: 'mixer'; x: number; z?: number };

/**
 * Any arrangement of the pieces, for a booth that is not one of the two layouts: four
 * turntables and a mixer, say, with room left for a venue's own machine. `frame` places the
 * desk's frame in the stage: its origin on the desk top, x to the DJ's right, y up, z toward the DJ.
 */
export function djPieces(stage: Stage, frame: THREE.Matrix4, pieces: DeskPiece[]) {
  const root = new THREE.Group();
  root.applyMatrix4(frame);
  stage.group.add(root);
  const g = makeGear(stage, root);
  let players = 0;
  for (const p of pieces) {
    const at = T(p.x, 0, p.z ?? 0);
    if (p.kind === 'turntable') turntable(g, at, p.hue ?? 205);
    else if (p.kind === 'mixer') mixer(g, at);
    else player(g, at, players++, p.live ?? true);
  }
  finishGear(stage, g);
  return root;
}

/**
 * Dress a DJ desk. `desk` is its outline on the floor, a rectangle: the first two corners are
 * the crowd's side, the last is the DJ's corner next to the first. `top` is the height of the
 * desk top. `layout` is `full` unless the booth wants only the two players and the mixer.
 */
export function djGear(stage: Stage, desk: Pt[], top: number, layout: BoothLayout = 'full') {
  const [a, b, , d] = desk;
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3(b[0] - a[0], 0, b[1] - a[1]).normalize();
  const toDj = new THREE.Vector3(d[0] - a[0], 0, d[1] - a[1]);
  const depth = toDj.length();
  toDj.normalize();
  // whichever way round the corners were listed, x is the DJ's right
  if (new THREE.Vector3().crossVectors(right, up).dot(toDj) < 0) right.negate();
  const root = new THREE.Group();
  root.applyMatrix4(new THREE.Matrix4().makeBasis(right, up, toDj).setPosition(desk.reduce((n, p) => n + p[0], 0) / desk.length, top, desk.reduce((n, p) => n + p[1], 0) / desk.length));
  stage.group.add(root);

  const g = makeGear(stage, root);

  // Everything's near edge sits the same distance from the DJ's edge of the desk.
  const near = depth / 2 - 0.05;
  mixer(g, T(0, 0, near - MIXER.d / 2));
  if (layout === 'cdjs') {
    // two players either side of the mixer, both running, flat on the desk
    const beside = MIXER.w / 2 + 0.03 + PLAYER.w / 2;
    player(g, T(-beside, 0, near - PLAYER.d / 2), 0, true);
    player(g, T(beside, 0, near - PLAYER.d / 2), 1, true);
  } else {
    // Front row: a turntable either side of the mixer. Back row: four players on a shelf that
    // tips them toward the DJ; the middle two are playing.
    const beside = MIXER.w / 2 + 0.035 + DECK.w / 2;
    turntable(g, T(-beside, 0, near - DECK.d / 2), 205);
    turntable(g, T(beside, 0, near - DECK.d / 2), 12);
    const foot = near - MIXER.d - 0.08;
    const pitch = PLAYER.w + 0.03;
    const rake = new THREE.Matrix4().makeRotationX(SHELF.rake);
    for (let n = 0; n < 4; n++) {
      const m = T((n - 1.5) * pitch, SHELF.lift, foot).multiply(rake).multiply(T(0, 0, -PLAYER.d / 2));
      player(g, m, n, n === 1 || n === 2);
    }
    const run = PLAYER.d * Math.cos(SHELF.rake) + 0.012;
    const slope = Math.tan(SHELF.rake);
    into(g.solid, new THREE.Matrix4())(g.mat.rubber, wedge(4 * pitch + 0.01, foot + 0.012, SHELF.lift - 0.002 - 0.012 * slope, foot - run, SHELF.lift - 0.002 + run * slope));
  }

  finishGear(stage, g);
}

/**
 * A DJ booth: a desk on a plinth with the gear on it, standing at `at` on the floor at y and
 * facing the crowd along `facing` (radians about the vertical; 0 faces +z, so the DJ stands on
 * the -z side). Returns where the DJ stands, for a `dj` crowd entry.
 */
export function djBooth(stage: Stage, o: { at: Pt; y: number; facing?: number; width?: number; depth?: number; height?: number; layout?: BoothLayout; colour?: string }) {
  const facing = o.facing ?? 0;
  const width = o.width ?? (o.layout === 'cdjs' ? 1.8 : 2.6);
  const depth = o.depth ?? 0.8;
  const height = o.height ?? 0.95;
  const m = new THREE.Matrix4().makeRotationY(facing).setPosition(o.at[0], o.y, o.at[1]);
  const corner = (x: number, z: number): Pt => {
    const v = new THREE.Vector3(x, 0, z).applyMatrix4(m);
    return [v.x, v.z];
  };
  // the desk: a black box, a lip along the crowd's side
  const body = stage.mats.plain(o.colour ?? '#111113', { rough: 0.7 });
  stage.batch.add(body, new THREE.BoxGeometry(width, height, depth).translate(0, height / 2, 0), m);
  stage.batch.add(body, new THREE.BoxGeometry(width + 0.1, 0.12, 0.08).translate(0, height + 0.06, depth / 2 - 0.04), m);
  djGear(stage, [corner(-width / 2, depth / 2), corner(width / 2, depth / 2), corner(width / 2, -depth / 2), corner(-width / 2, -depth / 2)], o.y + height, o.layout ?? 'full');
  const dj = new THREE.Vector3(0, 0, -depth / 2 - 0.45).applyMatrix4(m);
  return { x: dj.x, y: o.y, z: dj.z, facing };
}
