import * as THREE from 'three';
import { canvasTexture, rng } from './util';

/**
 * Every surface is painted on a canvas at start-up: no photographs, no model
 * files. The building is 1950s East Berlin industrial: grey rendered concrete
 * gone dark and streaky with seventy winters, rows of steel-framed windows,
 * flat roofs. The ground around it is gravel, cracked asphalt and weeds.
 */

type Ctx = CanvasRenderingContext2D;

function blotches(ctx: Ctx, w: number, h: number, rand: () => number, count: number, sizes: [number, number], colour: (a: number) => string) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = sizes[0] + rand() * (sizes[1] - sizes[0]);
    const a = rand();
    for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, colour(a));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
}

function speckle(ctx: Ctx, w: number, h: number, rand: () => number, count: number, colour: (a: number) => string, size = 1.4) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colour(rand());
    const s = size * (0.4 + rand());
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
}

/** Streaks running down from window sills and roof edges: the look of old Berlin render. */
function runs(ctx: Ctx, w: number, h: number, rand: () => number, count: number, dark: number) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.6;
    const len = h * (0.15 + rand() * 0.6);
    const wide = 2 + rand() * 14;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, `rgba(25,24,22,${dark * (0.4 + rand() * 0.6)})`);
    g.addColorStop(1, 'rgba(25,24,22,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, wide, len);
  }
}

/** Weathered rendered concrete, the main facade surface. One tile is roughly 8 x 8 m. */
export function facadeConcrete(seed = 11, base = '#77736c') {
  const rand = rng(seed);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, rand, 90, [80, 320], (a) => (a > 0.5 ? `rgba(40,38,34,${0.05 + a * 0.08})` : `rgba(180,174,164,${0.04 + a * 0.07})`));
    blotches(ctx, w, h, rand, 400, [6, 40], (a) => (a > 0.5 ? `rgba(30,30,28,${a * 0.08})` : `rgba(200,194,182,${a * 0.06})`));
    runs(ctx, w, h, rand, 160, 0.16);
    speckle(ctx, w, h, rand, 22000, (a) => (a > 0.5 ? `rgba(20,20,18,${0.12 + a * 0.18})` : `rgba(210,204,194,${0.08 + a * 0.12})`));
    // Shuttering lines from the formwork, every 64 px (= 0.5 m)
    ctx.strokeStyle = 'rgba(30,28,26,0.12)';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y + rand() * 2);
      ctx.lineTo(w, y + rand() * 2);
      ctx.stroke();
    }
  }, { repeat: [1, 1] });
}

/** Board-marked raw concrete for the interior walls and columns. */
export function rawConcrete(seed = 5) {
  const rand = rng(seed);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#5d5a55';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 48) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,250,240' : '0,0,0'},${0.02 + rand() * 0.05})`;
      ctx.fillRect(0, y, w, 48);
      ctx.fillStyle = 'rgba(20,20,18,0.25)';
      ctx.fillRect(0, y, w, 2);
    }
    blotches(ctx, w, h, rand, 120, [20, 200], (a) => (a > 0.5 ? `rgba(20,20,18,${a * 0.12})` : `rgba(200,195,186,${a * 0.06})`));
    speckle(ctx, w, h, rand, 30000, (a) => (a > 0.6 ? `rgba(15,15,14,${0.2 + a * 0.3})` : `rgba(180,175,166,${0.08 + a * 0.12})`), 1.8);
    runs(ctx, w, h, rand, 60, 0.12);
  });
}

/** Clinker brick in English bond, darkened with soot. Used on the Kantine and old outbuildings. */
export function brick(seed = 3) {
  const rand = rng(seed);
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4a4440';
    ctx.fillRect(0, 0, w, h);
    const bh = 16;
    const bw = 48;
    for (let row = 0; row < h / bh; row++) {
      const header = row % 2 === 1;
      const unit = header ? bw / 2 : bw;
      const off = header ? unit / 2 : 0;
      for (let x = -off; x < w; x += unit) {
        const r = 105 + rand() * 50;
        const g = 58 + rand() * 25;
        const b = 44 + rand() * 18;
        const d = 0.55 + rand() * 0.35;
        ctx.fillStyle = `rgb(${r * d},${g * d},${b * d})`;
        ctx.fillRect(x + 1.5, row * bh + 1.5, unit - 3, bh - 3);
      }
    }
    runs(ctx, w, h, rand, 50, 0.25);
    speckle(ctx, w, h, rand, 6000, (a) => `rgba(0,0,0,${a * 0.25})`);
  });
}

