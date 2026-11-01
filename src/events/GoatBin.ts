// The goat headbutts the gate open and goes for the shipping bin. Left loose,
// it comes back for seconds (and thirds on later days). Herd it home.
import { ITEMS } from '../config/items';
import { audio } from '../audio/AudioManager';
import { ChaosEvent } from './ChaosEvent';
import { ROUTE, barnGates, pennedAnimals } from './helpers';

export class GoatBin extends ChaosEvent {
  readonly id = 'goat_bin';
  goatId = '';
  phase: 'go' | 'loose' = 'go';
  bites = 0;
  lastBite = 0;

  canTrigger(): boolean {
    return pennedAnimals(this.ctx, 'goat').length > 0;
  }

  requirement(): string {
    return 'needs a goat in the barn pen (buy one at the shop)';
  }

  private route() {
    return [ROUTE.roadAtBarn, ROUTE.roadAtHouse, ROUTE.houseYard, ROUTE.binFront];
  }

  start(): void {
    const ctx = this.ctx;
    const goat = ctx.chaosRng.pick(pennedAnimals(ctx, 'goat'));
    this.goatId = goat.id;
    const gate = barnGates(ctx)[0];
    if (gate && gate.hp > 0) {
      gate.open = true;
      ctx.view.refreshFence(gate);
    }
    ctx.animals.setPath(goat.id, [ROUTE.barnGateInside, ROUTE.barnGateOutside, ...this.route()], 1.9, () => this.eat());
    audio.play('baa');
  }

  private eat(): void {
    const ctx = this.ctx;
    this.phase = 'loose';
    this.bites++;
    this.lastBite = this.t;
    const goat = ctx.animals.byId(this.goatId);
    const name = goat?.name ?? 'The goat';
    const bin = ctx.state.bin;
    if (ctx.upg.bin_lid) {
      ctx.toast(`${name} sniffed the goat-proof lid and gave up.`, 0x8fd458);
      this.note = 'The lid held.';
    } else if (!bin.length) {
      ctx.toast(`${name} found the bin empty and ate a flower instead.`);
      this.note = 'The bin was empty. Ha.';
    } else {
      const i = ctx.chaosRng.int(0, bin.length - 1);
      const s = bin[i];
      const n = Math.max(1, Math.ceil(s.qty / 2));
      s.qty -= n;
      if (s.qty <= 0) bin.splice(i, 1);
      ctx.toast(`${name} ate ${n}x ${ITEMS[s.id].name} from the shipping bin!${this.bites < this.maxBites() ? ' Herd it home before it comes back!' : ''}`, 0xff9a6a);
      this.note += ` It ate ${n}x ${ITEMS[s.id].name}.`;
      ctx.scene.cameras.main.shake(150, 0.003);
      ctx.view.setBinOpen(true);
      ctx.scene.time.delayedCall(800, () => ctx.view.setBinOpen(false));
    }
    if (goat) ctx.view.floatText(goat.x, goat.y - 18, '*munch*', 0xffe58a);
    audio.play('baa');
  }

  private maxBites(): number {
    return this.ctx.state.absDay > 20 ? 3 : 2;
  }

  update(): void {
    const ctx = this.ctx;
    const goat = ctx.animals.byId(this.goatId);
    if (!goat || (this.phase === 'loose' && !goat.escaped) || this.t > 200) {
      this.done = true;
      return;
    }
    // still loose and hungry: wander back for another bite
    if (this.phase === 'loose' && !ctx.upg.bin_lid && ctx.state.bin.length && this.bites < this.maxBites()
      && this.t - this.lastBite > 22 && !ctx.animals.isBusy(goat.id)) {
      this.phase = 'go';
      ctx.view.floatText(goat.x, goat.y - 18, 'MEHHH!', 0xff9a6a);
      ctx.toast(`${goat.name} is going back for seconds!`, 0xff9a6a);
      audio.play('baa');
      ctx.animals.setPath(goat.id, [ROUTE.binFront], 1.9, () => this.eat());
    }
  }

  location() {
    return ROUTE.barnGateOutside;
  }

  serialize() {
    return { ...super.serialize(), goatId: this.goatId, phase: this.phase, bites: this.bites, lastBite: this.lastBite };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.goatId = String(d.goatId);
    this.phase = d.phase === 'loose' ? 'loose' : 'go';
    this.bites = Number(d.bites ?? 0);
    this.lastBite = Number(d.lastBite ?? 0);
    if (this.phase === 'go') this.ctx.animals.setPath(this.goatId, this.route(), 1.9, () => this.eat());
  }
}
