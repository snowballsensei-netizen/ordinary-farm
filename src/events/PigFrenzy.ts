// The pigs squeeze under the barn fence and dig up the tilled soil hunting
// for truffles. They do find some. They dig fast and stay out longer.
import { audio } from '../audio/AudioManager';
import { toTile } from '../systems/FarmGrid';
import { penLayout } from '../world/layout';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { ROUTE, pennedAnimals, tc } from './helpers';

const DIG_BASE = 10;
const TIMEOUT = 130;

export class PigFrenzy extends ChaosEvent {
  readonly id = 'pig_frenzy';
  ids: string[] = [];
  dug = 0;
  truffles = 0;
  private digTimer = 1;

  canTrigger(): boolean {
    return pennedAnimals(this.ctx, 'pig').length > 0;
  }

  requirement(): string {
    return 'needs a pig in the barn pen (buy one at the shop)';
  }

  start(): void {
    const ctx = this.ctx;
    const pigs = pennedAnimals(ctx, 'pig');
    this.ids = pigs.map((p) => p.id);
    const barn = penLayout('barn');
    const top = ctx.grid.penFences('barn').filter((f) => f.y === barn.y0 && !f.gate && f.x > barn.x0 + 1 && f.x < barn.x1 - 1);
    const hole = ctx.chaosRng.pick(top);
    ctx.grid.breakFence(hole);
    ctx.view.burst(tc(hole.x), tc(hole.y), 'clod', 10, 16);
    for (const p of pigs) {
      ctx.animals.setPath(p.id, [{ x: tc(hole.x), y: tc(hole.y + 1) + 4 }, { x: tc(hole.x), y: tc(hole.y - 2) }, ROUTE.fieldEntry], 1.8, () =>
        this.sniff(p.id),
      );
    }
    audio.play('oink');
  }

  private sniff(id: string): void {
    const a = this.ctx.animals.byId(id);
    if (!a) return;
    let best: { x: number; y: number } | null = null;
    let bd = 9;
    const ax = toTile(a.x);
    const ay = toTile(a.y - 2);
    for (let y = ay - 8; y <= ay + 8; y++) {
      for (let x = ax - 8; x <= ax + 8; x++) {
        if (this.ctx.grid.tile(x, y)?.g !== Ground.TILLED) continue;
        const d = Math.abs(x - ax) + Math.abs(y - ay) + this.ctx.chaosRng.next() * 2;
        if (d < bd) {
          bd = d;
          best = { x, y };
        }
      }
    }
    if (best) this.ctx.animals.setPath(id, [{ x: tc(best.x), y: tc(best.y) + 4 }], 1.3);
  }

  update(dt: number): void {
    const ctx = this.ctx;
    this.digTimer -= dt;
    if (this.digTimer <= 0) {
      this.digTimer = 0.85;
      for (const id of this.ids) {
        const a = ctx.animals.byId(id);
        if (!a || !a.escaped || this.dug >= this.cap(DIG_BASE)) continue;
        const tx = toTile(a.x);
        const ty = toTile(a.y - 2);
        const t = ctx.grid.tile(tx, ty);
        if (t?.g === Ground.TILLED) {
          t.crop = undefined;
          t.g = Ground.DIRT;
          t.wet = false;
          ctx.view.refreshTile(tx, ty);
          ctx.view.burst(tc(tx), tc(ty), 'clod', 6, 12);
          this.dug++;
          audio.play('oink');
          if (this.dug % 4 === 0) this.progress(`The pigs dug up ${this.dug} tiles! Herd them home.`, 0xff9a6a);
          if (ctx.chaosRng.chance(0.25)) {
            ctx.economy.dropItem({ id: 'truffle', qty: 1 }, tc(tx), tc(ty) + 6);
            this.truffles++;
          }
        }
        if (!ctx.animals.isBusy(id)) this.sniff(id);
      }
    }
    const allHome = this.ids.every((id) => !ctx.animals.byId(id)?.escaped);
    if (this.t > TIMEOUT || this.dug >= this.cap(DIG_BASE) || (allHome && this.t > 8)) {
      for (const id of this.ids) if (ctx.animals.isBusy(id)) ctx.animals.release(id);
      this.done = true;
    }
  }

  end(): void {
    this.note = `They dug up ${this.dug} tiles and found ${this.truffles} truffle${this.truffles === 1 ? '' : 's'}.`;
  }

  location() {
    const a = this.ctx.animals.byId(this.ids[0]);
    return a ? { x: a.x, y: a.y } : null;
  }

  serialize() {
    return { ...super.serialize(), ids: this.ids, dug: this.dug, truffles: this.truffles };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.ids = (d.ids as string[]) ?? [];
    this.dug = Number(d.dug ?? 0);
    this.truffles = Number(d.truffles ?? 0);
  }
}
