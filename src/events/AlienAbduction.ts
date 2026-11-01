// A UFO shows up after dark and starts beaming an animal up. Hit it (any tool
// or interact near the animal) several times to shoo it; each hit knocks the
// animal back down a bit. A shooed UFO may come back for a different animal.
// If it finishes, the animal is "returned" later, very confused and unhappy.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { TILE } from '../config/constants';
import type { AnimalState } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { hitsTile } from './critters';

const BEAM_TIME = 15;
const TIMEOUT = 150;

export class AlienAbduction extends ChaosEvent {
  readonly id = 'alien_abduction';
  animalId = '';
  phase: 'in' | 'beam' | 'out' = 'in';
  ux = 0;
  uy = 0;
  ax = 0;
  ay = 0;
  lift = 0;
  outcome: 'saved' | 'taken' | '' = '';
  hp = 4;
  retries = 1;
  private hitCd = 0;
  private ufo?: Phaser.GameObjects.Sprite;
  private beam?: Phaser.GameObjects.Image;

  private candidates(): AnimalState[] {
    return this.ctx.animals.list.filter((a) => !a.escaped && !a.onRoof && !this.ctx.animals.isBusy(a.id));
  }

  canTrigger(): boolean {
    return this.ctx.state.minutes >= 18 * 60 && this.candidates().length > 0;
  }

  requirement(): string {
    return 'needs an animal, after 6 PM';
  }

  private makeSprites(): void {
    this.ufo = this.ctx.scene.add.sprite(this.ux, this.uy, 'fx2_ufo', 0).play('fx2_ufo_anim').setDepth(7600);
    this.beam = this.ctx.scene.add.image(this.ax, this.ay, 'fx2_beam').setOrigin(0.5, 1).setDepth(7550).setVisible(false);
  }

  start(): void {
    const a = this.ctx.chaosRng.pick(this.candidates());
    this.ux = a.x + 200;
    this.uy = a.y - 140;
    this.lockOn(a);
    this.makeSprites();
    audio.play('hint');
  }

  private lockOn(a: AnimalState): void {
    this.animalId = a.id;
    this.ax = a.x;
    this.ay = a.y;
    this.lift = 0;
    this.phase = 'in';
    this.outcome = '';
    this.hp = 4 + (this.ctx.state.absDay > 20 ? 1 : 0);
  }

  private animal(): AnimalState | undefined {
    return this.ctx.animals.byId(this.animalId);
  }

  update(dt: number): void {
    const a = this.animal();
    if (!a) {
      this.done = true;
      return;
    }
    const hx = this.ax;
    const hy = this.ay - 56;
    if (this.phase === 'in') {
      const d = Math.hypot(hx - this.ux, hy - this.uy);
      if (d < 2) {
        this.phase = 'beam';
        this.ctx.animals.setPath(a.id, [{ x: this.ax, y: this.ay }], 0.01);
      } else {
        const s = Math.min(d, 110 * dt);
        this.ux += ((hx - this.ux) / d) * s;
        this.uy += ((hy - this.uy) / d) * s;
      }
    } else if (this.phase === 'beam') {
      this.lift += dt;
      this.hitCd -= dt;
      this.ux = hx + Math.sin(this.t * 3) * 3;
      this.ctx.animals.place(a, this.ax, this.ay - (this.lift / BEAM_TIME) * 44);
      this.beam?.setVisible(true).setAlpha(0.6 + Math.sin(this.t * 10) * 0.2);
      if (this.lift >= BEAM_TIME) this.takeIt(a);
    } else {
      this.ux += 140 * dt;
      this.uy -= 110 * dt;
      if (this.uy < this.ay - 400) {
        // a shooed UFO sometimes comes back for someone else
        const next = this.outcome === 'saved' && this.retries > 0 && this.t < TIMEOUT - 50
          ? this.candidates().filter((k) => k.id !== this.animalId) : [];
        if (next.length && this.ctx.chaosRng.chance(0.6)) {
          this.retries--;
          this.lockOn(this.ctx.chaosRng.pick(next));
          this.ux = this.ax - 220;
          this.uy = this.ay - 160;
          this.ctx.toast('The UFO is back... and it wants another animal!', 0xff6a5a);
          audio.play('alarm');
        } else this.done = true;
      }
    }
    this.ufo?.setPosition(this.ux, this.uy);
    this.beam?.setPosition(this.ax, this.ay + 2);
    if (this.t > TIMEOUT) this.done = true;
  }

