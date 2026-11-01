// Raccoons raid the shipping bin (or the field if the bin is empty) and run
// off with loot. Catch them (walk into them) to get the loot back. They run
// faster than you walk and juke sideways, so sprint. Empty-handed raccoons
// that get scared off come back for another go.
import { ITEMS } from '../config/items';
import { audio } from '../audio/AudioManager';
import { LAYOUT } from '../world/layout';
import { ChaosEvent } from './ChaosEvent';
import { ROUTE, tc } from './helpers';
import { critter, edgePoint, killCritters, loadCritters, playerNear, saveCritters, spawnSprite, stepTo, syncCritter, type Critter } from './critters';

const STEAL_BASE = 3;  // stacks taken from the bin (scaled by cap())
const EAT_BASE = 3;    // crops eaten when the bin is empty
const TIMEOUT = 200;

export class RaccoonHeist extends ChaosEvent {
  readonly id = 'raccoon_heist';
  coons: Critter[] = [];
  stolen = 0;
  eaten = 0;
  caught = 0;

  start(): void {
    const n = Math.min(6, 3 + Math.floor(this.ctx.state.chaos.level / 30) + (this.ctx.state.absDay > 15 ? 1 : 0));
    for (let i = 0; i < n; i++) {
      const e = edgePoint(this.ctx);
      const c = critter(e.x, e.y, 'in', 1); // hp = comebacks left
      this.aim(c);
      spawnSprite(this.ctx, c, 'fx2_raccoon');
      this.coons.push(c);
    }
    audio.play('alarm');
  }

  private aim(c: Critter): void {
    if (this.ctx.state.bin.length) {
      c.gx = ROUTE.binFront.x + this.ctx.chaosRng.int(-10, 10);
      c.gy = ROUTE.binFront.y;
      c.state = 'in';
      return;
    }
    const crops = this.ctx.grid.plantedTiles((t) => !t.crop?.dead);
    if (crops.length && this.eaten < this.cap(EAT_BASE)) {
      const p = this.ctx.chaosRng.pick(crops);
      c.gx = tc(p.x);
      c.gy = tc(p.y) + 4;
      c.state = 'crop';
      return;
    }
    this.flee(c);
  }

  private flee(c: Critter): void {
    const e = edgePoint(this.ctx);
    c.gx = e.x;
    c.gy = e.y;
    c.state = 'out';
  }

  update(dt: number): void {
    const ctx = this.ctx;
    for (const c of this.coons) {
      // juke: a raccoon you're closing in on darts sideways
      c.timer -= dt;
      if (c.state !== 'gone' && c.timer <= 0 && playerNear(ctx, c.x, c.y, 34) && ctx.chaosRng.chance(0.55)) {
        const p = ctx.state.player;
        const a = Math.atan2(c.y - p.y, c.x - p.x) + (ctx.chaosRng.chance(0.5) ? 1.3 : -1.3);
        c.x += Math.cos(a) * 14;
        c.y += Math.sin(a) * 14;
        c.timer = 1.4;
        ctx.view.floatText(c.x, c.y - 14, 'dodge!', 0xffe58a);
      }
      if (c.state !== 'gone' && playerNear(ctx, c.x, c.y, 13)) {
        if (c.carry) {
          ctx.state.bin.push(c.carry);
          ctx.toast(`Got it back: ${c.carry.qty}x ${ITEMS[c.carry.id]?.name ?? c.carry.id}!`, 0x8fd458);
          c.carry = undefined;
          this.stolen--;
          const left = this.coons.filter((k) => k.carry).length;
          if (left) this.progress(`${left} raccoon${left === 1 ? '' : 's'} still carrying loot!`);
        }
        if (c.state !== 'out') this.caught++;
        ctx.view.floatText(c.x, c.y - 14, '*hiss*', 0xffe58a);
        this.flee(c);
        c.timer = 2;
      }
      // fleeing raccoons outrun a walking farmer (78); sprint to catch them
      const speed = (c.state === 'out' ? (c.carry ? 98 : 112) : 70) * Math.min(1.15, this.dayScale);
      if (stepTo(c, speed, dt)) {
        if (c.state === 'in') this.steal(c);
        else if (c.state === 'crop') {
          const tx = Math.floor(c.gx / 16);
          const ty = Math.floor((c.gy - 4) / 16);
          if (this.eaten < this.cap(EAT_BASE) && ctx.grid.tile(tx, ty)?.crop) {
            ctx.crops.damage(tx, ty, 2);
            this.eaten++;
            ctx.view.burst(c.x, c.y - 4, 'leafp', 4, 8);
          }
          this.flee(c);
        } else if (c.state === 'out') {
          if (!c.carry && c.hp > 0 && this.t < TIMEOUT - 50) {
            // came back empty-handed: try again from another edge
            c.hp--;
            const e = edgePoint(ctx);
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
    if (this.coons.every((c) => c.state === 'gone') || this.t > TIMEOUT) this.done = true;
  }

  private steal(c: Critter): void {
    const bin = this.ctx.state.bin;
    if (bin.length && this.stolen < this.cap(STEAL_BASE)) {
      const i = this.ctx.chaosRng.int(0, bin.length - 1);
      const s = bin[i];
      const n = Math.max(1, Math.ceil(s.qty / 2));
      s.qty -= n;
      if (s.qty <= 0) bin.splice(i, 1);
      c.carry = { id: s.id, qty: n, star: s.star };
      this.stolen++;
      this.ctx.view.setBinOpen(true);
      this.ctx.scene.time.delayedCall(500, () => this.ctx.view.setBinOpen(false));
      this.ctx.view.floatText(c.x, c.y - 14, `+${n} ${ITEMS[s.id]?.name ?? ''}`, 0xff9a6a);
      this.progress(`A raccoon grabbed ${n}x ${ITEMS[s.id]?.name ?? 'loot'}! Sprint after it!`, 0xff9a6a, true);
      this.flee(c);
    } else this.aim(c);
  }

  end(): void {
    killCritters(this.coons);
    this.coons = [];
    this.note = this.stolen > 0
      ? `They got away with ${this.stolen} bag${this.stolen === 1 ? '' : 's'} of loot. I caught ${this.caught}.`
      : `I caught ${this.caught} of the little bandits. Nothing lost${this.eaten ? `, except ${this.eaten} crops` : ''}.`;
  }

  location() {
    return { x: tc(LAYOUT.bin.x), y: tc(LAYOUT.bin.y) };
  }

  serialize() {
    return { ...super.serialize(), coons: saveCritters(this.coons), stolen: this.stolen, eaten: this.eaten, caught: this.caught };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.coons = loadCritters(this.ctx, d.coons, 'fx2_raccoon');
    this.coons.forEach((c) => c.spr?.setVisible(c.state !== 'gone'));
    this.stolen = Number(d.stolen ?? 0);
    this.eaten = Number(d.eaten ?? 0);
    this.caught = Number(d.caught ?? 0);
  }
}
