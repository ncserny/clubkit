import type { Dress, Person } from '../engine/people';
import type { Area, ByLevel, CrowdSpec, Pt, Rect } from '../engine/types';

/**
 * People are data, not geometry: these helpers write the crowd entries a venue's plan lists,
 * and the engine draws every figure in a room as one instanced mesh that moves to the beat.
 * Put what they return in `plan.crowds`.
 */

/** Wardrobes. `black` is what the engine dresses everyone in if a crowd names none. */
export const WARDROBE: Record<'black' | 'mixed' | 'summer' | 'staff', Dress> = {
  black: { tops: [['#0c0c0d', 6], ['#1a1a1c', 2], ['#2a2a2e', 1]], legs: [['#0b0b0c', 5], ['#1d2230', 2]], bareArms: 0.25, skirts: 0.12, shaved: 0.12 },
  mixed: {
    tops: [['#0c0c0d', 5], ['#e8e4dc', 2], ['#7a1f2b', 1], ['#1f3a6b', 1], ['#3d5a3a', 1], ['#c9a227', 0.5], ['#5a2d6b', 0.5]],
    legs: [['#0b0b0c', 4], ['#1d2a44', 3], ['#5a5048', 1], ['#c8c0b0', 0.5]],
    bareArms: 0.35,
    skirts: 0.18,
    shaved: 0.08,
  },
  summer: {
    tops: [['#f0ece4', 3], ['#0c0c0d', 3], ['#d9573a', 1], ['#3a7bd5', 1], ['#e2c044', 1], ['#5fa86a', 1]],
    legs: [['#1d2a44', 3], ['#c8b89a', 2], ['#0b0b0c', 2], ['#6a8caf', 1]],
    bareArms: 0.8,
    skirts: 0.25,
    shaved: 0.1,
  },
  staff: { tops: [['#0c0c0d', 1]], legs: [['#0a0a0b', 1]], bareArms: 0.15, skirts: 0, shaved: 0.15 },
};

interface Common {
  id?: string;
  /** The room they are in, for a venue that hides the rooms that cannot be seen. */
  room?: string;
  dress?: Dress;
  /** Only there at these times of day. */
  times?: string[];
  look?: number;
}

/** A dance floor: `count` people scattered over `rect` at floor height y, dancing to the beat and turned toward `faceTo` (the booth). */
export function dancers(o: Common & { rect: Rect; y: number; count: number | ByLevel; seed: number; faceTo?: Pt; within?: Pt[]; avoid?: Area[]; clear?: number; gap?: number; armsUp?: boolean }): CrowdSpec {
  return { kind: 'scatter', behaviour: 'dance', ...o };
}

/** People standing about and talking: at a bar, in a corridor, outside for air. */
export function talkers(o: Common & { rect: Rect; y: number; count: number | ByLevel; seed: number; faceTo?: Pt; within?: Pt[]; avoid?: Area[]; clear?: number; gap?: number }): CrowdSpec {
  return { kind: 'scatter', behaviour: 'talk', ...o };
}

/** One person somewhere, doing one thing. `facing` is radians about the vertical. */
export const person = (x: number, z: number, y: number, facing: number, behaviour: Person['behaviour']): Person => ({ x, y, z, facing, behaviour });

/** A bouncer: stands square, arms folded, watching. */
export const bouncer = (x: number, z: number, y: number, facing: number): Person => person(x, z, y, facing, 'bouncer');

/** A group of named people (door staff, people on a sofa), each placed by hand. */
export function group(o: Common & { people: Person[]; count?: ByLevel; armsUp?: boolean }): CrowdSpec {
  return { kind: 'people', ...o };
}

/** The door: bouncers in the staff wardrobe. */
export function doorStaff(o: Common & { people: Person[] }): CrowdSpec {
  return { kind: 'people', dress: WARDROBE.staff, ...o };
}

/** The DJ behind the desk, with headphones on. Pass where `djBooth` says the DJ stands. */
export function dj(o: Common & { at: { x: number; y: number; z: number; facing: number }; headphones?: boolean }): CrowdSpec {
  const { at, headphones = true, ...rest } = o;
  return { kind: 'people', people: [{ ...at, behaviour: 'dj' }], headphones, ...rest };
}

/** A queue along a path, `offset` metres to the side of it, one person every `spacing` metres from `start` on, with door staff who belong to it. */
export function queue(o: Common & { path: Pt[]; y: number; seed: number; offset?: number; spacing?: number; start?: number; staff?: Person[] }): CrowdSpec {
  return { kind: 'queue', offset: 0, spacing: 0.75, start: 0, ...o };
}
