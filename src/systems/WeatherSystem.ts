// Daily weather plus temporary chaos overlays (hail, ominous green sky, wind).
import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W } from '../config/constants';
import { mix } from '../art/draw';
import { audio } from '../audio/AudioManager';
import { Ground } from '../world/types';
import type { GameContext } from './GameContext';

interface Particle {
  x: number;
  y: number;
  v: number;
  d: number;
}

export class WeatherSystem {
  ominous = 0;      // 0..1 green tint before tornadoes
  hail = false;
  wind = 0;
  private g: Phaser.GameObjects.Graphics;
  private parts: Particle[] = [];
  private wetTimer = 0;
  private flash = 0;

  constructor(private ctx: GameContext) {
    this.g = ctx.scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.weather);
    for (let i = 0; i < 90; i++) this.parts.push(this.spawn(true));
  }

  get today(): string {
    return this.ctx.state.weather;
  }

  current(): string {
    if (this.hail) return 'hail';
    if (this.ominous > 0.3) return 'ominous';
    if (this.wind > 0.3) return 'windy';
    return this.today;
  }

  icon(): string {
    return `w_${this.current()}`;
  }

  roll(season: number): string {
    const r = this.ctx.rng.next();
    if (season === 3) return r < 0.4 ? 'snow' : r < 0.6 ? 'cloudy' : 'sun';
    const rain = season === 1 ? 0.1 : 0.25;
    return r < rain ? 'rain' : r < rain + 0.17 ? 'cloudy' : 'sun';
  }

  isRaining(): boolean {
    return this.today === 'rain';
  }

  /** Called each morning: rain waters every tilled tile. */
  morningWater(): void {
    if (!this.isRaining()) return;
    this.ctx.grid.forEachTile((t, x, y) => {
      if (t.g === Ground.TILLED && !t.wet) {
        t.wet = true;
        this.ctx.view.refreshTile(x, y);
      }
    });
  }

  gradeTint(col: string): string {
    if (this.ominous > 0) col = mix(col, '#a8e8a0', this.ominous * 0.55);
    if (this.hail) col = mix(col, '#a8b0c8', 0.4);
    else if (this.today === 'rain') col = mix(col, '#c0c8dc', 0.35);
    else if (this.today === 'cloudy') col = mix(col, '#e0e0e8', 0.25);
    if (this.flash > 0) col = mix(col, '#ffffff', this.flash);
    return col;
  }

  lightning(): void {
    this.flash = 0.9;
    this.ctx.scene.cameras.main.shake(200, 0.004);
  }

  private spawn(anywhere: boolean): Particle {
    return {
      x: Math.random() * (GAME_W + 60) - 30,
      y: anywhere ? Math.random() * GAME_H : -10 - Math.random() * 40,
      v: 0.7 + Math.random() * 0.6,
      d: Math.random(),
    };
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 2);
    const mode = this.hail ? 'hail' : this.today;
    this.g.clear();
    if (this.isRaining()) {
      this.wetTimer -= dt;
      if (this.wetTimer <= 0) {
        this.wetTimer = 2;
        this.morningWater();
      }
    }
    if (mode !== 'rain' && mode !== 'snow' && mode !== 'hail' && this.wind < 0.2) return;
    for (const p of this.parts) {
      if (mode === 'rain') {
        p.y += 260 * p.v * dt;
        p.x -= 60 * dt;
        this.g.lineStyle(1, 0xa8d4ff, 0.55);
        this.g.lineBetween(p.x, p.y, p.x + 2, p.y - 6);
      } else if (mode === 'snow') {
        p.y += 30 * p.v * dt;
        p.x += Math.sin(p.y / 20 + p.d * 6) * 12 * dt;
        this.g.fillStyle(0xffffff, 0.85);
        this.g.fillRect(p.x, p.y, 2, 2);
      } else if (mode === 'hail') {
        p.y += 320 * p.v * dt;
        p.x -= 30 * dt;
        this.g.fillStyle(0xe8f4ff, 0.95);
        this.g.fillRect(p.x, p.y, 2, 2);
        if (p.y > GAME_H * (0.4 + p.d * 0.6) && Math.random() < 0.05) audio.play('hail');
      } else {
        // wind streaks
        p.x += 420 * p.v * dt;
        this.g.lineStyle(1, 0xffffff, 0.25 * this.wind);
        this.g.lineBetween(p.x, p.y, p.x - 14, p.y);
        if (p.x > GAME_W + 20) {
          p.x = -20;
          p.y = Math.random() * GAME_H;
        }
        continue;
      }
      if (p.y > GAME_H + 10 || p.x < -40 || p.x > GAME_W + 40) Object.assign(p, this.spawn(false));
    }
  }
}
