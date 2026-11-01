// The main world: input, tools, interactions, the day cycle and saving.
import Phaser from 'phaser';
import {
  CAN_CAP, CAN_CAP_BIG, DAY_START, DAYS_PER_SEASON, ENERGY_COST, MAP_H, MAP_W, PASS_OUT_MAX, PASS_OUT_PENALTY, SEASONS, TILE, TROUGH_CAP,
} from '../config/constants';
import { CROPS } from '../config/crops';
import { ITEMS, sellPrice } from '../config/items';
import { audio } from '../audio/AudioManager';
import { Player } from '../entities/Player';
import { AnimalSystem } from '../systems/AnimalSystem';
import { BeeSystem } from '../systems/BeeSystem';
import { bus, EV } from '../systems/bus';
import { ChaosDirector } from '../systems/ChaosDirector';
import { CropSystem } from '../systems/CropSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { FarmGrid, toTile } from '../systems/FarmGrid';
import { GameContext } from '../systems/GameContext';
import { InventorySystem } from '../systems/InventorySystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AreaHints } from '../systems/AreaHints';
import { TimeSystem } from '../systems/TimeSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { LAYOUT, inRect } from '../world/layout';
import { Ground, type SaveData } from '../world/types';
import { WorldView } from '../world/WorldView';
import type { UIScene } from './UIScene';
import { fishDayEnd } from './HouseScene';

export interface SummaryData {
  passedOut: boolean;
  shipped: { id: string; qty: number; star?: boolean; value: number }[];
  total: number;
  events: string[];
  harvested: number;
  notes: string[];
  dateLabel: string;
  nextLabel: string;
}

type Keys = Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SHIFT', Phaser.Input.Keyboard.Key>;

export class FarmScene extends Phaser.Scene {
  ctx!: GameContext;
  private keys!: Keys;
  private lastMouseMove = -99999;
  private mouseInside = false;
  modal = false;
  /** True while the player is inside the farmhouse (HouseScene on top, farm hidden). */
  inHouse = false;
  housePrompt: string | null = null;
  private ending = false;
  private save!: SaveData;
  hints!: AreaHints;

  constructor() {
    super('FarmScene');
  }

  init(data: { save: SaveData }): void {
    this.save = data.save;
    this.ending = false;
    this.modal = false;
    this.inHouse = false;
  }

