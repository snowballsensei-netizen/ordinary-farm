// Full inventory grid. Click a slot, then another to swap them.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config/constants';
import { ITEMS, sellPrice } from '../config/items';
import { audio } from '../audio/AudioManager';
import { Button, COL, itemIcon, panel, panelKey, txt } from '../ui/widgets';
import type { FarmScene } from './FarmScene';

const S = 22;

export class InventoryScene extends Phaser.Scene {
  private farm!: FarmScene;
  private grid!: Phaser.GameObjects.Container;
  private picked = -1;
  private info!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('InventoryScene');
  }

  create(): void {
    this.farm = this.scene.get('FarmScene') as FarmScene;
    this.picked = -1;
    const w = 9 * S + 24;
    const h = 3 * S + 110;
    const x0 = GAME_W / 2 - w / 2;
    const y0 = GAME_H / 2 - h / 2 - 10;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.45).setOrigin(0, 0);
    panel(this, x0, y0, w, h, 'paper');
    txt(this, GAME_W / 2, y0 + 8, 'Inventory', { origin: [0.5, 0], color: COL.brown, shadow: false });
    txt(this, x0 + 12, y0 + 22, 'Top row = toolbar. Click two slots to swap.', { color: 0x8a5a36, shadow: false });
    this.grid = this.add.container(x0 + 12, y0 + 34);
    this.info = txt(this, x0 + 12, y0 + 40 + 3 * S, '', { color: COL.brown, shadow: false, maxWidth: w - 24 });
    const ctx = this.farm.ctx;
    txt(this, x0 + 12, y0 + h - 30, `Money: ${ctx.state.player.money}g   Bin: ${ctx.economy.binValue()}g`, { color: 0x8a3428, shadow: false });
    new Button(this, x0 + w - 74, y0 + h - 34, 62, 20, 'Journal', () => {
      this.farm.closeOverlay('InventoryScene');
      this.farm.openOverlay('JournalScene');
    });
    this.draw();
    const close = () => this.farm.closeOverlay('InventoryScene');
    this.input.keyboard!.on('keydown-ESC', close);
    this.input.keyboard!.on('keydown-I', close);
    this.input.keyboard!.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      close();
    });
  }

  private draw(): void {
    this.grid.removeAll(true);
    const inv = this.farm.ctx.state.inventory;
    for (let i = 0; i < 27; i++) {
      const x = (i % 9) * S;
      const y = Math.floor(i / 9) * S + (i >= 9 ? 4 : 0);
      const bg = this.add.image(x, y, panelKey(this, S - 1, S - 1, i === this.picked ? 'slot_sel' : 'slot')).setOrigin(0, 0);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => this.describe(i));
      bg.on('pointerdown', () => this.click(i));
      this.grid.add(bg);
      const it = inv[i];
      if (it) this.grid.add(itemIcon(this, x + 2, y + 2, it.id, it.qty, it.star));
    }
  }

  private describe(i: number): void {
    const it = this.farm.ctx.state.inventory[i];
    if (!it) {
      this.info.setText('');
      return;
    }
    const d = ITEMS[it.id];
    const price = sellPrice(it.id, it.star);
    this.info.setText(`${d.name}${it.star ? ' ★' : ''}${price ? `  (sells ${price}g)` : ''}\n${d.desc}`);
  }

  private click(i: number): void {
    audio.play('tick');
    if (this.picked < 0) {
      if (this.farm.ctx.state.inventory[i]) this.picked = i;
    } else {
      if (this.picked !== i) this.farm.ctx.inv.swap(this.picked, i);
      this.picked = -1;
    }
    this.draw();
  }
}
