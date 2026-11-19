import * as THREE from 'three';
import { canvasTexture } from '../../engine/util';
import { djPieces, type Stage } from '../../kit';

/**
 * The main-floor booth: four turntables, a mixer and a drum machine, and a DJ
 * who works across all of it. The turntables and the mixer are the kit's DJ
 * equipment (kit/dj.ts), the same pieces that stand in the other clubs; the
 * drum machine, the crate and the DJ are this booth's own. The setup is a nod to the
 * Detroit way of playing techno, fast, on many decks at once, with a drum
 * machine run live over the records. The figure is nobody in particular.
 *
 * Everything is in the building's frame. The desk top is at y = 6.8, the
 * desk runs along z, and the DJ stands on the +x side of it facing the floor.
 */

const DESK_Y = 6.8;
const DESK_X = -4.1;
const DECKS = [-1.5, -0.9, 1.0, 1.6];
const MIXER_Z = -0.3;
const DRUM_Z = 0.36;

export function buildBooth(stage: Stage) {
  const group = new THREE.Group();
  stage.group.add(group);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const dark = new THREE.MeshStandardMaterial({ color: '#1b1c1d', roughness: 0.5, metalness: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: '#080808', roughness: 0.7 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.95 });
  const red = new THREE.MeshStandardMaterial({ color: '#200', emissive: new THREE.Color('#ff2a1a'), emissiveIntensity: 3 });

  /* four turntables and the mixer, from the kit: the desk runs along z and the DJ stands on its +x side, so the DJ's right is -z */
  const desk = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)).setPosition(DESK_X, DESK_Y, 0);
  djPieces(stage, desk, [...DECKS.map((z, i) => ({ kind: 'turntable' as const, x: -z, hue: [8, 205, 48, 0][i] })), { kind: 'mixer', x: -MIXER_Z }]);
  const knob = new THREE.CylinderGeometry(0.011, 0.013, 0.02, 12);

  /* the drum machine: cream case, a row of sixteen step keys, a running light */
  const drum = new THREE.Group();
  drum.position.set(DESK_X, DESK_Y, DRUM_Z);
  group.add(drum);
  const cream = new THREE.MeshStandardMaterial({ color: '#8d887b', roughness: 0.7 });
  add(new THREE.BoxGeometry(0.3, 0.06, 0.5), cream, 0, 0.03, 0, drum);
  add(new THREE.BoxGeometry(0.3, 0.02, 0.5), dark, 0, 0.005, 0, drum);
  const keyColours = ['#c9412e', '#d9792a', '#d9b62a', '#e9e6dc'];
  const stepZ = (s: number) => -0.225 + s * 0.03;
  for (let s = 0; s < 16; s++) {
    add(new THREE.BoxGeometry(0.045, 0.01, 0.024), new THREE.MeshStandardMaterial({ color: keyColours[Math.floor(s / 4)], roughness: 0.5 }), 0.105, 0.064, stepZ(s), drum);
  }
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < 11; k++) {
      add(knob, rubber, -0.1 + r * 0.06, 0.07, -0.21 + k * 0.042, drum);
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8), new THREE.MeshStandardMaterial({ color: '#d9792a' }), -0.1 + r * 0.06, 0.082, -0.21 + k * 0.042, drum);
    }
  }
  add(new THREE.BoxGeometry(0.03, 0.004, 0.06), red, 0.03, 0.062, -0.19, drum).castShadow = false; // tempo display
  const runner = add(new THREE.BoxGeometry(0.008, 0.004, 0.012), red, 0.07, 0.063, stepZ(0), drum);
  runner.castShadow = false;

  // a record crate behind the DJ, and headphones' cable is left to the imagination
  add(new THREE.BoxGeometry(0.36, 0.34, 0.5), black, -1.6, 5.87, -1.2);
  for (let k = 0; k < 14; k++) add(new THREE.BoxGeometry(0.31, 0.31, 0.012), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL((k * 0.17) % 1, 0.25, 0.18 + (k % 3) * 0.08), roughness: 0.8 }), -1.6, 5.9 + 0.05, -1.4 + k * 0.03);

  /* the DJ */
  const dj = new THREE.Group();
  dj.position.set(-3.42, 5.7, 0);
  dj.rotation.y = -Math.PI / 2; // facing the floor
  group.add(dj);
  const skin = new THREE.MeshStandardMaterial({ color: '#7a5238', roughness: 0.62 });
  const shirt = new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.85 });
  const trousers = new THREE.MeshStandardMaterial({ color: '#131314', roughness: 0.9 });
  const shoe = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.5 });

  // legs and shoes
  for (const s of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.068, 0.36, 6, 14), trousers, s * 0.095, 0.66, 0, dj);
    add(new THREE.CapsuleGeometry(0.056, 0.36, 6, 14), trousers, s * 0.095, 0.27, 0.005, dj);
    const sh = add(new THREE.CapsuleGeometry(0.048, 0.15, 5, 12).rotateX(Math.PI / 2), shoe, s * 0.095, 0.045, 0.05, dj);
    sh.scale.y = 0.75;
  }
  // everything above the hips leans and nods together
  const upper = new THREE.Group();
  upper.position.y = 0.92;
  dj.add(upper);
  const hips = add(new THREE.SphereGeometry(0.155, 20, 14), trousers, 0, 0, 0, upper);
  hips.scale.set(1, 0.7, 0.72);
  // a slim torso: lathe profile from waist to shoulders, flattened front to back
  const torsoProfile = [
    [0.0, -0.02],
    [0.135, -0.02],
    [0.132, 0.1],
    [0.14, 0.24],
    [0.158, 0.38],
    [0.168, 0.46],
    [0.15, 0.52],
    [0.085, 0.555],
    [0.0, 0.56],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = add(new THREE.LatheGeometry(torsoProfile, 28), shirt, 0, 0, 0, upper);
  torso.scale.set(1.08, 1, 0.66);
  // collar
  const collar = add(new THREE.TorusGeometry(0.058, 0.014, 8, 20).rotateX(Math.PI / 2), shirt, 0, 0.56, 0.004, upper);
  collar.castShadow = false;

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.555, 0);
  upper.add(headPivot);
  add(new THREE.CylinderGeometry(0.054, 0.06, 0.1, 16), skin, 0, 0.045, 0, headPivot);
  // the head: an egg, narrower at the jaw, with ears, a nose, brows and a mouth line
  const head = new THREE.Group();
  head.position.set(0, 0.168, 0.012);
  headPivot.add(head);
  // The head is sculpted, not assembled: a fine sphere pushed into a skull with a brow,
  // eye sockets, a nose, cheekbones, lips and a chin, then painted with a face.
  const g2 = (x: number, y: number, x0: number, y0: number, sx: number, sy: number) => Math.exp(-(((x - x0) * (x - x0)) / (2 * sx * sx) + ((y - y0) * (y - y0)) / (2 * sy * sy)));
  const sstep = (a: number, b: number, v: number) => {
    const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  const skullGeo = new THREE.SphereGeometry(1, 128, 96);
  {
    const p = skullGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      let wx = 0.082 * (1 + 0.04 * Math.max(0, y));
      let wz = 0.096;
      if (y < 0) {
        wx *= 1 - 0.3 * y * y; // the jaw is narrower than the cranium
        if (z < 0) wz *= 1 - 0.28 * y * y; // the back of the skull tucks in to the neck
      }
      const sym = (x0: number, y0: number, sx: number, sy: number) => g2(x, y, x0, y0, sx, sy) + g2(x, y, -x0, y0, sx, sy);
      const t = Math.min(1, Math.max(0, (0.14 - y) / 0.4));
      const noseWindow = sstep(-0.31, -0.24, y) * (1 - sstep(0.08, 0.2, y));
      let d = 0;
      d += 0.0045 * g2(x, y, 0, 0.2, 0.42, 0.05); // brow ridge
      d -= 0.0085 * sym(0.33, 0.08, 0.11, 0.065); // eye sockets
      d += (0.005 + 0.0115 * t * t) * Math.exp(-(x * x) / (2 * 0.095 * 0.095)) * noseWindow; // the nose, fuller towards the tip
      d += 0.0065 * sym(0.13, -0.225, 0.055, 0.04); // nostril wings
      d += 0.004 * sym(0.5, -0.12, 0.16, 0.11); // cheekbones
      d += 0.006 * g2(x, y, 0, -0.43, 0.24, 0.13); // the muzzle
      d += 0.004 * g2(x, y, 0, -0.385, 0.17, 0.028); // upper lip
      d += 0.0048 * g2(x, y, 0, -0.475, 0.15, 0.032); // lower lip
      d -= 0.0022 * g2(x, y, 0, -0.43, 0.2, 0.02); // the line between them
      d -= 0.002 * g2(x, y, 0, -0.56, 0.16, 0.03); // the dip under the lower lip
      d += 0.007 * g2(x, y, 0, -0.72, 0.2, 0.1); // chin
      d -= 0.003 * sym(0.78, 0.15, 0.12, 0.2); // temples
      const front = sstep(0.15, 0.5, z);
      p.setXYZ(i, x * wx, y * (y > 0 ? 0.103 : 0.112), z * wz + d * front);
    }
    skullGeo.computeVertexNormals();
  }
  const faceTex = canvasTexture(2048, 1024, (ctx, w, h) => {
    // sphere UVs: the face centre is at u = 0.25; about 326 px per unit near it
    const P = (x: number, y: number): [number, number] => {
      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      return [(Math.atan2(z, -x) / (Math.PI * 2)) * w, (Math.acos(y) / Math.PI) * h];
    };
    const K = 326;
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    ctx.fillStyle = '#7b5239';
    ctx.fillRect(0, 0, w, h);
    const glow = (x: number, y: number, r: number, colour: string) => {
      const [cx, cy] = P(x, y);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * K);
      g.addColorStop(0, colour);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - r * K, cy - r * K, r * K * 2, r * K * 2);
    };
    // light planes and shadowed hollows
    glow(0, 0.45, 0.5, 'rgba(176,124,90,0.35)');
    glow(0, -0.12, 0.16, 'rgba(176,124,90,0.3)');
    for (const s of [-1, 1]) {
      glow(s * 0.48, -0.12, 0.26, 'rgba(170,112,82,0.28)');
      glow(s * 0.33, 0.09, 0.17, 'rgba(48,28,18,0.5)');
      glow(s * 0.36, -0.03, 0.12, 'rgba(60,34,24,0.22)');
      glow(s * 0.24, -0.34, 0.1, 'rgba(60,34,24,0.2)');
      glow(s * 0.16, -0.14, 0.07, 'rgba(50,28,18,0.25)');
    }
    glow(0, -0.58, 0.1, 'rgba(50,28,18,0.3)');
    glow(0, -0.33, 0.045, 'rgba(50,28,18,0.25)');
    // a shaved head and a day's stubble: fine stipple, denser over the scalp
    const [, hairFace] = P(0, 0.55);
    const [, hairBack] = P(0, -0.2);
    for (let i = 0; i < 90000; i++) {
      const px = rand() * w;
      const py = rand() * h;
      const face = Math.abs(px / w - 0.25) < 0.13;
      const sideburn = Math.abs(px / w - 0.25) < 0.19;
      const limit = face ? hairFace : sideburn ? (hairFace + hairBack) / 2 : hairBack;
      if (py > limit) continue;
      ctx.fillStyle = `rgba(22,14,10,${0.1 + rand() * 0.22})`;
      ctx.fillRect(px, py, 1.6, 1.6);
    }
    for (let i = 0; i < 14000; i++) {
      const x = (rand() - 0.5) * 1.3;
      const y = -0.3 - rand() * 0.6;
      if (Math.abs(x) < 0.24 && y > -0.52 && y < -0.36) continue; // not on the lips
      if (y > -0.5 && Math.abs(x) > 0.3 + (-0.3 - y) * 2.2) continue;
      const [px, py] = P(x, y);
      ctx.fillStyle = `rgba(22,14,10,${0.06 + rand() * 0.14})`;
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    for (const s of [-1, 1]) {
      // eyes, looking down at the records under heavy lids
      const [ex, ey] = P(s * 0.33, 0.065);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.082 * K, 0.03 * K, s * -0.06, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#cfc6ba';
      ctx.fillRect(ex - 40, ey - 20, 80, 40);
      ctx.fillStyle = '#2b190f';
      ctx.beginPath();
      ctx.arc(ex, ey + 3, 0.034 * K, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050403';
      ctx.beginPath();
      ctx.arc(ex, ey + 3, 0.016 * K, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(ex - 4, ey - 1, 3, 3);
      // the upper lid, half lowered, and its shadow
      ctx.fillStyle = '#684430';
      ctx.fillRect(ex - 40, ey - 20, 80, 13);
      ctx.fillStyle = 'rgba(20,10,6,0.45)';
      ctx.fillRect(ex - 40, ey - 7, 80, 4);
      ctx.restore();
      ctx.strokeStyle = '#1a0f09';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.082 * K, 0.03 * K, s * -0.06, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(30,16,10,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.082 * K, 0.03 * K, s * -0.06, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(ex, ey - 0.03 * K, 0.09 * K, 0.03 * K, s * -0.06, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      // eyebrow, as many short hairs
      for (let i = 0; i < 260; i++) {
        const t = rand();
        const bx = s * (0.17 + t * 0.36);
        const by = 0.205 + Math.sin(t * Math.PI) * 0.035 - t * 0.02 + (rand() - 0.5) * 0.03 * (1 - t * 0.5);
        const [px, py] = P(bx, by);
        ctx.strokeStyle = `rgba(18,11,7,${0.35 + rand() * 0.4})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + s * (3 + rand() * 4), py - 2 - rand() * 3);
        ctx.stroke();
      }
      // nostril, and the fold from nose to mouth
      const [nx, ny] = P(s * 0.075, -0.262);
      ctx.fillStyle = 'rgba(20,10,6,0.85)';
      ctx.beginPath();
      ctx.ellipse(nx, ny, 0.032 * K, 0.016 * K, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,22,14,0.3)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(...P(s * 0.19, -0.24));
      ctx.quadraticCurveTo(...P(s * 0.3, -0.36), ...P(s * 0.27, -0.5));
      ctx.stroke();
    }
    // lips
    ctx.fillStyle = '#5b3529';
    ctx.beginPath();
    ctx.moveTo(...P(-0.21, -0.432));
    ctx.quadraticCurveTo(...P(-0.08, -0.37), ...P(0, -0.392));
    ctx.quadraticCurveTo(...P(0.08, -0.37), ...P(0.21, -0.432));
    ctx.quadraticCurveTo(...P(0, -0.44), ...P(-0.21, -0.432));
    ctx.fill();
    ctx.fillStyle = '#6d4133';
    ctx.beginPath();
    ctx.moveTo(...P(-0.21, -0.432));
    ctx.quadraticCurveTo(...P(0, -0.44), ...P(0.21, -0.432));
    ctx.quadraticCurveTo(...P(0.1, -0.53), ...P(0, -0.525));
    ctx.quadraticCurveTo(...P(-0.1, -0.53), ...P(-0.21, -0.432));
    ctx.fill();
    glow(0, -0.485, 0.06, 'rgba(150,100,84,0.3)');
    ctx.strokeStyle = 'rgba(24,12,8,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(...P(-0.215, -0.43));
    ctx.quadraticCurveTo(...P(0, -0.445), ...P(0.215, -0.43));
    ctx.stroke();
  });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.58 });
  add(skullGeo, faceMat, 0, 0, 0, head);
  for (const s of [-1, 1]) {
    // ears: an outer rim, a lobe and a shadowed bowl
    const ear = new THREE.Group();
    ear.position.set(s * 0.079, -0.004, -0.008);
    ear.rotation.y = s * 0.35;
    head.add(ear);
    const rim = add(new THREE.TorusGeometry(0.017, 0.0055, 8, 20, Math.PI * 1.5).rotateY(Math.PI / 2).rotateX(-0.6), skin, 0, 0.006, 0, ear);
    rim.scale.set(1, 1.35, 1);
    add(new THREE.SphereGeometry(0.008, 10, 8), skin, 0, -0.022, 0.004, ear);
    const bowl = add(new THREE.SphereGeometry(0.013, 10, 8), new THREE.MeshStandardMaterial({ color: '#4a2f20', roughness: 0.8 }), -s * 0.002, 0.002, 0, ear);
    bowl.scale.set(0.35, 1.3, 0.9);
  }
  // headphones, worn round the neck between mixes
  const phones = new THREE.Group();
  phones.position.set(0, 0.035, -0.01);
  phones.rotation.x = 0.25;
  headPivot.add(phones);
  add(new THREE.TorusGeometry(0.085, 0.008, 6, 24, Math.PI * 1.15).rotateX(Math.PI / 2).rotateY(-Math.PI * 0.075 + Math.PI), black, 0, 0.01, 0, phones);
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 16).rotateZ(Math.PI / 2), black, s * 0.078, 0, 0.045, phones);

  // arms: shoulder -> elbow -> hand, sleeves rolled to the elbow
  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.172, 0.475, 0);
    upper.add(shoulder);
    add(new THREE.SphereGeometry(0.047, 14, 10), shirt, 0, -0.005, 0, shoulder);
    add(new THREE.CapsuleGeometry(0.043, 0.2, 5, 12), shirt, 0, -0.14, 0, shoulder);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);
    add(new THREE.SphereGeometry(0.04, 12, 8), skin, 0, 0, 0, elbow);
    add(new THREE.CapsuleGeometry(0.031, 0.19, 5, 12), skin, 0, -0.125, 0, elbow);
    const hand = new THREE.Group();
    hand.position.set(0, -0.26, 0);
    elbow.add(hand);
    const palm = add(new THREE.SphereGeometry(0.036, 12, 10), skin, 0, -0.03, 0, hand);
    palm.scale.set(0.9, 1.25, 0.5);
    for (let f = 0; f < 4; f++) add(new THREE.CapsuleGeometry(0.0075, 0.04, 3, 6), skin, (f - 1.5) * 0.016, -0.09, 0.004, hand);
    add(new THREE.CapsuleGeometry(0.008, 0.03, 3, 6).rotateZ(side * 0.9), skin, -side * 0.034, -0.045, 0.006, hand);
    return { shoulder, elbow, hand };
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // where he stands for each job: left decks, mixer, drum machine, right decks
  const stations = [-1.2, MIXER_Z, DRUM_Z, 1.3, MIXER_Z, -1.2, DRUM_Z, 1.3];
  const smooth = (x: number) => x * x * (3 - 2 * x);

  function update(t: number, beat: number) {
    const step = Math.floor(beat * 4) % 16;
    runner.position.z = stepZ(step < 0 ? step + 16 : step);
    const pulse = Math.pow(1 - (((beat % 1) + 1) % 1), 2);

    // move along the desk every four bars
    const phase = (((beat / 16) % stations.length) + stations.length) % stations.length;
    const i = Math.floor(phase);
    const f = phase - i;
    const from = stations[i];
    const to = stations[(i + 1) % stations.length];
    const k = f > 0.82 ? smooth((f - 0.82) / 0.18) : 0;
    const z = from + (to - from) * k;
    dj.position.z = z;
    const atDrum = Math.abs(z - DRUM_Z) < 0.1;
    const atMixer = Math.abs(z - MIXER_Z) < 0.1;

    // lean in over the desk, nod on the beat
    upper.rotation.x = 0.13 + pulse * 0.035;
    upper.rotation.y = Math.sin(t * 0.4) * 0.08 + (k > 0 ? Math.sign(to - from) * -0.25 * Math.sin(k * Math.PI) : 0);
    headPivot.rotation.x = 0.14 + pulse * 0.09;
    headPivot.rotation.y = Math.sin(t * 0.23) * 0.25;
    dj.position.y = 5.7 - pulse * 0.012;

    // hands: one rides a record or a fader, the other works knobs or taps the step keys
    const tap = atDrum ? Math.max(0, Math.sin(beat * Math.PI * 4)) * 0.16 : 0;
    const ride = Math.sin(t * 5) * 0.04;
    const spread = atMixer ? 0.1 : atDrum ? 0.18 : 0.38;
    armL.shoulder.rotation.set(-0.42 + ride * 0.5, 0, 0.1 + spread * 0.5);
    armL.elbow.rotation.set(-1.02 - ride, 0, -spread * 0.9);
    armR.shoulder.rotation.set(-0.45 - tap * 0.3, 0, -0.1 - spread * 0.5);
    armR.elbow.rotation.set(-0.98 + tap, 0, spread * 0.9);
    armL.hand.rotation.x = 0.35;
    armR.hand.rotation.x = 0.35 - tap;
  }
  update(0, 0);

  return { group, update };
}
