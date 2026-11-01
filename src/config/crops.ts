// Data-driven crop definitions. Add an entry here and seeds, produce, icons
// and growth sprites are generated automatically.

export type CropKind = 'root' | 'grain' | 'stalk' | 'bush' | 'vine';

export interface CropDef {
  id: string;
  name: string;
  seasons: number[];      // 0 Spring, 1 Summer, 2 Fall, 3 Winter
  days: number;           // watered days needed to mature
  stages: number;         // visible growth stages, including seed and ready
  sell: number;
  seed: number;           // seed price (0 = not sold)
  regrow?: number;        // days to regrow after harvest
  kind: CropKind;
  color: string;
  color2?: string;
  buyable?: boolean;
  desc: string;
}

export const CROPS: Record<string, CropDef> = {
  turnip: {
    id: 'turnip', name: 'Turnip', seasons: [0], days: 4, stages: 4, sell: 70, seed: 20,
    kind: 'root', color: '#f4ecf4', color2: '#b05cc0', desc: 'A humble turnip. Nothing suspicious.',
  },
  carrot: {
    id: 'carrot', name: 'Carrot', seasons: [0, 2], days: 3, stages: 4, sell: 70, seed: 25,
    kind: 'root', color: '#f08a2a', color2: '#f8b060', desc: 'Crunchy. Good for your eyes.',
  },
  potato: {
    id: 'potato', name: 'Potato', seasons: [0], days: 6, stages: 5, sell: 160, seed: 50,
    kind: 'root', color: '#c8a060', color2: '#a8804a', desc: 'Lumpy and dependable.',
  },
  strawberry: {
    id: 'strawberry', name: 'Strawberry', seasons: [0], days: 8, stages: 5, sell: 240, seed: 100,
    regrow: 4, kind: 'bush', color: '#e03a3a', color2: '#ffe0a0', desc: 'Sweet. Regrows after harvest.',
  },
  wheat: {
    id: 'wheat', name: 'Wheat', seasons: [1, 2], days: 4, stages: 4, sell: 50, seed: 10,
    kind: 'grain', color: '#e8c860', color2: '#c8a040', desc: 'Sways nicely in the wind.',
  },
  corn: {
    id: 'corn', name: 'Corn', seasons: [1, 2], days: 10, stages: 5, sell: 100, seed: 150,
    regrow: 4, kind: 'stalk', color: '#f2d24c', color2: '#7ab84a', desc: 'Tall. Regrows after harvest.',
  },
  pumpkin: {
    id: 'pumpkin', name: 'Pumpkin', seasons: [2], days: 12, stages: 5, sell: 640, seed: 100,
    kind: 'vine', color: '#e8853a', color2: '#b85a20', desc: 'Huge, round and valuable.',
  },
  snowyam: {
    id: 'snowyam', name: 'Snow Yam', seasons: [3], days: 7, stages: 4, sell: 200, seed: 60,
    kind: 'root', color: '#e8e0ff', color2: '#9a8ac8', desc: 'Grows even in the frozen dirt.',
  },
  alien_wheat: {
    id: 'alien_wheat', name: 'Mystery Wheat', seasons: [0, 1, 2, 3], days: 1, stages: 2, sell: 300, seed: 0,
    kind: 'grain', color: '#7cff9a', color2: '#3ac86a', buyable: false,
    desc: 'Appeared overnight in a perfect circle. Hums faintly.',
  },
};

export function cropStage(def: CropDef, days: number): number {
  if (days >= def.days) return def.stages - 1;
  return Math.min(def.stages - 2, Math.floor((days / def.days) * (def.stages - 1)));
}

export function isReady(def: CropDef, days: number): boolean {
  return days >= def.days;
}

/** Days removed when a crop "drops a growth stage". */
export function stageDays(def: CropDef): number {
  return Math.max(1, Math.ceil(def.days / (def.stages - 1)));
}
