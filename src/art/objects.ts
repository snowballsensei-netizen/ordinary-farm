// Buildings, fences, trees, debris and placeable objects.
import Phaser from 'phaser';
import { ArtRand, dither, ditherEllipse, ellipse, line, pix, px, rect, shade, tex, type Ctx } from './draw';
import { drawText } from './font';
import { P } from './palette';

function planksH(ctx: Ctx, x: number, y: number, w: number, h: number, base: string): void {
  rect(ctx, x, y, w, h, base);
  for (let yy = y + 3; yy < y + h; yy += 4) rect(ctx, x, yy, w, 1, shade(base, 0.8));
  const r = new ArtRand(x * 7 + y);
  for (let i = 0; i < w / 6; i++) px(ctx, x + r.int(0, w - 1), y + r.int(0, h - 1), shade(base, 0.85));
}

function planksV(ctx: Ctx, x: number, y: number, w: number, h: number, base: string): void {
  rect(ctx, x, y, w, h, base);
  for (let xx = x + 3; xx < x + w; xx += 4) rect(ctx, xx, y, 1, h, shade(base, 0.8));
}

function roofRows(ctx: Ctx, x: number, y: number, w: number, h: number, slope: number, base: string): void {
  for (let i = 0; i < h; i++) {
    const inset = Math.floor((h - i) * slope);
    const c = i % 4 === 3 ? shade(base, 0.78) : i % 4 === 0 ? shade(base, 1.1) : base;
    rect(ctx, x + inset, y + i, w - inset * 2, 1, c);
  }
}

function windowPane(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, P.cream);
  rect(ctx, x, y, w, h, P.glass);
  rect(ctx, x, y, w, 2, '#c8ecff');
  rect(ctx, x + Math.floor(w / 2), y, 1, h, P.cream);
  rect(ctx, x, y + Math.floor(h / 2), w, 1, P.cream);
}

function roundWindow(ctx: Ctx, cx: number, cy: number, r: number): void {
  ellipse(ctx, cx, cy, r + 2, r + 2, P.cream);
  ellipse(ctx, cx, cy, r, r, P.glass);
  ditherEllipse(ctx, cx + 1, cy + 1, r - 1, r - 1, '#7cc0d8');
  rect(ctx, cx - r, cy, r * 2 + 1, 1, P.cream);
  rect(ctx, cx, cy - r, 1, r * 2 + 1, P.cream);
  px(ctx, cx - r + 1, cy - r + 2, '#ffffff');
}

function house(ctx: Ctx): void {
  // tall round-topped chimney on the left, with a puff of smoke
  rect(ctx, 12, 4, 10, 22, P.stone);
  dither(ctx, 18, 4, 4, 22, P.stoneDark);
  rect(ctx, 10, 2, 14, 3, P.stoneDark);
  ellipse(ctx, 18, 0, 3, 1, '#e6ecf2');
  // big soft rounded roof (coral), scalloped edge
  ellipse(ctx, 48, 40, 47, 30, P.roof);
  rect(ctx, 0, 40, 96, 4, P.roof);
  ctx.clearRect(0, 47, 96, 33);
  for (let y = 16; y < 40; y += 6) {
    for (let x = 4; x < 92; x += 8) ellipse(ctx, x + ((y / 6) % 2) * 4, y, 3, 1, P.roofDark);
  }
  ditherEllipse(ctx, 36, 22, 14, 8, shade(P.roof, 1.15));
  for (let x = 2; x < 96; x += 8) ellipse(ctx, x + 2, 44, 4, 2, P.roofDark);
  // walls: cream plaster with a dusty-blue shaded base
  rect(ctx, 4, 46, 88, 34, P.cream);
  dither(ctx, 4, 70, 88, 6, '#d8d0c4');
  rect(ctx, 4, 76, 88, 4, P.shadow);
  rect(ctx, 4, 46, 3, 30, P.tan);
  rect(ctx, 89, 46, 3, 30, P.tan);
  // round attic window in the roof
  roundWindow(ctx, 48, 26, 6);
  // door: rounded teal door
  ellipse(ctx, 48, 58, 10, 8, P.cream);
  rect(ctx, 38, 58, 21, 22, P.cream);
  ellipse(ctx, 48, 59, 8, 6, P.teal);
  rect(ctx, 40, 59, 17, 21, P.teal);
  dither(ctx, 52, 56, 5, 24, shade(P.teal, 0.8));
  px(ctx, 54, 69, P.yellow);
  rect(ctx, 46, 60, 4, 4, P.glass);
  // round window left, small square window right
  roundWindow(ctx, 20, 56, 7);
  rect(ctx, 68, 50, 16, 14, P.cream);
  rect(ctx, 70, 52, 12, 10, P.glass);
  rect(ctx, 75, 52, 1, 10, P.cream);
  dither(ctx, 76, 57, 6, 5, '#7cc0d8');
  // flower pots
  for (const x of [8, 62, 86]) {
    rect(ctx, x, 74, 5, 4, P.coral);
    px(ctx, x + 1, 72, P.pink);
    px(ctx, x + 3, 71, P.yellow);
    px(ctx, x + 2, 73, P.leaf);
  }
}

