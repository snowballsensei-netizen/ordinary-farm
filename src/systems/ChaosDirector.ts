// Decides when and which random events happen, using the profile's seeded
// RNG so every farm gets its own sequence of disasters.
import { CHAOS, HONEYMOON_DAYS, TILE } from '../config/constants';
import { EVENTS, type EventConfig } from '../config/events';
import { audio } from '../audio/AudioManager';
import type { ChaosEvent } from '../events/ChaosEvent';
import { EVENT_FACTORIES } from '../events/registry';
import { bus, EV } from './bus';
import type { GameContext } from './GameContext';
import type { ChaosState } from '../world/types';

/** Extra chaos fields added after SAVE_VERSION 1; optional so old saves load. */
type ChaosStateX = ChaosState & { seen?: string[]; firedToday?: number; nextAt?: number };

export interface TriggerOpts {
  force?: boolean;      // ignore cooldowns, honeymoon, quiet time
  immediate?: boolean;  // skip the foreshadowing hint
  cause?: string;
  warn?: boolean;       // always show a warning banner first, even without a hint
}

export class ChaosDirector {
  active: ChaosEvent[] = [];

  constructor(private ctx: GameContext) {
    for (const a of ctx.state.chaos.active) {
      const f = EVENT_FACTORIES[a.id];
      if (!f) continue;
      const ev = f(ctx);
      try {
        ev.restore((a.data ?? {}) as Record<string, unknown>);
        this.active.push(ev);
      } catch (e) {
        console.warn('Could not restore event', a.id, e);
      }
    }
    for (const p of ctx.state.chaos.pending) this.applyHintVisual(p.id, true);
  }

  get st(): ChaosStateX {
    return this.ctx.state.chaos as ChaosStateX;
  }

  /** Ids of events the player has already witnessed (saved with the chaos state). */
  seen(): string[] {
    return (this.st.seen ??= []);
  }

  firedToday(): number {
    return this.st.firedToday ?? 0;
  }

  /** How many events may start today; grows as the days go by. */
  dailyCap(): number {
    return Math.min(CHAOS.maxPerDay, CHAOS.maxPerDayBase + Math.floor(this.ctx.state.absDay / CHAOS.perDayEvery));
  }

  /** Weighted pick that favours never-seen events and, later on, big ones. */
  private pick(pool: EventConfig[]): EventConfig | null {
    if (!pool.length) return null;
    const seen = this.seen();
    const fresh = pool.filter((c) => !seen.includes(c.id));
    const r = this.ctx.chaosRng;
    const from = fresh.length && r.chance(CHAOS.unseenFirst) ? fresh : pool;
    const bigMul = 1 + this.st.level * CHAOS.bigBoostPerLevel;
    return r.weighted(from, (c) => c.weight * (seen.includes(c.id) ? 1 : CHAOS.unseenBoost) * (c.big ? bigMul : 1)) ?? null;
  }

  inHoneymoon(): boolean {
    return this.ctx.state.absDay <= HONEYMOON_DAYS;
  }

  hourlyChance(): number {
    return CHAOS.baseChance + this.st.level * CHAOS.perLevel;
  }

  private eligible(cfg: EventConfig, timing: 'day' | 'morning', ignoreCooldown = false): boolean {
    const s = this.ctx.state;
    if (cfg.timing !== timing) return false;
    if (s.absDay < cfg.minDay) return false;
    if (!ignoreCooldown && (this.st.cooldowns[cfg.id] ?? 0) > s.absDay) return false;
    if (cfg.seasons && !cfg.seasons.includes(s.season)) return false;
    if (cfg.weather && !cfg.weather.includes(s.weather)) return false;
    if (this.st.pending.some((p) => p.id === cfg.id)) return false;
    if (this.active.some((e) => e.id === cfg.id)) return false;
    const probe = EVENT_FACTORIES[cfg.id]?.(this.ctx);
    return !!probe && probe.canTrigger();
  }

  /** Called by TimeSystem on every new in-game hour. */
  onHour(hour: number): void {
    this.st.lastRollHour = hour;
    if (this.inHoneymoon()) return;
    if (hour >= 24) return; // late night is for sleeping
    // Daily guarantee: if nothing has happened by the afternoon, force something.
    if (hour >= CHAOS.forceHour && this.firedToday() === 0 && !this.st.pending.length && !this.active.length) {
      this.forceOne();
      return;
    }
    if (this.firedToday() >= this.dailyCap()) return;
    if (this.ctx.absMinute() < this.st.quietUntil) return;
    if (this.st.pending.length || this.active.some((e) => e.cfg.big)) return;
    if (!this.ctx.chaosRng.chance(this.hourlyChance())) return;
    const pick = this.pick(Object.values(EVENTS).filter((c) => this.eligible(c, 'day')));
    if (pick) this.trigger(pick.id);
  }

