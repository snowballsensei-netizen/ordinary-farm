// Money, the shipping bin, the shop and items dropped on the ground.
import { ANIMALS } from '../config/animals';
import { TILE } from '../config/constants';
import { ITEMS, UPGRADES, sellPrice } from '../config/items';
import { audio } from '../audio/AudioManager';
import type { ItemStack } from '../world/types';
import type { GameContext } from './GameContext';

/** Overnight shipping pays this much more than selling at the shop. */
export const BIN_BONUS = 1.25;
export const binPrice = (id: string, star?: boolean): number => Math.round(sellPrice(id, star) * BIN_BONUS);

export class EconomySystem {
  constructor(private ctx: GameContext) {}

  get money(): number {
    return this.ctx.state.player.money;
  }

  addMoney(n: number): void {
    this.ctx.state.player.money = Math.max(0, this.ctx.state.player.money + n);
    this.ctx.hud();
  }

  spend(n: number): boolean {
    if (this.money < n) {
      this.ctx.toast('Not enough money.', 0xff6a5a);
      audio.play('error');
      return false;
    }
    this.addMoney(-n);
    audio.play('coin');
    return true;
  }

  /** Puts the selected stack into the shipping bin. */
  shipSelected(): boolean {
    const i = this.ctx.state.selected;
    const s = this.ctx.state.inventory[i];
    if (!s) return false;
    if (sellPrice(s.id, s.star) <= 0) {
      this.ctx.toast(`You can't ship ${ITEMS[s.id].name}.`);
      return false;
    }
    const existing = this.ctx.state.bin.find((b) => b.id === s.id && !!b.star === !!s.star);
    if (existing) existing.qty += s.qty;
    else this.ctx.state.bin.push({ ...s });
    this.ctx.toast(`Shipped ${s.qty}x ${ITEMS[s.id].name}. Paid overnight (+25% bonus).`, 0xffe58a);
    this.ctx.state.inventory[i] = null;
    this.ctx.view.setBinOpen(true);
    this.ctx.scene.time.delayedCall(400, () => this.ctx.view.setBinOpen(false));
    audio.play('coin');
    this.ctx.hud();
    return true;
  }

  binValue(): number {
    return this.ctx.state.bin.reduce((s, b) => s + binPrice(b.id, b.star) * b.qty, 0);
  }

  payout(): { lines: { id: string; qty: number; star?: boolean; value: number }[]; total: number } {
    const lines = this.ctx.state.bin.map((b) => ({ id: b.id, qty: b.qty, star: b.star, value: binPrice(b.id, b.star) * b.qty }));
    const total = lines.reduce((s, l) => s + l.value, 0);
    this.ctx.state.bin = [];
    this.ctx.state.player.money += total;
    this.ctx.state.stats.earned += total;
    this.ctx.state.stats.shippedToday = lines;
    return { lines, total };
  }

  /** Sells qty of inventory slot i at the shop for immediate gold. */
  sellAt(i: number, qty: number): boolean {
    const s = this.ctx.state.inventory[i];
    if (!s) return false;
    const price = sellPrice(s.id, s.star);
    if (price <= 0) return false;
    const n = Math.min(qty, s.qty);
    const name = ITEMS[s.id].name;
    this.ctx.inv.removeAt(i, n);
    this.addMoney(price * n);
    this.ctx.state.stats.earned += price * n;
    audio.play('coin');
    this.ctx.toast(`Sold ${n}x ${name} for ${price * n}g.`, 0xffe58a);
    return true;
  }

  buyItem(id: string, qty: number): boolean {
    const def = ITEMS[id];
    if (!def?.buy) return false;
    if (!this.ctx.inv.hasSpaceFor(id)) {
      this.ctx.toast('Inventory full.', 0xff6a5a);
      return false;
    }
    if (!this.spend(def.buy * qty)) return false;
    const left = this.ctx.inv.add(id, qty);
    if (left > 0) this.addMoney(left * def.buy);
    return true;
  }

  buyAnimal(type: string): boolean {
    const def = ANIMALS[type];
    const pen = this.ctx.animals.allPens().find((p) => p.id === def.pen)!;
    if (this.ctx.animals.list.filter((a) => a.pen === pen.id).length >= pen.cap) {
      this.ctx.toast(`The ${def.pen} is full.`, 0xff6a5a);
      return false;
    }
    if (!this.spend(def.price)) return false;
    const a = this.ctx.animals.add(type);
    if (a) this.ctx.toast(`Welcome, ${a.name} the ${def.name}!`, 0x8fd458);
    return !!a;
  }

  buyUpgrade(id: string): boolean {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u || this.ctx.upg[id]) return false;
    if (!this.spend(u.price)) return false;
    this.ctx.upg[id] = true;
    if (id === 'reinforced_fence') {
      for (const f of Object.values(this.ctx.state.fences)) {
        f.max = 200;
        if (f.hp > 0) f.hp = Math.min(200, f.hp + 100);
      }
    }
    this.ctx.toast(`Purchased: ${u.name}!`, 0x8fd458);
    return true;
  }

  // ------------------------------------------------------------- drops
  dropItem(item: ItemStack, x: number, y: number): void {
    const d = { id: this.ctx.state.nextId++, item, x, y };
    this.ctx.state.drops.push(d);
    this.ctx.view.addDrop(d);
  }

  /** Auto-collects drops near the player. */
  update(): void {
    const p = this.ctx.state.player;
    const drops = this.ctx.state.drops;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      if (Math.hypot(d.x - p.x, d.y - p.y) > 14) continue;
      const left = this.ctx.inv.add(d.item.id, d.item.qty, !!d.item.star);
      if (left === d.item.qty) continue; // inventory full
      this.ctx.view.floatText(d.x, d.y - 12, `+${d.item.qty - left} ${ITEMS[d.item.id].name}${d.item.star ? ' ★' : ''}`, 0x8fd458);
      audio.play('pop');
      if (left > 0) d.item.qty = left;
      else {
        drops.splice(i, 1);
        this.ctx.view.removeDrop(d.id);
      }
    }
  }

  scatterDrop(id: number, dist: number): void {
    const d = this.ctx.state.drops.find((x) => x.id === id);
    if (!d) return;
    const a = this.ctx.chaosRng.next() * Math.PI * 2;
    d.x = Math.max(3 * TILE, Math.min(60 * TILE, d.x + Math.cos(a) * dist));
    d.y = Math.max(3 * TILE, Math.min(40 * TILE, d.y + Math.sin(a) * dist));
    this.ctx.view.moveDrop(d);
  }
}
