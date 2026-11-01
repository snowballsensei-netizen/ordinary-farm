// Growth-stage sprites for every crop, generated from the crop definition.
// Every crop texture is 16x24 and anchored at its bottom centre.
import Phaser from 'phaser';
import { CROPS, type CropDef } from '../config/crops';
import { ellipse, line, px, rect, tex, type Ctx, shade } from './draw';
import { P } from './palette';

const LEAF = P.leaf;
const LEAF_D = P.leafDark;
const LEAF_L = P.leafLight;

function seed(ctx: Ctx): void {
  rect(ctx, 5, 20, 6, 2, P.tilledLight);
  px(ctx, 6, 20, '#e8d8a0');
  px(ctx, 9, 21, '#e8d8a0');
  px(ctx, 8, 19, '#e8d8a0');
}

function sprout(ctx: Ctx): void {
  line(ctx, 8, 21, 8, 18, LEAF_D);
  px(ctx, 7, 17, LEAF_L);
  px(ctx, 6, 17, LEAF);
  px(ctx, 9, 17, LEAF_L);
  px(ctx, 10, 16, LEAF);
}

function leaves(ctx: Ctx, cx: number, by: number, size: number): void {
  for (let i = -1; i <= 1; i++) {
    const tx = cx + i * Math.max(2, size - 1);
    const ty = by - size * 2 + Math.abs(i) * 2;
    line(ctx, cx, by, tx, ty, LEAF_D);
    ellipse(ctx, tx, ty, Math.max(1, Math.floor(size / 2) + 1), Math.max(1, Math.floor(size / 2)), i === 0 ? LEAF_L : LEAF);
  }
}

function drawRoot(ctx: Ctx, d: CropDef, p: number, ready: boolean): void {
  if (ready) {
    ellipse(ctx, 8, 19, 4, 3, d.color);
    rect(ctx, 5, 18, 7, 1, d.color2 ?? shade(d.color, 0.8));
    px(ctx, 6, 18, '#ffffff');
    leaves(ctx, 8, 16, 4);
  } else {
    leaves(ctx, 8, 21, Math.round(1 + p * 3));
  }
}

function drawGrain(ctx: Ctx, d: CropDef, p: number, ready: boolean): void {
  const h = Math.round(4 + p * 12);
  const stalk = ready ? d.color2 ?? d.color : LEAF;
  for (const [x, dh] of [[5, -1], [8, 1], [11, 0]] as const) {
    const top = 22 - h - dh;
    line(ctx, x, 21, x + (x === 8 ? 0 : x < 8 ? -1 : 1), top, stalk);
    if (!ready) px(ctx, x + 1, top + 3, LEAF_L);
    if (ready) {
      rect(ctx, x - 1, top - 3, 3, 4, d.color);
      px(ctx, x, top - 4, shade(d.color, 1.15));
      px(ctx, x - 1, top - 1, d.color2 ?? shade(d.color, 0.8));
    }
  }
}

function drawStalk(ctx: Ctx, d: CropDef, p: number, ready: boolean): void {
  const h = Math.round(5 + p * 15);
  rect(ctx, 7, 22 - h, 2, h, LEAF_D);
  for (let y = 21 - 3; y > 22 - h + 2; y -= 4) {
    line(ctx, 8, y, 3, y - 3, LEAF);
    line(ctx, 8, y - 2, 13, y - 5, LEAF_L);
  }
  if (ready) {
    for (const [x, y] of [[10, 10], [4, 13]] as const) {
      rect(ctx, x, y, 3, 6, d.color);
      px(ctx, x + 1, y + 1, P.yellowLight);
      rect(ctx, x, y + 5, 3, 2, d.color2 ?? LEAF);
    }
    rect(ctx, 7, 1, 2, 3, '#e8d090');
  }
}

function drawBush(ctx: Ctx, d: CropDef, p: number, ready: boolean): void {
  const r = Math.round(2 + p * 4);
  ellipse(ctx, 8, 21 - r, r + 1, r, LEAF);
  ellipse(ctx, 7, 20 - r, Math.max(1, r - 1), Math.max(1, r - 2), LEAF_L);
  if (ready) {
    for (const [x, y] of [[5, 15], [10, 14], [8, 18], [12, 18], [4, 19]] as const) {
      rect(ctx, x, y, 2, 2, d.color);
      px(ctx, x, y, '#ff8a8a');
    }
  } else if (p > 0.6) {
    px(ctx, 6, 16, '#ffffff');
    px(ctx, 10, 17, '#ffffff');
  }
}

function drawVine(ctx: Ctx, d: CropDef, p: number, ready: boolean): void {
  const w = Math.round(2 + p * 5);
  line(ctx, 8 - w, 21, 8 + w, 20, LEAF_D);
  for (let i = -w; i <= w; i += 3) ellipse(ctx, 8 + i, 19, 1, 1, i % 2 === 0 ? LEAF : LEAF_L);
  if (ready) {
    ellipse(ctx, 8, 17, 6, 4, d.color);
    line(ctx, 5, 14, 5, 20, d.color2 ?? shade(d.color, 0.8));
    line(ctx, 11, 14, 11, 20, d.color2 ?? shade(d.color, 0.8));
    px(ctx, 6, 15, P.yellowLight);
    rect(ctx, 8, 11, 2, 3, LEAF_D);
  } else if (p > 0.5) {
    ellipse(ctx, 8, 18, 2, 1, LEAF_L);
    px(ctx, 9, 17, P.yellow);
  }
}

const KIND: Record<string, (ctx: Ctx, d: CropDef, p: number, ready: boolean) => void> = {
  root: drawRoot,
  grain: drawGrain,
  stalk: drawStalk,
  bush: drawBush,
  vine: drawVine,
};

export function genCrops(scene: Phaser.Scene): void {
  for (const d of Object.values(CROPS)) {
    for (let s = 0; s < d.stages; s++) {
      tex(scene, `crop_${d.id}_${s}`, 16, 24, (ctx) => {
        const ready = s === d.stages - 1;
        const p = d.stages <= 2 ? 1 : s / (d.stages - 1);
        if (s === 0 && d.stages > 2) seed(ctx);
        else if (s === 1 && d.stages > 3 && d.kind !== 'grain') sprout(ctx);
        else KIND[d.kind](ctx, d, p, ready);
      });
    }
  }
  tex(scene, 'crop_dead', 16, 24, (ctx) => {
    const c = '#8a6a3a';
    line(ctx, 8, 21, 8, 15, c);
    line(ctx, 8, 16, 4, 19, c);
    line(ctx, 8, 17, 12, 20, c);
    px(ctx, 5, 20, '#6a4a2a');
    px(ctx, 11, 21, '#6a4a2a');
  });
}
