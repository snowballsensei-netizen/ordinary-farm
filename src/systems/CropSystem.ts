// Planting, watering, growth, harvest and damage.
import { DRY_DAYS_TO_DIE, TILE } from '../config/constants';
import { CROPS, isReady, stageDays } from '../config/crops';
import { audio } from '../audio/AudioManager';
import { Ground } from '../world/types';
import type { GameContext } from './GameContext';

export class CropSystem {
  constructor(private ctx: GameContext) {}

  plant(tx: number, ty: number, cropId: string): boolean {
    const t = this.ctx.grid.tile(tx, ty);
    const def = CROPS[cropId];
    if (!t || t.g !== Ground.TILLED || t.crop || t.obj) return false;
    if (!def.seasons.includes(this.ctx.state.season)) {
      this.ctx.toast(`${def.name} won't grow in this season.`, 0xff9a6a);
      return false;
    }
    t.crop = { id: cropId, days: 0, dry: 0 };
    this.ctx.view.refreshTile(tx, ty);
    audio.play('plant');
    return true;
  }

  isReadyAt(tx: number, ty: number): boolean {
    const c = this.ctx.grid.tile(tx, ty)?.crop;
    return !!c && !c.dead && isReady(CROPS[c.id], c.days);
  }

  harvest(tx: number, ty: number): boolean {
    const t = this.ctx.grid.tile(tx, ty);
    const c = t?.crop;
    if (!t || !c) return false;
    if (c.dead) {
      t.crop = undefined;
      this.ctx.view.refreshTile(tx, ty);
      return true;
    }
    const def = CROPS[c.id];
    if (!isReady(def, c.days)) return false;
    const star = this.ctx.rng.chance(0.12);
    const left = this.ctx.inv.add(def.id, 1, star);
    if (left > 0) this.ctx.economy.dropItem({ id: def.id, qty: left, star }, tx * TILE + 8, ty * TILE + 14);
    if (def.regrow) c.days = def.days - def.regrow;
    else t.crop = undefined;
    this.ctx.state.stats.harvested++;
    this.ctx.state.stats.harvestedToday++;
    this.ctx.view.refreshTile(tx, ty);
    this.ctx.view.burst(tx * TILE + 8, ty * TILE + 8, 'leafp', 5, 10);
    this.ctx.view.floatText(tx * TILE + 8, ty * TILE, `+1 ${def.name}${star ? ' ★' : ''}`, 0x8fd458);
    audio.play('pop');
    return true;
  }

  /** Knocks the crop back `stages` growth stages. Returns true if destroyed. */
  damage(tx: number, ty: number, stages = 1): boolean {
    const t = this.ctx.grid.tile(tx, ty);
    const c = t?.crop;
    if (!t || !c || c.dead) return false;
    const def = CROPS[c.id];
    if (c.days <= 0) {
      t.crop = undefined;
      this.ctx.view.refreshTile(tx, ty);
      return true;
    }
    c.days = Math.max(0, c.days - stageDays(def) * stages);
    this.ctx.view.refreshTile(tx, ty);
    return false;
  }

  destroy(tx: number, ty: number): boolean {
    const t = this.ctx.grid.tile(tx, ty);
    if (!t?.crop) return false;
    t.crop = undefined;
    this.ctx.view.refreshTile(tx, ty);
    return true;
  }

  count(): number {
    return this.ctx.grid.plantedTiles().length;
  }

  /** Overnight growth. Call before the date advances. */
  dayEnd(): string[] {
    let died = 0;
    this.ctx.grid.forEachTile((t) => {
      const c = t.crop;
      if (!c || c.dead) return;
      if (t.wet) {
        c.days++;
        c.dry = 0;
      } else if (!isReady(CROPS[c.id], c.days)) {
        c.dry++;
        if (c.dry >= DRY_DAYS_TO_DIE) {
          c.dead = true;
          died++;
        }
      }
    });
    return died ? [`${died} crop${died > 1 ? 's' : ''} withered from thirst.`] : [];
  }

  /** New season: anything out of season dies. */
  seasonChange(season: number): string[] {
    let died = 0;
    this.ctx.grid.forEachTile((t) => {
      const c = t.crop;
      if (c && !c.dead && !CROPS[c.id].seasons.includes(season)) {
        c.dead = true;
        died++;
      }
    });
    return died ? [`The season changed. ${died} out-of-season crop${died > 1 ? 's' : ''} died.`] : [];
  }
}
