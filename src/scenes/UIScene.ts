// HUD overlay that runs on top of FarmScene: clock, money, energy, toolbar,
// toasts, event banners, dialogs and the F9/F10 debug tools.
import Phaser from 'phaser';
import { CAN_CAP, CAN_CAP_BIG, GAME_H, GAME_W, SEASON_SHORT } from '../config/constants';
import { EVENTS } from '../config/events';
import { ITEMS } from '../config/items';
import { audio } from '../audio/AudioManager';
import { bus, EV } from '../systems/bus';
import type { GameContext } from '../systems/GameContext';
import { Button, COL, itemIcon, panel, panelKey, txt } from '../ui/widgets';
import type { FarmScene } from './FarmScene';

const SLOT = 20;
const BAR_X = (GAME_W - 9 * SLOT) / 2;
const BAR_Y = GAME_H - SLOT - 4;

export class UIScene extends Phaser.Scene {
  private ctx!: GameContext;
  private farm!: FarmScene;
  private clock!: Phaser.GameObjects.BitmapText;
  private date!: Phaser.GameObjects.BitmapText;
  private money!: Phaser.GameObjects.BitmapText;
  private weatherIcon!: Phaser.GameObjects.Image;
  private energyFill!: Phaser.GameObjects.Rectangle;
  private energyNum!: Phaser.GameObjects.BitmapText;
  private sprintTag!: Phaser.GameObjects.BitmapText;
  private bar!: Phaser.GameObjects.Container;
  private itemName!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private toasts: Phaser.GameObjects.BitmapText[] = [];
  private bannerQueue: { text: string; big: boolean }[] = [];
  private bannerBusy = false;
  private dialog: Phaser.GameObjects.Container | null = null;
  private dialogCb: ((yes: boolean) => void) | null = null;
  private debugText!: Phaser.GameObjects.BitmapText;
  private debugMenu: Phaser.GameObjects.Container | null = null;
  private lastSel = -1;
  private dirty = true;

  constructor() {
    super('UIScene');
  }

  create(): void {
    this.farm = this.scene.get('FarmScene') as FarmScene;
    this.ctx = this.farm.ctx;
    this.toasts = [];
    this.bannerQueue = [];
    this.bannerBusy = false;
    this.dialog = null;
    this.debugMenu = null;
    this.lastSel = -1;

    // clock panel
    panel(this, GAME_W - 104, 3, 100, 46, 'wood');
    this.clock = txt(this, GAME_W - 54, 9, '', { origin: [0.5, 0], color: COL.brown, shadow: false, scale: 1 });
    this.date = txt(this, GAME_W - 62, 21, '', { origin: [0.5, 0], color: COL.brown, shadow: false });
    this.weatherIcon = this.add.image(GAME_W - 22, 25, 'w_sun');
    this.add.image(GAME_W - 94, 37, 'coin');
    this.money = txt(this, GAME_W - 86, 33, '', { color: 0x8a3428, shadow: false });

    // energy bar
    panel(this, 2, GAME_H - 98, 22, 94, 'dark');
    txt(this, 13, GAME_H - 95, 'EN', { origin: [0.5, 0], color: COL.yellow });
    this.add.rectangle(7, GAME_H - 86, 12, 68, 0x2b1d1a).setOrigin(0, 0);
    this.energyFill = this.add.rectangle(8, GAME_H - 19, 10, 66, 0x8fd458).setOrigin(0, 1);
    this.energyNum = txt(this, 13, GAME_H - 15, '', { origin: [0.5, 0], color: COL.text });
    this.sprintTag = txt(this, 28, GAME_H - 96, 'SPRINT', { color: COL.yellow }).setVisible(false);

    this.bar = this.add.container(0, 0);
    this.itemName = txt(this, GAME_W / 2, BAR_Y - 22, '', { origin: [0.5, 0], color: COL.text }).setAlpha(0);
    this.prompt = txt(this, GAME_W / 2, BAR_Y - 11, '', { origin: [0.5, 0], color: COL.gold });
    this.debugText = txt(this, 4, 4, '', { color: 0xb8ffb8 }).setVisible(false).setDepth(50);

    const on = (e: string, fn: (...a: never[]) => void) => bus.on(e, fn, this);
    on(EV.toast, (msg: string, color?: number) => this.toast(msg, color));
    on(EV.banner, (text: string, big: boolean) => this.queueBanner(text, big));
    on(EV.hint, (text: string) => this.hint(text));
    on(EV.hud, () => (this.dirty = true));
    on(EV.prompt, (text: string | null) => this.prompt.setText(text ?? ''));
    on(EV.dialog, (q: string, cb: (yes: boolean) => void) => this.showDialog(q, cb));
    this.events.once('shutdown', () => {
      for (const e of Object.values(EV)) bus.off(e, undefined, this);
    });

    const kb = this.input.keyboard!;
    kb.on('keydown-F9', (e: KeyboardEvent) => {
      e.preventDefault();
      this.toggleDebugMenu();
    });
    kb.on('keydown-F10', (e: KeyboardEvent) => {
      e.preventDefault();
      this.debugText.setVisible(!this.debugText.visible);
    });
    kb.on('keydown', (e: KeyboardEvent) => {
      if (!this.dialog) return;
      const k = e.key.toLowerCase();
      if (k === 'y' || k === 'enter' || k === 'e') this.closeDialog(true);
      if (k === 'n' || k === 'escape') this.closeDialog(false);
    });
  }

