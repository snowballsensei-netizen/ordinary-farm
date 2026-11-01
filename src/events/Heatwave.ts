// A scorching heatwave dries out every tilled tile. While it lasts, the
// first watering of each crop evaporates instantly: water them twice. Hot
// spells keep re-drying watered crops, and crops left thirsty start wilting.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_H, GAME_W } from '../config/constants';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

const DURATION = 190;
const SPELL_EVERY = 30;   // seconds between hot spells that re-dry crops
const WILT_AFTER = 50;    // seconds before thirsty crops start wilting
const WILT_BASE = 4;

export class Heatwave extends ChaosEvent {
  readonly id = 'heatwave';
  thirsty: string[] = [];
  dried = 0;
  rewatered = 0;
  wilted = 0;
  spell = SPELL_EVERY;
  private tick = 0;
  private tint?: Phaser.GameObjects.Rectangle;

  canTrigger(): boolean {
    return this.ctx.state.season !== 3 && !this.ctx.weather.isRaining() && this.ctx.grid.plantedTiles().length > 0;
  }

  requirement(): string {
    return 'needs crops, not in winter or rain';
  }

  private makeTint(): void {
    this.tint = this.ctx.scene.add.rectangle(0, 0, GAME_W, GAME_H, 0xff8a3a, 0.12).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.weather - 2);
  }

  start(): void {
    this.ctx.grid.forEachTile((t, x, y) => {
      if (t.g !== Ground.TILLED) return;
      if (t.wet) {
        t.wet = false;
        this.dried++;
        this.ctx.view.refreshTile(x, y);
      }
      if (t.crop && !t.crop.dead) this.thirsty.push(`${x},${y}`);
    });
    this.makeTint();
    this.progress(`Heatwave: ${this.thirsty.length} crops need watering twice!`, 0xff9a6a, true);
  }

  private hotSpell(): void {
    const wet = this.ctx.grid.plantedTiles((t) => !!t.crop && !t.crop.dead && !!t.wet)
      .filter((p) => !this.thirsty.includes(`${p.x},${p.y}`));
    let n = 0;
    for (let i = 0; i < 4 && wet.length; i++) {
      const p = wet.splice(this.ctx.chaosRng.int(0, wet.length - 1), 1)[0];
      p.t.wet = false;
      this.ctx.view.refreshTile(p.x, p.y);
      this.thirsty.push(`${p.x},${p.y}`);
      n++;
    }
    if (n) {
      this.shake(200, 0.002);
      this.progress(`A hot spell dried out ${n} more crop${n === 1 ? '' : 's'}! ${this.thirsty.length} thirsty`, 0xff9a6a, true);
    }
  }

  update(dt: number): void {
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.4;
    this.spell -= 0.4;
    if (this.spell <= 0 && this.t < DURATION - 30) {
      this.spell = SPELL_EVERY;
      this.hotSpell();
    }
    // neglected crops wilt
    if (this.t > WILT_AFTER && this.thirsty.length && this.wilted < this.cap(WILT_BASE) && this.ctx.chaosRng.chance(0.04)) {
      const [x, y] = this.ctx.chaosRng.pick(this.thirsty).split(',').map(Number);
      if (this.ctx.grid.tile(x, y)?.crop) {
        this.ctx.crops.damage(x, y, 1);
        this.wilted++;
        this.ctx.view.floatText(tc(x), tc(y) - 10, 'wilting!', 0xff6a5a);
      }
    }
    for (let i = this.thirsty.length - 1; i >= 0; i--) {
      const [x, y] = this.thirsty[i].split(',').map(Number);
      const t = this.ctx.grid.tile(x, y);
      if (!t?.crop) {
        this.thirsty.splice(i, 1);
        continue;
      }
      if (t.wet) {
        t.wet = false;
        this.thirsty.splice(i, 1);
        this.rewatered++;
        this.ctx.view.refreshTile(x, y);
        this.ctx.view.burst(tc(x), tc(y) - 4, 'dust', 4, 8, 600, 0xffffff);
        this.ctx.view.floatText(tc(x), tc(y) - 10, 'sssss', 0xffc08a);
        audio.play('water_pour');
        this.progress(`Evaporated! Water it again. ${this.thirsty.length} crops still thirsty`);
      }
    }
    if (this.thirsty.length) {
      const [x, y] = this.ctx.chaosRng.pick(this.thirsty).split(',').map(Number);
      this.ctx.view.burst(tc(x), tc(y), 'fx2_heat', 2, 8, 900);
    }
    if (!this.thirsty.length && this.t > 10 && this.t > DURATION / 2) this.done = true;
  }

  isFinished(): boolean {
    return this.done || this.t > DURATION;
  }

  end(): void {
    this.tint?.destroy();
    this.note = `${this.dried} tiles dried out. ${this.rewatered} waterings just evaporated.${this.wilted ? ` ${this.wilted} crops wilted.` : ''}`;
  }

  serialize() {
    return { ...super.serialize(), thirsty: this.thirsty, dried: this.dried, rewatered: this.rewatered, wilted: this.wilted, spell: this.spell };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.thirsty = (d.thirsty as string[]) ?? [];
    this.dried = Number(d.dried ?? 0);
    this.rewatered = Number(d.rewatered ?? 0);
    this.wilted = Number(d.wilted ?? 0);
    this.spell = Number(d.spell ?? SPELL_EVERY);
    this.makeTint();
  }
}
