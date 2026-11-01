// Three save slots: create, play, delete.
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { Accounts } from '../systems/AccountSystem';
import { randomSeed } from '../systems/RNG';
import { SaveSystem } from '../systems/SaveSystem';
import { Button, COL, panel, txt } from '../ui/widgets';
import { newGame } from '../world/worldgen';
import { playerTex, type Look } from '../art/look';

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Texture for a look, falling back to male while the female art is missing. */
function lookTex(scene: Phaser.Scene, look: Look | undefined): string {
  const k = playerTex(look);
  return scene.textures.exists(k) ? k : 'player';
}

export class ProfileScene extends Phaser.Scene {
  private layer: Phaser.GameObjects.Container | null = null;
  private modal: Phaser.GameObjects.Container | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super('ProfileScene');
  }

  create(): void {
    this.layer = null;
    this.modal = null;
    this.cameras.main.setBackgroundColor('#2a4a6a');
    this.add.tileSprite(0, 120, GAME_W, 100, 'tl_far').setOrigin(0, 0).setTint(0x8090c0);
    this.add.tileSprite(0, 150, GAME_W, 90, 'tl_mid').setOrigin(0, 0).setTint(0x8090c0);
    this.add.tileSprite(0, 210, GAME_W, 60, 'tl_ground').setOrigin(0, 0).setTint(0x8090c0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x10142a, 0.35).setOrigin(0, 0);
    txt(this, GAME_W / 2, 12, 'Choose Your Farm', { scale: 2, origin: [0.5, 0], color: COL.gold });
    txt(this, 6, 4, `Account: ${Accounts.current()?.name ?? ''}`, { color: COL.gray });
    new Button(this, GAME_W / 2 - 40, GAME_H - 28, 80, 20, 'Back', () => this.scene.start('TitleScene'));
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.modal) this.closeModal();
      else this.scene.start('TitleScene');
    });
    this.drawSlots();
    this.events.once('shutdown', () => this.closeModal());
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private drawSlots(): void {
    this.layer?.destroy();
    const layer = (this.layer = this.add.container(0, 0));
    const W = 142;
    const H = 178;
    SaveSystem.summaries().forEach((s, i) => {
      const x = 17 + i * (W + 12);
      const y = 40;
      layer.add(panel(this, x, y, W, H, 'paper'));
      layer.add(txt(this, x + W / 2, y + 10, `Slot ${s.slot}`, { origin: [0.5, 0], color: 0x8a5a36, shadow: false }));
      const line = (ly: number, str: string, color: number = COL.brown) =>
        layer.add(txt(this, x + W / 2, y + ly, str, { origin: [0.5, 0], color, shadow: false, maxWidth: W - 14, center: true }));
      if (s.status === 'empty') {
        layer.add(this.add.image(x + W / 2, y + 70, 'icon_seed_turnip').setScale(2));
        line(100, 'Empty');
        layer.add(new Button(this, x + 21, y + H - 36, W - 42, 22, 'New Farm', () => this.newFarm(s.slot)));
      } else if (s.status === 'corrupt') {
        layer.add(this.add.image(x + W / 2, y + 66, 'warn').setScale(2));
        line(92, 'Corrupted save', 0xc8452f);
        line(106, 'This slot could not be loaded.', 0x8a5a36);
        layer.add(new Button(this, x + 21, y + H - 36, W - 42, 22, 'Delete', () => this.confirmDelete(s.slot)));
      } else {
        layer.add(this.add.image(x + W / 2, y + 44, lookTex(this, s.look), 0));
        line(66, s.farmer ?? '', COL.brown);
        line(78, s.farm ?? '', 0x8a3428);
        line(94, s.label ?? '', 0x5a3a28);
        line(106, `${s.money}g  •  ${s.animals} animals`, 0x5a3a28);
        line(118, `Played ${fmtTime(s.playtime ?? 0)}`, 0x8a5a36);
        layer.add(new Button(this, x + 12, y + H - 36, 64, 22, 'Play', () => this.play(s.slot)));
        layer.add(new Button(this, x + 80, y + H - 36, 50, 22, 'Delete', () => this.confirmDelete(s.slot)));
      }
    });
  }

  private play(slot: number): void {
    try {
      const save = SaveSystem.load(slot);
      if (!save) return;
      this.start(save);
    } catch (e) {
      console.warn(e);
      this.drawSlots();
    }
  }

  private start(save: ReturnType<typeof newGame>): void {
    audio.play('shop');
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('FarmScene', { save }));
  }

  private closeModal(): void {
    this.modal?.destroy();
    this.modal = null;
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = null;
  }

  private confirmDelete(slot: number): void {
    this.closeModal();
    const w = 220;
    const h = 80;
    const c = (this.modal = this.add.container(GAME_W / 2 - w / 2, GAME_H / 2 - h / 2).setDepth(10));
    c.add(this.add.rectangle(-GAME_W, -GAME_H, GAME_W * 3, GAME_H * 3, 0x000000, 0.5).setOrigin(0, 0).setInteractive());
    c.add(panel(this, 0, 0, w, h, 'paper'));
    c.add(txt(this, w / 2, 12, `Delete Slot ${slot} forever?`, { origin: [0.5, 0], color: COL.brown, shadow: false }));
    c.add(txt(this, w / 2, 24, 'The chickens will forget you.', { origin: [0.5, 0], color: 0x8a5a36, shadow: false }));
    c.add(new Button(this, 24, 46, 80, 22, 'Delete', () => {
      SaveSystem.delete(slot);
      this.closeModal();
      this.drawSlots();
    }));
    c.add(new Button(this, 116, 46, 80, 22, 'Cancel', () => this.closeModal()));
  }

  private newFarm(slot: number): void {
    this.closeModal();
    const w = 260;
    const h = 186;
    const c = (this.modal = this.add.container(GAME_W / 2 - w / 2, GAME_H / 2 - h / 2).setDepth(10));
    c.add(this.add.rectangle(-GAME_W, -GAME_H, GAME_W * 3, GAME_H * 3, 0x000000, 0.5).setOrigin(0, 0).setInteractive());
    c.add(panel(this, 0, 0, w, h, 'paper'));
    c.add(txt(this, w / 2, 10, 'A New (Ordinary) Farm', { origin: [0.5, 0], color: COL.brown, shadow: false }));
    const values = ['', ''];
    const labels = ['Farmer name', 'Farm name'];
    const placeholders = ['Farmer', 'Ordinary Farm'];
    let focus = 0;
    const fields: Phaser.GameObjects.BitmapText[] = [];
    const boxes: Phaser.GameObjects.Rectangle[] = [];
    labels.forEach((l, i) => {
      c.add(txt(this, 20, 30 + i * 34, l, { color: 0x8a5a36, shadow: false }));
      const box = this.add.rectangle(20, 41 + i * 34, w - 40, 14, 0xfff8e7).setOrigin(0, 0).setStrokeStyle(1, 0x8a5a36);
      box.setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => {
        focus = i;
        refresh();
      });
      boxes.push(box);
      c.add(box);
      const f = txt(this, 24, 44 + i * 34, '', { color: COL.brown, shadow: false });
      fields.push(f);
      c.add(f);
    });
    const seed = randomSeed();
    // farmer look picker
    let look: Look = 'm';
    c.add(txt(this, 20, 100, 'Farmer', { color: 0x8a5a36, shadow: false }));
    const preview = this.add.sprite(w / 2, 132, lookTex(this, look), 0).setOrigin(0.5, 1);
    const lookName = txt(this, w / 2, 134, '', { origin: [0.5, 0], color: COL.brown, shadow: false });
    c.add([preview, lookName]);
    const setLook = (l: Look) => {
      look = l;
      preview.setTexture(lookTex(this, look), 0);
      lookName.setText(look === 'f' ? 'Female' : 'Male');
      audio.play('click');
    };
    const flip = () => setLook(look === 'm' ? 'f' : 'm');
    c.add(new Button(this, w / 2 - 50, 112, 18, 18, '<', flip));
    c.add(new Button(this, w / 2 + 32, 112, 18, 18, '>', flip));
    lookName.setText('Male');
    c.add(txt(this, w / 2, 143, `World seed: ${seed.toString(16).toUpperCase()}`, { origin: [0.5, 0], color: 0xa08060, shadow: false }));
    let blink = true;
    const refresh = () => {
      fields.forEach((f, i) => {
        const v = values[i] || (focus === i ? '' : placeholders[i]);
        f.setText(v + (focus === i && blink ? '_' : ''));
        f.setTint(values[i] ? COL.brown : 0xb09070);
        boxes[i].setStrokeStyle(1, focus === i ? 0xc8452f : 0x8a5a36);
      });
    };
    this.time.addEvent({ delay: 450, loop: true, callback: () => { blink = !blink; if (this.modal === c) refresh(); } });
    const confirm = () => {
      const save = newGame(slot, values[0].trim() || placeholders[0], values[1].trim() || placeholders[1], seed, look);
      SaveSystem.save(save);
      this.closeModal();
      this.start(save);
    };
    c.add(new Button(this, 30, h - 32, 90, 22, 'Start!', confirm));
    c.add(new Button(this, 140, h - 32, 90, 22, 'Cancel', () => this.closeModal()));
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') return confirm();
      if (e.key === 'Escape') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return flip();
      if (e.key === 'Tab') {
        e.preventDefault();
        focus = 1 - focus;
      } else if (e.key === 'Backspace') values[focus] = values[focus].slice(0, -1);
      else if (e.key.length === 1 && values[focus].length < 18 && /[\w .'!-]/.test(e.key)) values[focus] += e.key;
      refresh();
    };
    // Text entry reads DOM events directly: Phaser's per-frame key queue can replay keys when typing fast.
    window.addEventListener('keydown', this.keyHandler);
    refresh();
  }
}
