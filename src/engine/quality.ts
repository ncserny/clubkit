import type * as THREE from 'three';

/**
 * Three levels of detail. The same building at each; what changes is how much
 * light, surface and crowd the device is asked to draw.
 *
 *   lite      phones and weak graphics: flat surfaces, a smaller crowd, sun shadows only
 *   balanced  most laptops: surface relief, haze, dust in the beams, a full crowd
 *   ultra     strong graphics: all of that plus shadows from the club lights,
 *             contact shadows in the corners and the biggest crowd
 */
export type Level = 'lite' | 'balanced' | 'ultra';

export interface Quality {
  level: Level;
  /** How the level was chosen: by the visitor, or by looking at the device. */
  chosen: 'manual' | 'auto';
  maxPixelRatio: number;
  sunShadow: number;
  /** Normal maps derived from the painted textures. */
  relief: boolean;
  /** Club lights that cast shadows indoors. */
  interiorShadows: boolean;
  interiorShadowSize: number;
  /** Screen-space contact shadows. */
  ambientOcclusion: boolean;
  /** Multisampling on the post-processing target. */
  samples: number;
  dust: boolean;
  props: boolean;
  /** Segments round a limb: how round the people are. */
  figureDetail: number;
}

const LEVELS: Record<Level, Omit<Quality, 'level' | 'chosen'>> = {
  lite: {
    maxPixelRatio: 1.25,
    sunShadow: 1024,
    relief: false,
    interiorShadows: false,
    interiorShadowSize: 0,
    ambientOcclusion: false,
    samples: 0,
    dust: false,
    props: false,
    figureDetail: 5,
  },
  balanced: {
    maxPixelRatio: 1.5,
    sunShadow: 2048,
    relief: true,
    interiorShadows: false,
    interiorShadowSize: 0,
    ambientOcclusion: false,
    samples: 4,
    dust: true,
    props: true,
    figureDetail: 8,
  },
  ultra: {
    maxPixelRatio: 2,
    sunShadow: 4096,
    relief: true,
    interiorShadows: true,
    interiorShadowSize: 1024,
    ambientOcclusion: true,
    samples: 4,
    dust: true,
    props: true,
    figureDetail: 11,
  },
};

export const LEVEL_NAMES: Record<Level, string> = { lite: 'Lite', balanced: 'Balanced', ultra: 'Ultra' };
const ORDER: Level[] = ['lite', 'balanced', 'ultra'];
const KEY = 'cw-detail';
const isLevel = (v: unknown): v is Level => v === 'lite' || v === 'balanced' || v === 'ultra';

function stored(): Level | null {
  try {
    const q = new URLSearchParams(location.search).get('detail');
    if (isLevel(q)) return q;
    const s = localStorage.getItem(KEY);
    return isLevel(s) ? s : null;
  } catch {
    return null;
  }
}

/** Remember the visitor's choice. The scene is built for one level, so changing it reloads the page. */
export function chooseLevel(level: Level) {
  try {
    localStorage.setItem(KEY, level);
  } catch {
    // private windows can refuse storage; the address carries the choice instead
  }
  const u = new URL(location.href);
  u.searchParams.set('detail', level);
  location.replace(u);
}

export function nextLevel(level: Level): Level {
  return ORDER[(ORDER.indexOf(level) + 1) % ORDER.length];
}

/** What the graphics chip calls itself, when the browser will say. */
function gpuName(renderer: THREE.WebGLRenderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
  } catch {
    return '';
  }
}

function detect(renderer: THREE.WebGLRenderer): Level {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 700;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  const gpu = gpuName(renderer);
  // software rendering, phones and tablets, and machines with little memory
  if (/swiftshader|llvmpipe|software|basic render/.test(gpu)) return 'lite';
  if (coarse || small || memory <= 4 || cores <= 4) return 'lite';
  // graphics chips known to carry the full scene
  if (/apple m\d|apple gpu|rtx|radeon rx|radeon pro|geforce gtx 1[06]|geforce gtx (9|10)\d\d|arc\(tm\)|arc a\d/.test(gpu)) return 'ultra';
  return 'balanced';
}

export function pickQuality(renderer: THREE.WebGLRenderer): Quality {
  const manual = stored();
  const level = manual ?? detect(renderer);
  return { level, chosen: manual ? 'manual' : 'auto', ...LEVELS[level] };
}
