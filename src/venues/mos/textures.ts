import * as THREE from 'three';
import { relief } from '../../engine/materials';
import type { Quality } from '../../engine/quality';
import { canvasTexture, rng } from '../../engine/util';

/**
 * Every surface of the Ministry of Sound model is painted on a canvas at start-up, as the
 * Berghain model's are. The paintings here are pale and nearly neutral, and the colour of a
 * surface comes from its material: one painting of blockwork serves the black walls of The
 * Box and the pale ones of the entrance tunnel, and the graphics card holds it once.
 *
 * UVs are in metres everywhere, so each painting says how many metres one tile of it covers.
 */

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;

const grey = (v: number, a = 1) => `rgba(${v},${v},${v},${a})`;

function speckle(c: Ctx, w: number, h: number, rand: Rand, count: number, strength: number, size = 1.5) {
  for (let i = 0; i < count; i++) {
    const a = rand();
    c.fillStyle = a > 0.5 ? grey(0, (a - 0.5) * strength) : grey(255, (0.5 - a) * strength);
    const s = size * (0.4 + rand());
    c.fillRect(rand() * w, rand() * h, s, s);
  }
}

/** Soft patches that wrap round the edges of the tile. */
function blotches(c: Ctx, w: number, h: number, rand: Rand, count: number, sizes: [number, number], strength: number) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = sizes[0] + rand() * (sizes[1] - sizes[0]);
    const a = rand();
    const colour = a > 0.5 ? grey(0, (a - 0.5) * strength) : grey(255, (0.5 - a) * strength);
    for (const [ox, oy] of [
      [0, 0],
      [w, 0],
      [-w, 0],
      [0, h],
      [0, -h],
    ]) {
      const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, colour);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
}

interface Painting {
  size: [number, number];
  /** Metres covered by one tile, across and up. */
  tile: [number, number];
  paint(c: Ctx, w: number, h: number, rand: Rand): void;
}

