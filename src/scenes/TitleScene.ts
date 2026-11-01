// Animated title: side-view parallax farm, day/night sky, bobbing logo,
// random splash tagline and a vertical menu.
import Phaser from 'phaser';
import { GAME_H, GAME_W, VERSION } from '../config/constants';
import { hexRgb, mix } from '../art/draw';
import { hexNum } from '../art/palette';
import { audio } from '../audio/AudioManager';
import { Accounts } from '../systems/AccountSystem';
import { Button, COL, panel, txt } from '../ui/widgets';

const SPLASHES = [
  'Nothing unusual here!',
  'Totally normal cows.',
  'Now with 0% tornadoes*',
  'The chickens are fine. Probably.',
  'Ordinary since day one!',
  'Please do not feed the goat the bin.',
  '*tornado count may vary',
  'Sheep stay on the ground. Usually.',
  'Moles not included. (They are.)',
  'A perfectly calm farming experience!',
  'What could possibly go wrong?',
  'Crop circles are just a myth.',
];

const CYCLE = 90; // seconds for a full day/night loop on the title
const SKY: [number, string, string][] = [
  [0, '#4a90e0', '#a8dcff'],
  [0.42, '#4a90e0', '#a8dcff'],
  [0.5, '#5a4a9a', '#ff9a5a'],
  [0.58, '#0b1030', '#2a2a60'],
  [0.88, '#0b1030', '#2a2a60'],
  [0.95, '#6a7ac8', '#ffc890'],
  [1, '#4a90e0', '#a8dcff'],
];

interface Mover {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  w: number;
}

export class TitleScene extends Phaser.Scene {
  private t = 0.08;
  private sky!: Phaser.GameObjects.Graphics;
  private stars: { img: Phaser.GameObjects.Image; ph: number }[] = [];
  private sun!: Phaser.GameObjects.Image;
  private moon!: Phaser.GameObjects.Image;
  private far!: Phaser.GameObjects.TileSprite;
  private mid!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  private fence!: Phaser.GameObjects.TileSprite;
  private clouds: Phaser.GameObjects.Image[] = [];
  private near: Mover[] = [];
  private blades: Phaser.GameObjects.Image[] = [];
  private logo!: Phaser.GameObjects.Image;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private sel = 0;
  private overlay: Phaser.GameObjects.Container | null = null;
  private eggTimer = 12;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.items = [];
    this.near = [];
    this.blades = [];
    this.clouds = [];
    this.stars = [];
    this.overlay = null;
    audio.setMusic('title');

    this.sky = this.add.graphics();
    for (let i = 0; i < 70; i++) {
      const img = this.add.image(Math.random() * GAME_W, Math.random() * 150, 'pixel').setScale(Math.random() < 0.2 ? 1 : 0.5);
      this.stars.push({ img, ph: Math.random() * 6 });
    }
    this.sun = this.add.image(0, 0, 'sun');
    this.moon = this.add.image(0, 0, 'moon');
    for (let i = 0; i < 6; i++) {
      this.clouds.push(this.add.image(Math.random() * GAME_W, 20 + Math.random() * 70, `cloud${i % 3}`).setAlpha(0.95));
    }

    this.far = this.add.tileSprite(0, 120, GAME_W, 100, 'tl_far').setOrigin(0, 0);
    this.mid = this.add.tileSprite(0, 150, GAME_W, 90, 'tl_mid').setOrigin(0, 0);

    // near layer props, scrolling and wrapping
    const groundY = 218;
    const span = 960;
    const prop = (x: number, key: string, oy = 0) => {
      const img = this.add.image(x, groundY + oy, key).setOrigin(0.5, 1);
      this.near.push({ obj: img, w: span });
      return img;
    };
    prop(80, 'tree_0', 4);
    prop(170, 'barn', 4);
    const wmX = 300;
    prop(wmX, 'windmill', 4);
    const blade = this.add.image(wmX, groundY - 52, 'windmill_blades');
    this.near.push({ obj: blade, w: span });
    this.blades.push(blade);
    prop(360, 'haystack', 3);
    prop(420, 'tree_1', 4);
    prop(560, 'house', 6).setScale(0.9);
    prop(650, 'tree_0', 4);
    prop(700, 'haystack', 3);
    prop(790, 'coop', 4);
    prop(880, 'tree_2', 4);

