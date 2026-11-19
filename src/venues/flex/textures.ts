import * as THREE from 'three';
import { relief } from '../../engine/materials';
import type { Quality } from '../../engine/quality';
import { canvasTexture, rng } from '../../engine/util';
import { Q } from './plan';

/**
 * Flex's own surfaces, painted on canvases at start-up from what the club's photographs of its
 * empty rooms show (docs/flex-research.md, section 2): walls of rough masonry painted matt
 * black and tagged all over, a worn screed floor, a wire mesh down one long wall, and in the
 * toilets a wall of sweets. All tags are random letters; nothing is copied from a photograph.
 *
 * UVs are in metres everywhere, so each painting says how many metres one tile of it covers.
 */

type Ctx = CanvasRenderingContext2D;
type Rand = () => number;
const grey = (v: number, a = 1) => `rgba(${v},${v},${v},${a})`;
const LETTERS = 'ABCDEKMNORSTVWXYZ';
const word = (rand: Rand, n: number) => Array.from({ length: n }, () => LETTERS[Math.floor(rand() * LETTERS.length)]).join('');

/** Soft light and dark patches that wrap round the edges of the tile. */
function blotches(c: Ctx, w: number, h: number, rand: Rand, count: number, sizes: [number, number], strength: number) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = sizes[0] + rand() * (sizes[1] - sizes[0]);
    const a = rand();
    const colour = a > 0.5 ? grey(0, (a - 0.5) * strength) : grey(255, (0.5 - a) * strength);
    for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
      const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      g.addColorStop(0, colour);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
}

function speckle(c: Ctx, w: number, h: number, rand: Rand, count: number, strength: number) {
  for (let i = 0; i < count; i++) {
    const a = rand();
    c.fillStyle = a > 0.5 ? grey(0, (a - 0.5) * strength) : grey(255, (0.5 - a) * strength);
    const s = 0.6 + rand() * 1.6;
    c.fillRect(rand() * w, rand() * h, s, s);
  }
}

/**
 * A black wall, 4 m of it, floor at the bottom: rough masonry under matt black paint, tagged
 * in white, silver and a few colours as high as an arm reaches, stickers at eye level, scuffed
 * grey where people lean. `busy` is how much is written on it, 0 to 1.
 */
