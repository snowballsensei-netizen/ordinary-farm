// A chicken pecks through the coop fence, marches to the barn and flips the
// gate latch, which sets off a cow stampede.
import { TILE } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { penLayout } from '../world/layout';
import { ChaosEvent } from './ChaosEvent';
import { ROUTE, barnGates, pennedAnimals, tc } from './helpers';

export class GreatEscape extends ChaosEvent {
  readonly id = 'great_escape';
  chickenId = '';
  phase: 'mission' | 'loose' = 'mission';

  canTrigger(): boolean {
    return pennedAnimals(this.ctx, 'chicken').length > 0;
  }

  requirement(): string {
    return 'needs an awake chicken in the coop';
  }

  start(): void {
    const ctx = this.ctx;
    const chicken = ctx.chaosRng.pick(pennedAnimals(ctx, 'chicken'));
    this.chickenId = chicken.id;
    const coop = penLayout('coop');
    // weakest-looking spot: the right-hand fence nearest the chicken (not the gate)
    const side = ctx.grid
      .penFences('coop')
      .filter((f) => f.x === coop.x1 && !f.gate && f.y > coop.y0 && f.y < coop.y1)
      .sort((a, b) => Math.abs(a.y * TILE - chicken.y) - Math.abs(b.y * TILE - chicken.y))[0];
    if (side) {
      ctx.grid.breakFence(side);
      ctx.view.burst(tc(side.x), tc(side.y), 'feather', 8, 14);
    }
    const hole = side ?? { x: coop.x1, y: coop.y0 + 4 };
    ctx.animals.setPath(
      chicken.id,
      [
        { x: tc(hole.x - 1), y: tc(hole.y) + 4 },
        { x: tc(hole.x + 1), y: tc(hole.y) + 4 },
        ROUTE.roadAtCoop,
        ROUTE.roadAtBarn,
        ROUTE.barnGateOutside,
      ],
      2.1,
      () => this.atGate(),
    );
    this.note = `${chicken.name} was the culprit.`;
    ctx.toast(`${chicken.name} is heading for the barn latch! Cut it off!`, 0xff9a6a);
  }

  private atGate(): void {
    const ctx = this.ctx;
    const chicken = ctx.animals.byId(this.chickenId);
    this.phase = 'loose';
    if (!chicken) return;
    if (ctx.upg.chicken_latch) {
      ctx.toast(`${chicken.name} pecked at the latch... the Chicken-Proof Latch held!`, 0x8fd458);
      this.note += ' The chicken-proof latch held.';
      return;
    }
    for (const g of barnGates(ctx)) {
      if (g.hp > 0) {
        g.open = true;
        ctx.view.refreshFence(g);
      }
    }
    audio.play('cluck');
    ctx.toast(`${chicken.name} flipped the barn gate latch!!`, 0xff9a6a);
    ctx.view.floatText(chicken.x, chicken.y - 14, '*click*', 0xffe58a);
    this.ctx.chaos.trigger('cow_stampede', { immediate: true, force: true, cause: this.id });
  }

  update(): void {
    const chicken = this.ctx.animals.byId(this.chickenId);
    if (!chicken) {
      this.done = true;
      return;
    }
    if (this.phase === 'loose' && !chicken.escaped) this.done = true;
    if (this.t > 240) this.done = true;
  }

  location() {
    const c = this.ctx.animals.byId(this.chickenId);
    return c ? { x: c.x, y: c.y } : null;
  }

  serialize() {
    return { ...super.serialize(), chickenId: this.chickenId, phase: this.phase };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.chickenId = String(d.chickenId);
    this.phase = d.phase === 'loose' ? 'loose' : 'mission';
    if (this.phase === 'mission') {
      this.ctx.animals.setPath(this.chickenId, [ROUTE.roadAtCoop, ROUTE.roadAtBarn, ROUTE.barnGateOutside], 2.1, () => this.atGate());
    }
  }
}
