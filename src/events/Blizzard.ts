// Winter only: a blizzard piles snowdrifts on the farm. A drift left on a
// crop for too long frosts it (and keeps frosting it). Clear drifts with the
// hoe or scythe; snow keeps falling, so cleared tiles can drift over again.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_H, GAME_W } from '../config/constants';
import { ChaosEvent } from './ChaosEvent';
import { randomOpenTile, tc } from './helpers';
import { TileMarks } from './critters';

const DRIFT_BASE = 14;
const FROST_BASE = 5;
const FROST_AFTER = 11;
const SNOW_TIME = 95;
const TIMEOUT = 115;

export class Blizzard extends ChaosEvent {
  readonly id = 'blizzard';
  drifts: { x: number; y: number; age: number }[] = [];
  made = 0;
  frosted = 0;
  cleared = 0;
  private tick = 0;
  private veil?: Phaser.GameObjects.Rectangle;
  private marks = new TileMarks(this.ctx, 'fx2_snow', (y) => y + 1);

  canTrigger(): boolean {
    return this.ctx.state.season === 3;
  }

  requirement(): string {
    return 'winter only';
  }

  private makeVeil(): void {
    this.veil = this.ctx.scene.add.rectangle(0, 0, GAME_W, GAME_H, 0xe8f0ff, 0.25).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.weather - 2);
  }

  start(): void {
    this.makeVeil();
    this.ctx.weather.wind = 0.6;
    audio.setWind(0.6);
  }

  update(dt: number): void {
    for (const d of this.drifts) {
      const before = d.age;
      d.age += dt;
      // frosts after FROST_AFTER seconds, then again every 15 s
      const k0 = before < FROST_AFTER ? -1 : Math.floor((before - FROST_AFTER) / 15);
      const k1 = d.age < FROST_AFTER ? -1 : Math.floor((d.age - FROST_AFTER) / 15);
      if (k1 > k0 && this.frosted < this.cap(FROST_BASE)) {
        const t = this.ctx.grid.tile(d.x, d.y);
        if (t?.crop && !t.crop.dead) {
          this.ctx.crops.damage(d.x, d.y, 1);
          this.frosted++;
        }
      }
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 1.7;
    const cam = this.ctx.scene.cameras.main;
    this.ctx.view.burst(cam.scrollX + Math.random() * GAME_W, cam.scrollY + Math.random() * GAME_H, 'fx2_flake', 6, 30, 1200);
    if (this.made < this.cap(DRIFT_BASE) && this.t < SNOW_TIME) {
      const crops = this.ctx.grid.plantedTiles().filter((p) => !this.marks.has(p.x, p.y));
      const p = crops.length && this.ctx.chaosRng.chance(0.6)
        ? this.ctx.chaosRng.pick(crops)
        : randomOpenTile(this.ctx, (x, y) => !this.marks.has(x, y));
      if (p) {
        this.drifts.push({ x: p.x, y: p.y, age: 0 });
        this.marks.add(p.x, p.y);
        this.made++;
      }
    }
    if (this.t > TIMEOUT) this.done = true;
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'hoe' && tool !== 'scythe') return false;
    const i = this.drifts.findIndex((d) => d.x === tx && d.y === ty);
    if (i < 0) return false;
    this.drifts.splice(i, 1);
    this.marks.remove(tx, ty);
    this.cleared++;
    this.ctx.view.burst(tc(tx), tc(ty), 'fx2_flake', 6, 10);
    const left = this.drifts.length;
    this.progress(left ? `${left} snowdrift${left === 1 ? '' : 's'} left (more are falling!)` : 'Drifts cleared... for now.');
    return true;
  }

  end(): void {
    this.veil?.destroy();
    this.marks.clear();
    this.drifts = [];
    this.ctx.weather.wind = 0;
    audio.setWind(0);
    this.note = `${this.frosted} crops got frostbite. I shovelled ${this.cleared} drifts.`;
  }

  serialize() {
    return { ...super.serialize(), drifts: this.drifts, made: this.made, frosted: this.frosted, cleared: this.cleared };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.made = Number(d.made ?? 0);
    this.frosted = Number(d.frosted ?? 0);
    this.cleared = Number(d.cleared ?? 0);
    for (const x of (d.drifts as { x: number; y: number; age: number }[]) ?? []) {
      this.drifts.push({ ...x });
      this.marks.add(x.x, x.y);
    }
    this.makeVeil();
    this.ctx.weather.wind = 0.6;
  }
}