function barn(ctx: Ctx): void {
  // gambrel-ish roof as stepped cream rows on a red body
  const RED = '#d0503f';
  const RED_D = '#a03a34';
  for (let i = 0; i < 26; i++) {
    const inset = i < 10 ? Math.floor((10 - i) * 1.6) + 10 : Math.max(0, Math.floor((26 - i) * 0.6));
    rect(ctx, inset, 2 + i, 80 - inset * 2, 1, i % 5 === 4 ? '#6a4a5a' : '#8a5e6e');
  }
  rect(ctx, 0, 26, 80, 2, '#5a3e4e');
  rect(ctx, 4, 28, 72, 36, RED);
  for (let x = 8; x < 76; x += 6) dither(ctx, x, 28, 1, 36, RED_D);
  dither(ctx, 4, 58, 72, 6, RED_D);
  // cream trim
  rect(ctx, 4, 28, 72, 2, P.cream);
  rect(ctx, 4, 28, 2, 36, P.cream);
  rect(ctx, 74, 28, 2, 36, P.cream);
  // sliding doors with a cream "Z" brace
  rect(ctx, 24, 36, 32, 28, P.cream);
  rect(ctx, 26, 38, 13, 26, RED_D);
  rect(ctx, 41, 38, 13, 26, RED_D);
  line(ctx, 26, 63, 38, 38, P.cream);
  line(ctx, 41, 38, 53, 63, P.cream);
  rect(ctx, 22, 35, 36, 1, P.dark);
  // hex window up top
  const hex = ['..cccccc..', '.cggggggc.', 'cgggggggGc', 'cggggggGGc', 'cgggggGGGc', '.cggggGGc.', '..cccccc..'];
  pix(ctx, hex, { c: P.cream, g: '#ffd88a', G: '#e8b060' }, 35, 9);
  // weather vane
  rect(ctx, 39, 0, 2, 4, P.dark);
}

function coop(ctx: Ctx): void {
  // little round hut with a thatched dome
  rect(ctx, 4, 22, 40, 26, P.woodPale);
  for (let x = 6; x < 44; x += 5) dither(ctx, x, 22, 1, 26, P.woodLight);
  rect(ctx, 4, 44, 40, 4, P.shadow);
  ellipse(ctx, 24, 18, 23, 14, P.gold);
  rect(ctx, 0, 18, 48, 4, P.gold);
  for (let y = 8; y < 22; y += 4) for (let x = 4; x < 46; x += 6) px(ctx, x + (y % 8) / 2, y, '#b08a30');
  ditherEllipse(ctx, 18, 12, 9, 4, P.yellow);
  for (let x = 1; x < 48; x += 5) ellipse(ctx, x + 2, 22, 2, 1, '#b08a30');
  // arched door + ramp
  ellipse(ctx, 24, 34, 6, 5, P.cream);
  rect(ctx, 18, 34, 13, 10, P.cream);
  ellipse(ctx, 24, 35, 4, 4, '#3e3a4a');
  rect(ctx, 20, 35, 9, 9, '#3e3a4a');
  rect(ctx, 18, 44, 13, 4, P.wood);
  // round windows
  roundWindow(ctx, 10, 30, 2);
  roundWindow(ctx, 38, 30, 2);
}

