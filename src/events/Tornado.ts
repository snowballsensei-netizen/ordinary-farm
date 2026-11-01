// A tornado wanders across the farm, scattering debris, items and chickens
// and knocking fences down. It zigzags hard and lingers longer on later days.
import Phaser from 'phaser';
import { ANIMALS } from '../config/animals';
import { MAP_H, MAP_W, TILE } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { toTile } from '../systems/FarmGrid';
import { ChaosEvent } from './ChaosEvent';
import { randomOpenTile, tc } from './helpers';

const CROP_BASE = 10;
const RADIUS = 26;

export class Tornado extends ChaosEvent {
  readonly id = 'tornado';
  sx = 0;
  sy = 0;
  ex = 0;
  ey = 0;
  dur = 34;
  x = 0;
  y = 0;
  crops = 0;
  fences = 0;
  flung = 0;
  private sprite?: Phaser.GameObjects.Sprite;
  private tick = 0;
  private hitFence = new Map<string, number>();
  private whooshed = false;

  start(): void {
    const r = this.ctx.chaosRng;
    const leftToRight = r.chance(0.5);
    this.sx = leftToRight ? -20 : MAP_W * TILE + 20;
    this.ex = leftToRight ? MAP_W * TILE + 20 : -20;
    this.sy = r.int(8, 34) * TILE;
    this.ey = r.int(8, 34) * TILE;
    this.dur = 40 + Math.min(16, Math.floor(this.ctx.state.absDay / 2));
    this.makeSprite();
  }