  /** Pick among every day event whose canTrigger passes (cooldowns only as a last resort). */
  private forceOne(): void {
    const all = Object.values(EVENTS);
    let pool = all.filter((c) => this.eligible(c, 'day'));
    if (!pool.length) pool = all.filter((c) => this.eligible(c, 'day', true));
    const pick = this.pick(pool);
    if (pick) this.trigger(pick.id, { cause: 'guarantee' });
  }

  trigger(id: string, opts: TriggerOpts = {}): boolean {
    const cfg = EVENTS[id];
    const factory = EVENT_FACTORIES[id];
    if (!cfg || !factory) return false;
    const ev = factory(this.ctx);
    if (!ev.canTrigger()) {
      if (opts.force) this.ctx.toast(`Can't trigger ${cfg.name}: ${ev.requirement() || 'requirements not met'}`, 0xff6a5a);
      return false;
    }
    if (this.active.some((e) => e.id === id)) return false;
    ev.cause = opts.cause;
    this.st.cooldowns[id] = this.ctx.state.absDay + cfg.cooldownDays;
    this.st.firedToday = this.firedToday() + 1;

    const hint = cfg.hint ?? (opts.warn ? 'Something feels off on the farm today...' : undefined);
    if (hint && !opts.immediate) {
      const [a, b] = cfg.hint ? cfg.hintDelay ?? [15, 30] : CHAOS.warnDelay;
      this.st.pending.push({ id, at: this.ctx.absMinute() + this.ctx.chaosRng.int(a, b), cause: opts.cause });
      bus.emit(EV.hint, hint);
      audio.play('hint');
      this.applyHintVisual(id, true);
      return true;
    }
    this.begin(ev);
    return true;
  }

  private applyHintVisual(id: string, on: boolean): void {
    if (id === 'tornado') this.ctx.weather.ominous = on ? 1 : 0;
  }

  private begin(ev: ChaosEvent): void {
    this.active.push(ev);
    ev.start();
    const cfg = ev.cfg;
    const seen = this.seen();
    if (!seen.includes(ev.id)) seen.push(ev.id);
    bus.emit(EV.banner, cfg.banner, cfg.big);
    audio.play('alarm');
    if (cfg.big) this.ctx.scene.cameras.main.shake(400, 0.006);
    const loc = ev.location();
    if (loc) this.ctx.scene.panTo(loc.x, loc.y);
  }

  /** Absolute minute for an in-game time-of-day today. */
  private todayAt(mins: number): number {
    return this.ctx.absMinute() - this.ctx.state.minutes + mins;
  }

  /** Gap until the next scheduled event; shrinks as the days go by. */
  private nextGap(): number {
    const [a, b] = CHAOS.gapMin;
    const days = Math.max(0, this.ctx.state.absDay - HONEYMOON_DAYS - 1);
    const mul = Math.max(CHAOS.gapFloor, 1 - days * CHAOS.gapShrinkPerDay);
    return this.ctx.chaosRng.int(a, b) * mul;
  }

  /** Fire the scheduled event if it's due. Returns quietly if blocked (retries next frame). */
  private runSchedule(now: number): void {
    const s = this.ctx.state;
    if (this.st.nextAt === undefined) {
      if (this.inHoneymoon()) return;
      this.st.nextAt = Math.max(now + 10, this.todayAt(CHAOS.firstAt[0]));
    }
    if (now < this.st.nextAt || s.minutes >= 24 * 60) return;
    const day1 = this.inHoneymoon();
    if (!day1 && this.firedToday() >= this.dailyCap()) return;
    const overlap = s.absDay >= CHAOS.overlapDay;
    const busy = this.st.pending.length > 0 || this.active.some((e) => e.cfg.big) || (!overlap && this.active.length > 0);
    if (busy || (!overlap && now < this.st.quietUntil)) {
      this.st.nextAt = now + 20; // try again a little later
      return;
    }
    if (overlap && this.active.length && !this.ctx.chaosRng.chance(CHAOS.overlapChance)) {
      this.st.nextAt = now + 30;
      return;
    }
    const all = Object.values(EVENTS);
    let pool: EventConfig[];
    if (day1) pool = all.filter((c) => !c.big && c.minDay <= HONEYMOON_DAYS + 1 && this.eligible({ ...c, minDay: 1 }, 'day'));
    else {
      pool = all.filter((c) => this.eligible(c, 'day'));
      if (!pool.length) pool = all.filter((c) => this.eligible(c, 'day', true));
    }
    const pick = this.pick(pool);
    this.st.nextAt = day1 ? 1e12 : now + this.nextGap();
    if (pick) this.trigger(pick.id, { cause: 'schedule', warn: true });
  }

  update(dt: number): void {
    const now = this.ctx.absMinute();
    this.runSchedule(now);
    for (let i = this.st.pending.length - 1; i >= 0; i--) {
      const p = this.st.pending[i];
      if (now < p.at) continue;
      this.st.pending.splice(i, 1);
      this.applyHintVisual(p.id, false);
      const ev = EVENT_FACTORIES[p.id](this.ctx);
      ev.cause = p.cause;
      if (ev.canTrigger()) this.begin(ev);
    }
    for (const ev of [...this.active]) {
      ev.t += dt;
      ev.update(dt);
      if (ev.isFinished()) this.finish(ev, true);
    }
  }

