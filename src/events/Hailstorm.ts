// Hail out of a clear sky knocks crops back a growth stage. It lasts longer
// than it used to and gets heavier in the second half.
import { audio } from '../audio/AudioManager';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

export class Hailstorm extends ChaosEvent {
  readonly id = 'hailstorm';
  dur = 60;
  damaged = 0;
  private tick = 0;

  start(): void {
    this.ctx.weather.hail = true;
    this.shake(300, 0.003);
  }

  private hailCap(): number {
    return this.cap(this.ctx.upg.hail_net ? 5 : 10);
  }

  update(dt: number): void {
    this.ctx.weather.hail = true;
    this.tick -= dt;
    if (this.tick > 0) return;
    const heavy = this.t > this.dur / 2;
    this.tick = heavy ? 0.4 : 0.6;
    if (heavy && this.ctx.chaosRng.chance(0.05)) this.shake(120, 0.002);
    if (this.ctx.chaosRng.chance(0.08)) {
      this.ctx.weather.lightning();
      audio.play('boom');
    }
    if (this.damaged >= this.hailCap()) return;
    const crops = this.ctx.grid.plantedTiles();
    if (!crops.length) return;
    const p = this.ctx.chaosRng.pick(crops);
    const chance = this.ctx.upg.hail_net ? 0.3 : 0.6;
    if (this.ctx.chaosRng.chance(chance)) {
      this.ctx.crops.damage(p.x, p.y, 1);
      this.damaged++;
      this.ctx.view.burst(tc(p.x), tc(p.y), 'sparkle', 3, 8);
    }
  }

  isFinished(): boolean {
    return this.t >= this.dur;
  }

  end(): void {
    this.ctx.weather.hail = false;
    this.note = `${this.damaged} crops got dinged.${this.ctx.upg.hail_net ? ' The netting helped.' : ''}`;
  }

  serialize() {
    return { ...super.serialize(), damaged: this.damaged };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.damaged = Number(d.damaged ?? 0);
    this.ctx.weather.hail = true;
  }
}
