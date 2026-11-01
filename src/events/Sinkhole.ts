// The ground gives way: a sinkhole opens and slowly widens, swallowing crops.
// Fill holes in with the hoe (two scoops each). It widens faster the longer
// it is left. Anything left over turns into a molehill.
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../config/constants';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { randomOpenTile, tc } from './helpers';
import { N4, TileMarks } from './critters';

const HOLE_BASE = 6;
const TIMEOUT = 160;

interface Hole { x: number; y: number; hp?: number }

export class Sinkhole extends ChaosEvent {
  readonly id = 'sinkhole';
  holes: Hole[] = [];
  opened = 0;
  filled = 0;
  swallowed = 0;
  private tick = 5;
  private marks = new TileMarks(this.ctx, 'fx2_hole', () => DEPTH.groundFx + 4);

  private ok(x: number, y: number): boolean {
    const t = this.ctx.grid.tile(x, y);
    return !!t && !t.obj && !this.marks.has(x, y) && (t.g === Ground.GRASS || t.g === Ground.DIRT || t.g === Ground.TILLED);
  }

  start(): void {
    const crops = this.ctx.grid.plantedTiles();
    const p = crops.length ? this.ctx.chaosRng.pick(crops) : randomOpenTile(this.ctx, (x, y) => this.ok(x, y));
    if (!p) {
      this.done = true;
      return;
    }
    this.open(p.x, p.y);
    this.ctx.scene.cameras.main.shake(500, 0.005);
  }

  private open(x: number, y: number): void {
    if (this.ctx.grid.tile(x, y)?.crop) {
      this.ctx.crops.destroy(x, y);
      this.swallowed++;
    }
    this.holes.push({ x, y, hp: 2 });
    this.marks.add(x, y);
    this.opened++;
    this.ctx.view.burst(tc(x), tc(y), 'clod', 8, 12);
    audio.play('pop');
  }

  update(dt: number): void {
    this.tick -= dt;
    if (this.tick > 0) return;
    // widens faster over time
    this.tick = Math.max(2.5, 5 - this.t / 30);
    if (this.opened >= this.cap(HOLE_BASE) || !this.holes.length) {
      if (!this.holes.length || this.t > 110) this.done = true;
      return;
    }
    for (let k = 0; k < (this.t > 40 ? 2 : 1); k++) {
      const h = this.ctx.chaosRng.pick(this.holes);
      const [dx, dy] = this.ctx.chaosRng.pick([...N4]);
      if (this.opened < this.cap(HOLE_BASE) && this.ok(h.x + dx, h.y + dy)) {
        this.open(h.x + dx, h.y + dy);
        this.shake(150, 0.003);
        this.progress(`The sinkhole is widening! ${this.holes.length} holes to fill`, 0xff9a6a);
      }
    }
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'hoe') return false;
    const i = this.holes.findIndex((h) => h.x === tx && h.y === ty);
    if (i < 0) return false;
    this.ctx.view.burst(tc(tx), tc(ty), 'dust', 6, 10);
    const h = this.holes[i];
    h.hp = (h.hp ?? 1) - 1;
    if (h.hp > 0) {
      this.ctx.view.floatText(tc(tx), tc(ty) - 6, 'Deep! One more scoop', 0xffe58a);
      return true;
    }
    this.holes.splice(i, 1);
    this.marks.remove(tx, ty);
    this.filled++;
    if (this.holes.length) this.progress(`${this.holes.length} hole${this.holes.length === 1 ? '' : 's'} left to fill`);
    if (!this.holes.length) {
      this.ctx.toast('Sinkhole filled!', 0x8fd458);
      this.done = true;
    }
    return true;
  }

  isFinished(): boolean {
    return this.done || this.t > TIMEOUT;
  }

  end(): void {
    for (const h of this.holes) {
      const t = this.ctx.grid.tile(h.x, h.y);
      if (t && !t.obj) {
        t.obj = { type: 'molehill', hp: 1 };
        this.ctx.view.refreshTile(h.x, h.y);
      }
    }
    this.marks.clear();
    this.note = `It swallowed ${this.swallowed} crop${this.swallowed === 1 ? '' : 's'}. I filled ${this.filled} of ${this.opened} holes.`;
    this.holes = [];
  }

  location() {
    const h = this.holes[0];
    return h ? { x: tc(h.x), y: tc(h.y) } : null;
  }

  serialize() {
    return { ...super.serialize(), holes: this.holes, opened: this.opened, filled: this.filled, swallowed: this.swallowed };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.opened = Number(d.opened ?? 0);
    this.filled = Number(d.filled ?? 0);
    this.swallowed = Number(d.swallowed ?? 0);
    for (const h of (d.holes as Hole[]) ?? []) {
      this.holes.push({ ...h });
      this.marks.add(h.x, h.y);
    }
  }
}