  private finish(ev: ChaosEvent, allowFollowUps: boolean): void {
    this.active = this.active.filter((e) => e !== ev);
    ev.end();
    const cfg = ev.cfg;
    const line = this.ctx.chaosRng.pick(cfg.journal);
    this.ctx.addJournal(ev.note ? `${line} ${ev.note}` : line);
    this.st.survivedToday.push(cfg.name);
    this.st.totalSurvived++;
    let chained = false;
    if (allowFollowUps) {
      for (const f of cfg.followUps ?? []) {
        if (this.ctx.chaosRng.chance(f.chance) && this.trigger(f.id, { cause: ev.id })) {
          chained = true;
          break;
        }
      }
    }
    if (!chained) this.st.quietUntil = this.ctx.absMinute() + (cfg.big ? CHAOS.quietBig : CHAOS.quietSmall);
    this.ctx.hud();
  }

  onTool(tool: string, tx: number, ty: number): boolean {
    return this.active.some((e) => e.onTool(tool, tx, ty));
  }

  onInteract(tx: number, ty: number): boolean {
    return this.active.some((e) => e.onInteract(tx, ty));
  }

  /** End every running event when the player goes to sleep. */
  onDayEnd(): void {
    for (const ev of [...this.active]) this.finish(ev, false);
    for (const p of this.st.pending) this.applyHintVisual(p.id, false);
    this.st.pending = [];
    this.ctx.weather.hail = false;
    this.ctx.weather.wind = 0;
    this.ctx.weather.ominous = 0;
    audio.setWind(0);
  }

  /** New morning: raise chaos, maybe an overnight surprise. No more calm days. */
  onDayStart(): void {
    const s = this.ctx.state;
    this.st.survivedToday = [];
    this.st.trampleBudget = CHAOS.naturalTrample;
    this.st.quietUntil = 0;
    this.st.firedToday = 0;
    this.st.calmDay = false;
    const r = this.ctx.chaosRng;
    if (this.inHoneymoon()) {
      this.st.nextAt = this.todayAt(r.int(CHAOS.day1At[0], CHAOS.day1At[1]));
      return;
    }
    this.st.nextAt = this.todayAt(r.int(CHAOS.firstAt[0], CHAOS.firstAt[1]));
    if (s.absDay === HONEYMOON_DAYS + 1) this.st.level = Math.max(this.st.level, CHAOS.startLevel);
    else {
      const size = (this.ctx.animals.count() + this.ctx.crops.count() / 15) / 3;
      this.st.level = Math.min(100, this.st.level + CHAOS.dailyRise + Math.min(CHAOS.sizeRiseMax, size));
    }
    const morningP = CHAOS.morningChance * (0.5 + this.st.level / 100);
    if (this.ctx.chaosRng.chance(morningP)) {
      const pick = this.pick(Object.values(EVENTS).filter((c) => this.eligible(c, 'morning')));
      if (pick) this.trigger(pick.id, { immediate: true });
    }
  }

  serialize(): void {
    this.st.active = this.active.map((e) => ({ id: e.id, data: e.serialize() }));
  }

  debugLines(): string[] {
    const s = this.st;
    const now = this.ctx.absMinute();
    const cds = Object.entries(s.cooldowns)
      .filter(([, d]) => d > this.ctx.state.absDay)
      .map(([k, d]) => `${k}:${d - this.ctx.state.absDay}d`);
    return [
      `CHAOS LEVEL ${s.level.toFixed(1)}  chance/hr ${(this.hourlyChance() * 100).toFixed(1)}%`,
      `day ${this.ctx.state.absDay} ${this.inHoneymoon() ? '(honeymoon)' : ''} events today ${this.firedToday()}/${this.dailyCap()}`,
      `seen ${this.seen().length}/${Object.keys(EVENTS).length}  force at ${CHAOS.forceHour}:00  next ${s.nextAt !== undefined && s.nextAt < 1e12 ? Math.round(s.nextAt - now) + "m" : "-"}`,
      `next roll at ${(Math.floor(this.ctx.state.minutes / 60) + 1) % 24}:00`,
      `quiet ${s.quietUntil > now ? `${Math.round(s.quietUntil - now)}m` : 'no'}  trample ${s.trampleBudget}`,
      `active: ${this.active.map((e) => e.id).join(', ') || '-'}`,
      `pending: ${s.pending.map((p) => `${p.id}@${Math.round(p.at - now)}m`).join(', ') || '-'}`,
      `cooldowns: ${cds.join(' ') || '-'}`,
      `survived total: ${s.totalSurvived}`,
    ];
  }

  tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE + 8, y: ty * TILE + 8 };
  }
}
