// A sprinkler goes haywire and floods the tiles around it, spraying wider the
// longer it runs. Hit it with the hammer several times to fix it.
import { audio } from '../audio/AudioManager';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

const DROWN_BASE = 5;

export class RogueSprinkler extends ChaosEvent {
  readonly id = 'rogue_sprinkler';
  tx = 0;
  ty = 0;
  drowned = 0;
  dur = 160;
  hp = 3;
  private tick = 0;

  private sprinklers(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    this.ctx.grid.forEachTile((t, x, y) => {
      if (t.obj?.type === 'sprinkler') out.push({ x, y });
    });
    return out;
  }

  canTrigger(): boolean {
    return this.sprinklers().length > 0;
  }

  requirement(): string {
    return 'needs a placed sprinkler';
  }

  private setRogue(on: boolean): void {
    const t = this.ctx.grid.tile(this.tx, this.ty);
    if (t?.obj?.type === 'sprinkler') {
      t.obj.rogue = on;
      this.ctx.view.refreshTile(this.tx, this.ty);
    }
  }

  start(): void {
    const s = this.ctx.chaosRng.pick(this.sprinklers());
    this.tx = s.x;
    this.ty = s.y;
    this.hp = 3 + (this.ctx.state.absDay > 18 ? 1 : 0);
    this.setRogue(true);
  }

  update(dt: number): void {
    const t0 = this.ctx.grid.tile(this.tx, this.ty);
    if (t0?.obj?.type !== 'sprinkler') {
      this.done = true;
      return;
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.5;
    this.ctx.view.burst(tc(this.tx), tc(this.ty) - 6, 'drop', 8, 30, 600);
    const r = this.t > 50 ? 3 : 2;
    const x = this.tx + this.ctx.chaosRng.int(-r, r);
    const y = this.ty + this.ctx.chaosRng.int(-r, r);
    const t = this.ctx.grid.tile(x, y);
    if (!t || t.g !== Ground.TILLED) return;
    t.wet = true;
    t.flood = true;
    if (t.crop && !t.crop.dead && this.drowned < this.cap(DROWN_BASE) && this.ctx.chaosRng.chance(0.4)) {
      this.ctx.crops.damage(x, y, 1);
      this.drowned++;
    }
    this.ctx.view.refreshTile(x, y);
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'hammer' || tx !== this.tx || ty !== this.ty) return false;
    audio.play('hammer');
    this.hp--;
    this.ctx.view.burst(tc(this.tx), tc(this.ty) - 6, 'drop', 12, 36, 700);
    this.ctx.scene.cameras.main.shake(80, 0.002);
    if (this.hp > 0) {
      this.progress(`The sprinkler sputters! ${this.hp} more whack${this.hp === 1 ? '' : 's'}`);
      return true;
    }
    this.setRogue(false);
    this.ctx.toast('You whack the sprinkler. It calms down.', 0x8fd458);
    this.done = true;
    return true;
  }

  isFinished(): boolean {
    return this.done || this.t > this.dur;
  }

  end(): void {
    this.setRogue(false);
    this.note = `${this.drowned} crops nearly drowned.`;
  }

  location() {
    return { x: tc(this.tx), y: tc(this.ty) };
  }

  serialize() {
    return { ...super.serialize(), tx: this.tx, ty: this.ty, drowned: this.drowned, hp: this.hp };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.tx = Number(d.tx);
    this.ty = Number(d.ty);
    this.drowned = Number(d.drowned ?? 0);
    this.hp = Number(d.hp ?? 3);
    this.setRogue(true);
  }
}
