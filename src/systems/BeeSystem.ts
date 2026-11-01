// Beekeeping: hives in the apiary need forage (flowers or sugar water), a
// smoker check every 2 days and gentle handling. Neglected hives get angry
// (and swarm, see events/BeeSwarm.ts) or lose their queen.
import Phaser from 'phaser';
import { CROPS } from '../config/crops';
import { EVENTS } from '../config/events';
import { TILE } from '../config/constants';
import { audio } from '../audio/AudioManager';
import { LAYOUT, inRect } from '../world/layout';
import type { HiveState } from '../world/types';
import type { GameContext } from './GameContext';
import { txt } from '../ui/widgets';

export const FORAGE_RANGE = 5;          // tiles
export const SMOKE_EVERY = 2;           // days between smoker checks
export const SAFE_MINUTES = 120;        // a puff keeps a hive calm this long
export const STING_ENERGY = 15;
export const MOOD_AGITATED = 40;
export const MOOD_ANGRY = 75;
/** Crops whose flowers bees can forage on. */
export const FLOWER_CROPS = new Set(['strawberry', 'pumpkin', 'potato', 'corn', 'alien_wheat']);

export type Mood = 'calm' | 'agitated' | 'angry';

export function hiveMood(h: HiveState): Mood {
  return h.mood >= MOOD_ANGRY ? 'angry' : h.mood >= MOOD_AGITATED ? 'agitated' : 'calm';
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

interface HiveView {
  hive: Phaser.GameObjects.Image;
  drip: Phaser.GameObjects.Sprite;
  alert: Phaser.GameObjects.Image;
  bees: Phaser.GameObjects.Sprite[];
  phase: number[];
}

export class BeeSystem {
  private views = new Map<string, HiveView>();
  private slots: Phaser.GameObjects.Image[] = [];
  private flowers: Phaser.GameObjects.Image[] = [];
  private time = 0;
  private sparkT = 0;
  private dripT = 0;
  private lastHour = -1;

  constructor(private ctx: GameContext) {
    // old saves may have debris where the apiary now is
    for (const s of LAYOUT.apiary.slots) {
      const t = ctx.grid.tile(s.x, s.y);
      if (t?.obj) {
        delete t.obj;
        ctx.view.refreshTile(s.x, s.y);
      }
    }
    const sc = ctx.scene;
    for (const s of LAYOUT.apiary.slots) {
      this.slots.push(sc.add.image(s.x * TILE, s.y * TILE, 'bee_slot').setOrigin(0, 0).setDepth(s.y * TILE + 1));
    }
    const f = LAYOUT.apiary.flowers;
    for (let y = f.y; y < f.y + f.h; y++) {
      for (let x = f.x; x < f.x + f.w; x++) {
        this.flowers.push(sc.add.image(x * TILE, y * TILE, `bee_flower_${(x * 7 + y * 3) % 3}`).setOrigin(0, 0).setDepth(y * TILE));
      }
    }
    // sign post west of the apiary
    const sx = (LAYOUT.apiary.area.x - 1) * TILE + 8;
    const sy = (LAYOUT.apiary.area.y + 2) * TILE + 14;
    sc.add.image(sx, sy, 'bee_sign').setOrigin(0.5, 1).setDepth(sy);
    txt(sc, sx, sy - 25, 'APIARY\nKeep bees happy!', { origin: [0.5, 1], color: 0xffe08a, center: true }).setDepth(sy + 1);
    this.refresh();
  }

  /** Hive needs the player: smoke, sugar water or honey to collect. */
  needsAttention(h: HiveState): boolean {
    return h.queen && (this.needsSmoke(h) || this.needsSugar(h) || h.honey >= 100);
  }

  get list(): HiveState[] {
    return this.ctx.state.hives;
  }

  hiveAt(tx: number, ty: number): HiveState | undefined {
    return this.list.find((h) => h.x === tx && h.y === ty);
  }

  private emptySlotAt(tx: number, ty: number): boolean {
    return LAYOUT.apiary.slots.some((s) => s.x === tx && s.y === ty) && !this.hiveAt(tx, ty);
  }

  /** Wild flowers bloom in spring and summer. */
  wildBloom(): boolean {
    return this.ctx.state.season <= 1;
  }

  hasForage(h: HiveState): boolean {
    const season = this.ctx.state.season;
    if (season === 3) return false;
    const R = FORAGE_RANGE;
    if (this.wildBloom()) {
      const f = LAYOUT.apiary.flowers;
      const dx = Math.max(f.x - h.x, 0, h.x - (f.x + f.w - 1));
      const dy = Math.max(f.y - h.y, 0, h.y - (f.y + f.h - 1));
      if (Math.max(dx, dy) <= R) return true;
    }
    for (let y = h.y - R; y <= h.y + R; y++) {
      for (let x = h.x - R; x <= h.x + R; x++) {
        const c = this.ctx.grid.tile(x, y)?.crop;
        if (c && !c.dead && FLOWER_CROPS.has(c.id) && CROPS[c.id]?.seasons.includes(season)) return true;
      }
    }
    return false;
  }

  needsSugar(h: HiveState): boolean {
    return h.queen && !h.sugarToday && !this.hasForage(h);
  }

  needsSmoke(h: HiveState): boolean {
    return h.queen && this.ctx.state.absDay - h.lastSmoked >= SMOKE_EVERY - 1;
  }

  private smokedRecently(h: HiveState): boolean {
    return this.ctx.absMinute() - h.smokedAt < SAFE_MINUTES;
  }

  private center(h: HiveState): { x: number; y: number } {
    return { x: h.x * TILE + 8, y: h.y * TILE - 2 };
  }

  // ------------------------------------------------------------ prompts
  prompt(tx: number, ty: number): string | null {
    const sel = this.ctx.inv.selected()?.id;
    if (this.emptySlotAt(tx, ty)) return sel === 'beehive' ? '[E] Set up a new beehive' : 'Empty hive stand (buy a Beehive at the shop)';
    const h = this.hiveAt(tx, ty);
    if (!h) return null;
    if (!h.queen) return sel === 'queen_bee' ? '[E] Introduce the new queen' : 'Empty hive: the queen is gone (buy a Queen Bee)';
    const needs: string[] = [];
    if (this.needsSugar(h)) needs.push(this.ctx.state.season === 3 ? 'winter sugar water' : 'no flowers: sugar water');
    if (this.needsSmoke(h)) needs.push('smoker check');
    if (h.health < 50) needs.push('weak');
    const mood = hiveMood(h);
    const info = `Hive (${mood}, honey ${Math.floor(h.honey)}%${needs.length ? ', needs ' + needs.join(', ') : ''})`;
    if (sel === 'sugar_water' && !h.sugarToday) return `[E] Pour sugar water  ${info}`;
    if (h.honey >= 100 && (sel === 'smoker' || !sel || sel === 'basket')) {
      return this.smokedRecently(h) ? `[E] Collect honey  ${info}` : `[E] Collect honey (smoke first!)  ${info}`;
    }
    if (sel === 'smoker') return `[E] Smoke the hive  ${info}`;
    return info;
  }

  // ------------------------------------------------------- interactions
  /** E on a hive or stand. Returns true when consumed. */
  interact(tx: number, ty: number): boolean {
    const ctx = this.ctx;
    const sel = ctx.inv.selected()?.id;
    if (this.emptySlotAt(tx, ty)) {
      if (sel !== 'beehive') {
        ctx.toast('An empty hive stand. Buy a Beehive at the shop.');
        return true;
      }
      ctx.inv.remove('beehive', 1);
      this.list.push({
        id: `h${ctx.state.nextId++}`, x: tx, y: ty, health: 80, mood: 15, honey: 0, queen: true,
        lastSmoked: ctx.state.absDay, smokedAt: -9999, sugarToday: false, hungryDays: 0,
      });
      ctx.toast('A new colony moves in. Bzzz.', 0x8fd458);
      audio.play('hammer');
      audio.play('buzz');
      this.refresh();
      return true;
    }
    const h = this.hiveAt(tx, ty);
    if (!h) return false;
    if (!h.queen) {
      if (sel === 'queen_bee') {
        ctx.inv.remove('queen_bee', 1);
        Object.assign(h, { queen: true, health: 60, mood: 20, honey: 0, hungryDays: 0, lastSmoked: ctx.state.absDay });
        ctx.toast('Long live the queen! The hive hums again.', 0x8fd458);
        audio.play('buzz');
        this.refresh();
      } else ctx.toast('This hive lost its queen. Buy a Queen Bee at the shop.', 0xff9a6a);
      return true;
    }
    if (sel === 'sugar_water') return this.feed(h);
    if (h.honey >= 100 && (sel === 'smoker' || !sel || sel === 'basket')) {
      this.collect(h);
      return true;
    }
    if (sel === 'smoker') {
      this.smoke(h);
      return true;
    }
    return false;
  }

  /** Space / tool use. Handles the smoker (on hives and on swarms). */
  use(tx: number, ty: number): boolean {
    const ctx = this.ctx;
    const sel = ctx.inv.selected()?.id;
    if (sel === 'smoker') {
      if (ctx.chaos.onTool('smoker', tx, ty)) return true;
      const h = this.hiveAt(tx, ty);
      if (h?.queen) this.smoke(h);
      else ctx.view.burst(tx * TILE + 8, ty * TILE + 6, 'bee_smoke', 4, 10, 700);
      return true;
    }
    if (sel === 'sugar_water' && (this.hiveAt(tx, ty) || ctx.chaos.onInteract(tx, ty))) {
      return this.hiveAt(tx, ty) ? this.interact(tx, ty) : true;
    }
    return false;
  }

  smoke(h: HiveState): void {
    const ctx = this.ctx;
    const c = this.center(h);
    ctx.player.swing('icon_smoker');
    ctx.view.burst(c.x, c.y, 'bee_smoke', 8, 14, 900);
    h.smokedAt = ctx.absMinute();
    const first = h.lastSmoked !== ctx.state.absDay;
    h.lastSmoked = ctx.state.absDay;
    if (first) h.mood = clamp(h.mood - 20);
    ctx.toast(`The bees settle down (${hiveMood(h)}).`, 0xd8d8d0);
    audio.play('buzz');
    this.refresh();
  }

  feed(h: HiveState): boolean {
    const ctx = this.ctx;
    if (h.sugarToday) {
      ctx.toast('They already had sugar water today.');
      return true;
    }
    ctx.inv.remove('sugar_water', 1);
    h.sugarToday = true;
    h.mood = clamp(h.mood - 5);
    ctx.toast('Poured sugar water. The bees slurp happily.', 0x9fd4f0);
    audio.play('water');
    return true;
  }

  collect(h: HiveState): void {
    const ctx = this.ctx;
    const c = this.center(h);
    if (!this.smokedRecently(h)) this.sting('The bees did not like that.');
    const star = h.mood < 25 && h.health >= 75;
    const qty = h.health >= 60 ? 3 : 2;
    const left = ctx.inv.add('honey', qty, star);
    ctx.inv.add('beeswax', 1);
    if (left > 0) ctx.toast('Inventory full!', 0xff6a5a);
    h.honey = 0;
    ctx.state.stats.harvested += qty;
    ctx.state.stats.harvestedToday += qty;
    ctx.view.floatText(c.x, c.y - 6, `+${qty} ${star ? '★ ' : ''}Honey`, 0xffd860);
    audio.play('harvest');
    this.refresh();
    ctx.hud();
  }

  /** Bee stings drain energy. */
  sting(why = ''): void {
    const ctx = this.ctx;
    const p = ctx.state.player;
    p.energy = Math.max(0, p.energy - STING_ENERGY);
    ctx.toast(`OW! ${why}`.trim(), 0xff6a5a);
    ctx.view.floatText(p.x, p.y - 22, 'OW!', 0xff6a5a);
    ctx.scene.cameras.main.shake(150, 0.004);
    audio.play('buzz');
    audio.play('error');
    ctx.hud();
  }

  // ---------------------------------------------------------- daily cycle
  /** Overnight hive upkeep. Returns notes for the day summary. */
  dayEnd(): string[] {
    const ctx = this.ctx;
    const s = ctx.state;
    const notes: string[] = [];
    const badWeather = s.weather === 'rain' || s.chaos.survivedToday.includes(EVENTS.hailstorm?.name ?? 'Surprise Hailstorm');
    for (const h of this.list) {
      if (!h.queen) continue;
      const before = hiveMood(h);
      const fed = h.sugarToday || this.hasForage(h);
      if (fed) {
        h.hungryDays = 0;
        h.health = clamp(h.health + 5);
        h.honey = clamp(h.honey + (h.mood < MOOD_AGITATED ? 30 : 15));
      } else {
        h.hungryDays++;
        h.health = clamp(h.health - 20);
        h.mood = clamp(h.mood + 15);
      }
      if (s.absDay - h.lastSmoked >= SMOKE_EVERY) h.mood = clamp(h.mood + 20);
      else if (fed) h.mood = clamp(h.mood - 5);
      if (badWeather) h.mood = clamp(h.mood + 10);
      h.sugarToday = false;
      if (h.health <= 0 || h.hungryDays >= 4) {
        Object.assign(h, { queen: false, honey: 0, mood: 0, health: 0, hungryDays: 0 });
        notes.push('A neglected hive lost its queen. Buy a Queen Bee to restart it.');
        ctx.addJournal('The bees left. The queen took the honey and the good furniture.');
        continue;
      }
      const after = hiveMood(h);
      if (after !== before && after !== 'calm') notes.push(`A beehive is ${after}${after === 'angry' ? '! Expect a swarm.' : '.'}`);
      else if (!fed) notes.push('The bees went hungry. Plant flowers nearby or give them sugar water.');
    }
    return notes;
  }

  dayStart(): void {
    this.lastHour = -1;
    this.refresh();
  }

  /** True when an angry hive exists (Bee Swarm requirement). */
  angriest(): HiveState | undefined {
    return this.list.filter((h) => h.queen && hiveMood(h) === 'angry').sort((a, b) => b.mood - a.mood)[0];
  }

  // -------------------------------------------------------------- visuals
  refresh(): void {
    const sc = this.ctx.scene;
    const ids = new Set(this.list.map((h) => h.id));
    for (const [id, v] of this.views) {
      if (ids.has(id)) continue;
      v.hive.destroy();
      v.drip.destroy();
      v.alert.destroy();
      v.bees.forEach((b) => b.destroy());
      this.views.delete(id);
    }
    for (const h of this.list) {
      let v = this.views.get(h.id);
      if (!v) {
        const bx = h.x * TILE + 8;
        const by = (h.y + 1) * TILE + 2;
        const hive = sc.add.image(bx, by, 'bee_hive_calm').setOrigin(0.5, 1).setDepth((h.y + 1) * TILE - 1);
        const drip = sc.add.sprite(bx - 2, by - 8, 'bee_drip', 0).setOrigin(0, 0).setDepth((h.y + 1) * TILE);
        const alert = sc.add.image(bx, by - 36, 'bee_alert').setOrigin(0.5, 1).setDepth(DEPTH_BEES + 1).setVisible(false);
        v = { hive, drip, alert, bees: [], phase: [] };
        this.views.set(h.id, v);
      }
      const state = h.queen ? hiveMood(h) : 'empty';
      v.hive.setTexture(`bee_hive_${state === 'calm' ? 'calm' : state}`);
      v.drip.setVisible(h.queen && h.honey >= 100);
      v.alert.setVisible(this.needsAttention(h));
      const want = !h.queen ? 0 : state === 'angry' ? 8 : state === 'agitated' ? 5 : 3;
      while (v.bees.length < want) {
        v.bees.push(sc.add.sprite(0, 0, 'bee_bee', 0).play('bee_buzz').setDepth(DEPTH_BEES));
        v.phase.push(Math.random() * Math.PI * 2);
      }
      while (v.bees.length > want) {
        v.bees.pop()!.destroy();
        v.phase.pop();
      }
    }
  }

  update(dt: number): void {
    const ctx = this.ctx;
    this.time += dt;
    this.sparkT += dt;
    this.dripT += dt;
    const night = ctx.time.isNight();
    const spark = this.sparkT > 0.5;
    if (spark) this.sparkT = 0;
    for (const h of this.list) {
      const v = this.views.get(h.id);
      if (!v) continue;
      const c = this.center(h);
      const mood = hiveMood(h);
      const speed = mood === 'angry' ? 4 : mood === 'agitated' ? 2.5 : 1.4;
      const rad = mood === 'angry' ? 14 : 10;
      v.bees.forEach((b, i) => {
        const ph = v.phase[i] + this.time * speed * (i % 2 ? 1 : -1);
        b.setPosition(c.x + Math.cos(ph) * rad + Math.sin(ph * 2.3) * 3, c.y + Math.sin(ph * 1.3) * rad * 0.6 - 4);
        b.setFlipX(Math.sin(ph) > 0);
        b.setAlpha(night ? 0 : 0.6 + 0.4 * Math.abs(Math.sin(this.time * 9 + i)));
      });
      if (spark) v.alert.setVisible(this.needsAttention(h));
      if (v.alert.visible) {
        v.alert.setY((h.y + 1) * TILE - 34 - Math.abs(Math.sin(this.time * 4)) * 3);
        v.alert.setScale(1 + 0.15 * Math.sin(this.time * 8));
      }
      if (v.drip.visible && this.dripT > 0.45) v.drip.setFrame(Number(v.drip.frame.name) ? 0 : 1);
      if (spark && h.queen && mood === 'angry') ctx.view.burst(c.x, c.y - 4, 'bee_spark', 2, 12, 600);
    }
    if (this.dripT > 0.45) this.dripT = 0;

    // an angry hive may boil over into a Bee Swarm
    const hour = Math.floor(ctx.state.minutes / 60);
    if (hour !== this.lastHour) {
      this.lastHour = hour;
      const cd = ctx.state.chaos.cooldowns.bee_swarm ?? 0;
      if (hour >= 8 && hour < 20 && cd <= ctx.state.absDay && this.angriest() && ctx.chaosRng.chance(0.3)) {
        ctx.chaos.trigger('bee_swarm', { cause: 'angry_hive' });
      }
    }
  }

  /** Near the apiary (for the ambient buzz). */
  inApiary(tx: number, ty: number): boolean {
    return inRect(tx, ty, LAYOUT.apiary.area);
  }
}

const DEPTH_BEES = 7400;
