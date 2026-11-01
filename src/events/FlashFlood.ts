// Water bursts up in the low field and spreads tile by tile, then recedes.
// Dig drains with the hoe on flooded tiles: it takes several drains before the
// water stops welling up, and until then it keeps spreading around them.
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../config/constants';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';
import { N4, TileMarks } from './critters';

const MAX_BASE = 26;
const DROWN_BASE = 6;
const SPREAD_TIME = 95;

export class FlashFlood extends ChaosEvent {
  readonly id = 'flash_flood';
  tiles: { x: number; y: number; age: number }[] = [];
  drains: string[] = [];
  drowned = 0;
  drained = 0;
  need = 4;
  private tick = 0;
  private marks = new TileMarks(this.ctx, 'fx2_flood', () => DEPTH.groundFx + 1, 0.75);

  private floodable(x: number, y: number): boolean {
    const t = this.ctx.grid.tile(x, y);
    if (!t || t.obj || this.drains.includes(`${x},${y}`)) return false;
    return t.g === Ground.TILLED || t.g === Ground.GRASS || t.g === Ground.DIRT;
  }

  start(): void {
    const tilled: { x: number; y: number }[] = [];
    this.ctx.grid.forEachTile((t, x, y) => {
      if (t.g === Ground.TILLED && !t.obj) tilled.push({ x, y });
    });
    let src = tilled.length ? this.ctx.chaosRng.pick(tilled) : null;
    if (!src) {
      for (let i = 0; i < 100 && !src; i++) {
        const x = this.ctx.chaosRng.int(18, 40);
        const y = this.ctx.chaosRng.int(12, 22);
        if (this.floodable(x, y)) src = { x, y };
      }
    }
    if (!src) {
      this.done = true;
      return;
    }
    this.need = 3 + Math.min(3, Math.floor(this.ctx.state.absDay / 8));
    this.addTile(src.x, src.y);
    audio.play('splash');
    this.shake(300, 0.003);
    this.progress(`Dig ${this.need} drains with the hoe to stop the flood!`, 0xffe58a, true);
  }

  private addTile(x: number, y: number): void {
    this.tiles.push({ x, y, age: 0 });
    this.marks.add(x, y);
    const t = this.ctx.grid.tile(x, y)!;
    if (t.g === Ground.TILLED) {
      t.wet = true;
      this.ctx.view.refreshTile(x, y);
    }
  }

  private removeTile(i: number): void {
    const p = this.tiles[i];
    this.marks.remove(p.x, p.y);
    this.tiles.splice(i, 1);
  }

  update(dt: number): void {
    const r = this.ctx.chaosRng;
    for (const p of this.tiles) {
      const before = p.age;
      p.age += dt;
      // crops drown after 8 s underwater, and again every 20 s after that
      const hitAt = (a: number) => a >= 8 && (Math.floor((a - 8) / 20) !== Math.floor((before - 8) / 20) || before < 8);
      if (hitAt(p.age) && this.drowned < this.cap(DROWN_BASE)) {
        const t = this.ctx.grid.tile(p.x, p.y);
        if (t?.crop && !t.crop.dead) {
          this.ctx.crops.damage(p.x, p.y, 1);
          this.drowned++;
          this.ctx.view.burst(tc(p.x), tc(p.y), 'drop', 5, 10);
        }
      }
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 1.0;
    if (this.t < SPREAD_TIME && this.drained < this.need) {
      if (this.tiles.length >= this.cap(MAX_BASE) || !this.tiles.length) return;
      for (let k = 0; k < 3; k++) {
        const p = r.pick(this.tiles);
        const [dx, dy] = r.pick([...N4]);
        const x = p.x + dx;
        const y = p.y + dy;
        if (this.floodable(x, y) && !this.marks.has(x, y)) this.addTile(x, y);
      }
      if (r.chance(0.3)) audio.play('water_pour');
    } else {
      // receding: fast once drained, slow if it was simply left alone
      const n = this.drained >= this.need ? 3 : 1;
      for (let k = 0; k < n && this.tiles.length; k++) this.removeTile(r.int(0, this.tiles.length - 1));
      if (!this.tiles.length) this.done = true;
    }
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'hoe') return false;
    const i = this.tiles.findIndex((p) => p.x === tx && p.y === ty);
    if (i < 0) return false;
    this.drains.push(`${tx},${ty}`);
    this.removeTile(i);
    this.drained++;
    this.ctx.view.burst(tc(tx), tc(ty), 'drop', 8, 14);
    audio.play('splash');
    const left = this.need - this.drained;
    if (left > 0) this.progress(`Flood: dig ${left} more drain${left === 1 ? '' : 's'}`);
    else if (left === 0) this.progress('Drains are working! The water is receding.', 0x8fd458, true);
    if (!this.tiles.length) {
      this.ctx.toast('You drained the flood!', 0x8fd458);
      this.done = true;
    }
    return true;
  }

  isFinished(): boolean {
    return this.done || this.t > SPREAD_TIME + 90;
  }

  end(): void {
    this.marks.clear();
    this.tiles = [];
    this.note = `${this.drowned} crops got soaked. I dug ${this.drained} drain${this.drained === 1 ? '' : 's'}.`;
  }

  location() {
    const p = this.tiles[0];
    return p ? { x: tc(p.x), y: tc(p.y) } : null;
  }

  serialize() {
    return { ...super.serialize(), tiles: this.tiles, drains: this.drains, drowned: this.drowned, drained: this.drained, need: this.need };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.drains = (d.drains as string[]) ?? [];
    this.drowned = Number(d.drowned ?? 0);
    this.drained = Number(d.drained ?? 0);
    this.need = Number(d.need ?? 4);
    for (const p of (d.tiles as { x: number; y: number; age: number }[]) ?? []) {
      this.tiles.push({ ...p });
      this.marks.add(p.x, p.y);
    }
  }
}
