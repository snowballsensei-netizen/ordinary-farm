import Phaser from 'phaser';
import { GAME_H, GAME_W } from './config/constants';
import { AccountScene } from './scenes/AccountScene';
import { BootScene } from './scenes/BootScene';
import { FarmScene } from './scenes/FarmScene';
import { HouseScene } from './scenes/HouseScene';
import { InventoryScene } from './scenes/InventoryScene';
import { JournalScene } from './scenes/JournalScene';
import { PauseScene } from './scenes/PauseScene';
import { ProfileScene } from './scenes/ProfileScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';
import { SummaryScene } from './scenes/SummaryScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  disableContextMenu: true,
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
  // Order matters: later scenes draw on top of earlier ones.
  scene: [
    BootScene, TitleScene, AccountScene, ProfileScene, FarmScene, HouseScene, UIScene,
    InventoryScene, ShopScene, PauseScene, JournalScene, SummaryScene, SettingsScene,
  ],
};

const game = new Phaser.Game(config);

// Integer scaling keeps pixels crisp; the page background letterboxes the rest.
function fit(): void {
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  game.scale.setZoom(s >= 1 ? Math.floor(s) : s);
}
window.addEventListener('resize', fit);
game.events.once('ready', fit);
fit();

// Handy for debugging from the browser console during development.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