const PAINTINGS = {
  /** Concrete paving slabs, 600 mm square, laid broken-bond. */
  paving: {
    size: [512, 512],
    tile: [2.4, 2.4],
    paint(c, w, h, rand) {
      c.fillStyle = '#b9b9b9';
      c.fillRect(0, 0, w, h);
      const s = w / 4;
      for (let r = 0; r < 4; r++) {
        for (let k = -1; k < 4; k++) {
          const x = k * s + (r % 2 ? s / 2 : 0);
          c.fillStyle = grey(196 + rand() * 44);
          c.fillRect(x + 2, r * s + 2, s - 4, s - 4);
        }
      }
      blotches(c, w, h, rand, 30, [20, 120], 0.22);
      speckle(c, w, h, rand, 9000, 0.35);
    },
  },
  /** Poured concrete: floors, the bar fronts, the soffits. */
  concrete: {
    size: [512, 512],
    tile: [3, 3],
    paint(c, w, h, rand) {
      c.fillStyle = '#d2d2d2';
      c.fillRect(0, 0, w, h);
      blotches(c, w, h, rand, 70, [20, 170], 0.3);
      blotches(c, w, h, rand, 160, [4, 26], 0.22);
      speckle(c, w, h, rand, 12000, 0.4);
      // a few hairline cracks
      c.strokeStyle = grey(40, 0.35);
      c.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        let x = rand() * w;
        let y = rand() * h;
        c.beginPath();
        c.moveTo(x, y);
        for (let k = 0; k < 10; k++) {
          x += (rand() - 0.5) * 50;
          y += (rand() - 0.5) * 50;
          c.lineTo(x, y);
        }
        c.stroke();
      }
    },
  },
  /** Painted concrete blockwork: 450 by 225 mm blocks, the joints showing through the paint. */
  block: {
    size: [512, 512],
    tile: [1.8, 1.8],
    paint(c, w, h, rand) {
      c.fillStyle = '#b4b4b4';
      c.fillRect(0, 0, w, h);
      const bh = h / 8;
      const bw = w / 4;
      for (let r = 0; r < 8; r++) {
        for (let k = -1; k < 4; k++) {
          const x = k * bw + (r % 2 ? bw / 2 : 0);
          c.fillStyle = grey(214 + rand() * 30);
          c.fillRect(x + 1.5, r * bh + 1.5, bw - 3, bh - 3);
        }
      }
      blotches(c, w, h, rand, 40, [20, 140], 0.16);
      speckle(c, w, h, rand, 9000, 0.3);
    },
  },
  /** Stock brick, stretcher bond: 225 by 75 mm with the joint. Uneven, as the arches are. */
  brick: {
    size: [512, 512],
    tile: [1.8, 1.2],
    paint(c, w, h, rand) {
      c.fillStyle = '#a9a49c';
      c.fillRect(0, 0, w, h);
      const bh = h / 16;
      const bw = w / 8;
      for (let r = 0; r < 16; r++) {
        for (let k = -1; k < 8; k++) {
          const x = k * bw + (r % 2 ? bw / 2 : 0);
          const burnt = rand() < 0.12;
          const v = burnt ? 120 + rand() * 40 : 190 + rand() * 60;
          const warm = (rand() - 0.5) * 26;
          c.fillStyle = `rgb(${Math.min(255, v + warm)},${v},${Math.max(0, v - warm)})`;
          c.fillRect(x + 1.5, r * bh + 1.5, bw - 3, bh - 3);
        }
      }
      blotches(c, w, h, rand, 30, [30, 160], 0.2);
      speckle(c, w, h, rand, 8000, 0.35);
    },
  },
  /** Timber strips 100 mm wide, laid along the u axis, with butt joints here and there. */
  boards: {
    size: [512, 512],
    tile: [2.4, 2.4],
    paint(c, w, h, rand) {
      const n = 24;
      const s = h / n;
      for (let i = 0; i < n; i++) {
        c.fillStyle = grey(176 + rand() * 70);
        c.fillRect(0, i * s, w, s);
        // grain
        c.strokeStyle = grey(60, 0.12);
        c.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          const y = i * s + 3 + rand() * (s - 6);
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(w, y + (rand() - 0.5) * 3);
          c.stroke();
        }
        c.fillStyle = grey(20, 0.55);
        c.fillRect(0, i * s, w, 1.5);
        for (let x = rand() * w; x < w; x += w * (0.35 + rand() * 0.5)) c.fillRect(x, i * s, 1.5, s);
      }
      speckle(c, w, h, rand, 5000, 0.25);
    },
  },
  /** Ribbed sheet: profiled cladding, the slats of a roller shutter, the lining of a vault. Ribs run along u. */
  ribbed: {
    size: [128, 256],
    tile: [1, 1],
    paint(c, w, h, rand) {
      const n = 8;
      const s = h / n;
      for (let i = 0; i < n; i++) {
        const g = c.createLinearGradient(0, i * s, 0, (i + 1) * s);
        g.addColorStop(0, grey(120));
        g.addColorStop(0.25, grey(245));
        g.addColorStop(0.8, grey(190));
        g.addColorStop(1, grey(90));
        c.fillStyle = g;
        c.fillRect(0, i * s, w, s);
      }
      speckle(c, w, h, rand, 1500, 0.2);
    },
  },
  /** A clipped hedge. */
  hedge: {
    size: [256, 256],
    tile: [1.4, 1.4],
    paint(c, w, h, rand) {
      c.fillStyle = '#8f9a82';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        const v = 90 + rand() * 150;
        c.fillStyle = `rgba(${v * 0.82},${v},${v * 0.62},0.85)`;
        c.beginPath();
        c.ellipse(rand() * w, rand() * h, 1.5 + rand() * 3.5, 1 + rand() * 2, rand() * Math.PI, 0, Math.PI * 2);
        c.fill();
      }
      blotches(c, w, h, rand, 30, [10, 50], 0.5);
    },
  },
  /** Channel-stitched velvet: upright channels 150 mm wide. */
  velvet: {
    size: [256, 64],
    tile: [0.6, 0.6],
    paint(c, w, h, rand) {
      const n = 4;
      const s = w / n;
      for (let i = 0; i < n; i++) {
        const g = c.createLinearGradient(i * s, 0, (i + 1) * s, 0);
        g.addColorStop(0, grey(70));
        g.addColorStop(0.3, grey(235));
        g.addColorStop(0.7, grey(200));
        g.addColorStop(1, grey(60));
        c.fillStyle = g;
        c.fillRect(i * s, 0, s, h);
      }
      speckle(c, w, h, rand, 1200, 0.25);
    },
  },
  /** The front of a loudspeaker cabinet behind its grille. One tile is one cabinet. */
  speaker: {
    size: [256, 256],
    tile: [0.7, 0.7],
    paint(c, w, h) {
      c.fillStyle = '#5c5c5c';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#9a9a9a';
      c.fillRect(8, 8, w - 16, h - 16);
      // perforated grille
      c.fillStyle = grey(30, 0.75);
      for (let y = 14; y < h - 12; y += 6) for (let x = 14 + ((y / 6) % 2) * 3; x < w - 12; x += 6) c.fillRect(x, y, 2.4, 2.4);
      // the cone and the horn behind it
      for (const [x, y, r] of [
        [w * 0.5, h * 0.62, w * 0.3],
        [w * 0.5, h * 0.2, w * 0.1],
      ]) {
        const g = c.createRadialGradient(x, y, r * 0.15, x, y, r);
        g.addColorStop(0, grey(0, 0.5));
        g.addColorStop(0.8, grey(0, 0.18));
        g.addColorStop(1, grey(0, 0));
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      c.strokeStyle = grey(20, 0.9);
      c.lineWidth = 6;
      c.strokeRect(3, 3, w - 6, h - 6);
    },
  },
  /** A wall pasted with flyers and posters, edge to edge. */
  posters: {
    size: [1024, 512],
    tile: [4, 2],
    paint(c, w, h, rand) {
      c.fillStyle = '#16161a';
      c.fillRect(0, 0, w, h);
      const inks = ['#e8e2d0', '#d92b2b', '#f2c417', '#1b4fa8', '#111111', '#e8e2d0', '#f07d1a', '#7a2a8c', '#e8e2d0', '#2aa39a'];
      for (let i = 0; i < 150; i++) {
        const pw = 60 + rand() * 90;
        const ph = pw * (1.25 + rand() * 0.25);
        const x = rand() * w;
        const y = rand() * h;
        c.save();
        c.translate(x, y);
        c.rotate((rand() - 0.5) * 0.14);
        const paper = inks[Math.floor(rand() * inks.length)];
        let ink = inks[Math.floor(rand() * inks.length)];
        if (ink === paper) ink = paper === '#111111' ? '#e8e2d0' : '#111111';
        for (const [ox, oy] of [
          [0, 0],
          [-w, 0],
          [0, -h],
        ]) {
          c.fillStyle = paper;
          c.fillRect(ox, oy, pw, ph);
          c.fillStyle = ink;
          // a headline, a disc or a block, and lines of small print
          c.fillRect(ox + pw * 0.1, oy + ph * 0.08, pw * (0.5 + (i % 3) * 0.15), ph * 0.1);
          if (i % 3 === 0) {
            c.beginPath();
            c.arc(ox + pw / 2, oy + ph * 0.48, pw * 0.26, 0, Math.PI * 2);
            c.fill();
          } else c.fillRect(ox + pw * 0.1, oy + ph * 0.26, pw * 0.8, ph * (0.2 + (i % 4) * 0.06));
          for (let k = 0; k < 4; k++) c.fillRect(ox + pw * 0.1, oy + ph * (0.74 + k * 0.055), pw * (0.4 + ((i + k) % 4) * 0.12), ph * 0.022);
          c.strokeStyle = 'rgba(0,0,0,0.5)';
          c.lineWidth = 1;
          c.strokeRect(ox, oy, pw, ph);
        }
        c.restore();
      }
      speckle(c, w, h, rand, 6000, 0.3);
    },
  },
  /** What an LED wall shows: bands of light, seen through the grid of its pixels. Tinted and moved by the material. */
  led: {
    size: [256, 128],
    tile: [1, 1],
    paint(c, w, h, rand) {
      c.fillStyle = '#101010';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = rand() * w;
        const bw = 6 + rand() * 46;
        const v = 110 + rand() * 145;
        for (const ox of [0, -w, w]) {
          const g = c.createLinearGradient(x + ox, 0, x + ox + bw, 0);
          g.addColorStop(0, grey(v, 0));
          g.addColorStop(0.5, grey(v, 0.9));
          g.addColorStop(1, grey(v, 0));
          c.fillStyle = g;
          c.fillRect(x + ox, 0, bw, h);
        }
      }
      c.fillStyle = grey(0, 0.5);
      for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
    },
  },
  /** Lancaster House next door: brown brick with bands of windows. Four storeys by four bays. */
  lancaster: {
    size: [512, 512],
    tile: [14.4, 12.8],
    paint(c, w, h, rand) {
      c.fillStyle = '#9f7a5b';
      c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        for (let x = (y / 4) % 2 ? 0 : 6; x < w; x += 12) {
          c.fillStyle = `rgba(${rand() > 0.5 ? '60,40,26' : '225,190,150'},${0.06 + rand() * 0.12})`;
          c.fillRect(x, y, 11, 3);
        }
      }
      const sh = h / 4;
      const bw = w / 4;
      for (let s = 0; s < 4; s++) {
        for (let b = 0; b < 4; b++) {
          c.fillStyle = '#d8d2c6';
          c.fillRect(b * bw + 14, s * sh + 26, bw - 28, sh * 0.52);
          c.fillStyle = '#1c2228';
          c.fillRect(b * bw + 18, s * sh + 30, bw - 36, sh * 0.52 - 8);
          c.fillStyle = '#d8d2c6';
          c.fillRect(b * bw + bw / 2 - 2, s * sh + 30, 4, sh * 0.52 - 8);
        }
      }
    },
  },
  lancasterNight: {
    size: [128, 128],
    tile: [14.4, 12.8],
    paint(c, w, h, rand) {
      c.fillStyle = '#000';
      c.fillRect(0, 0, w, h);
      const sh = h / 4;
      const bw = w / 4;
      for (let s = 0; s < 4; s++) {
        for (let b = 0; b < 4; b++) {
          if (rand() > 0.3) continue;
          c.fillStyle = rand() > 0.4 ? '#ffd9a0' : '#cfe0ff';
          c.fillRect(b * bw + 4.5, s * sh + 7.5, bw - 9, sh * 0.52 - 2);
        }
      }
    },
  },
  /** Two Fifty One across the street: pale precast frames round dark glazing. Four storeys by four bays. */
  tower: {
    size: [256, 256],
    tile: [12, 13.2],
    paint(c, w, h, rand) {
      c.fillStyle = '#d9d4c8';
      c.fillRect(0, 0, w, h);
      speckle(c, w, h, rand, 3000, 0.2);
      const sh = h / 4;
      const bw = w / 4;
      for (let s = 0; s < 4; s++) {
        for (let b = 0; b < 4; b++) {
          c.fillStyle = `rgb(${24 + rand() * 14},${32 + rand() * 14},${42 + rand() * 16})`;
          c.fillRect(b * bw + 6, s * sh + 8, bw - 12, sh - 16);
        }
      }
    },
  },
  towerNight: {
    size: [128, 128],
    tile: [12, 13.2],
    paint(c, w, h, rand) {
      c.fillStyle = '#000';
      c.fillRect(0, 0, w, h);
      const sh = h / 4;
      const bw = w / 4;
      for (let s = 0; s < 4; s++) {
        for (let b = 0; b < 4; b++) {
          if (rand() > 0.38) continue;
          c.fillStyle = rand() > 0.3 ? '#ffe2b8' : '#d6e4ff';
          c.fillRect(b * bw + 3, s * sh + 4, bw - 6, sh - 8);
        }
      }
    },
  },
} satisfies Record<string, Painting>;

