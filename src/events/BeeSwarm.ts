// An angry hive boils over: a buzzing cloud chases the player, stings
// (draining energy) and panics any animal it passes. Calm it with the smoker
// (5+ puffs, and drowsiness wears off if you stop) or soothe it with sugar
// water, which only counts as a couple of puffs. Left alone it grows angrier.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

const SPEED = 50;           // px/s, slower than a walking farmer (78)
const STING_RANGE = 13;
const STING_EVERY = 1.3;
const STING_ENERGY = 8;
const PANIC_RANGE = 64;
const MAX_TIME = 200;
const PUFF_DECAY = 12;      // seconds without a puff before one wears off
const ENRAGE_AT = 70;       // seconds of chasing before the swarm gets angrier

export class BeeSwarm extends ChaosEvent {
  readonly id = 'bee_swarm';
  hiveId = '';
  x = 0;
  y = 0;
  mode: 'chase' | 'home' = 'chase';
  stingCd = 0;
  puffs = 0;
  stings = 0;
  calmedBy = '';
  need = 5;
  sincePuff = 0;
  sugared = 0;
  enraged = false;
  private panicCd = 0;
  private bees: Phaser.GameObjects.Sprite[] = [];
  private buzzT = 0;

  canTrigger(): boolean {
    return !!this.ctx.bees?.angriest();
  }

  requirement(): string {
    return 'needs an angry beehive';
  }

  private hive() {
    return this.ctx.state.hives.find((h) => h.id === this.hiveId);
  }

  start(): void {
    const h = this.ctx.bees.angriest()!;
    this.hiveId = h.id;
    this.x = tc(h.x);
    this.y = tc(h.y) - 4;
    this.need = 5 + (this.ctx.state.absDay > 20 ? 1 : 0);
    this.makeSprites();
    this.shake(200, 0.003);
  }

  private makeSprites(): void {
    for (let i = 0; i < (this.enraged ? 22 : 14); i++) {
      this.bees.push(this.ctx.scene.add.sprite(this.x, this.y, 'bee_bee', 0).play('bee_buzz').setDepth(7450));
    }
  }

  private near(px: number, py: number, r: number): boolean {
    return Math.hypot(px - this.x, py - this.y) < r;
  }

