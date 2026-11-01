// A locust cloud drifts from crop to crop, chewing as it goes. Swing the
// scythe into it to thin it out. Big clouds split in two when hit, and
// clouds left alone grow back. Every hit point must be scythed away.
import { audio } from '../audio/AudioManager';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';
import { critter, edgePoint, hitsTile, killCritters, loadCritters, saveCritters, spawnSprite, stepTo, syncCritter, type Critter } from './critters';

const EAT_BASE = 8;
const MAX_CLOUDS = 5;
const GROW_EVERY = 25; // seconds without a hit before a cloud regrows
const TIMEOUT = 220;

export class LocustPlague extends ChaosEvent {
  readonly id = 'locust_plague';
  clouds: Critter[] = [];
  eaten = 0;
  sinceHit = 0;
  private buzz = 0;

  canTrigger(): boolean {
    return this.ctx.grid.plantedTiles((t) => !t.crop?.dead).length > 0;
  }

  requirement(): string {
    return 'needs planted crops';
  }

  private get eatCap(): number {
    return this.cap(EAT_BASE);
  }

  start(): void {
    const n = this.ctx.state.chaos.level > 50 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const e = edgePoint(this.ctx);
      const hp = this.ctx.chaosRng.int(6, 7) + (this.ctx.state.absDay > 20 ? 1 : 0);
      const c = critter(e.x, e.y, 'in', hp);
      this.retarget(c);
      spawnSprite(this.ctx, c, 'fx2_locust', 7400);
      this.clouds.push(c);
    }
    this.progress(`Locusts: ${this.hitsLeft()} scythe hits left`, 0xffe58a, true);
  }

  private hitsLeft(): number {
    return this.clouds.filter((c) => c.state === 'in' || c.state === 'eat').reduce((a, c) => a + c.hp, 0);
  }

  private retarget(c: Critter): void {
    const crops = this.ctx.grid.plantedTiles((t) => !t.crop?.dead);
    if (!crops.length || this.eaten >= this.eatCap) {
      this.leave(c);
      return;
    }
    // mostly a nearby crop so it "spreads" across the field; sometimes a wild jump
    crops.sort((a, b) => Math.hypot(tc(a.x) - c.x, tc(a.y) - c.y) - Math.hypot(tc(b.x) - c.x, tc(b.y) - c.y));
    const r = this.ctx.chaosRng;
    const p = r.chance(0.2) ? r.pick(crops) : crops[Math.min(crops.length - 1, r.int(0, 3))];
    c.gx = tc(p.x);
    c.gy = tc(p.y) + 6;
    c.state = 'in';
  }

  private leave(c: Critter): void {
    const e = edgePoint(this.ctx);
    c.gx = e.x;
    c.gy = e.y;
    c.state = 'out';
  }

  update(dt: number): void {
    this.buzz -= dt;
    this.sinceHit += dt;
    if (this.buzz <= 0) {
      this.buzz = 2;
      audio.play('buzz');
    }
    // ignored clouds regrow (escalation)
    if (this.sinceHit > GROW_EVERY) {
      this.sinceHit = 0;
      const live = this.clouds.filter((c) => c.state === 'in' || c.state === 'eat');
      for (const c of live) c.hp = Math.min(10, c.hp + 1);
      if (live.length) this.progress(`The swarm is growing! ${this.hitsLeft()} hits left`, 0xff9a6a, true);
    }
    const speed = 34 * this.dayScale;
    for (const c of this.clouds) {
      if (c.state === 'in') {
        // erratic jitter while flying
        c.x += this.ctx.chaosRng.int(-1, 1) * 18 * dt;
        c.y += this.ctx.chaosRng.int(-1, 1) * 18 * dt;
        if (stepTo(c, speed, dt)) {
          c.state = 'eat';
          c.timer = 1.6;
        }
      } else if (c.state === 'eat') {
        c.timer -= dt;
        if (c.timer <= 0) {
          const tx = Math.floor(c.gx / 16);
          const ty = Math.floor((c.gy - 6) / 16);
          if (this.eaten < this.eatCap && this.ctx.grid.tile(tx, ty)?.crop) {
            this.ctx.crops.damage(tx, ty, 1);
            this.eaten++;
            this.ctx.view.burst(c.gx, c.gy - 6, 'leafp', 6, 10);
          }
          this.retarget(c);
        }
      } else if (c.state === 'out' && stepTo(c, 55, dt)) c.state = 'gone';
      syncCritter(c, true);
      c.spr?.setVisible(c.state !== 'gone').setScale(0.45 + Math.min(c.hp, 10) * 0.1);
    }
    if (this.clouds.every((c) => c.state === 'gone')) this.done = true;
    if (this.t > TIMEOUT && !this.done) {
      for (const c of this.clouds) if (c.state === 'in' || c.state === 'eat') this.leave(c);
      if (this.t > TIMEOUT + 20) this.done = true;
    }
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'scythe') return false;
    const c = this.clouds.find((k) => (k.state === 'in' || k.state === 'eat') && hitsTile(tx, ty, k.x, k.y, 1));
    if (!c) return false;
    c.hp--;
    this.sinceHit = 0;
    this.ctx.view.burst(c.x, c.y - 10, 'pixel', 8, 18, 400, 0x6a8a2a);
    audio.play('buzz');
    this.shake(80, 0.002);
    if (c.hp <= 0) {
      this.leave(c);
      const left = this.hitsLeft();
      this.progress(left > 0 ? `A cloud scatters! Locusts: ${left} hits left` : 'The last locust cloud scatters!', 0x8fd458, true);
      return true;
    }
    // big clouds split into two smaller ones that fly apart
    const live = this.clouds.filter((k) => k.state === 'in' || k.state === 'eat').length;
    if (c.hp >= 4 && live < MAX_CLOUDS) {
      const half = Math.floor(c.hp / 2);
      c.hp -= half;
      const d = critter(c.x + this.ctx.chaosRng.int(-12, 12), c.y + this.ctx.chaosRng.int(-12, 12), 'in', half);
      spawnSprite(this.ctx, d, 'fx2_locust', 7400);
      this.clouds.push(d);
      this.retarget(d);
      this.retarget(c);
      this.ctx.view.floatText(c.x, c.y - 22, 'It split!', 0xff9a6a);
    }
    this.progress(`Locusts: ${this.hitsLeft()} hits left`);
    return true;
  }

  end(): void {
    killCritters(this.clouds);
    this.clouds = [];
    this.note = `They chewed ${this.eaten} crop${this.eaten === 1 ? '' : 's'}.`;
  }

  location() {
    const c = this.clouds[0];
    return c ? { x: c.gx, y: c.gy } : null;
  }

  serialize() {
    return { ...super.serialize(), clouds: saveCritters(this.clouds), eaten: this.eaten, sinceHit: this.sinceHit };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.clouds = loadCritters(this.ctx, d.clouds, 'fx2_locust', 7400);
    this.clouds.forEach((c) => c.spr?.setVisible(c.state !== 'gone'));
    this.eaten = Number(d.eaten ?? 0);
    this.sinceHit = Number(d.sinceHit ?? 0);
  }
}
