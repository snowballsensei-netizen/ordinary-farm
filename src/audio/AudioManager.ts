// Tiny Web Audio engine: synth SFX, a looping step-sequencer for music and a
// wind loop for storms. Created lazily on the first user gesture.
import { settings } from '../systems/Settings';
import { SFX } from './sounds';

type MusicMode = 'title' | 'day' | 'night' | null;

interface Timbre { wave: OscillatorType; attack: number; len: number; cutoff: number; detune: number }

interface Song {
  bpm: number;
  root: number;              // midi note
  scale: number[];           // 7-note mode (semitones)
  prog: number[];            // chord root scale degree per bar
  melody: (number | null)[]; // scale index (may exceed 7), 16 steps per bar
  bass: (number | null)[];   // 16 steps: offset in scale steps from chord root
  drums: { kick: number[]; hat: number[]; shaker: number[]; snap: number[] }; // 16-step velocities
  lead: Timbre;
  pad: Timbre | null;
  vol: number;
  swing: number;
}

const MODES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
const DAY_MODES = ['major', 'major', 'lydian', 'mixolydian', 'dorian'];
const NIGHT_MODES = ['dorian', 'minor', 'minor', 'major', 'lydian'];
const PROGS = [
  [0, 4, 5, 3], [0, 3, 4, 0], [0, 5, 3, 4], [0, 3, 0, 4], [5, 3, 0, 4],
  [0, 1, 3, 4], [0, 2, 3, 4], [0, 4, 3, 3], [0, 3, 5, 4], [0, 0, 3, 4],
];

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate one 16-step bar of melody over a chord, as scale indices. */
function melodyBar(r: () => number, chord: number, density: number, prev: number): (number | null)[] {
  const bar: (number | null)[] = new Array(16).fill(null);
  let cur = prev;
  for (let i = 0; i < 16; i++) {
    const strong = i % 4 === 0;
    const p = strong ? density + 0.25 : i % 2 === 0 ? density : density * 0.35;
    if (i > 0 && r() > p) continue;
    if (strong) {
      // land on the chord tone nearest the current note
      const tones = [chord - 3, chord, chord + 2, chord + 4, chord + 7, chord + 9];
      let best = tones[0];
      for (const t of tones) if (Math.abs(t - cur) < Math.abs(best - cur) || (Math.abs(t - cur) === Math.abs(best - cur) && r() < 0.5)) best = t;
      cur = best;
    } else {
      const x = r();
      cur += x < 0.4 ? 1 : x < 0.8 ? -1 : x < 0.9 ? 2 : -2;
    }
    cur = Math.max(-2, Math.min(11, cur));
    bar[i] = cur;
  }
  return bar;
}

