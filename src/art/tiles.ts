// Ground tileset: one row of tiles per season, so changing seasons just
// offsets the tile index. Also generates the 'grass_deco' decal sheet that
// WorldView scatters over grass tiles for extra variety.
import Phaser from 'phaser';
import { ArtRand, addFrames, addTex, dither, ditherEllipse, ellipse, makeCanvas, mix, px, rect, type Ctx } from './draw';
import { GRASS, P } from './palette';

export const T = {
  GRASS0: 0,
  GRASS1: 1,
  GRASS2: 2,
  FLOWER: 3,
  DIRT: 4,
  TILLED: 5,
  TILLED_WET: 6,
  PATH: 7,
  WATER0: 8,
  WATER1: 9,
  SAND: 10,
  FLOOD: 11,
} as const;
export const TILES_PER_SEASON = 12;

function noise(ctx: Ctx, r: ArtRand, ox: number, oy: number, n: number, cols: string[]): void {
  for (let i = 0; i < n; i++) px(ctx, ox + r.int(0, 15), oy + r.int(0, 15), r.pick(cols));
}

/** Base grass: soft dithered patches; the variant changes the motif. */
function grass(ctx: Ctx, r: ArtRand, s: number, ox: number, oy: number, variant = 0): void {
  const g = GRASS[s];
  rect(ctx, ox, oy, 16, 16, g.base);
  ditherEllipse(ctx, ox + r.int(4, 11), oy + r.int(4, 11), r.int(3, 4), r.int(2, 3), g.light);
  ditherEllipse(ctx, ox + r.int(4, 11), oy + r.int(4, 11), r.int(2, 3), 2, g.dark);
  noise(ctx, r, ox, oy, 6, [g.light, g.dark]);
  if (variant === 0) {
    // little curved blades
    for (let i = 0; i < 4; i++) {
      const x = ox + r.int(1, 13);
      const y = oy + r.int(2, 14);
      px(ctx, x, y, g.deep);
      px(ctx, x + 1, y - 1, g.deep);
      px(ctx, x + 1, y, g.dark);
    }
  } else if (variant === 1) {
    // clover dots
    for (let i = 0; i < 3; i++) {
      const x = ox + r.int(2, 13);
      const y = oy + r.int(2, 13);
      px(ctx, x, y, g.light);
      px(ctx, x + 1, y, g.light);
      px(ctx, x, y + 1, g.dark);
      px(ctx, x + 1, y + 1, g.deep);
    }
  } else {
    // soft wavy ticks
    const c = mix(g.base, g.deep, 0.5);
    for (let y = 2; y < 16; y += 6) {
      for (let x = 1; x < 16; x += 4) px(ctx, ox + x, oy + y + ((x >> 2) % 2), c);
    }
  }
}

function soil(ctx: Ctx, r: ArtRand, ox: number, oy: number, base: string, light: string, dark: string, furrows: boolean): void {
  rect(ctx, ox, oy, 16, 16, base);
  if (furrows) {
    for (const fy of [3, 7, 11, 15]) {
      rect(ctx, ox, oy + fy, 16, 1, dark);
      dither(ctx, ox, oy + fy - 1, 16, 1, dark, fy);
      rect(ctx, ox + 1, oy + fy - 2, 14, 1, light);
    }
  }
  noise(ctx, r, ox, oy, 10, [light, dark]);
}

