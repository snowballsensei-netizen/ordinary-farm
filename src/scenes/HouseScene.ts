// The farmhouse interior. FarmScene keeps running underneath (hidden) so the
// clock, weather and chaos all keep going; this scene only draws the room and
// moves a local copy of the player sprite.
import Phaser from 'phaser';
import { PLAYER_SPEED, TILE } from '../config/constants';
import { ITEMS } from '../config/items';
import { audio } from '../audio/AudioManager';
import { bus, EV } from '../systems/bus';
import type { GameContext } from '../systems/GameContext';
import type { Dir, FishState } from '../world/types';
import { COL, panel, txt } from '../ui/widgets';
import type { FarmScene } from './FarmScene';
import { playerTex, walkAnim, type Look } from '../art/look';

const COLS = 14;
const ROWS = 10;
const W = COLS * TILE;
const H = ROWS * TILE;
const DOOR_X = 6 * TILE; // door gap: columns 6..7 of the bottom wall
const HW = 5;
const HH = 4;
const MAX_FISH = 8;
const MEAL_ENERGY = 30;

type Kind = 'bed' | 'tank' | 'desk' | 'kitchen' | 'tv' | 'shelf' | 'fire' | 'plant' | 'lamp' | 'window' | 'mat' | 'chair';
interface Furn {
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  solid?: { x: number; y: number; w: number; h: number };
  img?: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
}
interface Fish {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
}

const NEWS = [
  'FARM NEWS: Local chicken spotted studying latch mechanisms. Experts "mildly concerned".',
  'FARM NEWS: Crows announce a "buffet tour" of the valley. Scarecrow sales soar.',
  'FARM NEWS: Weather service admits it has no idea what the sky is doing today.',
  'FARM NEWS: Pig finds truffle, refuses to share, digs up a whole field out of spite.',
  'FARM NEWS: Goat eats a shipping bin. Goat eats the reporter\'s notes. Goat eats',
  'FARM NEWS: Sheep found on a roof again. Nobody knows how. Sheep declines to comment.',
  'FARM NEWS: Astronomers say "something shiny" may be heading our way. Shrug.',
  'FARM NEWS: Moles unionise, demand softer soil.',
];

/** Fish tank bookkeeping, run by FarmScene.endDay before the calendar advances. */
export function fishDayEnd(ctx: GameContext): string[] {
  const f = fishOf(ctx);
  const notes: string[] = [];
  if (f.count <= 0) return notes;
  if (f.fedDay === ctx.state.absDay) {
    f.hungryDays = 0;
    if (f.count >= 2 && f.count < MAX_FISH && ctx.rng.chance(0.25)) {
      f.count++;
      notes.push('A new baby fish appeared in the tank!');
      ctx.addJournal('The fish tank has a new tiny resident.');
    }
  } else {
    f.hungryDays++;
    if (f.hungryDays >= 3) {
      f.count--;
      f.hungryDays = 0;
      notes.push('A fish died of hunger... Remember to feed them.');
      ctx.addJournal('A goldfish went belly-up. Nobody fed it for three days.');
      ctx.toast('A fish has died. The tank feels emptier.', 0xff6a5a);
    }
  }
  return notes;
}

function fishOf(ctx: GameContext): FishState {
  return (ctx.state.fish ??= { count: 3, fedDay: 0, hungryDays: 0 });
}

export class HouseScene extends Phaser.Scene {
  private farm!: FarmScene;
  private ctx!: GameContext;
  private sprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  private pos = { x: 0, y: 0 };
  private dir: Dir = 'up';
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private furn: Furn[] = [];
  private walls: { x: number; y: number; w: number; h: number }[] = [];
  private fish: Fish[] = [];
  private tank!: Furn;
  private night!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  private sky: Phaser.GameObjects.Rectangle[] = [];
  private stars: Phaser.GameObjects.Rectangle[] = [];
  private fireImg!: Phaser.GameObjects.Sprite;
  private statsPanel: Phaser.GameObjects.Container | null = null;
  private leaving = false;
  private stepTimer = 0;
  private bubbleTimer = 0;
  private animT = 0;

  constructor() {
    super('HouseScene');
  }