function taggedWall(seed: number, busy: number) {
  return canvasTexture(1024, 1024, (c, w, h) => {
    const rand = rng(seed);
    const m = h / 4; // pixels per metre
    c.fillStyle = '#161618';
    c.fillRect(0, 0, w, h);
    // the courses of the masonry, showing through the paint
    for (let y = 0; y < h; y += m * 0.25) {
      c.fillStyle = grey(0, 0.35);
      c.fillRect(0, y, w, 2);
      c.fillStyle = grey(255, 0.035);
      c.fillRect(0, y + 2, w, 1.5);
      const shift = (Math.round(y / (m * 0.25)) % 2) * m * 0.3;
      for (let x = shift; x < w; x += m * 0.6) {
        c.fillStyle = grey(0, 0.28);
        c.fillRect(x, y, 2, m * 0.25);
      }
    }
    blotches(c, w, h, rand, 26, [40, 150], 0.35);
    speckle(c, w, h, rand, 9000, 0.35);
    // patches rolled over in a newer black
    for (let i = 0; i < 5; i++) {
      c.fillStyle = grey(8 + rand() * 14, 0.8);
      c.fillRect(rand() * w, h - m * (0.4 + rand() * 2), 60 + rand() * 220, 50 + rand() * 160);
    }
    // tags: a hand's writing, slanted, between knee and reach
    // mostly chalk and silver marker; now and then a colour
    const inks = ['#d8d8d2', '#d8d8d2', '#b9bcc0', '#b9bcc0', '#d8d8d2', '#b9bcc0', '#c9a52a', '#b8402e', '#3f9fb0', '#5fb04a'];
    c.lineJoin = 'round';
    c.lineCap = 'round';
    const tags = Math.round(60 * busy);
    for (let i = 0; i < tags; i++) {
      const size = 14 + rand() * 30;
      c.save();
      c.translate(rand() * w, h - m * (0.6 + rand() * 1.6));
      c.rotate((rand() - 0.5) * 0.5);
      c.transform(1, 0, -0.35, 1, 0, 0);
      c.font = `italic 700 ${size}px 'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive`;
      c.globalAlpha = 0.16 + rand() * 0.3;
      c.lineWidth = 1 + rand() * 1.6;
      c.strokeStyle = inks[Math.floor(rand() * inks.length)];
      c.strokeText(word(rand, 3 + Math.floor(rand() * 4)), 0, 0);
      c.restore();
    }
    // a few throw-ups: fat letters, silver with a black line
    for (let i = 0; i < Math.round(1.2 * busy); i++) {
      const size = 44 + rand() * 30;
      c.save();
      c.translate(rand() * w * 0.85, h - m * (0.5 + rand() * 1.2));
      c.font = `900 ${size}px 'Arial Black', Impact, sans-serif`;
      const t = word(rand, 2 + Math.floor(rand() * 2));
      c.lineWidth = size * 0.09;
      c.strokeStyle = '#050505';
      c.strokeText(t, 0, 0);
      c.fillStyle = '#8e9092';
      c.globalAlpha = 0.6;
      c.fillText(t, 0, 0);
      c.restore();
    }
    // stickers at eye level
    for (let i = 0; i < Math.round(16 * busy); i++) {
      c.fillStyle = ['#cfccc4', '#a8382a', '#c9a52a', '#2a559e', '#cfccc4', '#0c0c0c', '#2f8a62'][Math.floor(rand() * 7)];
      c.globalAlpha = 0.4;
      const sw = 5 + rand() * 10;
      const sx = rand() * w;
      const sy = h - m * (1.1 + rand() * 0.9);
      c.save();
      c.translate(sx, sy);
      c.rotate((rand() - 0.5) * 0.6);
      c.fillRect(0, 0, sw, sw * (0.5 + rand() * 0.7));
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillRect(2, 3, sw * 0.6, 2);
      c.restore();
    }
    // worn pale where shoulders and bags rub, dirt at the foot
    const rub = c.createLinearGradient(0, h - m * 1.5, 0, h - m * 0.7);
    rub.addColorStop(0, grey(120, 0));
    rub.addColorStop(0.5, grey(120, 0.08));
    rub.addColorStop(1, grey(120, 0));
    c.fillStyle = rub;
    c.fillRect(0, h - m * 1.5, w, m * 0.8);
    const foot = c.createLinearGradient(0, h, 0, h - m * 0.35);
    foot.addColorStop(0, 'rgba(90,80,66,0.5)');
    foot.addColorStop(1, 'rgba(90,80,66,0)');
    c.fillStyle = foot;
    c.fillRect(0, h - m * 0.35, w, m * 0.35);
  });
}

/** A poured floor, pale and worn: stains, hairline cracks, old gum, the dull track where everybody walks. */
function screed(seed: number) {
  return canvasTexture(1024, 1024, (c, w, h) => {
    const rand = rng(seed);
    c.fillStyle = '#b8aca2';
    c.fillRect(0, 0, w, h);
    blotches(c, w, h, rand, 60, [50, 220], 0.3);
    speckle(c, w, h, rand, 26000, 0.3);
    // spills
    for (let i = 0; i < 26; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 14 + rand() * 60;
      const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, 'rgba(40,34,28,0.13)');
      g.addColorStop(0.8, 'rgba(40,34,28,0.07)');
      g.addColorStop(1, 'rgba(40,34,28,0)');
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // cracks
    c.strokeStyle = grey(30, 0.45);
    c.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      let x = rand() * w;
      let y = rand() * h;
      c.beginPath();
      c.moveTo(x, y);
      for (let k = 0; k < 14; k++) {
        x += (rand() - 0.5) * 70;
        y += (rand() - 0.2) * 50;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    // pale flecks trodden flat, all over
    for (let i = 0; i < 900; i++) {
      c.fillStyle = grey(245, 0.35 + rand() * 0.4);
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 1 + rand() * 2.6, 0.8 + rand() * 2, rand() * 3, 0, Math.PI * 2);
      c.fill();
    }
    // gum
    for (let i = 0; i < 160; i++) {
      c.fillStyle = grey(25 + rand() * 30, 0.55);
      c.beginPath();
      c.ellipse(rand() * w, rand() * h, 2 + rand() * 3, 1.5 + rand() * 2.5, rand() * 3, 0, Math.PI * 2);
      c.fill();
    }
  });
}

