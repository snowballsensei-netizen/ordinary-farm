// Global event bus between the world (FarmScene + systems) and the HUD (UIScene).
import Phaser from 'phaser';

export const bus = new Phaser.Events.EventEmitter();

export const EV = {
  toast: 'toast',       // (msg: string, color?: number)
  banner: 'banner',     // (text: string, big: boolean)
  hint: 'hint',         // (text: string)
  hud: 'hud',           // () -> HUD should refresh money/inventory/etc.
  prompt: 'prompt',     // (text: string | null) -> context hint above the toolbar
  dialog: 'dialog',     // (question: string, onYes: () => void)
} as const;
