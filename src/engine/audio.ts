import type { TrackId } from './types';

/**
 * The music, synthesised on the spot; nothing is sampled. There are four loops, all in A minor
 * and all started at the same moment:
 *   techno  kick, rumble, offbeat hats, a clap and a filtered stab
 *   house   a rounder kick, a bass line under four chords, soft hats and a snap
 *   beat    a standard house beat: kick, clap, open and closed hats, a rim shot and a bass
 *           line, with no chords
 *   dnb     drum and bass: a two-step break, a sub with a growl over it, soft chords
 * The first three run at the venue's tempo, so that one fades into the other in time. `dnb`
 * keeps a tempo of its own, 160 beats a minute.
 * A place names the loop that is heard in it, or none. Each loop has its own fader. After
 * the faders one lowpass sits over the mix and is driven by where the camera is: through a
 * metre of concrete you only hear the low end, on the main floor it is wide open.
 */
let VENUE_BPM = 134;

/** Set before the sound starts: the venue's show runs at this tempo, and the loops without one of their own keep to it. */
export function setTempo(bpm: number) {
  VENUE_BPM = bpm;
}

/** The loops that do not run at the venue's tempo, in beats a minute. */
const OWN_TEMPO: Partial<Record<TrackId, number>> = { dnb: 160 };

/** Beats a minute of a loop, or of the venue where there is none. The lights and the crowd of a place keep to what is heard in it. */
export function tempoOf(track?: TrackId | null) {
  return (track ? OWN_TEMPO[track] : undefined) ?? VENUE_BPM;
}

/** What a loop plays into: a context, the loop's fader, a second of noise, and how long one of its sixteenths lasts in seconds. */
interface Rig {
  ac: BaseAudioContext;
  out: AudioNode;
  noise: AudioBuffer;
  step: number;
}
/** One sixteenth of a loop: `step` counts 0 to 63 over four bars, `t` is when it sounds. */
type Loop = (r: Rig, step: number, t: number) => void;
/** A loop as it runs: its fader, whether it is heard, until when it still has to be played while it fades, and how many sixteenths of it have gone by. */
interface Deck {
  rig: Rig;
  fader: GainNode;
  on: boolean;
  until: number;
  count: number;
}

/** The loop heard where a place does not say. */
const DEFAULT: TrackId = 'techno';
/** Seconds: the time constant of a fade from one loop to the other. */
const FADE = 0.3;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wall: BiquadFilterNode | null = null;
let decks: Partial<Record<TrackId, Deck>> = {};
/** The loop heard now; `undefined` until a place has been set. */
let heard: TrackId | null | undefined;
let muted = false;
let timer = 0;
let startTime = 0;

export function audioTime() {
  return ctx && startTime ? ctx.currentTime - startTime : -1;
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
  if (muted && tone && ctx) tone.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
}

/** The sound of an empty building: ventilation and a mains hum. Its own fader, past the music's. */
let tone: GainNode | null = null;
let toneNow = -1;

/**
 * How much room tone is heard: 0 while the club is open, a little while it is closed. The
 * engine calls this every frame with the level for where the listener stands.
 */
export function setRoomTone(level: number) {
  if (!ctx || !tone) return;
  const target = muted ? 0 : level;
  if (target === toneNow) return;
  toneNow = target;
  tone.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
}

/** How much of the echo is mixed in where a zone does not say. */
const ECHO = 0.22;
let wet: GainNode | null = null;
let echoNow = ECHO;
/** The echo comes back three sixteenths late, at the tempo of the loop that is heard. */
let delay: DelayNode | null = null;
const echoTime = (track?: TrackId | null) => (60 / tempoOf(track)) * 0.75;

/**
 * Where the listener stands. `amount`: 0 = far outside, 1 = on the dancefloor. `echo` is the
 * room: 0 dead, 1 a long tail; the engine's own level if left out. `track` is the loop heard
 * there, `null` where no music carries.
 */
export function setInside(amount: number, loudness: number, echo?: number, track: TrackId | null = DEFAULT) {
  if (!ctx || !wall || !master) return;
  const t = ctx.currentTime;
  const cutoff = 140 + Math.pow(amount, 2.2) * 15000;
  wall.frequency.setTargetAtTime(cutoff, t, 0.25);
  if (!muted) master.gain.setTargetAtTime(0.15 + loudness * 0.7, t, 0.25);
  const e = echo === undefined ? ECHO : echo * 0.5;
  if (wet && e !== echoNow) {
    echoNow = e;
    wet.gain.setTargetAtTime(e, t, 0.4);
  }
  if (track !== heard) {
    heard = track;
    delay?.delayTime.setTargetAtTime(echoTime(track), t, 0.1);
    for (const id of Object.keys(decks) as TrackId[]) {
      const d = decks[id]!;
      const on = id === track;
      d.fader.gain.setTargetAtTime(on ? 1 : 0, t, FADE);
      // a loop that is fading out is played until it can no longer be heard, and then not at all
      if (d.on && !on) d.until = t + FADE * 6;
      d.on = on;
    }
  }
}