  update(dt: number): void {
    const ctx = this.ctx;
    const p = ctx.state.player;
    let gx = p.x;
    let gy = p.y - 8;
    if (this.mode === 'home') {
      const h = this.hive();
      gx = h ? tc(h.x) : this.x;
      gy = h ? tc(h.y) - 4 : this.y - 200;
    }
    const d = Math.hypot(gx - this.x, gy - this.y);
    // erratic surges; drowsy bees slow down, enraged ones speed up
    const drowsy = 1 - (this.puffs / this.need) * 0.45;
    const surge = 1 + Math.sin(this.t * 2.1) * 0.25;
    const sp = this.mode === 'home' ? SPEED * 1.6 : SPEED * drowsy * surge * (this.enraged ? 1.2 : 1);
    if (d > 1) {
      const step = Math.min(d, sp * dt);
      this.x += ((gx - this.x) / d) * step;
      this.y += ((gy - this.y) / d) * step;
    }

    if (this.mode === 'chase') {
      this.sincePuff += dt;
      if (this.puffs > 0 && this.sincePuff > PUFF_DECAY) {
        this.puffs--;
        this.sincePuff = 0;
        this.ctx.toast(`The bees are waking up! (${this.puffs}/${this.need})`, 0xff9a6a);
      }
      if (!this.enraged && this.t > ENRAGE_AT) {
        this.enraged = true;
        this.bees.forEach((b) => b.destroy());
        this.bees = [];
        this.makeSprites();
        this.shake(300, 0.005);
        this.ctx.toast('The swarm is getting BIGGER and angrier!', 0xff6a5a);
      }
      this.stingCd -= dt;
      if (d < STING_RANGE && this.stingCd <= 0 && ctx.freeze <= 0) {
        this.stingCd = STING_EVERY;
        this.stings++;
        p.energy = Math.max(0, p.energy - STING_ENERGY - (this.enraged ? 2 : 0));
        this.shake(120, 0.004);
        ctx.toast('OW! Bee sting!', 0xff6a5a);
        ctx.view.floatText(p.x, p.y - 22, 'OW!', 0xff6a5a);
        ctx.hud();
        audio.play('error');
      }
      // panic nearby animals
      this.panicCd -= dt;
      if (this.panicCd <= 0) {
        this.panicCd = 0.8;
        for (const a of ctx.animals.list) {
          if (a.asleep || a.onRoof || ctx.animals.isBusy(a.id)) continue;
          if (!this.near(a.x, a.y, PANIC_RANGE)) continue;
          ctx.animals.stampede(a.id, Math.atan2(a.y - this.y, a.x - this.x), 1.4, 2.6);
        }
      }
      if (this.t > MAX_TIME) {
        this.mode = 'home';
        this.calmedBy = 'tired';
      }
    } else if (d < 3) this.done = true;

    this.buzzT -= dt;
    if (this.buzzT <= 0) {
      this.buzzT = 1.2;
      audio.play('buzz');
    }
    const spread = this.mode === 'home' ? 6 : 12;
    this.bees.forEach((b, i) => {
      const ph = this.t * (5 + (i % 4)) + i * 1.7;
      b.setPosition(this.x + Math.cos(ph) * spread * ((i % 3) / 3 + 0.4), this.y + Math.sin(ph * 1.3) * spread * 0.7);
      b.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(this.t * 11 + i)));
      b.setFlipX(Math.cos(ph) > 0);
    });
  }

  /** The smoker, aimed at (or used next to) the swarm. */
  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'smoker' || this.mode !== 'chase') return false;
    const p = this.ctx.state.player;
    if (!this.near(tc(tx), tc(ty), 28) && !this.near(p.x, p.y - 8, 36)) return false;
    this.puffs++;
    this.sincePuff = 0;
    this.ctx.player.swing('icon_smoker');
    this.ctx.view.burst(this.x, this.y, 'bee_smoke', 10, 16, 900);
    if (this.puffs >= this.need) {
      this.mode = 'home';
      this.calmedBy = 'smoker';
      this.ctx.toast('The swarm calms down and drifts home.', 0x8fd458);
    } else this.progress(`Puff! The swarm is getting drowsy (${this.puffs}/${this.need}).`, 0xd8d8d0, true);
    return true;
  }

  /** Sugar water soothes the swarm a little (worth 2 puffs, max twice). */
  onInteract(tx: number, ty: number): boolean {
    if (this.mode !== 'chase' || this.ctx.inv.selected()?.id !== 'sugar_water') return false;
    const p = this.ctx.state.player;
    if (!this.near(tc(tx), tc(ty), 32) && !this.near(p.x, p.y - 8, 40)) return false;
    if (this.sugared >= 2) {
      this.ctx.toast('The bees ignore the sugar water. Use the smoker!', 0xff9a6a);
      return true;
    }
    this.ctx.inv.remove('sugar_water', 1);
    this.sugared++;
    this.puffs = Math.min(this.need, this.puffs + 2);
    this.sincePuff = 0;
    this.ctx.view.burst(this.x, this.y, 'waterp', 6, 10);
    if (this.puffs >= this.need) {
      this.mode = 'home';
      this.calmedBy = 'sugar';
      this.ctx.toast('The swarm follows the sweet smell home.', 0x9fd4f0);
    } else this.progress(`The bees slurp it up and slow down (${this.puffs}/${this.need}). Keep smoking!`, 0x9fd4f0, true);
    return true;
  }

  end(): void {
    this.bees.forEach((b) => b.destroy());
    this.bees = [];
    const h = this.hive();
    if (h) {
      if (this.calmedBy === 'smoker' || this.calmedBy === 'sugar') {
        h.mood = 45;
        h.lastSmoked = this.ctx.state.absDay;
      } else {
        h.mood = 60;
        h.health = Math.max(0, h.health - 20);
      }
    }
    this.ctx.bees?.refresh();
    const how = this.calmedBy === 'smoker' ? 'I smoked them into a stupor.' : this.calmedBy === 'sugar' ? 'Sugar water lured them home.' : 'They eventually got bored.';
    this.note = `Stung ${this.stings} time${this.stings === 1 ? '' : 's'}. ${how}`;
  }

  location() {
    return { x: this.x, y: this.y };
  }

  serialize() {
    return { ...super.serialize(), hiveId: this.hiveId, x: this.x, y: this.y, mode: this.mode, puffs: this.puffs, stings: this.stings, calmedBy: this.calmedBy, need: this.need, sincePuff: this.sincePuff, sugared: this.sugared, enraged: this.enraged };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.hiveId = String(d.hiveId ?? '');
    this.x = Number(d.x ?? 0);
    this.y = Number(d.y ?? 0);
    this.mode = d.mode === 'home' ? 'home' : 'chase';
    this.puffs = Number(d.puffs ?? 0);
    this.stings = Number(d.stings ?? 0);
    this.calmedBy = String(d.calmedBy ?? '');
    this.need = Number(d.need ?? 5);
    this.sincePuff = Number(d.sincePuff ?? 0);
    this.sugared = Number(d.sugared ?? 0);
    this.enraged = !!d.enraged;
    this.makeSprites();
  }
}
