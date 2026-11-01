// The clock, hourly ticks and the day/night colour grade.
import { DAY_END, GAME_MIN_PER_SEC } from '../config/constants';
import { mix } from '../art/draw';
import { hexNum } from '../art/palette';
import type { GameContext } from './GameContext';

// Warm-to-cool grade (MULTIPLY): peach dawn, white noon, amber afternoon,
// pink/orange evening, purple dusk, deep blue night.
const KEYS: [number, string][] = [
  [360, '#ffc8a0'],  // 6:00 soft peach
  [420, '#ffdcb4'],  // 7:00 warm gold
  [510, '#fff2e2'],  // 8:30 fading warmth
  [600, '#ffffff'],  // 10:00 neutral bright
  [900, '#ffffff'],  // 15:00
  [990, '#ffeccc'],  // 16:30 warm amber
  [1080, '#ffcf94'], // 18:00 deep amber
  [1140, '#f8a488'], // 19:00 pink/orange
  [1200, '#c88aa8'], // 20:00 rose dusk
  [1250, '#8a7cc4'], // 20:50 purple/blue
  [1320, '#4a5aa4'], // 22:00 night blue
  [1400, '#34428a'], // 23:20 deep cool blue
  [1560, '#2e3a80'], // 2:00
];

export class TimeSystem {
  /** Multiplier for debugging/fast-forward. */
  scale = 1;

  constructor(private ctx: GameContext) {}

  update(dt: number): void {
    const s = this.ctx.state;
    const before = Math.floor(s.minutes / 60);
    s.minutes += dt * GAME_MIN_PER_SEC * this.scale;
    const after = Math.floor(s.minutes / 60);
    if (after !== before) this.ctx.chaos.onHour(after);
    if (s.minutes >= DAY_END) {
      s.minutes = DAY_END;
      this.ctx.scene.passOut();
    }
  }

  advance(mins: number): void {
    const s = this.ctx.state;
    const before = Math.floor(s.minutes / 60);
    s.minutes = Math.min(DAY_END - 1, s.minutes + mins);
    for (let h = before + 1; h <= Math.floor(s.minutes / 60); h++) this.ctx.chaos.onHour(h);
  }

  label(): string {
    const m = Math.floor(this.ctx.state.minutes / 10) * 10;
    let h = Math.floor(m / 60) % 24;
    const mm = String(m % 60).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mm} ${ampm}`;
  }

  /** Returns the multiply tint and a 0..1 darkness value for window glows. */
  tint(): { color: number; darkness: number } {
    const m = this.ctx.state.minutes;
    let col = KEYS[KEYS.length - 1][1];
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [m0, c0] = KEYS[i];
      const [m1, c1] = KEYS[i + 1];
      if (m >= m0 && m <= m1) {
        col = mix(c0, c1, (m - m0) / (m1 - m0));
        break;
      }
    }
    col = this.ctx.weather.gradeTint(col);
    const darkness = Math.max(0, Math.min(1, (m - 1140) / 220));
    return { color: hexNum(col), darkness };
  }

  isNight(): boolean {
    return this.ctx.state.minutes >= 1200;
  }
}
