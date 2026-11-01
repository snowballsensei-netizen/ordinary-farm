// A thick, dark fog rolls in and a couple of animals wander off through the
// gate in it. Lost animals keep drifting off, and more wander out the longer
// the fog lingers. Herd them back; the fog lifts once everyone is home.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { DEPTH, GAME_H, GAME_W, TILE } from '../config/constants';
import { ChaosEvent } from './ChaosEvent';
import { pennedAnimals, tc } from './helpers';

const MAX_LOST = 5;
const TIMEOUT = 160;

export class FogOfConfusion extends ChaosEvent {
  readonly id = 'fog_confusion';
  lost: string[] = [];
  extra = 0;
  private drift = 8;
  private shade?: Phaser.GameObjects.Rectangle;
  private puffs: Phaser.GameObjects.Image[] = [];

  canTrigger(): boolean {
    return pennedAnimals(this.ctx).length > 0;
  }

  requirement(): string {
    return 'needs animals in a pen';
  }

  private makeFog(): void {
    const s = this.ctx.scene;
    this.shade = s.add.rectangle(0, 0, GAME_W, GAME_H, 0x404858, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.weather - 2);
    s.tweens.add({ targets: this.shade, fillAlpha: 0.5, duration: 3000 });
    for (let i = 0; i < 14; i++) {
      const img = s.add.image(Math.random() * GAME_W, Math.random() * GAME_H, 'fx2_fog')
        .setScrollFactor(0).setDepth(DEPTH.weather - 1).setScale(2 + Math.random() * 2).setAlpha(0);
      s.tweens.add({ targets: img, alpha: 0.9, duration: 3000 });
      this.puffs.push(img);
    }
  }

  start(): void {
    this.makeFog();
    const pool = pennedAnimals(this.ctx);
    const n = Math.min(MAX_LOST - 1, pool.length, 2 + Math.floor(this.ctx.state.chaos.level / 35));
    for (let i = 0; i < n; i++) this.loseOne(pool);
    audio.play('hint');
    this.progress(`${this.lost.length} animal${this.lost.length === 1 ? '' : 's'} lost in the fog!`, 0xff9a6a, true);
  }

  private loseOne(pool = pennedAnimals(this.ctx)): void {
    const avail = pool.filter((a) => !this.lost.includes(a.id));
    if (!avail.length) return;
    const a = avail[this.ctx.chaosRng.int(0, avail.length - 1)];
    const pen = this.ctx.animals.pen(a);
    const g = pen.gates[0];
    const ox = g.x === pen.x1 ? 1 : g.x === pen.x0 ? -1 : 0;
    const oy = g.y === pen.y0 ? -1 : g.y === pen.y1 ? 1 : 0;
    this.ctx.animals.place(a, tc(g.x + ox * 2), tc(g.y + oy * 2));
    this.ctx.animals.release(a.id);
    this.lost.push(a.id);
  }

  private strays(): number {
    return this.lost.filter((id) => {
      const a = this.ctx.animals.byId(id);
      return a && !this.ctx.animals.isInside(a);
    }).length;
  }

  update(dt: number): void {
    for (const p of this.puffs) {
      p.x += dt * 6;
      if (p.x > GAME_W + 60) p.x = -60;
    }
    const ctx = this.ctx;
    this.drift -= dt;
    if (this.drift <= 0 && this.t < TIMEOUT - 20) {
      this.drift = 12;
      // confused animals wander off in a random direction
      for (const id of this.lost) {
        const a = ctx.animals.byId(id);
        if (!a || ctx.animals.isInside(a) || ctx.animals.isBusy(id) || a.asleep) continue;
        if (ctx.chaosRng.chance(0.5)) ctx.animals.stampede(id, ctx.chaosRng.range(-Math.PI, Math.PI), 1.5, 1.6);
      }
      // the fog thickens: another animal slips out every so often
      if (this.extra < 2 && this.lost.length < MAX_LOST && this.t > 25 && ctx.chaosRng.chance(0.35)) {
        const before = this.lost.length;
        this.loseOne();
        if (this.lost.length > before) {
          this.extra++;
          this.progress(`Another animal wandered into the fog! ${this.strays()} lost`, 0xff9a6a, true);
        }
      }
    }
    const home = this.strays() === 0;
    if ((home && this.t > 8) || this.t > TIMEOUT) this.done = true;
  }

  end(): void {
    this.shade?.destroy();
    this.puffs.forEach((p) => p.destroy());
    this.puffs = [];
    const stray = this.lost.filter((id) => {
      const a = this.ctx.animals.byId(id);
      return a && !this.ctx.animals.isInside(a);
    }).length;
    this.note = stray ? `${stray} animal${stray === 1 ? ' is' : 's are'} still out there somewhere.` : 'Everyone found their way home.';
  }

  location() {
    const a = this.ctx.animals.byId(this.lost[0] ?? '');
    return a ? { x: a.x, y: a.y } : { x: 20 * TILE, y: 26 * TILE };
  }

  serialize() {
    return { ...super.serialize(), lost: this.lost, extra: this.extra };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.lost = (d.lost as string[]) ?? [];
    this.extra = Number(d.extra ?? 0);
    this.makeFog();
  }
}
