// End-of-day summary: earnings, harvest and the chaos survived.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config/constants';
import { ITEMS } from '../config/items';
import { audio } from '../audio/AudioManager';
import { Button, COL, panel, txt } from '../ui/widgets';
import type { FarmScene, SummaryData } from './FarmScene';

export class SummaryScene extends Phaser.Scene {
  constructor() {
    super('SummaryScene');
  }

  create(d: SummaryData): void {
    const farm = this.scene.get('FarmScene') as FarmScene;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0f20, 1).setOrigin(0, 0);
    const w = 330;
    const h = 250;
    const x0 = GAME_W / 2 - w / 2;
    const y0 = GAME_H / 2 - h / 2;
    panel(this, x0, y0, w, h, 'paper');
    txt(this, GAME_W / 2, y0 + 8, `${d.dateLabel} — Day Complete`, { origin: [0.5, 0], color: COL.brown, shadow: false });

    let y = y0 + 24;
    const line = (s: string, color: number = COL.brown, indent = 0) => {
      const t = txt(this, x0 + 14 + indent, y, s, { color, shadow: false, maxWidth: w - 28 - indent });
      y += t.height + 2;
    };

    line('Shipped:', 0x8a3428);
    if (!d.shipped.length) line('Nothing this time.', 0x8a5a36, 8);
    d.shipped.slice(0, 6).forEach((s) => line(`${s.qty}x ${ITEMS[s.id].name}${s.star ? ' ★' : ''}`.padEnd(30, ' ') + `${s.value}g`, COL.brown, 8));
    if (d.shipped.length > 6) line(`...and ${d.shipped.length - 6} more`, 0x8a5a36, 8);
    line(`Total earned: ${d.total}g     Harvested: ${d.harvested}`, 0x2f6a2a);
    y += 3;
    line('Chaos survived:', 0x8a3428);
    if (!d.events.length) line('None. A perfectly ordinary day.', 0x8a5a36, 8);
    else line(d.events.join(', '), 0xc8452f, 8);
    // notes only use whatever space is left above the footer
    const limit = y0 + h - 50;
    y += 3;
    for (let i = 0; i < d.notes.length; i++) {
      const t = txt(this, x0 + 14, y, `• ${d.notes[i]}`, { color: 0x5a3a28, shadow: false, maxWidth: w - 28 });
      if (y + t.height > limit) {
        t.destroy();
        if (i < d.notes.length) txt(this, x0 + 14, y, `...and ${d.notes.length - i} more notes`, { color: 0x8a5a36, shadow: false });
        break;
      }
      y += t.height + 2;
    }

    txt(this, GAME_W / 2, y0 + h - 44, `Next: ${d.nextLabel}`, { origin: [0.5, 0], color: 0x8a5a36, shadow: false });
    const go = () => {
      audio.play('click');
      farm.startNewDay();
    };
    new Button(this, GAME_W / 2 - 60, y0 + h - 32, 120, 22, 'Continue (Enter)', go);
    this.input.keyboard!.once('keydown-ENTER', go);
    if (d.total > 0) audio.play('coin');
  }
}