  private takeIt(a: AnimalState): void {
    this.outcome = 'taken';
    this.phase = 'out';
    this.beam?.setVisible(false);
    this.ctx.animals.setVisible(a, false);
    this.ctx.toast(`${a.name} was beamed up!`, 0xff6a5a);
  }

  private drop(a: AnimalState): void {
    const pen = this.ctx.animals.pen(a);
    const x = ((pen.x0 + pen.x1) / 2) * TILE;
    const y = (pen.y1 - 2) * TILE;
    this.ctx.animals.place(a, this.outcome === 'taken' ? x : this.ax, this.outcome === 'taken' ? y : this.ay);
    this.ctx.animals.setVisible(a, true);
    this.ctx.animals.release(a.id);
  }

  private shoo(): void {
    const a = this.animal();
    this.outcome = 'saved';
    this.phase = 'out';
    this.beam?.setVisible(false);
    if (a) this.drop(a);
    audio.play('pop');
    this.ctx.toast('The UFO zips away in embarrassment!', 0x8fd458);
  }

  private near(tx: number, ty: number): boolean {
    return this.phase !== 'out' && (hitsTile(tx, ty, this.ax, this.ay, 2) || hitsTile(tx, ty, this.ux, this.uy + 56, 2));
  }

  onTool(_tool: string, tx: number, ty: number): boolean {
    if (!this.near(tx, ty)) return false;
    if (this.hitCd > 0) return true;
    this.hitCd = 0.25;
    this.hp--;
    this.shake(100, 0.003);
    this.ufo?.setTint(0xffaaaa);
    this.ctx.scene.time.delayedCall(150, () => this.ufo?.clearTint());
    if (this.hp <= 0) {
      this.shoo();
      return true;
    }
    // knock the animal back down a bit
    this.lift = Math.max(0, this.lift - 3);
    audio.play('bonk');
    this.ctx.view.floatText(this.ux, this.uy + 10, 'ZAP!', 0x9fffa0);
    this.progress(`UFO: ${this.hp} more hit${this.hp === 1 ? '' : 's'} to drive it off!`);
    return true;
  }

  onInteract(tx: number, ty: number): boolean {
    return this.onTool('', tx, ty);
  }

  end(): void {
    const a = this.animal();
    if (a) {
      if (this.outcome === 'taken') a.happy = Math.max(0, a.happy - 30);
      if (this.phase !== 'in') this.drop(a);
    }
    this.ufo?.destroy();
    this.beam?.destroy();
    const name = a?.name ?? 'An animal';
    this.note = this.outcome === 'saved'
      ? `I chased it off before it got ${name}.`
      : this.outcome === 'taken' ? `${name} came back. ${name} will not talk about it.` : 'It left without anyone.';
  }

  location() {
    return { x: this.ax, y: this.ay };
  }

  serialize() {
    return {
      ...super.serialize(), animalId: this.animalId, phase: this.phase, ux: this.ux, uy: this.uy,
      ax: this.ax, ay: this.ay, lift: this.lift, outcome: this.outcome, hp: this.hp, retries: this.retries,
    };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.animalId = String(d.animalId);
    this.phase = (d.phase as 'in' | 'beam' | 'out') ?? 'in';
    this.ux = Number(d.ux);
    this.uy = Number(d.uy);
    this.ax = Number(d.ax);
    this.ay = Number(d.ay);
    this.lift = Number(d.lift ?? 0);
    this.hp = Number(d.hp ?? 4);
    this.retries = Number(d.retries ?? 0);
    this.outcome = (d.outcome as 'saved' | 'taken' | '') ?? '';
    this.makeSprites();
    const a = this.animal();
    if (a && this.outcome === 'taken') this.ctx.animals.setVisible(a, false);
  }
}
