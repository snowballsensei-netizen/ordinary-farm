// Two rabbits arrive. Then four. Then... Rabbits nibble crops and multiply
// every few seconds. Walk into them to shoo them off before they breed; a
// shooed rabbit hops back once, so keep at it.
import { audio } from '../audio/AudioManager';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';
import { critter, edgePoint, killCritters, loadCritters, playerNear, saveCritters, spawnSprite, stepTo, syncCritter, type Critter } from './critters';

const MAX_BASE = 16;
const EAT_BASE = 8;
const BREED_EVERY = 7;
const BREED_UNTIL = 120;
const TIMEOUT = 190;

export class RabbitBoom extends ChaosEvent {
  readonly id = 'rabbit_boom';
  rabbits: Critter[] = [];
  born = 0;
  eaten = 0;
  shooed = 0;
  private breed = BREED_EVERY;

  canTrigger(): boolean {
    return this.ctx.grid.plantedTiles((t) => !t.crop?.dead).length > 0;
  }

  requirement(): string {
    return 'needs planted crops';
  }

  start(): void {
    const n = this.ctx.state.absDay > 18 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const e = edgePoint(this.ctx);
      this.add(e.x, e.y);
    }
  }

  private add(x: number, y: number): void {
    const c = critter(x, y, 'in', 1); // hp = comebacks left
    this.aim(c);
    spawnSprite(this.ctx, c, 'fx2_rabbit');
    this.rabbits.push(c);
    this.born++;
  }

  private aim(c: Critter): void {
    const crops = this.ctx.grid.plantedTiles((t) => !t.crop?.dead);
    if (!crops.length || this.eaten >= this.cap(EAT_BASE)) return this.flee(c);
    const p = this.ctx.chaosRng.pick(crops);
    c.gx = tc(p.x);
    c.gy = tc(p.y) + 6;
    c.state = 'in';
  }

  private flee(c: Critter): void {
    const e = edgePoint(this.ctx);
    c.gx = e.x;
    c.gy = e.y;
    c.state = 'out';
  }

  update(dt: number): void {
    const live = () => this.rabbits.filter((c) => c.state === 'in' || c.state === 'eat');
    this.breed -= dt;
    const maxRabbits = Math.min(24, Math.round(MAX_BASE * this.dayScale));
    if (this.breed <= 0 && this.t < BREED_UNTIL) {
      this.breed = BREED_EVERY;
      let made = 0;
      for (const c of live().slice(0, 5)) {
        if (this.rabbits.length >= maxRabbits) break;
        this.add(c.x + 4, c.y);
        this.ctx.view.heart(c.x, c.y - 12);
        made++;
      }
      if (made) this.progress(`The rabbits multiplied! ${live().length} in the field`, 0xff9a6a);
    }
    for (const c of this.rabbits) {
      if (c.state === 'gone') continue;
      if (c.state !== 'out' && playerNear(this.ctx, c.x, c.y, 20)) {
        this.flee(c);
        this.shooed++;
        audio.play('pop');
        const n = live().length;
        this.progress(n ? `Rabbits left: ${n}` : 'The field is rabbit-free... for now.');
      }
      if (c.state === 'eat') {
        c.timer -= dt;
        if (c.timer <= 0) {
          const tx = Math.floor(c.gx / 16);
          const ty = Math.floor((c.gy - 6) / 16);
          if (this.eaten < this.cap(EAT_BASE) && this.ctx.grid.tile(tx, ty)?.crop) {
            this.ctx.crops.damage(tx, ty, 1);
            this.eaten++;
            this.ctx.view.burst(c.x, c.y - 4, 'leafp', 3, 8);
          }
          this.aim(c);
        }
      } else {
        // hoppy, zig-zagging run
        if (c.state === 'in') c.x += Math.sin(this.t * 9 + c.gx) * 20 * dt;
        if (stepTo(c, c.state === 'out' ? 95 : 52, dt)) {
          if (c.state === 'in') {
            c.state = 'eat';
            c.timer = 2.4;
          } else if (c.hp > 0 && this.t < BREED_UNTIL) {
            // hops back in from another edge
            c.hp--;
            const e = edgePoint(this.ctx);
            c.x = e.x;
            c.y = e.y;
            this.aim(c);
          } else {
            c.state = 'gone';
            c.spr?.setVisible(false);
          }
        }
      }
      syncCritter(c);
    }
    if ((this.t > 5 && this.rabbits.every((c) => c.state === 'gone')) || this.t > TIMEOUT) this.done = true;
  }

  end(): void {
    killCritters(this.rabbits);
    this.rabbits = [];
    this.note = `${this.born} rabbits showed up. They nibbled ${this.eaten} crops. I shooed ${this.shooed}.`;
  }

  location() {
    const c = this.rabbits[0];
    return c ? { x: c.gx, y: c.gy } : null;
  }

  serialize() {
    return { ...super.serialize(), rabbits: saveCritters(this.rabbits), born: this.born, eaten: this.eaten, shooed: this.shooed, breed: this.breed };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.rabbits = loadCritters(this.ctx, d.rabbits, 'fx2_rabbit');
    this.rabbits.forEach((c) => c.spr?.setVisible(c.state !== 'gone'));
    this.born = Number(d.born ?? 0);
    this.eaten = Number(d.eaten ?? 0);
    this.shooed = Number(d.shooed ?? 0);
    this.breed = Number(d.breed ?? BREED_EVERY);
  }
}