/** Paving on the quay: concrete slabs a metre square, weeds of dark in the joints, tyre and rain marks. */
function slabs(seed: number) {
  return canvasTexture(1024, 1024, (c, w, h) => {
    const rand = rng(seed);
    c.fillStyle = '#a6a199';
    c.fillRect(0, 0, w, h);
    const n = 4;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        c.fillStyle = grey(rand() < 0.5 ? 0 : 255, 0.03 + rand() * 0.06);
        c.fillRect((i * w) / n, (j * h) / n, w / n, h / n);
      }
    blotches(c, w, h, rand, 40, [40, 200], 0.28);
    speckle(c, w, h, rand, 22000, 0.32);
    c.fillStyle = grey(25, 0.7);
    for (let i = 0; i < n; i++) {
      c.fillRect((i * w) / n - 2, 0, 4, h);
      c.fillRect(0, (i * h) / n - 2, w, 4);
    }
  });
}

/** White tiles, 15 cm, grey joints, a few cracked or missing. */
function tiles(seed: number) {
  return canvasTexture(512, 512, (c, w, h) => {
    const rand = rng(seed);
    c.fillStyle = '#8f9291';
    c.fillRect(0, 0, w, h);
    const n = 8;
    const s = w / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 222 + rand() * 26;
        c.fillStyle = rand() < 0.03 ? '#7d7f7e' : `rgb(${v},${v},${v - 4})`;
        c.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
      }
    speckle(c, w, h, rand, 2500, 0.2);
  });
}

/**
 * The wall of sweets in the toilets: boiled sweets, wrapped toffees, rings and laces, packed
 * edge to edge in every colour. One tile is 1.6 m.
 */
function candy(seed: number) {
  return canvasTexture(1024, 1024, (c, w, h) => {
    const rand = rng(seed);
    c.fillStyle = '#f3ebe2';
    c.fillRect(0, 0, w, h);
    const colours = ['#ff3b5c', '#ff8a1e', '#ffd21e', '#3ccf6e', '#2fb7ff', '#8f5bff', '#ff5fc0', '#ffffff', '#c8102e', '#00b3a4', '#ff6f61', '#7a3b1e'];
    const pick = () => colours[Math.floor(rand() * colours.length)];
    for (let i = 0; i < 620; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = 14 + rand() * 20;
      const kind = rand();
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        c.save();
        c.translate(x + ox, y + oy);
        c.rotate(rand() * Math.PI);
        const a = pick();
        if (kind < 0.4) {
          // a boiled sweet with a shine, sometimes striped
          c.fillStyle = a;
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.fill();
          if (kind < 0.18) {
            c.strokeStyle = '#ffffff';
            c.lineWidth = r * 0.28;
            c.beginPath();
            c.arc(0, 0, r * 0.55, 0, Math.PI * 2);
            c.stroke();
          }
          c.fillStyle = 'rgba(255,255,255,0.55)';
          c.beginPath();
          c.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
          c.fill();
        } else if (kind < 0.7) {
          // a wrapped toffee: a body and two twisted ends
          c.fillStyle = a;
          c.fillRect(-r, -r * 0.55, r * 2, r * 1.1);
          c.beginPath();
          c.moveTo(-r, 0);
          c.lineTo(-r * 1.8, -r * 0.7);
          c.lineTo(-r * 1.8, r * 0.7);
          c.closePath();
          c.fill();
          c.beginPath();
          c.moveTo(r, 0);
          c.lineTo(r * 1.8, -r * 0.7);
          c.lineTo(r * 1.8, r * 0.7);
          c.closePath();
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.4)';
          c.fillRect(-r * 0.8, -r * 0.45, r * 1.6, r * 0.22);
        } else if (kind < 0.88) {
          // a ring
          c.strokeStyle = a;
          c.lineWidth = r * 0.5;
          c.beginPath();
          c.arc(0, 0, r * 0.8, 0, Math.PI * 2);
          c.stroke();
        } else {
          // a lace
          c.strokeStyle = a;
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(-r * 2, 0);
          c.bezierCurveTo(-r, -r * 1.6, r, r * 1.6, r * 2, 0);
          c.stroke();
        }
        c.restore();
      }
    }
  });
}

