import Phaser from 'phaser';
import { generateAllArt } from '../art';
import { audio } from '../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    generateAllArt(this);
    // Browsers only allow audio after a user gesture.
    const unlock = () => audio.unlock();
    this.input.on('pointerdown', unlock);
    this.input.keyboard?.on('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.scene.start('TitleScene');
  }
}
