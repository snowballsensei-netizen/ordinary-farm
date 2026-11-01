// A few crops pull themselves out of the ground and go for a walk, stomping
// other crops, and stomped crops can wake up and join them. Catch them
// (interact, scythe or basket) to harvest them; they wriggle free the first time.
import { audio } from '../audio/AudioManager';
import { ITEMS } from '../config/items';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';
import { critter, edgePoint, hitsTile, killCritters, loadCritters, saveCritters, spawnSprite, stepTo, syncCritter, type Critter } from './critters';

const RISE_BASE = 5;
const STOMP_BASE = 4;
const LEAVE_AT = 120;
const TIMEOUT = 200;

export class PumpkinUprising extends ChaosEvent {
  readonly id = 'pumpkin_uprising';
  walkers: Critter[] = [];
  stomped = 0;
  caught = 0;
  escaped = 0;
  risen = 0;

  canTrigger(): boolean {
    return this.ctx.grid.plantedTiles((t) => !!t.crop && !t.crop.dead && t.crop.days > 0).length >= 3;
  }

  requirement(): string {
    return 'needs 3+ growing crops';
  }

  start(): void {
    const r = this.ctx.chaosRng;
    const pool = this.ctx.grid.plantedTiles((t) => !!t.crop && !t.crop.dead && t.crop.days > 0);
    pool.sort((a, b) => (b.t.crop!.id === 'pumpkin' ? 1 : 0) - (a.t.crop!.id === 'pumpkin' ? 1 : 0));
    const n = Math.min(this.cap(RISE_BASE), pool.length, 4 + Math.floor(this.ctx.state.chaos.level / 30));
    for (let i = 0; i < n; i++) {
      const p = pool.splice(i < 2 ? 0 : r.int(0, pool.length - 1), 1)[0];
      this.rise(p.x, p.y, p.t.crop!.id);
    }
    audio.play('pop');
    this.shake(200, 0.003);
    this.progress(`${n} crops are walking around! Catch them twice.`, 0xff9a6a, true);
  }

  private rise(x: number, y: number, id: string): void {
    const c = critter(tc(x), tc(y) + 6, 'walk', 2);
    c.carry = { id, qty: 1 };
    this.ctx.crops.destroy(x, y);
    this.ctx.view.burst(c.x, c.y - 4, 'clod', 6, 10);
    spawnSprite(this.ctx, c, 'fx2_pumpkin');
    this.wander(c);
    this.walkers.push(c);
    this.risen++;
  }

  private loose(): number {
    return this.walkers.filter((c) => c.state !== 'gone').length;
  }

  private wander(c: Critter): void {
    const crops = this.ctx.grid.plantedTiles((t) => !t.crop?.dead);
    if (crops.length && this.stomped < this.cap(STOMP_BASE) && this.ctx.chaosRng.chance(0.65)) {
      const p = this.ctx.chaosRng.pick(crops);
      c.gx = tc(p.x);
      c.gy = tc(p.y) + 6;
      c.state = 'stomp';
    } else {
      c.gx = c.x + this.ctx.chaosRng.int(-80, 80);
      c.gy = c.y + this.ctx.chaosRng.int(-50, 50);
      c.state = 'walk';
    }
  }

  update(dt: number): void {
    for (const c of this.walkers) {
      if (c.state === 'gone') continue;
      if (this.t > LEAVE_AT && c.state !== 'out') {
        const e = edgePoint(this.ctx);
        c.gx = e.x;
        c.gy = e.y;
        c.state = 'out';
      }
      if (stepTo(c, (c.state === 'out' ? 50 : c.hp < 2 ? 46 : 36) * Math.min(1.2, this.dayScale), dt)) {
        if (c.state === 'stomp') {
          const tx = Math.floor(c.gx / 16);
          const ty = Math.floor((c.gy - 6) / 16);
          const t = this.ctx.grid.tile(tx, ty);
          if (this.stomped < this.cap(STOMP_BASE) && t?.crop) {
            this.ctx.crops.damage(tx, ty, 1);
            this.stomped++;
            this.ctx.view.burst(c.x, c.y - 4, 'leafp', 4, 8);
            // the uprising spreads: a stomped crop may wake up too
            if (t.crop && !t.crop.dead && t.crop.days > 0 && this.risen < this.cap(RISE_BASE) + 3 && this.t < LEAVE_AT - 20 && this.ctx.chaosRng.chance(0.3)) {
              this.rise(tx, ty, t.crop.id);
              this.ctx.toast('Another crop joined the uprising!', 0xff6a5a);
            }
          }
        }
        if (c.state === 'out') {
          c.state = 'gone';
          this.escaped++;
          c.spr?.setVisible(false);
        } else this.wander(c);
      }
      syncCritter(c);
    }
    if (this.walkers.every((c) => c.state === 'gone') || this.t > TIMEOUT) this.done = true;
  }

  private catchAt(tx: number, ty: number): boolean {
    const c = this.walkers.find((k) => k.state !== 'gone' && hitsTile(tx, ty, k.x, k.y, 1));
    if (!c) return false;
    if (c.hp > 1) {
      // it wriggles free and hops away
      c.hp--;
      const p = this.ctx.state.player;
      const a = Math.atan2(c.y - p.y, c.x - p.x);
      c.gx = c.x + Math.cos(a) * 60;
      c.gy = c.y + Math.sin(a) * 60;
      c.state = 'walk';
      this.ctx.view.floatText(c.x, c.y - 14, 'Wriggled free!', 0xffe58a);
      audio.play('pop');
      return true;
    }
    c.state = 'gone';
    c.spr?.setVisible(false);
    this.caught++;
    if (c.carry && ITEMS[c.carry.id]) {
      this.ctx.inv.add(c.carry.id, 1);
      this.ctx.view.floatText(c.x, c.y - 14, `+1 ${ITEMS[c.carry.id].name}`, 0x8fd458);
    }
    audio.play('pop');
    const left = this.loose();
    this.progress(left ? `Walking crops left: ${left}` : 'Every crop is caught!', left ? 0xffe58a : 0x8fd458, !left);
    return true;
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    return (tool === 'scythe' || tool === 'basket') && this.catchAt(tx, ty);
  }

  onInteract(tx: number, ty: number): boolean {
    return this.catchAt(tx, ty);
  }

  end(): void {
    const left = this.walkers.filter((c) => c.state !== 'gone').length;
    killCritters(this.walkers);
    this.walkers = [];
    this.note = `I caught ${this.caught}. ${this.escaped + left} wandered off into the woods. ${this.stomped} crops got stomped.`;
  }

  location() {
    const c = this.walkers[0];
    return c ? { x: c.x, y: c.y } : null;
  }

  serialize() {
    return { ...super.serialize(), walkers: saveCritters(this.walkers), stomped: this.stomped, caught: this.caught, escaped: this.escaped, risen: this.risen };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.walkers = loadCritters(this.ctx, d.walkers, 'fx2_pumpkin');
    this.walkers.forEach((c) => c.spr?.setVisible(c.state !== 'gone'));
    this.stomped = Number(d.stomped ?? 0);
    this.caught = Number(d.caught ?? 0);
    this.escaped = Number(d.escaped ?? 0);
    this.risen = Number(d.risen ?? this.walkers.length);
  }
}