/** Wire mesh: see-through between the wires. */
function wire() {
  return canvasTexture(64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.strokeRect(0, 0, w, h);
  });
}

/** Paste-ups on a black front: posters edge to edge, some torn. One tile is 4 m by 2 m. */
function posters(seed: number) {
  return canvasTexture(1024, 512, (c, w, h) => {
    const rand = rng(seed);
    c.fillStyle = '#131315';
    c.fillRect(0, 0, w, h);
    const inks = ['#e8e2d0', '#d92b2b', '#f2c417', '#1b4fa8', '#111111', '#e8e2d0', '#f07d1a', '#7a2a8c', '#2aa39a'];
    for (let i = 0; i < 110; i++) {
      const pw = 60 + rand() * 80;
      const ph = pw * 1.4;
      c.save();
      c.translate(rand() * w, rand() * h);
      c.rotate((rand() - 0.5) * 0.1);
      const paper = inks[Math.floor(rand() * inks.length)];
      let ink = inks[Math.floor(rand() * inks.length)];
      if (ink === paper) ink = paper === '#111111' ? '#e8e2d0' : '#111111';
      c.fillStyle = paper;
      c.fillRect(0, 0, pw, ph);
      c.fillStyle = ink;
      c.fillRect(pw * 0.1, ph * 0.08, pw * (0.5 + (i % 3) * 0.15), ph * 0.12);
      if (i % 3 === 0) {
        c.beginPath();
        c.arc(pw / 2, ph * 0.5, pw * 0.26, 0, Math.PI * 2);
        c.fill();
      } else c.fillRect(pw * 0.1, ph * 0.28, pw * 0.8, ph * (0.2 + (i % 4) * 0.06));
      for (let k = 0; k < 4; k++) c.fillRect(pw * 0.1, ph * (0.74 + k * 0.055), pw * (0.4 + ((i + k) % 4) * 0.12), ph * 0.022);
      c.restore();
    }
    speckle(c, w, h, rand, 5000, 0.3);
  });
}

/** Ripples: pale crests on grey, to be read as height. Wraps on both edges. */
function ripples(seed: number) {
  return canvasTexture(512, 512, (c, w, h) => {
    const rand = rng(seed);
    c.fillStyle = '#808080';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const len = 30 + rand() * 90;
      const a = rand();
      c.strokeStyle = a > 0.5 ? grey(255, 0.16) : grey(0, 0.16);
      c.lineWidth = 3 + rand() * 7;
      c.lineCap = 'round';
      for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        c.beginPath();
        c.moveTo(x + ox - len / 2, y + oy);
        c.quadraticCurveTo(x + ox, y + oy + (rand() - 0.5) * 16, x + ox + len / 2, y + oy);
        c.stroke();
      }
    }
  });
}

/** A red LED ticker: the word in lit dots on black. */
export function ticker(text: string) {
  return canvasTexture(512, 96, (c, w, h) => {
    c.fillStyle = '#0a0000';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff2a1c';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = "900 62px 'Arial Narrow', Impact, sans-serif";
    c.fillText(text, w / 2, h / 2 + 3);
    // the gaps between the dots
    c.fillStyle = '#0a0000';
    for (let x = 0; x < w; x += 6) c.fillRect(x, 0, 2, h);
    for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2);
  });
}