function shop(ctx: Ctx): void {
  // market stall: teal-and-cream scalloped canopy on two posts
  rect(ctx, 3, 10, 3, 30, P.wood);
  rect(ctx, 42, 10, 3, 30, P.wood);
  rect(ctx, 0, 6, 48, 8, P.cream);
  for (let i = 0; i < 6; i++) rect(ctx, i * 8, 6, 4, 8, P.teal);
  for (let i = 0; i < 12; i++) ellipse(ctx, i * 4 + 2, 14, 2, 2, Math.floor(i / 2) % 2 ? P.cream : P.teal);
  rect(ctx, 0, 5, 48, 1, P.leafDark);
  // hanging round sign
  ellipse(ctx, 24, 4, 13, 4, P.coral);
  drawText(ctx, 'SHOP', 13, 0, P.cream);
  // counter + baskets
  rect(ctx, 1, 26, 46, 14, P.woodLight);
  dither(ctx, 1, 34, 46, 6, P.wood);
  rect(ctx, 1, 25, 46, 2, P.woodPale);
  rect(ctx, 1, 38, 46, 2, P.shadow);
  for (const [x, c] of [[6, P.red], [17, P.orange], [28, P.yellow], [38, P.leafLight]] as const) {
    ellipse(ctx, x + 4, 23, 5, 2, P.wood);
    for (let i = 0; i < 3; i++) ellipse(ctx, x + 2 + i * 2, 21, 1, 1, c);
  }
}

function bin(ctx: Ctx, open: boolean): void {
  planksH(ctx, 1, 6, 14, 10, P.woodLight);
  rect(ctx, 1, 6, 14, 1, P.wood);
  if (open) {
    rect(ctx, 1, 0, 14, 3, P.wood);
    rect(ctx, 2, 5, 12, 2, P.ink);
  } else {
    rect(ctx, 0, 3, 16, 4, P.wood);
    rect(ctx, 0, 3, 16, 1, shade(P.wood, 1.2));
  }
  px(ctx, 7, 10, P.yellow);
  px(ctx, 8, 10, P.yellow);
}

function well(ctx: Ctx): void {
  // roof
  rect(ctx, 4, 3, 24, 6, P.roof);
  rect(ctx, 6, 1, 20, 3, shade(P.roof, 1.15));
  rect(ctx, 7, 9, 2, 12, P.wood);
  rect(ctx, 23, 9, 2, 12, P.wood);
  rect(ctx, 9, 11, 14, 1, P.dark);
  rect(ctx, 14, 12, 4, 4, P.grayDark);
  // stone ring
  ellipse(ctx, 16, 24, 13, 7, P.stone);
  ellipse(ctx, 16, 22, 10, 4, '#1f3a5a');
  ellipse(ctx, 16, 22, 7, 2, P.water);
  for (let i = 0; i < 6; i++) rect(ctx, 5 + i * 4, 27 + (i % 2), 3, 1, P.stoneDark);
}

