// Everything that gets saved. A SaveData object IS the game state.

export type Dir = 'down' | 'up' | 'left' | 'right';

export enum Ground {
  GRASS = 0,
  DIRT = 1,
  TILLED = 2,
  PATH = 3,
  WATER = 4,
  SAND = 5,
}

export type ObjType =
  | 'rock' | 'branch' | 'weed' | 'stump' | 'molehill' | 'meteorite' | 'sprinkler' | 'scarecrow';

export interface ItemStack {
  id: string;
  qty: number;
  star?: boolean;
}

export interface CropState {
  id: string;
  days: number;       // watered days of growth
  dry: number;        // consecutive dry days
  dead?: boolean;
}

export interface ObjState {
  type: ObjType;
  hp: number;
  rogue?: boolean;
}

export interface TileState {
  g: Ground;
  wet?: boolean;
  flood?: boolean;
  crop?: CropState;
  obj?: ObjState;
}

export interface FenceState {
  x: number;
  y: number;
  gate: boolean;
  hp: number;
  max: number;
  open?: boolean;
  pen: string;
}

export interface AnimalState {
  id: string;
  type: string;
  name: string;
  pen: string;
  x: number;
  y: number;
  hunger: number;    // 0 = full, 100 = starving
  thirst: number;
  happy: number;     // 0..100
  petToday: boolean;
  escaped: boolean;
  asleep: boolean;
  sinceProduct: number;
  onRoof?: boolean;
}

export interface HiveState {
  id: string;
  x: number;           // tile of the hive (one of LAYOUT.apiary.slots)
  y: number;
  health: number;      // 0..100
  mood: number;        // 0 calm .. 100 angry (agitated from 40, angry from 75)
  honey: number;       // 0..100 fill, collect at 100
  queen: boolean;
  lastSmoked: number;  // absDay of the last smoker check
  smokedAt: number;    // absMinute of the last puff (safe to collect for a while)
  sugarToday: boolean;
  hungryDays: number;  // consecutive days without forage
}

export interface DropState {
  id: number;
  item: ItemStack;
  x: number;
  y: number;
}

export interface PenState {
  id: string;
  feed: number;
  water: number;
}

export interface JournalEntry {
  absDay: number;
  label: string;
  text: string;
}

export interface ActiveEventSave {
  id: string;
  data: unknown;
}

export interface ChaosState {
  level: number;
  cooldowns: Record<string, number>;   // absDay when available again
  quietUntil: number;                  // absolute minute
  calmDay: boolean;
  active: ActiveEventSave[];
  pending: { id: string; at: number; cause?: string }[];
  trampleBudget: number;
  survivedToday: string[];
  totalSurvived: number;
  lastRollHour: number;
}

export interface Stats {
  playtime: number;     // seconds
  earned: number;
  harvested: number;
  shippedToday: { id: string; qty: number; star?: boolean; value: number }[];
  harvestedToday: number;
}

export interface SaveData {
  saveVersion: number;
  slot: number;
  farmer: string;
  farm: string;
  seed: number;
  rngState: number;
  chaosRngState: number;
  absDay: number;           // 1-based count of days since the farm was founded
  day: number;              // 1..28
  season: number;           // 0..3
  year: number;
  minutes: number;          // minutes since midnight (360..1560)
  weather: string;          // today's base weather
  tomorrow: string;
  player: { x: number; y: number; dir: Dir; energy: number; maxEnergy: number; money: number };
  inventory: (ItemStack | null)[];
  selected: number;
  canWater: number;
  tiles: TileState[];
  fences: Record<string, FenceState>;
  pens: Record<string, PenState>;
  animals: AnimalState[];
  drops: DropState[];
  hives: HiveState[];
  bin: ItemStack[];
  upgrades: Record<string, boolean>;
  chaos: ChaosState;
  journal: JournalEntry[];
  stats: Stats;
  nextId: number;
  /** Farmhouse fish tank (optional: older saves get defaults on load). */
  fish?: FishState;
  /** Farmer appearance (optional: older saves are male). */
  look?: 'm' | 'f';
  /** One-time area hints already shown (optional). */
  goals?: HintState;
}

export interface HintState {
  hints: string[];
}

export interface FishState {
  count: number;
  fedDay: number;      // absDay the fish were last fed
  hungryDays: number;  // consecutive days unfed
  ateDay?: number;     // absDay of the last cooked meal
}

export interface SlotSummary {
  slot: number;
  status: 'empty' | 'ok' | 'corrupt';
  farmer?: string;
  farm?: string;
  label?: string;
  money?: number;
  playtime?: number;
  animals?: number;
  look?: 'm' | 'f';
}
