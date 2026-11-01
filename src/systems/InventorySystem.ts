// 27 slots; the first 9 are the toolbar.
import { ITEMS } from '../config/items';
import type { ItemStack } from '../world/types';
import type { GameContext } from './GameContext';

export const STACK_MAX = 999;

export class InventorySystem {
  constructor(private ctx: GameContext) {}

  get slots(): (ItemStack | null)[] {
    return this.ctx.state.inventory;
  }

  selected(): ItemStack | null {
    return this.slots[this.ctx.state.selected] ?? null;
  }

  select(i: number): void {
    this.ctx.state.selected = ((i % 9) + 9) % 9;
    this.ctx.hud();
  }

  /** Adds items, returns how many did not fit. */
  add(id: string, qty: number, star = false): number {
    const def = ITEMS[id];
    if (!def) return qty;
    if (def.stack) {
      for (const s of this.slots) {
        if (s && s.id === id && !!s.star === star && s.qty < STACK_MAX) {
          const n = Math.min(qty, STACK_MAX - s.qty);
          s.qty += n;
          qty -= n;
          if (qty <= 0) break;
        }
      }
    }
    for (let i = 0; i < this.slots.length && qty > 0; i++) {
      if (this.slots[i]) continue;
      const n = def.stack ? Math.min(qty, STACK_MAX) : 1;
      this.slots[i] = { id, qty: n, ...(star ? { star: true } : {}) };
      qty -= n;
    }
    this.ctx.hud();
    return qty;
  }

  count(id: string): number {
    return this.slots.reduce((s, it) => s + (it && it.id === id ? it.qty : 0), 0);
  }

  remove(id: string, qty: number): boolean {
    if (this.count(id) < qty) return false;
    for (let i = this.slots.length - 1; i >= 0 && qty > 0; i--) {
      const s = this.slots[i];
      if (!s || s.id !== id) continue;
      const n = Math.min(qty, s.qty);
      s.qty -= n;
      qty -= n;
      if (s.qty <= 0) this.slots[i] = null;
    }
    this.ctx.hud();
    return true;
  }

  removeAt(i: number, qty = 1): void {
    const s = this.slots[i];
    if (!s) return;
    s.qty -= qty;
    if (s.qty <= 0) this.slots[i] = null;
    this.ctx.hud();
  }

  swap(a: number, b: number): void {
    const t = this.slots[a];
    this.slots[a] = this.slots[b];
    this.slots[b] = t;
    this.ctx.hud();
  }

  hasSpaceFor(id: string): boolean {
    return this.slots.some((s) => !s || (s.id === id && ITEMS[id]?.stack));
  }
}