/** A chalked or stencilled notice on black, for a column: white capitals, not quite straight. */
export function notice(lines: string[], seed: number) {
  return canvasTexture(256, 256, (c, w, h) => {
    const rand = rng(seed);
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f0efe9';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const size = Math.min(92, (w * 1.55) / line.length);
      c.save();
      c.translate(w / 2, (h * (i + 0.5)) / lines.length);
      c.rotate((rand() - 0.5) * 0.08);
      c.font = `900 ${size}px 'Arial Narrow', Impact, sans-serif`;
      c.globalAlpha = 0.86;
      c.fillText(line, 0, 0);
      c.restore();
    });
  });
}

/**
 * The painted boards along the garden: a row of mask-like heads in flat colour, eyes wide, every
 * one patterned differently, with a band of eyes along the top. Painted here from scratch in
 * the spirit of the wall that stood there; it copies no head of the real one. One tile is 16 m by 5 m.
 */
export function mural(seed: number) {
  return canvasTexture(2048, 640, (c, w, h) => {
    const rand = rng(seed);
    const P = { red: '#e8362c', yellow: '#f6c21c', pink: '#f07ab4', blue: '#3f8fd6', sky: '#8fd0ee', black: '#16161a', cream: '#f3ead8', teal: '#1f9a8c', violet: '#7a55b8', orange: '#f08a24' };
    const all = Object.values(P);
    const pick = (not?: string) => {
      let v = all[Math.floor(rand() * all.length)];
      while (v === not) v = all[Math.floor(rand() * all.length)];
      return v;
    };
    const eye = (x: number, y: number, rx: number, ry: number, iris: string) => {
      c.fillStyle = P.cream;
      c.beginPath();
      c.moveTo(x - rx, y);
      c.quadraticCurveTo(x, y - ry * 1.5, x + rx, y);
      c.quadraticCurveTo(x, y + ry * 1.5, x - rx, y);
      c.fill();
      for (const [k, col] of [[0.62, iris], [0.42, P.sky], [0.22, P.black]] as [number, string][]) {
        c.fillStyle = col;
        c.beginPath();
        c.arc(x, y, ry * k * 1.5, 0, Math.PI * 2);
        c.fill();
      }
    };
    /** Fill a box with one of a few patterns in a second colour. */
    const pattern = (x: number, y: number, bw: number, bh: number, ink: string, kind: number) => {
      c.save();
      c.beginPath();
      c.rect(x, y, bw, bh);
      c.clip();
      c.strokeStyle = ink;
      c.fillStyle = ink;
      c.lineWidth = 5;
      if (kind === 0) for (let yy = y + 8; yy < y + bh; yy += 18) {
        c.beginPath();
        for (let xx = x; xx <= x + bw; xx += 6) c.lineTo(xx, yy + 5 * Math.sin((xx - x) * 0.22));
        c.stroke();
      }
      else if (kind === 1) for (let yy = y + 10; yy < y + bh; yy += 20) for (let xx = x + 10 + ((yy / 20) % 2) * 10; xx < x + bw; xx += 20) c.fillRect(xx - 3, yy - 3, 6, 6);
      else if (kind === 2) for (let xx = x + 6; xx < x + bw; xx += 16) c.fillRect(xx, y, 6, bh);
      else for (let i = 0; i < (bw * bh) / 900; i++) {
        const sx = x + rand() * bw;
        const sy = y + rand() * bh;
        c.beginPath();
        for (let a = 0; a < 4; a++) {
          c.moveTo(sx, sy);
          c.lineTo(sx + 9 * Math.cos((a * Math.PI) / 4 + 0.3), sy + 9 * Math.sin((a * Math.PI) / 4 + 0.3));
          c.moveTo(sx, sy);
          c.lineTo(sx - 9 * Math.cos((a * Math.PI) / 4 + 0.3), sy - 9 * Math.sin((a * Math.PI) / 4 + 0.3));
        }
        c.lineWidth = 2.5;
        c.stroke();
      }
      c.restore();
    };
    const band = h * 0.3;
    // the upper boards: a red band with great eyes, and a wavy strip above them
    c.fillStyle = P.red;
    c.fillRect(0, 0, w, band);
    pattern(0, 0, w, band * 0.3, P.pink, 0);
    for (let x = 90; x < w; x += 300 + rand() * 80) eye(x, band * 0.66, 78, 34, P.blue);
    // the lower boards: one head each
    let x = 0;
    while (x < w) {
      const bw = Math.min(w - x, 170 + rand() * 150);
      const ground = pick();
      c.fillStyle = ground;
      c.fillRect(x, band, bw, h - band);
      // the head: a rounded block
      const skin = pick(ground);
      const hx = x + bw * 0.12;
      const hw = bw * 0.76;
      const hy = band + (h - band) * (0.08 + rand() * 0.1);
      const hh = (h - band) * (0.72 + rand() * 0.14);
      c.fillStyle = skin;
      c.beginPath();
      c.roundRect(hx, hy, hw, hh, hw * (0.2 + rand() * 0.25));
      c.fill();
      pattern(hx, hy, hw, hh * 0.3, pick(skin), Math.floor(rand() * 4));
      pattern(hx, hy + hh * 0.68, hw, hh * 0.32, pick(skin), Math.floor(rand() * 4));
      const ey = hy + hh * (0.4 + rand() * 0.08);
      const iris = pick(skin);
      eye(hx + hw * 0.28, ey, hw * 0.19, hw * 0.085, iris);
      eye(hx + hw * 0.72, ey, hw * 0.19, hw * 0.085, iris);
      // the mouth: a rounded slot with a tongue of another colour
      c.fillStyle = P.black;
      c.beginPath();
      c.roundRect(hx + hw * 0.22, hy + hh * 0.6, hw * 0.56, hh * 0.13, hh * 0.06);
      c.fill();
      c.fillStyle = pick(P.black);
      c.beginPath();
      c.roundRect(hx + hw * 0.3, hy + hh * 0.635, hw * 0.4, hh * 0.06, hh * 0.03);
      c.fill();
      // the joint between the boards, and the bolts that hold them
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(x + bw - 3, 0, 3, h);
      c.fillStyle = 'rgba(20,20,22,0.8)';
      for (const by of [band * 0.2, band * 0.85, band + 30, h - 40]) {
        c.beginPath();
        c.arc(x + 16, by, 5, 0, Math.PI * 2);
        c.fill();
      }
      x += bw;
    }
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(0, band - 3, w, 4);
    speckle(c, w, h, rand, 9000, 0.14);
  });
}