function noiseBuffer(ac: BaseAudioContext) {
  const buffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function startAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new AudioContext();
  } catch {
    return;
  }
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.3;
  wall = ctx.createBiquadFilter();
  wall.type = 'lowpass';
  wall.frequency.value = 200;
  wall.Q.value = 0.4;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  // The turbine hall: a long, dark feedback tail
  delay = ctx.createDelay(2);
  delay.delayTime.value = echoTime();
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1800;
  wet = ctx.createGain();
  wet.gain.value = ECHO;
  echoNow = ECHO;
  wall.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);
  comp.connect(delay);
  delay.connect(damp);
  damp.connect(fb);
  fb.connect(delay);
  damp.connect(wet);
  wet.connect(master);

  const noise = noiseBuffer(ctx);
  // The room tone: air moving in ducts (noise, low and soft), a fridge somewhere (a narrow band
  // higher up) and the mains (50 Hz and its octave). Always running, heard only when faded up.
  tone = ctx.createGain();
  tone.gain.value = 0;
  toneNow = -1;
  tone.connect(ctx.destination);
  const air = ctx.createBufferSource();
  air.buffer = noise;
  air.loop = true;
  const duct = ctx.createBiquadFilter();
  duct.type = 'lowpass';
  duct.frequency.value = 190;
  duct.Q.value = 0.3;
  const ductLevel = ctx.createGain();
  ductLevel.gain.value = 0.9;
  air.connect(duct).connect(ductLevel).connect(tone);
  const fridge = ctx.createBiquadFilter();
  fridge.type = 'bandpass';
  fridge.frequency.value = 620;
  fridge.Q.value = 6;
  const fridgeLevel = ctx.createGain();
  fridgeLevel.gain.value = 0.12;
  air.connect(fridge).connect(fridgeLevel).connect(tone);
  air.start();
  for (const [hz, level] of [
    [50, 0.1],
    [100, 0.035],
  ]) {
    const hum = ctx.createOscillator();
    hum.frequency.value = hz;
    const humLevel = ctx.createGain();
    humLevel.gain.value = level;
    hum.connect(humLevel).connect(tone);
    hum.start();
  }
  decks = {};
  heard = undefined;
  for (const id of Object.keys(LOOPS) as TrackId[]) {
    const fader = ctx.createGain();
    fader.gain.value = 0;
    fader.connect(wall);
    decks[id] = { rig: { ac: ctx, out: fader, noise, step: stepOf(id) }, fader, on: false, until: 0, count: 0 };
  }

  startTime = ctx.currentTime + 0.1;
  timer = window.setInterval(schedule, 25);
}

/** Seconds in a sixteenth of a loop. */
const stepOf = (id: TrackId) => 60 / tempoOf(id) / 4;

// Every loop counts its own sixteenths from the one start, so a beat of a loop is always
// `tempoOf` beats a minute after that start, which is what the lights and the crowd go by.
function schedule() {
  if (!ctx) return;
  const ahead = ctx.currentTime + 0.12;
  for (const id of Object.keys(decks) as TrackId[]) {
    const d = decks[id]!;
    for (let t = startTime + d.count * d.rig.step; t < ahead; t = startTime + ++d.count * d.rig.step) {
      if (d.on || t < d.until) LOOPS[id](d.rig, d.count % 64, t);
    }
  }
}

/* ------------------------------------------------------------------ voices ---- */

function noiseHit(r: Rig, t: number, type: BiquadFilterType, freq: number, level: number, decay: number) {
  const src = r.ac.createBufferSource();
  src.buffer = r.noise;
  const f = r.ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = r.ac.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(f);
  f.connect(g);
  g.connect(r.out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.02);
}

/** A sine that drops from `from` to `to` hertz: the body of a kick drum. */
function thump(r: Rig, t: number, from: number, to: number, drop: number, level: number, decay: number) {
  const o = r.ac.createOscillator();
  const g = r.ac.createGain();
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + drop);
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  o.connect(g);
  g.connect(r.out);
  o.start(t);
  o.stop(t + decay + 0.03);
}

/* ------------------------------------------------------------------ techno ---- */

