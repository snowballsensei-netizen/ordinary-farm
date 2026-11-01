// Moles pop out of tilled soil. Bonk them with the hoe before they ruin the tile.
// Tough moles take two bonks: the first one makes them burrow away and pop up
// somewhere else. A mole that ruins a tile tunnels on to another one.
import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

const DAMAGE_BASE = 6;
const TIMEOUT = 170;

interface Mole {
  tx: number;
  ty: number;
  timer: number;
  hp?: number;
  /** Seconds until it resurfaces (while burrowing underground). */
  under?: number;
  spr?: Phaser.GameObjects.Image;
}

export class MoleInvasion extends ChaosEvent {
  readonly id = 'mole_invasion';
  moles: Mole[] = [];
  spawned = 0;
  max = 8;
  whacked = 0;
  damaged = 0;
  private spawnTimer = 0;

  private tilled(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    this.ctx.grid.forEachTile((t, x, y) => {
      if (t.g === Ground.TILLED && !t.obj && !this.moles.some((m) => m.tx === x && m.ty === y)) out.push({ x, y });
    });
    return out;
  }

  canTrigger(): boolean {
    return this.tilled().length >= 3;
  }

  requirement(): string {
    return 'needs at least 3 tilled tiles';
  }

  start(): void {
    this.max = Math.min(18, 8 + Math.floor(this.ctx.state.chaos.level / 12) + Math.floor(this.ctx.state.absDay / 10));
    this.spawn();
  }

  private spawn(): void {
    const opts = this.tilled();
    if (!opts.length) {
      this.spawned = this.max;
      return;
    }
    const p = this.ctx.chaosRng.pick(opts);
    const m: Mole = { tx: p.x, ty: p.y, timer: this.upTime(), hp: this.ctx.chaosRng.chance(0.6) ? 2 : 1 };
    this.makeSprite(m);
    this.moles.push(m);
    this.spawned++;
  }

  private upTime(): number {
    return Math.max(2.6, 4.2 / this.dayScale);
  }

  /** Send a mole underground; it pops up on a different tilled tile. */
  private burrow(m: Mole): void {
    m.spr?.destroy();
    m.spr = undefined;
    const opts = this.tilled().filter((p) => Math.abs(p.x - m.tx) + Math.abs(p.y - m.ty) >= 3);
    if (!opts.length) {
      this.moles = this.moles.filter((x) => x !== m);
      return;
    }
    const p = this.ctx.chaosRng.pick(opts);
    this.ctx.view.burst(tc(m.tx), tc(m.ty) + 6, 'clod', 4, 8);
    m.tx = p.x;
    m.ty = p.y;
    m.under = 1.2;
    m.timer = this.upTime();
  }

  private left(): number {
    return this.max - this.spawned + this.moles.length;
  }

  private makeSprite(m: Mole): void {
    const s = this.ctx.scene;
    m.spr = s.add.image(tc(m.tx), tc(m.ty) + 10, 'mole').setOrigin(0.5, 1).setDepth(m.ty * 16 + 12).setScale(1, 0.1);
    s.tweens.add({ targets: m.spr, scaleY: 1, duration: 200, ease: 'Back.easeOut' });
    this.ctx.view.burst(tc(m.tx), tc(m.ty) + 6, 'clod', 4, 8);
  }

  update(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawned < this.max) {
      this.spawnTimer = 1.8;
      this.spawn();
    }
    for (const m of [...this.moles]) {
      if (m.under !== undefined) {
        m.under -= dt;
        if (m.under <= 0) {
          m.under = undefined;
          this.makeSprite(m);
        }
        continue;
      }
      m.timer -= dt;
      if (m.timer > 0) continue;
      const t = this.ctx.grid.tile(m.tx, m.ty);
      const ruins = !!t && this.damaged < this.cap(DAMAGE_BASE);
      // a mole that got away tunnels on to wreck another tile (once)
      if (ruins && m.hp !== 0 && this.t < TIMEOUT - 20) {
        const ox = m.tx;
        const oy = m.ty;
        this.burrow(m);
        m.hp = 0;
        this.ruin(ox, oy);
        continue;
      }
      this.remove(m);
      if (ruins) this.ruin(m.tx, m.ty);
    }
    if ((this.spawned >= this.max && !this.moles.length) || this.t > TIMEOUT) this.done = true;
  }

  private ruin(x: number, y: number): void {
    const t = this.ctx.grid.tile(x, y);
    if (t && this.damaged < this.cap(DAMAGE_BASE)) {
      t.crop = undefined;
      t.g = Ground.DIRT;
      t.wet = false;
      t.obj = { type: 'molehill', hp: 1 };
      this.progress(`A mole wrecked a tile! Moles left: ${this.left()}`, 0xff9a6a);
      this.ctx.view.refreshTile(x, y);
      this.damaged++;
    }
  }

  private remove(m: Mole): void {
    m.spr?.destroy();
    this.moles = this.moles.filter((x) => x !== m);
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'hoe') return false;
    const m = this.moles.find((k) => k.tx === tx && k.ty === ty && k.under === undefined);
    if (!m) return false;
    audio.play('bonk');
    if ((m.hp ?? 1) >= 2) {
      m.hp = 1;
      this.ctx.view.floatText(tc(tx), tc(ty) - 6, 'It burrowed away!', 0xff9a6a);
      this.burrow(m);
      return true;
    }
    this.remove(m);
    this.whacked++;
    this.ctx.view.floatText(tc(tx), tc(ty) - 6, 'BONK!', 0xffe58a);
    this.progress(`Moles left: ${this.left()}`);
    this.ctx.view.burst(tc(tx), tc(ty), 'sparkle', 5, 10);
    return true;
  }

  end(): void {
    for (const m of this.moles) m.spr?.destroy();
    this.moles = [];
    this.note = `Whacked ${this.whacked}, missed ${this.damaged}.`;
  }

  location() {
    const m = this.moles[0];
    return m ? { x: tc(m.tx), y: tc(m.ty) } : null;
  }

  serialize() {
    return {
      ...super.serialize(),
      spawned: this.spawned, max: this.max, whacked: this.whacked, damaged: this.damaged,
      moles: this.moles.map(({ tx, ty, timer, hp, under }) => ({ tx, ty, timer, hp, under })),
    };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.spawned = Number(d.spawned ?? 0);
    this.max = Number(d.max ?? 8);
    this.whacked = Number(d.whacked ?? 0);
    this.damaged = Number(d.damaged ?? 0);
    this.moles = ((d.moles as Mole[]) ?? []).map((m) => ({ ...m }));
    this.moles.forEach((m) => {
      if (m.under === undefined || m.under === null) {
        m.under = undefined;
        this.makeSprite(m);
      }
    });
  }
}