function trough(ctx: Ctx, full: boolean, water: boolean): void {
  rect(ctx, 1, 4, 14, 8, P.wood);
  rect(ctx, 2, 5, 12, 4, P.dark);
  if (full) {
    if (water) {
      rect(ctx, 2, 5, 12, 3, P.water);
      rect(ctx, 3, 5, 5, 1, P.waterLight);
    } else {
      rect(ctx, 2, 3, 12, 5, P.yellow);
      for (let i = 0; i < 6; i++) px(ctx, 2 + i * 2, 3 + (i % 2), P.gold);
    }
  }
  rect(ctx, 1, 10, 2, 3, P.brown);
  rect(ctx, 13, 10, 2, 3, P.brown);
}

// fences ---------------------------------------------------------------
const POST = P.woodLight;
const RAIL = P.wood;

function post(ctx: Ctx, x: number, y0: number, h: number): void {
  rect(ctx, x, y0, 4, h, POST);
  rect(ctx, x, y0, 4, 1, P.woodPale);
  rect(ctx, x + 3, y0 + 1, 1, h - 1, P.wood);
}

function fenceH(ctx: Ctx): void {
  rect(ctx, 0, 6, 16, 2, RAIL);
  rect(ctx, 0, 10, 16, 2, RAIL);
  rect(ctx, 0, 6, 16, 1, P.woodLight);
  post(ctx, 6, 3, 12);
}

function fenceV(ctx: Ctx): void {
  rect(ctx, 7, 0, 2, 16, RAIL);
  post(ctx, 6, 3, 12);
}

function fencePost(ctx: Ctx): void {
  post(ctx, 6, 3, 12);
}

function fenceBroken(ctx: Ctx): void {
  rect(ctx, 6, 10, 4, 5, POST);
  px(ctx, 7, 9, POST);
  line(ctx, 1, 13, 5, 11, RAIL);
  line(ctx, 10, 14, 15, 13, RAIL);
  px(ctx, 12, 9, P.woodPale);
}

const GATE = '#d8483c';
const GATE_D = '#9e2e2e';
const GATE_L = '#f07a62';

/** Taller painted gate post with a white cap. */
function gatePost(ctx: Ctx, x: number, y0: number, h: number): void {
  rect(ctx, x, y0, 4, h, P.white);
  rect(ctx, x + 3, y0 + 1, 1, h - 1, P.grayLight);
  rect(ctx, x, y0, 4, 2, GATE_D);
}

function gateH(ctx: Ctx, open: boolean): void {
  gatePost(ctx, 0, 1, 14);
  gatePost(ctx, 12, 1, 14);
  if (open) {
    // swung inward: thin edge-on panel hanging off the left post
    rect(ctx, 4, 2, 3, 12, GATE);
    rect(ctx, 4, 2, 1, 12, GATE_L);
    rect(ctx, 6, 2, 1, 12, GATE_D);
    rect(ctx, 4, 4, 3, 1, P.white);
    rect(ctx, 4, 11, 3, 1, P.white);
  } else {
    rect(ctx, 4, 4, 8, 9, GATE);
    rect(ctx, 4, 4, 8, 1, GATE_L);
    rect(ctx, 4, 12, 8, 1, GATE_D);
    rect(ctx, 4, 5, 1, 7, P.white);
    rect(ctx, 11, 5, 1, 7, P.white);
    line(ctx, 5, 11, 10, 5, P.white);
    line(ctx, 5, 5, 10, 11, P.white);
    // latch
    rect(ctx, 10, 7, 3, 2, P.gold);
    px(ctx, 12, 7, P.yellowLight);
  }
}

function gateV(ctx: Ctx, open: boolean): void {
  gatePost(ctx, 6, 0, 4);
  gatePost(ctx, 6, 12, 4);
  if (!open) {
    rect(ctx, 6, 4, 4, 8, GATE);
    rect(ctx, 6, 4, 1, 8, GATE_L);
    rect(ctx, 9, 4, 1, 8, GATE_D);
    rect(ctx, 6, 6, 4, 1, P.white);
    rect(ctx, 6, 9, 4, 1, P.white);
    rect(ctx, 10, 7, 2, 2, P.gold);
  } else {
    // swung open to the side: panel seen face-on, folded against the top post
    rect(ctx, 10, 1, 5, 4, GATE);
    rect(ctx, 10, 1, 5, 1, GATE_L);
    line(ctx, 10, 4, 14, 2, P.white);
  }
}