function drawTile(ctx: Ctx, t: number, s: number, ox: number, oy: number): void {
  const r = new ArtRand(1000 + t * 31 + s * 977);
  switch (t) {
    case T.GRASS0:
    case T.GRASS1:
    case T.GRASS2:
      grass(ctx, r, s, ox, oy, t - T.GRASS0);
      break;
    case T.FLOWER: {
      grass(ctx, r, s, ox, oy, 1);
      const fl = GRASS[s].flower;
      for (let i = 0; i < 4; i++) {
        const x = ox + 3 + (i % 2) * 7 + r.int(0, 2);
        const y = oy + 3 + (i >> 1) * 7 + r.int(0, 2);
        const c = fl[i % fl.length];
        rect(ctx, x - 1, y, 3, 1, c);
        rect(ctx, x, y - 1, 1, 3, c);
        px(ctx, x, y, s === 3 ? '#e04a5a' : '#ffe27a');
        px(ctx, x, y + 2, GRASS[s].deep);
      }
      break;
    }
    case T.DIRT:
      soil(ctx, r, ox, oy, P.soil, P.soilLight, P.soilDark, false);
      noise(ctx, r, ox, oy, 6, [P.stone]);
      break;
    case T.TILLED:
      soil(ctx, r, ox, oy, P.tilled, P.tilledLight, P.tilledDark, true);
      break;
    case T.TILLED_WET:
      soil(ctx, r, ox, oy, P.wet, P.wetLight, P.wetDark, true);
      break;
    case T.PATH: {
      rect(ctx, ox, oy, 16, 16, s === 3 ? '#dcdce4' : '#e4cfa4');
      noise(ctx, r, ox, oy, 10, ['#c8b08a', '#f0e0bc']);
      for (let i = 0; i < 4; i++) {
        const x = ox + r.int(1, 11);
        const y = oy + r.int(1, 11);
        ellipse(ctx, x + 2, y + 1, 2, 1, s === 3 ? '#f4f6fa' : '#f6ead0');
        rect(ctx, x + 1, y + 3, 3, 1, '#a8a0b8');
      }
      break;
    }
    case T.WATER0:
    case T.WATER1: {
      const f = t - T.WATER0;
      rect(ctx, ox, oy, 16, 16, s === 3 ? '#7aa8d0' : P.water);
      dither(ctx, ox, oy + 9 + f, 16, 4, s === 3 ? '#6a98c4' : '#3f7cb0', f);
      for (let i = 0; i < 3; i++) {
        const y = oy + ((i * 5 + f * 2) % 16);
        const x = ox + ((i * 5 + f * 3) % 11);
        rect(ctx, x, y, 3, 1, P.waterLight);
        px(ctx, x + 3, y - 1 < oy ? y : y - 1, P.waterLight);
      }
      px(ctx, ox + 3 + f * 6, oy + 5, P.waterFoam);
      px(ctx, ox + 11 - f * 4, oy + 12, P.waterFoam);
      break;
    }
    case T.SAND:
      rect(ctx, ox, oy, 16, 16, s === 3 ? '#eceaf0' : '#f0d8a8');
      noise(ctx, r, ox, oy, 14, ['#dcc090', '#fbecc8']);
      break;
    case T.FLOOD:
      soil(ctx, r, ox, oy, P.wet, P.wetLight, P.wetDark, true);
      ellipse(ctx, ox + 8, oy + 8, 6, 5, P.water);
      rect(ctx, ox + 5, oy + 6, 4, 1, P.waterLight);
      px(ctx, ox + 10, oy + 9, P.waterFoam);
      break;
  }
}

export function genTiles(scene: Phaser.Scene): void {
  const { c, ctx } = makeCanvas(16 * TILES_PER_SEASON, 16 * 4);
  for (let s = 0; s < 4; s++) {
    for (let t = 0; t < TILES_PER_SEASON; t++) drawTile(ctx, t, s, t * 16, s * 16);
  }
  addTex(scene, 'tiles', c);
  genGrassDeco(scene);
}

// ------------------------------------------------------------ grass decals
// Texture 'grass_deco': 16x16 frames, frame = season * DECO_PER_SEASON + i.
export const DECO_PER_SEASON = 8;

function tuft(ctx: Ctx, x: number, y: number, a: string, b: string): void {
  px(ctx, x, y, a);
  px(ctx, x - 1, y - 1, a);
  px(ctx, x + 1, y - 1, b);
  px(ctx, x, y - 2, b);
  px(ctx, x + 2, y - 2, a);
  px(ctx, x - 2, y - 2, a);
}

function flowerDot(ctx: Ctx, x: number, y: number, c: string, mid: string): void {
  px(ctx, x - 1, y, c);
  px(ctx, x + 1, y, c);
  px(ctx, x, y - 1, c);
  px(ctx, x, y + 1, c);
  px(ctx, x, y, mid);
}