    this.ground = this.add.tileSprite(0, groundY - 8, GAME_W, 60, 'tl_ground').setOrigin(0, 0);
    this.fence = this.add.tileSprite(0, groundY - 18, GAME_W, 22, 'tl_fence').setOrigin(0, 0);

    // animals strolling on the ground
    for (const [x, key] of [[120, 'cow'], [250, 'chicken'], [270, 'chicken'], [480, 'sheep'], [610, 'pig'], [740, 'chicken']] as const) {
      const img = this.add.image(x, groundY + 6, key).setOrigin(0.5, 1).setFlipX(true);
      this.tweens.add({ targets: img, y: groundY + 4, yoyo: true, repeat: -1, duration: 300 + Math.random() * 200 });
      this.near.push({ obj: img, w: span });
    }

    // logo + splash
    this.logo = this.add.image(GAME_W / 2, 52, 'logo');
    const splash = txt(this, GAME_W / 2 + 80, 84, Phaser.Utils.Array.GetRandom(SPLASHES), { color: COL.yellow, origin: [0.5, 0.5] });
    splash.setAngle(-5);
    this.tweens.add({ targets: splash, scale: 1.12, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });

    // soft dark band so the menu stays readable over the scrolling farm
    const band = this.add.graphics();
    band.fillStyle(0x10142a, 0.28);
    band.fillRoundedRect(GAME_W / 2 - 70, 112, 140, 78, 8);
    const labels = ['Play', 'Settings', 'Exit'];
    labels.forEach((l, i) => {
      const t = txt(this, GAME_W / 2, 126 + i * 25, l, { scale: 2, origin: [0.5, 0.5] });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => this.hover(i));
      t.on('pointerdown', () => this.choose(i));
      this.items.push(t);
    });
    this.hover(0, true);

    txt(this, 4, GAME_H - 11, VERSION, { color: COL.gray });
    txt(this, GAME_W - 4, GAME_H - 11, 'Arrows/Enter or mouse', { color: COL.gray, origin: [1, 0] });

    const user = Accounts.current();
    if (user) {
      txt(this, GAME_W / 2, 224, `Signed in as ${user.name}`, { origin: [0.5, 0] });
      new Button(this, GAME_W / 2 - 30, 236, 60, 18, 'Log Out', () => {
        Accounts.logout();
        this.scene.restart();
      });
    }

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.hover((this.sel + 2) % this.items.length));
    kb.on('keydown-W', () => this.hover((this.sel + 2) % this.items.length));
    kb.on('keydown-DOWN', () => this.hover((this.sel + 1) % this.items.length));
    kb.on('keydown-S', () => this.hover((this.sel + 1) % this.items.length));
    kb.on('keydown-ENTER', () => this.choose(this.sel));
    kb.on('keydown-SPACE', () => this.choose(this.sel));
    kb.on('keydown-ESC', () => this.closeOverlay());

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private hover(i: number, silent = false): void {
    if (this.overlay) return;
    if (i !== this.sel && !silent) audio.play('tick');
    this.sel = i;
    this.items.forEach((t, k) => {
      this.tweens.killTweensOf(t);
      this.tweens.add({ targets: t, scale: k === i ? 1.25 : 1, duration: 120 });
      t.setTint(k === i ? COL.yellow : COL.text);
    });
  }

  private choose(i: number): void {
    if (this.overlay) return;
    audio.unlock();
    audio.play('click');
    if (i === 0) {
      const next = Accounts.current() ? 'ProfileScene' : 'AccountScene';
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
    } else if (i === 1) {
      if (this.game.scene.keys['SettingsScene']) {
        this.scene.launch('SettingsScene', { from: 'TitleScene' });
        this.scene.pause();
      }
    } else {
      this.showOverlay('Goodbye!', ['Thanks for farming!', '', 'You can close this tab now.', '(Your farms are saved.)']);
      try {
        window.close();
      } catch {
        /* most browsers block this */
      }
    }
  }

  private showOverlay(title: string, lines: string[]): void {
    const w = 240;
    const h = 40 + lines.length * 11 + 20;
    const c = this.add.container(GAME_W / 2 - w / 2, GAME_H / 2 - h / 2);
    c.add(panel(this, 0, 0, w, h, 'paper'));
    c.add(txt(this, w / 2, 10, title, { scale: 2, origin: [0.5, 0], color: COL.brown, shadow: false }));
    lines.forEach((l, i) => c.add(txt(this, w / 2, 36 + i * 11, l, { origin: [0.5, 0], color: COL.brown, shadow: false })));
    c.add(txt(this, w / 2, h - 16, '[Esc / click] Close', { origin: [0.5, 0], color: 0x8a5a36, shadow: false }));
    c.setDepth(100);
    this.overlay = c;
    this.time.delayedCall(100, () => this.input.once('pointerdown', () => this.closeOverlay()));
  }

  private closeOverlay(): void {
    this.overlay?.destroy();
    this.overlay = null;
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t = (this.t + dt / CYCLE) % 1;
    const t = this.t;

    // sky gradient (banded for a pixel look)
    let top = SKY[0][1];
    let bot = SKY[0][2];
    for (let i = 0; i < SKY.length - 1; i++) {
      const [t0, a0, b0] = SKY[i];
      const [t1, a1, b1] = SKY[i + 1];
      if (t >= t0 && t <= t1) {
        const k = (t - t0) / (t1 - t0 || 1);
        top = mix(a0, a1, k);
        bot = mix(b0, b1, k);
        break;
      }
    }
    this.sky.clear();
    for (let y = 0; y < GAME_H; y += 6) {
      this.sky.fillStyle(hexNum(mix(top, bot, Math.min(1, y / 200))), 1);
      this.sky.fillRect(0, y, GAME_W, 6);
    }
    const night = t > 0.5 && t < 0.92 ? Math.min(1, (t - 0.5) / 0.08, (0.92 - t) / 0.06) : 0;
    const sunset = Math.max(0, 1 - Math.abs(t - 0.5) / 0.06);

    for (const s of this.stars) s.img.setAlpha(night * (0.5 + 0.5 * Math.sin(this.time.now / 400 + s.ph)));
    // sun arcs over the day part, moon over the night part
    const sa = (t / 0.55) * Math.PI;
    this.sun.setPosition(40 + (t / 0.55) * (GAME_W - 80), 150 - Math.sin(sa) * 120).setVisible(t < 0.56);
    const mt = (t - 0.52) / 0.42;
    this.moon.setPosition(40 + mt * (GAME_W - 80), 150 - Math.sin(mt * Math.PI) * 115).setVisible(t > 0.52 && t < 0.95);

    const [r, g, b] = hexRgb(mix(mix('#ffffff', '#ffb080', sunset * 0.6), '#5a6aa8', night * 0.75));
    const tint = (r << 16) | (g << 8) | b;
    this.far.tilePositionX += 4 * dt;
    this.mid.tilePositionX += 10 * dt;
    this.ground.tilePositionX += 30 * dt;
    this.fence.tilePositionX += 30 * dt;
    for (const o of [this.far, this.mid, this.ground, this.fence]) o.setTint(tint);
    for (const c of this.clouds) {
      c.x -= 6 * dt;
      if (c.x < -60) c.x = GAME_W + 60;
      c.setTint(tint);
    }
    for (const m of this.near) {
      m.obj.x -= 30 * dt;
      if (m.obj.x < -100) m.obj.x += m.w;
      if (m.obj instanceof Phaser.GameObjects.Image) m.obj.setTint(tint);
    }
    for (const bl of this.blades) bl.rotation += dt * 0.8;

    this.logo.y = 46 + Math.sin(this.time.now / 700) * 3;
    this.logo.rotation = Math.sin(this.time.now / 1300) * 0.02;

    // easter egg: a tiny tornado or a fleeing chicken crosses in the distance
    this.eggTimer -= dt;
    if (this.eggTimer <= 0) {
      this.eggTimer = 20 + Math.random() * 25;
      if (Math.random() < 0.5) {
        const tor = this.add.sprite(-20, 196, 'tornado').setScale(0.45).play('tornado_spin').setTint(tint);
        this.children.moveBelow(tor, this.ground);
        this.tweens.add({ targets: tor, x: GAME_W + 30, duration: 9000, onComplete: () => tor.destroy() });
      } else {
        const ch = this.add.image(-10, 226, 'chicken').setOrigin(0.5, 1);
        this.tweens.add({ targets: ch, y: 222, yoyo: true, repeat: -1, duration: 90 });
        this.tweens.add({ targets: ch, x: GAME_W + 20, duration: 3500, onComplete: () => ch.destroy() });
      }
    }
  }
}
