// Data-driven livestock definitions.

export interface AnimalDef {
  id: string;
  name: string;
  pen: 'coop' | 'barn';
  price: number;
  product: string;       // item id
  every: number;         // days between products
  speed: number;         // wander speed px/s
  big: boolean;          // big animals trample crops
  hw: number;            // half hitbox width
  hh: number;            // hitbox height
  sound: string;
  names: string[];
  desc: string;
}

export const ANIMALS: Record<string, AnimalDef> = {
  chicken: {
    id: 'chicken', name: 'Chicken', pen: 'coop', price: 400, product: 'egg', every: 1, speed: 26,
    big: false, hw: 4, hh: 4, sound: 'cluck',
    names: ['Clucky', 'Henrietta', 'Nugget', 'Pecky', 'Omelette', 'Sir Flaps', 'Dot', 'Agent Feathers'],
    desc: 'Lays an egg every day. Definitely not plotting anything.',
  },
  cow: {
    id: 'cow', name: 'Cow', pen: 'barn', price: 1200, product: 'milk', every: 1, speed: 18,
    big: true, hw: 7, hh: 5, sound: 'moo',
    names: ['Bessie', 'Moolan', 'Daisy', 'Buttercup', 'Moozart', 'Clover'],
    desc: 'Gives milk daily. Heavy. Very heavy.',
  },
  pig: {
    id: 'pig', name: 'Pig', pen: 'barn', price: 2000, product: 'truffle', every: 1, speed: 20,
    big: true, hw: 6, hh: 5, sound: 'oink',
    names: ['Hamlet', 'Truffles', 'Pigasso', 'Wilbur Jr.', 'Snorts'],
    desc: 'Sniffs out truffles. Loves digging. Loves it a little too much.',
  },
  sheep: {
    id: 'sheep', name: 'Sheep', pen: 'barn', price: 1500, product: 'wool', every: 3, speed: 18,
    big: true, hw: 6, hh: 5, sound: 'baa',
    names: ['Baarbara', 'Wooly', 'Fluffington', 'Lamb Chop', 'Shaun'],
    desc: 'Grows wool every 3 days. Occasionally found in impossible places.',
  },
  goat: {
    id: 'goat', name: 'Goat', pen: 'barn', price: 1600, product: 'goat_milk', every: 2, speed: 24,
    big: true, hw: 6, hh: 5, sound: 'baa',
    names: ['Billy', 'Gruff', 'Chaos', 'Kevin', 'Nibbles'],
    desc: 'Gives goat milk every 2 days. Will eat anything. Anything.',
  },
};
