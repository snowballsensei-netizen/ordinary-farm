// The supply stall: seeds, supplies, animals, chaos-fighting upgrades, and
// a Sell tab for instant gold (the shipping bin pays +25% overnight instead).
import Phaser from 'phaser';
import { ANIMALS } from '../config/animals';
import { GAME_H, GAME_W, SEASON_SHORT } from '../config/constants';
import { CROPS } from '../config/crops';
import { ITEMS, UPGRADES, sellPrice } from '../config/items';
import { binPrice } from '../systems/EconomySystem';
import { Button, COL, panel, txt } from '../ui/widgets';
import type { FarmScene } from './FarmScene';

type Tab = 'Seeds' | 'Supplies' | 'Animals' | 'Upgrades' | 'Sell';

interface Row {
  icon: string;
  name: string;
  price: number;
  desc: string;
  note?: string;
  disabled?: boolean;
  buy: (qty: number) => void;
}

export class ShopScene extends Phaser.Scene {
  private farm!: FarmScene;
  private tab: Tab = 'Seeds';
  private body!: Phaser.GameObjects.Container;
  private info!: Phaser.GameObjects.BitmapText;
  private money!: Phaser.GameObjects.BitmapText;
  private tabs: Button[] = [];
  private help!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('ShopScene');
  }

  create(): void {
    this.farm = this.scene.get('FarmScene') as FarmScene;
    const w = 340;
    const h = 236;
    const x0 = GAME_W / 2 - w / 2;
    const y0 = GAME_H / 2 - h / 2;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.45).setOrigin(0, 0);
    panel(this, x0, y0, w, h, 'paper');
    txt(this, x0 + 12, y0 + 8, "Hank's Supply Stall", { color: COL.brown, shadow: false });
    this.money = txt(this, x0 + w - 12, y0 + 8, '', { origin: [1, 0], color: 0x8a3428, shadow: false });
    const tabs: Tab[] = ['Seeds', 'Supplies', 'Animals', 'Upgrades', 'Sell'];
    this.tabs = tabs.map((t, i) => new Button(this, x0 + 10 + i * 64, y0 + 20, 62, 18, t, () => this.show(t), 'wood'));
    this.body = this.add.container(x0 + 12, y0 + 44);
    this.help = txt(this, x0 + 12, y0 + h - 16, '', { color: 0xa08060, shadow: false });
    this.info = txt(this, x0 + 12, y0 + h - 40, '', { color: 0x5a3a28, shadow: false, maxWidth: w - 24 });
    this.input.keyboard!.on('keydown-ESC', () => this.farm.closeOverlay('ShopScene'));
    const hasProduce = this.farm.ctx.state.inventory.some((it) => it && ITEMS[it.id].cat !== 'supply' && sellPrice(it.id, it.star) > 0);
    this.show(hasProduce ? 'Sell' : 'Seeds');
  }

  private rows(): Row[] {
    const ctx = this.farm.ctx;
    const season = ctx.state.season;
    switch (this.tab) {
      case 'Seeds':
        return Object.values(CROPS)
          .filter((c) => c.buyable !== false)
          .map((c) => {
            const id = `seed_${c.id}`;
            const ok = c.seasons.includes(season);
            return {
              icon: `icon_${id}`,
              name: ITEMS[id].name,
              price: c.seed,
              desc: ITEMS[id].desc + (c.regrow ? ' Regrows.' : '') + ` Sells for ${c.sell}g.`,
              note: ok ? undefined : c.seasons.map((s) => SEASON_SHORT[s]).join('/'),
              buy: (q) => ctx.economy.buyItem(id, q),
            };
          });
      case 'Supplies':
        return ['hay', 'planks', 'sprinkler', 'scarecrow', 'sugar_water', 'beehive', 'queen_bee', 'smoker'].map((id) => ({
          icon: `icon_${id}`,
          name: ITEMS[id].name,
          price: ITEMS[id].buy!,
          desc: ITEMS[id].desc,
          buy: (q) => ctx.economy.buyItem(id, q),
        }));
      case 'Animals':
        return Object.values(ANIMALS).map((a) => {
          const pen = ctx.animals.allPens().find((p) => p.id === a.pen)!;
          const n = ctx.animals.list.filter((x) => x.pen === pen.id).length;
          return {
            icon: a.id,
            name: a.name,
            price: a.price,
            desc: `${a.desc} Lives in the ${a.pen} (${n}/${pen.cap}).`,
            note: n >= pen.cap ? 'FULL' : undefined,
            disabled: n >= pen.cap,
            buy: () => ctx.economy.buyAnimal(a.id),
          };
        });
      case 'Sell':
        return ctx.state.inventory
          .map((it, i) => ({ it, i }))
          .filter(({ it }) => it && sellPrice(it.id, it.star) > 0)
          .slice(0, 8)
          .map(({ it, i }) => ({
            icon: `icon_${it!.id}`,
            name: `${ITEMS[it!.id].name}${it!.star ? ' ★' : ''} x${it!.qty}`,
            price: sellPrice(it!.id, it!.star),
            desc: `Sell now for ${sellPrice(it!.id, it!.star)}g each, or ship it in the bin for ${binPrice(it!.id, it!.star)}g overnight (+25%).`,
            buy: (q) => ctx.economy.sellAt(i, q),
          }));
      case 'Upgrades':
        return UPGRADES.map((u) => ({
          icon: 'star',
          name: u.name,
          price: u.price,
          desc: u.desc,
          note: ctx.upg[u.id] ? 'OWNED' : undefined,
          disabled: !!ctx.upg[u.id],
          buy: () => ctx.economy.buyUpgrade(u.id),
        }));
    }
  }

  private show(tab: Tab): void {
    this.tab = tab;
    this.body.removeAll(true);
    const sell = tab === 'Sell';
    this.help.setText(sell ? 'Click sells 1  •  Shift+click sells the stack  •  Esc' : 'Click to buy  •  Shift+click buys 5  •  Esc to close');
    this.info.setText(sell ? 'Instant gold here. The shipping bin pays +25% more, overnight.' : '');
    const rows = this.rows();
    if (sell && !rows.length) this.info.setText('Nothing to sell. Bring crops or animal products!');
    this.money.setText(`${this.farm.ctx.state.player.money}g`);
    rows.forEach((r, i) => {
      const y = i * 18;
      const bg = this.add.rectangle(0, y, 316, 17, i % 2 ? 0xe8d0a0 : 0xf0dcb0).setOrigin(0, 0);
      bg.setInteractive({ useHandCursor: !r.disabled });
      const icon = this.add.image(10, y + 9, r.icon);
      const scale = Math.min(1, 15 / icon.height, 18 / icon.width);
      icon.setScale(scale);
      const name = txt(this, 24, y + 4, r.name, { color: r.disabled || r.note ? 0x9a8070 : COL.brown, shadow: false });
      const price = txt(this, 312, y + 4, r.note ? `${r.note}  ${r.price}g` : `${r.price}g`, { origin: [1, 0], color: r.note ? 0xa06a50 : 0x8a3428, shadow: false });
      bg.on('pointerover', () => {
        bg.setFillStyle(0xfff0c0);
        this.info.setText(r.desc);
      });
      bg.on('pointerout', () => bg.setFillStyle(i % 2 ? 0xe8d0a0 : 0xf0dcb0));
      bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (r.disabled) return;
        const shift = (p.event as MouseEvent).shiftKey;
        r.buy(this.tab === 'Sell' ? (shift ? 9999 : 1) : shift && (this.tab === 'Seeds' || this.tab === 'Supplies') ? 5 : 1);
        this.show(this.tab);
      });
      this.body.add([bg, icon, name, price]);
    });
  }
}