  /** True when a click should go to the HUD instead of the world. */
  wantsPointer(p: Phaser.Input.Pointer): boolean {
    if (this.dialog || this.debugMenu) return true;
    const overBar = p.y >= BAR_Y - 2 && p.x >= BAR_X && p.x <= BAR_X + 9 * SLOT;
    const overClock = p.x > GAME_W - 106 && p.y < 52;
    return overBar || overClock;
  }

  // ------------------------------------------------------------ toolbar
  private drawBar(): void {
    this.bar.removeAll(true);
    const s = this.ctx.state;
    for (let i = 0; i < 9; i++) {
      const x = BAR_X + i * SLOT;
      const sel = i === s.selected;
      const bg = this.add.image(x, BAR_Y, panelKey(this, SLOT, SLOT, sel ? 'slot_sel' : 'slot')).setOrigin(0, 0);
      bg.setInteractive();
      bg.on('pointerdown', () => this.ctx.inv.select(i));
      this.bar.add(bg);
      const it = s.inventory[i];
      if (it) {
        this.bar.add(itemIcon(this, x + 2, BAR_Y + 2, it.id, it.qty, it.star));
        if (it.id === 'can') {
          const cap = this.ctx.upg.big_can ? CAN_CAP_BIG : CAN_CAP;
          this.bar.add(this.add.rectangle(x + 3, BAR_Y + SLOT - 4, 14, 2, 0x2b1d1a).setOrigin(0, 0));
          this.bar.add(this.add.rectangle(x + 3, BAR_Y + SLOT - 4, (14 * s.canWater) / cap, 2, 0x6aaee6).setOrigin(0, 0));
        }
      }
      this.bar.add(txt(this, x + 2, BAR_Y - 1, String(i + 1), { color: sel ? COL.yellow : 0xc8a070, shadow: true }));
    }
  }

  // ------------------------------------------------------------- update
  update(): void {
    const ctx = this.ctx;
    const s = ctx.state;
    this.clock.setText(ctx.time.label());
    this.date.setText(`${SEASON_SHORT[s.season]} ${s.day} Y${s.year}`);
    this.money.setText(`${s.player.money}g`);
    this.weatherIcon.setTexture(ctx.weather.icon());
    const e = s.player.energy / s.player.maxEnergy;
    this.energyFill.height = Math.max(0, 66 * e);
    const sprint = ctx.player.sprinting;
    const pulse = sprint && Math.floor(this.time.now / 120) % 2 === 0;
    this.energyFill.fillColor = pulse ? 0xffffff : e > 0.5 ? 0x8fd458 : e > 0.2 ? 0xf2c94c : 0xff6a5a;
    this.energyNum.setText(String(Math.round(s.player.energy)));
    this.sprintTag.setVisible(sprint).setTint(pulse ? COL.yellow : 0xff9a6a);
    this.farm.hints?.update(this.game.loop.delta / 1000);
    if (s.selected !== this.lastSel) {
      this.lastSel = s.selected;
      this.dirty = true;
      const it = s.inventory[s.selected];
      this.itemName.setText(it ? ITEMS[it.id].name : '').setAlpha(1);
      this.tweens.killTweensOf(this.itemName);
      this.tweens.add({ targets: this.itemName, alpha: 0, delay: 1200, duration: 500 });
    }
    if (this.dirty) {
      this.dirty = false;
      this.drawBar();
    }
    if (this.debugText.visible) this.debugText.setText(ctx.chaos.debugLines().join('\n'));
  }

  // ------------------------------------------------------ notifications
  toast(msg: string, color: number = COL.text): void {
    const t = txt(this, 26, 0, msg, { color, maxWidth: 230 });
    this.toasts.push(t);
    if (this.toasts.length > 6) this.toasts.shift()?.destroy();
    this.layoutToasts();
    this.tweens.add({
      targets: t,
      alpha: 0,
      delay: 4200,
      duration: 600,
      onComplete: () => {
        this.toasts = this.toasts.filter((x) => x !== t);
        t.destroy();
        this.layoutToasts();
      },
    });
  }

