// Livestock AI: wandering, needs, produce, escaping, herding and trampling.
// Chaos events steer animals through setPath() / stampede().
import Phaser from 'phaser';
import { ANIMALS, type AnimalDef } from '../config/animals';
import { NIGHT_HOME_TIME, QUALITY_HAPPINESS, TILE } from '../config/constants';
import { CROPS } from '../config/crops';
import { audio } from '../audio/AudioManager';
import { LAYOUT, penLayout, type PenLayout } from '../world/layout';
import type { AnimalState } from '../world/types';
import { makeAnimal } from '../world/worldgen';
import { moveBox, toTile, type Mover } from './FarmGrid';
import type { GameContext } from './GameContext';

type Mode = 'wander' | 'idle' | 'path' | 'stampede' | 'home';

interface Runtime {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  mode: Mode;
  timer: number;
  vx: number;
  vy: number;
  speedMul: number;
  waypoints: { x: number; y: number }[];
  onArrive?: () => void;
  stuck: number;
  bob: number;
  soundTimer: number;
  lastTrampleTile: number;
}

export class AnimalSystem {
  private rt = new Map<string, Runtime>();

  constructor(private ctx: GameContext) {
    for (const a of ctx.state.animals) this.createSprite(a);
  }

  get list(): AnimalState[] {
    return this.ctx.state.animals;
  }

  def(a: AnimalState): AnimalDef {
    return ANIMALS[a.type];
  }

  pen(a: AnimalState): PenLayout {
    return penLayout(a.pen);
  }

  byId(id: string): AnimalState | undefined {
    return this.list.find((a) => a.id === id);
  }

  ofType(type: string): AnimalState[] {
    return this.list.filter((a) => a.type === type);
  }

  private createSprite(a: AnimalState): void {
    const s = this.ctx.scene;
    const d = this.def(a);
    const shadow = s.add.image(a.x, a.y, d.big ? 'shadow_big' : 'shadow').setAlpha(0.22);
    const sprite = s.add.image(a.x, a.y, a.type).setOrigin(0.5, 1);
    sprite.setInteractive();
    this.rt.set(a.id, {
      sprite, shadow, mode: 'idle', timer: Math.random() * 2, vx: 0, vy: 0, speedMul: 1, waypoints: [],
      stuck: 0, bob: Math.random() * 6, soundTimer: 4 + Math.random() * 10, lastTrampleTile: -1,
    });
    this.syncSprite(a);
    if (a.asleep) this.setVisible(a, false);
  }

  runtime(id: string): Runtime | undefined {
    return this.rt.get(id);
  }

  add(type: string): AnimalState | null {
    const pen = penLayout(ANIMALS[type].pen);
    const count = this.list.filter((a) => a.pen === pen.id).length;
    if (count >= pen.cap) return null;
    const x = (pen.door.x + 0.5) * TILE + (Math.random() - 0.5) * 20;
    const y = (pen.door.y + 1) * TILE + Math.random() * 12;
    const a = makeAnimal(type, pen.id, x, y, this.ctx.rng, this.ctx.state.nextId++);
    this.list.push(a);
    this.createSprite(a);
    return a;
  }

  // ------------------------------------------------------------ commands
  setPath(id: string, pts: { x: number; y: number }[], speedMul = 1, onArrive?: () => void): void {
    const r = this.rt.get(id);
    if (!r) return;
    r.mode = 'path';
    r.waypoints = pts.slice();
    r.speedMul = speedMul;
    r.onArrive = onArrive;
    r.stuck = 0;
  }

  stampede(id: string, angle: number, secs: number, speedMul = 3.5): void {
    const r = this.rt.get(id);
    if (!r) return;
    r.mode = 'stampede';
    r.vx = Math.cos(angle);
    r.vy = Math.sin(angle);
    r.timer = secs;
    r.speedMul = speedMul;
  }

  release(id: string): void {
    const r = this.rt.get(id);
    if (!r) return;
    r.mode = 'idle';
    r.timer = 0.5;
    r.waypoints = [];
    r.onArrive = undefined;
  }

  isBusy(id: string): boolean {
    const m = this.rt.get(id)?.mode;
    return m === 'path' || m === 'stampede';
  }