export type Paint = keyof typeof PAINTINGS;

/** A wire mesh, see-through between the wires: fence panels, balustrade infill, the front of a bar. */
function meshPainting() {
  return canvasTexture(64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    c.strokeRect(0, 0, w, h);
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(w / 2, 0);
    c.lineTo(w / 2, h);
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.stroke();
  });
}

/* ------------------------------------------------------------------ signs ---- */
const FONT = 'Arial, Helvetica, sans-serif';

/** One of the two round queue signs: a black disc, a thin yellow ring, yellow capitals. The crest goes on as its own small plane. */
function queueSign(lines: string[]) {
  return canvasTexture(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#0c0c0d';
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#f2c417';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(w / 2, h / 2, w / 2 - 12, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#f2c417';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${lines.length > 1 ? 36 : 40}px ${FONT}`;
    lines.forEach((line, i) => c.fillText(line, w / 2, h * 0.4 + (i - (lines.length - 1) / 2) * 40));
  });
}

/** The orange board on the lamp posts. Its small dark crest goes on as its own plane. */
function neighboursSign() {
  return canvasTexture(256, 384, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f07d1a';
    c.beginPath();
    c.roundRect(2, 2, w - 4, h - 4, 26);
    c.fill();
    c.fillStyle = '#3a3a3a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold 40px ${FONT}`;
    ['PLEASE', 'RESPECT', 'OUR', 'NEIGHBOURS'].forEach((line, i) => c.fillText(line, w / 2, 74 + i * 50));
  });
}