function generateSong(seed: number, night: boolean): Song {
  const r = mulberry(seed);
  const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)];
  const scale = MODES[pick(night ? NIGHT_MODES : DAY_MODES)];
  const root = (night ? 52 : 57) + Math.floor(r() * 9);
  const base = pick(PROGS);
  const prog = r() < 0.5 ? [...base, ...base] : [...base, ...pick(PROGS)];
  const density = night ? 0.25 + r() * 0.15 : 0.4 + r() * 0.25;
  // Phrase form: bars 3 and 7 restate the motif from two bars before, transposed.
  const melody: (number | null)[] = [];
  const bars: (number | null)[][] = [];
  let last = 4;
  for (let b = 0; b < prog.length; b++) {
    let bar: (number | null)[];
    if ((b === 2 || b === 6) && bars[b - 2]) {
      const shift = prog[b] - prog[b - 2];
      bar = bars[b - 2].map((n) => (n === null ? null : n + shift));
    } else bar = melodyBar(r, prog[b], density, last);
    if (b % 4 === 3) for (let i = 10; i < 16; i++) bar[i] = null; // breathe at phrase end
    bars.push(bar);
    for (const n of bar) if (n !== null) last = n;
    melody.push(...bar);
  }
  const n = null;
  const bassPatterns: (number | null)[][] = night
    ? [[0, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n], [0, n, n, n, n, n, n, n, 4, n, n, n, n, n, n, n]]
    : [
      [0, n, n, n, 4, n, n, n, 0, n, n, n, 4, n, n, n],
      [0, n, n, 0, n, n, 4, n, 0, n, n, 0, n, n, 2, n],
      [0, n, n, n, n, n, 4, n, 7, n, n, n, 4, n, n, n],
      [0, n, 4, n, 7, n, 4, n, 0, n, 4, n, 7, n, 4, n],
    ];
  const z = () => new Array<number>(16).fill(0);
  const drums = { kick: z(), hat: z(), shaker: z(), snap: z() };
  if (!night || r() < 0.4) {
    const style = Math.floor(r() * 3);
    const snap = r() < 0.8;
    for (let i = 0; i < 16; i++) {
      if (night) { if (i % 8 === 4) drums.shaker[i] = 0.02; continue; }
      if (i % 8 === 0 || (style === 1 && i === 10)) drums.kick[i] = 0.05;
      if (style !== 2 && i % 2 === 0) drums.hat[i] = i % 4 === 0 ? 0.015 : 0.03;
      if (style === 2) drums.shaker[i] = i % 2 === 0 ? 0.025 : 0.012;
      if (snap && i % 8 === 4) drums.snap[i] = 0.03;
    }
  }
  const waves: OscillatorType[] = night ? ['sine', 'triangle', 'sine'] : ['triangle', 'square', 'sawtooth', 'triangle', 'sine'];
  const leadWave = pick(waves);
  const lead: Timbre = {
    wave: leadWave,
    attack: night ? 0.04 + r() * 0.08 : 0.005 + r() * 0.03,
    len: night ? 4 + r() * 3 : 1.5 + r() * 2,
    cutoff: leadWave === 'square' || leadWave === 'sawtooth' ? 900 + r() * 1400 : 0,
    detune: r() < 0.4 ? 6 + r() * 8 : 0,
  };
  const pad: Timbre | null = night || r() < 0.6
    ? { wave: pick<OscillatorType>(['sine', 'triangle', 'sawtooth']), attack: 0.4, len: 16, cutoff: 700, detune: 7 }
    : null;
  return {
    bpm: night ? 56 + Math.floor(r() * 16) : 78 + Math.floor(r() * 30),
    root, scale, prog, melody, bass: pick(bassPatterns), drums, lead, pad,
    vol: night ? 0.05 : 0.055,
    swing: r() < 0.4 ? 0.12 + r() * 0.1 : 0,
  };
}

/** Day + night songs for a seed; night is a calmer variant in a related key. */
function generateSongs(seed: number): { day: Song; night: Song } {
  const day = generateSong(seed, false);
  const night = generateSong((seed ^ 0x9e3779b9) >>> 0, true);
  night.root = day.root - 5;
  return { day, night };
}

