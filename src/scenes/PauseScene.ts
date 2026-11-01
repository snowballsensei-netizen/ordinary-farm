import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config/constants';
import { Button, COL, panel, txt } from '../ui/widgets';
import type { FarmScene } from './FarmScene';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    const farm = this.scene.get('FarmScene') as FarmScene;
    const ctx = farm.ctx;
    const w = 180;
    const h = 196;
    const x0 = GAME_W / 2 - w / 2;
    const y0 = GAME_H / 2 - h / 2;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.5).setOrigin(0, 0);
    panel(this, x0, y0, w, h, 'wood');
    txt(this, GAME_W / 2, y0 + 10, 'Paused', { scale: 2, origin: [0.5, 0], color: COL.brown, shadow: false });
    txt(this, GAME_W / 2, y0 + 30, `${ctx.state.farm} — ${ctx.dateLabel()}`, { origin: [0.5, 0], color: 0x5a3a28, shadow: false, maxWidth: w - 16, center: true });
    const resume = () => farm.closeOverlay('PauseScene');
    const btns: [string, () => void][] = [
      ['Resume', resume],
      ['Journal', () => {
        farm.closeOverlay('PauseScene');
        farm.openOverlay('JournalScene');
      }],
      ['Settings', () => {
        this.scene.launch('SettingsScene', { from: 'PauseScene' });
        this.scene.pause();
      }],
      ['Save Game', () => farm.saveGame()],
      ['Save & Quit to Title', () => farm.quitToTitle()],
    ];
    btns.forEach(([l, fn], i) => new Button(this, x0 + 14, y0 + 50 + i * 26, w - 28, 22, l, fn));
    txt(this, GAME_W / 2, y0 + h - 16, `Chaos survived: ${ctx.state.chaos.totalSurvived}`, { origin: [0.5, 0], color: 0x8a3428, shadow: false });
    this.input.keyboard!.on('keydown-ESC', resume);
  }
}
