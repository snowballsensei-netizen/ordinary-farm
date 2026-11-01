// Small shared toolkit for the newer chaos events: moving critters with a
// sprite, and per-tile overlay sprites (flood, fire, cracks, holes).
import Phaser from 'phaser';
import { MAP_H, MAP_W, TILE } from '../config/constants';
import type { GameContext } from '../systems/GameContext';
import { tc } from './helpers';

export interface Critter {
  x: number;
  y: number;
  gx: number;          // goal (pixels)
  gy: number;
  state: string;
  timer: number;
  hp: number;
  carry?: { id: string; qty: number; star?: boolean };
  spr?: Phaser.GameObjects.Sprite;
}

export function critter(x: number, y: number, state = 'in', hp = 1): Critter {
  return { x, y, gx: x, gy: y, state, timer: 0, hp };
}

/** Moves toward its goal; returns true on arrival. */
export function stepTo(c: Critter, speed: number, dt: number): boolean {
  const dx = c.gx - c.x;
  const dy = c.gy - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const s = Math.min(d, speed * dt);
  c.x += (dx / d) * s;
  c.y += (dy / d) * s;
  if (Math.abs(dx) > 0.5) c.spr?.setFlipX(dx < 0);
  return false;
}

export function spawnSprite(ctx: GameContext, c: Critter, key: string, depth?: number): void {
  c.spr = ctx.scene.add.sprite(c.x, c.y, key, 0).setOrigin(0.5, 1);
  if (ctx.scene.anims.exists(`${key}_anim`)) c.spr.play(`${key}_anim`);
  if (depth !== undefined) c.spr.setDepth(depth);
}

export function syncCritter(c: Critter, flying = false): void {
  if (!c.spr) return;
  c.spr.setPosition(c.x, c.y);
  if (!flying) c.spr.setDepth(c.y);
}

export function saveCritters(list: Critter[]) {
  return list.map(({ spr: _s, ...rest }) => ({ ...rest }));
}

export function loadCritters(ctx: GameContext, raw: unknown, key: string, depth?: number): Critter[] {
  const list = ((raw as Critter[]) ?? []).map((c) => ({ ...c, spr: undefined }));
  for (const c of list) spawnSprite(ctx, c, key, depth);
  return list;
}

export function killCritters(list: Critter[]): void {
  for (const c of list) c.spr?.destroy();
}

export function playerNear(ctx: GameContext, x: number, y: number, r: number): boolean {
  const p = ctx.state.player;
  return Math.hypot(p.x - x, p.y - y) < r;
}

/** Is the tool aimed at (or next to) a pixel position? */
export function hitsTile(tx: number, ty: number, x: number, y: number, slack = 1): boolean {
  return Math.abs(Math.floor(x / TILE) - tx) <= slack && Math.abs(Math.floor((y - 4) / TILE) - ty) <= slack;
}

/** Point just off the visible map edge, for critters to enter/leave from. */
export function edgePoint(ctx: GameContext): { x: number; y: number } {
  const r = ctx.chaosRng;
  const side = r.int(0, 3);
  if (side === 0) return { x: -16, y: r.int(4, MAP_H - 4) * TILE };
  if (side === 1) return { x: MAP_W * TILE + 16, y: r.int(4, MAP_H - 4) * TILE };
  if (side === 2) return { x: r.int(4, MAP_W - 4) * TILE, y: -16 };
  return { x: r.int(4, MAP_W - 4) * TILE, y: MAP_H * TILE + 16 };
}

/** Keyed set of per-tile overlay images. */
export class TileMarks {
  private imgs = new Map<string, Phaser.GameObjects.Sprite>();
  constructor(private ctx: GameContext, private key: string, private depth: (y: number) => number, private alpha = 1) {}

  has(x: number, y: number): boolean {
    return this.imgs.has(`${x},${y}`);
  }

  add(x: number, y: number): void {
    const k = `${x},${y}`;
    if (this.imgs.has(k)) return;
    const s = this.ctx.scene.add.sprite(tc(x), tc(y), this.key, 0).setAlpha(this.alpha).setDepth(this.depth(tc(y)));
    if (this.ctx.scene.anims.exists(`${this.key}_anim`)) s.play(`${this.key}_anim`);
    this.imgs.set(k, s);
  }

  setAlpha(x: number, y: number, a: number): void {
    this.imgs.get(`${x},${y}`)?.setAlpha(a * this.alpha);
  }

  remove(x: number, y: number): void {
    const k = `${x},${y}`;
    this.imgs.get(k)?.destroy();
    this.imgs.delete(k);
  }

  list(): { x: number; y: number }[] {
    return [...this.imgs.keys()].map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    });
  }

  get size(): number {
    return this.imgs.size;
  }

  clear(): void {
    for (const s of this.imgs.values()) s.destroy();
    this.imgs.clear();
  }
}

export const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
