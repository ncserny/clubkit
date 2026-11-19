import * as THREE from 'three';

/**
 * The man on the door: a homage to Sven Marquardt, who has decided who gets into this building
 * for as long as it has been a club. Grey hair swept back, a grey beard, the left side of the
 * face tattooed, rings in the lip and the nose, all in black. It is a doll in his spirit, not a
 * likeness, and here he is kinder than his reputation: walk up, he looks you over, nods, and
 * waves you in.
 *
 * The figure is built facing +z, feet at the origin, and depends on nothing but three.js, so
 * the same file serves any model of the building. The caller places `group` and turns it, and
 * calls `update` every frame with where the visitor is in the figure's own frame.
 */

/** A canvas as a colour texture. */
function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A small repeatable random number generator, so that he looks the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * The head, unwrapped: the picture goes once round a sphere, and the face is centred a quarter
 * of the way along, which on three.js's sphere looks down +z. His left is to the right of that.
 */
function face() {
  return paint(1024, 512, (c, w, h) => {
    const rand = rng(7);
    const cx = w * 0.25;
    // the scalp: grey hair combed straight back, darker and shorter at the sides
    c.fillStyle = '#6f6e6a';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      c.strokeStyle = `rgba(${rand() < 0.5 ? '170,170,166' : '40,40,39'},${0.12 + rand() * 0.22})`;
      c.lineWidth = 1 + rand() * 1.6;
      const x = rand() * w;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + (rand() - 0.5) * 30, h * (0.3 + rand() * 0.25));
      c.stroke();
    }
    c.fillStyle = 'rgba(60,58,56,0.55)';
    c.fillRect(0, h * 0.5, w, h * 0.5);
    // the back of the neck
    c.fillStyle = '#8f6c57';
    c.fillRect(0, h * 0.78, w, h * 0.22);

    // the face
    const skin = c.createRadialGradient(cx, h * 0.46, 20, cx, h * 0.5, 190);
    skin.addColorStop(0, '#b08a72');
    skin.addColorStop(1, '#8f6c57');
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(cx, h * 0.52, 132, 178, 0, 0, Math.PI * 2);
    c.fill();
    // forehead lines
    c.strokeStyle = 'rgba(90,60,45,0.35)';
    c.lineWidth = 2;
    for (const y of [0.3, 0.335]) {
      c.beginPath();
      c.moveTo(cx - 70, h * y);
      c.quadraticCurveTo(cx, h * (y - 0.012), cx + 70, h * y);
      c.stroke();
    }

    // the tattoo down the left of the face: thorned stems from the temple across the cheek and into the neck
    c.strokeStyle = 'rgba(28,38,48,0.92)';
    c.lineCap = 'round';
    const stem = (pts: [number, number][], width: number) => {
      c.lineWidth = width;
      c.beginPath();
      c.moveTo(cx + pts[0][0], h * pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(cx + pts[i][0], h * pts[i][1]);
      c.stroke();
      // thorns, to either side in turn
      c.lineWidth = width * 0.6;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        for (let k = 0.2; k < 1; k += 0.3) {
          const x = cx + ax + (bx - ax) * k;
          const y = h * (ay + (by - ay) * k);
          const side = (Math.round(k * 10) + i) % 2 ? 1 : -1;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + side * 13, y - 9);
          c.stroke();
        }
      }
    };
    stem([[78, 0.26], [104, 0.34], [112, 0.44], [100, 0.54], [112, 0.64], [98, 0.76], [110, 0.9]], 9);
    stem([[52, 0.3], [84, 0.38], [92, 0.47]], 7);
    stem([[118, 0.3], [140, 0.4], [136, 0.52], [150, 0.62]], 7);
    // and a little on the right temple
    stem([[-104, 0.3], [-118, 0.38], [-112, 0.46]], 4);

    // brows, heavy and level; eyes that give nothing away
    for (const s of [-1, 1]) {
      c.fillStyle = '#4a4744';
      c.beginPath();
      c.ellipse(cx + s * 50, h * 0.395, 34, 9, s * -0.08, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(70,45,35,0.45)';
      c.beginPath();
      c.ellipse(cx + s * 50, h * 0.445, 30, 15, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#b9b2a8';
      c.beginPath();
      c.ellipse(cx + s * 50, h * 0.45, 18, 4.5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1c2226';
      c.beginPath();
      c.arc(cx + s * 50, h * 0.45, 5, 0, Math.PI * 2);
      c.fill();
      // a heavy lid over each
      c.fillStyle = '#7d5c4a';
      c.fillRect(cx + s * 50 - 22, h * 0.45 - 12, 44, 9);
    }
    // the nose
    c.strokeStyle = 'rgba(95,62,46,0.55)';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx - 9, h * 0.44);
    c.lineTo(cx - 15, h * 0.55);
    c.quadraticCurveTo(cx, h * 0.585, cx + 15, h * 0.55);
    c.stroke();

    // the beard: full, grey going white, from the cheekbones down over the chin
    c.fillStyle = '#8b8a85';
    c.beginPath();
    c.moveTo(cx - 128, h * 0.5);
    c.quadraticCurveTo(cx - 70, h * 0.56, cx - 36, h * 0.585);
    c.quadraticCurveTo(cx, h * 0.565, cx + 36, h * 0.585);
    c.quadraticCurveTo(cx + 70, h * 0.56, cx + 128, h * 0.5);
    c.quadraticCurveTo(cx + 150, h * 0.8, cx + 60, h * 0.97);
    c.lineTo(cx - 60, h * 0.97);
    c.quadraticCurveTo(cx - 150, h * 0.8, cx - 128, h * 0.5);
    c.fill();
    for (let i = 0; i < 1400; i++) {
      const x = cx + (rand() - 0.5) * 270;
      const y = h * (0.54 + rand() * 0.42);
      c.strokeStyle = `rgba(${rand() < 0.55 ? '200,200,196' : '70,70,68'},${0.25 + rand() * 0.4})`;
      c.lineWidth = 1 + rand() * 1.4;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (x - cx) * 0.06 + (rand() - 0.5) * 6, y + 10 + rand() * 16);
      c.stroke();
    }
    // the mouth, set straight, under the moustache; a ring at each corner of the lower lip and one through the nose
    c.strokeStyle = '#5a3b33';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(cx - 32, h * 0.64);
    c.lineTo(cx + 32, h * 0.64);
    c.stroke();
    c.strokeStyle = '#e4e6e8';
    c.lineWidth = 3.5;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(cx + s * 22, h * 0.662, 8, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath();
    c.arc(cx, h * 0.588, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  });
}