const techno: Loop = (r, i, t) => {
  const s = i % 16;
  const bar = Math.floor(i / 16);
  if (s % 4 === 0) thump(r, t, 150, 44, 0.12, 1.1, 0.42);
  // The rumble: a filtered echo of the kick on the off-sixteenths
  if (s % 4 === 1 || s % 4 === 3) rumble(r, t, s % 4 === 1 ? 0.5 : 0.35);
  if (s % 4 === 2) noiseHit(r, t, 'highpass', 7800, 0.28, 0.06);
  if (s % 2 === 1) noiseHit(r, t, 'highpass', 7800, 0.08, 0.025);
  if (s === 4 || s === 12) clap(r, t);
  if (bar === 3 && (s === 10 || s === 14)) stab(r, t, s === 14 ? 0.7 : 0.4);
  if (bar % 2 === 0 && s === 6) stab(r, t, 0.3);
};

function rumble(r: Rig, t: number, level: number) {
  const o = r.ac.createOscillator();
  o.type = 'triangle';
  const f = r.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 160;
  const g = r.ac.createGain();
  o.frequency.setValueAtTime(49, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level * 0.55, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + r.step * 1.6);
  o.connect(f);
  f.connect(g);
  g.connect(r.out);
  o.start(t);
  o.stop(t + r.step * 2);
}

function clap(r: Rig, t: number) {
  noiseHit(r, t, 'bandpass', 1400, 0.35, 0.02);
  noiseHit(r, t + 0.012, 'bandpass', 1300, 0.3, 0.02);
  noiseHit(r, t + 0.024, 'bandpass', 1200, 0.32, 0.16);
}