const TITLE: Song = {
  bpm: 96, root: 60, scale: [0, 2, 4, 5, 7, 9, 11], prog: [0, 0, 5, 4], vol: 0.07, swing: 0,
  melody: [
    2, null, 3, null, 2, 1, 0, null, 1, null, 2, null, 0, null, null, null,
    -3, null, 0, 1, 2, null, 3, null, 4, null, 3, 2, 1, null, null, null,
    2, null, 3, null, 2, 1, 0, null, 1, null, 2, null, 0, null, null, null,
    -3, null, 0, 1, 2, null, 3, null, 4, null, 3, 2, 1, null, null, null,
  ],
  bass: [0, null, null, null, 4, null, null, null, 0, null, null, null, 4, null, null, null],
  drums: { kick: new Array<number>(16).fill(0), hat: new Array<number>(16).fill(0), shaker: new Array<number>(16).fill(0), snap: new Array<number>(16).fill(0) },
  lead: { wave: 'triangle', attack: 0.02, len: 2.5, cutoff: 0, detune: 0 },
  pad: { wave: 'sine', attack: 0.3, len: 16, cutoff: 800, detune: 5 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const degree = (scale: number[], i: number) => scale[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);

class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private noise!: AudioBuffer;
  private mode: MusicMode = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private wind: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private lastPlay: Record<string, number> = {};
  private songs: Record<Exclude<MusicMode, null>, Song> = { title: TITLE, ...generateSongs(1) };

  /** Deterministically regenerate the day + night songs from a seed. */
  setDayVariation(seed: number): void {
    this.songs = { title: TITLE, ...generateSongs(seed >>> 0) };
    if (this.mode !== 'title') this.step = 0;
  }

  /** Call from any user gesture; safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.sfxGain = c.createGain();
    this.musicGain = c.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    if (this.mode) this.startSequencer();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    this.sfxGain.gain.value = settings.sfx;
    this.musicGain.gain.value = settings.music;
  }

  play(name: string): void {
    if (!this.ctx || settings.sfx <= 0) return;
    const now = performance.now();
    if (now - (this.lastPlay[name] ?? 0) < 30) return; // de-dupe spam
    this.lastPlay[name] = now;
    const fn = SFX[name];
    if (fn) fn(this.ctx, this.sfxGain, this.noise);
  }

  setMusic(mode: MusicMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.step = 0;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (mode && this.ctx) this.startSequencer();
  }

  private startSequencer(): void {
    if (!this.ctx || this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule(): void {
    if (!this.ctx || !this.mode) return;
    const song = this.songs[this.mode];
    const sixteenth = 60 / song.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      const s = this.step;
      const i16 = s % 16;
      const t = this.nextTime + (i16 % 2 === 1 ? song.swing * sixteenth : 0);
      const chord = song.prog[Math.floor(s / 16) % song.prog.length];
      const L = song.lead;
      const m = song.melody[s % song.melody.length];
      if (m !== null) {
        const f = midi(song.root + 12 + degree(song.scale, m));
        this.note(L.wave, f, t, sixteenth * L.len, song.vol, L.attack, L.cutoff);
        if (L.detune) this.note(L.wave, f, t, sixteenth * L.len, song.vol * 0.5, L.attack, L.cutoff, L.detune);
      }
      const b = song.bass[i16];
      if (b !== null) this.note('triangle', midi(song.root - 12 + degree(song.scale, chord + b)), t, sixteenth * 3, song.vol * 1.5, 0.01, 600);
      if (i16 === 0 && song.pad) {
        const P = song.pad;
        for (const k of [0, 2, 4]) {
          this.note(P.wave, midi(song.root + degree(song.scale, chord + k)), t, sixteenth * P.len, song.vol * 0.35, P.attack, P.cutoff, k === 2 ? P.detune : -P.detune);
        }
      }
      const d = song.drums;
      if (d.kick[i16]) this.drum('kick', t, d.kick[i16]);
      if (d.hat[i16]) this.drum('hat', t, d.hat[i16]);
      if (d.shaker[i16]) this.drum('shaker', t, d.shaker[i16]);
      if (d.snap[i16]) this.drum('snap', t, d.snap[i16]);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  private note(type: OscillatorType, f: number, t: number, dur: number, vol: number, attack = 0.02, cutoff = 0, detune = 0): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (cutoff > 0) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cutoff;
      o.connect(lp).connect(g);
    } else o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private drum(kind: 'kick' | 'hat' | 'shaker' | 'snap', t: number, vol: number): void {
    const c = this.ctx!;
    if (kind === 'kick') {
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(vol * 2.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(this.musicGain);
      o.start(t);
      o.stop(t + 0.25);
      return;
    }
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = kind === 'snap' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 'hat' ? 7000 : kind === 'shaker' ? 5000 : 1800;
    const g = c.createGain();
    const d = kind === 'hat' ? 0.04 : kind === 'shaker' ? 0.07 : 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * (kind === 'snap' ? 1.6 : 0.8), t + (kind === 'shaker' ? 0.02 : 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(this.musicGain);
    s.start(t, Math.random());
    s.stop(t + d + 0.02);
  }

  /** Looping filtered-noise wind; intensity 0 stops it. */
  setWind(intensity: number): void {
    if (!this.ctx) return;
    if (intensity <= 0) {
      if (this.wind) {
        const w = this.wind;
        w.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
        setTimeout(() => w.src.stop(), 1500);
        this.wind = null;
      }
      return;
    }
    if (!this.wind) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 500;
      f.Q.value = 2;
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 0.23;
      lg.gain.value = 250;
      lfo.connect(lg).connect(f.frequency);
      lfo.start();
      src.onended = () => lfo.stop();
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(f).connect(gain).connect(this.sfxGain);
      src.start();
      this.wind = { src, gain };
    }
    this.wind.gain.gain.setTargetAtTime(Math.min(0.6, intensity * 0.6), this.ctx.currentTime, 0.2);
  }
}

export const audio = new AudioManager();
