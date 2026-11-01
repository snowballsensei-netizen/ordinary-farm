// Tile state queries: what is where, what is solid, what can be tilled.
import { MAP_H, MAP_W, TILE } from '../config/constants';
import { LAYOUT, buildNoTill, buildStaticSolid, type PenLayout } from '../world/layout';
import { Ground, type FenceState, type TileState } from '../world/types';
import { fenceKey } from '../world/worldgen';
import type { GameContext } from './GameContext';

/**
 * Who is moving decides how gates behave:
 *  - player:  open gates are passable
 *  - penned:  animals inside a pen treat open gates as walls (they don't wander out on their own)
 *  - free:    escaped / scripted animals pass through open gates
 */
export type Mover = 'player' | 'penned' | 'free';

export class FarmGrid {
  readonly staticSolid: Uint8Array;
  readonly noTill: Uint8Array;

  constructor(private ctx: GameContext) {
    this.staticSolid = buildStaticSolid();
    this.noTill = buildNoTill();
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
  }

  tile(x: number, y: number): TileState | null {
    if (!this.inBounds(x, y)) return null;
    return this.ctx.state.tiles[y * MAP_W + x];
  }

  fence(x: number, y: number): FenceState | undefined {
    return this.ctx.state.fences[fenceKey(x, y)];
  }

  isStatic(x: number, y: number): boolean {
    return !this.inBounds(x, y) || this.staticSolid[y * MAP_W + x] === 1;
  }

  isSolid(x: number, y: number, who: Mover): boolean {
    if (this.isStatic(x, y)) return true;
    const t = this.tile(x, y)!;
    if (t.g === Ground.WATER) return true;
    if (t.obj && t.obj.type !== 'molehill') return true;
    const f = this.fence(x, y);
    if (f && f.hp > 0) {
      if (!f.gate) return true;
      if (f.open) return who === 'penned';
      return true;
    }
    return false;
  }

  canTill(x: number, y: number): boolean {
    if (this.isStatic(x, y) || this.noTill[y * MAP_W + x]) return false;
    const t = this.tile(x, y)!;
    if (t.obj || t.crop) return false;
    if (this.fence(x, y)) return false;
    return t.g === Ground.GRASS || t.g === Ground.DIRT;
  }

  /** The pen whose interior contains this tile. */
  penAtTile(tx: number, ty: number): PenLayout | null {
    for (const p of LAYOUT.pens) if (tx > p.x0 && tx < p.x1 && ty > p.y0 && ty < p.y1) return p;
    return null;
  }

  insidePen(px: number, py: number, pen: PenLayout): boolean {
    return px > (pen.x0 + 1) * TILE && px < pen.x1 * TILE && py > (pen.y0 + 1) * TILE && py < pen.y1 * TILE;
  }

  fenceMax(): number {
    return this.ctx.upg.reinforced_fence ? 200 : 100;
  }

  damageFence(f: FenceState, amount: number): boolean {
    if (f.hp <= 0) return false;
    const mult = this.ctx.upg.reinforced_fence ? 0.5 : 1;
    f.hp = Math.max(0, f.hp - amount * mult);
    if (f.hp <= 0 && f.gate) f.open = true;
    this.ctx.view.refreshFence(f);
    return f.hp <= 0;
  }

  breakFence(f: FenceState): void {
    f.hp = 0;
    if (f.gate) f.open = true;
    this.ctx.view.refreshFence(f);
  }

  repairFence(f: FenceState): void {
    f.max = this.fenceMax();
    f.hp = f.max;
    if (f.gate) f.open = false;
    this.ctx.view.refreshFence(f);
  }

  penFences(penId: string): FenceState[] {
    return Object.values(this.ctx.state.fences).filter((f) => f.pen === penId);
  }

  forEachTile(fn: (t: TileState, x: number, y: number) => void): void {
    const tiles = this.ctx.state.tiles;
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) fn(tiles[y * MAP_W + x], x, y);
  }

  plantedTiles(filter?: (t: TileState) => boolean): { x: number; y: number; t: TileState }[] {
    const out: { x: number; y: number; t: TileState }[] = [];
    this.forEachTile((t, x, y) => {
      if (t.crop && !t.crop.dead && (!filter || filter(t))) out.push({ x, y, t });
    });
    return out;
  }
}

export function toTile(px: number): number {
  return Math.floor(px / TILE);
}

/**
 * Axis-separated movement of a feet-anchored hitbox against the tile grid.
 * Returns which axes were blocked.
 */
export function moveBox(
  grid: FarmGrid,
  e: { x: number; y: number },
  dx: number,
  dy: number,
  hw: number,
  hh: number,
  who: Mover,
): { bx: boolean; by: boolean } {
  const hits = (x: number, y: number) => {
    const x0 = toTile(x - hw);
    const x1 = toTile(x + hw - 0.01);
    const y0 = toTile(y - hh);
    const y1 = toTile(y - 0.01);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (grid.isSolid(tx, ty, who)) return true;
    return false;
  };
  let bx = false;
  let by = false;
  if (dx !== 0) {
    if (!hits(e.x + dx, e.y)) e.x += dx;
    else bx = true;
  }
  if (dy !== 0) {
    if (!hits(e.x, e.y + dy)) e.y += dy;
    else by = true;
  }
  return { bx, by };
}
