// A small meteorite crashes into the farm and leaves valuable Star Ore.
import Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { randomOpenTile, tc } from './helpers';

export class MeteorShower extends ChaosEvent {
  readonly id = 'meteor_shower';
  tx = 30;
  ty = 16;
  landed = false;
  private spr?: Phaser.GameObjects.Image;

  start(): void {
    const ctx = this.ctx;
    const spot = randomOpenTile(ctx, (x, y) => !ctx.grid.fence(x, y) && !ctx.grid.noTill[y * 64 + x], { x0: 20, y0: 5, x1: 55, y1: 22 });
    if (spot) {
      this.tx = spot.x;
      this.ty = spot.y;
    }
    this.fall();
  }

  private fall(): void {
    const s = this.ctx.scene;
    const gx = tc(this.tx);
    const gy = tc(this.ty);
    this.spr = s.add.image(gx + 260, gy - 320, 'meteor').setDepth(DEPTH.worldUi);
    s.tweens.add({
      targets: this.spr,
      x: gx,
      y: gy,
      duration: 1800,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        if (this.spr && Math.random() < 0.6) this.ctx.view.burst(this.spr.x, this.spr.y, 'sparkle', 1, 4, 400, 0xffb060);
      },
      onComplete: () => this.impact(),
    });
  }

  private impact(): void {
    const ctx = this.ctx;
    this.spr?.destroy();
    this.spr = undefined;
    audio.play('boom');
    ctx.scene.cameras.main.shake(600, 0.012);
    ctx.scene.cameras.main.flash(200, 255, 230, 180);
    ctx.view.burst(tc(this.tx), tc(this.ty), 'clod', 18, 30, 800);
    let crushed = 0;
    for (let y = this.ty - 1; y <= this.ty + 1; y++) {
      for (let x = this.tx - 1; x <= this.tx + 1; x++) if (crushed < this.cap(3) && ctx.crops.destroy(x, y)) crushed++;
    }
    // smaller fragments rain down around the crater, crushing crops and leaving rocks
    const frags = 2 + (ctx.state.absDay > 20 ? 1 : 0);
    const crushCap = this.cap(3);
    for (let k = 0; k < frags; k++) {
      const fx = this.tx + ctx.chaosRng.int(-4, 4);
      const fy = this.ty + ctx.chaosRng.int(-4, 4);
      const ft = ctx.grid.tile(fx, fy);
      if (!ft || ctx.grid.fence(fx, fy) || ctx.grid.isStatic(fx, fy) || (fx === this.tx && fy === this.ty)) continue;
      if (ft.crop && crushed < crushCap && ctx.crops.destroy(fx, fy)) crushed++;
      if (!ft.obj && !ft.crop && ft.g !== Ground.WATER) {
        ft.obj = { type: 'rock', hp: 1 };
        ctx.view.refreshTile(fx, fy);
      }
      ctx.view.burst(tc(fx), tc(fy), 'clod', 8, 16, 600);
    }
    const t = ctx.grid.tile(this.tx, this.ty);
    if (t) {
      t.crop = undefined;
      t.g = Ground.DIRT;
      t.obj = { type: 'meteorite', hp: 3 };
      ctx.view.refreshTile(this.tx, this.ty);
    }
    ctx.toast('A meteorite! Fragments everywhere! Pickaxe it (3 hits) for Star Ore.', 0xc07aff);
    this.landed = true;
    this.note = crushed ? `It squashed ${crushed} crops, but left Star Ore.` : 'It left a glowing rock full of Star Ore.';
  }

  update(): void {
    if (this.landed && this.t > 3) this.done = true;
  }

  end(): void {
    if (!this.landed) this.impact();
  }

  location() {
    return { x: tc(this.tx), y: tc(this.ty) };
  }

  serialize() {
    return { ...super.serialize(), tx: this.tx, ty: this.ty, landed: this.landed };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.tx = Number(d.tx);
    this.ty = Number(d.ty);
    this.landed = !!d.landed;
    if (!this.landed) this.fall();
  }
}
