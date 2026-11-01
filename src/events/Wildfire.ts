// Lightning sparks a grass fire that creeps across grass and crops. Douse
// burning tiles with the watering can. One soak only dampens a flame: it
// smoulders and re-ignites a few seconds later unless soaked a second time.
import { audio } from '../audio/AudioManager';
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { randomOpenTile, tc } from './helpers';
import { N4, TileMarks } from './critters';

const IGNITE_BASE = 14;
const BURN_TIME = 13;
const CROP_BASE = 6;
const REKINDLE = 6;  // seconds a damp flame smoulders before flaring up again
const TIMEOUT = 210;

interface Fire { x: number; y: number; age: number; damp?: number }

export class Wildfire extends ChaosEvent {
  readonly id = 'wildfire';
  fires: Fire[] = [];
  ignited = 0;
  doused = 0;
  burnt = 0;
  private tick = 0;
  private marks = new TileMarks(this.ctx, 'fx2_fire', (y) => y + 2);

  private flammable(x: number, y: number): boolean {
    const t = this.ctx.grid.tile(x, y);
    if (!t || this.marks.has(x, y)) return false;
    if (t.crop && !t.crop.dead && !t.wet) return true;
    return t.g === Ground.GRASS && (!t.obj || t.obj.type === 'weed' || t.obj.type === 'branch');
  }

  canTrigger(): boolean {
    return !this.ctx.weather.isRaining() && this.ctx.state.weather !== 'snow';
  }

  requirement(): string {
    return 'not in rain or snow';
  }

  start(): void {
    const crops = this.ctx.grid.plantedTiles();
    let p: { x: number; y: number } | null = null;
    if (crops.length) {
      const c = this.ctx.chaosRng.pick(crops);
      for (let i = 0; i < 40 && !p; i++) {
        const x = c.x + this.ctx.chaosRng.int(-4, 4);
        const y = c.y + this.ctx.chaosRng.int(-4, 4);
        if (this.flammable(x, y) && this.ctx.grid.tile(x, y)!.g === Ground.GRASS) p = { x, y };
      }
    }
    p ??= randomOpenTile(this.ctx, (x, y) => this.flammable(x, y));
    if (!p) {
      this.done = true;
      return;
    }
    this.ctx.weather.lightning();
    this.ignite(p.x, p.y);
  }

  private ignite(x: number, y: number): void {
    this.fires.push({ x, y, age: 0 });
    this.marks.add(x, y);
    this.ignited++;
  }

  private extinguish(i: number, burntOut: boolean): void {
    const f = this.fires[i];
    this.fires.splice(i, 1);
    this.marks.remove(f.x, f.y);
    if (!burntOut) return;
    const t = this.ctx.grid.tile(f.x, f.y);
    if (!t) return;
    if (t.crop && this.burnt < this.cap(CROP_BASE)) {
      this.ctx.crops.destroy(f.x, f.y);
      this.burnt++;
    }
    if (t.obj && (t.obj.type === 'weed' || t.obj.type === 'branch')) t.obj = undefined;
    if (t.g === Ground.GRASS) t.g = Ground.DIRT;
    this.ctx.view.refreshTile(f.x, f.y);
    this.ctx.view.burst(tc(f.x), tc(f.y), 'fx2_ash', 6, 10, 800);
  }

  private burning(): Fire[] {
    return this.fires.filter((f) => !f.damp);
  }

  update(dt: number): void {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      if (f.damp) {
        f.damp -= dt;
        if (f.damp <= 0) {
          f.damp = undefined;
          f.age = Math.max(0, f.age - 4);
          this.marks.setAlpha(f.x, f.y, 1);
          this.ctx.view.burst(tc(f.x), tc(f.y) - 6, 'fx2_ember', 5, 12, 700);
          this.progress('A smouldering flame flared back up! Soak it twice.', 0xff9a6a);
        }
        continue;
      }
      f.age += dt;
      if (f.age > BURN_TIME) this.extinguish(i, true);
    }
    this.tick -= dt;
    const live = this.burning();
    if (this.tick <= 0 && live.length) {
      this.tick = Math.max(0.6, 1.2 / this.dayScale);
      const r = this.ctx.chaosRng;
      // big fires throw more embers
      const tries = live.length > 6 ? 3 : 2;
      for (let k = 0; k < tries && this.ignited < this.cap(IGNITE_BASE); k++) {
        const f = r.pick(live);
        this.ctx.view.burst(tc(f.x), tc(f.y) - 6, 'fx2_ember', 3, 10, 700);
        // usually a neighbour, sometimes an ember jumps two tiles
        const [dx, dy] = r.pick([...N4]);
        const m = r.chance(0.2) ? 2 : 1;
        if (this.flammable(f.x + dx * m, f.y + dy * m)) this.ignite(f.x + dx * m, f.y + dy * m);
      }
      if (live.length >= 8 && r.chance(0.3)) this.shake(150, 0.002);
    }
    if (!this.fires.length) this.done = true;
    if (this.t > TIMEOUT) {
      // the fire finally burns itself out
      for (let i = this.fires.length - 1; i >= 0; i--) this.extinguish(i, false);
      this.done = true;
    }
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    if (tool !== 'can') return false;
    let hit = false;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      // only the aimed tile gets a full soak; neighbours just get splashed
      const d = Math.abs(f.x - tx) + Math.abs(f.y - ty);
      if (d === 0 || (d === 1 && !f.damp)) {
        hit = true;
        if (f.damp && d === 0) {
          this.extinguish(i, false);
          this.doused++;
        } else if (d === 0 || !f.damp) {
          f.damp = REKINDLE;
          this.marks.setAlpha(f.x, f.y, 0.45);
        }
      }
    }
    if (!hit) return false;
    this.ctx.view.burst(tc(tx), tc(ty), 'drop', 8, 14);
    audio.play('splash');
    if (!this.fires.length) this.progress('Fire\'s out!', 0x8fd458, true);
    else {
      const b = this.burning().length;
      const sm = this.fires.length - b;
      this.progress(`${b} fire${b === 1 ? '' : 's'} still burning${sm ? `, ${sm} smouldering` : ''}`);
    }
    return true;
  }

  end(): void {
    for (let i = this.fires.length - 1; i >= 0; i--) this.extinguish(i, false);
    this.marks.clear();
    this.note = `${this.burnt} crops burnt, ${this.doused} flames doused.`;
  }

  location() {
    const f = this.fires[0];
    return f ? { x: tc(f.x), y: tc(f.y) } : null;
  }

  serialize() {
    return { ...super.serialize(), fires: this.fires, ignited: this.ignited, doused: this.doused, burnt: this.burnt };
  }

  restore(d: Record<string, unknown>): void {
    super.restore(d);
    this.ignited = Number(d.ignited ?? 0);
    this.doused = Number(d.doused ?? 0);
    this.burnt = Number(d.burnt ?? 0);
    for (const f of (d.fires as Fire[]) ?? []) {
      this.fires.push({ ...f });
      this.marks.add(f.x, f.y);
      if (f.damp) this.marks.setAlpha(f.x, f.y, 0.45);
    }
  }
}
