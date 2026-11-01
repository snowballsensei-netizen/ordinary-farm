// Base class every chaos event extends. One file per event in this folder;
// register new events in registry.ts and tune them in config/events.ts.
import { EVENTS, type EventConfig } from '../config/events';
import type { GameContext } from '../systems/GameContext';

export abstract class ChaosEvent {
  abstract readonly id: string;
  /** Seconds since the event started (real time). */
  t = 0;
  done = false;
  cause?: string;
  /** Extra line appended to the journal entry (e.g. damage summary). */
  note = '';

  constructor(protected ctx: GameContext) {}

  get cfg(): EventConfig {
    return EVENTS[this.id];
  }

  /** Hard requirements (owns cows, has crops...). Checked even when forced. */
  canTrigger(): boolean {
    return true;
  }

  /** Why canTrigger failed, for the debug menu. */
  requirement(): string {
    return '';
  }

  abstract start(): void;

  update(_dt: number): void {}

  isFinished(): boolean {
    return this.done;
  }

  /** Clean up visuals. Called once when finished or at the end of the day. */
  end(): void {}

  /** World position the camera should pan to when the event is announced. */
  location(): { x: number; y: number } | null {
    return null;
  }

  /** Return true to consume the tool use (e.g. whacking a mole). */
  onTool(_tool: string, _tx: number, _ty: number): boolean {
    return false;
  }

  /** Return true to consume an interaction. */
  onInteract(_tx: number, _ty: number): boolean {
    return false;
  }

  /** Damage cap scaled up ~1.75x and growing with the day (about +50% by day 30). */
  protected cap(base: number): number {
    const d = this.ctx.state.absDay ?? 1;
    return Math.round(base * 1.75 * (1 + Math.min(Math.max(d, 0), 30) / 60));
  }

  /** Day-based multiplier for counts and speeds (1 on day 1, up to 1.5). */
  protected get dayScale(): number {
    return 1 + Math.min(Math.max(this.ctx.state.absDay ?? 1, 0), 30) / 60;
  }

  private lastProgress = '';
  private lastProgressAt = -99;
  /** Progress toast, deduplicated and throttled so it doesn't spam. */
  protected progress(msg: string, color = 0xffe58a, force = false): void {
    if (!force && msg === this.lastProgress && this.t - this.lastProgressAt < 6) return;
    if (!force && this.t - this.lastProgressAt < 1.2) return;
    this.lastProgress = msg;
    this.lastProgressAt = this.t;
    this.ctx.toast(msg, color);
  }

  protected shake(ms = 250, intensity = 0.004): void {
    this.ctx.scene.cameras.main.shake(ms, intensity);
  }

  /** In-progress state so the event survives Save & Quit. */
  serialize(): Record<string, unknown> {
    return { t: this.t, note: this.note, cause: this.cause };
  }

  /** Rebuild from serialize() output, re-creating any visuals. */
  restore(data: Record<string, unknown>): void {
    this.t = Number(data.t ?? 0);
    this.note = String(data.note ?? '');
    this.cause = data.cause as string | undefined;
  }
}