/** The sign over the hall's bar: fat red letters, each set with a row of pale bulbs. */
export function cocktails() {
  return canvasTexture(1024, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = "900 150px 'Arial Black', Impact, sans-serif";
    c.lineJoin = 'round';
    const text = 'COCKTAILS';
    const step = w / (text.length + 0.4);
    text.split('').forEach((letter, i) => {
      const x = step * (i + 0.7);
      c.lineWidth = 16;
      c.strokeStyle = '#7a0d12';
      c.strokeText(letter, x, h / 2 + 6);
      c.fillStyle = '#e8242c';
      c.fillText(letter, x, h / 2 + 6);
      // the bulbs: only where the letter is
      c.save();
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = '#ffe9d2';
      for (let yy = 14; yy < h; yy += 15) for (let xx = x - step / 2 + 6; xx < x + step / 2; xx += 15) {
        c.beginPath();
        c.arc(xx, yy, 2.6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    });
  });
}

/**
 * The club's sign over the door: its own logo, as the outline of it set with bulbs. The canvas
 * is empty until the file arrives. The logo is the club's and is not covered by the licence.
 */
export function bulbSign(url: string) {
  const [w, h] = [992, 156];
  const texture = canvasTexture(w, h, (c) => c.clearRect(0, 0, w, h));
  const image = new Image();
  image.onload = () => {
    const canvas = texture.image as HTMLCanvasElement;
    const c = canvas.getContext('2d')!;
    c.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    c.clearRect(0, 0, w, h);
    c.drawImage(image, 0, 0, w, h);
    // keep the logo only where a bulb is: a grid of dots
    c.globalCompositeOperation = 'destination-in';
    c.beginPath();
    for (let y = 3.5; y < h; y += 7) for (let x = 3.5; x < w; x += 7) {
      c.moveTo(x + 2.7, y);
      c.arc(x, y, 2.7, 0, Math.PI * 2);
    }
    c.fill();
    c.globalCompositeOperation = 'source-over';
    texture.needsUpdate = true;
  };
  image.src = url;
  return texture;
}

export interface SurfaceOptions {
  rough?: number;
  metal?: number;
  /** Depth of the surface, on the detail levels that have relief. */
  relief?: number;
  /** A wall: the foot of the picture stands on the quay. */
  wall?: boolean;
}

export type Paint = 'tagged' | 'tagged2' | 'tagged3' | 'screed' | 'slabs' | 'tiles' | 'candy' | 'posters';
const PAINTS: Record<Paint, { tile: [number, number]; make(): THREE.Texture }> = {
  tagged: { tile: [4, 4], make: () => taggedWall(11, 1) },
  tagged2: { tile: [4, 4], make: () => taggedWall(23, 0.6) },
  tagged3: { tile: [4, 4], make: () => taggedWall(37, 0.35) },
  screed: { tile: [6, 6], make: () => screed(5) },
  slabs: { tile: [4, 4], make: () => slabs(9) },
  tiles: { tile: [1.2, 1.2], make: () => tiles(3) },
  candy: { tile: [1.6, 1.6], make: () => candy(14) },
  posters: { tile: [4, 2], make: () => posters(8) },
};

export interface Finishes {
  /** A painted surface in a colour: one material for each combination asked for. */
  surface(paint: Paint, colour: string, options?: SurfaceOptions): THREE.MeshStandardMaterial;
  /** Wire mesh in a colour, `cell` metres from wire to wire. */
  wire(colour: string, cell: number): THREE.MeshStandardMaterial;
  /** The canal: dark, with ripples that drift. Call `flow(t)` every frame. */
  water(): { material: THREE.MeshStandardMaterial; flow(t: number): void };
}

export function makeFinishes(quality: Quality): Finishes {
  const pictures = new Map<Paint, THREE.Texture>();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const picture = (paint: Paint) => {
    let t = pictures.get(paint);
    if (!t) pictures.set(paint, (t = PAINTS[paint].make()));
    return t;
  };
  return {
    surface(paint, colour, o = {}) {
      const key = `${paint}|${colour}|${JSON.stringify(o)}`;
      let m = materials.get(key);
      if (!m) {
        const [tw, th] = PAINTS[paint].tile;
        const map = picture(paint).clone();
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(1 / tw, 1 / th);
        if (o.wall) map.offset.y = -Q / th;
        map.needsUpdate = true;
        m = new THREE.MeshStandardMaterial({ map, color: colour, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0, side: THREE.DoubleSide });
        if (quality.relief && o.relief) {
          relief(m, o.relief, 512);
          m.envMapIntensity = 0.25;
        }
        materials.set(key, m);
      }
      return m;
    },
    wire(colour, cell) {
      const key = `wire|${colour}|${cell}`;
      let m = materials.get(key);
      if (!m) {
        const map = wire();
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(1 / cell, 1 / cell);
        m = new THREE.MeshStandardMaterial({ map, color: colour, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.6 });
        materials.set(key, m);
      }
      return m;
    },
    water() {
      const map = ripples(21);
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(1 / 14, 1 / 14);
      const material = new THREE.MeshStandardMaterial({ map, color: '#15252b', roughness: 0.1, metalness: 0.75 });
      relief(material, 1.6, 512);
      // the picture was only there to be read as height
      const normal = material.normalMap;
      material.map = null;
      material.needsUpdate = true;
      return {
        material,
        flow(t) {
          if (normal) normal.offset.set(t * 0.012, t * 0.004);
        },
      };
    },
  };
}
