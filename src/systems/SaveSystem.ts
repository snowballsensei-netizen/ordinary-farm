// Three independent localStorage slots per account, with versioning and migration.
import { SAVE_PREFIX, SAVE_VERSION, SEASONS, SLOT_COUNT, USER_SAVE_PREFIX } from '../config/constants';
import type { SaveData, SlotSummary } from '../world/types';
import { Accounts } from './AccountSystem';
import { newHives } from '../world/worldgen';

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

// Add a function here whenever SAVE_VERSION goes up: MIGRATIONS[1] turns a v1 save into v2.
const MIGRATIONS: Record<number, Migration> = {};

function key(slot: number): string {
  const user = Accounts.current();
  if (!user) throw new Error('no account signed in');
  return `${USER_SAVE_PREFIX}${user.id}_slot_${slot}`;
}

function migrate(raw: Record<string, unknown>): SaveData {
  let v = Number(raw.saveVersion ?? 0);
  if (!v) throw new Error('missing saveVersion');
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`no migration from v${v}`);
    raw = m(raw);
    v++;
    raw.saveVersion = v;
  }
  return raw as unknown as SaveData;
}

function validate(d: SaveData): void {
  const ok =
    typeof d.seed === 'number' &&
    Array.isArray(d.tiles) &&
    Array.isArray(d.inventory) &&
    Array.isArray(d.animals) &&
    d.player && typeof d.player.x === 'number' &&
    d.chaos && typeof d.chaos.level === 'number';
  if (!ok) throw new Error('save failed validation');
}

export const SaveSystem = {
  /** Moves farms saved before accounts existed into the signed-in account. */
  adoptLegacySaves(): void {
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      const legacy = `${SAVE_PREFIX}${slot}`;
      const raw = localStorage.getItem(legacy);
      if (raw && !localStorage.getItem(key(slot))) {
        localStorage.setItem(key(slot), raw);
        localStorage.removeItem(legacy);
      }
    }
  },

  load(slot: number): SaveData | null {
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    const data = migrate(JSON.parse(raw));
    validate(data);
    data.fish ??= { count: 3, fedDay: 0, hungryDays: 0 };
    data.look ??= 'm';
    data.slot = slot;
    return data;
  },

  save(data: SaveData): boolean {
    try {
      localStorage.setItem(key(data.slot), JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Save failed', e);
      return false;
    }
  },

  delete(slot: number): void {
    localStorage.removeItem(key(slot));
  },

  summaries(): SlotSummary[] {
    const out: SlotSummary[] = [];
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(key(slot));
      } catch {
        raw = null;
      }
      if (!raw) {
        out.push({ slot, status: 'empty' });
        continue;
      }
      try {
        const d = migrate(JSON.parse(raw));
        validate(d);
        out.push({
          slot,
          status: 'ok',
          farmer: d.farmer,
          farm: d.farm,
          label: `${SEASONS[d.season]} ${d.day}, Year ${d.year}`,
          money: d.player.money,
          playtime: d.stats.playtime,
          animals: d.animals.length,
          look: d.look ?? 'm',
        });
      } catch {
        out.push({ slot, status: 'corrupt' });
      }
    }
    return out;
  },
};
