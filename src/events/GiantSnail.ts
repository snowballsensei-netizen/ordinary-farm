// A huge snail slides along a row of crops, eating each one it reaches.
// Bonk it 8+ times with any tool to send it packing. It speeds up when hurt
// and, if ignored, moves on to another row when it finishes one.
import { audio } from '../audio/AudioManager';
import { DEPTH, MAP_W, TILE } from '../config/constants';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';
import { critter, hitsTile, killCritters, loadCritters, saveCritters, spawnSprite, stepTo, syncCritter, TileMarks, type Critter } from './critters';

const EAT_BASE = 6;
const TIMEOUT = 260;

export class GiantSnail extends ChaosEvent {
  readonly id = 'giant_snail';
  snail: Critter[] = [];
  row = 0;
  eaten = 0;
  hits = 0;
  maxHp = 8;
  rows = 1;
  private marks = new TileMarks(this.ctx, 'fx2_slime', () => DEPTH.groundFx + 3, 0.8);

  canTrigger(): boolean {
    return this.ctx.grid.plantedTiles((t) => !t.crop?.dead).length >= 2;
  }

  requirement(): string {
    return 'needs 2+ planted crops';
  }

  start(): void {
    const p = this.ctx.chaosRng.pick(this.ctx.grid.plantedTiles((t) => !t.crop?.dead));
    this.row = p.y;
    const fromLeft = this.ctx.chaosRng.chance(0.5);
    const c = critter(fromLeft ? -20 : MAP_W * TILE + 20, tc(this.row) + 6, 'in', 8);
    this.maxHp = 8 + Math.min(4, Math.floor(this.ctx.state.absDay / 10));
    c.hp = this.maxHp;
    c.timer = fromLeft ? 1 : -1;
    spawnSprite(this.ctx, c, 'fx2_snail');
    this.snail = [c];
    this.next(c);
  }

  private next(c: Critter): void {
    const dir = c.timer;
    const ahead = this.ctx.grid
      .plantedTiles((t) => !t.crop?.dead)
      .filter((p) => p.y === this.row && (p.x * TILE + 8 - c.x) * dir > 2)
      .sort((a, b) => (a.x - b.x) * dir);
    if (!ahead.length && this.eaten < this.cap(EAT_BASE) && this.rows < 3 && this.t < TIMEOUT - 40) {
      // row finished: crawl onto another planted row
      const others = this.ctx.grid.plantedTiles((t) => !t.crop?.dead).filter((p) => p.y !== this.row);
      if (others.length) {
        const p = this.ctx.chaosRng.pick(others);
        this.row = p.y;
        this.rows++;
        c.gy = tc(this.row) + 6;
        c.timer = p.x * TILE + 8 > c.x ? 1 : -1;
        c.gx = tc(p.x);
        c.state = 'in';
        this.ctx.toast('The giant snail turns onto another row!', 0xff9a6a);
        return;
      }
    }
    if (ahead.length && this.eaten < this.cap(EAT_BASE)) {
      c.gx = tc(ahead[0].x);
      c.state = 'in';
    } else {
      c.gx = dir > 0 ? MAP_W * TILE + 40 : -40;
      c.state = 'out';
    }
    c.spr?.setFlipX(dir < 0);
  }

  update(dt: number): void {
    const c = this.snail[0];
    if (!c) {
      this.done = true;
      return;
    }
    // hurt snails get faster (and angrier)
    const speed = c.state === 'flee' ? 34 : (9 + (this.maxHp - c.hp) * 2.2) * this.dayScale;
    const tx = Math.floor(c.x / TILE);
    const ty = Math.floor((c.y - 6) / TILE);
    if (c.state !== 'flee' && this.ctx.grid.tile(tx, ty)) this.marks.add(tx, ty);
    if (stepTo(c, speed, dt)) {
      if (c.state === 'in') {
        const x = Math.floor(c.gx / TILE);
        if (this.ctx.grid.tile(x, this.row)?.crop && this.eaten < this.cap(EAT_BASE)) {
          this.ctx.crops.destroy(x, this.row);
          this.eaten++;
          this.ctx.view.burst(c.gx, c.gy - 6, 'leafp', 6, 10);
          audio.play('pop');
        }
        this.next(c);
      } else this.done = true;
    }
    c.spr?.setFlipX(c.gx < c.x);
    syncCritter(c);
    if (this.t > TIMEOUT && c.state === 'in') {
      c.state = 'out';
      c.gx = c.timer > 0 ? MAP_W * TILE + 40 : -40;
    }
    if (this.t > TIMEOUT + 60) this.done = true;
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    const c = this.snail[0];
    if (!c || c.state === 'flee' || !['hoe', 'axe', 'hammer', 'pickaxe', 'scythe'].includes(tool)) return false;
    if (!hitsTile(tx, ty, c.x, c.y, 1)) return false;
    this.hits++;
    c.hp--;
    c.spr?.setTint(0xffaaaa);
    this.ctx.scene.time.delayedCall(150, () => c.spr?.clearTint());
    audio.play('hammer');
    this.shake(90, 0.003);
    if (c.hp <= 0) {
      c.state = 'flee';
      c.gx = c.timer > 0 ? -40 : MAP_W * TILE + 40;
      this.ctx.toast('The giant snail retreats. Slowly.', 0x8fd458);
    } else {
      this.ctx.view.floatText(c.x, c.y - 26, `${c.hp} more!`, 0xffe58a);
      this.progress(`Giant snail: ${c.hp} hits left. It's speeding up!`);
      // it lurches forward a little when hit, so you have to follow it
      c.x += c.timer * 6;
    }
    return true;
  }

  end(): void {
    killCritters(this.snail);
    this.snail = [];
    this.marks.clear();
    this.note = `It ate ${this.eaten} crop${this.eaten === 1 ? '' : 's'} before I ${this.hits >= this.maxHp ? 'bonked it away' : 'lost track of it'}.`;
  }

  location() {
    const c = this.snail[0];
    return c ? { x: c.gx, y: c.gy } : null;
  }

  serialize() {
    return { ...super.serialize(), snail: saveCritters(this.snail), row: this.row, eaten: this.eaten, hits: this.hits, maxHp: this.maxHp, rows: this.rows };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.snail = loadCritters(this.ctx, d.snail, 'fx2_snail');
    this.row = Number(d.row ?? 0);
    this.eaten = Number(d.eaten ?? 0);
    this.hits = Number(d.hits ?? 0);
    this.maxHp = Number(d.maxHp ?? 8);
    this.rows = Number(d.rows ?? 1);
  }
}
