// Synth recipes for every sound effect. Each one schedules Web Audio nodes
// on the given context and output: filtered noise, envelopes, layered
// oscillators and simple formant filters. Unknown names are ignored by
// AudioManager.play.

export type SfxFn = (ctx: AudioContext, out: AudioNode, noise: AudioBuffer) => void;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Pitched oscillator with exponential pitch sweep and a fast-attack envelope. */
function tone(
  ctx: AudioContext, out: AudioNode, type: OscillatorType,
  f0: number, f1: number, dur: number, vol = 0.3, delay = 0, attack = 0.01,
): void {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

interface NoiseOpts {
  dur: number; freq: number; vol?: number; q?: number; delay?: number;
  type?: BiquadFilterType; freqEnd?: number; attack?: number;
  wobble?: { rate: number; depth: number };
}

/** Filtered noise burst, optional filter sweep and LFO wobble. */
function noiseBurst(ctx: AudioContext, out: AudioNode, noise: AudioBuffer, o: NoiseOpts): void {
  const t = ctx.currentTime + (o.delay ?? 0);
  const s = ctx.createBufferSource();
  s.buffer = noise;
  s.playbackRate.value = rnd(0.9, 1.1);
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq, t);
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  const a = o.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  if (o.wobble) {
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = o.wobble.rate;
    lg.gain.value = o.wobble.depth;
    l.connect(lg).connect(f.frequency);
    l.start(t);
    l.stop(t + o.dur + 0.05);
  }
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 1.2);
  s.stop(t + o.dur + 0.05);
}

/** Water droplet: sine with a fast upward chirp (the classic "plip"). */
function drop(ctx: AudioContext, out: AudioNode, f: number, vol: number, delay: number): void {
  tone(ctx, out, 'sine', f, f * rnd(1.8, 2.6), rnd(0.03, 0.06), vol, delay, 0.003);
}

/** Bubble: resonant upward sweep with slight decay, lower than a droplet. */
function bubble(ctx: AudioContext, out: AudioNode, f: number, vol: number, delay: number): void {
  tone(ctx, out, 'sine', f, f * rnd(1.3, 1.7), rnd(0.05, 0.1), vol, delay, 0.005);
}

/** Voice through parallel formant bandpasses: source osc + vibrato + pitch contour. */
function voice(
  ctx: AudioContext, out: AudioNode,
  o: {
    type?: OscillatorType; pitch: [number, number][]; formants: [number, number, number][]; // [freq, q, gain]
    dur: number; vol: number; delay?: number; vib?: [number, number]; attack?: number; noise?: AudioBuffer; breath?: number;
    formantEnd?: number[];
  },
): void {
  const t = ctx.currentTime + (o.delay ?? 0);
  const src = ctx.createOscillator();
  src.type = o.type ?? 'sawtooth';
  src.frequency.setValueAtTime(o.pitch[0][1], t);
  for (const [at, f] of o.pitch) src.frequency.linearRampToValueAtTime(f, t + at * o.dur);
  if (o.vib) {
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = o.vib[0];
    lg.gain.value = o.vib[1];
    l.connect(lg).connect(src.frequency);
    l.start(t);
    l.stop(t + o.dur + 0.05);
  }
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(o.vol, t + (o.attack ?? 0.03));
  env.gain.setValueAtTime(o.vol, t + o.dur * 0.7);
  env.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  env.connect(out);
  o.formants.forEach(([f, q, gn], i) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(f, t);
    if (o.formantEnd) bp.frequency.linearRampToValueAtTime(f * o.formantEnd[i], t + o.dur);
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gn;
    src.connect(bp).connect(g).connect(env);
  });
  src.start(t);
  src.stop(t + o.dur + 0.05);
  if (o.noise && o.breath) noiseBurst(ctx, out, o.noise, { dur: o.dur, freq: 2500, q: 0.8, vol: o.breath, delay: o.delay, attack: 0.03 });
}

/** Inharmonic partials for metallic strikes. */
function metal(ctx: AudioContext, out: AudioNode, base: number, dur: number, vol: number, delay = 0): void {
  [1, 2.76, 5.4, 8.93].forEach((r, i) => tone(ctx, out, 'sine', base * r, base * r * 0.995, dur / (1 + i * 0.5), vol / (1 + i), delay, 0.002));
}

