// Renders the farm state: ground tilemap, crops, debris, fences, buildings,
// drops, trees, night lighting and little particle effects.
import Phaser from 'phaser';
import { CROPS, cropStage } from '../config/crops';
import { DEPTH, GAME_H, GAME_W, MAP_H, MAP_W, TILE } from '../config/constants';
import { DECO_PER_SEASON, T, TILES_PER_SEASON } from '../art/tiles';
import { hash2 } from '../systems/RNG';
import type { GameContext } from '../systems/GameContext';
import { COL, txt } from '../ui/widgets';
import { LAYOUT, isBorder } from './layout';
import { Ground, type DropState, type FenceState } from './types';
import { fenceKey } from './worldgen';

export class WorldView {
  map: Phaser.Tilemaps.Tilemap;
  layer: Phaser.Tilemaps.TilemapLayer;
  private crops = new Map<number, Phaser.GameObjects.Image>();
  private decos = new Map<number, Phaser.GameObjects.Image>();
  private objs = new Map<number, Phaser.GameObjects.Image>();
  private fences = new Map<string, Phaser.GameObjects.Image>();
  private drops = new Map<number, Phaser.GameObjects.Image>();
  private trees: Phaser.GameObjects.Image[] = [];
  private troughs: { pen: string; feed: Phaser.GameObjects.Image; water: Phaser.GameObjects.Image }[] = [];
  private waterTiles: [number, number][] = [];
  private waterFrame = 0;
  private waterTimer = 0;
  binImg!: Phaser.GameObjects.Image;
  night: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  cursor: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;