  /** Teleports an animal (tornadoes, sheep on roofs...). */
  place(a: AnimalState, x: number, y: number): void {
    a.x = x;
    a.y = y;
    this.syncSprite(a);
  }

  setVisible(a: AnimalState, v: boolean): void {
    const r = this.rt.get(a.id);
    r?.sprite.setVisible(v);
    r?.shadow.setVisible(v);
  }

  isInside(a: AnimalState): boolean {
    return this.ctx.grid.insidePen(a.x, a.y, this.pen(a));
  }

  // --------------------------------------------------------------- update
  update(dt: number): void {
    const night = this.ctx.state.minutes >= NIGHT_HOME_TIME;
    const p = this.ctx.state.player;
    for (const a of this.list) {
      const r = this.rt.get(a.id);
      if (!r) continue;
      if (a.asleep || a.onRoof) {
        this.syncSprite(a);
        continue;
      }
      const d = this.def(a);
      let mx = 0;
      let my = 0;
      let speed = d.speed;
      const who: Mover = a.escaped || r.mode === 'path' || r.mode === 'stampede' ? 'free' : 'penned';

      if (r.mode === 'path') {
        const wp = r.waypoints[0];
        if (!wp) {
          const cb = r.onArrive;
          this.release(a.id);
          cb?.();
        } else {
          const dx = wp.x - a.x;
          const dy = wp.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 3) r.waypoints.shift();
          else {
            mx = dx / dist;
            my = dy / dist;
          }
          speed *= r.speedMul;
        }
      } else if (r.mode === 'stampede') {
        mx = r.vx;
        my = r.vy;
        speed *= r.speedMul;
        r.timer -= dt;
        if (r.timer <= 0) this.release(a.id);
      } else {
        const pd = Math.hypot(p.x - a.x, p.y - a.y);
        const gate = this.passableGate(a);
        if (a.escaped && pd < 44) {
          // flee from the player: this is how you herd them
          mx = (a.x - p.x) / (pd || 1);
          my = (a.y - p.y) / (pd || 1);
          if (gate && Math.hypot(gate.x - a.x, gate.y - a.y) < 80) {
            // nudge toward home when being herded nearby
            const gx = gate.x - a.x;
            const gy = gate.y - a.y;
            const gl = Math.hypot(gx, gy) || 1;
            mx = mx * 0.5 + (gx / gl) * 0.8;
            my = my * 0.5 + (gy / gl) * 0.8;
          }
          speed *= 2.2;
        } else if (a.escaped && gate && Math.hypot(gate.x - a.x, gate.y - a.y) < 56) {
          const inside = this.interiorPoint(a);
          this.setPath(a.id, [gate, inside], 1.2);
        } else if (night && !a.escaped && r.mode !== 'home') {
          const pen = this.pen(a);
          r.mode = 'home';
          r.waypoints = [{ x: (pen.door.x + 0.5) * TILE, y: (pen.door.y + 0.7) * TILE }];
        } else if (r.mode === 'home') {
          const wp = r.waypoints[0];
          if (!wp || Math.hypot(wp.x - a.x, wp.y - a.y) < 6) {
            a.asleep = true;
            this.setVisible(a, false);
            r.mode = 'idle';
          } else {
            const l = Math.hypot(wp.x - a.x, wp.y - a.y);
            mx = (wp.x - a.x) / l;
            my = (wp.y - a.y) / l;
          }
        } else {
          r.timer -= dt;
          if (r.timer <= 0) {
            if (r.mode === 'wander' || Math.random() < 0.45) {
              r.mode = 'idle';
              r.timer = 1 + Math.random() * 3;
            } else {
              r.mode = 'wander';
              const ang = Math.random() * Math.PI * 2;
              r.vx = Math.cos(ang);
              r.vy = Math.sin(ang);
              r.timer = 0.6 + Math.random() * 1.8;
            }
          }
          if (r.mode === 'wander') {
            mx = r.vx;
            my = r.vy;
          }
        }
      }

      if (mx !== 0 || my !== 0) {
        const step = speed * dt;
        const hit = moveBox(this.ctx.grid, a, mx * step, my * step, d.hw, d.hh, who);
        if (hit.bx && hit.by) {
          r.stuck += dt;
          if (r.mode === 'wander') r.timer = 0;
          if (r.mode === 'stampede') {
            const ang = Math.atan2(r.vy, r.vx) + Math.PI * (0.5 + Math.random());
            r.vx = Math.cos(ang);
            r.vy = Math.sin(ang);
          }
        } else if (hit.bx || hit.by) {
          r.stuck += dt * 0.5;
          if (r.mode === 'stampede') {
            if (hit.bx) r.vx = -r.vx;
            if (hit.by) r.vy = -r.vy;
          }
        } else r.stuck = 0;
        if (r.stuck > 0.6 && (r.mode === 'path' || r.mode === 'home')) {
          // wiggle sideways to get around corners
          const ang = Math.random() * Math.PI * 2;
          moveBox(this.ctx.grid, a, Math.cos(ang) * 6, Math.sin(ang) * 6, d.hw, d.hh, who);
          if (r.stuck > 4) {
            const wp = r.waypoints[0];
            if (wp) this.place(a, wp.x, wp.y);
            r.stuck = 0;
          }
        }
        if (Math.abs(mx) > 0.1) r.sprite.setFlipX(mx < 0);
        r.bob += dt * 12;
      }

      this.checkContainment(a);
      if (a.escaped && d.big && (mx !== 0 || my !== 0)) this.trample(a, r);

      r.soundTimer -= dt;
      if (r.soundTimer <= 0) {
        r.soundTimer = 8 + Math.random() * 20;
        if (Math.hypot(p.x - a.x, p.y - a.y) < 140) audio.play(d.sound);
      }
      this.syncSprite(a);
    }
  }

  private checkContainment(a: AnimalState): void {
    const inside = this.isInside(a);
    if (a.escaped && inside) {
      a.escaped = false;
      this.ctx.toast(`${a.name} the ${this.def(a).name} is back home!`, 0x8fd458);
      audio.play('pop');
    } else if (!a.escaped && !inside) {
      a.escaped = true;
      if (!this.isBusy(a.id)) this.ctx.toast(`${a.name} the ${this.def(a).name} wandered out!`, 0xffe58a);
    }
  }

  /** The nearest gate (or broken fence) the animal could walk home through. */
  private passableGate(a: AnimalState): { x: number; y: number } | null {
    if (!a.escaped) return null;
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const f of this.ctx.grid.penFences(a.pen)) {
      if (!(f.hp <= 0 || (f.gate && f.open))) continue;
      const x = f.x * TILE + 8;
      const y = f.y * TILE + 12;
      const dd = Math.hypot(x - a.x, y - a.y);
      if (dd < bd) {
        bd = dd;
        best = { x, y };
      }
    }
    return best;
  }

  private interiorPoint(a: AnimalState): { x: number; y: number } {
    const p = this.pen(a);
    return { x: ((p.x0 + p.x1) / 2) * TILE + 8, y: ((p.y0 + p.y1) / 2) * TILE + 16 };
  }

  private trample(a: AnimalState, r: Runtime): void {
    const tx = toTile(a.x);
    const ty = toTile(a.y - 2);
    const idx = ty * 1000 + tx;
    if (idx === r.lastTrampleTile) return;
    r.lastTrampleTile = idx;
    const t = this.ctx.grid.tile(tx, ty);
    if (!t?.crop || t.crop.dead) return;
    if (this.ctx.state.chaos.trampleBudget <= 0) return;
    this.ctx.state.chaos.trampleBudget--;
    const destroyed = this.ctx.crops.damage(tx, ty, 1);
    this.ctx.view.burst(tx * TILE + 8, ty * TILE + 12, 'clod', 5, 10);
    if (destroyed) this.ctx.view.floatText(tx * TILE + 8, ty * TILE, 'stomp!', 0xff9a6a);
  }

  syncSprite(a: AnimalState): void {
    const r = this.rt.get(a.id);
    if (!r) return;
    const moving = r.mode !== 'idle';
    const b = moving ? Math.round(Math.abs(Math.sin(r.bob)) * -1.5) : 0;
    r.sprite.setPosition(Math.round(a.x), Math.round(a.y) + b);
    r.sprite.setDepth(a.onRoof ? 7000 : a.y);
    r.shadow.setPosition(Math.round(a.x), Math.round(a.y) - 1).setDepth(a.y - 1);
    r.shadow.setVisible(!a.onRoof && !a.asleep);
  }

  // -------------------------------------------------------- interactions
  /** Animal near a world point, for petting. */
  at(x: number, y: number, radius = 14): AnimalState | null {
    let best: AnimalState | null = null;
    let bd = radius;
    for (const a of this.list) {
      if (a.asleep || a.onRoof) continue;
      const d = Math.hypot(a.x - x, a.y - 6 - y);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  pet(a: AnimalState): void {
    const d = this.def(a);
    if (a.petToday) {
      this.ctx.toast(`${a.name} is happy to see you.`);
    } else {
      a.petToday = true;
      a.happy = Math.min(100, a.happy + 15);
      this.ctx.toast(`You pet ${a.name} the ${d.name}. ♥`, 0xff9ab0);
    }
    this.ctx.view.heart(a.x, a.y - 16);
    audio.play(d.sound);
  }

  // ------------------------------------------------------------- day cycle
  dayEnd(): string[] {
    const notes: string[] = [];
    for (const a of this.list) {
      if (a.escaped || a.onRoof) {
        a.happy = Math.max(0, a.happy - 10);
        notes.push(`${a.name} spent the night outside and wandered home grumpy.`);
      }
      a.escaped = false;
      a.onRoof = false;
      const pen = this.ctx.state.pens[a.pen];
      if (pen.feed > 0) {
        pen.feed--;
        a.hunger = 0;
      } else {
        a.hunger = Math.min(100, a.hunger + 50);
        a.happy = Math.max(0, a.happy - 15);
      }
      if (pen.water > 0) {
        pen.water--;
        a.thirst = 0;
      } else {
        a.thirst = Math.min(100, a.thirst + 50);
        a.happy = Math.max(0, a.happy - 10);
      }
      a.happy = a.petToday ? Math.min(100, a.happy + 5) : Math.max(0, a.happy - 3);
      a.petToday = false;
      a.sinceProduct++;
    }
    const hungry = this.list.filter((a) => a.hunger > 0).length;
    if (hungry) notes.push(`${hungry} animal${hungry > 1 ? 's' : ''} went hungry. Fill the feed troughs with hay!`);
    const thirsty = this.list.filter((a) => a.thirst > 0).length;
    if (thirsty) notes.push(`${thirsty} animal${thirsty > 1 ? 's were' : ' was'} thirsty. Use the watering can on the water troughs.`);
    this.ctx.view.refreshTroughs();
    return notes;
  }

  dayStart(): void {
    for (const a of this.list) {
      const pen = this.pen(a);
      a.asleep = false;
      this.setVisible(a, true);
      this.release(a.id);
      const x = (pen.door.x + 0.5) * TILE + (Math.random() - 0.5) * 24;
      const y = (pen.door.y + 1) * TILE + Math.random() * 16;
      this.place(a, x, y);
      const d = this.def(a);
      if (a.hunger === 0 && a.sinceProduct >= d.every) {
        a.sinceProduct = 0;
        const star = a.happy >= QUALITY_HAPPINESS;
        this.ctx.economy.dropItem({ id: d.product, qty: 1, star }, x + (Math.random() - 0.5) * 16, y + 8);
      }
    }
  }

  /** Counts used by the chaos director to scale chaos with farm size. */
  count(): number {
    return this.list.length;
  }

  hasType(type: string, inside = true): boolean {
    return this.list.some((a) => a.type === type && (!inside || (!a.escaped && !a.onRoof && !a.asleep)));
  }

  allPens(): PenLayout[] {
    return LAYOUT.pens;
  }

  cropAtFeet(a: AnimalState): boolean {
    const t = this.ctx.grid.tile(toTile(a.x), toTile(a.y - 2));
    return !!t?.crop && !t.crop.dead && !!CROPS[t.crop.id];
  }
}
