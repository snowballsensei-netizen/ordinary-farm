import Phaser from 'phaser';
import { PLAYER_SPEED, TILE } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { moveBox, toTile } from '../systems/FarmGrid';
import type { GameContext } from '../systems/GameContext';
import type { Dir } from '../world/types';
import { playerTex, walkAnim } from '../art/look';

const HW = 5;
const HH = 4;
const SPRINT_MULT = 1.7;
const SPRINT_DRAIN_EVERY = 0.25; // seconds of sprinting per energy point
const SPRINT_MIN_ENERGY = 3;

export class Player {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  toolIcon: Phaser.GameObjects.Image;
  private stepTimer = 0;
  private dustTimer = 0;
  private sprintDrain = 0;
  sprinting = false;
  busy = 0; // seconds of tool animation

  constructor(private ctx: GameContext) {
    const s = ctx.scene;
    const p = ctx.state.player;
    this.shadow = s.add.image(p.x, p.y, 'shadow').setAlpha(0.25);
    this.sprite = s.add.sprite(p.x, p.y, this.tex(), 0).setOrigin(0.5, 1);
    this.toolIcon = s.add.image(p.x, p.y, 'icon_hoe').setVisible(false);
    this.setIdle();
  }

  /** Texture for the chosen look; falls back to male until the female art exists. */
  private tex(): string {
    const k = playerTex(this.ctx.state.look);
    return this.ctx.scene.textures.exists(k) ? k : 'player';
  }

  private walk(dir: string): string {
    const k = walkAnim(dir, this.ctx.state.look);
    return this.ctx.scene.anims.exists(k) ? k : walkAnim(dir, 'm');
  }

  get x(): number {
    return this.ctx.state.player.x;
  }
  get y(): number {
    return this.ctx.state.player.y;
  }
  get dir(): Dir {
    return this.ctx.state.player.dir;
  }

  tileX(): number {
    return toTile(this.x);
  }
  tileY(): number {
    return toTile(this.y - 3);
  }

  facingTile(): { x: number; y: number } {
    const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.dir];
    return { x: toTile(this.x + d[0] * 12), y: toTile(this.y - 3 + d[1] * 12) };
  }

  setIdle(): void {
    const row = { down: 0, up: 1, left: 2, right: 3 }[this.dir];
    this.sprite.anims.stop();
    if (this.sprite.texture.key !== this.tex()) this.sprite.setTexture(this.tex());
    this.sprite.setFrame(row * 4);
  }

  teleport(x: number, y: number, dir: Dir = 'down'): void {
    const p = this.ctx.state.player;
    p.x = x;
    p.y = y;
    p.dir = dir;
    this.setIdle();
    this.sync();
  }

  update(dt: number, ix: number, iy: number, sprint = false): void {
    const p = this.ctx.state.player;
    if (this.busy > 0) {
      this.busy -= dt;
      if (this.busy <= 0) this.toolIcon.setVisible(false);
      ix = 0;
      iy = 0;
    }
    const moving = ix !== 0 || iy !== 0;
    this.sprinting = moving && sprint && p.energy > SPRINT_MIN_ENERGY;
    if (moving) {
      const len = Math.hypot(ix, iy);
      const sp = PLAYER_SPEED * (p.energy <= 0 ? 0.6 : this.sprinting ? SPRINT_MULT : 1) * dt;
      if (this.sprinting) {
        this.sprintDrain += dt;
        if (this.sprintDrain >= SPRINT_DRAIN_EVERY) {
          this.sprintDrain -= SPRINT_DRAIN_EVERY;
          p.energy = Math.max(0, p.energy - 1);
          this.ctx.hud();
        }
      }
      this.sprite.anims.timeScale = this.sprinting ? 1.7 : 1;
      moveBox(this.ctx.grid, p, (ix / len) * sp, (iy / len) * sp, HW, HH, 'player');
      p.dir = Math.abs(ix) > Math.abs(iy) ? (ix > 0 ? 'right' : 'left') : iy > 0 ? 'down' : 'up';
      const anim = this.walk(p.dir);
      if (this.sprite.anims.currentAnim?.key !== anim || !this.sprite.anims.isPlaying) this.sprite.play(anim);
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sprinting ? 0.18 : 0.28;
        audio.play('step');
      }
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = this.sprinting ? 0.12 : 0.35;
        this.ctx.view.burst(p.x, p.y - 1, 'dust', this.sprinting ? 3 : 1, this.sprinting ? 7 : 4, 350);
      }
    } else if (this.sprite.anims.isPlaying) {
      this.sprite.anims.timeScale = 1;
      this.setIdle();
    }
    this.sync();
  }

  /** Small tool swing animation. */
  swing(iconKey: string): void {
    this.busy = 0.22;
    const d = { down: [6, -6], up: [-6, -22], left: [-10, -14], right: [10, -14] }[this.dir];
    this.toolIcon.setTexture(iconKey).setVisible(true).setPosition(this.x + d[0], this.y + d[1]).setAngle(-40);
    this.toolIcon.setFlipX(this.dir === 'left');
    this.ctx.scene.tweens.add({ targets: this.toolIcon, angle: 40, duration: 180 });
  }

  sync(): void {
    const p = this.ctx.state.player;
    this.sprite.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(p.y);
    this.shadow.setPosition(Math.round(p.x), Math.round(p.y) - 1).setDepth(p.y - 1);
    this.toolIcon.setDepth(p.y + 1);
  }

  center(): { x: number; y: number } {
    return { x: this.x, y: this.y - 8 };
  }

  distTo(x: number, y: number): number {
    return Math.hypot(this.x - x, this.y - 4 - y);
  }

  tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE + 8, y: ty * TILE + 8 };
  }
}