  create(): void {
    const ctx = (this.ctx = new GameContext(this, this.save));
    ctx.grid = new FarmGrid(ctx);
    ctx.inv = new InventorySystem(ctx);
    ctx.economy = new EconomySystem(ctx);
    ctx.crops = new CropSystem(ctx);
    ctx.time = new TimeSystem(ctx);
    ctx.view = new WorldView(ctx);
    ctx.weather = new WeatherSystem(ctx);
    ctx.player = new Player(ctx);
    ctx.animals = new AnimalSystem(ctx);
    ctx.bees = new BeeSystem(ctx);
    ctx.chaos = new ChaosDirector(ctx);
    this.hints = new AreaHints(ctx);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(ctx.player.sprite, true, 0.15, 0.15);
    cam.fadeIn(500, 0, 0, 0);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT') as Keys;
    // Action keys read DOM events directly so a key can never fire twice per press.
    const onKey = (e: KeyboardEvent) => {
      if (!e.repeat && this.scene.isActive()) this.onKey(e);
    };
    window.addEventListener('keydown', onKey);
    this.events.once('shutdown', () => window.removeEventListener('keydown', onKey));
    this.input.on('pointermove', () => (this.lastMouseMove = this.time.now));
    this.input.on('gameout', () => (this.mouseInside = false));
    this.input.on('gameover', () => {
      this.mouseInside = true;
      this.lastMouseMove = this.time.now;
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.blocked()) return;
      const ui = this.scene.get('UIScene') as UIScene;
      if (ui?.wantsPointer(p)) return;
      this.lastMouseMove = this.time.now;
      this.mouseInside = true;
      const t = this.target();
      if (!t.inRange) {
        audio.play('error');
        return;
      }
      if (p.rightButtonDown()) this.interactOrUse(t.x, t.y);
      else this.useTool(t.x, t.y);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.blocked()) ctx.inv.select(ctx.state.selected + (dy > 0 ? 1 : -1));
    });

    this.scene.launch('UIScene');
    this.events.once('shutdown', () => {
      this.scene.stop('UIScene');
      audio.setWind(0);
    });
    audio.setDayVariation(ctx.state.seed ^ Math.imul(ctx.state.absDay, 2654435761 | 0));
    audio.setMusic(ctx.time.isNight() ? 'night' : 'day');
    ctx.toast(`${ctx.dateLabel()} — Welcome to ${ctx.state.farm}!`);
  }

  blocked(): boolean {
    return this.modal || this.ending || this.inHouse || this.ctx.freeze > 0;
  }

  private onKey(e: KeyboardEvent): void {
    const ctx = this.ctx;
    if (this.modal || this.ending) return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '9') ctx.inv.select(Number(k) - 1);
    else if (k === 'escape') this.openOverlay('PauseScene');
    else if (k === 'i' || k === 'tab') {
      e.preventDefault();
      this.openOverlay('InventoryScene');
    } else if (k === 'j') this.openOverlay('JournalScene');
    else if (ctx.freeze > 0 || this.inHouse) return;
    else if (k === 'e') {
      const t = this.target();
      if (t.inRange) this.interactOrUse(t.x, t.y);
      else audio.play('error');
    } else if (k === ' ') {
      const t = this.target();
      if (t.inRange) this.useTool(t.x, t.y);
      else audio.play('error');
    }
  }

  openOverlay(key: string, data?: object): void {
    if (this.modal) return;
    this.modal = true;
    this.ctx.player.setIdle();
    this.scene.pause();
    this.scene.launch(key, data);
    audio.play('click');
  }

  closeOverlay(key: string): void {
    this.scene.stop(key);
    this.scene.resume();
    this.modal = false;
    this.ctx.hud();
  }

  /**
   * Tile tools aim at the mouse tile when the mouse is inside the canvas and moved
   * recently (within 3 tiles, 4 for the watering can). Otherwise the facing tile.
   * inRange is false when the hovered tile is too far away.
   */
  target(): { x: number; y: number; inRange: boolean } {
    const p = this.ctx.player;
    if (this.mouseInside && this.time.now - this.lastMouseMove < 4000) {
      const ptr = this.input.activePointer;
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const tx = toTile(wp.x);
      const ty = toTile(wp.y);
      const sel = this.ctx.inv.selected();
      const range = sel && ITEMS[sel.id].tool === 'can' ? 4 : 3;
      const d = Math.max(Math.abs(tx - p.tileX()), Math.abs(ty - p.tileY()));
      return { x: tx, y: ty, inRange: d <= range };
    }
    return { ...p.facingTile(), inRange: true };
  }

  // ---------------------------------------------------------------- loop
  update(_t: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    const ctx = this.ctx;
    if (this.ending) return;
    ctx.state.stats.playtime += dt;
    if (ctx.freeze > 0) ctx.freeze -= dt;

    let ix = 0;
    let iy = 0;
    if (!this.blocked()) {
      const K = this.keys;
      if (K.A.isDown || K.LEFT.isDown) ix -= 1;
      if (K.D.isDown || K.RIGHT.isDown) ix += 1;
      if (K.W.isDown || K.UP.isDown) iy -= 1;
      if (K.S.isDown || K.DOWN.isDown) iy += 1;
    }
    ctx.player.update(dt, ix, iy, !this.blocked() && this.keys.SHIFT.isDown);
    ctx.time.update(dt);
    if (this.ending) return;
    ctx.animals.update(dt);
    ctx.bees.update(dt);
    ctx.economy.update();
    ctx.chaos.update(dt);
    ctx.weather.update(dt);
    const tint = ctx.time.tint();
    ctx.view.update(dt, tint.color, tint.darkness);
    audio.setMusic(ctx.time.isNight() ? 'night' : 'day');

    const t = this.target();
    ctx.view.cursor
      .setPosition(t.x * TILE, t.y * TILE)
      .setVisible(!this.blocked())
      .setTint(t.inRange ? 0xffffff : 0xff4a4a)
      .setAlpha(t.inRange ? 0.85 : 0.45);
    if (this.inHouse) bus.emit(EV.prompt, this.housePrompt);
    else bus.emit(EV.prompt, t.inRange ? this.promptFor(t.x, t.y) : 'Too far away');
  }

  // -------------------------------------------------------- interactions
  private isDoor(tx: number, ty: number): boolean {
    return LAYOUT.houseDoor.some((d) => d.x === tx && d.y === ty);
  }

  private trough(tx: number, ty: number): { pen: string; kind: 'feed' | 'water' } | null {
    for (const p of LAYOUT.pens) {
      if (p.feed.x === tx && p.feed.y === ty) return { pen: p.id, kind: 'feed' };
      if (p.water.x === tx && p.water.y === ty) return { pen: p.id, kind: 'water' };
    }
    return null;
  }

  private promptFor(tx: number, ty: number): string | null {
    const ctx = this.ctx;
    if (this.isDoor(tx, ty)) return ctx.animals.list.some((a) => a.onRoof) ? '[E] Fetch the ladder' : '[E] Enter house';
    if (inRect(tx, ty, LAYOUT.shop)) {
      const produce = ctx.state.inventory.some((it) => it && ITEMS[it.id].cat !== 'supply' && sellPrice(it.id, it.star) > 0);
      return produce ? '[E] Shop - sell produce here for instant gold' : '[E] Shop';
    }
    if (tx === LAYOUT.bin.x && ty === LAYOUT.bin.y) {
      const s = ctx.inv.selected();
      return s && ITEMS[s.id].sell ? `[E] Ship ${s.qty}x ${ITEMS[s.id].name} (+25% overnight)` : `Shipping bin (${ctx.economy.binValue()}g)`;
    }
    if (inRect(tx, ty, LAYOUT.well)) return '[E] Refill watering can';
    const bee = ctx.bees.prompt(tx, ty);
    if (bee) return bee;
    const tr = this.trough(tx, ty);
    if (tr) {
      const pen = ctx.state.pens[tr.pen];
      return tr.kind === 'feed' ? `[E] Add hay (${pen.feed}/${TROUGH_CAP})` : `[E] Fill water (${pen.water}/${TROUGH_CAP})`;
    }
    const f = ctx.grid.fence(tx, ty);
    if (f) {
      if (f.hp <= 0) return 'Broken! Hammer + 1 plank to repair';
      if (f.gate) return f.open ? '[E] Close gate' : '[E] Open gate';
      if (f.hp < f.max) return `Fence ${Math.round((f.hp / f.max) * 100)}% (hammer to repair)`;
    }
    const a = ctx.animals.at(tx * TILE + 8, ty * TILE + 8, 14);
    if (a) return `[E] Pet ${a.name}${a.petToday ? ' ♥' : ''}`;
    if (ctx.crops.isReadyAt(tx, ty)) return '[E] Harvest';
    return null;
  }

  interactOrUse(tx: number, ty: number): void {
    if (!this.interact(tx, ty)) this.useTool(tx, ty);
  }

  interact(tx: number, ty: number): boolean {
    const ctx = this.ctx;
    if (ctx.chaos.onInteract(tx, ty)) return true;
    if (this.isDoor(tx, ty)) {
      this.enterHouse();
      return true;
    }
    if (inRect(tx, ty, LAYOUT.shop)) {
      this.openOverlay('ShopScene');
      audio.play('shop');
      return true;
    }
    if (tx === LAYOUT.bin.x && ty === LAYOUT.bin.y) {
      if (!ctx.economy.shipSelected()) ctx.toast(`Select a crop or product to ship. In the bin: ${ctx.economy.binValue()}g.`);
      return true;
    }
    if (inRect(tx, ty, LAYOUT.well)) {
      this.refillCan();
      return true;
    }
    if (ctx.bees.interact(tx, ty)) return true;
    const tr = this.trough(tx, ty);
    if (tr) {
      const pen = ctx.state.pens[tr.pen];
      if (tr.kind === 'feed') {
        const n = Math.min(ctx.inv.count('hay'), TROUGH_CAP - pen.feed);
        if (pen.feed >= TROUGH_CAP) ctx.toast('The feed trough is full.');
        else if (n <= 0) ctx.toast('You need hay. Buy it at the shop.', 0xff9a6a);
        else {
          ctx.inv.remove('hay', n);
          pen.feed += n;
          ctx.toast(`Added ${n} hay.`, 0x8fd458);
          audio.play('plant');
        }
      } else this.fillWaterTrough(tr.pen);
      ctx.view.refreshTroughs();
      return true;
    }
    const f = ctx.grid.fence(tx, ty);
    if (f && f.gate && f.hp > 0) {
      f.open = !f.open;
      ctx.view.refreshFence(f);
      audio.play('click');
      return true;
    }
    const a = ctx.animals.at(tx * TILE + 8, ty * TILE + 8, 14);
    if (a) {
      ctx.animals.pet(a);
      return true;
    }
    if (ctx.crops.isReadyAt(tx, ty)) return ctx.crops.harvest(tx, ty);
    return false;
  }

  private canCap(): number {
    return this.ctx.upg.big_can ? CAN_CAP_BIG : CAN_CAP;
  }

  private refillCan(): void {
    const ctx = this.ctx;
    if (ctx.inv.count('can') === 0) return;
    ctx.state.canWater = this.canCap();
    ctx.toast('Watering can refilled.', 0x9fd4f0);
    audio.play('water_fill');
    ctx.hud();
  }

  private fillWaterTrough(penId: string): void {
    const ctx = this.ctx;
    const pen = ctx.state.pens[penId];
    if (pen.water >= TROUGH_CAP) ctx.toast('The water trough is full.');
    else if (ctx.inv.selected()?.id !== 'can' && ctx.inv.count('can') === 0) ctx.toast('You need the watering can.');
    else if (ctx.state.canWater < 4) ctx.toast('Your can needs at least 4 water. Refill at the well.', 0xff9a6a);
    else {
      ctx.state.canWater -= 4;
      pen.water = TROUGH_CAP;
      ctx.toast('Filled the water trough.', 0x9fd4f0);
      audio.play('water_fill');
      ctx.view.refreshTroughs();
      ctx.hud();
    }
  }

  useTool(tx: number, ty: number): void {
    const ctx = this.ctx;
    if (this.blocked() || ctx.player.busy > 0) return;
    if (ctx.bees.use(tx, ty)) return;
    const it = ctx.inv.selected();
    if (!it) return;
    const def = ITEMS[it.id];
    const t = ctx.grid.tile(tx, ty);
    if (!t) return;
    const center = { x: tx * TILE + 8, y: ty * TILE + 8 };

    if (def.tool) {
      const tool = def.tool;
      const cost = ENERGY_COST[tool] ?? 0;
      const p = ctx.state.player;
      if (cost > 0 && p.energy < cost) {
        ctx.toast("You're too tired. Go to bed.", 0xff9a6a);
        audio.play('error');
        return;
      }
      ctx.player.swing(`icon_${it.id}`);
      let did = false;
      if (ctx.chaos.onTool(tool, tx, ty)) did = true;
      else did = this.applyTool(tool, tx, ty);
      if (did) {
        p.energy = Math.max(0, p.energy - cost);
        ctx.hud();
      }
      return;
    }

    if (def.cat === 'seed' && def.crop) {
      if (ctx.crops.plant(tx, ty, def.crop)) {
        ctx.inv.removeAt(ctx.state.selected, 1);
      }
      else if (t.g !== Ground.TILLED) ctx.toast('Seeds go on tilled soil. Use the hoe first.');
      return;
    }

    if (def.cat === 'placeable') {
      const free = !t.obj && !t.crop && !ctx.grid.isSolid(tx, ty, 'player') && !ctx.grid.fence(tx, ty) && t.g !== Ground.WATER;
      if (!free) {
        ctx.toast("Can't place that here.");
        return;
      }
      t.obj = { type: def.id as 'sprinkler' | 'scarecrow', hp: 1 };
      ctx.view.refreshTile(tx, ty);
      ctx.inv.removeAt(ctx.state.selected, 1);
      audio.play('hammer');
      ctx.view.burst(center.x, center.y + 4, 'dust', 4, 8);
      return;
    }

    if (it.id === 'hay') {
      ctx.toast('Put hay in a feed trough (inside the pens).');
      return;
    }
  }

  private applyTool(tool: string, tx: number, ty: number): boolean {
    const ctx = this.ctx;
    const t = ctx.grid.tile(tx, ty)!;
    const cx = tx * TILE + 8;
    const cy = ty * TILE + 8;
    switch (tool) {
      case 'hoe':
        if (t.obj?.type === 'molehill') {
          t.obj = undefined;
          t.g = Ground.TILLED;
          ctx.view.refreshTile(tx, ty);
          audio.play('hoe');
          return true;
        }
        if (t.crop?.dead) {
          t.crop = undefined;
          ctx.view.refreshTile(tx, ty);
          audio.play('hoe');
          return true;
        }
        if (ctx.grid.canTill(tx, ty)) {
          t.g = Ground.TILLED;
          t.wet = ctx.weather.isRaining();
          ctx.view.refreshTile(tx, ty);
          ctx.view.burst(cx, cy + 4, 'clod', 4, 8);
          audio.play('hoe');
          return true;
        }
        return false;
      case 'can': {
        if (t.g === Ground.WATER || inRect(tx, ty, LAYOUT.well)) {
          this.refillCan();
          return false;
        }
        const tr = this.trough(tx, ty);
        if (tr?.kind === 'water') {
          this.fillWaterTrough(tr.pen);
          return true;
        }
        if (t.g !== Ground.TILLED) return false;
        if (ctx.state.canWater <= 0) {
          ctx.toast('The can is empty. Refill at the well or pond.', 0x9fd4f0);
          return false;
        }
        ctx.state.canWater--;
        if (!t.wet) {
          t.wet = true;
          ctx.view.refreshTile(tx, ty);
        }
        ctx.view.burst(cx, cy, 'drop', 6, 10);
        audio.play('water');
        ctx.hud();
        return true;
      }
      case 'scythe':
        if (t.crop && (t.crop.dead || ctx.crops.isReadyAt(tx, ty))) return ctx.crops.harvest(tx, ty);
        if (t.obj?.type === 'weed') {
          t.obj = undefined;
          ctx.view.refreshTile(tx, ty);
          ctx.view.burst(cx, cy, 'leafp', 6, 10);
          audio.play('chop');
          return true;
        }
        return false;
      case 'axe':
        if (t.obj?.type === 'branch' || t.obj?.type === 'stump') {
          t.obj.hp--;
          audio.play('chop');
          ctx.view.burst(cx, cy, 'clod', 4, 8, 400, 0xc98f52);
          if (t.obj.hp <= 0) {
            const n = t.obj.type === 'stump' ? 3 : 1;
            t.obj = undefined;
            ctx.view.refreshTile(tx, ty);
            ctx.inv.add('planks', n);
            ctx.view.floatText(cx, cy - 8, `+${n} Planks`, 0x8fd458);
          }
          return true;
        }
        return false;
      case 'pickaxe':
        if (t.obj?.type === 'rock' || t.obj?.type === 'meteorite') {
          t.obj.hp--;
          audio.play('rock');
          ctx.view.burst(cx, cy, 'clod', 5, 10, 400, 0x9a948a);
          if (t.obj.hp <= 0) {
            if (t.obj.type === 'meteorite') {
              const n = 1 + Math.floor(Math.random() * 2);
              ctx.inv.add('star_ore', n);
              ctx.view.floatText(cx, cy - 8, `+${n} Star Ore!`, 0xc07aff);
            }
            t.obj = undefined;
            ctx.view.refreshTile(tx, ty);
          }
          return true;
        }
        if (t.g === Ground.TILLED && !t.crop) {
          t.g = Ground.DIRT;
          t.wet = false;
          ctx.view.refreshTile(tx, ty);
          audio.play('hoe');
          return true;
        }
        return false;
      case 'hammer': {
        const f = ctx.grid.fence(tx, ty);
        if (f) {
          if (f.hp >= f.max) {
            ctx.toast('This fence is in good shape.');
            return false;
          }
          if (!ctx.inv.remove('planks', 1)) {
            ctx.toast('You need 1 plank. Chop branches/stumps or buy some.', 0xff9a6a);
            return false;
          }
          ctx.grid.repairFence(f);
          audio.play('hammer');
          ctx.view.floatText(cx, cy - 8, 'Repaired!', 0x8fd458);
          return true;
        }
        if (t.obj?.type === 'sprinkler' || t.obj?.type === 'scarecrow') {
          const id = t.obj.type;
          t.obj = undefined;
          ctx.view.refreshTile(tx, ty);
          ctx.inv.add(id, 1);
          audio.play('hammer');
          return true;
        }
        return false;
      }
      case 'basket': {
        const a = ctx.animals.at(cx, cy, 14);
        if (a) {
          ctx.animals.pet(a);
          return true;
        }
        if (ctx.crops.isReadyAt(tx, ty)) return ctx.crops.harvest(tx, ty);
        return false;
      }
    }
    return false;
  }

  // ------------------------------------------------------------ camera
  /** Briefly shows the player where an event is happening. */
  panTo(x: number, y: number): void {
    const cam = this.cameras.main;
    const p = this.ctx.player;
    if (Math.hypot(cam.midPoint.x - x, cam.midPoint.y - y) < 120) return;
    this.ctx.freeze = 2;
    cam.stopFollow();
    cam.pan(x, y, 600, 'Sine.easeInOut');
    this.time.delayedCall(1500, () => {
      cam.pan(p.x, p.y - 8, 450, 'Sine.easeInOut', false, (_c: Phaser.Cameras.Scene2D.Camera, prog: number) => {
        if (prog >= 1) cam.startFollow(p.sprite, true, 0.15, 0.15);
      });
    });
  }

  // ------------------------------------------------------------ farmhouse
  /** Fade into the house interior. The farm keeps simulating, just hidden. */
  enterHouse(): void {
    if (this.inHouse || this.ending) return;
    this.inHouse = true;
    this.ctx.player.setIdle();
    audio.play('click');
    const cam = this.cameras.main;
    cam.fadeOut(250, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      if (!this.inHouse) return;
      cam.setVisible(false);
      this.scene.launch('HouseScene');
    });
  }

  /** Back outside in front of the door. */
  exitHouse(fade = true): void {
    if (!this.inHouse) return;
    this.inHouse = false;
    this.housePrompt = null;
    this.scene.stop('HouseScene');
    const cam = this.cameras.main;
    cam.setVisible(true);
    cam.resetFX();
    const d = LAYOUT.houseDoor[0];
    this.ctx.player.teleport(d.x * TILE + 16, (d.y + 1) * TILE + 12, 'down');
    if (fade) cam.fadeIn(300, 0, 0, 0);
  }

  // ----------------------------------------------------------- day cycle
  passOut(): void {
    if (this.ending) return;
    this.ctx.toast('You passed out from exhaustion...', 0xff6a5a);
    this.endDay(true);
  }

  endDay(passedOut: boolean): void {
    if (this.ending) return;
    if (this.inHouse) this.exitHouse(false);
    this.ending = true;
    const ctx = this.ctx;
    audio.play('sleep');
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const s = ctx.state;
      const dateLabel = ctx.dateLabel();
      ctx.chaos.onDayEnd();
      const events = [...s.chaos.survivedToday];
      const harvested = s.stats.harvestedToday;
      const pay = ctx.economy.payout();
      const notes = [...ctx.animals.dayEnd(), ...ctx.crops.dayEnd(), ...fishDayEnd(ctx), ...ctx.bees.dayEnd()];

      // advance the calendar
      s.absDay++;
      s.day++;
      let newSeason = false;
      if (s.day > DAYS_PER_SEASON) {
        s.day = 1;
        s.season++;
        newSeason = true;
        if (s.season > 3) {
          s.season = 0;
          s.year++;
        }
      }
      if (newSeason) notes.push(...ctx.crops.seasonChange(s.season), `Welcome to ${SEASONS[s.season]}!`);
      s.weather = s.tomorrow;
      s.tomorrow = ctx.weather.roll(s.season);
      s.minutes = DAY_START;
      s.stats.harvestedToday = 0;

      // soil dries overnight; rain and sprinklers water it again
      ctx.grid.forEachTile((t) => {
        t.wet = false;
        t.flood = false;
      });
      ctx.grid.forEachTile((t, x, y) => {
        if (t.obj?.type !== 'sprinkler') return;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const n = ctx.grid.tile(x + dx, y + dy);
            if (n && n.g === Ground.TILLED) n.wet = true;
          }
        }
      });
      ctx.weather.morningWater();
      ctx.view.refreshAll();
      ctx.animals.dayStart();
      ctx.bees.dayStart();

      const p = s.player;
      if (passedOut) {
        const fine = Math.min(PASS_OUT_MAX, Math.floor(p.money * PASS_OUT_PENALTY));
        p.money -= fine;
        p.energy = Math.round(p.maxEnergy * 0.5);
        notes.unshift(`You passed out! A neighbour dragged you home and charged ${fine}g for the trouble.`);
      } else p.energy = p.maxEnergy;
      ctx.state.canWater = this.canCap();
      ctx.player.teleport(LAYOUT.houseDoor[0].x * TILE + 16, (LAYOUT.houseDoor[0].y + 1) * TILE + 12, 'down');

      const data: SummaryData = {
        passedOut, shipped: pay.lines, total: pay.total, events, harvested, notes, dateLabel, nextLabel: ctx.dateLabel(),
      };
      this.scene.pause();
      this.scene.launch('SummaryScene', data);
    });
  }

  /** Called by SummaryScene when the player continues. */
  startNewDay(): void {
    const ctx = this.ctx;
    this.scene.stop('SummaryScene');
    this.scene.resume();
    this.ending = false;
    this.modal = false;
    this.cameras.main.fadeIn(600, 0, 0, 0);
    ctx.chaos.onDayStart();
    audio.setDayVariation(ctx.state.seed ^ Math.imul(ctx.state.absDay, 2654435761 | 0));
    this.saveGame(true);
    ctx.toast(`Good morning! ${ctx.dateLabel()}`);
    if (ctx.state.weather === 'rain') ctx.toast('It is raining. Your crops are watered.', 0x9fd4f0);
    ctx.hud();
  }

  saveGame(quiet = false): void {
    const ctx = this.ctx;
    ctx.syncRng();
    ctx.chaos.serialize();
    const ok = SaveSystem.save(ctx.state);
    if (!quiet) ctx.toast(ok ? 'Game saved.' : 'Save failed!', ok ? 0x8fd458 : 0xff6a5a);
  }

  quitToTitle(): void {
    this.saveGame(true);
    this.scene.stop('UIScene');
    this.scene.stop('PauseScene');
    this.scene.start('TitleScene');
  }

  cropName(id: string): string {
    return CROPS[id]?.name ?? id;
  }
}