export function gravel(seed = 9) {
  const rand = rng(seed);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#5b5852';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60000; i++) {
      const v = 60 + rand() * 120;
      ctx.fillStyle = `rgb(${v},${v * 0.97},${v * 0.92})`;
      const s = 1 + rand() * 4;
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, s, s * (0.5 + rand() * 0.5), rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    blotches(ctx, w, h, rand, 40, [40, 200], (a) => `rgba(20,18,16,${a * 0.15})`);
    // puddle-dark tyre tracks
    blotches(ctx, w, h, rand, 30, [30, 90], (a) => `rgba(10,10,10,${a * 0.12})`);
  }, { repeat: [1, 1] });
}

export function asphalt(seed = 4) {
  const rand = rng(seed);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#2d2c2b';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rand, 50000, (a) => (a > 0.5 ? `rgba(90,88,85,${a * 0.5})` : `rgba(0,0,0,${a * 0.5})`), 1.6);
    blotches(ctx, w, h, rand, 60, [30, 220], (a) => (a > 0.5 ? `rgba(0,0,0,${a * 0.14})` : `rgba(80,78,74,${a * 0.08})`));
    // cracks
    ctx.strokeStyle = 'rgba(8,8,8,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      let x = rand() * w;
      let y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 14; k++) {
        x += (rand() - 0.5) * 40;
        y += (rand() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

/** Rough grass and weeds for the wasteland around the club. */
export function scrub(seed = 8) {
  const rand = rng(seed);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#3d4230';
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, rand, 120, [30, 200], (a) => (a > 0.6 ? `rgba(90,80,55,${a * 0.25})` : `rgba(30,45,22,${a * 0.25})`));
    for (let i = 0; i < 40000; i++) {
      const g = 50 + rand() * 60;
      ctx.strokeStyle = `rgba(${g * 0.8},${g},${g * 0.55},${0.3 + rand() * 0.4})`;
      const x = rand() * w;
      const y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 6, y - 3 - rand() * 8);
      ctx.stroke();
    }
  });
}

/**
 * The window grid. Each texture is one window: steel frame, mullions and
 * small panes. Glass is dark and slightly reflective; at night a few panes
 * catch light from inside.
 */
export function windowPanes(cols: number, rows: number, opts: { lit?: number; seed?: number; tint?: string } = {}) {
  const rand = rng(opts.seed ?? 2);
  return canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#1a1c1d';
    ctx.fillRect(0, 0, w, h);
    const pw = w / cols;
    const ph = h / rows;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const lit = rand() < (opts.lit ?? 0);
        const v = 18 + rand() * 22;
        ctx.fillStyle = lit ? opts.tint ?? '#c0402a' : `rgb(${v},${v + 3},${v + 6})`;
        ctx.fillRect(c * pw + 3, r * ph + 3, pw - 6, ph - 6);
        if (!lit && rand() < 0.12) {
          // a broken or painted-over pane
          ctx.fillStyle = 'rgba(80,78,72,0.8)';
          ctx.fillRect(c * pw + 3, r * ph + 3, pw - 6, ph - 6);
        }
      }
    }
    ctx.strokeStyle = '#2b2a28';
    ctx.lineWidth = 6;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * pw, 0);
      ctx.lineTo(c * pw, h);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * ph);
      ctx.lineTo(w, r * ph);
      ctx.stroke();
    }
  });
}

/** Black rubber-and-steel dancefloor, scuffed from twenty years of boots. */
export function dancefloor(seed = 6) {
  const rand = rng(seed);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#26241f';
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, rand, 200, [20, 160], (a) => (a > 0.5 ? `rgba(0,0,0,${a * 0.2})` : `rgba(120,115,104,${a * 0.08})`));
    speckle(ctx, w, h, rand, 30000, (a) => `rgba(${a > 0.5 ? '160,155,140' : '0,0,0'},${a * 0.3})`, 1.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
    }
  });
}

/** Chequer-plate steel for the stairs and catwalks. */
export function checkerPlate() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3b3c3d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#56585a';
    for (let y = 0; y < h; y += 32) {
      for (let x = 0; x < w; x += 32) {
        ctx.save();
        ctx.translate(x + 8, y + 8);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-7, -2, 14, 4);
        ctx.restore();
        ctx.save();
        ctx.translate(x + 24, y + 24);
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(-7, -2, 14, 4);
        ctx.restore();
      }
    }
  });
}

/** Tag-covered panel for the queue barriers and the lower walls. */
export function grime(seed = 12) {
  const rand = rng(seed);
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#62605b';
    ctx.fillRect(0, 0, w, h);
    blotches(ctx, w, h, rand, 60, [20, 140], (a) => `rgba(20,20,18,${a * 0.2})`);
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = ['rgba(20,20,20,0.7)', 'rgba(200,200,200,0.5)', 'rgba(150,40,40,0.5)', 'rgba(40,60,120,0.5)'][Math.floor(rand() * 4)];
      ctx.lineWidth = 2 + rand() * 6;
      let x = rand() * w;
      let y = h * 0.4 + rand() * h * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (rand() - 0.3) * 30;
        y += (rand() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
}

export function standard(map: THREE.Texture | null, opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ map: map ?? undefined, roughness: 0.92, metalness: 0, ...opts });
}

