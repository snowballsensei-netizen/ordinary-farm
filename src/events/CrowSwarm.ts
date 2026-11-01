// Crows dive at crops. Walk at them to scare them off; scarecrows protect
// everything within 6 tiles. Scared crows circle back (twice) unless their
// target is guarded by a scarecrow, and more crows join a feast left alone.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

const EAT_BASE = 6;
const TIMEOUT = 210;
const SCARE_RANGE = 6;

interface Crow {
  x: number;
  y: number;
  tx: number;
  ty: number;
  state: 'in' | 'peck' | 'out' | 'wait';
  timer: number;
  back?: number;      // comebacks left
  spr?: Phaser.GameObjects.Sprite;
}

export class CrowSwarm extends ChaosEvent {
  readonly id = 'crow_swarm';
  crows: Crow[] = [];
  eaten = 0;
  scared = 0;
  reinforced = false;

  canTrigger(): boolean {
    return this.ctx.grid.plantedTiles().length > 0;
  }

  requirement(): string {
    return 'needs planted crops';
  }

  private protectedTile(tx: number, ty: number): boolean {
    let found = false;
    for (let y = ty - SCARE_RANGE; y <= ty + SCARE_RANGE && !found; y++) {
      for (let x = tx - SCARE_RANGE; x <= tx + SCARE_RANGE; x++) {
        if (this.ctx.grid.tile(x, y)?.obj?.type === 'scarecrow') {
          found = true;
          break;
        }
      }
    }
    return found;
  }

  private target(): { x: number; y: number } | null {
    const options = this.ctx.grid.plantedTiles().filter(({ x, y }) => !this.protectedTile(x, y));
    if (!options.length) return null;
    const p = this.ctx.chaosRng.pick(options);
    return { x: p.x, y: p.y };
  }

  start(): void {
    const n = Math.min(11, 5 + Math.floor(this.ctx.state.chaos.level / 18) + Math.floor(this.ctx.state.absDay / 12));
    const cam = this.ctx.scene.cameras.main;
    let blocked = 0;
    for (let i = 0; i < n; i++) {
      const t = this.target();
      const c: Crow = {
        x: cam.scrollX + this.ctx.chaosRng.int(0, cam.width),
        y: cam.scrollY - 20 - i * 12,
        tx: t?.x ?? 0,
        ty: t?.y ?? 0,
        state: t ? 'in' : 'out',
        timer: 0,
        back: 2,
      };
      if (!t) blocked++;
      this.crows.push(c);
    }
    if (blocked === n) this.ctx.toast('The scarecrow scared the crows away!', 0x8fd458);
    this.crows.forEach((c) => this.makeSprite(c));
    if (blocked < n) this.progress(`${n - blocked} crows incoming! Chase them or use a scarecrow.`, 0xff9a6a, true);
  }

  private dive(c: Crow): boolean {
    const t = this.target();
    if (!t) return false;
    const cam = this.ctx.scene.cameras.main;
    c.x = cam.scrollX + this.ctx.chaosRng.int(0, cam.width);
    c.y = cam.scrollY - 20;
    c.tx = t.x;
    c.ty = t.y;
    c.state = 'in';
    c.spr?.setVisible(true);
    return true;
  }

  private around(): number {
    return this.crows.filter((c) => c.state === 'in' || c.state === 'peck').length;
  }

  private makeSprite(c: Crow): void {
    c.spr = this.ctx.scene.add.sprite(c.x, c.y, 'crow').play('crow_fly').setDepth(7500);
  }