// trees --------------------------------------------------------------------
function tree(ctx: Ctx, season: number): void {
  // lollipop storybook tree: one big round crown with dithered shading
  rect(ctx, 14, 30, 4, 16, P.brown);
  dither(ctx, 16, 30, 2, 16, shade(P.brown, 0.75));
  ellipse(ctx, 16, 45, 6, 1, P.shadow);
  const pal = [
    ['#52b844', '#8fe06a', '#2f7a32'],
    ['#3f9e3a', '#6cc850', '#286a2c'],
    ['#ec8250', '#f8b070', '#b8503e'],
    ['#3e7a52', '#6aa07a', '#2a5440'],
  ][season];
  ellipse(ctx, 16, 19, 14, 14, pal[2]);
  ellipse(ctx, 15, 18, 13, 12, pal[0]);
  ditherEllipse(ctx, 19, 23, 9, 7, pal[2]);
  ellipse(ctx, 11, 12, 5, 4, pal[1]);
  ditherEllipse(ctx, 13, 14, 7, 5, pal[1]);
  const r = new ArtRand(season + 5);
  if (season === 0) for (let i = 0; i < 8; i++) rect(ctx, r.int(6, 25), r.int(8, 28), 2, 1, P.pink);
  if (season === 1) for (let i = 0; i < 4; i++) rect(ctx, r.int(6, 25), r.int(10, 28), 2, 2, P.coral);
  if (season === 2) for (let i = 0; i < 6; i++) px(ctx, r.int(6, 26), r.int(10, 30), P.yellow);
  if (season === 3) {
    ellipse(ctx, 14, 7, 9, 3, '#f8fbfc');
    ditherEllipse(ctx, 14, 10, 9, 1, '#f8fbfc');
  }
}

// debris & placeables --------------------------------------------------------
function rock(ctx: Ctx): void {
  ellipse(ctx, 8, 10, 6, 4, P.stone);
  ellipse(ctx, 7, 9, 4, 2, P.stoneLight);
  rect(ctx, 4, 13, 9, 1, P.stoneDark);
  px(ctx, 10, 11, P.stoneDark);
}

function branch(ctx: Ctx): void {
  line(ctx, 3, 12, 13, 8, P.brown);
  line(ctx, 3, 13, 13, 9, P.dark);
  line(ctx, 8, 10, 7, 6, P.brown);
  px(ctx, 6, 5, P.leaf);
  px(ctx, 12, 7, P.leaf);
}

function weed(ctx: Ctx): void {
  line(ctx, 8, 14, 8, 8, P.leafDark);
  line(ctx, 8, 13, 4, 8, P.leaf);
  line(ctx, 8, 13, 12, 7, P.leaf);
  line(ctx, 8, 11, 5, 5, P.leafLight);
  line(ctx, 8, 11, 11, 4, P.leafDark);
}

function stump(ctx: Ctx): void {
  rect(ctx, 3, 6, 10, 8, P.brown);
  ellipse(ctx, 8, 6, 5, 2, P.tan);
  ellipse(ctx, 8, 6, 3, 1, P.woodLight);
  px(ctx, 8, 6, P.wood);
  rect(ctx, 2, 13, 3, 2, P.brown);
  rect(ctx, 11, 13, 3, 2, P.brown);
}

function molehill(ctx: Ctx): void {
  ellipse(ctx, 8, 11, 6, 3, P.soil);
  ellipse(ctx, 8, 10, 4, 2, P.soilLight);
  ellipse(ctx, 8, 10, 2, 1, P.ink);
}

