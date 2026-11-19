import * as THREE from 'three';
import type { Quality } from '../engine/quality';
import { canvasTexture, rng } from '../engine/util';

/**
 * The materials components are drawn in. A venue can hand over its own (anything with these
 * methods), so that a component picks up the venue's finishes; `makeMats` gives a plain set
 * for a venue that has none.
 *
 * Materials are shared: asking twice for the same colour and options gives the same material,
 * so the batch can merge everything drawn in it into one mesh.
 */
export interface MatOptions {
  rough?: number;
  metal?: number;
  side?: THREE.Side;
}

export interface Mats {
  /** A plain surface in a colour. */
  plain(colour: string, options?: MatOptions): THREE.MeshStandardMaterial;
  /** Something that gives light: unlit, in its own colour. `own` gives one that can be animated on its own. */
  glow(colour: string, own?: boolean): THREE.MeshBasicMaterial;
  /** A loudspeaker grille in a colour: one tile of the picture is one 0.7 m cabinet front, UVs in metres. */
  grille(colour: string, options?: MatOptions): THREE.MeshStandardMaterial;
  /** The picture an LED wall shows, grey, to be tinted and moved by a material of its own. One tile a metre. */
  led(): THREE.Texture;
}

const grey = (v: number, a = 1) => `rgba(${v},${v},${v},${a})`;

/** The front of a loudspeaker cabinet behind its grille: the cone, the horn above it, a perforated sheet. */
export function paintGrille(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#5c5c5c';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#9a9a9a';
  c.fillRect(8, 8, w - 16, h - 16);
  c.fillStyle = grey(30, 0.75);
  for (let y = 14; y < h - 12; y += 6) for (let x = 14 + ((y / 6) % 2) * 3; x < w - 12; x += 6) c.fillRect(x, y, 2.4, 2.4);
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
}

/** Bands of light seen through the grid of an LED wall's pixels. */
export function paintLed(c: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
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
}

/** A plain set of materials for components, for a venue that brings no finishes of its own. */
export function makeMats(_quality?: Quality): Mats {
  const cache = new Map<string, THREE.Material>();
  const cached = <T extends THREE.Material>(key: string, make: () => T): T => {
    let m = cache.get(key) as T | undefined;
    if (!m) cache.set(key, (m = make()));
    return m;
  };
  let grilleMap: THREE.Texture | null = null;
  let ledMap: THREE.Texture | null = null;
  return {
    plain(colour, o = {}) {
      return cached(`p|${colour}|${JSON.stringify(o)}`, () => new THREE.MeshStandardMaterial({ color: colour, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0, side: o.side ?? THREE.DoubleSide }));
    },
    glow(colour, own = false) {
      return own ? new THREE.MeshBasicMaterial({ color: colour }) : cached(`g|${colour}`, () => new THREE.MeshBasicMaterial({ color: colour }));
    },
    grille(colour, o = {}) {
      return cached(`s|${colour}|${JSON.stringify(o)}`, () => {
        grilleMap ??= canvasTexture(256, 256, (c, w, h) => paintGrille(c, w, h));
        const map = grilleMap.clone();
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(1 / 0.7, 1 / 0.7);
        map.needsUpdate = true;
        return new THREE.MeshStandardMaterial({ map, color: colour, roughness: o.rough ?? 0.9, metalness: o.metal ?? 0, side: o.side ?? THREE.DoubleSide });
      });
    },
    led() {
      if (!ledMap) {
        ledMap = canvasTexture(256, 128, (c, w, h) => paintLed(c, w, h, rng(3 * 7 + 'l'.charCodeAt(0))));
        ledMap.wrapS = ledMap.wrapT = THREE.RepeatWrapping;
      }
      return ledMap;
    },
  };
}
