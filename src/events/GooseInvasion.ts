// Honking geese chase the farmer, snatch things out of their pockets and peck
// (draining energy). Whack a goose to make it drop its loot; each goose takes
// two whacks before it gives up. Geese that fly off with loot circle back.
import { audio } from '../audio/AudioManager';
import { ITEMS } from '../config/items';
import { ChaosEvent } from './ChaosEvent';
import { critter, edgePoint, hitsTile, killCritters, loadCritters, saveCritters, spawnSprite, stepTo, syncCritter, type Critter } from './critters';

const STEAL_BASE = 3;
const PECK_ENERGY = 3;
const CHASE_TIME = 100;
const TIMEOUT = 170;

export class GooseInvasion extends ChaosEvent {
  readonly id = 'goose_invasion';
  geese: Critter[] = [];
  stolen = 0;
  bonked = 0;
  pecks = 0;
  private honk = 0;

  start(): void {
    const n = Math.min(6, 3 + Math.floor(this.ctx.state.chaos.level / 35) + (this.ctx.state.absDay > 20 ? 1 : 0));
    const p = this.ctx.state.player;
    for (let i = 0; i < n; i++) {
      const e = edgePoint(this.ctx);
      // spawn just off-screen near the player so the chase starts quickly
      const c = critter(p.x + Math.sign(e.x - p.x || 1) * 200, p.y + this.ctx.chaosRng.int(-60, 60), 'chase', 2);
      spawnSprite(this.ctx, c, 'fx2_goose');
      this.geese.push(c);
    }
    this.progress(`${n} angry geese! Whack each one twice.`, 0xff9a6a, true);
  }

  private flee(c: Critter): void {
    const e = edgePoint(this.ctx);
    c.gx = e.x;
    c.gy = e.y;
    c.state = 'out';
  }

  private backOff(c: Critter, dist: number, time: number): void {
    const p = this.ctx.state.player;
    const a = Math.atan2(c.y - p.y, c.x - p.x) + this.ctx.chaosRng.int(-5, 5) / 10;
    c.gx = c.x + Math.cos(a) * dist;
    c.gy = c.y + Math.sin(a) * dist;
    c.state = 'stun';
    c.timer = time;
  }

  private steal(c: Critter): void {
    const inv = this.ctx.state.inventory;
    const idx = inv.findIndex((s) => s && ITEMS[s.id] && ITEMS[s.id].cat !== 'tool');
    if (idx < 0 || this.stolen >= this.cap(STEAL_BASE) || c.carry) {
      this.peck(c);
      return;
    }
    const s = inv[idx]!;
    c.carry = { id: s.id, qty: 1, star: s.star };
    this.ctx.inv.removeAt(idx, 1);
    this.stolen++;
    this.ctx.toast(`A goose snatched your ${ITEMS[s.id].name}!`, 0xff9a6a);
    this.ctx.hud();
    this.flee(c);
  }

  private peck(c: Critter): void {
    const p = this.ctx.state.player;
    p.energy = Math.max(0, p.energy - PECK_ENERGY);
    this.pecks++;
    this.ctx.view.floatText(c.x, c.y - 16, 'PECK!', 0xff6a5a);
    this.shake(120, 0.004);
    audio.play('honk');
    this.ctx.hud();
    this.backOff(c, 26, 1.2);
  }

  private alive(): Critter[] {
    return this.geese.filter((g) => g.state !== 'gone' && g.state !== 'out');
  }

  update(dt: number): void {
    const p = this.ctx.state.player;
    this.honk -= dt;
    if (this.honk <= 0) {
      this.honk = 1.3;
      audio.play('honk');
    }
    const chaseSpeed = Math.min(72, 60 * this.dayScale);
    for (const c of this.geese) {
      if (c.state === 'gone') continue;
      if (c.state === 'chase') {
        // weave a bit instead of a straight line
        c.gx = p.x + Math.sin(this.t * 3 + c.hp) * 10;
        c.gy = p.y + Math.cos(this.t * 2.3) * 6;
        if (stepTo(c, chaseSpeed, dt) || Math.hypot(p.x - c.x, p.y - c.y) < 10) this.steal(c);
        if (this.t > CHASE_TIME) this.flee(c);
      } else if (c.state === 'stun') {
        c.timer -= dt;
        stepTo(c, 70, dt);
        if (c.timer <= 0) c.state = this.t > CHASE_TIME ? 'out' : 'chase';
        if (c.state === 'out') this.flee(c);
      } else if (stepTo(c, 74, dt)) {
        // a goose that got away with loot circles back for more (once)
        if (c.carry && c.hp > 1 && this.t < CHASE_TIME - 20) {
          c.hp = 1;
          c.state = 'chase';
          this.ctx.toast('A goose is coming back for more! HONK!', 0xff9a6a);
        } else {
          c.state = 'gone';
          c.spr?.setVisible(false);
        }
      }
      syncCritter(c);
    }
    if (this.geese.every((c) => c.state === 'gone') || this.t > TIMEOUT) this.done = true;
  }

  onTool(_tool: string, tx: number, ty: number): boolean {
    const c = this.geese.find((g) => g.state !== 'gone' && hitsTile(tx, ty, g.x, g.y, 1));
    if (!c) return false;
    this.bonked++;
    c.hp--;
    if (c.carry) {
      this.ctx.inv.add(c.carry.id, c.carry.qty, !!c.carry.star);
      this.ctx.toast(`Got your ${ITEMS[c.carry.id]?.name ?? 'stuff'} back!`, 0x8fd458);
      c.carry = undefined;
      this.stolen--;
      this.ctx.hud();
    }
    this.ctx.view.burst(c.x, c.y - 6, 'feather', 6, 12);
    audio.play('honk');
    this.shake(70, 0.002);
    if (c.hp <= 0) this.flee(c);
    else {
      this.backOff(c, 30, 1.5);
      this.ctx.view.floatText(c.x, c.y - 16, 'HONK?!', 0xffe58a);
    }
    const left = this.alive().length;
    this.progress(left ? `Geese left: ${left}` : 'The geese retreat!', left ? 0xffe58a : 0x8fd458, !left);
    return true;
  }

  end(): void {
    killCritters(this.geese);
    this.geese = [];
    const pecked = this.pecks ? ` Got pecked ${this.pecks} times.` : '';
    this.note = (this.stolen > 0 ? `They got away with ${this.stolen} thing${this.stolen === 1 ? '' : 's'}. Possibly my hat.` : `I bonked geese ${this.bonked} times and kept everything.`) + pecked;
  }

  location() {
    return { x: this.ctx.state.player.x, y: this.ctx.state.player.y };
  }

  serialize() {
    return { ...super.serialize(), geese: saveCritters(this.geese), stolen: this.stolen, bonked: this.bonked, pecks: this.pecks };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.geese = loadCritters(this.ctx, d.geese, 'fx2_goose');
    this.geese.forEach((c) => c.spr?.setVisible(c.state !== 'gone'));
    this.stolen = Number(d.stolen ?? 0);
    this.bonked = Number(d.bonked ?? 0);
    this.pecks = Number(d.pecks ?? 0);
  }
}