/** The visitor, as the figure sees them: metres to its left (`x`) and in front of it (`z`), and whether they are still outside. */
export interface Visitor {
  x: number;
  z: number;
  outside: boolean;
}

export function buildDoorman() {
  const group = new THREE.Group();
  group.name = 'doorman';
  const body = new THREE.Group();
  group.add(body);

  const black = new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.72 });
  const silver = new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.3, metalness: 0.9 });
  const inked = new THREE.MeshStandardMaterial({ color: '#5f5048', roughness: 0.8 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // boots, legs, a long coat over a broad chest
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.12, 0.1, 0.3), leather, s * 0.11, 0.05, 0.04);
    add(new THREE.CylinderGeometry(0.09, 0.078, 0.9, 12), black, s * 0.11, 0.53, 0);
  }
  add(new THREE.CylinderGeometry(0.215, 0.27, 0.6, 16, 1, true), leather, 0, 0.72, 0).scale.z = 0.72;
  add(new THREE.CylinderGeometry(0.21, 0.2, 0.58, 16), leather, 0, 1.25, 0).scale.z = 0.66;
  for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.078, 12, 10), leather, s * 0.228, 1.475, 0);
  add(new THREE.BoxGeometry(0.42, 0.045, 0.3), leather, 0, 1.0, 0);
  add(new THREE.BoxGeometry(0.07, 0.05, 0.02), silver, 0, 1.0, 0.152);
  // a chain at the neck
  add(new THREE.TorusGeometry(0.085, 0.006, 6, 20).rotateX(Math.PI / 2.4), silver, 0, 1.47, 0.045);

  // arms: shoulder, elbow, a tattooed hand with rings
  const arm = (s: 1 | -1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.25, 1.47, 0);
    body.add(shoulder);
    add(new THREE.CylinderGeometry(0.062, 0.054, 0.3, 10), leather, 0, -0.15, 0, shoulder);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.3, 0);
    shoulder.add(elbow);
    add(new THREE.CylinderGeometry(0.052, 0.044, 0.27, 10), leather, 0, -0.135, 0, elbow);
    add(new THREE.SphereGeometry(0.05, 10, 8), inked, 0, -0.3, 0, elbow).scale.set(0.9, 1.15, 0.7);
    add(new THREE.TorusGeometry(0.02, 0.005, 5, 10).rotateX(Math.PI / 2), silver, 0, -0.325, 0.012, elbow);
    return { shoulder, elbow };
  };
  const left = arm(1);
  const right = arm(-1);

  // the neck, tattooed, and the head on a pivot so that it can turn and nod
  add(new THREE.CylinderGeometry(0.058, 0.066, 0.1, 12), new THREE.MeshStandardMaterial({ color: '#5d5a58', roughness: 0.8 }), 0, 1.555, 0);
  const neck = new THREE.Group();
  neck.position.set(0, 1.6, 0);
  body.add(neck);
  const skull = add(new THREE.SphereGeometry(0.112, 40, 28), new THREE.MeshStandardMaterial({ map: face(), roughness: 0.75 }), 0, 0.115, 0, neck);
  skull.scale.set(0.93, 1.16, 1.04);
  // the beard stands off the chin
  const beard = add(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: '#77766f', roughness: 1 }), 0, 0.03, 0.045, neck);
  beard.scale.set(1.05, 1.2, 0.75);
  // a nose to catch the light, the rings in the lip and the nose, a ring in each ear
  add(new THREE.ConeGeometry(0.018, 0.05, 6).rotateX(Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: '#a07c66', roughness: 0.75 }), 0, 0.11, 0.118, neck);
  for (const s of [-1, 1]) {
    add(new THREE.TorusGeometry(0.009, 0.0022, 5, 12).rotateY(Math.PI / 2), silver, s * 0.024, 0.062, 0.108, neck).castShadow = false;
    add(new THREE.TorusGeometry(0.014, 0.003, 5, 12).rotateY(Math.PI / 2), silver, s * 0.104, 0.085, 0.0, neck).castShadow = false;
  }
  add(new THREE.TorusGeometry(0.01, 0.0024, 5, 12), silver, 0, 0.086, 0.124, neck).castShadow = false;

  /** Where the door is from where he stands, as an angle to his left: the caller may set it. */
  let doorTurn = 0.5;
  let looked = 0;
  let wave = 0;
  const ease = (x: number) => x * x * (3 - 2 * x);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  /**
   * Called every frame. He watches the queue until somebody comes within a few metres; then he
   * turns his head to them, holds the look for a moment, nods twice and holds an arm out to the
   * door for as long as they stand there. Returns true while he is letting them in.
   */
  function update(dt: number, t: number, visitor: Visitor | null) {
    const near = !!visitor && visitor.outside && Math.hypot(visitor.x, visitor.z) < 8 && visitor.z > -1.2;
    looked = near ? looked + dt : Math.max(0, looked - dt * 2.5);
    const admitted = looked > 1.3;
    wave += ((admitted ? 1 : 0) - wave) * Math.min(1, dt * 4);
    const k = ease(clamp(wave, 0, 1));

    // the head: on the visitor, or slowly along the queue
    const want = near && visitor ? clamp(Math.atan2(visitor.x, visitor.z), -1.15, 1.15) : 0.3 * Math.sin(t * 0.27) - 0.1;
    neck.rotation.y += (want - k * doorTurn * 0.6 - neck.rotation.y) * Math.min(1, dt * 5);
    const nod = admitted && looked < 2.1 ? 0.24 * Math.abs(Math.sin((looked - 1.3) * Math.PI * 2.5)) : 0;
    neck.rotation.x = 0.04 + nod;

    // the body: square to the queue, weight shifting from foot to foot, turning toward the door as he waves
    body.rotation.y = 0.03 * Math.sin(t * 0.5) + k * doorTurn * 0.6;
    body.position.x = 0.012 * Math.sin(t * 0.37);

    // the arms: hands held together in front, until the left one opens toward the door
    right.shoulder.rotation.set(-0.3, 0, 0.16);
    right.elbow.rotation.set(-1.0, 0, 0.62);
    left.shoulder.rotation.set(-0.3 + 0.55 * k, 0, -0.16 + 1.25 * k);
    left.elbow.rotation.set(-1.0 + 0.8 * k, 0, -0.62 + 0.62 * k);
    return admitted;
  }
  update(0, 0, null);

  return {
    group,
    update,
    /** Tell him where the door is: the angle to his left, in radians, from the way he faces. */
    faceDoor(angle: number) {
      doorTurn = angle;
    },
  };
}
