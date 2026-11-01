// The Farm Journal: a diary of everything weird that happened.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { Button, COL, panel, txt } from '../ui/widgets';
import type { FarmScene } from './FarmScene';

const PAGE_H = 160;

export class JournalScene extends Phaser.Scene {
  private page = 0;
  private body!: Phaser.GameObjects.Container;
  private farm!: FarmScene;
  private pageText!: Phaser.GameObjects.BitmapText;
  private starts: number[] = [0];

  constructor() {
    super('JournalScene');
  }

  create(): void {
    this.farm = this.scene.get('FarmScene') as FarmScene;
    this.page = 0;
    const w = 320;
    const h = 230;
    const x0 = GAME_W / 2 - w / 2;
    const y0 = GAME_H / 2 - h / 2;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.5).setOrigin(0, 0);
    panel(this, x0, y0, w, h, 'paper');
    txt(this, GAME_W / 2, y0 + 8, 'Farm Journal', { scale: 2, origin: [0.5, 0], color: COL.brown, shadow: false });
    this.body = this.add.container(x0 + 14, y0 + 32);
    this.pageText = txt(this, GAME_W / 2, y0 + h - 22, '', { origin: [0.5, 0], color: 0x8a5a36, shadow: false });
    new Button(this, x0 + 12, y0 + h - 28, 40, 18, '←', () => this.turn(-1));
    new Button(this, x0 + w - 52, y0 + h - 28, 40, 18, '→', () => this.turn(1));
    const close = () => this.farm.closeOverlay('JournalScene');
    this.input.keyboard!.on('keydown-ESC', close);
    this.input.keyboard!.on('keydown-J', close);
    this.input.keyboard!.on('keydown-LEFT', () => this.turn(-1));
    this.input.keyboard!.on('keydown-RIGHT', () => this.turn(1));
    this.paginate();
    this.draw();
  }

  /** Splits entries into pages by measuring their wrapped height. */
  private paginate(): void {
    this.starts = [0];
    let y = 0;
    this.entries().forEach((e, i) => {
      const probe = txt(this, 0, 0, e.text, { shadow: false, maxWidth: 284 });
      const hgt = 14 + probe.height + 4;
      probe.destroy();
      if (y + hgt > PAGE_H && y > 0) {
        this.starts.push(i);
        y = 0;
      }
      y += hgt;
    });
  }

  private entries() {
    return [...this.farm.ctx.state.journal].reverse();
  }

  private turn(d: number): void {
    this.page = Phaser.Math.Clamp(this.page + d, 0, this.starts.length - 1);
    audio.play('tick');
    this.draw();
  }

  private draw(): void {
    this.body.removeAll(true);
    const list = this.entries();
    const pages = this.starts.length;
    let y = 0;
    for (const e of list.slice(this.starts[this.page], this.starts[this.page + 1] ?? list.length)) {
      const head = txt(this, 0, y, e.label, { color: 0x8a3428, shadow: false });
      const body = txt(this, 6, y + 10, e.text, { color: COL.brown, shadow: false, maxWidth: 284 });
      this.body.add([head, body]);
      y += 14 + body.height + 4;
    }
    this.pageText.setText(`Page ${this.page + 1} / ${pages}`);
  }
}