  update(dt: number): void {
    const p = this.ctx.state.player;
    const cam = this.ctx.scene.cameras.main;
    for (const c of this.crows) {
      const near = Math.hypot(p.x - c.x, p.y - 8 - c.y) < 34;
      if (near && (c.state === 'in' || c.state === 'peck')) {
        c.state = 'out';
        c.spr?.anims.resume();
        this.scared++;
        audio.play('caw');
        const left = this.around();
        this.progress(left ? `Crows: ${left} still diving${(c.back ?? 0) > 0 ? ' (scared ones may come back!)' : ''}` : 'The crows are scattered... for now.');
      }
      if (c.state === 'wait') {
        c.timer -= dt;
        if (c.timer <= 0) {
          c.back = (c.back ?? 0) - 1;
          if (this.t < TIMEOUT - 30 && this.dive(c)) this.ctx.view.floatText(c.x, c.y + 30, 'CAW!', 0xff9a6a);
          else c.back = 0;
        }
        continue;
      }
      if (c.state === 'in') {
        const gx = tc(c.tx);
        const gy = tc(c.ty);
        const d = Math.hypot(gx - c.x, gy - c.y);
        if (d < 3) {
          c.state = 'peck';
          c.timer = 2.0;
        } else {
          // erratic swooping dive
          const sp = 82 * this.dayScale;
          const wob = Math.sin(this.t * 6 + c.tx) * 40;
          c.x += (((gx - c.x) / d) * sp + (-(gy - c.y) / d) * wob) * dt;
          c.y += (((gy - c.y) / d) * sp + ((gx - c.x) / d) * wob) * dt;
          c.spr?.setFlipX(gx < c.x);
        }
      } else if (c.state === 'peck') {
        c.timer -= dt;
        c.spr?.anims.pause();
        if (c.timer <= 0) {
          c.spr?.anims.resume();
          const t = this.ctx.grid.tile(c.tx, c.ty);
          if (t?.crop && !t.crop.dead && this.eaten < this.cap(EAT_BASE)) {
            this.ctx.crops.damage(c.tx, c.ty, 2);
            this.eaten++;
            this.ctx.view.burst(tc(c.tx), tc(c.ty), 'leafp', 4, 8);
            audio.play('caw');
          }
          const nt = this.eaten < this.cap(EAT_BASE) && this.ctx.chaosRng.chance(0.65) ? this.target() : null;
          if (nt) {
            c.tx = nt.x;
            c.ty = nt.y;
            c.state = 'in';
          } else c.state = 'out';
        }
      } else {
        c.x -= 40 * dt;
        c.y -= 90 * dt;
        c.spr?.setFlipX(true);
      }
      c.spr?.setPosition(c.x, c.y - (c.state === 'peck' ? 0 : 6));
    }
    this.crows = this.crows.filter((c) => {
      const off = c.state === 'out' && (c.y < cam.scrollY - 40 || c.y < -40);
      if (!off) return true;
      // scared crows circle back unless everything is guarded
      if ((c.back ?? 0) > 0 && this.t < TIMEOUT - 30 && this.eaten < this.cap(EAT_BASE)) {
        c.state = 'wait';
        c.timer = 4 + this.ctx.chaosRng.int(0, 3);
        c.spr?.setVisible(false);
        return true;
      }
      c.spr?.destroy();
      return false;
    });
    // escalation: a feast left alone draws more crows (once)
    if (!this.reinforced && this.eaten >= Math.ceil(this.cap(EAT_BASE) / 2) && this.around() > 0) {
      this.reinforced = true;
      for (let i = 0; i < 3; i++) {
        const c: Crow = { x: 0, y: 0, tx: 0, ty: 0, state: 'out', timer: 0, back: 1 };
        this.makeSprite(c);
        if (this.dive(c)) this.crows.push(c);
        else c.spr?.destroy();
      }
      this.ctx.toast('More crows are joining the feast!', 0xff6a5a);
    }
    if (!this.crows.length || this.t > TIMEOUT) this.done = true;
  }

  end(): void {
    for (const c of this.crows) c.spr?.destroy();
    this.crows = [];
    this.note = `They ate ${this.eaten} crop${this.eaten === 1 ? '' : 's'}. I scared off ${this.scared}.`;
  }

  location() {
    const c = this.crows.find((k) => k.state === 'in');
    return c ? { x: tc(c.tx), y: tc(c.ty) } : null;
  }

  serialize() {
    return {
      ...super.serialize(),
      eaten: this.eaten,
      scared: this.scared,
      reinforced: this.reinforced,
      crows: this.crows.map(({ x, y, tx, ty, state, timer, back }) => ({ x, y, tx, ty, state, timer, back })),
    };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.eaten = Number(d.eaten ?? 0);
    this.scared = Number(d.scared ?? 0);
    this.crows = ((d.crows as Crow[]) ?? []).map((c) => ({ ...c }));
    this.reinforced = !!d.reinforced;
    this.crows.forEach((c) => {
      this.makeSprite(c);
      if (c.state === 'wait') c.spr?.setVisible(false);
    });
  }
}