function stab(r: Rig, t: number, level: number) {
  const f = r.ac.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 6;
  f.frequency.setValueAtTime(2400, t);
  f.frequency.exponentialRampToValueAtTime(500, t + 0.25);
  const g = r.ac.createGain();
  g.gain.setValueAtTime(level * 0.35, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  f.connect(g);
  g.connect(r.out);
  for (const ratio of [1, 1.19, 1.5]) {
    const o = r.ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 110 * ratio;
    o.connect(f);
    o.start(t);
    o.stop(t + 0.32);
  }
}

/* ------------------------------------------------------------------- house ---- */
// In A minor, the key of the techno loop's stab, so that the two sit together while one
// fades into the other. A chord a bar, voiced round middle C, over its bass note:
// A minor 7, F major 7, D minor 7, E minor 7.
const hz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const CHORDS: { bass: number; notes: number[] }[] = [
  { bass: 33, notes: [57, 60, 64, 67] },
  { bass: 41, notes: [53, 57, 60, 64] },
  { bass: 38, notes: [57, 60, 62, 65] },
  { bass: 40, notes: [55, 59, 62, 64] },
];
/** Where in a bar the chords fall, in sixteenths, with how hard and how long in seconds. */
const KEYS: Record<number, [level: number, length: number]> = { 3: [0.7, 0.3], 6: [1, 0.55], 11: [0.8, 0.3] };

const house: Loop = (r, i, t) => {
  const s = i % 16;
  const bar = Math.floor(i / 16);
  const chord = CHORDS[bar];
  if (s % 4 === 0) thump(r, t, 105, 50, 0.07, 0.7, 0.28);
  // the bass answers the kick on the offbeat, with a short octave before the bar turns
  if (s % 4 === 2) bass(r, t, hz(chord.bass), 0.13, r.step * 1.7);
  if (s === 15) bass(r, t, hz(chord.bass + 12), 0.07, r.step * 0.8);
  if (s % 4 === 2) noiseHit(r, t, 'highpass', 9000, 0.09, 0.09);
  if (s % 2 === 1) noiseHit(r, t, 'highpass', 6500, 0.028, 0.03);
  if (s === 4 || s === 12) snap(r, t);
  const key = KEYS[s] ?? (bar === 3 && s === 14 ? [0.6, 0.3] : null);
  if (key) keys(r, t, chord.notes, key[0], key[1]);
};

function bass(r: Rig, t: number, freq: number, level: number, length: number) {
  const f = r.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(520, t);
  f.frequency.exponentialRampToValueAtTime(170, t + length);
  const g = r.ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.012);
  g.gain.setValueAtTime(level, t + length * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  f.connect(g);
  g.connect(r.out);
  // a sine for the weight, a triangle so that the note is heard on small speakers
  for (const type of ['sine', 'triangle'] as OscillatorType[]) {
    const o = r.ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(f);
    o.start(t);
    o.stop(t + length + 0.03);
  }
}

function snap(r: Rig, t: number) {
  noiseHit(r, t, 'bandpass', 1900, 0.1, 0.015);
  noiseHit(r, t + 0.014, 'bandpass', 1700, 0.13, 0.11);
}

/** A chord on something like an electric piano: saws through a lowpass that closes as the note dies. */
function keys(r: Rig, t: number, notes: number[], level: number, length: number) {
  const f = r.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(1900, t);
  f.frequency.exponentialRampToValueAtTime(480, t + length);
  const g = r.ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level * 0.09, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  f.connect(g);
  g.connect(r.out);
  notes.forEach((note, k) => {
    const o = r.ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = hz(note);
    // a few cents apart, so that the chord is not glassy
    o.detune.value = (k - 1.5) * 4;
    o.connect(f);
    o.start(t);
    o.stop(t + length + 0.03);
  });
}

/* --------------------------------------------------------------- the beat ---- */
// A standard house beat at the venue's tempo, and little else: a kick on every beat, a clap on
// two and four, an open hat on the offbeat with closed hats between, a rim shot off the beat,
// and a bass line of one note a bar. No chords, which is what tells it from the loop above.
/** The bass note of each bar: A, A, C, G. */
const ROOTS = [33, 33, 36, 31];
/** The bass in a bar: the sixteenth a note starts on, how far above the bar's note it is, and how many sixteenths it lasts. */
const GROOVE: [start: number, above: number, length: number][] = [
  [2, 0, 1.7],
  [6, 0, 0.9],
  [7, 12, 0.8],
  [10, 0, 1.7],
  [14, 0, 0.9],
  [15, 7, 0.8],
];

const beat: Loop = (r, i, t) => {
  const s = i % 16;
  const bar = Math.floor(i / 16);
  if (s % 4 === 0) {
    thump(r, t, 140, 48, 0.08, 0.9, 0.3);
    noiseHit(r, t, 'highpass', 3000, 0.05, 0.01);
  }
  if (s === 4 || s === 12) clap(r, t);
  if (s % 4 === 2) noiseHit(r, t, 'highpass', 8000, 0.13, 0.11);
  else noiseHit(r, t, 'highpass', 9500, s % 4 === 0 ? 0.025 : 0.05, 0.022);
  if (s === 7 || s === 10 || (bar % 2 === 1 && s === 15)) rim(r, t, 0.16);
  for (const [start, above, length] of GROOVE) if (s === start) bass(r, t, hz(ROOTS[bar] + above), 0.15, length * r.step);
};

/** A rim shot: a short high tone and a tick of noise. */
function rim(r: Rig, t: number, level: number) {
  thump(r, t, 880, 760, 0.01, level, 0.035);
  noiseHit(r, t, 'bandpass', 2400, level * 0.6, 0.025);
}

/* ------------------------------------------------------------ drum and bass ---- */
/** A snare: a short tone for the body, noise for the wires and a little more for the crack. */
function snare(r: Rig, t: number, level: number) {
  thump(r, t, 240, 175, 0.03, 0.45 * level, 0.09);
  noiseHit(r, t, 'bandpass', 2600, 0.5 * level, 0.13);
  noiseHit(r, t, 'highpass', 5500, 0.2 * level, 0.07);
}

// At a tempo of its own. The two-step: a kick on the one and just after the three, the snare
// on two and four, ghost notes and a fill to turn the loop round. The bass is a sub with a
// growl an octave over it, rolling under held chords: A minor 9 for two bars, F major 9, G 6/9.
const BREAK: { root: number; notes: number[]; kicks: number[]; ghosts: Record<number, number>; turn: number }[] = [
  { root: 33, notes: [57, 60, 64, 67, 71], kicks: [0, 10], ghosts: { 7: 0.18, 9: 0.22 }, turn: 7 },
  { root: 33, notes: [57, 60, 64, 67, 71], kicks: [0, 7, 10], ghosts: { 9: 0.22, 15: 0.3 }, turn: 10 },
  { root: 29, notes: [53, 57, 60, 64, 67], kicks: [0, 10], ghosts: { 7: 0.18, 9: 0.22 }, turn: 7 },
  { root: 31, notes: [55, 59, 62, 64, 69], kicks: [0, 3, 10], ghosts: { 9: 0.22, 14: 0.45, 15: 0.65 }, turn: -3 },
];
/** The bass in a bar: the sixteenth a note starts on and how many it lasts. The last one steps off the root by the bar's `turn`. */
const BASS_LINE: [start: number, length: number][] = [
  [0, 5.5],
  [6, 3.4],
  [10, 1.8],
  [13, 2.6],
];

const dnb: Loop = (r, i, t) => {
  const s = i % 16;
  const b = BREAK[Math.floor(i / 16)];
  if (b.kicks.includes(s)) {
    thump(r, t, 200, 55, 0.045, 0.85, 0.19);
    noiseHit(r, t, 'highpass', 2500, 0.09, 0.012);
  }
  if (s === 4 || s === 12) snare(r, t, 1);
  else if (b.ghosts[s]) snare(r, t, b.ghosts[s]);
  // hats on the eighths, louder off the beat, with a shuffle between them and one left to ring
  if (s % 2 === 0) noiseHit(r, t, 'highpass', 8200, s % 4 === 2 ? 0.1 : 0.06, 0.035);
  else noiseHit(r, t, 'highpass', 9000, 0.03, 0.02);
  if (s % 8 === 6) noiseHit(r, t, 'highpass', 7000, 0.06, 0.13);
  BASS_LINE.forEach(([start, length], k) => {
    if (s !== start) return;
    const note = b.root + (k === BASS_LINE.length - 1 ? b.turn : 0);
    sub(r, t, hz(note), 0.22, length * r.step);
    growl(r, t, hz(note + 12), 0.075, length * r.step);
  });
  if (s === 0) keys(r, t, b.notes, 0.6, r.step * 14);
  if (s === 10) keys(r, t, b.notes, 0.4, r.step * 4);
};

/** The weight of the bass: a sine, held. */
function sub(r: Rig, t: number, freq: number, level: number, length: number) {
  const o = r.ac.createOscillator();
  o.frequency.value = freq;
  const g = r.ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.015);
  g.gain.setValueAtTime(level, t + length * 0.8);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  o.connect(g);
  g.connect(r.out);
  o.start(t);
  o.stop(t + length + 0.03);
}

