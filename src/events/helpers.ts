// Shared helpers for chaos events.
import { MAP_H, MAP_W, TILE } from '../config/constants';
import type { GameContext } from '../systems/GameContext';
import { LAYOUT, penLayout } from '../world/layout';
import { Ground, type AnimalState } from '../world/types';

export const tc = (t: number) => t * TILE + 8;

/** Awake animals of a type that are currently inside their pen. */
export function pennedAnimals(ctx: GameContext, type?: string, pen?: string): AnimalState[] {
  return ctx.animals.list.filter(
    (a) =>
      (!type || a.type === type) &&
      (!pen || a.pen === pen) &&
      !a.escaped && !a.asleep && !a.onRoof &&
      !ctx.animals.isBusy(a.id),
  );
}

/** A random open tile (no object, not solid) matching a filter. */
export function randomOpenTile(
  ctx: GameContext,
  filter: (x: number, y: number) => boolean = () => true,
  area = { x0: 3, y0: 3, x1: MAP_W - 4, y1: MAP_H - 4 },
): { x: number; y: number } | null {
  for (let i = 0; i < 200; i++) {
    const x = ctx.chaosRng.int(area.x0, area.x1);
    const y = ctx.chaosRng.int(area.y0, area.y1);
    const t = ctx.grid.tile(x, y);
    if (!t || t.obj || t.g === Ground.WATER || ctx.grid.isSolid(x, y, 'free')) continue;
    if (filter(x, y)) return { x, y };
  }
  return null;
}

// Waypoints along the farm paths (path tiles never have debris on them).
export const ROUTE = {
  barnGateInside: { x: 24 * TILE, y: 29 * TILE + 10 },
  barnGateOutside: { x: 24 * TILE, y: 26 * TILE + 8 },
  roadAtBarn: { x: 24 * TILE, y: 24 * TILE },
  roadAtCoop: { x: 15 * TILE, y: 24 * TILE },
  roadAtHouse: { x: 9 * TILE, y: 24 * TILE },
  houseYard: { x: 9 * TILE, y: 9 * TILE },
  binFront: { x: tc(LAYOUT.bin.x), y: (LAYOUT.bin.y + 1) * TILE + 10 },
  fieldEntry: { x: 20 * TILE + 8, y: 16 * TILE },
};

export function barnGates(ctx: GameContext) {
  return penLayout('barn').gates.map((g) => ctx.grid.fence(g.x, g.y)!).filter(Boolean);
}