function drawDeco(ctx: Ctx, s: number, i: number, ox: number, oy: number): void {
  const g = GRASS[s];
  const r = new ArtRand(7000 + s * 101 + i * 13);
  const X = (x: number, y: number, c: string) => px(ctx, ox + x, oy + y, c);
  switch (i) {
    case 0: // single tuft
      tuft(ctx, ox + 8, oy + 11, g.deep, g.light);
      break;
    case 1: // tuft pair
      tuft(ctx, ox + 5, oy + 12, g.deep, g.light);
      tuft(ctx, ox + 11, oy + 8, g.deep, g.dark);
      break;
    case 2: // flower cluster
      for (let k = 0; k < 3; k++) {
        const x = 4 + k * 4;
        const y = 6 + r.int(0, 5);
        X(x, y + 2, g.deep);
        flowerDot(ctx, ox + x, oy + y, g.flower[(k + s) % g.flower.length], s === 3 ? '#e04a5a' : '#ffe27a');
      }
      break;
    case 3: // clover patch
      for (const [x, y] of [[5, 8], [9, 10], [7, 12]]) {
        X(x, y, g.light);
        X(x + 1, y, g.light);
        X(x, y + 1, g.light);
        X(x + 1, y + 1, g.dark);
        X(x + 2, y + 1, g.deep);
      }
      if (s < 2) X(9, 9, '#ffffff');
      break;
    case 4: // pebbles
      ellipse(ctx, ox + 6, oy + 10, 2, 1, P.stoneLight);
      X(6, 11, P.stoneDark);
      X(7, 11, P.stoneDark);
      ellipse(ctx, ox + 11, oy + 12, 1, 1, P.stone);
      X(11, 13, P.stoneDark);
      X(4, 13, P.stone);
      break;
    case 5: // darker soft patch
      ditherEllipse(ctx, ox + 8, oy + 8, 6, 4, g.deep);
      ditherEllipse(ctx, ox + 8, oy + 8, 3, 2, g.dark);
      break;
    case 6: // seasonal special
      if (s === 0) {
        for (const [x, c] of [[5, '#ff7a8a'], [9, '#ffd25a'], [12, '#c8a8f0']] as const) {
          rect(ctx, ox + x, oy + 8, 1, 5, g.deep);
          rect(ctx, ox + x - 1, oy + 6, 3, 2, c);
          X(x, 5, c);
        }
      } else if (s === 1) {
        for (const [x, y] of [[5, 7], [10, 9]]) {
          rect(ctx, ox + x, oy + y + 2, 1, 4, g.deep);
          ellipse(ctx, ox + x, oy + y, 2, 2, '#fffaf0');
          X(x, y, '#e0e4ea');
        }
      } else if (s === 2) {
        // mushrooms
        for (const [x, y, w] of [[6, 11, 3], [11, 12, 2]]) {
          rect(ctx, ox + x - 1, oy + y - 1, 2, 3, '#f6ead0');
          ellipse(ctx, ox + x, oy + y - 2, w, 1, '#e0604a');
          X(x - 1, y - 3, '#fffaf0');
        }
      } else {
        // snow lump
        ellipse(ctx, ox + 8, oy + 10, 5, 3, '#ffffff');
        ditherEllipse(ctx, ox + 8, oy + 12, 5, 1, '#b8c8e0');
        X(6, 8, '#ffffff');
      }
      break;
    case 7: // seasonal scatter
      if (s === 0) {
        for (let k = 0; k < 4; k++) X(r.int(3, 12), r.int(4, 12), k % 2 ? '#ffffff' : '#ff9aa8');
      } else if (s === 1) {
        tuft(ctx, ox + 8, oy + 13, g.deep, g.light);
        rect(ctx, ox + 8, oy + 8, 1, 3, g.deep);
        flowerDot(ctx, ox + 8, oy + 7, '#ffd25a', '#a8603a');
      } else if (s === 2) {
        for (const [x, y, c] of [[4, 8, '#e8653a'], [10, 11, '#d84a4a'], [7, 13, '#f5cf5a']] as const) {
          rect(ctx, ox + x, oy + y, 2, 1, c);
          X(x + 1, y + 1, c);
        }
      } else {
        ellipse(ctx, ox + 8, oy + 11, 4, 2, '#ffffff');
        rect(ctx, ox + 6, oy + 7, 1, 4, '#8a5a44');
        X(7, 7, '#8a5a44');
        X(5, 8, '#8a5a44');
      }
      break;
  }
}

export function genGrassDeco(scene: Phaser.Scene): void {
  const { c, ctx } = makeCanvas(16 * DECO_PER_SEASON, 16 * 4);
  for (let s = 0; s < 4; s++) for (let i = 0; i < DECO_PER_SEASON; i++) drawDeco(ctx, s, i, i * 16, s * 16);
  const t = addTex(scene, 'grass_deco', c);
  addFrames(t, 16, 16, DECO_PER_SEASON * 4, DECO_PER_SEASON);
}