/** What is heard of the bass on small speakers: two saws that beat against each other, through a lowpass that opens and closes over the note. */
function growl(r: Rig, t: number, freq: number, level: number, length: number) {
  const f = r.ac.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2.5;
  f.frequency.setValueAtTime(260, t);
  f.frequency.linearRampToValueAtTime(950, t + length * 0.5);
  f.frequency.linearRampToValueAtTime(320, t + length);
  const g = r.ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.02);
  g.gain.setValueAtTime(level, t + length * 0.8);
  g.gain.exponentialRampToValueAtTime(0.001, t + length);
  f.connect(g);
  g.connect(r.out);
  for (const cents of [-16, 16]) {
    const o = r.ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = cents;
    o.connect(f);
    o.start(t);
    o.stop(t + length + 0.03);
  }
}

const LOOPS: Record<TrackId, Loop> = { techno, house, beat, dnb };

/* ------------------------------------------------------------- measurement ---- */

/** What the mix is set to at this moment, for the development hook. */
export function audioState() {
  if (!ctx || !wall || !master) return null;
  const faders: Record<string, number> = {};
  for (const id of Object.keys(decks) as TrackId[]) faders[id] = +decks[id]!.fader.gain.value.toFixed(3);
  return { running: ctx.state === 'running', heard: heard ?? null, bpm: tempoOf(heard), faders, echo: +delay!.delayTime.value.toFixed(3), cutoff: Math.round(wall.frequency.value), level: +master.gain.value.toFixed(3), roomTone: +(tone?.gain.value ?? 0).toFixed(4) };
}

/**
 * Four bars of one loop on its own, with no room and no wall, measured: peak and average
 * level, and the average level of what lies below 150 Hz, where a kick hits. For the
 * development hook: it is how one loop is checked against the other without ears.
 */
export async function measureLoop(id: TrackId) {
  const rate = 44100;
  const step = stepOf(id);
  const seconds = 64 * step;
  const measure = async (low: boolean) => {
    const ac = new OfflineAudioContext(1, Math.ceil((seconds + 0.6) * rate), rate);
    let out: AudioNode = ac.destination;
    if (low) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 150;
      // no peak at the cutoff
      f.Q.value = -3;
      f.connect(ac.destination);
      out = f;
    }
    const rig: Rig = { ac, out, noise: noiseBuffer(ac), step };
    for (let i = 0; i < 64; i++) LOOPS[id](rig, i, 0.05 + i * step);
    const data = (await ac.startRendering()).getChannelData(0);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
      sum += data[i] * data[i];
    }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / data.length).toFixed(3) };
  };
  const all = await measure(false);
  return { ...all, lowRms: (await measure(true)).rms };
}

export function stopAudio() {
  window.clearInterval(timer);
  ctx?.close();
  ctx = null;
}
