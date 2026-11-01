// The ground shakes: fences get rattled and cracks open up. Each crack
// erupts into a rock after a while unless you smash it with the pickaxe
// (two hits each). Erupting cracks can split open a neighbouring tile, and
// aftershocks keep coming for a minute.
import { audio } from '../audio/AudioManager';
import { DEPTH } from '../config/constants';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { randomOpenTile, tc } from './helpers';
import { N4, TileMarks } from './critters';

const CRACK_BASE = 6;
const FENCE_HITS = 6;
const ERUPT_AFTER = 11;
const QUAKE_TIME = 60;

interface Crack { x: number; y: number; age: number; hp?: number }

export class Earthquake extends ChaosEvent {
  readonly id = 'earthquake';
  cracks: Crack[] = [];
  spawned = 0;
  sealed = 0;
  rocks = 0;
  fences = 0;
  private quake = 0;
  private marks = new TileMarks(this.ctx, 'fx2_crack', () => DEPTH.groundFx + 2);

  start(): void {
    const all = this.ctx.animals.allPens().flatMap((p) => this.ctx.grid.penFences(p.id)).filter((f) => f.hp > 0);
    for (let i = 0; i < FENCE_HITS && all.length; i++) {
      const f = all.splice(this.ctx.chaosRng.int(0, all.length - 1), 1)[0];
      this.ctx.grid.damageFence(f, 40);
      this.fences++;
    }
    this.quake = 0;
  }

  private crackable(x: number, y: number): boolean {
    const t = this.ctx.grid.tile(x, y);
    if (!t || t.obj) return false;
    return (t.g === Ground.GRASS || t.g === Ground.DIRT || t.g === Ground.TILLED) && !this.marks.has(x, y);
  }

  private addCrack(at?: { x: number; y: number }): void {
    const p = at ?? randomOpenTile(this.ctx, (x, y) => this.crackable(x, y));
    if (!p) return;
    this.cracks.push({ ...p, age: 0, hp: 2 });
    this.marks.add(p.x, p.y);
    this.spawned++;
    this.ctx.view.burst(tc(p.x), tc(p.y), 'dust', 6, 12);
  }

  update(dt: number): void {
    this.quake -= dt;
    if (this.quake <= 0 && this.t < QUAKE_TIME) {
      this.quake = 6;
      this.ctx.scene.cameras.main.shake(900, this.t < 10 ? 0.01 : 0.007);
      audio.play('hammer');
      for (let k = 0; k < 3; k++) if (this.spawned < this.cap(CRACK_BASE)) this.addCrack();
      if (this.cracks.length) this.progress(`Aftershock! ${this.cracks.length} crack${this.cracks.length === 1 ? '' : 's'} to pickaxe`, 0xff9a6a);
    }
    for (let i = this.cracks.length - 1; i >= 0; i--) {
      const c = this.cracks[i];
      c.age += dt;
      if (c.age < ERUPT_AFTER) continue;
      const t = this.ctx.grid.tile(c.x, c.y);
      if (t && !t.obj) {
        if (t.crop) this.ctx.crops.destroy(c.x, c.y);
        t.obj = { type: 'rock', hp: 1 };
        this.ctx.view.refreshTile(c.x, c.y);
        this.ctx.view.burst(tc(c.x), tc(c.y), 'clod', 8, 14);
        this.rocks++;
        this.shake(150, 0.003);
      }
      this.marks.remove(c.x, c.y);
      this.cracks.splice(i, 1);
      // eruptions can split the ground next door
      if (this.spawned < this.cap(CRACK_BASE) && this.ctx.chaosRng.chance(0.5)) {
        const [dx, dy] = this.ctx.chaosRng.pick([...N4]);
        if (this.crackable(c.x + dx, c.y + dy)) this.addCrack({ x: c.x + dx, y: c.y + dy });
      }
    }
    if (this.t > QUAKE_TIME && !this.cracks.length) this.done = true;
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'pickaxe') return false;
    const i = this.cracks.findIndex((c) => c.x === tx && c.y === ty);
    if (i < 0) return false;
    const c = this.cracks[i];
    this.ctx.view.burst(tc(tx), tc(ty), 'dust', 6, 10);
    audio.play('hammer');
    c.hp = (c.hp ?? 1) - 1;
    if (c.hp > 0) {
      this.ctx.view.floatText(tc(tx), tc(ty) - 6, 'Again!', 0xffe58a);
      return true;
    }
    this.cracks.splice(i, 1);
    this.marks.remove(tx, ty);
    this.sealed++;
    const left = this.cracks.length;
    this.progress(left ? `${left} crack${left === 1 ? '' : 's'} still open` : 'All cracks sealed!', left ? 0xffe58a : 0x8fd458, !left);
    return true;
  }

  isFinished(): boolean {
    return this.done || this.t > 150;
  }

  end(): void {
    this.marks.clear();
    this.cracks = [];
    this.note = `${this.fences} fences rattled, ${this.rocks} rocks popped up, ${this.sealed} cracks sealed.`;
  }

  serialize() {
    return { ...super.serialize(), cracks: this.cracks, spawned: this.spawned, sealed: this.sealed, rocks: this.rocks, fences: this.fences };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.spawned = Number(d.spawned ?? 0);
    this.sealed = Number(d.sealed ?? 0);
    this.rocks = Number(d.rocks ?? 0);
    this.fences = Number(d.fences ?? 0);
    for (const c of (d.cracks as Crack[]) ?? []) {
      this.cracks.push({ ...c });
      this.marks.add(c.x, c.y);
    }
  }
}
