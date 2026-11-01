// Log in or create an account before choosing a farm.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { Accounts, PASSWORD_MAX, PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN } from '../systems/AccountSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { Button, COL, panel, txt } from '../ui/widgets';

const RULES = `Username: ${USERNAME_MIN}+ letters or numbers. Password: ${PASSWORD_MIN}+ characters. No email needed.`;

export class AccountScene extends Phaser.Scene {
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private creating = false;
  private busy = false;
  private values = ['', ''];
  private focus = 0;
  private blink = true;
  private layer: Phaser.GameObjects.Container | null = null;
  private fields: Phaser.GameObjects.BitmapText[] = [];
  private boxes: Phaser.GameObjects.Rectangle[] = [];
  private message!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('AccountScene');
  }

  create(): void {
    this.creating = !Accounts.any();
    this.busy = false;
    this.values = ['', ''];
    this.focus = 0;
    this.layer = null;
    this.cameras.main.setBackgroundColor('#2a4a6a');
    this.add.tileSprite(0, 120, GAME_W, 100, 'tl_far').setOrigin(0, 0).setTint(0x8090c0);
    this.add.tileSprite(0, 150, GAME_W, 90, 'tl_mid').setOrigin(0, 0).setTint(0x8090c0);
    this.add.tileSprite(0, 210, GAME_W, 60, 'tl_ground').setOrigin(0, 0).setTint(0x8090c0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x10142a, 0.35).setOrigin(0, 0);
    new Button(this, GAME_W / 2 - 40, GAME_H - 28, 80, 20, 'Back', () => this.back());
    this.draw();
    this.time.addEvent({ delay: 450, loop: true, callback: () => { this.blink = !this.blink; this.refresh(); } });
    this.keyHandler = (e) => this.onKey(e);
    // Text entry reads DOM events directly: Phaser's per-frame key queue can replay keys when typing fast.
    window.addEventListener('keydown', this.keyHandler);
    this.events.once('shutdown', () => {
      if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    });
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private draw(): void {
    this.layer?.destroy();
    this.fields = [];
    this.boxes = [];
    const w = 260;
    const h = 176;
    const c = (this.layer = this.add.container(GAME_W / 2 - w / 2, 30));
    c.add(panel(this, 0, 0, w, h, 'paper'));
    c.add(txt(this, w / 2, 10, this.creating ? 'Create Account' : 'Log In', { origin: [0.5, 0], color: COL.brown, shadow: false }));
    ['Username', 'Password'].forEach((label, i) => {
      c.add(txt(this, 20, 28 + i * 34, label, { color: 0x8a5a36, shadow: false }));
      const box = this.add.rectangle(20, 39 + i * 34, w - 40, 14, 0xfff8e7).setOrigin(0, 0);
      box.setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => {
        this.focus = i;
        this.refresh();
      });
      this.boxes.push(box);
      const field = txt(this, 24, 42 + i * 34, '', { color: COL.brown, shadow: false });
      this.fields.push(field);
      c.add([box, field]);
    });
    this.message = txt(this, 20, 96, this.creating ? RULES : '', { color: 0x8a5a36, shadow: false, maxWidth: w - 40 });
    c.add(this.message);
    c.add(new Button(this, 20, h - 34, 105, 22, this.creating ? 'Create' : 'Log In', () => void this.submit()));
    c.add(new Button(this, 135, h - 34, 105, 22, this.creating ? 'Have an account' : 'Create Account', () => this.toggleMode()));
    this.refresh();
  }

  private refresh(): void {
    this.fields.forEach((f, i) => {
      const shown = i === 1 ? '*'.repeat(this.values[i].length) : this.values[i];
      f.setText(shown + (this.focus === i && this.blink ? '_' : ''));
      this.boxes[i].setStrokeStyle(1, this.focus === i ? 0xc8452f : 0x8a5a36);
    });
  }

  private toggleMode(): void {
    if (this.busy) return;
    this.creating = !this.creating;
    audio.play('click');
    this.draw();
  }

  private back(): void {
    if (!this.busy) this.scene.start('TitleScene');
  }

  private onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      this.focus = 1 - this.focus;
    } else if (e.key === 'Enter') {
      void this.submit();
      return;
    } else if (e.key === 'Escape') {
      this.back();
      return;
    } else if (e.key === 'Backspace') {
      this.values[this.focus] = this.values[this.focus].slice(0, -1);
    } else if (e.key.length === 1) {
      if (this.focus === 0 && this.values[0].length < USERNAME_MAX && /[A-Za-z0-9_-]/.test(e.key)) this.values[0] += e.key;
      if (this.focus === 1 && this.values[1].length < PASSWORD_MAX && /[\x21-\x7e]/.test(e.key)) this.values[1] += e.key;
    }
    this.refresh();
  }

  private async submit(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const [username, password] = this.values;
    const creating = this.creating;
    const result = creating ? await Accounts.register(username, password) : await Accounts.login(username, password);
    this.busy = false;
    if (!this.scene.isActive()) return;
    if (!result.ok) {
      this.message.setText(result.error).setTint(0xc8452f);
      audio.play('error');
      return;
    }
    if (creating) SaveSystem.adoptLegacySaves();
    audio.play('shop');
    this.scene.start('ProfileScene');
  }
}
