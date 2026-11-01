// Every item in the game. Seeds and produce are generated from CROPS.
import { CROPS } from './crops';

export type ToolId = 'hoe' | 'can' | 'scythe' | 'axe' | 'pickaxe' | 'hammer' | 'basket';
export type ItemCat = 'tool' | 'seed' | 'produce' | 'animal' | 'supply' | 'placeable' | 'special';

export interface ItemDef {
  id: string;
  name: string;
  cat: ItemCat;
  sell?: number;       // shipping value (undefined = can't ship)
  buy?: number;        // shop price
  stack: boolean;
  tool?: ToolId;
  crop?: string;       // for seeds
  desc: string;
}

const list: ItemDef[] = [
  { id: 'hoe', name: 'Hoe', cat: 'tool', tool: 'hoe', stack: false, desc: 'Tills soil. Also good for bonking moles.' },
  { id: 'can', name: 'Watering Can', cat: 'tool', tool: 'can', stack: false, desc: 'Waters crops. Refill at the well or pond.' },
  { id: 'scythe', name: 'Scythe', cat: 'tool', tool: 'scythe', stack: false, desc: 'Harvests crops and clears weeds.' },
  { id: 'axe', name: 'Axe', cat: 'tool', tool: 'axe', stack: false, desc: 'Chops branches and stumps into planks.' },
  { id: 'pickaxe', name: 'Pickaxe', cat: 'tool', tool: 'pickaxe', stack: false, desc: 'Breaks rocks. Un-tills soil.' },
  { id: 'hammer', name: 'Hammer', cat: 'tool', tool: 'hammer', stack: false, desc: 'Repairs fences and gates (uses 1 plank). Picks up placed items.' },
  { id: 'basket', name: 'Hand & Basket', cat: 'tool', tool: 'basket', stack: false, desc: 'Pet animals, harvest by hand.' },

  { id: 'egg', name: 'Egg', cat: 'animal', sell: 100, stack: true, desc: 'Fresh from the coop.' },
  { id: 'milk', name: 'Milk', cat: 'animal', sell: 250, stack: true, desc: 'Creamy.' },
  { id: 'truffle', name: 'Truffle', cat: 'animal', sell: 600, stack: true, desc: 'A pig found this. Somewhere.' },
  { id: 'wool', name: 'Wool', cat: 'animal', sell: 680, stack: true, desc: 'Soft and fluffy.' },
  { id: 'goat_milk', name: 'Goat Milk', cat: 'animal', sell: 450, stack: true, desc: 'Tangy. The goat seems proud.' },

  { id: 'hay', name: 'Hay', cat: 'supply', buy: 50, stack: true, desc: 'Animal feed. Put it in a feed trough.' },
  { id: 'planks', name: 'Planks', cat: 'supply', buy: 30, sell: 5, stack: true, desc: 'Used by the hammer to repair fences.' },
  { id: 'sprinkler', name: 'Sprinkler', cat: 'placeable', buy: 300, stack: true, desc: 'Waters the 8 tiles around it every morning.' },
  { id: 'scarecrow', name: 'Scarecrow', cat: 'placeable', buy: 150, stack: true, desc: 'Keeps crows away within 6 tiles.' },

  // beekeeping (see systems/BeeSystem.ts)
  { id: 'smoker', name: 'Bee Smoker', cat: 'tool', buy: 200, stack: false, desc: 'Calms bees. Smoke each hive at least every 2 days, and before taking honey.' },
  { id: 'honey', name: 'Honey', cat: 'animal', sell: 180, stack: true, desc: 'Golden and sticky. Happy hives make star honey.' },
  { id: 'beeswax', name: 'Beeswax', cat: 'animal', sell: 90, stack: true, desc: 'Smells like summer.' },
  { id: 'sugar_water', name: 'Sugar Water', cat: 'supply', buy: 25, stack: true, desc: 'Bee food when there are no flowers (and every winter day). E on a hive. Also lures swarms home.' },
  { id: 'beehive', name: 'Beehive', cat: 'supply', buy: 800, stack: true, desc: 'A new colony. E on an empty spot in the apiary.' },
  { id: 'queen_bee', name: 'Queen Bee', cat: 'supply', buy: 400, stack: true, desc: 'Revives an empty hive that lost its queen.' },

  { id: 'star_ore', name: 'Star Ore', cat: 'special', sell: 750, stack: true, desc: 'Fell from the sky. Still warm.' },
];

for (const c of Object.values(CROPS)) {
  if (c.buyable !== false) {
    list.push({
      id: `seed_${c.id}`, name: `${c.name} Seeds`, cat: 'seed', buy: c.seed, stack: true, crop: c.id,
      desc: `Plant on tilled soil. ${c.days} days. Seasons: ${c.seasons.map((s) => ['Spr', 'Sum', 'Fall', 'Win'][s]).join('/')}.`,
    });
  }
  list.push({ id: c.id, name: c.name, cat: 'produce', sell: c.sell, stack: true, desc: c.desc });
}

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map((i) => [i.id, i]));

export interface UpgradeDef {
  id: string;
  name: string;
  price: number;
  desc: string;
}

// One-time purchases. Several of them counter chaos events.
export const UPGRADES: UpgradeDef[] = [
  { id: 'big_can', name: 'Big Watering Can', price: 600, desc: 'Doubles watering can capacity.' },
  { id: 'chicken_latch', name: 'Chicken-Proof Latch', price: 400, desc: 'Chickens can no longer flip gate latches.' },
  { id: 'bin_lid', name: 'Goat-Proof Bin Lid', price: 350, desc: 'Keeps hungry mouths out of the shipping bin.' },
  { id: 'reinforced_fence', name: 'Reinforced Fences', price: 1200, desc: 'Fences have double durability and take half damage.' },
  { id: 'hail_net', name: 'Hail Netting', price: 800, desc: 'Halves hailstorm crop damage.' },
  { id: 'lightning_rod', name: 'Lightning Rod', price: 1000, desc: 'Halves tornado damage to crops and fences.' },
  { id: 'storm_cellar', name: 'Storm Cellar', price: 2500, desc: 'Animals hide during tornadoes and cannot be swept away.' },
];

export function sellPrice(id: string, star?: boolean): number {
  const d = ITEMS[id];
  if (!d || d.sell === undefined) return 0;
  return Math.round(d.sell * (star ? 1.5 : 1));
}