  private layoutToasts(): void {
    let y = GAME_H - 30;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      y -= t.height + 2;
      t.setY(y);
    }
  }

  private hintText: Phaser.GameObjects.Container | null = null;

  private hint(text: string): void {
    if (this.hintText?.active) this.hintText.destroy();
    const cx = GAME_W / 2;
    const t = txt(this, cx, 60, text, { origin: [0.5, 0], color: 0xc8f0c0, maxWidth: 240, center: true });
    const bg = this.add.rectangle(cx, 60 - 4, t.width + 12, t.height + 8, 0x10141c, 0.82).setOrigin(0.5, 0).setStrokeStyle(1, 0x6fcf55, 0.8);
    const c = this.add.container(0, 0, [bg, t]).setAlpha(0);
    this.hintText = c;
    this.tweens.add({ targets: c, alpha: 1, duration: 400, yoyo: true, hold: 5000, onComplete: () => c.destroy() });
  }

  private queueBanner(text: string, big: boolean): void {
    this.bannerQueue.push({ text, big });
    if (!this.bannerBusy) this.nextBanner();
  }

  private nextBanner(): void {
    const b = this.bannerQueue.shift();
    if (!b) {
      this.bannerBusy = false;
      return;
    }
    this.bannerBusy = true;
    const w = Math.min(GAME_W - 130, b.text.length * 6 * (b.big ? 2 : 1) + 44);
    const h = b.big ? 34 : 24;
    const c = this.add.container(GAME_W / 2 - w / 2 - 50, -h - 4).setDepth(40);
    c.add(panel(this, 0, 0, w, h, 'dark'));
    c.add(this.add.image(12, h / 2, 'warn'));
    c.add(txt(this, 24, h / 2, b.text, { origin: [0, 0.5], color: b.big ? COL.red : COL.yellow, scale: b.big && w > 300 ? 1 : b.big ? 2 : 1 }));
    this.tweens.add({
      targets: c,
      y: 6,
      duration: 350,
      ease: 'Back.easeOut',
      hold: b.big ? 3200 : 2600,
      yoyo: true,
      onComplete: () => {
        c.destroy();
        this.nextBanner();
      },
    });
  }

  // ------------------------------------------------------------- dialog
  private showDialog(q: string, cb: (yes: boolean) => void): void {
    this.closeDialog(false);
    this.dialogCb = cb;
    const w = 220;
    const h = 70;
    const c = this.add.container(GAME_W / 2 - w / 2, GAME_H / 2 - h / 2 - 20).setDepth(60);
    c.add(panel(this, 0, 0, w, h, 'paper'));
    c.add(txt(this, w / 2, 14, q, { origin: [0.5, 0], color: COL.brown, shadow: false, maxWidth: w - 20, center: true }));
    c.add(new Button(this, 30, 38, 70, 20, 'Yes (Y)', () => this.closeDialog(true)));
    c.add(new Button(this, 120, 38, 70, 20, 'No (N)', () => this.closeDialog(false)));
    this.dialog = c;
  }

  private closeDialog(yes: boolean): void {
    if (!this.dialog) return;
    this.dialog.destroy();
    this.dialog = null;
    const cb = this.dialogCb;
    this.dialogCb = null;
    cb?.(yes);
  }

  // ------------------------------------------------------------- debug
  private toggleDebugMenu(): void {
    if (this.debugMenu) {
      this.debugMenu.destroy();
      this.debugMenu = null;
      return;
    }
    const ids = Object.keys(EVENTS);
    const w = 200;
    const h = 40 + Math.ceil(ids.length / 2) * 14 + 70;
    const c = this.add.container(GAME_W / 2 - w / 2, 30).setDepth(70);
    c.add(panel(this, 0, 0, w, h, 'dark'));
    c.add(txt(this, w / 2, 8, 'DEBUG: force event (F9)', { origin: [0.5, 0], color: COL.yellow }));
    ids.forEach((id, i) => {
      const t = txt(this, 10 + (i % 2) * 95, 24 + Math.floor(i / 2) * 14, EVENTS[id].name.slice(0, 15), { color: COL.text });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setTint(COL.yellow));
      t.on('pointerout', () => t.setTint(COL.text));
      t.on('pointerdown', () => {
        audio.play('click');
        this.toggleDebugMenu();
        if (this.ctx.chaos.trigger(id, { force: true, immediate: true })) this.toast(`[debug] ${EVENTS[id].name}`, 0xb8ffb8);
      });
      c.add(t);
    });
    const by = 30 + Math.ceil(ids.length / 2) * 14;
    const cmds: [string, () => void][] = [
      ['+1000g', () => this.ctx.economy.addMoney(1000)],
      ['+1 hour', () => this.ctx.time.advance(60)],
      ['Chaos +20', () => (this.ctx.state.chaos.level = Math.min(100, this.ctx.state.chaos.level + 20))],
      ['End honeymoon', () => {
        const s = this.ctx.state;
        if (s.absDay < 4) {
          s.day += 4 - s.absDay;
          s.absDay = 4;
          s.chaos.calmDay = false;
        }
      }],
      ['Refill energy', () => (this.ctx.state.player.energy = this.ctx.state.player.maxEnergy)],
      ['Sleep now', () => this.farm.endDay(false)],
    ];
    cmds.forEach(([label, fn], i) => {
      const t = txt(this, 10 + (i % 2) * 95, by + Math.floor(i / 2) * 14, label, { color: 0xb8ffb8 });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setTint(COL.yellow));
      t.on('pointerout', () => t.setTint(0xb8ffb8));
      t.on('pointerdown', () => {
        audio.play('click');
        fn();
        this.dirty = true;
        this.toast(`[debug] ${label}`, 0xb8ffb8);
      });
      c.add(t);
    });
    this.debugMenu = c;
  }
}