  create(): void {
    this.farm = this.scene.get('FarmScene') as FarmScene;
    this.ctx = this.farm.ctx;
    this.leaving = false;
    this.furn = [];
    this.walls = [];
    this.fish = [];
    this.glows = [];
    this.sky = [];
    this.stars = [];
    this.statsPanel = null;

    this.buildRoom();
    this.pos = { x: DOOR_X + TILE, y: H - TILE - 6 };
    this.dir = 'up';
    this.shadow = this.add.image(0, 0, 'shadow').setAlpha(0.25);
    this.sprite = this.add.sprite(0, 0, this.tex(), 4).setOrigin(0.5, 1);
    this.syncPlayer();

    const cam = this.cameras.main;
    cam.setBackgroundColor('#1a1420');
    cam.centerOn(W / 2, H / 2);
    cam.fadeIn(300, 0, 0, 0);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as typeof this.keys;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !this.scene.isActive() || this.frozen()) return;
      if (e.key.toLowerCase() === 'e') this.onInteract();
    };
    window.addEventListener('keydown', onKey);
    this.events.once('shutdown', () => window.removeEventListener('keydown', onKey));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown() && !this.frozen()) this.onInteract();
    });
    // Save & Quit stops FarmScene; take the house down with it.
    const stopSelf = () => this.scene.stop();
    this.farm.events.once('shutdown', stopSelf);
    this.events.once('shutdown', () => this.farm.events.off('shutdown', stopSelf));
    this.ctx.toast('Home sweet home.');
  }

  private look(): Look | undefined {
    const l = (this.ctx.state as { look?: unknown }).look;
    return l === 'f' || l === 'm' ? l : undefined;
  }

  private tex(): string {
    const key = playerTex(this.look());
    return this.textures.exists(key) ? key : 'player';
  }

  private anim(dir: Dir): string {
    const key = walkAnim(dir, this.look());
    return this.anims.exists(key) ? key : `walk_${dir}`;
  }

  private frozen(): boolean {
    return this.leaving || this.farm.modal || !this.farm.scene.isActive();
  }

  // ------------------------------------------------------------- building
  private buildRoom(): void {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const edge = x === 0 || x === COLS - 1 || y === 0 || (y === ROWS - 1 && !(x === 6 || x === 7));
        const front = !edge && (y === 1 || y === 2);
        const key = edge ? 'in_wall_top' : front ? 'in_wall' : 'in_floor';
        this.add.image(x * TILE, y * TILE, key).setOrigin(0, 0).setDepth(edge ? H + 10 : -10);
      }
    }
    // upper wall row is plain plaster (the wainscot is only on the lower row)
    for (let x = 1; x < COLS - 1; x++) this.add.rectangle(x * TILE, TILE, TILE, TILE, 0xd9c39a).setOrigin(0, 0).setDepth(-9);
    this.walls.push(
      { x: 0, y: 0, w: W, h: 3 * TILE },
      { x: 0, y: 0, w: TILE, h: H },
      { x: W - TILE, y: 0, w: TILE, h: H },
      { x: 0, y: H - TILE, w: DOOR_X, h: TILE },
      { x: DOOR_X + 2 * TILE, y: H - TILE, w: W, h: TILE },
    );

    // a small rug (flat, no collision)
    this.add.image(84, 76, 'in_rug2').setOrigin(0, 0).setDepth(-5);
    this.addFurn('mat', 'in_mat', DOOR_X, H - TILE - 14, false);

    // windows show the sky behind them
    for (const wx of [90]) {
      for (const [ox, w] of [[2, 11], [15, 11]]) {
        this.sky.push(this.add.rectangle(wx + ox, 22, w, 16, 0x9fd4f0).setOrigin(0, 0).setDepth(-8));
      }
      for (let i = 0; i < 3; i++) this.stars.push(this.add.rectangle(wx + 4 + i * 8, 25 + (i % 2) * 6, 1, 1, 0xffffff).setOrigin(0, 0).setDepth(-7));
      this.add.image(wx, 20, 'in_window').setOrigin(0, 0).setDepth(-6);
      this.furn.push({ kind: 'window', x: wx, y: 20, w: 28, h: 28 });
    }

    // one cozy room: top wall, then along the sides; kitchen in the top-right corner
    this.addFurn('bed', 'in_bed', 18, 40);
    this.addFurn('shelf', 'in_shelf', 54, 20);
    const fire = this.addFurn('fire', 'in_fire', 122, 20);
    this.fireImg = fire.img as Phaser.GameObjects.Sprite;
    this.addFurn('kitchen', 'in_fridge', 160, 20);
    this.addFurn('kitchen', 'in_stove', 176, 24);
    this.addFurn('kitchen', 'in_counter', 192, 24);
    const lamp = this.addFurn('lamp', 'in_lamp', 168, 62);
    this.addGlow(lamp.x + 6, lamp.y + 4, 1.2);
    this.addGlow(fire.x + 16, fire.y + 26, 1.6);
    this.addFurn('tv', 'in_tv', 184, 66);
    this.tank = this.addFurn('tank', 'in_tank', 18, 96);
    this.addFurn('desk', 'in_desk', 140, 112);
    this.addFurn('plant', 'in_plant', 192, 120);

    // fish
    const n = Math.min(MAX_FISH, fishOf(this.ctx).count);
    for (let i = 0; i < n; i++) this.spawnFish();

    this.night = this.add.rectangle(0, 0, W, H, 0x1a2050, 0).setOrigin(0, 0).setDepth(H + 20);
    for (const g of this.glows) g.setDepth(H + 21);
  }

  private addFurn(kind: Kind, key: string, x: number, y: number, solid = true): Furn {
    const t = this.textures.get(key);
    const fr = t.get(key === 'in_tank' || key === 'in_fire' ? 0 : undefined);
    const w = fr.width;
    const h = fr.height;
    const img = key === 'in_tank' || key === 'in_fire' ? this.add.sprite(x, y, key, 0) : this.add.image(x, y, key);
    img.setOrigin(0, 0).setDepth(kind === 'mat' ? -4 : y + h);
    const f: Furn = { kind, x, y, w, h, img };
    if (solid) {
      const top = Math.max(y + Math.floor(h * 0.45), y);
      f.solid = { x: x + 1, y: top, w: w - 2, h: y + h - top - 1 };
    }
    this.furn.push(f);
    return f;
  }

  private addGlow(x: number, y: number, scale: number): void {
    this.glows.push(this.add.image(x, y, 'in_glow').setScale(scale).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0));
  }

  private spawnFish(): void {
    const t = this.tank;
    const img = this.add.image(t.x + 6 + Math.random() * 28, t.y + 6 + Math.random() * 10, 'in_fish').setDepth(t.y + t.h + 1);
    this.fish.push({ img, vx: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6), vy: (Math.random() - 0.5) * 3 });
  }

  // ----------------------------------------------------------------- loop
  update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.animT += dt;
    this.updateAmbience(dt);
    if (this.frozen()) {
      if (this.sprite.anims.isPlaying) this.setIdle();
      return;
    }
    let ix = 0;
    let iy = 0;
    const K = this.keys;
    if (K.A.isDown || K.LEFT.isDown) ix -= 1;
    if (K.D.isDown || K.RIGHT.isDown) ix += 1;
    if (K.W.isDown || K.UP.isDown) iy -= 1;
    if (K.S.isDown || K.DOWN.isDown) iy += 1;
    if (ix || iy) {
      if (this.statsPanel) this.closeStats();
      const len = Math.hypot(ix, iy);
      const sp = PLAYER_SPEED * (this.ctx.state.player.energy <= 0 ? 0.6 : 1) * dt;
      this.move((ix / len) * sp, 0);
      this.move(0, (iy / len) * sp);
      this.dir = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 'right' : 'left') : iy > 0 ? 'down' : 'up';
      const anim = this.anim(this.dir);
      if (this.sprite.anims.currentAnim?.key !== anim || !this.sprite.anims.isPlaying) this.sprite.play(anim);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.3;
        audio.play('step');
      }
    } else if (this.sprite.anims.isPlaying) this.setIdle();
    this.syncPlayer();
    if (this.pos.y > H - 8) return this.leave();
    const f = this.facing();
    this.farm.housePrompt = f ? this.promptFor(f) : null;
  }

  private move(dx: number, dy: number): void {
    const nx = this.pos.x + dx;
    const ny = this.pos.y + dy;
    const box = { x: nx - HW, y: ny - HH, w: HW * 2, h: HH * 2 };
    const hit = (r: { x: number; y: number; w: number; h: number }) =>
      box.x < r.x + r.w && box.x + box.w > r.x && box.y < r.y + r.h && box.y + box.h > r.y;
    if (this.walls.some(hit) || this.furn.some((f) => f.solid && hit(f.solid))) return;
    this.pos.x = nx;
    this.pos.y = Math.min(ny, H - 4);
  }

  private setIdle(): void {
    this.sprite.anims.stop();
    this.sprite.setFrame({ down: 0, up: 1, left: 2, right: 3 }[this.dir] * 4);
  }

  private syncPlayer(): void {
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    this.sprite.setPosition(x, y).setDepth(y);
    this.shadow.setPosition(x, y - 1).setDepth(y - 1);
  }

  private updateAmbience(dt: number): void {
    const time = this.ctx.time;
    const night = time.isNight();
    const dark = time.tint().darkness;
    this.night.setFillStyle(0x1a2050, Math.min(0.45, dark * 0.6));
    const flick = 0.85 + Math.sin(this.animT * 9) * 0.08 + Math.sin(this.animT * 23) * 0.05;
    this.glows.forEach((g, i) => g.setAlpha(night ? (i === 1 ? flick * 0.55 : 0.4) : i === 1 ? 0.12 : 0));
    const m = this.ctx.state.minutes % 1440;
    const sky = night ? 0x1a2050 : m >= 17 * 60 ? 0xf09a50 : m < 7 * 60 ? 0xf3dfb0 : this.ctx.state.weather === 'rain' ? 0x8a8a96 : 0x9fd4f0;
    for (const s of this.sky) s.setFillStyle(sky);
    for (const s of this.stars) s.setVisible(night);
    const fr = Math.floor(this.animT * 4) % 2;
    this.fireImg.setFrame(fr);
    (this.tank.img as Phaser.GameObjects.Sprite).setFrame(Math.floor(this.animT * 1.5) % 2);

    const t = this.tank;
    for (const f of this.fish) {
      f.img.x += f.vx * dt;
      f.img.y += f.vy * dt;
      if (f.img.x < t.x + 5 || f.img.x > t.x + t.w - 5) f.vx = -f.vx;
      if (f.img.y < t.y + 6 || f.img.y > t.y + 17) f.vy = -f.vy;
      if (Math.random() < dt * 0.3) f.vy = (Math.random() - 0.5) * 4;
      f.img.x = Phaser.Math.Clamp(f.img.x, t.x + 5, t.x + t.w - 5);
      f.img.y = Phaser.Math.Clamp(f.img.y, t.y + 6, t.y + 17);
      f.img.setFlipX(f.vx > 0);
    }
    this.bubbleTimer -= dt;
    if (this.bubbleTimer <= 0) {
      this.bubbleTimer = 0.6 + Math.random();
      const b = this.add.image(t.x + 8 + Math.random() * 24, t.y + 17, 'in_bubble').setDepth(t.y + t.h + 2);
      this.tweens.add({ targets: b, y: t.y + 4, x: b.x + 2, duration: 1600, onComplete: () => b.destroy() });
    }
  }

  // ---------------------------------------------------------- interaction
  private facing(): Furn | null {
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.dir];
    const px = this.pos.x + d[0] * 10;
    const py = this.pos.y - 3 + d[1] * 10;
    let best: Furn | null = null;
    let bestD = 14;
    for (const f of this.furn) {
      if (f.kind === 'window' && this.dir !== 'up') continue;
      const r = f.kind === 'mat' || !f.solid ? { x: f.x, y: f.y, w: f.w, h: f.h } : f.solid;
      const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
      const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
      const dist = Math.hypot(dx, dy);
      if (dist < bestD) {
        bestD = dist;
        best = f;
      }
    }
    return best;
  }

  private promptFor(f: Furn): string {
    switch (f.kind) {
      case 'bed': return '[E] Go to bed';
      case 'tank': return fishOf(this.ctx).count <= 0 ? 'An empty fish tank' : fishOf(this.ctx).fedDay === this.ctx.state.absDay ? 'The fish look happy' : '[E] Feed the fish';
      case 'desk': return '[E] Farm records';
      case 'kitchen': return '[E] Cook a meal (1 produce)';
      case 'tv': return '[E] Watch farm news';
      case 'mat': return '[E] Go outside';
      case 'shelf': return '[E] Browse books';
      case 'fire': return 'A cozy fire';
      case 'window': return '[E] Look outside';
      default: return '';
    }
  }

  private onInteract(): void {
    if (this.statsPanel) return this.closeStats();
    const f = this.facing();
    if (!f) return;
    const ctx = this.ctx;
    switch (f.kind) {
      case 'bed':
        this.farm.modal = true;
        bus.emit(EV.dialog, 'Go to bed and end the day?', (yes: boolean) => {
          this.farm.modal = false;
          if (yes) this.farm.endDay(false);
        });
        break;
      case 'tank': this.feedFish(); break;
      case 'desk': this.openStats(); break;
      case 'kitchen': this.cook(); break;
      case 'tv': {
        const pending = ctx.state.chaos.pending.length > 0 || ctx.state.chaos.level > 60;
        const line = pending
          ? 'FARM NEWS: Experts predict "shenanigans" in your area very soon. Keep an eye out!'
          : NEWS[Math.floor(Math.random() * NEWS.length)];
        ctx.toast(line, 0x9fd4f0);
        audio.play('hint');
        break;
      }
      case 'shelf':
        ctx.toast(['"Crops and You: A Love Story". Riveting.', '"Herding Cows for Dummies". Chapter 1: Run.', '"1001 Uses for a Plank".', '"Why Is My Chicken Plotting?" (well-thumbed)'][Math.floor(Math.random() * 4)]);
        audio.play('click');
        break;
      case 'window':
        ctx.toast(ctx.time.isNight() ? 'The stars are out. Somewhere, a cow moos ominously.' : `Outside: ${ctx.state.weather}. ${ctx.time.label()}`);
        break;
      case 'mat': this.leave(); break;
      default: break;
    }
  }

  private feedFish(): void {
    const ctx = this.ctx;
    const f = fishOf(ctx);
    if (f.count <= 0) {
      ctx.toast('The tank is empty. Maybe the shop will sell fish someday.', 0xb8b8c4);
      return;
    }
    if (f.fedDay === ctx.state.absDay) {
      ctx.toast('The fish are already fed today.');
      return;
    }
    f.fedDay = ctx.state.absDay;
    f.hungryDays = 0;
    ctx.toast(`You fed the ${f.count} fish. They wiggle happily.`, 0x8fd458);
    audio.play('pop');
    const t = this.tank;
    for (let i = 0; i < 6; i++) {
      const flake = this.add.rectangle(t.x + 8 + Math.random() * 24, t.y + 4, 1, 1, 0xe8853a).setDepth(t.y + t.h + 2);
      this.tweens.add({ targets: flake, y: t.y + 16, duration: 1800 + Math.random() * 800, onComplete: () => flake.destroy() });
    }
  }

  private cook(): void {
    const ctx = this.ctx;
    const p = ctx.state.player;
    if (p.energy >= p.maxEnergy) {
      ctx.toast("You're not hungry right now.");
      return;
    }
    const sel = ctx.inv.selected();
    let id = sel && ITEMS[sel.id]?.cat === 'produce' ? sel.id : null;
    if (!id) id = ctx.state.inventory.find((s) => s && ITEMS[s.id]?.cat === 'produce')?.id ?? null;
    if (!id || !ctx.inv.remove(id, 1)) {
      ctx.toast('No produce to cook. Harvest some crops first!', 0xff9a6a);
      audio.play('error');
      return;
    }
    p.energy = Math.min(p.maxEnergy, p.energy + MEAL_ENERGY);
    ctx.toast(`You cooked a hearty ${ITEMS[id].name} dish. +${MEAL_ENERGY} energy!`, 0x8fd458);
    audio.play('plant');
    ctx.hud();
  }

  private openStats(): void {
    const s = this.ctx.state;
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(H + 100);
    const pw = 220;
    const ph = 110;
    const x = (480 - pw) / 2;
    const y = 50;
    c.add(panel(this, x, y, pw, ph, 'paper'));
    const lines = [
      'FARM RECORDS',
      '',
      `Days on the farm: ${s.absDay}`,
      `Total gold earned: ${s.stats.earned}g`,
      `Crops harvested: ${s.stats.harvested}`,
      `Disasters survived: ${s.chaos.totalSurvived}`,
      `Animals: ${s.animals.length}   Fish: ${fishOf(this.ctx).count}`,
      '',
      '[E] close   [J] full journal',
    ];
    c.add(txt(this, x + 12, y + 10, lines.join('\n'), { color: COL.dark, shadow: false }));
    this.statsPanel = c;
    audio.play('click');
  }

  private closeStats(): void {
    this.statsPanel?.destroy();
    this.statsPanel = null;
  }

  /** Walk out the door: FarmScene puts the player in front of the house. */
  leave(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.farm.housePrompt = null;
    audio.play('click');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.farm.exitHouse(true));
  }
}
