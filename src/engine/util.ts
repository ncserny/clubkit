import * as THREE from 'three';

/** Small helpers the model shares: painted canvas textures and a seeded random number generator. */
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

let anisotropy = 4;
export function setAnisotropy(value: number) {
  anisotropy = value;
}

/**
 * Painted textures are made at this fraction of the size they ask for. A venue can ask for
 * smaller ones on a detail level (a phone has little texture memory); the painting code is
 * not told, it draws in the same units either way.
 */
let textureScale = 1;
export function setTextureScale(value: number) {
  textureScale = value;
}

export function canvasTexture(w: number, h: number, draw: Draw, opts: { srgb?: boolean; repeat?: [number, number] } = {}) {
  const canvas = document.createElement('canvas');
  const k = textureScale;
  canvas.width = k === 1 ? w : Math.max(1, Math.round(w * k));
  canvas.height = k === 1 ? h : Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext('2d')!;
  if (k !== 1) ctx.scale(canvas.width / w, canvas.height / h);
  draw(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  if (opts.repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...opts.repeat);
  }
  return texture;
}

/** Seeded so the floor is the same floor on every visit. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