export const SFX: Record<string, SfxFn> = {
  tick: (c, o) => tone(c, o, 'square', 880, 1200, 0.04, 0.05),
  click: (c, o, n) => {
    tone(c, o, 'triangle', 1400, 900, 0.035, 0.12, 0, 0.002);
    noiseBurst(c, o, n, { dur: 0.02, freq: 4000, q: 2, vol: 0.06 });
  },
  step: (c, o, n) => {
    noiseBurst(c, o, n, { dur: rnd(0.06, 0.09), freq: rnd(500, 800), q: 1.2, vol: 0.07, type: 'lowpass' });
    noiseBurst(c, o, n, { dur: 0.04, freq: 2200, q: 3, vol: 0.02, delay: 0.01 });
  },
  sprint_step: (c, o, n) => {
    noiseBurst(c, o, n, { dur: 0.07, freq: rnd(700, 1000), q: 1, vol: 0.11, type: 'lowpass' });
    noiseBurst(c, o, n, { dur: 0.05, freq: 2800, q: 2, vol: 0.04, delay: 0.015 });
    tone(c, o, 'sine', 120, 60, 0.05, 0.06);
  },
  hoe: (c, o, n) => {
    // Thud of the blade then crunchy, gritty soil.
    tone(c, o, 'sine', 140, 55, 0.12, 0.3);
    noiseBurst(c, o, n, { dur: 0.18, freq: 900, freqEnd: 300, q: 0.9, vol: 0.35 });
    for (let i = 0; i < 6; i++) noiseBurst(c, o, n, { dur: 0.025, freq: rnd(1500, 4000), q: 4, vol: rnd(0.05, 0.12), delay: 0.02 + i * rnd(0.015, 0.03) });
  },
  water: (c, o, n) => SFX.water_pour(c, o, n),
  water_pour: (c, o, n) => {
    // Pouring stream: wobbling bandpass noise + low rumble + droplet plips.
    noiseBurst(c, o, n, { dur: 0.7, freq: 1600, q: 2.5, vol: 0.18, attack: 0.05, wobble: { rate: rnd(9, 14), depth: 600 } });
    noiseBurst(c, o, n, { dur: 0.6, freq: 500, q: 1, vol: 0.1, attack: 0.06, type: 'lowpass', wobble: { rate: 6, depth: 150 } });
    noiseBurst(c, o, n, { dur: 0.5, freq: 5000, q: 1, vol: 0.04, attack: 0.05, type: 'highpass' });
    for (let i = 0; i < 9; i++) drop(c, o, rnd(900, 2200), rnd(0.04, 0.09), rnd(0.05, 0.75));
  },
  water_fill: (c, o, n) => {
    // Bubbling glug into a can: rising pitch as it fills.
    noiseBurst(c, o, n, { dur: 1.1, freq: 700, freqEnd: 1400, q: 3, vol: 0.12, attack: 0.08, wobble: { rate: 7, depth: 250 } });
    for (let i = 0; i < 7; i++) {
      const p = i / 7;
      tone(c, o, 'sine', 180 + p * 200, 110 + p * 150, 0.09, 0.14, i * 0.14 + rnd(0, 0.03), 0.01); // glug
    }
    for (let i = 0; i < 14; i++) bubble(c, o, rnd(300, 700) * (1 + (i / 14) * 0.8), rnd(0.05, 0.1), rnd(0, 1.05));
  },
  splash: (c, o, n) => {
    tone(c, o, 'sine', 220, 70, 0.15, 0.25);
    noiseBurst(c, o, n, { dur: 0.5, freq: 2500, freqEnd: 800, q: 0.8, vol: 0.35, attack: 0.005 });
    noiseBurst(c, o, n, { dur: 0.3, freq: 600, q: 1, vol: 0.2, type: 'lowpass' });
    for (let i = 0; i < 10; i++) drop(c, o, rnd(800, 2500), rnd(0.04, 0.1), rnd(0.08, 0.6));
  },
  bubble: (c, o) => {
    for (let i = 0; i < 4; i++) bubble(c, o, rnd(350, 800), rnd(0.05, 0.1), i * rnd(0.08, 0.2));
  },
  chop: (c, o, n) => {
    // Woody thunk: resonant low body + sharp crack.
    tone(c, o, 'sine', 260, 150, 0.14, 0.35, 0, 0.002);
    tone(c, o, 'triangle', 520, 300, 0.07, 0.12, 0, 0.002);
    noiseBurst(c, o, n, { dur: 0.05, freq: 2200, q: 1.5, vol: 0.3 });
    noiseBurst(c, o, n, { dur: 0.12, freq: 400, q: 6, vol: 0.2 });
  },
  rock: (c, o, n) => {
    // Pickaxe on stone: metallic clink + gravelly crumble.
    metal(c, o, rnd(1150, 1350), 0.35, 0.12);
    noiseBurst(c, o, n, { dur: 0.04, freq: 5000, q: 2, vol: 0.25 });
    for (let i = 0; i < 5; i++) noiseBurst(c, o, n, { dur: 0.03, freq: rnd(1200, 3000), q: 5, vol: 0.06, delay: 0.04 + i * 0.03 });
  },
  hammer: (c, o, n) => {
    for (const d of [0, 0.14]) {
      tone(c, o, 'sine', 180, 90, 0.08, 0.25, d, 0.002);
      noiseBurst(c, o, n, { dur: 0.04, freq: 1800, q: 2, vol: 0.2, delay: d });
      metal(c, o, 900, 0.15, 0.05, d);
    }
  },
  door: (c, o, n) => {
    // Creak + latch thud.
    voice(c, o, { type: 'sawtooth', pitch: [[0, 90], [0.5, 140], [1, 110]], formants: [[800, 8, 1], [1800, 10, 0.6]], dur: 0.5, vol: 0.06, vib: [23, 15] });
    tone(c, o, 'sine', 120, 60, 0.12, 0.3, 0.5, 0.002);
    noiseBurst(c, o, n, { dur: 0.06, freq: 900, q: 1, vol: 0.2, delay: 0.5 });
  },
  pop: (c, o) => {
    tone(c, o, 'sine', 300, 1000, 0.08, 0.3, 0, 0.003);
    tone(c, o, 'triangle', 1200, 1600, 0.05, 0.08, 0.02);
  },
  pickup: (c, o) => {
    tone(c, o, 'triangle', 660, 990, 0.08, 0.18);
    tone(c, o, 'sine', 990, 1320, 0.1, 0.12, 0.06);
  },
  plant: (c, o, n) => {
    noiseBurst(c, o, n, { dur: 0.1, freq: 700, q: 1, vol: 0.15, type: 'lowpass' });
    tone(c, o, 'triangle', 300, 500, 0.08, 0.12, 0.05);
  },
  coin: (c, o) => {
    // Bright bell-like two-note ding with shimmer partials.
    for (const [f, d] of [[1319, 0], [1976, 0.07]] as const) {
      tone(c, o, 'sine', f, f, 0.45, 0.12, d, 0.002);
      tone(c, o, 'sine', f * 2.01, f * 2.01, 0.2, 0.04, d, 0.002);
      tone(c, o, 'square', f, f, 0.05, 0.03, d, 0.002);
    }
  },
  cluck: (c, o) => {
    for (let i = 0; i < 3; i++) {
      voice(c, o, {
        type: 'sawtooth', pitch: [[0, rnd(650, 750)], [0.4, 900], [1, 500]],
        formants: [[1100, 4, 1], [2600, 6, 0.6]], dur: 0.07, vol: 0.18, delay: i * rnd(0.09, 0.13), attack: 0.005,
      });
    }
  },
  moo: (c, o, n) => {
    voice(c, o, {
      type: 'sawtooth', pitch: [[0, 105], [0.2, 125], [0.7, 118], [1, 85]],
      formants: [[300, 4, 1], [700, 6, 0.4], [2400, 8, 0.1]], formantEnd: [1.6, 1.4, 1],
      dur: 1.1, vol: 0.5, vib: [5, 2], attack: 0.12, noise: n, breath: 0.02,
    });
  },
  oink: (c, o, n) => {
    for (const d of [0, 0.2]) {
      voice(c, o, {
        type: 'sawtooth', pitch: [[0, 220], [0.3, 260], [1, 170]],
        formants: [[600, 5, 1], [1200, 6, 0.5]], dur: 0.15, vol: 0.4, delay: d, vib: [45, 30], attack: 0.01,
      });
      noiseBurst(c, o, n, { dur: 0.12, freq: 500, q: 3, vol: 0.08, delay: d, wobble: { rate: 45, depth: 150 } });
    }
  },
  baa: (c, o, n) => {
    voice(c, o, {
      type: 'sawtooth', pitch: [[0, 330], [0.2, 370], [1, 320]],
      formants: [[750, 6, 1], [1250, 7, 0.6], [2600, 8, 0.2]],
      dur: 0.7, vol: 0.35, vib: [8.5, 25], attack: 0.04, noise: n, breath: 0.03,
    });
  },
  bleat: (c, o, n) => {
    voice(c, o, {
      type: 'sawtooth', pitch: [[0, 480], [0.3, 540], [1, 430]],
      formants: [[900, 6, 1], [1700, 7, 0.6], [3000, 8, 0.2]],
      dur: 0.5, vol: 0.3, vib: [11, 40], attack: 0.02, noise: n, breath: 0.03,
    });
  },
  caw: (c, o, n) => {
    for (const d of [0, 0.28]) {
      voice(c, o, {
        type: 'sawtooth', pitch: [[0, 700], [0.3, 760], [1, 520]],
        formants: [[1200, 3, 1], [2200, 4, 0.7]], dur: 0.22, vol: 0.3, delay: d, vib: [70, 40], attack: 0.01,
        noise: n, breath: 0.05,
      });
    }
  },
  honk: (c, o, n) => {
    for (const d of [0, 0.22]) {
      voice(c, o, {
        type: 'square', pitch: [[0, 420], [0.4, 460], [1, 380]],
        formants: [[900, 4, 1], [1800, 5, 0.6]], dur: 0.18, vol: 0.3, delay: d, attack: 0.01,
        noise: n, breath: 0.04,
      });
    }
  },
  buzz: (c, o) => {
    voice(c, o, {
      type: 'sawtooth', pitch: [[0, 210], [0.3, 240], [0.6, 200], [1, 225]],
      formants: [[600, 2, 1], [2000, 3, 0.5]], dur: 0.8, vol: 0.12, vib: [13, 12], attack: 0.1,
    });
  },
  bonk: (c, o, n) => {
    tone(c, o, 'sine', 300, 80, 0.15, 0.3, 0, 0.002);
    noiseBurst(c, o, n, { dur: 0.05, freq: 1000, q: 1, vol: 0.2 });
  },
  heart: (c, o) => {
    tone(c, o, 'sine', 660, 660, 0.15, 0.18);
    tone(c, o, 'sine', 880, 880, 0.25, 0.18, 0.1);
  },
  alarm: (c, o) => {
    for (let i = 0; i < 3; i++) {
      tone(c, o, 'square', 740, 740, 0.12, 0.12, i * 0.2);
      tone(c, o, 'square', 554, 554, 0.08, 0.12, i * 0.2 + 0.1);
    }
  },
  hint: (c, o) => {
    tone(c, o, 'sine', 440, 420, 0.4, 0.12);
    tone(c, o, 'sine', 466, 440, 0.5, 0.1, 0.25);
  },
  boom: (c, o, n) => SFX.thunder(c, o, n),
  thunder: (c, o, n) => {
    // Sharp crack then long, rolling lowpassed rumble.
    noiseBurst(c, o, n, { dur: 0.25, freq: 3000, freqEnd: 600, q: 0.6, vol: 0.45, attack: 0.003 });
    tone(c, o, 'sine', 90, 30, 1.2, 0.45);
    for (let i = 0; i < 4; i++) {
      noiseBurst(c, o, n, { dur: rnd(1, 2), freq: rnd(120, 260), freqEnd: 60, q: 0.7, vol: rnd(0.35, 0.6), type: 'lowpass', delay: i * rnd(0.2, 0.5), attack: 0.08 });
    }
  },
  hail: (c, o, n) => {
    noiseBurst(c, o, n, { dur: 0.03, freq: rnd(3000, 5000), q: 5, vol: 0.15 });
    tone(c, o, 'sine', rnd(2500, 3500), 2000, 0.03, 0.04, 0, 0.002);
  },
  rain: (c, o, n) => {
    noiseBurst(c, o, n, { dur: 1.5, freq: 3000, q: 0.4, vol: 0.1, attack: 0.3 });
    for (let i = 0; i < 12; i++) drop(c, o, rnd(1500, 3500), rnd(0.02, 0.05), rnd(0, 1.4));
  },
  wind: (c, o, n) => {
    noiseBurst(c, o, n, { dur: 2, freq: 400, freqEnd: 700, q: 3, vol: 0.2, attack: 0.6, wobble: { rate: 0.7, depth: 200 } });
  },
  error: (c, o) => {
    tone(c, o, 'square', 200, 150, 0.12, 0.08);
    tone(c, o, 'square', 150, 110, 0.15, 0.08, 0.12);
  },
  sleep: (c, o) => {
    [523, 440, 349, 262].forEach((f, i) => tone(c, o, 'sine', f, f, 0.5, 0.13, i * 0.25, 0.05));
  },
  shop: (c, o) => {
    [523, 659, 784].forEach((f, i) => tone(c, o, 'triangle', f, f, 0.18, 0.14, i * 0.08));
  },
};
