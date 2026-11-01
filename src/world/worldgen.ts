// Builds a brand new SaveData for an empty profile slot.
import { ANIMALS } from '../config/animals';
import { CAN_CAP, CHAOS, DAY_START, MAP_H, MAP_W, MAX_ENERGY, SAVE_VERSION, START_MONEY, TILE } from '../config/constants';
import { RNG } from '../systems/RNG';
import { LAYOUT, buildNoTill, buildStaticSolid, inRect, pathTiles } from './layout';
import { Ground, type AnimalState, type FenceState, type HiveState, type ObjType, type SaveData, type TileState } from './types';

export function fenceKey(x: number, y: number): string {
  return `${x},${y}`;
}

function buildFences(): Record<string, FenceState> {
  const f: Record<string, FenceState> = {};
  for (const p of LAYOUT.pens) {
    for (let x = p.x0; x <= p.x1; x++) {
      for (let y = p.y0; y <= p.y1; y++) {
        const edge = x === p.x0 || x === p.x1 || y === p.y0 || y === p.y1;
        if (!edge) continue;
        const gate = p.gates.some((g) => g.x === x && g.y === y);
        f[fenceKey(x, y)] = { x, y, gate, hp: 100, max: 100, open: false, pen: p.id };
      }
    }
  }
  return f;
}

export function makeAnimal(type: string, pen: string, x: number, y: number, rng: RNG, id: number): AnimalState {
  const def = ANIMALS[type];
  return {
    id: `a${id}`, type, name: rng.pick(def.names), pen, x, y,
    hunger: 0, thirst: 0, happy: 60, petToday: false, escaped: false, asleep: false, sinceProduct: 0,
  };
}

/** The two starter hives in the apiary. */
export function newHives(): HiveState[] {
  return LAYOUT.apiary.slots.slice(0, 2).map((p, i) => ({
    id: 'h' + (i + 1), x: p.x, y: p.y, health: 90, mood: 10, honey: 40, queen: true,
    lastSmoked: 1, smokedAt: -9999, sugarToday: false, hungryDays: 0,
  }));
}

export function newGame(slot: number, farmer: string, farm: string, seed: number, look: 'm' | 'f' = 'm'): SaveData {
  const rng = new RNG(seed);
  const tiles: TileState[] = [];
  for (let i = 0; i < MAP_W * MAP_H; i++) tiles.push({ g: Ground.GRASS });
  const T = (x: number, y: number) => tiles[y * MAP_W + x];

  for (const [x, y] of pathTiles()) T(x, y).g = Ground.PATH;

  // pond with a sandy shore
  const pd = LAYOUT.pond;
  for (let y = pd.cy - pd.ry - 2; y <= pd.cy + pd.ry + 2; y++) {
    for (let x = pd.cx - pd.rx - 2; x <= pd.cx + pd.rx + 2; x++) {
      const d = ((x - pd.cx) / pd.rx) ** 2 + ((y - pd.cy) / pd.ry) ** 2;
      if (d <= 1) T(x, y).g = Ground.WATER;
      else if (d <= 1.6) T(x, y).g = Ground.SAND;
    }
  }

  // dirt patches inside the pens
  for (const p of LAYOUT.pens) {
    for (let y = p.y0 + 1; y < p.y1; y++) for (let x = p.x0 + 1; x < p.x1; x++) if (rng.chance(0.18)) T(x, y).g = Ground.DIRT;
  }

  const sf = LAYOUT.starterField;
  for (let y = sf.y; y < sf.y + sf.h; y++) for (let x = sf.x; x < sf.x + sf.w; x++) T(x, y).g = Ground.TILLED;

  // scatter debris
  const solid = buildStaticSolid();
  const noTill = buildNoTill();
  const types: [ObjType, number, number][] = [['weed', 40, 1], ['rock', 25, 1], ['branch', 25, 1], ['stump', 10, 3]];
  let placed = 0;
  for (let tries = 0; tries < 800 && placed < 75; tries++) {
    const x = rng.int(2, MAP_W - 3);
    const y = rng.int(2, MAP_H - 3);
    const t = T(x, y);
    const i = y * MAP_W + x;
    if (t.g !== Ground.GRASS || solid[i] || noTill[i] || t.obj) continue;
    if (inRect(x, y, { x: sf.x - 1, y: sf.y - 1, w: sf.w + 2, h: sf.h + 2 })) continue;
    if (Math.abs(x - LAYOUT.spawn.x) < 4 && Math.abs(y - LAYOUT.spawn.y) < 4) continue;
    const pick = rng.weighted(types, (k) => k[1])!;
    t.obj = { type: pick[0], hp: pick[2] };
    placed++;
  }

  let nextId = 1;
  const animals: AnimalState[] = [];
  const coop = LAYOUT.pens[0];
  const barn = LAYOUT.pens[1];
  animals.push(makeAnimal('chicken', 'coop', (coop.x0 + 4) * TILE, (coop.y0 + 5) * TILE, rng, nextId++));
  animals.push(makeAnimal('chicken', 'coop', (coop.x0 + 6) * TILE, (coop.y0 + 7) * TILE, rng, nextId++));
  animals.push(makeAnimal('cow', 'barn', (barn.x0 + 9) * TILE, (barn.y0 + 6) * TILE, rng, nextId++));

  const inventory: SaveData['inventory'] = new Array(27).fill(null);
  const start = [
    { id: 'hoe', qty: 1 }, { id: 'can', qty: 1 }, { id: 'seed_turnip', qty: 15 }, { id: 'scythe', qty: 1 },
    { id: 'axe', qty: 1 }, { id: 'pickaxe', qty: 1 }, { id: 'hammer', qty: 1 }, { id: 'basket', qty: 1 },
    { id: 'smoker', qty: 1 }, { id: 'hay', qty: 10 }, { id: 'planks', qty: 5 }, { id: 'seed_carrot', qty: 5 }, { id: 'sugar_water', qty: 3 },
  ];
  start.forEach((s, i) => (inventory[i] = s));

  return {
    saveVersion: SAVE_VERSION,
    slot, farmer, farm, seed,
    rngState: rng.state,
    chaosRngState: (seed ^ 0xa5a5a5a5) >>> 0,
    absDay: 1, day: 1, season: 0, year: 1, minutes: DAY_START,
    weather: 'sun', tomorrow: 'sun',
    player: { x: LAYOUT.spawn.x * TILE + 8, y: LAYOUT.spawn.y * TILE + 12, dir: 'down', energy: MAX_ENERGY, maxEnergy: MAX_ENERGY, money: START_MONEY + 300 },
    inventory, selected: 0, canWater: CAN_CAP,
    tiles,
    fences: buildFences(),
    pens: { coop: { id: 'coop', feed: 4, water: 4 }, barn: { id: 'barn', feed: 4, water: 4 } },
    animals,
    drops: [],
    hives: newHives(),
    bin: [],
    upgrades: {},
    chaos: {
      level: CHAOS.startLevel, cooldowns: {}, quietUntil: 0, calmDay: false, active: [], pending: [],
      trampleBudget: CHAOS.naturalTrample, survivedToday: [], totalSurvived: 0, lastRollHour: 6,
    },
    journal: [{ absDay: 1, label: 'Spring 1, Year 1', text: `Moved to ${farm}. It is a perfectly ordinary farm. Nothing weird will happen here.` }],
    stats: { playtime: 0, earned: 0, harvested: 0, shippedToday: [], harvestedToday: 0 },
    nextId,
    look,
    goals: { hints: [] },
  };
}
