// One-time hints shown the first time the player walks near a key location.
import { TILE } from '../config/constants';
import { LAYOUT, inRect } from '../world/layout';
import type { HintState } from '../world/types';
import { bus, EV } from './bus';
import type { GameContext } from './GameContext';

const AREA_HINTS: { id: string; near: (tx: number, ty: number) => boolean; text: string }[] = [
  { id: 'pens', near: (x, y) => LAYOUT.pens.some((p) => x >= p.x0 - 2 && x <= p.x1 + 2 && y >= p.y0 - 2 && y <= p.y1 + 2),
    text: 'Animal pens: keep the feed (hay) and water troughs full, pet your animals, collect their products.' },
  { id: 'hives', near: (x, y) => inRect(x, y, { x: LAYOUT.apiary.area.x - 2, y: LAYOUT.apiary.area.y - 2, w: LAYOUT.apiary.area.w + 4, h: LAYOUT.apiary.area.h + 4 }),
    text: 'Apiary: smoke each hive every 2 days, give sugar water without flowers, collect honey when it drips. A "!" means a hive needs you.' },
  { id: 'shop', near: (x, y) => inRect(x, y, { x: LAYOUT.shop.x - 2, y: LAYOUT.shop.y - 1, w: LAYOUT.shop.w + 4, h: LAYOUT.shop.h + 3 }),
    text: 'The shop: press E to buy seeds, hay and supplies, or sell produce for instant gold.' },
  { id: 'bin', near: (x, y) => Math.abs(x - LAYOUT.bin.x) <= 1 && Math.abs(y - LAYOUT.bin.y) <= 2,
    text: 'Shipping bin: select produce and press E. It sells overnight for 25% more than the shop.' },
  { id: 'house', near: (x, y) => LAYOUT.houseDoor.some((d) => Math.abs(x - d.x) <= 1 && y >= d.y && y <= d.y + 2),
    text: 'Your house: press E at the door. Sleep in the bed to end the day, feed the fish, cook meals.' },
];

export class AreaHints {
  private g: HintState;
  private cd = 3; // seconds until the next hint may show

  constructor(private ctx: GameContext) {
    this.g = ctx.state.goals ??= { hints: [] };
    this.g.hints ??= [];
  }

  /** Called every frame by the HUD. */
  update(dt: number): void {
    this.cd -= dt;
    const p = this.ctx.player;
    if (!p || this.cd > 0) return;
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor((p.y - 3) / TILE);
    for (const h of AREA_HINTS) {
      if (!this.g.hints.includes(h.id) && h.near(tx, ty)) {
        this.g.hints.push(h.id);
        this.cd = 7;
        bus.emit(EV.hint, h.text);
        break;
      }
    }
  }
}
