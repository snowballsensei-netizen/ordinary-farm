// Overnight, a perfect ring of glowing Mystery Wheat appears. Harmless, and
// it sells for a lot.
import { Ground } from '../world/types';
import { ChaosEvent } from './ChaosEvent';
import { tc } from './helpers';

export class CropCircle extends ChaosEvent {
  readonly id = 'crop_circle';
  cx = 0;
  cy = 0;
  planted = 0;

  private usable(x: number, y: number): boolean {
    const g = this.ctx.grid;
    const t = g.tile(x, y);
    if (!t || t.obj || t.crop || g.isStatic(x, y) || g.fence(x, y)) return false;
    if (g.noTill[y * 64 + x]) return false;
    return t.g === Ground.GRASS || t.g === Ground.DIRT || t.g === Ground.TILLED;
  }

  start(): void {
    const r = this.ctx.chaosRng;
    let best = { x: 34, y: 14, n: -1 };
    for (let i = 0; i < 40; i++) {
      const x = r.int(24, 50);
      const y = r.int(6, 20);
      let n = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (this.usable(x + dx, y + dy)) n++;
      if (n > best.n) best = { x, y, n };
    }
    this.cx = best.x;
    this.cy = best.y;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy);
        if (!((d >= 2.4 && d <= 3.5) || d === 0)) continue;
        const x = this.cx + dx;
        const y = this.cy + dy;
        if (!this.usable(x, y)) continue;
        const t = this.ctx.grid.tile(x, y)!;
        t.g = Ground.TILLED;
        t.crop = { id: 'alien_wheat', days: 1, dry: 0 };
        this.ctx.view.refreshTile(x, y);
        this.planted++;
      }
    }
    this.note = `${this.planted} stalks of humming wheat.`;
    this.done = true;
  }

  location() {
    return { x: tc(this.cx), y: tc(this.cy) };
  }
}