function meteorite(ctx: Ctx): void {
  ellipse(ctx, 8, 12, 7, 3, P.soilDark);
  ellipse(ctx, 8, 9, 5, 4, '#3a2a4a');
  ellipse(ctx, 7, 8, 3, 2, '#5a4a7a');
  line(ctx, 5, 10, 9, 7, '#c07aff');
  line(ctx, 9, 11, 11, 8, '#ff9ae0');
  px(ctx, 6, 7, '#ffffff');
}

function sprinkler(ctx: Ctx, rogue: boolean): void {
  ellipse(ctx, 8, 12, 5, 2, P.grayDark);
  rect(ctx, 6, 6, 4, 6, rogue ? P.red : P.grayLight);
  rect(ctx, 5, 5, 6, 2, P.gray);
  px(ctx, 8, 4, P.waterLight);
  px(ctx, 7, 7, '#ffffff');
}

function scarecrow(ctx: Ctx): void {
  rect(ctx, 7, 10, 2, 22, P.brown);
  rect(ctx, 1, 13, 14, 2, P.brown);
  rect(ctx, 4, 12, 8, 10, '#5a7ab8');
  rect(ctx, 4, 16, 8, 1, '#3a5a98');
  for (const x of [1, 14]) px(ctx, x, 15, P.yellow);
  ellipse(ctx, 8, 7, 4, 4, '#e8d090');
  px(ctx, 6, 7, P.ink);
  px(ctx, 10, 7, P.ink);
  rect(ctx, 6, 9, 5, 1, P.ink);
  rect(ctx, 2, 3, 12, 2, '#8a5a2a');
  rect(ctx, 5, 0, 6, 3, '#8a5a2a');
}

export function genObjects(scene: Phaser.Scene): void {
  tex(scene, 'house', 96, 80, house);
  tex(scene, 'barn', 80, 64, barn);
  tex(scene, 'coop', 48, 48, coop);
  tex(scene, 'shop', 48, 40, shop);
  tex(scene, 'bin', 16, 16, (c) => bin(c, false));
  tex(scene, 'bin_open', 16, 16, (c) => bin(c, true));
  tex(scene, 'well', 32, 32, well);
  tex(scene, 'trough_feed', 16, 14, (c) => trough(c, false, false));
  tex(scene, 'trough_feed_full', 16, 14, (c) => trough(c, true, false));
  tex(scene, 'trough_water', 16, 14, (c) => trough(c, false, true));
  tex(scene, 'trough_water_full', 16, 14, (c) => trough(c, true, true));

  tex(scene, 'fence_h', 16, 16, fenceH);
  tex(scene, 'fence_v', 16, 16, fenceV);
  tex(scene, 'fence_post', 16, 16, fencePost);
  tex(scene, 'fence_broken', 16, 16, fenceBroken);
  tex(scene, 'gate_h', 16, 16, (c) => gateH(c, false));
  tex(scene, 'gate_h_open', 16, 16, (c) => gateH(c, true));
  tex(scene, 'gate_v', 16, 16, (c) => gateV(c, false));
  tex(scene, 'gate_v_open', 16, 16, (c) => gateV(c, true));

  for (let s = 0; s < 4; s++) tex(scene, `tree_${s}`, 32, 48, (c) => tree(c, s));

  tex(scene, 'obj_rock', 16, 16, rock);
  tex(scene, 'obj_branch', 16, 16, branch);
  tex(scene, 'obj_weed', 16, 16, weed);
  tex(scene, 'obj_stump', 16, 16, stump);
  tex(scene, 'obj_molehill', 16, 16, molehill);
  tex(scene, 'obj_meteorite', 16, 16, meteorite);
  tex(scene, 'obj_sprinkler', 16, 16, (c) => sprinkler(c, false));
  tex(scene, 'obj_sprinkler_rogue', 16, 16, (c) => sprinkler(c, true));
  tex(scene, 'obj_scarecrow', 16, 32, scarecrow);
}