export function tiled(texture: THREE.Texture, rx: number, ry: number) {
  const t = texture.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

/**
 * The inside of the power station as photographed: pale, board-marked
 * concrete gone grey-brown, dark rain-like streaks running down from every
 * beam and bracket, patches where render has come away.
 */
export function weatheredConcrete(seed = 31) {
  const rand = rng(seed);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#a49e94';
    ctx.fillRect(0, 0, w, h);
    // board marks: horizontal shuttering boards, 0.25 m each (64 px on a 4 m tile)
    for (let y = 0; y < h; y += 64) {
      ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,250,240' : '40,36,30'},${0.03 + rand() * 0.06})`;
      ctx.fillRect(0, y, w, 64);
      ctx.fillStyle = 'rgba(40,36,30,0.25)';
      ctx.fillRect(0, y, w, 2);
      for (let x = rand() * 200; x < w; x += 150 + rand() * 250) {
        ctx.fillStyle = 'rgba(40,36,30,0.18)';
        ctx.fillRect(x, y, 2, 64);
      }
    }
    blotches(ctx, w, h, rand, 160, [20, 220], (a) => (a > 0.55 ? `rgba(60,52,44,${a * 0.14})` : `rgba(230,224,212,${a * 0.08})`));
    // streaks
    for (let i = 0; i < 220; i++) {
      const x = rand() * w;
      const y = rand() * h * 0.7;
      const len = 80 + rand() * 600;
      const wide = 1 + rand() * 18;
      const g = ctx.createLinearGradient(0, y, 0, y + len);
      const dark = 0.12 + rand() * 0.3;
      g.addColorStop(0, `rgba(38,32,26,${dark})`);
      g.addColorStop(1, 'rgba(38,32,26,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, wide, len);
    }
    // spalled patches with rust stains
    for (let i = 0; i < 10; i++) {
      const x = rand() * w;
      const y = rand() * h;
      ctx.fillStyle = 'rgba(70,62,54,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y, 10 + rand() * 40, 6 + rand() * 25, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(0, y, 0, y + 120);
      g.addColorStop(0, 'rgba(120,60,25,0.3)');
      g.addColorStop(1, 'rgba(120,60,25,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 3, y, 6, 120);
    }
    speckle(ctx, w, h, rand, 40000, (a) => (a > 0.55 ? `rgba(30,28,24,${0.12 + a * 0.2})` : `rgba(235,230,220,${0.06 + a * 0.12})`), 1.6);
  });
}

/**
 * Give a painted surface depth. The texture's light and dark are read as
 * height (pale board, dark joint) and turned into a normal map, so shuttering
 * lines, cracks, gravel and chequer plate catch the light instead of lying flat.
 * The roughness follows the same picture: dark, grimy patches are a little
 * shinier than dry concrete.
 */
export function relief(material: THREE.MeshStandardMaterial, strength = 1, size = 512) {
  const map = material.map;
  const source = map?.image as HTMLCanvasElement | undefined;
  if (!map || !source || typeof source.getContext !== 'function') return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, size, size);
  const src = ctx.getImageData(0, 0, size, size);
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = (src.data[i * 4] * 0.3 + src.data[i * 4 + 1] * 0.59 + src.data[i * 4 + 2] * 0.11) / 255;
  // One softening pass so narrow joints (floorboards, blockwork) do not sparkle into black under many spotlights.
  const hi = new Float32Array(h.length);
  const at0 = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += at0(x + dx, y + dy);
      hi[y * size + x] = s / 9;
    }
  }
  h.set(hi);
  const out = ctx.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength * 2.2;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength * 2.2;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      out.data[o] = (-dx * inv * 0.5 + 0.5) * 255;
      out.data[o + 1] = (dy * inv * 0.5 + 0.5) * 255;
      out.data[o + 2] = (inv * 0.5 + 0.5) * 255;
      out.data[o + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const normal = new THREE.CanvasTexture(canvas);
  normal.colorSpace = THREE.NoColorSpace;
  normal.wrapS = map.wrapS;
  normal.wrapT = map.wrapT;
  normal.repeat.copy(map.repeat);
  normal.offset.copy(map.offset);
  normal.anisotropy = map.anisotropy;
  material.normalMap = normal;
  material.normalScale = new THREE.Vector2(1, 1);
  material.needsUpdate = true;
}
