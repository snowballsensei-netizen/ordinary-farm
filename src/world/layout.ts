// The fixed farm layout. Only debris placement and the chaos are random per
// profile; the buildings, pens and pond are always in the same spot so the
// player learns the farm.
import { MAP_H, MAP_W } from '../config/constants';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PenLayout {
  id: string;
  kind: 'coop' | 'barn';
  x0: number; // fence perimeter (inclusive)
  y0: number;
  x1: number;
  y1: number;
  gates: { x: number; y: number }[];
  building: Rect & { tex: string };
  door: { x: number; y: number };  // tile just outside the building door
  feed: { x: number; y: number };
  water: { x: number; y: number };
  cap: number;
}

export const LAYOUT = {
  house: { x: 6, y: 3, w: 6, h: 5 },
  houseDoor: [{ x: 8, y: 7 }, { x: 9, y: 7 }],
  bin: { x: 13, y: 7 },
  shop: { x: 16, y: 5, w: 3, h: 2 },
  well: { x: 3, y: 9, w: 2, h: 2 },
  spawn: { x: 9, y: 9 },
  pens: [
    {
      id: 'coop', kind: 'coop', x0: 4, y0: 26, x1: 13, y1: 36,
      gates: [{ x: 13, y: 30 }],
      building: { x: 5, y: 27, w: 3, h: 3, tex: 'coop' },
      door: { x: 6, y: 30 },
      feed: { x: 11, y: 27 }, water: { x: 12, y: 27 },
      cap: 8,
    },
    {
      id: 'barn', kind: 'barn', x0: 16, y0: 28, x1: 31, y1: 40,
      gates: [{ x: 23, y: 28 }, { x: 24, y: 28 }],
      building: { x: 17, y: 30, w: 5, h: 4, tex: 'barn' },
      door: { x: 19, y: 34 },
      feed: { x: 28, y: 29 }, water: { x: 29, y: 29 },
      cap: 10,
    },
  ] as PenLayout[],
  pond: { cx: 53, cy: 33, rx: 6, ry: 4 },
  starterField: { x: 22, y: 10, w: 6, h: 4 },
  // Beehives sit east of the starter field, next to a wild flower patch.
  apiary: {
    area: { x: 30, y: 9, w: 7, h: 6 },
    slots: [{ x: 31, y: 10 }, { x: 33, y: 10 }, { x: 35, y: 10 }, { x: 31, y: 13 }, { x: 33, y: 13 }, { x: 35, y: 13 }],
    flowers: { x: 37, y: 9, w: 4, h: 6 },
  },
};

export function penLayout(id: string): PenLayout {
  return LAYOUT.pens.find((p) => p.id === id)!;
}

export function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export function isBorder(x: number, y: number): boolean {
  return x < 2 || y < 2 || x >= MAP_W - 2 || y >= MAP_H - 2;
}

/** Tiles occupied by buildings, well, bin, troughs (always solid). */
export function buildStaticSolid(): Uint8Array {
  const s = new Uint8Array(MAP_W * MAP_H);
  const mark = (r: Rect) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) s[y * MAP_W + x] = 1;
  };
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (isBorder(x, y)) s[y * MAP_W + x] = 1;
  // only the lower part of buildings is solid so the roof overlaps nicely
  mark({ x: LAYOUT.house.x, y: LAYOUT.house.y + 2, w: LAYOUT.house.w, h: LAYOUT.house.h - 2 });
  mark({ x: LAYOUT.bin.x, y: LAYOUT.bin.y, w: 1, h: 1 });
  mark({ ...LAYOUT.shop });
  mark({ ...LAYOUT.well, y: LAYOUT.well.y + 1, h: 1 });
  for (const h of LAYOUT.apiary.slots) mark({ x: h.x, y: h.y, w: 1, h: 1 });
  for (const p of LAYOUT.pens) {
    mark({ x: p.building.x, y: p.building.y + 1, w: p.building.w, h: p.building.h - 1 });
    mark({ x: p.feed.x, y: p.feed.y, w: 1, h: 1 });
    mark({ x: p.water.x, y: p.water.y, w: 1, h: 1 });
  }
  return s;
}

/** Tiles that can never be tilled (paths, pens, around buildings). */
export function buildNoTill(): Uint8Array {
  const s = new Uint8Array(MAP_W * MAP_H);
  const mark = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) s[y * MAP_W + x] = 1;
  };
  mark(LAYOUT.house.x - 1, LAYOUT.house.y - 1, LAYOUT.house.x + LAYOUT.house.w, LAYOUT.house.y + LAYOUT.house.h);
  mark(LAYOUT.shop.x - 1, LAYOUT.shop.y - 1, LAYOUT.shop.x + LAYOUT.shop.w, LAYOUT.shop.y + LAYOUT.shop.h);
  for (const p of LAYOUT.pens) mark(p.x0, p.y0, p.x1, p.y1);
  const ap = LAYOUT.apiary.area;
  mark(ap.x, ap.y, ap.x + ap.w - 1, ap.y + ap.h - 1);
  const fl = LAYOUT.apiary.flowers;
  mark(fl.x, fl.y, fl.x + fl.w - 1, fl.y + fl.h - 1);
  return s;
}

export function pathTiles(): [number, number][] {
  const out: [number, number][] = [];
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]);
  };
  add(8, 8, 9, 24);          // from the house door down
  add(10, 8, 15, 8);         // to the bin and shop
  add(16, 7, 18, 8);
  add(3, 23, 44, 24);        // main east-west road
  add(14, 25, 15, 31);       // to the coop gate
  add(23, 25, 24, 27);       // to the barn gate
  add(19, 9, 21, 22);        // to the field
  return out;
}
