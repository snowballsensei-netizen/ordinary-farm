// Volume, fullscreen and the controls list. Opened from the title or pause menu.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { saveSettings, settings } from '../systems/Settings';
import { Button, COL, Slider, panel, txt } from '../ui/widgets';

const KEYS = [
  ['WASD / Arrows', 'Move'],
  ['Space / Left click', 'Use tool'],
  ['E / Right click', 'Interact (or use tool)'],
  ['1-9 / Wheel', 'Select toolbar slot'],
  ['I / Tab', 'Inventory'],
  ['J', 'Farm Journal'],
  ['Esc', 'Pause'],
  ['F9 / F10', 'Debug events / chaos overlay'],
];

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create(data: { from?: string }): void {
    const from = data?.from ?? 'TitleScene';
    const w = 300;
    const h = 220;
    const x0 = GAME_W / 2 - w / 2;
    const y0 = GAME_H / 2 - h / 2;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0, 0).setInteractive();
    panel(this, x0, y0, w, h, 'paper');
    txt(this, GAME_W / 2, y0 + 8, 'Settings', { scale: 2, origin: [0.5, 0], color: COL.brown, shadow: false });

    txt(this, x0 + 16, y0 + 34, 'Music', { color: COL.brown, shadow: false });
    new Slider(this, x0 + 80, y0 + 38, 180, settings.music, (v) => {
      settings.music = v;
      audio.applyVolumes();
      saveSettings();
    });
    txt(this, x0 + 16, y0 + 52, 'Sound', { color: COL.brown, shadow: false });
    new Slider(this, x0 + 80, y0 + 56, 180, settings.sfx, (v) => {
      settings.sfx = v;
      audio.applyVolumes();
      audio.play('tick');
      saveSettings();
    });
    new Button(this, x0 + 16, y0 + 68, 120, 18, 'Toggle Fullscreen', () => this.scale.toggleFullscreen());

    txt(this, x0 + 16, y0 + 94, 'Controls', { color: 0x8a3428, shadow: false });
    KEYS.forEach(([k, v], i) => {
      txt(this, x0 + 16, y0 + 106 + i * 10, k, { color: COL.brown, shadow: false });
      txt(this, x0 + 130, y0 + 106 + i * 10, v, { color: 0x5a3a28, shadow: false });
    });

    const back = () => {
      this.scene.stop();
      this.scene.resume(from);
    };
    new Button(this, GAME_W / 2 - 40, y0 + h - 28, 80, 20, 'Back', back);
    this.input.keyboard!.on('keydown-ESC', back);
  }
}