  private makeSprite(): void {
    this.ctx.weather.wind = 1;
    this.sprite = this.ctx.scene.add.sprite(this.sx, this.sy, 'tornado').setOrigin(0.5, 1).play('tornado_spin');
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const k = Math.min(1, this.t / this.dur);
    this.x = this.sx + (this.ex - this.sx) * k + Math.sin(this.t * 0.9) * 80 + Math.sin(this.t * 2.3) * 18;
    this.y = this.sy + (this.ey - this.sy) * k + Math.sin(this.t * 0.6 + 1) * 100 + Math.cos(this.t * 1.7) * 16;
    this.y = Phaser.Math.Clamp(this.y, 4 * TILE, (MAP_H - 4) * TILE);
    this.sprite?.setPosition(this.x, this.y).setDepth(this.y);

    const pd = ctx.player.distTo(this.x, this.y);
    audio.setWind(Math.max(0.15, 1 - pd / 350));
    if (pd < 200) ctx.scene.cameras.main.shake(100, 0.002 * (1 - pd / 200));

    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.2;
    if (this.x < 0 || this.x > MAP_W * TILE) return;
    const mult = ctx.upg.lightning_rod ? 0.5 : 1;
    const r = ctx.chaosRng;
    const cx = toTile(this.x);
    const cy = toTile(this.y - 4);
    for (let ty = cy - 1; ty <= cy + 1; ty++) {
      for (let tx = cx - 1; tx <= cx + 1; tx++) {
        const t = ctx.grid.tile(tx, ty);
        if (!t || Math.hypot(tc(tx) - this.x, tc(ty) - this.y) > RADIUS) continue;
        if (t.crop && !t.crop.dead && this.crops < this.cap(CROP_BASE) && r.chance(0.24 * mult)) {
          ctx.crops.destroy(tx, ty);
          this.crops++;
          ctx.view.burst(tc(tx), tc(ty), 'leafp', 6, 18);
        }
        if (t.obj && ['rock', 'branch', 'weed', 'stump'].includes(t.obj.type) && r.chance(0.35)) {
          const obj = t.obj;
          const dest = randomOpenTile(ctx, (x, y) => !ctx.grid.tile(x, y)!.crop && Math.abs(x - tx) + Math.abs(y - ty) > 3, {
            x0: Math.max(3, tx - 7), y0: Math.max(3, ty - 7), x1: Math.min(MAP_W - 4, tx + 7), y1: Math.min(MAP_H - 4, ty + 7),
          });
          t.obj = undefined;
          ctx.view.refreshTile(tx, ty);
          if (dest && !ctx.grid.fence(dest.x, dest.y)) {
            ctx.grid.tile(dest.x, dest.y)!.obj = obj;
            ctx.view.refreshTile(dest.x, dest.y);
          }
        }
        const f = ctx.grid.fence(tx, ty);
        const key = `${tx},${ty}`;
        if (f && f.hp > 0 && (this.hitFence.get(key) ?? -9) < this.t - 0.8) {
          this.hitFence.set(key, this.t);
          if (ctx.grid.damageFence(f, 55 * mult)) {
            this.fences++;
            this.progress(`The tornado smashed ${this.fences} fence piece${this.fences === 1 ? '' : 's'}!`, 0xff9a6a);
          }
          ctx.view.burst(tc(tx), tc(ty), 'clod', 4, 12, 400, 0xc98f52);
        }
      }
    }
    for (const a of ctx.animals.list) {
      if (a.asleep || a.onRoof || Math.hypot(a.x - this.x, a.y - this.y) > RADIUS + 4) continue;
      if (ctx.upg.storm_cellar) continue;
      if (!ANIMALS[a.type].big) {
        const dest = randomOpenTile(ctx, () => true, {
          x0: Math.max(3, toTile(a.x) - 9), y0: Math.max(3, toTile(a.y) - 9),
          x1: Math.min(MAP_W - 4, toTile(a.x) + 9), y1: Math.min(MAP_H - 4, toTile(a.y) + 9),
        });
        if (dest) {
          ctx.animals.release(a.id);
          ctx.animals.place(a, tc(dest.x), tc(dest.y) + 6);
          ctx.view.burst(tc(dest.x), tc(dest.y), 'feather', 8, 14);
          ctx.toast(`${a.name} was swept away by the tornado!`, 0xff9a6a);
          this.flung++;
        }
      }
    }
    for (const d of [...ctx.state.drops]) if (Math.hypot(d.x - this.x, d.y - this.y) < RADIUS) ctx.economy.scatterDrop(d.id, 90);
    if (pd < RADIUS + 6) {
      const p = ctx.state.player;
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      ctx.player.teleport(
        Phaser.Math.Clamp(p.x + Math.cos(ang) * 4, 3 * TILE, (MAP_W - 3) * TILE),
        Phaser.Math.Clamp(p.y + Math.sin(ang) * 4, 3 * TILE, (MAP_H - 3) * TILE),
        p.dir,
      );
      if (ctx.grid.isSolid(toTile(ctx.state.player.x), toTile(ctx.state.player.y - 2), 'player')) ctx.player.teleport(p.x, p.y, p.dir);
      if (!this.whooshed) {
        this.whooshed = true;
        ctx.view.floatText(p.x, p.y - 30, 'WHOOSH!', 0xffffff);
      }
    }
  }

  isFinished(): boolean {
    return this.t >= this.dur;
  }

  end(): void {
    this.sprite?.destroy();
    this.ctx.weather.wind = 0;
    audio.setWind(0);
    this.note = `It wrecked ${this.crops} crops and ${this.fences} fence pieces${this.flung ? ` and flung ${this.flung} chicken${this.flung > 1 ? 's' : ''}` : ''}.`;
  }

  location() {
    const x = Phaser.Math.Clamp(this.sx, 10 * TILE, (MAP_W - 10) * TILE);
    return { x, y: this.sy };
  }

  serialize() {
    return { ...super.serialize(), sx: this.sx, sy: this.sy, ex: this.ex, ey: this.ey, dur: this.dur, crops: this.crops, fences: this.fences, flung: this.flung };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.sx = Number(d.sx);
    this.sy = Number(d.sy);
    this.ex = Number(d.ex);
    this.ey = Number(d.ey);
    this.dur = Number(d.dur ?? 34);
    this.crops = Number(d.crops ?? 0);
    this.fences = Number(d.fences ?? 0);
    this.flung = Number(d.flung ?? 0);
    this.makeSprite();
  }
}
