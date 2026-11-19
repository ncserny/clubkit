import * as THREE from 'three';
import { canvasTexture, rng } from '../../engine/util';
import { Batch, boxAt, extrude, along, ribbon, offsetPath } from '../../engine/geom';
import { brick, checkerPlate, dancefloor, facadeConcrete, gravel, grime, rawConcrete, relief, weatheredConcrete, windowPanes } from '../../engine/materials';
import { mapBuilding } from '../../engine/city';
import { setFigureDetail } from '../../engine/people';
import { beamGeometry, beamMaterial, dustCloud } from '../../engine/fx';
import { barrierGeometry, boxTruss, railLine as engineRailLine, steelStair } from '../../engine/props';
import type { BuildContext, FrameState, VenueHooks } from '../../engine/types';
import { buildBooth } from './booth';
import {
  BIERHOF_ID,
  BULB_POLES,
  CROSS,
  DOOR_Z,
  FENCE_RUNS,
  FLOOD_POLES,
  GARDEN_BENCHES,
  GROUND_BENCHES,
  GROUND_COLUMN_Z,
  GROUND_WALLS,
  HALL_COLUMNS,
  H_KESSEL,
  H_MACHINE,
  IN_X,
  IN_Z,
  KANTINE_ID,
  L2,
  LADDER_TOP,
  PANO_SEATS,
  PIPE_SEATS,
  PODIUMS,
  QUEUE_PATH,
  ROT,
  SPEAKER_STACKS,
  T,
  W2,
} from './plan';

/**
 * The dressing of Berghain: facades, slabs, the turbine hall's frame, the rig, the bars,
 * the forecourt and the garden. Where things stand comes from plan.ts; what can be walked
 * on, the lights and the crowds are built by the engine from the same plan.
 */

/* ------------------------------------------------------------ textures ---- */

function shutterTexture() {
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5a5a58';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) {
      const g = ctx.createLinearGradient(0, y, 0, y + 12);
      g.addColorStop(0, '#7a7a76');
      g.addColorStop(0.5, '#4d4d4b');
      g.addColorStop(1, '#2f2f2e');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, 12);
    }
  });
}

/** An abstract large-format print for the Panorama Bar walls (original, not a reproduction of anything). */
function print(seed: number) {
  const rand = rng(seed);
  return canvasTexture(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#f2efe8';
    ctx.fillRect(0, 0, w, h);
    const hue = rand() * 360;
    ctx.fillStyle = `hsl(${hue},30%,20%)`;
    ctx.fillRect(24, 24, w - 48, h - 48);
    for (let i = 0; i < 9; i++) {
      const x = 24 + rand() * (w - 48);
      const y = 24 + rand() * (h - 48);
      const r = 60 + rand() * 220;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `hsla(${hue + rand() * 120 - 60},${50 + rand() * 40}%,${40 + rand() * 30}%,0.85)`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.save();
      ctx.beginPath();
      ctx.rect(24, 24, w - 48, h - 48);
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  });
}

/** Sprayed from the pavement to as high as an arm or a ladder reaches: tags, throw-ups, pieces, buffed patches, stickers. All invented. */
function graffitiWall(seed: number, sheet = false) {
  const rand = rng(seed);
  const palette = ['#e8402a', '#f2c230', '#36b37e', '#2f6fd6', '#d94a9c', '#8c52d9', '#f07c1e', '#47c7d9', '#c8e04a', '#f4f1ea', '#141414'];
  const pick = () => palette[Math.floor(rand() * palette.length)];
  const letters = 'ABCDEKMNORSTVWXYZ';
  const word = (n: number) => Array.from({ length: n }, () => letters[Math.floor(rand() * letters.length)]).join('');
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    if (sheet) {
      ctx.fillStyle = '#5c5f61';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, 0, 3, h);
      }
    } else {
      ctx.fillStyle = '#77726a';
      ctx.fillRect(0, 0, w, h);
      // rustication: a channel every 0.6 m
      for (let y = h; y > 0; y -= h / (5.2 / 0.6)) {
        ctx.fillStyle = 'rgba(20,18,16,0.5)';
        ctx.fillRect(0, y - 5, w, 8);
      }
    }
    // patches buffed over in grey, beige and black
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = ['#8c867c', '#6d6a64', '#a39a88', '#262626', '#56524c'][Math.floor(rand() * 5)];
      ctx.globalAlpha = 0.85;
      ctx.fillRect(rand() * w, h * 0.25 + rand() * h * 0.6, 80 + rand() * 260, 60 + rand() * 200);
      ctx.globalAlpha = 1;
    }
    ctx.lineJoin = 'round';
    // pieces: big filled letters with outlines and a highlight
    for (let i = 0; i < 6; i++) {
      const size = 120 + rand() * 170;
      const x = rand() * w * 0.8 - 40;
      const y = h * 0.42 + rand() * h * 0.5;
      const t = word(3 + Math.floor(rand() * 3));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rand() - 0.5) * 0.2);
      ctx.font = `900 ${size}px Impact, 'Arial Black', sans-serif`;
      const fill = pick();
      ctx.lineWidth = size * 0.12;
      ctx.strokeStyle = '#111';
      ctx.strokeText(t, 6, 6);
      ctx.strokeText(t, 0, 0);
      const g = ctx.createLinearGradient(0, -size, 0, 0);
      g.addColorStop(0, fill);
      g.addColorStop(1, pick());
      ctx.fillStyle = g;
      ctx.fillText(t, 0, 0);
      ctx.lineWidth = size * 0.025;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.strokeText(t, -size * 0.02, -size * 0.02);
      ctx.restore();
    }
    // throw-ups: silver fill, black line
    for (let i = 0; i < 4; i++) {
      const size = 90 + rand() * 90;
      ctx.save();
      ctx.translate(rand() * w * 0.85, h * 0.35 + rand() * h * 0.55);
      ctx.font = `900 ${size}px 'Arial Black', Impact, sans-serif`;
      const t = word(2 + Math.floor(rand() * 2));
      ctx.lineWidth = size * 0.08;
      ctx.strokeStyle = '#0d0d0d';
      ctx.strokeText(t, 0, 0);
      ctx.fillStyle = rand() < 0.7 ? '#cfcfcf' : '#f0e6c8';
      ctx.fillText(t, 0, 0);
      ctx.restore();
    }
    // tags
    for (let i = 0; i < 45; i++) {
      const size = 28 + rand() * 50;
      ctx.save();
      ctx.translate(rand() * w, h * 0.15 + rand() * h * 0.82);
      ctx.rotate((rand() - 0.5) * 0.5);
      ctx.transform(1, 0, -0.3, 1, 0, 0);
      ctx.font = `italic 700 ${size}px 'Brush Script MT', 'Comic Sans MS', cursive`;
      ctx.lineWidth = 2 + rand() * 3;
      ctx.strokeStyle = rand() < 0.5 ? '#0f0f0f' : pick();
      ctx.strokeText(word(3 + Math.floor(rand() * 4)), 0, 0);
      ctx.restore();
    }
    // drips under the pieces
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = pick();
      ctx.globalAlpha = 0.7;
      ctx.fillRect(rand() * w, h * 0.4 + rand() * h * 0.5, 2 + rand() * 3, 10 + rand() * 50);
    }
    ctx.globalAlpha = 1;
    // stickers and torn posters
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = ['#f4f1ea', '#e8402a', '#141414', '#f2c230', '#2f6fd6'][Math.floor(rand() * 5)];
      const sw = 20 + rand() * 60;
      const sx = rand() * w;
      const sy = h * 0.45 + rand() * h * 0.4;
      ctx.fillRect(sx, sy, sw, sw * (0.4 + rand()));
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx + 4, sy + 6, sw * 0.6, 3);
    }
    // grime at the foot and weather on top
    const g = ctx.createLinearGradient(0, h, 0, h * 0.8);
    g.addColorStop(0, 'rgba(20,16,12,0.55)');
    g.addColorStop(1, 'rgba(20,16,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
  });
}

/** A steel window seen from inside: frosted panes in a black grid, lit faintly by whatever is outside. */
function innerWindowTexture(emissive = false) {
  const rand = rng(emissive ? 71 : 73);
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, w, h);
    const cols = 2;
    const rows = 8;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const v = emissive ? 40 + rand() * 60 : 95 + rand() * 40;
        const broken = rand() < 0.08;
        ctx.fillStyle = broken ? (emissive ? '#000' : '#2a2a2a') : `rgb(${v},${v + 4},${v + 12})`;
        ctx.fillRect(c * (w / cols) + 7, r * (h / rows) + 7, w / cols - 14, h / rows - 14);
      }
    }
  });
}

/** Grey metal cassette cladding, 1.5 x 1 m panels. */
function panelCladding() {
  const rand = rng(81);
  return canvasTexture(512, 512, (ctx, w, h) => {
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 3; y++) {
        const v = 125 + rand() * 25;
        ctx.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
        ctx.fillRect((x * w) / 2, (y * h) / 3, w / 2, h / 3);
        ctx.strokeStyle = 'rgba(20,20,20,0.7)';
        ctx.lineWidth = 4;
        ctx.strokeRect((x * w) / 2 + 2, (y * h) / 3 + 2, w / 2 - 4, h / 3 - 4);
      }
    }
  });
}

/** Welded mesh for fence and balustrade panels. */
function meshTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(160,162,160,1)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= w; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    for (let i = 0; i <= h; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }
  });
}

/* ---------------------------------------------------------- the build ---- */