  constructor(private ctx: GameContext) {
    const scene = (this.scene = ctx.scene);
    this.map = scene.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MAP_W, height: MAP_H });
    const ts = this.map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0, 1)!;
    this.layer = this.map.createBlankLayer('ground', ts)!;
    this.layer.setDepth(DEPTH.ground);

    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) this.refreshTile(x, y);
    for (const f of Object.values(ctx.state.fences)) this.refreshFence(f);
    for (const d of ctx.state.drops) this.addDrop(d);

    this.buildStatic();

    this.night = scene.add
      .rectangle(0, 0, GAME_W, GAME_H, 0xffffff)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.night)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.cursor = scene.add.image(0, 0, 'cursor').setOrigin(0, 0).setDepth(DEPTH.worldUi).setAlpha(0.85);
  }

  private buildStatic(): void {
    const s = this.scene;
    const L = LAYOUT;
    const img = (x: number, y: number, key: string, depth: number) => s.add.image(x, y, key).setOrigin(0, 0).setDepth(depth);

    img(L.house.x * TILE, L.house.y * TILE, 'house', (L.house.y + L.house.h) * TILE);
    this.binImg = img(L.bin.x * TILE, L.bin.y * TILE, 'bin', (L.bin.y + 1) * TILE - 1);
    img(L.shop.x * TILE, L.shop.y * TILE - 8, 'shop', (L.shop.y + L.shop.h) * TILE);
    img(L.well.x * TILE, L.well.y * TILE, 'well', (L.well.y + L.well.h) * TILE);
    for (const p of L.pens) {
      const b = p.building;
      img(b.x * TILE, b.y * TILE, b.tex, (b.y + b.h) * TILE);
      this.troughs.push({
        pen: p.id,
        feed: img(p.feed.x * TILE, p.feed.y * TILE + 2, 'trough_feed', (p.feed.y + 1) * TILE - 2),
        water: img(p.water.x * TILE, p.water.y * TILE + 2, 'trough_water', (p.water.y + 1) * TILE - 2),
      });
    }
    this.refreshTroughs();

    // border forest
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (!isBorder(x, y) || (x + y) % 2 !== 0) continue;
        const jx = Math.round((hash2(x, y, 3) - 0.5) * 6);
        const t = s.add
          .image(x * TILE + 8 + jx, y * TILE + 16, `tree_${this.ctx.state.season}`)
          .setOrigin(0.5, 0.95)
          .setDepth(y * TILE + 16);
        this.trees.push(t);
      }
    }

    // window glows (visible at night)
    const glowAt = (x: number, y: number, sc = 1) =>
      this.glows.push(
        s.add.image(x, y, 'glow').setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD).setScale(sc).setAlpha(0),
      );
    const hx = L.house.x * TILE;
    const hy = L.house.y * TILE;
    glowAt(hx + 20, hy + 56);
    glowAt(hx + 76, hy + 56);
    const coop = L.pens[0].building;
    glowAt(coop.x * TILE + 24, coop.y * TILE + 30, 0.7);
    const barn = L.pens[1].building;
    glowAt(barn.x * TILE + 40, barn.y * TILE + 12, 0.8);
    glowAt(L.shop.x * TILE + 24, L.shop.y * TILE + 10, 0.8);
  }

  groundIndex(x: number, y: number): number {
    const t = this.ctx.state.tiles[y * MAP_W + x];
    let i: number;
    switch (t.g) {
      case Ground.GRASS: {
        const h = hash2(x, y, 11);
        i = h < 0.07 ? T.FLOWER : h < 0.4 ? T.GRASS0 : h < 0.7 ? T.GRASS1 : T.GRASS2;
        break;
      }
      case Ground.DIRT:
        i = T.DIRT;
        break;
      case Ground.TILLED:
        i = t.flood ? T.FLOOD : t.wet ? T.TILLED_WET : T.TILLED;
        break;
      case Ground.PATH:
        i = T.PATH;
        break;
      case Ground.WATER:
        i = T.WATER0 + this.waterFrame;
        break;
      default:
        i = T.SAND;
    }
    return i + this.ctx.state.season * TILES_PER_SEASON + 1;
  }

  refreshTile(x: number, y: number): void {
    const idx = y * MAP_W + x;
    const t = this.ctx.state.tiles[idx];
    if (t.g === Ground.WATER && !this.waterTiles.some(([a, b]) => a === x && b === y)) this.waterTiles.push([x, y]);
    this.layer.putTileAt(this.groundIndex(x, y), x, y);
    this.refreshDeco(x, y, idx, t.g);

    // crop
    const old = this.crops.get(idx);
    if (t.crop) {
      const def = CROPS[t.crop.id];
      const key = t.crop.dead ? 'crop_dead' : `crop_${def.id}_${cropStage(def, t.crop.days)}`;
      if (old) old.setTexture(key);
      else this.crops.set(idx, this.scene.add.image(x * TILE + 8, y * TILE + 16, key).setOrigin(0.5, 1).setDepth(y * TILE + 9));
    } else if (old) {
      old.destroy();
      this.crops.delete(idx);
    }

    // object
    const oldO = this.objs.get(idx);
    if (t.obj) {
      const key = t.obj.type === 'sprinkler' && t.obj.rogue ? 'obj_sprinkler_rogue' : `obj_${t.obj.type}`;
      if (oldO) oldO.setTexture(key);
      else this.objs.set(idx, this.scene.add.image(x * TILE + 8, y * TILE + 16, key).setOrigin(0.5, 1).setDepth(y * TILE + 11));
    } else if (oldO) {
      oldO.destroy();
      this.objs.delete(idx);
    }
  }

  /** Seeded grass decal (tuft, flowers, pebbles...) drawn just above the ground; purely visual. */
  private refreshDeco(x: number, y: number, idx: number, g: Ground): void {
    const old = this.decos.get(idx);
    const h = hash2(x, y, 29);
    if (g !== Ground.GRASS || h > 0.32) {
      if (old) {
        old.destroy();
        this.decos.delete(idx);
      }
      return;
    }
    const frame = this.ctx.state.season * DECO_PER_SEASON + Math.floor(hash2(x, y, 31) * DECO_PER_SEASON);
    if (old) old.setFrame(frame);
    else {
      const jx = Math.round((hash2(x, y, 37) - 0.5) * 4);
      const jy = Math.round((hash2(x, y, 41) - 0.5) * 4);
      const img = this.scene.add.image(x * TILE + jx, y * TILE + jy, 'grass_deco', frame).setOrigin(0, 0);
      img.setDepth(DEPTH.ground + 1).setFlipX(hash2(x, y, 43) > 0.5);
      this.decos.set(idx, img);
    }
  }

  cropSprite(x: number, y: number): Phaser.GameObjects.Image | undefined {
    return this.crops.get(y * MAP_W + x);
  }

  refreshAll(): void {
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) this.refreshTile(x, y);
    for (const t of this.trees) t.setTexture(`tree_${this.ctx.state.season}`);
  }

  refreshFence(f: FenceState): void {
    const k = fenceKey(f.x, f.y);
    const fences = this.ctx.state.fences;
    const has = (x: number, y: number) => !!fences[fenceKey(x, y)];
    const horiz = has(f.x - 1, f.y) || has(f.x + 1, f.y);
    const vert = has(f.x, f.y - 1) || has(f.x, f.y + 1);
    let key: string;
    if (f.hp <= 0) key = 'fence_broken';
    else if (f.gate) key = horiz ? (f.open ? 'gate_h_open' : 'gate_h') : f.open ? 'gate_v_open' : 'gate_v';
    else key = horiz && vert ? 'fence_post' : horiz ? 'fence_h' : 'fence_v';
    let img = this.fences.get(k);
    if (!img) {
      img = this.scene.add.image(f.x * TILE, f.y * TILE, key).setOrigin(0, 0).setDepth(f.y * TILE + 12);
      this.fences.set(k, img);
    } else img.setTexture(key);
    if (f.hp > 0 && f.hp < f.max * 0.5) img.setTint(0xc8a890);
    else img.clearTint();
  }

  refreshTroughs(): void {
    for (const t of this.troughs) {
      const pen = this.ctx.state.pens[t.pen];
      t.feed.setTexture(pen.feed > 0 ? 'trough_feed_full' : 'trough_feed');
      t.water.setTexture(pen.water > 0 ? 'trough_water_full' : 'trough_water');
    }
  }

  addDrop(d: DropState): void {
    const img = this.scene.add.image(d.x, d.y, `icon_${d.item.id}`).setOrigin(0.5, 1).setDepth(d.y);
    this.scene.tweens.add({ targets: img, y: d.y - 3, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
    this.drops.set(d.id, img);
  }

  moveDrop(d: DropState): void {
    const img = this.drops.get(d.id);
    if (!img) return;
    this.scene.tweens.killTweensOf(img);
    img.setPosition(d.x, d.y).setDepth(d.y);
    this.scene.tweens.add({ targets: img, y: d.y - 3, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
  }

  removeDrop(id: number): void {
    const img = this.drops.get(id);
    if (img) {
      this.scene.tweens.killTweensOf(img);
      img.destroy();
    }
    this.drops.delete(id);
  }

  setBinOpen(open: boolean): void {
    this.binImg.setTexture(open ? 'bin_open' : 'bin');
  }

  update(dt: number, tint: number, darkness: number): void {
    this.waterTimer += dt;
    if (this.waterTimer > 0.7) {
      this.waterTimer = 0;
      this.waterFrame = 1 - this.waterFrame;
      for (const [x, y] of this.waterTiles) this.layer.putTileAt(this.groundIndex(x, y), x, y);
    }
    this.night.fillColor = tint;
    for (const g of this.glows) g.setAlpha(darkness * 0.9);
  }

  // ------------------------------------------------------------- effects
  burst(x: number, y: number, key: string, n: number, spread = 12, life = 500, tint?: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.scene.add.image(x, y, key).setDepth(y + 20);
      if (tint !== undefined) p.setTint(tint);
      const a = Math.random() * Math.PI * 2;
      const d = spread * (0.4 + Math.random() * 0.6);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.6 - 4,
        alpha: 0,
        duration: life * (0.7 + Math.random() * 0.6),
        onComplete: () => p.destroy(),
      });
    }
  }

  floatText(x: number, y: number, s: string, color: number = COL.text): void {
    const t = txt(this.scene, x, y, s, { origin: [0.5, 1], color, depth: DEPTH.worldUi });
    this.scene.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  heart(x: number, y: number): void {
    const h = this.scene.add.image(x, y, 'heart').setDepth(DEPTH.worldUi);
    this.scene.tweens.add({ targets: h, y: y - 14, alpha: 0, duration: 900, onComplete: () => h.destroy() });
  }
}