function lettering(text: string, colour: string, w: number, h: number, size: number) {
  return canvasTexture(w, h, (c) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = colour;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${size}px ${FONT}`;
    c.fillText(text, w / 2, h / 2);
  });
}

/** The Loft's neon, on three lines. */
function neon() {
  return canvasTexture(512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold 58px ${FONT}`;
    const lines = ['THE HOME OF', 'DANCE MUSIC', 'SINCE 1991'];
    c.shadowColor = '#ff1a1a';
    c.shadowBlur = 16;
    c.fillStyle = '#ff5a52';
    lines.forEach((line, i) => c.fillText(line, w / 2, 48 + i * 80));
    c.shadowBlur = 0;
    c.fillStyle = '#ffd6d0';
    c.font = `bold 56px ${FONT}`;
    c.globalAlpha = 0.55;
    lines.forEach((line, i) => c.fillText(line, w / 2, 48 + i * 80));
  });
}

/** The yellow sound-level warning in the Box tunnel. The crest at its foot is a plane of its own. */
function warningSign() {
  return canvasTexture(256, 384, (c, w, h) => {
    c.fillStyle = '#f2c417';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#111';
    c.lineWidth = 6;
    c.strokeRect(8, 8, w - 16, h - 16);
    // a head wearing headphones
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(w / 2, 96, 37, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 10;
    c.beginPath();
    c.arc(w / 2, 96, 50, Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
    c.fillRect(w / 2 - 63, 82, 19, 45);
    c.fillRect(w / 2 + 44, 82, 19, 45);
    c.textAlign = 'center';
    c.font = `bold 40px ${FONT}`;
    c.fillText('CAUTION', w / 2, 198);
    c.font = `bold 28px ${FONT}`;
    c.fillText('EXCESSIVE', w / 2, 242);
    c.fillText('SOUND LEVELS', w / 2, 278);
  });
}

/** A soft round glow, for the light a projector or a lamp throws on a wall. */
function halo() {
  return canvasTexture(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.clearRect(0, 0, w, h);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}

const SIGNS = {
  guestList: () => queueSign(['GUEST LIST']),
  tickets: () => queueSign(['TICKET', 'HOLDERS']),
  neighbours: neighboursSign,
  busStand: () => lettering('BUS STAND', '#e8c21a', 512, 96, 84),
  neon,
  warning: warningSign,
  halo,
  mesh: meshPainting,
};
export type Sign = keyof typeof SIGNS;

export interface SurfaceOptions {
  rough?: number;
  metal?: number;
  /** Depth of the normal map made from the painting, on the detail levels that have one. */
  relief?: number;
  /** The painting is laid this many times larger than life. */
  scale?: number;
  /** Turn the painting a quarter turn. */
  turn?: boolean;
  emissive?: string;
  glow?: number;
  side?: THREE.Side;
}

export interface Finishes {
  /** A painted surface in a colour. One material for each combination asked for. */
  surface(paint: Paint, colour: string, options?: SurfaceOptions): THREE.MeshStandardMaterial;
  /** A plain surface in a colour. */
  plain(colour: string, options?: { rough?: number; metal?: number; side?: THREE.Side }): THREE.MeshStandardMaterial;
  /** Something that gives light: unlit, in its own colour. Shared by colour; `own` gives one that can be animated. */
  glow(colour: string, own?: boolean): THREE.MeshBasicMaterial;
  /** The painting itself, for a material made by hand; `repeat` in metres per tile, as the painting says. */
  painting(paint: Paint): THREE.Texture;
  sign(name: Sign): THREE.Texture;
  /** A wire mesh in a colour, see-through between wires `cell` metres apart. */
  mesh(colour: string, cell: number, glow?: number): THREE.MeshStandardMaterial;
}

// A painting is made once for the page, whoever asks first: the city's own facades and the venue share them.
const paintings = new Map<Paint, THREE.Texture>();
export function painting(name: Paint) {
  let t = paintings.get(name);
  if (!t) {
    const p: Painting = PAINTINGS[name];
    t = canvasTexture(p.size[0], p.size[1], (c, w, h) => p.paint(c, w, h, rng(name.length * 7 + name.charCodeAt(0))));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / p.tile[0], 1 / p.tile[1]);
    paintings.set(name, t);
  }
  return t;
}

export function makeFinishes(quality: Quality): Finishes {
  const normals = new Map<string, THREE.Texture | null>();
  const signs = new Map<Sign, THREE.Texture>();
  const materials = new Map<string, THREE.Material>();

  /** The same image laid at another size: a copy that shares the picture on the graphics card. */
  const laid = (base: THREE.Texture, tile: [number, number], scale: number, turn: boolean) => {
    const t = base.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / (tile[0] * scale), 1 / (tile[1] * scale));
    t.rotation = turn ? Math.PI / 2 : 0;
    t.needsUpdate = true;
    return t;
  };
  const normal = (name: Paint, turn: boolean) => {
    const key = `${name}|${turn ? 't' : 'f'}`;
    if (!normals.has(key)) {
      const source = painting(name);
      const img = source.image as HTMLCanvasElement;
      let map = source;
      if (turn) {
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d')!;
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, 0, 0);
        map = new THREE.CanvasTexture(canvas);
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.colorSpace = source.colorSpace;
        map.anisotropy = source.anisotropy;
      }
      const probe = new THREE.MeshStandardMaterial({ map });
      relief(probe, 1, 256);
      normals.set(key, probe.normalMap);
      probe.dispose();
    }
    return normals.get(key) ?? null;
  };
  const cached = <T extends THREE.Material>(key: string, make: () => T): T => {
    let m = materials.get(key) as T | undefined;
    if (!m) materials.set(key, (m = make()));
    return m;
  };

  return {
    painting,
    sign(name) {
      let t = signs.get(name);
      if (!t) signs.set(name, (t = SIGNS[name]()));
      return t;
    },
    surface(paint, colour, o = {}) {
      return cached(`s|${paint}|${colour}|${JSON.stringify(o)}`, () => {
        const tile = PAINTINGS[paint].tile as [number, number];
        const m = new THREE.MeshStandardMaterial({
          map: laid(painting(paint), tile, o.scale ?? 1, !!o.turn),
          color: colour,
          roughness: o.rough ?? 0.9,
          metalness: o.metal ?? 0,
          side: o.side ?? THREE.DoubleSide,
        });
        if (o.emissive) {
          m.emissive = new THREE.Color(o.emissive);
          m.emissiveIntensity = o.glow ?? 1;
        }
        const turned = !!o.turn;
        const n = quality.relief && o.relief ? normal(paint, turned) : null;
        if (n) {
          // Relief is baked in the same orientation as the colour map; turning uses a pre-rotated map, not texture.rotation.
          const tileForNormal = turned ? ([tile[1], tile[0]] as [number, number]) : tile;
          m.normalMap = laid(n, tileForNormal, o.scale ?? 1, false);
          m.normalMap.colorSpace = THREE.NoColorSpace;
          m.normalScale = new THREE.Vector2(o.relief, o.relief);
          m.envMapIntensity = 0.2;
        }
        return m;
      });
    },
    plain(colour, o = {}) {
      return cached(`p|${colour}|${JSON.stringify(o)}`, () => new THREE.MeshStandardMaterial({ color: colour, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, side: o.side ?? THREE.DoubleSide }));
    },
    glow(colour, own = false) {
      return own ? new THREE.MeshBasicMaterial({ color: colour }) : cached(`g|${colour}`, () => new THREE.MeshBasicMaterial({ color: colour }));
    },
    mesh(colour, cell, glow = 0) {
      return cached(`m|${colour}|${cell}|${glow}`, () => {
        let base = signs.get('mesh');
        if (!base) signs.set('mesh', (base = SIGNS.mesh()));
        const map = laid(base, [cell, cell], 1, false);
        return new THREE.MeshStandardMaterial({
          map,
          color: colour,
          alphaTest: 0.45,
          side: THREE.DoubleSide,
          roughness: 0.85,
          metalness: 0.15,
          emissive: new THREE.Color(colour),
          emissiveIntensity: glow,
          envMapIntensity: 0,
        });
      });
    },
  };
}
