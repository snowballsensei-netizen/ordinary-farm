// Global tuning numbers. Tweak freely — everything else reads from here.

export const VERSION = 'v0.1.0';

export const GAME_W = 480;
export const GAME_H = 270;
export const TILE = 16;
export const MAP_W = 64;
export const MAP_H = 44;

// Time (in-game minutes since midnight; the day runs 6:00 AM -> 2:00 AM)
export const DAY_START = 6 * 60;
export const DAY_END = 26 * 60;
export const REAL_SECONDS_PER_DAY = 7.5 * 60;
export const GAME_MIN_PER_SEC = (DAY_END - DAY_START) / REAL_SECONDS_PER_DAY;
export const NIGHT_HOME_TIME = 19 * 60 + 30;
export const DAYS_PER_SEASON = 28;
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
export const SEASON_SHORT = ['Spr', 'Sum', 'Fall', 'Win'] as const;

// Player & economy
export const START_MONEY = 500;
export const MAX_ENERGY = 100;
export const PLAYER_SPEED = 78;
export const ENERGY_COST: Record<string, number> = {
  hoe: 2, can: 1, scythe: 1, axe: 3, pickaxe: 3, hammer: 2, basket: 0,
};
export const CAN_CAP = 20;
export const CAN_CAP_BIG = 40;
export const PASS_OUT_PENALTY = 0.1;
export const PASS_OUT_MAX = 500;
export const DRY_DAYS_TO_DIE = 3;
export const TROUGH_CAP = 12;
export const QUALITY_HAPPINESS = 70;
export const QUALITY_MULT = 1.5;

// Chaos Director tuning
export const HONEYMOON_DAYS = 1;   // day 1 is calm; chaos starts on day 2
export const CHAOS = {
  startLevel: 12,         // chaos level on the first day after the honeymoon
  dailyRise: 5,           // flat rise per day
  sizeRiseMax: 6,         // extra rise from farm size (animals + crops)
  baseChance: 0.06,       // per in-game hour
  perLevel: 0.004,        // added chance per chaos level point
  forceHour: 8,           // if nothing has happened by 8 AM, force an event
  firstAt: [390, 480],    // first scheduled event of the day: 6:30-8:00 AM (in-game minutes)
  gapMin: [120, 180],     // in-game minutes between scheduled events on day 2
  gapShrinkPerDay: 0.04,  // gaps shrink 4% per day survived...
  gapFloor: 0.45,         // ...down to 45% of the base gap
  warnDelay: [8, 15],     // in-game minutes between the warning banner and the event
  overlapDay: 6,          // from this day, events may start while others are running
  overlapChance: 0.35,    // chance a scheduled event ignores a running (non-big) event
  day1At: [840, 960],     // day 1: one small lesson event between 2 and 4 PM
  maxPerDayBase: 2,       // daily event cap = base + absDay / perDayEvery
  perDayEvery: 4,
  maxPerDay: 7,
  unseenBoost: 4,         // weight multiplier for events the player has never seen
  unseenFirst: 0.6,       // chance a roll draws only from never-seen events (when any are eligible)
  bigBoostPerLevel: 0.02, // big-event weight multiplier grows with chaos level
  quietBig: 75,           // in-game minutes of quiet after a big event
  quietSmall: 25,
  morningChance: 0.3,     // chance of an overnight event each morning (scaled by level)
  naturalTrample: 3,      // daily trample budget for animals that wander out on their own
};

// Saves
export const SAVE_VERSION = 1;
export const SAVE_PREFIX = 'ordinaryfarm_slot_'; // saves from before accounts
export const USER_SAVE_PREFIX = 'ordinaryfarm_user_';
export const SETTINGS_KEY = 'ordinaryfarm_settings';
export const SLOT_COUNT = 3;

// Render depths
export const DEPTH = {
  ground: -10000,
  groundFx: -9000,
  roof: 8000,
  sky: 8500,
  night: 9000,
  glow: 9100,
  weather: 9200,
  worldUi: 9500,
};
