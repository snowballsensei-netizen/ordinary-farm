// The barn animals burst through the gate and stampede across the field.
// Loose animals that are left alone get spooked again and take off once more.
import { audio } from '../audio/AudioManager';
import { ChaosEvent } from './ChaosEvent';
import { ROUTE, barnGates, pennedAnimals } from './helpers';

const TRAMPLE_BASE = 15;
const TIMEOUT = 180;

export class CowStampede extends ChaosEvent {
  readonly id = 'cow_stampede';
  ids: string[] = [];
  budgetStart = 0;
  respooked: string[] = [];

  canTrigger(): boolean {
    return pennedAnimals(this.ctx, undefined, 'barn').length > 0;
  }

  requirement(): string {
    return 'needs animals in the barn pen';
  }

  start(): void {
    const ctx = this.ctx;
    const herd = pennedAnimals(ctx, undefined, 'barn').filter((a) => a.type === 'cow' || ctx.chaosRng.chance(0.5));
    if (!herd.length) herd.push(pennedAnimals(ctx, undefined, 'barn')[0]);
    this.ids = herd.map((a) => a.id);
    if (this.cause !== 'great_escape') for (const g of barnGates(ctx)) ctx.grid.breakFence(g);
    ctx.state.chaos.trampleBudget += this.cap(TRAMPLE_BASE);
    this.budgetStart = ctx.state.chaos.trampleBudget;
    herd.forEach((a, i) => {
      ctx.scene.time.delayedCall(i * 350, () => {
        ctx.animals.setPath(a.id, [ROUTE.barnGateInside, ROUTE.barnGateOutside], 2.4, () => {
          const ang = -Math.PI / 2 + ctx.chaosRng.range(-0.7, 0.7);
          ctx.animals.stampede(a.id, ang, ctx.chaosRng.range(5, 8), 3.8);
          audio.play('moo');
        });
      });
    });
    ctx.scene.cameras.main.shake(800, 0.004);
  }

  private loose(): number {
    return this.ids.filter((id) => this.ctx.animals.byId(id)?.escaped).length;
  }

  update(): void {
    if (this.t < 3) return;
    const ctx = this.ctx;
    // second wave: a loose animal that has calmed down bolts again (once each)
    if (this.t > 14 && this.t < 90) {
      for (const id of this.ids) {
        const a = ctx.animals.byId(id);
        if (!a || !a.escaped || ctx.animals.isBusy(id) || this.respooked.includes(id)) continue;
        if (!ctx.chaosRng.chance(0.02)) continue;
        this.respooked.push(id);
        ctx.animals.stampede(id, ctx.chaosRng.range(-Math.PI, Math.PI), ctx.chaosRng.range(4, 6), 3.2);
        ctx.view.floatText(a.x, a.y - 16, 'MOO!!', 0xff9a6a);
        audio.play('moo');
        this.shake(300, 0.003);
        this.progress(`${a.name} bolted again! ${this.loose()} still loose.`, 0xff9a6a);
      }
    }
    const busy = this.ids.some((id) => ctx.animals.isBusy(id));
    const home = this.loose() === 0;
    const settled = !busy && this.respooked.length >= this.ids.filter((id) => ctx.animals.byId(id)?.escaped).length;
    if ((settled && this.t > 30) || (home && this.t > 6) || this.t > TIMEOUT) this.done = true;
  }

  end(): void {
    const used = Math.max(0, this.budgetStart - this.ctx.state.chaos.trampleBudget);
    this.note = used ? `${used} crop tiles got trampled.` : 'Somehow no crops were hurt.';
    // leftover budget shouldn't carry over to the next stray animal
    this.ctx.state.chaos.trampleBudget = Math.min(this.ctx.state.chaos.trampleBudget, 3);
  }

  location() {
    return ROUTE.barnGateOutside;
  }

  serialize() {
    return { ...super.serialize(), ids: this.ids, budgetStart: this.budgetStart, respooked: this.respooked };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.ids = (d.ids as string[]) ?? [];
    this.budgetStart = Number(d.budgetStart ?? 0);
    this.respooked = (d.respooked as string[]) ?? [];
  }
}