export function build(ctx: BuildContext): VenueHooks {
  const Q = ctx.quality;
  const { toWorld } = ctx.frame;
  setFigureDetail(Q.figureDetail);
  const root = ctx.root;
  const group = ctx.group;

  const outer = new Batch();
  const inner = new Batch();

  /* materials */
  const facadeTex = facadeConcrete(11, '#a69a84');
  facadeTex.wrapS = facadeTex.wrapT = THREE.RepeatWrapping;
  facadeTex.repeat.set(0.5, 0.5);
  const facadeMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.95 });
  const facadeTex2 = facadeConcrete(29, '#ada18b');
  facadeTex2.wrapS = facadeTex2.wrapT = THREE.RepeatWrapping;
  facadeTex2.repeat.set(0.5, 0.5);
  const trimMat = new THREE.MeshStandardMaterial({ map: facadeTex2, roughness: 0.9 });
  const facadeMat2 = new THREE.MeshStandardMaterial({ map: facadeTex2, roughness: 0.92, color: '#f3eee6' });
  const lampLens = new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#fff1d6'), emissiveIntensity: 4 });
  const cameraMat = new THREE.MeshStandardMaterial({ color: '#d8d8d2', roughness: 0.5 });
  const meshTex = meshTexture();
  meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  meshTex.repeat.set(2, 2);
  const meshMat = new THREE.MeshStandardMaterial({ map: meshTex, color: '#6f7274', alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.7, roughness: 0.5 });
  const blackout = new THREE.MeshStandardMaterial({ map: windowPanes(4, 6, { seed: 3 }), roughness: 0.4, metalness: 0.3 });
  const blackout2 = new THREE.MeshStandardMaterial({ map: windowPanes(4, 6, { seed: 8 }), roughness: 0.4, metalness: 0.3 });
  const smallPane = new THREE.MeshStandardMaterial({ map: windowPanes(3, 2, { seed: 5 }), roughness: 0.4, metalness: 0.3 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#2b2a28', roughness: 0.6, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#1d2427', roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.32, envMapIntensity: 1.2, depthWrite: false });
  const steelDoor = new THREE.MeshStandardMaterial({ color: '#2a2b2c', roughness: 0.55, metalness: 0.7 });
  const rawTex = rawConcrete();
  rawTex.wrapS = rawTex.wrapT = THREE.RepeatWrapping;
  rawTex.repeat.set(0.25, 0.25);
  const paleTex = weatheredConcrete();
  paleTex.wrapS = paleTex.wrapT = THREE.RepeatWrapping;
  const rawMat = new THREE.MeshStandardMaterial({ map: paleTex, roughness: 0.95 });
  const darkMat = new THREE.MeshStandardMaterial({ map: rawTex, roughness: 0.95, color: '#45423e' });
  const rubberMat = new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.9 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#3d3f41', roughness: 0.45, metalness: 0.8 });
  const galvMat = new THREE.MeshStandardMaterial({ color: '#9a9c9c', roughness: 0.4, metalness: 0.85 });
  const plateTex = checkerPlate();
  plateTex.wrapS = plateTex.wrapT = THREE.RepeatWrapping;
  plateTex.repeat.set(2, 2);
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.4, metalness: 0.8 });
  const floorTex = dancefloor();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(0.25, 0.25);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75, metalness: 0.1 });
  const blackMat = new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: 0.6 });
  const sheetMat = new THREE.MeshStandardMaterial({ color: '#2c2d2e', roughness: 0.55, metalness: 0.7 });
  const trussMat = new THREE.MeshStandardMaterial({ color: '#b9bcbe', roughness: 0.35, metalness: 0.9 });
  const exitMat = new THREE.MeshStandardMaterial({ color: '#0a3', emissive: new THREE.Color('#19d060'), emissiveIntensity: 2.2 });
  const enamelMat = new THREE.MeshStandardMaterial({ color: '#2f3b33', roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide });
  const bulbWarm = new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#ffd49a'), emissiveIntensity: 5 });
  const drumMat = new THREE.MeshStandardMaterial({ color: '#f1e3c8', emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 1.1, roughness: 0.8, side: THREE.DoubleSide });
  const speakerMat = new THREE.MeshStandardMaterial({ color: '#111213', roughness: 0.7 });
  const hornMat = new THREE.MeshStandardMaterial({ color: '#030303', roughness: 0.9 });

  /* ----------------------------------------------------- facades ---- */
  // As built: warm beige render over a concrete frame. A ground floor of
  // rusticated piers and deep recessed bays, every inch of it sprayed; a
  // projecting band; then a regular grid of narrow steel windows in pairs,
  // four rows of them between shallow pilaster strips; a heavy cornice and
  // an attic with a row of small square vents.
  type Face = { basis: THREE.Matrix4; len: number; kind: 'end-ssw' | 'end-nne' | 'east' | 'west'; localX: (u: number) => number };
  const mk = (u: THREE.Vector3, n: THREE.Vector3, o: THREE.Vector3) => new THREE.Matrix4().makeBasis(u, new THREE.Vector3(0, 1, 0), n).setPosition(o);
  const faces: Face[] = [
    { kind: 'end-ssw', len: 2 * W2, basis: mk(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(-L2, 0, -W2)), localX: () => -L2 },
    { kind: 'end-nne', len: 2 * W2, basis: mk(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(L2, 0, W2)), localX: () => L2 },
    { kind: 'east', len: 2 * L2, basis: mk(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-L2, 0, W2)), localX: (u) => -L2 + u },
    { kind: 'west', len: 2 * L2, basis: mk(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(L2, 0, -W2)), localX: (u) => L2 - u },
  ];

  const PLINTH = 5.2;
  const ROWS: { y0: number; y1: number; kind: 'small' | 'tall' | 'square' }[] = [
    { y0: 5.95, y1: 7.05, kind: 'small' },
    { y0: 7.9, y1: 10.6, kind: 'tall' },
    { y0: 12.2, y1: 16.6, kind: 'tall' },
    { y0: 17.2, y1: 18.05, kind: 'square' },
  ];
  const WIN = 1.3; // window width
  const PAIR = 1.25; // window centres sit this far either side of the bay centre

  const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTexture(), roughness: 0.6, metalness: 0.5, side: THREE.DoubleSide });
  const leakMat = new THREE.MeshBasicMaterial({ color: '#ff8a3c' });
  const shutters: THREE.Mesh[] = [];
  const leaks: THREE.Mesh[] = [];
  const graffitiMats = [3, 7, 11, 19].map((s) => {
    const t = graffitiWall(s);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, color: '#8f8a82' });
  });
  const shutterGraffiti = (() => {
    const t = graffitiWall(29, true);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, metalness: 0.2, color: '#8f8a82' });
  })();
  const innerWindowMat = new THREE.MeshStandardMaterial({ map: innerWindowTexture(), emissiveMap: innerWindowTexture(true), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.25, roughness: 0.5, side: THREE.FrontSide });
  const grilleMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6, metalness: 0.6 });

  const doors: { face: Face['kind']; u: number; w: number; h: number; depth: number; open: boolean }[] = [
    // the door: a deep portal under a concrete lintel, set back into the plinth
    { face: 'end-ssw', u: DOOR_Z + W2, w: 3.6, h: 3.7, depth: 1.8, open: true },
    // Lab.oratory has its own door on the west side
    { face: 'west', u: L2 - 6, w: 1.8, h: 2.8, depth: 0.5, open: false },
    // and the Halle its own, further north
    { face: 'west', u: L2 - 19, w: 3.4, h: 3.8, depth: 0.5, open: false },
  ];

  for (const f of faces) {
    const add = (mat: THREE.Material, u0: number, y0: number, w0: number, u1: number, y1: number, w1: number, tile = 4) => {
      if (u1 - u0 < 0.001 || y1 - y0 < 0.001) return;
      outer.add(mat, boxAt(u0, y0, w0, u1, y1, w1, tile), f.basis);
    };
    // a wall piece: beige render outside, raw concrete inside
    const wall = (u0: number, y0: number, u1: number, y1: number) => {
      add(facadeMat, u0, y0, -0.3, u1, y1, 0);
      add(rawMat, u0, y0, -T, u1, y1, -0.3);
    };
    const isEnd = f.kind.startsWith('end');
    const uStart = isEnd ? T : 0;
    const uEnd = isEnd ? f.len - T : f.len;
    const nBays = isEnd ? 6 : 12;
    const bay = f.len / nBays;
    const top = (u: number) => (f.localX(u) > 0.01 ? H_KESSEL : H_MACHINE);
    const myDoors = doors.filter((d) => d.face === f.kind).sort((a, b) => a.u - b.u);
    const faceGroup = new THREE.Group();
    faceGroup.matrixAutoUpdate = false;
    faceGroup.matrix.copy(f.basis);
    group.add(faceGroup);

    /* ground floor: piers and recessed bays, sprayed from end to end */
    for (let b = 0; b < nBays; b++) {
      const u0 = Math.max(uStart, b * bay);
      const u1 = Math.min(uEnd, (b + 1) * bay);
      const gm = graffitiMats[(b + f.len) % graffitiMats.length | 0];
      const pierW = 1.1;
      const p0 = b === 0 ? u0 : u0 + pierW / 2;
      const p1 = b === nBays - 1 ? u1 : u1 - pierW / 2;
      const door = myDoors.find((d) => d.u > u0 && d.u < u1);
      // the recessed infill between the piers
      if (door) {
        const a = door.u - door.w / 2;
        const z = door.u + door.w / 2;
        add(gm, p0, 0, -T, a, PLINTH, -0.18, PLINTH);
        add(gm, z, 0, -T, p1, PLINTH, -0.18, PLINTH);
        add(gm, a, door.h, -T, z, PLINTH, -0.18, PLINTH);
        // the portal: sprayed reveals and soffit, a steel frame at the back
        add(gm, a - 0.25, 0, -door.depth, a, door.h, -0.18, PLINTH);
        add(gm, z, 0, -door.depth, z + 0.25, door.h, -0.18, PLINTH);
        add(gm, a - 0.25, door.h, -door.depth, z + 0.25, door.h + 0.25, -0.18, PLINTH);
        add(frameMat, a, 0, -door.depth - 0.05, a + 0.12, door.h, -door.depth + 0.05);
        add(frameMat, z - 0.12, 0, -door.depth - 0.05, z, door.h, -door.depth + 0.05);
        if (!door.open) {
          add(shutterGraffiti, a, 0, -door.depth - 0.02, z, door.h, -door.depth + 0.04, door.h);
        } else {
          // the rolling shutter, raised, its box under the lintel
          add(steelMat, a, door.h - 0.55, -door.depth + 0.05, z, door.h, -door.depth + 0.5);
          add(trimMat, a - 0.4, -0.02, -door.depth, z + 0.4, 0.14, 0.6);
        }
        // the wall behind the portal, round the door opening
        if (door.depth > T) {
          const inner0 = a + 0.3;
          const inner1 = z - 0.3;
          add(rawMat, a, 0, -door.depth - 0.3, inner0, door.h, -door.depth);
          add(rawMat, inner1, 0, -door.depth - 0.3, z, door.h, -door.depth);
          add(rawMat, a, door.h - 0.6, -door.depth - 0.3, z, door.h, -door.depth);
        }
      } else {
        add(gm, p0, 0, -T, p1, PLINTH, -0.18, PLINTH);
        // every other bay keeps its old opening behind a sprayed rolling shutter
        if ((b + (isEnd ? 1 : 0)) % 2 === 0 && p1 - p0 > 3) {
          const c = (p0 + p1) / 2;
          add(shutterGraffiti, c - 1.4, 0, -0.2, c + 1.4, 3.4, -0.17, 3.4);
          add(steelMat, c - 1.5, 3.4, -0.2, c + 1.5, 3.7, -0.05);
        }
      }
      // rusticated piers between the bays
      if (b > 0) add(gm, b * bay - pierW / 2, 0, -T, b * bay + pierW / 2, PLINTH, 0.12, PLINTH);
    }
    // corner piers
    for (const u of [0, f.len]) if (!isEnd) add(graffitiMats[0], u === 0 ? -0.2 : u - 1.2, 0, -T, u === 0 ? 1.2 : u + 0.2, PLINTH, 0.12, PLINTH);
    // the band over the ground floor
    add(trimMat, isEnd ? 0 : -0.45, PLINTH, -T, isEnd ? f.len : f.len + 0.45, PLINTH + 0.18, 0.42);
    add(trimMat, isEnd ? 0 : -0.35, PLINTH + 0.18, -T, isEnd ? f.len : f.len + 0.35, PLINTH + 0.5, 0.3);
    const y0 = PLINTH + 0.5;

    /* the window grid */
    for (let b = 0; b < nBays; b++) {
      const u0 = b * bay;
      const u1 = u0 + bay;
      const c = (u0 + u1) / 2;
      const H = top(c);
      const cu0 = Math.max(uStart, u0);
      const cu1 = Math.min(uEnd, u1);
      const cols = [c - PAIR, c + PAIR];
      // solid strips between the window columns
      wall(cu0, y0, cols[0] - WIN / 2, H - 0.2);
      wall(cols[0] + WIN / 2, y0, cols[1] - WIN / 2, H - 0.2);
      wall(cols[1] + WIN / 2, y0, cu1, H - 0.2);
      for (const wc of cols) {
        const a = wc - WIN / 2;
        const z = wc + WIN / 2;
        let y = y0;
        for (const r of ROWS) {
          wall(a, y, z, r.y0);
          y = r.y1;
        }
        wall(a, y, z, H - 0.2);
        const lx = f.localX(wc);
        for (const [ri, r] of ROWS.entries()) {
          const hh = r.y1 - r.y0;
          const cy = (r.y0 + r.y1) / 2;
          // Panorama Bar: the tall upper windows of the front strip are real glass, with roller shutters behind
          const pano = ri === 2 && lx < CROSS - 0.8;
          // the hall and Panorama Bar see these windows from inside
          const seenInside = !pano && lx < -1.2 && (isEnd || lx < CROSS - 0.8 ? r.y0 > 11.5 : r.y0 > 4.5 && lx > CROSS + 0.8);
          if (pano) {
            outer.add(glassMat, new THREE.PlaneGeometry(WIN, hh).translate(wc, cy, -0.3), f.basis);
            const s = new THREE.Mesh(new THREE.PlaneGeometry(WIN + 0.2, hh + 0.2), shutterMat);
            s.position.set(wc, cy, -T - 0.05);
            s.castShadow = true;
            s.userData.top = r.y1 + 0.1;
            s.userData.h = hh + 0.2;
            faceGroup.add(s);
            shutters.push(s);
            add(steelMat, a - 0.1, r.y1 + 0.05, -T - 0.4, z + 0.1, r.y1 + 0.45, -T);
            const leak = new THREE.Mesh(new THREE.PlaneGeometry(WIN - 0.1, 0.05), leakMat.clone());
            leak.position.set(wc, r.y0 + 0.06, -0.33);
            faceGroup.add(leak);
            leaks.push(leak);
          } else {
            const m = r.kind === 'tall' ? ((b + ri) % 3 ? blackout : blackout2) : smallPane;
            outer.add(m, new THREE.PlaneGeometry(WIN, hh).translate(wc, cy, -0.3), f.basis);
            if (seenInside) outer.add(innerWindowMat, new THREE.PlaneGeometry(WIN, hh).rotateY(Math.PI).translate(wc, cy, -0.32), f.basis);
          }
          // steel frame: outer frame, a mullion, transoms
          add(frameMat, a, r.y0, -0.34, a + 0.06, r.y1, -0.26);
          add(frameMat, z - 0.06, r.y0, -0.34, z, r.y1, -0.26);
          add(frameMat, a, r.y1 - 0.06, -0.34, z, r.y1, -0.26);
          add(frameMat, a, r.y0, -0.34, z, r.y0 + 0.06, -0.26);
          add(frameMat, wc - 0.025, r.y0, -0.33, wc + 0.025, r.y1, -0.27);
          const transoms = r.kind === 'tall' ? (hh > 4 ? 3 : 2) : 1;
          for (let k = 1; k <= transoms; k++) {
            const ty = r.y0 + (hh * k) / (transoms + 1);
            add(frameMat, a, ty - 0.025, -0.33, z, ty + 0.025, -0.27);
          }
          // a projecting sill
          add(trimMat, a - 0.06, r.y0 - 0.1, -0.3, z + 0.06, r.y0, 0.09);
          // the first-floor windows have bars
          if (ri === 0) for (let k = 1; k < 6; k++) add(grilleMat, a + (k * WIN) / 6 - 0.012, r.y0 + 0.02, 0.03, a + (k * WIN) / 6 + 0.012, r.y1 - 0.02, 0.055);
          if (ri === 0) for (const gy of [r.y0 + 0.08, r.y1 - 0.08]) add(grilleMat, a, gy - 0.012, 0.03, z, gy + 0.012, 0.055);
        }
        // a small square vent in the attic, over each window column
        outer.add(smallPane, new THREE.PlaneGeometry(0.55, 0.55).translate(wc, H - 1.35, 0.004), f.basis);
        add(trimMat, wc - 0.36, H - 1.7, 0, wc + 0.36, H - 1.63, 0.06);
      }
    }

    // shallow pilaster strips at the bay lines, wider at the corners
    for (let b = 0; b <= nBays; b++) {
      const u = b * bay;
      const corner = b === 0 || b === nBays;
      const half = corner ? 0.75 : 0.42;
      const pu0 = Math.max(isEnd ? 0 : -0.12, u - half);
      const pu1 = Math.min(isEnd ? f.len : f.len + 0.12, u + half);
      add(facadeMat2, pu0, y0, 0, pu1, 18.5, corner ? 0.12 : 0.07);
    }

    // the heavy cornice with a fascia under it, the attic, the coping
    const ext = isEnd ? 0 : 1.15;
    for (const [ua, ub] of [
      [-ext, f.len / 2],
      [f.len / 2, f.len + ext],
    ]) {
      const H = top((ua + ub) / 2);
      add(trimMat, ua, 18.5, -T + 0.02, ub, 18.8, 0.35);
      add(trimMat, ua, 18.8, -T + 0.02, ub, 19.2, 0.75);
      add(trimMat, ua, 19.2, -T + 0.02, ub, 19.6 - (isEnd ? 0.01 : 0), 1.15);
      add(trimMat, Math.max(ua, isEnd ? T : -0.1), H - 0.2, -T, Math.min(ub, isEnd ? f.len - T : f.len + 0.1), H, 0.12);
    }

    // downpipes on the long sides, and cameras and floodlights on brackets
    if (!isEnd) {
      for (let b = 1; b < nBays; b += 2) {
        const u = b * bay + 0.1;
        outer.add(steelMat, new THREE.CylinderGeometry(0.07, 0.07, 18.5 - PLINTH, 8).translate(u, (18.5 + PLINTH) / 2, 0.45), f.basis);
        outer.add(steelMat, new THREE.CylinderGeometry(0.07, 0.07, PLINTH, 8).translate(u, PLINTH / 2, 0.45), f.basis);
      }
    }
    for (let b = 0; b <= nBays; b += isEnd ? 2 : 3) {
      const u = Math.min(f.len - 1, Math.max(1, b * bay));
      // floodlight
      add(steelMat, u - 0.04, 6.1, 0, u + 0.04, 6.16, 0.7);
      add(darkMat, u - 0.28, 5.95, 0.6, u + 0.28, 6.25, 0.95);
      add(lampLens, u - 0.24, 5.94, 0.62, u + 0.24, 5.96, 0.93);
      // camera
      add(steelMat, u + 1.2, 6.4, 0, u + 1.26, 6.46, 0.35);
      add(cameraMat, u + 1.1, 6.3, 0.3, u + 1.36, 6.48, 0.75);
    }
  }

  // roofs: flat, a metre below the coping so the attic wall forms a parapet
  outer.add(darkMat, boxAt(-L2, H_MACHINE - 1.1, -W2, 0, H_MACHINE - 0.8, W2));
  outer.add(darkMat, boxAt(0, H_KESSEL - 1.1, -W2, L2, H_KESSEL - 0.8, W2));
  outer.add(facadeMat, boxAt(-0.3, H_MACHINE - 1.1, -W2, 0.3, H_KESSEL - 0.2, W2));
  // rooftop plant: vents, a lift motor room, ducts
  for (const [x, z, w, d, h] of [
    [-30, -8, 3, 2.4, 1.6],
    [-12, 6, 2, 2, 1.2],
    [-20, 12, 5, 3, 2.4],
    [14, -6, 3, 3, 1.8],
    [26, 10, 2.4, 2.4, 1.4],
  ]) {
    const base = x < 0 ? H_MACHINE - 0.8 : H_KESSEL - 0.8;
    outer.add(darkMat, boxAt(x - w / 2, base, z - d / 2, x + w / 2, base + h, z + d / 2));
  }
  outer.add(galvMat, new THREE.CylinderGeometry(0.4, 0.4, 14, 12).rotateZ(Math.PI / 2).translate(-20, H_MACHINE - 0.4, -4));

  // The external fire escape (2006/2008), steel, on the west side
  {
    const fx0 = -20;
    const fz = -W2 - 2.6;
    for (let k = 0; k < 4; k++) {
      const y0 = k * 3.2;
      const dir = k % 2 ? -1 : 1;
      const xa = fx0 + (dir > 0 ? 0 : 6);
      const xb = fx0 + (dir > 0 ? 6 : 0);
      outer.add(plateMat, boxAt(fx0 - 1.4, y0 + 3.15, fz - 1.1, fx0, y0 + 3.2, fz + 1.1));
      outer.add(plateMat, boxAt(fx0 + 6, y0 + 3.15, fz - 1.1, fx0 + 7.4, y0 + 3.2, fz + 1.1));
      const len = Math.hypot(6, 3.2);
      const flight = new THREE.Matrix4().compose(
        new THREE.Vector3((xa + xb) / 2, y0 + 1.6, fz + (k % 2 ? 0.55 : -0.55)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.atan2(3.2, xb - xa))),
        new THREE.Vector3(1, 1, 1),
      );
      outer.add(plateMat, boxAt(-len / 2, -0.04, -0.5, len / 2, 0.04, 0.5), flight);
      outer.add(meshMat, boxAt(-len / 2, 0.05, -0.56, len / 2, 1.0, -0.53), flight);
      outer.add(meshMat, boxAt(-len / 2, 0.05, 0.53, len / 2, 1.0, 0.56), flight);
      outer.add(steelMat, boxAt(-len / 2, 0.98, -0.57, len / 2, 1.03, -0.52), flight);
      outer.add(steelMat, boxAt(-len / 2, 0.98, 0.52, len / 2, 1.03, 0.57), flight);
    }
    for (const [x, z] of [
      [fx0 - 1.4, fz - 1.1],
      [fx0 - 1.4, fz + 1.1],
      [fx0 + 7.4, fz - 1.1],
      [fx0 + 7.4, fz + 1.1],
    ])
      outer.add(steelMat, boxAt(x - 0.06, 0, z - 0.06, x + 0.06, 13.8, z + 0.06));
    outer.add(steelDoor, boxAt(fx0 - 1.2, 12.8, -W2 - 0.08, fx0 - 0.2, 15, -W2 - 0.02));
  }

  // The smokers' lounge (2008): a metal-clad box on stilts off the east side, at Panorama Bar level
  {
    const x0 = -34;
    const x1 = -26.5;
    const z0 = W2;
    const z1 = W2 + 13;
    const yb = 11.2;
    const yt = 15.2;
    const cladTex = panelCladding();
    cladTex.wrapS = cladTex.wrapT = THREE.RepeatWrapping;
    const clad = new THREE.MeshStandardMaterial({ map: cladTex, roughness: 0.45, metalness: 0.7 });
    outer.add(clad, boxAt(x0, yb, z0, x1, yb + 0.8, z1, 3));
    outer.add(clad, boxAt(x0, yt - 0.9, z0, x1, yt, z1, 3));
    outer.add(clad, boxAt(x0, yb, z1 - 0.3, x1, yt, z1, 3));
    // ribbon windows down both sides
    for (const x of [x0, x1]) {
      outer.add(glassMat, new THREE.PlaneGeometry(z1 - z0 - 0.3, yt - 0.9 - (yb + 0.8)).rotateY(x === x0 ? -Math.PI / 2 : Math.PI / 2).translate(x, (yt - 0.9 + yb + 0.8) / 2, (z0 + z1 - 0.3) / 2));
      for (let z = z0; z <= z1; z += 1.6) outer.add(frameMat, boxAt(x - 0.05, yb + 0.8, z - 0.04, x + 0.05, yt - 0.9, z + 0.04));
    }
    outer.add(darkMat, boxAt(x0 + 0.1, yb + 0.8, z0, x1 - 0.1, yb + 0.85, z1 - 0.3));
    // steel stilts and bracing
    for (const z of [z0 + 6, z1 - 0.5]) {
      for (const x of [x0 + 0.3, x1 - 0.3]) outer.add(steelMat, boxAt(x - 0.15, 0, z - 0.15, x + 0.15, yb, z + 0.15));
      outer.add(steelMat, boxAt(x0, yb - 0.5, z - 0.12, x1, yb, z + 0.12));
    }
    // sprayed steel gates underneath
    const gateTex = graffitiWall(41, true);
    gateTex.wrapS = gateTex.wrapT = THREE.RepeatWrapping;
    const gate = new THREE.MeshStandardMaterial({ map: gateTex, roughness: 0.6, metalness: 0.4 });
    outer.add(gate, boxAt(x0 - 4, 0, z1 - 0.6, x1 + 4, 3.2, z1 - 0.5, 3.2));
    for (let x = x0 - 4; x <= x1 + 4; x += 2.4) outer.add(steelMat, boxAt(x - 0.05, 0, z1 - 0.62, x + 0.05, 3.3, z1 - 0.48));
  }

  // a big rusted steel sculpture stands by the building: two leaning rings
  {
    const rust = new THREE.MeshStandardMaterial({ color: '#6e3b22', roughness: 0.85, metalness: 0.4 });
    for (const [dx, tilt, turn] of [[0, 0.25, 0.3], [1.4, -0.3, -0.5]]) {
      const g = new THREE.TorusGeometry(2.6, 0.22, 8, 40).rotateX(tilt).rotateY(turn).translate(-L2 + 9 + dx, 2.6, -W2 - 8.5);
      outer.add(rust, g);
    }
  }

  /* ---------------------------------------------- the entrance ---- */
  // One bare bulb over the portal. No sign.
  outer.add(steelMat, boxAt(-L2 - 0.6, 4.35, DOOR_Z - 0.05, -L2, 4.4, DOOR_Z + 0.05));
  // open steel door leaves at the back of the portal, swung in
  for (const s of [-1, 1]) {
    const leaf = new THREE.Matrix4().compose(
      new THREE.Vector3(-L2 + 2.1 + 0.55, 1.5, DOOR_Z + s * (1.5 - 0.25)),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s * 1.25, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    inner.add(steelDoor, boxAt(-0.03, -1.5, -0.65, 0.03, 1.5, 0.65), leaf);
  }

  // tall steel fence panels in front of the facade, sprayed like the wall
  {
    const panelMats = [5, 13, 23].map((s) => {
      const t = graffitiWall(s, true);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0.2, side: THREE.DoubleSide, color: '#8f8a82' });
    });
    const run = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / 2.5));
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const ax = x0 + (x1 - x0) * t0;
        const az = z0 + (z1 - z0) * t0;
        const bx = x0 + (x1 - x0) * t1;
        const bz = z0 + (z1 - z0) * t1;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3((ax + bx) / 2, 0, (az + bz) / 2),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(bx - ax, bz - az) + Math.PI / 2, 0)),
          new THREE.Vector3(1, 1, 1),
        );
        const w = len / n;
        outer.add(panelMats[i % 3], boxAt(-w / 2 + 0.04, 0.08, -0.02, w / 2 - 0.04, 3.0, 0.02, 3), m);
        outer.add(galvMat, boxAt(-w / 2 - 0.04, 0, -0.04, -w / 2 + 0.04, 3.1, 0.04), m);
        outer.add(darkMat, boxAt(-w / 2 - 0.2, 0, -0.35, -w / 2 + 0.2, 0.15, 0.35), m);
      }
    };
    for (const [x0, z0, x1, z1] of FENCE_RUNS) run(x0, z0, x1, z1);
  }

  /* ------------------------------------------------------ interior ---- */
  // slabs
  inner.add(darkMat, boxAt(IN_X, 0.0, -IN_Z, -0.6, 0.04, IN_Z));
  inner.add(darkMat, boxAt(IN_X, 4.0, -IN_Z, CROSS - 0.25, 4.5, IN_Z)); // over the cloakroom
  inner.add(darkMat, boxAt(CROSS + 0.25, 4.0, -14.4, -0.6, 4.5, IN_Z)); // main floor
  inner.add(darkMat, boxAt(-16.75, 4.0, -IN_Z, -0.6, 4.5, -14.4));
  inner.add(floorMat, boxAt(CROSS + 0.25, 4.5, -14.4, -0.6, 4.52, IN_Z));
  inner.add(floorMat, boxAt(-16.75, 4.5, -IN_Z, -0.6, 4.52, -14.4));
  inner.add(floorMat, boxAt(IN_X, 4.5, -IN_Z, CROSS - 0.25, 4.52, IN_Z)); // bar floor
  // bar ceiling / Panorama floor, with the stair hole
  inner.add(darkMat, boxAt(IN_X, 11.0, -IN_Z, CROSS - 0.25, 11.5, 14.4));
  inner.add(darkMat, boxAt(IN_X, 11.0, 14.4, -35.5, 11.5, IN_Z));
  inner.add(darkMat, boxAt(-26, 11.0, 14.4, CROSS - 0.25, 11.5, IN_Z));
  const panoFloorTex = dancefloor(19);
  panoFloorTex.wrapS = panoFloorTex.wrapT = THREE.RepeatWrapping;
  panoFloorTex.repeat.set(0.3, 0.3);
  const panoFloor = new THREE.MeshStandardMaterial({ map: panoFloorTex, color: '#6b5a4c', roughness: 0.6 });
  inner.add(panoFloor, boxAt(IN_X, 11.5, -IN_Z, CROSS - 0.25, 11.52, 14.4));
  inner.add(panoFloor, boxAt(IN_X, 11.5, 14.4, -35.5, 11.52, IN_Z));
  inner.add(darkMat, boxAt(IN_X, 19.0, -IN_Z, CROSS - 0.25, 19.4, IN_Z)); // Panorama ceiling

  // the cross wall between the front strip and the hall
  inner.add(rawMat, boxAt(CROSS - 0.25, 4.0, -IN_Z, CROSS + 0.25, 4.5, IN_Z));
  inner.add(rawMat, boxAt(CROSS - 0.25, 0, -14.4, CROSS + 0.25, 4.0, 1.5));
  inner.add(rawMat, boxAt(CROSS - 0.25, 0, 4.5, CROSS + 0.25, 4.0, IN_Z));
  inner.add(rawMat, boxAt(CROSS - 0.25, 3.0, 1.5, CROSS + 0.25, 4.0, 4.5));
  inner.add(rawMat, boxAt(CROSS - 0.25, 11.0, -IN_Z, CROSS + 0.25, 21.6, -IN_Z + 1.5));
  inner.add(rawMat, boxAt(CROSS - 0.25, 11.0, -IN_Z + 2.9, CROSS + 0.25, 21.6, IN_Z));
  inner.add(rawMat, boxAt(CROSS - 0.25, 14.0, -IN_Z + 1.5, CROSS + 0.25, 21.6, -IN_Z + 2.9));
  inner.add(rawMat, boxAt(CROSS - 0.25, 11.0, -IN_Z + 1.5, CROSS + 0.25, 11.5, -IN_Z + 2.9));
  // steel and glass between the bar and the main floor, with two openings
  inner.add(steelMat, boxAt(CROSS - 0.1, 4.5, -IN_Z, CROSS + 0.1, 4.62, IN_Z));
  inner.add(steelMat, boxAt(CROSS - 0.1, 10.85, -IN_Z, CROSS + 0.1, 11.0, IN_Z));
  inner.add(steelMat, boxAt(CROSS - 0.1, 7.6, -IN_Z, CROSS + 0.1, 7.7, IN_Z));
  const gaps = [
    [-11.7, -9.8],
    [9.8, 11.7],
  ];
  for (let z = -IN_Z; z < IN_Z - 0.1; z += 2.2) {
    const z1 = Math.min(IN_Z, z + 2.2);
    inner.add(steelMat, boxAt(CROSS - 0.08, 4.5, z - 0.05, CROSS + 0.08, 11, z + 0.05));
    const inGap = gaps.some(([a, b]) => z1 > a && z < b);
    if (!inGap) inner.add(glassMat, new THREE.PlaneGeometry(z1 - z, 6.4).rotateY(Math.PI / 2).translate(CROSS, 7.75, (z + z1) / 2));
    else inner.add(glassMat, new THREE.PlaneGeometry(z1 - z, 3.3).rotateY(Math.PI / 2).translate(CROSS, 9.3, (z + z1) / 2));
  }

  // the wall between the Berghain hall and the Halle
  inner.add(rawMat, boxAt(-0.6, 0, -IN_Z, 0, H_MACHINE - 1.1, IN_Z));
  // the wall under the main floor, closing the stair slot
  inner.add(rawMat, boxAt(CROSS + 0.25, 0, -14.6, -16.75, 4.0, -14.4));
  inner.add(rawMat, boxAt(-16.95, 0, -IN_Z, -16.75, 4.0, -14.4));

  // linings over the inside of the facades, dark raw concrete; rubber in the bar
  const lining = (mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => inner.add(mat, boxAt(x0, y0, z0, x1, y1, z1));
  for (const s of [-1, 1]) {
    const zf = s * IN_Z;
    const zi = s * (IN_Z - 0.05);
    lining(rawMat, IN_X, 0, Math.min(zf, zi), CROSS - 0.25, 11.0, Math.max(zf, zi));
    // the ground floor under the hall; above it the windows show
    lining(rawMat, CROSS + 0.25, 0, Math.min(zf, zi), -0.6, 4.5, Math.max(zf, zi));
  }
  lining(rawMat, IN_X, 0, -IN_Z, IN_X + 0.05, 4.0, DOOR_Z - 2.1);
  lining(rawMat, IN_X, 0, DOOR_Z + 2.1, IN_X + 0.05, 4.0, IN_Z);
  lining(rubberMat, IN_X, 4.5, -IN_Z, IN_X + 0.05, 11.0, IN_Z);

  /* the turbine hall's frame: columns, roof beams, crane runway */
  for (const x of HALL_COLUMNS) {
    for (const s of [-1, 1]) {
      inner.add(rawMat, boxAt(x - 0.6, 4.5, s > 0 ? IN_Z - 1.4 : -IN_Z, x + 0.6, 21.6, s > 0 ? IN_Z : -IN_Z + 1.4));
      // crane corbel
      inner.add(rawMat, boxAt(x - 0.6, 14.2, s > 0 ? IN_Z - 2.2 : -IN_Z + 1.4, x + 0.6, 15.0, s > 0 ? IN_Z - 1.4 : -IN_Z + 2.2));
    }
    inner.add(rawMat, boxAt(x - 0.35, 19.8, -IN_Z, x + 0.35, 21.6, IN_Z));
    // haunches where beam meets column, stepped
    for (const s of [-1, 1]) {
      const zw = s > 0 ? IN_Z - 1.4 : -IN_Z + 1.4;
      for (let k = 0; k < 4; k++) {
        const d = 0.5 + k * 0.45;
        inner.add(rawMat, boxAt(x - 0.35, 19.8 - (4 - k) * 0.3, s > 0 ? zw - d : zw, x + 0.35, 19.8 - (3 - k) * 0.3, s > 0 ? zw : zw + d));
      }
    }
  }
  for (const s of [-1, 1]) {
    const z = s * (IN_Z - 1.8);
    inner.add(steelMat, boxAt(CROSS + 0.25, 15.0, z - 0.3, -0.6, 15.08, z + 0.3));
    inner.add(steelMat, boxAt(CROSS + 0.25, 15.08, z - 0.04, -0.6, 15.7, z + 0.04));
    inner.add(steelMat, boxAt(CROSS + 0.25, 15.7, z - 0.3, -0.6, 15.78, z + 0.3));
  }
  // the old travelling crane, parked over the floor
  inner.add(steelMat, boxAt(-9.6, 15.78, -IN_Z + 1.4, -8.4, 16.8, IN_Z - 1.4));
  inner.add(steelMat, boxAt(-9.4, 15.78, -1, -8.6, 16.6, 1));

  /* the big steel staircase from the cloakroom up to the main floor */
  const stair = (xa: number, ya: number, xb: number, yb: number, z0: number, z1: number, rails: boolean) => steelStair(inner, { tread: plateMat, steel: steelMat, sheet: sheetMat }, xa, ya, xb, yb, z0, z1, rails);
  stair(CROSS + 0.25, 0, -16.75, 4.5, -IN_Z, -14.6, true);
  stair(-26, 4.5, -35.5, 11.5, 14.4, IN_Z, true);
  // railings round the stair holes
  const railLine = (x0: number, z0: number, x1: number, z1: number, y: number) => engineRailLine(inner, steelMat, x0, z0, x1, z1, y);
  railLine(CROSS + 0.25, -14.4, -16.75, -14.4, 4.52);
  railLine(-35.5, 14.4, -26, 14.4, 11.52);
  railLine(-26, 14.4, -26, IN_Z, 11.52);
  // the gallery's door gap


  /* the gallery along the west wall of the hall, out of Panorama Bar at its level */
  {
    const z0 = -IN_Z + 1.45;
    const z1 = -IN_Z + 2.95;
    inner.add(plateMat, boxAt(CROSS + 0.25, 11.3, z0, -2.2, 11.5, z1));
    inner.add(steelMat, boxAt(CROSS + 0.25, 11.0, z1 - 0.15, -2.2, 11.3, z1));
    for (let x = CROSS + 1.5; x < -2.2; x += 3.1875) {
      // brackets back to the wall
      inner.add(steelMat, boxAt(x - 0.08, 10.2, z0 - 0.05, x + 0.08, 11.3, z0 + 0.12));
      inner.add(steelMat, new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6).rotateX(-0.75).translate(x, 10.55, z0 + 0.65));
    }
    inner.add(sheetMat, boxAt(CROSS + 0.25, 11.5, z1 - 0.03, -2.2, 12.55, z1));
    inner.add(steelMat, boxAt(CROSS + 0.25, 12.55, z1 - 0.08, -2.2, 12.6, z1 + 0.05));
    inner.add(sheetMat, boxAt(-2.25, 11.5, z0, -2.2, 12.55, z1));
  }

  /* the lighting rig: square box truss in a grid, hung with moving heads and wash lights */
  {
    const T2 = 0.2; // half the section
    const truss = (ax: number, az: number, bx: number, bz: number, y: number) => boxTruss(inner, trussMat, ax, az, bx, bz, y, T2);
    const xs = [-21, -16.5, -12, -7.5, -3];
    const zs = [-12, -4, 4, 12];
    for (const x of xs) truss(x, -13.2, x, 13.2, 13.4);
    for (const z of zs) truss(-21.4, z, -2.6, z, 12.95);
    // chain hoists up to the roof beams
    for (const x of [-21, -12, -3]) for (const z of [-12, 12]) inner.add(steelMat, new THREE.CylinderGeometry(0.012, 0.012, 7.6, 4).translate(x, 17.5, z));
    // fixtures
    const lens = new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color('#fff5e8'), emissiveIntensity: 1.2 });
    for (const x of xs) {
      for (let z = -12; z <= 12; z += 2) {
        const head = new THREE.Matrix4().compose(new THREE.Vector3(x, 13.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((z % 4) * 0.1, 0, 0)), new THREE.Vector3(1, 1, 1));
        inner.add(blackMat, boxAt(-0.18, -0.12, -0.14, 0.18, 0, 0.14), head);
        inner.add(blackMat, boxAt(-0.17, -0.45, -0.03, -0.13, -0.12, 0.03), head);
        inner.add(blackMat, boxAt(0.13, -0.45, -0.03, 0.17, -0.12, 0.03), head);
        inner.add(blackMat, new THREE.CylinderGeometry(0.11, 0.13, 0.3, 10).translate(0, -0.38, 0), head);
        inner.add(lens, new THREE.CircleGeometry(0.09, 10).rotateX(Math.PI / 2).translate(0, -0.535, 0), head);
      }
    }
    // a row of wash lights on the floor along the end wall
    for (let z = -12; z <= 12; z += 1.2) {
      inner.add(blackMat, new THREE.CylinderGeometry(0.13, 0.13, 0.28, 10).rotateZ(Math.PI / 2 - 0.6).translate(-1.3, 4.72, z));
      inner.add(lens, new THREE.CircleGeometry(0.1, 10).rotateY(-Math.PI / 2).rotateZ(-0.6).translate(-1.45, 4.82, z));
    }
  }

  /* ducts: a big round one along the east wall, a rectangular one across */
  {
    const dz = IN_Z - 2.7;
    inner.add(galvMat, new THREE.CylinderGeometry(0.55, 0.55, -1.2 - (CROSS + 0.4), 16).rotateZ(Math.PI / 2).translate((CROSS + 0.4 - 1.2) / 2, 18.4, dz));
    for (let x = CROSS + 1; x < -1.5; x += 1.8) inner.add(galvMat, new THREE.TorusGeometry(0.56, 0.03, 4, 16).rotateY(Math.PI / 2).translate(x, 18.4, dz));
    for (let x = CROSS + 2; x < -1.5; x += 4) inner.add(steelMat, boxAt(x - 0.02, 18.95, dz - 0.02, x + 0.02, 19.8, dz + 0.02));
    inner.add(galvMat, boxAt(-15.3, 19.2, -IN_Z + 1.5, -14.1, 19.8, IN_Z - 1.5));
    for (let z = -IN_Z + 2; z < IN_Z - 2; z += 1.6) inner.add(steelMat, boxAt(-15.32, 19.18, z, -14.08, 19.82, z + 0.05));
  }

  /* the end wall: two big cones built into the concrete, doors, green exit signs */
  {
    const spk = new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.75, side: THREE.DoubleSide });
    for (const z of [-7.5, 7.5]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(-0.62, 9.2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
      inner.add(spk, new THREE.CylinderGeometry(0.95, 0.35, 0.45, 32, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.22), m);
      inner.add(galvMat, new THREE.TorusGeometry(0.98, 0.07, 6, 32).translate(0, 0, 0.45), m);
      inner.add(spk, new THREE.CircleGeometry(0.36, 20), m);
      inner.add(blackMat, new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, 0, 0.02), m);
      inner.add(spk, new THREE.CylinderGeometry(0.6, 0.25, 0.3, 24, 1, true).rotateX(Math.PI / 2).translate(0, 2.3, 0.15), m);
      inner.add(galvMat, new THREE.TorusGeometry(0.62, 0.05, 6, 24).translate(0, 2.3, 0.3), m);
    }
    for (const z of [-14.8, 14.8]) {
      inner.add(steelDoor, boxAt(-0.68, 4.5, z - 0.9, -0.6, 7.0, z + 0.9));
      inner.add(exitMat, boxAt(-0.72, 7.35, z - 0.25, -0.62, 7.6, z + 0.25));
    }
    for (const z of [-10.75, 10.75]) inner.add(exitMat, boxAt(CROSS + 0.26, 8.0, z - 0.25, CROSS + 0.32, 8.25, z + 0.25));
    // a service ladder up the wall
    for (const z of [3.2, 3.7]) inner.add(galvMat, boxAt(-0.75, 4.5, z - 0.025, -0.7, 15, z + 0.025));
    for (let y = 4.8; y < 15; y += 0.3) inner.add(galvMat, boxAt(-0.76, y, 3.2, -0.71, y + 0.03, 3.7));
    // the ladder can be climbed: it ends at a small steel platform high on the end wall,
    // above the booth, with the whole floor below
    for (const z of [3.2, 3.7]) inner.add(galvMat, boxAt(-0.75, LADDER_TOP, z - 0.025, -0.7, LADDER_TOP + 1.1, z + 0.025));
    inner.add(plateMat, boxAt(-2.6, LADDER_TOP - 0.08, 1.6, -0.6, LADDER_TOP, 5.4));
    inner.add(steelMat, boxAt(-2.6, LADDER_TOP - 0.3, 1.6, -2.5, LADDER_TOP - 0.08, 5.4));
    for (const z of [1.7, 3.45, 5.3]) {
      // brackets back to the wall
      inner.add(steelMat, boxAt(-2.6, LADDER_TOP - 0.3, z - 0.05, -0.6, LADDER_TOP - 0.08, z + 0.05));
      inner.add(steelMat, new THREE.CylinderGeometry(0.03, 0.03, 2.5, 6).rotateZ(-0.9).translate(-1.6, LADDER_TOP - 0.95, z));
    }
    // a rail round three sides: two bars and posts, open enough to look straight down
    const railY = [LADDER_TOP + 0.55, LADDER_TOP + 1.05];
    for (const ry of railY) {
      inner.add(steelMat, boxAt(-2.6, ry, 1.6, -2.55, ry + 0.04, 5.4));
      inner.add(steelMat, boxAt(-2.6, ry, 1.6, -0.6, ry + 0.04, 1.65));
      inner.add(steelMat, boxAt(-2.6, ry, 5.35, -0.6, ry + 0.04, 5.4));
    }
    for (const [px, pz] of [[-2.575, 1.625], [-2.575, 2.9], [-2.575, 4.1], [-2.575, 5.375], [-1.6, 1.625], [-1.6, 5.375]]) {
      inner.add(steelMat, boxAt(px - 0.02, LADDER_TOP, pz - 0.02, px + 0.02, LADDER_TOP + 1.09, pz + 0.02));
    }
  }

  /* cloakroom: big drum pendants under the slab */
  for (const x of [-33.2, -30.4]) {
    for (let z = -14; z <= 14; z += 4) {
      inner.add(drumMat, new THREE.CylinderGeometry(0.42, 0.42, 0.55, 20, 1, true).translate(x, 2.95, z));
      inner.add(steelMat, new THREE.CylinderGeometry(0.008, 0.008, 0.8, 4).translate(x, 3.62, z));
    }
  }

  /* the ground floor under the main floor: a forest of columns, ducts, enamel lamps */
  {
    const gx = HALL_COLUMNS;
    const gz = GROUND_COLUMN_Z;
    for (const x of gx) {
      for (const z of gz) {
        inner.add(rawMat, boxAt(x - 0.55, 0, z - 0.55, x + 0.55, 3.35, z + 0.55));
        // haunches
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          inner.add(rawMat, boxAt(x - 0.55 + Math.min(0, dx) * 0.5, 3.0, z - 0.55 + Math.min(0, dz) * 0.5, x + 0.55 + Math.max(0, dx) * 0.5, 3.35, z + 0.55 + Math.max(0, dz) * 0.5));
        }
      }
      inner.add(rawMat, boxAt(x - 0.4, 3.35, -14.4, x + 0.4, 4.0, IN_Z));
    }
    for (const z of gz) inner.add(rawMat, boxAt(CROSS + 0.25, 3.35, z - 0.35, -0.6, 4.0, z + 0.35));
    // a long rectangular duct and a round one
    inner.add(galvMat, boxAt(CROSS + 0.25, 2.65, 0.3, -0.6, 3.25, 1.5));
    for (let x = CROSS + 1; x < -0.6; x += 1.5) inner.add(steelMat, boxAt(x, 2.63, 0.28, x + 0.05, 3.27, 1.52));
    inner.add(galvMat, new THREE.CylinderGeometry(0.3, 0.3, -0.6 - (CROSS + 0.25), 12).rotateZ(Math.PI / 2).translate((CROSS + 0.25 - 0.6) / 2, 2.95, 12.4));
    // enamel shades in rows
    for (const z of [-6.4, 6.4]) {
      for (let x = CROSS + 2.2; x < -1; x += 3.2) {
        inner.add(steelMat, new THREE.CylinderGeometry(0.006, 0.006, 0.95, 3).translate(x, 2.9, z));
        inner.add(enamelMat, new THREE.ConeGeometry(0.32, 0.22, 16, 1, true).translate(x, 2.33, z));
        inner.add(bulbWarm, new THREE.SphereGeometry(0.07, 8, 6).translate(x, 2.24, z));
      }
    }
    // heavy concrete benches and low concrete walls
    for (const [x, z, a] of GROUND_BENCHES) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)), new THREE.Vector3(1, 1, 1));
      inner.add(rawMat, boxAt(-1.3, 0.38, -0.32, 1.3, 0.5, 0.32), m);
      for (const e of [-1, 1]) inner.add(rawMat, boxAt(e * 1.0 - 0.15, 0, -0.25, e * 1.0 + 0.15, 0.38, 0.25), m);
    }
    for (const [x0, z0, x1, z1] of GROUND_WALLS) {
      inner.add(rawMat, boxAt(x0, 0, z0, x1, 1.35, z1));
    }
  }

  /* cloakroom and door desk */
  inner.add(blackMat, boxAt(-35.4, 0, -12.6, -34.6, 1.05, -9.2)); // door desk
  inner.add(steelMat, boxAt(-35.5, 1.05, -12.7, -34.5, 1.1, -9.1));
  inner.add(blackMat, boxAt(-29.4, 0, -4, -28.6, 1.1, 14)); // cloakroom counter
  inner.add(steelMat, boxAt(-29.5, 1.1, -4.1, -28.5, 1.15, 14.1));
  const coatRails: number[] = [-27.6, -26.2];
  for (const x of coatRails) {
    inner.add(steelMat, new THREE.CylinderGeometry(0.025, 0.025, 17.6, 6).rotateX(Math.PI / 2).translate(x, 2.1, 5));
    for (const z of [-3.6, 5, 13.6]) inner.add(steelMat, boxAt(x - 0.03, 0, z - 0.03, x + 0.03, 2.15, z + 0.03));
  }
  const coats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.0, 0.5).translate(0, -0.55, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), 220);
  {
    const r = rng(41);
    const col = new THREE.Color();
    let i = 0;
    for (const x of coatRails) {
      for (let z = -3.4; z < 13.4 && i < 220; z += 0.155) {
        coats.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x + (r() - 0.5) * 0.05, 2.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r() - 0.5) * 0.3, 0)), new THREE.Vector3(1, 0.8 + r() * 0.4, 0.9 + r() * 0.3)));
        col.setHSL(r(), r() * 0.15, 0.03 + r() * r() * 0.12);
        coats.setColorAt(i, col);
        i++;
      }
    }
    coats.count = i;
  }
  group.add(coats);
  // numbered tag board and a little light box over the counter
  const tagBoard = new THREE.MeshStandardMaterial({ color: '#0c0c0c', roughness: 0.9 });
  inner.add(tagBoard, boxAt(-28.95, 2.6, -2, -28.85, 3.0, 12));

  /* bar on the main-floor level, behind the glass */
  inner.add(blackMat, boxAt(-33.9, 4.5, -12, -33.1, 5.62, 6));
  inner.add(steelMat, boxAt(-34.0, 5.62, -12.1, -33.0, 5.68, 6.1));
  inner.add(blackMat, boxAt(-37.6, 4.5, -12, -37.0, 7.2, 6));
  const shelfGlow = new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color('#ff7a3a'), emissiveIntensity: 1.2 });
  inner.add(shelfGlow, boxAt(-37.0, 5.6, -11.8, -36.98, 5.65, 5.8));
  inner.add(shelfGlow, boxAt(-37.0, 6.3, -11.8, -36.98, 6.35, 5.8));
  // concrete pipe sections as seats (1.4 t each, as built)
  const pipe = new THREE.LatheGeometry(
    [new THREE.Vector2(0.58, 0), new THREE.Vector2(0.72, 0), new THREE.Vector2(0.72, 0.95), new THREE.Vector2(0.58, 0.95), new THREE.Vector2(0.58, 0)],
    24,
  );
  for (const [x, z] of PIPE_SEATS) inner.add(rawMat, pipe.clone().translate(x, 4.5, z));

  /* main floor: DJ booth, speakers, platforms, rig */
  inner.add(blackMat, boxAt(-4.6, 4.5, -3.2, -0.6, 5.7, 3.2)); // booth riser
  inner.add(blackMat, boxAt(-4.5, 5.7, -2.2, -3.7, 6.75, 2.2)); // the desk
  inner.add(steelMat, boxAt(-4.55, 6.75, -2.25, -3.65, 6.8, 2.25));
  const deckGlow = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#ff3a2a'), emissiveIntensity: 1.4 });
  const booth = buildBooth();
  group.add(booth.group);
  for (const [x, z] of PODIUMS) {
    inner.add(blackMat, boxAt(x - 1.2, 4.5, z - 1.2, x + 1.2, 5.1, z + 1.2));
    inner.add(steelMat, boxAt(x - 1.22, 5.08, z - 1.22, x + 1.22, 5.12, z + 1.22));
  }
  for (const [x, z] of SPEAKER_STACKS) {
    const face = Math.atan2(-12 - x, 0 - z);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 4.5, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, face + Math.PI, 0)), new THREE.Vector3(1, 1, 1));
    inner.add(speakerMat, boxAt(-0.75, 0, -0.75, 0.75, 0.5, 0.75), m);
    // stacked cabinets: two bass bins, mid-tops with horns
    for (let k = 0; k < 2; k++) {
      inner.add(speakerMat, boxAt(-0.7, 0.5 + k * 1.05, -0.65, 0.7, 1.5 + k * 1.05, 0.65), m);
      inner.add(hornMat, new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20).rotateX(Math.PI / 2).translate(0, 1.0 + k * 1.05, -0.66), m);
    }
    for (let k = 0; k < 3; k++) {
      inner.add(speakerMat, boxAt(-0.6, 2.6 + k * 0.62, -0.62, 0.6, 3.18 + k * 0.62, 0.62), m);
      inner.add(hornMat, boxAt(-0.5, 2.68 + k * 0.62, -0.64, 0.5, 3.1 + k * 0.62, -0.62), m);
    }
  }

  /* Panorama Bar */
  inner.add(blackMat, boxAt(-27.3, 11.5, -10, -26.5, 12.62, 7)); // counter
  inner.add(steelMat, boxAt(-27.4, 12.62, -10.1, -26.4, 12.68, 7.1));
  inner.add(blackMat, boxAt(-25.4, 11.5, -10, -24.75, 14.4, 7)); // back bar
  const panoGlow = new THREE.MeshStandardMaterial({ color: '#000', emissive: new THREE.Color('#ffb05a'), emissiveIntensity: 1.6 });
  inner.add(panoGlow, boxAt(-25.42, 12.9, -9.8, -25.4, 12.94, 6.8));
  inner.add(panoGlow, boxAt(-25.42, 13.6, -9.8, -25.4, 13.64, 6.8));
  inner.add(blackMat, boxAt(-33.5, 11.5, -IN_Z, -28.5, 12.1, -15.6)); // DJ riser
  inner.add(blackMat, boxAt(-33, 12.1, -16.4, -29, 13.15, -15.8)); // desk
  inner.add(deckGlow, boxAt(-32.6, 13.15, -16.3, -29.4, 13.17, -15.9));
  // speakers flanking the booth, a line array each side
  for (const x of [-35, -27]) {
    inner.add(speakerMat, boxAt(x - 0.6, 11.5, -16.6, x + 0.6, 12.6, -15.5));
    for (let k = 0; k < 5; k++) inner.add(speakerMat, boxAt(x - 0.4, 16.5 - k * 0.42, -16.4, x + 0.4, 16.88 - k * 0.42, -15.9));
  }
  // low seating in the lounge end
  for (const [x, z] of PANO_SEATS) inner.add(blackMat, boxAt(x - 0.6, 11.5, z - 1.6, x + 0.6, 11.95, z + 1.6));
  // large-format prints
  const prints = [print(3), print(7), print(12)].map((m) => new THREE.MeshStandardMaterial({ map: m, roughness: 0.6 }));
  inner.add(prints[0], new THREE.PlaneGeometry(2.4, 3).rotateY(Math.PI).translate(-30.5, 15.2, IN_Z - 0.06));
  inner.add(prints[1], new THREE.PlaneGeometry(1.6, 2).rotateY(Math.PI).translate(-34.6, 14.6, IN_Z - 0.06));
  inner.add(prints[2], new THREE.PlaneGeometry(2.0, 2.5).rotateY(-Math.PI / 2).translate(-24.82, 16.4, 1));

  /* ---------------------------------------------------- forecourt ---- */
  const gravelTex = gravel();
  gravelTex.wrapS = gravelTex.wrapT = THREE.RepeatWrapping;
  gravelTex.repeat.set(1 / 5, 1 / 5);
  const gravelMat = new THREE.MeshStandardMaterial({ map: gravelTex, color: '#8a847a', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  // The approach as mapped: a dirt path from Am Wriezener Bahnhof straight to the door
  const qLocal = QUEUE_PATH;
  {
    const sandTex = gravel(52);
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(1 / 4, 1 / 4);
    const sandMat = new THREE.MeshStandardMaterial({ map: sandTex, color: '#c9b99a', roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    const path = ribbon(qLocal, 7, 0.075);
    const uv = path.attributes.uv as THREE.BufferAttribute;
    const pos = path.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i));
    const pathMesh = new THREE.Mesh(path, sandMat);
    pathMesh.receiveShadow = true;
    group.add(pathMesh);
    // clinker pavers in front of the door
    const paveTex = brick(61);
    paveTex.wrapS = paveTex.wrapT = THREE.RepeatWrapping;
    const pave = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 2 * W2 + 2).rotateX(-Math.PI / 2).translate(-L2 - 7, 0.085, 0),
      new THREE.MeshStandardMaterial({ map: paveTex, color: '#b3a79b', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3 }),
    );
    paveTex.repeat.set(14 / 1.6, (2 * W2 + 2) / 1.6);
    pave.receiveShadow = true;
    group.add(pave);
    // a gravel strip round the rest of the building
    for (const [x0, z0, x1, z1] of [
      [-L2, -W2 - 3, L2 + 3, -W2],
      [-L2, W2, L2 + 3, W2 + 3],
      [L2, -W2, L2 + 3, W2],
    ]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0.07, (z0 + z1) / 2), gravelMat);
      strip.receiveShadow = true;
      group.add(strip);
    }
    // a welded-mesh fence down the far side of the path (the near side's fence is in the map data)
    const fenceSide = offsetPath(qLocal.slice(1, 3), 3.8);
    for (const s2 of along(fenceSide, 2.5, 1.25)) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(s2.x, 0, s2.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s2.angle + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1));
      outer.add(meshMat, boxAt(-1.22, 0.1, -0.01, 1.22, 2.1, 0.01, 2.4), m);
      outer.add(galvMat, boxAt(-1.27, 0, -0.03, -1.21, 2.2, 0.03), m);
      outer.add(darkMat, boxAt(-1.4, 0, -0.18, -1.08, 0.14, 0.18), m);
    }
  }

  // the queue: a lane of crowd barriers along the path, from the door back towards the street
  const barrierGeo = barrierGeometry();
  const barrierSpots: { x: number; z: number; angle: number }[] = [];
  for (const side of [-0.6, -2.2]) {
    const off = offsetPath(qLocal.slice(0, 3), side);
    for (const s of along(off, 2.5, 1.25)) barrierSpots.push(s);
  }
  const barriers = new THREE.InstancedMesh(barrierGeo, galvMat, barrierSpots.length);
  barrierSpots.forEach((s, i) => barriers.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(s.x, 0.075, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.angle + Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1))));
  barriers.castShadow = true;
  barriers.receiveShadow = true;
  group.add(barriers);

  // floodlights on poles over the forecourt, and the lamp over the door
  const floodPoles = FLOOD_POLES;
  for (const [x, z] of floodPoles) {
    outer.add(steelMat, new THREE.CylinderGeometry(0.08, 0.12, 7, 8).translate(x, 3.5, z));
    outer.add(steelMat, boxAt(x - 0.4, 6.8, z - 0.3, x + 0.4, 7.2, z + 0.3));
  }
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#fff4e0'), emissiveIntensity: 8 });
  outer.add(bulbMat, new THREE.SphereGeometry(0.12, 10, 8).translate(-L2 - 0.5, 4.25, DOOR_Z));
  for (const [x, z] of floodPoles) outer.add(bulbMat, boxAt(x - 0.35, 6.75, z - 0.25, x + 0.35, 6.8, z + 0.25));

  /* --------------------------------------- Kantine, Bierhof, garden ---- */
  const world = new Batch();
  const kantine = mapBuilding(ctx.map, KANTINE_ID);
  const brickTex = brick(5);
  brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
  brickTex.repeat.set(1 / 3, 1 / 3);
  const kantineMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 });
  {
    const { walls, roof } = extrude(kantine.p, 4.6);
    world.add(kantineMat, walls);
    world.add(darkMat, roof);
    const { walls: parapet } = extrude(kantine.p, 0.5, 4.6);
    world.add(trimMat, parapet);
    const bh = mapBuilding(ctx.map, BIERHOF_ID);
    const { walls: bw, roof: br } = extrude(bh.p, 7.2);
    // the Bierhof's bare concrete pylons standing up off its roof terrace
    for (let i = 0; i < bh.p.length; i++) {
      const [px, pz] = bh.p[i];
      const [qx, qz] = bh.p[(i + 1) % bh.p.length];
      const n = Math.floor(Math.hypot(qx - px, qz - pz) / 4);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const x = px + (qx - px) * t;
        const z = pz + (qz - pz) * t;
        world.add(rawMat, boxAt(x - 0.3, 7.2, z - 0.3, x + 0.3, 9.6 + ((i * 3 + k * 5) % 4) * 0.7, z + 0.3));
      }
    }
    world.add(facadeMat, bw);
    world.add(darkMat, br);
    // the roof terrace rail on the Bierhof
    for (let i = 0; i < bh.p.length; i++) {
      const [x0, z0] = bh.p[i];
      const [x1, z1] = bh.p[(i + 1) % bh.p.length];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const m = new THREE.Matrix4().compose(new THREE.Vector3((x0 + x1) / 2, 8.2, (z0 + z1) / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(x1 - x0, z1 - z0), 0)), new THREE.Vector3(1, 1, 1));
      world.add(steelMat, boxAt(-0.03, -0.03, -len / 2, 0.03, 0.03, len / 2), m);
      world.add(steelMat, boxAt(-0.03, -1.0, -len / 2, 0.03, -0.96, len / 2), m);
    }
  }
  // windows on the Kantine glowing warm
  const kWin = new THREE.MeshStandardMaterial({ color: '#160e08', emissive: new THREE.Color('#ffb66a'), emissiveIntensity: 1.6 });
  for (let i = 0; i < kantine.p.length; i++) {
    const [x0, z0] = kantine.p[i];
    const [x1, z1] = kantine.p[(i + 1) % kantine.p.length];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 4) continue;
    const n = Math.floor(len / 3.2);
    // outward normal: the Kantine is wound either way, test against its centre
    const cx = kantine.p.reduce((a, p) => a + p[0], 0) / kantine.p.length;
    const cz = kantine.p.reduce((a, p) => a + p[1], 0) / kantine.p.length;
    let nx = -(z1 - z0) / len;
    let nz = (x1 - x0) / len;
    if (((x0 + x1) / 2 - cx) * nx + ((z0 + z1) / 2 - cz) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = x0 + (x1 - x0) * t + nx * 0.02;
      const z = z0 + (z1 - z0) * t + nz * 0.02;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 2.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(nx, nz), 0)), new THREE.Vector3(1, 1, 1));
      world.add(kWin, new THREE.PlaneGeometry(1.6, 1.8), m);
      world.add(kWin, new THREE.PlaneGeometry(1.6, 1.8).rotateY(Math.PI), m);
    }
  }
  // the beer garden: benches and tables, strings of bulbs
  const wood = new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 0.85 });
  for (const [x, z, a] of GARDEN_BENCHES) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)), new THREE.Vector3(1, 1, 1));
    world.add(wood, boxAt(-1.1, 0.74, -0.3, 1.1, 0.78, 0.3), m);
    for (const s of [-1, 1]) {
      world.add(wood, boxAt(-1.1, 0.44, s * 0.55 - 0.13, 1.1, 0.48, s * 0.55 + 0.13), m);
      for (const e of [-0.9, 0.9]) world.add(steelMat, boxAt(e - 0.02, 0, s * 0.55 - 0.1, e + 0.02, 0.44, s * 0.55 + 0.1), m);
    }
    for (const e of [-0.9, 0.9]) world.add(steelMat, boxAt(e - 0.02, 0, -0.25, e + 0.02, 0.74, 0.25), m);
  }
  const gardenGround = new THREE.Mesh(new THREE.PlaneGeometry(26, 22).rotateX(-Math.PI / 2).translate(-11, 0.07, -46), gravelMat.clone());
  (gardenGround.material as THREE.MeshStandardMaterial).map = gravelTex.clone();
  (gardenGround.material as THREE.MeshStandardMaterial).map!.repeat.set(4, 4);
  gardenGround.receiveShadow = true;
  root.add(gardenGround);
  // where the cooling tower stood: its round footprint is still in the garden
  const ring = new THREE.Mesh(new THREE.TorusGeometry(12.25, 0.35, 6, 64).rotateX(Math.PI / 2).translate(-12, 0.2, -72), trimMat);
  ring.receiveShadow = true;
  root.add(ring);
  const bulbPoles = BULB_POLES;
  const bulbs: THREE.Vector3[] = [];
  for (const [x, z] of bulbPoles) world.add(steelMat, new THREE.CylinderGeometry(0.05, 0.06, 4.2, 6).translate(x, 2.1, z));
  for (let i = 0; i < bulbPoles.length; i++) {
    const [x0, z0] = bulbPoles[i];
    const [x1, z1] = bulbPoles[(i + 1) % bulbPoles.length];
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      bulbs.push(new THREE.Vector3(x0 + (x1 - x0) * t, 4.1 - Math.sin(Math.PI * t) * 0.7, z0 + (z1 - z0) * t));
    }
  }
  const bulbInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#ffc477'), emissiveIntensity: 5 }), bulbs.length);
  bulbs.forEach((b, i) => bulbInst.setMatrixAt(i, new THREE.Matrix4().makeTranslation(b.x, b.y, b.z)));
  root.add(bulbInst);
  // a long, low, tagged wall along the garden
  const grimeTex = grime();
  grimeTex.wrapS = grimeTex.wrapT = THREE.RepeatWrapping;
  const wallMat = new THREE.MeshStandardMaterial({ map: grimeTex, roughness: 0.95 });
  const gw = new THREE.Matrix4().compose(toWorld(-6, 0, -W2 - 16), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ROT, 0)), new THREE.Vector3(1, 1, 1));
  world.add(wallMat, boxAt(-14, 0, -0.15, 14, 2.4, 0.15, 2.4), gw);

  if (Q.relief) {
    // depth for every painted surface: board marks, render, gravel, chequer plate, brick, the worn floor
    relief(rawMat, 1.1);
    relief(darkMat, 1.1);
    relief(facadeMat, 0.8);
    relief(facadeMat2, 0.8);
    relief(trimMat, 0.8);
    relief(plateMat, 1.6, 256);
    relief(floorMat, 0.9);
    relief(panoFloor, 0.7);
    relief(gravelMat, 1.4);
    relief(kantineMat, 1.2);
    relief(wallMat, 0.8);
    for (const m of graffitiMats) relief(m, 0.9);
    floorMat.roughness = 0.5;
    panoFloor.roughness = 0.42;
  }
  outer.build(group);
  inner.build(group, { cast: true, receive: true });
  world.build(root);
  // glass and wire mesh let the light through: sun lands on the floor behind a window
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    const mat = mesh.material as THREE.Material | undefined;
    if (mesh.isMesh && mat && !Array.isArray(mat) && (mat.transparent || mat.alphaTest > 0)) mesh.castShadow = false;
  });

  /* ------------------------------------------------- people, lights ---- */
  // Both come from the plan; they go into the scene here, after the building and before the haze.
  ctx.populate();
  const rig = ctx.light();
  const hallRed = rig.get('hall-red')!;
  const hallWhite = rig.get('hall-white')!;
  const hallBlue = rig.get('hall-blue')!;
  const panoA = rig.get('pano-a')!;
  const panoB = rig.get('pano-b')!;
  const spots = [rig.get<THREE.SpotLight>('spot-0')!, rig.get<THREE.SpotLight>('spot-1')!];
  const hallKey = rig.get<THREE.SpotLight>('hall-key');

  // light from the open door spilling onto the step
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.4).rotateY(-Math.PI / 2).translate(-L2 + 3.2, 1.7, DOOR_Z), new THREE.MeshBasicMaterial({ color: '#0a0505' }));
  group.add(doorGlow);

  /* moving heads with visible beams in the haze */
  const beams: { mesh: THREE.Mesh; phase: number; x: number; z: number; mat: THREE.ShaderMaterial }[] = [];
  const beamGeo = beamGeometry(1.1, 14);
  {
    const r = rng(8);
    for (const x of [-20, -13, -6]) {
      for (const z of [-10, -3, 3, 10]) {
        const m = beamMaterial();
        const mesh = new THREE.Mesh(beamGeo, m);
        mesh.position.set(x, 13.1, z);
        mesh.renderOrder = 5;
        group.add(mesh);
        const head = new THREE.Mesh(boxAt(-0.2, -0.3, -0.2, 0.2, 0.1, 0.2), blackMat);
        head.position.set(x, 13.1, z);
        group.add(head);
        beams.push({ mesh, phase: r() * 10, x, z, mat: m });
      }
    }
  }
  // Panorama Bar ceiling bulbs
  const panoBulbs: THREE.Vector3[] = [];
  for (let x = -36; x <= -27; x += 1.5) for (let z = -14; z <= 4; z += 1.5) panoBulbs.push(new THREE.Vector3(x, 18.8, z));
  const panoBulbMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: new THREE.Color('#ffa24a'), emissiveIntensity: 3 });
  const panoBulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 4), panoBulbMat, panoBulbs.length);
  panoBulbs.forEach((b, i) => panoBulbMesh.setMatrixAt(i, new THREE.Matrix4().makeTranslation(b.x, b.y, b.z)));
  group.add(panoBulbMesh);

  /* dust and smoke drifting through the hall, catching the light */
  let dust: THREE.Points | null = null;
  if (Q.dust) {
    dust = dustCloud({ count: Q.level === 'ultra' ? 2600 : 1400, seed: 91, x: [CROSS + 1, -1.5], y: [5, 19], z: [-IN_Z + 1.5, IN_Z - 1.5] });
    group.add(dust);
  }

  /* bottles on the back bars, glasses on the counters, extinguishers on the walls */
  if (Q.props) {
    const r = rng(57);
    const bottleGeo = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.034, 0],
        [0.036, 0.02],
        [0.036, 0.15],
        [0.03, 0.18],
        [0.013, 0.215],
        [0.012, 0.27],
        [0.015, 0.275],
        [0, 0.278],
      ].map(([x0, y0]) => new THREE.Vector2(x0, y0)),
      10,
    );
    const spotsB: [number, number, number, number][] = [];
    for (const y of [5.65, 6.35]) for (let z = -11.6; z < 5.7; z += 0.12 + r() * 0.07) spotsB.push([-36.9, y, z, 0.85 + r() * 0.3]);
    for (const y of [12.94, 13.64]) for (let z = -9.6; z < 6.7; z += 0.12 + r() * 0.07) spotsB.push([-25.52, y, z, 0.85 + r() * 0.3]);
    const bottles = new THREE.InstancedMesh(bottleGeo, new THREE.MeshStandardMaterial({ roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.9 }), spotsB.length);
    const tints = ['#2d4a2a', '#5a3a1c', '#c9c4b8', '#1c2a3a', '#7a5a22', '#101010', '#8a2a22'];
    const col = new THREE.Color();
    spotsB.forEach(([x, y, z, k], i) => {
      bottles.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), new THREE.Vector3(k, 0.8 + r() * 0.5, k)));
      bottles.setColorAt(i, col.set(tints[Math.floor(r() * tints.length)]));
    });
    group.add(bottles);
    const glassGeo = new THREE.CylinderGeometry(0.032, 0.026, 0.11, 10, 1, true);
    const glassSpots: [number, number, number][] = [];
    for (let i = 0; i < 46; i++) glassSpots.push([-33.5 + (r() - 0.5) * 0.5, 5.735, -11.6 + r() * 17.2]);
    for (let i = 0; i < 40; i++) glassSpots.push([-26.9 + (r() - 0.5) * 0.5, 12.735, -9.6 + r() * 16.2]);
    const glasses = new THREE.InstancedMesh(glassGeo, new THREE.MeshStandardMaterial({ color: '#7d8587', roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.22, side: THREE.DoubleSide }), glassSpots.length);
    glassSpots.forEach(([x, y, z], i) => glasses.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, z)));
    group.add(glasses);
    const redPaint = new THREE.MeshStandardMaterial({ color: '#a0170f', roughness: 0.35, metalness: 0.3 });
    for (const [x, y, z] of [
      [CROSS + 0.45, 4.5, -8.6],
      [CROSS + 0.45, 4.5, 8.6],
      [-1.0, 4.5, 12.2],
      [-36.9, 0.04, 14.5],
      [CROSS - 0.45, 11.5, 6.5],
    ]) {
      const ex = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 4, 12), redPaint);
      ex.position.set(x, y + 0.75, z);
      ex.castShadow = true;
      group.add(ex);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1, 8), blackMat);
      nozzle.position.set(x, y + 1.06, z);
      group.add(nozzle);
    }
  }

  /* ---------------------------------------------------------- update ---- */
  let morning = false;
  let shutterOpen = 0;

  function update({ dt, t, beat, bar, pulse, strobe, zone }: FrameState) {
    const inside = zone.inside;
    booth.update(t, beat);
    const lit = inside || zone.id === 'doorstep';
    const inHall = rig.isOn('hall');
    if (dust) {
      dust.visible = zone.room === 'main' || zone.room === 'bar' || zone.room === 'stair';
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (dust.material as THREE.ShaderMaterial).uniforms.uGlow.value = 0.35 + pulse * 0.65;
    }
    // the engine has put every light at its base level; the show moves the ones that move
    if (inHall) {
      hallRed.intensity = 30 + pulse * 70;
      hallWhite.intensity = strobe * 900;
      hallBlue.intensity = bar % 4 === 2 ? 30 + pulse * 30 : 6;
      spots.forEach((s, i) => {
        const a = t * 0.6 + i * 2.1;
        s.target.position.set(-13 + Math.sin(a) * 8, 4.5, (i ? 6 : -6) + Math.cos(a * 1.3) * 7);
        s.target.updateMatrixWorld();
        s.intensity = (bar % 2 === i ? 900 : 250) * (0.5 + pulse * 0.5);
      });
      if (hallKey) {
        hallKey.intensity = 240 + pulse * 320;
        hallRed.intensity *= 0.6; // the key light carries the room; the fill only lifts the shadows
      }
    }
    if (lit) {
      panoA.intensity = 18 + Math.sin(t * 0.7) * 8;
      panoB.intensity = 12 + Math.sin(t * 0.5 + 1) * 6;
      panoBulbMat.emissiveIntensity = 1.5 + Math.sin(t * 2) * 0.6 + (morning ? -1.2 : 0);
    }
    const downstairs = zone.room === 'cloak' || zone.room === 'ground';
    beams.forEach((b, i) => {
      const a = t * (0.4 + (i % 3) * 0.13) + b.phase;
      b.mesh.rotation.set(Math.sin(a) * 0.55, 0, Math.cos(a * 0.8) * 0.55);
      const on = (bar + i) % 4 < 2 || strobe > 0;
      const o = inside && !downstairs ? (on ? 0.07 + pulse * 0.1 : 0.0) : 0;
      b.mat.uniforms.uOpacity.value = o;
      b.mat.uniforms.uTime.value = t;
      b.mat.uniforms.uColor.value.set(i % 5 === 0 ? '#ff3020' : '#ffffff');
      b.mesh.visible = o > 0.001;
    });
    // roller shutters: down at night, up in the morning
    shutterOpen = THREE.MathUtils.damp(shutterOpen, morning ? 1 : 0, 1.5, dt);
    shutters.forEach((s) => {
      s.scale.y = Math.max(0.02, 1 - shutterOpen);
      s.position.y = s.userData.top - (s.userData.h * s.scale.y) / 2;
    });
    leaks.forEach((l) => {
      (l.material as THREE.MeshBasicMaterial).color.setRGB(1 * (0.4 + pulse * 0.6), 0.5 * (0.4 + pulse * 0.6), 0.2 * (0.4 + pulse * 0.6));
      l.visible = shutterOpen < 0.5;
    });
    (doorGlow.material as THREE.MeshBasicMaterial).color.setRGB(0.05 + pulse * 0.05, 0.012 + pulse * 0.008, 0.01);
    doorGlow.visible = !lit;
    innerWindowMat.emissiveIntensity = morning ? 1.5 : 0.18;
  }

  return {
    update,
    setTime(time, instant) {
      morning = !time.night;
      if (instant) shutterOpen = morning ? 1 : 0;
    },
  };
}
